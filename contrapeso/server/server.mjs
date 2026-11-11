// Servidor de Contrapeso: sirve la web y descarga las cuotas de forma centralizada.
//
// Con el servidor, la clave de The Odds API no sale nunca al navegador y todos los
// usuarios comparten una sola descarga cada X minutos (lo que ahorra cuota).
//
// Uso (Node 18 o superior, sin dependencias):
//   ODDS_API_KEY=tu_clave node server/server.mjs
//
// Variables de entorno:
//   ODDS_API_KEY      clave de https://the-odds-api.com (obligatoria para cuotas reales)
//   SPORTS            ligas separadas por comas (por defecto, las de DEFAULT_SPORTS)
//   REGIONS           regiones de casas: eu, uk, us, au... (por defecto eu)
//   REFRESH_MINUTES   cada cuánto se descargan cuotas (por defecto 10)
//   PORT              puerto (por defecto 8080)
//   ALLOW_ORIGIN      dominio que puede leer /api/odds desde otra web (por defecto, ninguno)

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTheOddsApi, DEFAULT_SPORTS } from '../js/odds.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 8080);
const KEY = process.env.ODDS_API_KEY || '';
const SPORTS = (process.env.SPORTS || DEFAULT_SPORTS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const REGIONS = process.env.REGIONS || 'eu';
const REFRESH_MS = Math.max(1, Number(process.env.REFRESH_MINUTES || 10)) * 60000;
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

let cache = { updated: null, events: [], remaining: null, used: null, errors: [], source: 'the-odds-api' };
let refreshing = null;

async function refresh() {
  if (!KEY) return;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetchTheOddsApi({ apiKey: KEY, sports: SPORTS, regions: REGIONS });
      cache = { ...res, source: 'the-odds-api' };
      console.log(`[cuotas] ${res.events.length} eventos · cuota restante ${res.remaining ?? '¿?'}${res.errors.length ? ` · avisos: ${res.errors.join('; ')}` : ''}`);
    } catch (e) {
      cache = { ...cache, errors: [e.message] };
      console.error('[cuotas] error:', e.message);
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const cors = ALLOW_ORIGIN ? { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, Vary: 'Origin' } : {};

  if (url.pathname === '/api/odds') {
    if (!KEY) {
      return send(res, 503, JSON.stringify({ error: 'Falta ODDS_API_KEY en el servidor.' }), { 'Content-Type': TYPES['.json'], ...cors });
    }
    if (!cache.updated) await refresh();
    return send(res, 200, JSON.stringify(cache), { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store', ...cors });
  }
  if (url.pathname === '/api/health') {
    return send(res, 200, JSON.stringify({ ok: true, key: !!KEY, updated: cache.updated, events: cache.events.length, remaining: cache.remaining }), { 'Content-Type': TYPES['.json'] });
  }

  // Archivos estáticos (solo dentro de la carpeta del proyecto, sin server/ ni tests/).
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || /[\\/](server|tests|node_modules|\.git)[\\/]/.test(file.slice(ROOT.length))) {
    return send(res, 404, 'No encontrado');
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('no es un archivo');
    const body = await readFile(file);
    return send(res, 200, body, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  } catch {
    return send(res, 404, 'No encontrado');
  }
});

server.listen(PORT, () => {
  console.log(`Contrapeso en http://localhost:${PORT}`);
  if (!KEY) console.log('Sin ODDS_API_KEY: la web funciona con datos de demostración o con tu clave en Ajustes.');
  else {
    console.log(`Ligas: ${SPORTS.join(', ')} · regiones: ${REGIONS} · cada ${REFRESH_MS / 60000} min`);
    refresh();
    setInterval(refresh, REFRESH_MS).unref();
  }
});
