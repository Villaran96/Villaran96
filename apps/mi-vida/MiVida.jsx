// Mi Vida: panel personal con agenda, correo, tareas, herramientas conectadas y resumen matutino.
// Un solo archivo. Arranca con lo que viene en el prompt y todo lo que añades se guarda.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Hash,
  House,
  ListTodo,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  NotebookText,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Trash2,
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
const horaActual = () => new Date().toTimeString().slice(0, 5);
const lunesDe = (iso) => sumarDias(iso, -((deISO(iso).getDay() + 6) % 7));
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fechaLarga = (iso) => capital(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(deISO(iso)));
const nuevoId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* ───────────────────────── Datos del prompt ───────────────────────── */

const NOMBRE = "Diego";

function estadoInicial() {
  const hoy = hoyISO();
  const hora = horaActual();
  return {
    tareas: [
      { id: "t1", titulo: "Enviar propuesta a cliente", fecha: hoy, hecha: false },
      { id: "t2", titulo: "Editar reel de IG", fecha: hoy, hecha: false },
      { id: "t3", titulo: "Revisar presupuesto", fecha: hoy, hecha: false },
    ],
    eventos: [
      { id: "e1", fecha: hoy, hora: "10:00", titulo: "Llamada con cliente", color: "blue" },
      { id: "e2", fecha: hoy, hora: "12:30", titulo: "Revisión de diseño", color: "violet" },
      { id: "e3", fecha: hoy, hora: "16:00", titulo: "Editar contenido", color: "emerald" },
    ],
    correos: [
      { id: "c1", de: "Google", asunto: "Alerta de seguridad en tu cuenta", fecha: hoy, hora, leido: false },
      { id: "c2", de: "Notion", asunto: "Actualización: Revisión de proyecto", fecha: hoy, hora, leido: false },
      { id: "c3", de: "Slack", asunto: "3 nuevos mensajes en #general", fecha: hoy, hora, leido: false },
    ],
  };
}

const VACIO = { tareas: [], eventos: [], correos: [] };

