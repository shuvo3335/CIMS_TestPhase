/**
 * Single entry point for all data access.
 * VITE_API_MODE=mock  → browser-persisted mock services (current)
 * VITE_API_MODE=http  → real REST implementation (to be added with the backend,
 *                        same function signatures, in ./http/*)
 */
import { auth, users } from '../mock/authUsers';
import { contracts } from '../mock/contracts';
import { pis } from '../mock/pis';
import { lcs } from '../mock/lcs';
import { shipments } from '../mock/shipments';
import { reports } from '../mock/reports';
import { lookups, settings } from '../mock/lookups';
import { ensureSeeded, resetDemoData } from '../mock/seed';

const mode = import.meta.env.VITE_API_MODE || 'mock';
if (mode !== 'mock') {
  console.warn(`[CIMS] API mode "${mode}" not implemented yet; falling back to mock.`);
}

export const api = { auth, users, contracts, pis, lcs, shipments, reports, lookups, settings };
export const bootstrap = ensureSeeded;
export { resetDemoData };
export { ApiError } from '../mock/core';
