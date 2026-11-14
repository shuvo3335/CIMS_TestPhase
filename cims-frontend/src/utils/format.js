import dayjs from 'dayjs';

const qtyFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DATE_FMT = 'DD-MMM-YYYY';

export function fmtQty(value, unit) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  const s = qtyFmt.format(Number(value));
  return unit ? `${s} ${unit}` : s;
}

export function fmtMoney(value, currency) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  const s = qtyFmt.format(Number(value));
  return currency ? `${currency} ${s}` : s;
}

export function fmtDate(value) {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FMT) : '—';
}

export function fmtDateRange(from, to) {
  if (!from && !to) return '—';
  return `${fmtDate(from)} → ${fmtDate(to)}`;
}

export function fmtFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** AG Grid value formatters */
export const gridQty = (p) => (p.value === null || p.value === undefined ? '' : fmtQty(p.value));
export const gridDate = (p) => (p.value ? fmtDate(p.value) : '');
