// Oddsmatcher: cuota a favor de las casas frente a la mejor cuota en contra del
// exchange, con filtros, enlaces directos y el cálculo de cada fila explicado.

import {
  state, session, odds, C, O, n, nz, get, set, save, can, plans, available, filterSet, commissionsNum, bookieKeysFor,
  statusHTML, onStatusPaint, loadOdds, scheduleRefresh, backLinkOf, layLinkOf, extLink, extAttrs, flowBar,
  pageHead, seg, field, select, oddChip, money, route, registerActions, go, render, logBet, DAY,
} from '../core.js';
import {
  fmt, esc, icon, toast, isoDay,
} from '../util.js';
import { FREE_ODDS_ROWS } from '../plans.js';

/* ------------------------------------------------------------ cálculo de filas */

function madridEndOfDay(now = Date.now()) {
  const day = isoDay(now);
  for (const off of ['+01:00', '+02:00']) {
    const t = Date.parse(`${day}T23:59:59${off}`);
    if (isoDay(t) === day && isoDay(t + 60000) !== day) return t;
  }
  return now + DAY;
}

const windowEnd = (w, now = Date.now()) => ({
  today: madridEndOfDay(now), '24h': now + DAY, '48h': now + 2 * DAY, '7d': now + 7 * DAY, all: Infinity,
}[w] ?? Infinity);

function bookieFilter() {
  const av = available().keys;
  if (state.om.myOnly) {
    const keys = bookieKeysFor(state.settings.myBookies);
    return keys.length ? new Set(keys) : new Set();
  }
  return filterSet(state.om.bookies, av.bookies);
}

/** Casas marcadas como «mis casas» que no vienen en la fuente de cuotas actual. */
function missingBookies() {
  return state.settings.myBookies.filter((name) => !bookieKeysFor(name).length);
}

let lastRows = new Map();

export function omRows() {
  const o = state.om;
  const av = available().keys;
  const now = Date.now();
  const minR = n(o.minRatings[o.mode]);
  const rows = C.num(o.stake) > 0 ? O.findMatches(odds.events, {
    mode: o.mode,
    stake: nz(o.stake, 10),
    refund: nz(o.refund),
    retention: nz(o.retention, 72),
    commissions: commissionsNum(),
    defaultCommission: nz(state.settings.defaultCommission),
    bookies: bookieFilter(),
    exchanges: filterSet(o.exchanges, av.exchanges),
    leagues: filterSet(o.leagues, av.leagues),
    families: filterSet(o.families, av.families),
    sports: filterSet(o.sports, av.sports),
    minOdds: nz(o.minOdds, 1.01) || 1.01,
    maxOdds: nz(o.maxOdds, 1000) || 1000,
    minRating: Number.isFinite(minR) ? minR : -Infinity,
    minSize: nz(o.minSize, 0),
    to: windowEnd(o.window, now),
    q: o.q,
    now,
  }) : [];
  const dir = o.dir === 'asc' ? 1 : -1;
  const key = { rating: (r) => r.rating, start: (r) => r.start, back: (r) => r.back, lay: (r) => r.lay }[o.sort] || ((r) => r.rating);
  rows.sort((a, b) => (key(a) - key(b)) * dir || b.rating - a.rating);
  rows.forEach((r) => lastRows.set(r.id, r));
  return rows;
}

/** Fila por id (también para la portada). */
export const rowById = (id) => lastRows.get(id);
export const rememberRows = (rows) => rows.forEach((r) => lastRows.set(r.id, r));

/* ------------------------------------------------------------ vista */

function multiPicker(k, label, items, { allLabel = 'Todas' } = {}) {
  const arr = get(k) || [];
  const itemKeys = items.map(([key]) => key);
  const live = arr.filter((key) => itemKeys.includes(key));
  const none = arr.includes('__none__');
  const all = !none && !live.length;
  const selected = new Set(live);
  const summary = none ? 'Ninguna' : all ? allLabel : `${selected.size} de ${items.length}`;
  return `<details class="multi" data-multi="${k}">
    <summary><span class="field-label">${label}</span><span class="multi-value" data-multi-label="${k}">${summary}</span></summary>
    <div class="multi-body">
      <div class="multi-actions"><button type="button" class="btn btn-ghost btn-xs" data-act="multi-all" data-k="${k}">Todas</button><button type="button" class="btn btn-ghost btn-xs" data-act="multi-none" data-k="${k}">Ninguna</button></div>
      ${items.length > 12 ? `<input class="multi-search" type="search" data-complete="1" data-multi-search="${k}" placeholder="Buscar entre ${items.length}…" aria-label="Buscar en ${label}" autocomplete="off">` : ''}
      <div class="multi-grid">${items.map(([key, title]) => `<label class="check"><input type="checkbox" data-multi-item="${k}" value="${esc(key)}" ${all || selected.has(key) ? 'checked' : ''}><span>${esc(title)}</span></label>`).join('')}</div>
    </div>
  </details>`;
}

