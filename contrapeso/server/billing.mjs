// Cobros con Stripe: Checkout para suscribirse, portal del cliente para gestionar
// o cancelar, y webhook para mantener el plan de cada usuario al día.
// Se usa la API REST de Stripe directamente (sin dependencias).

import { createHmac, timingSafeEqual } from 'node:crypto';

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

export async function stripeRequest(cfg, path, params, fetchImpl = fetch) {
  if (!cfg.stripe.secretKey) throw new Error('Los pagos no están configurados (falta STRIPE_SECRET_KEY).');
  const res = await fetchImpl(`${cfg.stripe.apiBase}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.stripe.secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: stripeForm(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || `Stripe respondió ${res.status}`);
  return body;
}

export async function createCheckout({ cfg, user, planId, plans, fetchImpl }) {
  const price = cfg.stripe.prices[planId];
  if (!price) throw new Error(`Falta el precio de Stripe del plan ${planId} (variable STRIPE_PRICE_${planId.toUpperCase()}).`);
  const mode = planId === 'metodo' ? cfg.stripe.metodoMode : 'subscription';
  const meta = { userId: user.id, plan: planId };
  const params = {
    mode,
    line_items: [{ price, quantity: 1 }],
    success_url: `${cfg.siteUrl}/?pago=ok#cuenta`,
    cancel_url: `${cfg.siteUrl}/?pago=cancelado#planes`,
    client_reference_id: user.id,
    locale: 'es',
    allow_promotion_codes: 'true',
    billing_address_collection: 'required',
    metadata: meta,
  };
  if (user.stripeCustomerId) params.customer = user.stripeCustomerId;
  else params.customer_email = user.email;
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

export async function createPortal({ cfg, user, fetchImpl }) {
  if (!user.stripeCustomerId) throw new Error('Todavía no tienes ningún pago en Stripe.');
  const session = await stripeRequest(cfg, '/billing_portal/sessions', { customer: user.stripeCustomerId, return_url: `${cfg.siteUrl}/#cuenta` }, fetchImpl);
  return session.url;
}

/** Comprueba la firma Stripe-Signature (t=..., v1=...) y devuelve el evento. */
export function verifyStripeSignature(rawBody, header, secret, { tolerance = 300, now = Date.now() } = {}) {
  if (!secret) throw new Error('Falta STRIPE_WEBHOOK_SECRET');
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

export function planFromPrice(cfg, priceId) {
  return Object.entries(cfg.stripe.prices).find(([, p]) => p && p === priceId)?.[0] || null;
}

/**
 * Aplica un evento de Stripe a los usuarios. Es idempotente: un mismo evento
 * solo se procesa una vez. Devuelve el usuario afectado o null.
 */
export function applyStripeEvent(db, cfg, event) {
  const data = db.data;
  if (data.stripeEvents.includes(event.id)) return null;
  data.stripeEvents.push(event.id);
  if (data.stripeEvents.length > 1000) data.stripeEvents.splice(0, data.stripeEvents.length - 1000);

  const obj = event.data?.object || {};
  const byId = (id) => data.users.find((u) => u.id === id);
  const byCustomer = (c) => data.users.find((u) => c && u.stripeCustomerId === c);
  let user = null;

  switch (event.type) {
    case 'checkout.session.completed': {
      user = byId(obj.client_reference_id || obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      if (obj.customer) user.stripeCustomerId = obj.customer;
      const plan = obj.metadata?.plan;
      if (obj.mode === 'subscription') {
        user.stripeSubscriptionId = obj.subscription || user.stripeSubscriptionId;
        if (plan) user.plan = plan;
        user.planStatus = user.planStatus === 'trialing' ? 'trialing' : 'active';
      } else if (obj.mode === 'payment' && obj.payment_status === 'paid') {
        if (plan) user.plan = plan;
        user.planStatus = 'active';
        user.paidOnceAt = new Date().toISOString();
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      user = byId(obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      const item = obj.items?.data?.[0];
      user.plan = planFromPrice(cfg, item?.price?.id) || obj.metadata?.plan || user.plan;
      user.planStatus = obj.status;
      user.stripeSubscriptionId = obj.id;
      if (obj.customer) user.stripeCustomerId = obj.customer;
      const end = obj.current_period_end || item?.current_period_end;
      if (end) user.currentPeriodEnd = new Date(end * 1000).toISOString();
      user.cancelAtPeriodEnd = !!obj.cancel_at_period_end;
      if (obj.status === 'trialing') user.trialUsed = true;
      break;
    }
    case 'customer.subscription.deleted': {
      user = byId(obj.metadata?.userId) || byCustomer(obj.customer);
      if (!user) break;
      user.planStatus = 'canceled';
      user.plan = 'free';
      user.cancelAtPeriodEnd = false;
      break;
    }
    case 'invoice.payment_failed': {
      user = byCustomer(obj.customer);
      if (user) user.planStatus = 'past_due';
      break;
    }
    default:
      break;
  }
  if (user) user.updatedAt = new Date().toISOString();
  db.save();
  return user;
}
