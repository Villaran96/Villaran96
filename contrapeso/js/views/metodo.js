// Método: plan premium con plazas limitadas. Solicitud → contrato firmado online →
// pago → acceso a las lecciones (Hacienda incluida) y a la hoja de control fiscal.

import {
  state, session, nz, n, save, go, render, route, registerActions, pageHead, plans, priceLabel, site, brand, can,
  content, refreshSession, paintAccount, api, money, monthKey,
} from '../core.js';
import {
  fmt, esc, icon, toast, uid, isoDay, copyText, download,
} from '../util.js';
import { markdown } from '../markdown.js';
import {
  contractData, contractText, contractHTML, sha256Hex, validDni, CONTRACT_VERSION,
} from '../contract.js';
import { exportCsv } from './beneficios.js';
import { billing, yearlyOk } from './planes.js';
import { yearSaving } from '../plans.js';

/* ------------------------------------------------------------ estado del proceso */

function stage() {
  if (can('metodo')) return 'access';
  if (session.backend) {
    const u = session.user;
    if (!u) return 'login';
    const app = session.metodo?.application || u.application;
    if (!app) return 'apply';
    if (app.status === 'pending') return 'pending';
    if (app.status === 'waitlist') return 'waitlist';
    if (app.status === 'rejected') return 'rejected';
    if (!u.contract) return 'sign';
    return 'pay';
  }
  if (!state.local.application) return 'apply';
  if (!state.local.contract) return 'sign';
  return 'pay';
}

function seats() {
  if (session.backend && session.config?.seats) return session.config.seats;
  const total = Number(plans().metodo.seats) || 0;
  return { total, taken: 0, left: total || null };
}

const STEPS = [['apply', 'Solicitud'], ['sign', 'Contrato'], ['pay', 'Pago'], ['access', 'Acceso']];

function tracker(current) {
  const order = { login: 0, apply: 0, pending: 0, waitlist: 0, rejected: 0, sign: 1, pay: 2, access: 3 };
  const at = order[current] ?? 0;
  return `<ol class="tracker">${STEPS.map(([, label], i) => `<li class="${i < at ? 'is-done' : i === at ? 'is-current' : ''}"><span class="tracker-dot">${i < at ? icon('check', 13) : i + 1}</span><span>${label}</span></li>`).join('')}</ol>`;
}

/* ------------------------------------------------------------ página de venta y pasos */

function salesHeader(st) {
  const p = plans().metodo;
  const s = seats();
  const c = content();
  return `<section class="metodo-hero">
    <div>
      <span class="eyebrow">Plan ${esc(p.name)} · plazas limitadas</span>
      <h2>${esc(p.tagline || 'El método completo, Hacienda incluida.')}</h2>
      <p>Todo lo del plan ${esc(plans().recurrentes.name)} y un programa paso a paso para hacerlo de forma ordenada y declararlo bien: qué tributa, qué documentos pedir a cada casa y cómo hacerlo en Renta Web, con una hoja de control que usa tus propios datos.</p>
      <div class="metodo-price"><b>${esc(priceLabel(p))}</b>${yearlyOk('metodo') ? `<span class="muted small">o ${esc(fmt.eur(p.priceYear))} al año</span>` : ''}${s.total ? `<span class="seats ${s.left === 0 ? 'is-full' : ''}">${icon('star', 14)} ${s.left === 0 ? 'Sin plazas ahora mismo' : `Quedan ${s.left} de ${s.total} plazas`}</span>` : ''}</div>
    </div>
    <div class="metodo-included">
      <span class="eyebrow">Lo que incluye</span>
      <ol>${c.lessons.map((l) => `<li>${icon('lock', 13)} ${esc(l.title)}</li>`).join('')}</ol>
    </div>
  </section>
  ${tracker(st)}`;
}

