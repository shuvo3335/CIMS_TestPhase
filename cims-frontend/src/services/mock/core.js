import { readJSON, writeJSON, uid } from '../storage';

export class ApiError extends Error {
  constructor(message, status = 400, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

/** Simulated network latency so loading states behave like a real API. */
export const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms + Math.random() * 150));

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Generic CRUD repository over a localStorage collection. */
export function createRepository(key, idPrefix) {
  const all = () => readJSON(key, []);
  const save = (rows) => writeJSON(key, rows);

  return {
    all: () => clone(all()),
    find: (id) => clone(all().find((r) => r.id === id)),
    filter: (fn) => clone(all().filter(fn)),
    insert(data) {
      const now = new Date().toISOString();
      const row = { ...data, id: data.id || uid(idPrefix), createdAt: now, updatedAt: now };
      save([...all(), row]);
      return clone(row);
    },
    update(id, data) {
      const rows = all();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) throw new ApiError('Record not found', 404);
      rows[idx] = { ...rows[idx], ...data, id, updatedAt: new Date().toISOString() };
      save(rows);
      return clone(rows[idx]);
    },
    remove(id) {
      save(all().filter((r) => r.id !== id));
    },
    replaceAll(rows) {
      save(rows);
    },
  };
}

export const repos = {
  users: createRepository('users', 'u_'),
  contracts: createRepository('contracts', 'sc_'),
  pis: createRepository('pis', 'pi_'),
  lcs: createRepository('lcs', 'lc_'),
  shipments: createRepository('shipments', 'sh_'),
};

export const eqi = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
