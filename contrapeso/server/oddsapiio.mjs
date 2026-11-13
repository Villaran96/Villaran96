// Conector de odds-api.io: cuotas de casas españolas que The Odds API no cubre y,
// si se pide, las cuotas en contra de Betfair Exchange con su liquidez.
//
// Revisado con la documentación oficial (docs.odds-api.io, especificación OpenAPI) y la
// lista pública de casas (GET /v3/bookmakers, noviembre de 2026). Sin probar todavía con
// una clave real: los errores que devuelva la API salen en Administración → Resumen.
//
// Casas españolas disponibles: «Bet365 ES», «Winamax ES» y «Retabet ES». DAZN Bet y
// Sportium solo están en su versión italiana, que no sirve para España.

import { findBookie } from '../js/data.js';

const pick = (obj, ...paths) => {
  for (const path of paths) {
    const v = String(path).split('.').reduce((o, p) => (o == null ? undefined : o[p]), obj);
    if (v != null && v !== '') return v;
  }
  return undefined;
};

const toNum = (v) => {
  const x = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(x) ? x : NaN;
};

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  for (const k of ['data', 'events', 'results', 'items']) if (v && Array.isArray(v[k])) return v[k];
  return [];
};

const toIso = (v) => {
  if (v == null) return null;
  const t = typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};

/** Datos básicos de un evento, lea los nombres de campo que lea la API. */
export function normEvent(e) {
  if (!e || typeof e !== 'object') return null;
  const home = pick(e, 'home', 'homeTeam', 'home_team', 'teams.home', 'teams.home.name', 'participants.0.name');
  const away = pick(e, 'away', 'awayTeam', 'away_team', 'teams.away', 'teams.away.name', 'participants.1.name');
  const start = toIso(pick(e, 'date', 'startTime', 'start_time', 'commence_time', 'starts_at', 'startDate', 'start'));
  const id = pick(e, 'id', 'eventId', 'event_id');
  if (id == null || !home || !away || !start) return null;
  return {
    id: String(id),
    home: String(typeof home === 'object' ? home.name : home),
    away: String(typeof away === 'object' ? away.name : away),
    start,
    league: String(pick(e, 'league.name', 'league', 'competition.name', 'competition', 'tournament.name') || 'Fútbol'),
    sport: sportOf(pick(e, 'sport.slug', 'sport.name', 'sport')),
  };
}

/** Deporte del modelo interno a partir del de odds-api.io (football, tennis, basketball…). */
export function sportOf(slug) {
  const k = String(slug || 'football').toLowerCase();
  if (k === 'football' || k === 'soccer') return 'soccer';
  if (k === 'tennis' || k === 'basketball') return k;
  return 'other';
}

// Mercados de odds-api.io que usa el oddsmatcher (nombres exactos de GET /v3/markets?sport=football).
export const IO_MARKETS = ['ML', 'Totals', 'Goals Over/Under', 'Both Teams To Score'];
const isMl = (n) => /^ml$/i.test(n);
const isTotals = (n) => /^(totals|goals over\/under)$/i.test(n);
const isBtts = (n) => /^both teams to score$/i.test(n);

const LAY_FIELDS = ['layHome', 'layDraw', 'layAway', 'layOver', 'layUnder', 'layYes', 'layNo'];

/**
 * Clave y nombre de una casa de odds-api.io. Las versiones españolas («Bet365 ES»,
 * «Winamax ES», «Retabet ES») van a la casa del catálogo; las de otros países
 * («Winamax FR», «DAZN Bet IT») quedan aparte porque sus cuotas son otras.
 */
export function bookInfo(name, exchange = false) {
  const raw = String(name || '').trim();
  const base = raw.replace(/\s*\(no latency\)\s*$/i, '');
  const country = (base.match(/\s([A-Z]{2})$/) || [])[1] || '';
  const plain = country ? base.slice(0, -3).trim() : base;
  if (/betfair/i.test(base) && exchange) {
    return country === 'ES' ? { key: 'betfair_es', title: 'Betfair.es' } : { key: 'betfair_ex_eu', title: 'Betfair (internacional)' };
  }
  if (!country || country === 'ES') {
    const cat = findBookie(plain);
    if (cat) return { key: cat[0], title: cat[1] };
  }
  return { key: base.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), title: base };
}

/** Prioridad cuando dos nombres van a la misma casa: versión española y sin retraso primero. */
const rank = (name) => (/\sES(\s|$)/.test(name) ? 2 : 0) + (/no latency/i.test(name) ? 1 : 0);

/**
 * Libros de cada casa a partir de la respuesta de /odds o /odds/multi:
 * { urls: { casa: enlace }, bookmakers: { casa: [ { name, updatedAt, odds: [ … ] } ] } }.
 * En los exchange (filas con layHome, layOver…) guarda la cuota en contra y la liquidez.
 */
