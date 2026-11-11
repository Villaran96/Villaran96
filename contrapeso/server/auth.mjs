// Contraseñas (scrypt), sesiones con cookie HttpOnly y utilidades de validación.

import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

const derive = (password, salt, n = N, r = R, p = P) => new Promise((resolve, reject) => {
  scrypt(String(password).normalize('NFKC'), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)));
});

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64');
  const key = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

export function newToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256(token) };
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

export function cookie(name, value, { maxAge, secure = false, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (maxAge != null) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim()) && String(e).length <= 200;

export function passwordProblem(pw) {
  const s = String(pw || '');
  if (s.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (s.length > 200) return 'La contraseña es demasiado larga.';
  if (/^\d+$/.test(s)) return 'La contraseña no puede ser solo números.';
  return null;
}

/** Limita intentos por clave (IP + ruta) en una ventana de tiempo. */
export function rateLimiter({ max = 20, windowMs = 10 * 60000 } = {}) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return list.length <= max;
  };
}
