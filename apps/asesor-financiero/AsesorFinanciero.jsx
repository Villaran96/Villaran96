// Asesor Financiero: saldo, gastos por categoría con alertas de presupuesto, metas de ahorro,
// próximos pagos y un chat que responde con tus propios datos. Un solo archivo.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  Bell,
  Car,
  Check,
  ChevronDown,
  Clapperboard,
  CreditCard,
  House,
  Landmark,
  MessageCircle,
  Moon,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Search,
  Send,
  Shapes,
  Sparkles,
  Sun,
  Target,
  Tv,
  Utensils,
  X,
} from "lucide-react";

/* ───────────────────────── Datos de ejemplo ───────────────────────── */

const SALDO_INICIAL = 48320;
const GASTO_MES_ANTERIOR = 35602; // con 38,450 este mes sale el ↑ 8 %
const APORTE_MENSUAL = 5625; // lo que hace falta al mes para llegar a la meta del viaje en 4 meses

const CATEGORIAS = [
  {
    id: "restaurantes",
    nombre: "Restaurantes",
    icono: Utensils,
    presupuesto: 10000,
    trazo: "text-violet-500",
    barra: "bg-violet-500",
    suave: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  },
  { id: "vivienda", nombre: "Vivienda", icono: House, presupuesto: 24000, trazo: "text-sky-500", barra: "bg-sky-500", suave: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  {
    id: "transporte",
    nombre: "Transporte",
    icono: Car,
    presupuesto: 6500,
    trazo: "text-emerald-500",
    barra: "bg-emerald-500",
    suave: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    id: "entretenimiento",
    nombre: "Entretenimiento",
    icono: Clapperboard,
    presupuesto: 5000,
    trazo: "text-amber-400",
    barra: "bg-amber-400",
    suave: "bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    id: "otros",
    nombre: "Otros",
    icono: Shapes,
    presupuesto: 4500,
    trazo: "text-slate-400 dark:text-slate-500",
    barra: "bg-slate-400 dark:bg-slate-500",
    suave: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

// Movimientos del mes (día del mes, concepto, importe; los gastos suman 38,450).
const MOVIMIENTOS_INICIALES = [
  [1, "Nómina · Grupo Altavista", 32000, "ingreso"],
  [1, "Limpieza (Sra. Lupe)", 2139, "vivienda"],
  [2, "Muebles · IKEA", 4890, "vivienda"],
  [2, "Spotify", 129, "entretenimiento"],
  [3, "La Docena", 2150, "restaurantes"],
  [3, "Gasolina", 1850, "transporte"],
  [4, "Uber Eats", 640, "restaurantes"],
  [4, "Farmacia del Ahorro", 486, "otros"],
  [5, "Starbucks", 385, "restaurantes"],
  [5, "CFE · Luz", 1236, "vivienda"],
  [6, "Uber", 1245, "transporte"],
  [6, "Internet Telmex", 589, "vivienda"],
  [7, "Tacos El Güero", 420, "restaurantes"],
  [7, "Cinépolis", 520, "entretenimiento"],
  [8, "Amazon", 1299, "otros"],
  [8, "Gas Natural", 412, "vivienda"],
  [9, "Rappi", 890, "restaurantes"],
  [9, "Estacionamiento", 380, "transporte"],
  [10, "Contramar", 3200, "restaurantes"],
  [10, "Concierto · Foro Sol", 2450, "entretenimiento"],
  [11, "Regalo de cumpleaños", 1200, "otros"],
  [11, "Mantenimiento del edificio", 1500, "vivienda"],
  [12, "Sushi Itto", 1180, "restaurantes"],
  [12, "Didi", 642, "transporte"],
  [13, "Steam", 899, "entretenimiento"],
  [13, "Corte de pelo", 350, "otros"],
  [14, "Cafebrería El Péndulo", 465, "restaurantes"],
  [14, "Verificación vehicular", 650, "transporte"],
  [15, "Proyecto freelance", 6500, "ingreso"],
  [15, "Uber Eats", 760, "restaurantes"],
  [16, "Librería Gandhi", 616, "entretenimiento"],
  [16, "Gasolina", 1000, "transporte"],
  [17, "Comida de equipo · Lardo", 3360, "restaurantes"],
  [17, "Lavandería", 518, "otros"],
].map(([dia, concepto, importe, categoria], i) => ({ id: i + 1, dia, concepto, importe, categoria }));

const PAGOS_INICIALES = [
  { id: "bbva", nombre: "BBVA Tarjeta de crédito", detalle: "Pago para no generar intereses", importe: 6320, dias: 9, icono: CreditCard, categoria: null },
  { id: "netflix", nombre: "Netflix", detalle: "Plan Estándar", importe: 299, dias: 12, icono: Tv, categoria: "entretenimiento" },
  { id: "renta", nombre: "Renta", detalle: "Depto. Roma Norte", importe: 12000, dias: 16, icono: House, categoria: "vivienda" },
];

const METAS_INICIALES = [
  { id: "europa", nombre: "Viaje a Europa", icono: Plane, ahorrado: 27500, objetivo: 50000, mensual: APORTE_MENSUAL },
  { id: "emergencia", nombre: "Fondo de emergencia", icono: PiggyBank, ahorrado: 18000, objetivo: 30000, mensual: 3000 },
  { id: "laptop", nombre: "Laptop nueva", icono: Target, ahorrado: 9000, objetivo: 32000, mensual: 2500 },
];

const PERIODOS = [
  { id: "mes", nombre: "Este mes", comparado: "vs mes anterior", base: SALDO_INICIAL / 1.124, puntos: 30 },
  { id: "trimestre", nombre: "Últimos 3 meses", comparado: "vs trimestre anterior", base: SALDO_INICIAL / 1.189, puntos: 13 },
  { id: "anio", nombre: "Este año", comparado: "vs inicio de año", base: SALDO_INICIAL / 1.312, puntos: 10 },
];

const SUGERENCIAS_CHAT = ["¿Cómo voy este mes?", "¿En qué puedo ahorrar?", "¿Llego a mi meta del viaje?", "¿Qué pagos tengo pronto?"];

const TABS = [
  { id: "inicio", nombre: "Inicio", icono: House },
  { id: "transacciones", nombre: "Transacciones", icono: Receipt },
  { id: "metas", nombre: "Metas", icono: Target },
  { id: "chat", nombre: "Chat IA", icono: MessageCircle },
];

/* ───────────────────────── Utilidades ───────────────────────── */

const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const mxn = (n) => `$${fmt.format(Math.round(n))}`;
const pct = (n, dec = 0) => `${(n * 100).toFixed(dec)}%`;
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fechaCorta = (d) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d).replace(".", "");
const enDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const lista = (xs) => new Intl.ListFormat("es", { type: "conjunction" }).format(xs);

// Serie suave y determinista entre dos valores (para la sparkline).
function serie(desde, hasta, n, semilla) {
  let s = semilla;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280) * 2 - 1;
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const ruido = i === 0 || i === n - 1 ? 0 : azar() * (hasta - desde) * 0.12;
    return desde + (hasta - desde) * (t * t * 0.35 + t * 0.65) + ruido;
  });
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

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
const campo =
  "w-full rounded-xl bg-slate-50 px-3.5 py-3 text-[15px] font-semibold ring-1 ring-slate-200 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10";

