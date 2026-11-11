// Contrapeso: interfaz. Vistas en cadenas de HTML, eventos delegados y estado en localStorage.

import * as C from './calc.js';
import * as O from './odds.js';
import {
  fmt, esc, uid, sign, storage, toast, copyText, download, icon, logoMark, isoDay,
} from './util.js';
import {
  BOOKIES, OFFER_KINDS, BET_KINDS, betKindLabel, GLOSSARY, TIPS,
} from './data.js';

const STORE_KEY = 'contrapeso:v1';
const ODDS_CACHE_KEY = 'contrapeso:odds';
const DAY = 86400000;

const SPORT_NAMES = {
  soccer_spain_la_liga: 'LaLiga',
  soccer_spain_segunda_division: 'LaLiga Hypermotion',
  soccer_epl: 'Premier League',
  soccer_italy_serie_a: 'Serie A',
  soccer_germany_bundesliga: 'Bundesliga',
  soccer_france_ligue_one: 'Ligue 1',
  soccer_uefa_champs_league: 'Champions League',
  soccer_uefa_europa_league: 'Europa League',
  basketball_nba: 'NBA',
  basketball_euroleague: 'Euroliga',
};

const EXCHANGES = [
  ['betfair_ex_eu', 'Betfair Exchange (EU)'],
  ['betfair_ex_uk', 'Betfair Exchange (UK)'],
  ['matchbook', 'Matchbook'],
  ['smarkets', 'Smarkets'],
];

/* ======================================================================== */
/* Estado                                                                    */
/* ======================================================================== */

function defaults() {
  return {
    settings: {
      theme: 'auto',
      provider: 'demo',
      apiKey: '',
      regions: 'eu',
      sports: [...O.DEFAULT_SPORTS],
      serverUrl: '',
      cacheMinutes: 10,
      defaultCommission: 2,
      commissions: { betfair_ex_eu: 2, betfair_ex_uk: 2, matchbook: 2, smarkets: 2 },
      assumptions: { qualOdds: 2.5, snrOdds: 5, srOdds: 3, spread: 2, refundRetention: 72 },
      alertRating: 100,
    },
    om: {
      view: 'fc', mode: 'normal', stake: 10, minOdds: 1.5, maxOdds: 12, minRatings: { normal: 90, snr: 65, sr: 85 }, window: '7d', q: '',
      bookies: [], exchanges: [], leagues: [], sort: 'rating', dir: 'desc', limit: 60, autoRefresh: 0,
      fbBook: '', ffStake: 10, ffMinRating: 60,
    },
    calc: {
      bl: { type: 'normal', stake: 10, back: 2.5, lay: 2.56, commission: 2, refund: 10, retention: 72, adjust: 0, context: null },
      dutch: {
        legs: [{ name: 'Local', odds: 1.75 }, { name: 'Empate', odds: 3.9 }, { name: 'Visitante', odds: 5, freebet: true }],
        mode: 'fixed', fixedIndex: 2, fixedStake: 10, totalStake: 100, step: 0.01, context: null,
      },
      acca: {
        stake: 10, type: 'normal', commission: 2,
        legs: [{ back: 1.8, lay: 1.84, status: 'pending' }, { back: 2.1, lay: 2.16, status: 'pending' }, { back: 1.65, lay: 1.69, status: 'pending' }],
      },
      roll: { deposit: 100, bonus: 100, multiplier: 6, base: 'bonus', avgRating: 97, stakePerBet: 50 },
    },
    bets: [],
    offers: [],
    seeded: false,
    ui: { offerFilter: 'open', addOffer: false, newOffer: null, betForm: null },
  };
}

function loadState() {
  const d = defaults();
  const s = storage.get(STORE_KEY, null);
  if (!s || typeof s !== 'object') return d;
  const sc = s.calc || {};
  return {
    ...d,
    settings: {
      ...d.settings, ...s.settings,
      commissions: { ...d.settings.commissions, ...(s.settings?.commissions || {}) },
      assumptions: { ...d.settings.assumptions, ...(s.settings?.assumptions || {}) },
    },
    om: { ...d.om, ...s.om, minRatings: { ...d.om.minRatings, ...(s.om?.minRatings || {}) } },
    calc: {
      bl: { ...d.calc.bl, ...sc.bl },
      dutch: { ...d.calc.dutch, ...sc.dutch },
      acca: { ...d.calc.acca, ...sc.acca },
      roll: { ...d.calc.roll, ...sc.roll },
    },
    bets: Array.isArray(s.bets) ? s.bets.map(({ confirmDelete, ...b }) => b) : [],
    offers: Array.isArray(s.offers) ? s.offers.map(({ confirmDelete, completing, ...o }) => o) : [],
    seeded: !!s.seeded,
    ui: { ...d.ui, ...(s.ui || {}), addOffer: false, betForm: null },
  };
}

const state = loadState();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.set(STORE_KEY, state), 200);
}
function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
}
function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => { if (o[k] == null) o[k] = {}; return o[k]; }, state);
  obj[last] = value;
  save();
}
const n = C.num;
const nz = (x, d = 0) => (Number.isFinite(n(x)) ? n(x) : d);

/* Datos de ejemplo: se ven marcados y se borran con un botón. */
function seedExamples() {
  if (state.seeded) return;
  const day = (offset) => isoDay(Date.now() - offset * DAY);
  const ex = [
    [118, 'Bet365', 'welcome', 'Apuesta y recibe: calificante y freebet', 21.4],
    [104, 'Codere', 'welcome', 'Reembolso de la primera apuesta', 33.85],
    [97, 'Sportium', 'welcome', 'Bono de bienvenida en freebets', 18.2],
    [83, 'Bwin', 'welcome', 'Apuesta y recibe', 26.1],
    [70, 'William Hill', 'refund', 'Reembolso en Champions', 7.95],
    [62, 'Luckia', 'welcome', 'Bono con rollover x5', 41.3],
    [49, 'Retabet', 'welcome', 'Freebet de bienvenida', 15.6],
    [41, 'Bet365', 'boost', 'Cuota mejorada', 4.2],
    [33, 'Kirolbet', 'welcome', 'Apuesta y recibe', 22.75],
    [26, 'Codere', 'reload', 'Freebet de recarga', 6.4],
    [18, 'Marca Apuestas', 'welcome', 'Reembolso de la primera apuesta', 29.5],
    [11, 'Winamax', 'qualifying', 'Calificante en LaLiga', -0.42],
    [6, 'Winamax', 'freebet', 'Freebet a cuota 6,0', 15.9],
    [2, 'Betway', 'boost', 'Supercuota NBA', 3.1],
  ];
  state.bets = ex.map(([d, bookie, kind, desc, profit]) => ({ id: uid(), date: day(d), bookie, kind, desc, profit, example: true }));
  const now = Date.now();
  state.offers = [
    { id: uid(), bookie: 'Versus', kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 25, freebetType: 'snr' }, status: 'active', done: [0, 1], deadline: isoDay(now + 9 * DAY), created: now, example: true },
    { id: uid(), bookie: 'Paston', kind: 'refund', params: { stake: 50, refund: 50, minOdds: 1.5 }, status: 'todo', done: [], deadline: '', created: now, example: true },
    { id: uid(), bookie: '888sport', kind: 'rollover', params: { deposit: 100, bonus: 100, multiplier: 6, base: 'bonus', minOdds: 1.8 }, status: 'todo', done: [], deadline: '', created: now, example: true },
    { id: uid(), bookie: 'Bet365', kind: 'bet_get', params: { qualStake: 10, minOdds: 1.2, freebet: 30, freebetType: 'snr' }, status: 'done', done: [0, 1, 2, 3, 4, 5, 6], profit: 21.4, created: now - 118 * DAY, example: true },
  ];
  state.seeded = true;
  save();
}

function clearExamples() {
  state.bets = state.bets.filter((b) => !b.example);
  state.offers = state.offers.filter((o) => !o.example);
  save();
  toast('Ejemplos borrados');
  render();
}
const hasExamples = () => state.bets.some((b) => b.example) || state.offers.some((o) => o.example);

/* ======================================================================== */
/* Cuotas                                                                    */
/* ======================================================================== */

const odds = { events: [], source: 'demo', updated: null, remaining: null, error: null, loading: false, fallback: false, warnings: [] };
const seenAlerts = new Set();
let firstLoad = true;

async function loadOdds({ force = false } = {}) {
  const s = state.settings;
  odds.loading = true;
  paintStatus();
  odds.error = null;
  odds.fallback = false;
  try {
    if (s.provider === 'api') {
      if (!s.apiKey) throw new Error('Falta tu clave de The Odds API (Ajustes → Fuente de cuotas).');
      const sig = `${s.regions}|${s.sports.join(',')}|${s.apiKey.slice(-6)}`;
      const cached = storage.get(ODDS_CACHE_KEY, null);
      const fresh = cached && cached.sig === sig && Date.now() - Date.parse(cached.updated) < nz(s.cacheMinutes, 10) * 60000;
      if (!force && fresh) {
        Object.assign(odds, { events: cached.events, updated: cached.updated, remaining: cached.remaining, source: 'api', warnings: cached.errors || [] });
      } else {
        const res = await O.fetchTheOddsApi({ apiKey: s.apiKey, sports: s.sports, regions: s.regions });
        Object.assign(odds, { events: res.events, updated: res.updated, remaining: res.remaining, source: 'api', warnings: res.errors });
        storage.set(ODDS_CACHE_KEY, { sig, ...res });
      }
    } else if (s.provider === 'server') {
      const res = await O.fetchFromServer(s.serverUrl);
      if (res.error) throw new Error(res.error);
      Object.assign(odds, { events: res.events || [], updated: res.updated, remaining: res.remaining, source: 'server', warnings: res.errors || [] });
    } else {
      Object.assign(odds, { events: O.demoEvents(Date.now()), updated: new Date().toISOString(), remaining: null, source: 'demo', warnings: [] });
    }
  } catch (e) {
    const blocked = e instanceof TypeError;
    odds.error = blocked
      ? 'El navegador no pudo conectar con la fuente de cuotas. En la vista previa de claude.ai las conexiones externas están bloqueadas: funciona cuando publicas la web en tu dominio.'
      : e.message;
    if (!odds.events.length || odds.source === 'demo') {
      Object.assign(odds, { events: O.demoEvents(Date.now()), updated: new Date().toISOString(), source: 'demo', fallback: true });
    }
  }
  odds.loading = false;
  paintStatus();
  checkAlerts();
  firstLoad = false;
  if (view && view.usesOdds) view.refresh?.();
}

function checkAlerts() {
  const threshold = n(state.settings.alertRating);
  if (!Number.isFinite(threshold)) return;
  const rows = O.findMatches(odds.events, {
    mode: 'normal', stake: 10, commissions: commissionsNum(), defaultCommission: nz(state.settings.defaultCommission), minOdds: 1.3, minRating: threshold,
  });
  const fresh = rows.filter((r) => !seenAlerts.has(r.id));
  rows.forEach((r) => seenAlerts.add(r.id));
  if (firstLoad || !fresh.length) return;
  const msg = `${fresh.length} ${fresh.length === 1 ? 'cuota nueva' : 'cuotas nuevas'} con rating de ${fmt.pct(threshold)} o más`;
  toast(msg, 'good');
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification('Contrapeso', { body: msg });
  } catch { /* sin notificaciones */ }
}

let refreshTimer;
function scheduleRefresh() {
  clearInterval(refreshTimer);
  const mins = n(state.om.autoRefresh);
  if (mins > 0) refreshTimer = setInterval(() => loadOdds({ force: true }), mins * 60000);
}

function sourceLabel() {
  if (odds.source === 'api') return 'The Odds API';
  if (odds.source === 'server') return 'Tu servidor';
  return 'Demostración';
}

function statusHTML(compact = false) {
  const live = odds.source !== 'demo';
  const dot = odds.loading ? 'loading' : odds.error ? 'warn' : live ? 'live' : 'demo';
  const parts = [`<span class="dot dot-${dot}"></span><b>${esc(sourceLabel())}</b>`];
  if (odds.updated) parts.push(`<span>${odds.loading ? 'Actualizando…' : fmt.ago(odds.updated)}</span>`);
  if (!compact && odds.remaining != null) parts.push(`<span>${odds.remaining} créditos</span>`);
  return parts.join('<span class="sep">·</span>');
}

function paintStatus() {
  document.querySelectorAll('[data-status]').forEach((el) => { el.innerHTML = statusHTML(el.dataset.status === 'compact'); });
  const om = document.getElementById('om-status');
  if (om) om.innerHTML = omStatusHTML();
}

/* ======================================================================== */
/* Componentes                                                               */
/* ======================================================================== */

const fid = (k) => `f-${k.replace(/[^a-z0-9]+/gi, '-')}`;

