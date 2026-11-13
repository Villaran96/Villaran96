// Guía: curso paso a paso con ejemplos calculados en directo, test de comprensión
// y botones que abren la herramienta exacta con los números de cada ejemplo.

import {
  state, C, O, nz, save, render, go, route, registerActions, money, pageHead, brand, plans, priceLabel, content,
  assumptions, runStep, offerFromSource, offerSteps, lockCard, rangeText,
} from '../core.js';
import {
  fmt, esc, icon, toast, reviewedLabel,
} from '../util.js';
import { EXCHANGE_HOME, OFFER_KINDS, bookieHome } from '../data.js';
import { markdown } from '../markdown.js';

const commission = () => nz(state.settings.commissions.betfair_es ?? state.settings.defaultCommission, 2);

/* ------------------------------------------------------------ piezas reutilizables */

function tryBtn(act, preset, label, primary = false) {
  return `<button class="btn btn-sm ${primary ? 'btn-primary' : ''}" data-act="${act}" data-preset="${preset}">${label} ${icon('arrow', 14)}</button>`;
}

function outcomeTable(res, { stake, back, type, sel = 'tu selección' }) {
  const free = type === 'snr' || type === 'sr';
  const bookWin = type === 'sr' ? stake * back : stake * (back - 1);
  const bookLose = free ? 0 : -stake;
  return `<div class="table-wrap"><table class="outcomes">
    <thead><tr><th>Si…</th><th>Casa</th><th>Exchange</th><th>Total</th></tr></thead>
    <tbody>
      <tr><th scope="row"><span class="dot-back"></span>${esc(sel)} sí</th><td>${money(bookWin)}</td><td>${money(-res.liability)}</td><td><b>${money(res.ifBackWins)}</b></td></tr>
      <tr><th scope="row"><span class="dot-lay"></span>${esc(sel)} no</th><td>${money(bookLose)}</td><td>${money(res.layStake * (1 - commission() / 100))}</td><td><b>${money(res.ifLayWins)}</b></td></tr>
    </tbody>
  </table></div>`;
}

