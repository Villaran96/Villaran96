// Núcleo de la interfaz: estado, sesión y planes, cuotas, navegación, flujo guiado
// de los bonos y componentes compartidos por todas las vistas.

import * as C from './calc.js';
import * as O from './odds.js';
import * as api from './api.js';
import {
  fmt, esc, uid, sign, storage, toast, icon, isoDay, copyQuiet,
} from './util.js';
import {
  BOOKIES, MAIN_BOOKIES, findBookie, bookieHome, EXCHANGE_HOME, OFFER_KINDS,
} from './data.js';
import {
  mergePlans, canUse, FEATURE_NAMES, requiredPlan, intervalLabel,
} from './plans.js';
import {
  DEFAULT_SITE, DEFAULT_GUIDES, DEFAULT_PROMOS, DEFAULT_LESSONS,
} from './content.js';

export { C, O, api };
export const DAY = 86400000;
const STORE_KEY = 'contrapeso:v2';
const OLD_STORE_KEY = 'contrapeso:v1';
export const ODDS_CACHE_KEY = 'contrapeso:odds';

/* ======================================================================== */
/* Estado                                                                    */
/* ======================================================================== */

export function defaults() {
  return {
    settings: {
      theme: 'auto',
      provider: 'auto',
      apiKey: '',
      regions: 'eu',
      sports: [...O.DEFAULT_SPORTS],
      markets: 'h2h,totals',
      serverUrl: '',
      cacheMinutes: 10,
      defaultCommission: 2,
      commissions: { betfair_es: 2, betfair_ex_eu: 2, betfair_ex_uk: 2, matchbook: 2, smarkets: 2 },
      assumptions: { qualOdds: 2.5, snrOdds: 5, srOdds: 3, spread: 2, refundRetention: 72 },
      alertRating: 100,
      myBookies: [...MAIN_BOOKIES],
      betfairTemplate: '',
      previewPlan: 'metodo',
    },
    om: {
      mode: 'normal', stake: 10, refund: 150, retention: 72, minOdds: 1.5, maxOdds: 12, minRatings: { normal: 90, snr: 65, sr: 85, refund: 40 }, window: '7d', q: '',
      bookies: [], exchanges: [], leagues: [], families: [], myOnly: false, minSize: '', sort: 'rating', dir: 'desc', limit: 60, autoRefresh: 0,
      open: null, check: null,
    },
    calc: {
      bl: { type: 'normal', stake: 10, back: 2.5, lay: 2.56, commission: 2, refund: 10, retention: 72, adjust: 0, context: null },
      acca: {
        stake: 10, type: 'normal', commission: 2,
        legs: [{ back: 1.8, lay: 1.84, status: 'pending' }, { back: 2.1, lay: 2.16, status: 'pending' }, { back: 1.65, lay: 1.69, status: 'pending' }],
      },
      roll: { deposit: 100, bonus: 100, multiplier: 6, base: 'bonus', avgRating: 97, stakePerBet: 50 },
    },
    bets: [],
    offers: [],
    guide: { current: 'g1', done: {}, quiz: {}, checks: {} },
    metodo: { current: 'm1', done: {} },
    doneGuides: {},
    flow: null,
    seeded: false,
    ui: { offerFilter: 'open', bonosTab: '', addOffer: false, newOffer: null, betForm: null, accountTab: 'login', adminTab: 'resumen', adminEdit: null },
    local: { site: {}, plans: {}, content: null, application: null, contract: null },
  };
}

function loadState() {
  const d = defaults();
  let s = storage.get(STORE_KEY, null);
  if (!s) {
    const old = storage.get(OLD_STORE_KEY, null);
    if (old) s = { bets: old.bets, offers: old.offers, seeded: old.seeded, settings: { ...old.settings, provider: 'auto' } };
  }
  if (!s || typeof s !== 'object') return d;
  const sc = s.calc || {};
  const strip = (list, keys) => (Array.isArray(list) ? list.map((x) => { const y = { ...x }; keys.forEach((k) => delete y[k]); return y; }) : []);
  return {
    ...d,
    settings: {
      ...d.settings,
      ...s.settings,
      commissions: { ...d.settings.commissions, ...(s.settings?.commissions || {}) },
      assumptions: { ...d.settings.assumptions, ...(s.settings?.assumptions || {}) },
      myBookies: Array.isArray(s.settings?.myBookies) && s.settings.myBookies.length ? s.settings.myBookies : [...MAIN_BOOKIES],
    },
    om: { ...d.om, ...s.om, minRatings: { ...d.om.minRatings, ...(s.om?.minRatings || {}) }, open: null, check: null, mode: s.om?.mode === 'sr' ? 'normal' : (s.om?.mode || d.om.mode) },
    calc: {
      bl: { ...d.calc.bl, ...sc.bl },
      acca: { ...d.calc.acca, ...sc.acca },
      roll: { ...d.calc.roll, ...sc.roll },
    },
    bets: strip(s.bets, ['confirmDelete']),
    offers: strip(s.offers, ['confirmDelete', 'completing']),
    guide: { ...d.guide, ...(s.guide || {}) },
    metodo: { ...d.metodo, ...(s.metodo || {}) },
    doneGuides: s.doneGuides || {},
    flow: s.flow || null,
    seeded: !!s.seeded,
    ui: { ...d.ui, ...(s.ui || {}), addOffer: false, betForm: null, adminEdit: null, confirmReset: false, confirmPlan: null, confirmCancel: false },
    local: { ...d.local, ...(s.local || {}) },
  };
}