function Tarjeta({ className = "", children }) {
  return (
    <section
      className={`rounded-3xl bg-white shadow-[0_1px_2px_rgba(23,19,43,0.04),0_16px_40px_-24px_rgba(76,29,149,0.25)] ring-1 ring-slate-900/5 dark:bg-[#171427] dark:shadow-none dark:ring-white/10 ${className}`}
    >
      {children}
    </section>
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
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[#0d0b16]/50 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg sm:max-w-md sm:rounded-3xl sm:pb-6 dark:bg-[#1b1830] dark:ring-1 dark:ring-white/10 motion-safe:animate-sheet">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            {Icono && <Icono className="size-5 text-violet-600 dark:text-violet-400" />}
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 ${foco}`}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Texto con **negritas**.
function Rico({ texto }) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((t, i) =>
    t.startsWith("**") ? (
      <strong key={i} className="font-extrabold">
        {t.slice(2, -2)}
      </strong>
    ) : (
      t
    ),
  );
}

function Barra({ valor, className = "bg-violet-500", alto = "h-2" }) {
  return (
    <div className={`${alto} overflow-hidden rounded-full bg-slate-100 dark:bg-white/10`}>
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${className}`} style={{ width: `${Math.min(100, Math.max(0, valor * 100))}%` }} />
    </div>
  );
}

/* ───────────────────────── App ───────────────────────── */

