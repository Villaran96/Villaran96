// Cuotas: modelo de eventos con varios mercados, fuentes de datos, oddsmatcher
// (calificante, freebet y reembolso) y datos de demostración. Sin DOM: lo usan la web y el servidor.

import { rating, profitFromRating, backLay } from './calc.js';

/* ------------------------------------------------------------------------ */
/* Modelo                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Un evento:
 * { id, sport, sportKey, league, home, away, start (ISO),
 *   markets: { [mercado]: [resultados] },
 *   books: [{ key, title, exchange, updated, link,
 *             m: { [mercado]: { [resultado]: { back, lay, size, link } } },
 *             ids: { [mercado]: marketId } }] }
 *
 * Mercados: 'h2h' (1X2 o ganador), 'tot:2.5' (más/menos 2,5), 'btts' (ambos marcan).
 * Resultados: home, draw, away · over, under · yes, no.
 */

export const EXCHANGE_KEYS = new Set(['betfair_es', 'betfair_ex_eu', 'betfair_ex_uk', 'betfair_ex_au', 'matchbook', 'smarkets', 'betdaq']);

const EXCHANGE_TITLES = {
  betfair_es: 'Betfair.es',
  betfair_ex_eu: 'Betfair (internacional)',
  betfair_ex_uk: 'Betfair UK',
  betfair_ex_au: 'Betfair AU',
  matchbook: 'Matchbook',
  smarkets: 'Smarkets',
};

/** Ligas que se piden por defecto a The Odds API (claves de su catálogo). */
export const DEFAULT_SPORTS = [
  'soccer_spain_la_liga',
  'soccer_spain_segunda_division',
  'soccer_epl',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
  'soccer_uefa_champs_league',
  'soccer_uefa_europa_league',
  'basketball_nba',
  'basketball_euroleague',
];

/** Más ligas que se pueden activar en Ajustes. */
export const EXTRA_SPORTS = [
  'soccer_netherlands_eredivisie',
  'soccer_portugal_primeira_liga',
  'soccer_efl_champ',
  'soccer_uefa_europa_conference_league',
  'soccer_turkey_super_league',
  'soccer_belgium_first_div',
  'soccer_brazil_campeonato',
  'soccer_argentina_primera_division',
  'soccer_usa_mls',
  'americanfootball_nfl',
  'icehockey_nhl',
];

export const MARKET_FAMILIES = [
  ['h2h', '1X2 / Ganador'],
  ['tot', 'Más/menos goles'],
  ['btts', 'Ambos marcan'],
];

export const family = (mk) => (mk.startsWith('tot:') ? 'tot' : mk);
const pointOf = (mk) => Number(mk.split(':')[1]);
const fmtPoint = (p) => String(p).replace('.', ',');

export function marketLabel(mk, ev) {
  if (mk === 'h2h') return ev && !ev.markets.h2h?.includes('draw') ? 'Ganador' : '1X2';
  if (mk === 'btts') return 'Ambos marcan';
  if (mk.startsWith('tot:')) return `${ev && ev.sport !== 'soccer' ? 'Puntos' : 'Goles'}: más/menos ${fmtPoint(pointOf(mk))}`;
  return mk;
}

/** Código corto y texto de una selección. */
export function outcomeLabel(ev, mk, ok) {
  if (ok === undefined) { ok = mk; mk = 'h2h'; } // compatibilidad: outcomeLabel(ev, 'home')
  switch (ok) {
    case 'home': return { code: '1', text: ev.home };
    case 'draw': return { code: 'X', text: 'Empate' };
    case 'away': return { code: '2', text: ev.away };
    case 'over': return { code: 'Más', text: `Más de ${fmtPoint(pointOf(mk))}` };
    case 'under': return { code: 'Menos', text: `Menos de ${fmtPoint(pointOf(mk))}` };
    case 'yes': return { code: 'Sí', text: 'Ambos marcan: sí' };
    case 'no': return { code: 'No', text: 'Ambos marcan: no' };
    default: return { code: '·', text: String(ok) };
  }
}

export function normalizeText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function sportOf(sportKey = '') {
  const k = String(sportKey);
  if (k.startsWith('soccer')) return 'soccer';
  if (k.startsWith('basketball')) return 'basketball';
  if (k.startsWith('tennis')) return 'tennis';
  if (k.startsWith('americanfootball')) return 'americanfootball';
  if (k.startsWith('icehockey')) return 'icehockey';
  return k.split('_')[0] || 'other';
}

const OUTCOME_ORDER = ['home', 'draw', 'away', 'over', 'under', 'yes', 'no'];
const sortOutcomes = (arr) => [...new Set(arr)].sort((a, b) => OUTCOME_ORDER.indexOf(a) - OUTCOME_ORDER.indexOf(b));

