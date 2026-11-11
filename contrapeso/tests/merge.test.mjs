import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teamKey, teamSimilarity, mergeExchange } from '../server/merge.mjs';
import {
  mapBetfair, splitEventName, marketKeyFor, createBetfairClient, betfairLink,
} from '../server/betfair.mjs';
import { normalizeTheOddsApi, findMatches } from '../js/odds.js';

test('claves de equipo: alias y siglas', () => {
  assert.equal(teamKey('Athletic Bilbao'), teamKey('Ath Bilbao'));
  assert.equal(teamKey('Atlético Madrid'), teamKey('Atl Madrid'));
  assert.equal(teamKey('Man Utd'), teamKey('Manchester United'));
  assert.equal(teamKey('RCD Espanyol'), teamKey('Espanyol'));
  assert.equal(teamKey('Bayern Munich'), teamKey('Bayern Munchen'));
  assert.equal(teamKey('Paris Saint Germain'), teamKey('PSG'));
  assert.equal(teamKey('Inter Milan'), teamKey('Inter'));
});

test('parecido entre nombres', () => {
  assert.equal(teamSimilarity('Real Betis', 'Betis'), 1);
  assert.ok(teamSimilarity('Celta de Vigo', 'Celta Vigo') >= 0.85);
  assert.ok(teamSimilarity('Wolverhampton Wanderers', 'Wolves') >= 0.85);
  assert.ok(teamSimilarity('Real Madrid', 'Real Sociedad') < 0.6);
  assert.ok(teamSimilarity('Sevilla', 'Villarreal') < 0.4);
});

test('nombres de evento de Betfair', () => {
  assert.deepEqual(splitEventName('Sevilla v Real Betis'), { home: 'Sevilla', away: 'Real Betis' });
  assert.deepEqual(splitEventName('Boston Celtics @ LA Lakers'), { home: 'LA Lakers', away: 'Boston Celtics' });
  assert.equal(marketKeyFor('OVER_UNDER_25'), 'tot:2.5');
  assert.equal(marketKeyFor('MATCH_ODDS'), 'h2h');
  assert.equal(marketKeyFor('CORRECT_SCORE'), null);
});

const start = new Date(Date.now() + 2 * 86400000).toISOString();
const catalogue = [
  {
    marketId: '1.100', description: { marketType: 'MATCH_ODDS' }, event: { id: '900', name: 'Sevilla v Betis', openDate: start },
    eventType: { id: '1', name: 'Soccer' }, competition: { id: '117', name: 'Spanish La Liga' },
    runners: [{ selectionId: 1, runnerName: 'Sevilla', sortPriority: 1 }, { selectionId: 2, runnerName: 'Betis', sortPriority: 2 }, { selectionId: 3, runnerName: 'The Draw', sortPriority: 3 }],
  },
  {
    marketId: '1.101', description: { marketType: 'OVER_UNDER_25' }, event: { id: '900', name: 'Sevilla v Betis', openDate: start },
    eventType: { id: '1', name: 'Soccer' }, competition: { id: '117', name: 'Spanish La Liga' },
    runners: [{ selectionId: 11, runnerName: 'Under 2.5 Goals', sortPriority: 1 }, { selectionId: 12, runnerName: 'Over 2.5 Goals', sortPriority: 2 }],
  },
];
const books = [
  {
    marketId: '1.100', status: 'OPEN', inplay: false,
    runners: [
      { selectionId: 1, status: 'ACTIVE', ex: { availableToBack: [{ price: 2.56, size: 300 }], availableToLay: [{ price: 2.6, size: 845.5 }] } },
      { selectionId: 2, status: 'ACTIVE', ex: { availableToBack: [{ price: 2.9, size: 120 }], availableToLay: [{ price: 2.96, size: 410 }] } },
      { selectionId: 3, status: 'ACTIVE', ex: { availableToBack: [{ price: 3.3, size: 80 }], availableToLay: [{ price: 3.4, size: 95 }] } },
    ],
  },
  {
    marketId: '1.101', status: 'OPEN', inplay: false,
    runners: [
      { selectionId: 11, status: 'ACTIVE', ex: { availableToBack: [{ price: 1.88, size: 50 }], availableToLay: [{ price: 1.92, size: 60 }] } },
      { selectionId: 12, status: 'ACTIVE', ex: { availableToBack: [{ price: 2.02, size: 70 }], availableToLay: [{ price: 2.06, size: 88 }] } },
    ],
  },
];

