// Cliente de la API de Betfair (API-NG) para el exchange español.
//
// Las cuentas de Betfair.es inician sesión en identitysso.betfair.es; el resto de
// llamadas van a los endpoints generales de Betfair. La sesión del exchange
// español caduca a los 20 minutos, así que se renueva antes.
//
// Necesitas: una cuenta de Betfair.es, una clave de aplicación (App Key) y que el
// inicio de sesión por API esté permitido en tu cuenta.

import { normalizeText } from '../js/odds.js';

export const BETFAIR_SPORTS = {
  soccer: { eventTypeId: '1', marketTypes: ['MATCH_ODDS', 'OVER_UNDER_15', 'OVER_UNDER_25', 'OVER_UNDER_35', 'BOTH_TEAMS_TO_SCORE'] },
  tennis: { eventTypeId: '2', marketTypes: ['MATCH_ODDS'] },
  basketball: { eventTypeId: '7522', marketTypes: ['MATCH_ODDS'] },
};

/** Competiciones que se buscan por defecto (nombres en inglés, como los da la API). */
export const DEFAULT_COMPETITIONS = [
  'Spanish La Liga', 'Spanish Segunda Division', 'English Premier League', 'Italian Serie A', 'German Bundesliga',
  'French Ligue 1', 'Dutch Eredivisie', 'Portuguese Primeira Liga', 'UEFA Champions League', 'UEFA Europa League',
  'NBA', 'Euroleague', 'Spanish ACB',
];

export function marketKeyFor(marketType) {
  if (marketType === 'MATCH_ODDS') return 'h2h';
  if (marketType === 'BOTH_TEAMS_TO_SCORE') return 'btts';
  const m = /^OVER_UNDER_(\d)(\d)$/.exec(marketType || '');
  return m ? `tot:${m[1]}.${m[2]}` : null;
}

/** "Sevilla v Real Betis" o, en deportes de EE. UU., "Visitante @ Local". */
export function splitEventName(name) {
  const s = String(name || '');
  if (s.includes(' @ ')) {
    const [away, home] = s.split(' @ ');
    return { home: home.trim(), away: away.trim() };
  }
  const parts = s.split(/\s+v\s+|\s+vs\.?\s+/i);
  return parts.length === 2 ? { home: parts[0].trim(), away: parts[1].trim() } : null;
}

export function runnerKey(mk, runner, ev) {
  const name = String(runner.runnerName || '');
  if (mk === 'h2h') {
    if (/^(the )?draw$|^empate$/i.test(name)) return 'draw';
    const n = normalizeText(name);
    if (n === normalizeText(ev.home)) return 'home';
    if (n === normalizeText(ev.away)) return 'away';
    return { 1: 'home', 2: 'away', 3: 'draw' }[runner.sortPriority] || null;
  }
  if (mk.startsWith('tot:')) return /^over/i.test(name) ? 'over' : /^under/i.test(name) ? 'under' : null;
  if (mk === 'btts') return /^yes$/i.test(name) ? 'yes' : /^no$/i.test(name) ? 'no' : null;
  return null;
}

const SPORT_BY_TYPE = Object.fromEntries(Object.entries(BETFAIR_SPORTS).map(([sport, d]) => [d.eventTypeId, sport]));

/**
 * Convierte catálogo + libros de mercado de Betfair en eventos del modelo interno,
 * con un único libro de exchange (Betfair.es) que lleva cuota en contra, liquidez
 * disponible e identificador de mercado para el enlace directo.
 */
