// Planes y suscripción: pago mensual o anual, cambio de plan y prueba gratis.

import {
  state, session, save, go, render, route, registerActions, pageHead, plan, plans, paintAccount, api, refreshSession, content,
} from '../core.js';
import { esc, icon, toast } from '../util.js';
import {
  PLAN_ORDER, planRank, FREE_ODDS_ROWS, ACCESS_STATUSES, yearSaving,
} from '../plans.js';

const euros = (x) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(x || 0);

/** Forma de pago elegida en la página (mensual por defecto). */
export const billing = () => (state.ui.billing === 'year' ? 'year' : 'month');

/** Si un plan admite pago anual. */
export function yearlyOk(id, p = plans()) {
  if (!(Number(p[id]?.priceYear) > 0)) return false;
  if (id === 'metodo' && session.backend && session.config && session.config.metodoRecurring === false) return false;
  return true;
}

/** Hay una suscripción de pago en marcha (la que se cambia en vez de crear otra). */
export const activeSub = () => !!session.user && ACCESS_STATUSES.has(session.user.planStatus) && (session.user.subscribedPlan || 'free') !== 'free';

function seatsInfo() {
  if (session.backend && session.config?.seats) return session.config.seats;
  const total = Number(plans().metodo.seats) || 0;
  return { total, taken: 0, left: total || null };
}

/** Selector mensual / anual. */
export function billingToggle(p = plans()) {
  if (!PLAN_ORDER.some((id) => yearlyOk(id, p))) return '';
  const best = Math.max(0, ...PLAN_ORDER.filter((id) => yearlyOk(id, p)).map((id) => yearSaving(p[id])));
  const b = billing();
  return `<div class="billing-toggle" role="group" aria-label="Forma de pago">
    <button class="${b === 'month' ? 'is-on' : ''}" data-set="ui.billing" data-v="month" aria-pressed="${b === 'month'}">Mensual</button>
    <button class="${b === 'year' ? 'is-on' : ''}" data-set="ui.billing" data-v="year" aria-pressed="${b === 'year'}">Anual${best ? `<span class="save-tag">${best} meses gratis</span>` : ''}</button>
  </div>`;
}

function cta(id, p, interval) {
  const current = plan();
  const u = session.user;
  const visitor = session.backend && !u;
  if (visitor && id === 'free') return '<a class="btn btn-block" href="#cuenta" data-act="landing-register">Crear cuenta gratis</a>';
  if (!session.backend) {
    if (id === current) return '<span class="btn btn-block is-current" aria-disabled="true">Lo estás viendo</span>';
    return `<button class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" data-act="preview-plan" data-plan="${id}">${icon('eye', 15)} Ver la web con este plan</button>`;
  }
  if (id === 'free') {
    if (visitor || current === 'free') return '<span class="btn btn-block is-current" aria-disabled="true">Tu plan actual</span>';
    return '<a class="btn btn-block btn-ghost" href="#cuenta">Cancelar desde tu cuenta</a>';
  }
  const iv = yearlyOk(id, plans()) ? interval : 'month';
  const sameInterval = (u?.planInterval || 'month') === iv;
  if (u && id === current && activeSub()) {
    if (u.cancelAtPeriodEnd) return '<button class="btn btn-block btn-primary" data-act="billing-resume">Reactivar mi suscripción</button>';
    if (sameInterval) return '<span class="btn btn-block is-current" aria-disabled="true">Tu plan actual</span>';
  } else if (u && id === current) {
    return '<span class="btn btn-block is-current" aria-disabled="true">Tu plan actual</span>';
  }
  if (id === 'metodo' && !(u && id === current)) {
    return `<a class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" href="#metodo">Solicitar plaza ${icon('arrow', 15)}</a>`;
  }
  const key = `${id}:${iv}`;
  if (activeSub()) {
    if (state.ui.confirmPlan === key) {
      return `<div class="confirm-change">
        <p class="small">Cambias tu suscripción actual${id === current ? ` a pago ${iv === 'year' ? 'anual' : 'mensual'}` : ` al plan ${esc(p.name)}`}. Stripe ajusta lo que pagas de forma proporcional al tiempo que queda.</p>
        <button class="btn btn-block btn-primary" data-act="subscribe" data-plan="${id}" data-interval="${iv}" data-confirm="1">Confirmar el cambio</button>
        <button class="btn btn-block btn-ghost" data-act="plan-confirm-cancel">No, dejarlo como está</button>
      </div>`;
    }
    const label = id === current ? `Pasar a pago ${iv === 'year' ? 'anual' : 'mensual'}` : planRank(id) > planRank(current) ? 'Subir a este plan' : 'Cambiar a este plan';
    return `<button class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" data-act="subscribe" data-plan="${id}" data-interval="${iv}">${label}</button>`;
  }
  const label = p.trialDays && !u?.trialUsed ? `Probar ${p.trialDays} días gratis` : 'Suscribirme';
  return `<button class="btn btn-block ${p.highlight ? 'btn-primary' : ''}" data-act="subscribe" data-plan="${id}" data-interval="${iv}">${label}</button>`;
}

