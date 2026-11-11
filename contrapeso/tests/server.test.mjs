// Pruebas de extremo a extremo del servidor con Stripe, Resend y The Odds API simulados.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/server.mjs';
import { loadConfig } from '../server/config.mjs';
import { signStripePayload } from '../server/billing.mjs';
import { contractData, contractText, sha256Hex } from '../js/contract.js';

const WEBHOOK_SECRET = 'whsec_test';
const mock = { checkouts: [], mails: [], oddsCalls: 0, subUpdates: [], prices: [], products: 0, coupons: [], versions: new Set() };
let mockServer;
let mockBase;
let app;
let base;
let dir;
const logs = [];

const start = new Date(Date.now() + 2 * 86400000).toISOString();
const oddsEvent = (id, home, away, prices) => ({
  id, sport_key: 'soccer_spain_la_liga', sport_title: 'La Liga - Spain', commence_time: start, home_team: home, away_team: away,
  bookmakers: [
    { key: 'williamhill', title: 'William Hill', markets: [{ key: 'h2h', outcomes: [{ name: home, price: prices[0] }, { name: 'Draw', price: prices[1] }, { name: away, price: prices[2] }] }] },
    { key: 'betfair_ex_eu', title: 'Betfair', markets: [{ key: 'h2h_lay', outcomes: [{ name: home, price: prices[0] + 0.02 }, { name: 'Draw', price: prices[1] + 0.05 }, { name: away, price: prices[2] + 0.04 }] }] },
  ],
});
const ODDS = Array.from({ length: 12 }, (_, i) => oddsEvent(`e${i}`, `Local ${i}`, `Visitante ${i}`, [2 + i / 10, 3.3, 3 + i / 20]));

before(async () => {
  mockServer = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const out = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
      if (req.url.startsWith('/v1/')) mock.versions.add(req.headers['stripe-version']);
      if (req.url === '/v1/checkout/sessions') { mock.checkouts.push(new URLSearchParams(body)); return out(200, { id: 'cs_1', url: 'https://checkout.stripe.test/cs_1' }); }
      if (req.url.startsWith('/v1/subscriptions/') && req.method === 'GET') return out(200, { id: req.url.split('/')[3], items: { data: [{ id: 'si_1', price: { id: 'price_bien' } }] } });
      if (req.url.startsWith('/v1/subscriptions/')) { mock.subUpdates.push(new URLSearchParams(body)); return out(200, { id: req.url.split('/')[3] }); }
      if (req.url === '/v1/products') { mock.products += 1; return out(200, { id: `prod_${mock.products}` }); }
      if (req.url === '/v1/prices') { const p = new URLSearchParams(body); mock.prices.push(p); return out(200, { id: `price_auto_${mock.prices.length}` }); }
      if (req.url === '/v1/coupons') { mock.coupons.push(new URLSearchParams(body)); return out(200, { id: 'co_1' }); }
      if (req.url === '/v1/promotion_codes') { const p = new URLSearchParams(body); return out(200, { id: 'promo_1', code: p.get('code') }); }
      if (req.url === '/v1/billing_portal/sessions') return out(200, { url: 'https://billing.stripe.test/portal' });
      if (req.url === '/emails') { mock.mails.push(JSON.parse(body)); return out(200, { id: 'em' }); }
      if (req.url.startsWith('/v4/sports/soccer_spain_la_liga/odds/')) {
        mock.oddsCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json', 'x-requests-remaining': '499' });
        return res.end(JSON.stringify(ODDS));
      }
      return out(404, { error: 'no' });
    });
  });
  await new Promise((ok) => mockServer.listen(0, ok));
  mockBase = `http://127.0.0.1:${mockServer.address().port}`;
  dir = await mkdtemp(join(tmpdir(), 'contrapeso-'));
  const cfg = loadConfig({
    PORT: '0',
    SITE_URL: 'http://localhost:9999',
    DATA_DIR: dir,
    ADMIN_EMAILS: 'admin@example.com',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_API_BASE: `${mockBase}/v1`,
    STRIPE_PRICE_BIENVENIDA: 'price_bien',
    STRIPE_PRICE_BIENVENIDA_ANUAL: 'price_bien_year',
    STRIPE_PRICE_RECURRENTES: 'price_rec',
    STRIPE_PRICE_METODO: 'price_met',
    RESEND_API_KEY: 're_test',
    RESEND_API_BASE: mockBase,
    ODDS_API_KEY: 'odds_test',
    ODDS_API_BASE: `${mockBase}/v4`,
    SPORTS: 'soccer_spain_la_liga',
  });
  app = await createApp(cfg, { log: (m) => logs.push(m) });
  const port = await app.listen(0);
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await app.close();
  await new Promise((ok) => mockServer.close(ok));
  await rm(dir, { recursive: true, force: true });
});

