// Contenido fijo de la interfaz: catálogo de casas, tipos de promoción con sus pasos,
// tipos de operación y glosario.

import { fmt } from './util.js';
import { num } from './calc.js';

/**
 * Casas con licencia de apuestas deportivas en España (revisa el listado de la DGOJ
 * en ordenacionjuego.es). Las cinco primeras son las del método; el resto se puede
 * usar al añadir bonos a mano. La web abre la portada si la fuente de cuotas no da
 * el enlace directo al partido.
 */
export const BOOKIES = [
  ['bet365', 'Bet365', 'https://www.bet365.es'],
  ['winamax', 'Winamax', 'https://www.winamax.es/apuestas-deportivas'],
  ['daznbet', 'DAZN Bet', 'https://www.daznbet.es'],
  ['sportium', 'Sportium', 'https://www.sportium.es'],
  ['retabet', 'Retabet', 'https://www.retabet.es'],
  ['codere', 'Codere', 'https://www.codere.es'],
  ['bwin', 'Bwin', 'https://www.bwin.es'],
  ['williamhill', 'William Hill', 'https://www.williamhill.es'],
  ['betfair_sb', 'Betfair Sportsbook', 'https://www.betfair.es/sport'],
  ['luckia', 'Luckia', 'https://www.luckia.es'],
  ['marcaapuestas', 'Marca Apuestas', 'https://www.marcaapuestas.es'],
  ['kirolbet', 'Kirolbet', 'https://www.kirolbet.es'],
  ['888sport', '888sport', 'https://www.888sport.es'],
  ['betway', 'Betway', 'https://www.betway.es'],
  ['marathonbet', 'Marathonbet', 'https://www.marathonbet.es'],
  ['versus', 'Versus', 'https://www.versus.es'],
  ['paston', 'Paston', 'https://www.paston.es'],
  ['interwetten', 'Interwetten', 'https://www.interwetten.es'],
  ['pokerstars', 'PokerStars Sports', 'https://www.pokerstars.es/sports'],
  ['juegging', 'Juegging', 'https://www.juegging.es'],
  ['efbet', 'Efbet', 'https://www.efbet.es'],
  ['admiralbet', 'Admiralbet', 'https://www.admiralbet.es'],
  ['goldenpark', 'Goldenpark', 'https://www.goldenpark.es'],
  ['casinobarcelona', 'Casino Barcelona', 'https://www.casinobarcelona.es'],
  ['betsson', 'Betsson', 'https://www.betsson.es'],
  ['leovegas', 'LeoVegas', 'https://www.leovegas.es'],
  ['tonybet', 'TonyBet', 'https://www.tonybet.es'],
];

/** Las casas del método. */
export const MAIN_BOOKIES = BOOKIES.slice(0, 5).map(([, name]) => name);

export const EXCHANGE_HOME = 'https://www.betfair.es/exchange/plus/';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Busca una casa del catálogo por clave o por nombre parecido («Winamax ES», «Retabet ES»…). */
export function findBookie(keyOrName) {
  const k = norm(keyOrName);
  if (!k) return null;
  return BOOKIES.find(([key, name]) => norm(key) === k || norm(name) === k)
    || BOOKIES.find(([key, name]) => k.startsWith(norm(name)) || norm(name).startsWith(k) || k.startsWith(norm(key)))
    || null;
}

export const bookieName = (key) => (findBookie(key) || [key, key])[1];
export const bookieHome = (keyOrName) => (findBookie(keyOrName) || [])[2] || null;

const e0 = (x) => fmt.eur0(num(x));
const odds = (x) => fmt.odds(num(x));

/* ------------------------------------------------------------ pasos */

const fbMode = (p) => (p.freebetType === 'sr' ? 'sr' : 'snr');

