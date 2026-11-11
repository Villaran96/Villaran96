// Emparejar el mismo partido entre fuentes distintas (casas de The Odds API y
// exchange de Betfair.es), que escriben los nombres de los equipos a su manera.

import { normalizeText } from '../js/odds.js';

const STOP = new Set([
  'fc', 'cf', 'cd', 'ud', 'sd', 'sad', 'ac', 'ss', 'ssc', 'rcd', 'club', 'de', 'del', 'la', 'el', 'the',
  'afc', 'sc', 'fk', 'sk', 'bk', 'if', 'calcio', 'cp', 'ca', 'rc', 'cfc', 'bc', 'kc', 'tsg', 'vfb', 'vfl', 'sv', 'fsv', '1',
]);

// Nombre corto → nombre canónico (después de normalizar).
const ALIASES = {
  'man utd': 'manchester united', 'man united': 'manchester united', 'man city': 'manchester city',
  'nottm forest': 'nottingham forest', 'spurs': 'tottenham', 'tottenham hotspur': 'tottenham',
  'wolves': 'wolverhampton', 'wolverhampton wanderers': 'wolverhampton', 'sheff utd': 'sheffield united',
  'sheff wed': 'sheffield wednesday', 'west ham': 'west ham united', 'newcastle': 'newcastle united',
  'brighton and hove albion': 'brighton', 'leeds': 'leeds united', 'qpr': 'queens park rangers',
  'ath bilbao': 'athletic', 'athletic bilbao': 'athletic', 'athletic club': 'athletic',
  'atl madrid': 'atletico madrid', 'atletico de madrid': 'atletico madrid', 'atletico': 'atletico madrid', 'atl. madrid': 'atletico madrid',
  'betis': 'real betis', 'celta vigo': 'celta', 'celta de vigo': 'celta', 'deportivo alaves': 'alaves',
  'rcd espanyol': 'espanyol', 'rayo': 'rayo vallecano', 'r sociedad': 'real sociedad', 'sociedad': 'real sociedad',
  'fc barcelona': 'barcelona', 'barca': 'barcelona', 'r madrid': 'real madrid', 'r. madrid': 'real madrid',
  'real oviedo': 'oviedo', 'real valladolid': 'valladolid', 'sporting gijon': 'sporting gijon', 'sporting de gijon': 'sporting gijon',
  'inter milan': 'inter', 'internazionale': 'inter', 'ac milan': 'milan', 'as roma': 'roma', 'ss lazio': 'lazio',
  'hellas verona': 'verona', 'psg': 'paris saint germain', 'paris st g': 'paris saint germain', 'paris sg': 'paris saint germain', 'paris st germain': 'paris saint germain',
  'bayern munich': 'bayern', 'bayern munchen': 'bayern', 'bayern munchen fc': 'bayern', 'fc bayern munchen': 'bayern', 'bayern mnich': 'bayern', 'bayern munich fc': 'bayern',
  'b dortmund': 'dortmund', 'borussia dortmund': 'dortmund', 'bayer leverkusen': 'leverkusen',
  'borussia monchengladbach': 'gladbach', 'monchengladbach': 'gladbach', 'b monchengladbach': 'gladbach', 'rb leipzig': 'leipzig',
  'eintracht frankfurt': 'frankfurt', 'e frankfurt': 'frankfurt', 'sporting lisbon': 'sporting cp', 'sporting': 'sporting cp',
  'fc porto': 'porto', 'oporto': 'porto', 'sl benfica': 'benfica', 'psv eindhoven': 'psv', 'az alkmaar': 'az',
  'olympique marseille': 'marseille', 'olympique de marseille': 'marseille', 'marsella': 'marseille',
  'olympique lyonnais': 'lyon', 'olympique lyon': 'lyon', 'as monaco': 'monaco', 'ogc nice': 'nice', 'niza': 'nice',
  'club brugge': 'brugge', 'club bruges': 'brugge', 'club brujas': 'brugge', 'galatasaray as': 'galatasaray',
  'la lakers': 'los angeles lakers', 'la clippers': 'los angeles clippers', 'ny knicks': 'new york knicks',
  'okc thunder': 'oklahoma city thunder', 'gs warriors': 'golden state warriors',
};

