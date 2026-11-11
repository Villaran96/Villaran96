// Panel de administración: contenido (guías, recurrentes, lecciones), planes y
// precios, datos de la empresa, usuarios, solicitudes y contratos.

import {
  state, session, C, nz, save, render, go, route, registerActions, pageHead, kpi, field, select, plans, site, isAdmin,
  assumptions, refreshSession, paintAccount, api, brand,
} from '../core.js';
import {
  fmt, esc, icon, toast, uid,
} from '../util.js';
import { OFFER_KINDS } from '../data.js';
import { mergePlans, PLAN_ORDER, effectivePlan } from '../plans.js';
import {
  DEFAULT_GUIDES, DEFAULT_PROMOS, DEFAULT_LESSONS, DEFAULT_SITE,
} from '../content.js';
import { markdown } from '../markdown.js';

let overview = null;
let loading = false;

async function loadOverview() {
  if (!session.backend || loading) return;
  loading = true;
  try {
    overview = await api.admin.overview();
  } catch (e) {
    toast(e.message, 'warn');
  }
  loading = false;
  if (location.hash === '#admin') render();
}

function data() {
  if (session.backend) return overview;
  const c = state.local.content || {};
  return {
    users: [], applications: [], contracts: state.local.contract ? [{ ...state.local.contract, signer: { ...state.local.contract.signer } }] : [],
    content: { guides: c.guides || DEFAULT_GUIDES, promos: c.promos || DEFAULT_PROMOS, lessons: c.lessons || DEFAULT_LESSONS },
    settings: { plans: mergePlans(state.local.plans), site: { ...DEFAULT_SITE, ...state.local.site } },
    seats: { total: Number(plans().metodo.seats) || 0, taken: 0, left: Number(plans().metodo.seats) || 0 },
    odds: null,
    payments: null,
  };
}

const TABS = [
  ['resumen', 'Resumen'], ['guides', 'Bienvenida'], ['promos', 'Recurrentes'], ['lessons', 'Lecciones del Método'],
  ['planes', 'Planes y precios'], ['empresa', 'Empresa'], ['usuarios', 'Usuarios'], ['solicitudes', 'Solicitudes'], ['contratos', 'Contratos'],
];
const DAYS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/* ------------------------------------------------------------ resumen */

function summary(d) {
  const users = d.users || [];
  const paid = users.filter((u) => u.plan !== 'free' && u.role !== 'admin');
  const p = d.settings.plans;
  const mrr = paid.reduce((s, u) => s + (p[u.plan]?.interval === 'month' ? nz(p[u.plan].price) : p[u.plan]?.interval === 'year' ? nz(p[u.plan].price) / 12 : 0), 0);
  const s = d.settings.site;
  const checks = [
    [!!(s.legalName && s.nif && s.address && s.email), 'Datos de la empresa completos (aviso legal, privacidad y contrato)', 'empresa'],
    [!!s.contractReviewed, 'Contrato del Método revisado por un abogado', 'empresa'],
    [session.backend ? !!d.payments?.configured : false, 'Pagos con Stripe configurados (STRIPE_SECRET_KEY y precios)', null],
    [session.backend ? !!d.payments?.webhook : false, 'Webhook de Stripe configurado (STRIPE_WEBHOOK_SECRET)', null],
    [session.backend ? !!d.odds?.configured : false, 'Fuente de cuotas reales (ODDS_API_KEY o Betfair)', null],
    [!d.content.guides.some((g) => g.example), 'Guías de bienvenida reales (sin ejemplos)', 'guides'],
    [!d.content.promos.some((g) => g.example), 'Promociones recurrentes reales (sin ejemplos)', 'promos'],
  ];
  return `<section class="kpis">
    ${kpi('Usuarios', String(users.length || '—'), session.backend ? '' : 'con el servidor')}
    ${kpi('Suscriptores de pago', String(paid.length || (session.backend ? 0 : '—')))}
    ${kpi('Ingresos mensuales', session.backend ? fmt.eur(mrr) : '—', 'estimados', 'kpi-brass')}
    ${kpi('Plazas del Método', d.seats.total ? `${d.seats.taken}/${d.seats.total}` : 'Sin límite')}
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Puesta en marcha</h2><span class="muted small">${checks.filter((c) => c[0]).length} de ${checks.length}</span></div>
    <ul class="setup-list">${checks.map(([ok, text, tab]) => `<li class="${ok ? 'is-done' : ''}">${ok ? icon('check', 15) : icon('info', 15)}<span>${esc(text)}</span>${!ok && tab ? `<button class="btn btn-ghost btn-xs" data-act="admin-tab" data-tab="${tab}">Arreglar</button>` : ''}</li>`).join('')}</ul>
    ${!session.backend ? '<p class="muted small">Vista previa: los cambios que hagas aquí se guardan en este navegador. Con el servidor se guardan para todos los usuarios.</p>' : ''}
  </section>
  ${d.odds ? `<section class="panel"><div class="panel-head"><h2>Cuotas</h2></div>
    <p>${d.odds.configured ? `${d.odds.events} partidos · actualizado ${d.odds.updated ? fmt.ago(d.odds.updated) : 'nunca'}${d.odds.remaining != null ? ` · ${d.odds.remaining} créditos de The Odds API` : ''}` : 'Sin fuente de cuotas configurada en el servidor.'}</p>
    ${(d.odds.sources || []).map((s2) => `<p class="small">${icon('check', 13)} ${esc(s2)}</p>`).join('')}
    ${(d.odds.errors || []).map((e) => `<p class="small warn">${icon('info', 13)} ${esc(e)}</p>`).join('')}
  </section>` : ''}`;
}

