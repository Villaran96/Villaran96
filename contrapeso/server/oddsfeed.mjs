// Descarga centralizada de cuotas: casas desde odds-api.io y The Odds API y, si hay
// credenciales, cuotas en contra reales de Betfair.es, unidas partido a partido.

import { fetchTheOddsApi, findMatches, oddsApiCost } from '../js/odds.js';
import { createBetfairClient } from './betfair.mjs';
import { mergeExchange, mergeBookmakers } from './merge.mjs';
import { createOddsApiIo } from './oddsapiio.mjs';

/** Milisegundos hasta el día 1 del mes siguiente (UTC), cuando vuelven los créditos. */
export function msToNextMonth(now = Date.now()) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - now;
}

export function createOddsFeed(cfg, { fetchImpl = fetch, log = console.log, now: clock = () => Date.now() } = {}) {
  let cache = { updated: null, events: [], remaining: null, errors: [], sources: [], problem: null };
  // The Odds API se descarga solo cuando toca (para no gastar los créditos del mes);
  // entre medias se reutilizan sus últimas cuotas al unirlas con las otras fuentes.
  let theOdds = { events: [], at: 0, dueAt: 0, problem: null };
  let refreshing = null;
  const bf = cfg.betfair.appKey && cfg.betfair.username && cfg.betfair.password
    ? createBetfairClient({ ...cfg.betfair, fetchImpl })
    : null;

  const io = cfg.oddsApiIo?.key ? createOddsApiIo({ ...cfg.oddsApiIo, fetchImpl }) : null;

  const configured = () => !!(cfg.odds.key || bf || io);

  async function refresh() {
    if (!configured()) return cache;
    if (refreshing) return refreshing;
    refreshing = (async () => {
      const errors = [];
      const sources = [];
      let events = [];
      let { remaining } = cache;
      if (io) {
        try {
          const r = await io.fetchEvents();
          events = r.events;
          errors.push(...r.errors);
          sources.push(`odds-api.io (${r.events.length} partidos con cuota${r.total > r.events.length ? ` de ${r.total}` : ''})`);
        } catch (e) {
          errors.push(`odds-api.io: ${e.message}`);
        }
      }
      if (cfg.odds.key) {
        const t = clock();
        if (t >= theOdds.dueAt || !theOdds.at) {
          try {
            const r = await fetchTheOddsApi({
              apiKey: cfg.odds.key, sports: cfg.odds.sports, regions: cfg.odds.regions, markets: cfg.odds.markets, bookmakers: cfg.odds.bookmakers || [], includeLinks: true, fetchImpl, base: cfg.odds.apiBase,
            });
            theOdds = { events: r.events, at: t, dueAt: 0, problem: null };
            remaining = r.remaining;
            errors.push(...r.errors);
          } catch (e) {
            errors.push(`The Odds API: ${e.message}`);
            if (e.remaining != null) remaining = e.remaining;
            theOdds = { ...theOdds, problem: { source: 'The Odds API', code: e.code || 'other', status: e.status || null, message: e.message, at: new Date(t).toISOString() } };
          }
          theOdds.dueAt = t + theOddsDelay(remaining, t);
        }
        if (theOdds.events.length) {
          events = events.length ? mergeBookmakers(events, theOdds.events) : theOdds.events;
          sources.push(`The Odds API (${theOdds.events.length} partidos)`);
        }
      }
      if (bf) {
        try {
          const exchange = await bf.fetchEvents({ competitions: cfg.betfair.competitions, hours: cfg.betfair.hours });
          const merged = mergeExchange(events, exchange, { keepExchanges: new Set(['betfair_es']) });
          events = merged.events;
          sources.push(`Betfair.es (${exchange.length} partidos, ${merged.matched} emparejados)`);
        } catch (e) {
          errors.push(`Betfair: ${e.message}`);
        }
      }
      const problem = theOdds.problem;
      if (events.length || !cache.events.length) {
        cache = { updated: new Date().toISOString(), events, remaining, errors, sources, problem };
      } else {
        cache = { ...cache, errors, problem, remaining: remaining ?? cache.remaining }; // si falla la descarga, se conservan las últimas cuotas buenas
      }
      log(`[cuotas] ${cache.events.length} partidos · ${sources.join(' · ') || 'sin fuentes'}${errors.length ? ` · avisos: ${errors.join('; ')}` : ''}`);
      return cache;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }

  /**
   * Lo que recibe cada plan. Sin plan de pago solo van los partidos de las mejores
   * filas, para que el oddsmatcher gratuito no pueda reconstruir el completo.
   */
  let limited = { of: null, rows: 0, value: null };
  function forPlan(full, freeRows) {
    if (full) return cache;
    // Se calcula una vez por descarga: con miles de partidos no se repite en cada petición.
    if (limited.of !== cache || limited.rows !== freeRows) {
      const rows = findMatches(cache.events, { mode: 'normal', minOdds: 1.5, maxOdds: 10 }).sort((a, b) => b.rating - a.rating).slice(0, freeRows);
      const ids = new Set(rows.map((r) => r.event.id));
      limited = { of: cache, rows: freeRows, value: { ...cache, events: cache.events.filter((e) => ids.has(e.id)), limited: true } };
    }
    return limited.value;
  }

  /**
   * Cuánto esperar hasta la próxima descarga de The Odds API: reparte los créditos que
   * quedan hasta fin de mes, nunca menos de REFRESH_MINUTES. Si la clave no vale o se han
   * acabado los créditos, no se insiste.
   */
  function theOddsDelay(remaining, t = clock()) {
    const min = cfg.odds.refreshMinutes * 60000;
    const code = theOdds.problem?.code;
    if (code === 'invalid_key') return Math.max(min, 6 * 3600000);
    if (code === 'rate_limit') return Math.max(min, 5 * 60000);
    if (code === 'quota') return Math.max(min, Math.min(msToNextMonth(t), 12 * 3600000));
    if (remaining == null) return min;
    const cost = oddsApiCost({ sports: cfg.odds.sports, markets: cfg.odds.markets, bookmakers: cfg.odds.bookmakers || [], regions: cfg.odds.regions });
    const calls = Math.floor(remaining / cost);
    if (calls <= 0) return Math.max(min, Math.min(msToNextMonth(t), 12 * 3600000));
    return Math.max(min, Math.ceil(msToNextMonth(t) / calls));
  }

  /** Cuándo volver a llamar a refresh(): lo que tarde la próxima fuente que toque. */
  function nextDelayMs(t = clock()) {
    const min = cfg.odds.refreshMinutes * 60000;
    if (io || bf) return min;
    if (cfg.odds.key) return Math.max(60000, theOdds.dueAt - t);
    return min;
  }

  const status = () => ({ remaining: cache.remaining, nextAt: cfg.odds.key ? new Date(theOdds.dueAt || clock()).toISOString() : null, problem: cache.problem });

  return {
    refresh, get: () => cache, forPlan, configured, hasBetfair: !!bf, nextDelayMs, status,
  };
}