export const state = loadState();

/** Sesión con el servidor (no se guarda en el navegador). */
export const session = { backend: false, ready: false, config: null, user: null, content: null, metodo: null };

let saveTimer;
let syncTimer;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.set(STORE_KEY, state), 200);
  if (session.backend && session.user) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushData, 1500);
  }
}

export function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
}
export function set(path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const obj = keys.reduce((o, k) => { if (o[k] == null) o[k] = {}; return o[k]; }, state);
  obj[last] = value;
  save();
}
export const n = C.num;
export const nz = (x, d = 0) => (Number.isFinite(n(x)) ? n(x) : d);

/* Datos que viajan al servidor cuando hay sesión. */
function syncPayload() {
  const { apiKey, ...settings } = state.settings;
  return { bets: state.bets, offers: state.offers, settings, guide: { ...state.guide, metodo: state.metodo, doneGuides: state.doneGuides } };
}

export async function pushData() {
  if (!session.backend || !session.user) return;
  try {
    await api.putData(syncPayload());
  } catch (e) {
    if (e.status === 401) { session.user = null; paintAccount(); }
  }
}

/** Al iniciar sesión: si el servidor tiene datos, mandan; si no, se suben los de este navegador. */
export async function pullData() {
  if (!session.backend || !session.user) return;
  try {
    const { data } = await api.getData();
    if (data && (data.bets?.length || data.offers?.length || data.guide)) {
      state.bets = data.bets || [];
      state.offers = data.offers || [];
      const { apiKey } = state.settings;
      if (data.settings) Object.assign(state.settings, data.settings, { apiKey });
      if (data.guide) {
        const { metodo, doneGuides, ...guide } = data.guide;
        Object.assign(state.guide, guide);
        if (metodo) Object.assign(state.metodo, metodo);
        if (doneGuides) state.doneGuides = doneGuides;
      }
      storage.set(STORE_KEY, state);
    } else {
      state.bets = state.bets.filter((b) => !b.example);
      state.offers = state.offers.filter((o) => !o.example);
      await pushData();
    }
  } catch { /* sin conexión: se queda lo local */ }
}

/* ======================================================================== */
/* Planes, contenido y datos del sitio                                       */
/* ======================================================================== */

export function plan() {
  if (session.backend) return session.user?.plan || 'free';
  return state.settings.previewPlan || 'metodo';
}

export function can(feature) {
  if (feature === 'metodo') return session.backend ? !!session.content?.access?.metodo : plan() === 'metodo';
  return canUse(plan(), feature);
}

export const plans = () => (session.backend && session.config ? session.config.plans : mergePlans(state.local.plans));
export const site = () => (session.backend && session.config ? session.config.site : { ...DEFAULT_SITE, ...state.local.site });
export const isAdmin = () => (session.backend ? session.user?.role === 'admin' : true);
export const brand = () => site().brand || 'Contrapeso';

export function content() {
  if (session.backend) return session.content || { guides: [], promos: [], lessons: [], access: {} };
  const c = state.local.content || {};
  const access = { guides: can('guides.welcome'), promos: can('promos.recurring'), metodo: can('metodo') };
  const teaser = (x) => ({ id: x.id, bookie: x.bookie, kind: x.kind, title: x.title, locked: true });
  const lessons = c.lessons || DEFAULT_LESSONS;
  return {
    guides: (c.guides || DEFAULT_GUIDES).filter((x) => x.active !== false).map((g) => (access.guides ? g : teaser(g))),
    promos: (c.promos || DEFAULT_PROMOS).filter((x) => x.active !== false).map((p) => (access.promos ? p : teaser(p))),
    lessons: lessons.map((l) => (access.metodo ? l : { id: l.id, title: l.title, minutes: l.minutes, locked: true })),
    access,
  };
}

export async function loadContent() {
  if (!session.backend) return;
  try { session.content = await api.content(); } catch { session.content = null; }
}

