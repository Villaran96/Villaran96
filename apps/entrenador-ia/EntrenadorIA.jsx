// Entrenador IA: nutrición del día, rutina de gimnasio con sobrecarga progresiva y evolución física.
// Un solo archivo: datos de ejemplo, estado y todas las vistas.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Check,
  ChevronRight,
  Droplet,
  Dumbbell,
  Flame,
  LineChart,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scale,
  SlidersHorizontal,
  Sun,
  Timer,
  TrendingDown,
  TrendingUp,
  Utensils,
  X,
  Zap,
} from "lucide-react";

/* ───────────────────────── Datos de ejemplo ───────────────────────── */

const MANTENIMIENTO = 2850; // gasto calórico estimado
const PROTEINA = 190; // g; se mantiene fija aunque cambien las calorías
const BASE = { kcal: 2600, carbos: 280, grasas: 75 };

const COMIDAS_INICIALES = [
  {
    id: "desayuno",
    momento: "Desayuno",
    hora: "08:00",
    nombre: "Huevos con aguacate",
    kcal: 620,
    p: 35,
    c: 48,
    g: 26,
    emoji: "🍳",
    detalle: "3 huevos, ½ aguacate, 2 tostadas integrales y café",
    hecha: true,
  },
  {
    id: "comida",
    momento: "Comida",
    hora: "14:00",
    nombre: "Pollo con arroz y verduras",
    kcal: 850,
    p: 65,
    c: 120,
    g: 12,
    emoji: "🍗",
    detalle: "200 g de pechuga, 150 g de arroz y verduras salteadas",
    hecha: true,
  },
  { id: "cena", momento: "Cena", hora: "21:00", nombre: "Salmón con ensalada", kcal: 780, p: 55, c: 80, g: 23, emoji: "🐟", detalle: "180 g de salmón, ensalada verde y quinoa", hecha: true },
  { id: "snack", momento: "Snack", hora: "18:00", nombre: "Batido de proteína", kcal: 200, p: 30, c: 12, g: 4, emoji: "🥤", detalle: "1 cacito de whey con leche desnatada", hecha: true },
];

const EJERCICIOS = [
  { id: "banca", nombre: "Press de banca", series: 4, reps: 8, peso: "80 kg", sube: "+2.5 kg", musculo: "Pecho" },
  { id: "inclinado", nombre: "Press inclinado con mancuernas", series: 3, reps: 10, peso: "30 kg", musculo: "Pecho" },
  { id: "laterales", nombre: "Elevaciones laterales", series: 4, reps: 12, peso: "14 kg", musculo: "Hombro" },
  { id: "fondos", nombre: "Fondos en paralelas", series: 3, reps: 10, peso: "Peso corporal", musculo: "Tríceps" },
  { id: "triceps", nombre: "Extensión de tríceps en polea", series: 3, reps: 12, peso: "25 kg", musculo: "Tríceps" },
  { id: "aperturas", nombre: "Aperturas en polea", series: 3, reps: 15, peso: "12 kg", musculo: "Pecho" },
];

// Rutina según los días de entrenamiento por semana; "Push" es la sesión de hoy.
const RUTINAS = {
  3: ["Pierna", "Pull", "Push"],
  4: ["Pierna", "Pull", "Core y cardio", "Push"],
  5: ["Pierna", "Pull", "Core y cardio", "Push", "Full body"],
  6: ["Pierna", "Pull", "Core y cardio", "Push", "Full body", "Hombro y brazo"],
};

// Peso de las últimas 8 semanas (la última es esta).
const PESOS_INICIALES = [81.0, 80.6, 80.3, 80.1, 79.6, 79.4, 79.0, 78.4];
const GRASA = { actual: 15, cambio: -1.8 };
const FUERZA = 12; // % de mejora media en los ejercicios básicos

const TABS = [
  { id: "hoy", nombre: "Hoy", icono: Zap },
  { id: "nutricion", nombre: "Nutrición", icono: Utensils },
  { id: "entrenamiento", nombre: "Entrenamiento", icono: Dumbbell },
  { id: "progreso", nombre: "Progreso", icono: LineChart },
];

/* ───────────────────────── Utilidades ───────────────────────── */

const num = new Intl.NumberFormat("es-MX");
const kg = (n) => n.toFixed(1);
const kgCorto = (n) => kg(n).replace(/\.0$/, "");
const signo = (n, dec = 1) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(dec)}`;
const lunesDe = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const fechaCorta = (d) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(d).replace(".", "");

function objetivosDe(kcal) {
  const f = kcal / BASE.kcal;
  return { kcal, p: PROTEINA, c: Math.round(BASE.carbos * f), g: Math.round(BASE.grasas * f) };
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

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";
const campo =
  "w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[15px] font-semibold ring-1 ring-zinc-200 outline-none placeholder:font-medium placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 dark:bg-white/5 dark:ring-white/10";

function Tarjeta({ className = "", children }) {
  return (
    <section
      className={`rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,20,0.05),0_14px_36px_-22px_rgba(16,24,20,0.3)] ring-1 ring-zinc-900/5 dark:bg-[#121a16] dark:shadow-none dark:ring-white/10 ${className}`}
    >
      {children}
    </section>
  );
}

