// Cuenta: entrar, crear cuenta, recuperar la contraseña y gestionar la suscripción.

import {
  state, session, save, go, render, route, registerActions, pageHead, plan, plans, planName, paintAccount, api,
  pullData, loadContent, refreshSession, seg,
} from '../core.js';
import { fmt, esc, icon, toast } from '../util.js';

const STATUS = {
  active: 'Activa', trialing: 'En periodo de prueba', past_due: 'Pago pendiente', canceled: 'Cancelada', unpaid: 'Sin pagar', incomplete: 'Pendiente de pago',
};

function authForms() {
  const tab = state.ui.accountTab || 'login';
  const tabs = [['login', 'Entrar'], ['register', 'Crear cuenta'], ['forgot', 'He olvidado la contraseña']];
  const forms = {
    login: `<form class="auth-form" data-form="login">
      <label class="field"><span class="field-label">Correo electrónico</span><span class="field-input"><input name="email" type="email" autocomplete="email" required></span></label>
      <label class="field"><span class="field-label">Contraseña</span><span class="field-input"><input name="password" type="password" autocomplete="current-password" required></span></label>
      <button class="btn btn-primary btn-block" type="submit">Entrar</button>
    </form>`,
    register: `<form class="auth-form" data-form="register">
      <label class="field"><span class="field-label">Nombre</span><span class="field-input"><input name="name" autocomplete="given-name"></span></label>
      <label class="field"><span class="field-label">Correo electrónico</span><span class="field-input"><input name="email" type="email" autocomplete="email" required></span></label>
      <label class="field"><span class="field-label">Contraseña</span><span class="field-input"><input name="password" type="password" autocomplete="new-password" minlength="8" required></span><span class="field-hint">Al menos 8 caracteres.</span></label>
      <label class="check"><input type="checkbox" name="adult" required><span>Tengo 18 años o más.</span></label>
      <label class="check"><input type="checkbox" name="terms" required><span>Acepto las <a href="#condiciones" target="_blank">condiciones</a> y la <a href="#privacidad" target="_blank">política de privacidad</a>.</span></label>
      <button class="btn btn-primary btn-block" type="submit">Crear cuenta gratis</button>
    </form>`,
    forgot: `<form class="auth-form" data-form="forgot">
      <p class="muted small">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      <label class="field"><span class="field-label">Correo electrónico</span><span class="field-input"><input name="email" type="email" autocomplete="email" required></span></label>
      <button class="btn btn-primary btn-block" type="submit">Enviar enlace</button>
    </form>`,
  };
  return `<section class="panel auth">
    <nav class="tabs" aria-label="Acceso">${tabs.map(([k, t]) => `<button class="tab ${k === tab ? 'is-active' : ''}" data-act="account-tab" data-tab="${k}">${t}</button>`).join('')}</nav>
    ${state.ui.afterLogin?.plan ? `<p class="banner banner-demo">${icon('info', 16)}<span>Después de entrar irás al pago del plan ${esc(planName(state.ui.afterLogin.plan))}.</span></p>` : ''}
    ${forms[tab]}
  </section>`;
}

function accountPanel() {
  const u = session.user;
  const p = plans()[plan()];
  const status = u.planStatus ? STATUS[u.planStatus] || u.planStatus : null;
  return `<div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>${icon('shield', 16)} Tu plan</h2></div>
      <div class="plan-summary"><b>${esc(p.name)}</b>${status ? `<span class="pill ${u.planStatus === 'active' || u.planStatus === 'trialing' ? 'pill-done' : 'pill-skip'}">${esc(status)}</span>` : ''}</div>
      ${u.currentPeriodEnd ? `<p class="muted small">${u.cancelAtPeriodEnd ? 'Se cancela el' : 'Se renueva el'} ${esc(fmt.day(u.currentPeriodEnd))}.</p>` : ''}
      ${u.planStatus === 'past_due' ? '<p class="small warn">No se ha podido cobrar la última cuota. Actualiza tu tarjeta para no perder el acceso.</p>' : ''}
      <div class="actions">
        <a class="btn btn-primary" href="#planes">Cambiar de plan</a>
        ${u.hasBilling ? `<button class="btn" data-act="billing-portal">${icon('doc', 15)} Gestionar pago y facturas</button>` : ''}
      </div>
      ${u.contract ? `<p class="small">${icon('check', 14)} Contrato del Método firmado el ${esc(fmt.day(u.contract.signedAt))}. <a href="#contrato" data-act="open-contract" data-id="${esc(u.contract.id)}">Ver copia</a></p>` : ''}
    </section>
    <section class="panel">
      <div class="panel-head"><h2>${icon('user', 16)} Tus datos</h2></div>
      <form class="auth-form" data-form="profile">
        <label class="field"><span class="field-label">Nombre</span><span class="field-input"><input name="name" value="${esc(u.name || '')}" autocomplete="name"></span></label>
        <label class="field"><span class="field-label">Correo electrónico</span><span class="field-input"><input value="${esc(u.email)}" disabled></span></label>
        <button class="btn" type="submit">Guardar</button>
      </form>
      <p class="muted small">Tus bonos y beneficios se guardan en tu cuenta y los ves en cualquier dispositivo.</p>
      <button class="btn btn-ghost" data-act="logout">Cerrar sesión</button>
    </section>
  </div>
  <div class="grid-2">
    <section class="panel">
      <div class="panel-head"><h2>Cambiar la contraseña</h2></div>
      <form class="auth-form" data-form="password">
        <label class="field"><span class="field-label">Contraseña actual</span><span class="field-input"><input name="current" type="password" autocomplete="current-password" required></span></label>
        <label class="field"><span class="field-label">Contraseña nueva</span><span class="field-input"><input name="next" type="password" autocomplete="new-password" minlength="8" required></span></label>
        <button class="btn" type="submit">Cambiar contraseña</button>
      </form>
    </section>
    <section class="panel danger-zone">
      <div class="panel-head"><h2>Borrar la cuenta</h2></div>
      <p class="muted small">Se borran tu cuenta y tus datos. Si tienes una suscripción activa, cancélala antes. Los contratos firmados se conservan el tiempo que exige la ley.</p>
      <form class="auth-form" data-form="delete">
        <label class="field"><span class="field-label">Escribe tu contraseña para confirmar</span><span class="field-input"><input name="password" type="password" autocomplete="current-password" required></span></label>
        <button class="btn btn-danger" type="submit">${icon('trash', 15)} Borrar mi cuenta</button>
      </form>
    </section>
  </div>`;
}

