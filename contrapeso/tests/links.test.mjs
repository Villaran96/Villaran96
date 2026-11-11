import test from 'node:test';
import assert from 'node:assert/strict';
import {
  learnSearch, learnBetfair, fillSearch, fillBetfair, searchTerm, cleanSearchLinks, validBetfairTemplate,
} from '../js/links.js';

test('aprende la búsqueda de una casa a partir de una búsqueda real', () => {
  assert.equal(learnSearch('https://www.casa.es/apuestas/buscar?q=Sevilla&tipo=1'), 'https://www.casa.es/apuestas/buscar?q={query}&tipo=1');
  assert.equal(learnSearch('https://www.casa.es/#/AX/K^Sevilla/'), 'https://www.casa.es/#/AX/K^{query}/', 'también en la parte tras #');
  assert.equal(learnSearch('https://www.casa.es/search/sevilla'), 'https://www.casa.es/search/{query}', 'sin distinguir mayúsculas');
  assert.equal(learnSearch('https://www.casa.es/apuestas'), null, 'sin el equipo no hay plantilla');
  assert.equal(learnSearch('javascript:alert(1)//Sevilla'), null, 'solo https');
  assert.equal(fillSearch('https://www.casa.es/buscar?q={query}', 'Real Madrid'), 'https://www.casa.es/buscar?q=Real%20Madrid');
});

test('aprende el enlace de Betfair.es con el mercado o con el partido', () => {
  const m = learnBetfair('https://www.betfair.es/exchange/plus/es/f%C3%BAtbol/laliga/sevilla-v-betis-apuestas-34567890/market/1.234567890?nodeId=1');
  assert.equal(m.kind, 'market');
  assert.equal(m.template, 'https://www.betfair.es/exchange/plus/es/f%C3%BAtbol/laliga/sevilla-v-betis-apuestas-34567890/market/{marketId}?nodeId=1');
  const e = learnBetfair('https://www.betfair.es/exchange/plus/es/f%C3%BAtbol/laliga/sevilla-v-betis-apuestas-34567890');
  assert.equal(e.kind, 'event');
  assert.ok(e.template.endsWith('-apuestas-{eventId}'));
  assert.equal(learnBetfair('https://www.otra.es/1.234567890'), null, 'solo Betfair');
  assert.equal(fillBetfair(m.template, { marketId: '1.999', eventId: '1' }).includes('/market/1.999?'), true);
  assert.equal(fillBetfair(e.template, { marketId: '1.999', eventId: '35123456' }).endsWith('-apuestas-35123456'), true);
  assert.equal(fillBetfair(m.template, { eventId: '35123456' }), null, 'sin mercado no hay enlace al mercado');
  assert.ok(validBetfairTemplate(m.template) && validBetfairTemplate(e.template));
  assert.ok(!validBetfairTemplate('https://www.betfair.es/exchange/plus/'));
});

test('el equipo para buscar va sin siglas de club y los enlaces se limpian', () => {
  assert.equal(searchTerm('Sevilla FC'), 'Sevilla');
  assert.equal(searchTerm('RCD Espanyol'), 'Espanyol');
  assert.equal(searchTerm('Real Madrid'), 'Real Madrid');
  assert.deepEqual(cleanSearchLinks({
    bet365: 'https://www.bet365.es/#/AX/K^{query}/', winamax: 'http://inseguro.es/{query}', sportium: 'https://www.sportium.es/sin-hueco', otra: 'https://x.es/{query}',
  }), { bet365: 'https://www.bet365.es/#/AX/K^{query}/' });
});
