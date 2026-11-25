/**
 * Central business rules for CIMS. Used by both the forms (live feedback)
 * and the mock service layer (enforcement), mirroring what the backend will do.
 */

export const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

/** totalPrice = unitPrice × totalQty */
export const calcTotalPrice = (qty, unitPrice) => round2(toNum(qty) * toNum(unitPrice));

/** spiAmount = spiQty × unitPrice */
export const calcSpiAmount = (qty, unitPrice) => round2(toNum(qty) * toNum(unitPrice));

/** Upper limit of a value allowed within ± tolerance %, e.g. 200 with 10% → 220. */
export const maxWithTolerance = (base, tolerancePct) => round2(toNum(base) * (1 + toNum(tolerancePct) / 100));

export const sumBy = (arr, key) =>
  round2((arr || []).reduce((acc, item) => acc + toNum(typeof key === 'function' ? key(item) : item?.[key]), 0));

/**
 * Σ SPI qty must equal contract qty within ± tolerance %.
 * @returns {{ total:number, contractQty:number, diff:number, allowed:number, ok:boolean }}
 */
export function checkSpiTotal(spis, contractQty, tolerancePct = 0) {
  const total = sumBy(spis, 'qty');
  const cq = toNum(contractQty);
  const diff = round2(total - cq);
  const allowed = round2((cq * toNum(tolerancePct)) / 100);
  return { total, contractQty: cq, diff, allowed, ok: Math.abs(diff) <= allowed + 1e-9 };
}

/** LC pending = contract qty − Σ LC done qty (never negative) */
export const calcLcPending = (contractQty, lcDoneTotal) => Math.max(0, round2(toNum(contractQty) - toNum(lcDoneTotal)));

/** Latest effective LC value: last amendment value, else original amount. */
export function latestLcValue(lc) {
  const am = lc?.amendments || [];
  return am.length ? toNum(am[am.length - 1].value) : toNum(lc?.amount);
}

/** Derive LC status from expiry date. */
export function lcStatus(lc, today = new Date()) {
  if (!lc?.expiryDate) return 'ACTIVE';
  const exp = new Date(lc.expiryDate);
  const days = Math.ceil((exp - today) / 86400000);
  if (days < 0) return 'EXPIRED';
  if (days <= 15) return 'EXPIRING';
  return 'ACTIVE';
}
