// Portada: panel personal (con siguiente paso y mejores cuotas) y página de
// presentación para quien aún no tiene cuenta.

import {
  state, session, odds, C, O, nz, save, go, route, registerActions, money, kpi, pageHead, exampleBanner, flowBar,
  monthlyBars, monthKey, ratingBar, oddChip, statusHTML, commissionsNum, plan, plans, planName, priceLabel, brand,
  assumptions, offerSteps, content, can, stepButton, DAY,
} from '../core.js';
import { fmt, esc, icon } from '../util.js';
import { rememberRows } from './oddsmatcher.js';
import { guideProgress } from './guia.js';
import { plansGrid } from './planes.js';

function homeTop() {
  const rows = O.findMatches(odds.events, {
    mode: 'normal', stake: nz(state.om.stake, 10), commissions: commissionsNum(), defaultCommission: nz(state.settings.defaultCommission), minOdds: 1.5, maxOdds: 10, to: Date.now() + 7 * DAY,
  }).sort((a, b) => b.rating - a.rating).slice(0, 6);
  rememberRows(rows);
  if (!rows.length) return '<p class="muted">No hay cuotas cargadas todavía.</p>';
  return `<div class="top-list">${rows.map((r) => `
    <button class="top-item" data-act="om-calc" data-id="${esc(r.id)}" data-mode="normal">
      <span class="top-when">${esc(fmt.date(r.start))} · ${esc(fmt.time(r.start))}</span>
      <span class="top-event">${esc(r.event.home)} – ${esc(r.event.away)}</span>
      <span class="top-sel"><span class="code">${esc(r.label.code)}</span>${esc(r.label.text)} <span class="muted small">${esc(r.marketLabel)}</span></span>
      <span class="top-odds">${esc(r.bookTitle)} ${oddChip(r.back, 'back')} ${oddChip(r.lay, 'lay')}</span>
      ${ratingBar(r.rating, 'normal')}
    </button>`).join('')}</div>`;
}

function onboarding() {
  const g = guideProgress();
  const steps = [
    { done: g.done >= 4, text: 'Lee las 4 primeras lecciones de la guía', href: '#guia', label: g.done ? `Seguir (${g.done}/${g.total})` : 'Empezar' },
    { done: state.settings.myBookies.length > 0, text: 'Marca las casas en las que ya tienes cuenta', href: '#ajustes', label: 'Mis casas' },
    { done: state.offers.some((o) => !o.example && o.status !== 'skip'), text: 'Empieza tu primer bono de bienvenida', act: 'home-bonos', label: 'Elegir bono' },
    { done: state.bets.some((b) => !b.example), text: 'Anota tu primera operación en Beneficios', href: '#beneficios', label: 'Beneficios' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return '';
  return `<section class="panel onboarding">
    <div class="panel-head"><h2>${icon('star', 16)} Primeros pasos</h2><span class="muted small">${doneCount} de ${steps.length}</span></div>
    <ol class="onboard-list">${steps.map((s) => `<li class="${s.done ? 'is-done' : ''}"><span class="onboard-dot">${s.done ? icon('check', 13) : ''}</span><span>${esc(s.text)}</span>${s.done ? '' : s.act ? `<button class="btn btn-sm" data-act="${s.act}">${esc(s.label)}</button>` : `<a class="btn btn-sm" href="${s.href}">${esc(s.label)}</a>`}</li>`).join('')}</ol>
  </section>`;
}

function nextSteps() {
  const active = state.offers.filter((o) => o.status === 'active' || o.status === 'todo')
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1));
  if (!active.length) {
    return `<div class="empty"><p>No tienes bonos abiertos.</p><button class="btn btn-sm btn-primary" data-act="home-bonos">${icon('plus', 15)} Elegir un bono</button></div>`;
  }
  return `<ul class="steps-mini">${active.slice(0, 4).map((o) => {
    const steps = offerSteps(o);
    const idx = steps.findIndex((_, i) => !(o.done || []).includes(i));
    const step = steps[idx] || steps[steps.length - 1];
    return `<li>
      <div class="sm-top"><b>${esc(o.bookie)}</b><span class="pill pill-${o.status}">${o.status === 'active' ? 'En curso' : 'Por hacer'}</span>${o.example ? '<span class="tag tag-example">Ejemplo</span>' : ''}</div>
      <p>${idx >= 0 ? `<span class="muted">Paso ${idx + 1} de ${steps.length}.</span> ` : ''}${esc(step.text)}</p>
      ${idx >= 0 ? stepButton(o, idx, step, 'btn btn-ghost btn-sm') : ''}
    </li>`;
  }).join('')}</ul>`;
}