/** Recarga usuario, configuración y contenido tras un cambio de sesión o de plan. */
export async function refreshSession() {
  if (!session.backend) return;
  try {
    session.config = await api.config();
    session.user = session.config.user;
  } catch { /* se mantiene lo anterior */ }
  await loadContent();
  paintAccount();
}

export function assumptions() {
  const a = state.settings.assumptions;
  return {
    qualOdds: nz(a.qualOdds, 2.5), snrOdds: nz(a.snrOdds, 5), srOdds: nz(a.srOdds, 3), spread: nz(a.spread, 2), refundRetention: nz(a.refundRetention, 72), commission: nz(state.settings.defaultCommission, 2),
  };
}

/* ======================================================================== */
/* Cuotas                                                                    */
/* ======================================================================== */

export const odds = {
  events: [], source: 'demo', updated: null, remaining: null, error: null, loading: false, fallback: false, warnings: [], limited: false, betfairTemplate: '',
};
const seenAlerts = new Set();
let firstOddsLoad = true;

function effectiveProvider() {
  const p = state.settings.provider;
  if (p !== 'auto') return p;
  if (session.backend && session.config?.odds?.configured) return 'server';
  if (state.settings.apiKey) return 'api';
  return 'demo';
}

export async function loadOdds({ force = false } = {}) {
  const s = state.settings;
  const provider = effectiveProvider();
  odds.loading = true;
  odds.error = null;
  odds.fallback = false;
  paintStatus();
  try {
    if (provider === 'api') {
      if (!s.apiKey) throw new Error('Falta tu clave de The Odds API (Ajustes → Fuente de cuotas).');
      const sig = `${s.regions}|${s.markets}|${s.sports.join(',')}|${s.apiKey.slice(-6)}`;
      const cached = storage.get(ODDS_CACHE_KEY, null);
      const fresh = cached && cached.sig === sig && Date.now() - Date.parse(cached.updated) < nz(s.cacheMinutes, 10) * 60000;
      if (!force && fresh) {
        Object.assign(odds, { events: cached.events, updated: cached.updated, remaining: cached.remaining, source: 'api', warnings: cached.errors || [], limited: false });
      } else {
        const res = await O.fetchTheOddsApi({ apiKey: s.apiKey, sports: s.sports, regions: s.regions, markets: s.markets || 'h2h' });
        Object.assign(odds, { events: res.events, updated: res.updated, remaining: res.remaining, source: 'api', warnings: res.errors, limited: false });
        storage.set(ODDS_CACHE_KEY, { sig, ...res });
      }
    } else if (provider === 'server') {
      const res = await O.fetchFromServer(s.serverUrl);
      Object.assign(odds, {
        events: res.events || [], updated: res.updated, remaining: res.remaining, source: 'server', warnings: res.errors || [], limited: !!res.limited, betfairTemplate: res.betfairTemplate || '',
      });
    } else {
      Object.assign(odds, { events: O.demoEvents(Date.now()), updated: new Date().toISOString(), remaining: null, source: 'demo', warnings: [], limited: false });
    }
  } catch (e) {
    odds.error = e instanceof TypeError
      ? 'El navegador no pudo conectar con la fuente de cuotas. En la vista previa de claude.ai las conexiones externas están bloqueadas; en tu dominio funciona.'
      : e.message;
    if (!odds.events.length || odds.source === 'demo') {
      Object.assign(odds, { events: O.demoEvents(Date.now()), updated: new Date().toISOString(), source: 'demo', fallback: true, limited: false });
    }
  }
  odds.loading = false;
  booksCache.events = null;
  paintStatus();
  checkAlerts();
  firstOddsLoad = false;
  if (view && view.usesOdds) view.refresh?.();
}

function checkAlerts() {
  const threshold = n(state.settings.alertRating);
  if (!Number.isFinite(threshold) || !can('odds.alerts')) { firstOddsLoad = false; return; }
  const rows = O.findMatches(odds.events, {
    mode: 'normal', stake: 10, commissions: commissionsNum(), defaultCommission: nz(state.settings.defaultCommission), minOdds: 1.3, minRating: threshold,
  });
  const fresh = rows.filter((r) => !seenAlerts.has(r.id));
  rows.forEach((r) => seenAlerts.add(r.id));
  if (firstOddsLoad || !fresh.length) return;
  const msg = `${fresh.length} ${fresh.length === 1 ? 'cuota nueva' : 'cuotas nuevas'} con rating de ${fmt.pct(threshold)} o más`;
  toast(msg, 'good');
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(brand(), { body: msg });
  } catch { /* sin notificaciones */ }
}

let refreshTimer;
export function scheduleRefresh() {
  clearInterval(refreshTimer);
  const mins = n(state.om.autoRefresh);
  if (mins > 0) refreshTimer = setInterval(() => loadOdds({ force: true }), mins * 60000);
}

export function commissionsNum() {
  return Object.fromEntries(Object.entries(state.settings.commissions).map(([k, v]) => [k, nz(v)]));
}

