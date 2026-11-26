import { ROLES } from './constants';

/**
 * Permission registry: the single source of truth for role-based access.
 * To add a new module/menu, add ONE entry here (then use its key in navConfig,
 * the router guards and `useCan`). The permission grid, access checks and the
 * stored shape pick it up automatically. No other permission code changes.
 *
 * Stored per user (and returned by the backend) as:
 *   permissions: { [moduleKey]: { view, create, edit, delete } }
 * A module with no entry means "no access". The Dashboard is always allowed.
 */
export const ACTIONS = ['view', 'create', 'edit', 'delete'];
export const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };

export const MODULES = [
  { key: 'sales_contract', label: 'Sales Contract', actions: ACTIONS },
  { key: 'pi', label: 'Proforma Invoice (PI)', actions: ACTIONS },
  { key: 'lc', label: 'Letter of Credit (LC)', actions: ACTIONS },
  { key: 'shipment', label: 'Shipment', actions: ACTIONS },
  { key: 'reports', label: 'Reports', actions: ['view'] }, // print / export come with view
  { key: 'settings', label: 'Settings & Lookups', actions: ACTIONS },
];

/** Enforces the rule: create/edit/delete imply view; drops actions a module does not support. */
export function normalizePermissions(perms = {}) {
  const out = {};
  for (const m of MODULES) {
    const p = perms?.[m.key] ?? {};
    const next = {};
    for (const a of m.actions) next[a] = !!p[a];
    if (m.actions.includes('view') && (next.create || next.edit || next.delete)) next.view = true;
    if (Object.values(next).some(Boolean)) out[m.key] = next;
  }
  return out;
}

/** System Administrator is always allowed; everyone else needs an explicit grant. */
export function can(user, moduleKey, action = 'view') {
  if (!user) return false;
  if (user.role === ROLES.SYSTEM_ADMIN) return true;
  return !!user.permissions?.[moduleKey]?.[action];
}
