import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  fetchTheOddsApi, withLayMarkets, oddsApiCost, matchGrid, findMatches, THE_ODDS_BOOKMAKERS, ODDS_API_TEXT,
} from '../js/odds.js';
import { readDotEnv, loadConfig } from '../server/config.mjs';
import { createOddsFeed, msToNextMonth } from '../server/oddsfeed.mjs';

const start = new Date(Date.now() + 2 * 86400000).toISOString();
// Respuesta real de /v4/sports/soccer_spain_la_liga/odds (forma del 13/11/2026).
const LALIGA = [{
  id: 'ev1', sport_key: 'soccer_spain_la_liga', sport_title: 'La Liga - Spain', commence_time: start, home_team: 'Athletic Bilbao', away_team: 'Espanyol',
  bookmakers: [
    { key: 'winamax_fr', title: 'Winamax (FR)', last_update: start, link: 'https://www.winamax.fr/paris-sportifs/match/1', markets: [{ key: 'h2h', outcomes: [{ name: 'Athletic Bilbao', price: 1.55, link: 'https://www.winamax.fr/x' }, { name: 'Espanyol', price: 7.2 }, { name: 'Draw', price: 4.4 }] }] },
    { key: 'betfair_ex_eu', title: 'Betfair', last_update: start, markets: [
      { key: 'h2h', outcomes: [{ name: 'Athletic Bilbao', price: 1.51 }, { name: 'Espanyol', price: 7.4 }, { name: 'Draw', price: 4.6 }] },
      { key: 'h2h_lay', outcomes: [{ name: 'Athletic Bilbao', price: 1.53 }, { name: 'Espanyol', price: 7.8 }, { name: 'Draw', price: 4.8 }] },
    ] },
  ],
}];
const response = (status, body, headers = {}) => ({
  ok: status < 400, status, headers: { get: (k) => ({ 'x-requests-remaining': '497', 'x-requests-used': '3', ...headers })[k.toLowerCase()] ?? null }, json: async () => body,
});

test('The Odds API: pide decimal, las casas reales y la cuota en contra', async () => {
  const urls = [];
  const res = await fetchTheOddsApi({
    apiKey: 'K', sports: ['soccer_spain_la_liga'], markets: 'h2h', bookmakers: THE_ODDS_BOOKMAKERS, fetchImpl: async (u) => { urls.push(u); return response(200, LALIGA); },
  });
  const u = new URL(urls[0]);
  assert.equal(u.pathname, '/v4/sports/soccer_spain_la_liga/odds/');
  assert.equal(u.searchParams.get('oddsFormat'), 'decimal', '«eu» no existe: la API responde 422');
  assert.equal(u.searchParams.get('bookmakers'), 'bet365,winamax_fr,betfair_ex_eu');
  assert.equal(u.searchParams.get('regions'), null, 'con casas no hace falta región');
  assert.equal(u.searchParams.get('markets'), 'h2h,h2h_lay');
  assert.equal(res.remaining, 497);
  const ev = res.events[0];
  assert.equal(ev.home, 'Athletic Bilbao');
  const bf = ev.books.find((b) => b.key === 'betfair_ex_eu');
  assert.equal(bf.exchange, true);
  assert.deepEqual([bf.m.h2h.home.lay, bf.m.h2h.draw.lay, bf.m.h2h.away.lay], [1.53, 4.8, 7.8]);
  const rows = findMatches(res.events, { commissions: { betfair_ex_eu: 2 } });
  assert.ok(rows.some((r) => r.bookKey === 'winamax_fr' && r.ok === 'draw' && r.lay === 4.8), 'el oddsmatcher ya tiene filas');
});

test('The Odds API: mensajes limpios para 401, sin créditos, 429 y sin conexión', async () => {
  const call = (status, body) => fetchTheOddsApi({ apiKey: 'K', sports: ['a', 'b'], fetchImpl: async () => response(status, body) });
  await assert.rejects(call(401, { message: 'API key is not valid', error_code: 'INVALID_KEY' }), (e) => e.code === 'invalid_key' && e.status === 401 && e.message === ODDS_API_TEXT.invalid_key);
  await assert.rejects(call(401, { message: 'Usage quota has been reached', error_code: 'OUT_OF_USAGE_CREDITS' }), (e) => e.code === 'quota' && e.message === ODDS_API_TEXT.quota);
  await assert.rejects(call(429, { message: 'Too many requests', error_code: 'EXCEEDED_FREQ_LIMIT' }), (e) => e.code === 'rate_limit' && e.status === 429);
  await assert.rejects(fetchTheOddsApi({ apiKey: 'K', sports: ['a'], fetchImpl: async () => { throw new TypeError('fetch failed'); } }), (e) => e.code === 'network');
  await assert.rejects(fetchTheOddsApi({ apiKey: '', sports: ['a'] }), (e) => e.code === 'invalid_key' && /NEXT_PUBLIC_ODDS_API_KEY/.test(e.message));
  // Un error de una liga (422) no tumba las demás.
  let n = 0;
  const res = await fetchTheOddsApi({ apiKey: 'K', sports: ['mala', 'soccer_spain_la_liga'], fetchImpl: async () => (n++ ? response(200, LALIGA) : response(422, { message: 'Invalid odds format', error_code: 'INVALID_ODDS_FORMAT' })) });
  assert.equal(res.events.length, 1);
  assert.match(res.errors[0], /^mala: The Odds API respondió 422/);
});