function applyForm() {
  const p = plans().metodo;
  return `<section class="panel">
    <div class="panel-head"><h2>1. Solicita tu plaza</h2></div>
    <p class="muted">${p.requiresApproval ? 'Revisamos cada solicitud y te contestamos por correo.' : 'Si quedan plazas, la tuya se reserva al momento y pasas a firmar el contrato.'}</p>
    <form class="auth-form wide" data-form="apply">
      <label class="field"><span class="field-label">Tu experiencia</span><span class="field-input"><select name="experience">
        <option>Nunca he hecho matched betting</option><option>He hecho algunos bonos</option><option>Lo hago de forma habitual</option>
      </select></span></label>
      <label class="field"><span class="field-label">Qué quieres conseguir</span><textarea name="motivation" rows="3" maxlength="2000" placeholder="Por ejemplo: hacerlo bien con Hacienda desde el principio"></textarea></label>
      <label class="field"><span class="field-label">Teléfono (opcional)</span><span class="field-input"><input name="phone" type="tel" autocomplete="tel"></span></label>
      <button class="btn btn-primary" type="submit">Solicitar plaza</button>
    </form>
  </section>`;
}

function signerData() {
  const s = state.ui.signer || {};
  return {
    name: s.name || session.user?.name || '',
    dni: s.dni || '',
    address: s.address || '',
    email: session.user?.email || s.email || '',
  };
}

function currentContract() {
  return contractData({ site: site(), signer: signerData(), plan: plans().metodo, date: new Date() });
}

function signForm() {
  if (!state.ui.signer) state.ui.signer = { name: session.user?.name || '', dni: '', address: '', email: session.user?.email || '', accept: {} };
  const s = state.ui.signer;
  const a = s.accept || {};
  const dniOk = !s.dni || validDni(s.dni);
  return `<section class="panel sign">
    <div class="panel-head"><h2>2. Firma el contrato</h2><span class="muted small">Versión ${CONTRACT_VERSION}</span></div>
    <p class="muted">Rellena tus datos: el contrato se actualiza mientras escribes. Léelo entero antes de firmar.</p>
    <div class="form-grid">
      <label class="field" for="f-ui-signer-name"><span class="field-label">Nombre y apellidos</span><span class="field-input"><input id="f-ui-signer-name" data-k="ui.signer.name" value="${esc(s.name)}" autocomplete="name"></span></label>
      <label class="field" for="f-ui-signer-dni"><span class="field-label">DNI o NIE</span><span class="field-input"><input id="f-ui-signer-dni" data-k="ui.signer.dni" value="${esc(s.dni)}" autocomplete="off" spellcheck="false"></span><span class="field-hint" id="dni-hint">${dniOk ? 'Con la letra, por ejemplo 12345678Z.' : '<span class="warn">La letra no corresponde a esos números.</span>'}</span></label>
      <label class="field" for="f-ui-signer-address"><span class="field-label">Domicilio</span><span class="field-input"><input id="f-ui-signer-address" data-k="ui.signer.address" value="${esc(s.address)}" autocomplete="street-address"></span></label>
      ${!session.backend ? `<label class="field" for="f-ui-signer-email"><span class="field-label">Correo electrónico</span><span class="field-input"><input id="f-ui-signer-email" data-k="ui.signer.email" value="${esc(s.email)}" type="email" autocomplete="email"></span></label>` : ''}
    </div>
    <div class="contract-box" id="contract-box" tabindex="0" aria-label="Texto del contrato">${contractHTML(currentContract(), esc)}</div>
    <div class="accepts">
      <label class="check"><input type="checkbox" data-k="ui.signer.accept.contract" ${a.contract ? 'checked' : ''}><span>He leído el contrato y lo acepto.</span></label>
      <label class="check"><input type="checkbox" data-k="ui.signer.accept.adult" ${a.adult ? 'checked' : ''}><span>Soy mayor de 18 años y no estoy inscrito en el Registro General de Interdicciones de Acceso al Juego.</span></label>
      <label class="check"><input type="checkbox" data-k="ui.signer.accept.info" ${a.info ? 'checked' : ''}><span>Entiendo que el contenido es formativo y no es asesoramiento fiscal personalizado.</span></label>
      <label class="check"><input type="checkbox" data-k="ui.signer.accept.waiver" ${a.waiver ? 'checked' : ''}><span>Quiero acceder al contenido en cuanto pague y sé que entonces pierdo el derecho de desistimiento de 14 días.</span></label>
    </div>
    <div class="field">
      <span class="field-label">Tu firma <button type="button" class="link" data-act="sig-clear">Borrar</button></span>
      <canvas id="sigpad" class="sigpad" aria-label="Recuadro para firmar con el dedo o el ratón"></canvas>
      <span class="field-hint">Firma con el dedo o con el ratón dentro del recuadro.</span>
    </div>
    <div class="actions"><button class="btn btn-primary" data-act="sign-submit">${icon('pen', 15)} Firmar el contrato</button></div>
    <p class="muted small">Al firmar guardamos tu nombre, DNI, la fecha y hora, tu IP y navegador, tu firma y la huella SHA-256 del texto. Recibirás una copia por correo.</p>
  </section>`;
}