/* ------------------------------------------------------------------------ */
/* The Odds API                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Convierte la respuesta de /v4/sports/{sport}/odds al modelo interno.
 * Entiende h2h, h2h_lay, totals, totals_lay, btts y btts_lay, y los enlaces de
 * includeLinks=true (evento, mercado y boleto).
 */
export function normalizeTheOddsApi(events) {
  return (events || []).map((ev) => {
    const markets = {};
    const add = (mk, ok) => { (markets[mk] ||= []).push(ok); };
    const outcomeKey = (marketKey, o) => {
      if (marketKey.startsWith('h2h')) return o.name === ev.home_team ? 'home' : o.name === ev.away_team ? 'away' : o.name === 'Draw' ? 'draw' : null;
      if (marketKey.startsWith('totals')) return /^over$/i.test(o.name) ? 'over' : /^under$/i.test(o.name) ? 'under' : null;
      if (marketKey.startsWith('btts')) return /^yes$/i.test(o.name) ? 'yes' : /^no$/i.test(o.name) ? 'no' : null;
      return null;
    };
    const books = (ev.bookmakers || []).map((bm) => {
      const m = {};
      let hasLay = false;
      for (const market of bm.markets || []) {
        const key = market.key;
        const isLay = key.endsWith('_lay');
        const base = isLay ? key.slice(0, -4) : key;
        if (!['h2h', 'totals', 'btts'].includes(base)) continue;
        for (const o of market.outcomes || []) {
          if (!(o.price > 1)) continue;
          const ok = outcomeKey(base, o);
          if (!ok) continue;
          const mk = base === 'h2h' ? 'h2h' : base === 'btts' ? 'btts' : Number.isFinite(o.point) ? `tot:${o.point}` : null;
          if (!mk) continue;
          add(mk, ok);
          const slot = ((m[mk] ||= {})[ok] ||= {});
          if (isLay) { slot.lay = o.price; hasLay = true; } else {
            slot.back = o.price;
            const link = o.link || market.link;
            if (link) slot.link = link;
          }
        }
      }
      const exchange = EXCHANGE_KEYS.has(bm.key) || hasLay;
      return {
        key: bm.key,
        title: EXCHANGE_TITLES[bm.key] || bm.title,
        exchange,
        updated: bm.last_update || null,
        link: bm.link || null,
        m,
      };
    });
    Object.keys(markets).forEach((mk) => { markets[mk] = sortOutcomes(markets[mk]); });
    return {
      id: ev.id,
      sport: sportOf(ev.sport_key),
      sportKey: ev.sport_key,
      league: ev.sport_title || ev.sport_key,
      home: ev.home_team,
      away: ev.away_team,
      start: ev.commence_time,
      markets,
      books,
    };
  });
}

/* ------------------------------------------------------------------------ */
/* Oddsmatcher: favor en casa contra exchange                                */
/* ------------------------------------------------------------------------ */

/**
 * opts:
 *   mode: normal | snr | sr | refund
 *   stake: importe para calcular el beneficio de cada fila
 *   refund, retention: en modo reembolso, lo que devuelve la casa si pierdes y el %
 *     que esperas convertir en dinero. El rating es entonces el beneficio en % del importe.
 *   commissions: { claveExchange: % }, defaultCommission
 *   bookies, exchanges, leagues, families, sports: Set de claves permitidas (null = todas)
 *   minOdds, maxOdds, minRating, maxLay, minSize, from, to (ms), q (texto), now (ms)
 */
