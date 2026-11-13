// Motor de cálculo de Contrapeso. Funciones puras, sin DOM: se usan en la web,
// en el servidor y en los tests (node --test tests/).
//
// Convenciones:
//   - Cuotas en formato decimal (2.50).
//   - Comisiones y porcentajes en tanto por ciento (2 = 2 %).
//   - Importes en euros, sin redondear: el redondeo es cosa de la interfaz.

export const BET_TYPES = {
  normal: 'Apuesta calificante',
  snr: 'Apuesta gratis (sin devolución del importe)',
  sr: 'Apuesta gratis (con devolución del importe)',
  refund: 'Reembolso si pierde',
};

/** Convierte "2,5", "2.5" o 2.5 en número. Devuelve NaN si no es un número. */
export function num(value) {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;
  const s = String(value).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return NaN;
  return Number(s);
}

export const round = (x, step = 0.01) => {
  if (!Number.isFinite(x)) return x;
  const r = Math.round((x + Number.EPSILON * Math.sign(x)) / step) * step;
  return Number(r.toFixed(6));
};

const pct = (p) => (Number.isFinite(p) ? p / 100 : 0);

/**
 * Apuesta a favor en la casa y en contra en el exchange.
 *
 * type:
 *   normal  apuesta con tu dinero (calificante)
 *   snr     apuesta gratis, la casa no devuelve el importe
 *   sr      apuesta gratis, la casa devuelve el importe
 *   refund  si la apuesta a favor pierde, la casa devuelve `refund` (normalmente
 *           como apuesta gratis) y esperas convertir el `retention` % en dinero
 *
 * layStake: opcional, para underlay/overlay. Si falta se usa la que iguala el
 * beneficio en ambos resultados.
 */
export function backLay({
  stake, back, lay, commission = 0, type = 'normal', refund = 0, retention = 75, layStake,
}) {
  const S = num(stake);
  const B = num(back);
  const L = num(lay);
  const c = pct(num(commission));
  const R = type === 'refund' ? num(refund) || 0 : 0;
  const r = type === 'refund' ? pct(num(retention)) : 0;

  if (!(S > 0) || !(B > 1) || !(L > 1) || !(c >= 0 && c < 1)) {
    return { valid: false };
  }

  const refundValue = R * r;
  let ideal;
  switch (type) {
    case 'snr': ideal = (S * (B - 1)) / (L - c); break;
    case 'sr': ideal = (S * B) / (L - c); break;
    case 'refund': ideal = Math.max(0, (S * B - refundValue) / (L - c)); break;
    default: ideal = (S * B) / (L - c);
  }

  const ls = Number.isFinite(num(layStake)) && num(layStake) >= 0 ? num(layStake) : ideal;
  const cashStake = type === 'snr' || type === 'sr' ? 0 : S;
  const backReturn = type === 'snr' ? S * (B - 1) : S * B;
  const liability = ls * (L - 1);

  const ifBackWins = backReturn - cashStake - liability;
  const ifLayWins = ls * (1 - c) - cashStake + refundValue;
  const profit = Math.min(ifBackWins, ifLayWins);

  return {
    valid: true,
    type,
    layStake: ls,
    idealLayStake: ideal,
    liability,
    ifBackWins,
    ifLayWins,
    profit,
    // Para freebets, % del importe de la apuesta gratis que conviertes en dinero.
    retention: type === 'snr' || type === 'sr' ? (profit / S) * 100 : null,
    // Para calificantes, lo que pierdes respecto al importe apostado.
    qualifyingLossPct: type === 'normal' ? (profit / S) * 100 : null,
    rating: rating({ back: B, lay: L, commission: num(commission), type }),
    exchangeBalanceNeeded: liability,
  };
}

/**
 * Rating de una pareja de cuotas, como en cualquier oddsmatcher:
 *   normal y sr: B(1-c)/(L-c) · 100. 100 % = no pierdes nada.
 *   snr: (B-1)(1-c)/(L-c) · 100. % de la apuesta gratis que retienes.
 *   refund: se trata como normal.
 */
export function rating({ back, lay, commission = 0, type = 'normal' }) {
  const B = num(back);
  const L = num(lay);
  const c = pct(num(commission));
  if (!(B > 1) || !(L > 1)) return NaN;
  if (type === 'snr') return ((B - 1) * (1 - c)) / (L - c) * 100;
  return (B * (1 - c)) / (L - c) * 100;
}

/** Beneficio esperado de cubrir una apuesta de importe `stake` con ese rating. */
export function profitFromRating(r, stake, type = 'normal') {
  if (!Number.isFinite(r)) return NaN;
  if (type === 'snr' || type === 'sr') return (stake * r) / 100;
  return stake * (r / 100 - 1);
}

