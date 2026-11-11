// Cuotas: proveedores de datos, normalización y búsqueda de oportunidades.
// Sin DOM: lo usan la web y el servidor (server/server.mjs).

import { rating, profitFromRating, dutch } from './calc.js';

export const EXCHANGE_KEYS = new Set(['betfair_ex_eu', 'betfair_ex_uk', 'betfair_ex_au', 'matchbook', 'smarkets', 'betdaq', 'betfair_exchange']);

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

/* ------------------------------------------------------------------------ */
/* Normalización                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Formato interno de un evento:
 * { id, sportKey, league, home, away, start (ISO), outcomes: [nombres],
 *   books: [{ key, title, exchange, back: {nombre: cuota}, lay: {nombre: cuota},
 *             liquidity: {nombre: €} | null, updated }] }
 */
export function normalizeTheOddsApi(events) {
  return (events || []).map((ev) => {
    const names = new Set();
    const books = (ev.bookmakers || []).map((bm) => {
      const back = {};
      const lay = {};
      for (const m of bm.markets || []) {
        if (m.key !== 'h2h' && m.key !== 'h2h_lay') continue;
        for (const o of m.outcomes || []) {
          if (!(o.price > 1)) continue;
          names.add(o.name);
          (m.key === 'h2h' ? back : lay)[o.name] = o.price;
        }
      }
      const exchange = EXCHANGE_KEYS.has(bm.key) || Object.keys(lay).length > 0;
      return { key: bm.key, title: bm.title, exchange, back, lay, liquidity: null, updated: bm.last_update };
    });
    return {
      id: ev.id,
      sportKey: ev.sport_key,
      league: ev.sport_title || ev.sport_key,
      home: ev.home_team,
      away: ev.away_team,
      start: ev.commence_time,
      outcomes: orderOutcomes([...names], ev.home_team, ev.away_team),
      books,
    };
  });
}

function orderOutcomes(names, home, away) {
  const rank = (n) => (n === home ? 0 : n === 'Draw' ? 1 : n === away ? 2 : 3);
  return names.sort((a, b) => rank(a) - rank(b));
}

/** "1", "X" o "2" y un nombre legible para la selección. */
export function outcomeLabel(event, name) {
  if (name === event.home) return { code: '1', text: name };
  if (name === 'Draw') return { code: 'X', text: 'Empate' };
  if (name === event.away) return { code: '2', text: name };
  return { code: '·', text: name };
}

/* ------------------------------------------------------------------------ */
/* Oddsmatcher: favor en casa contra exchange                                */
/* ------------------------------------------------------------------------ */

/**
 * opts:
 *   mode: normal | snr | sr
 *   stake: importe para calcular el beneficio de cada fila
 *   commissions: { claveExchange: % }, defaultCommission
 *   bookies, exchanges, leagues: Set de claves permitidas (null = todas)
 *   minOdds, maxOdds, minRating, maxLay, from, to (ms), q (texto), now (ms)
 */