test('mapea catálogo y libros de Betfair al modelo interno', () => {
  const [ev] = mapBetfair(catalogue, books);
  assert.equal(ev.home, 'Sevilla');
  assert.deepEqual(ev.markets.h2h, ['home', 'draw', 'away']);
  assert.deepEqual(ev.markets['tot:2.5'], ['over', 'under']);
  const bf = ev.books[0];
  assert.equal(bf.key, 'betfair_es');
  assert.equal(bf.m.h2h.home.lay, 2.6);
  assert.equal(bf.m.h2h.home.size, 845.5);
  assert.equal(bf.m['tot:2.5'].over.lay, 2.06);
  assert.equal(bf.ids.h2h, '1.100');
  assert.equal(betfairLink('https://www.betfair.es/exchange/plus/football/market/{marketId}', { marketId: '1.100' }), 'https://www.betfair.es/exchange/plus/football/market/1.100');
});

test('une casas y Betfair.es por partido y quita el exchange internacional', () => {
  const bookEvents = normalizeTheOddsApi([{
    id: 'oa1', sport_key: 'soccer_spain_la_liga', sport_title: 'La Liga - Spain', commence_time: start, home_team: 'Sevilla', away_team: 'Real Betis',
    bookmakers: [
      { key: 'williamhill', title: 'William Hill', markets: [{ key: 'h2h', outcomes: [{ name: 'Sevilla', price: 2.62 }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.3 }] }, { key: 'totals', outcomes: [{ name: 'Over', price: 2.05, point: 2.5 }, { name: 'Under', price: 1.8, point: 2.5 }] }] },
      { key: 'betfair_ex_eu', title: 'Betfair', markets: [{ key: 'h2h_lay', outcomes: [{ name: 'Sevilla', price: 2.5 }, { name: 'Real Betis', price: 2.8 }, { name: 'Draw', price: 3.2 }] }] },
    ],
  }]);
  const exchangeEvents = mapBetfair(catalogue, books);
  const { events, matched } = mergeExchange(bookEvents, exchangeEvents, { keepExchanges: new Set(['betfair_es']) });
  assert.equal(matched, 1);
  assert.ok(!events[0].books.some((b) => b.key === 'betfair_ex_eu'));
  const rows = findMatches(events, { commissions: { betfair_es: 2 } });
  const sevilla = rows.find((r) => r.mk === 'h2h' && r.ok === 'home');
  assert.equal(sevilla.exKey, 'betfair_es');
  assert.equal(sevilla.lay, 2.6);
  assert.equal(sevilla.laySize, 845.5);
  assert.equal(sevilla.layMarketId, '1.100');
  const over = rows.find((r) => r.mk === 'tot:2.5' && r.ok === 'over');
  assert.equal(over.lay, 2.06);
});

test('no une partidos distintos ni a horas distintas', () => {
  const later = new Date(Date.parse(start) + 3 * 3600000).toISOString();
  const bookEvents = [
    { id: 'x', sport: 'soccer', league: 'L', home: 'Sevilla', away: 'Real Betis', start: later, markets: {}, books: [] },
    { id: 'y', sport: 'soccer', league: 'L', home: 'Villarreal', away: 'Getafe', start, markets: {}, books: [] },
  ];
  const { matched } = mergeExchange(bookEvents, mapBetfair(catalogue, books));
  assert.equal(matched, 0);
});

test('cliente de Betfair: inicia sesión en .es, reintenta al caducar la sesión y descarga mercados', async () => {
  const calls = [];
  let sessions = 0;
  const fakeFetch = async (url, opts) => {
    calls.push(url);
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    if (url.endsWith('/login')) { sessions += 1; return json(200, { token: `T${sessions}`, status: 'SUCCESS' }); }
    const body = JSON.parse(opts.body);
    if (opts.headers['X-Authentication'] === 'T1' && url.includes('listCompetitions')) return json(400, { faultstring: 'ANGX-0003', detail: { APINGException: { errorCode: 'INVALID_SESSION_INFORMATION' } } });
    if (url.includes('listCompetitions')) return json(200, body.filter.eventTypeIds[0] === '1' ? [{ competition: { id: '117', name: 'Spanish La Liga' } }, { competition: { id: '5', name: 'Some Other League' } }] : []);
    if (url.includes('listMarketCatalogue')) return json(200, body.filter.competitionIds.includes('117') ? catalogue : []);
    if (url.includes('listMarketBook')) return json(200, books.filter((b) => body.marketIds.includes(b.marketId)));
    return json(404, {});
  };
  const client = createBetfairClient({ appKey: 'APP', username: 'u', password: 'p', fetchImpl: fakeFetch });
  const events = await client.fetchEvents({ sports: ['soccer'] });
  assert.ok(calls[0].startsWith('https://identitysso.betfair.es/api/login'));
  assert.ok(calls.some((u) => u.startsWith('https://api.betfair.com/exchange/betting/rest/v1.0/listMarketBook/')));
  assert.equal(sessions, 2, 'debe volver a iniciar sesión tras INVALID_SESSION_INFORMATION');
  assert.equal(calls.filter((u) => u.includes('listMarketCatalogue')).length, 1, 'solo la competición pedida');
  assert.equal(events.length, 1);
  assert.equal(events[0].books[0].m.h2h.draw.lay, 3.4);
});
