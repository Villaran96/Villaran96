// Bonos: guías de bienvenida casa por casa, promociones recurrentes y el
// seguimiento de los bonos propios, paso a paso.

import {
  state, C, n, nz, save, render, go, route, registerActions, field, select, money, pageHead, kpi, exampleBanner,
  flowBar, lockCard, content, can, plans, assumptions, runStep, offerSteps, offerTitle, offerFromSource, markFlowStep, bookieHome,
  extLink, stepButton, DAY, rangeText, valueRange,
} from '../core.js';
import {
  fmt, esc, icon, toast, uid, isoDay, reviewedLabel,
} from '../util.js';
import { OFFER_KINDS, DETAIL_FIELDS } from '../data.js';

const STATUS = { todo: 'Por hacer', active: 'En curso', done: 'Completado', skip: 'Descartado' };
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const value = (o) => C.offerValue(o, assumptions());
const kindOf = (k) => OFFER_KINDS[k] || OFFER_KINDS.other;
const startedFrom = (sourceId) => state.offers.find((o) => o.from === sourceId && o.status !== 'skip');

function defaultTab() {
  if (state.ui.bonosTab) return state.ui.bonosTab;
  return state.offers.some((o) => !o.example && (o.status === 'active' || o.status === 'todo')) ? 'mis' : 'bienvenida';
}

function renderBonos() {
  const tab = defaultTab();
  const c = content();
  const openMine = state.offers.filter((o) => o.status === 'todo' || o.status === 'active').length;
  const tabs = [
    ['bienvenida', 'Bienvenida', c.guides.length],
    ['recurrentes', 'Recurrentes', c.promos.length],
    ['mis', 'Mis bonos', openMine],
  ];
  const body = tab === 'bienvenida' ? welcomeTab(c) : tab === 'recurrentes' ? recurringTab(c) : mineTab();
  return `${flowBar()}${pageHead('Bonos', 'Elige un bono, sigue sus pasos y cada botón te lleva a la herramienta que toca: oddsmatcher, calculadora o la web de la casa.', `<button class="btn btn-primary" data-act="toggle-add-offer">${icon('plus', 16)} Añadir un bono a mano</button>`)}
  <nav class="tabs" aria-label="Tipos de bono">${tabs.map(([k, t, count]) => `<button class="tab ${k === tab ? 'is-active' : ''}" data-act="bonos-tab" data-tab="${k}" ${k === tab ? 'aria-current="page"' : ''}>${t}${count ? `<span class="tab-count">${count}</span>` : ''}</button>`).join('')}</nav>
  ${state.ui.addOffer ? addOfferForm() : ''}
  ${body}`;
}

/* ------------------------------------------------------------ bienvenida */

function welcomeTab(c) {
  if (!c.access.guides) {
    return `${lockCard('guides.welcome', { text: `Cómo se hace, paso a paso, el bono de bienvenida de ${c.guides.map((g) => g.bookie).join(', ')}: lo que vale cada uno y botones que te llevan a la cuota y al cálculo exactos.` })}
    <div class="teasers">${c.guides.map((g) => `<div class="teaser">${icon('lock', 14)}<b>${esc(g.bookie)}</b><span>${esc(g.title || kindOf(g.kind).label)}</span>${g.est?.mid ? `<span class="teaser-value">unos ${fmt.eur0(g.est.mid)}</span>` : ''}</div>`).join('')}</div>
    <p class="muted small">Los valores son estimaciones prudentes: entre ${fmt.eur0(c.guides.reduce((s, g) => s + (g.est?.low || 0), 0))} y ${fmt.eur0(c.guides.reduce((s, g) => s + (g.est?.high || 0), 0))} entre los ${c.guides.length} bonos.</p>`;
  }
  const isDone = (g) => !!state.doneGuides[g.id] || startedFrom(g.id)?.status === 'done';
  const guides = [...c.guides].sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || value(b) - value(a));
  const pending = guides.filter((g) => !state.doneGuides[g.id] && !startedFrom(g.id));
  const total = pending.reduce((s, g) => s + value(g), 0);
  const ranges = pending.map((g) => valueRange(g));
  const low = ranges.reduce((s, r) => s + r.low, 0);
  const high = ranges.reduce((s, r) => s + r.high, 0);
  return `<section class="summary-strip">
      <div><span class="eyebrow">Te quedan por hacer</span><b>${pending.length} bonos</b></div>
      <div><span class="eyebrow">Valor estimado</span><b class="brass">${fmt.eur0(total)}</b>${pending.length ? `<span class="muted small">entre ${fmt.eur0(low)} y ${fmt.eur0(high)}</span>` : ''}</div>
      <p class="muted small">Estimación prudente, con cuotas moderadas. Ordenados por lo que valen: empieza por arriba y haz uno cada vez.</p>
    </section>
    <div class="cards">${guides.map(guideCard).join('')}</div>`;
}

