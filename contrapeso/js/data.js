// Contenido fijo de la interfaz: catálogo de casas, tipos de promoción con sus pasos,
// tipos de operación y glosario.

import { fmt } from './util.js';
import { num } from './calc.js';

/**
 * Casas con licencia de apuestas deportivas en España (revisa el listado de
 * operadores de la DGOJ en ordenacionjuego.es). La clave coincide con la de los
 * datos de cuotas cuando es posible; la web abre la portada si la fuente de
 * cuotas no da el enlace directo al partido.
 */
export const BOOKIES = [
  ['bet365', 'Bet365', 'https://www.bet365.es'],
  ['codere', 'Codere', 'https://www.codere.es'],
  ['sportium', 'Sportium', 'https://www.sportium.es'],
  ['bwin', 'Bwin', 'https://www.bwin.es'],
  ['williamhill', 'William Hill', 'https://www.williamhill.es'],
  ['betfair_sb', 'Betfair Sportsbook', 'https://www.betfair.es/sport'],
  ['luckia', 'Luckia', 'https://www.luckia.es'],
  ['retabet', 'Retabet', 'https://www.retabet.es'],
  ['marcaapuestas', 'Marca Apuestas', 'https://www.marcaapuestas.es'],
  ['kirolbet', 'Kirolbet', 'https://www.kirolbet.es'],
  ['888sport', '888sport', 'https://www.888sport.es'],
  ['winamax', 'Winamax', 'https://www.winamax.es'],
  ['betway', 'Betway', 'https://www.betway.es'],
  ['marathonbet', 'Marathonbet', 'https://www.marathonbet.es'],
  ['versus', 'Versus', 'https://www.versus.es'],
  ['paston', 'Paston', 'https://www.paston.es'],
  ['interwetten', 'Interwetten', 'https://www.interwetten.es'],
  ['pokerstars', 'PokerStars Sports', 'https://www.pokerstars.es/sports'],
  ['juegging', 'Juegging', 'https://www.juegging.es'],
  ['daznbet', 'DAZN Bet', 'https://www.daznbet.es'],
  ['efbet', 'Efbet', 'https://www.efbet.es'],
  ['admiralbet', 'Admiralbet', 'https://www.admiralbet.es'],
  ['goldenpark', 'Goldenpark', 'https://www.goldenpark.es'],
  ['casinobarcelona', 'Casino Barcelona', 'https://www.casinobarcelona.es'],
  ['casinogranmadrid', 'Casino Gran Madrid', 'https://www.casinogranmadrid.es'],
  ['betsson', 'Betsson', 'https://www.betsson.es'],
  ['leovegas', 'LeoVegas', 'https://www.leovegas.es'],
  ['tonybet', 'TonyBet', 'https://www.tonybet.es'],
];

export const EXCHANGE_HOME = 'https://www.betfair.es/exchange/plus/';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Busca una casa del catálogo por clave o por nombre parecido. */
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

/**
 * Tipos de promoción: campos, título y pasos. Los pasos llevan una acción que abre
 * el oddsmatcher filtrado o la calculadora rellena, con el importe correcto.
 */
