/** Thin localStorage wrapper for JSON collections (mock persistence). */
const PREFIX = 'cims:';

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function removeKey(key) {
  localStorage.removeItem(PREFIX + key);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

export const uid = (prefix = '') =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
