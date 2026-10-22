// Lógica de la contabilidad: leer extractos de banco, clasificar movimientos y calcular resúmenes.
// Sin React: todo son funciones puras que usa AsesorFinanciero.jsx.

/* ───────────────────────── Fechas, números y texto ───────────────────────── */

export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const deISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};
export const hoyISO = () => aISO(new Date());
export const sumarDias = (iso, n) => {
  const d = deISO(iso);
  d.setDate(d.getDate() + n);
  return aISO(d);
};
export const sumarMeses = (iso, n) => {
  const d = deISO(iso);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return aISO(d);
};
export const mesAnterior = (mes) => sumarMeses(`${mes}-01`, -1).slice(0, 7);
export const mesSiguiente = (mes) => sumarMeses(`${mes}-01`, 1).slice(0, 7);
export const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86_400_000);
export const redondear = (n) => Math.round(n * 100) / 100;
export const nuevoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

export const normalizar = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const titulo = (s) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

// "1.234,56", "-12,50 €", "1,234.56", "(15,00)" o "12,50-" → número.
export function aNumero(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "")
    .replace(/[\s €]|eur/gi, "")
    .replace(/[−–]/g, "-");
  if (!s) return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negativo = !negativo;
    s = s.slice(0, -1);
  }
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("-")) {
    negativo = !negativo;
    s = s.slice(1);
  }
  const coma = s.lastIndexOf(",");
  const punto = s.lastIndexOf(".");
  if (coma > -1 && punto > -1) s = coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (coma > -1) s = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  else if (punto > -1 && (s.split(".").length > 2 || /^\d{1,3}\.\d{3}$/.test(s))) s = s.replace(/\./g, "");
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return negativo ? -n : n;
}

const MESES_TEXTO = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

