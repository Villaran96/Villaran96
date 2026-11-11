// Oddsmatcher: favor-contra y favor-favor, con filtros, enlaces directos y el
// cálculo de cada fila explicado.

import {
  state, odds, C, O, n, nz, get, set, save, can, plans, available, filterSet, commissionsNum, bookieKeysFor,
  statusHTML, onStatusPaint, loadOdds, scheduleRefresh, backLinkOf, layLinkOf, extLink, flowBar, lockCard,
  pageHead, seg, field, select, oddChip, money, ratingBar, route, registerActions, go, render, logBet, DAY,
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
    return keys.length ? new Set(keys) : null;
  }
  return filterSet(state.om.bookies, av.bookies);
}

let lastRows = new Map();
let lastDutches = new Map();
let totalRows = 0;

export function omRows() {
  const o = state.om;
  const av = available().keys;
  const now = Date.now();
  const minR = n(o.minRatings[o.mode]);
  const rows = O.findMatches(odds.events, {
    mode: o.mode,
    stake: nz(o.stake, 10),
    commissions: commissionsNum(),
    defaultCommission: nz(state.settings.defaultCommission),
    bookies: bookieFilter(),
    exchanges: filterSet(o.exchanges, av.exchanges),
    leagues: filterSet(o.leagues, av.leagues),
    families: filterSet(o.families, av.families),
    minOdds: nz(o.minOdds, 1.01) || 1.01,
    maxOdds: nz(o.maxOdds, 1000) || 1000,
    minRating: Number.isFinite(minR) ? minR : -Infinity,
    minSize: nz(o.minSize, 0),
    to: windowEnd(o.window, now),
    q: o.q,
    now,
  });
  const dir = o.dir === 'asc' ? 1 : -1;
  const key = { rating: (r) => r.rating, start: (r) => r.start, back: (r) => r.back, lay: (r) => r.lay }[o.sort] || ((r) => r.rating);
  rows.sort((a, b) => (key(a) - key(b)) * dir || b.rating - a.rating);
  rows.forEach((r) => lastRows.set(r.id, r));
  return rows;
}