export function findMatches(events, opts = {}) {
  const {
    mode = 'normal', stake = 10, commissions = {}, defaultCommission = 2,
    bookies = null, exchanges = null, leagues = null,
    minOdds = 1.01, maxOdds = 1000, minRating = -Infinity, maxLay = Infinity,
    from = -Infinity, to = Infinity, q = '', now = Date.now(), includeStarted = false,
  } = opts;
  const query = normalizeText(q);
  const rows = [];

  for (const ev of events) {
    const t = Date.parse(ev.start);
    if (!includeStarted && t < now) continue;
    if (t < from || t > to) continue;
    if (leagues && !leagues.has(ev.league)) continue;
    if (query && !normalizeText(`${ev.home} ${ev.away} ${ev.league}`).includes(query)) continue;

    const exBooks = ev.books.filter((b) => b.exchange && (!exchanges || exchanges.has(b.key)));
    if (!exBooks.length) continue;

    for (const name of ev.outcomes) {
      // El mejor exchange para esta selección: el que da más rating con su comisión.
      let best = null;
      for (const ex of exBooks) {
        const L = ex.lay[name];
        if (!(L > 1) || L > maxLay) continue;
        const c = (commissions[ex.key] ?? defaultCommission) / 100;
        const score = (1 - c) / (L - c);
        if (!best || score > best.score) best = { ex, L, c: c * 100, score };
      }
      if (!best) continue;

      for (const bk of ev.books) {
        if (bk.exchange) continue;
        if (bookies && !bookies.has(bk.key)) continue;
        const B = bk.back[name];
        if (!(B >= minOdds && B <= maxOdds)) continue;
        const r = rating({ back: B, lay: best.L, commission: best.c, type: mode });
        if (!(r >= minRating)) continue;
        rows.push({
          id: `${ev.id}|${name}|${bk.key}`,
          event: ev,
          name,
          label: outcomeLabel(ev, name),
          bookKey: bk.key,
          bookTitle: bk.title,
          back: B,
          exKey: best.ex.key,
          exTitle: best.ex.title,
          lay: best.L,
          commission: best.c,
          liquidity: best.ex.liquidity ? best.ex.liquidity[name] ?? null : null,
          rating: r,
          profit: profitFromRating(r, stake, mode),
          start: t,
        });
      }
    }
  }
  return rows;
}

/* ------------------------------------------------------------------------ */
/* Buscador favor-favor (dutching entre casas)                               */
/* ------------------------------------------------------------------------ */

/**
 * Para cada evento, la mejor cuota a favor de cada resultado entre las casas
 * permitidas. Con freebetBook, una de las patas se juega con la apuesta gratis
 * de esa casa y el resto se reparte entre las demás.
 */
export function findDutches(events, opts = {}) {
  const {
    bookies = null, leagues = null, freebetBook = null, stake = 10, minRating = -Infinity,
    from = -Infinity, to = Infinity, q = '', now = Date.now(), step = 0.01,
  } = opts;
  const query = normalizeText(q);
  const out = [];

  for (const ev of events) {
    const t = Date.parse(ev.start);
    if (t < now || t < from || t > to) continue;
    if (leagues && !leagues.has(ev.league)) continue;
    if (query && !normalizeText(`${ev.home} ${ev.away} ${ev.league}`).includes(query)) continue;
    const books = ev.books.filter((b) => !b.exchange && (!bookies || bookies.has(b.key) || b.key === freebetBook));
    if (ev.outcomes.length < 2) continue;

    const bestFor = (name, exclude) => {
      let best = null;
      for (const b of books) {
        if (b.key === exclude) continue;
        if (bookies && !bookies.has(b.key)) continue;
        const o = b.back[name];
        if (o > 1 && (!best || o > best.odds)) best = { odds: o, key: b.key, title: b.title };
      }
      return best;
    };

    if (!freebetBook) {
      const legs = ev.outcomes.map((n) => ({ name: n, ...bestFor(n) }));
      if (legs.some((l) => !l.odds)) continue;
      const res = dutch(legs.map((l) => ({ odds: l.odds })), { totalStake: stake, step });
      if (!res.valid || res.rating < minRating) continue;
      out.push({ id: `${ev.id}|cash`, event: ev, start: t, legs, result: res, rating: res.rating, profit: res.profit, freebetIndex: -1 });
      continue;
    }

    const fbBook = ev.books.find((b) => b.key === freebetBook);
    if (!fbBook) continue;
    ev.outcomes.forEach((name, i) => {
      const fbOdds = fbBook.back[name];
      if (!(fbOdds > 1)) return;
      const legs = ev.outcomes.map((n, j) => (j === i
        ? { name: n, odds: fbOdds, key: fbBook.key, title: fbBook.title, freebet: true }
        : { name: n, ...bestFor(n, freebetBook) }));
      if (legs.some((l) => !l.odds)) return;
      const res = dutch(legs.map((l) => ({ odds: l.odds, freebet: !!l.freebet })), { fixedIndex: i, fixedStake: stake, step });
      if (!res.valid || res.rating < minRating) return;
      out.push({ id: `${ev.id}|fb|${i}`, event: ev, start: t, legs, result: res, rating: res.rating, profit: res.profit, freebetIndex: i });
    });
  }
  return out;
}

