// Configuración del servidor a partir de variables de entorno. Ver README.

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SPORTS } from '../js/odds.js';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

const list = (v, d) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : d);

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 8080);
  const siteUrl = String(env.SITE_URL || `http://localhost:${port}`).replace(/\/$/, '');
  return {
    port,
    siteUrl,
    dataDir: env.DATA_DIR || join(ROOT, 'data'),
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === '1' : siteUrl.startsWith('https://'),
    adminEmails: list(env.ADMIN_EMAILS, []).map((e) => e.toLowerCase()),
    allowOrigin: env.ALLOW_ORIGIN || '',
    odds: {
      key: env.ODDS_API_KEY || '',
      sports: list(env.SPORTS, DEFAULT_SPORTS),
      regions: env.REGIONS || 'eu',
      markets: env.MARKETS || 'h2h,totals',
      refreshMinutes: Math.max(1, Number(env.REFRESH_MINUTES || 10)),
      apiBase: env.ODDS_API_BASE || 'https://api.the-odds-api.com/v4',
    },
    oddsApiIo: {
      key: env.ODDSAPIIO_KEY || '',
      base: env.ODDSAPIIO_BASE || 'https://api.odds-api.io/v3',
      // Nombres exactos de GET /v3/bookmakers. DAZN Bet y Sportium no tienen versión española.
      // «Betfair ES» se usa como Betfair.es si trae cuotas en contra; si no, como casa.
      bookmakers: list(env.ODDSAPIIO_BOOKMAKERS, ['Bet365 ES', 'Winamax ES', 'Retabet ES', 'Betfair ES', 'Betfair Exchange']),
      // Sin ligas = todos los partidos con cuota en esas casas. Con ligas, solo esas (fútbol).
      leagues: list(env.ODDSAPIIO_LEAGUES, []),
      sports: list(env.ODDSAPIIO_SPORTS || env.ODDSAPIIO_SPORT, ['football', 'tennis', 'basketball']),
      hours: Number(env.ODDSAPIIO_HOURS || 168),
      maxEvents: Number(env.ODDSAPIIO_MAX_EVENTS || 2500),
    },
    betfair: {
      appKey: env.BETFAIR_APP_KEY || '',
      username: env.BETFAIR_USERNAME || '',
      password: env.BETFAIR_PASSWORD || '',
      // «all» = todas las competiciones. Para limitar: nombres en inglés separados por comas.
      competitions: list(env.BETFAIR_COMPETITIONS, ['all']),
      hours: Number(env.BETFAIR_HOURS || 168),
      identityUrl: env.BETFAIR_IDENTITY_URL || 'https://identitysso.betfair.es/api',
      apiUrl: env.BETFAIR_API_URL || 'https://api.betfair.com/exchange/betting/rest/v1.0',
      linkTemplate: env.BETFAIR_LINK_TEMPLATE || '',
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY || '',
      webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
      apiBase: env.STRIPE_API_BASE || 'https://api.stripe.com/v1',
      prices: {
        bienvenida: env.STRIPE_PRICE_BIENVENIDA || '',
        recurrentes: env.STRIPE_PRICE_RECURRENTES || '',
        metodo: env.STRIPE_PRICE_METODO || '',
      },
      pricesYear: {
        bienvenida: env.STRIPE_PRICE_BIENVENIDA_ANUAL || '',
        recurrentes: env.STRIPE_PRICE_RECURRENTES_ANUAL || '',
        metodo: env.STRIPE_PRICE_METODO_ANUAL || '',
      },
      metodoMode: env.STRIPE_METODO_MODE === 'payment' ? 'payment' : 'subscription',
    },
    mail: {
      resendKey: env.RESEND_API_KEY || '',
      from: env.MAIL_FROM || 'Contrapeso <no-reply@example.com>',
      apiBase: env.RESEND_API_BASE || 'https://api.resend.com',
    },
  };
}