function fechaValida(y, m, d) {
  if (!(y > 1990 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const f = new Date(y, m - 1, d);
  return f.getMonth() === m - 1 ? aISO(f) : null;
}

// Fechas de extracto: Date de Excel, número de serie de Excel, ISO, dd/mm/aaaa o "5 oct 2026".
export function aFecha(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return aISO(v);
  if (typeof v === "number" && v > 30000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86_400_000));
    return fechaValida(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return fechaValida(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) return fechaValida(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = normalizar(s).match(/^(\d{1,2}) (?:de )?([a-z]{3})[a-z]* (?:de )?(\d{4})/);
  if (m && MESES_TEXTO[m[2]]) return fechaValida(+m[3], MESES_TEXTO[m[2]], +m[1]);
  return null;
}

/* ───────────────────────── Configuración inicial ───────────────────────── */

export const CATEGORIAS_BASE = [
  { id: "supermercado", nombre: "Supermercado", tipo: "gasto", color: "#16a34a" },
  { id: "comida", nombre: "Comida fuera", tipo: "gasto", color: "#f97316" },
  { id: "transporte", nombre: "Transporte", tipo: "gasto", color: "#0ea5e9" },
  { id: "ocio", nombre: "Ocio", tipo: "gasto", color: "#a855f7" },
  { id: "compras", nombre: "Compras", tipo: "gasto", color: "#ec4899" },
  { id: "suscripciones", nombre: "Suscripciones", tipo: "gasto", color: "#6366f1" },
  { id: "salud", nombre: "Salud", tipo: "gasto", color: "#ef4444" },
  { id: "deporte", nombre: "Deporte", tipo: "gasto", color: "#14b8a6" },
  { id: "educacion", nombre: "Educación", tipo: "gasto", color: "#3b82f6" },
  { id: "facturas", nombre: "Facturas y hogar", tipo: "gasto", color: "#64748b" },
  { id: "viajes", nombre: "Viajes", tipo: "gasto", color: "#06b6d4" },
  { id: "regalos", nombre: "Regalos", tipo: "gasto", color: "#f43f5e" },
  { id: "bizum-enviado", nombre: "Bizum enviados", tipo: "gasto", color: "#0891b2" },
  { id: "efectivo", nombre: "Efectivo", tipo: "gasto", color: "#84cc16" },
  { id: "comisiones", nombre: "Comisiones", tipo: "gasto", color: "#78716c" },
  { id: "otros-gastos", nombre: "Otros gastos", tipo: "gasto", color: "#94a3b8" },
  { id: "nomina", nombre: "Nómina y trabajo", tipo: "ingreso", color: "#059669" },
  { id: "familia", nombre: "Familia", tipo: "ingreso", color: "#10b981" },
  { id: "bizum-recibido", nombre: "Bizum recibidos", tipo: "ingreso", color: "#22c55e" },
  { id: "devoluciones", nombre: "Devoluciones", tipo: "ingreso", color: "#65a30d" },
  { id: "intereses", nombre: "Intereses y cashback", tipo: "ingreso", color: "#0d9488" },
  { id: "otros-ingresos", nombre: "Otros ingresos", tipo: "ingreso", color: "#4ade80" },
  { id: "mb", nombre: "Matched betting", tipo: "mb", color: "#f59e0b" },
  { id: "mb-herramientas", nombre: "Herramientas MB", tipo: "mb", color: "#b45309" },
  { id: "traspaso", nombre: "Traspaso entre cuentas", tipo: "interna", color: "#94a3b8" },
  { id: "hucha", nombre: "Huchas y ahorro", tipo: "interna", color: "#a1a1aa" },
];

export const TIPOS = [
  { id: "gasto", nombre: "Gastos" },
  { id: "ingreso", nombre: "Ingresos" },
  { id: "mb", nombre: "Matched betting" },
  { id: "interna", nombre: "Entre tus cuentas" },
];

// Casas de apuestas con licencia en España: un movimiento que las nombra es de matched betting.
export const CASAS_BASE = [
  ["Bet365", "bet365"],
  ["Codere", "codere"],
  ["Bwin", "bwin"],
  ["William Hill", "william hill|williamhill"],
  ["888", "888|888sport|888casino"],
  ["Sportium", "sportium"],
  ["Betfair", "betfair"],
  ["Betway", "betway"],
  ["Luckia", "luckia"],
  ["Marca Apuestas", "marca apuestas|marcaapuestas"],
  ["Retabet", "retabet"],
  ["Kirolbet", "kirolbet"],
  ["Winamax", "winamax"],
  ["PokerStars", "pokerstars"],
  ["Betsson", "betsson"],
  ["Versus", "versus"],
  ["Paf", "paf"],
  ["Interwetten", "interwetten"],
  ["Paston", "paston"],
  ["Yaass", "yaass"],
  ["Casumo", "casumo"],
  ["LeoVegas", "leovegas"],
  ["Unibet", "unibet"],
  ["Jokerbet", "jokerbet"],
  ["TonyBet", "tonybet"],
  ["Bet777", "bet777"],
  ["Goldenpark", "goldenpark"],
  ["Suertia", "suertia"],
  ["Enracha", "enracha"],
  ["Botemanía", "botemania"],
  ["Dazn Bet", "dazn bet|daznbet"],
  ["Ekasa Apuestas", "ekasa"],
  ["Entain", "entain"],
].map(([nombre, claves]) => ({ id: normalizar(nombre).replace(/ /g, "-"), nombre, claves: claves.split("|"), saldo: 0, saldoInicial: 0, saldoFecha: null }));

// Casas que se añadieron después: se suman a los datos que ya estaban guardados.
const CASAS_V2 = ["dazn-bet", "ekasa-apuestas", "entain"];

export function completarBase(base) {
  if ((base.v ?? 1) >= 2) return base;
  const ids = new Set(base.casas.map((c) => c.id));
  return { ...base, v: 2, casas: [...base.casas, ...CASAS_BASE.filter((c) => CASAS_V2.includes(c.id) && !ids.has(c.id))] };
}

// Palabras que delatan la categoría. El orden importa: se usa la primera que coincide.
export const REGLAS_BASE = [
  ["mb-herramientas", "ninjabet|oddsmonkey|profit accumulator|outplayed|rebelbetting|betburger"],
  ["hucha", "hucha|huchas|savings|vault|pocket"],
  ["traspaso", "top up|topup|recarga de|traspaso"],
  [
    "comida",
    "uber eats|ubereats|glovo|just eat|justeat|deliveroo|mcdonald|burger king|telepizza|domino|kfc|starbucks|100 montaditos|foster|vips|goiko|tgb|popeyes|taco bell|restaurante|cafeteria|cerveceria|pizzeria|kebab|bar",
  ],
  [
    "suscripciones",
    "netflix|spotify|hbo|disney|prime video|amazon prime|amzn prime|apple com bill|icloud|google one|youtube premium|dazn|twitch|playstation plus|xbox game pass|chatgpt|openai|anthropic|claude|adobe|canva|patreon",
  ],
  [
    "supermercado",
    "mercadona|carrefour|lidl|aldi|supermercados dia|dia retail|eroski|alcampo|consum|hipercor|ahorramas|bm supermercados|gadis|froiz|masymas|condis|bonpreu|caprabo|spar|coviran|supersol|simply|supermercado",
  ],
  [
    "transporte",
    "renfe|cabify|uber|bolt|blablacar|alsa|avanza|emt|metro de|tmb|repsol|cepsa|bp|galp|shell|petronor|ballenoil|plenoil|gasolinera|parking|aparcamiento|autopista|peaje|via t|taxi|free now|freenow",
  ],
  ["viajes", "ryanair|vueling|iberia|air europa|easyjet|booking|airbnb|hotel|expedia|edreams|trainline|ouigo|iryo"],
  [
    "compras",
    "amazon|amzn|aliexpress|alibaba|shein|temu|zara|pull bear|bershka|stradivarius|primark|h m|mango|decathlon|fnac|mediamarkt|media markt|pccomponentes|el corte ingles|ikea|leroy merlin|vinted|wallapop|sprinter|jd sports|foot locker|nike|adidas",
  ],
  ["ocio", "cine|cinesa|yelmo|kinepolis|ocine|ticketmaster|eventbrite|entradas|steam|valve|epic games|fortnite|nintendo|playstation|g2a|eneba|seagm|tebex|instant gaming|discoteca"],
  ["salud", "farmacia|clinica|dentista|optica|hospital|quiron|sanitas|adeslas|fisioterapia"],
  ["deporte", "gimnasio|gym|basic fit|mcfit|altafit|anytime fitness|synergym|go fit|padel|playtomic"],
  ["educacion", "universidad|academia|matricula|udemy|coursera|libreria|casa del libro|papeleria"],
  ["facturas", "movistar|vodafone|orange|digi|yoigo|masmovil|pepephone|lowi|simyo|o2|iberdrola|endesa|naturgy|holaluz|totalenergies"],
  ["bizum-enviado", "bizum", -1],
  ["bizum-recibido", "bizum", 1],
  ["efectivo", "cajero|atm|reintegro|retirada de efectivo|retirada efectivo|cash withdrawal", -1],
  ["comisiones", "comision|comisiones|cuota tarjeta|cuota de mantenimiento|fee", -1],
  ["nomina", "nomina|salario|payroll", 1],
  ["intereses", "intereses|interest|cashback|recompensa|rewards", 1],
  ["devoluciones", "devolucion|reembolso|refund|anulacion", 1],
].map(([categoria, claves, signo = 0]) => ({ categoria, claves: claves.split("|"), signo }));

export const CUENTAS_BASE = [
  { id: "revolut", nombre: "Revolut", color: "#111827", saldoRef: null, saldoFecha: null },
  { id: "ruralvia", nombre: "Ruralvía", color: "#00843d", saldoRef: null, saldoFecha: null },
];

export function estadoInicial() {
  return {
    base: { v: 2, cuentas: CUENTAS_BASE, categorias: CATEGORIAS_BASE, reglas: [], casas: CASAS_BASE, metas: [], objetivoAhorro: null },
    movimientos: [],
  };
}

/* ───────────────────────── Clasificación ───────────────────────── */

const cacheClaves = new Map();

// Una clave corta (4 letras o menos) tiene que ser una palabra entera; una larga, el principio de una palabra.
export function coincide(textoNormalizado, clave) {
  const k = normalizar(clave);
  if (!k) return false;
  let re = cacheClaves.get(k);
  if (!re) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(k.length <= 4 ? `(^| )${esc}( |$)` : `(^| )${esc}`);
    cacheClaves.set(k, re);
  }
  return re.test(textoNormalizado);
}

export const casaDe = (textoNormalizado, casas) => casas.find((c) => c.claves.some((k) => coincide(textoNormalizado, k))) ?? null;

export function categoriaAuto(mov, base, tipoBanco = "") {
  const t = normalizar(mov.concepto);
  const signo = Math.sign(mov.importe);
  for (const r of base.reglas) if (coincide(t, r.clave)) return r.categoria;
  if (casaDe(t, base.casas)) return "mb";
  const tb = normalizar(tipoBanco);
  const deTercero = /^(pago de|payment from|transferencia de)\b/.test(t) || coincide(t, "bizum");
  if (/^(topup|top up|recarga|exchange|cambio)/.test(tb) && !deTercero) return "traspaso";
  if (mov.cuenta === "ruralvia" && coincide(t, "revolut")) return "traspaso";
  if (mov.cuenta === "revolut" && ["caja rural", "ruralvia", "rural"].some((k) => coincide(t, k))) return "traspaso";
  for (const r of REGLAS_BASE) if ((!r.signo || r.signo === signo) && r.claves.some((k) => coincide(t, k))) return r.categoria;
  return null;
}

// Un cargo en una cuenta y un abono del mismo importe en otra, con 3 días o menos de diferencia, son un traspaso.
export function emparejarTraspasos(movs) {
  const libres = movs.filter((m) => !m.categoria && !m.manual);
  const porImporte = new Map();
  for (const m of libres) {
    const k = Math.round(m.importe * 100);
    if (!porImporte.has(k)) porImporte.set(k, []);
    porImporte.get(k).push(m);
  }
  const pares = new Set();
  for (const m of libres) {
    if (m.importe >= 0 || pares.has(m.id)) continue;
    const otro = (porImporte.get(-Math.round(m.importe * 100)) ?? [])
      .filter((o) => o.cuenta !== m.cuenta && !pares.has(o.id) && Math.abs(diasEntre(m.fecha, o.fecha)) <= 3)
      .sort((a, b) => Math.abs(diasEntre(m.fecha, a.fecha)) - Math.abs(diasEntre(m.fecha, b.fecha)))[0];
    if (otro) {
      pares.add(m.id);
      pares.add(otro.id);
    }
  }
  return pares.size ? movs.map((m) => (pares.has(m.id) ? { ...m, categoria: "traspaso" } : m)) : movs;
}

const RUIDO = new Set(
  "compra compras pago pagos cargo recibo tarj tarjeta tarjetas credito debito con en de del la el a al favor transferencia transf trf card payment to from at by por movil contactless apple google pay ref op num n es esp sl sa operacion fecha".split(
    " ",
  ),
);

// Nombre legible del comercio o de la persona a partir del concepto del banco.
export function comercio(concepto) {
  const palabras = normalizar(concepto)
    .split(" ")
    .filter((w) => w.length > 1 && !RUIDO.has(w) && !/^\d+$/.test(w) && !/\d{4,}/.test(w) && !(w.length <= 3 && /\d/.test(w)));
  return palabras.length ? titulo(palabras.slice(0, 3).join(" ")) : String(concepto).trim().slice(0, 32) || "Movimiento";
}

export function claveSugerida(concepto) {
  const t = normalizar(concepto);
  const palabras = normalizar(comercio(concepto)).split(" ");
  if (palabras[0] === "bizum" && palabras.length > 1) {
    const nombre = palabras.slice(1, 3).join(" ");
    if (t.includes(nombre)) return nombre;
  }
  const primera = palabras.find((w) => w.length >= 3) ?? palabras[0] ?? "";
  return t.includes(primera) ? primera : t.split(" ")[0];
}

/* ───────────────────────── Lectura de extractos ───────────────────────── */

export function decodificar(buffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export const esNorma43 = (texto) => {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  return lineas.length > 1 && lineas[0].startsWith("11") && lineas.some((l) => l.startsWith("22")) && lineas.every((l) => /^(11|22|23|33|88)/.test(l));
};

// Norma 43 (cuaderno 43 de la AEB), el formato estándar de extractos de los bancos españoles.
export function leerNorma43(texto) {
  const movs = [];
  let saldoFinal = null;
  let fechaFinal = null;
  for (const l of texto.split(/\r?\n/)) {
    if (l.startsWith("22")) {
      const f = l.slice(10, 16);
      const importe = (Number(l.slice(28, 42)) / 100) * (l[27] === "1" ? -1 : 1);
      const ref = [l.slice(52, 64), l.slice(64, 80)]
        .map((x) => x.trim())
        .filter((x) => x && !/^0+$/.test(x))
        .join(" ");
      movs.push({ fecha: fechaValida(2000 + +f.slice(0, 2), +f.slice(2, 4), +f.slice(4, 6)), concepto: "", importe: redondear(importe), ref });
    } else if (l.startsWith("23") && movs.length) {
      const extra = `${l.slice(4, 42)} ${l.slice(42, 80)}`.replace(/\s+/g, " ").trim();
      movs.at(-1).concepto = `${movs.at(-1).concepto} ${extra}`.trim();
    } else if (l.startsWith("11")) {
      const f = l.slice(26, 32);
      fechaFinal = fechaValida(2000 + +f.slice(0, 2), +f.slice(2, 4), +f.slice(4, 6));
    } else if (l.startsWith("33")) {
      saldoFinal = (Number(l.slice(59, 73)) / 100) * (l[58] === "1" ? -1 : 1);
    }
  }
  const validos = movs.filter((m) => m.fecha && m.importe);
  for (const m of validos) if (!m.concepto) m.concepto = m.ref || "Movimiento";
  const ultima = validos.reduce((a, m) => (m.fecha > a ? m.fecha : a), "");
  // El saldo final incluye todos los movimientos del fichero: vale en la fecha del último.
  return { movs: validos, saldo: saldoFinal === null ? null : { valor: redondear(saldoFinal), fecha: ultima || fechaFinal } };
}

export function trocearCSV(texto) {
  const muestra = texto
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 15);
  const contar = (l, d) => {
    let n = 0;
    let comillas = false;
    for (const c of l) {
      if (c === '"') comillas = !comillas;
      else if (c === d && !comillas) n++;
    }
    return n;
  };
  const delim = [";", "\t", ",", "|"]
    .map((d) => {
      const n = muestra.map((l) => contar(l, d)).sort((a, b) => a - b);
      return { d, n: n[Math.floor(n.length / 2)] ?? 0 };
    })
    .sort((a, b) => b.n - a.n)[0].d;
  const filas = [];
  let fila = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === delim) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => String(x).trim()));
}

