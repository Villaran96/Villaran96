// Arranque de Contrapeso: vistas, eventos delegados y conexión con el servidor.

import {
  state, session, odds, O, set, render, setMain, actions, view, applyTheme, paintAccount, paintStatus, loadOdds,
  scheduleRefresh, seedExamples, clearExamples, refreshSession, pullData, loadContent, onExtLink, api, BOOKIES,
} from './core.js';
import { icon, logoMark, esc, toast } from './util.js';
import './views/home.js';
import { onAutoRefreshChange } from './views/oddsmatcher.js';
import { onDutchFix } from './views/calculators.js';
import { onStepToggle } from './views/bonos.js';
import { onGuideCheck } from './views/guia.js';
import { submitBet } from './views/beneficios.js';
import './views/planes.js';
import './views/cuenta.js';
import { onCertToggle } from './views/metodo.js';
import { onAdminDay, onAdminFeatures, onAdminUserPlan } from './views/admin.js';
import './views/legal.js';
import { onSportToggle, onMyBookToggle, importData } from './views/ajustes.js';
import './views/menu.js';

const main = document.getElementById('main');
setMain(main);

const NUMERIC_SET = new Set(['calc.dutch.step', 'om.autoRefresh']);

/* ------------------------------------------------------------ escritura en campos */

main.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.multiItem || el.dataset.complete) return;
  const k = el.dataset.k;
  if (!k) return;
  set(k, el.type === 'checkbox' ? el.checked : el.value);
  if (k.startsWith('om.') && k !== 'om.autoRefresh') {
    if (k === 'om.fbBook') { render(); return; }
    state.om.limit = 60;
    view?.refresh?.();
    return;
  }
  if (['settings.provider', 'settings.regions', 'settings.markets'].includes(k) || el.dataset.full) { render(); return; }
  view?.refresh?.();
});

const CHANGE = {
  'auto-refresh': onAutoRefreshChange,
  'dutch-fix': onDutchFix,
  'step-toggle': onStepToggle,
  'guide-check': onGuideCheck,
  'cert-toggle': onCertToggle,
  'admin-day': onAdminDay,
  'admin-features': onAdminFeatures,
  'admin-user-plan': onAdminUserPlan,
  'sport-toggle': onSportToggle,
  'mybook-toggle': onMyBookToggle,
  'import-file': (el) => {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importData(String(reader.result));
    reader.readAsText(file);
  },
};

main.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.multiItem) {
    const k = el.dataset.multiItem;
    const boxes = [...main.querySelectorAll(`[data-multi-item="${k}"]`)];
    const checked = boxes.filter((b) => b.checked).map((b) => b.value);
    set(k, checked.length === boxes.length ? [] : checked.length ? checked : ['__none__']);
    const lab = main.querySelector(`[data-multi-label="${k}"]`);
    if (lab) lab.textContent = checked.length === boxes.length ? (k === 'om.families' || k === 'om.exchanges' ? 'Todos' : 'Todas') : !checked.length ? 'Ninguna' : `${checked.length} de ${boxes.length}`;
    if (k === 'om.bookies') state.om.myOnly = false;
    state.om.limit = 60;
    view?.refresh?.();
    return;
  }
  const fn = CHANGE[el.dataset.actChange];
  if (fn) fn(el);
});

main.addEventListener('submit', (e) => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'bet') { submitBet(); return; }
  const fn = actions[`form:${form.dataset.form}`];
  if (fn) fn(form, e);
});

/* ------------------------------------------------------------ botones */

document.addEventListener('click', (e) => {
  // Cierra los desplegables de filtros al pulsar fuera.
  document.querySelectorAll('details.multi[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });

  const setBtn = e.target.closest('[data-set]');
  if (setBtn) {
    const k = setBtn.dataset.set;
    let v = setBtn.dataset.v;
    if (NUMERIC_SET.has(k)) v = Number(v);
    set(k, v);
    if (k === 'settings.theme') applyTheme(true);
    if (k === 'settings.previewPlan') paintAccount();
    if (k === 'settings.provider') loadOdds({ force: true });
    if (k.startsWith('om.')) { state.om.limit = 60; state.om.open = null; }
    render();
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  const name = btn.dataset.act;
  if (name === 'ext') { onExtLink(btn); return; }
  if (name === 'clear-examples') { clearExamples(); return; }
  const fn = actions[name];
  if (fn) fn(btn, e);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('details.multi[open]').forEach((d) => { d.open = false; });
});

/* ------------------------------------------------------------ arranque */

function mountShell() {
  document.querySelectorAll('[data-logo]').forEach((el) => { el.innerHTML = logoMark(el.dataset.logo === 'sm' ? 24 : 28); });
  document.querySelectorAll('[data-icon]').forEach((el) => { el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon, 20)); });
  const dl = document.createElement('datalist');
  dl.id = 'bookie-list';
  dl.innerHTML = BOOKIES.map(([, name]) => `<option value="${esc(name)}"></option>`).join('');
  document.body.appendChild(dl);
}

async function waitForPlan(previous) {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((ok) => setTimeout(ok, 2000));
    await refreshSession();
    if (session.user && session.user.plan !== previous) break;
  }
  render();
}

async function boot() {
  seedExamples();
  applyTheme();
  mountShell();
  odds.events = O.demoEvents(Date.now());
  odds.updated = new Date().toISOString();
  render();
  paintStatus();
  paintAccount();
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  setInterval(paintStatus, 30000);

  const cfg = await api.detect();
  if (cfg) {
    session.backend = true;
    session.config = cfg;
    session.user = cfg.user;
    if (session.user) await pullData();
    await loadContent();
  }
  session.ready = true;
  paintAccount();

  const params = new URLSearchParams(location.search);
  const pago = params.get('pago');
  if (pago) {
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
    if (pago === 'ok') {
      toast('Pago recibido. Estamos activando tu plan…', 'good');
      waitForPlan(session.user?.plan);
    } else {
      toast('Pago cancelado: no se ha cobrado nada.');
    }
  }
  render();
  scheduleRefresh();
  await loadOdds();
}

boot();
