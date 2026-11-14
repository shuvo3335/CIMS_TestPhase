import { repos, delay, ApiError, eqi } from './core';
import { ROLES } from '@/utils/constants';

/** MOCK ONLY: real hashing/verification belongs on the backend. */
export async function hashPassword(pw) {
  const data = new TextEncoder().encode(`cims::${pw}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const publicUser = ({ passwordHash: _ph, ...u }) => u;

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
};

export const users = {
  async list() {
    await delay();
    return repos.users.all().map(publicUser);
  },
  async create({ password, ...data }) {
    await delay();
    if (repos.users.filter((u) => eqi(u.userId, data.userId)).length) {
      throw new ApiError(`User ID "${data.userId}" already exists`, 409, 'userId');
    }
    if (!password) throw new ApiError('Password is required', 400, 'password');
    return publicUser(repos.users.insert({ ...data, passwordHash: await hashPassword(password) }));
  },
  async update(id, { password, ...data }) {
    await delay();
    if (repos.users.filter((u) => u.id !== id && eqi(u.userId, data.userId)).length) {
      throw new ApiError(`User ID "${data.userId}" already exists`, 409, 'userId');
    }
    const current = repos.users.find(id);
    const adminsLeft = repos.users.filter((u) => u.id !== id && u.role === ROLES.ADMIN && u.active).length;
    if (current?.role === ROLES.ADMIN && (data.role !== ROLES.ADMIN || !data.active) && adminsLeft === 0) {
      throw new ApiError('At least one active Admin must remain');
    }
    const patch = { ...data };
    if (password) patch.passwordHash = await hashPassword(password);
    return publicUser(repos.users.update(id, patch));
  },
  async remove(id, currentUserId) {
    await delay();
    if (id === currentUserId) throw new ApiError('You cannot delete your own account');
    const u = repos.users.find(id);
    const adminsLeft = repos.users.filter((x) => x.id !== id && x.role === ROLES.ADMIN).length;
    if (u?.role === ROLES.ADMIN && adminsLeft === 0) throw new ApiError('Cannot delete the last Admin');
    repos.users.remove(id);
  },
};
