import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTheOddsApi, findMatches, demoEvents, snapToTick, nextTick, prevTick, collectBooks, fetchTheOddsApi, outcomeLabel, marketLabel,
} from '../js/odds.js';

// Respuesta con la forma documentada de /v4/sports/{sport}/odds (markets=h2h,totals, includeLinks=true).
const fixture = [{
  id: 'abc',
  sport_key: 'soccer_spain_la_liga',
  sport_title: 'La Liga - Spain',
  commence_time: new Date(Date.now() + 86400000).toISOString(),
  home_team: 'Sevilla',
  away_team: 'Real Betis',
  bookmakers: [
    {
      key: 'williamhill', title: 'William Hill', last_update: '2026-11-11T10:00:00Z', link: 'https://sports.williamhill.com/event/123',
      markets: [
        { key: 'h2h', outcomes: [{ name: 'Sevilla', price: 2.6, link: 'https://sports.williamhill.com/slip?s=1' }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.2 }] },
        { key: 'totals', outcomes: [{ name: 'Over', price: 1.95, point: 2.5 }, { name: 'Under', price: 1.9, point: 2.5 }] },
      ],
    },
    {
      key: 'betfair_ex_eu', title: 'Betfair', last_update: '2026-11-11T10:00:00Z',
      markets: [
        { key: 'h2h', outcomes: [{ name: 'Sevilla', price: 2.54 }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.3 }] },
        { key: 'h2h_lay', outcomes: [{ name: 'Sevilla', price: 2.58 }, { name: 'Real Betis', price: 2.96 }, { name: 'Draw', price: 3.35 }] },
        { key: 'totals_lay', outcomes: [{ name: 'Over', price: 1.97, point: 2.5 }, { name: 'Under', price: 2.04, point: 2.5 }] },
      ],
    },
  ],
}];

test('normaliza mercados, cuotas en contra y enlaces de The Odds API', () => {
  const [ev] = normalizeTheOddsApi(fixture);
  assert.equal(ev.sport, 'soccer');
  assert.deepEqual(ev.markets.h2h, ['home', 'draw', 'away']);
  assert.deepEqual(ev.markets['tot:2.5'], ['over', 'under']);
  const ex = ev.books.find((b) => b.key === 'betfair_ex_eu');
  assert.equal(ex.exchange, true);
  assert.equal(ex.title, 'Betfair (internacional)');
  assert.equal(ex.m.h2h.home.lay, 2.58);
  assert.equal(ex.m['tot:2.5'].over.lay, 1.97);
  const wh = ev.books.find((b) => b.key === 'williamhill');
  assert.equal(wh.exchange, false);
  assert.equal(wh.m.h2h.home.link, 'https://sports.williamhill.com/slip?s=1');
  assert.equal(wh.link, 'https://sports.williamhill.com/event/123');
});

test('etiquetas de mercado y selección', () => {
  const [ev] = normalizeTheOddsApi(fixture);
  assert.equal(marketLabel('h2h', ev), '1X2');
  assert.equal(marketLabel('tot:2.5', ev), 'Goles: más/menos 2,5');
  assert.deepEqual(outcomeLabel(ev, 'h2h', 'draw'), { code: 'X', text: 'Empate' });
  assert.deepEqual(outcomeLabel(ev, 'tot:2.5', 'under'), { code: 'Menos', text: 'Menos de 2,5' });
});

test('el oddsmatcher empareja cada cuota a favor con la mejor en contra, en todos los mercados', () => {
  const events = normalizeTheOddsApi(fixture);
  const rows = findMatches(events, { commissions: { betfair_ex_eu: 2 } });
  assert.equal(rows.length, 5); // 3 de 1X2 + 2 de más/menos
  const sevilla = rows.find((r) => r.mk === 'h2h' && r.ok === 'home');
  assert.equal(sevilla.lay, 2.58);
  assert.equal(sevilla.label.code, '1');
  assert.equal(sevilla.backLink, 'https://sports.williamhill.com/slip?s=1');
  assert.ok(Math.abs(sevilla.rating - (2.6 * 0.98) / (2.58 - 0.02) * 100) < 1e-9);
  const over = rows.find((r) => r.mk === 'tot:2.5' && r.ok === 'over');
  assert.ok(Math.abs(over.rating - (1.95 * 0.98) / (1.97 - 0.02) * 100) < 1e-9);
  // Sin enlace de selección, se usa el del evento.
  assert.equal(rows.find((r) => r.ok === 'away').backLink, 'https://sports.williamhill.com/event/123');
  assert.ok(findMatches(events, { minRating: 99 }).every((r) => r.rating >= 99));
  assert.equal(findMatches(events, { families: new Set(['tot']) }).length, 2);
});

