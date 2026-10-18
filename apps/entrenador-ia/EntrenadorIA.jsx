// Entrenador IA: nutrición del día, rutina de gimnasio con sobrecarga progresiva y evolución física.
// Un solo archivo. Arranca con lo que viene en el prompt y todo lo que añades se guarda.
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, Check, ChevronRight, Dumbbell, Flame, LineChart, Pencil, Plus, Scale, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Utensils, X, Zap } from "lucide-react";

/* ───────────────────────── Fechas y números ───────────────────────── */

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
const diasEntre = (a, b) => Math.round((deISO(b) - deISO(a)) / 86_400_000);
const fechaCorta = (iso) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(deISO(iso)).replace(".", "");
const nuevoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const num = new Intl.NumberFormat("es-MX");
const kg = (n) => String(Math.round(n * 10) / 10);
const signo = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${kg(Math.abs(n))}`;
const VENTANA = 56; // días: las últimas 8 semanas

/* ───────────────────────── Datos del prompt ───────────────────────── */

function estadoInicial() {
  const hoy = hoyISO();
  return {
    config: { metaPeso: 75, kcal: 2600, dias: 5 },
    macros: { p: 190, c: 280, g: 75 },
    comidas: [
      { id: "c1", momento: "Desayuno", nombre: "Huevos con aguacate", kcal: 620 },
      { id: "c2", momento: "Comida", nombre: "Pollo con arroz y verduras", kcal: 850 },
      { id: "c3", momento: "Cena", nombre: "Salmón con ensalada", kcal: 780 },
    ],
    comidasHechas: { fecha: hoy, ids: [] },
    rutina: { nombre: "Push", musculos: "Pecho, Hombro, Tríceps", minutos: 55 },
    // `cargas` es el historial de peso de cada ejercicio; sin cargas, el ejercicio es con peso corporal.
    ejercicios: [
      {
        id: "e1",
        nombre: "Press de banca",
        series: 4,
        reps: 8,
        cargas: [
          { fecha: sumarDias(hoy, -7), kg: 77.5 },
          { fecha: hoy, kg: 80 },
        ],
      },
      { id: "e2", nombre: "Press inclinado con mancuernas", series: 3, reps: 10, cargas: [{ fecha: hoy, kg: 30 }] },
      { id: "e3", nombre: "Elevaciones laterales", series: 4, reps: 12, cargas: [{ fecha: hoy, kg: 14 }] },
      { id: "e4", nombre: "Fondos en paralelas", series: 3, reps: 10, cargas: [] },
    ],
    ejerciciosHechos: { fecha: hoy, ids: [] },
    ciclo: { dia: 4, completadoEl: null },
    // Peso de hace 8 semanas, de la semana pasada y de hoy (−2.6 kg en total, −0.6 kg esta semana).
    registros: [
      { id: "r1", fecha: sumarDias(hoy, -49), peso: 81, grasa: 16.8 },
      { id: "r2", fecha: sumarDias(hoy, -7), peso: 79, grasa: null },
      { id: "r3", fecha: hoy, peso: 78.4, grasa: 15 },
    ],
    banner: null,
  };
}

const TABS = [
  { id: "hoy", nombre: "Hoy", icono: Zap },
  { id: "nutricion", nombre: "Nutrición", icono: Utensils },
  { id: "entrenamiento", nombre: "Entrenamiento", icono: Dumbbell },
  { id: "progreso", nombre: "Progreso", icono: LineChart },
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

/* ───────────────────────── Cálculos ───────────────────────── */

const cargaActual = (e) => e.cargas.at(-1)?.kg ?? null;
const subidaCarga = (e) => (e.cargas.length > 1 ? e.cargas.at(-1).kg - e.cargas.at(-2).kg : 0);

function progreso(d, hoy) {
  const ordenados = [...d.registros].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const ventana = ordenados.filter((r) => diasEntre(r.fecha, hoy) <= VENTANA);
  const ultimo = ordenados.at(-1) ?? null;
  const primero = ventana[0] ?? null;
  const conGrasa = ventana.filter((r) => r.grasa !== null && r.grasa !== undefined);
  const semanaAntes = ultimo ? ordenados.filter((r) => diasEntre(r.fecha, ultimo.fecha) >= 6).at(-1) : null;
  // Fuerza media: cambio medio de carga, en las últimas 8 semanas, de los ejercicios con historial.
  const cambios = d.ejercicios
    .map((e) => e.cargas.filter((c) => diasEntre(c.fecha, hoy) <= VENTANA))
    .filter((c) => c.length > 1)
    .map((c) => c.at(-1).kg / c[0].kg - 1);
  return {
    ventana,
    pesoActual: ultimo?.peso ?? null,
    cambioPeso: ultimo && primero && primero !== ultimo ? ultimo.peso - primero.peso : null,
    cambioSemana: semanaAntes ? ultimo.peso - semanaAntes.peso : null,
    grasa: conGrasa.at(-1)?.grasa ?? null,
    cambioGrasa: conGrasa.length > 1 ? conGrasa.at(-1).grasa - conGrasa[0].grasa : null,
    fuerza: cambios.length ? cambios.reduce((s, c) => s + c, 0) / cambios.length : null,
  };
}

function diaDelCiclo(ciclo, dias, hoy) {
  const dia = Math.min(ciclo.dia, dias);
  return ciclo.completadoEl && ciclo.completadoEl < hoy ? (dia % dias) + 1 : dia;
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500";
const campo =
  "w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[15px] font-semibold ring-1 ring-zinc-200 outline-none placeholder:font-medium placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500 dark:bg-white/5 dark:ring-white/10";
const etiqueta = "mb-1.5 block text-xs font-bold text-zinc-500 dark:text-zinc-400";
const botonPrincipal = `rounded-2xl bg-emerald-600 py-3.5 text-[15px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40 dark:bg-lime-300 dark:text-zinc-900 dark:hover:bg-lime-200 ${foco}`;

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

function Casilla({ marcada, onClick, etiqueta: aria }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={aria}
      onClick={onClick}
      className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 transition ${foco} ${marcada ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 hover:border-emerald-400 dark:border-zinc-600"}`}
    >
      {marcada && <Check className="size-3.5 motion-safe:animate-pop" strokeWidth={3.5} />}
    </button>
  );
}