function quiz(id, question, options, correct, explain) {
  const chosen = state.guide.quiz[id];
  const answered = chosen != null;
  return `<div class="quiz" role="group" aria-label="${esc(question)}">
    <p class="quiz-q"><b>${icon('star', 15)} ${esc(question)}</b></p>
    <div class="quiz-options">${options.map((o, i) => {
      const cls = !answered ? '' : i === correct ? 'is-right' : i === chosen ? 'is-wrong' : '';
      return `<button class="quiz-opt ${cls}" data-act="quiz" data-q="${id}" data-i="${i}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`;
    }).join('')}</div>
    ${answered ? `<p class="quiz-explain ${chosen === correct ? 'ok' : 'warn'}">${chosen === correct ? '¡Correcto!' : 'No exactamente.'} ${esc(explain)} <button class="link" data-act="quiz-reset" data-q="${id}">Repetir</button></p>` : ''}
  </div>`;
}

function checklist(id, items) {
  const checks = state.guide.checks[id] || {};
  return `<ul class="checklist">${items.map(([key, text, extra = '']) => `<li><label class="check"><input type="checkbox" data-act-change="guide-check" data-list="${id}" data-key="${key}" ${checks[key] ? 'checked' : ''}><span>${text}</span></label>${extra}</li>`).join('')}</ul>`;
}

/* ------------------------------------------------------------ lecciones */

function lessons() {
  const c = commission();
  const q = C.backLay({ stake: 10, back: 3, lay: 3.1, commission: c });
  const snr = C.backLay({ stake: 10, back: 5, lay: 5.2, commission: c, type: 'snr' });
  const sr = C.backLay({ stake: 10, back: 5, lay: 5.2, commission: c, type: 'sr' });
  const fb25 = C.backLay({ stake: 25, back: 6, lay: 6.2, commission: c, type: 'snr' });
  const ref = C.backLay({ stake: 50, back: 4, lay: 4.1, commission: c, type: 'refund', refund: 50, retention: 65 });
  const roll = C.rollover({ bonus: 100, multiplier: 6, avgRating: 97 });
  const p = plans();

  return [
    {
      id: 'g1',
      title: 'Qué es el matched betting y por qué funciona',
      minutes: 4,
      html: () => `
        <p>Las casas de apuestas regalan dinero en forma de <b>apuestas gratis</b> para que te registres o sigas jugando. El matched betting (apuestas cubiertas) convierte ese regalo en dinero sin depender de acertar.</p>
        <p>La idea: apuestas <span class="back-ink">a favor</span> de algo en la casa y <span class="lay-ink">en contra</span> de lo mismo en un exchange como Betfair. Pase lo que pase en el partido, una apuesta gana y la otra pierde, y el resultado queda casi igual. Lo que te llevas es el valor de la promoción.</p>
        <h3>Un ejemplo con números</h3>
        <p>Apuestas 10 € a favor del Sevilla a cuota ${fmt.odds(3)} en la casa y ${fmt.eur(q.layStake)} en contra del Sevilla a ${fmt.odds(3.1)} en Betfair:</p>
        ${outcomeTable(q, { stake: 10, back: 3, type: 'normal', sel: 'Gana el Sevilla' })}
        <p>Gane o no el Sevilla, el resultado es ${fmt.signedEur(q.profit)}. Es lo que cuesta desbloquear un bono, y la apuesta gratis que recibes después vale mucho más.</p>
        <div class="note">No es apostar para ganar: es una cuenta de números. Si alguna vez dejas de verlo así, para.</div>`,
    },
    {
      id: 'g2',
      title: 'Lo que necesitas antes de empezar',
      minutes: 3,
      html: () => `
        <p>Antes del primer bono, ten esto listo. Puedes ir marcándolo:</p>
        ${checklist('setup', [
          ['adult', 'Tener 18 años o más y vivir en España.'],
          ['dni', 'El DNI o NIE a mano: todas las casas verifican tu identidad.'],
          ['bank', 'Una cuenta bancaria y una tarjeta a tu nombre. Mejor una solo para esto.'],
          ['betfair', 'Una cuenta en Betfair.es con el exchange activado.', `<a class="btn btn-ghost btn-xs" href="${EXCHANGE_HOME}" target="_blank" rel="noopener">Abrir Betfair.es ${icon('external', 13)}</a>`],
          ['money', 'Saldo para empezar: como orientación, entre 150 y 300 €.'],
          ['casas', 'Marcar en Ajustes las casas en las que ya tienes cuenta, para filtrar el oddsmatcher.', `<a class="btn btn-ghost btn-xs" href="#ajustes">Ir a Mis casas ${icon('arrow', 13)}</a>`],
        ])}
        <div class="note">Usa solo casas con licencia en España. Las tienes en <a href="https://www.ordenacionjuego.es" target="_blank" rel="noopener">ordenacionjuego.es</a>.</div>`,
    },
    {
      id: 'g3',
      title: 'El exchange: a favor, en contra y responsabilidad',
      minutes: 5,
      html: () => {
        const lay = C.backLay({ stake: 10, back: 3, lay: 3.1, commission: c, layStake: 10 });
        return `
        <p>En la casa solo puedes apostar <b class="back-ink">a favor</b>: ganas si pasa lo que eliges. En un exchange las personas apuestan entre sí y también puedes apostar <b class="lay-ink">en contra</b>: ganas si <i>no</i> pasa. En Betfair el azul es a favor y el rosa en contra; aquí usamos los mismos colores.</p>
        <h3>Qué ganas y qué arriesgas en contra</h3>
        <p>Si apuestas 10 € en contra a cuota ${fmt.odds(3.1)}:</p>
        <ul>
          <li>Si lo que elegiste <b>no</b> pasa, ganas los 10 € menos la comisión: ${fmt.eur(10 * (1 - c / 100))}.</li>
          <li>Si <b>sí</b> pasa, pagas 10 × (${fmt.odds(3.1)} − 1) = <b>${fmt.eur(lay.liability)}</b>. Esa cantidad es la <b>responsabilidad</b> y tiene que estar en tu saldo del exchange antes de apostar.</li>
        </ul>
        <h3>Comisión, liquidez y escalones</h3>
        <ul>
          <li><b>Comisión:</b> el exchange se queda un porcentaje de lo que ganas en cada mercado. Ponla en Ajustes; todos los cálculos la tienen en cuenta.</li>
          <li><b>Liquidez:</b> es el dinero que hay esperando a esa cuota. Si pones en contra más de lo disponible, una parte queda sin casar. El oddsmatcher te avisa cuando no llega.</li>
          <li><b>Escalones:</b> en Betfair las cuotas solo pueden tomar ciertos valores (de 0,01 en 0,01 hasta 2; de 0,02 en 0,02 hasta 3…). Por eso a veces la cuota más cercana está un poco por encima.</li>
        </ul>
        <div class="lesson-actions">${tryBtn('guide-om', 'calif', 'Ver cuotas explicadas en el oddsmatcher', true)}</div>`;
      },
    },
    {
      id: 'g4',
      title: 'Freebets: SNR, SR y cómo distinguirlas',
      minutes: 8,
      html: () => {
        const ladder = [2, 3, 4, 5, 6, 8, 10].map((b) => {
          const l = O.nextTick(O.nextTick(b));
          const r = C.backLay({ stake: 10, back: b, lay: l, commission: c, type: 'snr' });
          return { b, l, ret: r.retention, liab: r.liability };
        });
        return `
        <p>Una <b>freebet</b> o apuesta gratis es una apuesta que te regala la casa: no pones tu dinero. Hay dos tipos y es importante saber cuál tienes, porque se cubren distinto.</p>
        <div class="compare">
          <div class="compare-col">
            <span class="pill pill-active">SNR · la habitual</span>
            <h3>Sin devolución del importe</h3>
            <p>Del inglés <i>stake not returned</i>. Si aciertas, cobras <b>solo la ganancia</b>; el importe de la freebet no vuelve.</p>
            <p class="example">10 € a cuota ${fmt.odds(5)} → si aciertas cobras <b>${fmt.eur(40)}</b> (no 50 €).</p>
          </div>
          <div class="compare-col">
            <span class="pill">SR · menos frecuente</span>
            <h3>Con devolución del importe</h3>
            <p>Del inglés <i>stake returned</i>. Si aciertas, cobras <b>la ganancia más el importe</b>, como en una apuesta normal.</p>
            <p class="example">10 € a cuota ${fmt.odds(5)} → si aciertas cobras <b>${fmt.eur(50)}</b>.</p>
          </div>
        </div>
        <h3>Cómo se cubre cada una</h3>
        <p>Con una freebet de 10 € a ${fmt.odds(5)} y cuota en contra de ${fmt.odds(5.2)} (comisión ${fmt.n2(c)} %):</p>
        <div class="compare">
          <div class="compare-col">
            <b>SNR</b>
            <p>Solo se cubre lo que puedes cobrar: en contra = 10 × (${fmt.odds(5)} − 1) ÷ (${fmt.odds(5.2)} − ${fmt.n2(c)} %) = <b>${fmt.eur(snr.layStake)}</b>.</p>
            <p>Te quedas con <b class="pos">${fmt.eur(snr.profit)}</b> pase lo que pase: una <b>retención del ${fmt.pct(snr.retention)}</b>.</p>
          </div>
          <div class="compare-col">
            <b>SR</b>
            <p>Se cubre todo el cobro: en contra = 10 × ${fmt.odds(5)} ÷ (${fmt.odds(5.2)} − ${fmt.n2(c)} %) = <b>${fmt.eur(sr.layStake)}</b>.</p>
            <p>Te quedas con <b class="pos">${fmt.eur(sr.profit)}</b>: una <b>retención del ${fmt.pct(sr.retention)}</b>.</p>
          </div>
        </div>
        <h3>Por qué la SNR se juega a cuota alta</h3>
        <p>Como no recuperas el importe, cuanto más alta es la cuota, más parte de la freebet conviertes en dinero. A cambio, la responsabilidad en el exchange sube y hay menos liquidez. Con una freebet SNR de 10 €:</p>
        <div class="table-wrap"><table class="outcomes ladder">
          <thead><tr><th>Cuota a favor</th><th>En contra</th><th>Retención</th><th>Responsabilidad</th></tr></thead>
          <tbody>${ladder.map((x) => `<tr class="${x.b >= 4 && x.b <= 8 ? 'is-sweet' : ''}"><th scope="row">${fmt.odds(x.b)}</th><td>${fmt.odds(x.l)}</td><td><b>${fmt.pct(x.ret)}</b></td><td>${fmt.eur(x.liab)}</td></tr>`).join('')}</tbody>
        </table></div>
        <p>Entre 4 y 8 (resaltado) retienes un 70–80 % si la diferencia entre cuotas es pequeña, pero hace falta bastante saldo en el exchange. Para empezar, entre 3 y 4 retienes un 63–70 % con mucho menos saldo: por eso valoramos los bonos con esa cifra prudente. Con una SR, en cambio, la retención apenas cambia con la cuota: busca la menor diferencia entre favor y contra.</p>
        <h3>Cómo saber cuál es la tuya</h3>
        <ul>
          <li>Es <b>SNR</b> si las condiciones dicen cosas como «el importe de la apuesta gratuita no se incluye en las ganancias», «solo recibirás las ganancias netas» o «créditos de apuesta». En España es la gran mayoría.</li>
          <li>Es <b>SR</b> si dicen que el importe «se devolverá» o se incluye en el pago.</li>
          <li>Si dudas, cúbrela como <b>SNR</b>: si al final era SR, ganarás algo más de lo calculado cuando acierte a favor. Al revés podrías perder.</li>
          <li>«Apuesta sin riesgo» normalmente es un <b>reembolso</b>: lo verás en la lección 6.</li>
        </ul>
        ${quiz('fb1', 'Te dan 20 € en freebet SNR, apuestas a cuota 4,00 y aciertas. ¿Cuánto cobras?', ['80 €', '60 €', '20 €'], 1, 'En una SNR cobras solo la ganancia: 20 × (4 − 1) = 60 €.')}
        ${quiz('fb2', '¿A qué cuota conviene jugar una freebet SNR?', ['Entre 1,50 y 2,00', 'Entre 4 y 8', 'Da igual la cuota'], 1, 'A cuota alta conviertes más parte de la freebet en dinero; entre 4 y 8 la responsabilidad sigue siendo razonable.')}
        ${quiz('fb3', 'Las condiciones dicen «el importe de la apuesta gratuita no se incluye en las ganancias». ¿Qué tipo es?', ['SNR', 'SR', 'Un reembolso'], 0, 'Si el importe no se incluye en lo que cobras, es sin devolución: SNR.')}
        <div class="lesson-actions">
          ${tryBtn('guide-calc', 'snr10', 'Probar una SNR de 10 € en la calculadora', true)}
          ${tryBtn('guide-om', 'snr', 'Buscar cuotas para freebets')}
        </div>`;
      },
    },
    {
      id: 'g5',
      title: 'La apuesta calificante y el rating',
      minutes: 4,
      html: () => `
        <p>La <b>apuesta calificante</b> es la que exige la casa para darte la promoción («apuesta 10 € y recibe 25 €»). No buscas ganar con ella: buscas perder lo mínimo al cubrirla.</p>
        <h3>El rating</h3>
        <p>El oddsmatcher ordena las cuotas por <b>rating</b>: el porcentaje del importe que recuperas. Con 100 % no pierdes nada; con 98 % pierdes 20 céntimos de cada 10 €.</p>
        <p class="formula">Rating = cuota a favor × (1 − comisión) ÷ (cuota en contra − comisión)</p>
        <h3>Cómo elegir</h3>
        <ul>
          <li>Busca un rating del 95 % o más.</li>
          <li>Respeta la <b>cuota mínima</b> de la promoción y el tipo de apuesta (simple, antes del partido…).</li>
          <li>Apuesta primero a favor en la casa y justo después en contra en el exchange.</li>
        </ul>
        <p>Ejemplo: 10 € a ${fmt.odds(3)} y en contra a ${fmt.odds(3.1)} dan un rating del ${fmt.pct(q.rating)}: pierdes ${fmt.eur(-q.profit)}.</p>
        <div class="lesson-actions">${tryBtn('guide-om', 'calif', 'Ver calificantes de 95 % o más', true)}${tryBtn('guide-calc', 'qual', 'Abrir la calculadora')}</div>`,
    },
    {
      id: 'g6',
      title: 'Reembolsos: la «apuesta sin riesgo»',
      minutes: 4,
      html: () => `
        <p>En un reembolso la casa te devuelve el importe si tu apuesta pierde, casi siempre como <b>freebet SNR</b>. Como esa freebet luego la conviertes en un 60–75 % de dinero, el reembolso vale aproximadamente <b>importe × retención</b>.</p>
        <h3>Cómo se cubre</h3>
        <p>Se cubre contando con ese valor: cuanto más alta la cuota, más probable es que la apuesta a favor pierda y más vale el reembolso. Busca cuotas entre 3 y 6.</p>
        <p>Ejemplo: 50 € a ${fmt.odds(4)}, en contra a ${fmt.odds(4.1)}, reembolso de 50 € que vale un 65 % al convertirlo:</p>
        ${outcomeTable(ref, { stake: 50, back: 4, type: 'refund', sel: 'Tu apuesta' })}
        <p>Si pierde la apuesta a favor, a esos ${fmt.signedEur(ref.ifLayWins)} se llega al convertir el reembolso. Pase lo que pase acabas con unos ${fmt.eur(ref.profit)}.</p>
        <div class="lesson-actions">${tryBtn('guide-calc', 'refund', 'Probar este reembolso en la calculadora', true)}</div>`,
    },
    {
      id: 'g7',
      title: 'Bonos con rollover',
      minutes: 4,
      html: () => `
        <p>Algunas casas te dan saldo extra (por ejemplo, el 100 % de tu depósito) que tienes que apostar varias veces antes de poder retirarlo. Esas veces son el <b>rollover</b>.</p>
        <p>Como cada apuesta se cubre, cada euro apostado cuesta lo que le falta al rating para llegar al 100 %. Un bono de 100 € con rollover x6 obliga a apostar 600 €; con un rating medio del 97 % cuesta ${fmt.eur(roll.cost)} y vale <b class="pos">${fmt.signedEur(roll.value)}</b>.</p>
        <p>Si el rollover es muy alto o la cuota mínima muy exigente, puede no salir a cuenta: compruébalo siempre antes de depositar.</p>
        <div class="lesson-actions">${tryBtn('guide-go', 'rollover', 'Abrir la calculadora de rollover', true)}</div>`,
    },
    {
      id: 'g8',
      title: 'Tu primer bono, paso a paso',
      minutes: 6,
      html: () => `
        <p>${esc(brand())} te lleva de la mano. Así se hace un bono de principio a fin:</p>
        <ol class="flow-steps">
          <li><b>Elige el bono.</b> En Bonos → Bienvenida están ordenados por lo que valen. Empieza por arriba.</li>
          <li><b>Pulsa «Empezar este bono».</b> Arriba aparecerá la barra del bono en curso con el paso en el que estás.</li>
          <li><b>Regístrate</b> en la casa con el botón «Abrir…» y verifica tu cuenta.</li>
          <li><b>«Buscar cuota»</b> abre el oddsmatcher ya filtrado con esa casa, la cuota mínima y el importe.</li>
          <li><b>Pulsa un partido</b> para ver el cálculo: qué apostar, dónde y cuánto. Los botones abren la casa y Betfair.</li>
          <li><b>Apuesta primero a favor</b> en la casa y, justo después, <b>en contra</b> en Betfair con el importe exacto.</li>
          <li><b>«Ya lo he apostado: anotar»</b> guarda el resultado en Beneficios y marca el paso como hecho.</li>
          <li>Cuando llegue la <b>freebet</b>, repite con el modo freebet. Al terminar, <b>completa el bono</b> con lo que has ganado.</li>
        </ol>
        <div class="note">Antes de confirmar en el exchange revisa tres cosas: misma selección y mercado, el importe exacto y que la cuota no ha cambiado.</div>
        <div class="lesson-actions">${tryBtn('guide-go', 'bonos', 'Ir a los bonos de bienvenida', true)}</div>`,
    },
    {
      id: 'g9',
      title: 'Errores que cuestan dinero',
      minutes: 4,
      html: () => `
        <p>Casi todas las pérdidas vienen de despistes. Repasa esta lista hasta que te salga sola:</p>
        ${checklist('errors', [
          ['market', 'Apostar en contra en otro mercado o selección (por ejemplo, «Empate» en vez de «Sevilla»).'],
          ['amount', 'Escribir mal el importe: revisa comas y puntos.'],
          ['stale', 'Usar una cuota en contra que ya ha cambiado: recalcula antes de confirmar.'],
          ['balance', 'No tener saldo para la responsabilidad en el exchange.'],
          ['terms', 'Apostar con cuota menor a la mínima o en un tipo de apuesta que no cuenta para la promoción.'],
          ['deadline', 'Dejar caducar la freebet: mira la fecha límite.'],
          ['liquidity', 'Dejar parte de la apuesta en contra sin casar por falta de liquidez.'],
        ])}`,
    },
    {
      id: 'g10',
      title: 'Después de los de bienvenida: las recurrentes',
      minutes: 3,
      html: () => `
        <p>Los bonos de bienvenida se acaban. Lo que no se acaba son las <b>promociones recurrentes</b>: freebets semanales, reembolsos en partidos concretos, supercuotas… Cada una vale poco, pero juntas suman cada mes.</p>
        <p>En el plan ${esc(p.recurrentes.name)} (${esc(priceLabel(p.recurrentes))}) tienes el calendario de cada semana con el valor de cada promoción y sus pasos.</p>
        <div class="lesson-actions">${tryBtn('guide-go', 'recurrentes', 'Ver las recurrentes', true)}${tryBtn('guide-go', 'planes', 'Comparar planes')}</div>`,
    },
    {
      id: 'g11',
      title: 'Y Hacienda, ¿qué?',
      minutes: 2,
      html: () => `
        <p>Las ganancias del juego tributan en el IRPF como ganancias patrimoniales, y las pérdidas solo compensan hasta el importe de las ganancias del mismo año. Por eso conviene anotar cada operación en Beneficios desde el primer día.</p>
        <p>En el plan ${esc(p.metodo.name)} te explicamos paso a paso qué se declara, qué documentos pedir a cada casa y cómo hacerlo en Renta Web, con una hoja de control que usa tus propios datos.</p>
        <div class="lesson-actions">${tryBtn('guide-go', 'metodo', 'Conocer el Método', true)}</div>`,
    },
  ];
}

/* ------------------------------------------------------------ tus 5 casas */

const e0 = (x) => fmt.eur0(C.num(x));

function summaryRows(g) {
  const p = g.params || {};
  const range = rangeText(g);
  const rows = [['Lo que vale', `<b class="pos">${fmt.signedEur(C.offerValue(g, assumptions()))}</b> estimados${range ? ` <span class="muted small">(${range}, según las cuotas que encuentres)</span>` : ''}`]];
  if (g.kind === 'bet_get') {
    rows.push(['Apuesta calificante', `${e0(p.qualStake)} a cuota ${fmt.odds(C.num(p.minOdds))} o más`]);
    const parts = [`${e0(p.freebet)} en freebets ${p.freebetType === 'sr' ? 'SR' : 'SNR'}`];
    if (C.num(p.parts) > 1) parts.push(`en ${C.num(p.parts)} depósitos`);
    if (C.num(p.chunk) > 0) parts.push(`de hasta ${e0(p.chunk)} cada una`);
    if (C.num(p.fbMaxOdds) > 1) parts.push(`a cuota ${fmt.odds(C.num(p.fbMaxOdds))} como máximo`);
    if (C.num(p.accaShare) > 0) parts.push(`el ${C.num(p.accaShare)} % para combinadas`);
    if (C.num(p.extra) > 0) parts.push(`y ${e0(p.extra)} extra`);
    rows.push(['Recibes', parts.join(', ')]);
  } else if (g.kind === 'refund') {
    rows.push(['Apuesta', `${e0(p.stake)}${C.num(p.minOdds) > 1.01 ? ` a cuota ${fmt.odds(C.num(p.minOdds))} o más` : ', sin cuota mínima'}`]);
    rows.push(['Si pierde', `${e0(p.refund)} en freebets`]);
  } else if (g.kind === 'rollover') {
    rows.push(['Bono', `${e0(p.bonus)} por depositar ${e0(p.deposit)}`]);
    rows.push(['Rollover', `x${C.num(p.multiplier)} a cuota ${fmt.odds(C.num(p.minOdds))} o más${C.num(p.days) > 0 ? ` en ${C.num(p.days)} días` : ''}`]);
  }
  if (C.num(p.minDeposit) > 0) rows.push(['Depósito mínimo', e0(p.minDeposit)]);
  if (C.num(p.expiryDays) > 0) rows.push(['Caducidad de las freebets', `${C.num(p.expiryDays)} días`]);
  if (C.num(p.claimDays) > 0) rows.push(['Plazo', `${C.num(p.claimDays)} días`]);
  rows.push(['Código de registro', p.code ? esc(p.code) : 'No hace falta']);
  return rows;
}

function casaLesson(g) {
  if (g.locked) {
    return `<p>${esc(g.title || '')}</p>${lockCard('guides.welcome', { text: `Cómo se hace el bono de ${g.bookie} paso a paso, con lo que vale y botones que te llevan a la cuota y al cálculo exactos.` })}`;
  }
  const steps = (OFFER_KINDS[g.kind] || OFFER_KINDS.other).steps(g.params || {}, g.bookie);
  const started = state.offers.find((o) => o.from === g.id && o.status !== 'skip');
  const doneSteps = new Set(started?.done || []);
  const home = g.url || bookieHome(g.bookie);
  return `<p class="casa-title"><b>${esc(g.title || '')}</b></p>
    <div class="table-wrap"><table class="kv">${summaryRows(g).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`).join('')}</table></div>
    <details class="steps-preview"><summary>De dónde sale ese valor</summary>
      <ul class="outcome-list">${C.offerBreakdown(g, assumptions()).map((x) => `<li><span>${esc(x.label)}</span>${money(x.value)}</li>`).join('')}</ul>
      <p class="muted small">Es una estimación prudente: cuenta con cuotas moderadas (freebets a cuota ${fmt.odds(assumptions().snrOdds)}) para no necesitar mucho saldo en Betfair. Con cuotas más altas se saca algo más. Los supuestos se cambian en <a href="#ajustes">Ajustes</a>.</p>
    </details>
    ${g.conditions ? `<details class="steps-preview"><summary>Condiciones publicadas${g.reviewed ? ` (revisadas en ${esc(reviewedLabel(g.reviewed))})` : ''}</summary><p class="cond">${esc(g.conditions)}</p><p class="muted small">Las casas cambian sus ofertas a menudo: comprueba las condiciones en su web antes de depositar.</p></details>` : ''}
    ${g.howto ? markdown(g.howto) : ''}
    <h3>Hazlo aquí, paso a paso</h3>
    <p class="muted small">Cada botón abre la herramienta con los números de este bono. Al pulsarlo, el bono se apunta en Mis bonos para que sigas por donde ibas.</p>
    <ol class="casa-steps">${steps.map((st, i) => {
      const a = st.action;
      let btn = '';
      const href = a && (a.kind === 'site' ? home : a.kind === 'exchange' ? EXCHANGE_HOME : '');
      if (href) btn = `<a class="btn btn-ghost btn-xs" href="${esc(href)}" target="_blank" rel="noopener" data-act="guide-site" data-guide="${esc(g.id)}" data-step="${i}">${esc(a.label)} ${icon('external', 12)}</a>`;
      else if (a && a.kind !== 'site' && a.kind !== 'exchange') btn = `<button class="btn btn-ghost btn-xs" data-act="guide-step" data-guide="${esc(g.id)}" data-step="${i}">${esc(a.label)} ${icon('arrow', 12)}</button>`;
      return `<li class="${doneSteps.has(i) ? 'is-done' : ''}"><span>${esc(st.text)}</span>${btn}</li>`;
    }).join('')}</ol>
    <div class="lesson-actions">
      <button class="btn btn-sm btn-primary" data-act="guide-begin" data-guide="${esc(g.id)}">${icon('arrow', 14)} ${started ? 'Continuar en Mis bonos' : 'Empezar este bono'}</button>
      ${home ? `<a class="btn btn-sm" href="${esc(home)}" target="_blank" rel="noopener">Abrir ${esc(g.bookie)} ${icon('external', 13)}</a>` : ''}
    </div>`;
}

