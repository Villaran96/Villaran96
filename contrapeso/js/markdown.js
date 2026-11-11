// Markdown mínimo y seguro para las lecciones: escapa todo el HTML y solo admite
// títulos (##, ###), párrafos, listas (- y 1.), notas (>), **negrita**, *cursiva*,
// `código`, enlaces http(s) o internos (#ruta) y marcadores de herramienta [[nombre]].
// Se procesa línea a línea: un título o una lista no necesitan línea en blanco antes.

import { esc } from './util.js';

function inline(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|#[a-z0-9-]+)\)/gi, (m, label, href) => (href.startsWith('#')
      ? `<a href="${href}">${label}</a>`
      : `<a href="${href}" target="_blank" rel="noopener">${label}</a>`));
}

/** Convierte el texto en HTML. widgets: { nombre: () => html } para los [[nombre]]. */
export function markdown(src, { vars = {}, widgets = {} } = {}) {
  let text = String(src || '');
  for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(v);
  const out = [];
  let para = [];
  let list = null;
  let quote = [];

  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.type}>`); list = null; };
  const flushQuote = () => { if (quote.length) out.push(`<div class="note">${inline(quote.join(' '))}</div>`); quote = []; };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushAll(); continue; }
    const widget = /^\[\[([a-z0-9-]+)\]\]$/.exec(line);
    if (widget) { flushAll(); if (widgets[widget[1]]) out.push(widgets[widget[1]]()); continue; }
    if (line.startsWith('### ')) { flushAll(); out.push(`<h4>${inline(line.slice(4))}</h4>`); continue; }
    if (line.startsWith('## ')) { flushAll(); out.push(`<h3>${inline(line.slice(3))}</h3>`); continue; }
    const bullet = /^[-*] (.*)$/.exec(line);
    const numbered = /^\d+[.)] (.*)$/.exec(line);
    if (bullet || numbered) {
      flushPara();
      flushQuote();
      const type = bullet ? 'ul' : 'ol';
      if (list && list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push((bullet || numbered)[1]);
      continue;
    }
    if (line.startsWith('>')) { flushPara(); flushList(); quote.push(line.replace(/^>\s?/, '')); continue; }
    if (list && /^\s{2,}/.test(raw)) { list.items[list.items.length - 1] += ` ${line}`; continue; }
    flushList();
    flushQuote();
    para.push(line);
  }
  flushAll();
  return out.join('\n');
}