function BotonIcono({ onClick, etiqueta: aria, icono: Icono, peligro = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 ${peligro ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" : "hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"} ${foco}`}
    >
      <Icono className="size-4" />
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
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg motion-safe:animate-sheet sm:max-w-md sm:rounded-3xl sm:pb-6 dark:bg-[#151e19] dark:ring-1 dark:ring-white/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight">
            {Icono && <Icono className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
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

/* ───────────────────────── App ───────────────────────── */

export default function EntrenadorIA() {
  const [datos, setDatos] = useGuardado("entrenador-ia", estadoInicial);
  const [tab, setTab] = useState("hoy");
  const [hoja, setHoja] = useState(null); // "objetivos" | "registro" | "rutina" | "comida" | "ejercicio" | {comida} | {ejercicio}
  const hoy = hoyISO();
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const { config } = datos;
  const idsComidas = datos.comidasHechas.fecha === hoy ? datos.comidasHechas.ids : [];
  const idsEjercicios = datos.ejerciciosHechos.fecha === hoy ? datos.ejerciciosHechos.ids : [];
  const consumido = datos.comidas
    .filter((c) => idsComidas.includes(c.id))
    .reduce((s, c) => ({ kcal: s.kcal + c.kcal, p: s.p + (c.p || 0), c: s.c + (c.c || 0), g: s.g + (c.g || 0) }), { kcal: 0, p: 0, c: 0, g: 0 });
  const prog = progreso(datos, hoy);
  const fase =
    prog.pesoActual === null || Math.abs(config.metaPeso - prog.pesoActual) < 0.05
      ? { texto: "Mantenimiento", tono: "azul" }
      : config.metaPeso < prog.pesoActual
        ? { texto: "Déficit calórico", tono: "verde" }
        : { texto: "Superávit calórico", tono: "naranja" };
  const diaHoy = diaDelCiclo(datos.ciclo, config.dias, hoy);

  const alternarEn = (ids, id) => ({ fecha: hoy, ids: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  const acciones = {
    alternarComida: (id) => setDatos((d) => ({ ...d, comidasHechas: alternarEn(idsComidas, id) })),
    guardarComida: (c) => {
      setDatos((d) => ({ ...d, comidas: c.id ? d.comidas.map((x) => (x.id === c.id ? c : x)) : [...d.comidas, { ...c, id: nuevoId() }] }));
      cerrarHoja();
    },
    borrarComida: (id) => {
      setDatos((d) => ({ ...d, comidas: d.comidas.filter((c) => c.id !== id) }));
      cerrarHoja();
    },
    alternarEjercicio: (id) =>
      setDatos((d) => {
        const hechos = alternarEn(idsEjercicios, id);
        const completo = d.ejercicios.length > 0 && d.ejercicios.every((e) => hechos.ids.includes(e.id));
        const ciclo = completo ? { dia: diaHoy, completadoEl: hoy } : d.ciclo.completadoEl === hoy ? { dia: diaHoy, completadoEl: null } : d.ciclo;
        return { ...d, ejerciciosHechos: hechos, ciclo };
      }),
    guardarEjercicio: ({ id, nombre, series, reps, peso }) => {
      setDatos((d) => {
        const anterior = d.ejercicios.find((e) => e.id === id);
        let cargas = anterior?.cargas ?? [];
        if (peso === null) cargas = [];
        else if (cargaActual({ cargas }) !== peso) cargas = [...cargas, { fecha: hoy, kg: peso }].slice(-50);
        const ejercicio = { id: id ?? nuevoId(), nombre, series, reps, cargas };
        return { ...d, ejercicios: anterior ? d.ejercicios.map((e) => (e.id === id ? ejercicio : e)) : [...d.ejercicios, ejercicio] };
      });
      cerrarHoja();
    },
    borrarEjercicio: (id) => {
      setDatos((d) => ({ ...d, ejercicios: d.ejercicios.filter((e) => e.id !== id) }));
      cerrarHoja();
    },
    guardarRutina: (rutina) => {
      setDatos((d) => ({ ...d, rutina }));
      cerrarHoja();
    },
    guardarObjetivos: (nueva) => {
      setDatos((d) => ({
        ...d,
        config: nueva,
        ciclo: { ...d.ciclo, dia: Math.min(d.ciclo.dia, nueva.dias) },
        banner: `${num.format(nueva.kcal)} kcal al día, ${nueva.dias} ${nueva.dias === 1 ? "día" : "días"} de entrenamiento por semana y meta de ${kg(nueva.metaPeso)} kg.`,
      }));
      cerrarHoja();
    },
    guardarRegistro: (r) => {
      setDatos((d) => ({ ...d, registros: [...d.registros.filter((x) => x.fecha !== r.fecha), { ...r, id: nuevoId() }] }));
      cerrarHoja();
    },
    borrarRegistro: (id) => setDatos((d) => ({ ...d, registros: d.registros.filter((r) => r.id !== id) })),
  };

  const comidaAbierta = hoja?.comida ? datos.comidas.find((c) => c.id === hoja.comida) : null;
  const ejercicioAbierto = hoja?.ejercicio ? datos.ejercicios.find((e) => e.id === hoja.ejercicio) : null;
  const vista = { datos, consumido, idsComidas, idsEjercicios, prog, fase, diaHoy, hoy, acciones, abrir: setHoja };

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
      </header>

      <main className="mx-auto max-w-5xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {tab === "hoy" && (
          <div className="grid grid-cols-1 gap-4">
            <Banner texto={datos.banner} prog={prog} meta={config.metaPeso} onAjustar={() => setHoja("objetivos")} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TarjetaNutricion {...vista} />
              <TarjetaEntreno {...vista} />
            </div>
            <TarjetaProgreso {...vista} verMas={() => setTab("progreso")} />
          </div>
        )}
        {tab === "nutricion" && <VistaNutricion {...vista} />}
        {tab === "entrenamiento" && <VistaEntreno {...vista} />}
        {tab === "progreso" && <VistaProgreso {...vista} />}
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

      <Hoja abierta={hoja === "objetivos"} onCerrar={cerrarHoja} titulo="Tus objetivos" icono={SlidersHorizontal}>
        <FormObjetivos config={config} pesoActual={prog.pesoActual} onGuardar={acciones.guardarObjetivos} />
      </Hoja>
      <Hoja abierta={hoja === "registro"} onCerrar={cerrarHoja} titulo="Registrar progreso" icono={Scale}>
        <FormRegistro hoy={hoy} ultimo={prog.pesoActual} onGuardar={acciones.guardarRegistro} />
      </Hoja>
      <Hoja abierta={hoja === "rutina"} onCerrar={cerrarHoja} titulo="Entrenamiento de hoy" icono={Dumbbell}>
        <FormRutina rutina={datos.rutina} onGuardar={acciones.guardarRutina} />
      </Hoja>
      <Hoja abierta={hoja === "comida" || !!comidaAbierta} onCerrar={cerrarHoja} titulo={comidaAbierta ? "Editar comida" : "Nueva comida"} icono={Utensils}>
        <FormComida key={comidaAbierta?.id ?? "nueva"} comida={comidaAbierta} onGuardar={acciones.guardarComida} onBorrar={comidaAbierta ? () => acciones.borrarComida(comidaAbierta.id) : null} />
      </Hoja>
      <Hoja abierta={hoja === "ejercicio" || !!ejercicioAbierto} onCerrar={cerrarHoja} titulo={ejercicioAbierto ? "Editar ejercicio" : "Nuevo ejercicio"} icono={Dumbbell}>
        <FormEjercicio
          key={ejercicioAbierto?.id ?? "nuevo"}
          ejercicio={ejercicioAbierto}
          onGuardar={acciones.guardarEjercicio}
          onBorrar={ejercicioAbierto ? () => acciones.borrarEjercicio(ejercicioAbierto.id) : null}
        />
      </Hoja>
    </div>
  );
}

/* ───────────────────────── Hoy ───────────────────────── */

function Banner({ texto, prog, meta, onAjustar }) {
  const s = prog.cambioSemana;
  const haciaLaMeta = s !== null && prog.pesoActual !== null && Math.sign(s) === Math.sign(meta - (prog.pesoActual - s)) && s !== 0;
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200/70 sm:flex-row sm:items-center sm:p-5 dark:bg-emerald-500/10 dark:ring-emerald-500/25">
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-emerald-950 dark:text-emerald-100">
        <span aria-hidden="true">✅ </span>
        <strong className="font-bold">Tu plan se ha actualizado:</strong>{" "}
        {texto ?? (
          <>
            Ajusté tus calorías y rutina de hoy según tu progreso de esta semana
            {s !== null && (
              <span className="font-bold whitespace-nowrap">
                {" "}
                ({signo(s)} kg{haciaLaMeta ? " 🎉" : ""})
              </span>
            )}
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

function ResumenCalorias({ consumido, datos }) {
  const { kcal } = datos.config;
  const { macros } = datos;
  const pasado = consumido.kcal > kcal;
  return (
    <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[auto_1fr]">
      <div className="mx-auto">
        <Anillo valor={consumido.kcal / kcal} color={pasado ? "text-orange-500" : "text-emerald-500"}>
          <div>
            <Flame className={`mx-auto size-4 ${pasado ? "text-orange-500" : "text-emerald-500"}`} />
            <p className="font-display text-[30px] leading-none font-bold tabular-nums">{num.format(consumido.kcal)}</p>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">de {num.format(kcal)} kcal</p>
          </div>
        </Anillo>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3.5">
        <BarraMacro nombre="Proteína" actual={consumido.p} objetivo={macros.p} color="bg-violet-500" />
        <BarraMacro nombre="Carbohidratos" actual={consumido.c} objetivo={macros.c} color="bg-blue-500" />
        <BarraMacro nombre="Grasas" actual={consumido.g} objetivo={macros.g} color="bg-orange-500" />
      </div>
    </div>
  );
}

function TarjetaNutricion({ datos, consumido, idsComidas, fase, acciones, abrir }) {
  return (
    <Tarjeta className="min-w-0 p-5">
      <Cabecera titulo="Tu nutrición de hoy" icono={Utensils}>
        <Insignia tono={fase.tono}>{fase.texto}</Insignia>
      </Cabecera>
      <div className="mt-4">
        <ResumenCalorias consumido={consumido} datos={datos} />
      </div>
      <h3 className="mt-5 mb-2 text-sm font-bold">Comidas de hoy</h3>
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1">
        {datos.comidas.map((c) => {
          const hecha = idsComidas.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="checkbox"
              aria-checked={hecha}
              onClick={() => acciones.alternarComida(c.id)}
              className={`relative flex w-[168px] shrink-0 snap-start flex-col rounded-2xl p-3.5 text-left ring-1 transition ${foco} ${hecha ? "bg-emerald-50 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30" : "bg-zinc-50 ring-zinc-200 hover:ring-emerald-300 dark:bg-white/5 dark:ring-white/10"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">{c.momento}</span>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${hecha ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {hecha && <Check className="size-3.5" strokeWidth={3.5} />}
                </span>
              </span>
              <span className="mt-1.5 line-clamp-2 min-h-[40px] text-[15px] leading-tight font-bold">{c.nombre}</span>
              <span className="mt-2 font-display text-xl leading-none font-bold tabular-nums">
                {num.format(c.kcal)} <span className="text-sm text-zinc-500 dark:text-zinc-400">kcal</span>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => abrir("comida")}
          className={`flex w-[120px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-zinc-200 p-3.5 text-sm font-bold text-zinc-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:text-zinc-400 ${foco}`}
        >
          <Plus className="size-5" /> Añadir comida
        </button>
      </div>
    </Tarjeta>
  );
}

function FilaEjercicio({ ejercicio: e, hecho, onToggle, onEditar }) {
  const carga = cargaActual(e);
  const subida = subidaCarga(e);
  return (
    <div className="flex items-center gap-3 py-3">
      <Casilla marcada={hecho} onClick={onToggle} etiqueta={e.nombre} />
      <div className="min-w-0 flex-1">
        <p
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-tight font-bold ${hecho ? "text-zinc-400 line-through decoration-zinc-300 dark:text-zinc-500 dark:decoration-zinc-600" : ""}`}
        >
          {e.nombre}
          {subida > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 no-underline dark:bg-emerald-500/20 dark:text-emerald-300">
              <TrendingUp className="size-3" /> +{kg(subida)} kg
            </span>
          )}
        </p>
        <p className="mt-0.5 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {e.series} series × {e.reps} reps • {carga === null ? "Peso corporal" : `${kg(carga)} kg`}
        </p>
      </div>
      {onEditar && <BotonIcono onClick={onEditar} etiqueta={`Editar ${e.nombre}`} icono={Pencil} />}
    </div>
  );
}

function TarjetaEntreno({ datos, idsEjercicios, diaHoy, acciones }) {
  const { rutina, ejercicios, config } = datos;
  const hechos = ejercicios.filter((e) => idsEjercicios.includes(e.id)).length;
  return (
    <Tarjeta className="min-w-0 p-5">
      <Cabecera titulo="Entrenamiento de hoy" icono={Dumbbell}>
        <Insignia tono="gris">
          Día {diaHoy} de {config.dias}
        </Insignia>
      </Cabecera>
      <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
        {rutina.nombre} ({rutina.musculos}) • {rutina.minutos} min • {ejercicios.length} {ejercicios.length === 1 ? "ejercicio" : "ejercicios"}
      </p>
      <div className="mt-1 divide-y divide-zinc-100 dark:divide-white/5">
        {ejercicios.map((e) => (
          <FilaEjercicio key={e.id} ejercicio={e} hecho={idsEjercicios.includes(e.id)} onToggle={() => acciones.alternarEjercicio(e.id)} />
        ))}
      </div>
      {ejercicios.length > 0 && hechos === ejercicios.length && (
        <p className="mt-2 rounded-2xl bg-emerald-50 p-3 text-center text-sm font-bold text-emerald-800 motion-safe:animate-pop dark:bg-emerald-500/10 dark:text-emerald-200">
          ¡Entrenamiento completado! 💪
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

function GraficoPeso({ registros, meta, hoy, alto = 200 }) {
  const [ref, W] = useAncho();
  const H = alto;
  const [izq, der, arr, aba] = [34, 16, 16, 24];
  if (!registros.length) {
    return (
      <div ref={ref} className="rounded-2xl bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
        Registra tu peso para ver la gráfica.
      </div>
    );
  }
  const inicio = sumarDias(hoy, -VENTANA);
  const valores = registros.map((r) => r.peso);
  const min = Math.floor(Math.min(...valores, meta) - 0.5);
  const max = Math.ceil(Math.max(...valores, meta) + 0.5);
  const x = (fecha) => izq + (diasEntre(inicio, fecha) / VENTANA) * (W - izq - der);
  const y = (v) => arr + (1 - (v - min) / (max - min)) * (H - arr - aba);
  const linea = registros.map((r, i) => `${i ? "L" : "M"}${x(r.fecha).toFixed(1)},${y(r.peso).toFixed(1)}`).join(" ");
  const paso = max - min > 8 ? 2 : 1;
  const ticks = [];
  for (let v = min; v <= max; v += paso) ticks.push(v);
  const semanas = Array.from({ length: 9 }, (_, i) => sumarDias(inicio, i * 7));
  const ultimo = registros.at(-1);
  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label={`Peso de las últimas 8 semanas. Último: ${kg(ultimo.peso)} kg. Meta: ${kg(meta)} kg.`}>
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
          Meta: {kg(meta)} kg
        </text>
        {registros.length > 1 && <path d={`${linea} L${x(ultimo.fecha)},${H - aba} L${x(registros[0].fecha)},${H - aba} Z`} fill="url(#area-peso)" />}
        {registros.length > 1 && <path d={linea} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {registros.map((r) => (
          <circle
            key={r.id}
            cx={x(r.fecha)}
            cy={y(r.peso)}
            r={r === ultimo ? 5 : 3.5}
            fill={r === ultimo ? "#10b981" : "currentColor"}
            stroke="#10b981"
            strokeWidth="2"
            className="text-white dark:text-[#121a16]"
          />
        ))}
        <text x={x(ultimo.fecha)} y={y(ultimo.peso) - 11} textAnchor="end" fill="currentColor" className="text-zinc-900 dark:text-white" fontSize="12" fontWeight="700">
          {kg(ultimo.peso)}
        </text>
        {semanas.map((s, i) => (
          <text key={s} x={x(s)} y={H - 6} textAnchor="middle" fill="currentColor" className="text-zinc-400 dark:text-zinc-500" fontSize="10" fontWeight="600">
            {i === semanas.length - 1 ? "Hoy" : i % 2 === 0 ? fechaCorta(s) : ""}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Indicador({ etiqueta: titulo, valor, cambio, bueno, icono: Icono }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 p-3 dark:bg-white/5">
      <p className="text-xs leading-tight font-bold text-zinc-500 dark:text-zinc-400">{titulo}</p>
      <p className="mt-1 font-display text-[24px] leading-none font-bold tabular-nums sm:text-[26px]">{valor}</p>
      {cambio && (
        <p className={`mt-1.5 flex items-start gap-1 text-xs leading-tight font-bold ${bueno ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>
          {Icono && <Icono className="size-3.5 shrink-0" />} <span>{cambio}</span>
        </p>
      )}
    </div>
  );
}

function TarjetaProgreso({ datos, prog, hoy, verMas }) {
  const { config } = datos;
  const quiereBajar = prog.pesoActual !== null && config.metaPeso < prog.pesoActual;
  return (
    <Tarjeta className="p-5">
      <Cabecera titulo="Tu progreso" icono={Activity}>
        {verMas && (
          <button
            type="button"
            onClick={verMas}
            className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-bold text-zinc-500 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-lime-300 ${foco}`}
          >
            Últimas 8 semanas <ChevronRight className="size-4" />
          </button>
        )}
      </Cabecera>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Indicador
          etiqueta="Peso actual"
          valor={prog.pesoActual === null ? "—" : `${kg(prog.pesoActual)} kg`}
          cambio={prog.cambioPeso === null ? null : `${signo(prog.cambioPeso)} kg`}
          bueno={prog.cambioPeso !== null && (quiereBajar ? prog.cambioPeso <= 0 : prog.cambioPeso >= 0)}
          icono={prog.cambioPeso <= 0 ? TrendingDown : TrendingUp}
        />
        <Indicador
          etiqueta="Grasa corporal"
          valor={prog.grasa === null ? "—" : `${kg(prog.grasa)}%`}
          cambio={prog.cambioGrasa === null ? null : `${signo(prog.cambioGrasa)}%`}
          bueno={prog.cambioGrasa <= 0}
          icono={prog.cambioGrasa <= 0 ? TrendingDown : TrendingUp}
        />
        <Indicador
          etiqueta="Fuerza media"
          valor={prog.fuerza === null ? "—" : `${prog.fuerza >= 0 ? "+" : "−"}${Math.round(Math.abs(prog.fuerza) * 100)}%`}
          cambio={prog.fuerza === null ? null : prog.fuerza > 0 ? "En aumento" : prog.fuerza < 0 ? "Bajando" : "Estable"}
          bueno={prog.fuerza >= 0}
          icono={prog.fuerza > 0 ? TrendingUp : prog.fuerza < 0 ? TrendingDown : null}
        />
      </div>
      <div className="mt-4">
        <GraficoPeso registros={prog.ventana} meta={config.metaPeso} hoy={hoy} />
      </div>
    </Tarjeta>
  );
}

/* ───────────────────────── Formularios ───────────────────────── */

function Paso({ id, etiqueta: titulo, valor, setValor, paso, min, max, unidad, decimales = 0 }) {
  const cambiar = (d) => setValor(Math.min(max, Math.max(min, +(Number(valor) + d).toFixed(decimales))));
  return (
    <div>
      <label htmlFor={id} className={etiqueta}>
        {titulo}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => cambiar(-paso)}
          aria-label={`Bajar ${titulo.toLowerCase()}`}
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
            onChange={(e) => setValor(e.target.value === "" ? "" : Number(e.target.value))}
            className={`${campo} text-center font-display text-2xl font-bold tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400">{unidad}</span>
        </div>
        <button
          type="button"
          onClick={() => cambiar(paso)}
          aria-label={`Subir ${titulo.toLowerCase()}`}
          className={`grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-xl font-bold hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 ${foco}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function FormObjetivos({ config, pesoActual, onGuardar }) {
  const [metaPeso, setMetaPeso] = useState(config.metaPeso);
  const [kcal, setKcal] = useState(config.kcal);
  const [dias, setDias] = useState(config.dias);
  const valido = metaPeso > 0 && kcal > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ metaPeso: Number(metaPeso), kcal: Math.round(Number(kcal)), dias });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <Paso id="obj-meta" etiqueta="Meta de peso" valor={metaPeso} setValor={setMetaPeso} paso={0.5} min={30} max={250} unidad="kg" decimales={1} />
      {pesoActual !== null && <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">Tu último peso registrado es {kg(pesoActual)} kg.</p>}
      <Paso id="obj-kcal" etiqueta="Calorías objetivo" valor={kcal} setValor={setKcal} paso={50} min={800} max={6000} unidad="kcal" />
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400">Días de entrenamiento por semana</legend>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
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
      </fieldset>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar objetivos
      </button>
    </form>
  );
}

function FormRegistro({ hoy, ultimo, onGuardar }) {
  const [fecha, setFecha] = useState(hoy);
  const [peso, setPeso] = useState(ultimo ?? "");
  const [grasa, setGrasa] = useState("");
  const valido = fecha && Number(peso) > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ fecha, peso: Math.round(Number(peso) * 10) / 10, grasa: grasa === "" ? null : Math.round(Number(grasa) * 10) / 10 });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="reg-fecha" className={etiqueta}>
          Fecha
        </label>
        <input id="reg-fecha" type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className={campo} />
      </div>
      <Paso id="reg-peso" etiqueta="Peso" valor={peso} setValor={setPeso} paso={0.1} min={30} max={250} unidad="kg" decimales={1} />
      <div>
        <label htmlFor="reg-grasa" className={etiqueta}>
          Grasa corporal (opcional)
        </label>
        <div className="relative">
          <input id="reg-grasa" inputMode="decimal" value={grasa} onChange={(e) => setGrasa(e.target.value.replace(/[^\d.]/g, ""))} className={campo} />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm font-bold text-zinc-400">%</span>
        </div>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">Si ya hay un registro en esa fecha, se sustituye.</p>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar
      </button>
    </form>
  );
}

function FormRutina({ rutina, onGuardar }) {
  const [nombre, setNombre] = useState(rutina.nombre);
  const [musculos, setMusculos] = useState(rutina.musculos);
  const [minutos, setMinutos] = useState(String(rutina.minutos));
  const valido = nombre.trim() && Number(minutos) > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ nombre: nombre.trim(), musculos: musculos.trim(), minutos: Math.round(Number(minutos)) });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="rut-nombre" className={etiqueta}>
          Nombre
        </label>
        <input id="rut-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="rut-musculos" className={etiqueta}>
          Músculos
        </label>
        <input id="rut-musculos" value={musculos} onChange={(e) => setMusculos(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="rut-minutos" className={etiqueta}>
          Duración (min)
        </label>
        <input id="rut-minutos" inputMode="numeric" value={minutos} onChange={(e) => setMinutos(e.target.value.replace(/\D/g, ""))} className={campo} />
      </div>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar
      </button>
    </form>
  );
}

function FormComida({ comida, onGuardar, onBorrar }) {
  const [f, setF] = useState(() => ({ momento: comida?.momento ?? "", nombre: comida?.nombre ?? "", kcal: comida?.kcal ?? "", p: comida?.p ?? "", c: comida?.c ?? "", g: comida?.g ?? "" }));
  const valido = f.momento.trim() && f.nombre.trim() && Number(f.kcal) > 0;
  const n = (v) => (v === "" || v === null ? null : Math.round(Number(v)));
  const campoNum = (k, titulo) => (
    <div>
      <label htmlFor={`comida-${k}`} className={etiqueta}>
        {titulo}
      </label>
      <input id={`comida-${k}`} inputMode="numeric" value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") })} className={campo} />
    </div>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ id: comida?.id, momento: f.momento.trim(), nombre: f.nombre.trim(), kcal: n(f.kcal), p: n(f.p), c: n(f.c), g: n(f.g) });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <div>
          <label htmlFor="comida-momento" className={etiqueta}>
            Momento
          </label>
          <input id="comida-momento" value={f.momento} onChange={(e) => setF({ ...f, momento: e.target.value })} className={campo} />
        </div>
        <div>
          <label htmlFor="comida-nombre" className={etiqueta}>
            Comida
          </label>
          <input id="comida-nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={campo} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {campoNum("kcal", "Calorías")}
        {campoNum("p", "Proteína (g)")}
        {campoNum("c", "Carbohidratos (g)")}
        {campoNum("g", "Grasas (g)")}
      </div>
      <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">Los gramos son opcionales: si los pones, cuentan en las barras de macros.</p>
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar comida
      </button>
      {onBorrar && (
        <button
          type="button"
          onClick={onBorrar}
          className={`rounded-2xl py-2.5 text-sm font-bold text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 ${foco}`}
        >
          Eliminar comida
        </button>
      )}
    </form>
  );
}

function FormEjercicio({ ejercicio, onGuardar, onBorrar }) {
  const carga = ejercicio ? cargaActual(ejercicio) : null;
  const [nombre, setNombre] = useState(ejercicio?.nombre ?? "");
  const [series, setSeries] = useState(String(ejercicio?.series ?? ""));
  const [reps, setReps] = useState(String(ejercicio?.reps ?? ""));
  const [corporal, setCorporal] = useState(ejercicio ? carga === null : false);
  const [peso, setPeso] = useState(carga === null ? "" : String(carga));
  const valido = nombre.trim() && Number(series) > 0 && Number(reps) > 0 && (corporal || Number(peso) > 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ id: ejercicio?.id, nombre: nombre.trim(), series: Number(series), reps: Number(reps), peso: corporal ? null : Math.round(Number(peso) * 10) / 10 });
      }}
      className="grid grid-cols-1 gap-4"
    >
      <div>
        <label htmlFor="ej-nombre" className={etiqueta}>
          Ejercicio
        </label>
        <input id="ej-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} className={campo} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="ej-series" className={etiqueta}>
            Series
          </label>
          <input id="ej-series" inputMode="numeric" value={series} onChange={(e) => setSeries(e.target.value.replace(/\D/g, ""))} className={campo} />
        </div>
        <div>
          <label htmlFor="ej-reps" className={etiqueta}>
            Reps
          </label>
          <input id="ej-reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ""))} className={campo} />
        </div>
        <div>
          <label htmlFor="ej-peso" className={etiqueta}>
            Peso (kg)
          </label>
          <input
            id="ej-peso"
            inputMode="decimal"
            disabled={corporal}
            value={corporal ? "" : peso}
            onChange={(e) => setPeso(e.target.value.replace(/[^\d.]/g, ""))}
            className={`${campo} disabled:opacity-40`}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={corporal} onChange={(e) => setCorporal(e.target.checked)} className="size-4 accent-emerald-600" />
        Peso corporal
      </label>
      {ejercicio && <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">Si subes el peso, aparece la insignia verde con la diferencia.</p>}
      <button type="submit" disabled={!valido} className={botonPrincipal}>
        Guardar ejercicio
      </button>
      {onBorrar && (
        <button
          type="button"
          onClick={onBorrar}
          className={`rounded-2xl py-2.5 text-sm font-bold text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 ${foco}`}
        >
          Eliminar ejercicio
        </button>
      )}
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

function BotonAnadir({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-700 dark:bg-lime-300 dark:text-zinc-900 ${foco}`}
    >
      <Plus className="size-4" /> {children}
    </button>
  );
}

function VistaNutricion({ datos, consumido, idsComidas, fase, acciones, abrir }) {
  return (
    <div>
      <TituloVista titulo="Nutrición" subtitulo={`${fase.texto} · objetivo ${num.format(datos.config.kcal)} kcal`}>
        <BotonAnadir onClick={() => abrir("comida")}>Añadir comida</BotonAnadir>
      </TituloVista>
      <Tarjeta className="p-5">
        <ResumenCalorias consumido={consumido} datos={datos} />
      </Tarjeta>
      <Tarjeta className="mt-4 p-5">
        <Cabecera titulo="Comidas de hoy" icono={Utensils} />
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
          {datos.comidas.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <Casilla marcada={idsComidas.includes(c.id)} onClick={() => acciones.alternarComida(c.id)} etiqueta={`${c.momento}: ${c.nombre}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight font-bold">
                  {c.nombre} <span className="font-semibold text-zinc-400">· {c.momento}</span>
                </p>
                <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] font-bold tabular-nums">
                  <span className="text-violet-600 dark:text-violet-400">P {c.p ?? "—"}g</span>
                  <span className="text-blue-600 dark:text-blue-400">C {c.c ?? "—"}g</span>
                  <span className="text-orange-600 dark:text-orange-400">G {c.g ?? "—"}g</span>
                </p>
              </div>
              <p className="shrink-0 font-display text-xl font-bold tabular-nums">{num.format(c.kcal)}</p>
              <BotonIcono onClick={() => abrir({ comida: c.id })} etiqueta={`Editar ${c.nombre}`} icono={Pencil} />
            </li>
          ))}
        </ul>
        {datos.comidas.length === 0 && <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tienes comidas. Añade la primera.</p>}
      </Tarjeta>
    </div>
  );
}

function VistaEntreno({ datos, idsEjercicios, diaHoy, acciones, abrir }) {
  const { rutina, ejercicios, config } = datos;
  return (
    <div>
      <TituloVista titulo="Entrenamiento" subtitulo={`Día ${diaHoy} de ${config.dias} · ${rutina.minutos} min`}>
        <BotonAnadir onClick={() => abrir("ejercicio")}>Añadir ejercicio</BotonAnadir>
      </TituloVista>
      <Tarjeta className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl leading-none font-bold">{rutina.nombre}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400">{rutina.musculos}</p>
          </div>
          <BotonIcono onClick={() => abrir("rutina")} etiqueta="Editar el entrenamiento" icono={Pencil} />
        </div>
        <div className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
          {ejercicios.map((e) => (
            <FilaEjercicio key={e.id} ejercicio={e} hecho={idsEjercicios.includes(e.id)} onToggle={() => acciones.alternarEjercicio(e.id)} onEditar={() => abrir({ ejercicio: e.id })} />
          ))}
        </div>
        {ejercicios.length === 0 && <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tienes ejercicios. Añade el primero.</p>}
      </Tarjeta>
    </div>
  );
}

function VistaProgreso(vista) {
  const { datos, acciones, abrir } = vista;
  const registros = [...datos.registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <div>
      <TituloVista titulo="Progreso" subtitulo={`Meta: ${kg(datos.config.metaPeso)} kg`}>
        <BotonAnadir onClick={() => abrir("registro")}>Registrar</BotonAnadir>
      </TituloVista>
      <TarjetaProgreso {...vista} />
      <Tarjeta className="mt-4 p-5">
        <Cabecera titulo="Registros" icono={Scale} />
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-white/5">
          {registros.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="font-semibold">{new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(deISO(r.fecha))}</span>
              <span className="flex items-center gap-3 tabular-nums">
                {r.grasa !== null && r.grasa !== undefined && <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{kg(r.grasa)}% grasa</span>}
                <span className="font-display text-lg font-bold">{kg(r.peso)} kg</span>
                <BotonIcono onClick={() => acciones.borrarRegistro(r.id)} etiqueta="Borrar registro" icono={Trash2} peligro />
              </span>
            </li>
          ))}
        </ul>
        {registros.length === 0 && <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No tienes registros.</p>}
      </Tarjeta>
    </div>
  );
}
