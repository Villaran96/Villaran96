// Descarga las cuotas reales una vez y hace una de estas dos cosas:
//
//   node scripts/snapshot.mjs            guarda assets/cuotas.json (la web sin servidor la usa)
//   node scripts/snapshot.mjs --check    solo comprueba las fuentes y enseña un resumen
//
// Usa las mismas claves que el servidor (ODDSAPIIO_KEY, ODDS_API_KEY, BETFAIR_*…).
// Sirve para comprobar que las claves funcionan antes de publicar la web.

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../server/config.mjs';
import { createOddsFeed } from '../server/oddsfeed.mjs';
import { findMatches } from '../js/odds.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const cfg = loadConfig();
const feed = createOddsFeed(cfg, { log: () => {} });

if (!feed.configured()) {
  console.error('No hay ninguna fuente de cuotas configurada. Define ODDSAPIIO_KEY (Bet365, Winamax y Retabet), BETFAIR_APP_KEY + BETFAIR_USERNAME + BETFAIR_PASSWORD (Betfair.es) u ODDS_API_KEY.');
  process.exit(1);
}

const cache = await feed.refresh();
const rows = findMatches(cache.events, {});
const count = (list, key) => list.reduce((m, x) => m.set(key(x), (m.get(key(x)) || 0) + 1), new Map());
const table = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${String(k).padEnd(26)} ${v}`).join('\n');

console.log(`Fuentes: ${cache.sources.join(' · ') || 'ninguna respondió'}`);
if (cache.errors.length) console.log(`Avisos:\n${cache.errors.map((e) => `  - ${e}`).join('\n')}`);
console.log(`Partidos con cuotas: ${cache.events.length}`);
console.log(`Partidos por casa:\n${table(count(cache.events.flatMap((e) => e.books.map((b) => `${b.title}${b.exchange ? ' (exchange)' : ''}`)), (x) => x)) || '  (ninguno)'}`);
console.log(`Cuotas emparejadas con el exchange (filas del oddsmatcher): ${rows.length}`);
if (rows.length) {
  console.log(`Filas por casa:\n${table(count(rows, (r) => r.bookTitle))}`);
  // Los enlaces de versiones de otros países (winamax_fr…) no sirven en España.
  const exactBack = rows.filter((r) => r.backLink && !/_(fr|de|it|uk|se|nl|pt|dk|au|us)$/i.test(r.bookKey)).length;
  const exactLay = rows.filter((r) => r.layMarketId || (r.layLink && r.exKey !== 'betfair_ex_eu')).length;
  console.log(`Con enlace directo al partido en la casa: ${Math.round((exactBack / rows.length) * 100)} %`);
  console.log(`Con enlace directo al mercado del exchange: ${Math.round((exactLay / rows.length) * 100)} %`);
  const best = [...rows].sort((a, b) => b.rating - a.rating).slice(0, 8);
  console.log('Mejores calificantes ahora:');
  for (const r of best) console.log(`  ${r.rating.toFixed(1)} %  ${r.event.home} – ${r.event.away}  ·  ${r.label.text} (${r.marketLabel})  ·  ${r.bookTitle} ${r.back}  /  ${r.exTitle} ${r.lay}`);
}

if (!check) {
  if (!cache.events.length) {
    console.error('No se ha guardado nada: ninguna fuente ha devuelto partidos.');
    process.exit(1);
  }
  await mkdir(`${root}assets`, { recursive: true });
  await writeFile(`${root}assets/cuotas.json`, JSON.stringify({ updated: cache.updated, events: cache.events, sources: cache.sources, errors: cache.errors }));
  console.log('Guardado en assets/cuotas.json');
}