test('filtros de cuota, texto y liquidez', () => {
  const events = normalizeTheOddsApi(fixture);
  assert.equal(findMatches(events, { minOdds: 3 }).length, 1);
  assert.equal(findMatches(events, { q: 'betis' }).length, 5);
  assert.equal(findMatches(events, { q: 'madrid' }).length, 0);
  const withSize = demoEvents(Date.parse('2026-11-11T12:00:00Z'));
  const all = findMatches(withSize, { now: Date.parse('2026-11-11T12:00:00Z') });
  const liquid = findMatches(withSize, { now: Date.parse('2026-11-11T12:00:00Z'), minSize: 1000 });
  assert.ok(liquid.length < all.length && liquid.every((r) => r.laySize >= 1000));
});

test('escalones de Betfair', () => {
  assert.equal(snapToTick(2.013, -1), 2);
  assert.equal(snapToTick(2.031, -1), 2.02);
  assert.equal(snapToTick(4.37, -1), 4.3);
  assert.equal(nextTick(1.99), 2);
  assert.equal(nextTick(2), 2.02);
  assert.equal(nextTick(5.9), 6);
  assert.equal(prevTick(2), 1.99);
  assert.equal(prevTick(2.02), 2);
  assert.equal(prevTick(6.2), 6);
  assert.equal(prevTick(1.01), 1.01);
});

test('demostración: muchos partidos, varios mercados y buenas oportunidades', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const a = demoEvents(now);
  const b = demoEvents(now + 5 * 60000);
  assert.ok(a.length > 80, `eventos: ${a.length}`);
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id));
  assert.ok(a.every((e) => e.books.some((x) => x.exchange)));
  assert.ok(a.every((e) => Date.parse(e.start) > now));
  const soccer = a.find((e) => e.sport === 'soccer');
  assert.deepEqual(Object.keys(soccer.markets).sort(), ['btts', 'h2h', 'tot:1.5', 'tot:2.5', 'tot:3.5']);
  const rows = findMatches(a, { now });
  assert.ok(rows.length > 2500, `filas: ${rows.length}`);
  const good = rows.filter((r) => r.rating >= 95).length;
  assert.ok(good >= 40, `filas con rating >= 95: ${good}`);
  assert.ok(rows.filter((r) => r.rating >= 100).length < rows.length * 0.01, 'las surebets deben ser raras');
  const { bookies, exchanges, leagues, families } = collectBooks(a);
  assert.deepEqual(bookies.map(([, t]) => t).sort(), ['Bet365', 'DAZN Bet', 'Retabet', 'Sportium', 'Winamax']);
  assert.ok(exchanges.length === 1 && leagues.includes('LaLiga'));
  assert.equal(families.length, 3);
});

test('las probabilidades del demo son coherentes', () => {
  const ev = demoEvents(Date.parse('2026-11-11T12:00:00Z')).find((e) => e.sport === 'soccer');
  const ex = ev.books.find((b) => b.exchange);
  const implied = (mk) => Object.values(ex.m[mk]).reduce((s, p) => s + 1 / p.back, 0);
  for (const mk of Object.keys(ev.markets)) {
    const book = implied(mk);
    assert.ok(book > 0.98 && book < 1.06, `${mk}: ${book}`);
  }
  assert.ok(ex.m['tot:1.5'].over.back < ex.m['tot:2.5'].over.back);
  assert.ok(ex.m['tot:2.5'].over.back < ex.m['tot:3.5'].over.back);
});

test('cliente de The Odds API: pide enlaces, lee la cuota restante y normaliza', async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      headers: new Map([['x-requests-remaining', '480'], ['x-requests-used', '20']]),
      json: async () => fixture,
    };
  };
  const res = await fetchTheOddsApi({ apiKey: 'k', sports: ['soccer_spain_la_liga'], markets: 'h2h,totals', fetchImpl: fakeFetch });
  assert.equal(res.remaining, 480);
  assert.equal(res.events.length, 1);
  assert.match(calls[0], /markets=h2h%2Ctotals&oddsFormat=decimal/);
  assert.match(calls[0], /regions=eu/);
  assert.match(calls[0], /includeLinks=true/);
});

test('cliente de The Odds API: clave inválida corta la descarga', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, headers: new Map(), json: async () => ({ message: 'API key is not valid' }) });
  await assert.rejects(fetchTheOddsApi({ apiKey: 'x', sports: ['a', 'b'], fetchImpl: fakeFetch }), /not valid/);
});

test('modo reembolso: el rating es el beneficio en % del importe y favorece cuotas altas', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const rows = findMatches(demoEvents(now), { now, mode: 'refund', stake: 100, refund: 150, retention: 72, minOdds: 1.5, maxOdds: 10 });
  assert.ok(rows.length > 100);
  for (const r of rows.slice(0, 50)) assert.ok(Math.abs(r.rating - r.profit) < 1e-9, 'con 100 € el % coincide con los euros');
  const best = [...rows].sort((x, y) => y.profit - x.profit)[0];
  const worst = [...rows].sort((x, y) => x.profit - y.profit)[0];
  assert.ok(best.back > worst.back, 'las cuotas altas valen más en un reembolso');
  assert.ok(best.profit > 70 && best.profit < 100, String(best.profit));
});