/* ------------------------------------------------------------ listas de contenido */

function listTab(kind, d) {
  const items = d.content[kind] || [];
  const edit = state.ui.adminEdit;
  if (edit && edit.kind === kind) return editForm(kind);
  const label = kind === 'guides' ? 'guía de bienvenida' : 'promoción recurrente';
  return `<div class="toolbar"><button class="btn btn-primary btn-sm" data-act="admin-new" data-kind="${kind}">${icon('plus', 15)} Nueva ${label}</button>${items.some((x) => x.example) ? `<button class="btn btn-sm" data-act="admin-clear-examples" data-kind="${kind}">${icon('trash', 15)} Quitar los ejemplos</button>` : ''}</div>
  <div class="table-wrap"><table class="ledger admin-table">
    <thead><tr><th>Casa</th><th>Promoción</th>${kind === 'promos' ? '<th>Cuándo</th>' : ''}<th class="num">Valor</th><th>Estado</th><th></th></tr></thead>
    <tbody>${items.map((x, i) => `<tr>
      <td><b>${esc(x.bookie)}</b></td>
      <td>${esc((OFFER_KINDS[x.kind] || OFFER_KINDS.other).title(x.params || {}))}${x.example ? ' <span class="tag tag-example">Ejemplo</span>' : ''}</td>
      ${kind === 'promos' ? `<td>${esc(x.schedule || 'Siempre')}</td>` : ''}
      <td class="num">${fmt.signedEur(C.offerValue(x, assumptions()))}</td>
      <td>${x.active === false ? '<span class="pill">Oculta</span>' : '<span class="pill pill-done">Publicada</span>'}</td>
      <td class="nowrap"><button class="btn btn-ghost btn-xs" data-act="admin-edit" data-kind="${kind}" data-i="${i}">${icon('pen', 13)} Editar</button><button class="btn btn-ghost btn-xs" data-act="admin-dup" data-kind="${kind}" data-i="${i}">Duplicar</button><button class="btn btn-ghost btn-xs btn-danger" data-act="admin-del" data-kind="${kind}" data-i="${i}">${icon('trash', 13)}</button></td>
    </tr>`).join('') || `<tr><td colspan="6" class="muted">No hay ninguna todavía.</td></tr>`}</tbody>
  </table></div>`;
}

