import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTheOddsApi, findMatches, findDutches, demoEvents, snapToTick, nextTick, collectBooks, fetchTheOddsApi,
} from '../js/odds.js';

// Respuesta con la forma documentada de /v4/sports/{sport}/odds (markets=h2h).
const fixture = [{
  id: 'abc',
  sport_key: 'soccer_spain_la_liga',
  sport_title: 'La Liga - Spain',
  commence_time: new Date(Date.now() + 86400000).toISOString(),
  home_team: 'Sevilla',
  away_team: 'Real Betis',
  bookmakers: [
    {
      key: 'williamhill', title: 'William Hill', last_update: '2026-11-11T10:00:00Z',
      markets: [{ key: 'h2h', outcomes: [{ name: 'Sevilla', price: 2.6 }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.2 }] }],
    },
    {
      key: 'betfair_ex_eu', title: 'Betfair', last_update: '2026-11-11T10:00:00Z',
      markets: [
        { key: 'h2h', outcomes: [{ name: 'Sevilla', price: 2.54 }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.3 }] },
        { key: 'h2h_lay', outcomes: [{ name: 'Sevilla', price: 2.58 }, { name: 'Real Betis', price: 2.96 }, { name: 'Draw', price: 3.35 }] },
      ],
    },
  ],
}];

test('normaliza la respuesta de The Odds API', () => {
  const [ev] = normalizeTheOddsApi(fixture);
  assert.deepEqual(ev.outcomes, ['Sevilla', 'Draw', 'Real Betis']);
  const ex = ev.books.find((b) => b.key === 'betfair_ex_eu');
  assert.equal(ex.exchange, true);
  assert.equal(ex.lay.Sevilla, 2.58);
  assert.equal(ev.books.find((b) => b.key === 'williamhill').exchange, false);
});

test('el oddsmatcher empareja cada cuota a favor con la mejor en contra', () => {
  const events = normalizeTheOddsApi(fixture);
  const rows = findMatches(events, { commissions: { betfair_ex_eu: 2 } });
  assert.equal(rows.length, 3);
  const sevilla = rows.find((r) => r.name === 'Sevilla');
  assert.equal(sevilla.lay, 2.58);
  assert.equal(sevilla.label.code, '1');
  assert.ok(Math.abs(sevilla.rating - (2.6 * 0.98) / (2.58 - 0.02) * 100) < 1e-9);
  const filtered = findMatches(events, { minRating: 99 });
  assert.ok(filtered.every((r) => r.rating >= 99));
});

test('filtros de cuota y texto', () => {
  const events = normalizeTheOddsApi(fixture);
  assert.equal(findMatches(events, { minOdds: 3 }).length, 1);
  assert.equal(findMatches(events, { q: 'betis' }).length, 3);
  assert.equal(findMatches(events, { q: 'madrid' }).length, 0);
});

test('escalones de Betfair', () => {
  assert.equal(snapToTick(2.013, -1), 2);
  assert.equal(snapToTick(2.031, -1), 2.02);
  assert.equal(snapToTick(4.37, -1), 4.3);
  assert.equal(nextTick(1.99), 2);
  assert.equal(nextTick(2), 2.02);
  assert.equal(nextTick(5.9), 6);
});

test('datos de demostración: estables por día y con exchange en cada evento', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const a = demoEvents(now);
  const b = demoEvents(now + 5 * 60000);
  assert.ok(a.length > 20);
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id));
  assert.ok(a.every((e) => e.books.some((x) => x.exchange)));
  assert.ok(a.every((e) => Date.parse(e.start) > now));
  const rows = findMatches(a, { now });
  assert.ok(rows.length > 300);
  assert.ok(rows.some((r) => r.rating > 98), 'debe haber alguna oportunidad buena');
  const { bookies, exchanges, leagues } = collectBooks(a);
  assert.ok(bookies.length > 10 && exchanges.length === 1 && leagues.includes('LaLiga'));
});

test('favor-favor: con dinero y con apuesta gratis', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const events = demoEvents(now);
  const cash = findDutches(events, { now, stake: 100 });
  assert.ok(cash.length > 0);
  assert.ok(cash.every((d) => d.legs.length === d.event.outcomes.length));
  const fb = findDutches(events, { now, stake: 10, freebetBook: 'bet365' });
  assert.ok(fb.length > 0);
  assert.ok(fb.every((d) => d.legs.filter((l) => l.freebet).length === 1));
});

test('cliente de The Odds API: lee la cuota restante y normaliza', async () => {
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
  const res = await fetchTheOddsApi({ apiKey: 'k', sports: ['soccer_spain_la_liga'], fetchImpl: fakeFetch });
  assert.equal(res.remaining, 480);
  assert.equal(res.events.length, 1);
  assert.match(calls[0], /markets=h2h&oddsFormat=decimal/);
  assert.match(calls[0], /regions=eu/);
});

test('cliente de The Odds API: clave inválida corta la descarga', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, headers: new Map(), json: async () => ({ message: 'API key is not valid' }) });
  await assert.rejects(fetchTheOddsApi({ apiKey: 'x', sports: ['a', 'b'], fetchImpl: fakeFetch }), /not valid/);
});