// Nombres de columna conocidos (Revolut en inglés y en español, Ruralvía y otros bancos). Los específicos primero.
const ROLES = [
  ["fechaValor", ["fecha valor", "f valor", "value date"]],
  ["fechaFin", ["fecha de finalizacion", "fecha finalizacion", "completed date", "fecha de fin"]],
  ["fecha", ["fecha operacion", "fecha de operacion", "f operacion", "fecha de inicio", "fecha inicio", "started date", "fecha contable", "fecha movimiento", "fecha", "date"]],
  ["concepto2", ["mas datos", "concepto ampliado", "informacion adicional", "observaciones", "referencia", "beneficiario", "ordenante"]],
  ["concepto", ["concepto", "descripcion", "description", "detalle", "movimiento"]],
  ["comision", ["comision", "comisiones", "fee"]],
  ["importe", ["importe", "amount", "cantidad", "monto"]],
  ["cargo", ["cargo", "cargos", "debe", "debito", "salida", "pagos"]],
  ["abono", ["abono", "abonos", "haber", "credito", "entrada", "cobros"]],
  ["divisa", ["divisa", "moneda", "currency"]],
  ["saldo", ["saldo", "balance"]],
  ["estado", ["estado", "state", "status"]],
  ["tipo", ["tipo", "type"]],
  ["producto", ["producto", "product"]],
];

