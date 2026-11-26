import { repos, delay, ApiError, eqi, assertSystemAdmin } from './core';
import { normalizePermissions } from '@/utils/permissions';
import { ROLES } from '@/utils/constants';

/** MOCK ONLY: real hashing/verification belongs on the backend. */
export async function hashPassword(pw) {
  const data = new TextEncoder().encode(`cims::${pw}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const publicUser = ({ passwordHash: _ph, password: _pw, ...u }) => u;
/** Admin-only listing: includes the plain-text password (by explicit business decision). */
const adminUser = ({ passwordHash: _ph, ...u }) => u;

export const auth = {
  async login({ userId, password }) {
    await delay(400);
    const user = repos.users.filter((u) => eqi(u.userId, userId))[0];
    if (!user || user.passwordHash !== (await hashPassword(password))) {
      throw new ApiError('Invalid User ID or password', 401);
    }
    if (!user.active) throw new ApiError('This account is disabled. Contact your administrator.', 403);
    return { token: `mock.${user.id}.${Date.now()}`, user: publicUser(user) };
  },
  /** Fresh profile + permissions for the signed-in user (applied on app load). */
  async me(id) {
    const u = repos.users.find(id);
    if (!u || !u.active) throw new ApiError('Session expired', 401);
    return publicUser(u);
  },
};

export const users = {
  async list() {
    await delay();
    return repos.users.all().map(adminUser);
  },
  async create({ password, permissions, ...data }) {
    assertSystemAdmin();
    await delay();
    if (repos.users.filter((u) => eqi(u.userId, data.userId)).length) {
      throw new ApiError(`User ID "${data.userId}" already exists`, 409, 'userId');
    }
    if (!password) throw new ApiError('Password is required', 400, 'password');
    return adminUser(repos.users.insert({ ...data, permissions: data.role === ROLES.SYSTEM_ADMIN ? {} : normalizePermissions(permissions), password, passwordHash: await hashPassword(password) }));
  },
  async update(id, { password, permissions, ...data }) {
    assertSystemAdmin();
    await delay();
    if (repos.users.filter((u) => u.id !== id && eqi(u.userId, data.userId)).length) {
      throw new ApiError(`User ID "${data.userId}" already exists`, 409, 'userId');
    }
    const current = repos.users.find(id);
    const adminsLeft = repos.users.filter((u) => u.id !== id && u.role === ROLES.SYSTEM_ADMIN && u.active).length;
    if (current?.role === ROLES.SYSTEM_ADMIN && (data.role !== ROLES.SYSTEM_ADMIN || !data.active) && adminsLeft === 0) {
      throw new ApiError('At least one active System Administrator must remain');
    }
    const patch = { ...data };
    if (permissions !== undefined) patch.permissions = data.role === ROLES.SYSTEM_ADMIN ? {} : normalizePermissions(permissions);
    if (password) {
      patch.password = password;
      patch.passwordHash = await hashPassword(password);
    }
    return adminUser(repos.users.update(id, patch));
  },
  async remove(id, currentUserId) {
    assertSystemAdmin();
    await delay();
    if (id === currentUserId) throw new ApiError('You cannot delete your own account');
    const u = repos.users.find(id);
    const adminsLeft = repos.users.filter((x) => x.id !== id && x.role === ROLES.SYSTEM_ADMIN).length;
    if (u?.role === ROLES.SYSTEM_ADMIN && adminsLeft === 0) throw new ApiError('Cannot delete the last System Administrator');
    repos.users.remove(id);
  },
};