function guideCard(g) {
  const kind = kindOf(g.kind);
  const started = startedFrom(g.id);
  const done = !!state.doneGuides[g.id] || started?.status === 'done';
  const steps = kind.steps(g.params || {}, g.bookie);
  const link = { href: g.url || bookieHome(g.bookie), exact: false };
  return `<article class="guide ${done ? 'is-done' : ''}">
    <header class="guide-head">
      <div><b class="guide-bookie">${esc(g.bookie)}</b><span class="muted small">${esc(kind.label)}</span>${g.example ? ' <span class="tag tag-example">Ejemplo</span>' : ''}</div>
      <div class="guide-value"><span class="muted small">Valor estimado</span><b>${fmt.signedEur(value(g))}</b><span class="muted small">${esc(rangeText(g))}</span></div>
    </header>
    <h3>${esc(g.title || kind.title(g.params || {}))}</h3>
    ${g.conditions ? `<details class="steps-preview"><summary>Condiciones${g.reviewed ? ` (revisadas en ${esc(reviewedLabel(g.reviewed))})` : ''}</summary><p class="cond">${esc(g.conditions)}</p></details>` : ''}
    <details class="steps-preview"><summary>Paso a paso (${steps.length} pasos)</summary><ol>${steps.map((s) => `<li>${esc(s.text)}</li>`).join('')}</ol></details>
    <footer class="guide-foot">
      ${done ? '<span class="pill pill-done">Hecho</span>' : started
        ? `<button class="btn btn-primary btn-sm" data-act="bonos-goto" data-id="${started.id}">${icon('arrow', 15)} Continuar en Mis bonos</button>`
        : `<button class="btn btn-primary btn-sm" data-act="guide-start" data-id="${esc(g.id)}" data-source="guides">${icon('arrow', 15)} Empezar este bono</button>`}
      ${g.howto ? `<a class="btn btn-sm" href="#guia" data-act="guide-open" data-lesson="casa-${esc(g.id)}">${icon('book', 15)} Cómo se hace</a>` : ''}
      ${extLink(link, `Abrir ${g.bookie}`, g.bookie)}
      <button class="btn btn-ghost btn-sm" data-act="guide-done" data-id="${esc(g.id)}">${done ? 'Deshacer' : 'Ya lo hice'}</button>
    </footer>
  </article>`;
}

/* ------------------------------------------------------------ recurrentes */

function recurringTab(c) {
  if (!c.access.promos) {
    return `${lockCard('promos.recurring', { text: `${c.promos.length} promociones que se repiten cada semana, con su calendario y el valor de cada una. Para seguir ganando cuando acabes los bonos de bienvenida.` })}
    <div class="teasers">${c.promos.map((p) => `<div class="teaser">${icon('lock', 14)}<b>${esc(p.bookie)}</b><span>${esc(kindOf(p.kind).label)}</span></div>`).join('')}</div>`;
  }
  const today = new Date().getDay();
  const active = c.promos.filter((p) => !p.validUntil || p.validUntil >= isoDay());
  const isToday = (p) => !p.days?.length || p.days.includes(today);
  const order = [1, 2, 3, 4, 5, 6].map((i) => (today + i) % 7);
  const later = order.map((d) => [d, active.filter((p) => p.days?.length && p.days.includes(d) && !p.days.includes(today))]).filter(([, list]) => list.length);
  const todayList = active.filter(isToday);
  return `<section class="summary-strip">
      <div><span class="eyebrow">Hoy, ${DAYS[today]}</span><b>${todayList.length} promociones</b></div>
      <div><span class="eyebrow">Valor estimado hoy</span><b class="brass">${fmt.eur(todayList.reduce((s, p) => s + value(p), 0))}</b></div>
      <p class="muted small">Se revisan cada semana. Añade las que vayas a hacer a Mis bonos para seguir sus pasos.</p>
    </section>
    <h2 class="section-title">${icon('calendar', 18)} Hoy</h2>
    <div class="cards">${todayList.length ? todayList.map(promoCard).join('') : '<p class="muted">Hoy no hay promociones apuntadas.</p>'}</div>
    ${later.map(([d, list]) => `<h2 class="section-title">${icon('calendar', 18)} ${DAYS[d][0].toUpperCase()}${DAYS[d].slice(1)}</h2><div class="cards">${list.map(promoCard).join('')}</div>`).join('')}`;
}