function Cabecera({ titulo, icono: Icono, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
        {Icono && <Icono className="size-5 text-emerald-600 dark:text-emerald-400" />}
        {titulo}
      </h2>
      {children}
    </div>
  );
}

function Insignia({ children, tono = "verde" }) {
  const tonos = {
    verde: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
    naranja: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30",
    gris: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:ring-white/10",
    azul: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${tonos[tono]}`}>{children}</span>;
}

function Anillo({ valor, tam = 140, grosor = 13, color = "text-emerald-500", children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="currentColor" strokeWidth={grosor} className="text-zinc-100 dark:text-white/10" />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={`${color} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

function Casilla({ marcada, onClick, etiqueta, tam = "size-6" }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={etiqueta}
      onClick={onClick}
      className={`grid ${tam} shrink-0 place-items-center rounded-lg border-2 transition ${foco} ${marcada ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 hover:border-emerald-400 dark:border-zinc-600"}`}
    >
      {marcada && <Check className="size-3.5 motion-safe:animate-pop" strokeWidth={3.5} />}
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
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-[#0a0f0c]/50 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg sm:max-w-md sm:rounded-3xl sm:pb-6 dark:bg-[#151e19] dark:ring-1 dark:ring-white/10 motion-safe:animate-sheet">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
            {Icono && <Icono className="size-5 text-emerald-600 dark:text-emerald-400" />}
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`grid size-9 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10 ${foco}`}
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── App ───────────────────────── */

export default function EntrenadorIA() {
  const [oscuro, alternarTema] = useTema("entrenador-ia:tema");
  const [tab, setTab] = useState("hoy");
  const [config, setConfig] = useState({ meta: 75, kcal: 2600, dias: 5 });
  const [comidas, setComidas] = useState(COMIDAS_INICIALES);
  const [series, setSeries] = useState(() => Object.fromEntries(EJERCICIOS.map((e) => [e.id, Array(e.series).fill(false)])));
  const [pesos, setPesos] = useState(() => {
    const lunes = lunesDe(new Date());
    return PESOS_INICIALES.map((kg, i) => {
      const d = new Date(lunes);
      d.setDate(d.getDate() - (PESOS_INICIALES.length - 1 - i) * 7);
      return { fecha: d, kg };
    });
  });
  const [agua, setAgua] = useState(5);
  const [hoja, setHoja] = useState(null); // "objetivos" | "peso"
  const [banner, setBanner] = useState(null); // texto tras ajustar objetivos
  const [toast, setToast] = useState(null);
  const toastRef = useRef();

  const avisar = useCallback((texto) => {
    clearTimeout(toastRef.current);
    setToast(texto);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const objetivos = objetivosDe(config.kcal);
  const comidasHechas = comidas.filter((c) => c.hecha);
  const consumido = comidasHechas.reduce((s, c) => ({ kcal: s.kcal + c.kcal, p: s.p + c.p, c: s.c + c.c, g: s.g + c.g }), { kcal: 0, p: 0, c: 0, g: 0 });
  const balance = config.kcal - MANTENIMIENTO;
  const fase = balance <= -100 ? { texto: "Déficit calórico", tono: "verde" } : balance >= 100 ? { texto: "Superávit calórico", tono: "naranja" } : { texto: "Mantenimiento", tono: "azul" };

  const rutina = RUTINAS[config.dias];
  const diaHoy = rutina.indexOf("Push") + 1;
  const hechos = EJERCICIOS.filter((e) => series[e.id].every(Boolean)).length;

  const ultimas = pesos.slice(-8);
  const pesoActual = ultimas.at(-1).kg;
  const cambioTotal = pesoActual - ultimas[0].kg;
  const cambioSemana = pesoActual - ultimas.at(-2).kg;

  const alternarComida = (id) => setComidas((cs) => cs.map((c) => (c.id === id ? { ...c, hecha: !c.hecha } : c)));
  const alternarEjercicio = (id) => setSeries((s) => ({ ...s, [id]: s[id].map(() => !s[id].every(Boolean)) }));
  const alternarSerie = (id, i) => setSeries((s) => ({ ...s, [id]: s[id].map((v, j) => (j === i ? !v : v)) }));
  const anadirComida = (c) => {
    setComidas((cs) => [...cs, { ...c, id: `extra-${Date.now()}`, momento: "Extra", hora: new Date().toTimeString().slice(0, 5), emoji: "🍽️", detalle: "Añadido a mano", hecha: true }]);
    avisar(`${c.nombre} añadido: ${num.format(c.kcal)} kcal`);
  };
  const registrarPeso = (valor) => {
    const hoy = new Date();
    const lunes = lunesDe(hoy);
    setPesos((ps) => (ps.at(-1).fecha.getTime() === lunes.getTime() ? [...ps.slice(0, -1), { fecha: lunes, kg: valor }] : [...ps, { fecha: lunes, kg: valor }]));
    cerrarHoja();
    avisar(`Peso registrado: ${kg(valor)} kg`);
  };
  const guardarObjetivos = (nueva) => {
    setConfig(nueva);
    cerrarHoja();
    const o = objetivosDe(nueva.kcal);
    setBanner(
      `Ajusté tu plan a ${num.format(nueva.kcal)} kcal (${o.p} g de proteína, ${o.c} g de carbohidratos y ${o.g} g de grasas), ${nueva.dias} días de entrenamiento por semana y meta de ${kgCorto(nueva.meta)} kg.`,
    );
    setSeries(Object.fromEntries(EJERCICIOS.map((e) => [e.id, Array(e.series).fill(false)])));
    avisar("Plan actualizado");
  };

  const datos = { config, objetivos, consumido, comidas, fase, rutina, diaHoy, series, hechos, ultimas, pesoActual, cambioTotal, cambioSemana };

  return (
    <div className="min-h-screen font-sans">
      <header className="mx-auto flex max-w-5xl items-center gap-3 gutter pt-4 pb-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-lime-300 shadow-lg dark:bg-lime-300 dark:text-zinc-900">
          <Dumbbell className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[22px] leading-none font-bold tracking-tight uppercase">Entrenador IA</h1>
          <p className="mt-0.5 text-xs leading-tight font-semibold text-zinc-500 dark:text-zinc-400">Nutrición y entrenamiento personalizado</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={alternarTema}
            aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={`grid size-10 place-items-center rounded-full text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-white/10 ${foco}`}
          >
            {oscuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white" aria-label="Diego">
            D
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {tab === "hoy" && (
          <div className="grid grid-cols-1 gap-4">
            <Banner texto={banner} cambioSemana={cambioSemana} onAjustar={() => setHoja("objetivos")} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TarjetaNutricion datos={datos} alternarComida={alternarComida} />
              <TarjetaEntreno datos={datos} alternarEjercicio={alternarEjercicio} />
            </div>
            <TarjetaProgreso datos={datos} verMas={() => setTab("progreso")} />
          </div>
        )}
        {tab === "nutricion" && <VistaNutricion datos={datos} alternarComida={alternarComida} agua={agua} setAgua={setAgua} anadirComida={anadirComida} />}
        {tab === "entrenamiento" && <VistaEntreno datos={datos} alternarEjercicio={alternarEjercicio} alternarSerie={alternarSerie} />}
        {tab === "progreso" && <VistaProgreso datos={datos} pesos={pesos} onRegistrar={() => setHoja("peso")} />}
      </main>

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/90 pb-safe backdrop-blur-xl gutter dark:border-white/10 dark:bg-[#0a0f0c]/90"
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
                  className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-bold ${foco} ${activo ? "text-emerald-700 dark:text-lime-300" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full ${activo ? "bg-emerald-50 dark:bg-lime-300/15" : ""}`}>
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
          <div className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg motion-safe:animate-sheet dark:bg-lime-300 dark:text-zinc-900">
            <Check className="size-4" /> {toast}
          </div>
        </div>
      )}

      <Hoja abierta={hoja === "objetivos"} onCerrar={cerrarHoja} titulo="Tus objetivos" icono={SlidersHorizontal}>
        <FormObjetivos config={config} pesoActual={pesoActual} onGuardar={guardarObjetivos} />
      </Hoja>
      <Hoja abierta={hoja === "peso"} onCerrar={cerrarHoja} titulo="Registrar peso" icono={Scale}>
        <FormPeso actual={pesoActual} onGuardar={registrarPeso} />
      </Hoja>
    </div>
  );
}

/* ───────────────────────── Hoy ───────────────────────── */

function Banner({ texto, cambioSemana, onAjustar }) {
  const baja = cambioSemana < 0;
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200/70 sm:flex-row sm:items-center sm:p-5 dark:bg-emerald-500/10 dark:ring-emerald-500/25">
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-emerald-950 dark:text-emerald-100">
        <span aria-hidden="true">✅ </span>
        <strong className="font-bold">Tu plan se ha actualizado:</strong>{" "}
        {texto ?? (
          <>
            Ajusté tus calorías y rutina de hoy según tu progreso de esta semana{" "}
            <span className="font-bold whitespace-nowrap">
              ({signo(cambioSemana)} kg {baja ? "🎉" : "💪"})
            </span>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onAjustar}
        className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-lime-300 dark:text-zinc-900 dark:hover:bg-lime-200 ${foco}`}
      >
        <SlidersHorizontal className="size-4" /> Ajustar objetivos
      </button>
    </div>
  );
}

function BarraMacro({ nombre, actual, objetivo, color }) {
  const v = objetivo ? actual / objetivo : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold">{nombre}</span>
        <span className="text-zinc-500 tabular-nums dark:text-zinc-400">
          <span className="font-bold text-zinc-900 dark:text-white">{actual}g</span> / {objetivo}g · <span className="font-bold">{Math.round(v * 100)}%</span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
        <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${color}`} style={{ width: `${Math.min(v, 1) * 100}%` }} />
      </div>
    </div>
  );
}

function ResumenCalorias({ consumido, objetivos }) {
  const v = consumido.kcal / objetivos.kcal;
  const pasado = consumido.kcal > objetivos.kcal;
  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[auto_1fr]">
      <div className="mx-auto">
        <Anillo valor={v} color={pasado ? "text-orange-500" : "text-emerald-500"}>
          <div>
            <Flame className={`mx-auto size-4 ${pasado ? "text-orange-500" : "text-emerald-500"}`} />
            <p className="font-display text-[30px] leading-none font-bold tabular-nums">{num.format(consumido.kcal)}</p>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">de {num.format(objetivos.kcal)} kcal</p>
          </div>
        </Anillo>
        <p className={`mt-2 text-center text-xs font-bold ${pasado ? "text-orange-600 dark:text-orange-400" : "text-zinc-500 dark:text-zinc-400"}`}>
          {pasado ? `${num.format(consumido.kcal - objetivos.kcal)} kcal por encima` : `Te quedan ${num.format(objetivos.kcal - consumido.kcal)} kcal`}
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3.5">
        <BarraMacro nombre="Proteína" actual={consumido.p} objetivo={objetivos.p} color="bg-violet-500" />
        <BarraMacro nombre="Carbohidratos" actual={consumido.c} objetivo={objetivos.c} color="bg-blue-500" />
        <BarraMacro nombre="Grasas" actual={consumido.g} objetivo={objetivos.g} color="bg-orange-500" />
      </div>
    </div>
  );
}

function TarjetaComida({ comida: c, onClick }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={c.hecha}
      onClick={onClick}
      className={`relative flex w-[172px] shrink-0 snap-start flex-col rounded-2xl p-3.5 text-left ring-1 transition ${foco} ${
        c.hecha ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30" : "bg-zinc-50 ring-zinc-200 hover:ring-emerald-300 dark:bg-white/5 dark:ring-white/10"
      }`}
    >
      <span className="flex items-center justify-between">
        <span className="text-2xl" aria-hidden="true">
          {c.emoji}
        </span>
        <span className={`grid size-6 place-items-center rounded-full border-2 ${c.hecha ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
          {c.hecha && <Check className="size-3.5" strokeWidth={3.5} />}
        </span>
      </span>
      <span className="mt-2 text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {c.momento} · {c.hora}
      </span>
      <span className="mt-0.5 line-clamp-2 min-h-[40px] text-[15px] leading-tight font-bold">{c.nombre}</span>
      <span className="mt-2 font-display text-xl leading-none font-bold tabular-nums">
        {num.format(c.kcal)} <span className="text-sm text-zinc-500 dark:text-zinc-400">kcal</span>
      </span>
    </button>
  );
}

function TarjetaNutricion({ datos, alternarComida }) {
  const { consumido, objetivos, comidas, fase } = datos;
  return (
    <Tarjeta className="min-w-0 p-5">
      <Cabecera titulo="Tu nutrición de hoy" icono={Utensils}>
        <Insignia tono={fase.tono}>{fase.texto}</Insignia>
      </Cabecera>
      <div className="mt-4">
        <ResumenCalorias consumido={consumido} objetivos={objetivos} />
      </div>
      <h3 className="mt-5 mb-2 text-sm font-bold">Comidas de hoy</h3>
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
        {comidas.map((c) => (
          <TarjetaComida key={c.id} comida={c} onClick={() => alternarComida(c.id)} />
        ))}
      </div>
    </Tarjeta>
  );
}

function FilaEjercicio({ ejercicio: e, hecho, onToggle }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Casilla marcada={hecho} onClick={onToggle} etiqueta={e.nombre} />
      <div className="min-w-0 flex-1">
        <p
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-tight font-bold ${hecho ? "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600" : ""}`}
        >
          {e.nombre}
          {e.sube && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 no-underline dark:bg-emerald-500/20 dark:text-emerald-300">
              <TrendingUp className="size-3" /> {e.sube}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {e.series} series × {e.reps} reps • {e.peso}
        </p>
      </div>
    </div>
  );
}

function TarjetaEntreno({ datos, alternarEjercicio }) {
  const { diaHoy, config, series, hechos } = datos;
  return (
    <Tarjeta className="min-w-0 p-5">
      <Cabecera titulo="Entrenamiento de hoy" icono={Dumbbell}>
        <Insignia tono="gris">
          Día {diaHoy} de {config.dias}
        </Insignia>
      </Cabecera>
      <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Push (Pecho, Hombro, Tríceps) • 55 min • {EJERCICIOS.length} ejercicios</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(hechos / EJERCICIOS.length) * 100}%` }} />
        </div>
        <span className="text-xs font-bold tabular-nums">
          {hechos}/{EJERCICIOS.length}
        </span>
      </div>
      <div className="mt-1 divide-y divide-zinc-100 dark:divide-white/5">
        {EJERCICIOS.map((e) => (
          <FilaEjercicio key={e.id} ejercicio={e} hecho={series[e.id].every(Boolean)} onToggle={() => alternarEjercicio(e.id)} />
        ))}
      </div>
      {hechos === EJERCICIOS.length && (
        <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800 motion-safe:animate-pop dark:bg-emerald-500/10 dark:text-emerald-200">
          ¡Entrenamiento completado! Buen trabajo 💪
        </p>
      )}
    </Tarjeta>
  );
}

// Ancho real del contenedor, para dibujar la gráfica a escala 1:1 (el texto no crece en pantallas anchas).
function useAncho(inicial = 340) {
  const ref = useRef();
  const [ancho, setAncho] = useState(inicial);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

function GraficoPeso({ ultimas, meta, alto = 200 }) {
  const [ref, W] = useAncho();
  const H = alto;
  const izq = 34;
  const der = 14;
  const arr = 14;
  const aba = 24;
  const valores = ultimas.map((p) => p.kg);
  const min = Math.floor(Math.min(...valores, meta) - 0.5);
  const max = Math.ceil(Math.max(...valores) + 0.5);
  const x = (i) => izq + (i / (ultimas.length - 1)) * (W - izq - der);
  const y = (v) => arr + (1 - (v - min) / (max - min)) * (H - arr - aba);
  const linea = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const paso = max - min > 6 ? 2 : 1;
  const ticks = [];
  for (let v = min; v <= max; v += paso) ticks.push(v);
  return (
    <div ref={ref}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block max-w-full"
        role="img"
        aria-label={`Peso de las últimas ${ultimas.length} semanas: de ${kg(valores[0])} a ${kg(valores.at(-1))} kg. Meta: ${kg(meta)} kg.`}
      >
        <defs>
          <linearGradient id="area-peso" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={izq} x2={W - der} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-zinc-200 dark:text-white/10" strokeWidth="1" />
            <text x={izq - 8} y={y(v) + 4} textAnchor="end" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" fontSize="11" fontWeight="600">
              {v}
            </text>
          </g>
        ))}
        <line x1={izq} x2={W - der} y1={y(meta)} y2={y(meta)} stroke="currentColor" className="text-orange-500" strokeWidth="1.5" strokeDasharray="5 5" />
        <text x={W - der} y={y(meta) - 6} textAnchor="end" fill="currentColor" className="text-orange-600 dark:text-orange-400" fontSize="11.5" fontWeight="700">
          Meta: {kgCorto(meta)} kg
        </text>
        <path d={`${linea} L${x(valores.length - 1)},${H - aba} L${x(0)},${H - aba} Z`} fill="url(#area-peso)" />
        <path d={linea} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {valores.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={i === valores.length - 1 ? 5 : 3}
            fill={i === valores.length - 1 ? "#10b981" : "currentColor"}
            stroke="#10b981"
            strokeWidth="2"
            className="text-white dark:text-[#121a16]"
          />
        ))}
        <text x={x(valores.length - 1)} y={y(valores.at(-1)) - 11} textAnchor="end" fill="currentColor" className="text-zinc-900 dark:text-white" fontSize="12" fontWeight="700">
          {kg(valores.at(-1))}
        </text>
        {ultimas.map((p, i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" fontSize="10" fontWeight="600">
            {i === ultimas.length - 1 ? "Hoy" : fechaCorta(p.fecha)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Indicador({ etiqueta, valor, cambio, bueno, icono: Icono }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
      <p className="text-xs leading-tight font-bold text-zinc-500 dark:text-zinc-400">{etiqueta}</p>
      <p className="mt-1 font-display text-[24px] leading-none font-bold tabular-nums sm:text-[26px]">{valor}</p>
      <p className={`mt-1.5 flex items-start gap-1 text-xs leading-tight font-bold ${bueno ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
        <Icono className="size-3.5 shrink-0" /> <span>{cambio}</span>
      </p>
    </div>
  );
}

function proyeccion(ultimas, meta) {
  const ritmo = (ultimas.at(-1).kg - ultimas[0].kg) / (ultimas.length - 1); // kg por semana
  const falta = ultimas.at(-1).kg - meta;
  if (Math.abs(falta) < 0.05) return "¡Has llegado a tu meta! 🎉";
  if (falta > 0 && ritmo < 0) return `A este ritmo (${signo(ritmo, 2)} kg/semana) llegarás a ${kgCorto(meta)} kg en unas ${Math.ceil(falta / -ritmo)} semanas.`;
  if (falta < 0 && ritmo > 0) return `A este ritmo (${signo(ritmo, 2)} kg/semana) llegarás a ${kgCorto(meta)} kg en unas ${Math.ceil(-falta / ritmo)} semanas.`;
  return "Tu tendencia va en sentido contrario a la meta: revisa las calorías en «Ajustar objetivos».";
}

function TarjetaProgreso({ datos, verMas }) {
  const { ultimas, pesoActual, cambioTotal, config } = datos;
  return (
    <Tarjeta className="p-5">
      <Cabecera titulo="Tu progreso" icono={Activity}>
        <button
          type="button"
          onClick={verMas}
          className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold text-zinc-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-lime-300 ${foco}`}
        >
          Últimas {ultimas.length} semanas <ChevronRight className="size-4" />
        </button>
      </Cabecera>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Indicador
          etiqueta="Peso actual"
          valor={`${kg(pesoActual)} kg`}
          cambio={`${signo(cambioTotal)} kg`}
          bueno={cambioTotal < 0 === config.meta < ultimas[0].kg}
          icono={cambioTotal <= 0 ? TrendingDown : TrendingUp}
        />
        <Indicador etiqueta="Grasa corporal" valor={`${GRASA.actual}%`} cambio={`${signo(GRASA.cambio)}%`} bueno icono={TrendingDown} />
        <Indicador etiqueta="Fuerza media" valor={`+${FUERZA}%`} cambio="En aumento" bueno icono={TrendingUp} />
      </div>
      <div className="mt-4">
        <GraficoPeso ultimas={ultimas} meta={config.meta} />
      </div>
      <p className="mt-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{proyeccion(ultimas, config.meta)}</p>
    </Tarjeta>
  );
}

/* ───────────────────────── Formularios ───────────────────────── */

function Paso({ id, etiqueta, valor, setValor, paso, min, max, unidad, decimales = 0 }) {
  const cambiar = (d) => setValor(Math.min(max, Math.max(min, +(valor + d).toFixed(decimales))));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400">
        {etiqueta}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => cambiar(-paso)}
          aria-label={`Bajar ${etiqueta.toLowerCase()}`}
          className={`grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl font-bold hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 ${foco}`}
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={paso}
            min={min}
            max={max}
            value={valor}
            onChange={(e) => setValor(e.target.value === "" ? min : Number(e.target.value))}
            className={`${campo} text-center font-display text-2xl font-bold tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400">{unidad}</span>
        </div>
        <button
          type="button"
          onClick={() => cambiar(paso)}
          aria-label={`Subir ${etiqueta.toLowerCase()}`}
          className={`grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl font-bold hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 ${foco}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function FormObjetivos({ config, pesoActual, onGuardar }) {
  const [meta, setMeta] = useState(config.meta);
  const [kcal, setKcal] = useState(config.kcal);
  const [dias, setDias] = useState(config.dias);
  const o = objetivosDe(kcal);
  const balance = kcal - MANTENIMIENTO;
  const valido = meta >= 40 && meta <= 200 && kcal >= 1400 && kcal <= 4500;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ meta, kcal, dias });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <Paso id="obj-meta" etiqueta="Meta de peso" valor={meta} setValor={setMeta} paso={0.5} min={40} max={200} unidad="kg" decimales={1} />
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Pesas {kg(pesoActual)} kg:{" "}
        {meta < pesoActual ? `te faltan ${kg(pesoActual - meta)} kg por bajar` : meta > pesoActual ? `te faltan ${kg(meta - pesoActual)} kg por subir` : "ya estás en tu meta"}.
      </p>
      <Paso id="obj-kcal" etiqueta="Calorías objetivo" valor={kcal} setValor={setKcal} paso={50} min={1400} max={4500} unidad="kcal" />
      <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Tu mantenimiento estimado es {num.format(MANTENIMIENTO)} kcal:{" "}
        {balance < -100 ? `déficit de ${num.format(-balance)} kcal/día` : balance > 100 ? `superávit de ${num.format(balance)} kcal/día` : "comerías para mantener el peso"}.
      </p>
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">Días de entrenamiento por semana</legend>
        <div className="grid grid-cols-4 gap-2">
          {[3, 4, 5, 6].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={dias === d}
              onClick={() => setDias(d)}
              className={`rounded-xl py-2.5 font-display text-xl font-bold ring-1 ${foco} ${dias === d ? "bg-emerald-600 text-white ring-emerald-600 dark:bg-lime-300 dark:text-zinc-900 dark:ring-lime-300" : "ring-zinc-200 hover:ring-emerald-300 dark:ring-white/10"}`}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Rutina: {RUTINAS[dias].join(" · ")}</p>
      </fieldset>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-white/5">
        {[
          ["Proteína", o.p, "text-violet-600 dark:text-violet-400"],
          ["Carbohidratos", o.c, "text-blue-600 dark:text-blue-400"],
          ["Grasas", o.g, "text-orange-600 dark:text-orange-400"],
        ].map(([n, v, c]) => (
          <div key={n}>
            <p className={`font-display text-xl font-bold ${c}`}>{v} g</p>
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{n}</p>
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={!valido}
        className={`rounded-2xl bg-emerald-600 py-3.5 text-[15px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-lime-300 dark:text-zinc-900 ${foco}`}
      >
        Guardar y recalcular plan
      </button>
    </form>
  );
}

function FormPeso({ actual, onGuardar }) {
  const [valor, setValor] = useState(actual);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valor >= 30 && valor <= 250) onGuardar(+valor.toFixed(1));
      }}
      className="grid grid-cols-1 gap-4"
    >
      <Paso id="peso-hoy" etiqueta="Tu peso de hoy" valor={valor} setValor={setValor} paso={0.1} min={30} max={250} unidad="kg" decimales={1} />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Pésate por la mañana, en ayunas y después de ir al baño. Si ya registraste esta semana, se actualiza el dato.</p>
      <button type="submit" className={`rounded-2xl bg-emerald-600 py-3.5 text-[15px] font-bold text-white hover:bg-emerald-700 dark:bg-lime-300 dark:text-zinc-900 ${foco}`}>
        Guardar peso
      </button>
    </form>
  );
}

/* ───────────────────────── Otras pestañas ───────────────────────── */

function TituloVista({ titulo, subtitulo, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pt-2 pb-4">
      <div>
        <h1 className="font-display text-[34px] leading-none font-bold tracking-tight uppercase">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}

function VistaNutricion({ datos, alternarComida, agua, setAgua, anadirComida }) {
  const { consumido, objetivos, comidas, fase } = datos;
  const [form, setForm] = useState({ nombre: "", kcal: "", p: "", c: "", g: "" });
  const valido = form.nombre.trim() && Number(form.kcal) > 0;
  const enviar = (e) => {
    e.preventDefault();
    if (!valido) return;
    anadirComida({ nombre: form.nombre.trim(), kcal: Math.round(Number(form.kcal)), p: Math.round(Number(form.p) || 0), c: Math.round(Number(form.c) || 0), g: Math.round(Number(form.g) || 0) });
    setForm({ nombre: "", kcal: "", p: "", c: "", g: "" });
  };
  return (
    <div>
      <TituloVista titulo="Nutrición" subtitulo={`${fase.texto} · objetivo ${num.format(objetivos.kcal)} kcal`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tarjeta className="p-5">
          <ResumenCalorias consumido={consumido} objetivos={objetivos} />
        </Tarjeta>
        <Tarjeta className="p-5">
          <Cabecera titulo="Agua" icono={Droplet}>
            <span className="text-sm font-bold text-sky-600 tabular-nums dark:text-sky-400">{(agua * 0.25).toLocaleString("es-MX", { maximumFractionDigits: 2 })} / 2.5 L</span>
          </Cabecera>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} ${i ? "vasos" : "vaso"}`}
                aria-pressed={i < agua}
                onClick={() => setAgua(i + 1 === agua ? i : i + 1)}
                className={`grid h-12 place-items-center rounded-xl ring-1 transition ${foco} ${i < agua ? "bg-sky-500 text-white ring-sky-500" : "text-sky-300 ring-zinc-200 hover:ring-sky-300 dark:text-sky-800 dark:ring-white/10"}`}
              >
                <Droplet className="size-5" fill={i < agua ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cada gota es un vaso de 250 ml. {agua >= 10 ? "¡Objetivo cumplido! 💧" : `Te faltan ${10 - agua} vasos.`}</p>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-4 p-5">
        <Cabecera titulo="Comidas de hoy" icono={Utensils}>
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Toca para marcar</span>
        </Cabecera>
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
          {comidas.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <Casilla marcada={c.hecha} onClick={() => alternarComida(c.id)} etiqueta={`${c.momento}: ${c.nombre}`} />
              <span className="text-2xl" aria-hidden="true">
                {c.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight font-bold">
                  {c.nombre} <span className="font-semibold text-zinc-400">· {c.momento}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{c.detalle}</p>
                <p className="mt-1 flex gap-2 text-[11px] font-bold tabular-nums">
                  <span className="text-violet-600 dark:text-violet-400">P {c.p}g</span>
                  <span className="text-blue-600 dark:text-blue-400">C {c.c}g</span>
                  <span className="text-orange-600 dark:text-orange-400">G {c.g}g</span>
                </p>
              </div>
              <p className="shrink-0 font-display text-xl font-bold tabular-nums">{num.format(c.kcal)}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={enviar} className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
          <p className="text-sm font-bold">Añadir alimento</p>
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <label htmlFor="ali-nombre" className="sr-only">
              Alimento
            </label>
            <input id="ali-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Plátano" className={`${campo} bg-white dark:bg-white/5`} />
            <label htmlFor="ali-kcal" className="sr-only">
              Calorías
            </label>
            <input
              id="ali-kcal"
              inputMode="numeric"
              value={form.kcal}
              onChange={(e) => setForm({ ...form, kcal: e.target.value.replace(/\D/g, "") })}
              placeholder="kcal"
              className={`${campo} bg-white dark:bg-white/5`}
            />
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
            {[
              ["p", "Proteína (g)", "P g"],
              ["c", "Carbohidratos (g)", "C g"],
              ["g", "Grasas (g)", "G g"],
            ].map(([k, etiqueta, ph]) => (
              <span key={k}>
                <label htmlFor={`ali-${k}`} className="sr-only">
                  {etiqueta}
                </label>
                <input
                  id={`ali-${k}`}
                  inputMode="numeric"
                  value={form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value.replace(/\D/g, "") })}
                  placeholder={ph}
                  className={`${campo} bg-white px-2.5 dark:bg-white/5`}
                />
              </span>
            ))}
            <button
              type="submit"
              disabled={!valido}
              aria-label="Añadir alimento"
              className={`grid size-[46px] place-items-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-lime-300 dark:text-zinc-900 ${foco}`}
            >
              <Plus className="size-5" strokeWidth={3} />
            </button>
          </div>
        </form>
      </Tarjeta>
    </div>
  );
}

function Descanso() {
  const [restante, setRestante] = useState(90);
  const [activo, setActivo] = useState(false);
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => setRestante((r) => Math.max(r - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [activo]);
  useEffect(() => {
    if (restante === 0) setActivo(false);
  }, [restante]);
  const mmss = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-zinc-900 p-3 pl-4 text-white dark:bg-lime-300 dark:text-zinc-900">
      <Timer className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold opacity-70">Descanso entre series</p>
        <p className="font-display text-2xl leading-none font-bold tabular-nums" aria-live="polite">
          {restante === 0 ? "¡A por la siguiente!" : mmss}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (restante === 0) setRestante(90);
          setActivo((a) => !a);
        }}
        aria-label={activo ? "Pausar descanso" : "Iniciar descanso"}
        className={`grid size-11 place-items-center rounded-xl bg-white/15 hover:bg-white/25 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20 ${foco}`}
      >
        {activo ? <Pause className="size-5" /> : <Play className="size-5" />}
      </button>
      <button
        type="button"
        onClick={() => {
          setActivo(false);
          setRestante(90);
        }}
        aria-label="Reiniciar descanso"
        className={`grid size-11 place-items-center rounded-xl bg-white/15 hover:bg-white/25 dark:bg-zinc-900/10 dark:hover:bg-zinc-900/20 ${foco}`}
      >
        <RotateCcw className="size-5" />
      </button>
    </div>
  );
}

function VistaEntreno({ datos, alternarEjercicio, alternarSerie }) {
  const { rutina, diaHoy, config, series, hechos } = datos;
  return (
    <div>
      <TituloVista titulo="Entrenamiento" subtitulo={`${config.dias} días por semana · hoy toca Push`} />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {rutina.map((r, i) => {
          const hoy = i + 1 === diaHoy;
          const hecho = i + 1 < diaHoy;
          return (
            <div
              key={r}
              className={`flex min-w-[104px] shrink-0 flex-col rounded-2xl p-3 ring-1 ${
                hoy ? "bg-emerald-600 text-white ring-emerald-600 dark:bg-lime-300 dark:text-zinc-900 dark:ring-lime-300" : "bg-white ring-zinc-200 dark:bg-[#121a16] dark:ring-white/10"
              }`}
            >
              <span className={`text-[11px] font-bold uppercase ${hoy ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}>Día {i + 1}</span>
              <span className="mt-0.5 font-display text-lg leading-tight font-bold">{r}</span>
              <span className={`mt-1 text-[11px] font-bold ${hoy ? "" : hecho ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>{hoy ? "Hoy" : hecho ? "✓ Hecho" : "Pendiente"}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid grid-cols-1 gap-3">
          {EJERCICIOS.map((e, idx) => {
            const s = series[e.id];
            const hecho = s.every(Boolean);
            return (
              <Tarjeta key={e.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${hecho ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-white/10"}`}>
                    {hecho ? <Check className="size-5" strokeWidth={3} /> : idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] leading-tight font-bold">
                      {e.nombre}
                      {e.sube && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <TrendingUp className="size-3" /> {e.sube}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      {e.musculo} · {e.series} series × {e.reps} reps • {e.peso}
                    </p>
                  </div>
                  <Casilla marcada={hecho} onClick={() => alternarEjercicio(e.id)} etiqueta={`Completar ${e.nombre}`} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 pl-12">
                  {s.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={v}
                      onClick={() => alternarSerie(e.id, i)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold tabular-nums ring-1 transition ${foco} ${v ? "bg-emerald-500 text-white ring-emerald-500" : "ring-zinc-200 hover:ring-emerald-300 dark:ring-white/10"}`}
                    >
                      Serie {i + 1} · {e.reps}
                    </button>
                  ))}
                </div>
              </Tarjeta>
            );
          })}
        </div>
        <div className="grid h-fit grid-cols-1 gap-3 lg:sticky lg:top-4">
          <Descanso />
          <Tarjeta className="p-4">
            <p className="text-sm font-bold">Progreso de la sesión</p>
            <p className="mt-1 font-display text-4xl leading-none font-bold tabular-nums">
              {hechos}/{EJERCICIOS.length}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ejercicios completados · 55 min estimados</p>
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
              💡 Sobrecarga progresiva: la semana pasada completaste 4 × 8 con 77.5 kg en press de banca, así que hoy subimos a 80 kg.
            </p>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

function VistaProgreso({ datos, pesos, onRegistrar }) {
  const historial = [...pesos].reverse();
  return (
    <div>
      <TituloVista titulo="Progreso" subtitulo={`Meta: ${kgCorto(datos.config.meta)} kg`}>
        <button
          type="button"
          onClick={onRegistrar}
          className={`flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-700 dark:bg-lime-300 dark:text-zinc-900 ${foco}`}
        >
          <Scale className="size-4" /> Registrar peso
        </button>
      </TituloVista>
      <TarjetaProgreso datos={datos} verMas={onRegistrar} />
      <Tarjeta className="mt-4 p-5">
        <Cabecera titulo="Historial de peso" icono={Scale} />
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
          {historial.map((p, i) => {
            const previo = historial[i + 1];
            const d = previo ? p.kg - previo.kg : 0;
            return (
              <li key={p.fecha.getTime()} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-semibold">Semana del {fechaCorta(p.fecha)}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  {previo && <span className={`text-xs font-bold ${d <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>{signo(d)} kg</span>}
                  <span className="w-16 text-right font-display text-lg font-bold">{kg(p.kg)} kg</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </div>
  );
}
