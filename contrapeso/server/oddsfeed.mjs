// Descarga centralizada de cuotas: casas desde odds-api.io y The Odds API y, si hay
// credenciales, cuotas en contra reales de Betfair.es, unidas partido a partido.

import { fetchTheOddsApi, findMatches } from '../js/odds.js';
import { createBetfairClient } from './betfair.mjs';
import { mergeExchange, mergeBookmakers } from './merge.mjs';
import { createOddsApiIo } from './oddsapiio.mjs';

export function createOddsFeed(cfg, { fetchImpl = fetch, log = console.log } = {}) {
  let cache = { updated: null, events: [], remaining: null, errors: [], sources: [] };
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
        try {
          const r = await fetchTheOddsApi({
            apiKey: cfg.odds.key, sports: cfg.odds.sports, regions: cfg.odds.regions, markets: cfg.odds.markets, includeLinks: true, fetchImpl, base: cfg.odds.apiBase,
          });
          events = events.length ? mergeBookmakers(events, r.events) : r.events;
          remaining = r.remaining;
          errors.push(...r.errors);
          sources.push(`The Odds API (${r.events.length} partidos)`);
        } catch (e) {
          errors.push(`The Odds API: ${e.message}`);
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
      if (events.length || !cache.events.length) {
        cache = { updated: new Date().toISOString(), events, remaining, errors, sources };
      } else {
        cache = { ...cache, errors }; // si falla la descarga, se conservan las últimas cuotas buenas
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

  return { refresh, get: () => cache, forPlan, configured, hasBetfair: !!bf };
}