export function mapBetfair(catalogue, books, now = new Date()) {
  const bookById = new Map((books || []).map((b) => [b.marketId, b]));
  const events = new Map();
  for (const mc of catalogue || []) {
    const mk = marketKeyFor(mc.description?.marketType);
    if (!mk) continue;
    const mb = bookById.get(mc.marketId);
    if (!mb || mb.status !== 'OPEN' || mb.inplay) continue;
    const names = splitEventName(mc.event?.name);
    if (!names) continue;
    const id = `bf-${mc.event.id}`;
    if (!events.has(id)) {
      events.set(id, {
        id,
        sport: SPORT_BY_TYPE[mc.eventType?.id] || 'soccer',
        sportKey: `betfair_${mc.eventType?.id || ''}`,
        league: mc.competition?.name || mc.eventType?.name || 'Betfair',
        home: names.home,
        away: names.away,
        start: mc.event.openDate || mc.marketStartTime,
        markets: {},
        books: [{ key: 'betfair_es', title: 'Betfair.es', exchange: true, updated: now.toISOString(), link: null, m: {}, ids: {}, eventId: mc.event.id }],
      });
    }
    const ev = events.get(id);
    const book = ev.books[0];
    const runnerById = new Map((mc.runners || []).map((r) => [r.selectionId, r]));
    for (const r of mb.runners || []) {
      if (r.status && r.status !== 'ACTIVE') continue;
      const desc = runnerById.get(r.selectionId);
      if (!desc) continue;
      const ok = runnerKey(mk, desc, ev);
      if (!ok) continue;
      const lay = r.ex?.availableToLay?.[0];
      const back = r.ex?.availableToBack?.[0];
      if (!lay || !(lay.price > 1)) continue;
      (book.m[mk] ||= {})[ok] = { lay: lay.price, size: Math.round(lay.size * 100) / 100, back: back?.price || null };
      ((ev.markets[mk] ||= [])).includes(ok) || ev.markets[mk].push(ok);
    }
    if (book.m[mk]) book.ids[mk] = mc.marketId;
  }
  const order = ['home', 'draw', 'away', 'over', 'under', 'yes', 'no'];
  const out = [...events.values()].filter((e) => Object.keys(e.books[0].m).length);
  out.forEach((e) => Object.values(e.markets).forEach((list) => list.sort((x, y) => order.indexOf(x) - order.indexOf(y))));
  return out;
}

/** Enlace a un mercado de Betfair.es a partir de una plantilla con {marketId} y {eventId}. */
export function betfairLink(template, { marketId, eventId, sport }) {
  if (!template || !marketId) return null;
  const slug = { soccer: 'football', tennis: 'tennis', basketball: 'basketball' }[sport] || 'football';
  return template.split('{sport}').join(slug).replace('{marketId}', encodeURIComponent(marketId)).replace('{eventId}', encodeURIComponent(eventId || ''));
}

