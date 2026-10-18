// Asesor Financiero: saldo, gastos por categoría con alertas de presupuesto, metas de ahorro,
// próximos pagos y un chat que responde con tus propios datos. Un solo archivo.
// Arranca con lo que viene en el prompt y todo lo que añades se guarda.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
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
  Pencil,
  Plus,
  Receipt,
  Send,
  Shapes,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Utensils,
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
const mesesCompletos = (a, b) => {
  const [da, db] = [deISO(a), deISO(b)];
  return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth() - (db.getDate() < da.getDate() ? 1 : 0);
};
const mesAnterior = (mes) => sumarMeses(`${mes}-01`, -1).slice(0, 7);
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nombreMes = (mes) => capital(new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(deISO(`${mes}-01`)));
const fechaCorta = (iso) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(deISO(iso)).replace(".", "");
const nuevoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const mxn = (n) => `${n < 0 ? "−" : ""}$${fmt.format(Math.abs(Math.round(n)))}`;
const pct = (n) => `${Math.round(n * 100)}%`;

/* ───────────────────────── Datos del prompt ───────────────────────── */

const CATEGORIAS = [
  {
    id: "restaurantes",
    nombre: "Restaurantes",
    inicial: 13450,
    icono: Utensils,
    trazo: "text-violet-500",
    barra: "bg-violet-500",
    suave: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  },
  { id: "vivienda", nombre: "Vivienda", inicial: 10766, icono: House, trazo: "text-sky-500", barra: "bg-sky-500", suave: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" },
  {
    id: "transporte",
    nombre: "Transporte",
    inicial: 5767,
    icono: Car,
    trazo: "text-emerald-500",
    barra: "bg-emerald-500",
    suave: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    id: "entretenimiento",
    nombre: "Entretenimiento",
    inicial: 4614,
    icono: Clapperboard,
    trazo: "text-amber-400",
    barra: "bg-amber-400",
    suave: "bg-amber-50 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    id: "otros",
    nombre: "Otros",
    inicial: 3853,
    icono: Shapes,
    trazo: "text-slate-400 dark:text-slate-500",
    barra: "bg-slate-400 dark:bg-slate-500",
    suave: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

function estadoInicial() {
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);
  return {
    mes,
    saldo: 48320,
    historialSaldo: [{ fecha: hoy, saldo: 48320 }],
    // Cierre del mes anterior deducido de los porcentajes del prompt: +12.4 % de saldo y ↑ 8 % de gasto.
    cierres: { [mesAnterior(mes)]: { saldo: Math.round(48320 / 1.124), gastos: Math.round(38450 / 1.08) } },
    gastos: CATEGORIAS.map((c) => ({ id: `g-${c.id}`, fecha: hoy, categoria: c.id, importe: c.inicial, concepto: "" })),
    presupuestos: {},
    metas: [{ id: "m1", nombre: "Viaje a Europa", ahorrado: 27500, objetivo: 50000, inicio: hoy, ahorradoInicio: 27500, fechaObjetivo: sumarMeses(hoy, 4) }],
    pagos: [
      { id: "p1", nombre: "BBVA Tarjeta de crédito", importe: 6320, fecha: sumarDias(hoy, 9) },
      { id: "p2", nombre: "Netflix", importe: 299, fecha: sumarDias(hoy, 12) },
      { id: "p3", nombre: "Renta", importe: 12000, fecha: sumarDias(hoy, 16) },
    ],
  };
}

// Al empezar un mes nuevo se guarda el cierre del anterior (saldo y gasto total).
function alDia(d, hoy) {
  const mes = hoy.slice(0, 7);
  if (d.mes >= mes) return d;
  const gastado = d.gastos.filter((g) => g.categoria && g.fecha.startsWith(d.mes)).reduce((s, g) => s + g.importe, 0);
  return { ...d, mes, cierres: { ...d.cierres, [d.mes]: { saldo: d.saldo, gastos: gastado } } };
}

const TABS = [
  { id: "inicio", nombre: "Inicio", icono: House },
  { id: "transacciones", nombre: "Transacciones", icono: Receipt },
  { id: "metas", nombre: "Metas", icono: Target },
  { id: "chat", nombre: "Chat IA", icono: MessageCircle },
];

/* ───────────────────────── Guardado y tema ───────────────────────── */

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

/* ───────────────────────── Cálculos ───────────────────────── */

function gastosDelMes(gastos, mes) {
  return gastos.filter((g) => g.categoria && g.fecha.startsWith(mes));
}

function resumenMes(d, mes) {
  const lista = gastosDelMes(d.gastos, mes);
  const total = lista.reduce((s, g) => s + g.importe, 0);
  const porCategoria = CATEGORIAS.map((c) => {
    const gastado = lista.filter((g) => g.categoria === c.id).reduce((s, g) => s + g.importe, 0);
    const presupuesto = d.presupuestos[c.id] ?? null;
    return { ...c, gastado, parte: total ? gastado / total : 0, presupuesto, uso: presupuesto ? gastado / presupuesto : null };
  });
  const previo = mesAnterior(mes);
  const listaPrevia = gastosDelMes(d.gastos, previo);
  const totalPrevio = listaPrevia.length ? listaPrevia.reduce((s, g) => s + g.importe, 0) : (d.cierres[previo]?.gastos ?? null);
  return { total, porCategoria, excedidas: porCategoria.filter((c) => c.uso !== null && c.uso > 1), variacion: totalPrevio ? total / totalPrevio - 1 : null };
}

function infoMeta(m, hoy) {
  const falta = Math.max(m.objetivo - m.ahorrado, 0);
  const totalDias = Math.max(diasEntre(m.inicio, m.fechaObjetivo), 1);
  const avanceTiempo = Math.min(Math.max(diasEntre(m.inicio, hoy) / totalDias, 0), 1);
  const esperado = m.ahorradoInicio + (m.objetivo - m.ahorradoInicio) * avanceTiempo;
  const dias = diasEntre(hoy, m.fechaObjetivo);
  const meses = mesesCompletos(hoy, m.fechaObjetivo);
  let estado;
  if (!falta) estado = { texto: "¡Meta cumplida!", tono: "verde" };
  else if (dias < 0) estado = { texto: "Plazo vencido", tono: "rojo" };
  else if (m.ahorrado + 0.5 >= esperado) estado = { texto: "En buen camino", tono: "verde" };
  else estado = { texto: "Vas con retraso", tono: "ambar" };
  const plazo = !falta
    ? "Meta alcanzada"
    : dias < 0
      ? `El plazo terminó el ${fechaCorta(m.fechaObjetivo)}`
      : meses >= 1
        ? `Faltan ${meses} ${meses === 1 ? "mes" : "meses"}`
        : `Faltan ${dias} ${dias === 1 ? "día" : "días"}`;
  return { falta, progreso: m.objetivo ? m.ahorrado / m.objetivo : 0, estado, plazo };
}

const TONOS = {
  verde: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ambar: "bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  rojo: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
};

function textoVence(dias) {
  if (dias < 0) return `Vencido hace ${-dias} ${dias === -1 ? "día" : "días"}`;
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
const campo =
  "w-full rounded-xl bg-slate-50 px-3.5 py-3 text-[15px] font-semibold ring-1 ring-slate-200 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10";
const etiqueta = "mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400";
const botonPrincipal = `rounded-2xl bg-violet-600 py-3.5 text-[15px] font-extrabold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`;

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
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg motion-safe:animate-sheet sm:max-w-md sm:rounded-3xl sm:pb-6 dark:bg-[#1b1830] dark:ring-1 dark:ring-white/10">
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

function BotonBorrar({ onClick, etiqueta: aria }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 ${foco}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function MensajeError({ texto }) {
  return texto ? <p className="mt-1.5 text-xs font-bold text-red-600 dark:text-red-400">{texto}</p> : null;
}

/* ───────────────────────── App ───────────────────────── */

export default function AsesorFinanciero() {
  const [oscuro, alternarTema] = useTema("asesor-financiero:tema");
  const [datos, setDatos] = useGuardado("asesor-financiero", estadoInicial);
  const [tab, setTab] = useState("inicio");
  const [mesSel, setMesSel] = useState(() => hoyISO().slice(0, 7));
  const [hoja, setHoja] = useState(null); // "gasto" | "saldo" | "avisos" | "meta" | "pago-nuevo" | {aportar} | {categoria} | {pago}
  const [toast, setToast] = useState(null);
  const [chat, setChat] = useState([{ de: "ia", texto: "Hola, Diego. Pregúntame por tu saldo, tus gastos, tus presupuestos, tus próximos pagos o tus metas de ahorro." }]);
  const toastRef = useRef();
  const hoy = hoyISO();
  const mesActual = hoy.slice(0, 7);

  useEffect(() => {
    if (datos.mes < mesActual) setDatos((d) => alDia(d, hoyISO()));
  }, [datos.mes, mesActual, setDatos]);

  const avisar = useCallback((texto, tono = "normal") => {
    clearTimeout(toastRef.current);
    setToast({ texto, tono });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const resumen = resumenMes(datos, mesSel);
  const resumenActual = mesSel === mesActual ? resumen : resumenMes(datos, mesActual);
  const pagosOrdenados = [...datos.pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pagosUrgentes = pagosOrdenados.filter((p) => diasEntre(hoy, p.fecha) <= 10);
  const metasRetrasadas = datos.metas.filter((m) => ["ambar", "rojo"].includes(infoMeta(m, hoy).estado.tono));
  const numAvisos = resumenActual.excedidas.length + pagosUrgentes.length + metasRetrasadas.length;
  const meses = [...new Set([mesActual, ...datos.gastos.map((g) => g.fecha.slice(0, 7))])].sort().reverse();

  const conSaldo = (d, nuevo) => ({ ...d, saldo: nuevo, historialSaldo: [...d.historialSaldo, { fecha: hoyISO(), saldo: nuevo }].slice(-400) });

  const acciones = {
    registrarGasto: ({ importe, categoria, concepto, fecha }) => {
      const cat = resumenActual.porCategoria.find((c) => c.id === categoria);
      setDatos((d) => ({ ...conSaldo(d, d.saldo - importe), gastos: [...d.gastos, { id: nuevoId(), fecha, categoria, importe, concepto, afectaSaldo: true }] }));
      cerrarHoja();
      if (fecha.startsWith(mesActual) && cat.presupuesto && cat.gastado <= cat.presupuesto && cat.gastado + importe > cat.presupuesto)
        avisar(`Te has pasado del presupuesto de ${cat.nombre}`, "alerta");
      else avisar(`Gasto de ${mxn(importe)} registrado`);
    },
    borrarGasto: (g) => setDatos((d) => ({ ...(g.afectaSaldo ? conSaldo(d, d.saldo + g.importe) : d), gastos: d.gastos.filter((x) => x.id !== g.id) })),
    fijarSaldo: (valor) => {
      setDatos((d) => conSaldo(d, valor));
      cerrarHoja();
      avisar("Saldo actualizado");
    },
    fijarPresupuesto: (categoria, valor) => {
      setDatos((d) => ({ ...d, presupuestos: { ...d.presupuestos, [categoria]: valor || undefined } }));
      avisar(valor ? `Presupuesto de ${CAT[categoria].nombre}: ${mxn(valor)}` : `Presupuesto de ${CAT[categoria].nombre} quitado`);
    },
    aportar: (metaId, importe) => {
      setDatos((d) => ({ ...d, metas: d.metas.map((m) => (m.id === metaId ? { ...m, ahorrado: m.ahorrado + importe } : m)) }));
      cerrarHoja();
      avisar(`Aportaste ${mxn(importe)}`);
    },
    crearMeta: (m) => {
      setDatos((d) => ({ ...d, metas: [...d.metas, { ...m, id: nuevoId(), inicio: hoyISO(), ahorradoInicio: m.ahorrado }] }));
      cerrarHoja();
      avisar(`Meta «${m.nombre}» creada`);
    },
    borrarMeta: (id) => setDatos((d) => ({ ...d, metas: d.metas.filter((m) => m.id !== id) })),
    pagar: (pago, categoria) => {
      setDatos((d) => ({
        ...conSaldo(d, d.saldo - pago.importe),
        pagos: d.pagos.filter((p) => p.id !== pago.id),
        gastos: [...d.gastos, { id: nuevoId(), fecha: hoyISO(), categoria: categoria || null, importe: pago.importe, concepto: pago.nombre, afectaSaldo: false }],
      }));
      cerrarHoja();
      avisar(`${pago.nombre} pagado`);
    },
    borrarPago: (id) => {
      setDatos((d) => ({ ...d, pagos: d.pagos.filter((p) => p.id !== id) }));
      cerrarHoja();
    },
    crearPago: (p) => {
      setDatos((d) => ({ ...d, pagos: [...d.pagos, { ...p, id: nuevoId() }] }));
      cerrarHoja();
      avisar(`Pago «${p.nombre}» añadido`);
    },
  };

  const pagoAbierto = hoja?.pago ? datos.pagos.find((p) => p.id === hoja.pago) : null;
  const metaAportar = hoja?.aportar ? datos.metas.find((m) => m.id === hoja.aportar) : null;
  const catAbierta = hoja?.categoria ? resumen.porCategoria.find((c) => c.id === hoja.categoria) : null;

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
          <span className="ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-sm font-extrabold text-white" aria-label="Diego">
            D
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl gutter pb-[calc(100px+env(safe-area-inset-bottom,0px))]">
        {tab === "inicio" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TarjetaSaldo datos={datos} mes={mesSel} meses={meses} setMes={setMesSel} mesActual={mesActual} onEditar={() => setHoja("saldo")} />
            <TarjetaGastos
              resumen={resumen}
              titulo={mesSel === mesActual ? "Tus gastos este mes" : `Tus gastos en ${nombreMes(mesSel).toLowerCase()}`}
              onCategoria={(c) => setHoja({ categoria: c.id })}
              onNuevoGasto={() => setHoja("gasto")}
            />
            <TarjetaMeta meta={datos.metas[0]} hoy={hoy} onAportar={() => setHoja({ aportar: datos.metas[0].id })} onCrear={() => setHoja("meta")} />
            <TarjetaPagos pagos={pagosOrdenados} hoy={hoy} onPago={(p) => setHoja({ pago: p.id })} onNuevo={() => setHoja("pago-nuevo")} />
          </div>
        )}
        {tab === "transacciones" && <VistaTransacciones gastos={datos.gastos} hoy={hoy} onBorrar={acciones.borrarGasto} onNuevoGasto={() => setHoja("gasto")} />}
        {tab === "metas" && <VistaMetas metas={datos.metas} hoy={hoy} onAportar={(id) => setHoja({ aportar: id })} onNueva={() => setHoja("meta")} onBorrar={acciones.borrarMeta} />}
        {tab === "chat" && <VistaChat chat={chat} setChat={setChat} datos={datos} hoy={hoy} />}
      </main>

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
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center gutter">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold shadow-lg motion-safe:animate-sheet ${toast.tono === "alerta" ? "bg-red-600 text-white" : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"}`}
          >
            {toast.tono === "alerta" ? <AlertTriangle className="size-4" /> : <Check className="size-4" />}
            {toast.texto}
          </div>
        </div>
      )}

      <Hoja abierta={hoja === "gasto"} onCerrar={cerrarHoja} titulo="Registrar gasto" icono={Receipt}>
        <FormGasto onGuardar={acciones.registrarGasto} hoy={hoy} />
      </Hoja>

      <Hoja abierta={hoja === "saldo"} onCerrar={cerrarHoja} titulo="Actualizar saldo" icono={Landmark}>
        <FormSaldo saldo={datos.saldo} onGuardar={acciones.fijarSaldo} />
      </Hoja>

      <Hoja abierta={hoja === "avisos"} onCerrar={cerrarHoja} titulo="Alertas" icono={Bell}>
        <ul className="grid grid-cols-1 gap-2">
          {resumenActual.excedidas.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-2xl bg-red-50 p-3.5 text-sm text-red-900 dark:bg-red-500/10 dark:text-red-100">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>
                <strong className="font-extrabold">Te estás pasando en {c.nombre}.</strong> Llevas {mxn(c.gastado)} de {mxn(c.presupuesto)}.
              </span>
            </li>
          ))}
          {pagosUrgentes.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 text-sm dark:bg-white/5">
              <CreditCard className="mt-0.5 size-5 shrink-0 text-violet-600 dark:text-violet-400" />
              <span>
                <strong className="font-extrabold">{p.nombre}</strong>: {mxn(p.importe)} · {textoVence(diasEntre(hoy, p.fecha)).toLowerCase()} ({fechaCorta(p.fecha)}).
              </span>
            </li>
          ))}
          {metasRetrasadas.map((m) => (
            <li key={m.id} className="flex gap-3 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
              <Target className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <span>
                <strong className="font-extrabold">{m.nombre}</strong>: {infoMeta(m, hoy).estado.texto.toLowerCase()}.
              </span>
            </li>
          ))}
          {numAvisos === 0 && <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No tienes alertas.</li>}
        </ul>
      </Hoja>

      {metaAportar && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={`Aportar a «${metaAportar.nombre}»`} icono={Target}>
          <FormAporte meta={metaAportar} hoy={hoy} onAportar={acciones.aportar} />
        </Hoja>
      )}

      {catAbierta && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={catAbierta.nombre} icono={catAbierta.icono}>
          <DetalleCategoria
            cat={catAbierta}
            gastos={gastosDelMes(datos.gastos, mesSel).filter((g) => g.categoria === catAbierta.id)}
            onPresupuesto={(v) => acciones.fijarPresupuesto(catAbierta.id, v)}
          />
        </Hoja>
      )}

      {pagoAbierto && (
        <Hoja abierta onCerrar={cerrarHoja} titulo={pagoAbierto.nombre} icono={CreditCard}>
          <FormPagar pago={pagoAbierto} saldo={datos.saldo} hoy={hoy} onPagar={acciones.pagar} onBorrar={() => acciones.borrarPago(pagoAbierto.id)} />
        </Hoja>
      )}

      <Hoja abierta={hoja === "pago-nuevo"} onCerrar={cerrarHoja} titulo="Nuevo pago" icono={CreditCard}>
        <FormPagoNuevo hoy={hoy} onGuardar={acciones.crearPago} />
      </Hoja>

      <Hoja abierta={hoja === "meta"} onCerrar={cerrarHoja} titulo="Nueva meta" icono={Target}>
        <FormMeta hoy={hoy} onCrear={acciones.crearMeta} />
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
  const x = (i) => (valores.length === 1 ? W : (i / (valores.length - 1)) * W);
  const y = (v) => 8 + (1 - (max === min ? 0.5 : (v - min) / (max - min))) * (H - 16);
  const linea = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[72px] w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="relleno-saldo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {valores.length > 1 && <path d={`${linea} L${W},${H} L0,${H} Z`} fill="url(#relleno-saldo)" />}
      {valores.length > 1 && <path d={linea} fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      <circle cx={W} cy={y(valores.at(-1))} r="4.5" fill="#ffffff" stroke="#34d399" strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TarjetaSaldo({ datos, mes, meses, setMes, mesActual, onEditar }) {
  const previo = datos.cierres[mesAnterior(mes)]?.saldo ?? null;
  const delMes = datos.historialSaldo.filter((h) => h.fecha.startsWith(mes)).map((h) => h.saldo);
  const saldo = mes === mesActual ? datos.saldo : (datos.cierres[mes]?.saldo ?? delMes.at(-1) ?? null);
  const valores = [...(previo !== null ? [previo] : []), ...delMes];
  const cambio = previo && saldo !== null ? saldo / previo - 1 : null;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-xl shadow-violet-700/25 sm:p-6 md:col-span-2">
      <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-violet-100">
          <Landmark className="size-4" /> Saldo total
        </p>
        <div className="relative">
          <label htmlFor="periodo" className="sr-only">
            Mes
          </label>
          <select
            id="periodo"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="appearance-none rounded-full bg-white/15 py-1.5 pr-8 pl-3 text-xs font-bold text-white ring-1 ring-white/25 outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white [&>option]:text-slate-900"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {m === mesActual ? "Este mes" : nombreMes(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" strokeWidth={3} />
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="flex items-center gap-2 text-[34px] leading-none font-extrabold tracking-tight tabular-nums sm:text-[40px]">
            {saldo === null ? "—" : mxn(saldo)} <span className="text-lg font-bold text-violet-200">MXN</span>
            {mes === mesActual && (
              <button type="button" onClick={onEditar} aria-label="Actualizar saldo" className={`grid size-8 place-items-center rounded-full bg-white/15 hover:bg-white/25 ${foco}`}>
                <Pencil className="size-4" />
              </button>
            )}
          </p>
          {cambio !== null && (
            <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${cambio >= 0 ? "bg-emerald-400 text-emerald-950" : "bg-red-400 text-red-950"}`}>
              {cambio >= 0 ? "+" : "−"}
              {Math.abs(cambio * 100).toFixed(1)}% vs mes anterior
            </p>
          )}
        </div>
        {valores.length > 0 && (
          <div className="w-full sm:w-[46%]">
            <Sparkline valores={valores} />
          </div>
        )}
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

function TarjetaGastos({ resumen, titulo, onCategoria, onNuevoGasto }) {
  const { total, variacion, porCategoria, excedidas } = resumen;
  return (
    <Tarjeta className="p-5 sm:p-6 md:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">{titulo}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight tabular-nums">{mxn(total)} MXN</span>
            {variacion !== null && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${variacion > 0 ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"}`}
              >
                {variacion > 0 ? "↑" : "↓"} {Math.abs(Math.round(variacion * 100))}%
              </span>
            )}
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
        <Dona categorias={porCategoria} total={total} />
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
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Toca una categoría para ver sus gastos y asignarle un presupuesto.</p>

      {excedidas.map((c) => (
        <div key={c.id} className="mt-4 flex gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-100 dark:bg-red-500/10 dark:ring-red-500/20">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-500 text-white">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0 text-sm text-red-900 dark:text-red-100">
            <p className="font-extrabold">Te estás pasando en {c.nombre}</p>
            <p className="mt-0.5">
              Llevas {mxn(c.gastado)} de {mxn(c.presupuesto)} (+{Math.round((c.uso - 1) * 100)}%).
            </p>
          </div>
        </div>
      ))}
    </Tarjeta>
  );
}

function TarjetaMeta({ meta, hoy, onAportar, onCrear }) {
  if (!meta) {
    return (
      <Tarjeta className="flex flex-col p-5 sm:p-6">
        <h2 className="text-[15px] font-extrabold tracking-tight">Tu meta de ahorro</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No tienes metas de ahorro.</p>
        <button type="button" onClick={onCrear} className={`mt-4 ${botonPrincipal}`}>
          Crear meta
        </button>
      </Tarjeta>
    );
  }
  const { progreso, estado, plazo, falta } = infoMeta(meta, hoy);
  return (
    <Tarjeta className="flex flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">Tu meta de ahorro</h2>
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${TONOS[estado.tono]}`}>
          {estado.tono === "verde" && <Check className="size-3.5" strokeWidth={3} />} {estado.texto}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <Target className="size-6" />
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
        <div className="mt-2 flex justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="text-emerald-700 dark:text-emerald-300">{pct(progreso)}</span>
          <span>{plazo}</span>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onAportar}
          disabled={!falta}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 disabled:opacity-40 ${foco}`}
        >
          <Plus className="size-4" strokeWidth={3} /> Aportar fondos
        </button>
      </div>
    </Tarjeta>
  );
}

function TarjetaPagos({ pagos, hoy, onPago, onNuevo }) {
  return (
    <Tarjeta className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-tight">Próximos pagos</h2>
        <button
          type="button"
          onClick={onNuevo}
          className={`flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 ${foco}`}
        >
          <Plus className="size-3.5" strokeWidth={3} /> Añadir
        </button>
      </div>
      {pagos.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">No tienes pagos pendientes.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-1">
          {pagos.map((p) => {
            const dias = diasEntre(hoy, p.fecha);
            const urgente = dias <= 10;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => onPago(p)} className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}>
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl ${urgente ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}
                  >
                    <CreditCard className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold">{p.nombre}</span>
                    <span className="block text-xs font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {mxn(p.importe)} · {fechaCorta(p.fecha)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${urgente ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}
                  >
                    {textoVence(dias)}
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

function FormGasto({ onGuardar, hoy }) {
  const [importe, setImporte] = useState("");
  const [categoria, setCategoria] = useState(null);
  const [concepto, setConcepto] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const n = Number(importe);
  const valido = n > 0 && categoria && fecha;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ importe: Math.round(n), categoria, concepto: concepto.trim(), fecha });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="gasto-importe" className={etiqueta}>
          Importe
        </label>
        <CampoImporte id="gasto-importe" valor={importe} setValor={setImporte} autoFocus />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold ring-1 transition ${foco} ${categoria === c.id ? "bg-violet-600 text-white ring-violet-600 dark:bg-violet-500 dark:ring-violet-500" : "ring-slate-200 hover:ring-violet-300 dark:ring-white/10"}`}
            >
              <c.icono className="size-3.5" /> {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="gasto-concepto" className={etiqueta}>
            Descripción (opcional)
          </label>
          <input id="gasto-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} className={campo} />
        </div>
        <div>
          <label htmlFor="gasto-fecha" className={etiqueta}>
            Fecha
          </label>
          <input id="gasto-fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} className={campo} />
        </div>
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar gasto
      </button>
    </form>
  );
}

function FormSaldo({ saldo, onGuardar }) {
  const [valor, setValor] = useState(String(saldo));
  const n = Number(valor);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valor !== "" && n >= 0) onGuardar(Math.round(n));
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="saldo-valor" className={etiqueta}>
          Saldo total actual
        </label>
        <CampoImporte id="saldo-valor" valor={valor} setValor={setValor} autoFocus />
      </div>
      <button type="submit" disabled={valor === ""} className={botonPrincipal}>
        Guardar saldo
      </button>
    </form>
  );
}

function FormAporte({ meta, hoy, onAportar }) {
  const [importe, setImporte] = useState("");
  const { falta } = infoMeta(meta, hoy);
  const n = Number(importe);
  const error = importe && !(n > 0) ? "Escribe un importe mayor que 0." : n > falta ? `Solo te faltan ${mxn(falta)} para la meta.` : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (n > 0 && !error) onAportar(meta.id, Math.round(n));
      }}
      className="grid grid-cols-1 gap-4"
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Llevas {mxn(meta.ahorrado)} de {mxn(meta.objetivo)}. Te faltan {mxn(falta)}.
      </p>
      <div>
        <label htmlFor="aporte-importe" className={etiqueta}>
          ¿Cuánto quieres aportar?
        </label>
        <CampoImporte id="aporte-importe" valor={importe} setValor={setImporte} autoFocus />
        <MensajeError texto={error} />
      </div>
      <button type="submit" disabled={!(n > 0) || !!error} className={`rounded-2xl bg-emerald-500 py-3.5 text-[15px] font-extrabold text-white hover:bg-emerald-600 disabled:opacity-40 ${foco}`}>
        Aportar
      </button>
    </form>
  );
}

function FormMeta({ hoy, onCrear }) {
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [ahorrado, setAhorrado] = useState("");
  const [fecha, setFecha] = useState("");
  const valido = nombre.trim() && Number(objetivo) > 0 && fecha > hoy && Number(ahorrado || 0) >= 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onCrear({ nombre: nombre.trim(), objetivo: Math.round(Number(objetivo)), ahorrado: Math.round(Number(ahorrado || 0)), fechaObjetivo: fecha });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="meta-nombre" className={etiqueta}>
          Nombre
        </label>
        <input id="meta-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="meta-objetivo" className={etiqueta}>
          ¿Cuánto necesitas?
        </label>
        <CampoImporte id="meta-objetivo" valor={objetivo} setValor={setObjetivo} />
      </div>
      <div>
        <label htmlFor="meta-ahorrado" className={etiqueta}>
          ¿Cuánto llevas ahorrado?
        </label>
        <CampoImporte id="meta-ahorrado" valor={ahorrado} setValor={setAhorrado} />
      </div>
      <div>
        <label htmlFor="meta-fecha" className={etiqueta}>
          ¿Para cuándo?
        </label>
        <input id="meta-fecha" type="date" min={sumarDias(hoy, 1)} value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Crear meta
      </button>
    </form>
  );
}

function FormPagar({ pago, saldo, hoy, onPagar, onBorrar }) {
  const [categoria, setCategoria] = useState("");
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          Vence el {fechaCorta(pago.fecha)} · {textoVence(diasEntre(hoy, pago.fecha)).toLowerCase()}
        </p>
        <p className="text-2xl font-extrabold tabular-nums">{mxn(pago.importe)}</p>
      </div>
      <div>
        <label htmlFor="pago-categoria" className={etiqueta}>
          ¿Lo cuento como gasto de alguna categoría?
        </label>
        <select id="pago-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className={campo}>
          <option value="">No, solo descontarlo del saldo</option>
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              Sí, en {c.nombre}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Tu saldo pasará de {mxn(saldo)} a <strong className="font-extrabold">{mxn(saldo - pago.importe)}</strong>.
      </p>
      <button type="button" onClick={() => onPagar(pago, categoria)} className={botonPrincipal}>
        Marcar como pagado
      </button>
      <button
        type="button"
        onClick={onBorrar}
        className={`rounded-2xl py-2.5 text-sm font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 ${foco}`}
      >
        Eliminar este pago
      </button>
    </div>
  );
}

function FormPagoNuevo({ hoy, onGuardar }) {
  const [nombre, setNombre] = useState("");
  const [importe, setImporte] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const valido = nombre.trim() && Number(importe) > 0 && fecha;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ nombre: nombre.trim(), importe: Math.round(Number(importe)), fecha });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="pago-nombre" className={etiqueta}>
          Concepto
        </label>
        <input id="pago-nombre" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="pago-importe" className={etiqueta}>
          Importe
        </label>
        <CampoImporte id="pago-importe" valor={importe} setValor={setImporte} />
      </div>
      <div>
        <label htmlFor="pago-fecha" className={etiqueta}>
          Fecha de vencimiento
        </label>
        <input id="pago-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Añadir pago
      </button>
    </form>
  );
}

function DetalleCategoria({ cat, gastos, onPresupuesto }) {
  const [valor, setValor] = useState(cat.presupuesto ? String(cat.presupuesto) : "");
  const ordenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <div>
      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
        <p className="text-2xl font-extrabold tracking-tight tabular-nums">{mxn(cat.gastado)}</p>
        {cat.presupuesto ? (
          <>
            <div className="mt-3">
              <Barra valor={cat.uso} className={cat.uso > 1 ? "bg-red-500" : cat.uso >= 0.9 ? "bg-amber-400" : "bg-emerald-500"} alto="h-2.5" />
            </div>
            <p className={`mt-2 text-xs font-bold ${cat.uso > 1 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
              {cat.uso > 1
                ? `Te pasas ${mxn(cat.gastado - cat.presupuesto)} de tu presupuesto de ${mxn(cat.presupuesto)}`
                : `Te quedan ${mxn(cat.presupuesto - cat.gastado)} de ${mxn(cat.presupuesto)}`}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Sin presupuesto asignado</p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPresupuesto(valor === "" ? null : Math.round(Number(valor)));
        }}
        className="mt-4"
      >
        <label htmlFor="presupuesto-valor" className={etiqueta}>
          Presupuesto mensual
        </label>
        <div className="flex gap-2">
          <input id="presupuesto-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Sin presupuesto" className={campo} />
          <button type="submit" className={`shrink-0 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white hover:bg-violet-700 ${foco}`}>
            Guardar
          </button>
        </div>
      </form>
      <h3 className="mt-5 mb-2 text-xs font-extrabold tracking-wider text-slate-400 uppercase">Gastos ({ordenados.length})</h3>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {ordenados.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-bold">{g.concepto || cat.nombre}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{fechaCorta(g.fecha)}</span>
            </span>
            <span className="shrink-0 font-extrabold tabular-nums">−{mxn(g.importe)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── Transacciones y metas ───────────────────────── */

function VistaTransacciones({ gastos, hoy, onBorrar, onNuevoGasto }) {
  const ordenados = [...gastos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  const grupos = [];
  for (const g of ordenados) {
    if (grupos.at(-1)?.fecha !== g.fecha) grupos.push({ fecha: g.fecha, items: [] });
    grupos.at(-1).items.push(g);
  }
  return (
    <div>
      <div className="flex items-end justify-between gap-3 pt-2 pb-4">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Transacciones</h1>
        <button type="button" onClick={onNuevoGasto} className={`flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" strokeWidth={3} /> Registrar gasto
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {grupos.map((grupo) => (
          <Tarjeta key={grupo.fecha} className="px-4 py-2">
            <h2 className="pt-2 pb-1 text-xs font-extrabold tracking-wider text-slate-400 uppercase">
              {grupo.fecha === hoy ? "Hoy" : capital(new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(deISO(grupo.fecha)))}
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {grupo.items.map((g) => {
                const c = CAT[g.categoria];
                const Icono = c?.icono ?? CreditCard;
                return (
                  <li key={g.id} className="flex items-center gap-3 py-2.5">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${c?.suave ?? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"}`}>
                      <Icono className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{g.concepto || c?.nombre}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{c?.nombre ?? "Pago"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums">−{mxn(g.importe)}</span>
                    <BotonBorrar onClick={() => onBorrar(g)} etiqueta={`Borrar ${g.concepto || c?.nombre || "movimiento"}`} />
                  </li>
                );
              })}
            </ul>
          </Tarjeta>
        ))}
        {grupos.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No tienes movimientos.</p>}
      </div>
    </div>
  );
}

function VistaMetas({ metas, hoy, onAportar, onNueva, onBorrar }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-3 pt-2 pb-4">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Metas</h1>
        <button type="button" onClick={onNueva} className={`flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-4" strokeWidth={3} /> Nueva meta
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {metas.map((m) => {
          const { progreso, estado, plazo, falta } = infoMeta(m, hoy);
          return (
            <li key={m.id}>
              <Tarjeta className="p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                    <Target className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{m.nombre}</p>
                    <p className="text-sm font-semibold text-slate-500 tabular-nums dark:text-slate-400">
                      {mxn(m.ahorrado)} / {mxn(m.objetivo)}
                    </p>
                  </div>
                  <BotonBorrar onClick={() => onBorrar(m.id)} etiqueta={`Borrar la meta ${m.nombre}`} />
                </div>
                <div className="mt-3">
                  <Barra valor={progreso} className="bg-emerald-500" />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${TONOS[estado.tono]}`}>{estado.texto}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {pct(progreso)} · {plazo}
                  </span>
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
      {metas.length === 0 && <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No tienes metas de ahorro.</p>}
    </div>
  );
}

/* ───────────────────────── Chat IA ───────────────────────── */

// Respuestas simuladas: se reconoce la pregunta por palabras clave y se contesta solo con tus datos.
function responder(pregunta, d, hoy) {
  const q = pregunta.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const mes = hoy.slice(0, 7);
  const r = resumenMes(d, mes);
  const conGasto = r.porCategoria.filter((c) => c.gastado > 0).sort((a, b) => b.gastado - a.gastado);
  const cat = r.porCategoria.find((c) => q.includes(c.nombre.toLowerCase().slice(0, 6)));
  const pagos = [...d.pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (cat) {
    const base = `En **${cat.nombre}** llevas **${mxn(cat.gastado)}** este mes (${pct(cat.parte)} de tus gastos).`;
    if (!cat.presupuesto) return `${base}\nNo tiene presupuesto asignado.`;
    return `${base}\n${cat.uso > 1 ? `Te pasas ${mxn(cat.gastado - cat.presupuesto)} de tu presupuesto de ${mxn(cat.presupuesto)}.` : `Te quedan ${mxn(cat.presupuesto - cat.gastado)} de tu presupuesto de ${mxn(cat.presupuesto)}.`}`;
  }
  if (/ahorr|recort|reduc|gastar menos/.test(q)) {
    if (!conGasto.length) return "Este mes no tienes gastos registrados.";
    const lineas = [`Tu mayor gasto este mes es **${conGasto[0].nombre}**: ${mxn(conGasto[0].gastado)} (${pct(conGasto[0].parte)}).`];
    r.excedidas.forEach((c) => lineas.push(`• Te pasas ${mxn(c.gastado - c.presupuesto)} en ${c.nombre}.`));
    if (!r.excedidas.length)
      lineas.push(Object.keys(d.presupuestos).length ? "No te estás pasando en ninguna categoría con presupuesto." : "Asigna presupuestos a tus categorías y te diré dónde te pasas.");
    return lineas.join("\n");
  }
  if (/meta|viaje|objetivo/.test(q)) {
    if (!d.metas.length) return "No tienes metas de ahorro.";
    return d.metas
      .map((m) => {
        const { falta, progreso, estado, plazo } = infoMeta(m, hoy);
        return `**${m.nombre}**: ${mxn(m.ahorrado)} de ${mxn(m.objetivo)} (${pct(progreso)}). ${estado.texto}.${falta ? ` Te faltan ${mxn(falta)}. ${plazo}.` : ""}`;
      })
      .join("\n");
  }
  if (/pago|vence|venc|tarjeta|recibo|deuda|pagar/.test(q)) {
    if (!pagos.length) return "No tienes pagos pendientes.";
    const total = pagos.reduce((s, p) => s + p.importe, 0);
    return `Tienes ${pagos.length} ${pagos.length === 1 ? "pago pendiente" : "pagos pendientes"} por **${mxn(total)}**:\n${pagos.map((p) => `• ${p.nombre}: ${mxn(p.importe)}, ${textoVence(diasEntre(hoy, p.fecha)).toLowerCase()} (${fechaCorta(p.fecha)})`).join("\n")}\nDespués de pagarlos te quedarían ${mxn(d.saldo - total)}.`;
  }
  if (/presupuesto|limite/.test(q)) {
    const con = r.porCategoria.filter((c) => c.presupuesto);
    if (!con.length) return "Aún no has asignado presupuestos. Toca una categoría en Inicio para asignarle uno.";
    return `Así van tus presupuestos este mes:\n${con.map((c) => `• ${c.nombre}: ${mxn(c.gastado)} de ${mxn(c.presupuesto)} (${pct(c.uso)})${c.uso > 1 ? " ⚠️" : ""}`).join("\n")}`;
  }
  if (/saldo|dinero|tengo|cuenta|disponible/.test(q)) {
    const previo = d.cierres[mesAnterior(mes)]?.saldo;
    return `Tu saldo total es de **${mxn(d.saldo)} MXN**.${previo ? ` El mes pasado cerraste con ${mxn(previo)}.` : ""}`;
  }
  if (/como voy|mes|gasto|gastado|gaste|resumen/.test(q)) {
    if (!r.total) return "Este mes no tienes gastos registrados.";
    return `Este mes llevas **${mxn(r.total)}** en gastos${r.variacion !== null ? `, un ${Math.abs(Math.round(r.variacion * 100))}% ${r.variacion > 0 ? "más" : "menos"} que el mes pasado` : ""}.\nTu mayor gasto es **${conGasto[0].nombre}** (${pct(conGasto[0].parte)}).${r.excedidas.length ? `\n⚠️ Te estás pasando en ${new Intl.ListFormat("es", { type: "conjunction" }).format(r.excedidas.map((c) => c.nombre))}.` : ""}`;
  }
  return "Puedo responderte sobre tu saldo, tus gastos del mes o de una categoría, tus presupuestos, tus próximos pagos y tus metas de ahorro.";
}

function VistaChat({ chat, setChat, datos, hoy }) {
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const finRef = useRef();
  const datosRef = useRef(datos);
  datosRef.current = datos;

  useEffect(() => {
    if (chat.length > 1 || escribiendo) finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, escribiendo]);

  const enviar = (e) => {
    e.preventDefault();
    const p = texto.trim();
    if (!p || escribiendo) return;
    setChat((c) => [...c, { de: "yo", texto: p }]);
    setTexto("");
    setEscribiendo(true);
    setTimeout(() => {
      setChat((c) => [...c, { de: "ia", texto: responder(p, datosRef.current, hoy) }]);
      setEscribiendo(false);
    }, 700);
  };

  return (
    <div className="flex flex-col">
      <div className="pt-2 pb-3">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">Chat IA</h1>
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
        <form
          onSubmit={enviar}
          className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-900/10 focus-within:ring-2 focus-within:ring-violet-500 dark:bg-[#171427] dark:ring-white/10"
        >
          <label htmlFor="chat-texto" className="sr-only">
            Escribe tu pregunta
          </label>
          <input
            id="chat-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta"
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
        <p className="mt-2 text-center text-[11px] text-slate-400">Respuestas simuladas con tus datos. No es asesoría financiera profesional.</p>
      </div>
    </div>
  );
}