function renderHome() {
  if (session.backend && session.ready && !session.user) return renderLanding();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const total = state.bets.reduce((a, b) => a + nz(b.profit), 0);
  const month = state.bets.filter((b) => monthKey(b.date) === thisMonth).reduce((a, b) => a + nz(b.profit), 0);
  const open = state.offers.filter((o) => o.status === 'todo' || o.status === 'active');
  const pendingMine = open.reduce((a, o) => a + C.offerValue(o, assumptions()), 0);
  const c = content();
  const pendingGuides = c.access.guides ? c.guides.filter((g) => !state.doneGuides[g.id] && !state.offers.some((o) => o.from === g.id)).reduce((s, g) => s + C.offerValue(g, assumptions()), 0) : 0;
  const name = session.user?.name ? `, ${esc(session.user.name.split(' ')[0])}` : '';
  return `${flowBar()}${pageHead(`Hola${name}`, 'Lo que llevas ganado, tu siguiente paso y las mejores cuotas de ahora mismo.', `<span class="plan-chip">${icon('shield', 14)} Plan ${esc(planName(plan()))}</span>`)}
  ${exampleBanner()}
  ${onboarding()}
  <section class="kpis">
    ${kpi('Beneficio total', fmt.eur(total), `${state.bets.length} operaciones`, total >= 0 ? 'kpi-pos' : 'kpi-neg')}
    ${kpi('Este mes', fmt.eur(month), fmt.month(now))}
    ${kpi('Por sacar en tus bonos', fmt.eur(pendingMine), `${open.length} ${open.length === 1 ? 'bono abierto' : 'bonos abiertos'}`, 'kpi-brass')}
    ${kpi('Bonos de bienvenida pendientes', c.access.guides ? fmt.eur(pendingGuides) : '—', c.access.guides ? 'valor estimado' : `<a href="#planes">Plan ${esc(plans().bienvenida.name)}</a>`)}
  </section>
  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Siguiente paso</h2><a class="link" href="#bonos">Bonos ${icon('arrow', 14)}</a></div>
      ${nextSteps()}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Beneficio por mes</h2><a class="link" href="#beneficios">Ver todo ${icon('arrow', 14)}</a></div>
      ${monthlyBars(state.bets)}
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

/* ------------------------------------------------------------ presentación */

export function renderLanding() {
  const p = plans();
  const q = C.backLay({ stake: 10, back: 3, lay: 3.1, commission: 2 });
  const fb = C.backLay({ stake: 25, back: 6, lay: 6.2, commission: 2, type: 'snr' });
  return `<section class="hero">
    <div class="hero-text">
      <span class="eyebrow">Matched betting en España</span>
      <h1>Convierte los bonos de las casas de apuestas en dinero, sin depender de acertar.</h1>
      <p>${esc(brand())} encuentra las cuotas, hace los cálculos y te guía bono a bono. Tú solo sigues los pasos.</p>
      <div class="actions"><a class="btn btn-primary btn-lg" href="#cuenta" data-act="landing-register">Crear cuenta gratis</a><a class="btn btn-lg" href="#planes">Ver planes</a></div>
      <p class="muted small">${icon('shield', 14)} Solo mayores de 18 años. Solo casas con licencia en España.</p>
    </div>
    <div class="hero-card" aria-label="Ejemplo de un bono">
      <span class="eyebrow">Un bono de ejemplo</span>
      <ol class="hero-steps">
        <li><span>Apuesta calificante cubierta</span>${money(q.profit)}</li>
        <li><span>Freebet de 25 € cubierta a cuota 6</span>${money(fb.profit)}</li>
        <li class="total"><span>Beneficio del bono</span>${money(q.profit + fb.profit)}</li>
      </ol>
      <p class="muted small">Gane quien gane el partido.</p>
    </div>
  </section>
  <section class="how-grid">
    <div><span class="how-n">1</span><h3>Elige un bono</h3><p>Guía de cada casa ordenada por lo que vale, con sus condiciones y pasos.</p></div>
    <div><span class="how-n">2</span><h3>Encuentra la cuota</h3><p>El oddsmatcher compara miles de cuotas con Betfair y te da el enlace directo al partido.</p></div>
    <div><span class="how-n">3</span><h3>Apuesta lo exacto</h3><p>La calculadora te dice cuánto apostar en contra y lo que ganas pase lo que pase.</p></div>
    <div><span class="how-n">4</span><h3>Anota y repite</h3><p>Tus beneficios quedan registrados, listos para la declaración de la renta.</p></div>
  </section>
  ${plansGrid(p)}
  <section class="panel faq">
    <h2>Preguntas frecuentes</h2>
    <details><summary>¿Es legal?</summary><p>Sí. Usar las promociones de casas con licencia en España y cubrir las apuestas en un exchange es legal. Las ganancias tributan en el IRPF.</p></details>
    <details><summary>¿Cuánto se puede ganar?</summary><p>Depende de cuántos bonos hagas y de su valor. La herramienta te enseña el valor estimado de cada uno antes de empezar. No hay ganancias garantizadas: las casas pueden cambiar o retirar sus promociones.</p></details>
    <details><summary>¿Necesito saber de apuestas?</summary><p>No. La guía empieza desde cero y cada paso tiene un botón que te lleva a la herramienta con los números ya puestos.</p></details>
    <details><summary>¿Puedo cancelar cuando quiera?</summary><p>Sí, desde tu cuenta, sin permanencia. Sigues teniendo acceso hasta el final del periodo pagado.</p></details>
  </section>`;
}

route('inicio', {
  render: renderHome,
  refresh: () => { const el = document.getElementById('home-top'); if (el) el.innerHTML = homeTop(); },
  usesOdds: true,
  nav: 'inicio',
});
route('bienvenida', { render: renderLanding, nav: 'inicio' });

registerActions({
  'home-bonos': () => { state.ui.bonosTab = can('guides.welcome') ? 'bienvenida' : 'mis'; save(); go('bonos'); },
  'landing-register': () => { state.ui.accountTab = 'register'; save(); },
});