function registerStep(p, bk) {
  const extra = [
    p.code ? ` Código de registro: ${p.code}.` : '',
    num(p.claimDays) > 0 ? ` Pide la oferta en los ${num(p.claimDays)} días siguientes al registro.` : '',
  ].join('');
  return { text: `Regístrate en ${bk} con tus datos reales y verifica la cuenta con tu DNI.${extra}`, action: { kind: 'site', label: `Abrir ${bk}` } };
}

const depositText = (amount, p) => `Deposita ${e0(amount)}${num(p.minDeposit) > 0 ? ` (el mínimo son ${e0(p.minDeposit)})` : ''}.`;

/** Pasos de las apuestas gratis: en trozos si la casa limita lo que vale cada freebet. */
function freebetSteps(total, p, bk, intro) {
  const per = num(p.chunk) > 0 ? Math.min(num(p.chunk), total) : total;
  const many = per < total;
  const expiry = num(p.expiryDays) > 0 ? ` Caducan a los ${num(p.expiryDays)} días.` : '';
  return [
    {
      text: `${intro}${many ? ` Llegan en freebets de hasta ${e0(per)}.` : ''}${expiry} Busca cuotas entre 4 y 8.`,
      action: { kind: 'om', label: 'Buscar cuota', om: { mode: fbMode(p), minOdds: 4, maxOdds: 8, stake: per, bookie: bk } },
    },
    { text: many ? 'Juega cada freebet a favor y cúbrela en contra, de una en una.' : 'Juega la freebet a favor y cúbrela en contra.', action: { kind: 'bl', label: 'Calcular', bl: { type: fbMode(p), stake: per } } },
  ];
}

/**
 * Tipos de promoción: campos, título y pasos. Los pasos se adaptan a los detalles
 * de cada casa (código, depósito mínimo, caducidad, freebets troceadas, parte en
 * combinadas, freebet extra) y llevan acciones que abren el oddsmatcher filtrado,
 * la calculadora rellena o la web de la casa.
 */
export const DETAIL_FIELDS = {
  code: { key: 'code', label: 'Código de registro', type: 'text' },
  minDeposit: { key: 'minDeposit', label: 'Depósito mínimo', unit: '€' },
  claimDays: { key: 'claimDays', label: 'Días para pedir la oferta' },
  expiryDays: { key: 'expiryDays', label: 'Días para usar las freebets' },
  chunk: { key: 'chunk', label: 'Máximo por freebet', unit: '€' },
  accaShare: { key: 'accaShare', label: 'Freebets en combinadas', unit: '%' },
  extra: { key: 'extra', label: 'Freebet extra', unit: '€' },
  days: { key: 'days', label: 'Plazo para completarlo', unit: 'días' },
};