export default function AsesorFinanciero() {
  const [oscuro, alternarTema] = useTema("asesor-financiero:tema");
  const [tab, setTab] = useState("inicio");
  const [saldo, setSaldo] = useState(SALDO_INICIAL);
  const [movimientos, setMovimientos] = useState(MOVIMIENTOS_INICIALES);
  const [pagos, setPagos] = useState(PAGOS_INICIALES);
  const [metas, setMetas] = useState(METAS_INICIALES);
  const [hoja, setHoja] = useState(null); // "gasto" | "avisos" | {aportar} | {categoria} | {pago} | "meta"
  const [toast, setToast] = useState(null);
  const [chat, setChat] = useState([{ de: "ia", texto: "¡Hola, Diego! Soy tu asesor. Conozco tus cuentas, presupuestos, pagos y metas. ¿En qué te ayudo hoy?" }]);
  const toastRef = useRef();

  const avisar = useCallback((texto, tono = "normal") => {
    clearTimeout(toastRef.current);
    setToast({ texto, tono });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const gastos = movimientos.filter((m) => m.categoria !== "ingreso");
  const totalGastado = gastos.reduce((s, m) => s + m.importe, 0);
  const porCategoria = CATEGORIAS.map((c) => {
    const gastado = gastos.filter((m) => m.categoria === c.id).reduce((s, m) => s + m.importe, 0);
    return { ...c, gastado, parte: totalGastado ? gastado / totalGastado : 0, uso: gastado / c.presupuesto };
  });
  const excedidas = porCategoria.filter((c) => c.uso > 1);
  const cercanas = porCategoria.filter((c) => c.uso >= 0.9 && c.uso <= 1);
  const variacion = totalGastado / GASTO_MES_ANTERIOR - 1;
  const ingresos = movimientos.filter((m) => m.categoria === "ingreso").reduce((s, m) => s + m.importe, 0);
  const numAvisos = excedidas.length + cercanas.length + pagos.filter((p) => p.dias <= 10).length;

  const datos = { saldo, totalGastado, variacion, porCategoria, excedidas, cercanas, pagos, metas, ingresos };

  const registrarGasto = ({ importe, categoria, concepto }) => {
    const antes = porCategoria.find((c) => c.id === categoria);
    setMovimientos((ms) => [...ms, { id: Date.now(), dia: new Date().getDate(), concepto, importe, categoria }]);
    setSaldo((s) => s - importe);
    cerrarHoja();
    const uso = (antes.gastado + importe) / antes.presupuesto;
    if (uso > 1 && antes.uso <= 1) avisar(`Te has pasado del presupuesto de ${antes.nombre}`, "alerta");
    else if (uso >= 0.9 && antes.uso < 0.9) avisar(`Cuidado: ya llevas el ${pct(uso)} de ${antes.nombre}`, "alerta");
    else avisar(`Gasto de ${mxn(importe)} registrado`);
  };

  const aportar = (metaId, importe) => {
    const meta = metas.find((m) => m.id === metaId);
    setMetas((ms) => ms.map((m) => (m.id === metaId ? { ...m, ahorrado: m.ahorrado + importe } : m)));
    setSaldo((s) => s - importe);
    cerrarHoja();
    avisar(meta.ahorrado + importe >= meta.objetivo ? `¡Meta «${meta.nombre}» cumplida! 🎉` : `Aportaste ${mxn(importe)} a ${meta.nombre}`);
  };

  const pagar = (pago) => {
    setPagos((ps) => ps.filter((p) => p.id !== pago.id));
    setSaldo((s) => s - pago.importe);
    if (pago.categoria) setMovimientos((ms) => [...ms, { id: Date.now(), dia: new Date().getDate(), concepto: pago.nombre, importe: pago.importe, categoria: pago.categoria }]);
    cerrarHoja();
    avisar(`${pago.nombre} pagado: ${mxn(pago.importe)}`);
  };

  const crearMeta = (meta) => {
    setMetas((ms) => [...ms, { ...meta, id: `m${Date.now()}`, icono: Target, ahorrado: 0 }]);
    cerrarHoja();
    avisar(`Meta «${meta.nombre}» creada`);
  };

  return (
    <div className="min-h-screen font-sans">
      <header className="mx-auto flex max-w-4xl items-center gap-3 gutter pt-4 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg shadow-violet-600/30">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] leading-tight font-extrabold tracking-tight">Asesor Financiero</h1>
          <p className="text-xs leading-tight font-semibold text-slate-500 dark:text-slate-400">Tu IA para mejores decisiones</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
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
            onClick={() => setHoja("avisos")}
            aria-label={`Alertas (${numAvisos})`}
            className={`relative grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10 ${foco}`}
          >
            <Bell className="size-5" />
            {numAvisos > 0 && (
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--page)]">{numAvisos}</span>
            )}
          </button>
          <span className="ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-400 text-sm font-extrabold text-white" aria-label="Diego">
            D
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl gutter pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
        {tab === "inicio" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TarjetaSaldo saldo={saldo} />
            <TarjetaGastos datos={datos} onCategoria={(c) => setHoja({ categoria: c.id })} onNuevoGasto={() => setHoja("gasto")} />
            <TarjetaMeta meta={metas[0]} onAportar={() => setHoja({ aportar: metas[0].id })} />
            <TarjetaPagos pagos={pagos} onPago={(p) => setHoja({ pago: p.id })} />
          </div>
        )}
        {tab === "transacciones" && <VistaTransacciones movimientos={movimientos} totalGastado={totalGastado} ingresos={ingresos} onNuevoGasto={() => setHoja("gasto")} />}
        {tab === "metas" && <VistaMetas metas={metas} onAportar={(id) => setHoja({ aportar: id })} onNueva={() => setHoja("meta")} />}
        {tab === "chat" && <VistaChat chat={chat} setChat={setChat} datos={datos} />}
      </main>

      {tab !== "chat" && (
        <button
          type="button"
          onClick={() => setHoja("gasto")}
          aria-label="Registrar gasto"
          className={`fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-30 grid size-14 place-items-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-600/40 transition hover:bg-violet-700 active:scale-95 md:right-[max(32px,env(safe-area-inset-right,0px))] ${foco}`}
        >
          <Plus className="size-6" strokeWidth={2.6} />
        </button>
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/90 pb-safe backdrop-blur-xl gutter dark:border-white/10 dark:bg-[#0d0b16]/90"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ id, nombre, icono: I }) => {
            const activo = tab === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={activo ? "page" : undefined}
                  className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-bold ${foco} ${activo ? "text-violet-600 dark:text-violet-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${activo ? "bg-violet-50 dark:bg-violet-500/15" : ""}`}>
                    <I className="size-5" strokeWidth={activo ? 2.4 : 2} />
                  </span>
                  {nombre}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(150px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center gutter">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-lg motion-safe:animate-sheet ${toast.tono === "alerta" ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"}`}
          >
            {toast.tono === "alerta" ? <AlertTriangle className="size-4" /> : <Check className="size-4" />}
            {toast.texto}
          </div>
        </div>
      )}

      <Hoja abierta={hoja === "gasto"} onCerrar={cerrarHoja} titulo="Registrar gasto" icono={Receipt}>
        <FormGasto onGuardar={registrarGasto} porCategoria={porCategoria} saldo={saldo} />
      </Hoja>

      <Hoja abierta={hoja === "avisos"} onCerrar={cerrarHoja} titulo="Alertas" icono={Bell}>
        <ul className="grid grid-cols-1 gap-2">
          {excedidas.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl bg-red-50 p-3.5 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>
                <strong className="font-extrabold">Te estás pasando en {c.nombre}.</strong> Llevas {mxn(c.gastado)} de {mxn(c.presupuesto)}.
              </span>
            </li>
          ))}
          {cercanas.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <span>
                <strong className="font-extrabold">Cerca del límite en {c.nombre}:</strong> {pct(c.uso)} del presupuesto.
              </span>
            </li>
          ))}
          {pagos
            .filter((p) => p.dias <= 10)
            .map((p) => (
              <li key={p.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 text-sm dark:bg-white/5">
                <p.icono className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" />
                <span>
                  <strong className="font-extrabold">{p.nombre}</strong> vence en {p.dias} días ({fechaCorta(enDias(p.dias))}): {mxn(p.importe)}.
                </span>
              </li>
            ))}
          {numAvisos === 0 && <li className="py-6 text-center text-sm text-slate-500">Todo en orden. No tienes alertas. ✅</li>}
        </ul>
      </Hoja>

      {hoja?.aportar && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Aportar a tu meta" icono={PiggyBank}>
          <FormAporte meta={metas.find((m) => m.id === hoja.aportar)} saldo={saldo} onAportar={aportar} />
        </Hoja>
      )}

      {hoja?.categoria && <DetalleCategoria cat={porCategoria.find((c) => c.id === hoja.categoria)} movimientos={gastos.filter((m) => m.categoria === hoja.categoria)} onCerrar={cerrarHoja} />}

      {hoja?.pago && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Próximo pago" icono={CreditCard}>
          {(() => {
            const p = pagos.find((x) => x.id === hoja.pago);
            if (!p) return null;
            return (
              <div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm dark:bg-white/10 dark:text-violet-300">
                    <p.icono className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{p.nombre}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {p.detalle} · vence el {fechaCorta(enDias(p.dias))}
                    </p>
                  </div>
                  <p className="text-lg font-extrabold tabular-nums">{mxn(p.importe)}</p>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  Se descontará de tu saldo ({mxn(saldo)}). Te quedarían <strong className="font-extrabold">{mxn(saldo - p.importe)}</strong>.
                </p>
                <button type="button" onClick={() => pagar(p)} className={`mt-4 w-full rounded-2xl bg-violet-600 py-3.5 text-[15px] font-extrabold text-white hover:bg-violet-700 ${foco}`}>
                  Pagar ahora {mxn(p.importe)}
                </button>
              </div>
            );
          })()}
        </Hoja>
      )}

      <Hoja abierta={hoja === "meta"} onCerrar={cerrarHoja} titulo="Nueva meta" icono={Target}>
        <FormMeta onCrear={crearMeta} />
      </Hoja>
    </div>
  );
}

/* ───────────────────────── Inicio ───────────────────────── */

function Sparkline({ valores }) {
  const W = 300;
  const H = 72;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const x = (i) => (i / (valores.length - 1)) * W;
  const y = (v) => 6 + (1 - (v - min) / (max - min || 1)) * (H - 12);
  const linea = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = valores[valores.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[72px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="relleno-saldo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${linea} L${W},${H} L0,${H} Z`} fill="url(#relleno-saldo)" />
      <path d={linea} fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={W} cy={y(ultimo)} r="4.5" fill="#ffffff" stroke="#34d399" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TarjetaSaldo({ saldo }) {
  const [periodo, setPeriodo] = useState("mes");
  const p = PERIODOS.find((x) => x.id === periodo);
  const valores = useMemo(() => serie(p.base, saldo, p.puntos, p.puntos * 7), [p, saldo]);
  const cambio = saldo / p.base - 1;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-xl shadow-violet-700/25 md:col-span-2 sm:p-6">
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-100">
          <Landmark className="size-4" /> Saldo total
        </p>
        <label htmlFor="periodo" className="sr-only">
          Periodo
        </label>
        <div className="relative">
          <select
            id="periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="appearance-none rounded-full bg-white/15 py-1.5 pr-8 pl-3 text-xs font-bold text-white ring-1 ring-white/25 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white [&>option]:text-slate-900"
          >
            {PERIODOS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" strokeWidth={3} />
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[34px] leading-none font-extrabold tracking-tight tabular-nums sm:text-[40px]">
            {mxn(saldo)} <span className="text-lg font-bold text-violet-200">MXN</span>
          </p>
          <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${cambio >= 0 ? "bg-emerald-400 text-emerald-950" : "bg-red-400 text-red-950"}`}>
            {cambio >= 0 ? "+" : ""}
            {(cambio * 100).toFixed(1)}% {p.comparado}
          </p>
        </div>
        <div className="w-full sm:w-[46%]">
          <Sparkline valores={valores} />
        </div>
      </div>
    </section>
  );
}

function Dona({ categorias, total }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const hueco = categorias.filter((c) => c.parte > 0).length > 1 ? 3 : 0;
  let acumulado = 0;
  return (
    <div className="relative mx-auto size-[156px] shrink-0">
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label="Gastos por categoría">
        <circle cx="70" cy="70" r={R} fill="none" stroke="currentColor" strokeWidth="16" className="text-slate-100 dark:text-white/5" />
        {categorias.map((c) => {
          const largo = Math.max(c.parte * C - hueco, 0);
          const el = (
            <circle
              key={c.id}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="16"
              strokeDasharray={`${largo} ${C - largo}`}
              strokeDashoffset={-acumulado}
              className={`${c.trazo} transition-all duration-700`}
            />
          );
          acumulado += c.parte * C;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-[17px] leading-tight font-extrabold tracking-tight tabular-nums">{mxn(total)}</p>
        </div>
      </div>
    </div>
  );
}

function TarjetaGastos({ datos, onCategoria, onNuevoGasto }) {
  const { totalGastado, variacion, porCategoria, excedidas, cercanas } = datos;
  return (
    <Tarjeta className="p-5 md:col-span-2 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">Tus gastos este mes</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums">{mxn(totalGastado)} MXN</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${variacion > 0 ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}
            >
              {variacion > 0 ? "↑" : "↓"} {Math.abs(Math.round(variacion * 100))}%
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onNuevoGasto}
          className={`flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 ${foco}`}
        >
          <Plus className="size-4" strokeWidth={3} /> Registrar gasto
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 items-center gap-6 sm:grid-cols-[auto_1fr]">
        <Dona categorias={porCategoria} total={totalGastado} />
        <ul className="grid min-w-0 grid-cols-1 gap-1">
          {porCategoria.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onCategoria(c)} className={`w-full rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}>
                <span className="flex items-center gap-2 text-sm">
                  <span className={`size-2.5 shrink-0 rounded-full ${c.barra}`} />
                  <span className={`min-w-0 flex-1 truncate font-bold ${c.uso > 1 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {c.nombre}
                    {c.uso > 1 && <AlertTriangle className="mb-0.5 ml-1 inline size-3.5" aria-label="Fuera de presupuesto" />}
                  </span>
                  <span className="w-10 text-right font-extrabold tabular-nums">{Math.round(c.parte * 100)}%</span>
                  <span className="w-[72px] text-right font-semibold text-slate-500 tabular-nums dark:text-slate-400">{mxn(c.gastado)}</span>
                </span>
                <span className="mt-1.5 block pl-[18px]">
                  <Barra valor={c.parte} className={c.barra} alto="h-1.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {excedidas.map((c) => (
        <div key={c.id} className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-500 text-white">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 text-sm text-red-900 dark:text-red-100">
            <p className="font-extrabold">Te estás pasando en {c.nombre}</p>
            <p className="mt-0.5">
              Llevas {mxn(c.gastado)} de {mxn(c.presupuesto)} (+{Math.round((c.uso - 1) * 100)}%).{" "}
              {c.id === "restaurantes" ? "Cocinar en casa 3 días por semana te ahorraría unos $2,400 al mes." : `Te pasas ${mxn(c.gastado - c.presupuesto)}: frena este gasto hasta fin de mes.`}
            </p>
          </div>
        </div>
      ))}
      {cercanas.map((c) => (
        <p key={c.id} className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" /> Cerca del límite en {c.nombre}: {pct(c.uso)} de {mxn(c.presupuesto)}
        </p>
      ))}
    </Tarjeta>
  );
}

function infoMeta(meta) {
  const falta = Math.max(meta.objetivo - meta.ahorrado, 0);
  const meses = Math.ceil(falta / meta.mensual);
  const fin = new Date();
  fin.setMonth(fin.getMonth() + meses);
  return { falta, meses, progreso: meta.ahorrado / meta.objetivo, fin: capital(new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(fin)) };
}

function TarjetaMeta({ meta, onAportar }) {
  const { falta, meses, progreso, fin } = infoMeta(meta);
  const cumplida = falta === 0;
  return (
    <Tarjeta className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">Tu meta de ahorro</h2>
        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Check className="size-3.5" strokeWidth={3} /> {cumplida ? "¡Cumplida!" : "En buen camino"}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <meta.icono className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{meta.nombre}</p>
          <p className="text-sm font-semibold text-slate-500 tabular-nums dark:text-slate-400">
            <span className="font-extrabold text-slate-900 dark:text-white">{mxn(meta.ahorrado)}</span> / {mxn(meta.objetivo)}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <Barra valor={progreso} className="bg-gradient-to-r from-emerald-400 to-emerald-500" alto="h-3" />
        <div className="mt-2 flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="text-emerald-700 dark:text-emerald-300">{Math.round(progreso * 100)}%</span>
          <span>{cumplida ? "Meta alcanzada" : `Faltan ${meses} ${meses === 1 ? "mes" : "meses"} · ${fin}`}</span>
        </div>
      </div>
      {!cumplida && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Te faltan {mxn(falta)}. Aportando {mxn(meta.mensual)} al mes llegas a tiempo.
        </p>
      )}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onAportar}
          disabled={cumplida}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-40 ${foco}`}
        >
          <Plus className="size-4" strokeWidth={3} /> Aportar fondos
        </button>
      </div>
    </Tarjeta>
  );
}

function TarjetaPagos({ pagos, onPago }) {
  return (
    <Tarjeta className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">Próximos pagos</h2>
        <span className="text-xs font-bold text-slate-500 tabular-nums dark:text-slate-400">{mxn(pagos.reduce((s, p) => s + p.importe, 0))} en total</span>
      </div>
      {pagos.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">No tienes pagos pendientes este mes. ✅</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-1">
          {pagos.map((p) => {
            const urgente = p.dias <= 10;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => onPago(p)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}>
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${urgente ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}
                  >
                    <p.icono className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{p.nombre}</span>
                    <span className="block text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {mxn(p.importe)} · {fechaCorta(enDias(p.dias))}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${urgente ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}
                  >
                    En {p.dias} días
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Tarjeta>
  );
}

/* ───────────────────────── Formularios ───────────────────────── */

function CampoImporte({ id, valor, setValor, autoFocus }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-2xl font-extrabold text-slate-400">$</span>
      <input
        id={id}
        inputMode="decimal"
        autoFocus={autoFocus}
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder="0"
        className={`${campo} py-4 pl-9 text-3xl font-extrabold tracking-tight tabular-nums`}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-slate-400">MXN</span>
    </div>
  );
}

function FormGasto({ onGuardar, porCategoria, saldo }) {
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState("restaurantes");
  const [concepto, setConcepto] = useState("");
  const n = Number(importe);
  const cat = porCategoria.find((c) => c.id === categoria);
  const usoTras = (cat.gastado + (n || 0)) / cat.presupuesto;
  const error = importe && !(n > 0) ? "Escribe un importe mayor que 0." : n > saldo ? `No tienes saldo suficiente (${mxn(saldo)}).` : null;
  const enviar = (e) => {
    e.preventDefault();
    if (!(n > 0) || error) return;
    onGuardar({ importe: Math.round(n), categoria, concepto: concepto.trim() || cat.nombre });
  };
  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-4">
      <div>
        <label htmlFor="gasto-importe" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          Importe
        </label>
        <CampoImporte id="gasto-importe" valor={importe} setValor={setImporte} autoFocus />
        {error && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {porCategoria.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold ring-1 transition ${foco} ${
                categoria === c.id ? "bg-violet-600 text-white ring-violet-600 dark:bg-violet-500 dark:ring-violet-500" : "ring-slate-200 hover:ring-violet-300 dark:ring-white/10"
              }`}
            >
              <c.icono className="size-3.5" /> {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="gasto-concepto" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          Descripción (opcional)
        </label>
        <input id="gasto-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Cena con amigos" className={campo} />
      </div>
      <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-white/5">
        <div className="flex justify-between text-xs font-bold">
          <span>Presupuesto de {cat.nombre}</span>
          <span className={usoTras > 1 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}>
            {mxn(cat.gastado + (n || 0))} / {mxn(cat.presupuesto)}
          </span>
        </div>
        <div className="mt-2">
          <Barra valor={usoTras} className={usoTras > 1 ? "bg-red-500" : usoTras >= 0.9 ? "bg-amber-400" : "bg-emerald-500"} />
        </div>
        {usoTras > 1 && <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-400">Con este gasto te pasas {mxn(cat.gastado + n - cat.presupuesto)} del presupuesto.</p>}
      </div>
      <button type="submit" disabled={!(n > 0) || !!error} className={`rounded-2xl bg-violet-600 py-3.5 text-[15px] font-extrabold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}>
        Guardar gasto
      </button>
    </form>
  );
}

function FormAporte({ meta, saldo, onAportar }) {
  const [importe, setImporte] = useState("");
  const { falta } = infoMeta(meta);
  const n = Number(importe);
  const error = importe && !(n > 0) ? "Escribe un importe mayor que 0." : n > saldo ? `No tienes saldo suficiente (${mxn(saldo)}).` : n > falta ? `Solo te faltan ${mxn(falta)} para la meta.` : null;
  const tras = infoMeta({ ...meta, ahorrado: meta.ahorrado + (n > 0 && !error ? n : 0) });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (n > 0 && !error) onAportar(meta.id, Math.round(n));
      }}
      className="grid grid-cols-1 gap-4"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <strong className="font-extrabold">{meta.nombre}</strong>: llevas {mxn(meta.ahorrado)} de {mxn(meta.objetivo)}.
      </p>
      <div>
        <label htmlFor="aporte-importe" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          ¿Cuánto quieres aportar?
        </label>
        <CampoImporte id="aporte-importe" valor={importe} setValor={setImporte} autoFocus />
        {error && <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {[500, 1000, 2500, meta.mensual]
          .filter((v, i, a) => v <= falta && a.indexOf(v) === i)
          .map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setImporte(String(v))}
              className={`rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold tabular-nums hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 ${foco}`}
            >
              {mxn(v)}
            </button>
          ))}
      </div>
      <div className="rounded-2xl bg-emerald-50 p-3.5 dark:bg-emerald-500/10">
        <Barra valor={tras.progreso} className="bg-emerald-500" />
        <p className="mt-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
          {tras.falta === 0 ? "¡Con este aporte cumples la meta! 🎉" : `Quedarías en ${Math.round(tras.progreso * 100)}% · faltarían ${tras.meses} ${tras.meses === 1 ? "mes" : "meses"}`}
        </p>
      </div>
      <button type="submit" disabled={!(n > 0) || !!error} className={`rounded-2xl bg-emerald-500 py-3.5 text-[15px] font-extrabold text-white hover:bg-emerald-600 disabled:opacity-40 ${foco}`}>
        Aportar {n > 0 && !error ? mxn(n) : ""}
      </button>
    </form>
  );
}

