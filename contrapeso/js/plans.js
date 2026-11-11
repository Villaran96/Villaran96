// Planes de suscripción y qué incluye cada uno. Lo usan la web y el servidor.

export const PLAN_ORDER = ['free', 'bienvenida', 'recurrentes', 'metodo'];
export const PAID_PLANS = ['bienvenida', 'recurrentes', 'metodo'];

/** Filas del oddsmatcher que ve el plan gratuito. */
export const FREE_ODDS_ROWS = 5;

/**
 * Precios y textos por defecto. Se cambian desde el panel de administración, que
 * también crea los precios en Stripe (mensual y anual) con un botón.
 * price: precio mensual · priceYear: precio anual (0 = sin opción anual).
 */
export const DEFAULT_PLANS = {
  free: {
    id: 'free',
    name: 'Gratis',
    price: 0,
    priceYear: 0,
    interval: 'month',
    tagline: 'Para aprender y hacer tus primeros números.',
    features: [
      'Calculadoras de calificantes, freebets, reembolsos, combinadas y rollover',
      'Guía completa paso a paso',
      'Seguimiento de tus bonos y beneficios',
      `Oddsmatcher con las ${FREE_ODDS_ROWS} mejores cuotas`,
    ],
  },
  bienvenida: {
    id: 'bienvenida',
    name: 'Bienvenida',
    price: 14.99,
    priceYear: 149,
    interval: 'month',
    trialDays: 7,
    tagline: 'Saca todo el dinero de los bonos de bienvenida.',
    features: [
      'Cómo se hace cada bono: Bet365, Winamax, DAZN Bet, Sportium y Retabet',
      'Oddsmatcher completo con todos los partidos y mercados',
      'Enlaces directos al partido en la casa y en Betfair',
      'Avisos de cuotas con buen rating',
    ],
  },
  recurrentes: {
    id: 'recurrentes',
    name: 'Recurrentes',
    price: 24.99,
    priceYear: 249,
    interval: 'month',
    trialDays: 7,
    highlight: true,
    tagline: 'Sigue ganando cada semana cuando acabes los de bienvenida.',
    features: [
      'Todo lo del plan Bienvenida',
      'Promociones recurrentes de tus casas, revisadas cada semana',
      'Calendario de promociones por día',
      'Valor estimado de cada promoción',
    ],
  },
  metodo: {
    id: 'metodo',
    name: 'Método',
    price: 79,
    priceYear: 790,
    interval: 'month',
    seats: 20,
    requiresContract: true,
    requiresApproval: false,
    tagline: 'El método completo, Hacienda incluida. Plazas limitadas.',
    features: [
      'Todo lo del plan Recurrentes',
      'Módulo Hacienda: qué se declara, cómo y cuándo',
      'Hoja de control fiscal con tus propios datos',
      'Organización, banca y cuidado de las cuentas',
      'Acceso con contrato firmado online',
    ],
  },
};

/** Plan mínimo de cada función de pago. */
export const FEATURES = {
  'odds.full': 'bienvenida',
  'odds.alerts': 'bienvenida',
  'guides.welcome': 'bienvenida',
  'promos.recurring': 'recurrentes',
  metodo: 'metodo',
};

export const FEATURE_NAMES = {
  'odds.full': 'el oddsmatcher completo',
  'odds.alerts': 'los avisos de cuotas',
  'guides.welcome': 'las guías de bonos de bienvenida',
  'promos.recurring': 'las promociones recurrentes',
  metodo: 'el Método',
};

export const planRank = (id) => Math.max(0, PLAN_ORDER.indexOf(id));

export function canUse(planId, feature) {
  const need = FEATURES[feature];
  return !need || planRank(planId) >= planRank(need);
}

export const requiredPlan = (feature) => FEATURES[feature] || 'free';

/** Estados de Stripe con acceso (past_due mantiene el acceso mientras Stripe reintenta el cobro). */
export const ACCESS_STATUSES = new Set(['active', 'trialing', 'past_due']);

/** Plan con el que una persona usa la web ahora mismo. */
export function effectivePlan(user) {
  if (!user) return 'free';
  if (user.role === 'admin') return 'metodo';
  if (user.plan && user.plan !== 'free' && ACCESS_STATUSES.has(user.planStatus || 'active')) return user.plan;
  return 'free';
}

/** Mezcla los planes por defecto con los cambios guardados por el administrador. */
export function mergePlans(overrides = {}) {
  const out = {};
  for (const id of PLAN_ORDER) {
    const o = overrides[id] || {};
    out[id] = { ...DEFAULT_PLANS[id], ...o, id, features: Array.isArray(o.features) && o.features.length ? o.features : DEFAULT_PLANS[id].features };
  }
  return out;
}

export const intervalLabel = (i) => ({ month: '/mes', year: '/año', once: 'pago único' }[i] || '');

/** Precio de un plan con la periodicidad elegida (month o year). */
export function planPrice(plan, interval = 'month') {
  if (!plan) return 0;
  if (interval === 'year' && Number(plan.priceYear) > 0) return Number(plan.priceYear);
  return Number(plan.price) || 0;
}

/** Meses que regala el pago anual frente a pagar 12 meses. */
export function yearSaving(plan) {
  const m = Number(plan?.price) || 0;
  const y = Number(plan?.priceYear) || 0;
  if (!(m > 0 && y > 0)) return 0;
  return Math.max(0, Math.round((m * 12 - y) / m));
}