const ECOSISTEMA = [
  { nombre: "Gmail", icono: Mail, fondo: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" },
  { nombre: "Calendar", icono: CalendarDays, fondo: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  { nombre: "Notion", icono: NotebookText, fondo: "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100" },
  { nombre: "Slack", icono: Hash, fondo: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300" },
  { nombre: "Drive", icono: HardDrive, fondo: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  { nombre: "WhatsApp", icono: MessageCircle, fondo: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
];

const COLOR = {
  blue: { nombre: "Azul", barra: "bg-blue-500", suave: "bg-blue-50 dark:bg-blue-500/10", texto: "text-blue-700 dark:text-blue-300" },
  violet: { nombre: "Morado", barra: "bg-violet-500", suave: "bg-violet-50 dark:bg-violet-500/10", texto: "text-violet-700 dark:text-violet-300" },
  emerald: { nombre: "Verde", barra: "bg-emerald-500", suave: "bg-emerald-50 dark:bg-emerald-500/10", texto: "text-emerald-700 dark:text-emerald-300" },
};

const TABS = [
  { id: "inicio", nombre: "Inicio", icono: House },
  { id: "calendario", nombre: "Calendario", icono: CalendarDays },
  { id: "tareas", nombre: "Tareas", icono: ListTodo },
  { id: "correo", nombre: "Correo", icono: Mail },
  { id: "ajustes", nombre: "Ajustes", icono: Settings },
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
  const [donde, setDonde] = useState("navegador");
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
        setDonde("cuenta");
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

  return [estado, setEstado, donde];
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

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";
const campo = "min-w-0 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:ring-white/10";

function Tarjeta({ className = "", children }) {
  return (
    <section
      className={`rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(30,27,75,0.18)] ring-1 ring-slate-900/5 dark:bg-slate-900 dark:shadow-none dark:ring-white/10 ${className}`}
    >
      {children}
    </section>
  );
}

function CabeceraTarjeta({ titulo, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{titulo}</h2>
      {children}
    </div>
  );
}

function Anillo({ valor, tam = 44, grosor = 5, color = "text-indigo-500", children }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} viewBox={`0 0 ${tam} ${tam}`} className="-rotate-90" aria-hidden="true">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="currentColor" strokeWidth={grosor} className="text-slate-100 dark:text-white/10" />
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
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

function Casilla({ marcada, onClick, etiqueta }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      aria-label={etiqueta}
      onClick={onClick}
      className={`grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2 transition ${foco} ${
        marcada ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500" : "border-slate-300 hover:border-indigo-400 dark:border-slate-600"
      }`}
    >
      {marcada && <Check className="size-3.5 motion-safe:animate-pop" strokeWidth={3.5} />}
    </button>
  );
}

function Interruptor({ activo, onClick, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${foco} ${activo ? "bg-indigo-600 dark:bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-5" : ""}`} />
    </button>
  );
}

function BotonBorrar({ onClick, etiqueta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className={`grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 ${foco}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function Hoja({ abierta, onCerrar, titulo, icono: Icono, children, lado = "abajo" }) {
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  const lateral = lado === "izquierda";
  return (
    <div className={`fixed inset-0 z-50 flex ${lateral ? "justify-start" : "items-end justify-center sm:items-center"}`} role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div
        className={
          lateral
            ? "relative flex h-full w-[min(320px,86vw)] flex-col overflow-y-auto bg-white pt-[max(20px,env(safe-area-inset-top))] pr-5 pb-[max(20px,env(safe-area-inset-bottom))] pl-[max(20px,env(safe-area-inset-left))] shadow-2xl motion-safe:animate-fade dark:bg-slate-900"
            : "relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg motion-safe:animate-sheet sm:max-w-lg sm:rounded-3xl sm:pb-6 dark:bg-slate-900 dark:ring-1 dark:ring-white/10"
        }
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {Icono && <Icono className="size-5 text-indigo-600 dark:text-indigo-400" />}
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

/* ───────────────────────── App ───────────────────────── */

export default function MiVida() {
  const [oscuro, alternarTema] = useTema("mi-vida:tema");
  const [datos, setDatos, donde] = useGuardado("mi-vida", estadoInicial);
  const [tab, setTab] = useState("inicio");
  const [hoja, setHoja] = useState(null); // "menu" | "avisos" | "resumen" | "espacio"
  const [hoy, setHoy] = useState(hoyISO);

  // Si la app sigue abierta al cambiar de día, todo se recalcula para el día nuevo.
  useEffect(() => {
    const t = setInterval(() => setHoy(hoyISO()), 60_000);
    return () => clearInterval(t);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const { tareas, eventos, correos } = datos;
  const cambiar = (lista, fn) => setDatos((d) => ({ ...d, [lista]: fn(d[lista]) }));

  // Tareas de hoy: las de hoy y las pendientes de días anteriores.
  const tareasHoy = tareas.filter((t) => t.fecha === hoy || (!t.hecha && t.fecha < hoy) || (t.hecha && t.hechaEl === hoy));
  const hechasHoy = tareasHoy.filter((t) => t.hecha).length;
  const avance = tareasHoy.length ? hechasHoy / tareasHoy.length : 0;
  const lunes = lunesDe(hoy);
  const tareasSemana = tareas.filter((t) => t.fecha >= lunes && t.fecha <= sumarDias(lunes, 6));
  const productividad = tareasSemana.length ? tareasSemana.filter((t) => t.hecha).length / tareasSemana.length : null;
  const eventosHoy = eventos.filter((e) => e.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const sinLeer = correos.filter((c) => !c.leido);
  const correosOrdenados = [...correos].sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`));

  const acciones = {
    alternarTarea: (id) => cambiar("tareas", (ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha, hechaEl: t.hecha ? null : hoy } : t))),
    nuevaTarea: (titulo, fecha = hoy) => cambiar("tareas", (ts) => [...ts, { id: nuevoId(), titulo, fecha, hecha: false }]),
    borrarTarea: (id) => cambiar("tareas", (ts) => ts.filter((t) => t.id !== id)),
    nuevoEvento: (ev) => cambiar("eventos", (es) => [...es, { id: nuevoId(), ...ev }]),
    borrarEvento: (id) => cambiar("eventos", (es) => es.filter((e) => e.id !== id)),
    alternarCorreo: (id) => cambiar("correos", (cs) => cs.map((c) => (c.id === id ? { ...c, leido: !c.leido } : c))),
    nuevoCorreo: (de, asunto) => cambiar("correos", (cs) => [...cs, { id: nuevoId(), de, asunto, fecha: hoyISO(), hora: horaActual(), leido: false }]),
    borrarCorreo: (id) => cambiar("correos", (cs) => cs.filter((c) => c.id !== id)),
  };

  return (
    <div className="min-h-screen font-sans text-slate-900 dark:text-slate-100">
      <Cabecera
        oscuro={oscuro}
        alternarTema={alternarTema}
        hayAvisos={sinLeer.length > 0}
        onMenu={() => setHoja("menu")}
        onAvisos={() => setHoja("avisos")}
        onPerfil={() => setTab("ajustes")}
        onEspacio={() => setHoja("espacio")}
      />

      <main className="mx-auto max-w-5xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {tab === "inicio" && (
          <Inicio
            hoy={hoy}
            eventosHoy={eventosHoy}
            sinLeer={sinLeer.length}
            tareasHoy={tareasHoy}
            hechasHoy={hechasHoy}
            productividad={productividad}
            correos={correosOrdenados}
            avance={avance}
            acciones={acciones}
            irA={setTab}
            abrirResumen={() => setHoja("resumen")}
          />
        )}
        {tab === "calendario" && <VistaCalendario hoy={hoy} eventos={eventos} acciones={acciones} />}
        {tab === "tareas" && <VistaTareas hoy={hoy} tareas={tareas} acciones={acciones} />}
        {tab === "correo" && <VistaCorreo correos={correosOrdenados} acciones={acciones} />}
        {tab === "ajustes" && <VistaAjustes oscuro={oscuro} alternarTema={alternarTema} donde={donde} borrarTodo={() => setDatos(VACIO)} restaurar={() => setDatos(estadoInicial())} />}
      </main>

      <NavInferior tab={tab} setTab={setTab} sinLeer={sinLeer.length} />

      <Hoja abierta={hoja === "menu"} onCerrar={cerrarHoja} titulo="Mi Vida" lado="izquierda">
        <nav className="grid grid-cols-1 gap-1" aria-label="Secciones">
          {TABS.map(({ id, nombre: n, icono: I }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                cerrarHoja();
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold ${foco} ${
                tab === id ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <I className="size-5" />
              {n}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
          <span className="flex items-center gap-2 text-sm font-semibold">{oscuro ? <Moon className="size-4" /> : <Sun className="size-4" />} Modo oscuro</span>
          <Interruptor activo={oscuro} onClick={alternarTema} etiqueta="Modo oscuro" />
        </div>
      </Hoja>

      <Hoja abierta={hoja === "espacio"} onCerrar={cerrarHoja} titulo="Espacio">
        <button
          type="button"
          onClick={cerrarHoja}
          className={`flex w-full items-center justify-between rounded-xl bg-indigo-50 px-3 py-3 text-left font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 ${foco}`}
        >
          Mi Vida <Check className="size-4" />
        </button>
      </Hoja>

      <Hoja abierta={hoja === "avisos"} onCerrar={cerrarHoja} titulo="Notificaciones" icono={Bell}>
        {sinLeer.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No tienes notificaciones.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {sinLeer.map((c) => (
              <li key={c.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <Mail className="mt-0.5 size-5 shrink-0 text-orange-500" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {c.de}: {c.asunto}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Correo sin leer · {c.hora}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Hoja>

      <ResumenIA abierto={hoja === "resumen"} onCerrar={cerrarHoja} hoy={hoy} eventos={eventosHoy} sinLeer={sinLeer} tareasHoy={tareasHoy} avance={avance} />
    </div>
  );
}

/* ───────────────────────── Cabecera y navegación ───────────────────────── */

function Cabecera({ oscuro, alternarTema, hayAvisos, onMenu, onAvisos, onPerfil, onEspacio }) {
  const boton = `grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/10 ${foco}`;
  return (
    <header className="mx-auto flex max-w-5xl items-center gap-2 gutter pt-4 pb-2">
      <button type="button" onClick={onMenu} aria-label="Abrir menú" className={boton}>
        <Menu className="size-5" />
      </button>
      <button
        type="button"
        onClick={onEspacio}
        aria-haspopup="dialog"
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[17px] font-extrabold tracking-tight hover:bg-white hover:shadow-sm dark:hover:bg-white/10 ${foco}`}
      >
        Mi Vida
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" onClick={alternarTema} aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} className={boton}>
          {oscuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
        <button type="button" onClick={onAvisos} aria-label="Notificaciones" className={`relative ${boton}`}>
          <Bell className="size-5" />
          {hayAvisos && <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-rose-500 ring-2 ring-[var(--page)]" />}
        </button>
        <button
          type="button"
          onClick={onPerfil}
          aria-label="Perfil y ajustes"
          className={`ml-1 grid size-10 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/25 ${foco}`}
        >
          {NOMBRE.charAt(0)}
        </button>
      </div>
    </header>
  );
}

function NavInferior({ tab, setTab, sinLeer }) {
  return (
    <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 pb-safe backdrop-blur-xl gutter dark:border-white/10 dark:bg-[#0b1020]/90">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ id, nombre, icono: I }) => {
          const activo = tab === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={activo ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold ${foco} ${
                  activo ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${activo ? "bg-indigo-50 dark:bg-indigo-500/15" : ""}`}>
                  <I className="size-5" strokeWidth={activo ? 2.4 : 2} />
                </span>
                {nombre}
                {id === "correo" && sinLeer > 0 && (
                  <span className="absolute top-1.5 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">{sinLeer}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ───────────────────────── Inicio ───────────────────────── */

function Inicio({ hoy, eventosHoy, sinLeer, tareasHoy, hechasHoy, productividad, correos, avance, acciones, irA, abrirResumen }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="pt-2 pb-1">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-3xl">Buenos días, {NOMBRE} 👋</h1>
        <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">Aquí tienes tu resumen para hoy</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <CalendarDays className="size-3.5" />
          {fechaLarga(hoy)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica onClick={() => irA("calendario")} valor={eventosHoy.length} etiqueta={eventosHoy.length === 1 ? "Evento hoy" : "Eventos hoy"}>
          <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <CalendarDays className="size-5" />
          </span>
        </Metrica>
        <Metrica onClick={() => irA("correo")} valor={sinLeer} etiqueta={sinLeer === 1 ? "Correo sin leer" : "Correos sin leer"}>
          <span className="grid size-11 place-items-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400">
            <Mail className="size-5" />
          </span>
        </Metrica>
        <Metrica onClick={() => irA("tareas")} valor={`${hechasHoy}/${tareasHoy.length}`} etiqueta="Tareas listas">
          <Anillo valor={tareasHoy.length ? hechasHoy / tareasHoy.length : 0} color="text-emerald-500">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          </Anillo>
        </Metrica>
        <Metrica onClick={() => irA("tareas")} valor={productividad === null ? "—" : `${Math.round(productividad * 100)}%`} etiqueta="Productividad">
          <Anillo valor={productividad ?? 0} color="text-violet-500">
            <Sparkles className="size-4 text-violet-600 dark:text-violet-300" />
          </Anillo>
        </Metrica>
      </div>

      <Tarjeta className="p-4 sm:p-5">
        <CabeceraTarjeta titulo="Estos son tus últimos correos">
          <button
            type="button"
            onClick={() => irA("correo")}
            className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 ${foco}`}
          >
            Ver todos <ChevronRight className="size-4" />
          </button>
        </CabeceraTarjeta>
        {correos.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No tienes correos. Añádelos desde la pestaña Correo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
            {correos.slice(0, 3).map((c) => (
              <li key={c.id}>
                <FilaCorreo correo={c} onClick={() => acciones.alternarCorreo(c.id)} />
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta className="p-4 sm:p-5">
          <CabeceraTarjeta titulo="Mi calendario">
            <button
              type="button"
              onClick={() => irA("calendario")}
              className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 ${foco}`}
            >
              Hoy
            </button>
          </CabeceraTarjeta>
          <ListaEventos eventos={eventosHoy} vacio="No tienes eventos hoy." />
        </Tarjeta>
        <TareasPendientes tareasHoy={tareasHoy} hechasHoy={hechasHoy} acciones={acciones} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta className="p-4 sm:p-5">
          <CabeceraTarjeta titulo="Tu ecosistema">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Conectado
            </span>
          </CabeceraTarjeta>
          <ul className="mt-3 grid grid-cols-3 gap-2.5">
            {ECOSISTEMA.map(({ nombre, icono: I, fondo }) => (
              <li key={nombre} className="flex flex-col items-center gap-1.5 rounded-xl p-3 ring-1 ring-slate-100 dark:ring-white/5">
                <span className={`grid size-11 place-items-center rounded-2xl ${fondo}`}>
                  <I className="size-5" />
                </span>
                <span className="text-xs font-semibold">{nombre}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta className="p-4 sm:p-5">
          <CabeceraTarjeta titulo="Resumen de hoy" />
          <div className="mt-3 flex items-center gap-4">
            <Anillo valor={avance} tam={104} grosor={10} color="text-indigo-500 dark:text-indigo-400">
              <span className="text-center">
                <span className="block text-2xl leading-none font-extrabold tracking-tight tabular-nums">{Math.round(avance * 100)}%</span>
                <span className="mt-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Avance del día</span>
              </span>
            </Anillo>
            <p className="min-w-0 text-sm leading-relaxed font-semibold text-slate-700 dark:text-slate-200">{mensajeMotivador(tareasHoy.length, avance)}</p>
          </div>
          <button
            type="button"
            onClick={abrirResumen}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:brightness-110 active:scale-[0.99] ${foco}`}
          >
            <Sparkles className="size-4" /> Resumen matutino IA
          </button>
        </Tarjeta>
      </div>
    </div>
  );
}

function mensajeMotivador(total, avance) {
  if (!total) return "Añade tus tareas de hoy para empezar.";
  if (avance >= 1) return "¡Has terminado todas tus tareas de hoy! 🎉";
  if (avance >= 0.5) return "¡Vas muy bien! Ya llevas más de la mitad.";
  if (avance > 0) return "Buen comienzo. ¡Sigue así!";
  return "Empieza por la primera tarea. ¡Tú puedes!";
}

function Metrica({ valor, etiqueta, children, onClick }) {
  return (
    <Tarjeta>
      <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition hover:bg-slate-50/80 dark:hover:bg-white/5 ${foco}`}>
        {children}
        <span className="min-w-0">
          <span className="block text-xl leading-none font-extrabold tracking-tight tabular-nums">{valor}</span>
          <span className="mt-1 block text-xs leading-tight font-medium text-slate-500 dark:text-slate-400">{etiqueta}</span>
        </span>
      </button>
    </Tarjeta>
  );
}

function FilaCorreo({ correo: c, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${c.de}: ${c.asunto}. ${c.leido ? "Leído, pulsa para marcar como no leído" : "Sin leer, pulsa para marcar como leído"}`}
      className={`flex w-full min-w-0 items-center gap-3 rounded-xl py-3 text-left transition hover:bg-slate-50 sm:px-2 dark:hover:bg-white/5 ${foco}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-extrabold text-slate-700 dark:bg-white/10 dark:text-slate-200">
        {c.de.trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${c.leido ? "font-semibold text-slate-600 dark:text-slate-300" : "font-extrabold"}`}>{c.de}</span>
          {!c.leido && <span className="size-2 shrink-0 rounded-full bg-indigo-500" />}
        </span>
        <span className={`block truncate text-sm ${c.leido ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{c.asunto}</span>
      </span>
      <span className="shrink-0 self-start pt-0.5 text-xs font-medium text-slate-400 tabular-nums">
        {c.fecha === hoyISO() ? c.hora : new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(deISO(c.fecha))}
      </span>
    </button>
  );
}

function ListaEventos({ eventos, vacio, onBorrar }) {
  if (eventos.length === 0) return <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">{vacio}</p>;
  return (
    <ol className="mt-3 grid grid-cols-1 gap-2.5">
      {eventos.map((e) => {
        const c = COLOR[e.color] ?? COLOR.blue;
        return (
          <li key={e.id} className="flex items-stretch gap-3">
            <span className="w-12 shrink-0 pt-2.5 text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">{e.hora}</span>
            <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2.5 pr-2 ${c.suave}`}>
              <span className={`w-1 self-stretch rounded-full ${c.barra}`} />
              <p className="min-w-0 flex-1 truncate py-1 text-sm font-bold">{e.titulo}</p>
              {onBorrar && <BotonBorrar onClick={() => onBorrar(e.id)} etiqueta={`Borrar «${e.titulo}»`} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function FormTarea({ onAnadir, onCancelar, conFecha = false, hoy, autoFocus = true }) {
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const enviar = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onAnadir(titulo.trim(), conFecha ? fecha : undefined);
    setTitulo("");
  };
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
      <label htmlFor={conFecha ? "tarea-titulo-lista" : "tarea-titulo"} className="sr-only">
        Nueva tarea
      </label>
      <input
        id={conFecha ? "tarea-titulo-lista" : "tarea-titulo"}
        autoFocus={autoFocus}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar?.()}
        placeholder="¿Qué tienes que hacer?"
        className={`${campo} flex-[1_1_160px]`}
      />
      {conFecha && (
        <>
          <label htmlFor="tarea-fecha" className="sr-only">
            Fecha
          </label>
          <input id="tarea-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value || hoy)} className={campo} />
        </>
      )}
      <button type="submit" disabled={!titulo.trim()} className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 ${foco}`}>
        Añadir
      </button>
    </form>
  );
}

function FilaTarea({ tarea: t, alternar, onBorrar, hoy }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Casilla marcada={t.hecha} onClick={() => alternar(t.id)} etiqueta={t.titulo} />
      <span className={`min-w-0 flex-1 text-sm font-semibold transition ${t.hecha ? "text-slate-400 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600" : ""}`}>
        {t.titulo}
      </span>
      {hoy && t.fecha !== hoy && (
        <span className={`shrink-0 text-xs font-semibold ${!t.hecha && t.fecha < hoy ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
          {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(deISO(t.fecha))}
        </span>
      )}
      {onBorrar && <BotonBorrar onClick={() => onBorrar(t.id)} etiqueta={`Borrar «${t.titulo}»`} />}
    </div>
  );
}

function TareasPendientes({ tareasHoy, hechasHoy, acciones }) {
  const [formAbierto, setFormAbierto] = useState(false);
  const ordenadas = [...tareasHoy].sort((a, b) => a.hecha - b.hecha);
  return (
    <Tarjeta className="flex flex-col p-4 sm:p-5">
      <CabeceraTarjeta titulo="Tareas pendientes">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 tabular-nums dark:bg-emerald-500/15 dark:text-emerald-300">
          {hechasHoy}/{tareasHoy.length}
        </span>
      </CabeceraTarjeta>
      <div className="mt-1 divide-y divide-slate-100 dark:divide-white/5">
        {ordenadas.map((t) => (
          <FilaTarea key={t.id} tarea={t} alternar={acciones.alternarTarea} />
        ))}
        {ordenadas.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No tienes tareas para hoy.</p>}
      </div>
      <div className="mt-3">
        {formAbierto ? (
          <FormTarea onAnadir={acciones.nuevaTarea} onCancelar={() => setFormAbierto(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setFormAbierto(true)}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-indigo-200 py-2.5 text-sm font-bold text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/60 dark:border-indigo-500/30 dark:text-indigo-400 dark:hover:bg-indigo-500/10 ${foco}`}
          >
            <Plus className="size-4" strokeWidth={3} /> Nueva tarea
          </button>
        )}
      </div>
    </Tarjeta>
  );
}

/* ───────────────────────── Resumen matutino IA ───────────────────────── */

function ResumenIA({ abierto, onCerrar, hoy, eventos, sinLeer, tareasHoy, avance }) {
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    if (!abierto) return;
    setCargando(true);
    const t = setTimeout(() => setCargando(false), 900);
    return () => clearTimeout(t);
  }, [abierto]);
  const pendientes = tareasHoy.filter((t) => !t.hecha);

  const secciones = [
    {
      titulo: "Agenda",
      icono: CalendarDays,
      color: "text-blue-600 dark:text-blue-400",
      vacio: "No tienes eventos hoy.",
      intro: eventos.length ? `Tienes ${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"} hoy:` : null,
      items: eventos.map((e) => `${e.hora} · ${e.titulo}`),
    },
    {
      titulo: "Correo",
      icono: Mail,
      color: "text-orange-500",
      vacio: "No tienes correos sin leer.",
      intro: sinLeer.length ? `Tienes ${sinLeer.length} ${sinLeer.length === 1 ? "correo sin leer" : "correos sin leer"}:` : null,
      items: sinLeer.map((c) => `${c.de}: ${c.asunto}`),
    },
    {
      titulo: "Tareas",
      icono: ListTodo,
      color: "text-emerald-600 dark:text-emerald-400",
      vacio: tareasHoy.length ? "Has terminado todas tus tareas de hoy." : "No tienes tareas para hoy.",
      intro: pendientes.length ? `Llevas un ${Math.round(avance * 100)} % del día. Te ${pendientes.length === 1 ? "queda" : "quedan"} ${pendientes.length}:` : null,
      items: pendientes.map((t) => t.titulo),
    },
  ];

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Resumen matutino IA" icono={Sparkles}>
      <p className="-mt-2 mb-4 text-sm text-slate-500 dark:text-slate-400">{fechaLarga(hoy)}</p>
      {cargando ? (
        <div className="grid grid-cols-1 gap-3" aria-busy="true">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="size-4 motion-safe:animate-pulse" /> Preparando tu resumen…
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div className="h-3 w-24 rounded bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
              <div className="mt-2 h-3 w-full rounded bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5" aria-live="polite">
          {secciones.map(({ titulo, icono: I, color, intro, items, vacio }) => (
            <div key={titulo} className="rounded-xl bg-slate-50 p-3.5 motion-safe:animate-sheet dark:bg-white/5">
              <p className={`flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase ${color}`}>
                <I className="size-4" /> {titulo}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">{intro ?? vacio}</p>
              {items.length > 0 && (
                <ul className="mt-1 grid grid-cols-1 gap-0.5 text-sm text-slate-600 dark:text-slate-300">
                  {items.map((it, i) => (
                    <li key={i}>• {it}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </Hoja>
  );
}

/* ───────────────────────── Otras pestañas ───────────────────────── */

function TituloVista({ titulo, subtitulo }) {
  return (
    <div className="pt-2 pb-4">
      <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{titulo}</h1>
      {subtitulo && <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">{subtitulo}</p>}
    </div>
  );
}

function VistaCalendario({ hoy, eventos, acciones }) {
  const [dia, setDia] = useState(hoy);
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("09:00");
  const [color, setColor] = useState("blue");
  const lunes = lunesDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const delDia = eventos.filter((e) => e.fecha === dia).sort((a, b) => a.hora.localeCompare(b.hora));
  const enviar = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !hora) return;
    acciones.nuevoEvento({ fecha: dia, hora, titulo: titulo.trim(), color });
    setTitulo("");
  };

  return (
    <div>
      <TituloVista titulo="Calendario" subtitulo={capital(new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(deISO(dia)))} />
      <Tarjeta className="flex items-center gap-1 p-2">
        <button
          type="button"
          onClick={() => setDia(sumarDias(dia, -7))}
          aria-label="Semana anterior"
          className={`grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 ${foco}`}
        >
          <ChevronLeft className="size-5" />
        </button>
        <ul className="grid flex-1 grid-cols-7 gap-1">
          {dias.map((d) => {
            const sel = d === dia;
            const hay = eventos.some((e) => e.fecha === d);
            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => setDia(d)}
                  aria-pressed={sel}
                  className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-2 ${foco} ${sel ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 dark:bg-indigo-500" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                >
                  <span className={`text-[11px] font-bold uppercase ${sel ? "text-indigo-100" : "text-slate-400"}`}>{new Intl.DateTimeFormat("es-ES", { weekday: "narrow" }).format(deISO(d))}</span>
                  <span className={`text-base font-extrabold tabular-nums ${!sel && d === hoy ? "text-indigo-600 dark:text-indigo-400" : ""}`}>{deISO(d).getDate()}</span>
                  <span className={`h-1 w-1 rounded-full ${hay ? (sel ? "bg-white" : "bg-indigo-400") : "bg-transparent"}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setDia(sumarDias(dia, 7))}
          aria-label="Semana siguiente"
          className={`grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 ${foco}`}
        >
          <ChevronRight className="size-5" />
        </button>
      </Tarjeta>

      <Tarjeta className="mt-4 p-4 sm:p-5">
        <CabeceraTarjeta titulo={dia === hoy ? "Hoy" : fechaLarga(dia)}>
          {dia !== hoy && (
            <button
              type="button"
              onClick={() => setDia(hoy)}
              className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 ${foco}`}
            >
              Ir a hoy
            </button>
          )}
        </CabeceraTarjeta>
        <ListaEventos eventos={delDia} vacio="No hay eventos este día." onBorrar={acciones.borrarEvento} />
        <form onSubmit={enviar} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
          <label htmlFor="evento-titulo" className="sr-only">
            Nuevo evento
          </label>
          <input id="evento-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nuevo evento" className={`${campo} flex-[1_1_160px]`} />
          <label htmlFor="evento-hora" className="sr-only">
            Hora
          </label>
          <input id="evento-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={campo} />
          <span className="flex items-center gap-1" role="radiogroup" aria-label="Color">
            {Object.entries(COLOR).map(([id, c]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={color === id}
                aria-label={c.nombre}
                onClick={() => setColor(id)}
                className={`size-7 rounded-full ${c.barra} ${foco} ${color === id ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-white dark:ring-offset-slate-900" : ""}`}
              />
            ))}
          </span>
          <button type="submit" disabled={!titulo.trim()} className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 ${foco}`}>
            Añadir
          </button>
        </form>
      </Tarjeta>
    </div>
  );
}

function VistaTareas({ hoy, tareas, acciones }) {
  const pendientes = tareas.filter((t) => !t.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hechas = tareas.filter((t) => t.hecha).sort((a, b) => (b.hechaEl ?? "").localeCompare(a.hechaEl ?? ""));
  return (
    <div>
      <TituloVista titulo="Tareas" subtitulo={`${pendientes.length} pendientes · ${hechas.length} hechas`} />
      <Tarjeta className="p-4 sm:p-5">
        <FormTarea onAnadir={acciones.nuevaTarea} conFecha hoy={hoy} autoFocus={false} />
        <h2 className="mt-5 text-xs font-bold tracking-wider text-slate-400 uppercase">Pendientes</h2>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {pendientes.map((t) => (
            <FilaTarea key={t.id} tarea={t} alternar={acciones.alternarTarea} onBorrar={acciones.borrarTarea} hoy={hoy} />
          ))}
          {pendientes.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No tienes tareas pendientes.</p>}
        </div>
        {hechas.length > 0 && (
          <>
            <h2 className="mt-5 text-xs font-bold tracking-wider text-slate-400 uppercase">Hechas</h2>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {hechas.map((t) => (
                <FilaTarea key={t.id} tarea={t} alternar={acciones.alternarTarea} onBorrar={acciones.borrarTarea} hoy={hoy} />
              ))}
            </div>
          </>
        )}
      </Tarjeta>
    </div>
  );
}

function VistaCorreo({ correos, acciones }) {
  const [de, setDe] = useState("");
  const [asunto, setAsunto] = useState("");
  const sinLeer = correos.filter((c) => !c.leido).length;
  const enviar = (e) => {
    e.preventDefault();
    if (!de.trim() || !asunto.trim()) return;
    acciones.nuevoCorreo(de.trim(), asunto.trim());
    setDe("");
    setAsunto("");
  };
  return (
    <div>
      <TituloVista titulo="Correo" subtitulo={`${sinLeer} sin leer · toca un correo para marcarlo como leído o no leído`} />
      <Tarjeta className="p-4 sm:p-5">
        <form onSubmit={enviar} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
          <label htmlFor="correo-de" className="sr-only">
            Remitente
          </label>
          <input id="correo-de" value={de} onChange={(e) => setDe(e.target.value)} placeholder="Remitente" className={`${campo} flex-[1_1_120px]`} />
          <label htmlFor="correo-asunto" className="sr-only">
            Asunto
          </label>
          <input id="correo-asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Asunto" className={`${campo} flex-[2_1_180px]`} />
          <button type="submit" disabled={!de.trim() || !asunto.trim()} className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 ${foco}`}>
            Añadir
          </button>
        </form>
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
          {correos.map((c) => (
            <li key={c.id} className="flex items-center gap-1">
              <FilaCorreo correo={c} onClick={() => acciones.alternarCorreo(c.id)} />
              <BotonBorrar onClick={() => acciones.borrarCorreo(c.id)} etiqueta={`Borrar el correo de ${c.de}`} />
            </li>
          ))}
        </ul>
        {correos.length === 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No tienes correos.</p>}
      </Tarjeta>
    </div>
  );
}

function VistaAjustes({ oscuro, alternarTema, donde, borrarTodo, restaurar }) {
  const [confirmar, setConfirmar] = useState(null); // "borrar" | "restaurar"
  return (
    <div>
      <TituloVista titulo="Ajustes" />
      <Tarjeta className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm font-semibold">Modo oscuro</span>
          <Interruptor activo={oscuro} onClick={alternarTema} etiqueta="Modo oscuro" />
        </div>
        <p className="mt-3 border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-white/5 dark:text-slate-300">
          {donde === "cuenta" ? "Tus datos se guardan en tu cuenta de Claude: los verás igual en todos tus dispositivos." : "Tus datos se guardan en este navegador."}
        </p>
        {confirmar ? (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
            <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
              {confirmar === "borrar" ? "Se borrarán todas tus tareas, eventos y correos." : "Se sustituirán tus datos por los del prompt original."} ¿Seguro?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  confirmar === "borrar" ? borrarTodo() : restaurar();
                  setConfirmar(null);
                }}
                className={`rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700 ${foco}`}
              >
                Sí, continuar
              </button>
              <button
                type="button"
                onClick={() => setConfirmar(null)}
                className={`rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/10 ${foco}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setConfirmar("borrar")}
              className={`rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:bg-white/10 dark:text-slate-200 ${foco}`}
            >
              Borrar todos los datos
            </button>
            <button
              type="button"
              onClick={() => setConfirmar("restaurar")}
              className={`rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 ${foco}`}
            >
              Volver a los datos del prompt
            </button>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