function promoCard(p) {
  const kind = kindOf(p.kind);
  const started = startedFrom(p.id);
  return `<article class="guide">
    <header class="guide-head">
      <div><b class="guide-bookie">${esc(p.bookie)}</b><span class="muted small">${esc(kind.label)} · ${esc(p.schedule || 'Siempre')}</span>${p.example ? ' <span class="tag tag-example">Ejemplo</span>' : ''}</div>
      <div class="guide-value"><span class="muted small">Valor estimado</span><b>${fmt.signedEur(value(p))}</b></div>
    </header>
    <h3>${esc(p.title || kind.title(p.params || {}))}</h3>
    ${p.conditions ? `<p class="cond">${esc(p.conditions)}</p>` : ''}
    ${p.validUntil ? `<p class="muted small">${icon('clock', 13)} Hasta el ${esc(fmt.day(Date.parse(`${p.validUntil}T12:00:00`)))}</p>` : ''}
    <footer class="guide-foot">
      ${started
        ? `<button class="btn btn-primary btn-sm" data-act="bonos-goto" data-id="${started.id}">${icon('arrow', 15)} Continuar en Mis bonos</button>`
        : `<button class="btn btn-primary btn-sm" data-act="guide-start" data-id="${esc(p.id)}" data-source="promos">${icon('plus', 15)} Hacer esta promoción</button>`}
      ${extLink({ href: p.url || bookieHome(p.bookie), exact: false }, `Abrir ${p.bookie}`, p.bookie)}
    </footer>
  </article>`;
}

/* ------------------------------------------------------------ mis bonos */

function mineTab() {
  const ui = state.ui;
  const all = state.offers;
  const open = all.filter((o) => o.status === 'todo' || o.status === 'active');
  const pending = open.reduce((a, o) => a + value(o), 0);
  const earned = all.filter((o) => o.status === 'done').reduce((a, o) => a + nz(o.profit), 0);
  const filters = [['open', 'Abiertos'], ['done', 'Completados'], ['skip', 'Descartados'], ['all', 'Todos']];
  const list = all.filter((o) => ui.offerFilter === 'all' || (ui.offerFilter === 'open' ? (o.status === 'todo' || o.status === 'active') : o.status === ui.offerFilter))
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || value(b) - value(a));
  return `${exampleBanner()}
  <section class="kpis">
    ${kpi('Por sacar', fmt.eur(pending), 'valor estimado de lo abierto', 'kpi-brass')}
    ${kpi('En curso', String(all.filter((o) => o.status === 'active').length))}
    ${kpi('Completados', String(all.filter((o) => o.status === 'done').length))}
    ${kpi('Ganado con bonos', fmt.eur(earned), '', earned >= 0 ? 'kpi-pos' : 'kpi-neg')}
  </section>
  <div class="toolbar">${filters.map(([k, t]) => `<button class="chip ${ui.offerFilter === k ? 'is-on' : ''}" data-set="ui.offerFilter" data-v="${k}">${t}</button>`).join('')}</div>
  <div class="offers">${list.length ? list.map(offerCard).join('') : `<div class="empty panel"><p>No tienes bonos aquí.</p><p class="muted small">Empieza uno desde la pestaña Bienvenida o añádelo a mano.</p><button class="btn btn-sm btn-primary" data-act="bonos-tab" data-tab="bienvenida">Ver bonos de bienvenida</button></div>`}</div>`;
}

