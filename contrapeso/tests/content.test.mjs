import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdown } from '../js/markdown.js';
import {
  contractData, contractText, sha256Hex, validDni,
} from '../js/contract.js';
import {
  canUse, effectivePlan, mergePlans, planRank,
} from '../js/plans.js';
import { DEFAULT_LESSONS, DEFAULT_GUIDES, DEFAULT_PROMOS } from '../js/content.js';
import { offerValue, offerRange, offerBreakdown } from '../js/calc.js';
import { OFFER_KINDS } from '../js/data.js';

test('markdown: títulos y listas sin línea en blanco entre ellos', () => {
  const html = markdown('## Lo esencial\n- uno\n- **dos**\n\nTexto con [enlace](https://example.com) y [interno](#guia).\n> nota');
  assert.equal(html, '<h3>Lo esencial</h3>\n<ul><li>uno</li><li><strong>dos</strong></li></ul>\n<p>Texto con <a href="https://example.com" target="_blank" rel="noopener">enlace</a> y <a href="#guia">interno</a>.</p>\n<div class="note">nota</div>');
});

test('markdown: escapa HTML y no admite enlaces peligrosos', () => {
  const html = markdown('<script>alert(1)</script> [x](javascript:alert(1))');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript'));
});

test('markdown: herramientas y variables', () => {
  const html = markdown('Hola {marca}\n\n[[calc-impuesto]]\n\n[[desconocida]]', { vars: { marca: 'Mi Web' }, widgets: { 'calc-impuesto': () => '<div id="w"></div>' } });
  assert.equal(html, '<p>Hola Mi Web</p>\n<div id="w"></div>');
});

test('todas las lecciones del Método se convierten sin bloques mezclados', () => {
  for (const l of DEFAULT_LESSONS) {
    const html = markdown(l.body, { widgets: { 'calc-impuesto': () => '', 'hoja-fiscal': () => '' } });
    assert.ok(!/<h3>[^<]*\n/.test(html), `${l.id}: un título se ha comido líneas`);
    assert.ok(!/<p>- /.test(html), `${l.id}: lista convertida en párrafo`);
  }
});

test('DNI y NIE', () => {
  assert.equal(validDni('12345678Z'), true);
  assert.equal(validDni('12345678z'), true);
  assert.equal(validDni('12345678A'), false);
  assert.equal(validDni('X1234567L'), true);
  assert.equal(validDni('Y1234567X'), true);
  assert.equal(validDni('1234567Z'), false);
});

test('contrato: mismo texto y huella con los mismos datos, distinta con otros', async () => {
  const base = { site: { brand: 'Marca', legalName: 'Empresa SL', nif: 'B1', address: 'Calle 1', email: 'a@b.es' }, signer: { name: 'Ana Pérez', dni: '12345678Z', address: 'Calle 2', email: 'ana@x.es' }, plan: { price: 79, interval: 'month', seats: 20 }, date: '2026-11-11T10:00:00Z' };
  const a = contractText(contractData(base));
  const b = contractText(contractData(base));
  assert.equal(await sha256Hex(a), await sha256Hex(b));
  const c = contractText(contractData({ ...base, signer: { ...base.signer, dni: '87654321X' } }));
  assert.notEqual(await sha256Hex(a), await sha256Hex(c));
  assert.ok(a.includes('Empresa SL') && a.includes('12345678Z') && a.includes('79,00'));
  assert.ok(contractText(contractData({ ...base, site: {} })).includes('[pendiente]'));
});

test('planes: acceso por plan y estado', () => {
  assert.equal(canUse('free', 'odds.full'), false);
  assert.equal(canUse('bienvenida', 'odds.full'), true);
  assert.equal(canUse('bienvenida', 'promos.recurring'), false);
  assert.equal(canUse('recurrentes', 'promos.recurring'), true);
  assert.equal(canUse('metodo', 'metodo'), true);
  assert.equal(effectivePlan({ plan: 'recurrentes', planStatus: 'canceled' }), 'free');
  assert.equal(effectivePlan({ plan: 'recurrentes', planStatus: 'past_due' }), 'recurrentes');
  assert.equal(effectivePlan({ role: 'admin', plan: 'free' }), 'metodo');
  assert.ok(planRank('metodo') > planRank('recurrentes'));
  assert.equal(mergePlans({ metodo: { price: 99 } }).metodo.price, 99);
  assert.ok(mergePlans({ metodo: { price: 99 } }).metodo.features.length > 0);
});

test('contenido de ejemplo: todas las guías y promociones tienen valor positivo', () => {
  for (const x of [...DEFAULT_GUIDES, ...DEFAULT_PROMOS]) {
    const v = offerValue(x, {});
    assert.ok(Number.isFinite(v) && v > 0, `${x.id}: ${v}`);
  }
});

test('el valor de las 5 casas es prudente: dentro de lo que publica NinjaBet', () => {
  // Mínimo y máximo de su tabla de ganancias de bienvenida (España, 2026).
  const REF = { bet365: [110, 130], winamax: [50, 70], daznbet: [110, 130], sportium: [110, 140], retabet: [100, 120] };
  let total = 0;
  for (const g of DEFAULT_GUIDES) {
    const [min, max] = REF[g.id];
    const r = offerRange(g, {});
    assert.ok(r.mid >= min && r.mid <= max, `${g.id}: ${r.mid.toFixed(1)} fuera de ${min}–${max}`);
    assert.ok(r.low <= r.mid && r.mid <= r.high);
    assert.ok(Math.abs(offerBreakdown(g, {}).reduce((s, x) => s + x.value, 0) - offerValue(g, {})) < 1e-9, 'el desglose suma el valor');
    assert.ok(!/Lo que vale:|sacas unos|75–8[05] %/.test(g.howto), `${g.id}: el valor sale del cálculo, no del texto`);
    total += r.mid;
  }
  assert.ok(total > 490 && total < 590, `total ${total.toFixed(0)}`);
});

test('las 5 casas: pasos con botones, Sportium en dos depósitos y freebet con cuota máxima', () => {
  assert.deepEqual(DEFAULT_GUIDES.map((g) => g.bookie), ['Bet365', 'Winamax', 'DAZN Bet', 'Sportium', 'Retabet']);
  for (const g of DEFAULT_GUIDES) {
    const steps = OFFER_KINDS[g.kind].steps(g.params, g.bookie);
    assert.ok(steps.length >= 5, `${g.id}: pocos pasos`);
    assert.ok(steps.some((s) => s.action?.kind === 'om' && s.action.om.bookie === g.bookie), `${g.id}: sin botón al oddsmatcher`);
    assert.ok(steps.every((s) => !/undefined|NaN/.test(s.text)), `${g.id}: texto roto`);
  }
  const sp = OFFER_KINDS.bet_get.steps(DEFAULT_GUIDES.find((g) => g.id === 'sportium').params, 'Sportium');
  assert.ok(sp.some((s) => /segundo depósito/.test(s.text)));
  const fb = sp.find((s) => s.action?.kind === 'om' && s.action.om.mode === 'snr');
  assert.equal(fb.action.om.maxOdds, 5);
  assert.equal(fb.action.om.stake, 100);
  assert.equal(sp.find((s) => s.action?.kind === 'om' && s.action.om.mode === 'normal').action.om.stake, 100);
  const wx = OFFER_KINDS.refund.steps(DEFAULT_GUIDES.find((g) => g.id === 'winamax').params, 'Winamax');
  assert.equal(wx.find((s) => s.action?.kind === 'om').action.om.mode, 'refund');
});