function payPanel() {
  const p = plans().metodo;
  const yearly = yearlyOk('metodo');
  const iv = yearly ? billing() : 'month';
  const signedAt = session.backend ? session.user?.contract?.signedAt : state.local.contract?.signedAt;
  return `<section class="panel">
    <div class="panel-head"><h2>3. Activa tu plaza</h2></div>
    <p>${icon('check', 15)} Contrato firmado ${signedAt ? `el ${esc(fmt.day(signedAt))}` : ''}. <a href="#contrato" data-act="open-contract">Ver copia</a></p>
    ${yearly ? `<div class="billing-toggle" role="group" aria-label="Forma de pago">
      <button class="${iv === 'month' ? 'is-on' : ''}" data-set="ui.billing" data-v="month" aria-pressed="${iv === 'month'}">${esc(fmt.eur(p.price))} al mes</button>
      <button class="${iv === 'year' ? 'is-on' : ''}" data-set="ui.billing" data-v="year" aria-pressed="${iv === 'year'}">${esc(fmt.eur(p.priceYear))} al año${yearSaving(p) ? `<span class="save-tag">${yearSaving(p)} meses gratis</span>` : ''}</button>
    </div>` : ''}
    <p>Paga ${iv === 'year' ? `${esc(fmt.eur(p.priceYear))} al año` : esc(priceLabel(p))} para activar el acceso. La plaza es tuya mientras mantengas la suscripción${iv === 'year' ? ' (se renueva cada año; puedes cancelar la renovación cuando quieras)' : ''}.</p>
    <div class="actions">${session.backend
      ? `<button class="btn btn-primary" data-act="subscribe" data-plan="metodo" data-interval="${iv}">${icon('shield', 15)} Pagar y activar</button>`
      : `<button class="btn btn-primary" data-act="metodo-simulate-pay">${icon('eye', 15)} Simular el pago (vista previa)</button>`}</div>
  </section>`;
}

function statusPanel(st) {
  const texts = {
    login: ['Entra para solicitar tu plaza', 'Necesitas una cuenta para solicitar plaza y firmar el contrato.', '<a class="btn btn-primary" href="#cuenta" data-act="metodo-login">Entrar o crear cuenta</a>'],
    pending: ['Solicitud recibida', 'La estamos revisando. Te escribiremos al correo de tu cuenta en cuanto esté aprobada.', ''],
    waitlist: ['Estás en la lista de espera', 'Ahora mismo no quedan plazas. Te avisaremos por correo en cuanto se libere una.', ''],
    rejected: ['Solicitud no aprobada', 'Esta vez no podemos ofrecerte plaza. Escríbenos si quieres más información.', ''],
  };
  const [title, text, btn] = texts[st];
  return `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2></div><p>${esc(text)}</p>${btn ? `<div class="actions">${btn}</div>` : ''}</section>`;
}

/* ------------------------------------------------------------ acceso: lecciones y herramientas */

