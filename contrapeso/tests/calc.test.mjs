import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  num, round, backLay, rating, profitFromRating, accaLay, rollover, offerValue,
} from '../js/calc.js';

const close = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('num acepta coma decimal', () => {
  assert.equal(num('2,5'), 2.5);
  assert.equal(num(' 1.75 '), 1.75);
  assert.ok(Number.isNaN(num('')));
});

test('round redondea al paso pedido', () => {
  assert.equal(round(1.005), 1.01);
  assert.equal(round(12.34, 1), 12);
  assert.equal(round(12.36, 0.1), 12.4);
});

test('calificante: iguala ambos resultados', () => {
  const r = backLay({ stake: 10, back: 2, lay: 2.1, commission: 2 });
  close(r.layStake, 9.6154);
  close(r.liability, 10.5769);
  close(r.ifBackWins, -0.5769);
  close(r.ifLayWins, -0.5769);
  close(r.rating, 94.2308);
  close(profitFromRating(r.rating, 10), r.profit);
});

test('apuesta gratis SNR', () => {
  const r = backLay({ stake: 10, back: 5, lay: 5.2, commission: 2, type: 'snr' });
  close(r.layStake, 7.722);
  close(r.ifBackWins, 7.5676);
  close(r.ifLayWins, 7.5676);
  close(r.retention, 75.676);
  close(r.rating, 75.676);
});

test('apuesta gratis SR', () => {
  const r = backLay({ stake: 10, back: 3, lay: 3, commission: 0, type: 'sr' });
  close(r.layStake, 10);
  close(r.ifBackWins, 10);
  close(r.ifLayWins, 10);
});

test('reembolso si pierde', () => {
  const r = backLay({ stake: 10, back: 3, lay: 3.1, commission: 2, type: 'refund', refund: 10, retention: 70 });
  close(r.layStake, 7.4675);
  close(r.ifBackWins, 4.3182);
  close(r.ifLayWins, 4.3182);
});

test('underlay: importe en contra manual', () => {
  const r = backLay({ stake: 10, back: 2, lay: 2, commission: 0, layStake: 5 });
  close(r.ifBackWins, 5);
  close(r.ifLayWins, -5);
});

test('entradas inválidas', () => {
  assert.equal(backLay({ stake: 0, back: 2, lay: 2 }).valid, false);
  assert.equal(backLay({ stake: 10, back: 1, lay: 2 }).valid, false);
  assert.ok(Number.isNaN(rating({ back: 'x', lay: 2 })));
});

test('combinada sin comisión: beneficio cero en todos los casos', () => {
  const r = accaLay({ stake: 10, legs: [{ back: 2, lay: 2 }, { back: 2, lay: 2 }] });
  close(r.legs[1].layStake, 20);
  close(r.legs[0].layStake, 10);
  r.outcomes.forEach((o) => close(o.profit, 0));
  close(r.accaOdds, 4);
});

test('combinada con comisión: iguala todos los resultados', () => {
  const r = accaLay({ stake: 10, commission: 5, legs: [{ back: 2, lay: 2 }, { back: 2, lay: 2 }, { back: 1.8, lay: 1.85 }] });
  const first = r.outcomes[0].profit;
  r.outcomes.forEach((o) => close(o.profit, first, 0.01));
  assert.equal(r.nextIndex, 0);
});

test('combinada en juego: respeta lo ya apostado y marca el resultado', () => {
  const legs = [{ back: 2, lay: 2, status: 'won', layStakePlaced: 10 }, { back: 2, lay: 2.2, status: 'lost' }];
  const r = accaLay({ stake: 10, legs });
  assert.equal(r.nextIndex, -1);
  close(r.settledProfit, r.outcomes[1].profit);
});

test('rollover', () => {
  const r = rollover({ bonus: 100, multiplier: 5, avgRating: 97, stakePerBet: 50 });
  close(r.turnover, 500);
  close(r.cost, 15);
  close(r.value, 85);
  close(r.breakEvenRating, 80);
  assert.equal(r.bets, 10);
});

test('valor de una promoción apuesta y recibe', () => {
  const v = offerValue({ kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 25, freebetType: 'snr' } }, { spread: 0, commission: 0, qualOdds: 2, snrOdds: 5 });
  close(v, 20); // calificante sin pérdida + 25 · 4/5
});

test('valor de una promoción con parte en combinadas y freebet extra', () => {
  const base = offerValue({ kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 100, freebetType: 'snr' } }, { spread: 0, commission: 0, qualOdds: 2, snrOdds: 5 });
  const acca = offerValue({ kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 100, freebetType: 'snr', accaShare: 50 } }, { spread: 0, commission: 0, qualOdds: 2, snrOdds: 5 });
  const extra = offerValue({ kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 100, freebetType: 'snr', extra: 10 } }, { spread: 0, commission: 0, qualOdds: 2, snrOdds: 5 });
  close(base, 80);
  close(acca, 76.8);
  close(extra, 88);
});

test('valor de un reembolso del 150 % (Winamax)', () => {
  const v = offerValue({ kind: 'refund', params: { stake: 100, refund: 150 } }, { spread: 2, commission: 2, refundOdds: 4, refundRetention: 72 });
  assert.ok(v > 70 && v < 85, String(v));
});