/** Cliente con su propia cookie de sesión. */
function client() {
  let jar = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar ? { Cookie: jar } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) jar = set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, data };
  };
}

async function webhook(event) {
  const raw = JSON.stringify(event);
  return fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signStripePayload(raw, WEBHOOK_SECRET) }, body: raw });
}

const alice = client();
const admin = client();
let aliceId;

test('registro, sesión y validaciones', async () => {
  let r = await alice('POST', '/api/auth/register', { email: 'alice@example.com', password: '123', adult: true, terms: true });
  assert.equal(r.status, 400);
  r = await alice('POST', '/api/auth/register', { email: 'alice@example.com', password: 'secreto-largo', adult: false, terms: true });
  assert.equal(r.status, 400);
  r = await alice('POST', '/api/auth/register', { email: 'Alice@Example.com', password: 'secreto-largo', name: 'Alice', adult: true, terms: true });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.plan, 'free');
  assert.equal(r.data.user.role, 'user');
  aliceId = r.data.user.id;
  r = await alice('GET', '/api/auth/me');
  assert.equal(r.data.user.email, 'alice@example.com');
  r = await client()('POST', '/api/auth/register', { email: 'alice@example.com', password: 'otro-secreto', adult: true, terms: true });
  assert.equal(r.status, 409);
  r = await client()('POST', '/api/auth/login', { email: 'alice@example.com', password: 'mal' });
  assert.equal(r.status, 401);
  assert.equal(mock.mails.length >= 1, true, 'correo de bienvenida');
});

test('las contraseñas no se guardan en claro y las sesiones caducan al salir', async () => {
  const user = app.db.data.users.find((u) => u.email === 'alice@example.com');
  assert.match(user.passwordHash, /^scrypt\$/);
  const bob = client();
  await bob('POST', '/api/auth/register', { email: 'bob@example.com', password: 'secreto-bob', adult: true, terms: true });
  assert.equal((await bob('GET', '/api/auth/me')).data.user.email, 'bob@example.com');
  await bob('POST', '/api/auth/logout', {});
  assert.equal((await bob('GET', '/api/auth/me')).data.user, null);
});

test('datos del usuario sincronizados entre dispositivos', async () => {
  const bets = [{ id: 'b1', date: '2026-11-01', bookie: 'Bet365', kind: 'welcome', profit: 21.4 }];
  let r = await alice('PUT', '/api/me/data', { bets, offers: [], settings: { theme: 'dark' } });
  assert.equal(r.status, 200);
  r = await alice('GET', '/api/me/data');
  assert.deepEqual(r.data.data.bets, bets);
  r = await client()('GET', '/api/me/data');
  assert.equal(r.status, 401);
});

test('el contenido de pago está bloqueado en el plan gratuito', async () => {
  const r = await alice('GET', '/api/content');
  assert.equal(r.data.access.guides, false);
  assert.ok(r.data.guides.every((g) => g.locked && !g.params));
  assert.ok(r.data.lessons.every((l) => l.locked && !l.body));
});

test('cuotas: el plan gratuito recibe solo los partidos de las mejores filas', async () => {
  const r = await alice('GET', '/api/odds');
  assert.equal(r.status, 200);
  assert.equal(r.data.limited, true);
  assert.ok(r.data.events.length <= 5 && r.data.events.length > 0);
  assert.equal(mock.oddsCalls, 1);
});

test('pago: Checkout con el precio y la prueba del plan', async () => {
  const r = await alice('POST', '/api/billing/checkout', { plan: 'bienvenida' });
  assert.equal(r.status, 200);
  assert.equal(r.data.url, 'https://checkout.stripe.test/cs_1');
  const p = mock.checkouts.at(-1);
  assert.equal(p.get('mode'), 'subscription');
  assert.equal(p.get('line_items[0][price]'), 'price_bien');
  assert.equal(p.get('client_reference_id'), aliceId);
  assert.equal(p.get('subscription_data[trial_period_days]'), '7');
  assert.equal(p.get('customer_email'), 'alice@example.com');
  assert.equal(p.get('tax_id_collection[enabled]'), 'true');
  assert.equal(p.get('metadata[interval]'), 'month');
  const y = await alice('POST', '/api/billing/checkout', { plan: 'bienvenida', interval: 'year' });
  assert.equal(y.status, 200);
  assert.equal(mock.checkouts.at(-1).get('line_items[0][price]'), 'price_bien_year');
  assert.ok([...mock.versions].every((v) => v === '2024-06-20'), 'versión de la API fija');
});