function editForm(kind) {
  const e = state.ui.adminEdit;
  const x = e.item;
  const k = OFFER_KINDS[x.kind] || OFFER_KINDS.bet_get;
  x.params ||= {};
  k.fields.forEach((f) => { if (x.params[f.key] == null) x.params[f.key] = f.def; });
  const days = new Set(x.days || []);
  return `<section class="panel admin-edit">
    <div class="panel-head"><h2>${e.index == null ? 'Nueva' : 'Editar'} ${kind === 'guides' ? 'guía de bienvenida' : 'promoción recurrente'}</h2><button class="btn btn-ghost btn-icon" data-act="admin-cancel" aria-label="Cancelar">${icon('x', 16)}</button></div>
    <div class="form-grid">
      <label class="field" for="f-ae-bookie"><span class="field-label">Casa</span><span class="field-input"><input id="f-ae-bookie" data-k="ui.adminEdit.item.bookie" list="bookie-list" value="${esc(x.bookie || '')}"></span></label>
      ${select('ui.adminEdit.item.kind', 'Tipo', Object.entries(OFFER_KINDS).map(([key, v]) => [key, v.label]), { full: true })}
      ${k.fields.map((f) => (f.type === 'select' ? select(`ui.adminEdit.item.params.${f.key}`, f.label, f.options) : field(`ui.adminEdit.item.params.${f.key}`, f.label, { unit: f.unit }))).join('')}
      ${field('ui.adminEdit.item.url', 'Enlace a la casa o a la promoción', { mode: 'url', placeholder: 'https://' })}
      ${kind === 'promos' ? field('ui.adminEdit.item.schedule', 'Cuándo (texto)', { mode: 'text', placeholder: 'Cada lunes' }) : ''}
      ${kind === 'promos' ? field('ui.adminEdit.item.validUntil', 'Válida hasta (opcional)', { type: 'date' }) : ''}
    </div>
    ${kind === 'promos' ? `<div class="field"><span class="field-label">Días en los que sale en el calendario (ninguno = todos los días)</span><div class="day-picks">${DAYS.map((dname, i) => `<label class="day-pick"><input type="checkbox" data-act-change="admin-day" data-day="${i}" ${days.has(i) ? 'checked' : ''}><span>${dname}</span></label>`).join('')}</div></div>` : ''}
    <label class="field" for="f-ae-cond"><span class="field-label">Condiciones (las verá el usuario)</span><textarea id="f-ae-cond" data-k="ui.adminEdit.item.conditions" rows="3">${esc(x.conditions || '')}</textarea></label>
    <div class="accepts">
      <label class="check"><input type="checkbox" data-k="ui.adminEdit.item.active" ${x.active !== false ? 'checked' : ''}><span>Publicada</span></label>
      <label class="check"><input type="checkbox" data-k="ui.adminEdit.item.example" ${x.example ? 'checked' : ''}><span>Marcar como ejemplo</span></label>
    </div>
    <p class="muted small">Título: <b>${esc(k.title(x.params))}</b> · Valor estimado: <b>${fmt.signedEur(C.offerValue(x, assumptions()))}</b></p>
    <div class="actions"><button class="btn btn-primary" data-act="admin-save-item">${icon('check', 15)} Guardar</button><button class="btn" data-act="admin-cancel">Cancelar</button></div>
  </section>`;
}

function lessonsTab(d) {
  const items = d.content.lessons || [];
  const e = state.ui.adminEdit;
  if (e && e.kind === 'lessons') {
    const x = e.item;
    return `<section class="panel admin-edit">
      <div class="panel-head"><h2>${e.index == null ? 'Nueva lección' : 'Editar lección'}</h2><button class="btn btn-ghost btn-icon" data-act="admin-cancel" aria-label="Cancelar">${icon('x', 16)}</button></div>
      <div class="form-grid">
        ${field('ui.adminEdit.item.title', 'Título', { mode: 'text' })}
        ${field('ui.adminEdit.item.minutes', 'Minutos de lectura')}
      </div>
      <label class="field" for="f-ae-body"><span class="field-label">Texto</span><textarea id="f-ae-body" class="mono" data-k="ui.adminEdit.item.body" rows="16">${esc(x.body || '')}</textarea>
      <span class="field-hint">## Título · - lista · 1. lista numerada · &gt; nota · **negrita** · [enlace](https://…) · [[calc-impuesto]] y [[hoja-fiscal]] insertan las herramientas.</span></label>
      <details class="explain"><summary>Vista previa</summary><div class="prose" id="lesson-preview">${markdown(x.body, { vars: { marca: brand() } })}</div></details>
      <div class="actions"><button class="btn btn-primary" data-act="admin-save-item">${icon('check', 15)} Guardar</button><button class="btn" data-act="admin-cancel">Cancelar</button></div>
    </section>`;
  }
  return `<div class="toolbar"><button class="btn btn-primary btn-sm" data-act="admin-new" data-kind="lessons">${icon('plus', 15)} Nueva lección</button></div>
  <ol class="admin-lessons">${items.map((l, i) => `<li><span class="lesson-n">${i + 1}</span><span><b>${esc(l.title)}</b><span class="muted small"> · ${l.minutes || 5} min</span></span>
    <span class="nowrap"><button class="btn btn-ghost btn-xs" data-act="admin-move" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button class="btn btn-ghost btn-xs" data-act="admin-move" data-i="${i}" data-dir="1" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button class="btn btn-ghost btn-xs" data-act="admin-edit" data-kind="lessons" data-i="${i}">${icon('pen', 13)} Editar</button><button class="btn btn-ghost btn-xs btn-danger" data-act="admin-del" data-kind="lessons" data-i="${i}">${icon('trash', 13)}</button></span></li>`).join('')}</ol>`;
}