export const NOMBRES_ROL = { fecha: "Fecha", concepto: "Concepto", importe: "Importe", cargo: "Cargo (gasto)", abono: "Abono (ingreso)", saldo: "Saldo", comision: "Comisión" };

function rolDe(celda) {
  const t = normalizar(celda);
  if (!t || t.length > 40) return null;
  for (const [rol, sinonimos] of ROLES) if (sinonimos.some((s) => t === s || t.startsWith(`${s} `))) return rol;
  return null;
}

export function analizarTabla(filas) {
  for (let i = 0; i < Math.min(filas.length, 40); i++) {
    const roles = {};
    filas[i].forEach((celda, j) => {
      const rol = rolDe(celda);
      if (!rol) return;
      if (rol === "concepto" || rol === "concepto2") (roles[rol] ??= []).push(j);
      else roles[rol] ??= j;
    });
    const fecha = roles.fecha ?? roles.fechaFin ?? roles.fechaValor;
    if (fecha !== undefined && (roles.importe !== undefined || roles.cargo !== undefined || roles.abono !== undefined)) {
      const cabecera = filas[i].map((c) => normalizar(c)).join(" ");
      return {
        cabecera: i,
        mapa: {
          fecha,
          concepto: [...(roles.concepto ?? []), ...(roles.concepto2 ?? [])],
          importe: roles.importe,
          cargo: roles.cargo,
          abono: roles.abono,
          comision: roles.comision,
          divisa: roles.divisa,
          saldo: roles.saldo,
          estado: roles.estado,
          tipo: roles.tipo,
          producto: roles.producto,
        },
        formato: /started date|fecha de inicio/.test(cabecera) && roles.producto !== undefined ? "revolut" : null,
      };
    }
  }
  return null;
}