export function parseBooks(resp) {
  const bms = pick(resp, 'bookmakers', 'data.bookmakers');
  let entries = [];
  if (Array.isArray(bms)) entries = bms.map((b) => [pick(b, 'name', 'bookmaker', 'title'), asArray(pick(b, 'markets', 'odds')), pick(b, 'url', 'link')]);
  else if (bms && typeof bms === 'object') entries = Object.entries(bms).map(([name, v]) => [name, Array.isArray(v) ? v : asArray(v?.markets), resp?.urls?.[name] || v?.url]);
  const byKey = new Map();
  for (const [name, markets, url] of entries) {
    if (!name) continue;
    const rows = (markets || []).flatMap((mk) => (Array.isArray(mk?.odds) ? mk.odds : mk?.odds ? [mk.odds] : []));
    const exchange = rows.some((o) => o && LAY_FIELDS.some((f) => toNum(o[f]) > 1));
    const m = {};
    let updated = null;
    const put = (mk, ok, back, lay, size, link) => {
      if (exchange ? !(lay > 1) : !(back > 1)) return;
      const slot = { link: link || url || null };
      if (back > 1) slot.back = back;
      if (exchange) { slot.lay = lay; if (size > 0) slot.size = size; }
      (m[mk] ||= {})[ok] = slot;
    };
    let tSource = null;
    for (const mk of markets || []) {
      const mname = String(pick(mk, 'name', 'market', 'key') || '').trim();
      const list = Array.isArray(mk.odds) ? mk.odds : mk.odds ? [mk.odds] : [];
      const t = toIso(pick(mk, 'updatedAt', 'updated_at', 'lastUpdate'));
      if (t && (!updated || t > updated)) updated = t;
      if (isMl(mname)) {
        const o = list[0] || {};
        put('h2h', 'home', toNum(o.home), toNum(o.layHome), toNum(o.depthLayHome), o.homeLink);
        put('h2h', 'draw', toNum(o.draw), toNum(o.layDraw), toNum(o.depthLayDraw), o.drawLink);
        put('h2h', 'away', toNum(o.away), toNum(o.layAway), toNum(o.depthLayAway), o.awayLink);
      } else if (isTotals(mname)) {
        // «Totals» manda; «Goals Over/Under» solo si la casa no da «Totals».
        if (tSource && tSource !== mname.toLowerCase()) continue;
        tSource = mname.toLowerCase();
        for (const o of list) {
          const line = toNum(pick(o, 'hdp', 'max', 'line'));
          if (!Number.isFinite(line) || line <= 0 || line > 10) continue;
          put(`tot:${line}`, 'over', toNum(o.over), toNum(o.layOver), toNum(o.depthLayOver), o.overLink);
          put(`tot:${line}`, 'under', toNum(o.under), toNum(o.layUnder), toNum(o.depthLayUnder), o.underLink);
        }
      } else if (isBtts(mname)) {
        const o = list[0] || {};
        put('btts', 'yes', toNum(o.yes), toNum(o.layYes), toNum(o.depthLayYes), o.yesLink);
        put('btts', 'no', toNum(o.no), toNum(o.layNo), toNum(o.depthLayNo), o.noLink);
      }
    }
    if (!Object.keys(m).length) continue;
    const info = bookInfo(name, exchange);
    const book = { key: info.key, title: info.title, exchange, updated, link: url || null, m, source: String(name) };
    const prev = byKey.get(info.key);
    if (!prev || rank(String(name)) > rank(prev.source)) byKey.set(info.key, book);
  }
  return [...byKey.values()].map(({ source, ...b }) => b);
}

const ORDER = ['home', 'draw', 'away', 'over', 'under', 'yes', 'no'];

/** Evento del modelo interno a partir del evento y su respuesta de cuotas. */
export function toModel(ev, resp) {
  const books = parseBooks(resp);
  if (!ev || !books.length) return null;
  const markets = {};
  for (const b of books) {
    for (const [mk, outcomes] of Object.entries(b.m)) {
      const set = new Set(markets[mk] || []);
      Object.keys(outcomes).forEach((ok) => set.add(ok));
      markets[mk] = [...set].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
    }
  }
  return {
    id: `oaio-${ev.id}`, sport: ev.sport || 'soccer', sportKey: 'oddsapiio', league: ev.league, home: ev.home, away: ev.away, start: ev.start, markets, books,
  };
}

const isExchangeName = (name) => /exchange|betfair|smarkets|matchbook|betdaq/i.test(name);