export const booksCache = { events: null, data: null, keys: null };
export function available() {
  if (booksCache.events !== odds.events) {
    const data = O.collectBooks(odds.events);
    Object.assign(booksCache, {
      events: odds.events,
      data,
      keys: { bookies: data.bookies.map(([k]) => k), exchanges: data.exchanges.map(([k]) => k), leagues: data.leagues, families: data.families.map(([k]) => k) },
    });
  }
  return booksCache;
}

/** Filtro efectivo: ignora claves que ya no existen en los datos; si no queda ninguna, no filtra. */
export function filterSet(arr, keys) {
  if (!Array.isArray(arr) || !arr.length) return null;
  if (arr.includes('__none__')) return new Set();
  const live = arr.filter((k) => keys.includes(k));
  return live.length ? new Set(live) : null;
}

/** Claves de casa de los datos actuales que corresponden a nombres del catálogo. */
export function bookieKeysFor(names) {
  const wanted = (Array.isArray(names) ? names : [names]).map((x) => findBookie(x)?.[0] || x);
  const keys = new Set();
  const norm = (s) => O.normalizeText(s).replace(/[^a-z0-9]/g, '');
  for (const [key, title] of available().data.bookies) {
    for (const w of wanted) {
      const cat = findBookie(w);
      if (key === w || (cat && (norm(title) === norm(cat[1]) || norm(title).startsWith(norm(cat[1])) || norm(cat[1]).startsWith(norm(title))))) keys.add(key);
    }
  }
  return [...keys];
}

export function sourceLabel() {
  if (odds.source === 'api') return 'The Odds API';
  if (odds.source === 'server') return session.config?.odds?.betfair ? 'Casas + Betfair.es' : 'Cuotas en directo';
  return 'Demostración';
}

export function statusHTML(compact = false) {
  const live = odds.source !== 'demo';
  const dot = odds.loading ? 'loading' : odds.error ? 'warn' : live ? 'live' : 'demo';
  const parts = [`<span class="dot dot-${dot}"></span><b>${esc(sourceLabel())}</b>`];
  if (odds.updated) parts.push(`<span>${odds.loading ? 'Actualizando…' : fmt.ago(odds.updated)}</span>`);
  if (!compact && odds.remaining != null && odds.source === 'api') parts.push(`<span>${odds.remaining} créditos</span>`);
  return parts.join('<span class="sep">·</span>');
}

let statusPainters = [];
export function onStatusPaint(fn) { statusPainters.push(fn); }
export function paintStatus() {
  document.querySelectorAll('[data-status]').forEach((el) => { el.innerHTML = statusHTML(el.dataset.status === 'compact'); });
  statusPainters.forEach((fn) => fn());
}

/* ======================================================================== */
/* Enlaces directos                                                          */
/* ======================================================================== */

export function backLinkOf(row) {
  if (row.backLink) return { href: row.backLink, exact: true };
  return { href: bookieHome(row.bookKey) || bookieHome(row.bookTitle), exact: false };
}

export function layLinkOf(row) {
  const tpl = odds.betfairTemplate || state.settings.betfairTemplate || site().betfairTemplate;
  if (row.layMarketId && tpl) return { href: tpl.replace('{marketId}', encodeURIComponent(row.layMarketId)).replace('{eventId}', ''), exact: true };
  if (row.layLink) return { href: row.layLink, exact: true };
  if (row.exKey === 'matchbook') return { href: 'https://www.matchbook.com', exact: false };
  return { href: EXCHANGE_HOME, exact: false };
}

/** Botón que abre la casa o el exchange; si no hay enlace al partido, copia el partido. */
export function extLink(link, label, copy, cls = '') {
  if (!link || !link.href) return `<span class="btn btn-sm btn-ext is-disabled ${cls}" title="Sin enlace">${esc(label)}</span>`;
  const title = link.exact ? `Abrir el partido en ${label}` : `Abrir ${label} y copiar «${copy}» para buscarlo`;
  return `<a class="btn btn-sm btn-ext ${cls}" href="${esc(link.href)}" target="_blank" rel="noopener" data-act="ext" data-exact="${link.exact ? 1 : 0}" data-copy="${esc(copy)}" data-site="${esc(label)}" title="${esc(title)}">${esc(label)}${icon('external', 13)}</a>`;
}

export async function onExtLink(el) {
  if (el.dataset.exact === '1') return;
  const ok = await copyQuiet(el.dataset.copy);
  toast(ok ? `Hemos copiado «${el.dataset.copy}». Pégalo en el buscador de ${el.dataset.site}.` : `Busca «${el.dataset.copy}» en ${el.dataset.site}.`);
}

/* ======================================================================== */
/* Flujo guiado de un bono                                                   */
/* ======================================================================== */

