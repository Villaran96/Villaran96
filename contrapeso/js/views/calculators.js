// Calculadoras: favor-contra, combinadas cubiertas y rollover.

import {
  state, C, O, n, nz, save, render, go, route, registerActions, field, select, seg, money, pageHead,
  contextBanner, flowBar, logBet,
} from '../core.js';
import { fmt, esc, icon, sign, copyText } from '../util.js';
import { TIPS } from '../data.js';

function calcTabs(active) {
  const tabs = [['calculadora', 'Favor-contra'], ['combinadas', 'Combinadas'], ['rollover', 'Rollover']];
  return `<nav class="tabs" aria-label="Calculadoras">${tabs.map(([k, t]) => `<a href="#${k}" class="tab ${k === active ? 'is-active' : ''}" ${k === active ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}

/* ------------------------------------------------------------ favor-contra */

function adjustLabel(a) {
  const v = nz(a);
  if (v === 0) return 'Equilibrado';
  return v < 0 ? `Underlay ${Math.abs(v)} %` : `Overlay ${v} %`;
}

function backLayInput() {
  const c = state.calc.bl;
  const base = C.backLay({ ...c, layStake: undefined });
  const adj = nz(c.adjust);
  return { c, base, res: base.valid && adj ? C.backLay({ ...c, layStake: base.idealLayStake * (1 + adj / 100) }) : base };
}

const EXPLAIN = {
  normal: 'Apuestas tu dinero a favor y cubres en contra para que el resultado sea igual pase lo que pase. En contra = importe × cuota a favor ÷ (cuota en contra − comisión).',
  snr: 'La casa no te devuelve el importe si aciertas, solo la ganancia. Por eso se cubre la ganancia: en contra = importe × (cuota a favor − 1) ÷ (cuota en contra − comisión).',
  sr: 'La casa te devuelve importe y ganancia si aciertas. En contra = importe × cuota a favor ÷ (cuota en contra − comisión).',
  refund: 'Si la apuesta a favor pierde recibes el reembolso, que vale aproximadamente su importe por la retención. Se resta de lo que hay que cubrir: en contra = (importe × cuota a favor − reembolso × retención) ÷ (cuota en contra − comisión).',
};

function renderBackLay() {
  const c = state.calc.bl;
  return `${flowBar()}${pageHead('Calculadoras', 'Cuánto apostar en contra para cubrir cualquier apuesta, con el resultado en cada caso.')}
  ${calcTabs('calculadora')}
  <p class="calc-use">${icon('info', 15)} La de todos los días: calificantes y freebets de Bet365, DAZN Bet y Retabet, y el reembolso de Winamax.</p>
  <div class="calc-grid">
    <section class="panel">
      ${contextBanner(c.context, 'bl-clear')}
      <div class="field"><span class="field-label">Tipo de apuesta <a class="link small" href="#guia" data-act="guide-open" data-lesson="g4">¿Cuál es la mía?</a></span>
        ${seg('calc.bl.type', [['normal', 'Calificante'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR'], ['refund', 'Reembolso']])}
        <span class="field-hint">${esc(TIPS[c.type] || '')}</span>
      </div>
      <div class="form-grid pair">
        ${field('calc.bl.stake', c.type === 'snr' || c.type === 'sr' ? 'Importe de la freebet' : 'Importe a favor', { unit: '€' })}
        ${field('calc.bl.commission', 'Comisión exchange', { unit: '%' })}
        ${field('calc.bl.back', 'Cuota a favor', { cls: 'field-back' })}
        ${field('calc.bl.lay', 'Cuota en contra', { cls: 'field-lay' })}
        ${c.type === 'refund' ? `${field('calc.bl.refund', 'Reembolso si pierde', { unit: '€' })}${field('calc.bl.retention', 'Retención esperada', { unit: '%' })}` : ''}
      </div>
      <div class="field">
        <span class="field-label">Reparto entre resultados <output id="adjust-label" class="muted">${adjustLabel(c.adjust)}</output></span>
        <input type="range" id="f-calc-bl-adjust" data-k="calc.bl.adjust" min="-60" max="60" step="1" value="${esc(c.adjust)}" aria-label="Reparto entre resultados">
        <span class="range-ends"><span>Underlay: gana más si acierta a favor</span><button type="button" class="link" data-act="bl-reset-adjust">Igualar</button><span>Overlay: gana más si acierta en contra</span></span>
      </div>
      <details class="explain"><summary>${icon('info', 15)} Cómo se calcula</summary><p>${esc(EXPLAIN[c.type])}</p></details>
    </section>
    <section class="panel result" id="bl-result" aria-live="polite">${backLayResult()}</section>
  </div>`;
}

function backLayResult() {
  const { c, res } = backLayInput();
  if (!res.valid) return '<div class="empty"><p>Escribe el importe y las dos cuotas.</p><p class="muted small">Las cuotas tienen que ser mayores que 1. Puedes usar coma o punto.</p></div>';
  const stake = n(c.stake);
  const free = c.type === 'snr' || c.type === 'sr';
  const bookOnBackWin = c.type === 'sr' ? stake * n(c.back) : stake * (n(c.back) - 1);
  const bookOnLayWin = free ? 0 : -stake;
  const exOnLayWin = res.layStake * (1 - n(c.commission) / 100);
  const refundVal = c.type === 'refund' ? n(c.refund) * n(c.retention) / 100 : 0;
  const instr = `Apuesta ${fmt.eur(stake)}${free ? ' (apuesta gratis)' : ''} a favor a ${fmt.odds(n(c.back))} y ${fmt.eur(res.layStake)} en contra a ${fmt.odds(n(c.lay))}. Necesitas ${fmt.eur(res.liability)} de saldo en el exchange.`;

  const L = n(c.lay);
  let down = L; let up = L;
  const lows = []; const highs = [];
  for (let i = 0; i < 2; i += 1) { down = O.prevTick(down); lows.unshift(down); up = O.nextTick(up); highs.push(up); }
  const sens = [...new Set([...lows, L, ...highs])].filter((x) => x > 1).map((l) => ({ l, p: C.backLay({ ...c, lay: l, layStake: undefined }).profit, cur: l === L }));

  const metric = free
    ? `<div class="metric"><span>Retención</span><b>${fmt.pct(res.retention)}</b></div>`
    : `<div class="metric"><span>Rating</span><b>${fmt.pct(res.rating)}</b></div>`;
  const size = c.context?.laySize;
  const liq = Number.isFinite(size)
    ? (size >= res.layStake
      ? `<p class="small ok">${icon('check', 14)} Hay ${fmt.eur(size)} disponibles en contra: suficiente.</p>`
      : `<p class="small warn">${icon('info', 14)} Solo había ${fmt.eur(size)} disponibles en contra a esa cuota. Lo que no se case quedará pendiente.</p>`)
    : '';

  return `<div class="hero-number">
      <span class="eyebrow">Apuesta en contra</span>
      <span class="big lay-ink">${fmt.eur(res.layStake)}</span>
      <span class="sub">a cuota ${fmt.odds(n(c.lay))} · responsabilidad <b>${fmt.eur(res.liability)}</b></span>
    </div>
    <p class="instr">${esc(instr)}</p>
    ${liq}
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Si gana</th><th>Casa</th><th>Exchange</th><th>Total</th></tr></thead>
      <tbody>
        <tr><th scope="row"><span class="dot-back"></span>A favor</th><td>${money(bookOnBackWin)}</td><td>${money(-res.liability)}</td><td><b>${money(res.ifBackWins)}</b></td></tr>
        <tr><th scope="row"><span class="dot-lay"></span>En contra</th><td>${money(bookOnLayWin)}${refundVal ? `<span class="muted small"> + ${fmt.eur(refundVal)} del reembolso</span>` : ''}</td><td>${money(exOnLayWin)}</td><td><b>${money(res.ifLayWins)}</b></td></tr>
      </tbody>
    </table></div>
    <div class="metrics">
      <div class="metric"><span>Resultado asegurado</span><b class="${sign(res.profit)}">${fmt.signedEur(res.profit)}</b></div>
      ${metric}
    </div>
    <div class="sens">
      <span class="field-label">Si la cuota en contra se mueve antes de cubrir</span>
      <div class="sens-row">${sens.map((s) => `<span class="sens-cell ${s.cur ? 'is-current' : ''}"><span class="odd odd-lay">${fmt.odds(s.l)}</span><span class="money ${sign(s.p)}">${fmt.signedEur(s.p)}</span></span>`).join('')}</div>
    </div>
    <div class="actions">
      <button class="btn" data-act="copy-instr" data-text="${esc(instr)}">${icon('copy', 16)} Copiar</button>
      <button class="btn btn-primary" data-act="bl-log">${icon('save', 16)} Ya lo he apostado: anotar</button>
    </div>`;
}

function refreshBackLay() {
  const el = document.getElementById('bl-result');
  if (el) el.innerHTML = backLayResult();
  const lab = document.getElementById('adjust-label');
  if (lab) lab.textContent = adjustLabel(state.calc.bl.adjust);
}

/* ------------------------------------------------------------ combinadas */

function renderAcca() {
  const a = state.calc.acca;
  return `${flowBar()}${pageHead('Calculadoras', 'Cubre una combinada selección a selección según se van jugando los partidos.')}
  ${calcTabs('combinadas')}
  <p class="calc-use">${icon('info', 15)} La usas con la mitad de las freebets de <b>DAZN Bet</b>, que van en combinadas: modo «Freebet SNR», dos partidos distintos con cuota total entre 4 y 8.</p>
  <div class="calc-grid">
    <section class="panel">
      <div class="field"><span class="field-label">Tipo de apuesta</span>${seg('calc.acca.type', [['normal', 'Con dinero'], ['snr', 'Freebet SNR'], ['sr', 'Freebet SR']])}</div>
      <div class="form-grid pair">
        ${field('calc.acca.stake', 'Importe de la combinada', { unit: '€' })}
        ${field('calc.acca.commission', 'Comisión exchange', { unit: '%' })}
      </div>
      <div class="legs legs-acca">
        <div class="legs-head"><span>#</span><span>A favor</span><span>En contra</span><span>Estado</span><span>Puesto en contra</span><span></span></div>
        ${a.legs.map((l, i) => `<div class="leg">
          <span class="leg-n l-n">${i + 1}</span>
          <input class="in-back l-back" data-k="calc.acca.legs.${i}.back" inputmode="decimal" value="${esc(l.back ?? '')}" aria-label="Cuota a favor de la selección ${i + 1}">
          <input class="in-lay l-lay" data-k="calc.acca.legs.${i}.lay" inputmode="decimal" value="${esc(l.lay ?? '')}" aria-label="Cuota en contra de la selección ${i + 1}">
          <select class="l-status" data-k="calc.acca.legs.${i}.status" data-full="1" aria-label="Estado de la selección ${i + 1}">
            ${[['pending', 'Pendiente'], ['won', 'Acertada'], ['lost', 'Fallada']].map(([v, t]) => `<option value="${v}" ${l.status === v ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          ${l.status === 'pending' ? '<span class="muted small l-placed l-empty">—</span>' : `<span class="field-input l-placed"><input data-k="calc.acca.legs.${i}.layStakePlaced" inputmode="decimal" value="${esc(l.layStakePlaced ?? '')}" placeholder="Calculado" aria-label="Importe en contra que pusiste en la selección ${i + 1}"><span class="unit">€</span></span>`}
          <button class="btn btn-ghost btn-icon l-del" data-act="acca-del" data-i="${i}" ${a.legs.length <= 1 ? 'disabled' : ''} aria-label="Quitar selección ${i + 1}">${icon('trash', 16)}</button>
        </div>`).join('')}
        <button class="btn btn-ghost btn-sm" data-act="acca-add" ${a.legs.length >= 12 ? 'disabled' : ''}>${icon('plus', 16)} Añadir selección</button>
        <p class="field-hint">Las cuotas en contra de las selecciones que aún no han empezado son estimadas: actualízalas justo antes de cubrir cada una.</p>
      </div>
      <details class="explain"><summary>${icon('info', 15)} Cómo se calcula</summary><p>Se calcula de la última selección a la primera: la última se cubre como una apuesta normal por todo lo que pagaría la combinada, y cada una de las anteriores por lo que ganarías en contra en la siguiente. Así el resultado es el mismo falle la selección que falle.</p></details>
    </section>
    <section class="panel result" id="acca-result" aria-live="polite">${accaResult()}</section>
  </div>`;
}

function accaResult() {
  const res = C.accaLay(state.calc.acca);
  if (!res.valid) return '<div class="empty"><p>Completa el importe y las cuotas de cada selección.</p></div>';
  const next = res.nextIndex >= 0 ? res.legs[res.nextIndex] : null;
  const head = res.settledProfit != null
    ? `<div class="hero-number"><span class="eyebrow">Resultado final</span><span class="big ${sign(res.settledProfit)}">${fmt.signedEur(res.settledProfit)}</span><span class="sub">combinada terminada</span></div>`
    : `<div class="hero-number"><span class="eyebrow">Ahora: cubre la selección ${res.nextIndex + 1}</span><span class="big lay-ink">${fmt.eur(next.layStake)}</span><span class="sub">en contra a ${fmt.odds(next.lay)} · responsabilidad <b>${fmt.eur(next.liability)}</b></span></div>`;
  return `${head}
    <div class="metrics">
      <div class="metric"><span>Cuota combinada</span><b>${fmt.odds(res.accaOdds)}</b></div>
      <div class="metric"><span>Resultado asegurado</span><b class="${sign(res.profit)}">${fmt.signedEur(res.profit)}</b></div>
      <div class="metric"><span>Mayor responsabilidad</span><b>${fmt.eur(res.maxLiability)}</b></div>
    </div>
    <div class="table-wrap"><table class="outcomes">
      <thead><tr><th>Selección</th><th>En contra</th><th>Responsabilidad</th><th>Estado</th></tr></thead>
      <tbody>${res.legs.map((l, i) => `<tr class="${i === res.nextIndex ? 'is-next' : ''}"><th scope="row">${i + 1} <span class="muted small">${fmt.odds(l.back)} / ${fmt.odds(l.lay)}</span></th><td><b>${fmt.eur(l.layStake)}</b></td><td>${fmt.eur(l.liability)}</td><td>${{ pending: i === res.nextIndex ? '<span class="pill pill-active">Siguiente</span>' : '<span class="pill">Pendiente</span>', won: '<span class="pill pill-done">Acertada</span>', lost: '<span class="pill pill-skip">Fallada</span>' }[l.status]}</td></tr>`).join('')}</tbody>
    </table></div>
    <details class="more-detail"><summary>Resultado en cada caso</summary>
      <ul class="outcome-list">${res.outcomes.map((o) => `<li><span>${esc(o.label)}</span>${money(o.profit)}</li>`).join('')}</ul>
    </details>
    <div class="actions"><button class="btn btn-primary" data-act="acca-log">${icon('save', 16)} Anotar en beneficios</button></div>`;
}

/* ------------------------------------------------------------ rollover */

function renderRollover() {
  return `${flowBar()}${pageHead('Calculadoras', 'Comprueba si un bono con rollover te sale a cuenta antes de empezarlo.')}
  ${calcTabs('rollover')}
  <p class="calc-use">${icon('info', 15)} La usas con el bono de <b>Sportium</b> (200 € con rollover x8): dice cuánto hay que apostar, lo que cuesta y lo que te queda.</p>
  <div class="calc-grid">
    <section class="panel">
      <div class="form-grid pair">
        ${field('calc.roll.deposit', 'Depósito', { unit: '€' })}
        ${field('calc.roll.bonus', 'Bono', { unit: '€' })}
        ${field('calc.roll.multiplier', 'Rollover', { unit: 'veces' })}
        ${select('calc.roll.base', 'Se multiplica sobre', [['bonus', 'El bono'], ['both', 'Depósito + bono'], ['deposit', 'El depósito']])}
        ${field('calc.roll.avgRating', 'Rating medio', { unit: '%', hint: 'Con buenas cuotas, entre 95 y 98 %.' })}
        ${field('calc.roll.stakePerBet', 'Importe por apuesta', { unit: '€' })}
      </div>
      <details class="explain"><summary>${icon('info', 15)} Cómo se calcula</summary><p>Cada euro apostado cubierto te cuesta lo que le falta al rating para llegar al 100 %. El valor del bono es el bono menos ese coste por todo lo que tienes que apostar.</p></details>
    </section>
    <section class="panel result" id="roll-result" aria-live="polite">${rollResult()}</section>
  </div>`;
}

function rollResult() {
  const r = C.rollover(state.calc.roll);
  if (!r.valid) return '<div class="empty"><p>Escribe el bono, el rollover y el rating medio.</p></div>';
  const good = r.value > 0;
  return `<div class="hero-number">
      <span class="eyebrow">Valor esperado del bono</span>
      <span class="big ${sign(r.value)}">${fmt.signedEur(r.value)}</span>
      <span class="sub"><span class="pill ${good ? 'pill-done' : 'pill-skip'}">${good ? 'Te sale a cuenta' : 'No te sale a cuenta'}</span></span>
    </div>
    <div class="metrics">
      <div class="metric"><span>Hay que apostar</span><b>${fmt.eur(r.turnover)}</b></div>
      <div class="metric"><span>Coste de liberarlo</span><b>${fmt.eur(r.cost)}</b></div>
      <div class="metric"><span>Rating mínimo para ganar</span><b>${fmt.pct(r.breakEvenRating)}</b></div>
      ${r.bets ? `<div class="metric"><span>Apuestas necesarias</span><b>${r.bets}</b></div>` : ''}
    </div>
    <p class="instr">Con un rating medio del ${fmt.pct(nz(state.calc.roll.avgRating))}, mover ${fmt.eur(r.turnover)} cuesta ${fmt.eur(r.cost)}.</p>
    <div class="actions"><a class="btn" href="#oddsmatcher" data-act="roll-find">${icon('search', 16)} Buscar cuotas para liberarlo</a></div>`;
}

/* ------------------------------------------------------------ rutas y acciones */

const refresher = (id, fn) => () => { const el = document.getElementById(id); if (el) el.innerHTML = fn(); };

route('calculadora', { render: renderBackLay, refresh: refreshBackLay, nav: 'calculadora' });
route('combinadas', { render: renderAcca, refresh: refresher('acca-result', accaResult), nav: 'calculadora' });
route('rollover', { render: renderRollover, refresh: refresher('roll-result', rollResult), nav: 'calculadora' });

registerActions({
  'bl-clear': () => { state.calc.bl.context = null; save(); render(); },
  'bl-reset-adjust': () => { state.calc.bl.adjust = 0; save(); render(); },
  'copy-instr': (b) => copyText(b.dataset.text),
  'bl-log': () => {
    const { c, res } = backLayInput();
    if (!res.valid) return;
    const kind = { normal: 'qualifying', snr: 'freebet', sr: 'freebet', refund: 'refund' }[c.type];
    const desc = c.context ? `${c.context.event} · ${c.context.sel}` : `${C.BET_TYPES[c.type]} a ${fmt.odds(n(c.back))}`;
    logBet({ bookie: c.context?.bookie || state.flow?.bookie || '', kind, desc, profit: res.profit });
    render();
  },
  'acca-log': () => {
    const res = C.accaLay(state.calc.acca);
    if (!res.valid) return;
    logBet({ bookie: state.flow?.bookie || '', kind: state.calc.acca.type === 'normal' ? 'qualifying' : 'freebet', desc: `Combinada de ${res.legs.length} a ${fmt.odds(res.accaOdds)}`, profit: res.settledProfit ?? res.profit });
    render();
  },
  'acca-add': () => { state.calc.acca.legs.push({ back: '', lay: '', status: 'pending' }); save(); render(); },
  'acca-del': (b) => { state.calc.acca.legs.splice(Number(b.dataset.i), 1); save(); render(); },
  'roll-find': () => {
    // Cuotas bajas: el rollover se libera con calificantes y así no hace falta mucho saldo en Betfair.
    const fo = state.flow && state.offers.find((o) => o.id === state.flow.offerId);
    const minOdds = fo?.kind === 'rollover' ? Math.max(1.01, C.num(fo.params?.minOdds) || 1.5) : 1.5;
    Object.assign(state.om, {
      mode: 'normal', minOdds, maxOdds: Math.max(2.5, minOdds + 0.5), stake: C.num(state.calc.roll.stakePerBet) || state.om.stake, open: null, check: null, limit: 60,
    });
    save();
  },
});

export { go };