function field(k, label, { unit, hint, type = 'text', mode = 'decimal', placeholder = '', cls = '' } = {}) {
  const v = get(k);
  return `<label class="field ${cls}" for="${fid(k)}">
    <span class="field-label">${label}</span>
    <span class="field-input">
      <input id="${fid(k)}" data-k="${k}" type="${type}" ${type === 'text' ? `inputmode="${mode}"` : ''} value="${esc(v ?? '')}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false">
      ${unit ? `<span class="unit">${unit}</span>` : ''}
    </span>
    ${hint ? `<span class="field-hint">${hint}</span>` : ''}
  </label>`;
}

function select(k, label, options, { full = false, cls = '' } = {}) {
  const v = String(get(k) ?? '');
  return `<label class="field ${cls}" for="${fid(k)}">
    <span class="field-label">${label}</span>
    <span class="field-input"><select id="${fid(k)}" data-k="${k}" ${full ? 'data-full="1"' : ''}>
      ${options.map(([val, text]) => `<option value="${esc(val)}" ${String(val) === v ? 'selected' : ''}>${esc(text)}</option>`).join('')}
    </select></span>
  </label>`;
}

function seg(k, options, { label = '', small = false } = {}) {
  const v = String(get(k));
  return `<div class="seg ${small ? 'seg-sm' : ''}" role="radiogroup" ${label ? `aria-label="${esc(label)}"` : ''}>
    ${options.map(([val, text]) => `<button type="button" role="radio" aria-checked="${String(val) === v}" data-set="${k}" data-v="${esc(val)}">${text}</button>`).join('')}
  </div>`;
}

function oddChip(x, kind) {
  return `<span class="odd odd-${kind}">${fmt.odds(x)}</span>`;
}

function money(x, cls = '') {
  return `<span class="money ${sign(x)} ${cls}">${fmt.signedEur(x)}</span>`;
}

function ratingClass(r, mode) {
  if (!Number.isFinite(r)) return 'r-low';
  if (mode === 'snr') return r >= 85 ? 'r-hot' : r >= 75 ? 'r-good' : r >= 65 ? 'r-ok' : 'r-low';
  return r >= 100 ? 'r-hot' : r >= 97 ? 'r-good' : r >= 94 ? 'r-ok' : 'r-low';
}

function ratingBar(r, mode) {
  const [lo, hi] = mode === 'snr' ? [50, 95] : [85, 102];
  const w = Math.max(3, Math.min(100, ((r - lo) / (hi - lo)) * 100));
  return `<span class="rating ${ratingClass(r, mode)}"><b>${fmt.pct(r)}</b><span class="rbar"><i style="width:${w.toFixed(1)}%"></i></span></span>`;
}

function pageHead(title, sub = '', right = '') {
  return `<header class="page-head">
    <div class="page-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${right ? `<div class="page-actions">${right}</div>` : ''}
  </header>`;
}

function exampleBanner() {
  if (!hasExamples()) return '';
  return `<div class="banner banner-example">
    <span class="tag tag-example">Ejemplo</span>
    <span>Lo que ves en Beneficios y Bonos son datos de ejemplo para enseñarte cómo queda. Bórralos cuando empieces con los tuyos.</span>
    <button class="btn btn-ghost btn-sm" data-act="clear-examples">Borrar ejemplos</button>
  </div>`;
}

function kpi(label, value, sub = '', cls = '') {
  return `<div class="kpi ${cls}"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</div>`;
}

/* ======================================================================== */
/* Gráficos (SVG a escala, colores del tema)                                 */
/* ======================================================================== */

function monthKey(d) {
  return d.slice(0, 7);
}

/** Ancho del lienzo cercano al real para que los textos del gráfico no encojan en el móvil. */
function chartWidth(max = 600) {
  const w = (main && main.clientWidth) || max;
  return Math.round(Math.max(300, Math.min(max, w - 44)));
}

function monthlyBars(bets, months = 6) {
  const now = new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: fmt.month(d) });
  }
  const sums = Object.fromEntries(keys.map((k) => [k.key, 0]));
  bets.forEach((b) => { const k = monthKey(b.date || ''); if (k in sums) sums[k] += nz(b.profit); });
  const vals = keys.map((k) => sums[k.key]);
  const max = Math.max(1, ...vals.map((v) => Math.max(0, v)));
  const min = Math.min(0, ...vals);
  const W = chartWidth(); const H = 210; const top = 26; const bottom = 30;
  const plotH = H - top - bottom;
  const span = max - min || 1;
  const y = (v) => top + ((max - v) / span) * plotH;
  const step = W / keys.length;
  const bw = Math.min(56, step * 0.56);
  const zero = y(0);
  const bars = keys.map((k, i) => {
    const v = vals[i];
    const x = i * step + (step - bw) / 2;
    const y0 = Math.min(y(v), zero);
    const h = Math.max(v === 0 ? 0 : 2, Math.abs(y(v) - zero));
    const current = i === keys.length - 1;
    return `<g>
      <rect x="${x.toFixed(1)}" y="${y0.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" class="bar ${v < 0 ? 'bar-neg' : 'bar-pos'} ${current ? 'bar-current' : ''}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${(v < 0 ? y0 + h + 14 : y0 - 8).toFixed(1)}" class="chart-val" text-anchor="middle">${esc(fmt.eur0(v))}</text>
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 8}" class="chart-lbl ${current ? 'is-current' : ''}" text-anchor="middle">${esc(k.label)}</text>
    </g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Beneficio por mes, últimos ${months} meses">
    <line x1="0" x2="${W}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}" class="chart-zero"/>
    ${bars}
  </svg>`;
}

function cumulativeChart(bets) {
  const sorted = [...bets].filter((b) => b.date).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return '<p class="muted small">Añade al menos dos operaciones para ver la evolución.</p>';
  let acc = 0;
  const pts = sorted.map((b) => { acc += nz(b.profit); return { t: Date.parse(b.date), v: acc }; });
  const W = chartWidth(); const H = 220; const L = 54; const R = 16; const T = 18; const B = 28;
  const t0 = pts[0].t; const t1 = Math.max(pts[pts.length - 1].t, t0 + DAY);
  const vmax = Math.max(...pts.map((p) => p.v), 0);
  const vmin = Math.min(...pts.map((p) => p.v), 0);
  const niceMax = niceCeil(vmax);
  const range = (niceMax - Math.min(0, vmin)) || 1;
  const x = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v) => T + ((niceMax - v) / range) * (H - T - B);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].t).toFixed(1)},${y(Math.min(0, vmin)).toFixed(1)} L${x(pts[0].t).toFixed(1)},${y(Math.min(0, vmin)).toFixed(1)} Z`;
  const ticks = [0, niceMax / 2, niceMax].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="chart-grid"/><text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" class="chart-lbl" text-anchor="end">${esc(fmt.eur0(v))}</text>`).join('');
  const last = pts[pts.length - 1];
  const xTicks = [t0, (t0 + t1) / 2, t1].map((t, i) => `<text x="${x(t).toFixed(1)}" y="${H - 8}" class="chart-lbl" text-anchor="${['start', 'middle', 'end'][i]}">${esc(fmt.day(t))}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Beneficio acumulado">
    ${ticks}${xTicks}
    <path d="${area}" class="chart-area"/>
    <path d="${line}" class="chart-line"/>
    <circle cx="${x(last.t).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="4.5" class="chart-dot"/>
  </svg>`;
}

function niceCeil(v) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return nice * p;
}

/* ======================================================================== */
/* Utilidades de oddsmatcher                                                 */
/* ======================================================================== */

function madridEndOfDay(now = Date.now()) {
  const day = isoDay(now);
  for (const off of ['+01:00', '+02:00']) {
    const t = Date.parse(`${day}T23:59:59${off}`);
    if (isoDay(t) === day && isoDay(t + 60000) !== day) return t;
  }
  return now + DAY;
}

function windowEnd(w, now = Date.now()) {
  return { today: madridEndOfDay(now), '24h': now + DAY, '48h': now + 2 * DAY, '7d': now + 7 * DAY, all: Infinity }[w] ?? Infinity;
}

function commissionsNum() {
  return Object.fromEntries(Object.entries(state.settings.commissions).map(([k, v]) => [k, nz(v)]));
}

let booksCache = { events: null, data: null };
function available() {
  if (booksCache.events !== odds.events) {
    const data = O.collectBooks(odds.events);
    booksCache = {
      events: odds.events,
      data,
      keys: { bookies: data.bookies.map(([k]) => k), exchanges: data.exchanges.map(([k]) => k), leagues: data.leagues },
    };
  }
  return booksCache;
}

/**
 * Filtro efectivo de una lista de claves guardada. Ignora las que ya no existen en
 * los datos (por ejemplo, al cambiar de fuente de cuotas): si no queda ninguna, no filtra.
 */
function filterSet(arr, keys) {
  if (!Array.isArray(arr) || !arr.length) return null;
  if (arr.includes('__none__')) return new Set();
  const live = arr.filter((k) => keys.includes(k));
  return live.length ? new Set(live) : null;
}

let lastRows = new Map();

function omRows() {
  const o = state.om;
  const s = state.settings;
  const now = Date.now();
  const av = available().keys;
  const rows = O.findMatches(odds.events, {
    mode: o.mode,
    stake: nz(o.stake, 10),
    commissions: commissionsNum(),
    defaultCommission: nz(s.defaultCommission),
    bookies: filterSet(o.bookies, av.bookies),
    exchanges: filterSet(o.exchanges, av.exchanges),
    leagues: filterSet(o.leagues, av.leagues),
    minOdds: nz(o.minOdds, 1.01) || 1.01,
    maxOdds: nz(o.maxOdds, 1000) || 1000,
    minRating: Number.isFinite(n(o.minRatings[o.mode])) ? n(o.minRatings[o.mode]) : -Infinity,
    to: windowEnd(o.window, now),
    q: o.q,
    now,
  });
  const dir = o.dir === 'asc' ? 1 : -1;
  const key = { rating: (r) => r.rating, start: (r) => r.start, back: (r) => r.back, lay: (r) => r.lay }[o.sort] || ((r) => r.rating);
  rows.sort((a, b) => (key(a) - key(b)) * dir || b.rating - a.rating);
  lastRows = new Map(rows.map((r) => [r.id, r]));
  return rows;
}

function ffRows() {
  const o = state.om;
  const now = Date.now();
  const av = available().keys;
  const rows = O.findDutches(odds.events, {
    bookies: filterSet(o.bookies, av.bookies),
    leagues: filterSet(o.leagues, av.leagues),
    freebetBook: o.fbBook || null,
    stake: nz(o.ffStake, 10),
    minRating: Number.isFinite(n(o.ffMinRating)) ? n(o.ffMinRating) : -Infinity,
    to: windowEnd(o.window, now),
    q: o.q,
    now,
  });
  rows.sort((a, b) => b.rating - a.rating);
  lastDutches = new Map(rows.map((r) => [r.id, r]));
  return rows;
}
let lastDutches = new Map();

/** Claves de casa en los datos actuales que corresponden a un nombre del catálogo. */
function bookieKeysFor(name) {
  const target = O.normalizeText(name).replace(/\s/g, '');
  const keys = new Set();
  for (const ev of odds.events) {
    for (const b of ev.books) {
      if (b.exchange) continue;
      const t = O.normalizeText(b.title).replace(/\s/g, '');
      if (t === target || t.startsWith(target) || target.startsWith(t) || b.key === target) keys.add(b.key);
    }
  }
  return [...keys];
}

/* ======================================================================== */
/* Vista: Inicio                                                             */
/* ======================================================================== */

function renderHome() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const total = state.bets.reduce((a, b) => a + nz(b.profit), 0);
  const month = state.bets.filter((b) => monthKey(b.date || '') === thisMonth).reduce((a, b) => a + nz(b.profit), 0);
  const open = state.offers.filter((o) => o.status === 'todo' || o.status === 'active');
  const pending = open.reduce((a, o) => a + C.offerValue(o, assumptions()), 0);
  const done = state.offers.filter((o) => o.status === 'done').length;

  return `${pageHead('Resumen', 'Lo que llevas ganado, lo que te queda por sacar y las mejores cuotas de ahora mismo.')}
  ${exampleBanner()}
  <section class="kpis">
    ${kpi('Beneficio total', fmt.eur(total), `${state.bets.length} operaciones`, total >= 0 ? 'kpi-pos' : 'kpi-neg')}
    ${kpi('Este mes', fmt.eur(month), fmt.month(now))}
    ${kpi('Por sacar en bonos', fmt.eur(pending), `${open.length} ${open.length === 1 ? 'promoción abierta' : 'promociones abiertas'}`, 'kpi-brass')}
    ${kpi('Bonos completados', String(done), `de ${state.offers.length} apuntados`)}
  </section>
  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Beneficio por mes</h2><a class="link" href="#beneficios">Ver todo ${icon('arrow', 14)}</a></div>
      ${monthlyBars(state.bets)}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Siguiente paso</h2><a class="link" href="#bonos">Bonos ${icon('arrow', 14)}</a></div>
      ${nextSteps()}
    </section>
  </div>
  <section class="panel">
    <div class="panel-head">
      <h2>Mejores cuotas ahora</h2>
      <span class="status-inline" data-status="full">${statusHTML()}</span>
      <a class="link" href="#oddsmatcher">Abrir oddsmatcher ${icon('arrow', 14)}</a>
    </div>
    <div id="home-top">${homeTop()}</div>
  </section>`;
}

