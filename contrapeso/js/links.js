// Enlaces directos al partido en la casa y en Betfair.es.
//
// Hay tres niveles, del mejor al peor:
// 1. «partido»: la fuente de cuotas da la dirección exacta (odds-api.io da la del partido
//    y a veces la de la apuesta; la API de Betfair.es da el número de mercado).
// 2. «búsqueda»: la web abre el buscador de la casa con el equipo ya escrito. La
//    dirección de búsqueda de cada casa se aprende pegando una búsqueda real.
// 3. «portada»: se abre la casa y se copia el partido para pegarlo en su buscador.
//
// Sin DOM: lo usan la web y el servidor.

/** Equipo con el que se aprende la dirección de búsqueda de cada casa. */
export const SAMPLE_TEAM = 'Sevilla';

/** Casas cuya búsqueda se puede configurar (clave del catálogo, nombre). */
export const LINK_BOOKS = [
  ['bet365', 'Bet365'], ['winamax', 'Winamax'], ['daznbet', 'DAZN Bet'], ['sportium', 'Sportium'], ['retabet', 'Retabet'], ['betfair', 'Betfair.es'],
];

const isHttps = (u) => /^https:\/\/[^\s/]+\.[^\s/]+/i.test(String(u || '').trim());

/**
 * Plantilla de búsqueda a partir de la dirección que sale al buscar `sample` en la
 * casa: «https://casa.es/buscar?q=Sevilla» → «https://casa.es/buscar?q={query}».
 */
export function learnSearch(url, sample = SAMPLE_TEAM) {
  const u = String(url || '').trim();
  if (!isHttps(u)) return null;
  const variants = [sample, encodeURIComponent(sample), sample.toLowerCase(), sample.toUpperCase()];
  for (const v of variants) {
    const i = u.indexOf(v);
    if (i > 0) return `${u.slice(0, i)}{query}${u.slice(i + v.length)}`;
  }
  const i = u.toLowerCase().indexOf(sample.toLowerCase());
  return i > 0 ? `${u.slice(0, i)}{query}${u.slice(i + sample.length)}` : null;
}

/**
 * Plantilla de Betfair.es a partir de la dirección de cualquier mercado o partido:
 * el número de mercado (1.234567890) pasa a {marketId}; si no hay, el último número
 * largo (el del partido) pasa a {eventId}.
 */
export function learnBetfair(url) {
  const u = String(url || '').trim();
  if (!isHttps(u) || !/betfair/i.test(u)) return null;
  const market = u.match(/1\.\d{6,}/);
  if (market) return { template: u.replace(market[0], '{marketId}'), kind: 'market' };
  const nums = [...u.matchAll(/\d{6,}/g)];
  if (nums.length) {
    const last = nums[nums.length - 1];
    return { template: `${u.slice(0, last.index)}{eventId}${u.slice(last.index + last[0].length)}`, kind: 'event' };
  }
  return null;
}

/** Quita lo que estorba al buscar un equipo («Sevilla FC» → «Sevilla»). */
export function searchTerm(team) {
  const cleaned = String(team || '')
    .replace(/\b(FC|CF|CD|UD|SD|RCD|AC|AS|SS|SC|AFC|CA|RC|SAD|Club)\b\.?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || String(team || '').trim();
}

export function fillSearch(template, query) {
  return String(template).split('{query}').join(encodeURIComponent(query));
}

export function fillBetfair(template, { marketId, eventId }) {
  const t = String(template || '');
  if (t.includes('{marketId}')) return marketId ? t.split('{marketId}').join(encodeURIComponent(marketId)).split('{eventId}').join(encodeURIComponent(eventId || '')) : null;
  if (t.includes('{eventId}')) return eventId ? t.split('{eventId}').join(encodeURIComponent(eventId)) : null;
  return null;
}

/** Limpia la configuración de enlaces que llega del panel (solo https y con {query}). */
export function cleanSearchLinks(obj) {
  const out = {};
  for (const [key] of LINK_BOOKS) {
    const v = String(obj?.[key] || '').trim().slice(0, 400);
    if (isHttps(v) && v.includes('{query}')) out[key] = v;
  }
  return out;
}

export const validBetfairTemplate = (t) => isHttps(t) && /betfair/i.test(t) && /\{(marketId|eventId)\}/.test(t);