function taxWidget() {
  const year = String(new Date().getFullYear());
  const result = state.bets.filter((b) => String(b.date).startsWith(year)).reduce((s, b) => s + nz(b.profit), 0);
  const t = state.ui.tax || (state.ui.tax = { result: Math.max(0, Math.round(result * 100) / 100), rate: 30 });
  return `<div class="widget" id="tax-widget">
    <span class="eyebrow">${icon('calc', 14)} Estimación de impuestos</span>
    <div class="form-grid pair">
      <label class="field" for="f-ui-tax-result"><span class="field-label">Resultado del juego del año</span><span class="field-input"><input id="f-ui-tax-result" data-k="ui.tax.result" inputmode="decimal" value="${esc(t.result)}"><span class="unit">€</span></span><span class="field-hint">Según tu registro, ${year} va en ${fmt.eur(result)}.</span></label>
      <label class="field" for="f-ui-tax-rate"><span class="field-label">Tu tipo marginal</span><span class="field-input"><input id="f-ui-tax-rate" data-k="ui.tax.rate" inputmode="decimal" value="${esc(t.rate)}"><span class="unit">%</span></span></label>
    </div>
    <p id="tax-out" class="tax-out">${taxOut()}</p>
  </div>`;
}

function taxOut() {
  const t = state.ui.tax || {};
  const r = Math.max(0, nz(t.result));
  const tax = r * nz(t.rate) / 100;
  return `Pagarías unos <b>${fmt.eur(tax)}</b> en la declaración por ${fmt.eur(r)} de ganancias netas del juego. Apártalos: ${fmt.eur(tax / 12)} al mes.`;
}