export function normalizeText(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Lista de casas y exchanges presentes en los eventos, para los filtros. */
export function collectBooks(events) {
  const bookies = new Map();
  const exchanges = new Map();
  const leagues = new Map();
  for (const ev of events) {
    leagues.set(ev.league, (leagues.get(ev.league) || 0) + 1);
    for (const b of ev.books) (b.exchange ? exchanges : bookies).set(b.key, b.title);
  }
  const sort = (m) => [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'es'));
  return { bookies: sort(bookies), exchanges: sort(exchanges), leagues: [...leagues.keys()].sort((a, b) => a.localeCompare(b, 'es')) };
}

/* ------------------------------------------------------------------------ */
/* Proveedores                                                               */
/* ------------------------------------------------------------------------ */

const API = 'https://api.the-odds-api.com/v4';

/** Deportes activos en The Odds API. No gasta cuota. */
export async function fetchSportsList(apiKey, fetchImpl = fetch) {
  const res = await fetchImpl(`${API}/sports/?apiKey=${encodeURIComponent(apiKey)}`);
  if (!res.ok) throw await apiError(res);
  return res.json();
}

/**
 * Cuotas 1X2 (h2h) de varias ligas. Las cuotas en contra de los exchanges llegan
 * solas en el mercado h2h_lay. Cada liga y región gasta 1 crédito de cuota.
 */
export async function fetchTheOddsApi({ apiKey, sports = DEFAULT_SPORTS, regions = 'eu', fetchImpl = fetch }) {
  const all = [];
  let remaining = null;
  let used = null;
  const errors = [];
  for (const sport of sports) {
    const url = `${API}/sports/${encodeURIComponent(sport)}/odds/?apiKey=${encodeURIComponent(apiKey)}&regions=${encodeURIComponent(regions)}&markets=h2h&oddsFormat=decimal&dateFormat=iso`;
    try {
      const res = await fetchImpl(url);
      remaining = res.headers.get('x-requests-remaining') ?? remaining;
      used = res.headers.get('x-requests-used') ?? used;
      if (!res.ok) {
        const err = await apiError(res);
        // Una clave inválida o sin cuota no va a funcionar con las demás ligas.
        if (res.status === 401 || res.status === 429) throw err;
        errors.push(`${sport}: ${err.message}`);
        continue;
      }
      all.push(...normalizeTheOddsApi(await res.json()));
    } catch (e) {
      if (e.fatal) throw e;
      errors.push(`${sport}: ${e.message}`);
    }
  }
  return {
    events: all, remaining: remaining != null ? Number(remaining) : null, used: used != null ? Number(used) : null, errors, updated: new Date().toISOString(),
  };
}

async function apiError(res) {
  let msg = `Error ${res.status}`;
  try {
    const body = await res.json();
    if (body && body.message) msg = body.message;
  } catch { /* cuerpo vacío */ }
  const err = new Error(msg);
  err.status = res.status;
  err.fatal = res.status === 401 || res.status === 429;
  return err;
}

