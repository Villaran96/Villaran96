// Segundo Cerebro: contratos, pólizas, impuestos y notas en un solo sitio, con un chat que responde
// citando el documento y la página (búsqueda simulada sobre tus propios documentos). Un solo archivo.
// Arranca con lo que viene en el prompt y todo lo que añades se guarda.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  Brain,
  Check,
  ChevronRight,
  FileText,
  FolderOpen,
  House,
  Landmark,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* ───────────────────────── Fechas ───────────────────────── */

const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const deISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const hoyISO = () => aISO(new Date());
const sumarDias = (iso, n) => {
  const d = deISO(iso);
  d.setDate(d.getDate() + n);
  return aISO(d);
};
const sumarMeses = (iso, n) => {
  const d = deISO(iso);
  const dia = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return aISO(d);
};
const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86_400_000);
const larga = (iso) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(deISO(iso));
const corta = (iso) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(deISO(iso)).replace(".", "");
const nuevoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const normalizar = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ───────────────────────── Datos del prompt ───────────────────────── */

const CATEGORIAS = [
  { id: "contratos", nombre: "Contratos", icono: FileText, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300", anillo: "ring-blue-400" },
  { id: "seguros", nombre: "Seguros", icono: ShieldCheck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", anillo: "ring-emerald-400" },
  { id: "impuestos", nombre: "Impuestos", icono: Landmark, color: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300", anillo: "ring-orange-400" },
  { id: "notas", nombre: "Notas e ideas", icono: Lightbulb, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300", anillo: "ring-violet-400" },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));
const PREGUNTA_INICIAL = "¿Cuándo vence mi seguro de auto?";
const SUGERENCIAS = ["¿Qué contratos tengo vigentes?", "¿Cuánto pagué de impuestos?", "Resumen de mi contrato actual"];

function estadoInicial() {
  const hoy = hoyISO();
  const base = {
    documentos: [
      {
        id: "d1",
        nombre: "Póliza Seguro GNP.pdf",
        carpeta: "seguros",
        descripcion: "Seguro de auto",
        subido: hoy,
        vence: "2026-03-14",
        paginaVence: 2,
        datos: [
          ["Cobertura", "Amplia"],
          ["Aseguradora", "GNP"],
          ["Número de póliza", "589274631"],
        ],
        archivo: null,
      },
    ],
    notas: [],
    recordatorios: [],
  };
  return {
    ...base,
    chat: [
      { id: "m1", de: "yo", texto: PREGUNTA_INICIAL },
      { id: "m2", de: "ia", ...responder(PREGUNTA_INICIAL, base, hoy) },
    ],
  };
}

const VISTAS = [
  { id: "chat", nombre: "Chat" },
  { id: "documentos", nombre: "Documentos" },
  { id: "notas", nombre: "Notas" },
  { id: "recordatorios", nombre: "Recordatorios" },
];

/* ───────────────────────── Guardado ───────────────────────── */

// En claude.ai los datos van a la parte privada de tu cuenta (capacidad `db`), así que los ves igual
// en el móvil y en el ordenador. Fuera de claude.ai se guardan en este navegador.
function useGuardado(clave, crearInicial) {
  const [estado, setEstado] = useState(() => {
    try {
      const local = localStorage.getItem(clave);
      if (local) return JSON.parse(local);
    } catch {}
    return crearInicial();
  });
  const ref = useRef(null);
  const escrito = useRef(null);
  const cola = useRef(Promise.resolve());
  const actual = useRef(estado);
  actual.current = estado;

  const subir = useCallback((json) => {
    escrito.current = json;
    cola.current = cola.current.then(() => ref.current.set({ estado: JSON.parse(json) })).catch(() => {});
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!window.claude?.use) return;
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      const id = db && user ? await user.id() : null;
      if (!vivo || !id) return;
      try {
        const doc = db.doc(`data/users/${id}/${clave}`);
        const snap = await doc.get();
        if (!vivo) return;
        ref.current = doc;
        const remoto = snap.exists ? snap.data()?.estado : null;
        if (remoto) {
          escrito.current = JSON.stringify(remoto);
          setEstado(remoto);
        } else {
          subir(JSON.stringify(actual.current));
        }
      } catch {}
    })();
    return () => {
      vivo = false;
    };
  }, [clave, subir]);

  useEffect(() => {
    const json = JSON.stringify(estado);
    try {
      localStorage.setItem(clave, json);
    } catch {}
    if (!ref.current || json === escrito.current) return;
    const t = setTimeout(() => subir(json), 500);
    return () => clearTimeout(t);
  }, [clave, estado, subir]);

  return [estado, setEstado];
}

/* ───────────────────────── Archivos ───────────────────────── */

// En claude.ai los archivos se suben a la propia página (capacidad `assets`). Si no se puede (fuera de
// claude.ai o con un tipo de archivo que no admite), se guardan en este navegador con IndexedDB.
const TIPOS_ASSETS = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

function abrirIDB() {
  return new Promise((resolver, rechazar) => {
    const r = indexedDB.open("segundo-cerebro", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("archivos");
    r.onsuccess = () => resolver(r.result);
    r.onerror = () => rechazar(r.error);
  });
}

async function idb(modo, accion) {
  const db = await abrirIDB();
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction("archivos", modo);
    const peticion = accion(tx.objectStore("archivos"));
    tx.oncomplete = () => resolver(peticion?.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

async function guardarArchivo(archivo) {
  const ext = archivo.name.split(".").pop().toLowerCase();
  const assets = window.claude?.use ? await window.claude.use("assets") : null;
  if (assets && TIPOS_ASSETS[ext]) {
    try {
      const { id } = await assets.upload(archivo, { type: TIPOS_ASSETS[ext] });
      return { tipo: "asset", id, mime: TIPOS_ASSETS[ext] };
    } catch {}
  }
  try {
    const id = nuevoId();
    await idb("readwrite", (s) => s.put(archivo, id));
    return { tipo: "local", id, mime: archivo.type };
  } catch {
    return null;
  }
}

async function urlArchivo(archivo) {
  if (!archivo) return null;
  if (archivo.tipo === "asset") return `/_blob/${archivo.id}`;
  try {
    const blob = await idb("readonly", (s) => s.get(archivo.id));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

async function borrarArchivo(archivo) {
  if (!archivo) return;
  try {
    if (archivo.tipo === "asset") await (await window.claude?.use?.("assets"))?.delete(archivo.id);
    else await idb("readwrite", (s) => s.delete(archivo.id));
  } catch {}
}

/* ───────────────────────── Chat (búsqueda simulada sobre tus documentos) ───────────────────────── */

const PARADAS = new Set("cual cuales cuando cuanto cuanta donde que quien como tengo tiene tienes mis del los las una uno sobre para por con esta este estan son hay esto eso".split(" "));
const terminos = (q) =>
  normalizar(q)
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length >= 3 && !PARADAS.has(t));
const textoDoc = (d) => normalizar([d.nombre, d.descripcion, CAT[d.carpeta]?.nombre, ...d.datos.flat()].join(" "));
const puntuar = (texto, ts) => ts.reduce((s, t) => s + (texto.includes(t) || (t.endsWith("s") && texto.includes(t.slice(0, -1))) ? 1 : 0), 0);
const sinExt = (n) => n.replace(/\.[a-z0-9]{2,5}$/i, "");
const vigente = (d, hoy) => !d.vence || d.vence >= hoy;

function vinetasDoc(d) {
  const v = d.datos.map(([k, val]) => `**${k}:** ${val}`);
  if (d.vence) v.splice(Math.min(1, v.length), 0, `**Vigencia:** hasta el ${corta(d.vence)}`);
  return v;
}

function respuestaVencimiento(d, hoy) {
  const fuentes = [{ doc: d.id, pagina: d.paginaVence ?? null }];
  if (!d.vence) {
    return {
      texto: `No tengo la fecha de vencimiento de «${d.nombre}». Puedes añadirla editando el documento.`,
      fuentes,
      vinetas: vinetasDoc(d),
      sugerencia: { tipo: "editar", doc: d.id, texto: "Añade la fecha de vencimiento y podré avisarte." },
    };
  }
  const quien = d.descripcion ? `Tu ${d.descripcion.charAt(0).toLowerCase()}${d.descripcion.slice(1)}` : `«${d.nombre}»`;
  const texto = `${quien} ${d.vence >= hoy ? "vence" : "venció"} el **${larga(d.vence)}**. Este dato está en el documento «${d.nombre}»${d.paginaVence ? ` (página ${d.paginaVence})` : ""}.`;
  let sugerencia;
  if (d.vence < hoy) {
    sugerencia = { tipo: "editar", doc: d.id, texto: "Esa fecha ya pasó. Si renovaste, actualiza el vencimiento del documento y podré avisarte de la próxima renovación." };
  } else {
    const unMesAntes = sumarMeses(d.vence, -1);
    const fecha = unMesAntes > hoy ? unMesAntes : d.vence;
    sugerencia = {
      tipo: "recordatorio",
      texto: unMesAntes > hoy ? "¿Te gustaría que te avise 1 mes antes de la renovación?" : "¿Te gustaría que te avise el día del vencimiento?",
      recordatorio: { id: `r-${d.id}-${d.vence}`, titulo: `Renovación: ${d.descripcion || sinExt(d.nombre)}`, fecha, doc: d.id },
    };
  }
  return { texto, fuentes, vinetas: vinetasDoc(d), sugerencia };
}

function responder(pregunta, { documentos, notas }, hoy) {
  const q = normalizar(pregunta);
  const contratos = documentos.filter((d) => d.carpeta === "contratos");
  const sinContratos = { texto: "No tienes contratos guardados todavía. Súbelos con el clip 📎 a la carpeta Contratos." };

  if (/venc|caduc|expir|renov/.test(q)) {
    const ts = terminos(q).filter((t) => !/^(venc|caduc|expir|renov)/.test(t));
    const mejor = documentos.map((d) => ({ d, p: puntuar(textoDoc(d), ts) })).sort((a, b) => b.p - a.p)[0];
    if (mejor?.p > 0) return respuestaVencimiento(mejor.d, hoy);
    const proximos = documentos.filter((d) => d.vence && d.vence >= hoy).sort((a, b) => a.vence.localeCompare(b.vence));
    if (!proximos.length) return { texto: "No encontré ese documento entre los tuyos." };
    return {
      texto: "No encontré ese documento. Estos son tus próximos vencimientos:",
      vinetas: proximos.slice(0, 5).map((d) => `**${corta(d.vence)}** · ${d.nombre}`),
      fuentes: proximos.slice(0, 2).map((d) => ({ doc: d.id })),
    };
  }

  if (/contrato/.test(q) && /vigente|activo|tengo/.test(q)) {
    const vigentes = contratos.filter((d) => vigente(d, hoy));
    if (!contratos.length) return sinContratos;
    if (!vigentes.length) return { texto: `Ninguno de tus ${contratos.length} contratos está vigente.` };
    return {
      texto: `Tienes **${vigentes.length} ${vigentes.length === 1 ? "contrato vigente" : "contratos vigentes"}**:`,
      vinetas: vigentes.map((d) => `**${sinExt(d.nombre)}**: ${d.vence ? `hasta el ${corta(d.vence)}` : "sin fecha de fin"}`),
      fuentes: vigentes.slice(0, 3).map((d) => ({ doc: d.id })),
    };
  }

  if (/impuesto|\bsat\b|\bisr\b|\biva\b|declaraci|hacienda|tribut/.test(q)) {
    const docs = documentos.filter((d) => d.carpeta === "impuestos");
    if (!docs.length) return { texto: "Aún no tienes documentos en Impuestos. Súbelos con el clip 📎 y te diré lo que aparece en ellos." };
    const importes = docs.flatMap((d) => d.datos.filter(([k]) => /pag|import|total|isr|cargo|cuota/i.test(normalizar(k))).map(([, v]) => v));
    const numeros = importes.map((v) => Number(String(v).replace(/[^\d.]/g, ""))).filter((n) => n > 0);
    const simbolo =
      importes
        .map(
          (v) =>
            String(v)
              .trim()
              .match(/^[$€£]/)?.[0],
        )
        .find(Boolean) ?? "";
    return {
      texto: numeros.length
        ? `Según tus documentos de Impuestos, has pagado **${simbolo}${new Intl.NumberFormat("es-MX").format(numeros.reduce((s, n) => s + n, 0))}** en total.`
        : "Estos son tus documentos de Impuestos. Añade a cada uno el importe pagado y te diré el total:",
      vinetas: docs.flatMap((d) => [`**${sinExt(d.nombre)}**`, ...d.datos.map(([k, v]) => `${k}: ${v}`)]),
      fuentes: docs.slice(0, 3).map((d) => ({ doc: d.id })),
    };
  }

  if (/contrato actual|mi contrato|resumen.*contrato/.test(q)) {
    const actual = contratos.filter((d) => vigente(d, hoy)).sort((a, b) => b.subido.localeCompare(a.subido))[0];
    if (!actual) return contratos.length ? { texto: "No tienes ningún contrato vigente." } : sinContratos;
    return {
      texto: `Tu contrato actual es **${sinExt(actual.nombre)}**.${actual.descripcion ? ` ${actual.descripcion}.` : ""}`,
      vinetas: vinetasDoc(actual),
      fuentes: [{ doc: actual.id, pagina: actual.paginaVence ?? null }],
    };
  }

  const ts = terminos(q);
  const docs = documentos
    .map((d) => ({ d, p: puntuar(textoDoc(d), ts) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);
  const ns = notas
    .map((n) => ({ n, p: puntuar(normalizar(`${n.titulo} ${n.texto}`), ts) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);
  if (!docs.length && !ns.length) return { texto: "No encontré nada sobre eso en tus documentos ni en tus notas." };
  return {
    texto: "Encontré esto en tus documentos:",
    vinetas: [
      ...docs.slice(0, 4).map(({ d }) => `**${sinExt(d.nombre)}** (${CAT[d.carpeta].nombre})${d.descripcion ? `: ${d.descripcion}` : ""}`),
      ...ns.slice(0, 3).map(({ n }) => `**Nota «${n.titulo}»**: ${n.texto}`),
    ],
    fuentes: docs.slice(0, 3).map(({ d }) => ({ doc: d.id })),
  };
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
const campo =
  "w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[15px] ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10";
const etiqueta = "mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400";
const botonPrincipal = `rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`;

function Tarjeta({ className = "", children }) {
  return <section className={`rounded-2xl bg-white ring-1 ring-zinc-900/[0.06] dark:bg-[#18171f] dark:ring-white/10 ${className}`}>{children}</section>;
}

function Rico({ texto }) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith("**") ? (
      <strong key={i} className="font-semibold text-zinc-950 dark:text-white">
        {t.slice(2, -2)}
      </strong>
    ) : (
      t
    ),
  );
}

function Interruptor({ activo, onClick, etiqueta: aria }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={aria}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${foco} ${activo ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-5" : ""}`} />
    </button>
  );
}

function BotonBorrar({ onClick, etiqueta: aria }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 ${foco}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function Hoja({ abierta, onCerrar, titulo, icono: Icono, children }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg motion-safe:animate-sheet sm:max-w-lg sm:rounded-3xl sm:pb-6 dark:bg-[#1c1b24] dark:ring-1 dark:ring-white/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight">
            {Icono && <Icono className="size-5 shrink-0 text-violet-600 dark:text-violet-400" />}
            <span className="truncate">{titulo}</span>
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid size-9 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 ${foco}`}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconoDoc({ nombre }) {
  const ext = (nombre.split(".").pop() || "").slice(0, 4).toUpperCase();
  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
      <FileText className="size-5" />
      {nombre.includes(".") && <span className="absolute -bottom-1 rounded bg-red-600 px-1 text-[8px] leading-3 font-extrabold text-white">{ext}</span>}
    </span>
  );
}

function MiniDoc({ doc, pagina, onAbrir }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-zinc-200 dark:bg-white/5 dark:ring-white/10">
      <IconoDoc nombre={doc.nombre} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{doc.nombre}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {CAT[doc.carpeta].nombre}
          {pagina ? ` · página ${pagina}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onAbrir}
        className={`shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 ${foco}`}
      >
        Abrir
      </button>
    </div>
  );
}

function estadoDoc(d, hoy) {
  if (!d.vence) return null;
  const dias = diasEntre(hoy, d.vence);
  if (dias < 0) return { texto: "Vencido", clase: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300" };
  if (dias <= 60) return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, clase: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" };
  return { texto: "Vigente", clase: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" };
}

function FilaDoc({ doc, hoy, onClick }) {
  const e = estadoDoc(doc, hoy);
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 ${foco}`}>
      <IconoDoc nombre={doc.nombre} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{doc.nombre}</span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {CAT[doc.carpeta].nombre}
          {doc.vence ? ` · vence el ${corta(doc.vence)}` : ""}
        </span>
      </span>
      {e && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${e.clase}`}>{e.texto}</span>}
    </button>
  );
}

/* ───────────────────────── App ───────────────────────── */

export default function SegundoCerebro() {
  const [datos, setDatos] = useGuardado("segundo-cerebro", estadoInicial);
  const [pantalla, setPantalla] = useState("cerebro"); // "inicio" | "cerebro"
  const [vista, setVista] = useState("chat");
  const [filtroCat, setFiltroCat] = useState(null);
  const [escribiendo, setEscribiendo] = useState(false);
  const [hoja, setHoja] = useState(null); // "buscar" | "recordatorio" | "nota-nueva" | {doc} | {editar} | {nota} | {subir: File}
  const [toast, setToast] = useState(null);
  const toastRef = useRef();
  const archivoRef = useRef();
  const datosRef = useRef(datos);
  datosRef.current = datos;
  const hoy = hoyISO();
  const { documentos, notas, recordatorios, chat } = datos;

  const avisar = useCallback((texto) => {
    clearTimeout(toastRef.current);
    setToast(texto);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);
  const cambiar = (lista, fn) => setDatos((d) => ({ ...d, [lista]: fn(d[lista]) }));

  const cuentas = {
    contratos: documentos.filter((d) => d.carpeta === "contratos").length,
    seguros: documentos.filter((d) => d.carpeta === "seguros").length,
    impuestos: documentos.filter((d) => d.carpeta === "impuestos").length,
    notas: notas.length + documentos.filter((d) => d.carpeta === "notas").length,
  };

  const irA = (v) => {
    setPantalla("cerebro");
    setVista(v);
  };

  const preguntar = (pregunta) => {
    const p = pregunta.trim();
    if (!p || escribiendo) return;
    irA("chat");
    cambiar("chat", (c) => [...c, { id: nuevoId(), de: "yo", texto: p }].slice(-40));
    setEscribiendo(true);
    setTimeout(() => {
      cambiar("chat", (c) => [...c, { id: nuevoId(), de: "ia", ...responder(p, datosRef.current, hoyISO()) }].slice(-40));
      setEscribiendo(false);
    }, 700);
  };

  const acciones = {
    activarRecordatorio: (r) => {
      cambiar("recordatorios", (rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? { ...x, activo: true } : x)) : [...rs, { ...r, activo: true }]));
      avisar(`Te avisaré el ${corta(r.fecha)}`);
    },
    guardarDoc: (doc) => {
      cambiar("documentos", (ds) => (ds.some((d) => d.id === doc.id) ? ds.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...ds]));
      setHoja({ doc: doc.id });
      avisar("Documento guardado");
    },
    borrarDoc: (doc) => {
      borrarArchivo(doc.archivo);
      cambiar("documentos", (ds) => ds.filter((d) => d.id !== doc.id));
      cerrarHoja();
      avisar("Documento eliminado");
    },
    guardarNota: (nota) => {
      cambiar("notas", (ns) => (ns.some((n) => n.id === nota.id) ? ns.map((n) => (n.id === nota.id ? nota : n)) : [nota, ...ns]));
      cerrarHoja();
      avisar("Nota guardada");
    },
    borrarNota: (id) => {
      cambiar("notas", (ns) => ns.filter((n) => n.id !== id));
      cerrarHoja();
    },
    nuevoRecordatorio: (r) => {
      cambiar("recordatorios", (rs) => [...rs, { ...r, id: nuevoId(), activo: true }]);
      cerrarHoja();
      avisar(`Te avisaré el ${corta(r.fecha)}`);
    },
    alternarRecordatorio: (id) => cambiar("recordatorios", (rs) => rs.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r))),
    borrarRecordatorio: (id) => cambiar("recordatorios", (rs) => rs.filter((r) => r.id !== id)),
  };

  const elegirCategoria = (id) => {
    if (id === "notas") {
      setFiltroCat(null);
      irA("notas");
    } else {
      setFiltroCat((f) => (f === id && pantalla === "cerebro" && vista === "documentos" ? null : id));
      irA("documentos");
    }
  };

  const tabInferior = pantalla === "inicio" ? "inicio" : vista === "documentos" ? "documentos" : vista === "recordatorios" ? "recordatorios" : "cerebro";
  const docAbierto = hoja?.doc ? documentos.find((d) => d.id === hoja.doc) : null;
  const docEditar = hoja?.editar ? documentos.find((d) => d.id === hoja.editar) : null;
  const notaAbierta = hoja?.nota ? notas.find((n) => n.id === hoja.nota) : null;
  const abrirDoc = (id) => setHoja({ doc: id });

  return (
    <div className="min-h-screen font-sans">
      <header className="mx-auto flex max-w-3xl items-center gap-3 gutter pt-4 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/25">
          <Brain className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[17px] leading-tight font-extrabold tracking-tight">Segundo Cerebro</h1>
          <p className="text-xs leading-tight text-zinc-500 dark:text-zinc-400">Toda tu información, siempre disponible</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setHoja("buscar")}
            aria-label="Buscar"
            className={`grid size-10 place-items-center rounded-full text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-white/10 ${foco}`}
          >
            <Search className="size-5" />
          </button>
          <span className="ml-1 grid size-10 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900" aria-label="Diego">
            D
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {pantalla === "inicio" ? (
          <Inicio documentos={documentos} recordatorios={recordatorios} cuentas={cuentas} hoy={hoy} abrirDoc={abrirDoc} irA={irA} elegirCategoria={elegirCategoria} />
        ) : (
          <>
            <div role="tablist" aria-label="Vista" className="flex gap-1 rounded-2xl bg-zinc-200/60 p-1 dark:bg-white/[0.06]">
              {VISTAS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={vista === v.id}
                  onClick={() => setVista(v.id)}
                  className={`flex-auto rounded-xl px-2 py-2 text-[13px] font-semibold whitespace-nowrap transition sm:text-sm ${foco} ${vista === v.id ? "bg-white text-violet-700 shadow-sm dark:bg-[#26242f] dark:text-violet-300" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"}`}
                >
                  {v.nombre}
                </button>
              ))}
            </div>

            <TarjetasCategoria cuentas={cuentas} activa={vista === "documentos" ? filtroCat : vista === "notas" ? "notas" : null} onElegir={elegirCategoria} />

            <div className="mt-4">
              {vista === "chat" && (
                <VistaChat
                  chat={chat}
                  escribiendo={escribiendo}
                  documentos={documentos}
                  recordatorios={recordatorios}
                  preguntar={preguntar}
                  abrirDoc={abrirDoc}
                  editarDoc={(id) => setHoja({ editar: id })}
                  activarRecordatorio={acciones.activarRecordatorio}
                  onClip={() => archivoRef.current?.click()}
                />
              )}
              {vista === "documentos" && (
                <VistaDocumentos documentos={documentos} hoy={hoy} filtroCat={filtroCat} setFiltroCat={setFiltroCat} abrirDoc={abrirDoc} onSubir={() => archivoRef.current?.click()} />
              )}
              {vista === "notas" && (
                <VistaNotas
                  notas={notas}
                  archivos={documentos.filter((d) => d.carpeta === "notas")}
                  hoy={hoy}
                  abrirNota={(id) => setHoja({ nota: id })}
                  abrirDoc={abrirDoc}
                  onNueva={() => setHoja("nota-nueva")}
                />
              )}
              {vista === "recordatorios" && (
                <VistaRecordatorios recordatorios={recordatorios} documentos={documentos} hoy={hoy} acciones={acciones} abrirDoc={abrirDoc} onNuevo={() => setHoja("recordatorio")} />
              )}
            </div>
          </>
        )}
      </main>

      <input
        ref={archivoRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setHoja({ subir: f });
          e.target.value = "";
        }}
      />

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/90 pb-safe backdrop-blur-xl gutter dark:border-white/10 dark:bg-[#0f0e14]/90"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {[
            ["inicio", "Inicio", House, () => setPantalla("inicio")],
            ["cerebro", "Segundo Cerebro", Brain, () => irA(vista === "notas" ? "notas" : "chat")],
            ["documentos", "Documentos", FolderOpen, () => irA("documentos")],
            ["recordatorios", "Recordatorios", Bell, () => irA("recordatorios")],
          ].map(([id, nombre, I, accion]) => {
            const activo = tabInferior === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={accion}
                  aria-current={activo ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 font-semibold ${foco} ${activo ? "text-violet-700 dark:text-violet-300" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${activo ? "bg-violet-100 dark:bg-violet-500/15" : ""}`}>
                    <I className="size-5" strokeWidth={activo ? 2.4 : 2} />
                  </span>
                  <span className="text-[10.5px] tracking-tight whitespace-nowrap">{nombre}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-[max(16px,env(safe-area-inset-top))] z-50 flex justify-center gutter">
          <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg motion-safe:animate-pop dark:bg-white dark:text-zinc-900">
            <Check className="size-4" /> {toast}
          </div>
        </div>
      )}

      {docAbierto && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={docAbierto.nombre} icono={FileText}>
          <DetalleDoc doc={docAbierto} hoy={hoy} onEditar={() => setHoja({ editar: docAbierto.id })} onBorrar={() => acciones.borrarDoc(docAbierto)} />
        </Hoja>
      )}

      {docEditar && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Editar documento" icono={Pencil}>
          <FormDoc doc={docEditar} onGuardar={acciones.guardarDoc} />
        </Hoja>
      )}

      {hoja?.subir && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Subir documento" icono={Upload}>
          <FormSubir
            archivo={hoja.subir}
            onGuardar={(doc) => {
              acciones.guardarDoc(doc);
              avisar(`Guardado en ${CAT[doc.carpeta].nombre}`);
            }}
          />
        </Hoja>
      )}

      <Hoja abierta={hoja === "nota-nueva" || !!notaAbierta} onCerrar={cerrarHoja} titulo={notaAbierta ? "Nota" : "Nueva nota"} icono={StickyNote}>
        <FormNota key={notaAbierta?.id ?? "nueva"} nota={notaAbierta} hoy={hoy} onGuardar={acciones.guardarNota} onBorrar={notaAbierta ? () => acciones.borrarNota(notaAbierta.id) : null} />
      </Hoja>

      <Hoja abierta={hoja === "buscar"} onCerrar={cerrarHoja} titulo="Buscar" icono={Search}>
        <Buscador documentos={documentos} notas={notas} hoy={hoy} abrirDoc={abrirDoc} abrirNota={(id) => setHoja({ nota: id })} />
      </Hoja>

      <Hoja abierta={hoja === "recordatorio"} onCerrar={cerrarHoja} titulo="Nuevo recordatorio" icono={BellRing}>
        <FormRecordatorio documentos={documentos} hoy={hoy} onGuardar={acciones.nuevoRecordatorio} />
      </Hoja>
    </div>
  );
}

/* ───────────────────────── Categorías e inicio ───────────────────────── */

function TarjetasCategoria({ cuentas, activa, onElegir }) {
  return (
    <div className="no-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
      {CATEGORIAS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onElegir(c.id)}
          aria-pressed={activa === c.id}
          className={`flex w-[138px] shrink-0 items-center gap-2.5 rounded-2xl bg-white p-3 text-left ring-1 transition hover:ring-zinc-300 sm:w-auto dark:bg-[#18171f] dark:hover:ring-white/20 ${foco} ${activa === c.id ? `ring-2 ${c.anillo}` : "ring-zinc-900/[0.06] dark:ring-white/10"}`}
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.color}`}>
            <c.icono className="size-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{c.nombre}</span>
            <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {cuentas[c.id]} {c.id === "notas" ? (cuentas[c.id] === 1 ? "nota" : "notas") : cuentas[c.id] === 1 ? "doc" : "docs"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Inicio({ documentos, recordatorios, cuentas, hoy, abrirDoc, irA, elegirCategoria }) {
  const proximos = documentos.filter((d) => d.vence && d.vence >= hoy).sort((a, b) => a.vence.localeCompare(b.vence));
  const avisos = recordatorios.filter((r) => r.activo && r.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <div className="grid grid-cols-1 gap-4">
      <button
        type="button"
        onClick={() => irA("chat")}
        className={`flex items-center gap-3 rounded-2xl bg-violet-600 p-4 text-left text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 ${foco}`}
      >
        <MessageSquare className="size-6 shrink-0" />
        <span className="min-w-0 flex-1 font-bold">Pregúntale a tu Segundo Cerebro</span>
        <ChevronRight className="size-5" />
      </button>
      <TarjetasCategoria cuentas={cuentas} activa={null} onElegir={elegirCategoria} />
      <Tarjeta className="p-4">
        <h2 className="text-sm font-bold">Próximos vencimientos</h2>
        {proximos.length ? (
          <ul className="mt-2">
            {proximos.slice(0, 5).map((d) => (
              <li key={d.id}>
                <FilaDoc doc={d} hoy={hoy} onClick={() => abrirDoc(d.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No tienes documentos con vencimientos próximos.</p>
        )}
      </Tarjeta>
      <Tarjeta className="p-4">
        <h2 className="text-sm font-bold">Recordatorios</h2>
        {avisos.length ? (
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
            {avisos.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-semibold">{r.titulo}</span>
                <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{corta(r.fecha)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No tienes recordatorios activos.</p>
        )}
      </Tarjeta>
    </div>
  );
}

/* ───────────────────────── Chat ───────────────────────── */

function MensajeIA({ m, documentos, recordatorios, abrirDoc, editarDoc, activarRecordatorio }) {
  const s = m.sugerencia;
  const activado = s?.tipo === "recordatorio" && recordatorios.some((r) => r.id === s.recordatorio.id && r.activo);
  return (
    <div className="flex gap-2.5 motion-safe:animate-pop">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
        <Brain className="size-4" />
      </span>
      <Tarjeta className="min-w-0 flex-1 p-4 shadow-sm">
        <p className="font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          <Rico texto={m.texto} />
        </p>
        {m.fuentes?.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            {m.fuentes.map((f) => {
              const d = documentos.find((x) => x.id === f.doc);
              return d ? <MiniDoc key={f.doc} doc={d} pagina={f.pagina} onAbrir={() => abrirDoc(d.id)} /> : null;
            })}
          </div>
        )}
        {m.vinetas?.length > 0 && (
          <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            {m.vinetas.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-violet-500" />
                <span className="min-w-0">
                  <Rico texto={v} />
                </span>
              </li>
            ))}
          </ul>
        )}
        {s && (
          <div className="mt-4 rounded-xl bg-violet-50 p-3.5 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-500/20">
            <p className="text-sm font-medium text-violet-950 dark:text-violet-100">💡 {s.texto}</p>
            {s.tipo === "recordatorio" ? (
              <button
                type="button"
                disabled={activado}
                onClick={() => activarRecordatorio(s.recordatorio)}
                className={`mt-2.5 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${foco} ${activado ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
              >
                {activado ? (
                  <>
                    <Check className="size-4" /> Recordatorio activado · {corta(s.recordatorio.fecha)}
                  </>
                ) : (
                  "🔔 Activar recordatorio"
                )}
              </button>
            ) : (
              documentos.some((d) => d.id === s.doc) && (
                <button
                  type="button"
                  onClick={() => editarDoc(s.doc)}
                  className={`mt-2.5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}
                >
                  <Pencil className="size-4" /> Editar documento
                </button>
              )
            )}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

function VistaChat({ chat, escribiendo, documentos, recordatorios, preguntar, abrirDoc, editarDoc, activarRecordatorio, onClip }) {
  const [texto, setTexto] = useState("");
  const finRef = useRef();
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length, escribiendo]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4" aria-live="polite">
        {chat.map((m) =>
          m.de === "yo" ? (
            <p key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-[15px] font-medium text-white shadow-sm motion-safe:animate-pop">
              {m.texto}
            </p>
          ) : (
            <MensajeIA key={m.id} m={m} documentos={documentos} recordatorios={recordatorios} abrirDoc={abrirDoc} editarDoc={editarDoc} activarRecordatorio={activarRecordatorio} />
          ),
        )}
        {escribiendo && (
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
              <Brain className="size-4" />
            </span>
            <span className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-zinc-500 ring-1 ring-zinc-900/[0.06] dark:bg-[#18171f] dark:text-zinc-400 dark:ring-white/10">
              <Sparkles className="size-4 text-violet-500 motion-safe:animate-pulse" /> Buscando en tus documentos…
            </span>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom,0px))] mt-5 -mx-1 bg-[var(--page)] px-1 pt-2 pb-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => preguntar(s)}
              disabled={escribiendo}
              className={`shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50 dark:bg-[#18171f] dark:text-violet-300 dark:ring-violet-500/30 dark:hover:bg-violet-500/10 ${foco}`}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            preguntar(texto);
            setTexto("");
          }}
          className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-zinc-900/10 focus-within:ring-2 focus-within:ring-violet-500 dark:bg-[#18171f] dark:ring-white/10"
        >
          <button
            type="button"
            onClick={onClip}
            aria-label="Subir un documento"
            className={`grid size-10 shrink-0 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-violet-700 dark:text-zinc-400 dark:hover:bg-white/10 ${foco}`}
          >
            <Paperclip className="size-5" />
          </button>
          <label htmlFor="pregunta" className="sr-only">
            Pregúntale a tu Segundo Cerebro
          </label>
          <input
            id="pregunta"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pregunta sobre tus documentos…"
            className="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[15px] outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!texto.trim() || escribiendo}
            aria-label="Enviar"
            className={`grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ───────────────────────── Documentos, notas y recordatorios ───────────────────────── */

function VistaDocumentos({ documentos, hoy, filtroCat, setFiltroCat, abrirDoc, onSubir }) {
  const [q, setQ] = useState("");
  const nq = normalizar(q.trim());
  const filtrados = documentos.filter((d) => (!filtroCat || d.carpeta === filtroCat) && (!nq || textoDoc(d).includes(nq)));
  return (
    <Tarjeta className="p-3 sm:p-4">
      <div className="flex gap-2 p-1">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <label htmlFor="buscar-docs" className="sr-only">
            Filtrar documentos
          </label>
          <input id="buscar-docs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por nombre" className={`${campo} pl-9`} />
        </div>
        <button type="button" onClick={onSubir} className={`flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}>
          <Upload className="size-4" /> Subir
        </button>
      </div>
      {filtroCat && (
        <p className="flex items-center gap-2 px-2 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Mostrando {CAT[filtroCat].nombre.toLowerCase()}
          <button
            type="button"
            onClick={() => setFiltroCat(null)}
            className={`rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 ${foco}`}
          >
            Ver todos ×
          </button>
        </p>
      )}
      <ul className="mt-1">
        {filtrados.map((d) => (
          <li key={d.id}>
            <FilaDoc doc={d} hoy={hoy} onClick={() => abrirDoc(d.id)} />
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && (
        <p className="px-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {documentos.length ? "No hay documentos con ese filtro." : "Aún no tienes documentos. Súbelos con el botón Subir."}
        </p>
      )}
    </Tarjeta>
  );
}

function VistaNotas({ notas, archivos, hoy, abrirNota, abrirDoc, onNueva }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          {notas.length} {notas.length === 1 ? "nota" : "notas"}
        </p>
        <button type="button" onClick={onNueva} className={`flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" /> Nueva nota
        </button>
      </div>
      <ul className="mt-3 columns-1 gap-3 sm:columns-2">
        {notas.map((n) => (
          <li key={n.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => abrirNota(n.id)}
              className={`w-full rounded-2xl bg-white p-4 text-left ring-1 ring-zinc-900/[0.06] hover:ring-violet-300 dark:bg-[#18171f] dark:ring-white/10 dark:hover:ring-violet-500/40 ${foco}`}
            >
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{corta(n.fecha)}</span>
              <span className="mt-1 block font-bold">{n.titulo}</span>
              {n.texto && <span className="mt-1 block font-serif text-[15px] leading-snug whitespace-pre-line text-zinc-600 dark:text-zinc-400">{n.texto}</span>}
            </button>
          </li>
        ))}
      </ul>
      {notas.length === 0 && <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">Aún no tienes notas.</p>}
      {archivos.length > 0 && (
        <Tarjeta className="mt-2 p-3">
          <h2 className="px-2 pt-1 text-xs font-bold tracking-wider text-zinc-400 uppercase">Archivos en Notas e ideas</h2>
          <ul className="mt-1">
            {archivos.map((d) => (
              <li key={d.id}>
                <FilaDoc doc={d} hoy={hoy} onClick={() => abrirDoc(d.id)} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

function VistaRecordatorios({ recordatorios, documentos, hoy, acciones, abrirDoc, onNuevo }) {
  const ordenados = [...recordatorios].sort((a, b) => a.fecha.localeCompare(b.fecha));
  return (
    <Tarjeta className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3 px-1 pb-2">
        <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{recordatorios.filter((r) => r.activo).length} activos</p>
        <button type="button" onClick={onNuevo} className={`flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" /> Nuevo
        </button>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-white/5">
        {ordenados.map((r) => {
          const dias = diasEntre(hoy, r.fecha);
          const doc = documentos.find((x) => x.id === r.doc);
          return (
            <li key={r.id} className={`flex items-center gap-3 px-1 py-3 ${r.activo ? "" : "opacity-55"}`}>
              <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-zinc-50 py-1.5 text-center dark:bg-white/5">
                <span className="text-[10px] font-bold text-violet-600 uppercase dark:text-violet-400">
                  {new Intl.DateTimeFormat("es-MX", { month: "short" }).format(deISO(r.fecha)).replace(".", "")}
                </span>
                <span className="text-lg leading-none font-extrabold tabular-nums">{deISO(r.fecha).getDate()}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.titulo}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{dias < 0 ? "Ya pasó" : dias === 0 ? "Hoy" : `En ${dias} ${dias === 1 ? "día" : "días"}`}</p>
                {doc && (
                  <button
                    type="button"
                    onClick={() => abrirDoc(doc.id)}
                    className={`block max-w-full truncate text-left text-xs font-semibold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300 ${foco}`}
                  >
                    {doc.nombre}
                  </button>
                )}
              </div>
              <Interruptor activo={r.activo} onClick={() => acciones.alternarRecordatorio(r.id)} etiqueta={`Avisar: ${r.titulo}`} />
              <BotonBorrar onClick={() => acciones.borrarRecordatorio(r.id)} etiqueta={`Eliminar «${r.titulo}»`} />
            </li>
          );
        })}
      </ul>
      {ordenados.length === 0 && <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No tienes recordatorios.</p>}
    </Tarjeta>
  );
}

/* ───────────────────────── Hojas ───────────────────────── */

function DetalleDoc({ doc, hoy, onEditar, onBorrar }) {
  const [url, setUrl] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const e = estadoDoc(doc, hoy);
  useEffect(() => {
    let vivo = true;
    let creada = null;
    urlArchivo(doc.archivo).then((u) => {
      if (u?.startsWith("blob:")) creada = u;
      if (vivo) setUrl(u);
    });
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [doc.archivo]);
  const imagen = doc.archivo?.mime?.startsWith("image/");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {e && <span className={`rounded-full px-2 py-0.5 font-bold ${e.clase}`}>{e.texto}</span>}
        <span>
          {CAT[doc.carpeta].nombre} · subido el {corta(doc.subido)}
        </span>
      </div>
      {doc.descripcion && <p className="mt-3 text-[15px] text-zinc-700 dark:text-zinc-300">{doc.descripcion}</p>}
      <dl className="mt-3 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200 dark:divide-white/5 dark:ring-white/10">
        {doc.vence && (
          <div className="flex justify-between gap-4 px-3 py-2 text-sm">
            <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">Vencimiento</dt>
            <dd className="min-w-0 text-right font-semibold">
              {larga(doc.vence)}
              {doc.paginaVence ? ` (página ${doc.paginaVence})` : ""}
            </dd>
          </div>
        )}
        {doc.datos.map(([k, v], i) => (
          <div key={i} className="flex justify-between gap-4 px-3 py-2 text-sm">
            <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{k}</dt>
            <dd className="min-w-0 text-right font-semibold break-words">{v}</dd>
          </div>
        ))}
        {!doc.vence && !doc.datos.length && (
          <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">Sin datos. Edita el documento para añadir su vencimiento y sus datos clave, y el chat podrá responder sobre él.</p>
        )}
      </dl>
      <div className="mt-4">
        {!doc.archivo && <p className="text-sm text-zinc-500 dark:text-zinc-400">Este documento no tiene archivo adjunto.</p>}
        {doc.archivo && !url && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{doc.archivo.tipo === "local" ? "El archivo está guardado en otro navegador o se ha borrado." : "Cargando el archivo…"}</p>
        )}
        {url && imagen && <img src={url} alt={doc.nombre} className="max-h-80 w-full rounded-xl object-contain ring-1 ring-zinc-200 dark:ring-white/10" />}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-bold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 ${foco}`}
          >
            <FileText className="size-4" /> Ver archivo
          </a>
        )}
        {doc.archivo?.tipo === "local" && <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Este archivo solo está guardado en este navegador.</p>}
      </div>
      {confirmar ? (
        <div className="mt-4 rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">Se eliminará el documento y su archivo. ¿Seguro?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onBorrar} className={`rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 ${foco}`}>
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setConfirmar(false)}
              className={`rounded-lg bg-white px-3 py-2 text-sm font-bold text-zinc-700 ring-1 ring-zinc-200 dark:bg-transparent dark:text-zinc-200 dark:ring-white/10 ${foco}`}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onEditar} className={`flex flex-1 items-center justify-center gap-2 ${botonPrincipal}`}>
            <Pencil className="size-4" /> Editar
          </button>
          <button
            type="button"
            onClick={() => setConfirmar(true)}
            className={`rounded-xl px-4 text-sm font-bold text-zinc-500 ring-1 ring-zinc-200 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-red-500/10 ${foco}`}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function CamposDoc({ f, setF }) {
  const cambiarDato = (i, j, v) => setF({ ...f, datos: f.datos.map((d, k) => (k === i ? (j === 0 ? [v, d[1]] : [d[0], v]) : d)) });
  return (
    <>
      <div>
        <label htmlFor="doc-nombre" className={etiqueta}>
          Nombre
        </label>
        <input id="doc-nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={campo} />
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Carpeta</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={f.carpeta === c.id}
              onClick={() => setF({ ...f, carpeta: c.id })}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-sm font-semibold ring-1 ${foco} ${f.carpeta === c.id ? `bg-white ring-2 dark:bg-white/5 ${c.anillo}` : "ring-zinc-200 dark:ring-white/10"}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${c.color}`}>
                <c.icono className="size-4" />
              </span>
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="doc-desc" className={etiqueta}>
          Qué es (opcional, por ejemplo «Seguro de auto»)
        </label>
        <input id="doc-desc" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className={campo} />
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div>
          <label htmlFor="doc-vence" className={etiqueta}>
            Vencimiento (opcional)
          </label>
          <input id="doc-vence" type="date" value={f.vence} onChange={(e) => setF({ ...f, vence: e.target.value })} className={campo} />
        </div>
        <div>
          <label htmlFor="doc-pagina" className={etiqueta}>
            Página
          </label>
          <input id="doc-pagina" inputMode="numeric" value={f.paginaVence} onChange={(e) => setF({ ...f, paginaVence: e.target.value.replace(/\D/g, "") })} className={campo} />
        </div>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Datos clave (opcional)</legend>
        <div className="grid grid-cols-1 gap-2">
          {f.datos.map(([k, v], i) => (
            <div key={i} className="flex items-center gap-2">
              <label htmlFor={`dato-k-${i}`} className="sr-only">
                Dato
              </label>
              <input id={`dato-k-${i}`} value={k} onChange={(e) => cambiarDato(i, 0, e.target.value)} placeholder="Dato" className={`${campo} flex-1`} />
              <label htmlFor={`dato-v-${i}`} className="sr-only">
                Valor
              </label>
              <input id={`dato-v-${i}`} value={v} onChange={(e) => cambiarDato(i, 1, e.target.value)} placeholder="Valor" className={`${campo} flex-1`} />
              <BotonBorrar onClick={() => setF({ ...f, datos: f.datos.filter((_, j) => j !== i) })} etiqueta="Quitar dato" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setF({ ...f, datos: [...f.datos, ["", ""]] })}
            className={`flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-zinc-200 py-2 text-sm font-semibold text-zinc-500 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:text-zinc-400 ${foco}`}
          >
            <Plus className="size-4" /> Añadir dato
          </button>
        </div>
      </fieldset>
    </>
  );
}

const aFormulario = (doc) => ({
  nombre: doc.nombre,
  carpeta: doc.carpeta,
  descripcion: doc.descripcion ?? "",
  vence: doc.vence ?? "",
  paginaVence: doc.paginaVence ? String(doc.paginaVence) : "",
  datos: doc.datos,
});
const deFormulario = (f) => ({
  nombre: f.nombre.trim(),
  carpeta: f.carpeta,
  descripcion: f.descripcion.trim(),
  vence: f.vence || null,
  paginaVence: f.paginaVence ? Number(f.paginaVence) : null,
  datos: f.datos.map(([k, v]) => [k.trim(), v.trim()]).filter(([k, v]) => k && v),
});

function FormDoc({ doc, onGuardar }) {
  const [f, setF] = useState(() => aFormulario(doc));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (f.nombre.trim()) onGuardar({ ...doc, ...deFormulario(f) });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <CamposDoc f={f} setF={setF} />
      <button type="submit" disabled={!f.nombre.trim()} className={botonPrincipal}>
        Guardar cambios
      </button>
    </form>
  );
}

function FormSubir({ archivo, onGuardar }) {
  const [f, setF] = useState({ nombre: archivo.name, carpeta: null, descripcion: "", vence: "", paginaVence: "", datos: [] });
  const [guardando, setGuardando] = useState(false);
  const tamano = archivo.size > 1048576 ? `${(archivo.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(archivo.size / 1024))} KB`;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.carpeta || !f.nombre.trim() || guardando) return;
        setGuardando(true);
        const guardado = await guardarArchivo(archivo);
        onGuardar({ id: nuevoId(), subido: hoyISO(), archivo: guardado, ...deFormulario(f) });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
        <IconoDoc nombre={archivo.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{archivo.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{tamano}</p>
        </div>
      </div>
      <CamposDoc f={f} setF={setF} />
      <button type="submit" disabled={!f.carpeta || !f.nombre.trim() || guardando} className={botonPrincipal}>
        {guardando ? "Guardando…" : f.carpeta ? `Guardar en ${CAT[f.carpeta].nombre}` : "Elige una carpeta"}
      </button>
    </form>
  );
}

function FormNota({ nota, hoy, onGuardar, onBorrar }) {
  const [titulo, setTitulo] = useState(nota?.titulo ?? "");
  const [texto, setTexto] = useState(nota?.texto ?? "");
  const valido = titulo.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ id: nota?.id ?? nuevoId(), fecha: nota?.fecha ?? hoy, titulo: titulo.trim(), texto: texto.trim() });
      }}
      className="grid grid-cols-1 gap-3"
    >
      <div>
        <label htmlFor="nota-titulo" className={etiqueta}>
          Título
        </label>
        <input id="nota-titulo" autoFocus={!nota} value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="nota-texto" className={etiqueta}>
          Nota
        </label>
        <textarea id="nota-texto" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campo} resize-none font-serif text-base`} />
      </div>
      <button type="submit" disabled={!valido} className={`mt-1 ${botonPrincipal}`}>
        Guardar nota
      </button>
      {onBorrar && (
        <button type="button" onClick={onBorrar} className={`rounded-xl py-2.5 text-sm font-bold text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 ${foco}`}>
          Eliminar nota
        </button>
      )}
    </form>
  );
}

function Buscador({ documentos, notas, hoy, abrirDoc, abrirNota }) {
  const [q, setQ] = useState("");
  const nq = normalizar(q.trim());
  const docs = nq ? documentos.filter((d) => textoDoc(d).includes(nq)).slice(0, 8) : [];
  const ns = nq ? notas.filter((n) => normalizar(`${n.titulo} ${n.texto}`).includes(nq)).slice(0, 6) : [];
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
        <label htmlFor="buscar-todo" className="sr-only">
          Buscar en documentos y notas
        </label>
        <input id="buscar-todo" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca en documentos y notas" className={`${campo} pl-9`} />
      </div>
      {nq && (
        <div className="mt-3">
          {docs.map((d) => (
            <FilaDoc key={d.id} doc={d} hoy={hoy} onClick={() => abrirDoc(d.id)} />
          ))}
          {ns.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => abrirNota(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 ${foco}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <StickyNote className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{n.titulo}</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{n.texto}</span>
              </span>
            </button>
          ))}
          {!docs.length && !ns.length && <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin resultados.</p>}
        </div>
      )}
    </div>
  );
}

function FormRecordatorio({ documentos, hoy, onGuardar }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(sumarDias(hoy, 1));
  const [doc, setDoc] = useState("");
  const valido = titulo.trim() && fecha;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ titulo: titulo.trim(), fecha, doc: doc || null });
      }}
      className="grid grid-cols-1 gap-3"
    >
      <div>
        <label htmlFor="rec-titulo" className={etiqueta}>
          ¿De qué te aviso?
        </label>
        <input id="rec-titulo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="rec-fecha" className={etiqueta}>
          Fecha
        </label>
        <input id="rec-fecha" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="rec-doc" className={etiqueta}>
          Documento relacionado (opcional)
        </label>
        <select id="rec-doc" value={doc} onChange={(e) => setDoc(e.target.value)} className={campo}>
          <option value="">Ninguno</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={!valido} className={`mt-1 ${botonPrincipal}`}>
        Crear recordatorio
      </button>
    </form>
  );
}