export function offerSteps(o) {
  const kind = OFFER_KINDS[o.kind] || OFFER_KINDS.other;
  return kind.steps(o.params || {}, o.bookie);
}

export const offerTitle = (o) => o.title || (OFFER_KINDS[o.kind] || OFFER_KINDS.other).title(o.params || {});

/** Bono propio que sale de una guía o promoción: el que ya existe o uno nuevo. */
export function offerFromSource(item, source) {
  const existing = state.offers.find((o) => o.from === item.id && o.status !== 'skip' && o.status !== 'done');
  if (existing) return { offer: existing, created: false };
  const offer = {
    id: uid(),
    bookie: item.bookie,
    kind: item.kind,
    title: item.title || '',
    params: { ...(item.params || {}) },
    status: 'active',
    done: [],
    deadline: '',
    url: item.url || '',
    from: item.id,
    source,
    created: Date.now(),
  };
  state.offers.push(offer);
  return { offer, created: true };
}

/** Ejecuta la acción de un paso de un bono y deja el flujo abierto para volver. */
export function runStep(offer, idx) {
  const steps = offerSteps(offer);
  const step = steps[idx];
  if (!step) return;
  state.flow = { offerId: offer.id, step: idx, total: steps.length, bookie: offer.bookie, text: step.text };
  if (offer.status === 'todo') offer.status = 'active';
  const a = step.action;
  save();
  if (!a) { render(); return; }
  if (a.kind === 'site') {
    const href = (offer.url) || bookieHome(offer.bookie);
    if (href) window.open(href, '_blank', 'noopener');
    return;
  }
  if (a.kind === 'exchange') { window.open(EXCHANGE_HOME, '_blank', 'noopener'); return; }
  if (a.kind === 'om') {
    const keys = a.om.bookie ? bookieKeysFor(a.om.bookie) : [];
    Object.assign(state.om, {
      mode: a.om.mode || 'normal', minOdds: a.om.minOdds || 1.01, maxOdds: a.om.maxOdds || (a.om.mode === 'normal' ? 12 : 15),
      bookies: keys, myOnly: false, limit: 60, open: null, check: null,
    });
    if (a.om.stake > 0) state.om.stake = a.om.stake;
    if (a.om.refund > 0) state.om.refund = a.om.refund;
    if (a.om.mode === 'refund') state.om.sort = 'rating';
    if (a.om.bookie && !keys.length) toast(`No hay cuotas de ${a.om.bookie} en la fuente actual: se muestran todas las casas.`, 'warn');
    save();
    go('oddsmatcher');
  } else if (a.kind === 'bl') {
    Object.assign(state.calc.bl, { ...a.bl, adjust: 0, context: null });
    save();
    go('calculadora');
  } else if (a.kind === 'roll') {
    Object.assign(state.calc.roll, a.roll);
    save();
    go('rollover');
  } else if (a.kind === 'acca') {
    const acca = state.calc.acca;
    Object.assign(acca, { type: a.acca.type || 'snr', stake: Math.round((a.acca.stake || acca.stake) * 100) / 100 });
    if (acca.legs.length !== 2) acca.legs = [{ back: 2.2, lay: 2.26, status: 'pending' }, { back: 2.4, lay: 2.46, status: 'pending' }];
    acca.legs.forEach((l) => { l.status = 'pending'; delete l.layStakePlaced; });
    save();
    go('combinadas');
  }
}

/** Botón de un paso: enlace real si abre una web (las ventanas por script pueden estar bloqueadas). */
export function stepButton(offer, idx, step, cls = 'btn btn-sm') {
  const a = step && step.action;
  if (!a) return '';
  if (a.kind === 'site' || a.kind === 'exchange') {
    const href = a.kind === 'site' ? (offer.url || bookieHome(offer.bookie)) : EXCHANGE_HOME;
    if (!href) return '';
    return `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener" data-act="step-site" data-offer="${offer.id}" data-step="${idx}">${esc(a.label)} ${icon('external', 13)}</a>`;
  }
  return `<button class="${cls}" data-act="step-action" data-offer="${offer.id}" data-step="${idx}">${esc(a.label)} ${icon('arrow', 14)}</button>`;
}

export function markFlowStep(done = true) {
  const f = state.flow;
  if (!f) return null;
  const offer = state.offers.find((o) => o.id === f.offerId);
  if (!offer) { state.flow = null; return null; }
  const set2 = new Set(offer.done || []);
  if (done) set2.add(f.step); else set2.delete(f.step);
  offer.done = [...set2].sort((a, b) => a - b);
  if (offer.status === 'todo') offer.status = 'active';
  const steps = offerSteps(offer);
  const next = steps.findIndex((_, i) => !set2.has(i));
  if (next >= 0) state.flow = { ...f, step: next, text: steps[next].text, total: steps.length };
  else state.flow = null;
  save();
  return { offer, next };
}

