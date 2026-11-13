// Configuración del servidor a partir de variables de entorno. Ver README.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THE_ODDS_BOOKMAKERS } from '../js/odds.js';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

const list = (v, d) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : d);

/**
 * Lee un archivo .env (CLAVE=valor por línea; # comentarios; comillas opcionales).
 * No sobrescribe lo que ya esté en el entorno. Si no existe, devuelve {}.
 */
export function readDotEnv(file) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { return {}; }
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    out[m[1]] = v;
  }
  return out;
}

/** Entorno del proceso más el archivo .env de la raíz del proyecto (manda el entorno). */
export const envWithDotEnv = (env = process.env) => ({ ...readDotEnv(join(ROOT, '.env')), ...env });

export function loadConfig(env = envWithDotEnv()) {
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
      // The Odds API. La clave nunca sale del servidor, aunque se llame NEXT_PUBLIC_.
      key: env.NEXT_PUBLIC_ODDS_API_KEY || env.ODDS_API_KEY || '',
      // Por defecto, La Liga: con el plan gratuito (500 créditos al mes) cada liga cuenta.
      sports: list(env.SPORTS, ['soccer_spain_la_liga']),
      regions: env.REGIONS || 'eu',
      // Mercados a favor; los «en contra» de Betfair (h2h_lay…) se piden solos.
      markets: env.MARKETS || 'h2h',
      // «regions» para pedir por región en vez de por casa.
      bookmakers: /^regions?$/i.test(String(env.ODDS_API_BOOKMAKERS || '').trim()) ? [] : list(env.ODDS_API_BOOKMAKERS, THE_ODDS_BOOKMAKERS),
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