export const OFFER_KINDS = {
  bet_get: {
    label: 'Apuesta y recibe',
    hint: 'Apuestas con tu dinero y la casa te da una apuesta gratis.',
    fields: [
      { key: 'qualStake', label: 'Apuesta calificante', unit: '€', def: 10 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
      { key: 'freebet', label: 'Apuesta gratis que recibes', unit: '€', def: 25 },
      { key: 'freebetType', label: 'Tipo de apuesta gratis', type: 'select', options: [['snr', 'Sin devolución (SNR)'], ['sr', 'Con devolución (SR)']], def: 'snr' },
    ],
    title: (p) => `Apuesta ${e0(p.qualStake)} y recibe ${e0(p.freebet)} en apuestas gratis`,
    steps: (p, bk) => [
      { text: `Regístrate en ${bk} con tus datos reales y verifica la cuenta con tu DNI.`, action: { kind: 'site', label: `Abrir ${bk}` } },
      { text: `Deposita al menos ${e0(p.qualStake)}.` },
      { text: `Busca una cuota de ${odds(p.minOdds)} o más con buen rating para la apuesta calificante.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'normal', minOdds: num(p.minOdds), stake: num(p.qualStake), bookie: bk } } },
      { text: `Apuesta ${e0(p.qualStake)} a favor en ${bk} y cúbrela en contra en el exchange.`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'normal', stake: num(p.qualStake) } } },
      { text: `Cuando recibas la apuesta gratis de ${e0(p.freebet)}, busca cuotas altas (entre 4 y 8).`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: p.freebetType === 'sr' ? 'sr' : 'snr', minOdds: 4, maxOdds: 9, stake: num(p.freebet), bookie: bk } } },
      { text: 'Juega la apuesta gratis a favor y cúbrela en contra.', action: { kind: 'bl', label: 'Calcular', bl: { type: p.freebetType === 'sr' ? 'sr' : 'snr', stake: num(p.freebet) } } },
      { text: `Retira el saldo de ${bk} y del exchange, y marca el bono como completado.` },
    ],
  },
  refund: {
    label: 'Reembolso si pierdes',
    hint: 'Si tu primera apuesta pierde, te devuelven el importe (normalmente en apuesta gratis).',
    fields: [
      { key: 'stake', label: 'Apuesta máxima reembolsable', unit: '€', def: 50 },
      { key: 'refund', label: 'Reembolso', unit: '€', def: 50 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
    ],
    title: (p) => `Reembolso de hasta ${e0(p.refund)} si pierde tu primera apuesta`,
    steps: (p, bk) => [
      { text: `Regístrate en ${bk} y verifica la cuenta.`, action: { kind: 'site', label: `Abrir ${bk}` } },
      { text: `Deposita ${e0(p.stake)}.` },
      { text: 'Busca una cuota alta (entre 3 y 6) con buen rating: cuanto más alta, más vale el reembolso.', action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'normal', minOdds: Math.max(3, num(p.minOdds) || 0), maxOdds: 7, stake: num(p.stake), bookie: bk } } },
      { text: `Apuesta ${e0(p.stake)} a favor y cubre en contra contando con el reembolso.`, action: { kind: 'bl', label: 'Calcular', bl: { type: 'refund', stake: num(p.stake), refund: num(p.refund) } } },
      { text: `Si la apuesta a favor pierde, recibirás ${e0(p.refund)}: úsalos como apuesta gratis.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'snr', minOdds: 4, maxOdds: 9, stake: num(p.refund), bookie: bk } } },
      { text: 'Juega el reembolso y cúbrelo en contra.', action: { kind: 'bl', label: 'Calcular', bl: { type: 'snr', stake: num(p.refund) } } },
      { text: 'Retira y marca el bono como completado.' },
    ],
  },
  freebet: {
    label: 'Apuesta gratis directa',
    hint: 'Te dan una apuesta gratis sin tener que apostar antes.',
    fields: [
      { key: 'freebet', label: 'Apuesta gratis', unit: '€', def: 10 },
      { key: 'minOdds', label: 'Cuota mínima', def: 1.5 },
      { key: 'freebetType', label: 'Tipo', type: 'select', options: [['snr', 'Sin devolución (SNR)'], ['sr', 'Con devolución (SR)']], def: 'snr' },
    ],
    title: (p) => `${e0(p.freebet)} en apuesta gratis`,
    steps: (p, bk) => [
      { text: `Activa la promoción en ${bk}.`, action: { kind: 'site', label: `Abrir ${bk}` } },
      { text: 'Busca una cuota alta (entre 4 y 8) en modo apuesta gratis.', action: { kind: 'om', label: 'Buscar cuota', om: { mode: p.freebetType === 'sr' ? 'sr' : 'snr', minOdds: Math.max(4, num(p.minOdds) || 0), maxOdds: 9, stake: num(p.freebet), bookie: bk } } },
      { text: `Juega los ${e0(p.freebet)} a favor y cúbrelos en contra.`, action: { kind: 'bl', label: 'Calcular', bl: { type: p.freebetType === 'sr' ? 'sr' : 'snr', stake: num(p.freebet) } } },
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
    title: (p) => `Bono de ${e0(p.bonus)} con rollover x${num(p.multiplier) || 0}`,
    steps: (p, bk) => [
      { text: 'Comprueba si te sale a cuenta antes de empezar.', action: { kind: 'roll', label: 'Calcular rollover', roll: { deposit: num(p.deposit), bonus: num(p.bonus), multiplier: num(p.multiplier), base: p.base } } },
      { text: `Regístrate en ${bk}, verifica la cuenta y deposita ${e0(p.deposit)}.`, action: { kind: 'site', label: `Abrir ${bk}` } },
      { text: `Libera el rollover con apuestas cubiertas de cuota ${odds(p.minOdds)} o más y rating alto.`, action: { kind: 'om', label: 'Buscar cuota', om: { mode: 'normal', minOdds: num(p.minOdds), maxOdds: 4, bookie: bk } } },
      { text: 'Cubre cada apuesta en contra con la calculadora.', action: { kind: 'bl', label: 'Calcular', bl: { type: 'normal' } } },
      { text: 'Al completar el rollover, retira y marca el bono como completado.' },
    ],
  },
  boost: {
    label: 'Cuota mejorada',
    hint: 'Una cuota aumentada por la casa, a menudo por encima de la del exchange.',
    fields: [
      { key: 'stake', label: 'Apuesta máxima', unit: '€', def: 25 },
      { key: 'boostedOdds', label: 'Cuota mejorada', def: 3 },
      { key: 'layOdds', label: 'Cuota en contra en el exchange', def: 2.6 },
    ],
    title: (p) => `Cuota mejorada a ${odds(p.boostedOdds)} (máx. ${e0(p.stake)})`,
    steps: (p, bk) => [
      { text: 'Mira la cuota en contra actual en el exchange para esa selección.', action: { kind: 'exchange', label: 'Abrir Betfair' } },
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
  ['Freebet SNR', 'Apuesta gratis sin devolución del importe: si aciertas cobras solo la ganancia, no el importe. Es la más habitual en España.'],
  ['Freebet SR', 'Apuesta gratis con devolución del importe: si aciertas cobras la ganancia más el importe. Vale más que una SNR.'],
  ['Retención', 'El porcentaje del valor de una apuesta gratis que conviertes en dinero al cubrirla. Con una SNR bien elegida, entre el 75 y el 85 %.'],
  ['Reembolso', 'Si pierde tu apuesta, la casa te devuelve el importe, casi siempre como apuesta gratis.'],
  ['Rollover', 'Las veces que tienes que apostar un bono antes de poder retirarlo. Un x6 sobre 100 € son 600 € en apuestas.'],
  ['Underlay y overlay', 'Poner en contra menos (underlay) o más (overlay) de lo que iguala el resultado, para que gane más uno de los dos casos.'],
  ['Favor-favor', 'Cubrir todos los resultados con apuestas a favor en casas distintas, sin exchange. También se llama dutching.'],
  ['Surebet', 'Combinación de cuotas a favor en casas distintas que da beneficio sea cual sea el resultado.'],
  ['Liquidez', 'Dinero disponible en el exchange para casar tu apuesta en contra a esa cuota. Si pones más, una parte queda sin casar.'],
  ['Combinada cubierta', 'Una combinada en la casa que se cubre selección a selección en el exchange, a medida que se juegan los partidos.'],
  ['Escalón de cuota', 'En Betfair las cuotas solo pueden tomar ciertos valores: de 0,01 en 0,01 hasta 2, de 0,02 en 0,02 hasta 3, etc.'],
];

/** Pistas cortas que salen en las calculadoras. */
export const TIPS = {
  normal: 'Busca un rating cercano al 100 %: la calificante solo sirve para desbloquear la promoción.',
  snr: 'Con apuestas gratis sin devolución conviene una cuota alta (4 a 8): retienes más.',
  sr: 'Con devolución del importe puedes usar cuotas más bajas y retener casi todo.',
  refund: 'La retención es el % del reembolso que esperas convertir en dinero si te lo dan como apuesta gratis (entre 70 y 80 % es lo habitual).',
};
