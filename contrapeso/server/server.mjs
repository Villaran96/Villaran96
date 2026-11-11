// Servidor de Contrapeso: web, cuentas, suscripciones con Stripe, contrato del
// Método, panel de administración y cuotas centralizadas.
//
// Uso (Node 18 o superior, sin dependencias):
//   node server/server.mjs
// Las variables de entorno están explicadas en el README.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadConfig, ROOT } from './config.mjs';
import { openDb } from './db.mjs';
import {
  hashPassword, verifyPassword, newToken, sha256, parseCookies, cookie, validEmail, passwordProblem, rateLimiter,
} from './auth.mjs';
import {
  createCheckout, createPortal, verifyStripeSignature, applyStripeEvent, setupStripe, changeSubscription,
  setCancelAtPeriodEnd, createPromo, priceIdFor, isRecurringMetodo,
} from './billing.mjs';
import { sendMail } from './mail.mjs';
import { createOddsFeed } from './oddsfeed.mjs';
import {
  mergePlans, effectivePlan, canUse, FREE_ODDS_ROWS, PLAN_ORDER, PAID_PLANS, ACCESS_STATUSES,
} from '../js/plans.js';
import {
  contractData, contractText, sha256Hex, validDni, CONTRACT_VERSION,
} from '../js/contract.js';
import {
  DEFAULT_SITE, DEFAULT_GUIDES, DEFAULT_PROMOS, DEFAULT_LESSONS,
} from '../js/content.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SESSION_DAYS = 30;
const OFFER_KINDS = ['bet_get', 'refund', 'freebet', 'rollover', 'boost', 'other'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const httpUrl = (v) => (/^https?:\/\/[^\s]+$/i.test(String(v || '').trim()) ? String(v).trim().slice(0, 500) : '');

export async function createApp(cfg = loadConfig(), { fetchImpl = fetch, log = console.log } = {}) {
  const db = await openDb(cfg.dataDir);
  if (!db.data.content) {
    db.data.content = { guides: DEFAULT_GUIDES, promos: DEFAULT_PROMOS, lessons: DEFAULT_LESSONS };
    db.save();
  }
  const feed = createOddsFeed(cfg, { fetchImpl, log });
  const limitAuth = rateLimiter({ max: 20, windowMs: 10 * 60000 });
  const timers = [];

  const site = () => ({ ...DEFAULT_SITE, ...(db.data.settings.site || {}) });
  const plans = () => mergePlans(db.data.settings.plans || {});

  function seats() {
    const total = Number(plans().metodo.seats) || 0;
    const taken = db.data.users.filter((u) => u.role !== 'admin' && effectivePlan(u) === 'metodo').length;
    return { total, taken, left: total ? Math.max(0, total - taken) : null };
  }

  const applicationOf = (userId) => db.data.applications.filter((a) => a.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  const contractOf = (user) => (user?.contractId ? db.data.contracts.find((c) => c.id === user.contractId) : null);
  const metodoAccess = (user) => !!user && (user.role === 'admin' || (effectivePlan(user) === 'metodo' && !!contractOf(user)));

  function publicUser(u) {
    if (!u) return null;
    const c = contractOf(u);
    const a = applicationOf(u.id);
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: effectivePlan(u),
      subscribedPlan: u.plan || 'free',
      planStatus: u.planStatus || null,
      planInterval: u.planInterval || 'month',
      currentPeriodEnd: u.currentPeriodEnd || null,
      cancelAtPeriodEnd: !!u.cancelAtPeriodEnd,
      trialUsed: !!u.trialUsed,
      hasBilling: !!u.stripeCustomerId,
      createdAt: u.createdAt,
      contract: c ? { id: c.id, signedAt: c.signedAt, hash: c.hash, version: c.version } : null,
      application: a ? { id: a.id, status: a.status, createdAt: a.createdAt } : null,
    };
  }

  /* ------------------------------------------------------------ utilidades HTTP */

  function send(res, status, body, headers = {}) {
    res.writeHead(status, headers);
    res.end(body);
  }
  const json = (res, status, body, headers = {}) => send(res, status, JSON.stringify(body), { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store', ...headers });

  function readBody(req, limit) {
    return new Promise((resolveBody, reject) => {
      let size = 0;
      const chunks = [];
      req.on('data', (c) => {
        size += c.length;
        if (size > limit) {
          reject(new HttpError(413, 'Demasiados datos.'));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  async function readJson(ctx, limit = 64 * 1024) {
    const ct = String(ctx.req.headers['content-type'] || '');
    if (!ct.includes('application/json')) throw new HttpError(415, 'Se esperaba JSON.');
    const raw = await readBody(ctx.req, limit);
    try {
      const body = raw ? JSON.parse(raw) : {};
      if (!body || typeof body !== 'object') throw new Error('no es un objeto');
      return body;
    } catch {
      throw new HttpError(400, 'El cuerpo de la petición no es JSON válido.');
    }
  }

  const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  function sessionUser(req) {
    const token = parseCookies(req.headers.cookie).cp_session;
    if (!token) return { user: null, session: null };
    const h = sha256(token);
    const session = db.data.sessions.find((s) => s.hash === h && Date.parse(s.expires) > Date.now());
    const user = session ? db.data.users.find((u) => u.id === session.userId) : null;
    return { user: user || null, session: user ? session : null };
  }

  function startSession(res, user, req) {
    const { token, hash } = newToken();
    db.data.sessions.push({
      hash, userId: user.id, created: new Date().toISOString(), expires: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(), ip: ipOf(req), ua: str(req.headers['user-agent'], 300),
    });
    db.save();
    res.setHeader('Set-Cookie', cookie('cp_session', token, { maxAge: SESSION_DAYS * 86400, secure: cfg.cookieSecure }));
  }

  const requireUser = (ctx) => {
    if (!ctx.user) throw new HttpError(401, 'Inicia sesión para continuar.');
    return ctx.user;
  };
  const requireAdmin = (ctx) => {
    const u = requireUser(ctx);
    if (u.role !== 'admin') throw new HttpError(403, 'Solo para administradores.');
    return u;
  };

  /* ------------------------------------------------------------ rutas */

  const routes = [];
  const route = (method, path, fn) => routes.push({ method, parts: path.split('/'), fn });

  route('GET', '/api/health', () => ({
    ok: true, odds: feed.configured(), updated: feed.get().updated, events: feed.get().events.length, payments: !!cfg.stripe.secretKey,
  }));

  route('GET', '/api/config', (ctx) => ({
    backend: true,
    plans: plans(),
    seats: seats(),
    site: site(),
    payments: !!cfg.stripe.secretKey,
    metodoRecurring: isRecurringMetodo(cfg),
    odds: { configured: feed.configured(), betfair: feed.hasBetfair },
    user: publicUser(ctx.user),
  }));

  const webhookSecret = () => cfg.stripe.webhookSecret || db.data.settings.stripe?.webhook?.secret || '';
  const hasActiveSub = (u) => !!u.stripeSubscriptionId && ACCESS_STATUSES.has(u.planStatus);

  async function notify(user, notice) {
    if (!user || !notice) return;
    const p = plans()[user.plan];
    const until = user.currentPeriodEnd ? ` hasta el ${new Date(user.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : ' hasta el final del periodo pagado';
    const how = user.planInterval === 'year' ? 'con pago anual' : 'con pago mensual';
    const texts = {
      activated: [`Tu plan ${p?.name || ''} ya está activo`, `Ya tienes acceso a todo lo del plan ${p?.name || ''}. Entra en ${cfg.siteUrl} y empieza por el siguiente paso de tus bonos.`],
      changed: [`Has cambiado al plan ${p?.name || ''}`, `Tu suscripción ahora es del plan ${p?.name || ''} ${how}. Stripe ajusta lo que pagas de forma proporcional al tiempo que queda del periodo.`],
      cancel_scheduled: ['Has cancelado tu suscripción', `No se te cobrará más. Sigues teniendo acceso al plan ${p?.name || ''}${until}. Si cambias de idea, reactívala desde ${cfg.siteUrl}/#cuenta antes de esa fecha.`],
      resumed: ['Tu suscripción sigue activa', `Has reactivado tu plan ${p?.name || ''}. Todo sigue como antes y se renovará en la fecha habitual.`],
      canceled: ['Tu suscripción ha terminado', `Tu suscripción ha terminado y tu cuenta vuelve al plan gratuito. Tus bonos y beneficios siguen guardados. Puedes volver cuando quieras en ${cfg.siteUrl}/#planes`],
      trial_end: ['Tu prueba gratis termina pronto', `En unos días termina tu prueba y se hará el primer cobro. Si no quieres seguir, cancela desde ${cfg.siteUrl}/#cuenta antes de esa fecha.`],
      payment_failed: ['No hemos podido cobrar tu suscripción', `El último cobro ha fallado. Actualiza tu tarjeta en ${cfg.siteUrl}/#cuenta → Gestionar pago para no perder el acceso.`],
    }[notice];
    if (texts) await sendMail(cfg, { to: user.email, subject: texts[0], text: texts[1] }, fetchImpl).catch(() => {});
  }

  /* ------ cuentas */

  route('POST', '/api/auth/register', async (ctx) => {
    if (!limitAuth(`reg:${ipOf(ctx.req)}`)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
    const b = await readJson(ctx);
    const email = str(b.email).toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, 'Escribe un correo electrónico válido.');
    const problem = passwordProblem(b.password);
    if (problem) throw new HttpError(400, problem);
    if (b.adult !== true) throw new HttpError(400, 'Tienes que confirmar que eres mayor de 18 años.');
    if (b.terms !== true) throw new HttpError(400, 'Tienes que aceptar las condiciones y la política de privacidad.');
    if (db.data.users.some((u) => u.email === email)) throw new HttpError(409, 'Ya hay una cuenta con ese correo. Inicia sesión.');
    const now = new Date().toISOString();
    const user = {
      id: randomUUID(),
      email,
      name: str(b.name, 80) || email.split('@')[0],
      passwordHash: await hashPassword(b.password),
      role: cfg.adminEmails.includes(email) ? 'admin' : 'user',
      plan: 'free',
      planStatus: null,
      createdAt: now,
      adultConfirmedAt: now,
      termsAcceptedAt: now,
    };
    db.data.users.push(user);
    startSession(ctx.res, user, ctx.req);
    sendMail(cfg, { to: email, subject: `Bienvenida a ${site().brand}`, text: `Tu cuenta de ${site().brand} está lista. Entra en ${cfg.siteUrl} para empezar con la guía paso a paso.` }, fetchImpl).catch(() => {});
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/login', async (ctx) => {
    if (!limitAuth(`login:${ipOf(ctx.req)}`)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
    const b = await readJson(ctx);
    const email = str(b.email).toLowerCase();
    const user = db.data.users.find((u) => u.email === email);
    const ok = user && await verifyPassword(String(b.password || ''), user.passwordHash);
    if (!ok) throw new HttpError(401, 'Correo o contraseña incorrectos.');
    if (cfg.adminEmails.includes(email) && user.role !== 'admin') user.role = 'admin';
    startSession(ctx.res, user, ctx.req);
    return { user: publicUser(user) };
  });

  route('POST', '/api/auth/logout', (ctx) => {
    if (ctx.session) {
      db.data.sessions = db.data.sessions.filter((s) => s !== ctx.session);
      db.save();
    }
    ctx.res.setHeader('Set-Cookie', cookie('cp_session', '', { maxAge: 0, secure: cfg.cookieSecure }));
    return { ok: true };
  });

  route('GET', '/api/auth/me', (ctx) => ({ user: publicUser(ctx.user) }));

  route('POST', '/api/auth/forgot', async (ctx) => {
    if (!limitAuth(`forgot:${ipOf(ctx.req)}`)) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
    const b = await readJson(ctx);
    const user = db.data.users.find((u) => u.email === str(b.email).toLowerCase());
    if (user) {
      const { token, hash } = newToken();
      db.data.resets = db.data.resets.filter((r) => r.userId !== user.id && Date.parse(r.expires) > Date.now());
      db.data.resets.push({ hash, userId: user.id, expires: new Date(Date.now() + 3600000).toISOString() });
      db.save();
      const link = `${cfg.siteUrl}/?token=${token}#restablecer`;
      await sendMail(cfg, { to: user.email, subject: 'Cambia tu contraseña', text: `Para elegir una contraseña nueva, abre este enlace en la próxima hora:\n${link}\n\nSi no lo has pedido tú, ignora este correo.` }, fetchImpl);
    }
    return { ok: true };
  });

  route('POST', '/api/auth/reset', async (ctx) => {
    const b = await readJson(ctx);
    const problem = passwordProblem(b.password);
    if (problem) throw new HttpError(400, problem);
    const h = sha256(String(b.token || ''));
    const reset = db.data.resets.find((r) => r.hash === h && Date.parse(r.expires) > Date.now());
    if (!reset) throw new HttpError(400, 'El enlace ha caducado o ya se ha usado. Pide otro.');
    const user = db.data.users.find((u) => u.id === reset.userId);
    if (!user) throw new HttpError(400, 'El enlace no es válido.');
    user.passwordHash = await hashPassword(b.password);
    db.data.resets = db.data.resets.filter((r) => r.userId !== user.id);
    db.data.sessions = db.data.sessions.filter((s) => s.userId !== user.id);
    startSession(ctx.res, user, ctx.req);
    return { user: publicUser(user) };
  });

  route('PATCH', '/api/me', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx);
    if (b.name != null) user.name = str(b.name, 80) || user.name;
    db.save();
    return { user: publicUser(user) };
  });

  route('POST', '/api/me/password', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx);
    if (!await verifyPassword(String(b.current || ''), user.passwordHash)) throw new HttpError(400, 'La contraseña actual no es correcta.');
    const problem = passwordProblem(b.next);
    if (problem) throw new HttpError(400, problem);
    user.passwordHash = await hashPassword(b.next);
    db.data.sessions = db.data.sessions.filter((s) => s.userId !== user.id || s === ctx.session);
    db.save();
    return { ok: true };
  });

  route('DELETE', '/api/me', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx);
    if (!await verifyPassword(String(b.password || ''), user.passwordHash)) throw new HttpError(400, 'La contraseña no es correcta.');
    if (user.stripeSubscriptionId && ['active', 'trialing', 'past_due'].includes(user.planStatus)) {
      throw new HttpError(409, 'Cancela primero tu suscripción desde «Gestionar pago».');
    }
    db.data.users = db.data.users.filter((u) => u.id !== user.id);
    db.data.sessions = db.data.sessions.filter((s) => s.userId !== user.id);
    delete db.data.userData[user.id];
    // Los contratos firmados se conservan como prueba durante los plazos legales.
    db.save();
    ctx.res.setHeader('Set-Cookie', cookie('cp_session', '', { maxAge: 0, secure: cfg.cookieSecure }));
    return { ok: true };
  });

  route('GET', '/api/me/data', (ctx) => ({ data: db.data.userData[requireUser(ctx).id] || null }));

  route('PUT', '/api/me/data', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx, 2 * 1024 * 1024);
    const data = {
      bets: Array.isArray(b.bets) ? b.bets.slice(0, 20000) : [],
      offers: Array.isArray(b.offers) ? b.offers.slice(0, 2000) : [],
      settings: b.settings && typeof b.settings === 'object' ? b.settings : {},
      guide: b.guide && typeof b.guide === 'object' ? b.guide : {},
      updatedAt: new Date().toISOString(),
    };
    db.data.userData[user.id] = data;
    db.save();
    return { ok: true, updatedAt: data.updatedAt };
  });

  /* ------ cuotas y contenido */

  route('GET', '/api/odds', async (ctx) => {
    if (!feed.configured()) throw new HttpError(503, 'El servidor no tiene ninguna fuente de cuotas configurada.');
    if (!feed.get().updated) await feed.refresh();
    const plan = effectivePlan(ctx.user);
    return { ...feed.forPlan(canUse(plan, 'odds.full'), FREE_ODDS_ROWS), plan, betfairTemplate: site().betfairTemplate || cfg.betfair.linkTemplate };
  });

  route('GET', '/api/content', (ctx) => {
    const plan = effectivePlan(ctx.user);
    const { guides, promos, lessons } = db.data.content;
    const active = (list) => list.filter((x) => x.active !== false);
    const teaser = (x) => ({ id: x.id, bookie: x.bookie, kind: x.kind, title: x.title, locked: true });
    const guidesOk = canUse(plan, 'guides.welcome');
    const promosOk = canUse(plan, 'promos.recurring');
    const metodoOk = metodoAccess(ctx.user);
    return {
      guides: active(guides).map((g) => (guidesOk ? g : teaser(g))),
      promos: active(promos).map((p) => (promosOk ? p : teaser(p))),
      lessons: lessons.map((l) => (metodoOk ? l : { id: l.id, title: l.title, minutes: l.minutes, locked: true })),
      access: { guides: guidesOk, promos: promosOk, metodo: metodoOk },
    };
  });

  /* ------ pagos */

  route('POST', '/api/billing/checkout', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx);
    const planId = str(b.plan);
    const interval = b.interval === 'year' ? 'year' : 'month';
    if (!PAID_PLANS.includes(planId)) throw new HttpError(400, 'Plan desconocido.');
    if (planId === 'metodo') {
      const p = plans().metodo;
      const app = applicationOf(user.id);
      if (p.requiresApproval && app?.status !== 'approved') throw new HttpError(409, 'Tu solicitud del Método aún no está aprobada.');
      if (!contractOf(user)) throw new HttpError(409, 'Firma el contrato antes de pagar.');
      if (effectivePlan(user) !== 'metodo' && seats().left === 0) throw new HttpError(409, 'No quedan plazas del Método. Te avisaremos cuando se libere una.');
    }
    const recurring = planId !== 'metodo' || isRecurringMetodo(cfg);
    if (recurring && hasActiveSub(user)) {
      // Ya paga una suscripción: se cambia de plan en la misma, con prorrateo.
      if (user.plan === planId && (user.planInterval || 'month') === interval && !user.cancelAtPeriodEnd) throw new HttpError(409, 'Ya tienes este plan.');
      const priceId = priceIdFor(cfg, db.data.settings, planId, interval);
      if (!priceId) throw new HttpError(409, 'Ese plan todavía no tiene precio en Stripe.');
      await changeSubscription({ cfg, user, priceId, planId, interval, fetchImpl });
      user.plan = planId;
      user.planInterval = interval;
      user.cancelAtPeriodEnd = false;
      db.save();
      await notify(user, 'changed');
      return { changed: true, user: publicUser(user) };
    }
    return { url: await createCheckout({ cfg, settings: db.data.settings, user, planId, interval, plans: plans(), fetchImpl }) };
  });

  route('POST', '/api/billing/cancel', async (ctx) => {
    const user = requireUser(ctx);
    if (!hasActiveSub(user)) throw new HttpError(409, 'No tienes ninguna suscripción activa.');
    await setCancelAtPeriodEnd({ cfg, user, cancel: true, fetchImpl });
    user.cancelAtPeriodEnd = true;
    db.save();
    await notify(user, 'cancel_scheduled');
    return { user: publicUser(user) };
  });

  route('POST', '/api/billing/resume', async (ctx) => {
    const user = requireUser(ctx);
    if (!hasActiveSub(user)) throw new HttpError(409, 'No tienes ninguna suscripción activa.');
    await setCancelAtPeriodEnd({ cfg, user, cancel: false, fetchImpl });
    user.cancelAtPeriodEnd = false;
    db.save();
    await notify(user, 'resumed');
    return { user: publicUser(user) };
  });

  route('POST', '/api/billing/portal', async (ctx) => ({ url: await createPortal({ cfg, user: requireUser(ctx), fetchImpl }) }));

  route('POST', '/api/stripe/webhook', async (ctx) => {
    const raw = await readBody(ctx.req, 1024 * 1024);
    let event;
    try {
      event = verifyStripeSignature(raw, ctx.req.headers['stripe-signature'], webhookSecret());
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    const { user, notice } = applyStripeEvent(db, cfg, event);
    if (user) {
      log(`[stripe] ${event.type} · ${user.email} · plan ${user.plan} (${user.planStatus})`);
      await notify(user, notice);
    }
    return { received: true };
  });

  /* ------ Método */

  route('GET', '/api/metodo', (ctx) => {
    const user = ctx.user;
    return {
      seats: seats(),
      plan: plans().metodo,
      application: user ? applicationOf(user.id) : null,
      contract: user && contractOf(user) ? { id: user.contractId, signedAt: contractOf(user).signedAt, hash: contractOf(user).hash } : null,
      access: metodoAccess(user),
    };
  });

  route('POST', '/api/metodo/apply', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx);
    const prev = applicationOf(user.id);
    if (prev && prev.status !== 'rejected') return { application: prev };
    const p = plans().metodo;
    const status = seats().left === 0 ? 'waitlist' : p.requiresApproval ? 'pending' : 'approved';
    const app = {
      id: randomUUID(),
      userId: user.id,
      email: user.email,
      status,
      phone: str(b.phone, 30),
      experience: str(b.experience, 2000),
      motivation: str(b.motivation, 2000),
      createdAt: new Date().toISOString(),
    };
    db.data.applications.push(app);
    db.save();
    if (site().email) {
      sendMail(cfg, { to: site().email, subject: `Nueva solicitud del Método: ${user.email}`, text: `Estado: ${status}\nExperiencia: ${app.experience}\nMotivo: ${app.motivation}\nTeléfono: ${app.phone}` }, fetchImpl).catch(() => {});
    }
    return { application: app };
  });

  route('POST', '/api/metodo/sign', async (ctx) => {
    const user = requireUser(ctx);
    const b = await readJson(ctx, 600 * 1024);
    const p = plans().metodo;
    let app = applicationOf(user.id);
    if (!app && !p.requiresApproval) {
      app = { id: randomUUID(), userId: user.id, email: user.email, status: seats().left === 0 ? 'waitlist' : 'approved', createdAt: new Date().toISOString() };
      db.data.applications.push(app);
    }
    if (!app || app.status !== 'approved') throw new HttpError(409, 'Tu plaza del Método aún no está aprobada.');
    const name = str(b.name, 120);
    const dni = str(b.dni, 12).toUpperCase().replace(/[\s-]/g, '');
    const address = str(b.address, 200);
    if (name.split(/\s+/).length < 2) throw new HttpError(400, 'Escribe tu nombre y apellidos.');
    if (!validDni(dni)) throw new HttpError(400, 'El DNI o NIE no es válido. Revisa los números y la letra.');
    if (address.length < 8) throw new HttpError(400, 'Escribe tu domicilio completo.');
    const acc = b.accept || {};
    if (!(acc.contract && acc.adult && acc.waiver && acc.info)) throw new HttpError(400, 'Tienes que marcar todas las casillas para firmar.');
    const signature = String(b.signature || '');
    if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 500 * 1024) throw new HttpError(400, 'Firma en el recuadro antes de enviar.');
    const date = new Date(b.date || Date.now());
    if (!Number.isFinite(date.getTime()) || Math.abs(Date.now() - date.getTime()) > 86400000) throw new HttpError(400, 'La fecha del contrato no es válida. Recarga la página.');
    const text = contractText(contractData({ site: site(), signer: { name, dni, address, email: user.email }, plan: p, date }));
    const hash = await sha256Hex(text);
    if (hash !== b.hash) throw new HttpError(409, 'El texto del contrato ha cambiado mientras lo leías. Recarga la página y vuelve a firmar.');
    const record = {
      id: randomUUID(),
      userId: user.id,
      version: CONTRACT_VERSION,
      text,
      hash,
      signer: { name, dni, address, email: user.email },
      accepted: { contract: true, adult: true, waiver: true, info: true },
      signature,
      ip: ipOf(ctx.req),
      userAgent: str(ctx.req.headers['user-agent'], 300),
      signedAt: new Date().toISOString(),
    };
    db.data.contracts.push(record);
    user.contractId = record.id;
    db.save();
    try {
      await sendMail(cfg, { to: user.email, subject: 'Copia de tu contrato del Método', text: `${text}\n\nFirmado electrónicamente el ${record.signedAt}.\nHuella SHA-256: ${hash}` }, fetchImpl);
    } catch (e) {
      log(`[correo] no se pudo enviar la copia del contrato: ${e.message}`);
    }
    return { contract: { id: record.id, signedAt: record.signedAt, hash, version: record.version }, user: publicUser(user) };
  });

  route('GET', '/api/contracts/:id', (ctx) => {
    const user = requireUser(ctx);
    const c = db.data.contracts.find((x) => x.id === ctx.params.id);
    if (!c || (c.userId !== user.id && user.role !== 'admin')) throw new HttpError(404, 'Contrato no encontrado.');
    return { contract: c };
  });

  /* ------ administración */

  route('GET', '/api/admin/overview', (ctx) => {
    requireAdmin(ctx);
    const odds = feed.get();
    return {
      users: db.data.users.map((u) => ({ ...publicUser(u), stripeCustomerId: u.stripeCustomerId || null })),
      applications: db.data.applications,
      contracts: db.data.contracts.map((c) => ({
        id: c.id, userId: c.userId, signer: { ...c.signer, dni: `${c.signer.dni.slice(0, 3)}•••${c.signer.dni.slice(-2)}` }, signedAt: c.signedAt, hash: c.hash, version: c.version, ip: c.ip,
      })),
      content: db.data.content,
      settings: { plans: plans(), site: site() },
      seats: seats(),
      odds: {
        configured: feed.configured(), betfair: feed.hasBetfair, updated: odds.updated, events: odds.events.length, remaining: odds.remaining, sources: odds.sources, errors: odds.errors,
      },
      payments: {
        configured: !!cfg.stripe.secretKey,
        webhook: !!webhookSecret(),
        webhookFrom: cfg.stripe.webhookSecret ? 'env' : db.data.settings.stripe?.webhook ? 'panel' : null,
        prices: Object.fromEntries(PAID_PLANS.map((id) => [id, { month: !!priceIdFor(cfg, db.data.settings, id, 'month'), year: !!priceIdFor(cfg, db.data.settings, id, 'year') }])),
        syncedAt: db.data.settings.stripe?.syncedAt || null,
        coupons: db.data.settings.stripe?.coupons || [],
        recurringMetodo: isRecurringMetodo(cfg),
      },
    };
  });

  const cleanParams = (p) => Object.fromEntries(Object.entries(p && typeof p === 'object' ? p : {}).slice(0, 20).map(([k, v]) => [str(k, 30), typeof v === 'number' ? v : str(v, 40)]));

  route('PUT', '/api/admin/content/:kind', async (ctx) => {
    requireAdmin(ctx);
    const kind = ctx.params.kind;
    if (!['guides', 'promos', 'lessons'].includes(kind)) throw new HttpError(404, 'Tipo de contenido desconocido.');
    const b = await readJson(ctx, 1024 * 1024);
    if (!Array.isArray(b.items)) throw new HttpError(400, 'Faltan los elementos.');
    const items = b.items.slice(0, 300).map((x) => {
      const id = str(x.id, 60) || randomUUID();
      if (kind === 'lessons') return { id, title: str(x.title, 140), minutes: Math.max(1, Math.min(120, Number(x.minutes) || 5)), body: str(x.body, 60000) };
      return {
        id,
        bookie: str(x.bookie, 60),
        kind: OFFER_KINDS.includes(x.kind) ? x.kind : 'other',
        title: str(x.title, 160),
        params: cleanParams(x.params),
        conditions: str(x.conditions, 3000),
        howto: kind === 'guides' ? str(x.howto, 20000) : undefined,
        reviewed: /^\d{4}-\d{2}$/.test(x.reviewed || '') ? x.reviewed : undefined,
        url: httpUrl(x.url),
        schedule: kind === 'promos' ? str(x.schedule, 80) : undefined,
        days: kind === 'promos' && Array.isArray(x.days) ? [...new Set(x.days.map(Number).filter((d) => d >= 0 && d <= 6))] : undefined,
        validUntil: kind === 'promos' && /^\d{4}-\d{2}-\d{2}$/.test(x.validUntil || '') ? x.validUntil : undefined,
        active: x.active !== false,
        example: !!x.example,
        updatedAt: new Date().toISOString(),
      };
    });
    db.data.content[kind] = items;
    db.save();
    return { items };
  });

  route('PUT', '/api/admin/settings', async (ctx) => {
    requireAdmin(ctx);
    const b = await readJson(ctx, 256 * 1024);
    if (b.plans && typeof b.plans === 'object') {
      const out = {};
      for (const id of PLAN_ORDER) {
        const p = b.plans[id];
        if (!p) continue;
        out[id] = {
          name: str(p.name, 40),
          price: Math.max(0, Number(p.price) || 0),
          priceYear: Math.max(0, Number(p.priceYear) || 0),
          interval: ['month', 'year', 'once'].includes(p.interval) ? p.interval : 'month',
          trialDays: Math.max(0, Math.min(60, Number(p.trialDays) || 0)),
          seats: Math.max(0, Math.min(100000, Number(p.seats) || 0)),
          tagline: str(p.tagline, 160),
          features: Array.isArray(p.features) ? p.features.map((f) => str(f, 160)).filter(Boolean).slice(0, 12) : undefined,
          highlight: !!p.highlight,
          requiresApproval: !!p.requiresApproval,
          requiresContract: id === 'metodo',
        };
      }
      db.data.settings.plans = out;
    }
    if (b.site && typeof b.site === 'object') {
      const s = b.site;
      db.data.settings.site = {
        brand: str(s.brand, 60) || DEFAULT_SITE.brand,
        legalName: str(s.legalName, 160),
        nif: str(s.nif, 20),
        address: str(s.address, 200),
        email: str(s.email, 120),
        supportUrl: httpUrl(s.supportUrl),
        betfairTemplate: /^https:\/\/[^\s]*\{marketId\}/.test(String(s.betfairTemplate || '')) ? str(s.betfairTemplate, 300) : DEFAULT_SITE.betfairTemplate,
        contractReviewed: !!s.contractReviewed,
      };
    }
    let log = [];
    if (b.plans && cfg.stripe.secretKey && db.data.settings.stripe?.syncedAt) {
      // Si los precios ya estaban en Stripe, se crean los nuevos importes.
      const res = await setupStripe({ cfg, settings: db.data.settings, plans: plans(), brand: site().brand, fetchImpl, withWebhook: false });
      db.data.settings.stripe = res.stripe;
      log = res.log;
    }
    db.save();
    return { settings: { plans: plans(), site: site() }, log };
  });

  route('POST', '/api/admin/stripe/setup', async (ctx) => {
    requireAdmin(ctx);
    const res = await setupStripe({ cfg, settings: db.data.settings, plans: plans(), brand: site().brand, fetchImpl });
    db.data.settings.stripe = { ...res.stripe, coupons: db.data.settings.stripe?.coupons || [] };
    db.save();
    return { log: res.log.length ? res.log : ['Todo estaba ya creado en Stripe.'], syncedAt: res.stripe.syncedAt };
  });

  route('POST', '/api/admin/stripe/coupon', async (ctx) => {
    requireAdmin(ctx);
    const b = await readJson(ctx);
    const code = str(b.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const percent = Number(b.percent);
    const duration = ['once', 'repeating', 'forever'].includes(b.duration) ? b.duration : 'once';
    const months = Math.max(1, Math.min(36, Number(b.months) || 1));
    if (code.length < 3) throw new HttpError(400, 'El código tiene que tener al menos 3 letras o números.');
    if (!(percent > 0 && percent <= 100)) throw new HttpError(400, 'El descuento tiene que estar entre 1 y 100 %.');
    const promo = await createPromo({
      cfg, code, percent, duration, months, maxRedemptions: Math.max(0, Number(b.maxRedemptions) || 0), fetchImpl,
    });
    db.data.settings.stripe = { ...(db.data.settings.stripe || {}), coupons: [...(db.data.settings.stripe?.coupons || []), promo] };
    db.save();
    return { coupon: promo };
  });

  route('PATCH', '/api/admin/users/:id', async (ctx) => {
    const admin = requireAdmin(ctx);
    const b = await readJson(ctx);
    const user = db.data.users.find((u) => u.id === ctx.params.id);
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');
    if (b.plan != null) {
      if (!PLAN_ORDER.includes(b.plan)) throw new HttpError(400, 'Plan desconocido.');
      user.plan = b.plan;
      user.planStatus = b.plan === 'free' ? null : (b.planStatus || 'active');
      user.manualPlanBy = admin.email;
    }
    if (b.role != null && ['user', 'admin'].includes(b.role) && user.id !== admin.id) user.role = b.role;
    db.save();
    return { user: publicUser(user) };
  });

  route('PATCH', '/api/admin/applications/:id', async (ctx) => {
    requireAdmin(ctx);
    const b = await readJson(ctx);
    const app = db.data.applications.find((a) => a.id === ctx.params.id);
    if (!app) throw new HttpError(404, 'Solicitud no encontrada.');
    if (!['pending', 'approved', 'rejected', 'waitlist'].includes(b.status)) throw new HttpError(400, 'Estado desconocido.');
    app.status = b.status;
    app.reviewedAt = new Date().toISOString();
    db.save();
    if (b.status === 'approved') {
      sendMail(cfg, { to: app.email, subject: 'Tu plaza del Método está aprobada', text: `Ya puedes firmar el contrato y activar el Método en ${cfg.siteUrl}/#metodo` }, fetchImpl).catch(() => {});
    }
    return { application: app };
  });

  /* ------------------------------------------------------------ despacho */

  async function api(req, res, url) {
    const parts = url.pathname.split('/');
    const match = routes.find((r) => r.method === req.method && r.parts.length === parts.length && r.parts.every((p, i) => p.startsWith(':') || p === parts[i]));
    if (!match) {
      const exists = routes.some((r) => r.parts.length === parts.length && r.parts.every((p, i) => p.startsWith(':') || p === parts[i]));
      throw new HttpError(exists ? 405 : 404, exists ? 'Método no permitido.' : 'Ruta no encontrada.');
    }
    // Las peticiones que cambian datos solo se aceptan desde la propia web.
    if (req.method !== 'GET' && url.pathname !== '/api/stripe/webhook') {
      const origin = req.headers.origin;
      if (origin && origin !== cfg.siteUrl && new URL(origin).host !== req.headers.host && origin !== cfg.allowOrigin) {
        throw new HttpError(403, 'Origen no permitido.');
      }
    }
    const params = {};
    match.parts.forEach((p, i) => { if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(parts[i]); });
    const { user, session } = sessionUser(req);
    const ctx = { req, res, url, params, user, session };
    const result = await match.fn(ctx);
    const headers = cfg.allowOrigin ? { 'Access-Control-Allow-Origin': cfg.allowOrigin, Vary: 'Origin' } : {};
    json(res, 200, result, headers);
  }

  async function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Método no permitido');
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Ruta no válida'); }
    if (path === '/') path = '/index.html';
    // Solo se sirve la web: index.html, estilos, scripts del navegador y recursos.
    if (!/^\/(index\.html|css\/[\w.-]+\.css|js\/[\w./-]+\.js|assets\/[\w./-]+)$/.test(path) || path.includes('..')) {
      return send(res, 404, 'No encontrado');
    }
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT) || resolve(file).startsWith(resolve(cfg.dataDir))) return send(res, 404, 'No encontrado');
    try {
      const info = await stat(file);
      if (!info.isFile()) throw new Error('no es un archivo');
      const body = await readFile(file);
      const type = TYPES[extname(file)] || 'application/octet-stream';
      const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache' };
      if (type.startsWith('text/html')) {
        headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.the-odds-api.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
      }
      return send(res, 200, req.method === 'HEAD' ? '' : body, headers);
    } catch {
      return send(res, 404, 'No encontrado');
    }
  }

  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (cfg.cookieSecure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return await serveStatic(req, res, url);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) log(`[error] ${req.method} ${req.url}: ${e.stack || e.message}`);
      if (!res.headersSent) json(res, status, { error: status === 500 ? 'Ha fallado algo en el servidor. Inténtalo de nuevo.' : e.message });
      else res.end();
    }
  }

  const server = createServer(handler);

  function cleanup() {
    const now = Date.now();
    db.data.sessions = db.data.sessions.filter((s) => Date.parse(s.expires) > now);
    db.data.resets = db.data.resets.filter((r) => Date.parse(r.expires) > now);
    db.save();
  }

  return {
    server,
    db,
    feed,
    cfg,
    listen(port = cfg.port) {
      return new Promise((ok) => server.listen(port, () => {
        if (feed.configured()) {
          feed.refresh();
          timers.push(setInterval(() => feed.refresh(), cfg.odds.refreshMinutes * 60000));
        }
        timers.push(setInterval(cleanup, 6 * 3600000));
        timers.forEach((t) => t.unref?.());
        ok(server.address().port);
      }));
    },
    async close() {
      timers.forEach(clearInterval);
      await new Promise((ok) => server.close(ok));
      await db.flush();
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = loadConfig();
  const app = await createApp(cfg);
  const port = await app.listen();
  console.log(`Contrapeso en http://localhost:${port} (${cfg.siteUrl})`);
  console.log(`Cuotas: ${app.feed.configured() ? `${cfg.odds.key ? 'The Odds API' : ''}${app.feed.hasBetfair ? ' + Betfair.es' : ''}` : 'sin fuente (la web usa la demostración)'}`);
  console.log(`Pagos: ${cfg.stripe.secretKey ? 'Stripe activado' : 'sin configurar (STRIPE_SECRET_KEY)'}`);
  if (!cfg.adminEmails.length) console.log('Aviso: define ADMIN_EMAILS con tu correo para entrar en el panel de administración.');
}