export function findMatches(events, opts = {}) {
  const {
    mode = 'normal', stake = 10, refund = 0, retention = 72, commissions = {}, defaultCommission = 2,
    bookies = null, exchanges = null, leagues = null, families = null, sports = null,
    minOdds = 1.01, maxOdds = 1000, minRating = -Infinity, maxLay = Infinity, minSize = 0,
    from = -Infinity, to = Infinity, q = '', now = Date.now(), includeStarted = false,
  } = opts;
  const query = normalizeText(q);
  const rows = [];

  for (const ev of events) {
    const t = Date.parse(ev.start);
    if (!includeStarted && t < now) continue;
    if (t < from || t > to) continue;
    if (leagues && !leagues.has(ev.league)) continue;
    if (sports && !sports.has(sportGroup(ev))) continue;
    if (query && !normalizeText(`${ev.home} ${ev.away} ${ev.league}`).includes(query)) continue;

    const exBooks = ev.books.filter((b) => b.exchange && (!exchanges || exchanges.has(b.key)));
    if (!exBooks.length) continue;

    for (const [mk, outcomes] of Object.entries(ev.markets)) {
      if (families && !families.has(family(mk))) continue;
      for (const ok of outcomes) {
        // El mejor exchange para esta selección: el que da más rating con su comisión.
        let best = null;
        for (const ex of exBooks) {
          const p = ex.m[mk]?.[ok];
          const L = p?.lay;
          if (!(L > 1) || L > maxLay) continue;
          if (minSize && Number.isFinite(p.size) && p.size < minSize) continue;
          const c = (commissions[ex.key] ?? defaultCommission) / 100;
          const score = (1 - c) / (L - c);
          if (!best || score > best.score) best = { ex, p, L, c: c * 100, score };
        }
        if (!best) continue;

        for (const bk of ev.books) {
          if (bk.exchange) continue;
          if (bookies && !bookies.has(bk.key)) continue;
          const price = bk.m[mk]?.[ok];
          const B = price?.back;
          if (!(B >= minOdds && B <= maxOdds)) continue;
          let r;
          let profit;
          if (mode === 'refund') {
            profit = backLay({ stake, back: B, lay: best.L, commission: best.c, type: 'refund', refund, retention }).profit;
            r = (profit / stake) * 100;
          } else {
            r = rating({ back: B, lay: best.L, commission: best.c, type: mode });
            profit = profitFromRating(r, stake, mode);
          }
          if (!(r >= minRating)) continue;
          rows.push({
            id: `${ev.id}|${mk}|${ok}|${bk.key}`,
            event: ev,
            mk,
            ok,
            marketLabel: marketLabel(mk, ev),
            label: outcomeLabel(ev, mk, ok),
            bookKey: bk.key,
            bookTitle: bk.title,
            back: B,
            backLink: price.link || bk.link || null,
            backUpdated: bk.updated || null,
            exKey: best.ex.key,
            exTitle: best.ex.title,
            lay: best.L,
            laySize: Number.isFinite(best.p.size) ? best.p.size : null,
            layMarketId: best.ex.ids?.[mk] || null,
            layEventId: best.ex.eventId || null,
            layLink: best.p.link || best.ex.link || null,
            layUpdated: best.ex.updated || null,
            commission: best.c,
            rating: r,
            profit,
            start: t,
          });
        }
      }
    }
  }
  return rows;
}

/** Casas, exchanges, ligas y mercados presentes en los eventos, para los filtros. */
export function collectBooks(events) {
  const bookies = new Map();
  const exchanges = new Map();
  const leagues = new Map();
  const families = new Set();
  const sports = new Set();
  for (const ev of events) {
    sports.add(sportGroup(ev));
    leagues.set(ev.league, (leagues.get(ev.league) || 0) + 1);
    Object.keys(ev.markets).forEach((mk) => families.add(family(mk)));
    for (const b of ev.books) (b.exchange ? exchanges : bookies).set(b.key, b.title);
  }
  const sort = (m) => [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'es'));
  return {
    bookies: sort(bookies),
    exchanges: sort(exchanges),
    leagues: [...leagues.keys()].sort((a, b) => a.localeCompare(b, 'es')),
    families: MARKET_FAMILIES.filter(([k]) => families.has(k)),
    sports: SPORT_NAMES.filter(([k]) => sports.has(k)),
  };
}

/**
 * Cuotas 1X2 por partido y casa, para la vista «Por partido».
 * Devuelve { cols: [{ key, title, exchange }], rows: [{ event, start, cells, best }] }:
 * cells[clave][home|draw|away] = { back, lay, link }; best = mejor a favor de las casas
 * y mejor (más baja) en contra de los exchanges, por resultado.
 */