function FormMeta({ onCrear }) {
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [meses, setMeses] = useState(12);
  const n = Number(objetivo);
  const valido = nombre.trim() && n > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onCrear({ nombre: nombre.trim(), objetivo: Math.round(n), mensual: Math.ceil(n / meses) });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="meta-nombre" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          Nombre
        </label>
        <input id="meta-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Enganche de un auto" className={campo} />
      </div>
      <div>
        <label htmlFor="meta-objetivo" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
          ¿Cuánto necesitas?
        </label>
        <CampoImporte id="meta-objetivo" valor={objetivo} setValor={setObjetivo} />
      </div>
      <div>
        <label htmlFor="meta-meses" className="mb-1.5 flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
          <span>Plazo</span>
          <span className="text-slate-900 dark:text-white">{meses} meses</span>
        </label>
        <input id="meta-meses" type="range" min="3" max="36" value={meses} onChange={(e) => setMeses(Number(e.target.value))} className="w-full accent-violet-600" />
      </div>
      {n > 0 && (
        <p className="rounded-2xl bg-violet-50 p-3.5 text-sm font-semibold text-violet-900 dark:bg-violet-500/10 dark:text-violet-100">
          Tendrías que ahorrar <strong className="font-extrabold">{mxn(Math.ceil(n / meses))}</strong> al mes.
        </p>
      )}
      <button type="submit" disabled={!valido} className={`rounded-2xl bg-violet-600 py-3.5 text-[15px] font-extrabold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}>
        Crear meta
      </button>
    </form>
  );
}

function DetalleCategoria({ cat, movimientos, onCerrar }) {
  const ordenados = [...movimientos].sort((a, b) => b.dia - a.dia || b.id - a.id);
  return (
    <Hoja abierta onCerrar={onCerrar} titulo={cat.nombre} icono={cat.icono}>
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{mxn(cat.gastado)}</p>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">de {mxn(cat.presupuesto)}</p>
        </div>
        <div className="mt-3">
          <Barra valor={cat.uso} className={cat.uso > 1 ? "bg-red-500" : cat.uso >= 0.9 ? "bg-amber-400" : "bg-emerald-500"} alto="h-2.5" />
        </div>
        <p className={`mt-2 text-xs font-bold ${cat.uso > 1 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
          {cat.uso > 1 ? `Te pasas ${mxn(cat.gastado - cat.presupuesto)} (${pct(cat.uso)} del presupuesto)` : `Te quedan ${mxn(cat.presupuesto - cat.gastado)} (${pct(cat.uso)} usado)`}
        </p>
      </div>
      <h3 className="mt-5 mb-2 text-xs font-extrabold tracking-wider text-slate-400 uppercase">Movimientos ({ordenados.length})</h3>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {ordenados.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-bold">{m.concepto}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{fechaMov(m.dia)}</span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">−{mxn(m.importe)}</span>
          </li>
        ))}
      </ul>
    </Hoja>
  );
}