test('webhook: rechaza firmas falsas y activa el plan con las buenas', async () => {
  const bad = await fetch(`${base}/api/stripe/webhook`, { method: 'POST', headers: { 'Stripe-Signature': 't=1,v1=abc' }, body: '{}' });
  assert.equal(bad.status, 400);
  await webhook({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { mode: 'subscription', client_reference_id: aliceId, customer: 'cus_A', subscription: 'sub_A', metadata: { plan: 'bienvenida' } } } });
  await webhook({ id: 'evt_2', type: 'customer.subscription.updated', data: { object: { id: 'sub_A', customer: 'cus_A', status: 'trialing', metadata: { userId: aliceId }, items: { data: [{ price: { id: 'price_bien' }, current_period_end: 1893456000 }] } } } });
  await new Promise((ok) => setTimeout(ok, 50));
  assert.equal(mock.mails.filter((m) => /Has cambiado/.test(m.subject)).length, 0, 'pasar de pago a prueba no es un cambio de plan');
  let r = await alice('GET', '/api/auth/me');
  assert.equal(r.data.user.plan, 'bienvenida');
  assert.equal(r.data.user.planStatus, 'trialing');
  r = await alice('GET', '/api/content');
  assert.equal(r.data.access.guides, true);
  assert.equal(r.data.access.promos, false);
  assert.ok(r.data.guides[0].params);
  r = await alice('GET', '/api/odds');
  assert.equal(r.data.limited, undefined);
  assert.equal(r.data.events.length, 12);
  // El mismo evento dos veces no cambia nada.
  await webhook({ id: 'evt_2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_A', customer: 'cus_A' } } });
  assert.equal((await alice('GET', '/api/auth/me')).data.user.plan, 'bienvenida');
  // Con una suscripción activa, cambiar de plan modifica la misma suscripción con prorrateo.
  r = await alice('POST', '/api/billing/checkout', { plan: 'bienvenida' });
  assert.equal(r.status, 409, 'ya tiene ese plan');
  const before = mock.checkouts.length;
  r = await alice('POST', '/api/billing/checkout', { plan: 'recurrentes' });
  assert.equal(r.data.changed, true);
  assert.equal(r.data.user.plan, 'recurrentes');
  assert.equal(mock.checkouts.length, before, 'no abre otro pago');
  assert.equal(mock.mails.filter((m) => /Has cambiado al plan Recurrentes/.test(m.subject)).length, 1, 'un correo por el cambio de plan');
  // Stripe confirma el cambio con su webhook: no se repite el correo.
  await webhook({ id: 'evt_2b', type: 'customer.subscription.updated', data: { object: { id: 'sub_A', customer: 'cus_A', status: 'trialing', metadata: { userId: aliceId }, items: { data: [{ price: { id: 'price_rec' }, current_period_end: 1893456000 }] } } } });
  await new Promise((ok) => setTimeout(ok, 50));
  assert.equal(mock.mails.filter((m) => /Has cambiado/.test(m.subject)).length, 1);
  const upd = mock.subUpdates.at(-1);
  assert.equal(upd.get('items[0][id]'), 'si_1');
  assert.equal(upd.get('items[0][price]'), 'price_rec');
  assert.equal(upd.get('proration_behavior'), 'create_prorations');
  // Cancelar al final del periodo y reactivar.
  r = await alice('POST', '/api/billing/cancel', {});
  assert.equal(r.data.user.cancelAtPeriodEnd, true);
  assert.equal(mock.subUpdates.at(-1).get('cancel_at_period_end'), 'true');
  r = await alice('POST', '/api/billing/resume', {});
  assert.equal(r.data.user.cancelAtPeriodEnd, false);
  assert.equal(mock.subUpdates.at(-1).get('cancel_at_period_end'), 'false');
  assert.ok(mock.mails.some((m) => /activo/.test(m.subject)), 'correo de plan activo');
  assert.ok(mock.mails.some((m) => /Has cancelado/.test(m.subject) && /2030/.test(m.text)), 'correo de cancelación con la fecha de fin');
  assert.ok(mock.mails.some((m) => /sigue activa/.test(m.subject)), 'correo de reactivación');
});