export function matchGrid(events, {
  bookies = null, exchanges = null, leagues = null, sports = null, to = Infinity, q = '', now = Date.now(),
} = {}) {
  const query = normalizeText(q);
  const cols = new Map();
  const rows = [];
  for (const ev of events) {
    const t = Date.parse(ev.start);
    if (!(t >= now) || t > to) continue;
    if (!ev.markets?.h2h) continue;
    if (leagues && !leagues.has(ev.league)) continue;
    if (sports && !sports.has(sportGroup(ev))) continue;
    if (query && !normalizeText(`${ev.home} ${ev.away} ${ev.league}`).includes(query)) continue;
    const cells = {};
    for (const b of ev.books) {
      if (b.exchange ? (exchanges && !exchanges.has(b.key)) : (bookies && !bookies.has(b.key))) continue;
      const m = b.m?.h2h;
      if (!m) continue;
      const pick = (ok) => ({ back: m[ok]?.back > 1 ? m[ok].back : null, lay: m[ok]?.lay > 1 ? m[ok].lay : null, link: m[ok]?.link || null });
      const cell = { home: pick('home'), draw: pick('draw'), away: pick('away') };
      const has = (x) => (b.exchange ? x.lay || x.back : x.back);
      if (!has(cell.home) && !has(cell.draw) && !has(cell.away)) continue;
      cells[b.key] = cell;
      if (!cols.has(b.key)) cols.set(b.key, { key: b.key, title: b.title, exchange: !!b.exchange });
    }
    if (!Object.keys(cells).length) continue;
    // La mejor de cada resultado solo tiene sentido si hay al menos dos casas que comparar.
    const best = {};
    for (const ok of ['home', 'draw', 'away']) {
      let back = null;
      let lay = null;
      let nBack = 0;
      let nLay = 0;
      for (const [k, c] of Object.entries(cells)) {
        if (!cols.get(k).exchange && c[ok].back) { nBack += 1; if (!back || c[ok].back > back) back = c[ok].back; }
        if (cols.get(k).exchange && c[ok].lay) { nLay += 1; if (!lay || c[ok].lay < lay) lay = c[ok].lay; }
      }
      best[ok] = { back: nBack > 1 ? back : null, lay: nLay > 1 ? lay : null };
    }
    rows.push({ event: ev, start: ev.start, cells, best });
  }
  rows.sort((x, y) => Date.parse(x.start) - Date.parse(y.start));
  const order = [...cols.values()].sort((x, y) => Number(x.exchange) - Number(y.exchange) || String(x.title).localeCompare(String(y.title), 'es'));
  return { cols: order, rows };
}

/** Deportes del modelo, en el orden en que se enseñan. */
export const SPORT_NAMES = [['soccer', 'Fútbol'], ['tennis', 'Tenis'], ['basketball', 'Baloncesto'], ['other', 'Otros']];
const sportGroup = (ev) => (!ev.sport ? 'soccer' : ['soccer', 'tennis', 'basketball'].includes(ev.sport) ? ev.sport : 'other');

/* ------------------------------------------------------------------------ */
/* Fuentes                                                                   */
/* ------------------------------------------------------------------------ */

const API = 'https://api.the-odds-api.com/v4';