function homeTop() {
  const rows = O.findMatches(odds.events, {
    mode: 'normal', stake: nz(state.om.stake, 10), commissions: commissionsNum(), defaultCommission: nz(state.settings.defaultCommission), minOdds: 1.5, maxOdds: 10, to: Date.now() + 7 * DAY,
  }).sort((a, b) => b.rating - a.rating).slice(0, 6);
  rows.forEach((r) => lastRows.set(r.id, r));
  if (!rows.length) return '<p class="muted">No hay cuotas cargadas todavía.</p>';
  return `<div class="top-list">${rows.map((r) => `
    <button class="top-item" data-act="om-calc" data-id="${esc(r.id)}" data-mode="normal">
      <span class="top-when">${esc(fmt.date(r.start))} · ${esc(fmt.time(r.start))}</span>
      <span class="top-event">${esc(r.event.home)} – ${esc(r.event.away)}</span>
      <span class="top-sel"><span class="code">${r.label.code}</span>${esc(r.label.text)}</span>
      <span class="top-odds">${esc(r.bookTitle)} ${oddChip(r.back, 'back')} ${oddChip(r.lay, 'lay')}</span>
      ${ratingBar(r.rating, 'normal')}
    </button>`).join('')}</div>`;
}

function nextSteps() {
  const active = state.offers.filter((o) => o.status === 'active' || o.status === 'todo')
    .sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1));
  if (!active.length) {
    return `<div class="empty"><p>No tienes promociones abiertas.</p><a class="btn btn-sm" href="#bonos" data-act="open-add-offer">${icon('plus', 16)} Añadir una</a></div>`;
  }
  return `<ul class="steps-mini">${active.slice(0, 4).map((o) => {
    const kind = OFFER_KINDS[o.kind] || OFFER_KINDS.other;
    const steps = kind.steps(o.params || {}, o.bookie);
    const idx = steps.findIndex((_, i) => !(o.done || []).includes(i));
    const step = steps[idx] || steps[steps.length - 1];
    return `<li>
      <div class="sm-top"><b>${esc(o.bookie)}</b><span class="pill pill-${o.status}">${o.status === 'active' ? 'En curso' : 'Por hacer'}</span>${o.example ? '<span class="tag tag-example">Ejemplo</span>' : ''}</div>
      <p>${idx >= 0 ? `<span class="muted">Paso ${idx + 1} de ${steps.length}.</span> ` : ''}${esc(step.text)}</p>
      ${step.action ? `<button class="btn btn-ghost btn-sm" data-act="step-action" data-offer="${o.id}" data-step="${idx}">${esc(step.action.label)} ${icon('arrow', 14)}</button>` : ''}
    </li>`;
  }).join('')}</ul>`;
}

/* ======================================================================== */
/* Vista: Oddsmatcher                                                        */
/* ======================================================================== */

function omStatusHTML() {
  const warn = odds.error ? `<div class="banner banner-warn">${icon('info', 16)}<span>${esc(odds.error)}${odds.fallback ? ' Mientras tanto ves cuotas de demostración.' : ''}</span>${odds.error.includes('clave') ? '<a class="btn btn-ghost btn-sm" href="#ajustes">Ajustes</a>' : ''}</div>` : '';
  const demo = odds.source === 'demo' && !odds.error
    ? `<div class="banner banner-demo">${icon('info', 16)}<span>Cuotas simuladas para probar la herramienta. Para cuotas reales, conecta una fuente en <a href="#ajustes">Ajustes</a>.</span></div>` : '';
  const warnings = odds.warnings && odds.warnings.length ? `<details class="warn-list"><summary>${odds.warnings.length} avisos de la fuente</summary><ul>${odds.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>` : '';
  return `${warn}${demo}${warnings}`;
}

function multiPicker(k, label, items) {
  const arr = get(k) || [];
  const itemKeys = items.map(([key]) => key);
  const live = arr.filter((key) => itemKeys.includes(key));
  const none = arr.includes('__none__');
  const all = !none && !live.length;
  const selected = new Set(live);
  const summary = none ? 'Ninguna' : all ? 'Todas' : `${selected.size} de ${items.length}`;
  return `<details class="multi" data-multi="${k}">
    <summary><span class="field-label">${label}</span><span class="multi-value" data-multi-label="${k}">${summary}</span></summary>
    <div class="multi-body">
      <div class="multi-actions"><button type="button" class="btn btn-ghost btn-xs" data-act="multi-all" data-k="${k}">Todas</button><button type="button" class="btn btn-ghost btn-xs" data-act="multi-none" data-k="${k}">Ninguna</button></div>
      <div class="multi-grid">${items.map(([key, title]) => `<label class="check"><input type="checkbox" data-multi-item="${k}" value="${esc(key)}" ${all || selected.has(key) ? 'checked' : ''}><span>${esc(title)}</span></label>`).join('')}</div>
    </div>
  </details>`;
}