export function flowBar() {
  const f = state.flow;
  if (!f) return '';
  const offer = state.offers.find((o) => o.id === f.offerId);
  if (!offer) return '';
  const step = offerSteps(offer)[f.step];
  return `<div class="flow" role="region" aria-label="Bono en curso">
    <div class="flow-text"><span class="eyebrow">Bono ${esc(f.bookie)} · paso ${f.step + 1} de ${f.total}</span><span>${esc(step?.text || f.text)}</span></div>
    <div class="flow-actions">
      ${stepButton(offer, f.step, step, 'btn btn-sm')}
      <button class="btn btn-sm btn-primary" data-act="flow-done">${icon('check', 15)} Paso hecho</button>
      <button class="btn btn-sm" data-act="flow-back">Volver al bono</button>
      <button class="btn btn-ghost btn-icon" data-act="flow-close" aria-label="Cerrar el bono en curso">${icon('x', 15)}</button>
    </div>
  </div>`;
}

/* ======================================================================== */
/* Navegación                                                                */
/* ======================================================================== */

const routes = {};
export const actions = {};
export let view = null;

export function route(name, def) { routes[name] = def; }
export function registerActions(obj) { Object.assign(actions, obj); }
export const hasRoute = (name) => !!routes[name];

// Direcciones antiguas que siguen funcionando (por ejemplo, enlaces guardados).
const LEGACY_ROUTES = { 'favor-favor': 'calculadora', dutching: 'calculadora' };

export function currentRoute() {
  let name = (location.hash || '').replace('#', '');
  if (LEGACY_ROUTES[name]) {
    name = LEGACY_ROUTES[name];
    history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
  }
  return routes[name] ? name : 'inicio';
}

let main;
export function setMain(el) { main = el; }

export function render() {
  let name = currentRoute();
  let r = routes[name];
  const redirect = r.guard?.();
  if (redirect && routes[redirect] && redirect !== name) {
    name = redirect;
    r = routes[name];
  }
  const y = window.scrollY;
  const sameView = view && view.name === name;
  main.innerHTML = `${r.render()}${footerHTML()}`;
  view = { name, ...r };
  r.mount?.();
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === r.nav;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (sameView) window.scrollTo(0, y);
}

export function go(name) {
  if (location.hash === `#${name}`) render();
  else location.hash = name;
  window.scrollTo(0, 0);
}

/* ======================================================================== */
/* Componentes                                                               */
/* ======================================================================== */

export const fid = (k) => `f-${k.replace(/[^a-z0-9]+/gi, '-')}`;

export function field(k, label, {
  unit, hint, type = 'text', mode = 'decimal', placeholder = '', cls = '', autocomplete = 'off',
} = {}) {
  const v = get(k);
  return `<label class="field ${cls}" for="${fid(k)}">
    <span class="field-label">${label}</span>
    <span class="field-input">
      <input id="${fid(k)}" data-k="${k}" type="${type}" ${type === 'text' ? `inputmode="${mode}"` : ''} value="${esc(v ?? '')}" placeholder="${esc(placeholder)}" autocomplete="${autocomplete}" spellcheck="false">
      ${unit ? `<span class="unit">${unit}</span>` : ''}
    </span>
    ${hint ? `<span class="field-hint">${hint}</span>` : ''}
  </label>`;
}

export function select(k, label, options, { full = false, cls = '' } = {}) {
  const v = String(get(k) ?? '');
  return `<label class="field ${cls}" for="${fid(k)}">
    <span class="field-label">${label}</span>
    <span class="field-input"><select id="${fid(k)}" data-k="${k}" ${full ? 'data-full="1"' : ''}>
      ${options.map(([val, text]) => `<option value="${esc(val)}" ${String(val) === v ? 'selected' : ''}>${esc(text)}</option>`).join('')}
    </select></span>
  </label>`;
}

export function seg(k, options, { label = '', small = false } = {}) {
  const v = String(get(k));
  return `<div class="seg ${small ? 'seg-sm' : ''}" role="radiogroup" ${label ? `aria-label="${esc(label)}"` : ''}>
    ${options.map(([val, text]) => `<button type="button" role="radio" aria-checked="${String(val) === v}" data-set="${k}" data-v="${esc(val)}">${text}</button>`).join('')}
  </div>`;
}

export const oddChip = (x, kind) => `<span class="odd odd-${kind}">${fmt.odds(x)}</span>`;
export const money = (x, cls = '') => `<span class="money ${sign(x)} ${cls}">${fmt.signedEur(x)}</span>`;