// Convierte las filas de la tabla en movimientos. Cuenta lo que se salta y por qué.
export function filasAMovimientos(filas, cabecera, mapa) {
  const movs = [];
  const omitidos = { pendientes: 0, divisas: 0, huchas: 0, invalidos: 0 };
  const conSaldo = [];
  const celda = (fila, i) => (i === undefined || i === null ? "" : (fila[i] ?? ""));
  filas.slice(cabecera + 1).forEach((fila, orden) => {
    const estado = normalizar(celda(fila, mapa.estado));
    if (estado && /pend|revert|devuel|anulad|declin|rechaz|fail|fallid|cancel/.test(estado)) return omitidos.pendientes++;
    const divisa = String(celda(fila, mapa.divisa)).trim().toUpperCase();
    if (divisa && !["EUR", "€", "EURO", "EUROS"].includes(divisa)) return omitidos.divisas++;
    if (/saving|ahorro|hucha|deposit|vault/.test(normalizar(celda(fila, mapa.producto)))) return omitidos.huchas++;
    const fecha = aFecha(celda(fila, mapa.fecha));
    let importe = mapa.importe !== undefined && mapa.importe !== null ? aNumero(celda(fila, mapa.importe)) : null;
    if (importe === null && (mapa.cargo !== undefined || mapa.abono !== undefined)) {
      const cargo = aNumero(celda(fila, mapa.cargo)) ?? 0;
      const abono = aNumero(celda(fila, mapa.abono)) ?? 0;
      if (cargo || abono) importe = Math.abs(abono) - Math.abs(cargo);
    }
    if (!fecha || importe === null) {
      if (fila.some((c) => String(c).trim())) omitidos.invalidos++;
      return;
    }
    const tipoBanco = String(celda(fila, mapa.tipo)).trim();
    const concepto =
      (mapa.concepto ?? [])
        .map((i) => String(celda(fila, i)).trim())
        .filter(Boolean)
        .join(" · ") ||
      tipoBanco ||
      "Movimiento";
    if (importe !== 0) movs.push({ fecha, concepto, importe: redondear(importe), tipoBanco });
    const comision = aNumero(celda(fila, mapa.comision));
    if (comision) movs.push({ fecha, concepto: `Comisión · ${concepto}`, importe: -Math.abs(redondear(comision)), tipoBanco: "", comision: true });
    const saldo = aNumero(celda(fila, mapa.saldo));
    if (saldo !== null) conSaldo.push({ fecha, saldo, orden });
  });
  // El saldo final es el de la fila más reciente; si el extracto va de nuevo a viejo, la primera de ese día.
  let saldo = null;
  if (conSaldo.length) {
    const ascendente = conSaldo[0].fecha <= conSaldo.at(-1).fecha;
    const ultima = conSaldo.reduce((a, s) => (s.fecha > a ? s.fecha : a), "");
    const delDia = conSaldo.filter((s) => s.fecha === ultima);
    const fila = ascendente ? delDia.at(-1) : delDia[0];
    saldo = { valor: redondear(fila.saldo), fecha: fila.fecha };
  }
  return { movs, omitidos, saldo };
}

// Asigna categoría, quita lo que ya estaba importado y deja los movimientos listos para guardar.
export function prepararImportacion(crudos, cuenta, datos) {
  const propios = datos.movimientos.filter((m) => m.cuenta === cuenta);
  const porHuella = new Map(propios.map((m) => [m.huella, m]));
  const usados = new Set();
  const ocurrencias = new Map();
  const pendientes = [];
  let duplicados = 0;
  // 1.º: mismo texto (se ha vuelto a subir el mismo extracto o uno que se solapa).
  for (const c of crudos) {
    const raiz = `${cuenta}|${c.fecha}|${c.importe.toFixed(2)}|${normalizar(c.concepto).slice(0, 60)}`;
    const n = (ocurrencias.get(raiz) ?? 0) + 1;
    ocurrencias.set(raiz, n);
    const huella = `${raiz}#${n}`;
    const previo = porHuella.get(huella);
    if (previo && !usados.has(previo.id)) {
      usados.add(previo.id);
      duplicados++;
    } else pendientes.push({ c, huella });
  }
  // 2.º: misma fecha e importe con otro texto (el mismo movimiento bajado en otro formato, o apuntado a mano).
  const libres = new Map();
  for (const m of propios) {
    if (usados.has(m.id)) continue;
    const k = `${m.fecha}|${m.importe.toFixed(2)}`;
    libres.set(k, [...(libres.get(k) ?? []), m]);
  }
  const nuevos = [];
  for (const { c, huella } of pendientes) {
    const igual = libres.get(`${c.fecha}|${c.importe.toFixed(2)}`);
    if (igual?.length) {
      igual.shift();
      duplicados++;
      continue;
    }
    const mov = { id: nuevoId(), cuenta, fecha: c.fecha, concepto: c.concepto, importe: c.importe, huella, origen: "importado" };
    mov.categoria = c.comision ? "comisiones" : categoriaAuto(mov, datos.base, c.tipoBanco);
    nuevos.push(mov);
  }
  nuevos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { nuevos, duplicados };
}

/* ───────────────────────── Betfair y hoja de control de matched betting ───────────────────────── */