function renderOddsmatcher() {
  const o = state.om;
  const { bookies, exchanges, leagues } = available().data;
  const filtersOpen = window.matchMedia('(min-width: 900px)').matches;

  const modeHint = o.mode === 'normal' ? 'Rating 100 % = no pierdes nada en la calificante.' : o.mode === 'snr' ? 'Rating = % de la apuesta gratis que conviertes en dinero.' : 'Rating = % de la apuesta gratis (con devolución) que conviertes.';

  const fcFilters = `
    <div class="filter-row">
      <div class="field"><span class="field-label">Tipo de apuesta</span>${seg('om.mode', [['normal', 'Calificante'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR']])}<span class="field-hint">${modeHint}</span></div>
    </div>
    <div class="filter-grid">
      ${field('om.stake', o.mode === 'normal' ? 'Importe a favor' : 'Importe de la freebet', { unit: '€' })}
      ${field('om.minOdds', 'Cuota mínima')}
      ${field('om.maxOdds', 'Cuota máxima')}
      ${field(`om.minRatings.${o.mode}`, 'Rating mínimo', { unit: '%' })}
    </div>`;

  const ffFilters = `
    <div class="filter-grid">
      ${select('om.fbBook', 'Apuesta gratis en', [['', 'Ninguna (todo con dinero)'], ...bookies], { full: true })}
      ${field('om.ffStake', o.fbBook ? 'Importe de la freebet' : 'Total a repartir', { unit: '€' })}
      ${field('om.ffMinRating', 'Rating mínimo', { unit: '%' })}
    </div>
    <p class="field-hint">${o.fbBook ? 'Juegas la apuesta gratis en un resultado y cubres los demás con dinero en otras casas. Rating = % de la freebet que conviertes.' : 'Cubres todos los resultados con dinero en casas distintas. Rating por encima de 100 % es una surebet.'}</p>`;

  return `${pageHead('Oddsmatcher', 'Cuotas a favor en las casas emparejadas con la mejor cuota en contra del exchange, ordenadas por rating.', `
      <div class="seg seg-lg" role="tablist" aria-label="Tipo de búsqueda">
        <button type="button" role="tab" aria-selected="${o.view === 'fc'}" data-set="om.view" data-v="fc">Favor-contra</button>
        <button type="button" role="tab" aria-selected="${o.view === 'ff'}" data-set="om.view" data-v="ff">Favor-favor</button>
      </div>`)}
    <div class="om-bar">
      <span class="status-inline" data-status="full">${statusHTML()}</span>
      <div class="om-bar-actions">
        <label class="inline-select" for="f-om-autoRefresh">${icon('clock', 16)}
          <select id="f-om-autoRefresh" data-k="om.autoRefresh" data-act-change="auto-refresh" aria-label="Actualización automática">
            ${[[0, 'Sin auto'], [1, 'Cada 1 min'], [2, 'Cada 2 min'], [5, 'Cada 5 min'], [10, 'Cada 10 min']].map(([v, t]) => `<option value="${v}" ${String(o.autoRefresh) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-sm" data-act="refresh-odds">${icon('refresh', 16)} Actualizar</button>
      </div>
    </div>
    <div id="om-status">${omStatusHTML()}</div>
    <details class="panel om-filters" ${filtersOpen ? 'open' : ''}>
      <summary class="panel-head"><h2>${icon('filter', 16)} Filtros</h2><span class="muted small">Se guardan solos</span></summary>
      <div class="om-filter-body">
      ${o.view === 'fc' ? fcFilters : ffFilters}
      <div class="filter-grid">
        <label class="field" for="f-om-q"><span class="field-label">Buscar</span><span class="field-input with-icon">${icon('search', 16)}<input id="f-om-q" data-k="om.q" type="search" value="${esc(o.q)}" placeholder="Equipo o liga" autocomplete="off"></span></label>
        ${select('om.window', 'Cuándo', [['today', 'Hoy'], ['24h', 'Próximas 24 h'], ['48h', 'Próximas 48 h'], ['7d', 'Próximos 7 días'], ['all', 'Todo']])}
        ${multiPicker('om.bookies', 'Casas', bookies)}
        ${o.view === 'fc' ? multiPicker('om.exchanges', 'Exchanges', exchanges) : ''}
        ${multiPicker('om.leagues', 'Ligas', leagues.map((l) => [l, l]))}
      </div>
      </div>
    </details>
    <section id="om-results" class="om-results">${o.view === 'fc' ? omResults() : ffResults()}</section>`;
}

function sortBtn(key, label) {
  const o = state.om;
  const active = o.sort === key;
  return `<button type="button" class="th ${active ? 'is-sorted' : ''}" data-act="om-sort" data-key="${key}" aria-sort="${active ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${label}${active ? `<span class="arrow">${o.dir === 'asc' ? '↑' : '↓'}</span>` : ''}</button>`;
}

function omResults() {
  const o = state.om;
  const rows = omRows();
  const limit = nz(o.limit, 60);
  const shown = rows.slice(0, limit);
  const head = `<div class="results-head"><span><b>${rows.length}</b> ${rows.length === 1 ? 'cuota' : 'cuotas'}${rows.length > limit ? `, se muestran ${limit}` : ''}</span>
    <span class="muted small">Beneficio con ${fmt.eur(nz(o.stake, 10))} ${o.mode === 'normal' ? 'de calificante' : 'de apuesta gratis'}</span></div>`;
  if (!rows.length) {
    return `${head}<div class="empty"><p>Ninguna cuota cumple los filtros.</p><p class="muted small">Prueba a bajar el rating mínimo o ampliar el rango de cuotas.</p></div>`;
  }
  return `${head}
  <div class="om-table" role="table" aria-label="Cuotas encontradas">
    <div class="om-row om-header" role="row">
      ${sortBtn('start', 'Fecha')}<span class="th">Evento</span><span class="th">Selección</span>${sortBtn('back', 'A favor')}${sortBtn('lay', 'En contra')}${sortBtn('rating', 'Rating')}<span class="th"></span>
    </div>
    ${shown.map((r) => `<div class="om-row" role="row">
      <div class="c-when"><span>${esc(fmt.date(r.start))}</span><b>${esc(fmt.time(r.start))}</b></div>
      <div class="c-event"><b>${esc(r.event.home)} – ${esc(r.event.away)}</b><span>${esc(r.event.league)} · ${esc(fmt.until(r.start))}</span></div>
      <div class="c-sel"><span class="code">${r.label.code}</span><span>${esc(r.label.text)}</span></div>
      <div class="c-back"><span class="book">${esc(r.bookTitle)}</span>${oddChip(r.back, 'back')}</div>
      <div class="c-lay">${oddChip(r.lay, 'lay')}<span class="ex"><span class="book">${esc(r.exTitle)}</span>${r.liquidity ? `<span class="liq">${fmt.eur0(r.liquidity)} disponibles</span>` : ''}</span></div>
      <div class="c-rating">${ratingBar(r.rating, o.mode)}${money(r.profit, 'small')}</div>
      <div class="c-act"><button class="btn btn-sm btn-primary" data-act="om-calc" data-id="${esc(r.id)}" data-mode="${o.mode}">Calcular</button></div>
    </div>`).join('')}
  </div>
  ${rows.length > limit ? `<div class="more"><button class="btn" data-act="om-more">Mostrar ${Math.min(60, rows.length - limit)} más</button></div>` : ''}`;
}

function ffResults() {
  const o = state.om;
  const rows = ffRows();
  const limit = nz(o.limit, 60);
  const shown = rows.slice(0, limit);
  const head = `<div class="results-head"><span><b>${rows.length}</b> ${rows.length === 1 ? 'combinación' : 'combinaciones'}</span><span class="muted small">${o.fbBook ? `Freebet de ${fmt.eur(nz(o.ffStake, 10))}` : `Repartiendo ${fmt.eur(nz(o.ffStake, 10))}`}</span></div>`;
  if (!rows.length) return `${head}<div class="empty"><p>No hay combinaciones con esos filtros.</p><p class="muted small">Baja el rating mínimo o elige otra casa para la apuesta gratis.</p></div>`;
  return `${head}<div class="ff-list">${shown.map((d) => `
    <article class="ff-card">
      <header>
        <div class="c-event"><b>${esc(d.event.home)} – ${esc(d.event.away)}</b><span>${esc(d.event.league)} · ${esc(fmt.date(d.start))} ${esc(fmt.time(d.start))}</span></div>
        ${ratingBar(d.rating, o.fbBook ? 'snr' : 'normal')}
      </header>
      <ul class="ff-legs">${d.legs.map((l, i) => {
        const lab = O.outcomeLabel(d.event, l.name);
        return `<li><span class="code">${lab.code}</span><span class="ff-name">${esc(lab.text)}</span><span class="book">${esc(l.title)}${l.freebet ? ' <span class="tag tag-fb">freebet</span>' : ''}</span>${oddChip(l.odds, 'back')}<span class="ff-stake">${fmt.eur(d.result.stakes[i])}</span></li>`;
      }).join('')}</ul>
      <footer><span>Beneficio ${money(d.profit)}</span><button class="btn btn-sm btn-primary" data-act="ff-calc" data-id="${esc(d.id)}">Calcular</button></footer>
    </article>`).join('')}</div>
    ${rows.length > limit ? `<div class="more"><button class="btn" data-act="om-more">Mostrar más</button></div>` : ''}`;
}

function refreshOm() {
  const el = document.getElementById('om-results');
  if (el) el.innerHTML = state.om.view === 'fc' ? omResults() : ffResults();
}

/* ======================================================================== */
/* Vista: Calculadoras                                                       */
/* ======================================================================== */

function calcTabs(active) {
  const tabs = [['calculadora', 'Favor-contra'], ['favor-favor', 'Favor-favor'], ['combinadas', 'Combinadas'], ['rollover', 'Rollover']];
  return `<nav class="tabs" aria-label="Calculadoras">${tabs.map(([k, t]) => `<a href="#${k}" class="tab ${k === active ? 'is-active' : ''}" ${k === active ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}

function contextBanner(ctx, clearAct) {
  if (!ctx) return '';
  return `<div class="ctx">
    <div><span class="muted small">${esc(ctx.league || '')}${ctx.start ? ` · ${esc(fmt.date(ctx.start))} ${esc(fmt.time(ctx.start))}` : ''}</span>
    <b>${esc(ctx.event)}</b>${ctx.sel ? `<span>${esc(ctx.sel)}${ctx.bookie ? ` · ${esc(ctx.bookie)}` : ''}${ctx.exchange ? ` → ${esc(ctx.exchange)}` : ''}</span>` : ''}</div>
    <button class="btn btn-ghost btn-icon" data-act="${clearAct}" aria-label="Quitar el partido">${icon('x', 16)}</button>
  </div>`;
}

function renderBackLay() {
  const c = state.calc.bl;
  return `${pageHead('Calculadoras', 'Calcula cuánto apostar en contra para cubrir cualquier apuesta.')}
  ${calcTabs('calculadora')}
  <div class="calc-grid">
    <section class="panel">
      ${contextBanner(c.context, 'bl-clear')}
      <div class="field"><span class="field-label">Tipo de apuesta</span>
        ${seg('calc.bl.type', [['normal', 'Calificante'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR'], ['refund', 'Reembolso']])}
        <span class="field-hint">${esc(TIPS[c.type] || '')}</span>
      </div>
      <div class="form-grid pair">
        ${field('calc.bl.stake', c.type === 'snr' || c.type === 'sr' ? 'Importe de la freebet' : 'Importe a favor', { unit: '€' })}
        ${field('calc.bl.commission', 'Comisión exchange', { unit: '%' })}
        ${field('calc.bl.back', 'Cuota a favor', { cls: 'field-back' })}
        ${field('calc.bl.lay', 'Cuota en contra', { cls: 'field-lay' })}
        ${c.type === 'refund' ? `${field('calc.bl.refund', 'Reembolso si pierde', { unit: '€' })}${field('calc.bl.retention', 'Retención esperada', { unit: '%' })}` : ''}
      </div>
      <div class="field">
        <span class="field-label">Reparto entre resultados <output id="adjust-label" class="muted">${adjustLabel(c.adjust)}</output></span>
        <input type="range" id="f-calc-bl-adjust" data-k="calc.bl.adjust" min="-60" max="60" step="1" value="${esc(c.adjust)}" aria-describedby="adjust-help">
        <span class="range-ends"><span>Underlay: gana más si acierta a favor</span><button type="button" class="link" data-act="bl-reset-adjust">Igualar</button><span>Overlay: gana más si acierta en contra</span></span>
      </div>
    </section>
    <section class="panel result" id="bl-result" aria-live="polite">${backLayResult()}</section>
  </div>`;
}

function adjustLabel(a) {
  const v = nz(a);
  if (v === 0) return 'Equilibrado';
  return v < 0 ? `Underlay ${Math.abs(v)} %` : `Overlay ${v} %`;
}

function backLayInput() {
  const c = state.calc.bl;
  const base = C.backLay({ ...c, layStake: undefined });
  const adj = nz(c.adjust);
  return { c, base, res: base.valid && adj ? C.backLay({ ...c, layStake: base.idealLayStake * (1 + adj / 100) }) : base };
}

function backLayResult() {
  const { c, res } = backLayInput();
  if (!res.valid) return '<div class="empty"><p>Escribe el importe y las dos cuotas.</p><p class="muted small">Las cuotas tienen que ser mayores que 1. Puedes usar coma o punto.</p></div>';
  const stake = n(c.stake);
  const isFree = c.type === 'snr' || c.type === 'sr';
  const bookOnBackWin = c.type === 'snr' ? stake * (n(c.back) - 1) : isFree ? stake * n(c.back) : stake * (n(c.back) - 1);
  const bookOnLayWin = isFree ? 0 : -stake;
  const exOnBackWin = -res.liability;
  const exOnLayWin = res.layStake * (1 - n(c.commission) / 100);
  const refundVal = c.type === 'refund' ? n(c.refund) * n(c.retention) / 100 : 0;
  const instr = `Apuesta ${fmt.eur(stake)}${isFree ? ' (apuesta gratis)' : ''} a favor a ${fmt.odds(n(c.back))} y ${fmt.eur(res.layStake)} en contra a ${fmt.odds(n(c.lay))}. Necesitas ${fmt.eur(res.liability)} de saldo en el exchange.`;

  // Sensibilidad: qué pasa si la cuota en contra se mueve antes de cubrir.
  const L = n(c.lay);
  let down = L; let up = L;
  const lows = []; const highs = [];
  for (let i = 0; i < 2; i += 1) { down = prevTick(down); lows.unshift(down); up = O.nextTick(up); highs.push(up); }
  const sens = [...lows, L, ...highs].filter((x) => x > 1).map((l) => {
    const r = C.backLay({ ...c, lay: l, layStake: undefined });
    return { l, p: r.profit, cur: l === L };
  });

  const metric = isFree
    ? `<div class="metric"><span>Retención</span><b>${fmt.pct(res.retention)}</b></div>`
    : `<div class="metric"><span>Rating</span><b>${fmt.pct(res.rating)}</b></div>`;

  return `<div class="hero-number">
      <span class="eyebrow">Apuesta en contra</span>
      <span class="big lay-ink">${fmt.eur(res.layStake)}</span>
      <span class="sub">a cuota ${fmt.odds(n(c.lay))} · responsabilidad <b>${fmt.eur(res.liability)}</b></span>
    </div>
    <p class="instr">${esc(instr)}</p>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Si gana</th><th>Casa</th><th>Exchange</th><th>Total</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span class="dot-back"></span>A favor</th><td>${money(bookOnBackWin)}</td><td>${money(exOnBackWin)}</td><td><b>${money(res.ifBackWins)}</b></td></tr>
        <tr><th scope="row"><span class="dot-lay"></span>En contra</th><td>${money(bookOnLayWin)}${refundVal ? `<span class="muted small"> + ${fmt.eur(refundVal)} reembolso</span>` : ''}</td><td>${money(exOnLayWin)}</td><td><b>${money(res.ifLayWins)}</b></td></tr>
      </tbody>
    </table></div>
    <div class="metrics">
      <div class="metric"><span>Beneficio asegurado</span><b class="${sign(res.profit)}">${fmt.signedEur(res.profit)}</b></div>
      ${metric}
    </div>
    <div class="sens">
      <span class="field-label">Si la cuota en contra se mueve</span>
      <div class="sens-row">${sens.map((s) => `<span class="sens-cell ${s.cur ? 'is-current' : ''}"><span class="odd odd-lay">${fmt.odds(s.l)}</span><span class="money ${sign(s.p)}">${fmt.signedEur(s.p)}</span></span>`).join('')}</div>
    </div>
    <div class="actions">
      <button class="btn" data-act="copy-instr" data-text="${esc(instr)}">${icon('copy', 16)} Copiar</button>
      <button class="btn btn-primary" data-act="bl-log">${icon('save', 16)} Anotar en beneficios</button>
    </div>`;
}

function prevTick(price) {
  const steps = [[2, 0.01], [3, 0.02], [4, 0.05], [6, 0.1], [10, 0.2], [20, 0.5], [30, 1], [50, 2], [100, 5], [1000, 10]];
  let lo = 1.01;
  for (const [limit, step] of steps) {
    if (price <= limit) return Math.max(1.01, Number((price - step).toFixed(2)));
    lo = limit;
  }
  return lo;
}

function refreshBackLay() {
  const el = document.getElementById('bl-result');
  if (el) el.innerHTML = backLayResult();
  const lab = document.getElementById('adjust-label');
  if (lab) lab.textContent = adjustLabel(state.calc.bl.adjust);
}

/* Favor-favor */

function renderDutch() {
  const d = state.calc.dutch;
  return `${pageHead('Calculadoras', 'Reparte apuestas a favor entre varios resultados para ganar lo mismo pase lo que pase.')}
  ${calcTabs('favor-favor')}
  <div class="calc-grid">
    <section class="panel">
      ${contextBanner(d.context, 'dutch-clear')}
      <div class="field"><span class="field-label">Cómo repartir</span>${seg('calc.dutch.mode', [['fixed', 'Fijar una apuesta'], ['total', 'Repartir un total']])}</div>
      <div class="form-grid pair">
        ${d.mode === 'total' ? field('calc.dutch.totalStake', 'Total a repartir (con dinero)', { unit: '€' }) : field('calc.dutch.fixedStake', `Importe de la apuesta ${nz(d.fixedIndex) + 1}`, { unit: '€' })}
        <div class="field"><span class="field-label">Redondear importes a</span>${seg('calc.dutch.step', [['0.01', '0,01 €'], ['0.1', '0,10 €'], ['1', '1 €']], { small: true })}</div>
      </div>
      <div class="legs">
        <div class="legs-head"><span>Resultado</span><span>Cuota</span><span>Comisión</span><span>Freebet</span>${d.mode === 'fixed' ? '<span>Fijar</span>' : ''}<span></span></div>
        ${d.legs.map((l, i) => `<div class="leg ${d.mode === 'fixed' ? '' : 'leg-nofix'}">
          <input class="l-name" data-k="calc.dutch.legs.${i}.name" value="${esc(l.name ?? '')}" aria-label="Nombre del resultado ${i + 1}" placeholder="Resultado ${i + 1}">
          <input data-k="calc.dutch.legs.${i}.odds" inputmode="decimal" value="${esc(l.odds ?? '')}" aria-label="Cuota del resultado ${i + 1}" class="in-back l-odds">
          <span class="field-input l-comm"><input data-k="calc.dutch.legs.${i}.commission" inputmode="decimal" value="${esc(l.commission ?? '')}" placeholder="0" aria-label="Comisión del resultado ${i + 1}"><span class="unit">%</span></span>
          <label class="toggle l-fb"><input type="checkbox" data-k="calc.dutch.legs.${i}.freebet" ${l.freebet ? 'checked' : ''}><span class="sr">Freebet en el resultado ${i + 1}</span></label>
          ${d.mode === 'fixed' ? `<label class="radio l-fix"><input type="radio" name="dutch-fix" data-act-change="dutch-fix" value="${i}" ${nz(d.fixedIndex) === i ? 'checked' : ''}><span class="sr">Fijar el resultado ${i + 1}</span></label>` : ''}
          <button class="btn btn-ghost btn-icon l-del" data-act="dutch-del" data-i="${i}" ${d.legs.length <= 2 ? 'disabled' : ''} aria-label="Quitar resultado ${i + 1}">${icon('trash', 16)}</button>
        </div>`).join('')}
        <button class="btn btn-ghost btn-sm" data-act="dutch-add" ${d.legs.length >= 8 ? 'disabled' : ''}>${icon('plus', 16)} Añadir resultado</button>
      </div>
    </section>
    <section class="panel result" id="dutch-result" aria-live="polite">${dutchResult()}</section>
  </div>`;
}

function dutchResult() {
  const d = state.calc.dutch;
  const opts = d.mode === 'total' ? { totalStake: d.totalStake, step: nz(d.step, 0.01) } : { fixedIndex: nz(d.fixedIndex), fixedStake: d.fixedStake, step: nz(d.step, 0.01) };
  const res = C.dutch(d.legs, opts);
  if (!res.valid) return `<div class="empty"><p>${esc(res.reason || 'Completa las cuotas (mayores que 1) y el importe.')}</p></div>`;
  const anyFb = d.legs.some((l) => l.freebet);
  return `<div class="hero-number">
      <span class="eyebrow">Beneficio asegurado</span>
      <span class="big ${sign(res.profit)}">${fmt.signedEur(res.profit)}</span>
      <span class="sub">${anyFb ? `retienes el <b>${fmt.pct(res.rating)}</b> de la freebet` : `retorno del <b>${fmt.pct2(res.rating)}</b>${res.rating > 100 ? ' · surebet' : ''}`}</span>
    </div>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Resultado</th><th>Apuesta</th><th>Cobras</th><th>Beneficio</th></tr></thead>
      <tbody>${d.legs.map((l, i) => `<tr><th scope="row">${esc(l.name || `Resultado ${i + 1}`)}${l.freebet ? ' <span class="tag tag-fb">freebet</span>' : ''}<span class="muted small"> a ${fmt.odds(n(l.odds))}</span></th><td><b>${fmt.eur(res.stakes[i])}</b></td><td>${fmt.eur(res.returns[i])}</td><td>${money(res.profits[i])}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="metrics">
      <div class="metric"><span>Dinero que pones</span><b>${fmt.eur(res.cashStake)}</b></div>
      ${res.freebetTotal ? `<div class="metric"><span>En freebets</span><b>${fmt.eur(res.freebetTotal)}</b></div>` : ''}
      <div class="metric"><span>Margen del mercado</span><b>${fmt.pct2(res.overround - 100)}</b></div>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="dutch-log">${icon('save', 16)} Anotar en beneficios</button></div>`;
}

/* Combinadas */

function renderAcca() {
  const a = state.calc.acca;
  return `${pageHead('Calculadoras', 'Cubre una combinada selección a selección según se van jugando los partidos.')}
  ${calcTabs('combinadas')}
  <div class="calc-grid">
    <section class="panel">
      <div class="field"><span class="field-label">Tipo de apuesta</span>${seg('calc.acca.type', [['normal', 'Con dinero'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR']])}</div>
      <div class="form-grid pair">
        ${field('calc.acca.stake', 'Importe de la combinada', { unit: '€' })}
        ${field('calc.acca.commission', 'Comisión exchange', { unit: '%' })}
      </div>
      <div class="legs legs-acca">
        <div class="legs-head"><span>#</span><span>A favor</span><span>En contra</span><span>Estado</span><span>Puesto en contra</span><span></span></div>
        ${a.legs.map((l, i) => `<div class="leg">
          <span class="leg-n l-n">${i + 1}</span>
          <input data-k="calc.acca.legs.${i}.back" inputmode="decimal" value="${esc(l.back ?? '')}" class="in-back l-back" aria-label="Cuota a favor de la selección ${i + 1}">
          <input data-k="calc.acca.legs.${i}.lay" inputmode="decimal" value="${esc(l.lay ?? '')}" class="in-lay l-lay" aria-label="Cuota en contra de la selección ${i + 1}">
          <select class="l-status" data-k="calc.acca.legs.${i}.status" data-full="1" aria-label="Estado de la selección ${i + 1}">
            ${[['pending', 'Pendiente'], ['won', 'Acertada'], ['lost', 'Fallada']].map(([v, t]) => `<option value="${v}" ${l.status === v ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          ${l.status === 'pending' ? '<span class="muted small l-placed l-empty">—</span>' : `<span class="field-input l-placed"><input data-k="calc.acca.legs.${i}.layStakePlaced" inputmode="decimal" value="${esc(l.layStakePlaced ?? '')}" placeholder="Calculado" aria-label="Importe en contra que pusiste en la selección ${i + 1}"><span class="unit">€</span></span>`}
          <button class="btn btn-ghost btn-icon l-del" data-act="acca-del" data-i="${i}" ${a.legs.length <= 1 ? 'disabled' : ''} aria-label="Quitar selección ${i + 1}">${icon('trash', 16)}</button>
        </div>`).join('')}
        <button class="btn btn-ghost btn-sm" data-act="acca-add" ${a.legs.length >= 12 ? 'disabled' : ''}>${icon('plus', 16)} Añadir selección</button>
        <p class="field-hint">Las cuotas en contra de selecciones que aún no han empezado son estimadas: actualízalas justo antes de cubrir cada una.</p>
      </div>
    </section>
    <section class="panel result" id="acca-result" aria-live="polite">${accaResult()}</section>
  </div>`;
}

function accaResult() {
  const a = state.calc.acca;
  const res = C.accaLay(a);
  if (!res.valid) return '<div class="empty"><p>Completa el importe y las cuotas de cada selección.</p></div>';
  const next = res.nextIndex >= 0 ? res.legs[res.nextIndex] : null;
  const head = res.settledProfit != null
    ? `<div class="hero-number"><span class="eyebrow">Resultado final</span><span class="big ${sign(res.settledProfit)}">${fmt.signedEur(res.settledProfit)}</span><span class="sub">combinada terminada</span></div>`
    : `<div class="hero-number"><span class="eyebrow">Ahora: cubre la selección ${res.nextIndex + 1}</span><span class="big lay-ink">${fmt.eur(next.layStake)}</span><span class="sub">en contra a ${fmt.odds(next.lay)} · responsabilidad <b>${fmt.eur(next.liability)}</b></span></div>`;
  return `${head}
    <div class="metrics">
      <div class="metric"><span>Cuota combinada</span><b>${fmt.odds(res.accaOdds)}</b></div>
      <div class="metric"><span>Beneficio asegurado</span><b class="${sign(res.profit)}">${fmt.signedEur(res.profit)}</b></div>
      <div class="metric"><span>Mayor responsabilidad</span><b>${fmt.eur(res.maxLiability)}</b></div>
    </div>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Selección</th><th>En contra</th><th>Responsabilidad</th><th>Estado</th></tr></thead>
      <tbody>${res.legs.map((l, i) => `<tr class="${i === res.nextIndex ? 'is-next' : ''}"><th scope="row">${i + 1} <span class="muted small">${fmt.odds(l.back)} / ${fmt.odds(l.lay)}</span></th><td><b>${fmt.eur(l.layStake)}</b></td><td>${fmt.eur(l.liability)}</td><td>${{ pending: i === res.nextIndex ? '<span class="pill pill-active">Siguiente</span>' : '<span class="pill">Pendiente</span>', won: '<span class="pill pill-done">Acertada</span>', lost: '<span class="pill pill-skip">Fallada</span>' }[l.status]}</td></tr>`).join('')}</tbody>
    </table></div>
    <details class="more-detail"><summary>Beneficio en cada caso</summary>
      <ul class="outcome-list">${res.outcomes.map((o) => `<li><span>${esc(o.label)}</span>${money(o.profit)}</li>`).join('')}</ul>
    </details>
    <div class="actions"><button class="btn btn-primary" data-act="acca-log">${icon('save', 16)} Anotar en beneficios</button></div>`;
}

/* Rollover */

function renderRollover() {
  return `${pageHead('Calculadoras', 'Comprueba si un bono con rollover te sale a cuenta antes de empezarlo.')}
  ${calcTabs('rollover')}
  <div class="calc-grid">
    <section class="panel">
      <div class="form-grid pair">
        ${field('calc.roll.deposit', 'Depósito', { unit: '€' })}
        ${field('calc.roll.bonus', 'Bono', { unit: '€' })}
        ${field('calc.roll.multiplier', 'Rollover', { unit: 'veces' })}
        ${select('calc.roll.base', 'Se multiplica sobre', [['bonus', 'El bono'], ['both', 'Depósito + bono'], ['deposit', 'El depósito']])}
        ${field('calc.roll.avgRating', 'Rating medio', { unit: '%', hint: 'Con buenas cuotas, entre 95 y 98 %.' })}
        ${field('calc.roll.stakePerBet', 'Importe por apuesta', { unit: '€' })}
      </div>
    </section>
    <section class="panel result" id="roll-result" aria-live="polite">${rollResult()}</section>
  </div>`;
}

function rollResult() {
  const r = C.rollover(state.calc.roll);
  if (!r.valid) return '<div class="empty"><p>Escribe el bono, el rollover y el rating medio.</p></div>';
  const good = r.value > 0;
  return `<div class="hero-number">
      <span class="eyebrow">Valor esperado del bono</span>
      <span class="big ${sign(r.value)}">${fmt.signedEur(r.value)}</span>
      <span class="sub"><span class="pill ${good ? 'pill-done' : 'pill-skip'}">${good ? 'Te sale a cuenta' : 'No te sale a cuenta'}</span></span>
    </div>
    <div class="metrics">
      <div class="metric"><span>Hay que apostar</span><b>${fmt.eur(r.turnover)}</b></div>
      <div class="metric"><span>Coste de liberarlo</span><b>${fmt.eur(r.cost)}</b></div>
      <div class="metric"><span>Rating mínimo para ganar</span><b>${fmt.pct(r.breakEvenRating)}</b></div>
      ${r.bets ? `<div class="metric"><span>Apuestas necesarias</span><b>${r.bets}</b></div>` : ''}
    </div>
    <p class="instr">Cada euro que apuestas cubierto te cuesta lo que le falta al rating para llegar al 100 %. Con un ${fmt.pct(nz(state.calc.roll.avgRating))} de media, mover ${fmt.eur(r.turnover)} cuesta ${fmt.eur(r.cost)}.</p>`;
}

/* ======================================================================== */
/* Vista: Bonos                                                              */
/* ======================================================================== */

function assumptions() {
  const a = state.settings.assumptions;
  return {
    qualOdds: nz(a.qualOdds, 2.5), snrOdds: nz(a.snrOdds, 5), srOdds: nz(a.srOdds, 3), spread: nz(a.spread, 2), refundRetention: nz(a.refundRetention, 72), commission: nz(state.settings.defaultCommission, 2),
  };
}

const STATUS = { todo: 'Por hacer', active: 'En curso', done: 'Completado', skip: 'Descartado' };

function renderBonos() {
  const ui = state.ui;
  const all = state.offers;
  const open = all.filter((o) => o.status === 'todo' || o.status === 'active');
  const pending = open.reduce((a, o) => a + C.offerValue(o, assumptions()), 0);
  const earned = all.filter((o) => o.status === 'done').reduce((a, o) => a + nz(o.profit), 0);
  const filters = [['open', 'Abiertos'], ['done', 'Completados'], ['skip', 'Descartados'], ['all', 'Todos']];
  const list = all.filter((o) => ui.offerFilter === 'all' || (ui.offerFilter === 'open' ? (o.status === 'todo' || o.status === 'active') : o.status === ui.offerFilter))
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || C.offerValue(b, assumptions()) - C.offerValue(a, assumptions()));

  const used = new Set(all.map((o) => O.normalizeText(o.bookie)));
  const missing = BOOKIES.filter(([, name]) => !used.has(O.normalizeText(name)));

  return `${pageHead('Bonos', 'Tus promociones con los pasos para sacarles el dinero y lo que vale cada una.', `<button class="btn btn-primary" data-act="toggle-add-offer">${icon('plus', 16)} Añadir promoción</button>`)}
  ${exampleBanner()}
  <section class="kpis">
    ${kpi('Por sacar', fmt.eur(pending), 'valor estimado de lo abierto', 'kpi-brass')}
    ${kpi('En curso', String(all.filter((o) => o.status === 'active').length))}
    ${kpi('Completados', String(all.filter((o) => o.status === 'done').length))}
    ${kpi('Ganado con bonos', fmt.eur(earned), '', earned >= 0 ? 'kpi-pos' : 'kpi-neg')}
  </section>
  ${ui.addOffer ? addOfferForm() : ''}
  <div class="toolbar">${filters.map(([k, t]) => `<button class="chip ${ui.offerFilter === k ? 'is-on' : ''}" data-set="ui.offerFilter" data-v="${k}">${t}</button>`).join('')}</div>
  <div class="offers">${list.length ? list.map(offerCard).join('') : `<div class="empty panel"><p>No hay promociones aquí.</p><button class="btn btn-sm" data-act="toggle-add-offer">${icon('plus', 16)} Añadir promoción</button></div>`}</div>
  <section class="panel">
    <div class="panel-head"><h2>Casas que aún no has usado</h2><span class="muted small">${missing.length} de ${BOOKIES.length}</span></div>
    <p class="muted small">Cada casa suele tener un bono de bienvenida. Pulsa una para apuntar su promoción.</p>
    <div class="chips">${missing.map(([k, name]) => `<button class="chip" data-act="quick-offer" data-bookie="${esc(name)}">${esc(name)}</button>`).join('') || '<span class="muted">Ya las tienes todas apuntadas.</span>'}</div>
  </section>`;
}

function addOfferForm() {
  if (!state.ui.newOffer) {
    state.ui.newOffer = { bookie: 'Bet365', kind: 'bet_get', params: {}, deadline: '' };
  }
  const no = state.ui.newOffer;
  const kind = OFFER_KINDS[no.kind] || OFFER_KINDS.bet_get;
  kind.fields.forEach((f) => { if (no.params[f.key] == null) no.params[f.key] = f.def; });
  const value = C.offerValue({ kind: no.kind, params: no.params }, assumptions());
  return `<section class="panel add-offer">
    <div class="panel-head"><h2>Nueva promoción</h2><button class="btn btn-ghost btn-icon" data-act="toggle-add-offer" aria-label="Cerrar">${icon('x', 16)}</button></div>
    <div class="form-grid">
      <label class="field" for="f-new-bookie"><span class="field-label">Casa</span><span class="field-input"><input id="f-new-bookie" data-k="ui.newOffer.bookie" list="bookie-list" value="${esc(no.bookie)}" autocomplete="off"></span></label>
      ${select('ui.newOffer.kind', 'Tipo', Object.entries(OFFER_KINDS).map(([k, v]) => [k, v.label]), { full: true })}
      ${kind.fields.map((f) => (f.type === 'select'
        ? select(`ui.newOffer.params.${f.key}`, f.label, f.options)
        : field(`ui.newOffer.params.${f.key}`, f.label, { unit: f.unit }))).join('')}
      ${field('ui.newOffer.deadline', 'Fecha límite (opcional)', { type: 'date' })}
    </div>
    <p class="field-hint">${esc(kind.hint)}</p>
    <div class="add-offer-foot"><span>Valor estimado <b id="new-offer-value">${fmt.signedEur(value)}</b></span><button class="btn btn-primary" data-act="save-offer">${icon('check', 16)} Guardar</button></div>
  </section>`;
}

function offerCard(o) {
  const kind = OFFER_KINDS[o.kind] || OFFER_KINDS.other;
  const p = o.params || {};
  const steps = kind.steps(p, o.bookie);
  const done = new Set(o.done || []);
  const value = C.offerValue(o, assumptions());
  const days = o.deadline ? Math.ceil((Date.parse(`${o.deadline}T23:59:59`) - Date.now()) / DAY) : null;
  const progress = Math.round((done.size / steps.length) * 100);
  const isOpen = o.status === 'todo' || o.status === 'active';
  return `<article class="offer offer-${o.status}">
    <header class="offer-head">
      <div>
        <div class="offer-meta"><b class="offer-bookie">${esc(o.bookie)}</b><span class="pill pill-${o.status}">${STATUS[o.status]}</span>${o.example ? '<span class="tag tag-example">Ejemplo</span>' : ''}${days != null && isOpen ? `<span class="deadline ${days <= 3 ? 'is-soon' : ''}">${icon('clock', 14)} ${days < 0 ? 'Caducado' : days === 0 ? 'Último día' : `Quedan ${days} días`}</span>` : ''}</div>
        <h3>${esc(kind.title(p))}</h3>
        <span class="muted small">${esc(kind.label)}</span>
      </div>
      <div class="offer-value">${o.status === 'done' ? `<span class="muted small">Ganado</span>${money(nz(o.profit))}` : `<span class="muted small">Valor estimado</span><b>${fmt.signedEur(value)}</b>`}</div>
    </header>
    ${isOpen ? `<div class="progress" aria-label="Progreso ${progress} %"><i style="width:${progress}%"></i></div>
    <ol class="offer-steps">${steps.map((s, i) => `<li class="${done.has(i) ? 'is-done' : ''}">
      <label class="check"><input type="checkbox" data-act-change="step-toggle" data-offer="${o.id}" data-step="${i}" ${done.has(i) ? 'checked' : ''}><span>${esc(s.text)}</span></label>
      ${s.action ? `<button class="btn btn-ghost btn-xs" data-act="step-action" data-offer="${o.id}" data-step="${i}">${esc(s.action.label)} ${icon('arrow', 13)}</button>` : ''}
    </li>`).join('')}</ol>` : ''}
    <footer class="offer-foot">
      ${o.completing ? `<label class="field inline" for="f-complete-${o.id}"><span class="field-label">Beneficio real</span><span class="field-input"><input id="f-complete-${o.id}" data-complete="${o.id}" inputmode="decimal" value="${esc(fmt.n2(value))}"><span class="unit">€</span></span></label><button class="btn btn-primary btn-sm" data-act="offer-complete-save" data-offer="${o.id}">${icon('check', 16)} Guardar y anotar</button><button class="btn btn-ghost btn-sm" data-act="offer-complete-cancel" data-offer="${o.id}">Cancelar</button>` : `
      ${o.status === 'todo' ? `<button class="btn btn-sm" data-act="offer-status" data-offer="${o.id}" data-v="active">Empezar</button>` : ''}
      ${isOpen ? `<button class="btn btn-primary btn-sm" data-act="offer-complete" data-offer="${o.id}">${icon('check', 16)} Completar</button><button class="btn btn-ghost btn-sm" data-act="offer-status" data-offer="${o.id}" data-v="skip">Descartar</button>` : `<button class="btn btn-ghost btn-sm" data-act="offer-status" data-offer="${o.id}" data-v="todo">Reabrir</button>`}
      <button class="btn btn-ghost btn-sm btn-danger ${o.confirmDelete ? 'is-confirm' : ''}" data-act="offer-delete" data-offer="${o.id}">${icon('trash', 16)} ${o.confirmDelete ? '¿Seguro? Pulsa otra vez' : 'Eliminar'}</button>`}
    </footer>
  </article>`;
}

/* ======================================================================== */
/* Vista: Beneficios                                                         */
/* ======================================================================== */

function renderBeneficios() {
  const bets = state.bets;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const total = bets.reduce((a, b) => a + nz(b.profit), 0);
  const month = bets.filter((b) => monthKey(b.date || '') === thisMonth).reduce((a, b) => a + nz(b.profit), 0);
  const avg = bets.length ? total / bets.length : 0;

  const byBook = new Map();
  bets.forEach((b) => byBook.set(b.bookie || 'Sin casa', (byBook.get(b.bookie || 'Sin casa') || 0) + nz(b.profit)));
  const books = [...byBook.entries()].sort((a, b) => b[1] - a[1]);
  const maxAbs = Math.max(1, ...books.map(([, v]) => Math.abs(v)));
  const byKind = new Map();
  bets.forEach((b) => byKind.set(b.kind, (byKind.get(b.kind) || 0) + nz(b.profit)));

  const form = state.ui.betForm || { date: isoDay(), bookie: '', kind: 'welcome', desc: '', profit: '' };
  state.ui.betForm = form;

  return `${pageHead('Beneficios', 'Cada operación que cierras, sumada. Exporta o importa tus datos cuando quieras.', `
    <button class="btn btn-sm" data-act="export-csv">${icon('download', 16)} CSV</button>
    <button class="btn btn-sm" data-act="go-data">${icon('upload', 16)} Importar</button>`)}
  ${exampleBanner()}
  <section class="kpis">
    ${kpi('Total', fmt.eur(total), '', total >= 0 ? 'kpi-pos' : 'kpi-neg')}
    ${kpi('Este mes', fmt.eur(month), fmt.month(now))}
    ${kpi('Operaciones', String(bets.length))}
    ${kpi('Media por operación', fmt.eur(avg))}
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Anotar operación</h2></div>
    <form class="bet-form" data-form="bet">
      ${field('ui.betForm.date', 'Fecha', { type: 'date' })}
      <label class="field" for="f-bet-bookie"><span class="field-label">Casa</span><span class="field-input"><input id="f-bet-bookie" data-k="ui.betForm.bookie" list="bookie-list" value="${esc(form.bookie)}" placeholder="Bet365" autocomplete="off"></span></label>
      ${select('ui.betForm.kind', 'Tipo', BET_KINDS)}
      ${field('ui.betForm.desc', 'Descripción', { mode: 'text', placeholder: 'Freebet de bienvenida' })}
      ${field('ui.betForm.profit', 'Beneficio', { unit: '€', placeholder: '12,50' })}
      <button class="btn btn-primary" type="submit">${icon('plus', 16)} Añadir</button>
    </form>
  </section>
  <div class="grid-2">
    <section class="panel"><div class="panel-head"><h2>Beneficio acumulado</h2></div>${cumulativeChart(bets)}</section>
    <section class="panel"><div class="panel-head"><h2>Por casa</h2></div>
      ${books.length ? `<ul class="hbars">${books.slice(0, 10).map(([name, v]) => `<li><span class="hb-name">${esc(name)}</span><span class="hb-track"><i class="${v < 0 ? 'neg' : 'pos'}" style="width:${(Math.abs(v) / maxAbs * 100).toFixed(1)}%"></i></span><span class="money ${sign(v)}">${fmt.eur(v)}</span></li>`).join('')}</ul>` : '<p class="muted">Sin datos todavía.</p>'}
      ${byKind.size ? `<div class="kind-chips">${[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip chip-static">${esc(betKindLabel(k))} <b>${fmt.eur(v)}</b></span>`).join('')}</div>` : ''}
    </section>
  </div>
  <section class="panel">
    <div class="panel-head"><h2>Operaciones</h2><span class="muted small">${bets.length}</span></div>
    ${bets.length ? `<div class="table-wrap"><table class="ledger">
      <thead><tr><th>Fecha</th><th>Casa</th><th>Tipo</th><th class="desc">Descripción</th><th class="num">Beneficio</th><th></th></tr></thead>
      <tbody>${[...bets].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((b) => `<tr>
        <td class="nowrap">${b.date ? esc(fmt.day(Date.parse(`${b.date}T12:00:00`))) : '—'}</td>
        <td>${esc(b.bookie || '—')}${b.example ? ' <span class="tag tag-example">Ejemplo</span>' : ''}</td>
        <td>${esc(betKindLabel(b.kind))}</td>
        <td class="desc">${esc(b.desc || '')}</td>
        <td class="num">${money(nz(b.profit))}</td>
        <td><button class="btn btn-ghost btn-icon btn-danger ${b.confirmDelete ? 'is-confirm' : ''}" data-act="bet-delete" data-id="${b.id}" aria-label="${b.confirmDelete ? 'Confirmar borrado' : 'Borrar operación'}">${b.confirmDelete ? icon('check', 16) : icon('trash', 16)}</button></td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty"><p>Aún no has anotado ninguna operación.</p><p class="muted small">Desde cualquier calculadora puedes pulsar «Anotar en beneficios».</p></div>'}
  </section>`;
}

/* ======================================================================== */
/* Vista: Aprende                                                            */
/* ======================================================================== */

function renderAprende() {
  const q = C.backLay({ stake: 10, back: 3, lay: 3.1, commission: 2 });
  const f = C.backLay({ stake: 25, back: 6, lay: 6.2, commission: 2, type: 'snr' });
  return `${pageHead('Aprende', 'Cómo se saca dinero de los bonos sin depender de acertar.')}
  <article class="prose panel">
    <h2>La idea</h2>
    <p>Las casas regalan apuestas gratis para captar clientes. Si apuestas <span class="back-ink">a favor</span> en la casa y <span class="lay-ink">en contra</span> de lo mismo en un exchange, cubres los dos resultados: pase lo que pase, el dinero queda casi igual. Así conviertes el regalo en dinero sin jugártela.</p>
    <h2>Un bono de principio a fin</h2>
    <ol class="flow">
      <li><b>Apuesta calificante.</b> Apuestas 10 € a favor a ${fmt.odds(3)} en la casa y ${fmt.eur(q.layStake)} en contra a ${fmt.odds(3.1)} en el exchange. Gane quien gane, pierdes ${fmt.eur(-q.profit)}: es lo que cuesta desbloquear el bono.</li>
      <li><b>La casa te da 25 € en apuesta gratis.</b> Sin devolución del importe: si aciertas cobras solo la ganancia.</li>
      <li><b>Juegas la apuesta gratis a cuota alta.</b> 25 € a favor a ${fmt.odds(6)} y ${fmt.eur(f.layStake)} en contra a ${fmt.odds(6.2)}. Ganas ${fmt.eur(f.profit)} pase lo que pase.</li>
      <li><b>Retiras.</b> Beneficio del bono: <b class="pos">${fmt.signedEur(f.profit + q.profit)}</b>.</li>
    </ol>
    <p>El oddsmatcher encuentra las parejas de cuotas más ajustadas, las calculadoras te dicen el importe exacto y Bonos te guía paso a paso.</p>
    <h2>Riesgos reales</h2>
    <ul>
      <li><b>Errores al apostar.</b> Un importe mal escrito o apostar en contra en otro mercado deja la apuesta sin cubrir. Revisa siempre antes de confirmar.</li>
      <li><b>Cuotas que cambian.</b> Cubre justo después de apostar a favor. La tabla «Si la cuota en contra se mueve» de la calculadora te dice cuánto te afecta.</li>
      <li><b>Saldo en el exchange.</b> Necesitas la responsabilidad entera disponible para poder cubrir.</li>
      <li><b>Limitaciones.</b> Las casas pueden limitar cuentas que solo usan promociones. Lee siempre las condiciones de cada bono.</li>
      <li><b>Impuestos.</b> En España las ganancias del juego tributan en el IRPF. Guarda tu registro de Beneficios para la declaración.</li>
    </ul>
    <p class="responsible">${icon('info', 16)} Solo para mayores de 18 años. Si sientes que el juego deja de ser un control de números, para y pide ayuda en <a href="https://www.jugarbien.es" target="_blank" rel="noopener">jugarbien.es</a>.</p>
  </article>
  <section class="panel">
    <div class="panel-head"><h2>Glosario</h2></div>
    <dl class="glossary">${GLOSSARY.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
  </section>`;
}

/* ======================================================================== */
/* Vista: Ajustes                                                            */
/* ======================================================================== */

function renderAjustes() {
  const s = state.settings;
  const sports = Object.keys(SPORT_NAMES);
  const extra = s.sports.filter((k) => !sports.includes(k));
  return `${pageHead('Ajustes', 'Fuente de cuotas, comisiones y tus datos.')}
  <section class="panel">
    <div class="panel-head"><h2>Fuente de cuotas</h2><span class="status-inline" data-status="full">${statusHTML()}</span></div>
    ${seg('settings.provider', [['demo', 'Demostración'], ['api', 'The Odds API'], ['server', 'Tu servidor']])}
    ${s.provider === 'demo' ? '<p class="field-hint">Cuotas simuladas que se mueven cada minuto. Sirven para aprender a usar la herramienta.</p>' : ''}
    ${s.provider === 'api' ? `<div class="form-grid">
      <label class="field" for="f-settings-apiKey"><span class="field-label">Clave de The Odds API</span><span class="field-input"><input id="f-settings-apiKey" data-k="settings.apiKey" type="password" value="${esc(s.apiKey)}" autocomplete="off" spellcheck="false"></span>
        <span class="field-hint">Se guarda solo en este navegador. Hay plan gratuito de 500 créditos al mes en the-odds-api.com.</span></label>
      ${select('settings.regions', 'Casas de', [['eu', 'Europa'], ['eu,uk', 'Europa y Reino Unido'], ['uk', 'Reino Unido']])}
      ${field('settings.cacheMinutes', 'Reutilizar cuotas durante', { unit: 'min', hint: 'Cada descarga gasta 1 crédito por liga y región.' })}
    </div>
    <fieldset class="checks"><legend class="field-label">Ligas</legend>
      ${sports.map((k) => `<label class="check"><input type="checkbox" data-act-change="sport-toggle" value="${k}" ${s.sports.includes(k) ? 'checked' : ''}><span>${esc(SPORT_NAMES[k])}</span></label>`).join('')}
      ${extra.map((k) => `<label class="check"><input type="checkbox" data-act-change="sport-toggle" value="${esc(k)}" checked><span>${esc(k)}</span></label>`).join('')}
    </fieldset>
    <p class="field-hint">Coste por actualización: <b>${s.sports.length * s.regions.split(',').length}</b> créditos.</p>
    <div class="actions"><button class="btn" data-act="test-api">${icon('bolt', 16)} Probar conexión</button><button class="btn btn-primary" data-act="apply-source">${icon('refresh', 16)} Cargar cuotas</button></div>
    <p id="api-test" class="field-hint" aria-live="polite"></p>` : ''}
    ${s.provider === 'server' ? `<div class="form-grid">${field('settings.serverUrl', 'Dirección del servidor', { mode: 'url', placeholder: 'Vacío = este mismo dominio', hint: 'El servidor incluido (server/server.mjs) descarga las cuotas cada pocos minutos para todos tus usuarios.' })}</div>
    <div class="actions"><button class="btn btn-primary" data-act="apply-source">${icon('refresh', 16)} Cargar cuotas</button></div>` : ''}
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Comisiones de los exchanges</h2></div>
    <div class="form-grid">
      ${EXCHANGES.map(([k, t]) => field(`settings.commissions.${k}`, t, { unit: '%' })).join('')}
      ${field('settings.defaultCommission', 'Cualquier otro', { unit: '%' })}
    </div>
    <p class="field-hint">Pon la comisión que te cobra tu cuenta. Afecta al rating del oddsmatcher y al valor de los bonos.</p>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Cómo valorar los bonos</h2></div>
    <div class="form-grid">
      ${field('settings.assumptions.qualOdds', 'Cuota típica en calificantes')}
      ${field('settings.assumptions.snrOdds', 'Cuota típica con freebet SNR')}
      ${field('settings.assumptions.srOdds', 'Cuota típica con freebet SR')}
      ${field('settings.assumptions.spread', 'Diferencia favor-contra', { unit: '%' })}
      ${field('settings.assumptions.refundRetention', 'Retención de reembolsos', { unit: '%' })}
    </div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Preferencias</h2></div>
    <div class="filter-row">
      ${field('settings.alertRating', 'Avisarme de cuotas con rating desde', { unit: '%' })}
      <div class="field"><span class="field-label">Tema</span>${seg('settings.theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']])}</div>
    </div>
    <div class="actions"><button class="btn" data-act="notif">${icon('bell', 16)} Activar avisos del navegador</button></div>
  </section>
  <section class="panel" id="datos">
    <div class="panel-head"><h2>Tus datos</h2></div>
    <p class="muted small">Todo se guarda en este navegador. Haz copias de seguridad de vez en cuando.</p>
    <div class="actions">
      <button class="btn" data-act="export-json">${icon('download', 16)} Descargar copia</button>
      <button class="btn" data-act="copy-json">${icon('copy', 16)} Copiar copia</button>
    </div>
    <label class="field" for="f-import"><span class="field-label">Importar copia (pega el contenido o elige el archivo)</span>
      <textarea id="f-import" rows="4" placeholder='{"bets": [...], "offers": [...]}'></textarea></label>
    <div class="actions">
      <label class="btn">${icon('upload', 16)} Elegir archivo<input type="file" accept=".json,application/json" data-act-change="import-file" hidden></label>
      <button class="btn btn-primary" data-act="import-json">Importar</button>
      <button class="btn btn-ghost btn-danger ${state.ui.confirmReset ? 'is-confirm' : ''}" data-act="reset-all">${icon('trash', 16)} ${state.ui.confirmReset ? 'Se borrará todo. Pulsa otra vez' : 'Borrar todo'}</button>
    </div>
  </section>`;
}

/* ======================================================================== */
/* Enrutado y render                                                         */
/* ======================================================================== */

const ROUTES = {
  inicio: { render: renderHome, refresh: () => { const el = document.getElementById('home-top'); if (el) el.innerHTML = homeTop(); }, usesOdds: true, nav: 'inicio' },
  oddsmatcher: { render: renderOddsmatcher, refresh: refreshOm, usesOdds: true, nav: 'oddsmatcher' },
  calculadora: { render: renderBackLay, refresh: refreshBackLay, nav: 'calculadora' },
  'favor-favor': { render: renderDutch, refresh: () => { const el = document.getElementById('dutch-result'); if (el) el.innerHTML = dutchResult(); }, nav: 'calculadora' },
  combinadas: { render: renderAcca, refresh: () => { const el = document.getElementById('acca-result'); if (el) el.innerHTML = accaResult(); }, nav: 'calculadora' },
  rollover: { render: renderRollover, refresh: () => { const el = document.getElementById('roll-result'); if (el) el.innerHTML = rollResult(); }, nav: 'calculadora' },
  bonos: {
    render: renderBonos,
    refresh: () => {
      const el = document.getElementById('new-offer-value');
      if (el && state.ui.newOffer) el.textContent = fmt.signedEur(C.offerValue(state.ui.newOffer, assumptions()));
    },
    nav: 'bonos',
  },
  beneficios: { render: renderBeneficios, nav: 'beneficios' },
  aprende: { render: renderAprende, nav: 'aprende' },
  ajustes: { render: renderAjustes, nav: 'ajustes' },
};

let view = null;
const main = document.getElementById('main');

function currentRoute() {
  const name = (location.hash || '').replace('#', '');
  return ROUTES[name] ? name : 'inicio';
}

function render() {
  const name = currentRoute();
  const r = ROUTES[name];
  const y = window.scrollY;
  main.innerHTML = r.render();
  const sameView = view && view.name === name;
  view = { name, ...r };
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === r.nav;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (sameView) window.scrollTo(0, y);
}

function go(hash) {
  if (location.hash === `#${hash}`) render();
  else location.hash = hash;
  window.scrollTo(0, 0);
}

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else if (applyTheme.touched) document.documentElement.removeAttribute('data-theme');
}

/* ======================================================================== */
/* Eventos                                                                   */
/* ======================================================================== */

const NUMERIC_SET = new Set(['calc.dutch.step', 'om.autoRefresh']);

main.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.multiItem) return; // lo gestiona 'change'
  if (el.dataset.complete) return;
  const k = el.dataset.k;
  if (!k) return;
  const value = el.type === 'checkbox' ? el.checked : el.value;
  set(k, value);
  if (k.startsWith('om.') && k !== 'om.autoRefresh') {
    if (k === 'om.fbBook') { render(); return; }
    state.om.limit = 60;
    refreshOm();
    return;
  }
  if (k === 'settings.provider' || k === 'settings.regions') { render(); return; }
  if (el.dataset.full) { render(); return; }
  view?.refresh?.();
});

main.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.multiItem) {
    const k = el.dataset.multiItem;
    const boxes = [...main.querySelectorAll(`[data-multi-item="${k}"]`)];
    const checked = boxes.filter((b) => b.checked).map((b) => b.value);
    set(k, checked.length === boxes.length ? [] : checked);
    const lab = main.querySelector(`[data-multi-label="${k}"]`);
    if (lab) lab.textContent = checked.length === boxes.length || !checked.length ? (checked.length ? 'Todas' : 'Ninguna') : `${checked.length} de ${boxes.length}`;
    if (!checked.length) set(k, ['__none__']);
    state.om.limit = 60;
    refreshOm();
    return;
  }
  const act = el.dataset.actChange;
  if (!act) return;
  if (act === 'auto-refresh') { scheduleRefresh(); toast(n(state.om.autoRefresh) ? `Actualización cada ${state.om.autoRefresh} min` : 'Actualización automática desactivada'); }
  if (act === 'dutch-fix') { state.calc.dutch.fixedIndex = Number(el.value); save(); render(); }
  if (act === 'step-toggle') {
    const o = state.offers.find((x) => x.id === el.dataset.offer);
    if (!o) return;
    const i = Number(el.dataset.step);
    const done = new Set(o.done || []);
    if (el.checked) done.add(i); else done.delete(i);
    o.done = [...done].sort((a, b) => a - b);
    if (o.status === 'todo' && done.size) o.status = 'active';
    save();
    render();
  }
  if (act === 'sport-toggle') {
    const sp = new Set(state.settings.sports);
    if (el.checked) sp.add(el.value); else sp.delete(el.value);
    state.settings.sports = [...sp];
    save();
    render();
  }
  if (act === 'import-file') {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importData(String(reader.result));
    reader.readAsText(file);
  }
});

main.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.dataset.form === 'bet') {
    const f = state.ui.betForm;
    const profit = n(f.profit);
    if (!Number.isFinite(profit)) { toast('Escribe el beneficio (puede ser negativo).', 'warn'); return; }
    state.bets.push({ id: uid(), date: f.date || isoDay(), bookie: f.bookie.trim(), kind: f.kind, desc: f.desc.trim(), profit });
    state.ui.betForm = { date: f.date || isoDay(), bookie: '', kind: f.kind, desc: '', profit: '' };
    save();
    toast(`Anotado: ${fmt.signedEur(profit)}`, 'good');
    render();
  }
});