export function plansGrid(p = plans()) {
  const seats = seatsInfo();
  const interval = billing();
  return `${billingToggle(p)}
  <section class="plans" aria-label="Planes">
    ${PLAN_ORDER.map((id) => {
      const x = p[id];
      const yearly = interval === 'year' && yearlyOk(id, p);
      const amount = yearly ? Number(x.priceYear) : Number(x.price) || 0;
      const priceText = x.price > 0
        ? `<span class="price">${euros(amount)} €</span><span class="per">${yearly ? '/año' : x.interval === 'once' ? 'pago único' : '/mes'}</span>`
        : '<span class="price">0 €</span><span class="per">siempre</span>';
      const note = [];
      if (yearly) note.push(`Equivale a ${euros(Math.round((x.priceYear / 12) * 100) / 100)} €/mes${yearSaving(x) ? ` · ${yearSaving(x)} meses gratis` : ''}`);
      else if (interval === 'year' && x.price > 0) note.push('Solo pago mensual');
      if (x.trialDays) note.push(`${x.trialDays} días de prueba gratis`);
      const mine = plan() === id && !(session.backend && !session.user);
      return `<article class="plan ${x.highlight ? 'is-highlight' : ''} ${id === 'metodo' ? 'is-premium' : ''} ${mine ? 'is-mine' : ''}">
        ${x.highlight ? '<span class="plan-flag">El más elegido</span>' : ''}
        ${id === 'metodo' ? `<span class="plan-flag plan-flag-premium">${seats.total ? (seats.left === 0 ? 'Sin plazas ahora mismo' : `Quedan ${seats.left} de ${seats.total} plazas`) : 'Plazas limitadas'}</span>` : ''}
        <h3>${esc(x.name)}</h3>
        <p class="plan-tag">${esc(x.tagline || '')}</p>
        <div class="plan-price">${priceText}</div>
        <p class="muted small plan-note">${note.length ? esc(note.join(' · ')) : '&nbsp;'}</p>
        <ul class="plan-features">${(x.features || []).map((f) => `<li>${icon('check', 14)}<span>${esc(f)}</span></li>`).join('')}</ul>
        <div class="plan-cta">${cta(id, x, interval)}</div>
      </article>`;
    }).join('')}
  </section>`;
}

function compareRows() {
  const names = content().guides.map((g) => g.bookie);
  const casas = names.length ? names.join(', ') : 'cada casa';
  return [
    ['Calculadoras favor-contra, combinadas y rollover', ['✓', '✓', '✓', '✓']],
    ['Guía paso a paso con ejemplos', ['✓', '✓', '✓', '✓']],
    ['Seguimiento de bonos y beneficios', ['✓', '✓', '✓', '✓']],
    ['Oddsmatcher: calificantes, freebets y reembolsos', [`${FREE_ODDS_ROWS} mejores`, 'Completo', 'Completo', 'Completo']],
    ['Enlaces directos al partido (casa y Betfair)', ['✓', '✓', '✓', '✓']],
    [`Cómo se hace el bono de ${casas}`, ['—', '✓', '✓', '✓']],
    ['Avisos de cuotas con buen rating', ['—', '✓', '✓', '✓']],
    ['Promociones recurrentes y calendario', ['—', '—', '✓', '✓']],
    ['Módulo Hacienda y hoja de control fiscal', ['—', '—', '—', '✓']],
    ['Contrato y plaza reservada', ['—', '—', '—', '✓']],
  ];
}