function ffRows() {
  const o = state.om;
  const av = available().keys;
  const now = Date.now();
  const rows = O.findDutches(odds.events, {
    bookies: bookieFilter(),
    leagues: filterSet(o.leagues, av.leagues),
    families: filterSet(o.families, av.families),
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
      <div class="multi-grid">${items.map(([key, title]) => `<label class="check"><input type="checkbox" data-multi-item="${k}" value="${esc(key)}" ${all || selected.has(key) ? 'checked' : ''}><span>${esc(title)}</span></label>`).join('')}</div>
    </div>
  </details>`;
}

const PRESETS = [
  ['calif', 'Calificantes de 95 % o más', () => ({ mode: 'normal', minOdds: 1.5, maxOdds: 12, minRatings: { ...state.om.minRatings, normal: 95 } })],
  ['snr', 'Freebets a cuota 4–9', () => ({ mode: 'snr', minOdds: 4, maxOdds: 9, minRatings: { ...state.om.minRatings, snr: 70 } })],
  ['hoy', 'Solo hoy', () => ({ window: state.om.window === 'today' ? '7d' : 'today' })],
  ['mias', 'Solo mis casas', () => ({ myOnly: !state.om.myOnly })],
  ['liq', 'Con liquidez de 100 € o más', () => ({ minSize: nz(state.om.minSize) >= 100 ? '' : 100 })],
];

function presetOn(id) {
  const o = state.om;
  if (id === 'calif') return o.mode === 'normal' && n(o.minRatings.normal) >= 95;
  if (id === 'snr') return o.mode === 'snr' && nz(o.minOdds) >= 4;
  if (id === 'hoy') return o.window === 'today';
  if (id === 'mias') return !!o.myOnly;
  if (id === 'liq') return nz(o.minSize) >= 100;
  return false;
}

function omStatusHTML() {
  const warn = odds.error ? `<div class="banner banner-warn">${icon('info', 16)}<span>${esc(odds.error)}${odds.fallback ? ' Mientras tanto ves cuotas de demostración.' : ''}</span>${/clave/i.test(odds.error) ? '<a class="btn btn-ghost btn-sm" href="#ajustes">Ajustes</a>' : ''}</div>` : '';
  const demo = odds.source === 'demo' && !odds.error
    ? `<div class="banner banner-demo">${icon('info', 16)}<span>Cuotas simuladas para que pruebes la herramienta. Con el servidor publicado verás las cuotas reales de las casas y de Betfair.es.</span><a class="btn btn-ghost btn-sm" href="#ajustes">Fuente de cuotas</a></div>` : '';
  const warnings = odds.warnings && odds.warnings.length ? `<details class="warn-list"><summary>${odds.warnings.length} avisos de la fuente de cuotas</summary><ul>${odds.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>` : '';
  return `${warn}${demo}${warnings}`;
}

function renderOddsmatcher() {
  const o = state.om;
  const { bookies, exchanges, leagues, families } = available().data;
  const filtersOpen = window.matchMedia('(min-width: 900px)').matches;
  const modeHint = {
    normal: 'Rating 100 % = no pierdes nada en la apuesta calificante.',
    snr: 'Rating = % de la apuesta gratis (sin devolución) que conviertes en dinero.',
    sr: 'Rating = % de la apuesta gratis (con devolución) que conviertes en dinero.',
  }[o.mode];

  const fcFilters = `
    <div class="field"><span class="field-label">Tipo de apuesta <a class="link small" href="#guia" data-act="guide-open" data-lesson="g4">¿Qué es SNR y SR?</a></span>${seg('om.mode', [['normal', 'Calificante'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR']])}<span class="field-hint">${modeHint}</span></div>
    <div class="filter-grid">
      ${field('om.stake', o.mode === 'normal' ? 'Importe a favor' : 'Importe de la freebet', { unit: '€' })}
      ${field('om.minOdds', 'Cuota mínima')}
      ${field('om.maxOdds', 'Cuota máxima')}
      ${field(`om.minRatings.${o.mode}`, 'Rating mínimo', { unit: '%' })}
      ${field('om.minSize', 'Liquidez mínima', { unit: '€', placeholder: 'Sin mínimo' })}
    </div>`;

  const ffFilters = `
    <div class="filter-grid">
      ${select('om.fbBook', 'Apuesta gratis en', [['', 'Ninguna (todo con dinero)'], ...bookies], { full: true })}
      ${field('om.ffStake', o.fbBook ? 'Importe de la freebet' : 'Total a repartir', { unit: '€' })}
      ${field('om.ffMinRating', 'Rating mínimo', { unit: '%' })}
    </div>
    <p class="field-hint">${o.fbBook ? 'Juegas la freebet en un resultado y cubres los demás con dinero en otras casas, sin exchange. Rating = % de la freebet que conviertes.' : 'Cubres todos los resultados con dinero en casas distintas. Un rating por encima del 100 % es una surebet.'}</p>`;

  return `${flowBar()}${pageHead('Oddsmatcher', 'Cada cuota a favor de las casas junto a la mejor cuota en contra del exchange, con el cálculo hecho y el enlace directo a los dos sitios.', `
      <div class="seg seg-lg" role="tablist" aria-label="Tipo de búsqueda">
        <button type="button" role="tab" aria-selected="${o.view === 'fc'}" data-set="om.view" data-v="fc">Favor-contra</button>
        <button type="button" role="tab" aria-selected="${o.view === 'ff'}" data-set="om.view" data-v="ff">Favor-favor</button>
      </div>`)}
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
    ${o.view === 'fc' ? `<div class="presets" role="group" aria-label="Filtros rápidos">${PRESETS.map(([id, label]) => `<button class="chip ${presetOn(id) ? 'is-on' : ''}" data-act="om-preset" data-id="${id}" aria-pressed="${presetOn(id)}">${label}</button>`).join('')}</div>` : ''}
    <details class="panel om-filters" ${filtersOpen ? 'open' : ''}>
      <summary class="panel-head"><h2>${icon('filter', 16)} Filtros</h2><span class="muted small">Se guardan solos</span></summary>
      <div class="om-filter-body">
        ${o.view === 'fc' ? fcFilters : ffFilters}
        <div class="filter-grid">
          <label class="field" for="f-om-q"><span class="field-label">Buscar</span><span class="field-input with-icon">${icon('search', 16)}<input id="f-om-q" data-k="om.q" type="search" value="${esc(o.q)}" placeholder="Equipo o liga" autocomplete="off"></span></label>
          ${select('om.window', 'Cuándo', [['today', 'Hoy'], ['24h', 'Próximas 24 h'], ['48h', 'Próximas 48 h'], ['7d', 'Próximos 7 días'], ['all', 'Todo']])}
          ${multiPicker('om.families', 'Mercados', families, { allLabel: 'Todos' })}
          ${multiPicker('om.bookies', 'Casas', bookies)}
          ${o.view === 'fc' ? multiPicker('om.exchanges', 'Exchanges', exchanges, { allLabel: 'Todos' }) : ''}
          ${multiPicker('om.leagues', 'Ligas', leagues.map((l) => [l, l]))}
        </div>
      </div>
    </details>
    <section id="om-results" class="om-results">${results()}</section>`;
}

function results() {
  if (state.om.view === 'ff') return can('odds.dutch') ? ffResults() : lockCard('odds.dutch');
  return omResults();
}

function sortBtn(key, label) {
  const o = state.om;
  const active = o.sort === key;
  return `<button type="button" class="th ${active ? 'is-sorted' : ''}" data-act="om-sort" data-key="${key}" aria-sort="${active ? (o.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">${label}${active ? `<span class="arrow">${o.dir === 'asc' ? '↑' : '↓'}</span>` : ''}</button>`;
}

function extIcon(link, label, copy) {
  if (!link || !link.href) return '';
  return `<a class="ext-icon" href="${esc(link.href)}" target="_blank" rel="noopener" data-act="ext" data-exact="${link.exact ? 1 : 0}" data-copy="${esc(copy)}" data-site="${esc(label)}" aria-label="Abrir ${esc(label)}${link.exact ? ' en este partido' : ''}" title="${link.exact ? `Abrir el partido en ${esc(label)}` : `Abrir ${esc(label)} y copiar el partido`}">${icon('external', 14)}</a>`;
}

function rowHTML(r, mode) {
  const evName = `${r.event.home} – ${r.event.away}`;
  const open = state.om.open === r.id;
  return `<div class="om-item ${open ? 'is-open' : ''}">
    <div class="om-row" role="row">
      <div class="c-when"><span>${esc(fmt.date(r.start))}</span><b>${esc(fmt.time(r.start))}</b></div>
      <div class="c-event"><button class="ev-btn" data-act="om-toggle" data-id="${esc(r.id)}" aria-expanded="${open}"><b>${esc(evName)}</b><span>${esc(r.event.league)} · ${esc(r.marketLabel)} · ${esc(fmt.until(r.start))}</span></button></div>
      <div class="c-sel"><span class="code">${esc(r.label.code)}</span><span>${esc(r.label.text)}</span></div>
      <div class="c-back"><span class="book">${esc(r.bookTitle)}</span>${oddChip(r.back, 'back')}${extIcon(backLinkOf(r), r.bookTitle, evName)}</div>
      <div class="c-lay">${oddChip(r.lay, 'lay')}<span class="ex"><span class="book">${esc(r.exTitle)}</span>${r.laySize != null ? `<span class="liq">${fmt.eur0(r.laySize)} disponibles</span>` : ''}</span>${extIcon(layLinkOf(r), r.exTitle, evName)}</div>
      <div class="c-rating">${ratingBar(r.rating, mode)}${money(r.profit, 'small')}</div>
      <div class="c-act"><button class="btn btn-sm btn-primary" data-act="om-calc" data-id="${esc(r.id)}" data-mode="${mode}">Calcular</button><button class="btn btn-ghost btn-icon row-more" data-act="om-toggle" data-id="${esc(r.id)}" aria-expanded="${open}" aria-label="Ver el cálculo">${icon('chevron', 16)}</button></div>
    </div>
    ${open ? rowDetail(r, mode) : ''}
  </div>`;
}

/** Explicación completa de una fila: qué apostar, dónde, cuánto y por qué. */
export function rowDetail(r, mode) {
  const stake = nz(state.om.stake, 10);
  const c = r.commission;
  const res = C.backLay({ stake, back: r.back, lay: r.lay, commission: c, type: mode });
  if (!res.valid) return '';
  const free = mode !== 'normal';
  const sel = r.label.text;
  const evName = `${r.event.home} – ${r.event.away}`;
  const bookWin = mode === 'sr' ? stake * r.back : stake * (r.back - 1);
  const bookLose = free ? 0 : -stake;
  const exWin = res.layStake * (1 - c / 100);
  const pct = (x) => fmt.pct2(x);
  const formula = mode === 'snr'
    ? `Retención = (${fmt.odds(r.back)} − 1) × (1 − ${fmt.n2(c)} %) ÷ (${fmt.odds(r.lay)} − ${fmt.n2(c)} %) = <b>${pct(res.rating)}</b>. De cada ${fmt.eur(stake)} de freebet te quedas ${fmt.eur(res.profit)}.`
    : mode === 'sr'
      ? `Retención = ${fmt.odds(r.back)} × (1 − ${fmt.n2(c)} %) ÷ (${fmt.odds(r.lay)} − ${fmt.n2(c)} %) = <b>${pct(res.rating)}</b>.`
      : `Rating = ${fmt.odds(r.back)} × (1 − ${fmt.n2(c)} %) ÷ (${fmt.odds(r.lay)} − ${fmt.n2(c)} %) = <b>${pct(res.rating)}</b>. ${res.rating >= 100 ? 'Ganas dinero en la calificante.' : `Por cada 100 € apostados pierdes ${fmt.eur(100 - res.rating)}.`}`;
  let liq;
  if (r.laySize == null) liq = `<p class="muted small">${icon('info', 14)} Esta fuente no da la liquidez: comprueba en ${esc(r.exTitle)} que se casa toda tu apuesta en contra.</p>`;
  else if (r.laySize >= res.layStake) liq = `<p class="small ok">${icon('check', 14)} Hay ${fmt.eur(r.laySize)} disponibles en contra a ${fmt.odds(r.lay)}: suficiente para tus ${fmt.eur(res.layStake)}.</p>`;
  else liq = `<p class="small warn">${icon('info', 14)} Solo hay ${fmt.eur(r.laySize)} disponibles a ${fmt.odds(r.lay)} y necesitas ${fmt.eur(res.layStake)}. Lo que no se case quedará pendiente: baja el importe o elige otra cuota.</p>`;
  const age = (t) => (t ? fmt.ago(t) : 'sin hora');
  return `<div class="om-detail" role="region" aria-label="Cálculo de ${esc(evName)}">
    <ol class="how">
      <li><span>Apuesta <b>${fmt.eur(stake)}</b>${free ? ' de tu apuesta gratis' : ''} <b class="back-ink">a favor</b> de «${esc(sel)}» (${esc(r.marketLabel)}) en <b>${esc(r.bookTitle)}</b> a <b>${fmt.odds(r.back)}</b>.</span>${extLink(backLinkOf(r), r.bookTitle, evName)}</li>
      <li><span>Apuesta <b>${fmt.eur(res.layStake)}</b> <b class="lay-ink">en contra</b> de «${esc(sel)}» en <b>${esc(r.exTitle)}</b> a <b>${fmt.odds(r.lay)}</b>. Necesitas <b>${fmt.eur(res.liability)}</b> de saldo en el exchange (responsabilidad).</span>${extLink(layLinkOf(r), r.exTitle, evName)}</li>
      <li><span>Pase lo que pase, el resultado es <b class="${res.profit >= 0 ? 'pos' : 'neg'}">${fmt.signedEur(res.profit)}</b>.</span></li>
    </ol>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Si…</th><th>Casa</th><th>Exchange</th><th>Total</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span class="dot-back"></span>«${esc(sel)}» sí</th><td>${money(bookWin)}</td><td>${money(-res.liability)}</td><td><b>${money(res.ifBackWins)}</b></td></tr>
        <tr><th scope="row"><span class="dot-lay"></span>«${esc(sel)}» no</th><td>${money(bookLose)}</td><td>${money(exWin)}</td><td><b>${money(res.ifLayWins)}</b></td></tr>
      </tbody>
    </table></div>
    <p class="formula">${formula}</p>
    ${liq}
    <p class="muted small">${icon('clock', 14)} Cuota de ${esc(r.bookTitle)} actualizada ${age(r.backUpdated)}; exchange ${age(r.layUpdated)}. Las cuotas cambian: compruébalas antes de apostar.</p>
    <div class="actions">
      <button class="btn btn-primary btn-sm" data-act="om-calc" data-id="${esc(r.id)}" data-mode="${mode}">${icon('calc', 15)} Abrir en la calculadora</button>
      <button class="btn btn-sm" data-act="om-log" data-id="${esc(r.id)}" data-mode="${mode}">${icon('save', 15)} Ya lo he apostado: anotar ${fmt.signedEur(res.profit)}</button>
    </div>
  </div>`;
}

function omResults() {
  const o = state.om;
  const rows = omRows();
  totalRows = rows.length;
  const full = can('odds.full');
  const limit = full ? nz(o.limit, 60) : FREE_ODDS_ROWS;
  const shown = rows.slice(0, limit);
  const head = `<div class="results-head"><span><b>${rows.length.toLocaleString('es-ES')}</b> ${rows.length === 1 ? 'cuota' : 'cuotas'}${rows.length > shown.length ? `, se muestran ${shown.length}` : ''}</span>
    <span class="muted small">Beneficio con ${fmt.eur(nz(o.stake, 10))} ${o.mode === 'normal' ? 'de calificante' : 'de apuesta gratis'} · pulsa un partido para ver el cálculo</span></div>`;
  if (!rows.length) {
    return `${head}<div class="empty panel"><p>Ninguna cuota cumple los filtros.</p><p class="muted small">Baja el rating mínimo, amplía el rango de cuotas o quita el filtro de casas.</p><button class="btn btn-sm" data-act="om-reset">Quitar filtros</button></div>`;
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

function ffResults() {
  const o = state.om;
  const rows = ffRows();
  const limit = nz(o.limit, 60);
  const shown = rows.slice(0, limit);
  const head = `<div class="results-head"><span><b>${rows.length.toLocaleString('es-ES')}</b> ${rows.length === 1 ? 'combinación' : 'combinaciones'}</span><span class="muted small">${o.fbBook ? `Freebet de ${fmt.eur(nz(o.ffStake, 10))}` : `Repartiendo ${fmt.eur(nz(o.ffStake, 10))}`}</span></div>`;
  if (!rows.length) return `${head}<div class="empty panel"><p>No hay combinaciones con esos filtros.</p><p class="muted small">Baja el rating mínimo o elige otra casa para la apuesta gratis.</p></div>`;
  return `${head}<div class="ff-list">${shown.map((d) => {
    const evName = `${d.event.home} – ${d.event.away}`;
    return `<article class="ff-card">
      <header>
        <div class="c-event"><b>${esc(evName)}</b><span>${esc(d.event.league)} · ${esc(d.marketLabel)} · ${esc(fmt.date(d.start))} ${esc(fmt.time(d.start))}</span></div>
        ${ratingBar(d.rating, o.fbBook ? 'snr' : 'normal')}
      </header>
      <ul class="ff-legs">${d.legs.map((l, i) => {
        const lab = O.outcomeLabel(d.event, d.mk, l.ok);
        return `<li><span class="code">${esc(lab.code)}</span><span class="ff-name">${esc(lab.text)}</span><span class="book">${esc(l.title)}${l.freebet ? ' <span class="tag tag-fb">freebet</span>' : ''} ${extIcon(backLinkOf({ backLink: l.link, bookKey: l.key, bookTitle: l.title }), l.title, evName)}</span>${oddChip(l.odds, 'back')}<span class="ff-stake">${fmt.eur(d.result.stakes[i])}</span></li>`;
      }).join('')}</ul>
      <footer><span>Beneficio ${money(d.profit)}</span><button class="btn btn-sm btn-primary" data-act="ff-calc" data-id="${esc(d.id)}">Calcular</button></footer>
    </article>`;
  }).join('')}</div>
  ${rows.length > limit ? '<div class="more"><button class="btn" data-act="om-more">Mostrar más</button></div>' : ''}`;
}

export function refreshOm() {
  const el = document.getElementById('om-results');
  if (el) el.innerHTML = results();
}

onStatusPaint(() => {
  const el = document.getElementById('om-status');
  if (el) el.innerHTML = omStatusHTML();
});

route('oddsmatcher', { render: renderOddsmatcher, refresh: refreshOm, usesOdds: true, nav: 'oddsmatcher' });

/* ------------------------------------------------------------ acciones */

function calcFromRow(r, mode) {
  const bl = backLinkOf(r);
  const ll = layLinkOf(r);
  state.calc.bl = {
    ...state.calc.bl,
    type: mode,
    stake: nz(state.om.stake, 10),
    back: r.back,
    lay: r.lay,
    commission: r.commission,
    adjust: 0,
    context: {
      event: `${r.event.home} – ${r.event.away}`, league: r.event.league, start: r.start, market: r.marketLabel, sel: r.label.text, bookie: r.bookTitle, exchange: r.exTitle,
      backHref: bl.href, backExact: bl.exact, layHref: ll.href, layExact: ll.exact, laySize: r.laySize,
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
    state.om.open = state.om.open === b.dataset.id ? null : b.dataset.id;
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
    Object.assign(state.om, preset[2](), { limit: 60, open: null });
    save();
    render();
  },
  'om-reset': () => {
    Object.assign(state.om, {
      minOdds: 1.01, maxOdds: 1000, minRatings: { normal: 80, snr: 50, sr: 70 }, window: 'all', q: '', bookies: [], exchanges: [], leagues: [], families: [], myOnly: false, minSize: '', limit: 60,
    });
    save();
    render();
  },
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
    const res = C.backLay({ stake: nz(state.om.stake, 10), back: r.back, lay: r.lay, commission: r.commission, type: mode });
    logBet({ bookie: r.bookTitle, kind: mode === 'normal' ? 'qualifying' : 'freebet', desc: `${r.event.home} – ${r.event.away} · ${r.label.text}`, profit: res.profit });
    render();
  },
  'ff-calc': (b) => {
    const d = lastDutches.get(b.dataset.id);
    if (!d) return;
    const fixedIndex = d.freebetIndex >= 0 ? d.freebetIndex : 0;
    state.calc.dutch = {
      ...state.calc.dutch,
      legs: d.legs.map((l) => ({ name: `${O.outcomeLabel(d.event, d.mk, l.ok).text} · ${l.title}`, odds: l.odds, freebet: !!l.freebet, commission: '' })),
      mode: d.freebetIndex >= 0 ? 'fixed' : 'total',
      fixedIndex,
      fixedStake: nz(state.om.ffStake, 10),
      totalStake: nz(state.om.ffStake, 10),
      context: { event: `${d.event.home} – ${d.event.away}`, league: d.event.league, start: d.start, market: d.marketLabel },
    };
    save();
    go('favor-favor');
  },
});

export const onAutoRefreshChange = () => {
  scheduleRefresh();
  toast(n(state.om.autoRefresh) ? `Las cuotas se actualizan cada ${state.om.autoRefresh} min` : 'Actualización automática desactivada');
};