/** Tu propio servidor (server/server.mjs) sirve las cuotas ya descargadas. */
export async function fetchFromServer(baseUrl, fetchImpl = fetch) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}/api/odds`;
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------------ */
/* Datos de demostración                                                     */
/* ------------------------------------------------------------------------ */

// Escalones de precio de Betfair: una cuota de exchange solo puede tomar estos valores.
const TICKS = [[2, 0.01], [3, 0.02], [4, 0.05], [6, 0.1], [10, 0.2], [20, 0.5], [30, 1], [50, 2], [100, 5], [1000, 10]];
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

const DEMO_LEAGUES = [
  {
    key: 'soccer_spain_la_liga', title: 'LaLiga', draw: true, slots: [[14, 0], [16, 15], [18, 30], [21, 0]],
    teams: [['Real Madrid', 92], ['FC Barcelona', 91], ['Atlético de Madrid', 85], ['Athletic Club', 80], ['Villarreal', 79], ['Real Sociedad', 77], ['Real Betis', 77], ['Girona', 72], ['Sevilla', 73], ['Valencia', 72], ['Celta de Vigo', 72], ['Osasuna', 71], ['Rayo Vallecano', 71], ['Mallorca', 70], ['Getafe', 69], ['Espanyol', 70], ['Deportivo Alavés', 69], ['Elche', 67], ['Levante', 67], ['Real Oviedo', 66]],
  },
  {
    key: 'soccer_epl', title: 'Premier League', draw: true, slots: [[13, 30], [16, 0], [18, 30], [21, 0]],
    teams: [['Arsenal', 90], ['Liverpool', 90], ['Manchester City', 89], ['Chelsea', 85], ['Newcastle United', 82], ['Aston Villa', 81], ['Tottenham Hotspur', 80], ['Manchester United', 79], ['Brighton', 78], ['Nottingham Forest', 77], ['Crystal Palace', 76], ['Brentford', 75], ['Fulham', 75], ['Bournemouth', 76], ['Everton', 73], ['West Ham United', 73]],
  },
  {
    key: 'soccer_italy_serie_a', title: 'Serie A', draw: true, slots: [[15, 0], [18, 0], [20, 45]],
    teams: [['Inter', 88], ['Napoli', 85], ['Juventus', 83], ['AC Milan', 83], ['Atalanta', 82], ['AS Roma', 80], ['Lazio', 78], ['Bologna', 78], ['Fiorentina', 76], ['Como', 75], ['Torino', 72], ['Udinese', 71]],
  },
  {
    key: 'soccer_uefa_champs_league', title: 'UEFA Champions League', draw: true, slots: [[18, 45], [21, 0]],
    teams: [['Real Madrid', 92], ['FC Barcelona', 91], ['Bayern Múnich', 91], ['Paris Saint-Germain', 90], ['Liverpool', 90], ['Arsenal', 90], ['Inter', 88], ['Atlético de Madrid', 85], ['Borussia Dortmund', 82], ['Benfica', 79], ['PSV', 78], ['Club Brujas', 75]],
  },
  {
    key: 'basketball_euroleague', title: 'Euroliga', draw: false, slots: [[19, 0], [20, 30], [21, 0]],
    teams: [['Real Madrid Baloncesto', 88], ['Barça Basket', 85], ['Fenerbahçe', 88], ['Olympiacos', 87], ['Panathinaikos', 87], ['Mónaco', 86], ['Baskonia', 80], ['Valencia Basket', 82], ['Anadolu Efes', 83], ['Žalgiris', 80]],
  },
  {
    key: 'basketball_nba', title: 'NBA', draw: false, slots: [[1, 0], [2, 30], [4, 0]],
    teams: [['Oklahoma City Thunder', 93], ['Boston Celtics', 89], ['Cleveland Cavaliers', 90], ['Denver Nuggets', 88], ['New York Knicks', 87], ['Houston Rockets', 86], ['LA Lakers', 85], ['Golden State Warriors', 84], ['Minnesota Timberwolves', 85], ['Milwaukee Bucks', 82], ['Dallas Mavericks', 81], ['Miami Heat', 79]],
  },
];

export const DEMO_BOOKIES = [
  ['bet365', 'Bet365', 0.055], ['codere', 'Codere', 0.07], ['sportium', 'Sportium', 0.068], ['bwin', 'Bwin', 0.062],
  ['williamhill', 'William Hill', 0.06], ['betfair_sb', 'Betfair Sportsbook', 0.06], ['luckia', 'Luckia', 0.075],
  ['retabet', 'Retabet', 0.065], ['marcaapuestas', 'Marca Apuestas', 0.07], ['kirolbet', 'Kirolbet', 0.072],
  ['888sport', '888sport', 0.065], ['winamax', 'Winamax', 0.05], ['betway', 'Betway', 0.06], ['marathonbet', 'Marathonbet', 0.045],
  ['versus', 'Versus', 0.07], ['paston', 'Paston', 0.075],
];

/**
 * Genera una jornada verosímil para probar la herramienta sin clave de API.
 * Los partidos se fijan por día; las cuotas se mueven un poco cada minuto.
 */
export function demoEvents(now = Date.now()) {
  const day = Math.floor(now / 86400000);
  const minute = Math.floor(now / 60000);
  const rnd = mulberry32(day * 7919);
  const jitter = mulberry32(minute * 104729);
  const events = [];

  DEMO_LEAGUES.forEach((lg, li) => {
    const teams = [...lg.teams];
    // Barajado determinista para emparejar equipos.
    for (let i = teams.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    for (let i = 0; i + 1 < teams.length; i += 2) {
      const [home, hs] = teams[i];
      const [away, as] = teams[i + 1];
      const dayOffset = Math.floor(rnd() * 6);
      const [hh, mm] = lg.slots[Math.floor(rnd() * lg.slots.length)];
      const start = new Date((day + dayOffset) * 86400000);
      start.setUTCHours(hh - 1, mm, 0, 0); // horas de España en invierno (UTC+1)
      if (start.getTime() < now + 20 * 60000) start.setUTCDate(start.getUTCDate() + 1);

      // Probabilidades a partir de la fuerza de cada equipo, con ventaja de campo.
      const diff = (hs - as + 4) / 9;
      let pHome;
      let pDraw;
      let pAway;
      if (lg.draw) {
        pDraw = 0.27 - Math.min(0.1, Math.abs(diff) * 0.04);
        const pH = 1 / (1 + Math.exp(-diff));
        pHome = (1 - pDraw) * pH;
        pAway = (1 - pDraw) * (1 - pH);
      } else {
        pHome = 1 / (1 + Math.exp(-diff * 1.2));
        pAway = 1 - pHome;
      }
      const names = lg.draw ? [home, 'Draw', away] : [home, away];
      const probs = lg.draw ? [pHome, pDraw, pAway] : [pHome, pAway];

      const books = [];
      // Exchange: precios en escalones de Betfair, en contra un escalón por encima.
      const back = {};
      const lay = {};
      const liquidity = {};
      names.forEach((n, k) => {
        const fair = 1 / probs[k];
        const b = snapToTick(fair * (1 - 0.006 + jitter() * 0.012), -1);
        back[n] = b;
        lay[n] = jitter() < 0.8 ? nextTick(b) : nextTick(nextTick(b));
        liquidity[n] = Math.round((200 + rnd() * 9000 * (lg.key.includes('la_liga') || lg.key.includes('epl') ? 3 : 1)) / 10) * 10;
      });
      books.push({ key: 'betfair_ex_eu', title: 'Betfair Exchange', exchange: true, back, lay, liquidity, updated: new Date(now - jitter() * 60000).toISOString() });

      for (const [key, title, margin] of DEMO_BOOKIES) {
        if (rnd() < 0.12) continue; // no todas las casas ofrecen todos los partidos
        const odds = {};
        names.forEach((n, k) => {
          let o = 1 / (probs[k] * (1 + margin));
          o *= 1 + (jitter() - 0.5) * 0.045;
          if (jitter() < 0.012) o *= 1.03 + jitter() * 0.04; // cuota fuera de mercado: la que busca el oddsmatcher
          o = Math.max(1.01, o);
          odds[n] = Number((o < 4 ? Math.round(o * 100) / 100 : Math.round(o * 20) / 20).toFixed(2));
        });
        books.push({ key, title, exchange: false, back: odds, lay: {}, liquidity: null, updated: new Date(now - jitter() * 300000).toISOString() });
      }

      events.push({
        id: `demo-${li}-${i}-${day}`,
        sportKey: lg.key,
        league: lg.title,
        home,
        away,
        start: start.toISOString(),
        outcomes: names,
        books,
      });
    }
  });
  return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
