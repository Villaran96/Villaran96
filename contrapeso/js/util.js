// Utilidades de interfaz: formato, escape de HTML, iconos, almacenamiento y avisos.

const nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0Fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const TZ = 'Europe/Madrid';
const dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
const dayFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const monthFmt = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: TZ });

export const fmt = {
  eur: (x) => (Number.isFinite(x) ? eurFmt.format(Math.abs(x) < 0.005 ? 0 : x) : '—'),
  eur0: (x) => (Number.isFinite(x) ? eur0Fmt.format(x) : '—'),
  signedEur: (x) => (Number.isFinite(x) ? `${x > 0.004 ? '+' : ''}${eurFmt.format(Math.abs(x) < 0.005 ? 0 : x)}` : '—'),
  odds: (x) => (Number.isFinite(x) ? nf2.format(x) : '—'),
  n2: (x) => (Number.isFinite(x) ? nf2.format(x) : '—'),
  pct: (x) => (Number.isFinite(x) ? `${nf1.format(x)} %` : '—'),
  pct2: (x) => (Number.isFinite(x) ? `${nf2.format(x)} %` : '—'),
  date: (t) => dateFmt.format(new Date(t)).replace('.', ''),
  time: (t) => timeFmt.format(new Date(t)),
  day: (t) => dayFmt.format(new Date(t)).replace('.', ''),
  month: (t) => monthFmt.format(new Date(t)).replace('.', ''),
  ago(t) {
    const s = Math.round((Date.now() - new Date(t).getTime()) / 1000);
    if (!Number.isFinite(s)) return '—';
    if (s < 45) return 'ahora mismo';
    if (s < 3600) return `hace ${Math.round(s / 60)} min`;
    if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return `hace ${Math.round(s / 86400)} d`;
  },
  until(t) {
    const m = Math.round((new Date(t).getTime() - Date.now()) / 60000);
    if (m < 0) return 'empezado';
    if (m < 60) return `en ${m} min`;
    if (m < 60 * 24) return `en ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
    return `en ${Math.round(m / 1440)} d`;
  },
};

/** Fecha local (Madrid) en formato AAAA-MM-DD para inputs de tipo date. */
export function isoDay(t = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
  return parts;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const sign = (x) => (x > 0.004 ? 'pos' : x < -0.004 ? 'neg' : 'zero');

/* ------------------------------------------------------------------------ */
/* Almacenamiento local (puede fallar en modo privado: nunca rompe la página) */
/* ------------------------------------------------------------------------ */

export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
  },
};

/* ------------------------------------------------------------------------ */
/* Avisos                                                                    */
/* ------------------------------------------------------------------------ */

let toastTimer;
export function toast(message, kind = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 250);
  }, 3200);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado');
    return true;
  } catch {
    toast('No se pudo copiar automáticamente. Selecciona el texto y cópialo.', 'warn');
    return false;
  }
}

/** Descarga un archivo (funciona en tu dominio; dentro de claude.ai el visor lo bloquea). */
export function download(filename, text, type = 'application/json') {
  // Dentro de un visor incrustado (como la vista previa de claude.ai) las descargas pueden estar bloqueadas.
  if (window.self !== window.top) toast('Si no se descarga, usa «Copiar»: esta vista previa bloquea las descargas.', 'warn');
  try {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  } catch {
    toast('Tu navegador no permite descargar el archivo. Usa «Copiar».', 'warn');
  }
}

/* ------------------------------------------------------------------------ */
/* Iconos (trazo de 1,6 px sobre 24 × 24)                                    */
/* ------------------------------------------------------------------------ */

const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  match: '<path d="M4 7h11"/><path d="m12 4 3 3-3 3"/><path d="M20 17H9"/><path d="m12 14-3 3 3 3"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3.5 8 4.2C6 4.8 6.6 8 9 8M12 8s1.5-4.5 4-3.8c2 .6 1.4 3.8-1 3.8"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h0"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
};

export function icon(name, size = 18, cls = '') {
  return `<svg class="ico ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/** Marca de Contrapeso: una balanza con el peso a favor (azul) y en contra (rosa). */
export function logoMark(size = 28) {
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 9 L11 25 H21 Z" fill="var(--brass)"/>
    <rect x="3" y="7.2" width="26" height="2.4" rx="1.2" fill="var(--fg)"/>
    <circle cx="6.5" cy="13" r="4" fill="var(--back)"/>
    <circle cx="25.5" cy="13" r="4" fill="var(--lay)"/>
  </svg>`;
}