// Extracto de actividad mensual de Betfair en CSV: una fila de cabecera y otra con los totales del mes.
export function leerExtractoBetfair(filas) {
  const i = filas.findIndex((f) => f.some((c) => normalizar(c) === "saldo de perdidas y ganancias"));
  if (i < 0 || !filas[i + 1]) return null;
  const valor = (nombre) => {
    const j = filas[i].findIndex((c) => normalizar(c) === nombre);
    return j < 0 ? null : filas[i + 1][j];
  };
  const desde = aFecha(valor("desde la fecha"));
  const hasta = aFecha(valor("hasta la fecha"));
  const numero = (nombre) => redondear(aNumero(valor(nombre)) ?? 0);
  if (!desde || !hasta) return null;
  return {
    desde,
    hasta,
    saldoInicial: numero("saldo inicial"),
    saldoFinal: numero("saldo al cerrar la cuenta"),
    pyg: numero("saldo de perdidas y ganancias"),
    apostado: numero("cantidad apostada"),
    depositado: numero("importe total depositado"),
    retirado: numero("importe total retirado"),
  };
}

const COLUMNAS_MB = {
  persona: ["persona", "titular", "nombre"],
  casa: ["casas de apuestas", "casa de apuestas", "casas", "casa"],
  fecha: ["fecha"],
  estado: ["estado"],
  fase1: ["fase 1", "perdida", "perdidas"],
  fase2: ["fase 2", "ganancia", "ganancias"],
  neto: ["beneficio neto", "beneficio", "neto", "total"],
  pagado: ["pagado", "pagada"],
};
const esSi = (v) => v === true || /^(true|verdadero|si|x|pagado|pagada)$/.test(normalizar(v));
const celdaNumero = (v) => (v === "" || v === null || v === undefined || typeof v === "boolean" ? null : aNumero(v));

// Una hoja de control: por cada persona, una fila por casa con las fases del bono y lo que deja.
// A la derecha, «TOTAL» con su valor y, debajo, cómo se reparte (nombre y cantidad).
export function leerHojaMB(nombre, filas) {
  for (let h = 0; h < Math.min(filas.length, 15); h++) {
    const cab = filas[h].map((c) => normalizar(c));
    const col = {};
    for (const [rol, nombres] of Object.entries(COLUMNAS_MB)) {
      const j = cab.findIndex((c) => nombres.some((n) => c === n || c.endsWith(` ${n}`)));
      if (j >= 0) col[rol] ??= j;
    }
    if (col.persona === undefined || col.casa === undefined || col.neto === undefined) continue;

    const ops = [];
    const notas = {};
    let persona = null;
    for (let r = h + 1; r < filas.length; r++) {
      const f = filas[r];
      const casa = String(f[col.casa] ?? "").trim();
      const quien = String(f[col.persona] ?? "").trim();
      if (!casa) {
        persona = null; // una fila sin casa separa a una persona de la siguiente
        continue;
      }
      if (quien) {
        if (!persona) persona = quien;
        else (notas[persona] ??= []).push(quien);
      }
      if (!persona) continue;
      const estadoCelda = col.estado === undefined ? "" : f[col.estado];
      const estado = typeof estadoCelda === "string" ? estadoCelda.trim().toUpperCase() : "";
      const fase1 = col.fase1 === undefined ? null : celdaNumero(f[col.fase1]);
      const fase2 = col.fase2 === undefined ? null : celdaNumero(f[col.fase2]);
      const neto = celdaNumero(f[col.neto]);
      if (!estado && !fase1 && !fase2 && !neto) continue;
      const op = { persona, casa, estado: estado || null, fase1, fase2, neto: redondear(neto ?? (fase1 ?? 0) + (fase2 ?? 0)), pagado: col.pagado !== undefined && esSi(f[col.pagado]) };
      const fecha = col.fecha === undefined ? "" : f[col.fecha];
      if (fecha) op.fecha = fecha instanceof Date ? aISO(fecha) : String(fecha).trim();
      if (fase1 !== null && fase2 !== null && Math.abs(fase1 + fase2 - op.neto) > 0.005) op.descuadre = redondear(fase1 + fase2);
      ops.push(op);
    }

    // TOTAL y reparto, a la derecha de la tabla.
    const derecha = Math.max(...Object.values(col)) + 1;
    const numeroTras = (fila, j) => {
      for (let k = j + 1; k <= j + 2; k++) {
        const n = celdaNumero(fila[k]);
        if (n !== null) return n;
      }
      return null;
    };
    let total = null;
    const reparto = [];
    for (let r = 0; r < filas.length && total === null; r++) {
      for (let j = derecha; j < filas[r].length; j++) {
        if (!normalizar(filas[r][j]).startsWith("total")) continue;
        const v = numeroTras(filas[r], j);
        if (v === null) continue;
        total = redondear(v);
        for (let k = r + 1; k < filas.length; k++) {
          const quien = String(filas[k][j] ?? "").trim();
          const cantidad = numeroTras(filas[k], j);
          if (!quien || cantidad === null) break;
          reparto.push({ nombre: quien, valor: redondear(cantidad) });
        }
        break;
      }
    }
    const sumaNeto = redondear(ops.reduce((s, o) => s + o.neto, 0));
    return { nombre, ops, notas, total, reparto, sumaNeto, pagados: ops.filter((o) => o.pagado && o.neto).length };
  }
  return null;
}

