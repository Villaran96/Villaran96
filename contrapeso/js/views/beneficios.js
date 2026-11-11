// Beneficios: registro de operaciones, gráficos, resumen por año y copias.

import {
  state, nz, n, save, render, go, route, registerActions, field, select, money, kpi, pageHead, exampleBanner,
  monthKey, cumulativeChart, can,
} from '../core.js';
import {
  fmt, esc, icon, toast, uid, isoDay, download, sign,
} from '../util.js';
import { BET_KINDS, betKindLabel } from '../data.js';

function renderBeneficios() {
  const bets = state.bets;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const total = bets.reduce((a, b) => a + nz(b.profit), 0);
  const month = bets.filter((b) => monthKey(b.date) === thisMonth).reduce((a, b) => a + nz(b.profit), 0);
  const avg = bets.length ? total / bets.length : 0;

  const byBook = new Map();
  bets.forEach((b) => byBook.set(b.bookie || 'Sin casa', (byBook.get(b.bookie || 'Sin casa') || 0) + nz(b.profit)));
  const books = [...byBook.entries()].sort((a, b) => b[1] - a[1]);
  const maxAbs = Math.max(1, ...books.map(([, v]) => Math.abs(v)));
  const byKind = new Map();
  bets.forEach((b) => byKind.set(b.kind, (byKind.get(b.kind) || 0) + nz(b.profit)));
  const byYear = new Map();
  bets.forEach((b) => { const y = String(b.date || '').slice(0, 4) || '—'; byYear.set(y, (byYear.get(y) || 0) + nz(b.profit)); });

  const form = state.ui.betForm || { date: isoDay(), bookie: '', kind: 'welcome', desc: '', profit: '' };
  state.ui.betForm = form;

  return `${pageHead('Beneficios', 'Cada operación que cierras, sumada. Expórtalo para tu control o para la declaración de la renta.', `
    <button class="btn btn-sm" data-act="export-csv">${icon('download', 16)} Exportar CSV</button>
    <button class="btn btn-sm" data-act="go-data">${icon('upload', 16)} Copia de seguridad</button>`)}
  ${exampleBanner()}
  <section class="kpis">
    ${kpi('Total', fmt.eur(total), '', total >= 0 ? 'kpi-pos' : 'kpi-neg')}
    ${kpi('Este mes', fmt.eur(month), fmt.month(now))}
    ${kpi('Operaciones', String(bets.length))}
    ${kpi('Media por operación', fmt.eur(avg))}
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Anotar una operación</h2><span class="muted small">Desde las calculadoras y el oddsmatcher se anotan solas</span></div>
    <form class="bet-form" data-form="bet">
      ${field('ui.betForm.date', 'Fecha', { type: 'date' })}
      <label class="field" for="f-bet-bookie"><span class="field-label">Casa</span><span class="field-input"><input id="f-bet-bookie" data-k="ui.betForm.bookie" list="bookie-list" value="${esc(form.bookie)}" placeholder="Bet365" autocomplete="off"></span></label>
      ${select('ui.betForm.kind', 'Tipo', BET_KINDS)}
      ${field('ui.betForm.desc', 'Descripción', { mode: 'text', placeholder: 'Freebet de bienvenida' })}
      ${field('ui.betForm.profit', 'Beneficio', { unit: '€', placeholder: '12,50' })}
      <button class="btn btn-primary" type="submit">${icon('plus', 16)} Añadir</button>
    </form>
  </section>
  <div class="grid-2">
    <section class="panel"><div class="panel-head"><h2>Beneficio acumulado</h2></div>${cumulativeChart(bets)}</section>
    <section class="panel"><div class="panel-head"><h2>Por casa</h2></div>
      ${books.length ? `<ul class="hbars">${books.slice(0, 10).map(([name, v]) => `<li><span class="hb-name">${esc(name)}</span><span class="hb-track"><i class="${v < 0 ? 'neg' : 'pos'}" style="width:${(Math.abs(v) / maxAbs * 100).toFixed(1)}%"></i></span><span class="money ${sign(v)}">${fmt.eur(v)}</span></li>`).join('')}</ul>` : '<p class="muted">Sin datos todavía.</p>'}
      ${byKind.size ? `<div class="kind-chips">${[...byKind.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span class="chip chip-static">${esc(betKindLabel(k))} <b>${fmt.eur(v)}</b></span>`).join('')}</div>` : ''}
    </section>
  </div>
  <section class="panel">
    <div class="panel-head"><h2>Por año</h2>${can('metodo') ? `<a class="link" href="#metodo" data-act="open-fiscal">Hoja de control fiscal ${icon('arrow', 14)}</a>` : '<a class="link" href="#metodo">Cómo se declara (Método) ' + icon('arrow', 14) + '</a>'}</div>
    <div class="year-chips">${[...byYear.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([y, v]) => `<span class="year-chip"><span>${esc(y)}</span>${money(v)}</span>`).join('') || '<span class="muted">Sin datos todavía.</span>'}</div>
    <p class="muted small">Las ganancias del juego tributan en el IRPF del año en que se cobran. Guarda este registro junto a los certificados de cada casa.</p>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Operaciones</h2><span class="muted small">${bets.length}</span></div>
    ${bets.length ? `<div class="table-wrap"><table class="ledger">
      <thead><tr><th>Fecha</th><th>Casa</th><th>Tipo</th><th class="desc">Descripción</th><th class="num">Beneficio</th><th></th></tr></thead>
      <tbody>${[...bets].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((b) => `<tr>
        <td class="nowrap">${b.date ? esc(fmt.day(Date.parse(`${b.date}T12:00:00`))) : '—'}</td>
        <td>${esc(b.bookie || '—')}${b.example ? ' <span class="tag tag-example">Ejemplo</span>' : ''}</td>
        <td>${esc(betKindLabel(b.kind))}</td>
        <td class="desc">${esc(b.desc || '')}</td>
        <td class="num">${money(nz(b.profit))}</td>
        <td><button class="btn btn-ghost btn-icon btn-danger ${b.confirmDelete ? 'is-confirm' : ''}" data-act="bet-delete" data-id="${b.id}" aria-label="${b.confirmDelete ? 'Confirmar borrado' : 'Borrar operación'}">${b.confirmDelete ? icon('check', 16) : icon('trash', 16)}</button></td>
      </tr>`).join('')}</tbody>
    </table></div>` : '<div class="empty"><p>Aún no has anotado ninguna operación.</p><p class="muted small">Desde cualquier calculadora pulsa «Ya lo he apostado: anotar».</p></div>'}
  </section>`;
}

route('beneficios', { render: renderBeneficios, nav: 'beneficios' });

export function exportCsv(bets = state.bets, name = 'beneficios') {
  const rows = [['fecha', 'casa', 'tipo', 'descripcion', 'beneficio']].concat(
    [...bets].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((b) => [b.date, b.bookie, betKindLabel(b.kind), b.desc, String(nz(b.profit).toFixed(2)).replace('.', ',')]),
  );
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  download(`contrapeso-${name}-${isoDay()}.csv`, `﻿${csv}`, 'text/csv;charset=utf-8');
}

registerActions({
  'export-csv': () => exportCsv(),
  'go-data': () => { go('ajustes'); setTimeout(() => document.getElementById('datos')?.scrollIntoView({ block: 'start' }), 60); },
  'open-fiscal': () => { state.metodo.current = 'm5'; save(); },
  'bet-delete': (b) => {
    const bet = state.bets.find((x) => x.id === b.dataset.id);
    if (!bet) return;
    if (!bet.confirmDelete) {
      bet.confirmDelete = true;
      render();
      setTimeout(() => { if (bet.confirmDelete) { delete bet.confirmDelete; render(); } }, 4000);
      return;
    }
    state.bets = state.bets.filter((x) => x.id !== bet.id);
    save();
    render();
  },
});

export function submitBet() {
  const f = state.ui.betForm;
  const profit = n(f.profit);
  if (!Number.isFinite(profit)) { toast('Escribe el beneficio (puede ser negativo).', 'warn'); return; }
  state.bets.push({ id: uid(), date: f.date || isoDay(), bookie: String(f.bookie || '').trim(), kind: f.kind, desc: String(f.desc || '').trim(), profit });
  state.ui.betForm = { date: f.date || isoDay(), bookie: '', kind: f.kind, desc: '', profit: '' };
  save();
  toast(`Anotado: ${fmt.signedEur(profit)}`, 'good');
  render();
}