export function createBetfairClient({
  appKey, username, password,
  identityUrl = 'https://identitysso.betfair.es/api',
  apiUrl = 'https://api.betfair.com/exchange/betting/rest/v1.0',
  fetchImpl = fetch,
  sessionMinutes = 15,
}) {
  let token = null;
  let loginAt = 0;

  async function login() {
    const res = await fetchImpl(`${identityUrl}/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Application': appKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status !== 'SUCCESS' || !body.token) {
      throw new Error(`Betfair no ha dejado iniciar sesión: ${body.error || body.status || res.status}`);
    }
    token = body.token;
    loginAt = Date.now();
    return token;
  }

  async function call(method, params, retry = true) {
    if (!token || Date.now() - loginAt > sessionMinutes * 60000) await login();
    const res = await fetchImpl(`${apiUrl}/${method}/`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Application': appKey, 'X-Authentication': token },
      body: JSON.stringify(params),
    });
    const text = await res.text();
    if (!res.ok) {
      if (retry && /INVALID_SESSION_INFORMATION|NO_SESSION|INVALID_SESSION/.test(text)) {
        token = null;
        return call(method, params, false);
      }
      throw new Error(`Betfair ${method}: ${res.status} ${text.slice(0, 200)}`);
    }
    return JSON.parse(text);
  }

  const PROJECTION = ['EVENT', 'EVENT_TYPE', 'COMPETITION', 'MARKET_START_TIME', 'MARKET_DESCRIPTION', 'RUNNER_DESCRIPTION'];

  /**
   * Descarga los mercados de las próximas `hours` horas con la mejor cuota en contra y
   * su liquidez. Con competitions = ['all'] trae TODAS las competiciones de cada
   * deporte; con una lista de nombres, solo esas.
   */
  async function fetchEvents({
    sports = ['soccer', 'basketball', 'tennis'], competitions = ['all'], hours = 168, now = new Date(), maxMarkets = 8000,
  } = {}) {
    const from = now.toISOString();
    const to = new Date(now.getTime() + hours * 3600000).toISOString();
    const everything = competitions.some((c) => /^(\*|all|todas?)$/i.test(String(c).trim()));
    const wanted = new Set(competitions.map((c) => normalizeText(c)));
    const catalogue = [];
    const seen = new Set();
    const add = (list) => { for (const m of list || []) if (m && !seen.has(m.marketId)) { seen.add(m.marketId); catalogue.push(m); } };
    for (const sport of sports) {
      const def = BETFAIR_SPORTS[sport];
      if (!def) continue;
      if (everything) {
        // Todas las competiciones: se pagina por hora de inicio, tipo de mercado a tipo de
        // mercado (200 por página es lo que deja pedir Betfair con la descripción).
        for (const type of def.marketTypes) {
          let cursor = from;
          for (let page = 0; page < 80 && catalogue.length < maxMarkets; page += 1) {
            const res = await call('listMarketCatalogue', {
              filter: { eventTypeIds: [def.eventTypeId], marketTypeCodes: [type], marketStartTime: { from: cursor, to }, inPlayOnly: false },
              marketProjection: PROJECTION,
              sort: 'FIRST_TO_START',
              maxResults: 200,
              locale: 'en',
            });
            add(res);
            if (!Array.isArray(res) || res.length < 200) break;
            const last = res[res.length - 1].marketStartTime;
            // Si toda la página empieza a la misma hora, se avanza un segundo para no repetirla.
            cursor = last && last > cursor ? last : new Date(Date.parse(cursor) + 1000).toISOString();
          }
        }
        continue;
      }
      const comps = await call('listCompetitions', { filter: { eventTypeIds: [def.eventTypeId], marketStartTime: { from, to } } });
      const ids = comps.map((c) => c.competition).filter((c) => sport === 'tennis' || wanted.has(normalizeText(c.name)) || wanted.has(String(c.id))).map((c) => String(c.id));
      // Tenis: las competiciones cambian cada semana; se piden todas las del periodo.
      const groups = sport === 'tennis' ? [ids] : ids.map((id) => [id]);
      for (const group of groups) {
        if (!group.length) continue;
        const res = await call('listMarketCatalogue', {
          filter: { eventTypeIds: [def.eventTypeId], competitionIds: group, marketTypeCodes: def.marketTypes, marketStartTime: { from, to }, inPlayOnly: false },
          marketProjection: PROJECTION,
          sort: 'FIRST_TO_START',
          maxResults: 200,
          locale: 'en',
        });
        add(res);
      }
    }
    const ids = catalogue.map((m) => m.marketId);
    const groups = [];
    for (let i = 0; i < ids.length; i += 40) groups.push(ids.slice(i, i + 40));
    const results = new Array(groups.length);
    // Hasta 4 peticiones a la vez: con miles de mercados, una a una tardaría demasiado.
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, groups.length) }, async () => {
      while (next < groups.length) {
        const i = next;
        next += 1;
        results[i] = await call('listMarketBook', {
          marketIds: groups[i],
          priceProjection: { priceData: ['EX_BEST_OFFERS'], exBestOffersOverrides: { bestPricesDepth: 1 } },
        });
      }
    }));
    return mapBetfair(catalogue, results.flat().filter(Boolean), new Date());
  }

  return { login, call, fetchEvents };
}