/** Clave comparable de un equipo: sin tildes, sin siglas de club y con alias resueltos. */
export function teamKey(name) {
  let s = normalizeText(name).replace(/&/g, ' and ').replace(/[.'’`´,()/-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (ALIASES[s]) s = ALIASES[s];
  const tokens = s.split(' ').filter((t) => t && !STOP.has(t));
  let key = tokens.join(' ');
  if (ALIASES[key]) key = ALIASES[key];
  return key || s;
}

/** Parecido entre dos nombres de equipo, de 0 a 1. */
export function teamSimilarity(a, b) {
  const ka = teamKey(a);
  const kb = teamKey(b);
  if (!ka || !kb) return 0;
  if (ka === kb) return 1;
  const ta = ka.split(' ');
  const tb = kb.split(' ');
  let common = 0;
  for (const x of ta) {
    if (tb.some((y) => y === x || (x.length >= 4 && y.length >= 4 && (x.startsWith(y) || y.startsWith(x))))) common += 1;
  }
  const jaccard = common / (ta.length + tb.length - common);
  const contained = (ka.includes(kb) || kb.includes(ka)) ? 0.85 : 0;
  return Math.max(jaccard, contained);
}

const swapH2h = (m) => {
  const out = { ...m };
  if (m.h2h) {
    out.h2h = { ...m.h2h };
    const { home, away } = m.h2h;
    if (home) out.h2h.away = home; else delete out.h2h.away;
    if (away) out.h2h.home = away; else delete out.h2h.home;
  }
  return out;
};

/** El evento de `candidates` que corresponde a `ev` (mismo inicio y equipos parecidos), o null. */
function bestMatch(ev, candidates, used, { windowMinutes = 20, threshold = 0.62 } = {}) {
  const t = Date.parse(ev.start);
  let best = null;
  for (const xe of candidates) {
    if (used.has(xe.id)) continue;
    if (Math.abs(Date.parse(xe.start) - t) > windowMinutes * 60000) continue;
    const direct = [teamSimilarity(ev.home, xe.home), teamSimilarity(ev.away, xe.away)];
    const swapped = [teamSimilarity(ev.home, xe.away), teamSimilarity(ev.away, xe.home)];
    for (const [pair, swap] of [[direct, false], [swapped, true]]) {
      const score = (pair[0] + pair[1]) / 2;
      if (Math.min(...pair) < 0.4 || score < threshold) continue;
      if (!best || score > best.score) best = { xe, score, swap };
    }
  }
  return best;
}

/**
 * Junta dos fuentes de casas (por ejemplo odds-api.io y The Odds API): a cada
 * partido de la primera le añade las casas que traiga la segunda y que no tenga ya;
 * los partidos que solo están en la segunda se añaden tal cual.
 */
export function mergeBookmakers(base, extra, opts = {}) {
  const used = new Set();
  const out = base.map((ev) => {
    const m = bestMatch(ev, extra, used, opts);
    if (!m) return ev;
    used.add(m.xe.id);
    const have = new Set(ev.books.map((b) => b.key));
    const books = [...ev.books, ...m.xe.books.filter((b) => !have.has(b.key)).map((b) => ({ ...b, m: m.swap ? swapH2h(b.m) : b.m }))];
    const markets = { ...ev.markets };
    for (const b of books) {
      for (const [mk, outcomes] of Object.entries(b.m)) {
        const set = new Set(markets[mk] || []);
        Object.keys(outcomes).forEach((ok) => set.add(ok));
        markets[mk] = [...set].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y));
      }
    }
    return { ...ev, markets, books };
  });
  for (const xe of extra) if (!used.has(xe.id)) out.push(xe);
  return out;
}

const ORDER = ['home', 'draw', 'away', 'over', 'under', 'yes', 'no'];

/**
 * Une a cada evento de las casas su evento del exchange: mismo inicio (con margen)
 * y equipos parecidos. Devuelve los eventos de las casas con el libro del exchange
 * añadido y cuántos se han emparejado.
 *
 * keepExchanges: claves de exchange que se conservan de la fuente de casas (el
 * resto se quita, por ejemplo Betfair internacional cuando hay datos de Betfair.es).
 */
export function mergeExchange(bookEvents, exchangeEvents, { windowMinutes = 20, threshold = 0.62, keepExchanges = null } = {}) {
  const used = new Set();
  let matched = 0;
  const out = bookEvents.map((ev) => {
    const best = bestMatch(ev, exchangeEvents, used, { windowMinutes, threshold });
    let books = keepExchanges ? ev.books.filter((b) => !b.exchange || keepExchanges.has(b.key)) : ev.books;
    const markets = { ...ev.markets };
    if (best) {
      used.add(best.xe.id);
      matched += 1;
      const extra = best.xe.books.map((b) => ({ ...b, m: best.swap ? swapH2h(b.m) : b.m }));
      books = [...books, ...extra];
      // Mercados que solo tiene el exchange no sirven sin cuota a favor: no se añaden.
    }
    return { ...ev, markets, books };
  });
  return { events: out, matched };
}