export function ratingClass(r, mode) {
  if (!Number.isFinite(r)) return 'r-low';
  if (mode === 'snr') return r >= 85 ? 'r-hot' : r >= 75 ? 'r-good' : r >= 65 ? 'r-ok' : 'r-low';
  return r >= 100 ? 'r-hot' : r >= 97 ? 'r-good' : r >= 94 ? 'r-ok' : 'r-low';
}

export function ratingBar(r, mode) {
  const [lo, hi] = mode === 'snr' ? [50, 95] : [85, 102];
  const w = Math.max(3, Math.min(100, ((r - lo) / (hi - lo)) * 100));
  return `<span class="rating ${ratingClass(r, mode)}"><b>${fmt.pct(r)}</b><span class="rbar"><i style="width:${w.toFixed(1)}%"></i></span></span>`;
}

export function pageHead(title, sub = '', right = '') {
  return `<header class="page-head">
    <div class="page-title"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
    ${right ? `<div class="page-actions">${right}</div>` : ''}
  </header>`;
}

export function kpi(label, value, sub = '', cls = '') {
  return `<div class="kpi ${cls}"><span class="kpi-label">${label}</span><span class="kpi-value">${value}</span>${sub ? `<span class="kpi-sub">${sub}</span>` : ''}</div>`;
}

export const hasExamples = () => state.bets.some((b) => b.example) || state.offers.some((o) => o.example);

export function exampleBanner() {
  if (!hasExamples()) return '';
  return `<div class="banner banner-example">
    <span class="tag tag-example">Ejemplo</span>
    <span>Lo que ves en Bonos y Beneficios son datos de ejemplo para que veas cómo queda. Bórralos cuando empieces con los tuyos.</span>
    <button class="btn btn-ghost btn-sm" data-act="clear-examples">Borrar ejemplos</button>
  </div>`;
}

export function planName(id) { return plans()[id]?.name || id; }

export function priceLabel(p) {
  if (!p || !(p.price > 0)) return 'Gratis';
  return `${fmt.eur(p.price).replace(',00', '')} ${intervalLabel(p.interval)}`.trim();
}

/** Tarjeta de bloqueo con el plan que hace falta. */
export function lockCard(feature, { title, text } = {}) {
  const need = requiredPlan(feature);
  const p = plans()[need];
  return `<section class="lock-card">
    <span class="lock-icon">${icon('lock', 22)}</span>
    <div class="lock-text">
      <b>${esc(title || `Incluido en el plan ${p?.name || need}`)}</b>
      <p>${esc(text || `Desbloquea ${FEATURE_NAMES[feature] || 'esta función'} desde ${priceLabel(p)}.`)}</p>
    </div>
    <a class="btn btn-primary" href="#planes">Ver planes</a>
  </section>`;
}

export function contextBanner(ctx, clearAct) {
  if (!ctx) return '';
  return `<div class="ctx">
    <div><span class="muted small">${esc(ctx.league || '')}${ctx.start ? ` · ${esc(fmt.date(ctx.start))} ${esc(fmt.time(ctx.start))}` : ''}${ctx.market ? ` · ${esc(ctx.market)}` : ''}</span>
    <b>${esc(ctx.event)}</b>${ctx.sel ? `<span>${esc(ctx.sel)}${ctx.bookie ? ` · ${esc(ctx.bookie)}` : ''}${ctx.exchange ? ` → ${esc(ctx.exchange)}` : ''}</span>` : ''}
    ${ctx.backHref || ctx.layHref ? `<span class="ctx-links">${ctx.backHref ? extLink({ href: ctx.backHref, exact: !!ctx.backExact }, ctx.bookie || 'Casa', ctx.event) : ''}${ctx.layHref ? extLink({ href: ctx.layHref, exact: !!ctx.layExact }, ctx.exchange || 'Exchange', ctx.event) : ''}</span>` : ''}</div>
    <button class="btn btn-ghost btn-icon" data-act="${clearAct}" aria-label="Quitar el partido">${icon('x', 16)}</button>
  </div>`;
}

function footerHTML() {
  return `<footer class="site-foot">
    <nav aria-label="Información legal">
      <a href="#aviso-legal">Aviso legal</a><a href="#privacidad">Privacidad</a><a href="#cookies">Cookies</a><a href="#condiciones">Condiciones</a><a href="#juego-responsable">Juego responsable</a>
    </nav>
    <p><span class="badge-18">+18</span> Juega con responsabilidad. Si el juego deja de ser un control de números, pide ayuda en <a href="https://www.jugarbien.es" target="_blank" rel="noopener">jugarbien.es</a>. © ${new Date().getFullYear()} ${esc(brand())}</p>
  </footer>`;
}

/* ======================================================================== */
/* Cuenta en la barra lateral                                                */
/* ======================================================================== */