function offerCard(o) {
  const kind = kindOf(o.kind);
  const p = o.params || {};
  const steps = offerSteps(o);
  const done = new Set(o.done || []);
  const val = value(o);
  const days = o.deadline ? Math.ceil((Date.parse(`${o.deadline}T23:59:59`) - Date.now()) / DAY) : null;
  const progress = Math.round((done.size / steps.length) * 100);
  const isOpen = o.status === 'todo' || o.status === 'active';
  const nextIdx = steps.findIndex((_, i) => !done.has(i));
  const next = steps[nextIdx];
  const inFlow = state.flow?.offerId === o.id;
  return `<article class="offer offer-${o.status} ${inFlow ? 'is-flow' : ''}" id="offer-${o.id}">
    <header class="offer-head">
      <div>
        <div class="offer-meta"><b class="offer-bookie">${esc(o.bookie)}</b><span class="pill pill-${o.status}">${STATUS[o.status]}</span>${o.example ? '<span class="tag tag-example">Ejemplo</span>' : ''}${days != null && isOpen ? `<span class="deadline ${days <= 3 ? 'is-soon' : ''}">${icon('clock', 14)} ${days < 0 ? 'Caducado' : days === 0 ? 'Último día' : `Quedan ${days} días`}</span>` : ''}</div>
        <h3>${esc(offerTitle(o))}</h3>
        <span class="muted small">${esc(kind.label)}</span>
      </div>
      <div class="offer-value">${o.status === 'done' ? `<span class="muted small">Ganado</span>${money(nz(o.profit))}` : `<span class="muted small">Valor estimado</span><b>${fmt.signedEur(val)}</b>`}</div>
    </header>
    ${isOpen ? `<div class="progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progreso del bono"><i style="width:${progress}%"></i></div>
    ${next ? `<div class="next-step"><span class="eyebrow">Siguiente paso · ${nextIdx + 1} de ${steps.length}</span><p>${esc(next.text)}</p><div class="actions">${stepButton(o, nextIdx, next, 'btn btn-primary btn-sm')}<button class="btn btn-sm" data-act="step-done" data-offer="${o.id}" data-step="${nextIdx}">${icon('check', 14)} Hecho</button></div></div>` : '<div class="next-step"><p>Has hecho todos los pasos. Anota lo que has ganado para completarlo.</p></div>'}
    <details class="steps-preview"><summary>Todos los pasos</summary><ol class="offer-steps">${steps.map((s, i) => `<li class="${done.has(i) ? 'is-done' : ''}">
      <label class="check"><input type="checkbox" data-act-change="step-toggle" data-offer="${o.id}" data-step="${i}" ${done.has(i) ? 'checked' : ''}><span>${esc(s.text)}</span></label>
      ${stepButton(o, i, s, 'btn btn-ghost btn-xs')}
    </li>`).join('')}</ol></details>` : ''}
    <footer class="offer-foot">
      ${o.completing ? `<label class="field inline" for="f-complete-${o.id}"><span class="field-label">Beneficio real</span><span class="field-input"><input id="f-complete-${o.id}" data-complete="${o.id}" inputmode="decimal" value="${esc(fmt.n2(val))}"><span class="unit">€</span></span></label><button class="btn btn-primary btn-sm" data-act="offer-complete-save" data-offer="${o.id}">${icon('check', 16)} Guardar y anotar</button><button class="btn btn-ghost btn-sm" data-act="offer-complete-cancel" data-offer="${o.id}">Cancelar</button>` : `
      ${isOpen ? `<button class="btn btn-sm ${next ? '' : 'btn-primary'}" data-act="offer-complete" data-offer="${o.id}">${icon('check', 16)} Completar</button><button class="btn btn-ghost btn-sm" data-act="offer-status" data-offer="${o.id}" data-v="skip">Descartar</button>` : `<button class="btn btn-ghost btn-sm" data-act="offer-status" data-offer="${o.id}" data-v="todo">Reabrir</button>`}
      ${extLink({ href: o.url || bookieHome(o.bookie), exact: false }, o.bookie, o.bookie)}
      <button class="btn btn-ghost btn-sm btn-danger ${o.confirmDelete ? 'is-confirm' : ''}" data-act="offer-delete" data-offer="${o.id}">${icon('trash', 16)} ${o.confirmDelete ? '¿Seguro? Pulsa otra vez' : 'Eliminar'}</button>`}
    </footer>
  </article>`;
}

