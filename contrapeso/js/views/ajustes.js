// Ajustes: mis casas, fuente de cuotas, comisiones, valoración de bonos,
// preferencias y copias de seguridad.

import {
  state, session, odds, O, nz, save, render, go, route, registerActions, field, select, seg, pageHead, statusHTML,
  loadOdds, ODDS_CACHE_KEY, plans, applyTheme, paintAccount, defaults, api,
} from '../core.js';
import {
  esc, icon, toast, download, copyText, storage, isoDay,
} from '../util.js';
import { BOOKIES } from '../data.js';

const SPORT_NAMES = {
  soccer_spain_la_liga: 'LaLiga',
  soccer_spain_segunda_division: 'LaLiga Hypermotion',
  soccer_epl: 'Premier League',
  soccer_italy_serie_a: 'Serie A',
  soccer_germany_bundesliga: 'Bundesliga',
  soccer_france_ligue_one: 'Ligue 1',
  soccer_uefa_champs_league: 'Champions League',
  soccer_uefa_europa_league: 'Europa League',
  basketball_nba: 'NBA',
  basketball_euroleague: 'Euroliga',
  soccer_netherlands_eredivisie: 'Eredivisie',
  soccer_portugal_primeira_liga: 'Primeira Liga',
  soccer_efl_champ: 'Championship',
  soccer_uefa_europa_conference_league: 'Conference League',
  soccer_turkey_super_league: 'Superliga turca',
  soccer_belgium_first_div: 'Primera belga',
  soccer_brazil_campeonato: 'Brasileirão',
  soccer_argentina_primera_division: 'Primera argentina',
  soccer_usa_mls: 'MLS',
  americanfootball_nfl: 'NFL',
  icehockey_nhl: 'NHL',
};

const EXCHANGES = [
  ['betfair_es', 'Betfair.es'],
  ['betfair_ex_eu', 'Betfair (internacional)'],
  ['matchbook', 'Matchbook'],
  ['smarkets', 'Smarkets'],
];

function sourceSection() {
  const s = state.settings;
  const sports = [...O.DEFAULT_SPORTS, ...O.EXTRA_SPORTS];
  const serverOdds = session.backend && session.config?.odds?.configured;
  const providers = [['auto', 'Automática'], ['demo', 'Demostración'], ['api', 'The Odds API']];
  if (session.backend || s.provider === 'server') providers.push(['server', 'Servidor']);
  return `<section class="panel">
    <div class="panel-head"><h2>Fuente de cuotas</h2><span class="status-inline" data-status="full">${statusHTML()}</span></div>
    ${seg('settings.provider', providers)}
    <p class="field-hint">${{
      auto: serverOdds ? 'Usa las cuotas reales que descarga el servidor (casas y Betfair.es).' : 'Usa tu clave de The Odds API si la tienes; si no, la demostración.',
      demo: 'Cuotas simuladas que se mueven cada minuto. Sirven para aprender a usar la herramienta.',
      api: 'Descarga las cuotas desde tu navegador con tu propia clave.',
      server: 'Las cuotas las descarga el servidor para todos los usuarios.',
    }[s.provider] || ''}</p>
    ${serverOdds ? '' : `<div class="banner">${icon('info', 16)}<span>The Odds API no trae cuotas de Bet365, DAZN Bet, Sportium ni Retabet en España (de Winamax, solo la versión francesa). Con el servidor y una clave de odds-api.io (<code>ODDSAPIIO_KEY</code>) salen tus 5 casas. Mientras tanto, en cada partido del oddsmatcher puedes escribir la cuota real de tu casa en «Comprobar cuota real» y se recalcula todo.</span></div>`}
    ${s.provider === 'api' || (s.provider === 'auto' && !serverOdds) ? `<div class="form-grid">
      <label class="field" for="f-settings-apiKey"><span class="field-label">Clave de The Odds API</span><span class="field-input"><input id="f-settings-apiKey" data-k="settings.apiKey" type="password" value="${esc(s.apiKey)}" autocomplete="off" spellcheck="false"></span>
        <span class="field-hint">Se guarda solo en este navegador. Tiene plan gratuito de 500 créditos al mes en the-odds-api.com.</span></label>
      ${select('settings.regions', 'Casas de', [['eu', 'Europa'], ['eu,uk', 'Europa y Reino Unido'], ['uk', 'Reino Unido']])}
      ${select('settings.markets', 'Mercados', [['h2h', '1X2 / ganador'], ['h2h,totals', '1X2 y más/menos goles']])}
      ${field('settings.cacheMinutes', 'Reutilizar cuotas durante', { unit: 'min' })}
    </div>
    <fieldset class="checks"><legend class="field-label">Ligas</legend>
      ${sports.map((k) => `<label class="check"><input type="checkbox" data-act-change="sport-toggle" value="${k}" ${s.sports.includes(k) ? 'checked' : ''}><span>${esc(SPORT_NAMES[k] || k)}</span></label>`).join('')}
    </fieldset>
    <p class="field-hint">Cada actualización gasta <b>${s.sports.length * s.regions.split(',').length * String(s.markets || 'h2h').split(',').length}</b> créditos.</p>
    <div class="actions"><button class="btn" data-act="test-api">${icon('bolt', 16)} Probar la clave</button><button class="btn btn-primary" data-act="apply-source">${icon('refresh', 16)} Cargar cuotas</button></div>
    <p id="api-test" class="field-hint" aria-live="polite"></p>` : `<div class="actions"><button class="btn btn-primary" data-act="apply-source">${icon('refresh', 16)} Cargar cuotas</button></div>`}
  </section>`;
}