const PRESETS = [
  ['calif', 'Calificantes de 95 % o más', () => ({ mode: 'normal', minOdds: 1.5, maxOdds: 12, minRatings: { ...state.om.minRatings, normal: 95 } })],
  ['snr', 'Freebets a cuota 4–8', () => ({ mode: 'snr', minOdds: 4, maxOdds: 8, minRatings: { ...state.om.minRatings, snr: 70 } })],
  ['refund', 'Reembolso del 150 % (Winamax)', () => ({ mode: 'refund', stake: 100, refund: 150, minOdds: 3, maxOdds: 8, sort: 'rating', dir: 'desc' })],
  ['hoy', 'Solo hoy', () => ({ window: state.om.window === 'today' ? '7d' : 'today' })],
  ['mias', 'Solo mis casas', () => ({ myOnly: !state.om.myOnly })],
  ['liq', 'Con liquidez de 100 € o más', () => ({ minSize: nz(state.om.minSize) >= 100 ? '' : 100 })],
];

function presetOn(id) {
  const o = state.om;
  if (id === 'calif') return o.mode === 'normal' && n(o.minRatings.normal) >= 95;
  if (id === 'snr') return o.mode === 'snr' && nz(o.minOdds) >= 4;
  if (id === 'refund') return o.mode === 'refund';
  if (id === 'hoy') return o.window === 'today';
  if (id === 'mias') return !!o.myOnly;
  if (id === 'liq') return nz(o.minSize) >= 100;
  return false;
}

function omStatusHTML() {
  const stale = odds.problem && odds.events.length
    ? `<div class="banner banner-warn">${icon('info', 16)}<span><b>${esc(PROBLEM_TITLE[odds.problem.code] || 'La fuente de cuotas ha fallado')}.</b> Se enseñan las últimas cuotas buenas${odds.updated ? `, de ${esc(fmt.ago(odds.updated))}` : ''}: comprueba cada cuota antes de apostar. ${esc(odds.problem.message)}</span></div>` : '';
  const warn = odds.error && odds.events.length ? `<div class="banner banner-warn">${icon('info', 16)}<span>${esc(odds.error)}</span>${/clave/i.test(odds.error) ? '<a class="btn btn-ghost btn-sm" href="#ajustes">Ajustes</a>' : ''}</div>` : '';
  const demo = odds.source === 'demo'
    ? `<div class="banner banner-sim" role="alert">${icon('info', 18)}<span><b>Simulación: estos partidos y cuotas son inventados.</b> No existen en las casas ni en Betfair, no los busques. Sirven solo para ver cómo funciona la herramienta.</span><button class="btn btn-sm" data-act="om-sim-off">Quitar la simulación</button></div>` : '';
  const snap = odds.source === 'snapshot'
    ? `<div class="banner">${icon('clock', 16)}<span>Cuotas reales guardadas ${odds.updated ? fmt.ago(odds.updated) : ''}. No se actualizan solas: comprueba siempre la cuota en la casa y en Betfair antes de apostar.</span></div>` : '';
  const missing = odds.events.length && odds.source !== 'demo' && odds.source !== 'none' ? missingBookies() : [];
  const miss = missing.length
    ? `<div class="banner banner-warn">${icon('info', 16)}<span>Tu fuente de cuotas no trae ${esc(missing.join(', '))}. Para verlas aquí hace falta un proveedor que las cubra (Ajustes → Fuente de cuotas). Mientras, abre cualquier partido y escribe la cuota real de la casa: el cálculo se hace igual.</span></div>` : '';
  const warnings = odds.warnings && odds.warnings.length ? `<details class="warn-list"><summary>${odds.warnings.length} avisos de la fuente de cuotas</summary><ul>${odds.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>` : '';
  return `${stale}${warn}${demo}${snap}${miss}${odds.problem ? '' : warnings}`;
}

const MODE_HINT = {
  normal: 'Rating 100 % = no pierdes nada en la apuesta calificante.',
  snr: 'Rating = % de la apuesta gratis que conviertes en dinero.',
  refund: 'Rating = beneficio en % de lo que apuestas, contando con lo que vale el reembolso si pierdes.',
};

