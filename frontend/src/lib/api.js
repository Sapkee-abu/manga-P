const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const API_URL = `${BASE}/mangas`;
const CACHE_KEY = 'manga-list-cache-v2';

/** แปลง cover ที่ได้จาก backend ("/covers/..") ให้เป็น URL เต็ม */
export function coverSrc(cover) {
  if (!cover) return '';
  if (cover.startsWith('/')) return BASE + cover;
  return cover;
}

export const mangaId = (m) => m.id || m._id;

/** list ล่าสุดที่เคยโหลด (แสดงทันทีระหว่างรอเซิร์ฟเวอร์) */
export function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCache(list) {
  try {
    // list ไม่มี base64 แล้วจึงเล็กมาก เก็บได้สบาย
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      message = (await res.json()).message || message;
    } catch { /* not json */ }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  list: (signal) => request(API_URL, { signal }),
  create: (data) => request(API_URL, { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`${API_URL}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`${API_URL}/${id}`, { method: 'DELETE' }),
};