function casaLessons() {
  return content().guides.map((g) => ({
    id: `casa-${g.id}`, title: `${g.bookie}: cómo se hace`, minutes: 5, group: 'casas', html: () => casaLesson(g),
  }));
}

export function allLessons() {
  return [...lessons().map((l) => ({ ...l, group: 'aprende' })), ...casaLessons()];
}

/* ------------------------------------------------------------ vista */

function renderGuia() {
  const list = allLessons();
  const done = state.guide.done;
  const current = list.find((l) => l.id === state.guide.current) || list[0];
  const idx = list.indexOf(current);
  const count = list.filter((l) => done[l.id]).length;
  const pct = Math.round((count / list.length) * 100);
  const item = (l, i) => `<li><button class="lesson-link ${l.id === current.id ? 'is-current' : ''} ${done[l.id] ? 'is-done' : ''}" data-act="guide-open" data-lesson="${l.id}" ${l.id === current.id ? 'aria-current="step"' : ''}>
      <span class="lesson-n">${done[l.id] ? icon('check', 14) : i + 1}</span><span>${esc(l.title)}</span><span class="muted small">${l.minutes} min</span></button></li>`;
  const groups = [['aprende', 'Aprende'], ['casas', 'Tus 5 casas']];
  const nav = groups.map(([g, label]) => `<p class="toc-group">${label}</p><ol class="lesson-list">${list.map((l, i) => (l.group === g ? item(l, i) : '')).join('')}</ol>`).join('');
  return `${pageHead('Guía', 'Todo lo que necesitas para sacar dinero de los bonos, de cero y con ejemplos reales. Cada lección tiene botones que abren la herramienta con sus números.')}
  <div class="course">
    <aside class="course-nav">
      <div class="course-progress"><span><b>${count}</b> de ${list.length} lecciones</span><span class="progress"><i style="width:${pct}%"></i></span></div>
      <details class="course-toc" ${window.matchMedia('(min-width: 900px)').matches ? 'open' : ''}><summary>Lecciones</summary>${nav}</details>
    </aside>
    <article class="panel lesson">
      <span class="eyebrow">Lección ${idx + 1} de ${list.length} · ${current.minutes} min</span>
      <h2 class="lesson-title">${esc(current.title)}</h2>
      <div class="prose">${current.html()}</div>
      <footer class="lesson-foot">
        ${idx > 0 ? `<button class="btn" data-act="guide-open" data-lesson="${list[idx - 1].id}">Anterior</button>` : '<span></span>'}
        ${idx < list.length - 1
          ? `<button class="btn btn-primary" data-act="guide-next" data-lesson="${current.id}" data-next="${list[idx + 1].id}">${done[current.id] ? 'Siguiente lección' : 'Hecho, siguiente lección'} ${icon('arrow', 15)}</button>`
          : `<button class="btn btn-primary" data-act="guide-next" data-lesson="${current.id}">${done[current.id] ? 'Guía completada' : 'Terminar la guía'} ${icon('check', 15)}</button>`}
      </footer>
    </article>
  </div>`;
}