function addOfferForm() {
  if (!state.ui.newOffer) state.ui.newOffer = { bookie: 'Bet365', kind: 'bet_get', params: {}, deadline: '' };
  const no = state.ui.newOffer;
  const kind = kindOf(no.kind);
  kind.fields.forEach((f) => { if (no.params[f.key] == null) no.params[f.key] = f.def; });
  return `<section class="panel add-offer">
    <div class="panel-head"><h2>Nuevo bono</h2><button class="btn btn-ghost btn-icon" data-act="toggle-add-offer" aria-label="Cerrar">${icon('x', 16)}</button></div>
    <div class="form-grid">
      <label class="field" for="f-new-bookie"><span class="field-label">Casa</span><span class="field-input"><input id="f-new-bookie" data-k="ui.newOffer.bookie" list="bookie-list" value="${esc(no.bookie)}" autocomplete="off"></span></label>
      ${select('ui.newOffer.kind', 'Tipo', Object.entries(OFFER_KINDS).map(([k, v]) => [k, v.label]), { full: true })}
      ${kind.fields.map((f) => (f.type === 'select' ? select(`ui.newOffer.params.${f.key}`, f.label, f.options) : field(`ui.newOffer.params.${f.key}`, f.label, { unit: f.unit }))).join('')}
      ${field('ui.newOffer.deadline', 'Fecha límite (opcional)', { type: 'date' })}
    </div>
    ${kind.details.length ? `<details class="steps-preview"><summary>Más detalles (código, caducidad, freebets troceadas…)</summary><div class="form-grid">${kind.details.map((k) => DETAIL_FIELDS[k]).map((f) => field(`ui.newOffer.params.${f.key}`, f.label, { unit: f.unit, mode: f.type === 'text' ? 'text' : 'decimal' })).join('')}</div></details>` : ''}
    <p class="field-hint">${esc(kind.hint)}</p>
    <div class="add-offer-foot"><span>Valor estimado <b id="new-offer-value">${fmt.signedEur(value({ kind: no.kind, params: no.params }))}</b></span><button class="btn btn-primary" data-act="save-offer">${icon('check', 16)} Guardar</button></div>
  </section>`;
}

function refreshBonos() {
  const el = document.getElementById('new-offer-value');
  if (el && state.ui.newOffer) el.textContent = fmt.signedEur(value(state.ui.newOffer));
}

route('bonos', { render: renderBonos, refresh: refreshBonos, nav: 'bonos' });

/* ------------------------------------------------------------ acciones */

const findOffer = (id) => state.offers.find((x) => x.id === id);