export function paintAccount() {
  const p = plan();
  const html = session.backend
    ? (session.user
      ? `<a class="account-chip" href="#cuenta">${icon('user', 16)}<span><b>${esc(session.user.name || session.user.email)}</b><span>Plan ${esc(planName(p))}</span></span></a>`
      : '<a class="btn btn-primary btn-sm account-cta" href="#cuenta">Entrar o crear cuenta</a>')
    : `<a class="account-chip" href="#planes" title="Vista previa: elige con qué plan ver la web">${icon('eye', 16)}<span><b>Vista previa</b><span>Plan ${esc(planName(p))}</span></span></a>`;
  document.querySelectorAll('[data-account]').forEach((el) => { el.innerHTML = html; });
  document.querySelectorAll('[data-admin-only]').forEach((el) => { el.hidden = !isAdmin(); });
  document.querySelectorAll('[data-brand]').forEach((el) => { el.textContent = brand(); });
}

/* ======================================================================== */
/* Gráficos                                                                  */
/* ======================================================================== */

export const monthKey = (d) => String(d || '').slice(0, 7);

function chartWidth(max = 600) {
  const w = (main && main.clientWidth) || max;
  return Math.round(Math.max(300, Math.min(max, w - 44)));
}

function niceCeil(v) {
  if (v <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function monthlyBars(bets, months = 6) {
  const now = new Date();
  const keys = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 15);
    keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: fmt.month(d) });
  }
  const sums = Object.fromEntries(keys.map((k) => [k.key, 0]));
  bets.forEach((b) => { const k = monthKey(b.date); if (k in sums) sums[k] += nz(b.profit); });
  const vals = keys.map((k) => sums[k.key]);
  const max = Math.max(1, ...vals.map((v) => Math.max(0, v)));
  const min = Math.min(0, ...vals);
  const W = chartWidth(); const H = 210; const top = 26; const bottom = 30;
  const span = max - min || 1;
  const y = (v) => top + ((max - v) / span) * (H - top - bottom);
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
    <line x1="0" x2="${W}" y1="${zero.toFixed(1)}" y2="${zero.toFixed(1)}" class="chart-zero"/>${bars}</svg>`;
}

export function cumulativeChart(bets) {
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
    ${ticks}${xTicks}<path d="${area}" class="chart-area"/><path d="${line}" class="chart-line"/>
    <circle cx="${x(last.t).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="4.5" class="chart-dot"/></svg>`;
}

/* ======================================================================== */
/* Operaciones comunes                                                       */
/* ======================================================================== */

export function logBet({ bookie = '', kind = 'qualifying', desc = '', profit }) {
  state.bets.push({ id: uid(), date: isoDay(), bookie, kind, desc, profit: C.round(profit) });
  let msg = `Anotado en Beneficios: ${fmt.signedEur(profit)}`;
  if (state.flow) {
    const r = markFlowStep(true);
    if (r) msg += r.next >= 0 ? '. Paso del bono marcado como hecho' : '. Bono listo para completar';
  }
  save();
  toast(msg, 'good');
}

export function seedExamples() {
  if (state.seeded) return;
  const day = (offset) => isoDay(Date.now() - offset * DAY);
  const ex = [
    [118, 'Bet365', 'welcome', 'Apuesta y recibe: calificante y freebet', 21.4],
    [104, 'Codere', 'welcome', 'Reembolso de la primera apuesta', 33.85],
    [97, 'Sportium', 'welcome', 'Bono de bienvenida en freebets', 18.2],
    [83, 'Bwin', 'welcome', 'Reembolso de la primera apuesta', 26.1],
    [70, 'William Hill', 'refund', 'Reembolso en Champions', 7.95],
    [62, 'Luckia', 'welcome', 'Bono con rollover x5', 41.3],
    [49, 'Retabet', 'welcome', 'Freebet de bienvenida', 7.6],
    [41, 'Bet365', 'boost', 'Cuota mejorada', 4.2],
    [33, 'Kirolbet', 'welcome', 'Apuesta y recibe', 22.75],
    [26, 'Codere', 'reload', 'Freebet de los lunes', 3.9],
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
    { id: uid(), bookie: 'Bet365', kind: 'bet_get', params: { qualStake: 10, minOdds: 1.2, freebet: 30, freebetType: 'snr' }, status: 'done', done: [0, 1, 2, 3, 4, 5, 6], profit: 21.4, created: now - 118 * DAY, example: true },
  ];
  state.seeded = true;
  save();
}

export function clearExamples() {
  state.bets = state.bets.filter((b) => !b.example);
  state.offers = state.offers.filter((o) => !o.example);
  if (state.flow && !state.offers.some((o) => o.id === state.flow.offerId)) state.flow = null;
  save();
  toast('Ejemplos borrados');
  render();
}

export function applyTheme(touched = false) {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else if (touched) document.documentElement.removeAttribute('data-theme');
}

export { BOOKIES, MAIN_BOOKIES, findBookie, bookieHome };