function fiscalSheet() {
  const byYear = new Map();
  for (const b of state.bets) {
    const y = String(b.date || '').slice(0, 4);
    if (!y) continue;
    const e = byYear.get(y) || { total: 0, gains: 0, losses: 0, books: new Map() };
    const v = nz(b.profit);
    e.total += v;
    if (v >= 0) e.gains += v; else e.losses += -v;
    const k = b.bookie || 'Sin casa';
    e.books.set(k, (e.books.get(k) || 0) + v);
    byYear.set(y, e);
  }
  const certs = state.metodo.certs || {};
  const years = [...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  if (!years.length) return '<div class="widget"><p class="muted">Cuando anotes operaciones en Beneficios, aquí verás cada año con sus casas.</p></div>';
  return `<div class="widget" id="fiscal-sheet">
    <span class="eyebrow">${icon('doc', 14)} Hoja de control fiscal</span>
    ${years.map(([y, e]) => `<div class="fiscal-year">
      <div class="fiscal-head"><b>${esc(y)}</b><span>Resultado neto según tu registro ${money(e.total)}</span><button class="btn btn-ghost btn-xs" data-act="fiscal-csv" data-year="${esc(y)}">${icon('download', 13)} CSV del año</button></div>
      <p class="muted small">Operaciones con resultado positivo: ${fmt.eur(e.gains)} · negativo: ${fmt.eur(e.losses)}. Declara las cifras de los certificados de cada casa; esto te sirve para comprobarlas.</p>
      <ul class="cert-list">${[...e.books.entries()].sort((a, b) => b[1] - a[1]).map(([book, v]) => {
        const key = `${y}:${book}`;
        return `<li><label class="check"><input type="checkbox" data-act-change="cert-toggle" data-key="${esc(key)}" ${certs[key] ? 'checked' : ''}><span>Certificado de <b>${esc(book)}</b> pedido</span></label>${money(v)}</li>`;
      }).join('')}
        <li><label class="check"><input type="checkbox" data-act-change="cert-toggle" data-key="${esc(`${y}:exchange`)}" ${certs[`${y}:exchange`] ? 'checked' : ''}><span>Extracto anual del <b>exchange</b> descargado</span></label></li>
      </ul>
    </div>`).join('')}
  </div>`;
}

function accessView() {
  const c = content();
  const list = c.lessons;
  const current = list.find((l) => l.id === state.metodo.current) || list[0];
  if (!current) return '<p class="muted">Todavía no hay lecciones publicadas.</p>';
  const idx = list.indexOf(current);
  const done = state.metodo.done;
  const count = list.filter((l) => done[l.id]).length;
  const contract = session.backend ? session.user?.contract : state.local.contract;
  const html = markdown(current.body, {
    vars: { marca: brand() },
    widgets: { 'calc-impuesto': taxWidget, 'hoja-fiscal': fiscalSheet },
  });
  return `${!session.backend && !state.local.contract ? `<div class="banner banner-demo">${icon('eye', 16)}<span>Vista previa: en la web publicada, el cliente firma el contrato y paga antes de ver estas lecciones.</span><button class="btn btn-ghost btn-sm" data-act="metodo-try-flow">Probar el proceso</button></div>` : ''}
  ${contract ? `<p class="small muted">${icon('check', 14)} Contrato firmado el ${esc(fmt.day(contract.signedAt))}. <a href="#contrato" data-act="open-contract">Ver copia</a></p>` : ''}
  <div class="course">
    <aside class="course-nav">
      <div class="course-progress"><span><b>${count}</b> de ${list.length} lecciones</span><span class="progress"><i style="width:${Math.round((count / list.length) * 100)}%"></i></span></div>
      <details class="course-toc" ${window.matchMedia('(min-width: 900px)').matches ? 'open' : ''}><summary>Lecciones</summary>
        <ol class="lesson-list">${list.map((l, i) => `<li><button class="lesson-link ${l.id === current.id ? 'is-current' : ''} ${done[l.id] ? 'is-done' : ''}" data-act="metodo-open" data-lesson="${l.id}"><span class="lesson-n">${done[l.id] ? icon('check', 14) : i + 1}</span><span>${esc(l.title)}</span><span class="muted small">${l.minutes || 5} min</span></button></li>`).join('')}</ol>
      </details>
      <a class="btn btn-sm btn-block" href="#beneficios">${icon('chart', 15)} Tus beneficios</a>
    </aside>
    <article class="panel lesson">
      <span class="eyebrow">Lección ${idx + 1} de ${list.length} · ${current.minutes || 5} min</span>
      <h2 class="lesson-title">${esc(current.title)}</h2>
      <div class="prose">${html}</div>
      <div class="note">Esta lección explica la normativa con carácter general. Para tu caso concreto, consulta con un asesor fiscal.</div>
      <footer class="lesson-foot">
        ${idx > 0 ? `<button class="btn" data-act="metodo-open" data-lesson="${list[idx - 1].id}">Anterior</button>` : '<span></span>'}
        ${idx < list.length - 1 ? `<button class="btn btn-primary" data-act="metodo-next" data-lesson="${current.id}" data-next="${list[idx + 1].id}">Siguiente lección ${icon('arrow', 15)}</button>` : `<button class="btn btn-primary" data-act="metodo-next" data-lesson="${current.id}">Terminar ${icon('check', 15)}</button>`}
      </footer>
    </article>
  </div>`;
}

function renderMetodo() {
  const st = stage();
  const p = plans().metodo;
  if (st === 'access') return `${pageHead(esc(p.name), 'Tu programa paso a paso. Las herramientas usan tus propios datos de Beneficios.')}${accessView()}`;
  let body;
  if (st === 'apply') body = applyForm();
  else if (st === 'sign') body = signForm();
  else if (st === 'pay') body = payPanel();
  else body = statusPanel(st);
  return `${pageHead(esc(p.name), 'Plazas limitadas, contrato firmado online y todo explicado paso a paso, Hacienda incluida.')}${salesHeader(st)}${body}`;
}

/* ------------------------------------------------------------ copia del contrato */

let contractCache = null;

function renderContrato() {
  const local = !session.backend;
  const c = local ? state.local.contract : contractCache;
  if (!local && !c) {
    loadContract();
    return `${pageHead('Contrato', 'Cargando la copia firmada…')}`;
  }
  if (!c) return `${pageHead('Contrato', 'Todavía no has firmado el contrato del Método.')}<a class="btn" href="#metodo">Ir al Método</a>`;
  const framed = window.self !== window.top;
  return `${pageHead('Contrato firmado', `Versión ${esc(c.version)} · firmado el ${esc(fmt.day(c.signedAt))} a las ${esc(fmt.time(c.signedAt))}`, `
    <button class="btn btn-sm" data-act="contract-copy">${icon('copy', 15)} Copiar texto</button>
    ${framed ? '' : `<button class="btn btn-sm" data-act="contract-print">${icon('doc', 15)} Imprimir o guardar PDF</button>`}`)}
  <article class="panel contract-copy">
    ${c.text.split('\n\n').map((block) => {
      const [first, ...rest] = block.split('\n');
      return `<section><h3>${esc(first)}</h3>${rest.map((l) => `<p>${esc(l)}</p>`).join('')}</section>`;
    }).join('')}
    <section class="evidence">
      <h3>Datos de la firma</h3>
      <dl>
        <dt>Firmante</dt><dd>${esc(c.signer.name)} · ${esc(c.signer.dni)}</dd>
        <dt>Correo</dt><dd>${esc(c.signer.email || '—')}</dd>
        <dt>Fecha y hora</dt><dd>${esc(new Date(c.signedAt).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }))}</dd>
        ${c.ip ? `<dt>IP</dt><dd>${esc(c.ip)}</dd>` : ''}
        <dt>Huella SHA-256</dt><dd class="hash">${esc(c.hash)}</dd>
      </dl>
      ${c.signature ? `<img class="signature" src="${esc(c.signature)}" alt="Firma de ${esc(c.signer.name)}">` : ''}
    </section>
  </article>`;
}

async function loadContract() {
  const id = state.ui.contractId || session.user?.contract?.id;
  if (!id) { contractCache = null; return; }
  try {
    const { contract } = await api.contract(id);
    contractCache = contract;
  } catch (e) {
    toast(e.message, 'warn');
    contractCache = null;
    return;
  }
  if (location.hash === '#contrato') render();
}

/* ------------------------------------------------------------ firma en pantalla */

let sigDrawn = false;

function mountSigpad() {
  const canvas = document.getElementById('sigpad');
  if (!canvas) return;
  sigDrawn = false;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  // Papel blanco: la firma se ve igual en tema claro y oscuro, y en la copia del contrato.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1b2430';
  let drawing = false;
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    sigDrawn = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const [x, y] = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function refreshMetodo() {
  const box = document.getElementById('contract-box');
  if (box) box.innerHTML = contractHTML(currentContract(), esc);
  const hint = document.getElementById('dni-hint');
  const s = state.ui.signer;
  if (hint && s) hint.innerHTML = !s.dni || validDni(s.dni) ? 'Con la letra, por ejemplo 12345678Z.' : '<span class="warn">La letra no corresponde a esos números.</span>';
  const out = document.getElementById('tax-out');
  if (out) out.innerHTML = taxOut();
}

route('metodo', {
  render: renderMetodo,
  refresh: refreshMetodo,
  mount: () => {
    mountSigpad();
    if (session.backend && session.user && !session.metodo) {
      api.metodo().then((m) => { session.metodo = m; if (location.hash === '#metodo' && stage() !== 'sign') render(); }).catch(() => {});
    }
  },
  nav: 'metodo',
});
route('contrato', { render: renderContrato, nav: 'metodo' });

/* ------------------------------------------------------------ acciones */

registerActions({
  'metodo-login': () => { state.ui.afterLogin = { plan: 'metodo' }; state.ui.accountTab = 'register'; save(); },
  'form:apply': async (form) => {
    const body = { experience: form.elements.experience.value, motivation: form.elements.motivation.value, phone: form.elements.phone.value };
    if (!session.backend) {
      state.local.application = { id: uid(), status: 'approved', ...body, createdAt: new Date().toISOString() };
      save();
      toast('Plaza reservada (vista previa). Ahora firma el contrato.', 'good');
      render();
      return;
    }
    try {
      const { application } = await api.apply(body);
      session.metodo = { ...(session.metodo || {}), application };
      await refreshSession();
      toast(application.status === 'approved' ? 'Plaza reservada. Ahora firma el contrato.' : application.status === 'waitlist' ? 'Estás en la lista de espera.' : 'Solicitud enviada.', 'good');
      render();
    } catch (e) { toast(e.message, 'warn'); }
  },
  'sig-clear': () => {
    const canvas = document.getElementById('sigpad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    sigDrawn = false;
  },
  'sign-submit': async (b) => {
    const s = state.ui.signer || {};
    const a = s.accept || {};
    const signer = signerData();
    if (String(signer.name).trim().split(/\s+/).length < 2) { toast('Escribe tu nombre y apellidos.', 'warn'); return; }
    if (!validDni(signer.dni)) { toast('Revisa el DNI o NIE: la letra no corresponde.', 'warn'); return; }
    if (String(signer.address).trim().length < 8) { toast('Escribe tu domicilio completo.', 'warn'); return; }
    if (!(a.contract && a.adult && a.info && a.waiver)) { toast('Marca las cuatro casillas para poder firmar.', 'warn'); return; }
    if (!sigDrawn) { toast('Firma dentro del recuadro.', 'warn'); return; }
    const signature = document.getElementById('sigpad').toDataURL('image/png');
    const date = new Date().toISOString();
    const signerClean = { ...signer, dni: String(signer.dni).toUpperCase().replace(/[\s-]/g, ''), name: signer.name.trim(), address: signer.address.trim() };
    const text = contractText(contractData({ site: site(), signer: signerClean, plan: plans().metodo, date }));
    const hash = await sha256Hex(text);
    b.disabled = true;
    try {
      if (session.backend) {
        const res = await api.sign({ ...signerClean, accept: a, signature, hash, date });
        session.user = res.user;
        state.ui.contractId = res.contract.id;
      } else {
        state.local.contract = { id: uid(), version: CONTRACT_VERSION, text, hash, signer: signerClean, signature, signedAt: new Date().toISOString() };
      }
      state.ui.signer = null;
      save();
      paintAccount();
      toast('Contrato firmado. Te hemos enviado una copia.', 'good');
      render();
      window.scrollTo(0, 0);
    } catch (e) {
      toast(e.message, 'warn');
      b.disabled = false;
    }
  },
  'metodo-simulate-pay': () => {
    state.settings.previewPlan = 'metodo';
    save();
    paintAccount();
    toast('Pago simulado: ya ves el Método como un cliente.', 'good');
    render();
  },
  'metodo-try-flow': () => {
    state.local.application = null;
    state.local.contract = null;
    state.settings.previewPlan = 'recurrentes';
    save();
    paintAccount();
    render();
    window.scrollTo(0, 0);
  },
  'metodo-open': (b) => { state.metodo.current = b.dataset.lesson; save(); render(); document.querySelector('.lesson')?.scrollIntoView({ block: 'start' }); },
  'metodo-next': (b) => {
    state.metodo.done[b.dataset.lesson] = true;
    if (b.dataset.next) state.metodo.current = b.dataset.next;
    save();
    render();
    document.querySelector('.lesson')?.scrollIntoView({ block: 'start' });
  },
  'open-contract': (b) => { if (b.dataset.id) state.ui.contractId = b.dataset.id; contractCache = null; save(); },
  'contract-copy': () => {
    const c = session.backend ? contractCache : state.local.contract;
    if (c) copyText(`${c.text}\nFirmado electrónicamente el ${c.signedAt}\nHuella SHA-256: ${c.hash}`);
  },
  'contract-print': () => { try { window.print(); } catch { /* sin impresión */ } },
  'fiscal-csv': (b) => exportCsv(state.bets.filter((x) => String(x.date).startsWith(b.dataset.year)), `fiscal-${b.dataset.year}`),
});

export function onCertToggle(el) {
  state.metodo.certs = { ...(state.metodo.certs || {}), [el.dataset.key]: el.checked };
  save();
}

export { download, isoDay, monthKey, n };