function startFromSource(item, source) {
  const { offer, created } = offerFromSource(item, source);
  state.ui.bonosTab = 'mis';
  state.ui.offerFilter = 'open';
  const steps = offerSteps(offer);
  const next = Math.max(0, steps.findIndex((_, i) => !(offer.done || []).includes(i)));
  state.flow = { offerId: offer.id, step: next, total: steps.length, bookie: offer.bookie, text: steps[next].text };
  save();
  toast(created ? `${item.bookie}: bono añadido a Mis bonos. Sigue el primer paso.` : `${item.bookie}: sigues donde lo dejaste.`, 'good');
  render();
  setTimeout(() => document.getElementById(`offer-${offer.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
}

registerActions({
  'bonos-tab': (b) => { state.ui.bonosTab = b.dataset.tab; save(); render(); },
  'bonos-goto': (b) => {
    state.ui.bonosTab = 'mis';
    state.ui.offerFilter = 'all';
    save();
    render();
    setTimeout(() => document.getElementById(`offer-${b.dataset.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  },
  'guide-start': (b) => {
    const list = content()[b.dataset.source] || [];
    const item = list.find((x) => x.id === b.dataset.id);
    if (item && !item.locked) startFromSource(item, b.dataset.source);
  },
  'guide-done': (b) => {
    if (state.doneGuides[b.dataset.id]) delete state.doneGuides[b.dataset.id];
    else state.doneGuides[b.dataset.id] = true;
    save();
    render();
  },
  'toggle-add-offer': () => { state.ui.addOffer = !state.ui.addOffer; if (!state.ui.addOffer) state.ui.newOffer = null; render(); },
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
    Object.assign(state.ui, { addOffer: false, newOffer: null, offerFilter: 'open', bonosTab: 'mis' });
    save();
    toast('Bono guardado', 'good');
    render();
  },
  'offer-status': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    o.status = b.dataset.v;
    if (state.flow?.offerId === o.id && o.status !== 'active') state.flow = null;
    save();
    render();
  },
  'offer-complete': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    o.completing = true;
    render();
    document.getElementById(`f-complete-${o.id}`)?.focus();
  },
  'offer-complete-cancel': (b) => { const o = findOffer(b.dataset.offer); if (o) { delete o.completing; render(); } },
  'offer-complete-save': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    const profit = n(document.getElementById(`f-complete-${o.id}`)?.value);
    if (!Number.isFinite(profit)) { toast('Escribe el beneficio real.', 'warn'); return; }
    delete o.completing;
    o.status = 'done';
    o.profit = profit;
    o.done = offerSteps(o).map((_, i) => i);
    if (state.flow?.offerId === o.id) state.flow = null;
    state.bets.push({ id: uid(), date: isoDay(), bookie: o.bookie, kind: o.source === 'promos' ? 'reload' : o.kind === 'boost' ? 'boost' : 'welcome', desc: offerTitle(o), profit });
    if (o.from && o.source === 'guides') state.doneGuides[o.from] = true;
    save();
    toast(`Bono completado: ${fmt.signedEur(profit)} anotados en Beneficios`, 'good');
    render();
  },
  'offer-delete': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    if (!o.confirmDelete) {
      o.confirmDelete = true;
      render();
      setTimeout(() => { if (o.confirmDelete) { delete o.confirmDelete; render(); } }, 4000);
      return;
    }
    state.offers = state.offers.filter((x) => x.id !== o.id);
    if (state.flow?.offerId === o.id) state.flow = null;
    save();
    render();
  },
  'step-action': (b) => {
    const o = findOffer(b.dataset.offer);
    if (o) runStep(o, Number(b.dataset.step));
  },
  'step-site': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    const steps = offerSteps(o);
    const idx = Number(b.dataset.step);
    state.flow = { offerId: o.id, step: idx, total: steps.length, bookie: o.bookie, text: steps[idx].text };
    if (o.status === 'todo') o.status = 'active';
    save();
    // Se vuelve a pintar después de que el enlace haya abierto la web.
    setTimeout(render, 50);
  },
  'step-done': (b) => {
    const o = findOffer(b.dataset.offer);
    if (!o) return;
    state.flow = { offerId: o.id, step: Number(b.dataset.step), total: offerSteps(o).length, bookie: o.bookie, text: '' };
    markFlowStep(true);
    render();
  },
  'flow-done': () => {
    const r = markFlowStep(true);
    if (!r) return;
    toast(r.next >= 0 ? 'Paso hecho. Te enseñamos el siguiente.' : 'Todos los pasos hechos: anota lo que has ganado para completarlo.', 'good');
    if (r.next < 0) { state.ui.bonosTab = 'mis'; save(); go('bonos'); return; }
    render();
  },
  'flow-back': () => {
    const id = state.flow?.offerId;
    state.ui.bonosTab = 'mis';
    save();
    go('bonos');
    setTimeout(() => document.getElementById(`offer-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  },
  'flow-close': () => { state.flow = null; save(); render(); },
});

export function onStepToggle(el) {
  const o = findOffer(el.dataset.offer);
  if (!o) return;
  const i = Number(el.dataset.step);
  const set2 = new Set(o.done || []);
  if (el.checked) set2.add(i); else set2.delete(i);
  o.done = [...set2].sort((a, b) => a - b);
  if (o.status === 'todo' && set2.size) o.status = 'active';
  save();
  render();
}

export { can, plans };