function renderAjustes() {
  const s = state.settings;
  const mine = new Set(s.myBookies);
  return `${pageHead('Ajustes', 'Tus casas, la fuente de cuotas, comisiones y tus datos.')}
  <section class="panel" id="casas">
    <div class="panel-head"><h2>${icon('star', 16)} Mis casas</h2><span class="muted small">${mine.size} marcadas</span></div>
    <p class="muted small">Marca las casas en las que tienes cuenta. El oddsmatcher podrá enseñarte solo sus cuotas con el filtro «Solo mis casas».</p>
    <div class="checks">${BOOKIES.map(([key, name]) => `<label class="check"><input type="checkbox" data-act-change="mybook-toggle" value="${esc(name)}" ${mine.has(name) ? 'checked' : ''}><span>${esc(name)}</span></label>`).join('')}</div>
  </section>
  ${sourceSection()}
  <section class="panel">
    <div class="panel-head"><h2>Comisiones de los exchanges</h2></div>
    <div class="form-grid">
      ${EXCHANGES.map(([k, t]) => field(`settings.commissions.${k}`, t, { unit: '%' })).join('')}
      ${field('settings.defaultCommission', 'Cualquier otro', { unit: '%' })}
    </div>
    <p class="field-hint">Pon la comisión que te cobra tu cuenta. Cambia el rating del oddsmatcher y todos los cálculos.</p>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Cómo valorar los bonos</h2></div>
    <div class="form-grid">
      ${field('settings.assumptions.qualOdds', 'Cuota típica en calificantes')}
      ${field('settings.assumptions.snrOdds', 'Cuota típica con freebet SNR')}
      ${field('settings.assumptions.srOdds', 'Cuota típica con freebet SR')}
      ${field('settings.assumptions.spread', 'Diferencia favor-contra', { unit: '%' })}
      ${field('settings.assumptions.refundRetention', 'Retención de reembolsos', { unit: '%' })}
    </div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Preferencias</h2></div>
    <div class="filter-row">
      ${field('settings.alertRating', 'Avisarme de cuotas con rating desde', { unit: '%' })}
      <div class="field"><span class="field-label">Tema</span>${seg('settings.theme', [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']])}</div>
    </div>
    <div class="actions"><button class="btn" data-act="notif">${icon('bell', 16)} Activar avisos del navegador</button></div>
    ${!session.backend ? `<div class="field"><span class="field-label">Vista previa: ver la web con el plan</span>${seg('settings.previewPlan', [['free', plans().free.name], ['bienvenida', plans().bienvenida.name], ['recurrentes', plans().recurrentes.name], ['metodo', plans().metodo.name]])}</div>` : ''}
  </section>
  <section class="panel" id="datos">
    <div class="panel-head"><h2>Tus datos</h2></div>
    <p class="muted small">${session.user ? 'Tus bonos y beneficios se guardan en tu cuenta. Aun así, puedes descargar una copia.' : 'Todo se guarda en este navegador. Haz copias de seguridad de vez en cuando.'}</p>
    <div class="actions">
      <button class="btn" data-act="export-json">${icon('download', 16)} Descargar copia</button>
      <button class="btn" data-act="copy-json">${icon('copy', 16)} Copiar copia</button>
    </div>
    <label class="field" for="f-import"><span class="field-label">Importar una copia (pega el contenido o elige el archivo)</span>
      <textarea id="f-import" rows="4" placeholder='{"bets": [...], "offers": [...]}'></textarea></label>
    <div class="actions">
      <label class="btn">${icon('upload', 16)} Elegir archivo<input type="file" accept=".json,application/json" data-act-change="import-file" hidden></label>
      <button class="btn btn-primary" data-act="import-json">Importar</button>
      <button class="btn btn-ghost btn-danger ${state.ui.confirmReset ? 'is-confirm' : ''}" data-act="reset-all">${icon('trash', 16)} ${state.ui.confirmReset ? 'Se borrará todo. Pulsa otra vez' : 'Borrar todo'}</button>
    </div>
  </section>`;
}