/** Deportes activos en The Odds API. No gasta cuota. */
export async function fetchSportsList(apiKey, fetchImpl = fetch, base = API) {
  const res = await fetchImpl(`${base}/sports/?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw await apiError(res);
  return res.json();
}

/**
 * Casas que se piden por defecto a The Odds API. Sus claves no son las españolas:
 * Winamax solo está como «winamax_fr» y «winamax_de», y Bet365 no está para La Liga
 * (se pide igualmente por si la API lo añade). Betfair Exchange es «betfair_ex_eu».
 */
export const THE_ODDS_BOOKMAKERS = ['bet365', 'winamax_fr', 'betfair_ex_eu'];

/**
 * Añade a cada mercado su versión «en contra» (h2h → h2h, h2h_lay): sin ella The Odds
 * API solo da la cuota a favor de Betfair y no se puede cubrir nada.
 */
export function withLayMarkets(markets = 'h2h') {
  const list = String(markets).split(',').map((m) => m.trim()).filter(Boolean);
  const out = [];
  for (const m of list) {
    const base = m.replace(/_lay$/, '');
    for (const x of [base, `${base}_lay`]) if (!out.includes(x)) out.push(x);
  }
  return out.join(',');
}

/** Créditos que gasta una descarga: 1 por liga, mercado y grupo de 10 casas (o región). */
export function oddsApiCost({ sports = [], markets = 'h2h', bookmakers = [], regions = 'eu', lay = true } = {}) {
  const nMarkets = String(lay ? withLayMarkets(markets) : markets).split(',').filter(Boolean).length || 1;
  const groups = bookmakers.length ? Math.ceil(bookmakers.length / 10) : String(regions).split(',').filter(Boolean).length || 1;
  return Math.max(1, sports.length) * nMarkets * groups;
}

/**
 * Cuotas de varias ligas. Con `bookmakers` se piden esas casas (y no una región);
 * las cuotas en contra de los exchanges llegan con los mercados *_lay.
 * Si la clave no vale, se acaban los créditos o hay demasiadas peticiones, lanza
 * un error con `code` (invalid_key, quota, rate_limit) y un mensaje para enseñar.
 */
export async function fetchTheOddsApi({
  apiKey, sports = DEFAULT_SPORTS, regions = 'eu', markets = 'h2h', bookmakers = [], lay = true, includeLinks = true, fetchImpl = fetch, base = API,
}) {
  const mk = lay ? withLayMarkets(markets) : markets;
  if (!apiKey) throw Object.assign(new Error(ODDS_API_TEXT.missing_key), { code: 'invalid_key', fatal: true });
  const all = [];
  let remaining = null;
  let used = null;
  const errors = [];
  const who = bookmakers.length ? `bookmakers=${encodeURIComponent(bookmakers.join(','))}` : `regions=${encodeURIComponent(regions)}`;
  for (const sport of sports) {
    const url = `${base}/sports/${encodeURIComponent(sport)}/odds/?apiKey=${encodeURIComponent(apiKey)}&${who}&markets=${encodeURIComponent(mk)}&oddsFormat=decimal&dateFormat=iso${includeLinks ? '&includeLinks=true' : ''}`;
    let res;
    try {
      res = await fetchImpl(url);
    } catch {
      throw Object.assign(new Error(ODDS_API_TEXT.network), { code: 'network', fatal: true });
    }
    remaining = res.headers.get('x-requests-remaining') ?? remaining;
    used = res.headers.get('x-requests-used') ?? used;
    if (!res.ok) {
      const err = await apiError(res);
      // Una clave inválida, sin créditos o frenada no va a funcionar con las demás ligas.
      if (err.fatal) {
        err.remaining = remaining != null ? Number(remaining) : null;
        throw err;
      }
      errors.push(`${sport}: ${err.message}`);
      continue;
    }
    try {
      all.push(...normalizeTheOddsApi(await res.json()));
    } catch (e) {
      errors.push(`${sport}: respuesta no válida (${e.message})`);
    }
  }
  return {
    events: all, remaining: remaining != null ? Number(remaining) : null, used: used != null ? Number(used) : null, errors, updated: new Date().toISOString(),
  };
}

/** Mensajes para el usuario según el error de The Odds API. */
export const ODDS_API_TEXT = {
  missing_key: 'Falta la clave de The Odds API (variable NEXT_PUBLIC_ODDS_API_KEY).',
  invalid_key: 'La clave de The Odds API no es válida o está desactivada. Revisa NEXT_PUBLIC_ODDS_API_KEY.',
  quota: 'Se han acabado los créditos de The Odds API de este mes. Vuelven con el nuevo mes o con un plan mayor.',
  rate_limit: 'The Odds API ha frenado las peticiones por llegar demasiadas seguidas (error 429). Se vuelve a intentar en unos minutos.',
  network: 'No se ha podido conectar con The Odds API. Comprueba la conexión a internet del servidor.',
};

async function apiError(res) {
  let body = null;
  try { body = await res.json(); } catch { /* cuerpo vacío */ }
  const apiCode = String(body?.error_code || '');
  let code = 'other';
  if (res.status === 429 || apiCode === 'EXCEEDED_FREQ_LIMIT') code = 'rate_limit';
  else if (apiCode === 'OUT_OF_USAGE_CREDITS' || (res.status === 401 && /quota|credits/i.test(body?.message || ''))) code = 'quota';
  else if (res.status === 401) code = 'invalid_key';
  const message = ODDS_API_TEXT[code] || `The Odds API respondió ${res.status}${body?.message ? `: ${body.message}` : ''}`;
  const err = new Error(message);
  err.status = res.status;
  err.code = code;
  err.apiCode = apiCode || null;
  err.fatal = code !== 'other';
  return err;
}

/** Tu propio servidor (server/server.mjs) sirve las cuotas ya descargadas y unidas. */
export async function fetchFromServer(baseUrl = '', fetchImpl = fetch) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/api/odds`;
  const res = await fetchImpl(url, { credentials: 'include' });
  if (!res.ok) {
    let msg = `El servidor respondió ${res.status}`;
    try { const b = await res.json(); if (b.error) msg = b.error; } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Instantánea de cuotas reales publicada junto a la web (assets/cuotas.json), para
 * alojamientos sin servidor. La genera `node scripts/snapshot.mjs`. Devuelve null si no hay.
 */
export async function fetchSnapshot(fetchImpl = fetch) {
  try {
    const res = await fetchImpl('assets/cuotas.json', { cache: 'no-store' });
    if (!res.ok || !String(res.headers.get('content-type') || '').includes('json')) return null;
    const data = await res.json();
    return data && Array.isArray(data.events) && data.events.length ? data : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------------ */
/* Escalones de precio de Betfair                                            */
/* ------------------------------------------------------------------------ */

const TICKS = [[2, 0.01], [3, 0.02], [4, 0.05], [6, 0.1], [10, 0.2], [20, 0.5], [30, 1], [50, 2], [100, 5], [1000, 10]];

/** Ajusta un precio a un escalón válido de Betfair (dir -1 hacia abajo, 1 hacia arriba). */
export function snapToTick(price, dir = 0) {
  let lo = 1.01;
  for (const [limit, step] of TICKS) {
    if (price <= limit) {
      const n = (price - lo) / step;
      const k = dir > 0 ? Math.ceil(n - 1e-9) : dir < 0 ? Math.floor(n + 1e-9) : Math.round(n);
      return Number((lo + k * step).toFixed(2));
    }
    lo = limit;
  }
  return 1000;
}
export function nextTick(price) {
  for (const [limit, step] of TICKS) if (price < limit) return Number((price + step).toFixed(2));
  return price;
}
export function prevTick(price) {
  let lo = 1.01;
  for (const [limit, step] of TICKS) {
    if (price <= limit) return Math.max(1.01, Number((price - (price > lo ? step : 0)).toFixed(2)));
    lo = limit;
  }
  return 1000;
}

/* ------------------------------------------------------------------------ */
/* Datos de demostración                                                     */
/* ------------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T = (s) => s.split('|').map((x) => { const [name, str] = x.split(':'); return [name, Number(str)]; });

const DEMO_LEAGUES = [
  { key: 'soccer_spain_la_liga', title: 'LaLiga', sport: 'soccer', slots: [[14, 0], [16, 15], [18, 30], [21, 0]], teams: T('Real Madrid:92|FC Barcelona:91|Atlético de Madrid:85|Athletic Club:80|Villarreal:79|Real Sociedad:77|Real Betis:77|Girona:72|Sevilla:73|Valencia:72|Celta de Vigo:72|Osasuna:71|Rayo Vallecano:71|Mallorca:70|Getafe:69|Espanyol:70|Deportivo Alavés:69|Elche:67|Levante:67|Real Oviedo:66') },
  { key: 'soccer_spain_segunda_division', title: 'LaLiga Hypermotion', sport: 'soccer', slots: [[14, 0], [16, 15], [18, 30], [21, 0]], teams: T('Las Palmas:66|Valladolid:66|Leganés:65|Deportivo:64|Sporting de Gijón:63|Racing de Santander:64|Zaragoza:61|Málaga:62|Almería:65|Granada:63|Cádiz:62|Huesca:60') },
  { key: 'soccer_epl', title: 'Premier League', sport: 'soccer', slots: [[13, 30], [16, 0], [18, 30], [21, 0]], teams: T('Arsenal:90|Liverpool:90|Manchester City:89|Chelsea:85|Newcastle United:82|Aston Villa:81|Tottenham Hotspur:80|Manchester United:79|Brighton:78|Nottingham Forest:77|Crystal Palace:76|Brentford:75|Fulham:75|Bournemouth:76|Everton:73|West Ham United:73') },
  { key: 'soccer_italy_serie_a', title: 'Serie A', sport: 'soccer', slots: [[15, 0], [18, 0], [20, 45]], teams: T('Inter:88|Napoli:85|Juventus:83|AC Milan:83|Atalanta:82|AS Roma:80|Lazio:78|Bologna:78|Fiorentina:76|Como:75|Torino:72|Udinese:71|Genoa:70|Cagliari:69') },
  { key: 'soccer_germany_bundesliga', title: 'Bundesliga', sport: 'soccer', slots: [[15, 30], [18, 30], [20, 30]], teams: T('Bayern Múnich:91|Bayer Leverkusen:85|Borussia Dortmund:84|RB Leipzig:82|Eintracht Frankfurt:79|Stuttgart:79|Friburgo:75|Wolfsburgo:73|Borussia Mönchengladbach:73|Werder Bremen:72|Hoffenheim:73|Maguncia:72|Union Berlin:70|Augsburgo:70') },
  { key: 'soccer_france_ligue_one', title: 'Ligue 1', sport: 'soccer', slots: [[17, 0], [19, 0], [21, 0]], teams: T('Paris Saint-Germain:90|Marsella:80|Mónaco:80|Lille:78|Lyon:78|Niza:76|Lens:75|Rennes:74|Estrasburgo:73|Toulouse:71|Brest:71|Nantes:69') },
  { key: 'soccer_netherlands_eredivisie', title: 'Eredivisie', sport: 'soccer', slots: [[14, 30], [16, 45], [20, 0]], teams: T('PSV:80|Feyenoord:80|Ajax:79|AZ Alkmaar:75|Twente:74|Utrecht:73|NEC:70|Go Ahead Eagles:68|Heerenveen:67|Sparta Rotterdam:66') },
  { key: 'soccer_portugal_primeira_liga', title: 'Primeira Liga', sport: 'soccer', slots: [[18, 0], [20, 30], [21, 30]], teams: T('Benfica:82|Sporting CP:83|Oporto:82|Braga:76|Vitória Guimarães:72|Famalicão:69|Gil Vicente:68|Estoril:67|Casa Pia:66|Moreirense:66') },
  { key: 'soccer_uefa_champs_league', title: 'Champions League', sport: 'soccer', slots: [[18, 45], [21, 0]], teams: T('Real Madrid:92|FC Barcelona:91|Bayern Múnich:91|Paris Saint-Germain:90|Liverpool:90|Arsenal:90|Inter:88|Atlético de Madrid:85|Borussia Dortmund:84|Benfica:82|PSV:80|Club Brujas:76|Galatasaray:77|Celtic:74|Sporting CP:83|Athletic Club:80') },
  { key: 'soccer_uefa_europa_league', title: 'Europa League', sport: 'soccer', slots: [[18, 45], [21, 0]], teams: T('Villarreal:79|Real Betis:77|AS Roma:80|Lazio:78|Lyon:78|Oporto:82|Feyenoord:80|Ajax:79|Fenerbahçe:77|Celta de Vigo:72|Niza:76|Rangers:73') },
  { key: 'basketball_spain_acb', title: 'Liga Endesa (ACB)', sport: 'basketball', slots: [[12, 30], [17, 0], [19, 0], [20, 45]], teams: T('Real Madrid Baloncesto:88|Barça Basket:85|Valencia Basket:83|Unicaja:84|Baskonia:80|Gran Canaria:77|Joventut:75|Tenerife:79|UCAM Murcia:76|Manresa:72|Zaragoza:70|Bilbao Basket:71') },
  { key: 'basketball_euroleague', title: 'Euroliga', sport: 'basketball', slots: [[19, 0], [20, 30], [21, 0]], teams: T('Real Madrid Baloncesto:88|Barça Basket:85|Fenerbahçe:88|Olympiacos:87|Panathinaikos:87|Mónaco:86|Baskonia:80|Valencia Basket:83|Anadolu Efes:83|Žalgiris:80|Estrella Roja:82|Bayern Basket:80') },
  { key: 'basketball_nba', title: 'NBA', sport: 'basketball', slots: [[1, 0], [2, 30], [4, 0]], teams: T('Oklahoma City Thunder:93|Boston Celtics:89|Cleveland Cavaliers:90|Denver Nuggets:88|New York Knicks:87|Houston Rockets:86|LA Lakers:85|Golden State Warriors:84|Minnesota Timberwolves:85|Milwaukee Bucks:82|Dallas Mavericks:81|Miami Heat:79|Orlando Magic:83|Indiana Pacers:82') },
  { key: 'tennis_atp', title: 'Tenis ATP', sport: 'tennis', slots: [[11, 0], [13, 30], [16, 0], [19, 30]], teams: T('Carlos Alcaraz:95|Jannik Sinner:96|Alexander Zverev:88|Novak Djokovic:90|Taylor Fritz:85|Jack Draper:84|Casper Ruud:82|Alex de Miñaur:83|Lorenzo Musetti:83|Holger Rune:81|Ben Shelton:82|Daniil Medvedev:84|Alejandro Davidovich:79|Tommy Paul:81|Jakub Menšík:80|Arthur Fils:80') },
];

export const DEMO_BOOKIES = [
  ['bet365', 'Bet365', 0.05], ['winamax', 'Winamax', 0.045], ['daznbet', 'DAZN Bet', 0.06],
  ['sportium', 'Sportium', 0.065], ['retabet', 'Retabet', 0.045],
];

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
const pois = (k, l) => (Math.exp(-l) * l ** k) / FACT[k];

/** Probabilidades de un partido de fútbol con dos Poisson independientes. */
function footballProbs(lh, la) {
  let home = 0; let draw = 0; let away = 0; let btts = 0;
  const over = { 1.5: 0, 2.5: 0, 3.5: 0 };
  for (let h = 0; h <= 10; h += 1) {
    for (let a = 0; a <= 10; a += 1) {
      const p = pois(h, lh) * pois(a, la);
      if (h > a) home += p; else if (h === a) draw += p; else away += p;
      for (const line of [1.5, 2.5, 3.5]) if (h + a > line) over[line] += p;
      if (h > 0 && a > 0) btts += p;
    }
  }
  // Las Poisson independientes se quedan cortas en empates: corrección suave.
  const extra = 0.025;
  const k = (1 - draw - extra) / (home + away);
  return { home: home * k, draw: draw + extra, away: away * k, over, btts };
}

/**
 * Genera una jornada verosímil para probar la herramienta sin fuente real:
 * fútbol con 1X2, más/menos 1,5, 2,5 y 3,5 goles y ambos marcan; baloncesto y
 * tenis a ganador. Los partidos se fijan por día; las cuotas se mueven cada minuto.
 */
export function demoEvents(now = Date.now()) {
  const day = Math.floor(now / 86400000);
  const minute = Math.floor(now / 60000);
  const rnd = mulberry32(day * 7919);
  const jitter = mulberry32(minute * 104729);
  const events = [];

  DEMO_LEAGUES.forEach((lg, li) => {
    const teams = [...lg.teams];
    for (let i = teams.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const [home, hs] = teams[i];
      const [away, as] = teams[i + 1];
      const dayOffset = Math.floor(rnd() * 7);
      const [hh, mm] = lg.slots[Math.floor(rnd() * lg.slots.length)];
      const start = new Date((day + dayOffset) * 86400000);
      start.setUTCHours(hh - 1, mm, 0, 0); // horas de España en invierno (UTC+1)
      if (start.getTime() < now + 20 * 60000) start.setUTCDate(start.getUTCDate() + 1);

      // Probabilidades verdaderas de cada mercado.
      const probs = {};
      if (lg.sport === 'soccer') {
        const lh = 1.42 * Math.exp((hs - as) / 32 + 0.06);
        const la = 1.12 * Math.exp((as - hs) / 32);
        const fp = footballProbs(lh, la);
        probs.h2h = { home: fp.home, draw: fp.draw, away: fp.away };
        for (const line of [1.5, 2.5, 3.5]) probs[`tot:${line}`] = { over: fp.over[line], under: 1 - fp.over[line] };
        probs.btts = { yes: fp.btts, no: 1 - fp.btts };
      } else {
        const diff = (hs - as + (lg.sport === 'tennis' ? 0 : 3)) / 8;
        const pHome = 1 / (1 + Math.exp(-diff));
        probs.h2h = { home: pHome, away: 1 - pHome };
      }
      const markets = Object.fromEntries(Object.entries(probs).map(([mk, o]) => [mk, sortOutcomes(Object.keys(o))]));
      const popular = ['soccer_spain_la_liga', 'soccer_epl', 'soccer_uefa_champs_league', 'basketball_nba'].includes(lg.key);

      // Exchange: precios en escalones de Betfair y liquidez según el mercado.
      const ex = { key: 'betfair_es', title: 'Betfair.es', exchange: true, updated: new Date(now - jitter() * 60000).toISOString(), link: null, m: {} };
      for (const [mk, o] of Object.entries(probs)) {
        const depth = mk === 'h2h' ? 1 : mk === 'tot:2.5' ? 0.55 : 0.25;
        ex.m[mk] = {};
        for (const [ok, p] of Object.entries(o)) {
          const fair = 1 / p;
          const back = snapToTick(fair * (1 - 0.006 + jitter() * 0.012), -1);
          const wide = jitter() < (mk === 'h2h' ? 0.15 : 0.35);
          const lay = wide ? nextTick(nextTick(back)) : nextTick(back);
          const size = Math.round(((popular ? 2600 : 700) * depth * (0.3 + rnd() * 1.6)) / 10) * 10;
          ex.m[mk][ok] = { back, lay, size };
        }
      }
      const books = [ex];

      for (const [key, title, margin] of DEMO_BOOKIES) {
        if (rnd() < 0.06) continue; // no todas las casas ofrecen todos los partidos
        const m = {};
        for (const [mk, o] of Object.entries(probs)) {
          if (mk !== 'h2h' && rnd() < 0.15) continue; // ni todos los mercados
          const extraMargin = mk === 'h2h' ? 0 : 0.015;
          m[mk] = {};
          for (const [ok, p] of Object.entries(o)) {
            let price = 1 / (p * (1 + margin + extraMargin));
            price *= 1 + (jitter() - 0.5) * 0.045;
            if (jitter() < 0.012) price *= 1.03 + jitter() * 0.04; // cuota fuera de mercado: la que busca el oddsmatcher
            price = Math.max(1.01, price);
            m[mk][ok] = { back: Number((price < 4 ? Math.round(price * 100) / 100 : Math.round(price * 20) / 20).toFixed(2)) };
          }
        }
        books.push({ key, title, exchange: false, updated: new Date(now - jitter() * 300000).toISOString(), link: null, m });
      }

      events.push({
        id: `demo-${li}-${i}-${day}`,
        sport: lg.sport,
        sportKey: lg.key,
        league: lg.title,
        home,
        away,
        start: start.toISOString(),
        markets,
        books,
      });
    }
  });
  return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
