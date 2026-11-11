// Conector de odds-api.io: cuotas de casas españolas (Bet365, Winamax ES, DAZN Bet,
// Sportium, Retabet ES…) que The Odds API no cubre.
//
// SIN PROBAR CON UNA CLAVE REAL: está escrito a partir de la documentación pública
// resumida (GET /v3/events y GET /v3/odds con bookmakers por nombre; mercados «ML» y
// «Totals» con campos home/draw/away y hdp/over/under). Por eso lee varios nombres
// de campo posibles y deja en el panel de administración cualquier error que reciba.

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
  };
}

const DISPLAY = { 'Winamax ES': 'Winamax', 'Retabet ES': 'Retabet', 'Bet365 ES': 'Bet365' };

function bookKey(name) {
  const cat = findBookie(String(name).replace(/\s+es$/i, ''));
  return cat ? cat[0] : String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

/** Libros de cada casa a partir de la respuesta de /odds (objeto por casa o lista de casas). */
export function parseBooks(resp) {
  const bms = pick(resp, 'bookmakers', 'odds', 'data.bookmakers');
  let entries = [];
  if (Array.isArray(bms)) entries = bms.map((b) => [pick(b, 'name', 'bookmaker', 'title'), asArray(pick(b, 'markets', 'odds')), pick(b, 'url', 'link')]);
  else if (bms && typeof bms === 'object') entries = Object.entries(bms).map(([name, v]) => [name, Array.isArray(v) ? v : asArray(v?.markets), pick(resp, `urls.${name}`) || v?.url]);
  const books = [];
  for (const [name, markets, url] of entries) {
    if (!name) continue;
    const m = {};
    let updated = null;
    for (const mk of markets || []) {
      const mname = String(pick(mk, 'name', 'market', 'key') || '');
      const list = Array.isArray(mk.odds) ? mk.odds : mk.odds ? [mk.odds] : [];
      updated = updated || toIso(pick(mk, 'updatedAt', 'updated_at', 'lastUpdate'));
      if (/^(ml|1x2|moneyline|match winner|full ?time result|h2h|match result)$/i.test(mname)) {
        const o = list[0] || {};
        const prices = { home: toNum(pick(o, 'home', '1')), draw: toNum(pick(o, 'draw', 'x', 'X')), away: toNum(pick(o, 'away', '2')) };
        for (const [ok, price] of Object.entries(prices)) if (price > 1) (m.h2h ||= {})[ok] = { back: price, link: url || null };
      } else if (/total|over.?under|goals/i.test(mname) && !/team|corner|card|half/i.test(mname)) {
        for (const o of list) {
          const line = toNum(pick(o, 'hdp', 'line', 'points', 'handicap', 'total'));
          if (!Number.isFinite(line)) continue;
          const over = toNum(pick(o, 'over'));
          const under = toNum(pick(o, 'under'));
          const key = `tot:${line}`;
          if (over > 1) (m[key] ||= {}).over = { back: over, link: url || null };
          if (under > 1) (m[key] ||= {}).under = { back: under, link: url || null };
        }
      } else if (/both teams|btts/i.test(mname)) {
        const o = list[0] || {};
        const yes = toNum(pick(o, 'yes'));
        const no = toNum(pick(o, 'no'));
        if (yes > 1) (m.btts ||= {}).yes = { back: yes, link: url || null };
        if (no > 1) (m.btts ||= {}).no = { back: no, link: url || null };
      }
    }
    if (Object.keys(m).length) {
      books.push({
        key: bookKey(name), title: DISPLAY[name] || String(name), exchange: false, updated, link: url || null, m,
      });
    }
  }
  return books;
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
    id: `oaio-${ev.id}`, sport: 'soccer', sportKey: 'oddsapiio', league: ev.league, home: ev.home, away: ev.away, start: ev.start, markets, books,
  };
}

export function createOddsApiIo({
  key, base = 'https://api.odds-api.io/v3', bookmakers = [], leagues = [], sport = 'football', maxEvents = 80, fetchImpl = fetch,
}) {
  async function get(path, params) {
    const url = `${base}${path}?${new URLSearchParams({ apiKey: key, ...params })}`;
    const res = await fetchImpl(url);
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* no es JSON */ }
    if (!res.ok) {
      const err = new Error(`odds-api.io ${path}: ${res.status} ${body?.message || body?.error || text.slice(0, 120)}`);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  async function fetchEvents({ now = Date.now(), hours = 120 } = {}) {
    const errors = [];
    const found = new Map();
    for (const league of leagues) {
      try {
        const list = asArray(await get('/events', { sport, league, status: 'pending' }));
        for (const raw of list) {
          const ev = normEvent(raw);
          const t = ev ? Date.parse(ev.start) : NaN;
          if (ev && t > now && t < now + hours * 3600000) found.set(ev.id, ev);
        }
      } catch (e) {
        errors.push(e.message);
        if (e.status === 401 || e.status === 403) return { events: [], errors };
      }
    }
    const chosen = [...found.values()].sort((a, b) => Date.parse(a.start) - Date.parse(b.start)).slice(0, maxEvents);
    const events = [];
    let multi = true;
    for (let i = 0; i < chosen.length; i += 10) {
      const chunk = chosen.slice(i, i + 10);
      let results = null;
      if (multi) {
        try {
          const r = await get('/odds/multi', { eventIds: chunk.map((e) => e.id).join(','), bookmakers: bookmakers.join(',') });
          results = asArray(r);
        } catch (e) {
          if (e.status === 404 || e.status === 400) multi = false; else errors.push(e.message);
        }
      }
      if (!results) {
        results = [];
        for (const ev of chunk) {
          try { results.push(await get('/odds', { eventId: ev.id, bookmakers: bookmakers.join(',') })); } catch (e) { errors.push(e.message); }
        }
      }
      for (const r of results) {
        const id = String(pick(r, 'id', 'eventId', 'event_id') ?? '');
        const ev = chunk.find((e) => e.id === id) || normEvent(r);
        const model = toModel(ev, r);
        if (model) events.push(model);
      }
    }
    return { events, errors: [...new Set(errors)].slice(0, 10) };
  }

  return { fetchEvents };
}