route('ajustes', { render: renderAjustes, nav: 'ajustes' });

/* ------------------------------------------------------------ copias */

function exportPayload() {
  return JSON.stringify({
    app: 'contrapeso', version: 2, exported: new Date().toISOString(), bets: state.bets, offers: state.offers, settings: { ...state.settings, apiKey: '' }, guide: state.guide,
  }, null, 2);
}

export function importData(text) {
  try {
    const data = JSON.parse(text);
    if (!data || (!Array.isArray(data.bets) && !Array.isArray(data.offers))) throw new Error('formato');
    const ids = new Set(state.bets.map((b) => b.id));
    const newBets = (data.bets || []).filter((b) => b && !ids.has(b.id));
    const oids = new Set(state.offers.map((o) => o.id));
    const newOffers = (data.offers || []).filter((o) => o && !oids.has(o.id));
    state.bets.push(...newBets);
    state.offers.push(...newOffers);
    if (data.settings) {
      const { apiKey, ...rest } = data.settings;
      Object.assign(state.settings, rest);
    }
    save();
    toast(`Importadas ${newBets.length} operaciones y ${newOffers.length} bonos`, 'good');
    render();
  } catch {
    toast('No se pudo leer la copia. Tiene que ser el archivo que descargaste de Contrapeso.', 'warn');
  }
}

registerActions({
  'apply-source': () => {
    storage.remove(ODDS_CACHE_KEY);
    odds.events = [];
    loadOdds({ force: true }).then(() => toast(odds.error ? 'No se pudieron cargar cuotas reales' : `Cargados ${odds.events.length} partidos`, odds.error ? 'warn' : 'good'));
  },
  'test-api': async () => {
    const out = document.getElementById('api-test');
    if (!state.settings.apiKey) { if (out) out.textContent = 'Escribe primero tu clave.'; return; }
    if (out) out.textContent = 'Probando…';
    try {
      const list = await O.fetchSportsList(state.settings.apiKey);
      const soccer = list.filter((x) => x.group === 'Soccer').length;
      if (out) out.textContent = `La clave funciona: ${list.length} competiciones activas (${soccer} de fútbol). Esta prueba no gasta créditos.`;
    } catch (e) {
      if (out) out.textContent = e instanceof TypeError ? 'El navegador bloqueó la conexión. En la vista previa de claude.ai es normal: prueba desde tu dominio.' : `No funciona: ${e.message}`;
    }
  },
  notif: async () => {
    try {
      if (!('Notification' in window)) throw new Error('sin soporte');
      const p = await Notification.requestPermission();
      toast(p === 'granted' ? 'Avisos activados' : 'El navegador no ha dado permiso para avisos', p === 'granted' ? 'good' : 'warn');
    } catch {
      toast('Este navegador no permite avisos aquí.', 'warn');
    }
  },
  'export-json': () => download(`contrapeso-copia-${isoDay()}.json`, exportPayload()),
  'copy-json': () => copyText(exportPayload()),
  'import-json': () => {
    const text = document.getElementById('f-import')?.value || '';
    if (!text.trim()) { toast('Pega primero el contenido de la copia.', 'warn'); return; }
    importData(text);
  },
  'reset-all': () => {
    if (!state.ui.confirmReset) {
      state.ui.confirmReset = true;
      render();
      setTimeout(() => { if (state.ui.confirmReset) { state.ui.confirmReset = false; if (location.hash === '#ajustes') render(); } }, 4000);
      return;
    }
    const fresh = defaults();
    Object.keys(state).forEach((k) => { delete state[k]; });
    Object.assign(state, fresh, { seeded: true });
    storage.remove(ODDS_CACHE_KEY);
    save();
    toast('Datos borrados');
    loadOdds({ force: true });
    render();
  },
});

export function onSportToggle(el) {
  const sp = new Set(state.settings.sports);
  if (el.checked) sp.add(el.value); else sp.delete(el.value);
  state.settings.sports = [...sp];
  save();
  render();
}

export function onMyBookToggle(el) {
  const mine = new Set(state.settings.myBookies);
  if (el.checked) mine.add(el.value); else mine.delete(el.value);
  state.settings.myBookies = [...mine];
  save();
  const head = el.closest('.panel')?.querySelector('.panel-head .muted');
  if (head) head.textContent = `${mine.size} marcadas`;
}

export { applyTheme, paintAccount, go, api };