/* ───────────────────────── Transacciones ───────────────────────── */

function fechaMov(dia) {
  const hoy = new Date();
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, hoy.getDate()));
  const diff = hoy.getDate() - d.getDate();
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return capital(new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(d));
}

function VistaTransacciones({ movimientos, totalGastado, ingresos, onNuevoGasto }) {
  const [filtro, setFiltro] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const q = busqueda.trim().toLowerCase();
  const filtrados = movimientos
    .filter((m) => filtro === "todas" || m.categoria === filtro)
    .filter((m) => !q || m.concepto.toLowerCase().includes(q))
    .sort((a, b) => b.dia - a.dia || b.id - a.id);
  const grupos = [];
  for (const m of filtrados) {
    const f = fechaMov(m.dia);
    if (grupos.at(-1)?.fecha !== f) grupos.push({ fecha: f, items: [] });
    grupos.at(-1).items.push(m);
  }
  const chips = [{ id: "todas", nombre: "Todas" }, { id: "ingreso", nombre: "Ingresos" }, ...CATEGORIAS];
  return (
    <div>
      <div className="flex items-end justify-between gap-3 pt-2 pb-4">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Transacciones</h1>
        <button type="button" onClick={onNuevoGasto} className={`flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" strokeWidth={3} /> Gasto
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Tarjeta className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <ArrowDownLeft className="size-4 text-emerald-500" /> Ingresos del mes
          </p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">+{mxn(ingresos)}</p>
        </Tarjeta>
        <Tarjeta className="p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Receipt className="size-4 text-red-500" /> Gastos del mes
          </p>
          <p className="mt-1 text-xl font-extrabold tracking-tight tabular-nums">−{mxn(totalGastado)}</p>
        </Tarjeta>
      </div>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <label htmlFor="buscar-mov" className="sr-only">
          Buscar movimientos
        </label>
        <input id="buscar-mov" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por concepto" className={`${campo} bg-white pl-10 dark:bg-[#171427]`} />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={filtro === c.id}
            onClick={() => setFiltro(c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${foco} ${filtro === c.id ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white" : "bg-white ring-slate-200 dark:bg-transparent dark:ring-white/15"}`}
          >
            {c.nombre}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        {grupos.map((g) => (
          <Tarjeta key={g.fecha} className="px-4 py-2">
            <h2 className="pt-2 pb-1 text-xs font-extrabold tracking-wider text-slate-400 uppercase">{g.fecha}</h2>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {g.items.map((m) => {
                const c = CAT[m.categoria];
                const ingreso = m.categoria === "ingreso";
                const Icono = ingreso ? ArrowDownLeft : c.icono;
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${ingreso ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" : c.suave}`}>
                      <Icono className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{m.concepto}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{ingreso ? "Ingreso" : c.nombre}</span>
                    </span>
                    <span className={`shrink-0 text-sm font-extrabold tabular-nums ${ingreso ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {ingreso ? "+" : "−"}
                      {mxn(m.importe)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        ))}
        {grupos.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No hay movimientos con ese filtro.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────── Metas ───────────────────────── */

function VistaMetas({ metas, onAportar, onNueva }) {
  const total = metas.reduce((s, m) => s + m.ahorrado, 0);
  return (
    <div>
      <div className="flex items-end justify-between gap-3 pt-2 pb-4">
        <div>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Metas</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Llevas {mxn(total)} ahorrados en total</p>
        </div>
        <button type="button" onClick={onNueva} className={`flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" strokeWidth={3} /> Nueva meta
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {metas.map((m) => {
          const { falta, meses, progreso, fin } = infoMeta(m);
          return (
            <li key={m.id}>
              <Tarjeta className="p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <m.icono className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{m.nombre}</p>
                    <p className="text-sm font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {mxn(m.ahorrado)} / {mxn(m.objetivo)}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400">{Math.round(progreso * 100)}%</span>
                </div>
                <div className="mt-3">
                  <Barra valor={progreso} className="bg-emerald-500" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {falta ? `${mxn(m.mensual)}/mes · ${meses} ${meses === 1 ? "mes" : "meses"} · ${fin}` : "¡Meta cumplida! 🎉"}
                  </p>
                  <button
                    type="button"
                    disabled={!falta}
                    onClick={() => onAportar(m.id)}
                    className={`rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:bg-emerald-500/15 dark:text-emerald-300 ${foco}`}
                  >
                    Aportar
                  </button>
                </div>
              </Tarjeta>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ───────────────────────── Chat IA ───────────────────────── */

// Respuestas simuladas: se elige la intención por palabras clave y se responde con los datos reales del estado.
function responder(pregunta, d) {
  const q = pregunta.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const top = [...d.porCategoria].sort((a, b) => b.gastado - a.gastado)[0];
  const viaje = d.metas.find((m) => m.id === "europa") ?? d.metas[0];
  const cat = d.porCategoria.find((c) => q.includes(c.nombre.toLowerCase().slice(0, 6)));

  if (cat) {
    return `En **${cat.nombre}** llevas **${mxn(cat.gastado)}** de ${mxn(cat.presupuesto)} (${pct(cat.uso)} del presupuesto), el ${pct(cat.parte)} de todo lo que has gastado este mes.\n${
      cat.uso > 1 ? `Te pasas ${mxn(cat.gastado - cat.presupuesto)}. Te recomiendo no gastar más aquí hasta fin de mes.` : `Aún te quedan ${mxn(cat.presupuesto - cat.gastado)} disponibles.`
    }`;
  }
  if (/ahorr|recort|reduc|gastar menos|consejo/.test(q)) {
    const lineas = d.excedidas.map(
      (c) =>
        `• **${c.nombre}**: te pasas ${mxn(c.gastado - c.presupuesto)}. ${c.id === "restaurantes" ? "Cocinar en casa 3 días por semana te ahorraría unos $2,400 al mes." : "Pon un tope semanal hasta fin de mes."}`,
    );
    d.cercanas.forEach((c) => lineas.push(`• **${c.nombre}**: estás al ${pct(c.uso)}. Cuidado con los gastos pequeños.`));
    lineas.push("• Revisa suscripciones que no uses: Spotify y Netflix suman $428 al mes.");
    return `Estas son tus mejores oportunidades de ahorro:\n${lineas.join("\n")}\nSi recortas lo que te pasas, podrías adelantar tu meta «${viaje.nombre}».`;
  }
  if (/meta|viaje|europa|objetivo/.test(q)) {
    const { falta, meses, progreso, fin } = infoMeta(viaje);
    if (!falta) return `¡Ya cumpliste tu meta **${viaje.nombre}**! 🎉 Llevas ${mxn(viaje.ahorrado)}.`;
    return `Vas **en buen camino** con «${viaje.nombre}»: llevas ${mxn(viaje.ahorrado)} de ${mxn(viaje.objetivo)} (${pct(progreso)}).\nTe faltan **${mxn(falta)}**. Aportando ${mxn(viaje.mensual)} al mes llegas en ${meses} ${meses === 1 ? "mes" : "meses"} (${fin}).`;
  }
  if (/pago|vence|venc|tarjeta|renta|netflix|recibo|deuda/.test(q)) {
    if (!d.pagos.length) return "No tienes pagos pendientes este mes. ✅";
    const total = d.pagos.reduce((s, p) => s + p.importe, 0);
    return `Tienes ${d.pagos.length} ${d.pagos.length === 1 ? "pago próximo" : "pagos próximos"} por **${mxn(total)}**:\n${d.pagos
      .map((p) => `• ${p.nombre}: ${mxn(p.importe)} en ${p.dias} días (${fechaCorta(enDias(p.dias))})`)
      .join("\n")}\nDespués de pagarlos te quedarían ${mxn(d.saldo - total)}.${d.pagos.some((p) => p.id === "bbva") ? " Paga la tarjeta BBVA completa para no generar intereses." : ""}`;
  }
  if (/saldo|dinero|tengo|cuenta|disponible/.test(q)) {
    return `Tu saldo total es de **${mxn(d.saldo)} MXN**. Este mes han entrado ${mxn(d.ingresos)} y has gastado ${mxn(d.totalGastado)}.`;
  }
  if (/presupuesto|limite|categoria/.test(q)) {
    return `Así va tu presupuesto:\n${d.porCategoria.map((c) => `• ${c.nombre}: ${mxn(c.gastado)} de ${mxn(c.presupuesto)} (${pct(c.uso)})${c.uso > 1 ? " ⚠️" : ""}`).join("\n")}`;
  }
  if (/permitir|comprar|puedo|gastar/.test(q)) {
    const libre = d.saldo - d.pagos.reduce((s, p) => s + p.importe, 0);
    return `Después de tus próximos pagos te quedarían **${mxn(libre)}**. Para una compra grande, intenta que no supere ${mxn(libre * 0.2)} (el 20%) y así no tocas tu ahorro.`;
  }
  if (/como voy|mes|gasto|gastado|resumen/.test(q)) {
    return `Este mes llevas **${mxn(d.totalGastado)}** en gastos, un ${Math.abs(Math.round(d.variacion * 100))}% ${d.variacion > 0 ? "más" : "menos"} que el mes pasado.\nTu mayor gasto es **${top.nombre}** (${pct(top.parte)}).${
      d.excedidas.length ? ` ⚠️ Te estás pasando en ${lista(d.excedidas.map((c) => c.nombre))}.` : " Vas dentro de presupuesto en todo. 👏"
    }`;
  }
  return "Puedo ayudarte con tu saldo, gastos, presupuestos, próximos pagos y metas de ahorro. Prueba con «¿En qué puedo ahorrar?» o «¿Cuánto llevo en Transporte?».";
}

function VistaChat({ chat, setChat, datos }) {
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef();
  const datosRef = useRef(datos);
  datosRef.current = datos;

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, escribiendo]);

  const enviar = (pregunta) => {
    const p = pregunta.trim();
    if (!p || escribiendo) return;
    setChat((c) => [...c, { de: "yo", texto: p }]);
    setTexto("");
    setEscribiendo(true);
    setTimeout(
      () => {
        setChat((c) => [...c, { de: "ia", texto: responder(p, datosRef.current) }]);
        setEscribiendo(false);
      },
      650 + Math.min(p.length * 12, 600),
    );
  };

  return (
    <div className="flex flex-col">
      <div className="pt-2 pb-3">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Chat IA</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">Pregunta lo que quieras sobre tu dinero</p>
      </div>
      <div className="grid grid-cols-1 gap-3" aria-live="polite">
        {chat.map((m, i) =>
          m.de === "yo" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-3xl rounded-br-lg bg-violet-600 px-4 py-2.5 text-[15px] font-semibold text-white motion-safe:animate-pop">
              {m.texto}
            </div>
          ) : (
            <div key={i} className="flex max-w-[92%] gap-2.5 motion-safe:animate-pop">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 rounded-3xl rounded-tl-lg bg-white px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line shadow-sm ring-1 ring-slate-900/5 dark:bg-[#171427] dark:ring-white/10">
                <Rico texto={m.texto} />
              </div>
            </div>
          ),
        )}
        {escribiendo && (
          <div className="flex gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white">
              <Sparkles className="size-4" />
            </span>
            <div className="flex items-center gap-1 rounded-3xl rounded-tl-lg bg-white px-4 py-3.5 ring-1 ring-slate-900/5 dark:bg-[#171427] dark:ring-white/10" aria-label="Escribiendo">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 rounded-full bg-violet-400 motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div className="sticky bottom-[calc(66px+env(safe-area-inset-bottom,0px))] mt-4 -mx-1 bg-[var(--page)] px-1 pt-2 pb-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {SUGERENCIAS_CHAT.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => enviar(s)}
              disabled={escribiendo}
              className={`shrink-0 rounded-full bg-white px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50 dark:bg-[#171427] dark:text-violet-300 dark:ring-violet-500/30 ${foco}`}
            >
              {s}
            </button>
          ))}
        </div>
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
            placeholder="Ej. ¿Cuánto llevo en restaurantes?"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-slate-400"
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
        <p className="mt-2 text-center text-[11px] text-slate-400">Respuestas simuladas con tus datos de ejemplo. No es asesoría financiera profesional.</p>
      </div>
    </div>
  );
}