// Libro con una o varias hojas de control. Propone quién eres: el nombre que sale en el reparto de todas las hojas.
export function leerExcelMB(hojas) {
  const leidas = hojas.map(({ nombre, filas }) => leerHojaMB(nombre, filas)).filter(Boolean);
  if (!leidas.length) return null;
  const conteo = new Map();
  for (const h of leidas) for (const r of h.reparto) conteo.set(r.nombre, (conteo.get(r.nombre) ?? 0) + 1);
  const yo = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { hojas: leidas, yo };
}

// Lo que te toca según la hoja: tu parte del reparto o, si la hoja no reparte, su total.
export function beneficioExcel(excel) {
  if (!excel) return null;
  const yo = normalizar(excel.yo ?? "");
  const partes = excel.hojas.map((h) => {
    const mia = h.reparto.find((r) => normalizar(r.nombre) === yo);
    return { hoja: h.nombre, valor: mia ? mia.valor : h.reparto.length ? 0 : (h.total ?? h.sumaNeto), total: h.total ?? h.sumaNeto };
  });
  return { total: redondear(partes.reduce((s, p) => s + p.valor, 0)), partes };
}

// Resumen de la hoja por persona y por casa, con lo que queda pendiente o no cuadra.
export function resumenExcelMB(excel) {
  const personas = new Map();
  const casas = new Map();
  const pendientes = [];
  const descuadres = [];
  for (const h of excel.hojas) {
    for (const o of h.ops) {
      const clave = `${h.nombre}|${o.persona}`;
      const p = personas.get(clave) ?? { hoja: h.nombre, persona: o.persona, neto: 0, hechas: 0, porHacer: 0, notas: h.notas[o.persona] ?? [] };
      p.neto = redondear(p.neto + o.neto);
      if (o.neto) p.hechas++;
      else if (o.estado && !/hecha|proceso/i.test(o.estado)) p.porHacer++;
      personas.set(clave, p);
      if (o.neto) {
        const c = casas.get(o.casa) ?? { casa: o.casa, neto: 0, veces: 0 };
        c.neto = redondear(c.neto + o.neto);
        c.veces++;
        casas.set(o.casa, c);
      }
      if (/proceso/i.test(o.estado ?? "") || (/hecha/i.test(o.estado ?? "") && o.fase2 === null)) pendientes.push({ hoja: h.nombre, ...o });
      if (o.descuadre !== undefined) descuadres.push({ hoja: h.nombre, ...o });
    }
  }
  return {
    personas: [...personas.values()].filter((p) => p.hechas || p.porHacer).sort((a, b) => b.neto - a.neto),
    casas: [...casas.values()].sort((a, b) => b.neto - a.neto),
    pendientes,
    descuadres,
    hojas: excel.hojas.map((h) => ({
      nombre: h.nombre,
      total: h.total,
      sumaNeto: h.sumaNeto,
      descontado: h.total === null ? 0 : redondear(h.sumaNeto - h.total),
      pagados: h.pagados,
      reparto: h.reparto,
    })),
  };
}

/* ───────────────────────── Cálculos ───────────────────────── */

export function categoriaDe(m, cats) {
  return cats[m.categoria] ?? { id: null, nombre: "Sin categoría", tipo: m.importe < 0 ? "gasto" : "ingreso", color: "#cbd5e1" };
}

// Saldo de una cuenta en una fecha, a partir del último saldo conocido y de los movimientos.
export function saldoEn(cuenta, movs, fecha) {
  if (cuenta.saldoRef === null || cuenta.saldoRef === undefined) return null;
  let s = cuenta.saldoRef;
  for (const m of movs) {
    if (m.cuenta !== cuenta.id) continue;
    if (m.fecha > cuenta.saldoFecha && m.fecha <= fecha) s += m.importe;
    else if (m.fecha <= cuenta.saldoFecha && m.fecha > fecha) s -= m.importe;
  }
  return redondear(s);
}

export function resumenMes(movs, cats, mes) {
  let ingresos = 0;
  let gastos = 0;
  let mb = 0;
  let sinCategoria = 0;
  const porCategoria = new Map();
  for (const m of movs) {
    if (!m.fecha.startsWith(mes)) continue;
    const c = categoriaDe(m, cats);
    if (c.tipo === "interna") continue;
    if (!c.id) sinCategoria++;
    if (c.tipo === "mb") {
      mb += m.importe;
      continue;
    }
    if (c.tipo === "gasto") gastos -= m.importe;
    else ingresos += m.importe;
    const k = c.id ?? `sin-${c.tipo}`;
    const actual = porCategoria.get(k) ?? { ...c, id: k, total: 0, veces: 0 };
    actual.total += c.tipo === "gasto" ? -m.importe : m.importe;
    actual.veces++;
    porCategoria.set(k, actual);
  }
  const lista = [...porCategoria.values()].map((c) => ({ ...c, total: redondear(c.total) }));
  return {
    ingresos: redondear(ingresos),
    gastos: redondear(gastos),
    mb: redondear(mb),
    ahorro: redondear(ingresos - gastos + mb),
    sinCategoria,
    gastosPorCategoria: lista.filter((c) => c.tipo === "gasto" && c.total > 0).sort((a, b) => b.total - a.total),
    ingresosPorCategoria: lista.filter((c) => c.tipo === "ingreso" && c.total > 0).sort((a, b) => b.total - a.total),
  };
}

