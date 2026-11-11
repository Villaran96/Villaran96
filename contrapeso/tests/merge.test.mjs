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

/* ------------------------------------------------------------ odds-api.io */

import { normEvent, parseBooks, toModel, createOddsApiIo } from '../server/oddsapiio.mjs';
import { mergeBookmakers } from '../server/merge.mjs';

const ioEvent = { id: 123, home: 'Sevilla', away: 'Real Betis', date: start, status: 'pending', league: { name: 'Spain - LaLiga', slug: 'spain-laliga' }, sport: { name: 'Football', slug: 'football' } };
// Forma de GET /v3/odds según la especificación OpenAPI de odds-api.io (cuotas en texto,
// enlaces por casa en urls y por resultado en homeLink…, exchange con layHome y depthLayHome).
const ioOdds = {
  id: 123,
  home: 'Sevilla',
  away: 'Real Betis',
  date: start,
  status: 'pending',
  urls: { 'Bet365 ES': 'https://www.bet365.es/#/AC/B1/C1/D8/E123/', 'Retabet ES': 'https://www.retabet.es/evento/123', 'Betfair Exchange': 'https://www.betfair.com/exchange/plus/football/market/1.234' },
  bookmakers: {
    'Bet365 ES': [
      { name: 'ML', updatedAt: '2026-11-11T10:00:00Z', odds: [{ home: '2.62', draw: '3.30', away: '2.90', homeLink: 'https://www.bet365.es/dl/sportsbookredirect?bs=123-1' }] },
      { name: 'Totals', odds: [{ hdp: 2.5, over: '2.04', under: '1.80' }, { max: 3.5, over: '3.40', under: '1.30' }] },
      { name: 'Totals HT', odds: [{ hdp: 1.5, over: '3.10', under: '1.36' }] },
      { name: 'Total Shots', odds: [{ hdp: 22.5, over: '1.9', under: '1.9' }] },
      { name: 'Corners Totals', odds: [{ hdp: 9.5, over: '1.9', under: '1.9' }] },
    ],
    Bet365: [{ name: 'ML', odds: [{ home: '9.00', draw: '9.00', away: '9.00' }] }],
    'Retabet ES': [
      { name: 'ML', odds: [{ home: 2.66, draw: 3.25, away: 2.85 }] },
      { name: 'Goals Over/Under', odds: [{ hdp: '2.5', over: '2.00', under: '1.82' }] },
      { name: 'Both Teams To Score', odds: [{ yes: '1.75', no: '2.05' }] },
    ],
    'Winamax FR': [{ name: 'ML', odds: [{ home: '2.70', draw: '3.20', away: '2.80' }] }],
    'DAZN Bet IT': [{ name: 'ML', odds: [{ home: '2.50', draw: '3.10', away: '3.00' }] }],
    'Betfair Exchange': [
      { name: 'ML', odds: [{ home: '2.58', layHome: '2.62', depthLayHome: '1850', draw: '3.35', layDraw: '3.45', depthLayDraw: '420', away: '2.92', layAway: '2.98', depthLayAway: '900' }] },
      { name: 'Totals', odds: [{ hdp: 2.5, over: '2.06', layOver: '2.10', depthLayOver: '600', under: '1.92', layUnder: '1.96', depthLayUnder: '700' }] },
    ],
  },
};