function localPanel() {
  return `<section class="panel">
    <div class="panel-head"><h2>${icon('eye', 16)} Vista previa sin servidor</h2></div>
    <p>Aquí no hay cuentas: todo se guarda en este navegador. Cuando publiques la web con el servidor, cada persona tendrá su cuenta, pagará su plan con Stripe y verá sus datos en cualquier dispositivo.</p>
    <div class="field"><span class="field-label">Ver la web con el plan</span>${seg('settings.previewPlan', [['free', plans().free.name], ['bienvenida', plans().bienvenida.name], ['recurrentes', plans().recurrentes.name], ['metodo', plans().metodo.name]])}</div>
  </section>`;
}

function renderCuenta() {
  if (!session.backend) return `${pageHead('Cuenta', 'Tu acceso, tu plan y tus datos.')}${localPanel()}`;
  if (!session.user) return `${pageHead('Cuenta', 'Entra o crea tu cuenta gratis para guardar tus bonos y beneficios.')}<div class="auth-wrap">${authForms()}</div>`;
  return `${pageHead('Cuenta', esc(session.user.email))}${accountPanel()}`;
}

function renderReset() {
  return `${pageHead('Nueva contraseña', 'Elige la contraseña que usarás a partir de ahora.')}
  <div class="auth-wrap"><section class="panel auth">
    <form class="auth-form" data-form="reset">
      <label class="field"><span class="field-label">Contraseña nueva</span><span class="field-input"><input name="password" type="password" autocomplete="new-password" minlength="8" required></span></label>
      <button class="btn btn-primary btn-block" type="submit">Guardar y entrar</button>
    </form>
  </section></div>`;
}

route('cuenta', { render: renderCuenta, nav: 'cuenta' });
route('restablecer', { render: renderReset, nav: 'cuenta' });

/* ------------------------------------------------------------ acciones */

async function afterAuth(user) {
  session.user = user;
  await pullData();
  await refreshSession();
  paintAccount();
  const pending = state.ui.afterLogin;
  state.ui.afterLogin = null;
  save();
  if (pending?.plan) {
    if (pending.plan === 'metodo') { go('metodo'); return; }
    try {
      const { url } = await api.checkout(pending.plan);
      window.location.href = url;
      return;
    } catch (e) { toast(e.message, 'warn'); }
  }
  go('inicio');
}

const val = (form, name) => form.elements[name]?.value ?? '';

async function busy(form, fn) {
  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message, 'warn'); } finally { if (btn) btn.disabled = false; }
}

registerActions({
  'account-tab': (b) => { state.ui.accountTab = b.dataset.tab; save(); render(); },
  'form:login': (form) => busy(form, async () => {
    const { user } = await api.login({ email: val(form, 'email'), password: val(form, 'password') });
    toast('Has entrado', 'good');
    await afterAuth(user);
  }),
  'form:register': (form) => busy(form, async () => {
    const { user } = await api.register({
      name: val(form, 'name'), email: val(form, 'email'), password: val(form, 'password'), adult: form.elements.adult.checked, terms: form.elements.terms.checked,
    });
    toast('Cuenta creada. Empieza por la guía.', 'good');
    await afterAuth(user);
  }),
  'form:forgot': (form) => busy(form, async () => {
    await api.forgot(val(form, 'email'));
    toast('Si hay una cuenta con ese correo, te hemos enviado un enlace.', 'good');
  }),
  'form:reset': (form) => busy(form, async () => {
    const token = new URLSearchParams(location.search).get('token');
    if (!token) throw new Error('Falta el enlace del correo. Pide otro.');
    const { user } = await api.reset(token, val(form, 'password'));
    history.replaceState(null, '', `${location.pathname}#inicio`);
    toast('Contraseña cambiada', 'good');
    await afterAuth(user);
  }),
  'form:profile': (form) => busy(form, async () => {
    const { user } = await api.updateMe({ name: val(form, 'name') });
    session.user = user;
    paintAccount();
    toast('Datos guardados', 'good');
  }),
  'form:password': (form) => busy(form, async () => {
    await api.changePassword(val(form, 'current'), val(form, 'next'));
    form.reset();
    toast('Contraseña cambiada', 'good');
  }),
  'form:delete': (form) => busy(form, async () => {
    await api.deleteMe(val(form, 'password'));
    session.user = null;
    session.content = null;
    toast('Cuenta borrada');
    paintAccount();
    go('inicio');
  }),
  logout: async () => {
    try { await api.logout(); } catch { /* ya no había sesión */ }
    session.user = null;
    await loadContent();
    await refreshSession();
    toast('Has cerrado sesión');
    go('inicio');
  },
  'billing-portal': async (b) => {
    b.disabled = true;
    try {
      const { url } = await api.portal();
      window.location.href = url;
    } catch (e) {
      toast(e.message, 'warn');
      b.disabled = false;
    }
  },
});