function renderOddsmatcher() {
  const o = state.om;
  const { bookies, exchanges, leagues, families, sports } = available().data;
  const filtersOpen = window.matchMedia('(min-width: 900px)').matches;
  return `${flowBar()}${pageHead('Oddsmatcher', 'La cuota a favor de cada casa junto a la mejor cuota en contra de Betfair, con el cálculo hecho y el enlace directo a los dos sitios.')}
    <div class="om-bar">
      <span class="status-inline" data-status="full">${statusHTML()}</span>
      <div class="om-bar-actions">
        <label class="inline-select" for="f-om-autoRefresh">${icon('clock', 16)}
          <select id="f-om-autoRefresh" data-k="om.autoRefresh" data-act-change="auto-refresh" aria-label="Actualización automática">
            ${[[0, 'Sin actualización automática'], [1, 'Cada minuto'], [2, 'Cada 2 min'], [5, 'Cada 5 min'], [10, 'Cada 10 min']].map(([v, t]) => `<option value="${v}" ${String(o.autoRefresh) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn-sm" data-act="refresh-odds">${icon('refresh', 16)} Actualizar</button>
      </div>
    </div>
    <div id="om-status">${omStatusHTML()}</div>
    <div class="presets" role="group" aria-label="Filtros rápidos">${PRESETS.map(([id, label]) => `<button class="chip ${presetOn(id) ? 'is-on' : ''}" data-act="om-preset" data-id="${id}" aria-pressed="${presetOn(id)}">${label}</button>`).join('')}</div>
    <details class="panel om-filters" ${filtersOpen ? 'open' : ''}>
      <summary class="panel-head"><h2>${icon('filter', 16)} Filtros</h2><span class="muted small">Se guardan solos</span></summary>
      <div class="om-filter-body">
        <div class="field"><span class="field-label">Tipo de apuesta <a class="link small" href="#guia" data-act="guide-open" data-lesson="g4">¿Qué es una freebet SNR?</a></span>${seg('om.mode', [['normal', 'Calificante'], ['snr', 'Freebet'], ['refund', 'Reembolso']])}<span class="field-hint">${MODE_HINT[o.mode] || ''}</span></div>
        <div class="filter-grid">
          ${field('om.stake', o.mode === 'snr' ? 'Importe de la freebet' : 'Importe a favor', { unit: '€' })}
          ${o.mode === 'refund' ? `${field('om.refund', 'Reembolso si pierde', { unit: '€' })}${field('om.retention', 'Retención esperada', { unit: '%' })}` : ''}
          ${field('om.minOdds', 'Cuota mínima')}
          ${field('om.maxOdds', 'Cuota máxima')}
          ${field(`om.minRatings.${o.mode}`, 'Rating mínimo', { unit: '%' })}
          ${field('om.minSize', 'Liquidez mínima', { unit: '€', placeholder: 'Sin mínimo' })}
        </div>
        <div class="filter-grid">
          <label class="field" for="f-om-q"><span class="field-label">Buscar</span><span class="field-input with-icon">${icon('search', 16)}<input id="f-om-q" data-k="om.q" type="search" value="${esc(o.q)}" placeholder="Equipo o liga" autocomplete="off"></span></label>
          ${select('om.window', 'Cuándo', [['today', 'Hoy'], ['24h', 'Próximas 24 h'], ['48h', 'Próximas 48 h'], ['7d', 'Próximos 7 días'], ['all', 'Todo']])}
          ${sports.length > 1 ? multiPicker('om.sports', 'Deportes', sports, { allLabel: 'Todos' }) : ''}
          ${multiPicker('om.families', 'Mercados', families, { allLabel: 'Todos' })}
          ${multiPicker('om.bookies', 'Casas', bookies)}
          ${exchanges.length > 1 ? multiPicker('om.exchanges', 'Exchanges', exchanges, { allLabel: 'Todos' }) : ''}
          ${multiPicker('om.leagues', 'Ligas', leagues.map((l) => [l, l]))}
        </div>
      </div>
    </details>
    <section id="om-results" class="om-results">${omResults()}</section>`;
}

function sortBtn(key, label) {
  const o = state.om;
  const active = o.sort === key;
  return `<button type="button" class="th ${active ? 'is-sorted' : ''}" data-act="om-sort" data-key="${key}" aria-sort="${active ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${label}${active ? `<span class="arrow">${o.dir === 'asc' ? '↑' : '↓'}</span>` : ''}</button>`;
}

function extIcon(link, label, copy) {
  if (!link || !link.href) return '';
  const kind = link.kind || (link.exact ? 'event' : 'home');
  return `<a class="ext-icon link-${kind}" ${extAttrs(link, label, copy)} aria-label="${kind === 'event' ? `Ir al partido en ${esc(label)}` : kind === 'search' ? `Buscar el partido en ${esc(label)}` : `Abrir ${esc(label)}`}">${icon(kind === 'search' ? 'search' : 'external', 14)}</a>`;
}

function ratingClassFor(r, mode) {
  if (!Number.isFinite(r)) return 'r-low';
  if (mode === 'refund') return r >= 80 ? 'r-hot' : r >= 65 ? 'r-good' : r >= 50 ? 'r-ok' : 'r-low';
  if (mode === 'snr') return r >= 85 ? 'r-hot' : r >= 75 ? 'r-good' : r >= 65 ? 'r-ok' : 'r-low';
  return r >= 100 ? 'r-hot' : r >= 97 ? 'r-good' : r >= 94 ? 'r-ok' : 'r-low';
}

function ratingBarFor(r, mode) {
  const [lo, hi] = mode === 'snr' ? [50, 95] : mode === 'refund' ? [0, 100] : [85, 102];
  const w = Math.max(3, Math.min(100, ((r - lo) / (hi - lo)) * 100));
  return `<span class="rating ${ratingClassFor(r, mode)}"><b>${fmt.pct(r)}</b><span class="rbar"><i style="width:${w.toFixed(1)}%"></i></span></span>`;
}
export { ratingBarFor };

function rowHTML(r, mode) {
  const evName = `${r.event.home} – ${r.event.away}`;
  const open = state.om.open === r.id;
  return `<div class="om-item ${open ? 'is-open' : ''}">
    <div class="om-row" role="row">
      <div class="c-when"><span>${esc(fmt.date(r.start))}</span><b>${esc(fmt.time(r.start))}</b></div>
      <div class="c-event"><button class="ev-btn" data-act="om-toggle" data-id="${esc(r.id)}" aria-expanded="${open}"><b>${esc(evName)}${odds.source === 'demo' ? ' <span class="tag tag-sim">Simulado</span>' : ''}</b><span>${esc(r.event.league)} · ${esc(r.marketLabel)} · ${esc(fmt.until(r.start))}</span></button></div>
      <div class="c-sel"><span class="code">${esc(r.label.code)}</span><span>${esc(r.label.text)}</span></div>
      <div class="c-back"><span class="book">${esc(r.bookTitle)}</span>${oddChip(r.back, 'back')}${extIcon(backLinkOf(r), r.bookTitle, evName)}</div>
      <div class="c-lay">${oddChip(r.lay, 'lay')}<span class="ex"><span class="book">${esc(r.exTitle)}</span>${r.laySize != null ? `<span class="liq">${fmt.eur0(r.laySize)} disponibles</span>` : ''}</span>${extIcon(layLinkOf(r), r.exTitle, evName)}</div>
      <div class="c-rating">${ratingBarFor(r.rating, mode)}${money(r.profit, 'small')}</div>
      <div class="c-act"><button class="btn btn-sm btn-primary" data-act="om-calc" data-id="${esc(r.id)}" data-mode="${mode}">Calcular</button><button class="btn btn-ghost btn-icon row-more" data-act="om-toggle" data-id="${esc(r.id)}" aria-expanded="${open}" aria-label="Ver el cálculo">${icon('chevron', 16)}</button></div>
    </div>
    ${open ? rowDetail(r, mode) : ''}
  </div>`;
}

/** Cuotas con las que se calcula una fila: las del listado o las que ha escrito el usuario. */
function oddsFor(r) {
  const c = state.om.check;
  if (c && c.id === r.id) {
    const back = C.num(c.back);
    const lay = C.num(c.lay);
    return { back: back > 1 ? back : r.back, lay: lay > 1 ? lay : r.lay, edited: (back > 1 && back !== r.back) || (lay > 1 && lay !== r.lay) };
  }
  return { back: r.back, lay: r.lay, edited: false };
}

function detailCalc(r, mode) {
  const stake = nz(state.om.stake, 10);
  const cm = r.commission;
  const { back, lay, edited } = oddsFor(r);
  const refundVal = nz(state.om.refund) * nz(state.om.retention, 72) / 100;
  const res = C.backLay({
    stake, back, lay, commission: cm, type: mode, refund: nz(state.om.refund), retention: nz(state.om.retention, 72),
  });
  if (!res.valid) return '<p class="muted">Escribe cuotas mayores que 1.</p>';
  const free = mode === 'snr';
  const sel = r.label.text;
  const evName = `${r.event.home} – ${r.event.away}`;
  const bookWin = stake * (back - 1);
  const bookLose = free ? 0 : -stake;
  const exWin = res.layStake * (1 - cm / 100);
  let formula;
  if (mode === 'snr') formula = `Retención = (${fmt.odds(back)} − 1) × (1 − ${fmt.n2(cm)} %) ÷ (${fmt.odds(lay)} − ${fmt.n2(cm)} %) = <b>${fmt.pct2(res.rating)}</b>. De cada ${fmt.eur(stake)} de freebet te quedas ${fmt.eur(res.profit)}.`;
  else if (mode === 'refund') formula = `En contra = (${fmt.eur(stake)} × ${fmt.odds(back)} − ${fmt.eur(nz(state.om.refund))} × ${fmt.pct(nz(state.om.retention, 72))}) ÷ (${fmt.odds(lay)} − ${fmt.n2(cm)} %) = <b>${fmt.eur(res.layStake)}</b>. Si pierde la apuesta a favor, el reembolso de ${fmt.eur(nz(state.om.refund))} vale unos ${fmt.eur(refundVal)}.`;
  else formula = `Rating = ${fmt.odds(back)} × (1 − ${fmt.n2(cm)} %) ÷ (${fmt.odds(lay)} − ${fmt.n2(cm)} %) = <b>${fmt.pct2(res.rating)}</b>. ${res.rating >= 100 ? 'Ganas dinero en la calificante.' : `Por cada 100 € apostados pierdes ${fmt.eur(100 - res.rating)}.`}`;
  let liq;
  if (r.laySize == null) liq = `<p class="muted small">${icon('info', 14)} Esta fuente no da la liquidez: comprueba en ${esc(r.exTitle)} que se casa toda tu apuesta en contra.</p>`;
  else if (r.laySize >= res.layStake) liq = `<p class="small ok">${icon('check', 14)} Hay ${fmt.eur(r.laySize)} disponibles en contra a ${fmt.odds(r.lay)}: suficiente para tus ${fmt.eur(res.layStake)}.</p>`;
  else liq = `<p class="small warn">${icon('info', 14)} Solo hay ${fmt.eur(r.laySize)} disponibles a ${fmt.odds(r.lay)} y necesitas ${fmt.eur(res.layStake)}. Lo que no se case quedará pendiente: baja el importe o elige otra cuota.</p>`;
  return `${edited ? `<p class="small warn">${icon('info', 14)} Calculado con las cuotas que has escrito.</p>` : ''}
    <ol class="how">
      <li><span>Apuesta <b>${fmt.eur(stake)}</b>${free ? ' de tu apuesta gratis' : ''} <b class="back-ink">a favor</b> de «${esc(sel)}» (${esc(r.marketLabel)}) en <b>${esc(r.bookTitle)}</b> a <b>${fmt.odds(back)}</b>.</span>${extLink(backLinkOf(r), r.bookTitle, evName)}</li>
      <li><span>Apuesta <b>${fmt.eur(res.layStake)}</b> <b class="lay-ink">en contra</b> de «${esc(sel)}» en <b>${esc(r.exTitle)}</b> a <b>${fmt.odds(lay)}</b>. Necesitas <b>${fmt.eur(res.liability)}</b> de saldo en el exchange (responsabilidad).</span>${extLink(layLinkOf(r), r.exTitle, evName)}</li>
      <li><span>Pase lo que pase, el resultado es <b class="${res.profit >= 0 ? 'pos' : 'neg'}">${fmt.signedEur(res.profit)}</b>${mode === 'refund' ? ' (si pierde la apuesta a favor, contando lo que sacas del reembolso)' : ''}.</span></li>
    </ol>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Si…</th><th>Casa</th><th>Exchange</th><th>Total</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span class="dot-back"></span>«${esc(sel)}» sí</th><td>${money(bookWin)}</td><td>${money(-res.liability)}</td><td><b>${money(res.ifBackWins)}</b></td></tr>
        <tr><th scope="row"><span class="dot-lay"></span>«${esc(sel)}» no</th><td>${money(bookLose)}${mode === 'refund' ? `<span class="muted small"> + ${fmt.eur(refundVal)} del reembolso</span>` : ''}</td><td>${money(exWin)}</td><td><b>${money(res.ifLayWins)}</b></td></tr>
      </tbody>
    </table></div>
    <p class="formula">${formula}</p>
    ${liq}`;
}

/** Explicación completa de una fila: qué apostar, dónde, cuánto y por qué. */
export function rowDetail(r, mode) {
  const { back, lay } = oddsFor(r);
  const age = (t) => (t ? fmt.ago(t) : 'sin hora');
  const res = C.backLay({ stake: nz(state.om.stake, 10), back, lay, commission: r.commission, type: mode, refund: nz(state.om.refund), retention: nz(state.om.retention, 72) });
  return `<div class="om-detail" role="region" aria-label="Cálculo de ${esc(r.event.home)} – ${esc(r.event.away)}">
    <div id="om-detail-calc">${detailCalc(r, mode)}</div>
    <div class="check-real">
      <span class="field-label">${icon('pen', 14)} ¿Ha cambiado alguna cuota? Escribe la real y se recalcula todo</span>
      <div class="form-grid pair">
        <label class="field field-back" for="f-om-check-back"><span class="field-label">A favor en ${esc(r.bookTitle)}</span><span class="field-input"><input id="f-om-check-back" data-k="om.check.back" inputmode="decimal" value="${esc(back)}" autocomplete="off"></span></label>
        <label class="field field-lay" for="f-om-check-lay"><span class="field-label">En contra en ${esc(r.exTitle)}</span><span class="field-input"><input id="f-om-check-lay" data-k="om.check.lay" inputmode="decimal" value="${esc(lay)}" autocomplete="off"></span></label>
      </div>
    </div>
    <p class="muted small">${icon('clock', 14)} Cuota de ${esc(r.bookTitle)} actualizada ${age(r.backUpdated)}; exchange ${age(r.layUpdated)}. Compruébalas antes de apostar.</p>
    <div class="actions">
      <button class="btn btn-primary btn-sm" data-act="om-calc" data-id="${esc(r.id)}" data-mode="${mode}">${icon('calc', 15)} Abrir en la calculadora</button>
      <button class="btn btn-sm" data-act="om-log" data-id="${esc(r.id)}" data-mode="${mode}" id="om-log-btn">${icon('save', 15)} Ya lo he apostado: anotar ${res.valid ? fmt.signedEur(res.profit) : ''}</button>
    </div>
  </div>`;
}

const PROBLEM_TITLE = {
  invalid_key: 'La clave de The Odds API no es válida',
  quota: 'Se han acabado los créditos de The Odds API de este mes',
  rate_limit: 'The Odds API ha recibido demasiadas peticiones (error 429)',
  network: 'No se ha podido conectar con The Odds API',
  other: 'La fuente de cuotas ha devuelto un error',
};
const PROBLEM_HELP = {
  invalid_key: 'Revisa la variable NEXT_PUBLIC_ODDS_API_KEY del servidor (archivo .env) y reinícialo. Si la clave se ha filtrado, pide otra en the-odds-api.com.',
  quota: 'El plan gratuito trae 500 créditos al mes; cada descarga de La Liga gasta 2 (cuotas a favor y en contra). Vuelven el día 1, o puedes subir de plan en the-odds-api.com.',
  rate_limit: 'Es un freno temporal. El servidor espera unos minutos y lo vuelve a intentar solo.',
  network: 'El servidor no llega a internet o a api.the-odds-api.com. Se reintenta solo.',
  other: 'Mira el detalle en Administración → Resumen → Cuotas.',
};

/** Panel limpio cuando la fuente falla y no hay ninguna cuota buena guardada. */
function problemPanel(p) {
  const code = p.code || 'other';
  return `<section class="panel om-nosource om-problem" role="alert">
    <div class="panel-head"><h2>${icon('info', 18)} ${esc(PROBLEM_TITLE[code] || PROBLEM_TITLE.other)}</h2>${p.status ? `<span class="pill pill-skip">Error ${esc(String(p.status))}</span>` : ''}</div>
    <p>${esc(p.message || '')}</p>
    <p class="muted small">${esc(PROBLEM_HELP[code] || PROBLEM_HELP.other)}</p>
    <div class="actions"><button class="btn" data-act="refresh-odds">${icon('refresh', 15)} Volver a intentarlo</button><a class="btn btn-ghost" href="#calculadora">${icon('calc', 15)} Calcular con mis propias cuotas</a></div>
  </section>`;
}

const fmtOdd = (x) => (x ? fmt.odds(x) : '—');

const WINDOW_NAME = { today: 'hoy', '24h': 'las próximas 24 horas', '48h': 'las próximas 48 horas', '7d': 'los próximos 7 días' };
/** Si el filtro «Cuándo» deja partidos fuera, lo dice con un botón para verlos. */
function laterHint() {
  const o = state.om;
  if (!o.window || o.window === 'all') return '';
  const end = windowEnd(o.window);
  const later = odds.events.filter((e) => Date.parse(e.start) > end).length;
  return later ? `<p class="muted small">Hay <b>${later}</b> ${later === 1 ? 'partido' : 'partidos'} después de ${WINDOW_NAME[o.window] || 'esa fecha'}.</p><button class="btn btn-sm btn-primary" data-set="om.window" data-v="all">Ver todos los partidos</button>` : '';
}

/** Vista «Por partido»: 1, X y 2 de cada casa y la cuota en contra de Betfair. */
function matchView() {
  const o = state.om;
  const av = available().keys;
  const grid = O.matchGrid(odds.events, {
    bookies: bookieFilter(),
    exchanges: filterSet(o.exchanges, av.exchanges),
    leagues: filterSet(o.leagues, av.leagues),
    sports: filterSet(o.sports, av.sports),
    to: windowEnd(o.window),
    q: o.q,
  });
  const full = can('odds.full');
  const limit = full ? nz(o.limit, 60) : FREE_ODDS_ROWS;
  const shown = grid.rows.slice(0, limit);
  const head = `<div class="results-head"><span><b>${grid.rows.length.toLocaleString('es-ES')}</b> ${grid.rows.length === 1 ? 'partido' : 'partidos'}${grid.rows.length > shown.length ? `, se muestran ${shown.length}` : ''}</span>
    <span class="muted small">Cuotas 1 · X · 2 de cada casa. En los exchanges, la cuota <b class="lay-ink">en contra</b>. ${grid.cols.filter((c) => !c.exchange).length > 1 ? ' En verde, la mejor de cada resultado.' : ''}</span></div>`;
  if (!grid.rows.length) return `${head}<div class="empty panel"><p>Ningún partido cumple los filtros.</p>${laterHint()}<button class="btn btn-sm" data-act="om-reset">Quitar filtros</button></div>`;
  const cell = (row, col, ok) => {
    const c = row.cells[col.key]?.[ok];
    if (!c) return '<td class="mg-odd is-empty">—</td>';
    if (col.exchange) {
      const best = c.lay && c.lay === row.best[ok].lay;
      return `<td class="mg-odd mg-lay ${best ? 'is-best' : ''}" title="${c.back ? `A favor ${fmt.odds(c.back)}` : ''}">${fmtOdd(c.lay)}</td>`;
    }
    const best = c.back && c.back === row.best[ok].back;
    return `<td class="mg-odd ${best ? 'is-best' : ''}">${fmtOdd(c.back)}</td>`;
  };
  return `${head}
  <div class="table-wrap match-grid-wrap"><table class="match-grid" aria-label="Cuotas 1X2 por partido">
    <thead>
      <tr><th rowspan="2" class="mg-when">Fecha</th><th rowspan="2" class="mg-event">Partido</th>${grid.cols.map((c) => `<th colspan="3" class="mg-book ${c.exchange ? 'is-ex' : ''}">${esc(c.title)}${c.exchange ? '<span>en contra</span>' : ''}</th>`).join('')}</tr>
      <tr class="mg-sub">${grid.cols.map((c) => `<th class="${c.exchange ? 'is-ex' : ''}">1</th><th class="${c.exchange ? 'is-ex' : ''}">X</th><th class="${c.exchange ? 'is-ex' : ''}">2</th>`).join('')}</tr>
    </thead>
    <tbody>${shown.map((r) => `<tr>
      <td class="mg-when"><span>${esc(fmt.date(r.start))}</span><b>${esc(fmt.time(r.start))}</b></td>
      <td class="mg-event"><button class="link" data-act="om-match-open" data-q="${esc(r.event.home)}"><b>${esc(r.event.home)} – ${esc(r.event.away)}</b></button><span class="muted small">${esc(r.event.league)}${odds.source === 'demo' ? ' · <span class="tag tag-sim">Simulado</span>' : ''}</span></td>
      ${grid.cols.map((c) => ['home', 'draw', 'away'].map((ok) => cell(r, c, ok)).join('')).join('')}
    </tr>`).join('')}</tbody>
  </table></div>
  ${!full && grid.rows.length > shown.length ? `<div class="om-lock">${icon('lock', 18)}<span><b>${(grid.rows.length - shown.length).toLocaleString('es-ES')} partidos más</b>. Desbloquéalos todos con el plan ${esc(plans().bienvenida.name)}.</span><a class="btn btn-primary btn-sm" href="#planes">Ver planes</a></div>` : ''}
  ${full && grid.rows.length > limit ? `<div class="more"><button class="btn" data-act="om-more">Mostrar ${Math.min(60, grid.rows.length - limit)} más</button></div>` : ''}`;
}

/** Qué hace falta para ver partidos reales: se enseña cuando no hay ninguna fuente de cuotas. */
function noSourcePanel() {
  const server = session.backend;
  return `<section class="panel om-nosource">
    <div class="panel-head"><h2>${icon('info', 18)} Todavía no hay cuotas reales conectadas</h2></div>
    <p>El oddsmatcher enseña <b>partidos reales</b> cuando la web recibe las cuotas de un proveedor de datos. ${server ? 'El servidor no tiene ninguno configurado.' : 'En esta vista previa no hay ninguno conectado.'} Por eso no ves partidos: <b>no inventamos ninguno</b>.</p>
    <div class="table-wrap"><table class="kv">
      <tr><th scope="row">Bet365, Winamax y Retabet</th><td>Cuotas reales con odds-api.io (clave de pago, <code>ODDSAPIIO_KEY</code>). Trae también el enlace directo a cada partido.</td></tr>
      <tr><th scope="row">Betfair.es</th><td>Cuota en contra, liquidez y enlace directo al mercado con la API de Betfair.es (<code>BETFAIR_APP_KEY</code>, con tu cuenta).</td></tr>
      <tr><th scope="row">DAZN Bet y Sportium</th><td>Ningún proveedor da sus cuotas. Se calculan igual escribiendo su cuota en «Comprobar cuota real» de cada partido.</td></tr>
    </table></div>
    <p class="muted small">Las claves se ponen en el servidor (README → Cuotas). En cuanto haya una, aquí salen todos los partidos de cada casa, con sus filtros.</p>
    <div class="actions">
      <button class="btn" data-act="om-sim-on">${icon('eye', 15)} Ver cómo funciona con partidos simulados</button>
      <a class="btn btn-ghost" href="#calculadora">${icon('calc', 15)} Calcular con mis propias cuotas</a>
    </div>
  </section>`;
}

function omResults() {
  if (!odds.events.length && odds.loading) return '<div class="empty panel"><p>Cargando cuotas…</p></div>';
  if (!odds.events.length && odds.problem) return problemPanel(odds.problem);
  if (odds.source === 'none' && !odds.events.length) return noSourcePanel();
  const o = state.om;
  const tabs = `<div class="om-view">${seg('om.view', [['rows', 'Oddsmatcher'], ['match', 'Por partido (1X2)']])}</div>`;
  if (o.view === 'match') return `${tabs}${matchView()}`;
  return `${tabs}${omRowsView()}`;
}

function omRowsView() {
  const o = state.om;
  const rows = omRows();
  const full = can('odds.full');
  const limit = full ? nz(o.limit, 60) : FREE_ODDS_ROWS;
  const shown = rows.slice(0, limit);
  const unit = o.mode === 'normal' ? 'de calificante' : o.mode === 'snr' ? 'de apuesta gratis' : `apostados con ${fmt.eur(nz(o.refund))} de reembolso`;
  const head = `<div class="results-head"><span><b>${rows.length.toLocaleString('es-ES')}</b> ${rows.length === 1 ? 'cuota' : 'cuotas'}${rows.length > shown.length ? `, se muestran ${shown.length}` : ''}</span>
    <span class="muted small">Beneficio con ${fmt.eur(nz(o.stake, 10))} ${unit} · pulsa un partido para ver el cálculo</span></div>`;
  if (!rows.length) {
    const noMine = o.myOnly && !bookieKeysFor(state.settings.myBookies).length;
    return `${head}<div class="empty panel"><p>${noMine ? 'La fuente de cuotas no trae ninguna de tus casas.' : 'Ninguna cuota cumple los filtros.'}</p><p class="muted small">${noMine ? 'Quita «Solo mis casas» o conecta un proveedor que las cubra.' : 'Baja el rating mínimo, amplía el rango de cuotas o quita el filtro de casas.'}</p>${laterHint()}<button class="btn btn-sm" data-act="om-reset">Quitar filtros</button></div>`;
  }
  const lockRow = !full && rows.length > shown.length
    ? `<div class="om-lock">${icon('lock', 18)}<span><b>${(rows.length - shown.length).toLocaleString('es-ES')} cuotas más</b> con tus filtros. ${odds.limited ? 'Tu plan recibe solo los mejores partidos.' : ''} Desbloquéalas todas con el plan ${esc(plans().bienvenida.name)}.</span><a class="btn btn-primary btn-sm" href="#planes">Ver planes</a></div>`
    : '';
  return `${head}
  <div class="om-table" role="table" aria-label="Cuotas encontradas">
    <div class="om-row om-header" role="row">
      ${sortBtn('start', 'Fecha')}<span class="th">Partido</span><span class="th">Selección</span>${sortBtn('back', 'A favor')}${sortBtn('lay', 'En contra')}${sortBtn('rating', 'Rating')}<span class="th"></span>
    </div>
    ${shown.map((r) => rowHTML(r, o.mode)).join('')}
  </div>
  ${lockRow}
  ${full && rows.length > limit ? `<div class="more"><button class="btn" data-act="om-more">Mostrar ${Math.min(60, rows.length - limit)} más</button></div>` : ''}`;
}

export function refreshOm() {
  const el = document.getElementById('om-results');
  if (el) el.innerHTML = omResults();
}

function refreshDetail() {
  const r = lastRows.get(state.om.open);
  const el = document.getElementById('om-detail-calc');
  if (!r || !el) return;
  el.innerHTML = detailCalc(r, state.om.mode);
  const { back, lay } = oddsFor(r);
  const res = C.backLay({ stake: nz(state.om.stake, 10), back, lay, commission: r.commission, type: state.om.mode, refund: nz(state.om.refund), retention: nz(state.om.retention, 72) });
  const btn = document.getElementById('om-log-btn');
  if (btn && res.valid) btn.innerHTML = `${icon('save', 15)} Ya lo he apostado: anotar ${fmt.signedEur(res.profit)}`;
}

onStatusPaint(() => {
  const el = document.getElementById('om-status');
  if (el) el.innerHTML = omStatusHTML();
});

route('oddsmatcher', {
  render: renderOddsmatcher, refresh: refreshOm, refreshDetail, usesOdds: true, nav: 'oddsmatcher',
});

/* ------------------------------------------------------------ acciones */

function calcFromRow(r, mode) {
  const bl = backLinkOf(r);
  const ll = layLinkOf(r);
  const { back, lay } = oddsFor(r);
  state.calc.bl = {
    ...state.calc.bl,
    type: mode,
    stake: nz(state.om.stake, 10),
    back,
    lay,
    commission: r.commission,
    refund: mode === 'refund' ? nz(state.om.refund) : state.calc.bl.refund,
    retention: mode === 'refund' ? nz(state.om.retention, 72) : state.calc.bl.retention,
    adjust: 0,
    context: {
      event: `${r.event.home} – ${r.event.away}`, league: r.event.league, start: r.start, market: r.marketLabel, sel: r.label.text, bookie: r.bookTitle, exchange: r.exTitle,
      backHref: bl.href, backExact: bl.exact, layHref: ll.href, layExact: ll.exact, laySize: r.laySize, backLink: bl, layLink: ll,
    },
  };
  save();
  go('calculadora');
}

registerActions({
  'refresh-odds': () => loadOdds({ force: true }),
  'om-sort': (b) => {
    const k = b.dataset.key;
    if (state.om.sort === k) state.om.dir = state.om.dir === 'asc' ? 'desc' : 'asc';
    else { state.om.sort = k; state.om.dir = k === 'start' ? 'asc' : 'desc'; }
    save();
    refreshOm();
  },
  'om-more': () => { state.om.limit = nz(state.om.limit, 60) + 60; refreshOm(); },
  'om-toggle': (b) => {
    const id = b.dataset.id;
    const open = state.om.open === id ? null : id;
    state.om.open = open;
    const r = lastRows.get(id);
    state.om.check = open && r ? { id, back: r.back, lay: r.lay } : null;
    refreshOm();
  },
  'om-preset': (b) => {
    const preset = PRESETS.find(([id]) => id === b.dataset.id);
    if (!preset) return;
    if (preset[0] === 'mias' && !state.om.myOnly && !state.settings.myBookies.length) {
      toast('Primero marca en Ajustes las casas en las que tienes cuenta.', 'warn');
      go('ajustes');
      return;
    }
    Object.assign(state.om, preset[2](), { limit: 60, open: null, check: null });
    save();
    render();
  },
  'om-reset': () => {
    Object.assign(state.om, {
      minOdds: 1.01, maxOdds: 1000, minRatings: { normal: 80, snr: 50, sr: 70, refund: 0 }, window: 'all', q: '', bookies: [], exchanges: [], leagues: [], families: [], sports: [], myOnly: false, minSize: '', limit: 60,
    });
    save();
    render();
  },
  'om-match-open': (b) => { Object.assign(state.om, { view: 'rows', q: b.dataset.q || '', open: null, limit: 60 }); save(); render(); },
  'om-sim-on': () => { state.settings.provider = 'demo'; save(); loadOdds({ force: true }).then(render); },
  'om-sim-off': () => { state.settings.provider = 'auto'; save(); loadOdds({ force: true }).then(render); },
  'multi-all': (b) => { set(b.dataset.k, []); render(); },
  'multi-none': (b) => { set(b.dataset.k, ['__none__']); render(); },
  'om-calc': (b) => {
    const r = lastRows.get(b.dataset.id);
    if (r) calcFromRow(r, b.dataset.mode || 'normal');
  },
  'om-log': (b) => {
    const r = lastRows.get(b.dataset.id);
    if (!r) return;
    const mode = b.dataset.mode || 'normal';
    const { back, lay } = oddsFor(r);
    const res = C.backLay({ stake: nz(state.om.stake, 10), back, lay, commission: r.commission, type: mode, refund: nz(state.om.refund), retention: nz(state.om.retention, 72) });
    if (!res.valid) return;
    logBet({ bookie: r.bookTitle, kind: { normal: 'qualifying', snr: 'freebet', refund: 'refund' }[mode] || 'qualifying', desc: `${r.event.home} – ${r.event.away} · ${r.label.text}`, profit: res.profit });
    render();
  },
});

export const onAutoRefreshChange = () => {
  scheduleRefresh();
  toast(n(state.om.autoRefresh) ? `Las cuotas se actualizan cada ${state.om.autoRefresh} min` : 'Actualización automática desactivada');
};