test('odds-api.io: lee la respuesta oficial (casas españolas, enlaces y mercados exactos)', () => {
  assert.deepEqual(normEvent(ioEvent), { id: '123', home: 'Sevilla', away: 'Real Betis', start, league: 'Spain - LaLiga' });
  assert.equal(normEvent({ eventId: 'x', homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, startTime: Date.parse(start) / 1000 }).home, 'A');
  assert.equal(normEvent({ id: 1 }), null);
  const books = parseBooks(ioOdds);
  const b365 = books.filter((b) => b.key === 'bet365');
  assert.equal(b365.length, 1, 'Bet365 internacional no se suma a Bet365 ES');
  assert.equal(b365[0].title, 'Bet365');
  assert.equal(b365[0].m.h2h.home.back, 2.62, 'manda la versión española');
  assert.equal(b365[0].m.h2h.home.link, 'https://www.bet365.es/dl/sportsbookredirect?bs=123-1', 'enlace directo a la apuesta');
  assert.equal(b365[0].m.h2h.draw.link, 'https://www.bet365.es/#/AC/B1/C1/D8/E123/', 'si no, enlace al partido');
  assert.equal(b365[0].m['tot:2.5'].over.back, 2.04);
  assert.equal(b365[0].m['tot:3.5'].under.back, 1.3, 'línea en max');
  assert.ok(!b365[0].m['tot:1.5'], 'los goles de la primera parte no son del partido');
  assert.ok(!b365[0].m['tot:22.5'] && !b365[0].m['tot:9.5'], 'ni tiros ni córners');
  const reta = books.find((b) => b.key === 'retabet');
  assert.equal(reta.title, 'Retabet');
  assert.equal(reta.m['tot:2.5'].over.back, 2, 'Goals Over/Under cuando no hay Totals');
  assert.equal(reta.m.btts.yes.back, 1.75);
  assert.ok(books.some((b) => b.key === 'winamax_fr' && b.title === 'Winamax FR'), 'Winamax FR no es Winamax España');
  assert.ok(!books.some((b) => b.key === 'daznbet'), 'DAZN Bet IT no es DAZN Bet España');
  const bf = books.find((b) => b.exchange);
  assert.equal(bf.key, 'betfair_ex_eu');
  assert.deepEqual(bf.m.h2h.home, { back: 2.58, lay: 2.62, size: 1850, link: 'https://www.betfair.com/exchange/plus/football/market/1.234' });
  assert.equal(bf.m['tot:2.5'].under.lay, 1.96);
  const model = toModel(normEvent(ioEvent), ioOdds);
  assert.deepEqual(model.markets.h2h, ['home', 'draw', 'away']);
  assert.deepEqual(Object.keys(model.markets).sort(), ['btts', 'h2h', 'tot:2.5', 'tot:3.5']);
});

test('odds-api.io: con Betfair Exchange de la misma fuente ya hay oddsmatcher', () => {
  const ev = toModel(normEvent(ioEvent), ioOdds);
  const rows = findMatches([ev], { commissions: { betfair_ex_eu: 2 } });
  const r = rows.find((x) => x.bookKey === 'bet365' && x.mk === 'h2h' && x.ok === 'home');
  assert.equal(r.lay, 2.62);
  assert.equal(r.laySize, 1850);
  assert.equal(r.exKey, 'betfair_ex_eu');
  assert.ok(rows.some((x) => x.bookKey === 'retabet' && x.mk === 'tot:2.5'));
});

test('odds-api.io: con Betfair.es, manda Betfair.es y el oddsmatcher enlaza el partido', () => {
  const ev = toModel(normEvent(ioEvent), ioOdds);
  const { events } = mergeExchange([ev], mapBetfair(catalogue, books), { keepExchanges: new Set(['betfair_es']) });
  assert.ok(!events[0].books.some((b) => b.key === 'betfair_ex_eu'), 'fuera Betfair internacional');
  const rows = findMatches(events, { commissions: { betfair_es: 2 } });
  const b365 = rows.find((r) => r.bookKey === 'bet365' && r.mk === 'h2h' && r.ok === 'home');
  assert.equal(b365.lay, 2.6);
  assert.equal(b365.exKey, 'betfair_es');
  assert.equal(b365.backLink, 'https://www.bet365.es/dl/sportsbookredirect?bs=123-1');
  assert.ok(rows.some((r) => r.bookKey === 'retabet'));
  // Si odds-api.io también trae Betfair.es, no se duplica.
  const dup = { ...ev, books: [...ev.books, { key: 'betfair_es', title: 'Betfair.es', exchange: true, m: { h2h: { home: { lay: 9 } } } }] };
  const merged = mergeExchange([dup], mapBetfair(catalogue, books), { keepExchanges: new Set(['betfair_es']) }).events[0];
  assert.equal(merged.books.filter((b) => b.key === 'betfair_es').length, 1);
  assert.equal(merged.books.find((b) => b.key === 'betfair_es').m.h2h.home.lay, 2.6);
});

