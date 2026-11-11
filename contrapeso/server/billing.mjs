// Cobros con Stripe: alta de productos y precios, Checkout, cambio de plan con
// prorrateo, cancelación, códigos de descuento, portal del cliente y webhook.
// Se usa la API REST de Stripe directamente (sin dependencias) con una versión fija.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { PAID_PLANS, planPrice, ACCESS_STATUSES } from '../js/plans.js';

export const STRIPE_VERSION = '2024-06-20';

export const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_failed',
];

/** Codifica objetos anidados como los espera Stripe: a[b][0][c]=v. */
export function stripeForm(obj, prefix = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? stripeForm(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') stripeForm(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripeRequest(cfg, path, params = {}, fetchImpl = fetch, method = 'POST') {
  if (!cfg.stripe.secretKey) throw new Error('Los pagos no están configurados (falta STRIPE_SECRET_KEY).');
  const query = method === 'GET' && Object.keys(params).length ? `?${stripeForm(params).toString()}` : '';
  const res = await fetchImpl(`${cfg.stripe.apiBase}${path}${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_VERSION,
    },
    body: method === 'GET' ? undefined : stripeForm(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || `Stripe respondió ${res.status}`);
  return body;
}

/* ------------------------------------------------------------ precios */

const envPrice = (cfg, planId, interval) => (interval === 'year' ? cfg.stripe.pricesYear?.[planId] : cfg.stripe.prices?.[planId]) || '';

/** Identificador del precio de Stripe de un plan: el creado desde el panel o el de las variables. */
export function priceIdFor(cfg, settings, planId, interval = 'month') {
  return settings?.stripe?.prices?.[planId]?.[interval]?.id || envPrice(cfg, planId, interval) || '';
}

/**
 * Plan y periodicidad a partir de un precio de Stripe. Reconoce también los precios
 * antiguos (si el administrador cambió el importe) y los de las variables de entorno.
 */
export function planFromPrice(cfg, settings, priceId) {
  if (!priceId) return null;
  const indexed = settings?.stripe?.priceIndex?.[priceId];
  if (indexed) return indexed;
  for (const planId of PAID_PLANS) {
    for (const interval of ['month', 'year']) {
      if (priceIdFor(cfg, settings, planId, interval) === priceId || envPrice(cfg, planId, interval) === priceId) return { plan: planId, interval };
    }
  }
  return null;
}

export const isRecurringMetodo = (cfg) => cfg.stripe.metodoMode !== 'payment';

/**
 * Crea en Stripe lo que falte: un producto por plan de pago, sus precios (mensual
 * y anual, IVA incluido) y el webhook. Si el administrador ha cambiado un precio,
 * crea uno nuevo: quien ya está suscrito sigue con el anterior.
 */
export async function setupStripe({ cfg, settings = {}, plans, brand = 'Contrapeso', fetchImpl = fetch, withWebhook = true }) {
  const st = JSON.parse(JSON.stringify(settings.stripe || {}));
  st.products ||= {};
  st.prices ||= {};
  st.priceIndex ||= {};
  const log = [];
  for (const id of PAID_PLANS) {
    const p = plans[id];
    if (!st.products[id]) {
      const prod = await stripeRequest(cfg, '/products', { name: `${brand} · ${p.name}`, metadata: { plan: id } }, fetchImpl);
      st.products[id] = prod.id;
      log.push(`Producto «${p.name}» creado`);
    }
    st.prices[id] ||= {};
    const recurring = id !== 'metodo' || isRecurringMetodo(cfg);
    const wanted = [['month', planPrice(p, 'month')]];
    if (recurring && Number(p.priceYear) > 0) wanted.push(['year', planPrice(p, 'year')]);
    for (const [interval, amount] of wanted) {
      const cents = Math.round(amount * 100);
      if (!(cents > 0)) continue;
      const cur = st.prices[id][interval];
      if (cur && cur.amount === cents && cur.recurring === recurring) continue;
      const params = {
        product: st.products[id], currency: 'eur', unit_amount: cents, tax_behavior: 'inclusive', metadata: { plan: id, interval },
      };
      if (recurring) params.recurring = { interval };
      const price = await stripeRequest(cfg, '/prices', params, fetchImpl);
      st.prices[id][interval] = { id: price.id, amount: cents, recurring };
      st.priceIndex[price.id] = { plan: id, interval };
      log.push(`Precio «${p.name}» ${recurring ? (interval === 'year' ? 'anual' : 'mensual') : 'de pago único'}: ${amount.toLocaleString('es-ES', { maximumFractionDigits: 2 })} €`);
    }
  }
  if (withWebhook && !cfg.stripe.webhookSecret && !st.webhook?.secret) {
    if (!cfg.siteUrl.startsWith('https://')) {
      log.push('El webhook no se ha creado: necesita la dirección pública con https (variable SITE_URL).');
    } else {
      const wh = await stripeRequest(cfg, '/webhook_endpoints', {
        url: `${cfg.siteUrl}/api/stripe/webhook`, enabled_events: WEBHOOK_EVENTS, api_version: STRIPE_VERSION, description: brand,
      }, fetchImpl);
      st.webhook = { id: wh.id, secret: wh.secret, url: wh.url };
      log.push('Webhook creado');
    }
  }
  st.syncedAt = new Date().toISOString();
  return { stripe: st, log };
}

/* ------------------------------------------------------------ suscripción */

export async function createCheckout({
  cfg, settings, user, planId, interval = 'month', plans, fetchImpl,
}) {
  const price = priceIdFor(cfg, settings, planId, interval);
  if (!price) throw new Error(`El plan ${plans[planId]?.name || planId} todavía no tiene precio en Stripe. En Administración → Pagos pulsa «Conectar con Stripe».`);
  const mode = planId === 'metodo' && !isRecurringMetodo(cfg) ? 'payment' : 'subscription';
  const meta = { userId: user.id, plan: planId, interval };
  const params = {
    mode,
    line_items: [{ price, quantity: 1 }],
    success_url: `${cfg.siteUrl}/?pago=ok#cuenta`,
    cancel_url: `${cfg.siteUrl}/?pago=cancelado#planes`,
    client_reference_id: user.id,
    locale: 'es',
    allow_promotion_codes: 'true',
    billing_address_collection: 'required',
    tax_id_collection: { enabled: 'true' },
    metadata: meta,
  };
  if (user.stripeCustomerId) {
    params.customer = user.stripeCustomerId;
    params.customer_update = { address: 'auto', name: 'auto' };
  } else {
    params.customer_email = user.email;
  }
  if (mode === 'subscription') {
    params.subscription_data = { metadata: meta };
    const trial = Number(plans[planId]?.trialDays);
    if (trial > 0 && !user.trialUsed) params.subscription_data.trial_period_days = trial;
  } else {
    params.invoice_creation = { enabled: 'true' };
    params.payment_intent_data = { metadata: meta };
    if (!user.stripeCustomerId) params.customer_creation = 'always';
  }
  const session = await stripeRequest(cfg, '/checkout/sessions', params, fetchImpl);
  return session.url;
}

/** Cambia el precio de la suscripción actual (subir o bajar de plan) con prorrateo. */
export async function changeSubscription({
  cfg, user, priceId, planId, interval, fetchImpl,
}) {
  const sub = await stripeRequest(cfg, `/subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`, {}, fetchImpl, 'GET');
  const item = sub.items?.data?.[0];
  if (!item) throw new Error('No se encuentra tu suscripción en Stripe.');
  return stripeRequest(cfg, `/subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: 'create_prorations',
    cancel_at_period_end: 'false',
    metadata: { userId: user.id, plan: planId, interval },
  }, fetchImpl);
}

export async function setCancelAtPeriodEnd({ cfg, user, cancel, fetchImpl }) {
  if (!user.stripeSubscriptionId) throw new Error('No tienes ninguna suscripción activa.');
  return stripeRequest(cfg, `/subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`, { cancel_at_period_end: cancel ? 'true' : 'false' }, fetchImpl);
}

export async function createPortal({ cfg, user, fetchImpl }) {
  if (!user.stripeCustomerId) throw new Error('Todavía no tienes ningún pago en Stripe.');
  const session = await stripeRequest(cfg, '/billing_portal/sessions', { customer: user.stripeCustomerId, return_url: `${cfg.siteUrl}/#cuenta` }, fetchImpl);
  return session.url;
}

/** Código de descuento que el cliente escribe en el pago (por ejemplo, LANZAMIENTO). */
export async function createPromo({
  cfg, code, percent, duration = 'once', months, maxRedemptions, fetchImpl,
}) {
  const coupon = await stripeRequest(cfg, '/coupons', {
    percent_off: percent, duration, duration_in_months: duration === 'repeating' ? months : undefined, name: code,
  }, fetchImpl);
  const promo = await stripeRequest(cfg, '/promotion_codes', { coupon: coupon.id, code, max_redemptions: maxRedemptions || undefined }, fetchImpl);
  return {
    id: promo.id, code: promo.code || code, percent, duration, months: duration === 'repeating' ? months : null, maxRedemptions: maxRedemptions || null, coupon: coupon.id, createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------ webhook */

/** Comprueba la firma Stripe-Signature (t=..., v1=...) y devuelve el evento. */
export function verifyStripeSignature(rawBody, header, secret, { tolerance = 300, now = Date.now() } = {}) {
  if (!secret) throw new Error('Falta el secreto del webhook de Stripe');
  const parts = Object.fromEntries(String(header || '').split(',').map((p) => p.split('=')).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = String(header || '').split(',').filter((p) => p.trim().startsWith('v1=')).map((p) => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) throw new Error('Firma de Stripe incompleta');
  if (Math.abs(now / 1000 - t) > tolerance) throw new Error('Firma de Stripe caducada');
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const ok = sigs.some((s) => s.length === expected.length && timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  if (!ok) throw new Error('Firma de Stripe no válida');
  return JSON.parse(rawBody);
}

export function signStripePayload(rawBody, secret, t = Math.floor(Date.now() / 1000)) {
  const sig = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  return `t=${t},v1=${sig}`;
}

/**
 * Aplica un evento de Stripe a los usuarios. Es idempotente: un mismo evento solo se
 * procesa una vez. Devuelve el usuario afectado y qué aviso enviarle por correo.
 */
export function applyStripeEvent(db, cfg, event) {
  const data = db.data;
  if (data.stripeEvents.includes(event.id)) return { user: null, notice: null };
  data.stripeEvents.push(event.id);
  if (data.stripeEvents.length > 1000) data.stripeEvents.splice(0, data.stripeEvents.length - 1000);

  const obj = event.data?.object || {};
  const byId = (id) => data.users.find((u) => u.id === id);
  const byCustomer = (c) => data.users.find((u) => c && u.stripeCustomerId === c);
  let user = null;
  let notice = null;

  switch (event.type) {
    case 'checkout.session.completed': {
      user = byId(obj.client_reference_id || obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      if (obj.customer) user.stripeCustomerId = obj.customer;
      const plan = obj.metadata?.plan;
      if (obj.mode === 'subscription') {
        user.stripeSubscriptionId = obj.subscription || user.stripeSubscriptionId;
        if (plan) user.plan = plan;
        if (obj.metadata?.interval) user.planInterval = obj.metadata.interval;
        user.planStatus = user.planStatus === 'trialing' ? 'trialing' : 'active';
        notice = 'activated';
      } else if (obj.mode === 'payment' && obj.payment_status === 'paid') {
        if (plan) user.plan = plan;
        user.planStatus = 'active';
        user.paidOnceAt = new Date().toISOString();
        notice = 'activated';
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      user = byId(obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      const item = obj.items?.data?.[0];
      const found = planFromPrice(cfg, data.settings, item?.price?.id);
      // Solo se avisa de un cambio de plan o de periodicidad (no de prueba → activa).
      const before = `${user.plan}:${user.planInterval || 'month'}`;
      const hadAccess = ACCESS_STATUSES.has(user.planStatus);
      user.plan = found?.plan || obj.metadata?.plan || user.plan;
      user.planInterval = found?.interval || obj.metadata?.interval || user.planInterval || 'month';
      user.planStatus = obj.status;
      user.stripeSubscriptionId = obj.id;
      if (obj.customer) user.stripeCustomerId = obj.customer;
      const end = obj.current_period_end || item?.current_period_end;
      if (end) user.currentPeriodEnd = new Date(end * 1000).toISOString();
      user.cancelAtPeriodEnd = !!obj.cancel_at_period_end;
      if (obj.status === 'trialing') user.trialUsed = true;
      if (event.type === 'customer.subscription.created' && ACCESS_STATUSES.has(obj.status)) notice = 'activated';
      else if (hadAccess && before !== `${user.plan}:${user.planInterval}` && ACCESS_STATUSES.has(obj.status) && obj.status !== 'past_due') notice = 'changed';
      break;
    }
    case 'customer.subscription.deleted': {
      user = byId(obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      user.planStatus = 'canceled';
      user.plan = 'free';
      user.cancelAtPeriodEnd = false;
      notice = 'canceled';
      break;
    }
    case 'customer.subscription.trial_will_end': {
      user = byId(obj.metadata?.userId) || byCustomer(obj.customer);
      if (user) notice = 'trial_end';
      break;
    }
    case 'invoice.payment_failed': {
      user = byCustomer(obj.customer);
      if (user) {
        user.planStatus = 'past_due';
        notice = 'payment_failed';
      }
      break;
    }
    default:
      break;
  }
  if (user) user.updatedAt = new Date().toISOString();
  db.save();
  return { user, notice };
}
