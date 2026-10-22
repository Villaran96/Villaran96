// Asesor Financiero: tu contabilidad personal a partir de los movimientos de Revolut y Ruralvía.
// Importas los extractos (CSV, Excel, Norma 43, texto copiado o capturas leídas con IA) y la app los
// clasifica, separa el matched betting y los traspasos entre tus cuentas, y te enseña en qué gastas,
// cuánto ahorras y cuánto ganas con el matched betting. La lógica pura está en finanzas.js.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Dices,
  Download,
  Dumbbell,
  FileSpreadsheet,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Landmark,
  MessageCircle,
  Moon,
  Percent,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Repeat,
  Search,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Sun,
  Tag,
  Target,
  Ticket,
  Trash2,
  Trophy,
  Undo2,
  Upload,
  Users,
  UtensilsCrossed,
  Vault,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import {
  TIPOS,
  aCSV,
  aFecha,
  aNumero,
  analizarTabla,
  categoriaDe,
  claveSugerida,
  coincide,
  comercio,
  decodificar,
  deISO,
  diasEntre,
  emparejarTraspasos,
  esNorma43,
  estadoInicial,
  filasAMovimientos,
  hoyISO,
  leerNorma43,
  mesAnterior,
  mesSiguiente,
  normalizar,
  nuevoId,
  prepararImportacion,
  recurrentes,
  redondear,
  resumenMB,
  resumenMes,
  saldoEn,
  sumarDias,
  topComercios,
  trocearCSV,
  NOMBRES_ROL,
} from "./finanzas.js";

/* ───────────────────────── Formato ───────────────────────── */

const fmtEur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmtEur0 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur = (n) => fmtEur.format(n).replace("-", "−");
const eurCorto = (n) => fmtEur0.format(n).replace("-", "−");
const conSigno = (n) => `${n > 0 ? "+" : ""}${eur(n)}`;
const nMovs = (n) => (n === 1 ? "1 movimiento" : `${n} movimientos`);
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nombreMes = (mes) => capital(new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(deISO(`${mes}-01`)));
const mesCorto = (mes) => new Intl.DateTimeFormat("es-ES", { month: "short" }).format(deISO(`${mes}-01`)).replace(".", "");
const fechaCorta = (iso) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(deISO(iso)).replace(".", "");
const fechaLarga = (iso) => capital(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(deISO(iso)));

const ICONOS = {
  supermercado: ShoppingCart,
  comida: UtensilsCrossed,
  transporte: Car,
  ocio: Ticket,
  compras: ShoppingBag,
  suscripciones: Repeat,
  salud: HeartPulse,
  deporte: Dumbbell,
  educacion: GraduationCap,
  facturas: Zap,
  viajes: Plane,
  regalos: Gift,
  "bizum-enviado": Send,
  efectivo: Banknote,
  comisiones: Percent,
  nomina: Briefcase,
  familia: Users,
  "bizum-recibido": HandCoins,
  devoluciones: Undo2,
  intereses: PiggyBank,
  mb: Dices,
  "mb-herramientas": Wrench,
  traspaso: ArrowLeftRight,
  hucha: Vault,
};
const iconoDe = (id) => ICONOS[id] ?? Tag;
const PALETA = ["#8b5cf6", "#0ea5e9", "#f97316", "#10b981", "#e11d48", "#eab308", "#6366f1", "#14b8a6"];

const TABS = [
  { id: "inicio", nombre: "Inicio", icono: House },
  { id: "movimientos", nombre: "Movimientos", icono: Receipt },
  { id: "mb", nombre: "Matched", icono: Trophy },
  { id: "ahorro", nombre: "Ahorro", icono: PiggyBank },
  { id: "chat", nombre: "Chat IA", icono: MessageCircle },
];

/* ───────────────────────── Guardado ───────────────────────── */

const CLAVE_LOCAL = "asesor-financiero:datos";
const POR_DOCUMENTO = 600; // movimientos por documento de la base de datos (cada uno admite 256 KiB)

function trocearPorMes(d) {
  const meses = {};
  const porMes = new Map();
  for (const m of d.movimientos) {
    const mes = m.fecha.slice(0, 7);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push(m);
  }
  for (const [mes, movs] of porMes) for (let i = 0; i < movs.length; i += POR_DOCUMENTO) meses[`${mes}~${String(i / POR_DOCUMENTO).padStart(2, "0")}`] = movs.slice(i, i + POR_DOCUMENTO);
  return { base: d.base, meses };
}

// En claude.ai los datos van a la parte privada de tu cuenta (capacidad `db`): la configuración en un
// documento y los movimientos repartidos por meses. Fuera de claude.ai se guardan en este navegador.
function useFinanzas() {
  const [datos, setDatos] = useState(() => {
    try {
      const local = localStorage.getItem(CLAVE_LOCAL);
      if (local) return JSON.parse(local);
    } catch {}
    return estadoInicial();
  });
  const [donde, setDonde] = useState("navegador");
  const [sincronizando, setSincronizando] = useState(() => !!window.claude?.use);
  const nube = useRef(null);
  const escrito = useRef({ base: null, meses: {} });
  const cola = useRef(Promise.resolve());
  const actual = useRef(datos);
  actual.current = datos;

  const subir = useCallback((d) => {
    const { base, meses } = trocearPorMes(d);
    const previo = escrito.current;
    const tareas = [];
    const jb = JSON.stringify(base);
    if (jb !== previo.base) {
      previo.base = jb;
      tareas.push(() => nube.current.base.set({ base }));
    }
    for (const [clave, movs] of Object.entries(meses)) {
      const j = JSON.stringify(movs);
      if (j === previo.meses[clave]) continue;
      previo.meses[clave] = j;
      tareas.push(() => nube.current.meses.doc(clave).set({ movs }));
    }
    for (const clave of Object.keys(previo.meses)) {
      if (meses[clave]) continue;
      delete previo.meses[clave];
      tareas.push(() => nube.current.meses.doc(clave).delete());
    }
    for (const t of tareas) cola.current = cola.current.then(t).catch(() => {});
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!window.claude?.use) return;
        const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
        const id = db && user ? await user.id() : null;
        if (!vivo || !id) return;
        const base = db.doc(`data/users/${id}/finanzas`);
        const meses = base.collection("meses");
        const [sb, sm] = await Promise.all([base.get(), meses.get()]);
        if (!vivo) return;
        nube.current = { base, meses };
        setDonde("cuenta");
        const remota = sb.exists ? sb.data()?.base : null;
        if (remota) {
          const docs = [...sm.docs].sort((a, b) => a.id.localeCompare(b.id));
          escrito.current = { base: JSON.stringify(remota), meses: Object.fromEntries(docs.map((d) => [d.id, JSON.stringify(d.data()?.movs ?? [])])) };
          setDatos({ base: remota, movimientos: docs.flatMap((d) => d.data()?.movs ?? []) });
        } else {
          subir(actual.current);
        }
      } catch {
      } finally {
        if (vivo) setSincronizando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [subir]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_LOCAL, JSON.stringify(datos));
    } catch {}
    if (!nube.current) return;
    const t = setTimeout(() => subir(datos), 600);
    return () => clearTimeout(t);
  }, [datos, subir]);

  return [datos, setDatos, donde, sincronizando];
}

function useTema(clave) {
  const leer = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  };
  const [oscuro, setOscuro] = useState(() => {
    try {
      const guardado = localStorage.getItem(clave);
      if (guardado) document.documentElement.dataset.theme = guardado;
    } catch {}
    return leer();
  });
  useEffect(() => {
    const sync = () => setOscuro(leer());
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", sync);
    return () => {
      mo.disconnect();
      mq?.removeEventListener?.("change", sync);
    };
  }, []);
  const alternar = useCallback(() => {
    const siguiente = leer() ? "light" : "dark";
    document.documentElement.dataset.theme = siguiente;
    try {
      localStorage.setItem(clave, siguiente);
    } catch {}
  }, [clave]);
  return [oscuro, alternar];
}

// Capacidades de claude.ai (IA, descargas). Fuera de claude.ai son null y la app funciona sin ellas.
function useCapacidad(nombre) {
  const [cap, setCap] = useState(null);
  useEffect(() => {
    let vivo = true;
    window.claude
      ?.use?.(nombre)
      .then((c) => vivo && c && setCap(() => c))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [nombre]);
  return cap;
}

async function ofrecerArchivo(descargas, nombre, contenido, tipo) {
  if (descargas) {
    try {
      await descargas.save({ filename: nombre, data: contenido });
      return true;
    } catch (e) {
      if (e?.code === "declined") return false;
    }
  }
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

/* ───────────────────────── Lectura de archivos ───────────────────────── */

const URLS_XLSX = ["https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"];
let promesaXLSX = null;

// El lector de Excel (SheetJS) solo se descarga la primera vez que importas un .xls o .xlsx.
function cargarXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  promesaXLSX ??= URLS_XLSX.reduce(
    (previa, url) =>
      previa.catch(
        () =>
          new Promise((ok, ko) => {
            const s = document.createElement("script");
            s.src = url;
            s.onload = () => (window.XLSX ? ok(window.XLSX) : ko(new Error()));
            s.onerror = () => {
              s.remove();
              ko(new Error());
            };
            document.head.appendChild(s);
          }),
      ),
    Promise.reject(new Error()),
  ).catch(() => {
    promesaXLSX = null;
    throw new Error("No se pudo cargar el lector de Excel. Comprueba la conexión o descarga el extracto en CSV.");
  });
  return promesaXLSX;
}

async function leerArchivo(archivo) {
  const ext = archivo.name.split(".").pop().toLowerCase();
  const buffer = await archivo.arrayBuffer();
  if (["xls", "xlsx", "ods"].includes(ext)) {
    const XLSX = await cargarXLSX();
    const libro = XLSX.read(buffer, { type: "array", cellDates: true });
    const hojas = libro.SheetNames.map((n) => XLSX.utils.sheet_to_json(libro.Sheets[n], { header: 1, raw: true, defval: "" }));
    return { filas: hojas.find((f) => analizarTabla(f)) ?? hojas[0] ?? [] };
  }
  if (ext === "pdf") throw new Error("Los PDF no se pueden leer directamente. Descarga el extracto en Excel o CSV, o haz capturas de pantalla y súbelas con «Capturas de pantalla».");
  const texto = decodificar(buffer);
  if (esNorma43(texto)) return { norma43: leerNorma43(texto) };
  return { filas: trocearCSV(texto) };
}

function adivinarCuenta(nombre, formato, cuentas) {
  const n = normalizar(nombre);
  if (formato === "revolut" || n.includes("revolut")) return cuentas.find((c) => c.id === "revolut")?.id ?? cuentas[0]?.id;
  if (/rural|caja|norma 43|n43/.test(n) || formato === "norma43") return cuentas.find((c) => c.id === "ruralvia")?.id ?? cuentas[0]?.id;
  return cuentas[0]?.id;
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
const campo =
  "w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-[15px] font-semibold ring-1 ring-slate-200 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10";
const etiqueta = "mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400";
const botonPrincipal = `rounded-2xl bg-violet-600 px-4 py-3 text-[15px] font-extrabold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`;
const botonSuave = `rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 ${foco}`;
const botonChip = `flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 ${foco}`;

function Tarjeta({ className = "", children }) {
  return (
    <section
      className={`rounded-3xl bg-white shadow-[0_1px_2px_rgba(23,19,43,0.04),0_16px_40px_-24px_rgba(76,29,149,0.25)] ring-1 ring-slate-900/5 dark:bg-[#171427] dark:shadow-none dark:ring-white/10 ${className}`}
    >
      {children}
    </section>
  );
}

function Titulo({ children, accion }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-extrabold tracking-tight">{children}</h2>
      {accion}
    </div>
  );
}

function Hoja({ abierta, onCerrar, titulo, icono: Icono, children, ancha = false }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[#0d0b16]/50 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg motion-safe:animate-sheet sm:rounded-3xl sm:pb-6 dark:bg-[#1b1830] dark:ring-1 dark:ring-white/10 ${ancha ? "sm:max-w-2xl" : "sm:max-w-md"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-extrabold tracking-tight">
            {Icono && <Icono className="size-5 shrink-0 text-violet-600 dark:text-violet-400" />}
            <span className="truncate">{titulo}</span>
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid size-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 ${foco}`}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconoCategoria({ cat, tam = "size-10" }) {
  const Icono = cat.id ? iconoDe(cat.id) : Tag;
  return (
    <span className={`grid ${tam} shrink-0 place-items-center rounded-xl`} style={{ backgroundColor: `${cat.color}22`, color: cat.color }}>
      <Icono className="size-[18px]" />
    </span>
  );
}

function Barra({ valor, color = "#8b5cf6", alto = "h-2" }) {
  return (
    <div className={`${alto} overflow-hidden rounded-full bg-slate-100 dark:bg-white/10`}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(0, valor * 100))}%`, backgroundColor: color }} />
    </div>
  );
}

function Rico({ texto }) {
  return String(texto)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((t, i) =>
      t.startsWith("**") ? (
        <strong key={i} className="font-extrabold">
          {t.slice(2, -2)}
        </strong>
      ) : (
        t
      ),
    );
}