/** Ejecuta `fn` sobre cada elemento con un máximo de `n` llamadas a la vez. */
async function pool(items, n, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

/**
 * Cliente de odds-api.io. Por defecto trae TODOS los partidos que tengan cuota en
 * alguna de las casas pedidas, de todos los deportes configurados, para los próximos
 * `hours` (7 días). Con `leagues` se limita el fútbol a esas ligas.
 */
export function createOddsApiIo({
  key, base = 'https://api.odds-api.io/v3', bookmakers = [], leagues = [], sports = null, sport = 'football',
  maxEvents = 2500, hours = 168, concurrency = 4, pageSize = 1000, fetchImpl = fetch,
}) {
  const sportList = Array.isArray(sports) && sports.length ? sports : [sport];

  async function call(method, path, params) {
    const url = `${base}${path}?${new URLSearchParams({ apiKey: key, ...params })}`;
    const res = await fetchImpl(url, method === 'GET' ? undefined : { method });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* no es JSON */ }
    if (!res.ok) {
      const err = new Error(`odds-api.io ${path}: ${res.status} ${body?.message || body?.error || text.slice(0, 160)}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }
  const get = (path, params) => call('GET', path, params);

  // Las cuotas solo llegan de las casas seleccionadas en la cuenta de odds-api.io
  // (cuántas depende del plan). Se seleccionan solas la primera vez.
  let selected = false;
  async function ensureSelected(errors) {
    if (selected || !bookmakers.length) return;
    try {
      const r = await get('/bookmakers/selected', {});
      const list = (Array.isArray(r) ? r : asArray(r?.bookmakers ?? r)).map((x) => String(typeof x === 'string' ? x : x?.name || '').toLowerCase());
      const missing = bookmakers.filter((b) => !list.includes(b.toLowerCase()));
      if (missing.length) await call('PUT', '/bookmakers/selected/select', { bookmakers: missing.join(',') });
      selected = true;
    } catch (e) {
      errors.push(`${e.message} · Selecciona a mano ${bookmakers.join(', ')} en tu cuenta de odds-api.io (tu plan limita cuántas casas).`);
      if (e.status === 401) throw e;
    }
  }

  /** Todas las páginas de /events para una consulta. */
  async function listEvents(query, cap) {
    const out = [];
    for (let skip = 0; skip < cap; skip += pageSize) {
      const page = asArray(await get('/events', { ...query, limit: String(pageSize), skip: String(skip) }));
      out.push(...page);
      if (page.length < pageSize) break;
    }
    return out;
  }

  async function fetchEvents({ now = Date.now(), hours: h = hours } = {}) {
    const errors = [];
    try {
      await ensureSelected(errors);
    } catch {
      return { events: [], errors, total: 0 };
    }
    const found = new Map();
    const iso = (t) => new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
    const window = { status: 'pending', from: iso(now), to: iso(now + h * 3600000) };
    const houses = bookmakers.filter((b) => !isExchangeName(b));
    for (const sp of sportList) {
      // Con ligas (solo fútbol): esas ligas. Sin ligas: todo lo que tenga cuota en cada casa.
      const byLeague = leagues.length && sportOf(sp) === 'soccer';
      const queries = byLeague ? leagues.map((league) => ({ league })) : (houses.length ? houses : ['']).map((bookmaker) => (bookmaker ? { bookmaker } : {}));
      for (const q of queries) {
        try {
          const list = await listEvents({ sport: sp, ...window, ...q }, maxEvents * 2);
          for (const raw of list) {
            const ev = normEvent({ ...raw, sport: raw.sport || sp });
            const t = ev ? Date.parse(ev.start) : NaN;
            if (ev && t > now && t < now + h * 3600000) found.set(ev.id, ev);
          }
        } catch (e) {
          errors.push(q.league && (e.status === 400 || e.status === 404) ? `odds-api.io: la liga «${q.league}» no existe (revisa ODDSAPIIO_LEAGUES)` : e.message);
          if (e.status === 401 || e.status === 403) return { events: [], errors, total: 0 };
        }
      }
    }
    const all = [...found.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const chosen = all.slice(0, maxEvents);
    if (all.length > chosen.length) errors.push(`odds-api.io: hay ${all.length} partidos y se cargan los ${chosen.length} que empiezan antes (sube ODDSAPIIO_MAX_EVENTS para traerlos todos).`);
    const books = bookmakers.join(',');
    const markets = IO_MARKETS.join(',');
    const chunks = [];
    for (let i = 0; i < chosen.length; i += 10) chunks.push(chosen.slice(i, i + 10));
    const byChunk = new Array(chunks.length);
    let multi = true;
    await pool(chunks, concurrency, async (chunk, idx) => {
      let results = null;
      if (multi) {
        try {
          results = asArray(await get('/odds/multi', { eventIds: chunk.map((e) => e.id).join(','), bookmakers: books, markets }));
        } catch (e) {
          if (e.status === 404 || e.status === 400) multi = false; else errors.push(e.message);
        }
      }
      if (!results) {
        results = [];
        for (const ev of chunk) {
          try { results.push(await get('/odds', { eventId: ev.id, bookmakers: books, markets })); } catch (e) { errors.push(e.message); }
        }
      }
      const models = [];
      for (const r of results) {
        if (r && /^(live|settled|cancelled)$/i.test(r.status || '')) continue; // solo cuotas antes del partido
        const id = String(pick(r, 'id', 'eventId', 'event_id') ?? '');
        const ev = chunk.find((e) => e.id === id) || normEvent(r);
        const model = toModel(ev, r);
        if (model) models.push(model);
      }
      byChunk[idx] = models;
    });
    return { events: byChunk.flat().filter(Boolean), errors: [...new Set(errors)].slice(0, 10), total: all.length };
  }

  return { fetchEvents };
}