test('créditos: mercados en contra y coste de cada descarga', () => {
  assert.equal(withLayMarkets('h2h'), 'h2h,h2h_lay');
  assert.equal(withLayMarkets('h2h,totals,h2h_lay'), 'h2h,h2h_lay,totals,totals_lay');
  assert.equal(oddsApiCost({ sports: ['soccer_spain_la_liga'], markets: 'h2h', bookmakers: THE_ODDS_BOOKMAKERS }), 2);
  assert.equal(oddsApiCost({ sports: ['a', 'b'], markets: 'h2h,totals', regions: 'eu,uk' }), 16);
  assert.ok(msToNextMonth(Date.UTC(2026, 10, 30, 12)) === 12 * 3600000);
});

test('servidor: lee NEXT_PUBLIC_ODDS_API_KEY también del archivo .env, sin pisar el entorno', () => {
  const dir = mkdtempSync(join(tmpdir(), 'env-'));
  const file = join(dir, '.env');
  writeFileSync(file, '# clave\nNEXT_PUBLIC_ODDS_API_KEY="abc123"\nSPORTS=soccer_spain_la_liga # liga\nexport OTRA=1\n');
  const env = readDotEnv(file);
  assert.deepEqual(env, { NEXT_PUBLIC_ODDS_API_KEY: 'abc123', SPORTS: 'soccer_spain_la_liga', OTRA: '1' });
  assert.deepEqual(readDotEnv(join(dir, 'no-existe')), {});
  const cfg = loadConfig({ ...env, ODDS_API_KEY: 'vieja' });
  assert.equal(cfg.odds.key, 'abc123', 'manda NEXT_PUBLIC_ODDS_API_KEY');
  assert.deepEqual(cfg.odds.sports, ['soccer_spain_la_liga']);
  assert.deepEqual(cfg.odds.bookmakers, THE_ODDS_BOOKMAKERS);
  assert.equal(cfg.odds.markets, 'h2h');
  assert.equal(loadConfig({ ODDS_API_KEY: 'k' }).odds.key, 'k');
  assert.deepEqual(loadConfig({ ODDS_API_BOOKMAKERS: 'regions' }).odds.bookmakers, []);
});

test('servidor: reparte los créditos del mes y conserva las cuotas buenas si la API falla', async () => {
  let t = Date.UTC(2026, 10, 13, 12);
  let mode = 'ok';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (mode === 'quota') return response(401, { message: 'Usage quota has been reached', error_code: 'OUT_OF_USAGE_CREDITS' }, { 'x-requests-remaining': '0' });
    if (mode === '429') return response(429, { message: 'Too many requests', error_code: 'EXCEEDED_FREQ_LIMIT' });
    return response(200, LALIGA, { 'x-requests-remaining': '400' });
  };
  const cfg = loadConfig({ NEXT_PUBLIC_ODDS_API_KEY: 'K' });
  const feed = createOddsFeed(cfg, { fetchImpl, log: () => {}, now: () => t });
  await feed.refresh();
  assert.equal(feed.get().events.length, 1);
  assert.equal(feed.get().problem, null);
  const delay = feed.nextDelayMs(t);
  // 400 créditos / 2 por descarga = 200 descargas en los 17,5 días que quedan: una cada ~2 h.
  assert.ok(delay > 2 * 3600000 && delay < 2.2 * 3600000, `${delay / 3600000} h`);
  await feed.refresh();
  assert.equal(calls, 1, 'antes de tiempo no gasta créditos');
  t += delay;
  mode = '429';
  await feed.refresh();
  assert.equal(calls, 2);
  assert.equal(feed.get().events.length, 1, 'se conservan las últimas cuotas buenas');
  assert.equal(feed.get().problem.code, 'rate_limit');
  assert.equal(feed.get().problem.status, 429);
  assert.ok(feed.nextDelayMs(t) >= 5 * 60000 && feed.nextDelayMs(t) <= 11 * 60000, 'reintenta en minutos');
  t += feed.nextDelayMs(t);
  mode = 'quota';
  await feed.refresh();
  assert.equal(feed.get().problem.code, 'quota');
  assert.ok(feed.nextDelayMs(t) >= 11 * 3600000, 'sin créditos no insiste');
  const free = feed.forPlan(false, 5);
  assert.equal(free.problem.code, 'quota', 'el aviso llega también al plan gratuito');
});

test('vista por partido: 1, X y 2 de cada casa y la mejor de cada resultado', async () => {
  const res = await fetchTheOddsApi({ apiKey: 'K', sports: ['soccer_spain_la_liga'], bookmakers: THE_ODDS_BOOKMAKERS, fetchImpl: async () => response(200, LALIGA) });
  const g = matchGrid(res.events);
  assert.deepEqual(g.cols.map((c) => [c.key, c.exchange]), [['winamax_fr', false], ['betfair_ex_eu', true]]);
  const row = g.rows[0];
  assert.deepEqual(row.cells.winamax_fr.home, { back: 1.55, lay: null, link: 'https://www.winamax.fr/x' });
  assert.equal(row.cells.betfair_ex_eu.draw.lay, 4.8);
  assert.deepEqual(row.best.away, { back: null, lay: null }, 'con una casa por lado no hay «mejor»');
  const two = res.events.map((e) => ({ ...e, books: [...e.books, { key: 'pinnacle', title: 'Pinnacle', exchange: false, m: { h2h: { home: { back: 1.6 }, draw: { back: 4.3 }, away: { back: 7.0 } } } }] }));
  assert.deepEqual(matchGrid(two).rows[0].best.home, { back: 1.6, lay: null });
  assert.equal(matchGrid(res.events, { q: 'madrid' }).rows.length, 0);
  assert.equal(matchGrid(res.events, { bookies: new Set(['bet365']) }).cols.length, 1, 'solo el exchange');
});