test('cancelar la suscripción devuelve al plan gratuito y avisa por correo', async () => {
  await webhook({ id: 'evt_fail', type: 'invoice.payment_failed', data: { object: { customer: 'cus_A' } } });
  assert.equal((await alice('GET', '/api/auth/me')).data.user.planStatus, 'past_due');
  assert.ok(mock.mails.some((m) => /cobrar/.test(m.subject)));
  await webhook({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_A', customer: 'cus_A', metadata: { userId: aliceId } } } });
  const r = await alice('GET', '/api/auth/me');
  assert.equal(r.data.user.plan, 'free');
  assert.ok(mock.mails.some((m) => /terminado/.test(m.subject)));
});

test('administración: solo para administradores', async () => {
  let r = await alice('GET', '/api/admin/overview');
  assert.equal(r.status, 403);
  r = await admin('POST', '/api/auth/register', { email: 'admin@example.com', password: 'clave-admin-1', adult: true, terms: true });
  assert.equal(r.data.user.role, 'admin');
  r = await admin('GET', '/api/admin/overview');
  assert.equal(r.status, 200);
  assert.ok(r.data.users.length >= 2);
  assert.equal(r.data.payments.configured, true);
  r = await admin('PUT', '/api/admin/content/promos', { items: [{ bookie: 'Bet365', kind: 'boost', params: { stake: 10, boostedOdds: 3 }, schedule: 'Lunes', days: [1, 9], url: 'javascript:alert(1)' }] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.items[0].days, [1]);
  assert.equal(r.data.items[0].url, '');
  r = await admin('PUT', '/api/admin/settings', { plans: { metodo: { name: 'Método', price: 99, interval: 'month', seats: 1 } }, site: { brand: 'Mi Marca', legalName: 'Mi Empresa SL', nif: 'B12345678', address: 'Calle Mayor 1, Madrid', email: 'hola@mimarca.es' } });
  assert.equal(r.data.settings.plans.metodo.price, 99);
  assert.equal(r.data.settings.site.brand, 'Mi Marca');
  r = await client()('GET', '/api/config');
  assert.equal(r.data.seats.total, 1);
  // Conectar con Stripe: crea productos y precios mensual y anual de los planes de pago.
  r = await admin('POST', '/api/admin/stripe/setup', {});
  assert.equal(r.status, 200);
  assert.equal(mock.products, 3);
  assert.equal(mock.prices.length, 5, 'mensual y anual, salvo el Método, que se guardó sin precio anual');
  const metodoMonth = mock.prices.find((p) => p.get('metadata[plan]') === 'metodo' && p.get('recurring[interval]') === 'month');
  assert.equal(metodoMonth.get('unit_amount'), '9900');
  assert.equal(metodoMonth.get('tax_behavior'), 'inclusive');
  r = await admin('POST', '/api/admin/stripe/setup', {});
  assert.equal(mock.prices.length, 5, 'no repite lo que ya existe');
  // Cambiar un precio crea uno nuevo en Stripe.
  r = await admin('PUT', '/api/admin/settings', { plans: { ...r.data.plans, metodo: { name: 'Método', price: 99, priceYear: 990, interval: 'month', seats: 1 }, bienvenida: { name: 'Bienvenida', price: 19.99, priceYear: 149, interval: 'month', trialDays: 7 } } });
  assert.equal(mock.prices.length, 7);
  assert.ok(mock.prices.slice(5).some((p) => p.get('unit_amount') === '1999' && p.get('recurring[interval]') === 'month'));
  assert.ok(mock.prices.slice(5).some((p) => p.get('unit_amount') === '99000' && p.get('recurring[interval]') === 'year'));
  // Código de descuento.
  r = await admin('POST', '/api/admin/stripe/coupon', { code: 'lanzamiento', percent: 50, duration: 'repeating', months: 2, maxRedemptions: 100 });
  assert.equal(r.data.coupon.code, 'LANZAMIENTO');
  assert.equal(mock.coupons.at(-1).get('duration_in_months'), '2');
  r = await admin('GET', '/api/admin/overview');
  assert.equal(r.data.payments.prices.recurrentes.year, true);
  assert.equal(r.data.payments.coupons.length, 1);
  r = await alice('POST', '/api/admin/stripe/setup', {});
  assert.equal(r.status, 403);
});

test('Método: solicitud, firma con huella del texto, pago y acceso', async () => {
  let r = await alice('POST', '/api/metodo/apply', { experience: 'Algo', motivation: 'Aprender lo de Hacienda' });
  assert.equal(r.data.application.status, 'approved');
  // Sin contrato no se puede pagar.
  r = await alice('POST', '/api/billing/checkout', { plan: 'metodo' });
  assert.equal(r.status, 409);
  const cfgRes = await alice('GET', '/api/config');
  const date = new Date().toISOString();
  const signer = { name: 'Alice Pérez García', dni: '12345678Z', address: 'Calle Falsa 123, Zaragoza', email: 'alice@example.com' };
  const text = contractText(contractData({ site: cfgRes.data.site, signer, plan: cfgRes.data.plans.metodo, date }));
  const hash = await sha256Hex(text);
  const sig = 'data:image/png;base64,iVBORw0KGgo=';
  const accept = { contract: true, adult: true, waiver: true, info: true };
  r = await alice('POST', '/api/metodo/sign', { ...signer, dni: '12345678A', accept, signature: sig, hash, date });
  assert.equal(r.status, 400, 'DNI con letra incorrecta');
  r = await alice('POST', '/api/metodo/sign', { ...signer, accept, signature: sig, hash: 'otro', date });
  assert.equal(r.status, 409, 'huella distinta');
  r = await alice('POST', '/api/metodo/sign', { ...signer, accept, signature: sig, hash, date });
  assert.equal(r.status, 200);
  assert.equal(r.data.contract.hash, hash);
  const stored = app.db.data.contracts.at(-1);
  assert.ok(stored.text.includes('Mi Empresa SL') && stored.text.includes('12345678Z') && stored.ip);
  assert.ok(mock.mails.some((m) => m.subject.includes('contrato')));
  r = await alice('POST', '/api/billing/checkout', { plan: 'metodo' });
  assert.equal(r.status, 200);
  assert.match(mock.checkouts.at(-1).get('line_items[0][price]'), /^price_auto_/, 'el precio creado desde el panel');
  await webhook({ id: 'evt_4', type: 'customer.subscription.created', data: { object: { id: 'sub_M', customer: 'cus_A', status: 'active', metadata: { userId: aliceId, plan: 'metodo' }, items: { data: [{ price: { id: 'price_met' } }] } } } });
  r = await alice('GET', '/api/content');
  assert.equal(r.data.access.metodo, true);
  assert.ok(r.data.lessons[0].body.length > 100);
  r = await alice('GET', `/api/contracts/${stored.id}`);
  assert.equal(r.data.contract.hash, hash);
  r = await client()('GET', `/api/contracts/${stored.id}`);
  assert.equal(r.status, 401);
});

test('plazas limitadas: con todas ocupadas, la solicitud va a lista de espera', async () => {
  const carol = client();
  await carol('POST', '/api/auth/register', { email: 'carol@example.com', password: 'secreto-carol', adult: true, terms: true });
  const r = await carol('POST', '/api/metodo/apply', { motivation: 'x' });
  assert.equal(r.data.application.status, 'waitlist');
  const c = await carol('POST', '/api/billing/checkout', { plan: 'metodo' });
  assert.equal(c.status, 409);
});

test('recuperar la contraseña por correo', async () => {
  const before = mock.mails.length;
  await client()('POST', '/api/auth/forgot', { email: 'alice@example.com' });
  const mail = mock.mails.slice(before).find((m) => m.subject.includes('contraseña'));
  const token = /token=([^#\s]+)/.exec(mail.text)[1];
  const fresh = client();
  let r = await fresh('POST', '/api/auth/reset', { token, password: 'nueva-clave-1' });
  assert.equal(r.status, 200);
  r = await fresh('POST', '/api/auth/reset', { token, password: 'nueva-clave-2' });
  assert.equal(r.status, 400, 'el enlace es de un solo uso');
  r = await client()('POST', '/api/auth/login', { email: 'alice@example.com', password: 'nueva-clave-1' });
  assert.equal(r.status, 200);
});

test('seguridad: archivos privados, origen y método', async () => {
  for (const path of ['/data/db.json', '/server/server.mjs', '/tests/server.test.mjs', '/.git/config', '/package.json', '/README.md', '/js/../server/server.mjs']) {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 404, path);
  }
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  const evil = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(evil.status, 403);
  const form = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'email=a&password=b' });
  assert.equal(form.status, 415);
  assert.equal((await fetch(`${base}/api/nada`)).status, 404);
});
