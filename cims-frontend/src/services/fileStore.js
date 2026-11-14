import localforage from 'localforage';
import { uid } from './storage';

/**
 * Stores uploaded file blobs in IndexedDB (localStorage can't hold PDFs).
 * Records only keep the lightweight metadata returned by `save`.
 */
const store = localforage.createInstance({ name: 'cims', storeName: 'files' });

/** @returns {Promise<{id:string,name:string,size:number,type:string,uploadedAt:string}>} */
export async function saveFile(file) {
  const id = uid('f_');
  await store.setItem(id, file);
  return { id, name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
}

export async function getFile(id) {
  return store.getItem(id);
}

export async function deleteFile(id) {
  return store.removeItem(id);
}

export async function openFile(meta) {
  const blob = await getFile(meta.id);
  if (!blob) throw new Error('File not found in local storage (it may be sample data).');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadFile(meta) {
  const blob = await getFile(meta.id);
  if (!blob) throw new Error('File not found in local storage (it may be sample data).');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = meta.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function clearFiles() {
  return store.clear();
}