/* ------------------------------------------------------------ planes y empresa */

function plansTab(d) {
  if (!state.ui.adminPlans) state.ui.adminPlans = JSON.parse(JSON.stringify(d.settings.plans));
  const P = state.ui.adminPlans;
  return `<div class="plan-editors">${PLAN_ORDER.map((id) => `<section class="panel">
    <div class="panel-head"><h2>${esc(P[id].name)}</h2><span class="muted small">${id}</span></div>
    <div class="form-grid pair">
      ${field(`ui.adminPlans.${id}.name`, 'Nombre', { mode: 'text' })}
      ${id === 'free' ? '' : field(`ui.adminPlans.${id}.price`, 'Precio', { unit: '€' })}
      ${id === 'free' ? '' : select(`ui.adminPlans.${id}.interval`, 'Cobro', [['month', 'Mensual'], ['year', 'Anual'], ['once', 'Pago único']])}
      ${id === 'free' || id === 'metodo' ? '' : field(`ui.adminPlans.${id}.trialDays`, 'Días de prueba')}
      ${id === 'metodo' ? field(`ui.adminPlans.${id}.seats`, 'Plazas (0 = sin límite)') : ''}
    </div>
    ${field(`ui.adminPlans.${id}.tagline`, 'Frase', { mode: 'text' })}
    <label class="field"><span class="field-label">Qué incluye (una línea por punto)</span><textarea data-act-change="admin-features" data-plan="${id}" rows="5">${esc((P[id].features || []).join('\n'))}</textarea></label>
    <div class="accepts">
      ${id === 'free' ? '' : `<label class="check"><input type="checkbox" data-k="ui.adminPlans.${id}.highlight" ${P[id].highlight ? 'checked' : ''}><span>Destacar como «el más elegido»</span></label>`}
      ${id === 'metodo' ? `<label class="check"><input type="checkbox" data-k="ui.adminPlans.${id}.requiresApproval" ${P[id].requiresApproval ? 'checked' : ''}><span>Revisar cada solicitud a mano antes de dejar firmar</span></label>` : ''}
    </div>
  </section>`).join('')}</div>
  <p class="muted small">El precio que se cobra lo fija el precio de Stripe de cada plan (variables STRIPE_PRICE_…). Pon aquí el mismo importe para que coincida lo que se enseña con lo que se cobra.</p>
  <div class="actions"><button class="btn btn-primary" data-act="admin-save-plans">${icon('check', 15)} Guardar planes</button></div>`;
}

function empresaTab(d) {
  if (!state.ui.adminSite) state.ui.adminSite = { ...d.settings.site };
  return `<section class="panel">
    <div class="panel-head"><h2>Datos de la empresa</h2></div>
    <p class="muted small">Salen en el aviso legal, la política de privacidad, las condiciones y el contrato del Método.</p>
    <div class="form-grid">
      ${field('ui.adminSite.brand', 'Nombre de la web', { mode: 'text' })}
      ${field('ui.adminSite.legalName', 'Razón social o nombre del titular', { mode: 'text' })}
      ${field('ui.adminSite.nif', 'NIF', { mode: 'text' })}
      ${field('ui.adminSite.address', 'Domicilio', { mode: 'text' })}
      ${field('ui.adminSite.email', 'Correo de contacto', { mode: 'email' })}
      ${field('ui.adminSite.supportUrl', 'Enlace de soporte (Telegram, WhatsApp…)', { mode: 'url' })}
    </div>
    ${field('ui.adminSite.betfairTemplate', 'Enlace a un mercado de Betfair.es', { mode: 'url', hint: 'Abre cualquier partido en betfair.es, copia la dirección y cambia el número de mercado (1.xxxxxxxx) por {marketId}.' })}
    <label class="check"><input type="checkbox" data-k="ui.adminSite.contractReviewed" ${state.ui.adminSite.contractReviewed ? 'checked' : ''}><span>Un abogado ha revisado el contrato del Método y los textos legales</span></label>
    <div class="actions"><button class="btn btn-primary" data-act="admin-save-site">${icon('check', 15)} Guardar</button></div>
  </section>`;
}

