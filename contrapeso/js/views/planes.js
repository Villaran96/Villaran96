// Planes y suscripción.

import {
  state, session, save, go, render, route, registerActions, pageHead, plan, plans, priceLabel, paintAccount, api,
} from '../core.js';
import { esc, icon, toast } from '../util.js';
import {
  PLAN_ORDER, planRank, FREE_ODDS_ROWS, intervalLabel,
} from '../plans.js';

function seatsInfo() {
  if (session.backend && session.config?.seats) return session.config.seats;
  const total = Number(plans().metodo.seats) || 0;
  return { total, taken: 0, left: total || null };
}

function cta(id, p) {
  const current = plan();
  const visitor = session.backend && !session.user;
  if (visitor && id === 'free') return '<a class="btn btn-block" href="#cuenta" data-act="landing-register">Crear cuenta gratis</a>';
  if (id === current && !visitor) return '<span class="btn btn-block is-current" aria-disabled="true">Tu plan actual</span>';
  if (!session.backend) {
    return `<button class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" data-act="preview-plan" data-plan="${id}">${icon('eye', 15)} Ver la web con este plan</button>`;
  }
  if (id === 'free') return planRank(current) > 0 ? '<span class="muted small">Cancela tu plan desde Cuenta para volver al gratuito.</span>' : '';
  if (id === 'metodo') return `<a class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" href="#metodo">Solicitar plaza ${icon('arrow', 15)}</a>`;
  const label = p.trialDays && !session.user?.trialUsed ? `Probar ${p.trialDays} días gratis` : 'Suscribirme';
  return `<button class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" data-act="subscribe" data-plan="${id}">${label}</button>`;
}

export function plansGrid(p = plans()) {
  const seats = seatsInfo();
  return `<section class="plans" aria-label="Planes">
    ${PLAN_ORDER.map((id) => {
      const x = p[id];
      const amount = new Intl.NumberFormat('es-ES', { minimumFractionDigits: x.price % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(x.price || 0);
      const priceText = x.price > 0 ? `<span class="price">${amount} €</span><span class="per">${esc(intervalLabel(x.interval))}</span>` : '<span class="price">0 €</span><span class="per">siempre</span>';
      const mine = plan() === id && !(session.backend && !session.user);
      return `<article class="plan ${x.highlight ? 'is-highlight' : ''} ${id === 'metodo' ? 'is-premium' : ''} ${mine ? 'is-mine' : ''}">
        ${x.highlight ? '<span class="plan-flag">El más elegido</span>' : ''}
        ${id === 'metodo' ? `<span class="plan-flag plan-flag-premium">${seats.total ? `Quedan ${seats.left} de ${seats.total} plazas` : 'Plazas limitadas'}</span>` : ''}
        <h3>${esc(x.name)}</h3>
        <p class="plan-tag">${esc(x.tagline || '')}</p>
        <div class="plan-price">${priceText}</div>
        ${x.trialDays ? `<p class="muted small">${x.trialDays} días de prueba gratis</p>` : '<p class="muted small">&nbsp;</p>'}
        <ul class="plan-features">${(x.features || []).map((f) => `<li>${icon('check', 14)}<span>${esc(f)}</span></li>`).join('')}</ul>
        <div class="plan-cta">${cta(id, x)}</div>
      </article>`;
    }).join('')}
  </section>`;
}

const COMPARE = [
  ['Calculadoras favor-contra, favor-favor, combinadas y rollover', ['✓', '✓', '✓', '✓']],
  ['Guía paso a paso con ejemplos', ['✓', '✓', '✓', '✓']],
  ['Seguimiento de bonos y beneficios', ['✓', '✓', '✓', '✓']],
  ['Oddsmatcher', [`${FREE_ODDS_ROWS} mejores`, 'Completo', 'Completo', 'Completo']],
  ['Enlaces directos al partido (casa y Betfair)', ['✓', '✓', '✓', '✓']],
  ['Buscador favor-favor', ['—', '✓', '✓', '✓']],
  ['Guías de bonos de bienvenida por casa', ['—', '✓', '✓', '✓']],
  ['Avisos de cuotas con buen rating', ['—', '✓', '✓', '✓']],
  ['Promociones recurrentes y calendario', ['—', '—', '✓', '✓']],
  ['Módulo Hacienda y hoja de control fiscal', ['—', '—', '—', '✓']],
  ['Contrato y plaza reservada', ['—', '—', '—', '✓']],
];

function renderPlanes() {
  const p = plans();
  return `${pageHead('Planes', 'Empieza gratis y sube de plan cuando quieras. Sin permanencia: cancelas desde tu cuenta cuando quieras.')}
  ${!session.backend ? `<div class="banner banner-demo">${icon('eye', 16)}<span>Vista previa: elige un plan para ver la web como lo vería un cliente. Los pagos funcionan cuando publicas la web con el servidor y Stripe.</span></div>` : ''}
  ${plansGrid(p)}
  <section class="panel">
    <div class="panel-head"><h2>Qué incluye cada plan</h2></div>
    <div class="table-wrap"><table class="compare-table">
      <thead><tr><th></th>${PLAN_ORDER.map((id) => `<th>${esc(p[id].name)}</th>`).join('')}</tr></thead>
      <tbody>${COMPARE.map(([label, vals]) => `<tr><th scope="row">${esc(label)}</th>${vals.map((v) => `<td class="${v === '—' ? 'no' : 'yes'}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="panel faq">
    <h2>Sobre la suscripción</h2>
    <details><summary>¿Cómo se paga?</summary><p>Con tarjeta a través de Stripe. No guardamos los datos de tu tarjeta.</p></details>
    <details><summary>¿Puedo cancelar?</summary><p>Sí, cuando quieras desde Cuenta → Gestionar pago. Mantienes el acceso hasta el final del periodo pagado.</p></details>
    <details><summary>¿Hay prueba gratis?</summary><p>Los planes Bienvenida y Recurrentes tienen ${p.bienvenida.trialDays || 0} días de prueba la primera vez. Si cancelas antes, no se cobra nada.</p></details>
    <details><summary>¿Por qué el Método tiene plazas y contrato?</summary><p>Es un programa más completo, con el módulo de Hacienda y seguimiento, y se ofrece a un número limitado de personas. El contrato deja por escrito qué incluye, que es formativo y no asesoramiento personalizado, y tus derechos.</p></details>
  </section>`;
}

route('planes', { render: renderPlanes, nav: 'planes' });

registerActions({
  'preview-plan': (b) => {
    state.settings.previewPlan = b.dataset.plan;
    save();
    paintAccount();
    toast(`Ahora ves la web con el plan ${plans()[b.dataset.plan].name}.`, 'good');
    render();
  },
  subscribe: async (b) => {
    const id = b.dataset.plan;
    if (!session.user) {
      state.ui.afterLogin = { plan: id };
      state.ui.accountTab = 'register';
      save();
      go('cuenta');
      toast('Crea tu cuenta o entra para suscribirte.');
      return;
    }
    b.disabled = true;
    try {
      const { url } = await api.checkout(id);
      window.location.href = url;
    } catch (e) {
      toast(e.message, 'warn');
      b.disabled = false;
    }
  },
});