document.addEventListener('click', (e) => {
  const setBtn = e.target.closest('[data-set]');
  if (setBtn) {
    const k = setBtn.dataset.set;
    let v = setBtn.dataset.v;
    if (NUMERIC_SET.has(k)) v = Number(v);
    set(k, v);
    if (k === 'settings.theme') { applyTheme.touched = true; applyTheme(); }
    if (k === 'settings.provider') { render(); return; }
    if (k.startsWith('om.')) state.om.limit = 60;
    render();
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const fn = ACTIONS[btn.dataset.act];
  if (fn) {
    if (btn.tagName === 'A' && btn.dataset.act !== 'open-add-offer') e.preventDefault();
    fn(btn, e);
  }
});

function logBet({ bookie = '', kind = 'qualifying', desc = '', profit }) {
  state.bets.push({ id: uid(), date: isoDay(), bookie, kind, desc, profit: C.round(profit) });
  save();
  toast(`Anotado en Beneficios: ${fmt.signedEur(profit)}`, 'good');
}

function applyStepAction(action) {
  if (!action) return;
  if (action.kind === 'om') {
    const keys = action.om.bookie ? bookieKeysFor(action.om.bookie) : [];
    Object.assign(state.om, {
      view: 'fc', mode: action.om.mode || 'normal', minOdds: action.om.minOdds || 1.01, maxOdds: action.om.mode === 'normal' ? 12 : 15, bookies: keys, limit: 60,
    });
    if (action.om.bookie && !keys.length) toast(`No hay cuotas de ${action.om.bookie} en la fuente actual: se muestran todas las casas.`, 'warn');
    save();
    go('oddsmatcher');
  } else if (action.kind === 'bl') {
    Object.assign(state.calc.bl, { ...action.bl, adjust: 0, context: null });
    save();
    go('calculadora');
  } else if (action.kind === 'roll') {
    Object.assign(state.calc.roll, action.roll);
    save();
    go('rollover');
  }
}

function exportPayload() {
  return JSON.stringify({ app: 'contrapeso', version: 1, exported: new Date().toISOString(), bets: state.bets, offers: state.offers, settings: { ...state.settings, apiKey: '' } }, null, 2);
}

function importData(text) {
  try {
    const data = JSON.parse(text);
    if (!data || (!Array.isArray(data.bets) && !Array.isArray(data.offers))) throw new Error('formato');
    const ids = new Set(state.bets.map((b) => b.id));
    const newBets = (data.bets || []).filter((b) => b && !ids.has(b.id)).map((b) => ({ ...b, id: b.id || uid() }));
    const oids = new Set(state.offers.map((o) => o.id));
    const newOffers = (data.offers || []).filter((o) => o && !oids.has(o.id)).map((o) => ({ ...o, id: o.id || uid() }));
    state.bets.push(...newBets);
    state.offers.push(...newOffers);
    if (data.settings) {
      const { apiKey, ...rest } = data.settings;
      Object.assign(state.settings, rest);
    }
    save();
    toast(`Importadas ${newBets.length} operaciones y ${newOffers.length} promociones`, 'good');
    render();
  } catch {
    toast('No se pudo leer la copia. Debe ser el JSON que descargaste de Contrapeso.', 'warn');
  }
}

const ACTIONS = {
  'clear-examples': clearExamples,
  'refresh-odds': () => loadOdds({ force: true }),
  'apply-source': () => { storage.remove(ODDS_CACHE_KEY); odds.events = []; loadOdds({ force: true }).then(() => toast(odds.error ? 'No se pudieron cargar cuotas reales' : `Cargados ${odds.events.length} eventos`, odds.error ? 'warn' : 'good')); },
  'om-sort': (b) => {
    const k = b.dataset.key;
    if (state.om.sort === k) state.om.dir = state.om.dir === 'asc' ? 'desc' : 'asc';
    else { state.om.sort = k; state.om.dir = k === 'start' ? 'asc' : 'desc'; }
    save();
    refreshOm();
  },
  'om-more': () => { state.om.limit = nz(state.om.limit, 60) + 60; refreshOm(); },
  'multi-all': (b) => { set(b.dataset.k, []); render(); },
  'multi-none': (b) => { set(b.dataset.k, ['__none__']); render(); },
  'om-calc': (b) => {
    const r = lastRows.get(b.dataset.id);
    if (!r) return;
    const mode = b.dataset.mode || 'normal';
    state.calc.bl = {
      ...state.calc.bl,
      type: mode,
      stake: nz(state.om.stake, 10),
      back: r.back,
      lay: r.lay,
      commission: r.commission,
      adjust: 0,
      context: { event: `${r.event.home} – ${r.event.away}`, league: r.event.league, start: r.start, sel: r.label.text, bookie: r.bookTitle, exchange: r.exTitle },
    };
    save();
    go('calculadora');
  },
  'ff-calc': (b) => {
    const d = lastDutches.get(b.dataset.id);
    if (!d) return;
    const fixedIndex = d.freebetIndex >= 0 ? d.freebetIndex : 0;
    state.calc.dutch = {
      ...state.calc.dutch,
      legs: d.legs.map((l) => ({ name: `${O.outcomeLabel(d.event, l.name).text} · ${l.title}`, odds: l.odds, freebet: !!l.freebet, commission: '' })),
      mode: d.freebetIndex >= 0 ? 'fixed' : 'total',
      fixedIndex,
      fixedStake: nz(state.om.ffStake, 10),
      totalStake: nz(state.om.ffStake, 10),
      context: { event: `${d.event.home} – ${d.event.away}`, league: d.event.league, start: d.start },
    };
    save();
    go('favor-favor');
  },
  'bl-clear': () => { state.calc.bl.context = null; save(); render(); },
  'dutch-clear': () => { state.calc.dutch.context = null; save(); render(); },
  'bl-reset-adjust': () => { state.calc.bl.adjust = 0; save(); render(); },
  'copy-instr': (b) => copyText(b.dataset.text),
  'bl-log': () => {
    const { c, res } = backLayInput();
    if (!res.valid) return;
    const kind = { normal: 'qualifying', snr: 'freebet', sr: 'freebet', refund: 'refund' }[c.type];
    const desc = c.context ? `${c.context.event} · ${c.context.sel}` : `${C.BET_TYPES[c.type]} a ${fmt.odds(n(c.back))}`;
    logBet({ bookie: c.context?.bookie || '', kind, desc, profit: res.profit });
  },
  'dutch-log': () => {
    const d = state.calc.dutch;
    const res = C.dutch(d.legs, d.mode === 'total' ? { totalStake: d.totalStake, step: nz(d.step, 0.01) } : { fixedIndex: nz(d.fixedIndex), fixedStake: d.fixedStake, step: nz(d.step, 0.01) });
    if (!res.valid) return;
    logBet({ kind: d.legs.some((l) => l.freebet) ? 'freebet' : 'other', desc: d.context ? `Favor-favor · ${d.context.event}` : 'Favor-favor', profit: res.profit });
  },
  'acca-log': () => {
    const res = C.accaLay(state.calc.acca);
    if (!res.valid) return;
    logBet({ kind: state.calc.acca.type === 'normal' ? 'qualifying' : 'freebet', desc: `Combinada de ${res.legs.length} a ${fmt.odds(res.accaOdds)}`, profit: res.settledProfit ?? res.profit });
  },
  'dutch-add': () => { state.calc.dutch.legs.push({ name: '', odds: '' }); save(); render(); },
  'dutch-del': (b) => {
    const d = state.calc.dutch;
    d.legs.splice(Number(b.dataset.i), 1);
    if (nz(d.fixedIndex) >= d.legs.length) d.fixedIndex = 0;
    save();
    render();
  },
  'acca-add': () => { state.calc.acca.legs.push({ back: '', lay: '', status: 'pending' }); save(); render(); },
  'acca-del': (b) => { state.calc.acca.legs.splice(Number(b.dataset.i), 1); save(); render(); },
  'toggle-add-offer': () => { state.ui.addOffer = !state.ui.addOffer; if (!state.ui.addOffer) state.ui.newOffer = null; render(); },
  'open-add-offer': () => { state.ui.addOffer = true; },
  'quick-offer': (b) => {
    state.ui.addOffer = true;
    state.ui.newOffer = { bookie: b.dataset.bookie, kind: 'bet_get', params: {}, deadline: '' };
    render();
    document.querySelector('.add-offer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'save-offer': () => {
    const no = state.ui.newOffer;
    if (!no || !String(no.bookie).trim()) { toast('Escribe la casa.', 'warn'); return; }
    state.offers.push({ id: uid(), bookie: String(no.bookie).trim(), kind: no.kind, params: { ...no.params }, status: 'todo', done: [], deadline: no.deadline || '', created: Date.now() });
    state.ui.addOffer = false;
    state.ui.newOffer = null;
    state.ui.offerFilter = 'open';
    save();
    toast('Promoción guardada', 'good');
    render();
  },
  'offer-status': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (!o) return;
    o.status = b.dataset.v;
    save();
    render();
  },
  'offer-complete': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (!o) return;
    o.completing = true;
    render();
    document.getElementById(`f-complete-${o.id}`)?.focus();
  },
  'offer-complete-cancel': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (o) { delete o.completing; render(); }
  },
  'offer-complete-save': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (!o) return;
    const input = document.getElementById(`f-complete-${o.id}`);
    const profit = n(input?.value);
    if (!Number.isFinite(profit)) { toast('Escribe el beneficio real.', 'warn'); return; }
    delete o.completing;
    o.status = 'done';
    o.profit = profit;
    const kind = OFFER_KINDS[o.kind] || OFFER_KINDS.other;
    o.done = kind.steps(o.params || {}, o.bookie).map((_, i) => i);
    state.bets.push({ id: uid(), date: isoDay(), bookie: o.bookie, kind: o.kind === 'boost' ? 'boost' : 'welcome', desc: kind.title(o.params || {}), profit });
    save();
    toast(`Bono completado: ${fmt.signedEur(profit)}`, 'good');
    render();
  },
  'offer-delete': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (!o) return;
    if (!o.confirmDelete) {
      o.confirmDelete = true;
      render();
      setTimeout(() => { if (o.confirmDelete) { delete o.confirmDelete; if (view?.name === 'bonos') render(); } }, 4000);
      return;
    }
    state.offers = state.offers.filter((x) => x.id !== o.id);
    save();
    render();
  },
  'step-action': (b) => {
    const o = state.offers.find((x) => x.id === b.dataset.offer);
    if (!o) return;
    const kind = OFFER_KINDS[o.kind] || OFFER_KINDS.other;
    const step = kind.steps(o.params || {}, o.bookie)[Number(b.dataset.step)];
    applyStepAction(step && step.action);
  },
  'bet-delete': (b) => {
    const bet = state.bets.find((x) => x.id === b.dataset.id);
    if (!bet) return;
    if (!bet.confirmDelete) {
      bet.confirmDelete = true;
      render();
      setTimeout(() => { if (bet.confirmDelete) { delete bet.confirmDelete; if (view?.name === 'beneficios') render(); } }, 4000);
      return;
    }
    state.bets = state.bets.filter((x) => x.id !== bet.id);
    save();
    render();
  },
  'export-csv': () => {
    const rows = [['fecha', 'casa', 'tipo', 'descripcion', 'beneficio']].concat(
      [...state.bets].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((b) => [b.date, b.bookie, betKindLabel(b.kind), b.desc, String(nz(b.profit).toFixed(2)).replace('.', ',')]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    download(`contrapeso-beneficios-${isoDay()}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8');
  },
  'go-data': () => { go('ajustes'); setTimeout(() => document.getElementById('datos')?.scrollIntoView({ block: 'start' }), 50); },
  'export-json': () => download(`contrapeso-copia-${isoDay()}.json`, exportPayload()),
  'copy-json': () => copyText(exportPayload()),
  'import-json': () => {
    const text = document.getElementById('f-import')?.value || '';
    if (!text.trim()) { toast('Pega primero el contenido de la copia.', 'warn'); return; }
    importData(text);
  },
  'reset-all': () => {
    if (!state.ui.confirmReset) {
      state.ui.confirmReset = true;
      render();
      setTimeout(() => { if (state.ui.confirmReset) { state.ui.confirmReset = false; if (view?.name === 'ajustes') render(); } }, 4000);
      return;
    }
    const fresh = defaults();
    Object.keys(state).forEach((k) => { delete state[k]; });
    Object.assign(state, fresh, { seeded: true });
    storage.remove(ODDS_CACHE_KEY);
    save();
    toast('Datos borrados');
    loadOdds({ force: true });
    render();
  },
  'test-api': async () => {
    const out = document.getElementById('api-test');
    if (!state.settings.apiKey) { if (out) out.textContent = 'Escribe primero tu clave.'; return; }
    if (out) out.textContent = 'Probando…';
    try {
      const list = await O.fetchSportsList(state.settings.apiKey);
      const soccer = list.filter((s) => s.group === 'Soccer').length;
      if (out) out.textContent = `Conexión correcta: ${list.length} competiciones activas (${soccer} de fútbol). Esta prueba no gasta créditos.`;
    } catch (e) {
      if (out) out.textContent = e instanceof TypeError ? 'El navegador bloqueó la conexión. En la vista previa de claude.ai es normal: prueba desde tu dominio.' : `No funciona: ${e.message}`;
    }
  },
  notif: async () => {
    try {
      if (!('Notification' in window)) throw new Error('sin soporte');
      const p = await Notification.requestPermission();
      toast(p === 'granted' ? 'Avisos activados' : 'El navegador no ha dado permiso para avisos', p === 'granted' ? 'good' : 'warn');
    } catch {
      toast('Este navegador no permite avisos aquí.', 'warn');
    }
  },
};

/* ======================================================================== */
/* Arranque                                                                  */
/* ======================================================================== */

function mountShell() {
  document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoMark(el.dataset.logo === 'sm' ? 24 : 28); });
  document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, 20)); });
  const dl = document.createElement('datalist');
  dl.id = 'bookie-list';
  dl.innerHTML = BOOKIES.map(([, name]) => `<option value="${esc(name)}"></option>`).join('');
  document.body.appendChild(dl);
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

seedExamples();
applyTheme();
mountShell();
odds.events = O.demoEvents(Date.now());
odds.updated = new Date().toISOString();
render();
paintStatus();
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
setInterval(paintStatus, 30000);
scheduleRefresh();
if (state.settings.provider !== 'demo') loadOdds();
else { checkAlerts(); firstLoad = false; }