/**
 * Combinada cubierta selección a selección en el exchange.
 *
 * legs: [{ back, lay, status = 'pending' | 'won' | 'lost', layStakePlaced }]
 *   lay: cuota en contra (real si ya la has cubierto, estimada si no).
 *   layStakePlaced: importe en contra que pusiste de verdad (para patas ya jugadas).
 * type: normal | snr | sr
 *
 * Las apuestas en contra se calculan de la última selección hacia la primera para
 * que el beneficio sea el mismo falle la selección que falle. El importe de cada
 * pata solo depende de las patas posteriores, así que al actualizar la cuota de
 * una selección futura se recalcula sin afectar a lo ya jugado.
 */
export function accaLay({ stake, legs, commission = 0, type = 'normal' }) {
  const S = num(stake);
  const c = pct(num(commission));
  const parsed = legs.map((l) => ({
    back: num(l.back),
    lay: num(l.lay),
    status: l.status || 'pending',
    placed: num(l.layStakePlaced),
  }));
  if (!(S > 0) || parsed.length < 1 || parsed.some((l) => !(l.back > 1) || !(l.lay > 1))) {
    return { valid: false };
  }

  const accaOdds = parsed.reduce((acc, l) => acc * l.back, 1);
  const backReturn = type === 'snr' ? S * (accaOdds - 1) : S * accaOdds;
  const cashStake = type === 'normal' ? S : 0;

  const n = parsed.length;
  const ideal = new Array(n);
  ideal[n - 1] = backReturn / (parsed[n - 1].lay - c);
  for (let i = n - 2; i >= 0; i -= 1) {
    ideal[i] = (ideal[i + 1] * (1 - c)) / (parsed[i].lay - c);
  }

  const used = parsed.map((l, i) => (l.status !== 'pending' && Number.isFinite(l.placed) && l.placed >= 0 ? l.placed : ideal[i]));
  const liabilities = used.map((ls, i) => ls * (parsed[i].lay - 1));

  // outcomes[k] = beneficio si la primera selección que falla es la k; el último, si aciertan todas.
  const outcomes = [];
  let lostSoFar = 0;
  for (let k = 0; k < n; k += 1) {
    outcomes.push({ label: `Falla la selección ${k + 1}`, profit: -cashStake - lostSoFar + used[k] * (1 - c) });
    lostSoFar += liabilities[k];
  }
  outcomes.push({ label: 'Aciertan todas', profit: backReturn - cashStake - lostSoFar });

  const lostIndex = parsed.findIndex((l) => l.status === 'lost');
  const allWon = parsed.every((l) => l.status === 'won');
  const nextIndex = lostIndex >= 0 ? -1 : parsed.findIndex((l) => l.status === 'pending');
  let settledProfit = null;
  if (lostIndex >= 0) settledProfit = outcomes[lostIndex].profit;
  else if (allWon) settledProfit = outcomes[n].profit;

  const profits = outcomes.map((o) => o.profit);
  return {
    valid: true,
    accaOdds,
    backReturn,
    legs: parsed.map((l, i) => ({ ...l, idealLayStake: ideal[i], layStake: used[i], liability: liabilities[i] })),
    outcomes,
    profit: Math.min(...profits),
    maxLiability: Math.max(...liabilities),
    nextIndex,
    settledProfit,
  };
}

/**
 * Valor esperado de un bono con rollover liberado con apuestas cubiertas.
 *
 * base: 'bonus' | 'deposit' | 'both' (sobre qué se multiplica el rollover)
 * avgRating: rating medio de las apuestas cubiertas que uses para liberarlo (97 %).
 */
export function rollover({ deposit = 0, bonus, multiplier, base = 'bonus', avgRating = 97, stakePerBet }) {
  const D = num(deposit) || 0;
  const Bn = num(bonus);
  const x = num(multiplier);
  const r = num(avgRating);
  if (!(Bn > 0) || !(x >= 0) || !(r > 0)) return { valid: false };
  const baseAmount = base === 'deposit' ? D : base === 'both' ? D + Bn : Bn;
  const turnover = baseAmount * x;
  const cost = turnover * (1 - r / 100);
  const value = Bn - cost;
  const breakEvenRating = turnover > 0 ? (1 - Bn / turnover) * 100 : 0;
  const bets = num(stakePerBet) > 0 ? Math.ceil(turnover / num(stakePerBet)) : null;
  return { valid: true, baseAmount, turnover, cost, value, breakEvenRating, bets };
}

/**
 * Supuestos prudentes para valorar un bono: los de quien empieza, con cuotas moderadas
 * para no necesitar mucho saldo en el exchange. Dan cifras parecidas a las que publican
 * las herramientas de matched betting en España (un bono de 200 € en freebets queda en
 * unos 110–130 €). Se cambian en Ajustes.
 */
export const DEFAULT_ASSUMPTIONS = {
  qualOdds: 2.5, snrOdds: 3.25, srOdds: 3, refundOdds: 3, spread: 3.5, commission: 2, refundRetention: 65,
};