function SelectorMes({ mes, setMes, hoyMes }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-white p-1 ring-1 ring-slate-900/5 dark:bg-[#171427] dark:ring-white/10">
      <button
        type="button"
        onClick={() => setMes(mesAnterior(mes))}
        aria-label="Mes anterior"
        className={`grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 ${foco}`}
      >
        <ChevronLeft className="size-5" />
      </button>
      <p className="text-sm font-extrabold">{mes === hoyMes ? `Este mes · ${nombreMes(mes)}` : nombreMes(mes)}</p>
      <button
        type="button"
        onClick={() => setMes(mesSiguiente(mes))}
        disabled={mes >= hoyMes}
        aria-label="Mes siguiente"
        className={`grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10 ${foco}`}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

// Ancho real del contenedor, para dibujar las gráficas a escala 1:1.
function useAncho(inicial = 320) {
  const ref = useRef();
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

function Sparkline({ valores }) {
  if (valores.length < 2) return null;
  const W = 300;
  const H = 64;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const x = (i) => (i / (valores.length - 1)) * W;
  const y = (v) => 6 + (1 - (max === min ? 0.5 : (v - min) / (max - min))) * (H - 12);
  const linea = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="relleno-saldo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linea} L${W},${H} L0,${H} Z`} fill="url(#relleno-saldo)" />
      <path d={linea} fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={W} cy={y(valores.at(-1))} r="4.5" fill="#ffffff" stroke="#34d399" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Dona({ partes, total, etiquetaCentro = "Total" }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const hueco = partes.length > 1 ? 3 : 0;
  let acumulado = 0;
  return (
    <div className="relative mx-auto size-[156px] shrink-0">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label="Gastos por categoría">
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-white/5" />
        {partes.map((p) => {
          const largo = Math.max((p.total / total) * C - hueco, 0);
          const el = <circle key={p.id} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16" strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acumulado} />;
          acumulado += (p.total / total) * C;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{etiquetaCentro}</p>
          <p className="text-[17px] leading-tight font-extrabold tracking-tight tabular-nums">{eurCorto(total)}</p>
        </div>
      </div>
    </div>
  );
}

// Barras de ingresos y gastos por mes, con el ahorro de cada mes encima.
function BarrasMes({ meses }) {
  const [ref, W] = useAncho();
  const H = 190;
  const [izq, der, arr, aba] = [8, 8, 26, 22];
  const max = Math.max(1, ...meses.flatMap((m) => [m.ingresos, m.gastos]));
  const ancho = (W - izq - der) / meses.length;
  const barra = Math.min(18, ancho / 3);
  const y = (v) => arr + (1 - v / max) * (H - arr - aba);
  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Ingresos y gastos de los últimos meses">
        <line x1={izq} x2={W - der} y1={H - aba} y2={H - aba} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
        {meses.map((m, i) => {
          const cx = izq + ancho * i + ancho / 2;
          return (
            <g key={m.mes}>
              <rect x={cx - barra - 1.5} y={y(m.ingresos)} width={barra} height={H - aba - y(m.ingresos)} rx="4" fill="#10b981" />
              <rect x={cx + 1.5} y={y(m.gastos)} width={barra} height={H - aba - y(m.gastos)} rx="4" fill="#f43f5e" />
              <text
                x={cx}
                y={Math.min(y(m.ingresos), y(m.gastos)) - 8}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                fill="currentColor"
                className={m.ahorro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
              >
                {m.ingresos || m.gastos ? `${m.ahorro >= 0 ? "+" : "−"}${fmtEur0.format(Math.abs(m.ahorro)).replace(/\s?€/, "")}` : ""}
              </text>
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" className="text-slate-400">
                {mesCorto(m.mes)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" /> Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500" /> Gastos
        </span>
        <span>Arriba, lo que ahorraste (con el matched betting)</span>
      </p>
    </div>
  );
}

function LineaAcumulada({ puntos }) {
  const [ref, W] = useAncho();
  const H = 170;
  const [izq, der, arr, aba] = [48, 12, 14, 22];
  if (puntos.length < 2) return <div ref={ref} />;
  const valores = puntos.map((p) => p.acumulado);
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const x = (i) => izq + (i / (puntos.length - 1)) * (W - izq - der);
  const y = (v) => arr + (1 - (v - min) / (max - min || 1)) * (H - arr - aba);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.acumulado).toFixed(1)}`).join(" ");
  const cada = Math.ceil(puntos.length / 6);
  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label={`Beneficio acumulado del matched betting: ${eur(valores.at(-1))}`}>
        {[max, (max + min) / 2, min].map((v, i) => (
          <g key={i}>
            <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
            <text x={izq - 6} y={y(v) + 4} textAnchor="end" fontSize="10.5" fontWeight="700" fill="currentColor" className="text-slate-400">
              {eurCorto(v)}
            </text>
          </g>
        ))}
        <line x1={izq} x2={W - der} y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="4 4" className="text-slate-400" />
        <path d={linea} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {puntos.map((p, i) => (
          <g key={p.mes}>
            <circle cx={x(i)} cy={y(p.acumulado)} r={i === puntos.length - 1 ? 4.5 : 3} fill="#f59e0b" />
            {i % cada === 0 || i === puntos.length - 1 ? (
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="currentColor" className="text-slate-400">
                {mesCorto(p.mes)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function BotonBorrar({ onClick, etiqueta: aria }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 ${foco}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function CampoImporte({ id, valor, setValor, autoFocus, placeholder = "0,00" }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/[^\d.,-]/g, ""))}
        placeholder={placeholder}
        className={`${campo} pr-10 text-xl font-extrabold tabular-nums`}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-bold text-slate-400">€</span>
    </div>
  );
}

/* ───────────────────────── App ───────────────────────── */

export default function AsesorFinanciero() {
  const [oscuro, alternarTema] = useTema("asesor-financiero:tema");
  const [datos, setDatos, donde, sincronizando] = useFinanzas();
  const sample = useCapacidad("sample");
  const descargas = useCapacidad("downloads");
  const [tab, setTab] = useState("inicio");
  const hoy = hoyISO();
  const hoyMes = hoy.slice(0, 7);
  const [mes, setMes] = useState(hoyMes);
  const [hoja, setHoja] = useState(null); // "importar" | "ajustes" | "nuevo" | {mov} | {casa} | "casa-nueva" | "meta-nueva" | {aportar}
  const [filtro, setFiltro] = useState({ tipo: "todos", categoria: null, cuenta: null, texto: "" });
  const [toast, setToast] = useState(null);
  const toastRef = useRef();

  const { base, movimientos } = datos;
  const cats = useMemo(() => Object.fromEntries(base.categorias.map((c) => [c.id, c])), [base.categorias]);
  const resumen = useMemo(() => resumenMes(movimientos, cats, mes), [movimientos, cats, mes]);
  const mb = useMemo(() => resumenMB(movimientos, base, cats), [movimientos, base, cats]);
  const fijos = useMemo(() => recurrentes(movimientos, cats, hoy), [movimientos, cats, hoy]);
  const sinCategoria = useMemo(() => movimientos.filter((m) => !m.categoria).length, [movimientos]);

  const avisar = useCallback((texto, tono = "normal") => {
    clearTimeout(toastRef.current);
    setToast({ texto, tono });
    toastRef.current = setTimeout(() => setToast(null), 3200);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);
  const cambiarBase = (fn) => setDatos((d) => ({ ...d, base: fn(d.base) }));

  const verMovimientos = (f) => {
    setFiltro({ tipo: "todos", categoria: null, cuenta: null, texto: "", ...f });
    setTab("movimientos");
  };

  const acciones = {
    importar: ({ nuevos, cuenta, saldo }) => {
      setDatos((d) => ({
        base: {
          ...d.base,
          cuentas: d.base.cuentas.map((c) => (c.id === cuenta && saldo && (!c.saldoFecha || saldo.fecha >= c.saldoFecha) ? { ...c, saldoRef: saldo.valor, saldoFecha: saldo.fecha } : c)),
        },
        movimientos: emparejarTraspasos([...d.movimientos, ...nuevos]),
      }));
      cerrarHoja();
      const sinCat = nuevos.filter((m) => !m.categoria).length;
      avisar(nuevos.length ? `${nMovs(nuevos.length)} importado${nuevos.length === 1 ? "" : "s"}${sinCat ? ` · ${sinCat} sin categoría` : ""}` : "No había movimientos nuevos");
      if (nuevos.length) setMes(nuevos.at(-1).fecha.slice(0, 7));
    },
    guardarMov: (id, cambios, regla) => {
      setDatos((d) => {
        let movs = d.movimientos.map((m) => (m.id === id ? { ...m, ...cambios, manual: true } : m));
        let b = d.base;
        if (regla) {
          b = { ...b, reglas: [...b.reglas.filter((r) => normalizar(r.clave) !== normalizar(regla.clave)), { id: nuevoId(), ...regla }] };
          movs = movs.map((m) => (!m.manual && coincide(normalizar(m.concepto), regla.clave) ? { ...m, categoria: regla.categoria } : m));
        }
        return { base: b, movimientos: movs };
      });
      cerrarHoja();
      avisar(regla ? `Guardado. Los movimientos con «${regla.clave}» irán a ${cats[regla.categoria]?.nombre}` : "Movimiento guardado");
    },
    nuevoMov: (m) => {
      setDatos((d) => ({ ...d, movimientos: [...d.movimientos, { ...m, id: nuevoId(), origen: "manual", manual: true, huella: `manual|${nuevoId()}` }] }));
      cerrarHoja();
      avisar("Movimiento añadido");
    },
    borrarMov: (id) => {
      setDatos((d) => ({ ...d, movimientos: d.movimientos.filter((m) => m.id !== id) }));
      cerrarHoja();
      avisar("Movimiento eliminado");
    },
    aplicarIA: (asignaciones) => {
      setDatos((d) => ({ ...d, movimientos: d.movimientos.map((m) => (!m.categoria && asignaciones[m.id] ? { ...m, categoria: asignaciones[m.id] } : m)) }));
    },
    guardarCasa: (casa) => {
      cambiarBase((b) => ({ ...b, casas: b.casas.some((c) => c.id === casa.id) ? b.casas.map((c) => (c.id === casa.id ? casa : c)) : [...b.casas, casa] }));
      setDatos((d) => ({ ...d, movimientos: d.movimientos.map((m) => (!m.manual && !m.categoria && casa.claves.some((k) => coincide(normalizar(m.concepto), k)) ? { ...m, categoria: "mb" } : m)) }));
      cerrarHoja();
    },
    borrarCasa: (id) => {
      cambiarBase((b) => ({ ...b, casas: b.casas.filter((c) => c.id !== id) }));
      cerrarHoja();
    },
  };

  const movAbierto = hoja?.mov ? movimientos.find((m) => m.id === hoja.mov) : null;
  const casaAbierta = hoja?.casa ? base.casas.find((c) => c.id === hoja.casa) : null;
  const metaAportar = hoja?.aportar ? base.metas.find((m) => m.id === hoja.aportar) : null;
  const vista = { datos, base, movimientos, cats, hoy, hoyMes, mes, setMes, resumen, mb, fijos, sinCategoria, abrir: setHoja, verMovimientos, cambiarBase, setDatos, acciones, avisar, sample };

  return (
    <div className="min-h-screen font-sans">
      <header className="mx-auto flex max-w-4xl items-center gap-3 gutter pt-4 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg shadow-violet-600/30">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] leading-tight font-extrabold tracking-tight">Asesor Financiero</h1>
          <p className="text-xs leading-tight font-semibold text-slate-500 dark:text-slate-400">{sincronizando ? "Cargando tus datos…" : "Tu IA para mejores decisiones"}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setHoja("importar")}
            aria-label="Importar movimientos"
            className={`grid size-10 place-items-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-600/30 hover:bg-violet-700 ${foco}`}
          >
            <Upload className="size-5" />
          </button>
          <button
            type="button"
            onClick={alternarTema}
            aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={`grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10 ${foco}`}
          >
            {oscuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => setHoja("ajustes")}
            aria-label="Ajustes"
            className={`grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10 ${foco}`}
          >
            <Settings className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl gutter pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
        {tab === "inicio" && <VistaInicio {...vista} />}
        {tab === "movimientos" && <VistaMovimientos {...vista} filtro={filtro} setFiltro={setFiltro} />}
        {tab === "mb" && <VistaMB {...vista} />}
        {tab === "ahorro" && <VistaAhorro {...vista} />}
        {tab === "chat" && <VistaChat {...vista} />}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-safe backdrop-blur-xl gutter dark:border-white/10 dark:bg-[#0d0b16]/90"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map(({ id, nombre, icono: I }) => {
            const activo = tab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={activo ? "page" : undefined}
                  className={`relative flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-bold ${foco} ${activo ? "text-violet-600 dark:text-violet-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${activo ? "bg-violet-50 dark:bg-violet-500/15" : ""}`}>
                    <I className="size-5" strokeWidth={activo ? 2.4 : 2} />
                  </span>
                  {nombre}
                  {id === "movimientos" && sinCategoria > 0 && (
                    <span className="absolute top-1.5 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {sinCategoria > 99 ? "99+" : sinCategoria}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-[60] flex justify-center gutter">
          <div
            className={`flex max-w-md items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-lg motion-safe:animate-sheet ${toast.tono === "alerta" ? "bg-rose-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"}`}
          >
            {toast.tono === "alerta" ? <AlertTriangle className="size-4 shrink-0" /> : <Check className="size-4 shrink-0" />}
            {toast.texto}
          </div>
        </div>
      )}

      <Hoja abierta={hoja === "importar"} onCerrar={cerrarHoja} titulo="Importar movimientos" icono={Upload} ancha>
        <Importador datos={datos} sample={sample} onImportar={acciones.importar} />
      </Hoja>

      <Hoja abierta={hoja === "ajustes"} onCerrar={cerrarHoja} titulo="Ajustes" icono={Settings} ancha>
        <Ajustes {...vista} donde={donde} descargas={descargas} />
      </Hoja>

      <Hoja abierta={hoja === "nuevo"} onCerrar={cerrarHoja} titulo="Añadir movimiento" icono={Plus}>
        <FormMovimiento base={base} hoy={hoy} onGuardar={acciones.nuevoMov} />
      </Hoja>

      {movAbierto && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={comercio(movAbierto.concepto)} icono={Receipt}>
          <EditarMovimiento key={movAbierto.id} mov={movAbierto} base={base} cats={cats} onGuardar={acciones.guardarMov} onBorrar={acciones.borrarMov} />
        </Hoja>
      )}

      <Hoja abierta={hoja === "casa-nueva" || !!casaAbierta} onCerrar={cerrarHoja} titulo={casaAbierta ? casaAbierta.nombre : "Nueva casa de apuestas"} icono={Dices}>
        <FormCasa key={casaAbierta?.id ?? "nueva"} casa={casaAbierta} onGuardar={acciones.guardarCasa} onBorrar={casaAbierta ? () => acciones.borrarCasa(casaAbierta.id) : null} />
      </Hoja>

      <Hoja abierta={hoja === "meta-nueva"} onCerrar={cerrarHoja} titulo="Nueva meta de ahorro" icono={Target}>
        <FormMeta
          hoy={hoy}
          onCrear={(m) => {
            cambiarBase((b) => ({ ...b, metas: [...b.metas, { ...m, id: nuevoId() }] }));
            cerrarHoja();
          }}
        />
      </Hoja>

      {metaAportar && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={`Aportar a «${metaAportar.nombre}»`} icono={PiggyBank}>
          <FormAporte
            meta={metaAportar}
            onAportar={(importe) => {
              cambiarBase((b) => ({ ...b, metas: b.metas.map((m) => (m.id === metaAportar.id ? { ...m, ahorrado: redondear(m.ahorrado + importe) } : m)) }));
              cerrarHoja();
            }}
          />
        </Hoja>
      )}
    </div>
  );
}

/* ───────────────────────── Inicio ───────────────────────── */

function VistaInicio(v) {
  const { base, movimientos, cats, hoy, hoyMes, mes, setMes, resumen, mb, fijos, sinCategoria, abrir, verMovimientos } = v;
  if (!movimientos.length) return <Bienvenida abrir={abrir} />;
  const hayPrevio = movimientos.some((m) => m.fecha.startsWith(mesAnterior(mes)));
  const previo = hayPrevio ? resumenMes(movimientos, cats, mesAnterior(mes)) : null;
  const evolucion = Array.from({ length: 6 }, (_, i) => {
    let m = mes;
    for (let j = 0; j < 5 - i; j++) m = mesAnterior(m);
    const r = i === 5 ? resumen : resumenMes(movimientos, cats, m);
    return { mes: m, ingresos: r.ingresos, gastos: r.gastos, ahorro: r.ahorro };
  });
  const primerMes = movimientos.reduce((a, m) => (m.fecha < a ? m.fecha : a), mes).slice(0, 7);
  const evolucionConDatos = evolucion.filter((e, i) => i === 5 || e.mes >= primerMes);
  const excedidas = resumen.gastosPorCategoria.filter((c) => c.presupuesto && c.total > c.presupuesto);
  const proximos = fijos.filter((f) => f.proxima >= hoy && diasEntre(hoy, f.proxima) <= 31);
  const ultimos = [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  return (
    <div className="grid grid-cols-1 gap-4">
      <TarjetaSaldo base={base} movimientos={movimientos} mes={mes} hoy={hoy} hoyMes={hoyMes} abrir={abrir} />
      <SelectorMes mes={mes} setMes={setMes} hoyMes={hoyMes} />

      {sinCategoria > 0 && (
        <button
          type="button"
          onClick={() => verMovimientos({ tipo: "sin" })}
          className={`flex items-center gap-3 rounded-2xl bg-amber-50 p-3.5 text-left text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/20 ${foco}`}
        >
          <Tag className="size-5 shrink-0 text-amber-500" />
          <span className="min-w-0 flex-1">
            <strong className="font-extrabold">{nMovs(sinCategoria)} sin categoría.</strong> Clasifícalos para que las cuentas sean exactas.
          </span>
          <ChevronRight className="size-5 shrink-0" />
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TarjetaResumen resumen={resumen} previo={previo} objetivo={base.objetivoAhorro} verMovimientos={verMovimientos} />
        <TarjetaGastos resumen={resumen} excedidas={excedidas} verMovimientos={verMovimientos} />
      </div>

      <Tarjeta className="p-5">
        <Titulo>Evolución</Titulo>
        <div className="mt-3">
          <BarrasMes meses={evolucionConDatos} />
        </div>
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta className="p-5">
          <Titulo
            accion={
              <span className={`text-sm font-extrabold tabular-nums ${mb.beneficio >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {conSigno(mb.beneficio)}
              </span>
            }
          >
            Matched betting
          </Titulo>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Beneficio total desde que hay datos. Este mes: {conSigno(resumen.mb)}.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Dato etiqueta="Depositado" valor={eur(mb.depositado)} />
            <Dato etiqueta="Retirado" valor={eur(mb.retirado)} />
          </div>
        </Tarjeta>
        <Tarjeta className="p-5">
          <Titulo>Próximos cargos previstos</Titulo>
          {proximos.length ? (
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
              {proximos.slice(0, 5).map((f) => (
                <li key={f.nombre} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-bold">{f.nombre}</span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                    {eur(f.importe)} · {fechaCorta(f.proxima)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cuando un gasto se repita cada mes (suscripciones, recibos), aparecerá aquí con su próxima fecha.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta className="p-5">
        <Titulo
          accion={
            <button type="button" onClick={() => verMovimientos({})} className={botonChip}>
              Ver todos
            </button>
          }
        >
          Últimos movimientos
        </Titulo>
        <ul className="mt-2">
          {ultimos.map((m) => (
            <li key={m.id}>
              <FilaMovimiento mov={m} cats={cats} cuentas={base.cuentas} onClick={() => abrir({ mov: m.id })} />
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

function Dato({ etiqueta: titulo, valor, color }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{titulo}</p>
      <p className={`mt-0.5 font-extrabold tabular-nums ${color ?? ""}`}>{valor}</p>
    </div>
  );
}

function Bienvenida({ abrir }) {
  return (
    <Tarjeta className="p-6">
      <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        <Wallet className="size-6" />
      </span>
      <h2 className="mt-4 text-xl font-extrabold tracking-tight">Empieza con tus movimientos</h2>
      <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">
        Descarga los movimientos de Revolut y de Ruralvía y súbelos aquí. La app los clasifica sola, separa el matched betting y los traspasos entre tus cuentas, y te enseña en qué gastas y cuánto
        ahorras.
      </p>
      <ol className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-300">
        <li>
          <strong className="font-extrabold text-slate-900 dark:text-white">1.</strong> Revolut: descarga el extracto de tu cuenta en euros en Excel o CSV.
        </li>
        <li>
          <strong className="font-extrabold text-slate-900 dark:text-white">2.</strong> Ruralvía: descarga los movimientos en Excel o Norma 43. Si solo tienes la app del móvil, haz capturas de
          pantalla o copia la lista.
        </li>
        <li>
          <strong className="font-extrabold text-slate-900 dark:text-white">3.</strong> Súbelos con el botón de abajo. Si importas el mismo periodo dos veces, no se duplica nada.
        </li>
      </ol>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => abrir("importar")} className={`flex items-center gap-2 ${botonPrincipal}`}>
          <Upload className="size-4" /> Importar movimientos
        </button>
        <button type="button" onClick={() => abrir("nuevo")} className={botonSuave}>
          Añadir uno a mano
        </button>
      </div>
    </Tarjeta>
  );
}

function TarjetaSaldo({ base, movimientos, mes, hoy, hoyMes, abrir }) {
  const finMes = mes === hoyMes ? hoy : sumarDias(`${mesSiguiente(mes)}-01`, -1);
  const conSaldo = base.cuentas.filter((c) => c.saldoRef !== null && c.saldoRef !== undefined);
  const total = (fecha) => (conSaldo.length ? redondear(conSaldo.reduce((s, c) => s + saldoEn(c, movimientos, fecha), 0)) : null);
  const actual = total(finMes);
  const inicio = total(sumarDias(`${mes}-01`, -1));
  const serie = [];
  if (conSaldo.length) for (let d = sumarDias(`${mes}-01`, -1); d <= finMes; d = sumarDias(d, 1)) serie.push(total(d));
  const cambio = inicio && actual !== null ? actual / inicio - 1 : null;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-xl shadow-violet-700/25 sm:p-6">
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-2xl" />
      <p className="relative flex items-center gap-2 text-sm font-bold text-violet-100">
        <Landmark className="size-4" /> Saldo total {mes !== hoyMes && `a final de ${nombreMes(mes).toLowerCase()}`}
      </p>
      <div className="relative mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="text-[34px] leading-none font-extrabold tracking-tight tabular-nums">{actual === null ? "—" : eur(actual)}</p>
          {cambio !== null && Number.isFinite(cambio) && (
            <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${cambio >= 0 ? "bg-emerald-400 text-emerald-950" : "bg-rose-400 text-rose-950"}`}>
              {cambio >= 0 ? "+" : "−"}
              {Math.abs(cambio * 100).toLocaleString("es-ES", { maximumFractionDigits: 1 })} % vs mes anterior
            </p>
          )}
          {actual === null && (
            <button type="button" onClick={() => abrir("ajustes")} className={`mt-3 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25 ${foco}`}>
              Indica tu saldo en Ajustes
            </button>
          )}
        </div>
        <div className="w-full sm:w-[46%]">
          <Sparkline valores={serie} />
        </div>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        {base.cuentas.map((c) => {
          const s = c.saldoRef === null || c.saldoRef === undefined ? null : saldoEn(c, movimientos, finMes);
          return (
            <span key={c.id} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <span className="size-2 rounded-full" style={{ backgroundColor: c.color === "#111827" ? "#e5e7eb" : c.color }} />
              {c.nombre}: {s === null ? "sin saldo" : eur(s)}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function TarjetaResumen({ resumen, previo, objetivo, verMovimientos }) {
  const tasa = resumen.ingresos + Math.max(resumen.mb, 0) > 0 ? resumen.ahorro / (resumen.ingresos + Math.max(resumen.mb, 0)) : null;
  const fila = (titulo, valor, color, onClick, antes) => (
    <button type="button" onClick={onClick} className={`flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}>
      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{titulo}</span>
      <span className="text-right">
        <span className={`block font-extrabold tabular-nums ${color}`}>{valor}</span>
        {antes && <span className="block text-[11px] font-semibold text-slate-400">mes anterior: {antes}</span>}
      </span>
    </button>
  );
  return (
    <Tarjeta className="p-5">
      <Titulo>Resumen del mes</Titulo>
      <div className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
        {fila("Ingresos", eur(resumen.ingresos), "text-emerald-600 dark:text-emerald-400", () => verMovimientos({ tipo: "ingreso" }), previo && eur(previo.ingresos))}
        {fila("Gastos", eur(resumen.gastos), "text-rose-600 dark:text-rose-400", () => verMovimientos({ tipo: "gasto" }), previo && eur(previo.gastos))}
        {fila(
          "Matched betting",
          conSigno(resumen.mb),
          resumen.mb >= 0 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400",
          () => verMovimientos({ tipo: "mb" }),
          previo && conSigno(previo.mb),
        )}
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-white/5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-extrabold">Ahorro del mes</span>
          <span className={`text-xl font-extrabold tabular-nums ${resumen.ahorro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {conSigno(resumen.ahorro)}
          </span>
        </div>
        {tasa !== null && (
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {tasa >= 0 ? `Ahorras el ${Math.round(tasa * 100)} % de lo que entra` : "Este mes sale más dinero del que entra"}
          </p>
        )}
        {objetivo > 0 && (
          <div className="mt-2">
            <Barra valor={resumen.ahorro / objetivo} color="#10b981" />
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Objetivo: {eur(objetivo)} al mes · {resumen.ahorro >= objetivo ? "¡conseguido!" : `te faltan ${eur(objetivo - resumen.ahorro)}`}
            </p>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

function TarjetaGastos({ resumen, excedidas, verMovimientos }) {
  const lista = resumen.gastosPorCategoria;
  return (
    <Tarjeta className="p-5">
      <Titulo>En qué gastas</Titulo>
      {lista.length ? (
        <>
          <div className="mt-3">
            <Dona partes={lista} total={resumen.gastos} etiquetaCentro="Gastos" />
          </div>
          <ul className="mt-3 grid grid-cols-1 gap-0.5">
            {lista.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => verMovimientos({ categoria: c.id.startsWith("sin-") ? null : c.id, tipo: c.id.startsWith("sin-") ? "sin" : "todos" })}
                  className={`w-full rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className={`min-w-0 flex-1 truncate font-bold ${c.presupuesto && c.total > c.presupuesto ? "text-rose-600 dark:text-rose-400" : ""}`}>{c.nombre}</span>
                    <span className="w-10 text-right text-xs font-extrabold text-slate-400 tabular-nums">{Math.round((c.total / resumen.gastos) * 100)}%</span>
                    <span className="w-[86px] text-right font-extrabold tabular-nums">{eur(c.total)}</span>
                  </span>
                  {c.presupuesto ? (
                    <span className="mt-1 block pl-[18px]">
                      <Barra valor={c.total / c.presupuesto} color={c.total > c.presupuesto ? "#e11d48" : c.total >= c.presupuesto * 0.9 ? "#f59e0b" : "#10b981"} alto="h-1.5" />
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {excedidas.map((c) => (
            <div key={c.id} className="mt-3 flex gap-3 rounded-2xl bg-rose-50 p-3.5 text-sm text-rose-900 ring-1 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-100 dark:ring-rose-500/20">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>
                <strong className="font-extrabold">Te estás pasando en {c.nombre}:</strong> llevas {eur(c.total)} de {eur(c.presupuesto)}.
              </span>
            </div>
          ))}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No hay gastos este mes.</p>
      )}
    </Tarjeta>
  );
}

/* ───────────────────────── Movimientos ───────────────────────── */

function FilaMovimiento({ mov, cats, cuentas, onClick }) {
  const c = categoriaDe(mov, cats);
  const cuenta = cuentas.find((x) => x.id === mov.cuenta);
  const interna = c.tipo === "interna";
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}>
      <IconoCategoria cat={c} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{comercio(mov.concepto)}</span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cuenta?.color ?? "#94a3b8" }} />
          <span className="truncate">
            {cuenta?.nombre ?? mov.cuenta} · {c.id ? c.nombre : <span className="font-bold text-amber-600 dark:text-amber-400">Sin categoría</span>}
            {mov.nota ? ` · ${mov.nota}` : ""}
          </span>
        </span>
      </span>
      <span className={`shrink-0 text-sm font-extrabold tabular-nums ${interna ? "text-slate-400" : mov.importe > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{conSigno(mov.importe)}</span>
    </button>
  );
}

const FILTROS = [
  ["todos", "Todos"],
  ["gasto", "Gastos"],
  ["ingreso", "Ingresos"],
  ["mb", "Matched"],
  ["interna", "Traspasos"],
  ["sin", "Sin categoría"],
];

function VistaMovimientos({ base, movimientos, cats, hoyMes, mes, setMes, filtro, setFiltro, abrir, acciones, avisar, sample }) {
  const [todoElTiempo, setTodoElTiempo] = useState(false);
  const [ia, setIa] = useState(null); // null | "pensando"
  const q = normalizar(filtro.texto);
  const lista = movimientos
    .filter((m) => todoElTiempo || filtro.tipo === "sin" || m.fecha.startsWith(mes))
    .filter((m) => !filtro.cuenta || m.cuenta === filtro.cuenta)
    .filter((m) => !filtro.categoria || m.categoria === filtro.categoria)
    .filter((m) => {
      if (filtro.tipo === "todos") return true;
      if (filtro.tipo === "sin") return !m.categoria;
      return categoriaDe(m, cats).tipo === filtro.tipo;
    })
    .filter((m) => !q || normalizar(`${m.concepto} ${m.nota ?? ""}`).includes(q))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const grupos = [];
  for (const m of lista.slice(0, 400)) {
    if (grupos.at(-1)?.fecha !== m.fecha) grupos.push({ fecha: m.fecha, items: [] });
    grupos.at(-1).items.push(m);
  }
  const total = redondear(lista.reduce((s, m) => s + m.importe, 0));
  const sinCat = movimientos.filter((m) => !m.categoria);

  const categorizarIA = async () => {
    setIa("pensando");
    try {
      const unicos = [...new Map(sinCat.map((m) => [m.concepto, m])).values()].slice(0, 80);
      const opciones = base.categorias.map((c) => `${c.id}: ${c.nombre} (${TIPOS.find((t) => t.id === c.tipo)?.nombre})`).join("\n");
      const r = await sample.json(
        `Clasifica estos movimientos bancarios de una persona que vive en España y usa Revolut y Ruralvía (Caja Rural).
Categorías posibles (id: nombre (tipo)):
${opciones}

Reglas: un pago o cobro de una casa de apuestas o exchange es "mb" (matched betting). Un Bizum recibido es "bizum-recibido" y uno enviado "bizum-enviado". Un traspaso entre sus propias cuentas es "traspaso". Si no está claro, usa null.
Responde SOLO con un objeto JSON cuyo valor para cada número de la lista sea el id de categoría o null, por ejemplo {"1": "supermercado", "2": null}.

Movimientos:
${unicos.map((m, i) => `${i + 1}. ${m.concepto} (${m.importe > 0 ? "ingreso" : "cargo"} de ${Math.abs(m.importe)} €)`).join("\n")}`,
        { modelTier: "quick" },
      );
      const porConcepto = {};
      unicos.forEach((m, i) => {
        const id = r?.[String(i + 1)];
        if (id && cats[id]) porConcepto[m.concepto] = id;
      });
      const asignaciones = Object.fromEntries(sinCat.filter((m) => porConcepto[m.concepto]).map((m) => [m.id, porConcepto[m.concepto]]));
      acciones.aplicarIA(asignaciones);
      avisar(Object.keys(asignaciones).length ? `La IA clasificó ${nMovs(Object.keys(asignaciones).length)}. Revísalos si algo no cuadra.` : "La IA no supo clasificar estos movimientos");
    } catch (e) {
      if (e?.code !== "cancelled") avisar(e?.code === "not_granted" ? "Sin permiso para usar la IA" : "La IA no está disponible ahora", "alerta");
    } finally {
      setIa(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-end justify-between gap-3 pt-2">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Movimientos</h1>
        <button
          type="button"
          onClick={() => abrir("nuevo")}
          className={`flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-700 ${foco}`}
        >
          <Plus className="size-4" strokeWidth={3} /> Añadir
        </button>
      </div>
      {!todoElTiempo && filtro.tipo !== "sin" && <SelectorMes mes={mes} setMes={setMes} hoyMes={hoyMes} />}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <label htmlFor="buscar-mov" className="sr-only">
          Buscar movimientos
        </label>
        <input
          id="buscar-mov"
          value={filtro.texto}
          onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })}
          placeholder="Buscar por concepto o nota"
          className={`${campo} bg-white pl-10 dark:bg-[#171427]`}
        />
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filtro.tipo === id}
            onClick={() => setFiltro({ ...filtro, tipo: id, categoria: null })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${foco} ${filtro.tipo === id && !filtro.categoria ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white" : "bg-white ring-slate-200 dark:bg-transparent dark:ring-white/15"}`}
          >
            {nombre}
            {id === "sin" && sinCat.length ? ` (${sinCat.length})` : ""}
          </button>
        ))}
        {base.cuentas.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filtro.cuenta === c.id}
            onClick={() => setFiltro({ ...filtro, cuenta: filtro.cuenta === c.id ? null : c.id })}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${foco} ${filtro.cuenta === c.id ? "bg-violet-600 text-white ring-violet-600" : "bg-white ring-slate-200 dark:bg-transparent dark:ring-white/15"}`}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: c.color === "#111827" && filtro.cuenta === c.id ? "#fff" : c.color }} />
            {c.nombre}
          </button>
        ))}
      </div>
      {filtro.categoria && (
        <p className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          Categoría: {cats[filtro.categoria]?.nombre}
          <button
            type="button"
            onClick={() => setFiltro({ ...filtro, categoria: null })}
            className={`rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-white/10 dark:text-slate-200 ${foco}`}
          >
            Quitar ×
          </button>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span>
          {nMovs(lista.length)} · total {conSigno(total)}
        </span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={todoElTiempo} onChange={(e) => setTodoElTiempo(e.target.checked)} className="size-4 accent-violet-600" />
          Todos los meses
        </label>
      </div>
      {sample && sinCat.length > 0 && filtro.tipo === "sin" && (
        <button
          type="button"
          onClick={categorizarIA}
          disabled={!!ia}
          className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-extrabold text-white shadow-lg shadow-violet-600/25 disabled:opacity-60 ${foco}`}
        >
          <Sparkles className={`size-4 ${ia ? "motion-safe:animate-pulse" : ""}`} />{" "}
          {ia ? "La IA está clasificando…" : `Clasificar con IA (${Math.min(new Set(sinCat.map((m) => m.concepto)).size, 80)} conceptos)`}
        </button>
      )}
      <div className="grid grid-cols-1 gap-3">
        {grupos.map((g) => (
          <Tarjeta key={g.fecha} className="px-3 py-2">
            <h2 className="px-1 pt-2 pb-1 text-xs font-extrabold tracking-wider text-slate-400 uppercase">{fechaLarga(g.fecha)}</h2>
            <ul>
              {g.items.map((m) => (
                <li key={m.id}>
                  <FilaMovimiento mov={m} cats={cats} cuentas={base.cuentas} onClick={() => abrir({ mov: m.id })} />
                </li>
              ))}
            </ul>
          </Tarjeta>
        ))}
        {lista.length > 400 && <p className="text-center text-xs font-bold text-slate-500">Se muestran los 400 más recientes. Usa la búsqueda o los filtros para ver el resto.</p>}
        {!lista.length && (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {movimientos.length ? "No hay movimientos con estos filtros." : "Aún no hay movimientos. Impórtalos con el botón de arriba."}
          </p>
        )}
      </div>
    </div>
  );
}

function SelectorCategoria({ base, valor, onCambiar, importe }) {
  const orden = importe < 0 ? ["gasto", "mb", "interna", "ingreso"] : ["ingreso", "mb", "interna", "gasto"];
  return (
    <div className="grid grid-cols-1 gap-3">
      {orden.map((tipo) => (
        <fieldset key={tipo}>
          <legend className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">{TIPOS.find((t) => t.id === tipo).nombre}</legend>
          <div className="flex flex-wrap gap-1.5">
            {base.categorias
              .filter((c) => c.tipo === tipo)
              .map((c) => {
                const Icono = iconoDe(c.id);
                const activa = valor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => onCambiar(c.id)}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-extrabold ring-1 transition ${foco} ${activa ? "text-white" : "ring-slate-200 hover:ring-violet-300 dark:ring-white/10"}`}
                    style={activa ? { backgroundColor: c.color, borderColor: c.color, boxShadow: `0 0 0 1px ${c.color}` } : undefined}
                  >
                    <Icono className="size-3.5" style={activa ? undefined : { color: c.color }} /> {c.nombre}
                  </button>
                );
              })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function EditarMovimiento({ mov, base, cats, onGuardar, onBorrar }) {
  const [categoria, setCategoria] = useState(mov.categoria);
  const [nota, setNota] = useState(mov.nota ?? "");
  const [clave, setClave] = useState(() => claveSugerida(mov.concepto));
  const [regla, setRegla] = useState(!mov.categoria);
  const [confirmar, setConfirmar] = useState(false);
  const manual = mov.origen === "manual";
  const [f, setF] = useState({ fecha: mov.fecha, concepto: mov.concepto, importe: String(Math.abs(mov.importe)).replace(".", ","), signo: mov.importe < 0 ? -1 : 1, cuenta: mov.cuenta });
  const cuenta = base.cuentas.find((c) => c.id === mov.cuenta);
  const similares = useMemo(() => (regla && clave.trim().length >= 2 ? clave : null), [regla, clave]);

  const guardar = () => {
    const cambios = { categoria, nota: nota.trim() || undefined };
    if (manual) {
      const n = aNumero(f.importe);
      if (!f.concepto.trim() || !(n > 0) || !f.fecha) return;
      Object.assign(cambios, { fecha: f.fecha, concepto: f.concepto.trim(), importe: redondear(f.signo * n), cuenta: f.cuenta });
    }
    onGuardar(mov.id, cambios, similares && categoria ? { clave: normalizar(clave), categoria } : null);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
        <p className={`text-2xl font-extrabold tabular-nums ${mov.importe > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{conSigno(mov.importe)}</p>
        <p className="mt-1 text-sm font-semibold break-words text-slate-600 dark:text-slate-300">{mov.concepto}</p>
        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          {fechaLarga(mov.fecha)} · {cuenta?.nombre ?? mov.cuenta} · {manual ? "añadido a mano" : "importado"}
        </p>
      </div>

      {manual && <CamposMovimiento base={base} f={f} setF={setF} />}

      <SelectorCategoria base={base} valor={categoria} onCambiar={setCategoria} importe={mov.importe} />

      {categoria && (
        <div className="rounded-2xl bg-violet-50 p-3.5 dark:bg-violet-500/10">
          <label className="flex items-start gap-2 text-sm font-bold text-violet-950 dark:text-violet-100">
            <input type="checkbox" checked={regla} onChange={(e) => setRegla(e.target.checked)} className="mt-0.5 size-4 accent-violet-600" />
            Usar siempre «{cats[categoria]?.nombre}» para los movimientos que contengan:
          </label>
          <label htmlFor="regla-clave" className="sr-only">
            Texto que deben contener
          </label>
          <input id="regla-clave" value={clave} disabled={!regla} onChange={(e) => setClave(e.target.value)} className={`${campo} mt-2 bg-white disabled:opacity-50 dark:bg-white/5`} />
          <p className="mt-1.5 text-xs text-violet-900/70 dark:text-violet-100/70">Se aplica a los movimientos que ya tienes y a los que importes después (salvo los que cambies a mano).</p>
        </div>
      )}

      <div>
        <label htmlFor="mov-nota" className={etiqueta}>
          Nota (opcional)
        </label>
        <input id="mov-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Por ejemplo: cena de cumpleaños" className={campo} />
      </div>

      <button type="button" onClick={guardar} className={botonPrincipal}>
        Guardar
      </button>
      {confirmar ? (
        <div className="rounded-2xl bg-rose-50 p-3 dark:bg-rose-500/10">
          <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">¿Eliminar este movimiento? {manual ? "" : "Si vuelves a importar el mismo extracto, volverá a aparecer."}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => onBorrar(mov.id)} className={`rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white ${foco}`}>
              Sí, eliminar
            </button>
            <button type="button" onClick={() => setConfirmar(false)} className={botonSuave}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmar(true)}
          className={`rounded-2xl py-2 text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 ${foco}`}
        >
          Eliminar movimiento
        </button>
      )}
    </div>
  );
}

function CamposMovimiento({ base, f, setF }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo">
        {[
          [-1, "Gasto o pago"],
          [1, "Ingreso o cobro"],
        ].map(([s, t]) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={f.signo === s}
            onClick={() => setF({ ...f, signo: s })}
            className={`rounded-xl py-2.5 text-sm font-extrabold ring-1 ${foco} ${f.signo === s ? "bg-violet-600 text-white ring-violet-600" : "ring-slate-200 dark:ring-white/10"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="mov-importe" className={etiqueta}>
          Importe
        </label>
        <CampoImporte id="mov-importe" valor={f.importe} setValor={(importe) => setF({ ...f, importe })} />
      </div>
      <div>
        <label htmlFor="mov-concepto" className={etiqueta}>
          Concepto
        </label>
        <input id="mov-concepto" value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mov-fecha" className={etiqueta}>
            Fecha
          </label>
          <input id="mov-fecha" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} className={campo} />
        </div>
        <div>
          <label htmlFor="mov-cuenta" className={etiqueta}>
            Cuenta
          </label>
          <select id="mov-cuenta" value={f.cuenta} onChange={(e) => setF({ ...f, cuenta: e.target.value })} className={campo}>
            {base.cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function FormMovimiento({ base, hoy, onGuardar }) {
  const [f, setF] = useState({ fecha: hoy, concepto: "", importe: "", signo: -1, cuenta: base.cuentas[0]?.id ?? "" });
  const [categoria, setCategoria] = useState(null);
  const n = aNumero(f.importe);
  const valido = f.concepto.trim() && n > 0 && f.fecha && f.cuenta;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ fecha: f.fecha, concepto: f.concepto.trim(), importe: redondear(f.signo * n), cuenta: f.cuenta, categoria });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <CamposMovimiento base={base} f={f} setF={setF} />
      <SelectorCategoria base={base} valor={categoria} onCambiar={setCategoria} importe={f.signo} />
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Añadir movimiento
      </button>
    </form>
  );
}

/* ───────────────────────── Importar ───────────────────────── */

const ROLES_MANUALES = ["", "fecha", "concepto", "importe", "cargo", "abono", "saldo"];

function Importador({ datos, sample, onImportar }) {
  const [paso, setPaso] = useState("elegir"); // elegir | texto | columnas | ia | revisar
  const [error, setError] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [fuente, setFuente] = useState(null); // { nombre, formato }
  const [tabla, setTabla] = useState(null);
  const [lectura, setLectura] = useState(null); // { movs, omitidos, saldo }
  const [cuenta, setCuenta] = useState(datos.base.cuentas[0]?.id);
  const [texto, setTexto] = useState("");
  const [imagenesIA, setImagenesIA] = useState(false);
  const archivoRef = useRef();
  const capturasRef = useRef();
  const ctlRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    sample
      ?.limits?.()
      .then((l) => vivo && setImagenesIA(!!l?.images))
      .catch(() => {});
    return () => {
      vivo = false;
      ctlRef.current?.abort();
    };
  }, [sample]);

  const conTabla = (filas, nombre) => {
    const a = analizarTabla(filas);
    if (!a) {
      setTabla({ filas, mapa: {}, inicio: 1 });
      setFuente({ nombre, formato: "tabla" });
      setPaso("columnas");
      return;
    }
    const r = filasAMovimientos(filas, a.cabecera, a.mapa);
    setFuente({ nombre, formato: a.formato ?? "tabla" });
    setLectura(r);
    setCuenta(adivinarCuenta(nombre, a.formato, datos.base.cuentas));
    setPaso("revisar");
  };

  const leer = async (archivo) => {
    setError(null);
    setLeyendo(true);
    try {
      const r = await leerArchivo(archivo);
      if (r.norma43) {
        setFuente({ nombre: archivo.name, formato: "norma43" });
        setLectura({ movs: r.norma43.movs, omitidos: { pendientes: 0, divisas: 0, huchas: 0, invalidos: 0 }, saldo: r.norma43.saldo });
        setCuenta(adivinarCuenta(archivo.name, "norma43", datos.base.cuentas));
        setPaso("revisar");
      } else if (!r.filas?.length) {
        setError("El archivo está vacío o no tiene filas que leer.");
      } else conTabla(r.filas, archivo.name);
    } catch (e) {
      setError(e?.message || "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  };

  const conIA = async ({ imagenes, textoPegado }) => {
    setError(null);
    setPaso("ia");
    const ctl = new AbortController();
    ctlRef.current = ctl;
    try {
      const r = await sample.json(
        `Extrae los movimientos bancarios ${imagenes ? "de estas capturas de pantalla" : "de este texto"} de una app o web de banco español (Revolut o Ruralvía).
Responde SOLO con un array JSON de objetos {"fecha": "AAAA-MM-DD", "concepto": "texto tal cual aparece", "importe": número con signo (negativo si es un cargo, pago o compra; positivo si es un ingreso o abono)}. Añade "saldo": número solo si aparece el saldo después de ese movimiento.
No inventes movimientos ni cifras: si algo no se lee bien, omite ese movimiento. Si una fecha no lleva año, usa el más reciente que no sea posterior a ${hoyISO()}. Si aparece "Hoy" o "Ayer", calcula la fecha a partir de ${hoyISO()}.${textoPegado ? `\n\nTEXTO:\n${textoPegado.slice(0, 60000)}` : ""}`,
        { images: imagenes, modelTier: "default", signal: ctl.signal },
      );
      const movs = (Array.isArray(r) ? r : [])
        .map((x) => ({ fecha: aFecha(x?.fecha), concepto: String(x?.concepto ?? "").trim() || "Movimiento", importe: aNumero(x?.importe), saldo: aNumero(x?.saldo) }))
        .filter((x) => x.fecha && x.importe)
        .map((x) => ({ ...x, importe: redondear(x.importe) }));
      if (!movs.length) {
        setError("La IA no encontró movimientos legibles. Prueba con otras capturas o con el archivo del banco.");
        setPaso("elegir");
        return;
      }
      const ultimo = movs.filter((m) => m.saldo !== null).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      setFuente({ nombre: imagenes ? `${imagenes.length} capturas` : "Texto pegado", formato: "ia" });
      setLectura({ movs, omitidos: { pendientes: 0, divisas: 0, huchas: 0, invalidos: 0 }, saldo: null, saldoSugerido: ultimo ? { valor: redondear(ultimo.saldo), fecha: ultimo.fecha } : null });
      setPaso("revisar");
    } catch (e) {
      if (e?.code === "cancelled") return setPaso("elegir");
      setError(
        e?.code === "not_granted"
          ? "Sin permiso para usar la IA en esta página."
          : e?.code === "rate_limited"
            ? "Has usado mucho la IA en poco tiempo. Prueba en un rato."
            : "La IA no pudo leer los movimientos. Prueba de nuevo o usa el archivo del banco.",
      );
      setPaso("elegir");
    }
  };

  const leerTexto = () => {
    const filas = trocearCSV(texto.trim());
    if (analizarTabla(filas)) conTabla(filas, "Texto pegado");
    else if (sample) conIA({ textoPegado: texto });
    else if (filas.length) conTabla(filas, "Texto pegado");
    else setError("No hay movimientos en el texto.");
  };

  if (paso === "ia") {
    return (
      <div className="grid grid-cols-1 place-items-center gap-3 py-10 text-center">
        <Sparkles className="size-8 text-violet-600 motion-safe:animate-pulse" />
        <p className="font-extrabold">La IA está leyendo tus movimientos…</p>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">Puede tardar hasta un minuto. Después podrás revisarlos antes de importarlos.</p>
        <button type="button" onClick={() => ctlRef.current?.abort()} className={botonSuave}>
          Cancelar
        </button>
      </div>
    );
  }

  if (paso === "columnas" && tabla) {
    return (
      <MapearColumnas
        tabla={tabla}
        setTabla={setTabla}
        onVolver={() => setPaso("elegir")}
        onContinuar={(mapa, cabecera) => {
          const r = filasAMovimientos(tabla.filas, cabecera, mapa);
          if (!r.movs.length) return setError("Con esas columnas no sale ningún movimiento. Revisa cuál es la fecha y cuál el importe.");
          setError(null);
          setLectura(r);
          setCuenta(adivinarCuenta(fuente?.nombre ?? "", null, datos.base.cuentas));
          setPaso("revisar");
        }}
        error={error}
      />
    );
  }

  if (paso === "revisar" && lectura) {
    return <Revisar datos={datos} fuente={fuente} lectura={lectura} cuenta={cuenta} setCuenta={setCuenta} onVolver={() => setPaso("elegir")} onImportar={onImportar} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {error && (
        <p role="alert" className="flex gap-2 rounded-2xl bg-rose-50 p-3.5 text-sm font-semibold text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      {paso === "texto" ? (
        <>
          <label htmlFor="texto-pegado" className="text-sm font-bold">
            Pega aquí los movimientos (seleccionados y copiados de la web o la app del banco)
          </label>
          <textarea
            id="texto-pegado"
            autoFocus
            rows={9}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} resize-y font-mono text-xs`}
            placeholder={"09/10/2026  COMPRA TARJ. MERCADONA  -32,45  1.204,10\n…"}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={leerTexto} disabled={!texto.trim()} className={botonPrincipal}>
              {sample ? "Leer movimientos" : "Continuar"}
            </button>
            <button type="button" onClick={() => setPaso("elegir")} className={botonSuave}>
              Volver
            </button>
          </div>
          {!sample && <p className="text-xs text-slate-500 dark:text-slate-400">Si la app no reconoce las columnas, te pedirá que digas cuál es la fecha, el concepto y el importe.</p>}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => archivoRef.current?.click()}
            disabled={leyendo}
            className={`flex items-center gap-3 rounded-2xl bg-violet-600 p-4 text-left text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 disabled:opacity-60 ${foco}`}
          >
            <FileSpreadsheet className="size-7 shrink-0" />
            <span>
              <span className="block font-extrabold">{leyendo ? "Leyendo el archivo…" : "Archivo del banco"}</span>
              <span className="block text-sm text-violet-100">CSV o Excel de Revolut y Ruralvía, o Norma 43</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaso("texto")}
            className={`flex items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 hover:ring-violet-300 dark:bg-white/5 dark:ring-white/10 ${foco}`}
          >
            <ClipboardPaste className="size-7 shrink-0 text-violet-600 dark:text-violet-400" />
            <span>
              <span className="block font-extrabold">Pegar movimientos</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">Copia la lista de movimientos de la web o de la app y pégala</span>
            </span>
          </button>
          {sample && imagenesIA && (
            <button
              type="button"
              onClick={() => capturasRef.current?.click()}
              className={`flex items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 hover:ring-violet-300 dark:bg-white/5 dark:ring-white/10 ${foco}`}
            >
              <Camera className="size-7 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>
                <span className="block font-extrabold">Capturas de pantalla (IA)</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">Haz capturas de la lista de movimientos en la app y la IA los lee. Los revisas antes de importar.</span>
              </span>
            </button>
          )}
          <input
            ref={archivoRef}
            type="file"
            accept=".csv,.txt,.tsv,.xls,.xlsx,.ods,.n43,.aeb,.q43,.csb,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) leer(f);
              e.target.value = "";
            }}
          />
          <input
            ref={capturasRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const fs = [...(e.target.files ?? [])].slice(0, 10);
              if (fs.length) conIA({ imagenes: fs });
              e.target.value = "";
            }}
          />
          <details className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
            <summary className="cursor-pointer font-extrabold">Cómo descargar tus movimientos</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 text-slate-600 dark:text-slate-300">
              <p>
                <strong className="font-extrabold text-slate-900 dark:text-white">Revolut:</strong> en la app, abre tu cuenta en euros y busca «Extracto». Elige el formato Excel o CSV y el periodo, y
                guárdalo o compártelo para subirlo aquí. Los movimientos pendientes, los de otras divisas y los de las huchas no se importan.
              </p>
              <p>
                <strong className="font-extrabold text-slate-900 dark:text-white">Ruralvía:</strong> en ruralvia.com, entra en la cuenta, abre los movimientos, elige las fechas y usa la opción de
                descargar o exportar (Excel o Norma 43). Si solo tienes la app del móvil, haz capturas de la lista o cópiala y pégala.
              </p>
              <p>Puedes importar periodos que se solapen: los movimientos que ya estaban no se repiten.</p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function MapearColumnas({ tabla, setTabla, onVolver, onContinuar, error }) {
  const columnas = Math.max(...tabla.filas.slice(0, 20).map((f) => f.length));
  const muestra = tabla.filas.slice(Math.max(0, tabla.inicio - 1), tabla.inicio + 5);
  const usado = Object.values(tabla.mapa);
  const listo = usado.includes("fecha") && (usado.includes("importe") || usado.includes("cargo") || usado.includes("abono"));
  const continuar = () => {
    const mapa = { concepto: [] };
    for (const [col, rol] of Object.entries(tabla.mapa)) {
      if (!rol) continue;
      if (rol === "concepto") mapa.concepto.push(Number(col));
      else mapa[rol] ??= Number(col);
    }
    onContinuar(mapa, tabla.inicio - 2);
  };
  return (
    <div className="grid grid-cols-1 gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">No reconozco las columnas de este archivo. Dime qué es cada una (como mínimo la fecha y el importe):</p>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">{error}</p>}
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="fila-inicio" className="font-bold">
          Los movimientos empiezan en la fila
        </label>
        <select
          id="fila-inicio"
          value={tabla.inicio}
          onChange={(e) => setTabla({ ...tabla, inicio: Number(e.target.value) })}
          className="rounded-lg bg-slate-50 px-2 py-1.5 font-bold ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10"
        >
          {Array.from({ length: Math.min(30, tabla.filas.length) }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 dark:ring-white/10">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {Array.from({ length: columnas }, (_, j) => (
                <th key={j} className="bg-slate-50 p-1.5 dark:bg-white/5">
                  <label htmlFor={`rol-${j}`} className="sr-only">
                    Columna {j + 1}
                  </label>
                  <select
                    id={`rol-${j}`}
                    value={tabla.mapa[j] ?? ""}
                    onChange={(e) => setTabla({ ...tabla, mapa: { ...tabla.mapa, [j]: e.target.value } })}
                    className="w-full min-w-24 rounded-md bg-white px-1.5 py-1 font-bold ring-1 ring-slate-200 dark:bg-[#1b1830] dark:ring-white/10"
                  >
                    {ROLES_MANUALES.map((r) => (
                      <option key={r} value={r}>
                        {r ? NOMBRES_ROL[r] : "Ignorar"}
                      </option>
                    ))}
                  </select>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {muestra.map((f, i) => (
              <tr key={i} className="border-t border-slate-100 dark:border-white/5">
                {Array.from({ length: columnas }, (_, j) => (
                  <td key={j} className="max-w-48 truncate p-1.5 whitespace-nowrap">
                    {f[j] instanceof Date ? f[j].toLocaleDateString("es-ES") : String(f[j] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={continuar} disabled={!listo} className={botonPrincipal}>
          Continuar
        </button>
        <button type="button" onClick={onVolver} className={botonSuave}>
          Volver
        </button>
      </div>
    </div>
  );
}

function Revisar({ datos, fuente, lectura, cuenta, setCuenta, onVolver, onImportar }) {
  const [usarSaldo, setUsarSaldo] = useState(true);
  const prep = useMemo(() => prepararImportacion(lectura.movs, cuenta, datos), [lectura, cuenta, datos]);
  const cats = Object.fromEntries(datos.base.categorias.map((c) => [c.id, c]));
  const fechas = prep.nuevos.map((m) => m.fecha);
  const saldo = lectura.saldo ?? (usarSaldo ? lectura.saldoSugerido : null);
  const omitidos = Object.entries(lectura.omitidos).filter(([, n]) => n);
  const textosOmitidos = { pendientes: "pendientes o rechazados", divisas: "en otra divisa", huchas: "de huchas", invalidos: "filas sin fecha o importe" };
  const sinCat = prep.nuevos.filter((m) => !m.categoria).length;
  const mbN = prep.nuevos.filter((m) => cats[m.categoria]?.tipo === "mb").length;
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl bg-slate-50 p-4 text-sm dark:bg-white/5">
        <p className="font-extrabold">{fuente?.nombre}</p>
        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
          {{ revolut: "Extracto de Revolut", norma43: "Norma 43", ia: "Leído con IA: revisa que los importes y las fechas estén bien", tabla: "Tabla de movimientos" }[fuente?.formato] ?? ""}
        </p>
      </div>
      <div>
        <label htmlFor="imp-cuenta" className={etiqueta}>
          ¿De qué cuenta son?
        </label>
        <select id="imp-cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={campo}>
          {datos.base.cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato etiqueta="Nuevos" valor={prep.nuevos.length} />
        <Dato etiqueta="Ya estaban" valor={prep.duplicados} />
        <Dato etiqueta="Matched betting" valor={mbN} />
        <Dato etiqueta="Sin categoría" valor={sinCat} />
      </div>
      {fechas.length > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {fechas[0] === fechas.at(-1) ? `El ${fechaCorta(fechas[0])}` : `Del ${fechaCorta(fechas[0])} al ${fechaCorta(fechas.at(-1))}`} de {fechas.at(-1).slice(0, 4)}.
          {lectura.saldo && ` Saldo al final del extracto: ${eur(lectura.saldo.valor)}.`}
        </p>
      )}
      {lectura.saldoSugerido && (
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={usarSaldo} onChange={(e) => setUsarSaldo(e.target.checked)} className="size-4 accent-violet-600" />
          Usar el saldo que aparece en las capturas ({eur(lectura.saldoSugerido.valor)} el {fechaCorta(lectura.saldoSugerido.fecha)})
        </label>
      )}
      {omitidos.length > 0 && <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No se importan: {omitidos.map(([k, n]) => `${n} ${textosOmitidos[k]}`).join(", ")}.</p>}
      {prep.nuevos.length > 0 && (
        <Tarjeta className="max-h-80 overflow-y-auto px-3 py-1">
          <ul>
            {[...prep.nuevos]
              .reverse()
              .slice(0, 150)
              .map((m) => {
                const c = categoriaDe(m, cats);
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-white/5">
                    <span className="w-14 shrink-0 text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">{fechaCorta(m.fecha)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{m.concepto}</span>
                      <span className="text-xs font-semibold" style={{ color: c.id ? c.color : undefined }}>
                        {c.nombre}
                      </span>
                    </span>
                    <span className={`shrink-0 text-sm font-extrabold tabular-nums ${m.importe > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{conSigno(m.importe)}</span>
                  </li>
                );
              })}
          </ul>
        </Tarjeta>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onImportar({ nuevos: prep.nuevos, cuenta, saldo })} disabled={!prep.nuevos.length && !saldo} className={botonPrincipal}>
          {prep.nuevos.length ? `Importar ${nMovs(prep.nuevos.length)}` : "No hay nada nuevo"}
        </button>
        <button type="button" onClick={onVolver} className={botonSuave}>
          Volver
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── Matched betting ───────────────────────── */

function VistaMB({ base, mb, abrir, verMovimientos, hoyMes }) {
  let acumulado = 0;
  const puntos = mb.porMes.map((p) => ({ mes: p.mes, acumulado: (acumulado = redondear(acumulado + p.neto)) }));
  const esteMes = mb.porMes.find((p) => p.mes === hoyMes)?.neto ?? 0;
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex items-end justify-between gap-3 pt-2">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Matched betting</h1>
        <button type="button" onClick={() => verMovimientos({ tipo: "mb" })} className={botonChip}>
          Ver movimientos
        </button>
      </div>
      <section className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-amber-950 shadow-xl shadow-orange-500/20">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <Trophy className="size-4" /> Beneficio total
        </p>
        <p className="mt-1 text-[34px] leading-none font-extrabold tracking-tight tabular-nums">{conSigno(mb.beneficio)}</p>
        <p className="mt-2 text-sm font-bold">Este mes: {conSigno(esteMes)}</p>
      </section>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Dato etiqueta="Depositado en casas" valor={eur(mb.depositado)} />
        <Dato etiqueta="Retirado de casas" valor={eur(mb.retirado)} />
        <Dato etiqueta="Herramientas" valor={eur(mb.herramientas)} />
        <Dato etiqueta="Saldo en casas" valor={eur(mb.saldoCasas)} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Beneficio = retirado − depositado − herramientas + saldo que tienes ahora en las casas − saldo que tenías al empezar. Actualiza el saldo de cada casa para que salga exacto.
      </p>
      {puntos.length > 1 && (
        <Tarjeta className="p-5">
          <Titulo>Beneficio acumulado</Titulo>
          <div className="mt-3">
            <LineaAcumulada puntos={puntos} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Solo cuenta lo que ha entrado y salido de tus cuentas, sin el saldo de las casas.</p>
        </Tarjeta>
      )}
      <Tarjeta className="p-5">
        <Titulo
          accion={
            <button type="button" onClick={() => abrir("casa-nueva")} className={botonChip}>
              <Plus className="size-3.5" strokeWidth={3} /> Casa
            </button>
          }
        >
          Por casa de apuestas
        </Titulo>
        {mb.casas.length ? (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {mb.casas.map((c) => (
              <li key={c.id ?? "sin"}>
                <button
                  type="button"
                  disabled={!c.id}
                  onClick={() => c.id && abrir({ casa: c.id })}
                  className={`flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left hover:bg-slate-50 disabled:hover:bg-transparent dark:hover:bg-white/5 ${foco}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                    <Dices className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{c.nombre}</span>
                    <span className="block text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      −{eur(c.depositado)} · +{eur(c.retirado)}
                      {c.saldo ? ` · saldo ${eur(c.saldo)}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 text-sm font-extrabold tabular-nums ${c.neto >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {conSigno(c.neto)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Cuando importes movimientos con depósitos o retiradas de casas de apuestas, aparecerán aquí. Reconoce {base.casas.length} casas por su nombre; puedes añadir más.
          </p>
        )}
      </Tarjeta>
      {mb.porMes.length > 0 && (
        <Tarjeta className="p-5">
          <Titulo>Por mes</Titulo>
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {[...mb.porMes].reverse().map((p) => (
              <li key={p.mes} className="flex items-center justify-between py-2 text-sm">
                <span className="font-bold">{nombreMes(p.mes)}</span>
                <span className={`font-extrabold tabular-nums ${p.neto >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{conSigno(p.neto)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

function FormCasa({ casa, onGuardar, onBorrar }) {
  const [nombre, setNombre] = useState(casa?.nombre ?? "");
  const [claves, setClaves] = useState((casa?.claves ?? []).join(", "));
  const [saldo, setSaldo] = useState(casa?.saldo ? String(casa.saldo).replace(".", ",") : "");
  const [saldoInicial, setSaldoInicial] = useState(casa?.saldoInicial ? String(casa.saldoInicial).replace(".", ",") : "");
  const lista = claves
    .split(",")
    .map((k) => normalizar(k))
    .filter(Boolean);
  const valido = nombre.trim() && (lista.length || normalizar(nombre));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valido) return;
        onGuardar({
          id: casa?.id ?? `${normalizar(nombre).replace(/ /g, "-")}-${nuevoId().slice(0, 4)}`,
          nombre: nombre.trim(),
          claves: lista.length ? lista : [normalizar(nombre)],
          saldo: aNumero(saldo) ?? 0,
          saldoInicial: aNumero(saldoInicial) ?? 0,
        });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="casa-nombre" className={etiqueta}>
          Nombre
        </label>
        <input id="casa-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="casa-claves" className={etiqueta}>
          Cómo aparece en el banco (separado por comas)
        </label>
        <input id="casa-claves" value={claves} onChange={(e) => setClaves(e.target.value)} placeholder="bet365, bet 365" className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="casa-saldo" className={etiqueta}>
            Saldo ahora en la casa
          </label>
          <CampoImporte id="casa-saldo" valor={saldo} setValor={setSaldo} />
        </div>
        <div>
          <label htmlFor="casa-inicial" className={etiqueta}>
            Saldo que tenías al empezar
          </label>
          <CampoImporte id="casa-inicial" valor={saldoInicial} setValor={setSaldoInicial} />
        </div>
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar
      </button>
      {onBorrar && (
        <button
          type="button"
          onClick={onBorrar}
          className={`rounded-2xl py-2 text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 ${foco}`}
        >
          Quitar esta casa
        </button>
      )}
    </form>
  );
}

/* ───────────────────────── Ahorro ───────────────────────── */

function VistaAhorro({ base, movimientos, cats, hoyMes, mes, setMes, resumen, fijos, cambiarBase, abrir }) {
  const [objetivo, setObjetivo] = useState(base.objetivoAhorro ? String(base.objetivoAhorro).replace(".", ",") : "");
  const hayPrevio = movimientos.some((m) => m.fecha.startsWith(mesAnterior(mes)));
  const gastoPrevio = Object.fromEntries(resumenMes(movimientos, cats, mesAnterior(mes)).gastosPorCategoria.map((c) => [c.id, c.total]));
  const gastado = Object.fromEntries(resumen.gastosPorCategoria.map((c) => [c.id, c.total]));
  const top = topComercios(movimientos, cats, mes);
  const totalFijos = redondear(fijos.reduce((s, f) => s + f.importe, 0));
  const fijarPresupuesto = (id, valor) => cambiarBase((b) => ({ ...b, categorias: b.categorias.map((c) => (c.id === id ? { ...c, presupuesto: valor || undefined } : c)) }));
  return (
    <div className="grid grid-cols-1 gap-4">
      <h1 className="pt-2 text-[26px] leading-tight font-extrabold tracking-tight">Ahorro</h1>
      <SelectorMes mes={mes} setMes={setMes} hoyMes={hoyMes} />

      <Tarjeta className="p-5">
        <Titulo>Objetivo de ahorro mensual</Titulo>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            cambiarBase((b) => ({ ...b, objetivoAhorro: aNumero(objetivo) || null }));
          }}
          className="mt-3 flex gap-2"
        >
          <label htmlFor="objetivo" className="sr-only">
            Objetivo de ahorro al mes
          </label>
          <div className="flex-1">
            <CampoImporte id="objetivo" valor={objetivo} setValor={setObjetivo} placeholder="Por ejemplo 200" />
          </div>
          <button type="submit" className={`shrink-0 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white hover:bg-violet-700 ${foco}`}>
            Guardar
          </button>
        </form>
        {base.objetivoAhorro > 0 && (
          <div className="mt-3">
            <Barra valor={resumen.ahorro / base.objetivoAhorro} color="#10b981" alto="h-3" />
            <p className="mt-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Este mes: {conSigno(resumen.ahorro)} de {eur(base.objetivoAhorro)}
            </p>
          </div>
        )}
      </Tarjeta>

      <Tarjeta className="p-5">
        <Titulo>Presupuestos por categoría</Titulo>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pon un límite al mes y la app te avisa cuando te pases. La flecha compara con el mes anterior.</p>
        <ul className="mt-3 grid grid-cols-1 gap-3">
          {base.categorias
            .filter((c) => c.tipo === "gasto")
            .map((c) => {
              const g = gastado[c.id] ?? 0;
              const antes = gastoPrevio[c.id] ?? 0;
              return (
                <li key={c.id}>
                  <div className="flex items-center gap-2">
                    <IconoCategoria cat={c} tam="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.nombre}</span>
                      <span className="block text-xs text-slate-500 tabular-nums dark:text-slate-400">
                        {eur(g)}
                        {hayPrevio && (antes || g) ? (
                          <span className={g > antes ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {" "}
                            {g > antes ? "↑" : g < antes ? "↓" : "="} {eur(antes)} el mes anterior
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <label htmlFor={`pres-${c.id}`} className="sr-only">
                      Presupuesto de {c.nombre}
                    </label>
                    <input
                      id={`pres-${c.id}`}
                      inputMode="decimal"
                      defaultValue={c.presupuesto ? String(c.presupuesto).replace(".", ",") : ""}
                      onBlur={(e) => fijarPresupuesto(c.id, aNumero(e.target.value))}
                      placeholder="Sin límite"
                      className="w-24 rounded-lg bg-slate-50 px-2 py-1.5 text-right text-sm font-bold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10"
                    />
                  </div>
                  {c.presupuesto ? (
                    <div className="mt-1.5 pl-10">
                      <Barra valor={g / c.presupuesto} color={g > c.presupuesto ? "#e11d48" : g >= c.presupuesto * 0.9 ? "#f59e0b" : "#10b981"} alto="h-1.5" />
                    </div>
                  ) : null}
                </li>
              );
            })}
        </ul>
      </Tarjeta>

      <Tarjeta className="p-5">
        <Titulo
          accion={
            <button type="button" onClick={() => abrir("meta-nueva")} className={botonChip}>
              <Plus className="size-3.5" strokeWidth={3} /> Meta
            </button>
          }
        >
          Metas de ahorro
        </Titulo>
        {base.metas.length ? (
          <ul className="mt-3 grid grid-cols-1 gap-3">
            {base.metas.map((m) => {
              const p = m.objetivo ? m.ahorrado / m.objetivo : 0;
              return (
                <li key={m.id} className="rounded-2xl bg-slate-50 p-3.5 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <Target className="size-5 shrink-0 text-violet-600 dark:text-violet-400" />
                    <span className="min-w-0 flex-1 truncate font-extrabold">{m.nombre}</span>
                    <BotonBorrar onClick={() => cambiarBase((b) => ({ ...b, metas: b.metas.filter((x) => x.id !== m.id) }))} etiqueta={`Borrar la meta ${m.nombre}`} />
                  </div>
                  <div className="mt-2">
                    <Barra valor={p} color="#10b981" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">
                      {eur(m.ahorrado)} de {eur(m.objetivo)} ({Math.round(p * 100)} %){m.fecha ? ` · para el ${fechaCorta(m.fecha)}` : ""}
                    </span>
                    <button type="button" onClick={() => abrir({ aportar: m.id })} className={botonChip}>
                      Aportar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Crea una meta (un viaje, un colchón para imprevistos…) y ve apuntando lo que apartas.</p>
        )}
      </Tarjeta>

      <Tarjeta className="p-5">
        <Titulo accion={totalFijos ? <span className="text-sm font-extrabold tabular-nums">{eur(totalFijos)}/mes</span> : null}>Gastos fijos y suscripciones</Titulo>
        {fijos.length ? (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {fijos.map((f) => (
              <li key={f.nombre} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{f.nombre}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {f.veces} cargos · próximo hacia el {fechaCorta(f.proxima)}
                  </span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">{eur(f.importe)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aparecen solos cuando un gasto se repite cada mes con un importe parecido.</p>
        )}
      </Tarjeta>

      <Tarjeta className="p-5">
        <Titulo>Dónde más gastas este mes</Titulo>
        {top.length ? (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {top.map((t) => (
              <li key={t.nombre} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="truncate font-bold">{t.nombre}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">×{t.veces}</span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">{eur(t.total)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No hay gastos este mes.</p>
        )}
      </Tarjeta>
    </div>
  );
}

function FormMeta({ hoy, onCrear }) {
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [ahorrado, setAhorrado] = useState("");
  const [fecha, setFecha] = useState("");
  const valido = nombre.trim() && aNumero(objetivo) > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onCrear({ nombre: nombre.trim(), objetivo: aNumero(objetivo), ahorrado: aNumero(ahorrado) ?? 0, fecha: fecha || null });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="meta-nombre" className={etiqueta}>
          Nombre
        </label>
        <input id="meta-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="meta-objetivo" className={etiqueta}>
            ¿Cuánto necesitas?
          </label>
          <CampoImporte id="meta-objetivo" valor={objetivo} setValor={setObjetivo} />
        </div>
        <div>
          <label htmlFor="meta-ahorrado" className={etiqueta}>
            ¿Cuánto tienes ya?
          </label>
          <CampoImporte id="meta-ahorrado" valor={ahorrado} setValor={setAhorrado} />
        </div>
      </div>
      <div>
        <label htmlFor="meta-fecha" className={etiqueta}>
          ¿Para cuándo? (opcional)
        </label>
        <input id="meta-fecha" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Crear meta
      </button>
    </form>
  );
}

function FormAporte({ meta, onAportar }) {
  const [importe, setImporte] = useState("");
  const n = aNumero(importe);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (n) onAportar(n);
      }}
      className="grid grid-cols-1 gap-4"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Llevas {eur(meta.ahorrado)} de {eur(meta.objetivo)}. Para restar, escribe un importe negativo.
      </p>
      <div>
        <label htmlFor="aporte" className={etiqueta}>
          Importe
        </label>
        <CampoImporte id="aporte" valor={importe} setValor={setImporte} autoFocus />
      </div>
      <button type="submit" disabled={!n} className={botonPrincipal}>
        Guardar
      </button>
    </form>
  );
}

/* ───────────────────────── Chat IA ───────────────────────── */

function contextoIA({ base, movimientos, cats, hoy, mb, fijos }) {
  const meses = [...new Set(movimientos.map((m) => m.fecha.slice(0, 7)))].sort().slice(-6);
  const resumenes = meses.map((mes) => {
    const r = resumenMes(movimientos, cats, mes);
    return {
      mes,
      ingresos: r.ingresos,
      gastos: r.gastos,
      matchedBettingNeto: r.mb,
      ahorro: r.ahorro,
      gastosPorCategoria: Object.fromEntries(r.gastosPorCategoria.map((c) => [c.nombre, c.total])),
      ingresosPorCategoria: Object.fromEntries(r.ingresosPorCategoria.map((c) => [c.nombre, c.total])),
    };
  });
  const mesActual = hoy.slice(0, 7);
  return JSON.stringify({
    hoy,
    cuentas: base.cuentas.map((c) => ({ nombre: c.nombre, saldoHoy: c.saldoRef === null || c.saldoRef === undefined ? null : saldoEn(c, movimientos, hoy) })),
    meses: resumenes,
    presupuestos: base.categorias
      .filter((c) => c.presupuesto)
      .map((c) => ({ categoria: c.nombre, presupuestoMensual: c.presupuesto, gastadoEsteMes: resumenMes(movimientos, cats, mesActual).gastosPorCategoria.find((g) => g.id === c.id)?.total ?? 0 })),
    objetivoAhorroMensual: base.objetivoAhorro,
    metas: base.metas.map((m) => ({ nombre: m.nombre, objetivo: m.objetivo, ahorrado: m.ahorrado, fecha: m.fecha })),
    matchedBetting: {
      beneficioTotal: mb.beneficio,
      depositado: mb.depositado,
      retirado: mb.retirado,
      herramientas: mb.herramientas,
      saldoEnCasas: mb.saldoCasas,
      porCasa: mb.casas.map((c) => ({ casa: c.nombre, depositado: c.depositado, retirado: c.retirado, neto: c.neto })),
      porMes: mb.porMes.slice(-12),
    },
    gastosFijos: fijos.map((f) => ({ nombre: f.nombre, importe: f.importe, proxima: f.proxima })),
    dondeMasGastaEsteMes: topComercios(movimientos, cats, mesActual),
    ultimosMovimientos: [...movimientos]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 150)
      .map((m) => [m.fecha, base.cuentas.find((c) => c.id === m.cuenta)?.nombre ?? m.cuenta, m.concepto, m.importe, categoriaDe(m, cats).nombre]),
  });
}

// Sin IA (fuera de claude.ai) el chat responde con reglas sencillas a partir de los mismos datos.
function responderSinIA(pregunta, { movimientos, cats, hoy, mb, fijos }) {
  const q = normalizar(pregunta);
  const mes = hoy.slice(0, 7);
  const r = resumenMes(movimientos, cats, mes);
  if (!movimientos.length) return "Aún no hay movimientos. Importa tus extractos con el botón de subir de arriba.";
  if (/matched|apuesta|casa|mb|bet/.test(q))
    return `Con el matched betting llevas **${conSigno(mb.beneficio)}** en total (${conSigno(r.mb)} este mes). Has depositado ${eur(mb.depositado)} y retirado ${eur(mb.retirado)}.`;
  if (/ahorr/.test(q))
    return `Este mes ahorras **${conSigno(r.ahorro)}**: ingresos ${eur(r.ingresos)}, gastos ${eur(r.gastos)} y matched betting ${conSigno(r.mb)}.${r.gastosPorCategoria[0] ? ` Donde más gastas es ${r.gastosPorCategoria[0].nombre} (${eur(r.gastosPorCategoria[0].total)}).` : ""}`;
  if (/fijo|suscrip|recibo/.test(q))
    return fijos.length
      ? `Tus gastos fijos suman **${eur(fijos.reduce((s, f) => s + f.importe, 0))} al mes**:\n${fijos.map((f) => `• ${f.nombre}: ${eur(f.importe)}`).join("\n")}`
      : "No he detectado gastos que se repitan cada mes.";
  const cat = Object.values(cats).find((c) => q.includes(normalizar(c.nombre).split(" ")[0]));
  if (cat) {
    const g = [...r.gastosPorCategoria, ...r.ingresosPorCategoria].find((c) => c.id === cat.id);
    return `En **${cat.nombre}** llevas ${eur(g?.total ?? 0)} este mes.`;
  }
  return `Este mes: ingresos **${eur(r.ingresos)}**, gastos **${eur(r.gastos)}**, matched betting ${conSigno(r.mb)} y ahorro ${conSigno(r.ahorro)}.${r.gastosPorCategoria
    .slice(0, 3)
    .map((c, i) => `${i ? "," : " Donde más gastas:"} ${c.nombre} (${eur(c.total)})`)
    .join("")}.`;
}

const SUGERENCIAS = ["¿En qué gasto más este mes?", "¿Cuánto llevo ganado con el matched betting?", "¿Cómo puedo ahorrar más?", "Compara este mes con el anterior"];

function VistaChat(v) {
  const { sample, hoy } = v;
  const [chat, setChat] = useState([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const ctlRef = useRef(null);
  const finRef = useRef();
  const vRef = useRef(v);
  vRef.current = v;

  useEffect(() => {
    if (chat.length) finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, pensando]);
  useEffect(() => () => ctlRef.current?.abort(), []);

  const enviar = async (pregunta) => {
    const p = pregunta.trim();
    if (!p || pensando) return;
    const turnos = [...chat, { de: "yo", texto: p }];
    setChat([...turnos, { de: "ia", texto: "" }]);
    setTexto("");
    setPensando(true);
    if (!sample) {
      setTimeout(() => {
        setChat([...turnos, { de: "ia", texto: responderSinIA(p, vRef.current) }]);
        setPensando(false);
      }, 400);
      return;
    }
    const ctl = new AbortController();
    ctlRef.current = ctl;
    const instrucciones = `Eres el asesor financiero personal de Diego, que vive en España. Respondes en español de España, claro y breve (6-8 líneas como mucho salvo que pida detalle), con cifras en euros en formato español (1.234,56 €). Puedes usar **negritas** y viñetas con «•».
Usa SOLO los datos de abajo, que salen de sus extractos de Revolut (sobre todo matched betting) y Ruralvía (gastos del día a día). Si un dato no está, dilo; no lo inventes.
Contexto: "matched betting" son depósitos y retiradas en casas de apuestas; su beneficio es retirado − depositado − herramientas + saldo en casas. Los traspasos entre sus cuentas no son gasto ni ingreso. El ahorro de un mes es ingresos − gastos + matched betting.
DATOS (JSON):
${contextoIA(vRef.current)}`;
    try {
      const { text } = await sample([{ role: "user", content: instrucciones }, ...turnos.slice(-10).map((t) => ({ role: t.de === "yo" ? "user" : "assistant", content: t.texto || "…" }))], {
        cache: false,
        signal: ctl.signal,
        onText: ({ text: t }) => setChat([...turnos, { de: "ia", texto: t }]),
      });
      setChat([...turnos, { de: "ia", texto: text }]);
    } catch (e) {
      const parcial = e?.text ?? "";
      const motivo =
        e?.code === "cancelled"
          ? ""
          : e?.code === "not_granted"
            ? "No hay permiso para usar la IA en esta página."
            : e?.code === "rate_limited"
              ? "Has usado mucho la IA en poco tiempo; prueba en un rato."
              : "La IA no está disponible ahora. Prueba de nuevo.";
      setChat([...turnos, { de: "ia", texto: [parcial, motivo].filter(Boolean).join("\n\n") || "Cancelado." }]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="pt-2 pb-3">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Chat IA</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {sample ? "Pregunta lo que quieras sobre tus cuentas. Responde con tus datos." : "Sin conexión con la IA: respuestas sencillas con tus datos."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3" aria-live="polite">
        {chat.map((m, i) =>
          m.de === "yo" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-violet-600 px-4 py-2.5 text-[15px] font-semibold text-white">
              {m.texto}
            </div>
          ) : (
            <div key={i} className="flex max-w-[94%] gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 rounded-3xl rounded-tl-lg bg-white px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line shadow-sm ring-1 ring-slate-900/5 dark:bg-[#171427] dark:ring-white/10">
                {m.texto ? <Rico texto={m.texto} /> : <span className="text-slate-400 motion-safe:animate-pulse">Pensando…</span>}
              </div>
            </div>
          ),
        )}
        <div ref={finRef} />
      </div>
      <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom,0px))] mt-4 -mx-1 bg-[var(--page)] px-1 pt-2 pb-3">
        {!chat.length && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => enviar(s)}
                className={`shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 dark:bg-[#171427] dark:text-violet-300 dark:ring-violet-500/30 ${foco}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
          className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/10 focus-within:ring-2 focus-within:ring-violet-500 dark:bg-[#171427] dark:ring-white/10"
        >
          <label htmlFor="chat-texto" className="sr-only">
            Escribe tu pregunta
          </label>
          <input
            id="chat-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Pregunta sobre tus cuentas (hoy es ${fechaCorta(hoy)})`}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-slate-400"
          />
          {pensando && sample ? (
            <button
              type="button"
              onClick={() => ctlRef.current?.abort()}
              aria-label="Parar"
              className={`grid size-10 shrink-0 place-items-center rounded-xl bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200 ${foco}`}
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!texto.trim() || pensando}
              aria-label="Enviar"
              className={`grid size-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}
            >
              <Send className="size-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

/* ───────────────────────── Ajustes ───────────────────────── */

function Ajustes({ base, movimientos, hoy, cambiarBase, setDatos, donde, descargas, avisar }) {
  const [nuevaCuenta, setNuevaCuenta] = useState("");
  const [nuevaCat, setNuevaCat] = useState({ nombre: "", tipo: "gasto" });
  const [saldoEditando, setSaldoEditando] = useState(null); // { id, valor }
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const restaurarRef = useRef();
  const cats = Object.fromEntries(base.categorias.map((c) => [c.id, c]));
  const seccion = "rounded-3xl bg-slate-50 p-4 dark:bg-white/5";

  const exportarCSV = async () => {
    if (await ofrecerArchivo(descargas, `movimientos-${hoy}.csv`, aCSV(movimientos, base), "text/csv")) avisar("Movimientos exportados");
  };
  const copia = async () => {
    if (await ofrecerArchivo(descargas, `asesor-financiero-copia-${hoy}.json`, JSON.stringify({ app: "asesor-financiero", fecha: hoy, base, movimientos }), "application/json"))
      avisar("Copia descargada");
  };
  const restaurar = async (archivo) => {
    try {
      const j = JSON.parse(await archivo.text());
      if (j?.app !== "asesor-financiero" || !j.base || !Array.isArray(j.movimientos)) throw new Error();
      setDatos({ base: j.base, movimientos: j.movimientos });
      avisar(`Copia del ${j.fecha} restaurada: ${nMovs(j.movimientos.length)}`);
    } catch {
      avisar("Ese archivo no es una copia de esta app", "alerta");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <section className={seccion}>
        <h3 className="font-extrabold">Cuentas</h3>
        <ul className="mt-2 grid grid-cols-1 gap-2">
          {base.cuentas.map((c) => {
            const saldo = c.saldoRef === null || c.saldoRef === undefined ? null : saldoEn(c, movimientos, hoy);
            const usada = movimientos.some((m) => m.cuenta === c.id);
            return (
              <li key={c.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <div className="flex items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <label htmlFor={`cuenta-${c.id}`} className="sr-only">
                    Nombre de la cuenta
                  </label>
                  <input
                    id={`cuenta-${c.id}`}
                    defaultValue={c.nombre}
                    onBlur={(e) => e.target.value.trim() && cambiarBase((b) => ({ ...b, cuentas: b.cuentas.map((x) => (x.id === c.id ? { ...x, nombre: e.target.value.trim() } : x)) }))}
                    className="min-w-0 flex-1 bg-transparent font-bold outline-none"
                  />
                  {!usada && base.cuentas.length > 1 && (
                    <BotonBorrar onClick={() => cambiarBase((b) => ({ ...b, cuentas: b.cuentas.filter((x) => x.id !== c.id) }))} etiqueta={`Quitar la cuenta ${c.nombre}`} />
                  )}
                </div>
                {saldoEditando?.id === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = aNumero(saldoEditando.valor);
                      if (v === null) return;
                      cambiarBase((b) => ({ ...b, cuentas: b.cuentas.map((x) => (x.id === c.id ? { ...x, saldoRef: redondear(v), saldoFecha: hoy } : x)) }));
                      setSaldoEditando(null);
                    }}
                    className="mt-2 flex gap-2"
                  >
                    <label htmlFor={`saldo-${c.id}`} className="sr-only">
                      Saldo de hoy
                    </label>
                    <div className="flex-1">
                      <CampoImporte id={`saldo-${c.id}`} valor={saldoEditando.valor} setValor={(valor) => setSaldoEditando({ id: c.id, valor })} autoFocus />
                    </div>
                    <button type="submit" className={`shrink-0 rounded-xl bg-violet-600 px-3 text-sm font-bold text-white ${foco}`}>
                      Guardar
                    </button>
                  </form>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {saldo === null ? "Sin saldo" : `Saldo hoy: ${eur(saldo)}`}
                      {c.saldoFecha && saldo !== null && c.saldoFecha !== hoy ? ` (según el extracto del ${fechaCorta(c.saldoFecha)})` : ""}
                    </span>
                    <button type="button" onClick={() => setSaldoEditando({ id: c.id, valor: saldo === null ? "" : String(saldo).replace(".", ",") })} className={botonChip}>
                      Ajustar saldo
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevaCuenta.trim()) return;
            cambiarBase((b) => ({
              ...b,
              cuentas: [...b.cuentas, { id: `cuenta-${nuevoId()}`, nombre: nuevaCuenta.trim(), color: PALETA[b.cuentas.length % PALETA.length], saldoRef: null, saldoFecha: null }],
            }));
            setNuevaCuenta("");
          }}
          className="mt-2 flex gap-2"
        >
          <label htmlFor="nueva-cuenta" className="sr-only">
            Nueva cuenta
          </label>
          <input id="nueva-cuenta" value={nuevaCuenta} onChange={(e) => setNuevaCuenta(e.target.value)} placeholder="Otra cuenta (por ejemplo, Efectivo)" className={campo} />
          <button type="submit" disabled={!nuevaCuenta.trim()} className={`shrink-0 ${botonSuave}`}>
            Añadir
          </button>
        </form>
      </section>

      <section className={seccion}>
        <h3 className="font-extrabold">Categorías</h3>
        {TIPOS.map((t) => (
          <div key={t.id} className="mt-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.nombre}</p>
            <ul className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {base.categorias
                .filter((c) => c.tipo === t.id)
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl bg-white px-2 py-1 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <label htmlFor={`cat-${c.id}`} className="sr-only">
                      Nombre de la categoría
                    </label>
                    <input
                      id={`cat-${c.id}`}
                      defaultValue={c.nombre}
                      onBlur={(e) => e.target.value.trim() && cambiarBase((b) => ({ ...b, categorias: b.categorias.map((x) => (x.id === c.id ? { ...x, nombre: e.target.value.trim() } : x)) }))}
                      className="min-w-0 flex-1 bg-transparent py-1 text-sm font-semibold outline-none"
                    />
                    {c.propia && (
                      <BotonBorrar
                        onClick={() => {
                          cambiarBase((b) => ({ ...b, categorias: b.categorias.filter((x) => x.id !== c.id), reglas: b.reglas.filter((r) => r.categoria !== c.id) }));
                          setDatos((d) => ({ ...d, movimientos: d.movimientos.map((m) => (m.categoria === c.id ? { ...m, categoria: null, manual: false } : m)) }));
                        }}
                        etiqueta={`Borrar la categoría ${c.nombre}`}
                      />
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!nuevaCat.nombre.trim()) return;
            cambiarBase((b) => ({
              ...b,
              categorias: [...b.categorias, { id: `cat-${nuevoId()}`, nombre: nuevaCat.nombre.trim(), tipo: nuevaCat.tipo, color: PALETA[b.categorias.length % PALETA.length], propia: true }],
            }));
            setNuevaCat({ nombre: "", tipo: nuevaCat.tipo });
          }}
          className="mt-3 flex flex-wrap gap-2"
        >
          <label htmlFor="nueva-cat" className="sr-only">
            Nueva categoría
          </label>
          <input
            id="nueva-cat"
            value={nuevaCat.nombre}
            onChange={(e) => setNuevaCat({ ...nuevaCat, nombre: e.target.value })}
            placeholder="Nueva categoría"
            className={`${campo} min-w-0 flex-[1_1_160px]`}
          />
          <label htmlFor="nueva-cat-tipo" className="sr-only">
            Tipo
          </label>
          <select id="nueva-cat-tipo" value={nuevaCat.tipo} onChange={(e) => setNuevaCat({ ...nuevaCat, tipo: e.target.value })} className={`${campo} w-auto`}>
            {TIPOS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!nuevaCat.nombre.trim()} className={botonSuave}>
            Añadir
          </button>
        </form>
      </section>

      <section className={seccion}>
        <h3 className="font-extrabold">Reglas de clasificación</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Se crean al cambiar la categoría de un movimiento. Tienen prioridad sobre la clasificación automática.</p>
        {base.reglas.length ? (
          <ul className="mt-2 grid grid-cols-1 gap-1">
            {base.reglas.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                <span className="min-w-0 flex-1 truncate">
                  «<strong className="font-extrabold">{r.clave}</strong>» → {cats[r.categoria]?.nombre ?? "categoría borrada"}
                </span>
                <BotonBorrar onClick={() => cambiarBase((b) => ({ ...b, reglas: b.reglas.filter((x) => x.id !== r.id) }))} etiqueta={`Borrar la regla ${r.clave}`} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Aún no hay reglas.</p>
        )}
      </section>

      <section className={seccion}>
        <h3 className="font-extrabold">Tus datos</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {donde === "cuenta"
            ? "Se guardan en la parte privada de tu cuenta de Claude: los ves igual en el móvil y en el ordenador, y nadie más puede verlos."
            : "Se guardan en este navegador. Descarga una copia de vez en cuando para no perderlos."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={exportarCSV} disabled={!movimientos.length} className={`flex items-center gap-1.5 ${botonSuave}`}>
            <Download className="size-4" /> Exportar a Excel (CSV)
          </button>
          <button type="button" onClick={copia} className={`flex items-center gap-1.5 ${botonSuave}`}>
            <Download className="size-4" /> Copia de seguridad
          </button>
          <button type="button" onClick={() => restaurarRef.current?.click()} className={`flex items-center gap-1.5 ${botonSuave}`}>
            <Upload className="size-4" /> Restaurar copia
          </button>
          <input
            ref={restaurarRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) restaurar(f);
              e.target.value = "";
            }}
          />
        </div>
        {confirmarBorrado ? (
          <div className="mt-3 rounded-2xl bg-rose-50 p-3 dark:bg-rose-500/10">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Se borrarán todos los movimientos, reglas, metas y ajustes. ¿Seguro?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDatos(estadoInicial());
                  setConfirmarBorrado(false);
                  avisar("Datos borrados");
                }}
                className={`rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white ${foco}`}
              >
                Sí, borrar todo
              </button>
              <button type="button" onClick={() => setConfirmarBorrado(false)} className={botonSuave}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmarBorrado(true)} className={`mt-3 text-sm font-bold text-rose-600 hover:underline dark:text-rose-400 ${foco}`}>
            Borrar todos los datos
          </button>
        )}
      </section>

      <section className={seccion}>
        <h3 className="flex items-center gap-2 font-extrabold">
          <Smartphone className="size-4" /> En la pantalla de inicio del móvil
        </h3>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <strong className="font-extrabold text-slate-900 dark:text-white">iPhone:</strong> abre el enlace de la app en Safari, toca Compartir y elige «Añadir a pantalla de inicio».
          </li>
          <li>
            <strong className="font-extrabold text-slate-900 dark:text-white">Android:</strong> ábrelo en Chrome, toca el menú ⋮ y elige «Añadir a pantalla de inicio».
          </li>
        </ul>
      </section>
    </div>
  );
}