export const OFFER_KINDS = {
  bet_get: {
    label: 'Apuesta y recibe',
    hint: 'Apuestas con tu dinero y la casa te da apuestas gratis.',
    fields: [
      { key: 'qualStake', label: 'Apuesta calificante', unit: '€', def: 10 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
      { key: 'freebet', label: 'Apuestas gratis que recibes', unit: '€', def: 25 },
      { key: 'freebetType', label: 'Tipo de apuesta gratis', type: 'select', options: [['snr', 'Sin devolución (SNR)'], ['sr', 'Con devolución (SR)']], def: 'snr' },
    ],
    details: ['code', 'minDeposit', 'claimDays', 'expiryDays', 'chunk', 'accaShare', 'extra'],
    title: (p) => `Apuesta ${e0(p.qualStake)} y recibe ${e0(p.freebet)} en apuestas gratis`,
    steps: (p, bk) => {
      const list = [
        registerStep(p, bk),
        { text: depositText(p.qualStake, p) },
        { text: `Busca una cuota de ${odds(p.minOdds)} o más con buen rating para la apuesta calificante de ${e0(p.qualStake)}.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'normal', minOdds: num(p.minOdds), stake: num(p.qualStake), bookie: bk } } },
        { text: `Apuesta ${e0(p.qualStake)} a favor en ${bk} y cúbrela en contra en Betfair.`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'normal', stake: num(p.qualStake) } } },
      ];
      const share = Math.min(100, Math.max(0, num(p.accaShare) || 0));
      const total = num(p.freebet);
      const single = total * (1 - share / 100);
      if (single > 0) list.push(...freebetSteps(single, p, bk, share ? `Recibirás ${e0(total)} en apuestas gratis: ${e0(single)} son para cualquier mercado.` : `Recibirás ${e0(total)} en apuestas gratis.`));
      if (share > 0) {
        list.push({
          text: `Los otros ${e0(total * share / 100)} son para combinadas: haz una de 2 partidos distintos con cuota total entre 4 y 8 y cúbrela selección a selección.`,
          action: { kind: 'acca', label: 'Calculadora de combinadas', acca: { type: fbMode(p), stake: total * share / 100 } },
        });
      }
      if (num(p.extra) > 0) list.push({ text: `Juega también la freebet extra de ${e0(p.extra)} y cúbrela.`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'snr', stake: num(p.extra) } } });
      list.push({ text: `Retira el saldo de ${bk} y de Betfair, y marca el bono como completado.` });
      return list;
    },
  },
  refund: {
    label: 'Reembolso si pierdes',
    hint: 'Si tu apuesta pierde, te devuelven el importe (o más) en apuestas gratis.',
    fields: [
      { key: 'stake', label: 'Apuesta que cuenta para el reembolso', unit: '€', def: 50 },
      { key: 'refund', label: 'Reembolso si pierde', unit: '€', def: 50 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
    ],
    details: ['code', 'minDeposit', 'days', 'expiryDays', 'chunk'],
    title: (p) => `Reembolso de ${e0(p.refund)} si pierde tu apuesta de ${e0(p.stake)}`,
    steps: (p, bk) => [
      registerStep(p, bk),
      { text: depositText(p.stake, p) },
      { text: `Busca una cuota alta (entre 3 y 8) en modo Reembolso: el oddsmatcher calcula cuánto vale cada partido contando con los ${e0(p.refund)} de reembolso.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'refund', minOdds: Math.max(3, num(p.minOdds) || 0), maxOdds: 8, stake: num(p.stake), refund: num(p.refund), bookie: bk } } },
      { text: `Apuesta ${e0(p.stake)} a favor y cubre en contra contando con el reembolso.${num(p.days) > 0 ? ` Tiene que ser en los ${num(p.days)} días siguientes al depósito.` : ''}`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'refund', stake: num(p.stake), refund: num(p.refund) } } },
      ...freebetSteps(num(p.refund), p, bk, `Si gana la apuesta a favor, el bono acaba aquí con el beneficio asegurado. Si pierde, recibirás ${e0(p.refund)} en apuestas gratis.`),
      { text: 'Retira y marca el bono como completado.' },
    ],
  },
  freebet: {
    label: 'Apuesta gratis directa',
    hint: 'Te dan apuestas gratis sin tener que apostar antes.',
    fields: [
      { key: 'freebet', label: 'Apuestas gratis', unit: '€', def: 10 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
      { key: 'freebetType', label: 'Tipo', type: 'select', options: [['snr', 'Sin devolución (SNR)'], ['sr', 'Con devolución (SR)']], def: 'snr' },
    ],
    details: ['code', 'expiryDays', 'chunk'],
    title: (p) => `${e0(p.freebet)} en apuestas gratis`,
    steps: (p, bk) => [
      { text: `Activa la promoción en ${bk}.${p.code ? ` Código: ${p.code}.` : ''}`, action: { kind: 'site', label: `Abrir ${bk}` } },
      ...freebetSteps(num(p.freebet), p, bk, `Tienes ${e0(p.freebet)} en apuestas gratis.`),
      { text: 'Retira y marca el bono como completado.' },
    ],
  },
  rollover: {
    label: 'Bono con rollover',
    hint: 'Te dan saldo extra que hay que apostar varias veces antes de poder retirarlo.',
    fields: [
      { key: 'deposit', label: 'Depósito', unit: '€', def: 100 },
      { key: 'bonus', label: 'Bono', unit: '€', def: 100 },
      { key: 'multiplier', label: 'Rollover (veces)', def: 6 },
      { key: 'base', label: 'Se multiplica sobre', type: 'select', options: [['bonus', 'El bono'], ['both', 'Depósito + bono'], ['deposit', 'El depósito']], def: 'bonus' },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.8 },
    ],
    details: ['code', 'minDeposit', 'days'],
    title: (p) => `Bono de ${e0(p.bonus)} con rollover x${num(p.multiplier) || 0}`,
    steps: (p, bk) => {
      const base = p.base === 'deposit' ? num(p.deposit) : p.base === 'both' ? num(p.deposit) + num(p.bonus) : num(p.bonus);
      const turnover = base * (num(p.multiplier) || 0);
      return [
        { text: 'Comprueba lo que vale antes de empezar.', action: { kind: 'roll', label: 'Calcular rollover', roll: { deposit: num(p.deposit), bonus: num(p.bonus), multiplier: num(p.multiplier), base: p.base } } },
        registerStep(p, bk),
        { text: depositText(p.deposit, p) },
        { text: `Libera el rollover: tienes que apostar ${e0(turnover)} a cuota ${odds(p.minOdds)} o más${num(p.days) > 0 ? ` en ${num(p.days)} días` : ''}. Elige calificantes con rating alto y cuotas bajas (hasta 2,5) para no necesitar mucho saldo en Betfair.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'normal', minOdds: num(p.minOdds), maxOdds: 2.5, stake: Math.min(100, num(p.deposit) || 100), bookie: bk } } },
        { text: 'Cubre cada apuesta en contra y anótala. Repite hasta completar el rollover.', action: { kind: 'bl', label: 'Calcular', bl: { type: 'normal', stake: Math.min(100, num(p.deposit) || 100) } } },
        { text: 'Al completarlo, retira y marca el bono como completado.' },
      ];
    },
  },
  boost: {
    label: 'Cuota mejorada',
    hint: 'Una cuota aumentada por la casa, a menudo por encima de la del exchange.',
    fields: [
      { key: 'stake', label: 'Apuesta máxima', unit: '€', def: 25 },
      { key: 'boostedOdds', label: 'Cuota mejorada', def: 3 },
      { key: 'layOdds', label: 'Cuota en contra en el exchange', def: 2.6 },
    ],
    details: [],
    title: (p) => `Cuota mejorada a ${odds(p.boostedOdds)} (máx. ${e0(p.stake)})`,
    steps: (p, bk) => [
      { text: 'Mira la cuota en contra actual en Betfair para esa selección.', action: { kind: 'exchange', label: 'Abrir Betfair' } },
      { text: `Apuesta ${e0(p.stake)} a ${odds(p.boostedOdds)} en ${bk} y cúbrela en contra.`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'normal', stake: num(p.stake), back: num(p.boostedOdds), lay: num(p.layOdds) } } },
      { text: 'Marca la promoción como completada.' },
    ],
  },
  other: {
    label: 'Otra promoción',
    hint: 'Cualquier otra cosa: casino, recargas, misiones...',
    fields: [
      { key: 'manualValue', label: 'Valor estimado', unit: '€', def: 10 },
    ],
    details: ['code'],
    title: (p) => `Promoción de valor estimado ${e0(p.manualValue)}`,
    steps: (p, bk) => [
      { text: `Lee las condiciones de la promoción en ${bk}.`, action: { kind: 'site', label: `Abrir ${bk}` } },
      { text: 'Complétala con la calculadora que corresponda.', action: { kind: 'bl', label: 'Calcular', bl: {} } },
      { text: 'Marca la promoción como completada.' },
    ],
  },
};

export const BET_KINDS = [
  ['welcome', 'Bono de bienvenida'],
  ['reload', 'Promoción recurrente'],
  ['freebet', 'Apuesta gratis'],
  ['refund', 'Reembolso'],
  ['boost', 'Cuota mejorada'],
  ['casino', 'Casino'],
  ['qualifying', 'Apuesta calificante'],
  ['other', 'Otro'],
];
export const betKindLabel = (k) => (BET_KINDS.find(([key]) => key === k) || [k, 'Otro'])[1];

export const GLOSSARY = [
  ['Apuesta a favor', 'La apuesta normal: ganas si ocurre lo que eliges. Se hace en la casa de apuestas. En los exchanges se marca en azul.'],
  ['Apuesta en contra', 'Apuestas a que algo no ocurre: haces de casa de apuestas para otra persona. Solo se puede en un exchange. Se marca en rosa.'],
  ['Exchange', 'Mercado donde las personas apuestan entre sí, como Betfair. Permite apostar en contra y cobra una comisión sobre lo que ganas.'],
  ['Responsabilidad', 'Lo que pierdes en el exchange si gana tu apuesta a favor. Tiene que estar en tu saldo del exchange para poder cubrir.'],
  ['Comisión', 'El porcentaje que se queda el exchange de tus ganancias netas en cada mercado. Revisa la tuya en tu cuenta.'],
  ['Rating', 'Lo buena que es una pareja de cuotas. En calificantes, 100 % es no perder nada; en apuestas gratis, el % que conviertes en dinero.'],
  ['Apuesta calificante', 'La apuesta que exige la casa para darte la promoción. Se cubre para perder lo mínimo, normalmente céntimos.'],
  ['Cuota mínima', 'La cuota más baja que acepta la promoción. Si apuestas por debajo, la apuesta no cuenta.'],
  ['Freebet SNR', 'Apuesta gratis sin devolución del importe: si aciertas cobras solo la ganancia, no el importe. Es la más habitual en España.'],
  ['Freebet SR', 'Apuesta gratis con devolución del importe: si aciertas cobras la ganancia más el importe. Vale más que una SNR.'],
  ['Créditos de apuesta', 'El nombre que da Bet365 a sus apuestas gratis. Funcionan como freebets SNR y se pueden repartir en varias apuestas.'],
  ['Retención', 'El porcentaje del valor de una apuesta gratis que conviertes en dinero al cubrirla. Con una SNR bien elegida, entre el 75 y el 85 %.'],
  ['Reembolso', 'Si pierde tu apuesta, la casa te devuelve el importe (Winamax, el 150 %), casi siempre como apuestas gratis.'],
  ['Rollover', 'Las veces que tienes que apostar un bono antes de poder retirarlo. Un x8 sobre 200 € son 1.600 € en apuestas.'],
  ['Underlay y overlay', 'Poner en contra menos (underlay) o más (overlay) de lo que iguala el resultado, para que gane más uno de los dos casos.'],
  ['Liquidez', 'Dinero disponible en el exchange para casar tu apuesta en contra a esa cuota. Si pones más, una parte queda sin casar.'],
  ['Combinada cubierta', 'Una combinada en la casa que se cubre selección a selección en el exchange, a medida que se juegan los partidos.'],
  ['Escalón de cuota', 'En Betfair las cuotas solo pueden tomar ciertos valores: de 0,01 en 0,01 hasta 2, de 0,02 en 0,02 hasta 3, etc.'],
];

/** Pistas cortas que salen en las calculadoras. */
export const TIPS = {
  normal: 'Busca un rating cercano al 100 %: la calificante solo sirve para desbloquear la promoción.',
  snr: 'Con apuestas gratis sin devolución conviene una cuota alta (4 a 8): retienes más.',
  sr: 'Con devolución del importe puedes usar cuotas más bajas y retener casi todo.',
  refund: 'Pon lo que te devuelven si pierdes (en Winamax, el 150 % de lo apostado) y el % que esperas convertir de esas freebets (70–80 % es lo habitual).',
};