function renderPlanes() {
  const p = plans();
  const u = session.user;
  return `${pageHead('Planes', 'Empieza gratis y sube de plan cuando quieras. Sin permanencia: cancelas desde tu cuenta con un clic.')}
  ${!session.backend ? `<div class="banner banner-demo">${icon('eye', 16)}<span>Vista previa: elige un plan para ver la web como lo vería un cliente. Los pagos funcionan cuando publicas la web con el servidor y Stripe.</span></div>` : ''}
  ${u?.cancelAtPeriodEnd && activeSub() ? `<div class="banner">${icon('info', 16)}<span>Tu suscripción se cancelará al final del periodo pagado. Puedes reactivarla sin pagar nada más hasta entonces.</span><button class="btn btn-sm" data-act="billing-resume">Reactivar</button></div>` : ''}
  ${plansGrid(p)}
  <section class="panel">
    <div class="panel-head"><h2>Qué incluye cada plan</h2></div>
    <div class="table-wrap"><table class="compare-table">
      <thead><tr><th></th>${PLAN_ORDER.map((id) => `<th>${esc(p[id].name)}</th>`).join('')}</tr></thead>
      <tbody>${compareRows().map(([label, vals]) => `<tr><th scope="row">${esc(label)}</th>${vals.map((v) => `<td class="${v === '—' ? 'no' : 'yes'}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="panel faq">
    <h2>Sobre la suscripción</h2>
    <details><summary>¿Cómo se paga?</summary><p>Con tarjeta a través de Stripe, al mes o al año. No guardamos los datos de tu tarjeta. Si tienes un código de descuento, lo escribes en la página de pago.</p></details>
    <details><summary>¿Mensual o anual?</summary><p>El pago anual sale más barato${yearSaving(p.recurrentes) ? ` (te regala ${yearSaving(p.recurrentes)} meses)` : ''}. Puedes pasar de uno a otro desde esta página: Stripe descuenta lo que ya has pagado.</p></details>
    <details><summary>¿Puedo cambiar de plan?</summary><p>Sí. Subes o bajas de plan desde aquí y se cambia tu misma suscripción: nunca pagas dos a la vez.</p></details>
    <details><summary>¿Puedo cancelar?</summary><p>Sí, cuando quieras desde Cuenta → Cancelar la suscripción. Mantienes el acceso hasta el final del periodo pagado y puedes reactivarla antes de que termine.</p></details>
    <details><summary>¿Hay prueba gratis?</summary><p>Los planes ${esc(p.bienvenida.name)} y ${esc(p.recurrentes.name)} tienen ${p.bienvenida.trialDays || 0} días de prueba la primera vez. Si cancelas antes de que acabe, no se cobra nada.</p></details>
    <details><summary>¿Por qué el Método tiene plazas y contrato?</summary><p>Es un programa más completo, con el módulo de Hacienda y seguimiento, y se ofrece a un número limitado de personas. El contrato deja por escrito qué incluye, que es formativo y no asesoramiento personalizado, y tus derechos.</p></details>
  </section>`;
}

route('planes', { render: renderPlanes, nav: 'planes' });

/** Va al pago de Stripe o, si ya hay suscripción, la cambia y recarga la sesión. */
export async function startCheckout(id, interval) {
  const r = await api.checkout(id, interval);
  if (r?.url) { window.location.href = r.url; return 'redirect'; }
  state.ui.confirmPlan = null;
  save();
  await refreshSession();
  toast(`Listo: ahora tienes el plan ${plans()[id]?.name || id}${interval === 'year' ? ' con pago anual' : ''}.`, 'good');
  return 'changed';
}

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
    const interval = b.dataset.interval === 'year' ? 'year' : 'month';
    if (!session.user) {
      state.ui.afterLogin = { plan: id, interval };
      state.ui.accountTab = 'register';
      save();
      go('cuenta');
      toast('Crea tu cuenta o entra para suscribirte.');
      return;
    }
    if (activeSub() && b.dataset.confirm !== '1') {
      state.ui.confirmPlan = `${id}:${interval}`;
      save();
      render();
      return;
    }
    b.disabled = true;
    try {
      if (await startCheckout(id, interval) === 'changed') render();
    } catch (e) {
      toast(e.message, 'warn');
      b.disabled = false;
    }
  },
  'plan-confirm-cancel': () => { state.ui.confirmPlan = null; save(); render(); },
});