/** Las freebets troceadas (25 € o menos cada una) rinden algo menos: más apuestas, más cuotas que se mueven. */
const CHUNK_FACTOR = 0.95;
/** La parte que se juega en combinadas se cubre selección a selección y retiene algo menos. */
const ACCA_FACTOR = 0.92;

/**
 * De dónde sale el valor de una promoción: lista de { label, value } (lo que cuesta la
 * calificante, lo que dejan las freebets…). La suma es el valor estimado.
 */
export function offerBreakdown(offer, assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const layFor = (b) => b * (1 + a.spread / 100);
  const q = (stake, odds) => backLay({ stake, back: odds, lay: layFor(odds), commission: a.commission, type: 'normal' }).profit || 0;
  const fb = (amount, kind) => {
    if (!(amount > 0)) return 0;
    const odds = kind === 'sr' ? a.srOdds : a.snrOdds;
    return backLay({ stake: amount, back: odds, lay: layFor(odds), commission: a.commission, type: kind === 'sr' ? 'sr' : 'snr' }).profit || 0;
  };
  const p = offer.params || {};
  const chunked = num(p.chunk) > 0 && num(p.chunk) <= 50 ? CHUNK_FACTOR : 1;
  switch (offer.kind) {
    case 'bet_get': {
      const odds = Math.max(num(p.minOdds) || 0, a.qualOdds);
      const share = Math.min(100, Math.max(0, num(p.accaShare) || 0)) / 100;
      const free = fb(num(p.freebet), p.freebetType) * chunked;
      const parts = [{ label: 'Apuesta calificante cubierta', value: q(num(p.qualStake), odds) }];
      if (share > 0 && share < 1) {
        parts.push({ label: 'Freebets en apuestas simples', value: free * (1 - share) });
        parts.push({ label: 'Freebets en combinadas', value: free * share * ACCA_FACTOR });
      } else {
        parts.push({ label: share >= 1 ? 'Freebets en combinadas' : 'Freebets cubiertas', value: free * (share >= 1 ? ACCA_FACTOR : 1) });
      }
      if (num(p.extra) > 0) parts.push({ label: 'Freebet extra', value: fb(num(p.extra), 'snr') });
      return parts;
    }
    case 'refund': {
      const odds = Math.max(num(p.minOdds) || 0, a.refundOdds);
      const res = backLay({
        stake: num(p.stake), back: odds, lay: layFor(odds), commission: a.commission,
        type: 'refund', refund: num(p.refund), retention: a.refundRetention,
      });
      return [{ label: 'Apuesta cubierta contando con el reembolso', value: res.valid ? res.profit : 0 }];
    }
    case 'freebet':
      return [{ label: 'Freebets cubiertas', value: fb(num(p.freebet), p.freebetType) * chunked }];
    case 'rollover': {
      const odds = Math.max(num(p.minOdds) || 0, a.qualOdds);
      const res = rollover({
        deposit: num(p.deposit), bonus: num(p.bonus), multiplier: num(p.multiplier), base: p.base,
        avgRating: backLay({ stake: 10, back: odds, lay: layFor(odds), commission: a.commission }).rating,
      });
      if (!res.valid) return [{ label: 'Bono', value: 0 }];
      return [{ label: 'Bono', value: num(p.bonus) }, { label: `Coste de apostar ${Math.round(res.turnover)} €`, value: -res.cost }];
    }
    case 'boost': {
      const res = backLay({ stake: num(p.stake), back: num(p.boostedOdds), lay: num(p.layOdds), commission: a.commission });
      return [{ label: 'Cuota mejorada cubierta', value: res.valid ? res.profit : 0 }];
    }
    default:
      return [{ label: 'Valor estimado', value: num(p.manualValue) || 0 }];
  }
}

/**
 * Valor estimado de una promoción, con supuestos editables en Ajustes.
 * Sirve para ordenar bonos por lo que valen y para el resumen de pendientes.
 */
export function offerValue(offer, assumptions) {
  return offerBreakdown(offer, assumptions).reduce((sum, x) => sum + x.value, 0);
}

/**
 * Horquilla del valor: con cuotas peores (low), con los supuestos (mid) y con cuotas
 * algo mejores (high). El valor real depende de las cuotas que encuentres ese día.
 */
export function offerRange(offer, assumptions) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...assumptions };
  const low = offerValue(offer, { ...a, spread: a.spread + 1, snrOdds: Math.max(2, a.snrOdds - 0.5), refundRetention: Math.max(0, a.refundRetention - 7) });
  const high = offerValue(offer, { ...a, spread: Math.max(0.5, a.spread - 0.5), snrOdds: a.snrOdds + 0.5, refundRetention: Math.min(100, a.refundRetention + 5) });
  const mid = offerValue(offer, a);
  return { low: Math.min(low, mid), mid, high: Math.max(high, mid) };
}