export function resumenMB(movs, base, cats) {
  const porCasa = new Map(base.casas.map((c) => [c.id, { ...c, depositado: 0, retirado: 0, veces: 0 }]));
  const sinCasa = { id: null, nombre: "Sin casa reconocida", depositado: 0, retirado: 0, veces: 0 };
  const porMes = new Map();
  let depositado = 0;
  let retirado = 0;
  let herramientas = 0;
  for (const m of movs) {
    if (cats[m.categoria]?.tipo !== "mb") continue;
    const mes = m.fecha.slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + m.importe);
    if (m.categoria === "mb-herramientas") {
      herramientas -= m.importe;
      continue;
    }
    if (m.importe < 0) depositado -= m.importe;
    else retirado += m.importe;
    const casa = casaDe(normalizar(m.concepto), base.casas);
    const destino = casa ? porCasa.get(casa.id) : sinCasa;
    if (m.importe < 0) destino.depositado -= m.importe;
    else destino.retirado += m.importe;
    destino.veces++;
  }
  // El saldo apuntado de una casa es el de su fecha: lo metido o sacado después se suma o se resta.
  for (const m of movs) {
    if (m.categoria !== "mb") continue;
    const casa = casaDe(normalizar(m.concepto), base.casas);
    const c = casa && porCasa.get(casa.id);
    if (c?.saldoFecha && m.fecha > c.saldoFecha) c.despues = (c.despues ?? 0) - m.importe;
  }
  for (const c of porCasa.values()) c.saldoHoy = redondear((c.saldo || 0) + (c.despues ?? 0));
  const saldoCasas = [...porCasa.values()].reduce((s, c) => s + c.saldoHoy, 0);
  const saldoInicial = base.casas.reduce((s, c) => s + (c.saldoInicial || 0), 0);
  const casas = [...porCasa.values(), sinCasa]
    .filter((c) => c.veces || c.saldo || c.saldoInicial)
    .map((c) => ({ ...c, neto: redondear(c.retirado - c.depositado + (c.saldoHoy ?? 0) - (c.saldoInicial || 0)) }));
  return {
    depositado: redondear(depositado),
    retirado: redondear(retirado),
    herramientas: redondear(herramientas),
    saldoCasas: redondear(saldoCasas),
    saldoInicial: redondear(saldoInicial),
    beneficio: redondear(retirado - depositado - herramientas + saldoCasas - saldoInicial),
    casas: casas.sort((a, b) => b.depositado + b.retirado - (a.depositado + a.retirado)),
    porMes: [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mes, neto]) => ({ mes, neto: redondear(neto) })),
  };
}

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

// Gastos que se repiten cada mes (suscripciones, recibos): mismo comercio, importe parecido, ~30 días entre cargos.
export function recurrentes(movs, cats, hoy) {
  const desde = sumarMeses(hoy, -12);
  const grupos = new Map();
  for (const m of movs) {
    if (m.importe >= 0 || m.fecha < desde || cats[m.categoria]?.tipo !== "gasto" || m.categoria === "efectivo" || m.categoria === "bizum-enviado") continue;
    const k = normalizar(comercio(m.concepto)).split(" ").slice(0, 2).join(" ");
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(m);
  }
  const lista = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    g.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const meses = new Set(g.map((m) => m.fecha.slice(0, 7)));
    if (meses.size < 2 || g.length > meses.size + 1) continue;
    const importe = mediana(g.map((m) => -m.importe));
    if (g.filter((m) => Math.abs(-m.importe - importe) <= importe * 0.25).length < g.length * 0.8) continue;
    const intervalos = g.slice(1).map((m, i) => diasEntre(g[i].fecha, m.fecha));
    const intervalo = mediana(intervalos);
    if (intervalo < 25 || intervalo > 35) continue;
    const ultima = g.at(-1);
    const proxima = sumarDias(ultima.fecha, Math.round(intervalo));
    if (proxima < sumarDias(hoy, -10)) continue;
    lista.push({ nombre: comercio(ultima.concepto), importe: redondear(importe), ultima: ultima.fecha, proxima, categoria: ultima.categoria, cuenta: ultima.cuenta, veces: g.length });
  }
  return lista.sort((a, b) => a.proxima.localeCompare(b.proxima));
}

export function topComercios(movs, cats, mes, n = 10) {
  const grupos = new Map();
  for (const m of movs) {
    if (!m.fecha.startsWith(mes) || m.importe >= 0) continue;
    const c = categoriaDe(m, cats);
    if (c.tipo !== "gasto") continue;
    const nombre = comercio(m.concepto);
    const g = grupos.get(nombre) ?? { nombre, total: 0, veces: 0, color: c.color };
    g.total -= m.importe;
    g.veces++;
    grupos.set(nombre, g);
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, total: redondear(g.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/* ───────────────────────── Exportar ───────────────────────── */

export function aCSV(movs, base) {
  const cats = Object.fromEntries(base.categorias.map((c) => [c.id, c]));
  const cuentas = Object.fromEntries(base.cuentas.map((c) => [c.id, c.nombre]));
  const esc = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const filas = [["Fecha", "Cuenta", "Concepto", "Importe", "Categoría", "Tipo", "Nota"]];
  for (const m of [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const c = categoriaDe(m, cats);
    filas.push([m.fecha, cuentas[m.cuenta] ?? m.cuenta, m.concepto, m.importe.toFixed(2).replace(".", ","), c.nombre, TIPOS.find((t) => t.id === c.tipo)?.nombre ?? "", m.nota ?? ""]);
  }
  return `﻿${filas.map((f) => f.map(esc).join(";")).join("\r\n")}`;
}