route('guia', { render: renderGuia, nav: 'guia' });

/* ------------------------------------------------------------ acciones */

const CALC_PRESETS = {
  snr10: () => ({ type: 'snr', stake: 10, back: 5, lay: 5.2, commission: commission() }),
  qual: () => ({ type: 'normal', stake: 10, back: 3, lay: 3.1, commission: commission() }),
  refund: () => ({ type: 'refund', stake: 50, back: 4, lay: 4.1, commission: commission(), refund: 50, retention: 65 }),
};
const OM_PRESETS = {
  calif: () => ({ mode: 'normal', minOdds: 1.5, maxOdds: 12, minRatings: { ...state.om.minRatings, normal: 95 }, stake: 10 }),
  snr: () => ({ mode: 'snr', minOdds: 4, maxOdds: 8, minRatings: { ...state.om.minRatings, snr: 70 }, stake: 10 }),
};

const guideById = (id) => content().guides.find((g) => g.id === id && !g.locked);

function beginFlow(offer, idx) {
  const steps = offerSteps(offer);
  state.flow = { offerId: offer.id, step: idx, total: steps.length, bookie: offer.bookie, text: steps[idx]?.text || '' };
}

registerActions({
  'guide-open': (b) => {
    state.guide.current = b.dataset.lesson;
    save();
    if (location.hash !== '#guia') go('guia');
    else { render(); document.querySelector('.lesson')?.scrollIntoView({ block: 'start' }); }
  },
  'guide-next': (b) => {
    state.guide.done[b.dataset.lesson] = true;
    if (b.dataset.next) state.guide.current = b.dataset.next;
    save();
    if (!b.dataset.next) toast('Has terminado la guía. Ya puedes hacer tu primer bono.', 'good');
    render();
    document.querySelector('.lesson')?.scrollIntoView({ block: 'start' });
  },
  quiz: (b) => { state.guide.quiz[b.dataset.q] = Number(b.dataset.i); save(); render(); },
  'quiz-reset': (b) => { delete state.guide.quiz[b.dataset.q]; save(); render(); },
  'guide-calc': (b) => {
    const p = CALC_PRESETS[b.dataset.preset];
    if (!p) return;
    Object.assign(state.calc.bl, p(), { adjust: 0, context: null });
    save();
    go('calculadora');
  },
  'guide-om': (b) => {
    const p = OM_PRESETS[b.dataset.preset];
    if (!p) return;
    Object.assign(state.om, p(), { bookies: [], myOnly: false, open: null, limit: 60 });
    save();
    go('oddsmatcher');
  },
  'guide-begin': (b) => {
    const g = guideById(b.dataset.guide);
    if (!g) return;
    const { offer, created } = offerFromSource(g, 'guides');
    const next = Math.max(0, offerSteps(offer).findIndex((_, i) => !(offer.done || []).includes(i)));
    beginFlow(offer, next);
    state.ui.bonosTab = 'mis';
    state.ui.offerFilter = 'open';
    save();
    toast(created ? `${g.bookie}: bono añadido a Mis bonos.` : `${g.bookie}: sigues donde lo dejaste.`, 'good');
    go('bonos');
    setTimeout(() => document.getElementById(`offer-${offer.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  },
  'guide-site': (b) => {
    const g = guideById(b.dataset.guide);
    if (!g) return;
    const { offer } = offerFromSource(g, 'guides');
    if (offer.status === 'todo') offer.status = 'active';
    beginFlow(offer, Number(b.dataset.step));
    save();
    setTimeout(render, 50); // después de que el enlace haya abierto la web
  },
  'guide-step': (b) => {
    const g = guideById(b.dataset.guide);
    if (!g) return;
    const { offer } = offerFromSource(g, 'guides');
    save();
    runStep(offer, Number(b.dataset.step));
  },
  'guide-go': (b) => {
    const target = b.dataset.preset;
    if (target === 'bonos') { state.ui.bonosTab = 'bienvenida'; save(); go('bonos'); return; }
    if (target === 'recurrentes') { state.ui.bonosTab = 'recurrentes'; save(); go('bonos'); return; }
    go(target);
  },
});

export function onGuideCheck(el) {
  const list = el.dataset.list;
  state.guide.checks[list] = { ...(state.guide.checks[list] || {}), [el.dataset.key]: el.checked };
  save();
}

export const guideProgress = () => {
  const list = allLessons();
  const done = list.filter((l) => state.guide.done[l.id]).length;
  return { done, total: list.length, basics: lessons().filter((l) => state.guide.done[l.id]).length };
};