/* ------------------------------------------------------------ usuarios, solicitudes y contratos */

function needsServer() {
  return '<div class="empty panel"><p>Disponible cuando la web funciona con el servidor.</p><p class="muted small">En la vista previa no hay usuarios ni pagos.</p></div>';
}

function usersTab(d) {
  if (!session.backend) return needsServer();
  return `<div class="table-wrap"><table class="ledger admin-table">
    <thead><tr><th>Usuario</th><th>Plan</th><th>Estado</th><th>Alta</th><th>Contrato</th><th>Cambiar plan</th></tr></thead>
    <tbody>${d.users.map((u) => `<tr>
      <td><b>${esc(u.name || '')}</b><br><span class="muted small">${esc(u.email)}${u.role === 'admin' ? ' · admin' : ''}</span></td>
      <td>${esc(plans()[u.plan]?.name || u.plan)}</td>
      <td>${esc(u.planStatus || '—')}</td>
      <td class="nowrap">${esc(fmt.day(u.createdAt))}</td>
      <td>${u.contract ? `<a href="#contrato" data-act="open-contract" data-id="${esc(u.contract.id)}">Ver</a>` : '—'}</td>
      <td><select data-act-change="admin-user-plan" data-id="${esc(u.id)}" aria-label="Plan de ${esc(u.email)}">${PLAN_ORDER.map((id) => `<option value="${id}" ${u.subscribedPlan === id ? 'selected' : ''}>${esc(plans()[id].name)}</option>`).join('')}</select></td>
    </tr>`).join('') || '<tr><td colspan="6" class="muted">Sin usuarios todavía.</td></tr>'}</tbody>
  </table></div>
  <p class="muted small">Cambiar el plan a mano da acceso sin pasar por Stripe (por ejemplo, para regalar un mes). No cambia lo que Stripe cobra.</p>`;
}