test('odds-api.io: cliente con selección de casas, mercados, ligas y vuelta a una a una', async () => {
  const calls = [];
  let multiAvailable = false;
  let selected = ['Bet365 ES'];
  const fakeFetch = async (url, opts) => {
    calls.push(`${opts?.method || 'GET'} ${url}`);
    const json = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
    if (url.includes('/bookmakers/selected/select?')) {
      selected = [...selected, ...new URL(url).searchParams.get('bookmakers').split(',')];
      return json(200, { ok: true });
    }
    if (url.includes('/bookmakers/selected?')) return json(200, selected.map((name) => ({ name })));
    if (url.includes('/events?') && url.includes('league=nope')) return json(404, { error: 'League not found' });
    if (url.includes('/events?')) return json(200, [ioEvent, { id: 9, home: 'Old', away: 'Match', date: '2020-01-01T00:00:00Z' }, { id: 10, home: 'Live', away: 'Now', date: new Date(Date.now() + 3600000).toISOString() }]);
    if (url.includes('/odds/multi?')) return multiAvailable ? json(200, [ioOdds, { ...ioOdds, id: 10, home: 'Live', away: 'Now', status: 'live' }]) : json(404, { error: 'Not found' });
    if (url.includes('/odds?')) return json(200, url.includes('eventId=10') ? { ...ioOdds, id: 10, home: 'Live', away: 'Now', status: 'live' } : ioOdds);
    return json(404, {});
  };
  const client = createOddsApiIo({ key: 'K', base: 'https://api.test/v3', bookmakers: ['Bet365 ES', 'Retabet ES'], leagues: ['spain-laliga', 'nope'], fetchImpl: fakeFetch });
  let res = await client.fetchEvents();
  assert.ok(calls.some((u) => u.startsWith('PUT') && u.includes('/bookmakers/selected/select?') && u.includes('bookmakers=Retabet+ES')), 'selecciona la casa que falta');
  assert.ok(!calls.some((u) => u.startsWith('PUT') && u.includes('Bet365')), 'no vuelve a seleccionar las que ya están');
  assert.equal(res.events.length, 1, 'solo el partido futuro con cuotas');
  assert.ok(calls.some((u) => u.includes('/odds?') && u.includes('eventId=123') && u.includes('bookmakers=Bet365+ES%2CRetabet+ES') && u.includes('markets=ML%2CTotals%2CGoals+Over%2FUnder%2CBoth+Teams+To+Score')));
  assert.ok(res.errors.some((e) => /nope.*ODDSAPIIO_LEAGUES/.test(e)), 'avisa de la liga que no existe');
  multiAvailable = true;
  calls.length = 0;
  res = await client.fetchEvents();
  assert.ok(!calls.some((u) => u.includes('/bookmakers/selected')), 'la selección se hace una vez');
  assert.ok(calls.some((u) => u.includes('/odds/multi?')));
  assert.equal(res.events.length, 1, 'fuera los partidos en directo');
  const denied = createOddsApiIo({ key: 'bad', base: 'https://api.test/v3', bookmakers: ['Bet365 ES'], leagues: ['a', 'b'], fetchImpl: async () => ({ ok: false, status: 401, text: async () => '{"error":"Invalid API key"}' }) });
  res = await denied.fetchEvents();
  assert.equal(res.events.length, 0);
  assert.match(res.errors[0], /401/);
});

test('une dos fuentes de casas sin duplicar casas ni partidos', () => {
  const a = toModel(normEvent(ioEvent), ioOdds);
  const b = normalizeTheOddsApi([{
    id: 'oa', sport_key: 'soccer_spain_la_liga', sport_title: 'La Liga - Spain', commence_time: start, home_team: 'Sevilla FC', away_team: 'Real Betis',
    bookmakers: [
      { key: 'bet365', title: 'Bet365', markets: [{ key: 'h2h', outcomes: [{ name: 'Sevilla FC', price: 9 }, { name: 'Real Betis', price: 9 }, { name: 'Draw', price: 9 }] }] },
      { key: 'williamhill', title: 'William Hill', markets: [{ key: 'h2h', outcomes: [{ name: 'Sevilla FC', price: 2.6 }, { name: 'Real Betis', price: 2.9 }, { name: 'Draw', price: 3.3 }] }] },
    ],
  }, {
    id: 'other', sport_key: 'soccer_epl', sport_title: 'EPL', commence_time: start, home_team: 'Arsenal', away_team: 'Chelsea', bookmakers: [],
  }]);
  const merged = mergeBookmakers([a], b);
  assert.equal(merged.length, 2);
  const sev = merged[0];
  assert.equal(sev.books.filter((x) => x.key === 'bet365').length, 1, 'no repite Bet365');
  assert.equal(sev.books.find((x) => x.key === 'bet365').m.h2h.home.back, 2.62, 'manda la primera fuente');
  assert.ok(sev.books.some((x) => x.key === 'williamhill'));
});