function applicationsTab(d) {
  if (!session.backend) return needsServer();
  const STATUS = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', waitlist: 'En espera' };
  return `<div class="table-wrap"><table class="ledger admin-table">
    <thead><tr><th>Solicitud</th><th>Experiencia y motivo</th><th>Estado</th><th></th></tr></thead>
    <tbody>${[...d.applications].reverse().map((a) => `<tr>
      <td><b>${esc(a.email)}</b><br><span class="muted small">${esc(fmt.day(a.createdAt))}${a.phone ? ` · ${esc(a.phone)}` : ''}</span></td>
      <td class="desc">${esc(a.experience || '')}<br><span class="muted">${esc(a.motivation || '')}</span></td>
      <td>${esc(STATUS[a.status] || a.status)}</td>
      <td class="nowrap">${['approved', 'waitlist', 'rejected'].filter((s) => s !== a.status).map((s) => `<button class="btn btn-ghost btn-xs" data-act="admin-app" data-id="${esc(a.id)}" data-status="${s}">${{ approved: 'Aprobar', waitlist: 'A la espera', rejected: 'Rechazar' }[s]}</button>`).join('')}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="muted">Sin solicitudes todavía.</td></tr>'}</tbody>
  </table></div>`;
}

function contractsTab(d) {
  const list = d.contracts || [];
  return `<div class="table-wrap"><table class="ledger admin-table">
    <thead><tr><th>Firmante</th><th>Fecha</th><th>Versión</th><th>Huella</th><th></th></tr></thead>
    <tbody>${[...list].reverse().map((c) => `<tr>
      <td><b>${esc(c.signer.name)}</b><br><span class="muted small">${esc(c.signer.dni)} · ${esc(c.signer.email || '')}</span></td>
      <td class="nowrap">${esc(fmt.day(c.signedAt))}</td>
      <td>${esc(c.version)}</td>
      <td class="hash">${esc(String(c.hash).slice(0, 16))}…</td>
      <td><a class="btn btn-ghost btn-xs" href="#contrato" data-act="open-contract" data-id="${esc(c.id)}">Ver</a></td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">Sin contratos firmados todavía.</td></tr>'}</tbody>
  </table></div>`;
}

/* ------------------------------------------------------------ vista */

function renderAdmin() {
  if (!isAdmin()) return `${pageHead('Administración', 'Solo para administradores.')}<a class="btn" href="#inicio">Volver</a>`;
  const d = data();
  if (!d) {
    loadOverview();
    return `${pageHead('Administración', 'Cargando…')}`;
  }
  const tab = state.ui.adminTab || 'resumen';
  const body = {
    resumen: () => summary(d), guides: () => listTab('guides', d), promos: () => listTab('promos', d), lessons: () => lessonsTab(d),
    planes: () => plansTab(d), empresa: () => empresaTab(d), usuarios: () => usersTab(d), solicitudes: () => applicationsTab(d), contratos: () => contractsTab(d),
  }[tab]();
  return `${pageHead('Administración', `Gestiona el contenido y los clientes de ${esc(brand())}.`, session.backend ? `<button class="btn btn-sm" data-act="admin-reload">${icon('refresh', 15)} Recargar</button>` : '')}
  ${!d.settings.site.contractReviewed ? `<div class="banner banner-warn">${icon('info', 16)}<span>El contrato y los textos legales son plantillas. Revísalos con un abogado antes de vender, y marca la casilla en Empresa.</span></div>` : ''}
  <nav class="tabs tabs-scroll" aria-label="Secciones de administración">${TABS.map(([k, t]) => `<button class="tab ${k === tab ? 'is-active' : ''}" data-act="admin-tab" data-tab="${k}">${t}</button>`).join('')}</nav>
  ${body}`;
}

route('admin', {
  render: renderAdmin,
  refresh: () => {
    const prev = document.getElementById('lesson-preview');
    if (prev && state.ui.adminEdit) prev.innerHTML = markdown(state.ui.adminEdit.item.body, { vars: { marca: brand() } });
  },
  mount: () => { if (session.backend && !overview) loadOverview(); },
  nav: 'admin',
});

/* ------------------------------------------------------------ guardar */

async function saveContent(kind, items) {
  if (session.backend) {
    const res = await api.admin.putContent(kind, items);
    overview.content[kind] = res.items;
    await refreshSession();
  } else {
    const c = state.local.content || {};
    state.local.content = { guides: c.guides || DEFAULT_GUIDES, promos: c.promos || DEFAULT_PROMOS, lessons: c.lessons || DEFAULT_LESSONS, [kind]: items };
    save();
  }
}

async function saveSettings(body) {
  if (session.backend) {
    const res = await api.admin.putSettings(body);
    overview.settings = res.settings;
    await refreshSession();
  } else {
    if (body.plans) state.local.plans = body.plans;
    if (body.site) state.local.site = body.site;
    save();
  }
  paintAccount();
}

const withToast = (fn) => async (b) => {
  try {
    await fn(b);
  } catch (e) {
    toast(e.message, 'warn');
  }
};

registerActions({
  'admin-tab': (b) => { state.ui.adminTab = b.dataset.tab; state.ui.adminEdit = null; state.ui.adminPlans = null; state.ui.adminSite = null; save(); render(); },
  'admin-reload': () => { overview = null; loadOverview(); },
  'admin-new': (b) => {
    const kind = b.dataset.kind;
    state.ui.adminEdit = {
      kind, index: null,
      item: kind === 'lessons' ? { id: uid(), title: '', minutes: 5, body: '' } : { id: uid(), bookie: '', kind: 'bet_get', params: {}, conditions: '', url: '', schedule: '', days: [], active: true },
    };
    render();
  },
  'admin-edit': (b) => {
    const kind = b.dataset.kind;
    const item = data().content[kind][Number(b.dataset.i)];
    state.ui.adminEdit = { kind, index: Number(b.dataset.i), item: JSON.parse(JSON.stringify(item)) };
    render();
  },
  'admin-dup': withToast(async (b) => {
    const kind = b.dataset.kind;
    const items = [...data().content[kind]];
    const copy = { ...JSON.parse(JSON.stringify(items[Number(b.dataset.i)])), id: uid(), active: false };
    items.splice(Number(b.dataset.i) + 1, 0, copy);
    await saveContent(kind, items);
    toast('Duplicada (oculta hasta que la publiques)', 'good');
    render();
  }),
  'admin-del': withToast(async (b) => {
    const kind = b.dataset.kind;
    const i = Number(b.dataset.i);
    if (state.ui.adminConfirm !== `${kind}:${i}`) {
      state.ui.adminConfirm = `${kind}:${i}`;
      toast('Pulsa otra vez la papelera para borrarla.', 'warn');
      setTimeout(() => { state.ui.adminConfirm = null; }, 4000);
      return;
    }
    state.ui.adminConfirm = null;
    const items = data().content[kind].filter((_, j) => j !== i);
    await saveContent(kind, items);
    toast('Borrada');
    render();
  }),
  'admin-move': withToast(async (b) => {
    const items = [...data().content.lessons];
    const i = Number(b.dataset.i);
    const j = i + Number(b.dataset.dir);
    [items[i], items[j]] = [items[j], items[i]];
    await saveContent('lessons', items);
    render();
  }),
  'admin-cancel': () => { state.ui.adminEdit = null; render(); },
  'admin-save-item': withToast(async () => {
    const e = state.ui.adminEdit;
    const item = { ...e.item };
    if (e.kind !== 'lessons' && !String(item.bookie || '').trim()) { toast('Escribe la casa.', 'warn'); return; }
    if (e.kind === 'lessons' && !String(item.title || '').trim()) { toast('Escribe el título.', 'warn'); return; }
    if (e.kind === 'promos' && !String(item.schedule || '').trim()) {
      const names = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
      const days = [...(item.days || [])].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
      item.schedule = days.length ? `Los ${days.map((d) => names[d]).join(', ').replace(/, ([^,]*)$/, ' y $1')}` : 'Todos los días';
    }
    if (e.kind === 'lessons') item.minutes = nz(item.minutes, 5);
    else item.params = Object.fromEntries(Object.entries(item.params || {}).map(([k, v]) => [k, Number.isFinite(C.num(v)) && k !== 'freebetType' && k !== 'base' ? C.num(v) : v]));
    const items = [...data().content[e.kind]];
    if (e.index == null) items.push(item); else items[e.index] = item;
    await saveContent(e.kind, items);
    state.ui.adminEdit = null;
    toast('Guardado', 'good');
    render();
  }),
  'admin-clear-examples': withToast(async (b) => {
    const kind = b.dataset.kind;
    await saveContent(kind, data().content[kind].filter((x) => !x.example));
    toast('Ejemplos quitados');
    render();
  }),
  'admin-save-plans': withToast(async () => {
    const P = JSON.parse(JSON.stringify(state.ui.adminPlans));
    for (const id of PLAN_ORDER) {
      P[id].price = nz(P[id].price);
      P[id].trialDays = nz(P[id].trialDays);
      P[id].seats = nz(P[id].seats);
    }
    await saveSettings({ plans: P });
    state.ui.adminPlans = null;
    toast('Planes guardados', 'good');
    render();
  }),
  'admin-save-site': withToast(async () => {
    const s = state.ui.adminSite;
    if (s.betfairTemplate && !/^https:\/\/.*\{marketId\}/.test(s.betfairTemplate)) { toast('El enlace de Betfair tiene que empezar por https:// y llevar {marketId}.', 'warn'); return; }
    await saveSettings({ site: { ...s } });
    state.ui.adminSite = null;
    toast('Datos guardados', 'good');
    render();
  }),
  'admin-app': withToast(async (b) => {
    await api.admin.patchApplication(b.dataset.id, b.dataset.status);
    overview = null;
    await loadOverview();
  }),
});

export function onAdminDay(el) {
  const e = state.ui.adminEdit;
  if (!e) return;
  const days = new Set(e.item.days || []);
  if (el.checked) days.add(Number(el.dataset.day)); else days.delete(Number(el.dataset.day));
  e.item.days = [...days].sort();
}

export function onAdminFeatures(el) {
  const P = state.ui.adminPlans;
  if (P) P[el.dataset.plan].features = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
}

export async function onAdminUserPlan(el) {
  try {
    await api.admin.patchUser(el.dataset.id, { plan: el.value });
    toast('Plan cambiado', 'good');
    overview = null;
    await loadOverview();
  } catch (e) {
    toast(e.message, 'warn');
  }
}

export { effectivePlan, go };
