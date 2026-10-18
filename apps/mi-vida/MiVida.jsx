// Mi Vida: panel personal con agenda, correo, tareas, herramientas conectadas y resumen matutino.
// Un solo archivo: datos de ejemplo, estado y todas las vistas.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  HardDrive,
  Hash,
  House,
  Inbox,
  ListTodo,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  NotebookText,
  Plus,
  RefreshCw,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Trash2,
  X,
} from "lucide-react";

/* ───────────────────────── Datos de ejemplo ───────────────────────── */

// Minutos estimados por tarea: el avance del día es el tiempo hecho sobre el planificado.
const TAREAS_INICIALES = [
  { id: 1, titulo: "Enviar propuesta a cliente", min: 15, hecha: false, area: "trabajo" },
  { id: 2, titulo: "Editar reel de IG", min: 30, hecha: false, area: "trabajo" },
  { id: 3, titulo: "Revisar presupuesto", min: 15, hecha: false, area: "personal" },
  { id: 4, titulo: "Llamar al dentista", min: 10, hecha: false, area: "personal" },
  { id: 5, titulo: "Preparar llamada con cliente", min: 45, hecha: true, area: "trabajo" },
  { id: 6, titulo: "Grabar contenido para IG", min: 90, hecha: true, area: "trabajo" },
  { id: 7, titulo: "Planificar la semana", min: 45, hecha: true, area: "personal" },
];

// Lo hecho de lunes a ayer; con lo de hoy da la productividad semanal (85 % al empezar).
const SEMANA_PREVIA = { hecho: 670, plan: 750 };

const EVENTOS_HOY = [
  { id: "e1", inicio: "10:00", fin: "10:45", titulo: "Llamada con cliente", lugar: "Google Meet · Estudio Nómada", color: "blue", tipo: "evento", area: "trabajo" },
  { id: "e2", inicio: "12:30", fin: "13:30", titulo: "Revisión de diseño", lugar: "Figma · Equipo de producto", color: "violet", tipo: "evento", area: "trabajo" },
  { id: "e3", inicio: "16:00", fin: "17:30", titulo: "Editar contenido", lugar: "Bloque de foco · Reel de IG", color: "emerald", tipo: "foco", area: "trabajo" },
];

// Resto de la semana, por día (0 = lunes).
const EVENTOS_SEMANA = {
  0: [
    { id: "l1", inicio: "09:30", fin: "10:00", titulo: "Daily del equipo", lugar: "Slack huddle", color: "blue", tipo: "evento", area: "trabajo" },
    { id: "l2", inicio: "18:30", fin: "19:30", titulo: "Gimnasio", lugar: "Pierna", color: "emerald", tipo: "foco", area: "personal" },
  ],
  1: [{ id: "m1", inicio: "11:00", fin: "12:30", titulo: "Sesión de fotos de producto", lugar: "Estudio", color: "violet", tipo: "evento", area: "trabajo" }],
  2: [
    { id: "x1", inicio: "09:30", fin: "10:00", titulo: "Daily del equipo", lugar: "Slack huddle", color: "blue", tipo: "evento", area: "trabajo" },
    { id: "x2", inicio: "17:00", fin: "18:00", titulo: "Clase de inglés", lugar: "Online", color: "amber", tipo: "evento", area: "personal" },
  ],
  3: [{ id: "j1", inicio: "13:00", fin: "14:30", titulo: "Comida con Laura", lugar: "La Huerta", color: "amber", tipo: "evento", area: "personal" }],
  4: [
    { id: "v1", inicio: "10:00", fin: "11:00", titulo: "Planificación de contenidos", lugar: "Notion", color: "violet", tipo: "evento", area: "trabajo" },
    { id: "v2", inicio: "16:00", fin: "18:00", titulo: "Grabación semanal", lugar: "Bloque de foco", color: "emerald", tipo: "foco", area: "trabajo" },
  ],
  5: [{ id: "s1", inicio: "11:00", fin: "12:00", titulo: "Mercado y compra semanal", lugar: "Personal", color: "amber", tipo: "evento", area: "personal" }],
  6: [{ id: "d1", inicio: "19:00", fin: "19:30", titulo: "Revisión semanal", lugar: "Notion", color: "violet", tipo: "foco", area: "personal" }],
};

const CORREOS_INICIALES = [
  {
    id: 1,
    de: "Google",
    asunto: "Alerta de seguridad en tu cuenta",
    hora: "08:42",
    leido: false,
    color: "bg-red-500",
    extracto: "Nuevo inicio de sesión en un dispositivo Windows.",
    cuerpo:
      "Hemos detectado un nuevo inicio de sesión en tu cuenta desde un dispositivo Windows. Si has sido tú, no tienes que hacer nada. Si no reconoces esta actividad, revisa tu cuenta y cambia la contraseña.",
  },
  {
    id: 2,
    de: "Notion",
    asunto: "Actualización: Revisión de proyecto",
    hora: "08:15",
    leido: false,
    color: "bg-slate-900 dark:bg-slate-700",
    extracto: "Laura ha comentado en «Rediseño web · Fase 2».",
    cuerpo: "Laura ha dejado 4 comentarios en la página «Rediseño web · Fase 2» y ha cambiado el estado a «En revisión». La revisión de diseño está programada para hoy a las 12:30.",
  },
  {
    id: 3,
    de: "Slack",
    asunto: "3 nuevos mensajes en #general",
    hora: "07:58",
    leido: false,
    color: "bg-[#4A154B]",
    extracto: "Marta: ¿Alguien tiene el enlace de la demo de hoy?",
    cuerpo: "Marta: ¿Alguien tiene el enlace de la demo de hoy?\nÁlex: Lo subo ahora al canal.\nÁlex: Listo, está fijado arriba 📌",
  },
  {
    id: 4,
    de: "Laura Martín",
    asunto: "Re: Propuesta de colaboración",
    hora: "07:31",
    leido: false,
    color: "bg-amber-500",
    extracto: "Nos encaja la idea. ¿Podrías enviarnos la propuesta hoy?",
    cuerpo: "¡Hola, Diego! Hemos revisado la idea con el equipo y nos encaja. ¿Podrías enviarnos la propuesta con presupuesto hoy? Así la vemos en la reunión del lunes. Gracias.",
  },
  {
    id: 5,
    de: "Canva",
    asunto: "Tu diseño «Reel octubre» está listo",
    hora: "Ayer",
    leido: false,
    color: "bg-cyan-500",
    extracto: "Ya puedes descargar o compartir tu diseño.",
    cuerpo: "Tu diseño «Reel octubre» se ha exportado correctamente. Ya puedes descargarlo o compartirlo desde tu panel de Canva.",
  },
  {
    id: 6,
    de: "Banco",
    asunto: "Tu recibo de la luz está disponible",
    hora: "Ayer",
    leido: true,
    color: "bg-sky-600",
    extracto: "Importe: 48,20 €. Cargo previsto el día 25.",
    cuerpo: "Tu recibo de la luz de este mes ya está disponible. Importe: 48,20 €. El cargo se realizará el día 25.",
  },
  {
    id: 7,
    de: "Correos",
    asunto: "Tu paquete está en reparto",
    hora: "Ayer",
    leido: true,
    color: "bg-yellow-500",
    extracto: "Entrega prevista hoy entre las 10:00 y las 14:00.",
    cuerpo: "Tu paquete está en reparto. Entrega prevista hoy entre las 10:00 y las 14:00.",
  },
];

const APPS_INICIALES = [
  { id: "gmail", nombre: "Gmail", icono: Mail, fondo: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400", conectada: true, sync: "hace 2 min" },
  { id: "calendar", nombre: "Calendar", icono: CalendarDays, fondo: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400", conectada: true, sync: "hace 5 min" },
  { id: "notion", nombre: "Notion", icono: NotebookText, fondo: "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100", conectada: true, sync: "hace 8 min" },
  { id: "slack", nombre: "Slack", icono: Hash, fondo: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300", conectada: true, sync: "hace 1 min" },
  { id: "drive", nombre: "Drive", icono: HardDrive, fondo: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400", conectada: true, sync: "hace 12 min" },
  { id: "whatsapp", nombre: "WhatsApp", icono: MessageCircle, fondo: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400", conectada: true, sync: "hace 3 min" },
];

const ESPACIOS = [
  { id: "todo", nombre: "Mi Vida", detalle: "Todo junto" },
  { id: "trabajo", nombre: "Trabajo", detalle: "Clientes y contenido" },
  { id: "personal", nombre: "Personal", detalle: "Casa, salud y finanzas" },
];

const COLOR = {
  blue: { barra: "bg-blue-500", suave: "bg-blue-50 dark:bg-blue-500/10", texto: "text-blue-700 dark:text-blue-300" },
  violet: { barra: "bg-violet-500", suave: "bg-violet-50 dark:bg-violet-500/10", texto: "text-violet-700 dark:text-violet-300" },
  emerald: { barra: "bg-emerald-500", suave: "bg-emerald-50 dark:bg-emerald-500/10", texto: "text-emerald-700 dark:text-emerald-300" },
  amber: { barra: "bg-amber-500", suave: "bg-amber-50 dark:bg-amber-500/10", texto: "text-amber-700 dark:text-amber-300" },
};

const TABS = [
  { id: "inicio", nombre: "Inicio", icono: House },
  { id: "calendario", nombre: "Calendario", icono: CalendarDays },
  { id: "tareas", nombre: "Tareas", icono: ListTodo },
  { id: "correo", nombre: "Correo", icono: Mail },
  { id: "ajustes", nombre: "Ajustes", icono: Settings },
];

/* ───────────────────────── Utilidades ───────────────────────── */

const aMin = (h) => {
  const [hh, mm] = h.split(":").map(Number);
  return hh * 60 + mm;
};
const duracion = (min) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}` : `${min} min`);
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fechaLarga = (d) => capital(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(d));
const saludoPara = (h) => (h >= 6 && h < 13 ? "Buenos días" : h >= 13 && h < 21 ? "Buenas tardes" : "Buenas noches");
const diaSemana = (d) => (d.getDay() + 6) % 7; // 0 = lunes

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

function useAhora() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return ahora;
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

function Tarjeta({ className = "", children, ...props }) {
  return (
    <section
      className={`rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-16px_rgba(30,27,75,0.18)] ring-1 ring-slate-900/5 dark:bg-slate-900 dark:shadow-none dark:ring-white/10 ${className}`}
      {...props}
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
            ? "relative flex h-full w-[min(320px,86vw)] flex-col overflow-y-auto bg-white pt-[max(20px,env(safe-area-inset-top))] pr-5 pb-[max(20px,env(safe-area-inset-bottom))] pl-[max(20px,env(safe-area-inset-left))] shadow-2xl dark:bg-slate-900 motion-safe:animate-fade"
            : "relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg sm:max-w-lg sm:rounded-3xl sm:pb-6 dark:bg-slate-900 dark:ring-1 dark:ring-white/10 motion-safe:animate-sheet"
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
  const ahora = useAhora();
  const [nombre, setNombre] = useState("Diego");
  const [tab, setTab] = useState("inicio");
  const [espacio, setEspacio] = useState("todo");
  const [tareas, setTareas] = useState(TAREAS_INICIALES);
  const [recientes, setRecientes] = useState(() => new Set());
  const [correos, setCorreos] = useState(CORREOS_INICIALES);
  const [apps, setApps] = useState(APPS_INICIALES);
  const [avisos, setAvisos] = useState(true);
  const [horaResumen, setHoraResumen] = useState("07:30");
  const [hoja, setHoja] = useState(null); // "menu" | "avisos" | "resumen" | { correo }
  const [notiLeidas, setNotiLeidas] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef();

  const avisar = useCallback((texto) => {
    clearTimeout(toastRef.current);
    setToast(texto);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const enEspacio = useCallback((x) => espacio === "todo" || x.area === espacio, [espacio]);
  const tareasEspacio = useMemo(() => tareas.filter(enEspacio), [tareas, enEspacio]);
  const eventosHoy = useMemo(() => EVENTOS_HOY.filter(enEspacio), [enEspacio]);

  const hechas = tareasEspacio.filter((t) => t.hecha);
  const pendientes = tareasEspacio.filter((t) => !t.hecha);
  const minHechos = hechas.reduce((s, t) => s + t.min, 0);
  const minTotales = tareasEspacio.reduce((s, t) => s + t.min, 0);
  const avance = minTotales ? minHechos / minTotales : 0;
  const todoHecho = tareas.filter((t) => t.hecha).reduce((s, t) => s + t.min, 0);
  const todoPlan = tareas.reduce((s, t) => s + t.min, 0);
  const productividad = (SEMANA_PREVIA.hecho + todoHecho) / (SEMANA_PREVIA.plan + todoPlan);
  const sinLeer = correos.filter((c) => !c.leido).length;
  const numEventos = eventosHoy.filter((e) => e.tipo === "evento").length;

  const alternarTarea = (id) => {
    setTareas((ts) => ts.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t)));
    setRecientes((r) => new Set(r).add(id));
  };
  const nuevaTarea = (titulo, min) => {
    const area = espacio === "todo" ? "personal" : espacio;
    setTareas((ts) => [{ id: Date.now(), titulo, min, hecha: false, area }, ...ts]);
    avisar("Tarea añadida");
  };
  const borrarTarea = (id) => setTareas((ts) => ts.filter((t) => t.id !== id));
  const abrirCorreo = (c) => {
    setCorreos((cs) => cs.map((x) => (x.id === c.id ? { ...x, leido: true } : x)));
    setHoja({ correo: c });
  };
  const alternarApp = (id) => {
    const app = apps.find((a) => a.id === id);
    setApps((as) => as.map((a) => (a.id === id ? { ...a, conectada: !a.conectada, sync: "ahora mismo" } : a)));
    avisar(app.conectada ? `${app.nombre} desconectado` : `${app.nombre} conectado`);
  };

  const notificaciones = useMemo(() => {
    const lista = [];
    const prox = eventosHoy.find((e) => aMin(e.inicio) > ahora.getHours() * 60 + ahora.getMinutes());
    if (prox) lista.push({ id: "ev", icono: CalendarDays, color: "text-blue-600 dark:text-blue-400", texto: `${prox.titulo} a las ${prox.inicio}`, cuando: "Próximo evento" });
    correos
      .filter((c) => !c.leido)
      .slice(0, 2)
      .forEach((c) => lista.push({ id: `c${c.id}`, icono: Mail, color: "text-orange-500", texto: `${c.de}: ${c.asunto}`, cuando: c.hora }));
    if (pendientes.length) lista.push({ id: "t", icono: ListTodo, color: "text-emerald-600 dark:text-emerald-400", texto: `Te quedan ${pendientes.length} tareas para hoy`, cuando: "Recordatorio" });
    return lista;
  }, [eventosHoy, correos, pendientes.length, ahora]);

  const nombreEspacio = ESPACIOS.find((e) => e.id === espacio).nombre;

  return (
    <div className="min-h-screen font-sans text-slate-900 dark:text-slate-100">
      <Cabecera
        espacio={espacio}
        setEspacio={setEspacio}
        nombreEspacio={nombreEspacio}
        oscuro={oscuro}
        alternarTema={alternarTema}
        hayAvisos={!notiLeidas && notificaciones.length > 0}
        onMenu={() => setHoja("menu")}
        onAvisos={() => setHoja("avisos")}
        onPerfil={() => setTab("ajustes")}
        nombre={nombre}
      />

      <main className="mx-auto max-w-5xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {tab === "inicio" && (
          <Inicio
            nombre={nombre}
            ahora={ahora}
            numEventos={numEventos}
            sinLeer={sinLeer}
            hechas={hechas.length}
            total={tareasEspacio.length}
            productividad={productividad}
            correos={correos}
            abrirCorreo={abrirCorreo}
            eventosHoy={eventosHoy}
            tareasEspacio={tareasEspacio}
            recientes={recientes}
            pendientes={pendientes}
            alternarTarea={alternarTarea}
            nuevaTarea={nuevaTarea}
            apps={apps}
            alternarApp={alternarApp}
            avance={avance}
            minRestantes={minTotales - minHechos}
            irA={setTab}
            abrirResumen={() => setHoja("resumen")}
          />
        )}
        {tab === "calendario" && <VistaCalendario ahora={ahora} enEspacio={enEspacio} />}
        {tab === "tareas" && <VistaTareas tareas={tareasEspacio} alternarTarea={alternarTarea} nuevaTarea={nuevaTarea} borrarTarea={borrarTarea} avance={avance} />}
        {tab === "correo" && (
          <VistaCorreo
            correos={correos}
            abrirCorreo={abrirCorreo}
            marcarTodo={() => {
              setCorreos((cs) => cs.map((c) => ({ ...c, leido: true })));
              avisar("Todo marcado como leído");
            }}
          />
        )}
        {tab === "ajustes" && (
          <VistaAjustes
            nombre={nombre}
            setNombre={setNombre}
            oscuro={oscuro}
            alternarTema={alternarTema}
            avisos={avisos}
            setAvisos={setAvisos}
            horaResumen={horaResumen}
            setHoraResumen={setHoraResumen}
            apps={apps}
            alternarApp={alternarApp}
            restablecer={() => {
              setTareas(TAREAS_INICIALES);
              setCorreos(CORREOS_INICIALES);
              setApps(APPS_INICIALES);
              setRecientes(new Set());
              setEspacio("todo");
              avisar("Datos de ejemplo restablecidos");
            }}
          />
        )}
      </main>

      <NavInferior tab={tab} setTab={setTab} sinLeer={sinLeer} />

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center gutter">
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg motion-safe:animate-sheet dark:bg-white dark:text-slate-900">{toast}</div>
        </div>
      )}

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
        <p className="mt-6 mb-2 px-3 text-xs font-bold tracking-wider text-slate-400 uppercase">Espacios</p>
        <div className="grid grid-cols-1 gap-1">
          {ESPACIOS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setEspacio(e.id);
                cerrarHoja();
              }}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left ${foco} hover:bg-slate-100 dark:hover:bg-white/5`}
            >
              <span>
                <span className="block text-sm font-semibold">{e.nombre}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{e.detalle}</span>
              </span>
              {espacio === e.id && <Check className="size-4 text-indigo-600 dark:text-indigo-400" />}
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 dark:bg-white/5">
          <span className="flex items-center gap-2 text-sm font-semibold">{oscuro ? <Moon className="size-4" /> : <Sun className="size-4" />} Modo oscuro</span>
          <Interruptor activo={oscuro} onClick={alternarTema} etiqueta="Modo oscuro" />
        </div>
      </Hoja>

      <Hoja abierta={hoja === "avisos"} onCerrar={cerrarHoja} titulo="Notificaciones" icono={Bell}>
        {notificaciones.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No tienes notificaciones.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {notificaciones.map(({ id, icono: I, color, texto, cuando }) => (
              <li key={id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                <I className={`mt-0.5 size-5 shrink-0 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{texto}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{cuando}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setNotiLeidas(true);
            cerrarHoja();
          }}
          className={`mt-4 w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 ${foco}`}
        >
          Marcar como vistas
        </button>
      </Hoja>

      <Hoja abierta={!!hoja?.correo} onCerrar={cerrarHoja} titulo={hoja?.correo?.de ?? ""} icono={Mail}>
        {hoja?.correo && (
          <article>
            <h3 className="text-base font-bold">{hoja.correo.asunto}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recibido {hoja.correo.hora === "Ayer" ? "ayer" : `hoy a las ${hoja.correo.hora}`}</p>
            <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">{hoja.correo.cuerpo}</p>
            {hoja.correo.id === 1 && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/10 dark:text-red-200">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                Si no reconoces este acceso, cambia la contraseña cuanto antes.
              </div>
            )}
          </article>
        )}
      </Hoja>

      <ResumenIA abierto={hoja === "resumen"} onCerrar={cerrarHoja} nombre={nombre} ahora={ahora} eventos={eventosHoy} correos={correos} pendientes={pendientes} avance={avance} avisar={avisar} />
    </div>
  );
}

/* ───────────────────────── Cabecera y navegación ───────────────────────── */

function Cabecera({ espacio, setEspacio, nombreEspacio, oscuro, alternarTema, hayAvisos, onMenu, onAvisos, onPerfil, nombre }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  const boton = `grid size-10 place-items-center rounded-full text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-300 dark:hover:bg-white/10 ${foco}`;
  return (
    <header className="mx-auto flex max-w-5xl items-center gap-2 gutter pt-4 pb-2">
      <button type="button" onClick={onMenu} aria-label="Abrir menú" className={boton}>
        <Menu className="size-5" />
      </button>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-haspopup="listbox"
          aria-expanded={abierto}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[17px] font-extrabold tracking-tight hover:bg-white hover:shadow-sm dark:hover:bg-white/10 ${foco}`}
        >
          {nombreEspacio}
          <ChevronDown className={`size-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`} />
        </button>
        {abierto && (
          <ul
            role="listbox"
            aria-label="Espacio"
            className="absolute top-full left-0 z-40 mt-1 w-56 rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10 motion-safe:animate-pop dark:bg-slate-800 dark:ring-white/10"
          >
            {ESPACIOS.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={espacio === e.id}
                  onClick={() => {
                    setEspacio(e.id);
                    setAbierto(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 ${foco}`}
                >
                  <span>
                    <span className="block text-sm font-bold">{e.nombre}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{e.detalle}</span>
                  </span>
                  {espacio === e.id && <Check className="size-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
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
          {nombre.trim().charAt(0).toUpperCase() || "?"}
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

function Inicio(p) {
  const { nombre, ahora, numEventos, sinLeer, hechas, total, productividad } = p;
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="pt-2 pb-1">
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight sm:text-3xl">
          {saludoPara(ahora.getHours())}, {nombre.trim() || "Diego"} 👋
        </h1>
        <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">Aquí tienes tu resumen para hoy</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <CalendarDays className="size-3.5" />
          {fechaLarga(ahora)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica onClick={() => p.irA("calendario")} valor={numEventos} etiqueta={numEventos === 1 ? "Evento hoy" : "Eventos hoy"}>
          <span className="grid size-11 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
            <CalendarDays className="size-5" />
          </span>
        </Metrica>
        <Metrica onClick={() => p.irA("correo")} valor={sinLeer} etiqueta={sinLeer === 1 ? "Correo sin leer" : "Correos sin leer"}>
          <span className="grid size-11 place-items-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400">
            <Mail className="size-5" />
          </span>
        </Metrica>
        <Metrica onClick={() => p.irA("tareas")} valor={`${hechas}/${total}`} etiqueta="Tareas listas">
          <Anillo valor={total ? hechas / total : 0} color="text-emerald-500">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
          </Anillo>
        </Metrica>
        <Metrica valor={`${Math.round(productividad * 100)}%`} etiqueta="Productividad">
          <Anillo valor={productividad} color="text-violet-500">
            <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-300">sem</span>
          </Anillo>
        </Metrica>
      </div>

      <CorreosRecientes correos={p.correos} abrirCorreo={p.abrirCorreo} verTodos={() => p.irA("correo")} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CalendarioHoy eventos={p.eventosHoy} ahora={ahora} verMas={() => p.irA("calendario")} />
        <TareasPendientes
          tareas={p.tareasEspacio}
          recientes={p.recientes}
          pendientes={p.pendientes}
          hechas={hechas}
          total={total}
          alternarTarea={p.alternarTarea}
          nuevaTarea={p.nuevaTarea}
          verTodas={() => p.irA("tareas")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Ecosistema apps={p.apps} alternarApp={p.alternarApp} />
        <ResumenHoy avance={p.avance} pendientes={p.pendientes} minRestantes={p.minRestantes} abrirResumen={p.abrirResumen} />
      </div>
    </div>
  );
}

function Metrica({ valor, etiqueta, children, onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Tarjeta className="p-0">
      <Comp
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ${onClick ? `transition hover:bg-slate-50/80 dark:hover:bg-white/5 ${foco}` : ""}`}
      >
        {children}
        <span className="min-w-0">
          <span className="block text-xl leading-none font-extrabold tracking-tight tabular-nums">{valor}</span>
          <span className="mt-1 block text-xs leading-tight font-medium text-slate-500 dark:text-slate-400">{etiqueta}</span>
        </span>
      </Comp>
    </Tarjeta>
  );
}

function CorreosRecientes({ correos, abrirCorreo, verTodos }) {
  return (
    <Tarjeta className="p-4 sm:p-5">
      <CabeceraTarjeta titulo="Estos son tus últimos correos">
        <button
          type="button"
          onClick={verTodos}
          className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 ${foco}`}
        >
          Ver todos <ChevronRight className="size-4" />
        </button>
      </CabeceraTarjeta>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
        {correos.slice(0, 3).map((c) => (
          <li key={c.id}>
            <FilaCorreo correo={c} onClick={() => abrirCorreo(c)} />
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function FilaCorreo({ correo: c, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl py-3 text-left transition hover:bg-slate-50 sm:px-2 dark:hover:bg-white/5 ${foco}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white ${c.color}`}>{c.de.charAt(0)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${c.leido ? "font-semibold text-slate-600 dark:text-slate-300" : "font-extrabold"}`}>{c.de}</span>
          {!c.leido && <span className="size-2 shrink-0 rounded-full bg-indigo-500" aria-label="Sin leer" />}
        </span>
        <span className={`block truncate text-sm ${c.leido ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{c.asunto}</span>
      </span>
      <span className="shrink-0 self-start pt-0.5 text-xs font-medium text-slate-400 tabular-nums">{c.hora}</span>
    </button>
  );
}

function CalendarioHoy({ eventos, ahora, verMas }) {
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  return (
    <Tarjeta className="p-4 sm:p-5">
      <CabeceraTarjeta titulo="Mi calendario">
        <button type="button" onClick={verMas} className={`rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 ${foco}`}>
          Hoy
        </button>
      </CabeceraTarjeta>
      {eventos.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-400">No tienes nada en la agenda de este espacio hoy.</p>
      ) : (
        <ol className="mt-3 grid grid-cols-1 gap-2.5">
          {eventos.map((e) => {
            const c = COLOR[e.color];
            const enCurso = minAhora >= aMin(e.inicio) && minAhora < aMin(e.fin);
            return (
              <li key={e.id} className="flex items-stretch gap-3">
                <span className="w-12 shrink-0 pt-2.5 text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">{e.inicio}</span>
                <div className={`flex min-w-0 flex-1 items-stretch gap-3 rounded-xl p-2.5 pr-3 ${c.suave}`}>
                  <span className={`w-1 shrink-0 rounded-full ${c.barra}`} />
                  <div className="min-w-0 py-0.5">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      <span className="truncate">{e.titulo}</span>
                      {enCurso && <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-white/15 dark:text-white">Ahora</span>}
                    </p>
                    <p className={`truncate text-xs font-medium ${c.texto}`}>
                      {e.inicio}–{e.fin} · {e.lugar}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Tarjeta>
  );
}

function FormNuevaTarea({ onAnadir, onCancelar, autoFocus = true }) {
  const [titulo, setTitulo] = useState("");
  const [min, setMin] = useState(30);
  const enviar = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onAnadir(titulo.trim(), min);
    setTitulo("");
  };
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 dark:bg-white/5">
      <label htmlFor="nueva-tarea" className="sr-only">
        Nueva tarea
      </label>
      <input
        id="nueva-tarea"
        autoFocus={autoFocus}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar?.()}
        placeholder="¿Qué tienes que hacer?"
        className="min-w-0 flex-[1_1_160px] rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:ring-white/10"
      />
      <label htmlFor="nueva-tarea-min" className="sr-only">
        Duración
      </label>
      <select
        id="nueva-tarea-min"
        value={min}
        onChange={(e) => setMin(Number(e.target.value))}
        className="rounded-lg bg-white px-2 py-2 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:ring-white/10"
      >
        {[10, 15, 30, 45, 60, 90].map((m) => (
          <option key={m} value={m}>
            {duracion(m)}
          </option>
        ))}
      </select>
      <button type="submit" disabled={!titulo.trim()} className={`rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40 ${foco}`}>
        Añadir
      </button>
    </form>
  );
}

function FilaTarea({ tarea: t, alternar, onBorrar }) {
  return (
    <div className="group flex items-center gap-3 py-2.5">
      <Casilla marcada={t.hecha} onClick={() => alternar(t.id)} etiqueta={t.titulo} />
      <span className={`min-w-0 flex-1 text-sm font-semibold transition ${t.hecha ? "text-slate-400 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600" : ""}`}>
        {t.titulo}
      </span>
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 tabular-nums dark:bg-white/10 dark:text-slate-400">
        <Clock className="size-3" />
        {duracion(t.min)}
      </span>
      {onBorrar && (
        <button
          type="button"
          onClick={() => onBorrar(t.id)}
          aria-label={`Borrar «${t.titulo}»`}
          className={`grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 ${foco}`}
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

function TareasPendientes({ tareas, recientes, pendientes, hechas, total, alternarTarea, nuevaTarea, verTodas }) {
  const [formAbierto, setFormAbierto] = useState(false);
  // Hasta 3 pendientes, y las que acabas de marcar se quedan tachadas en su sitio.
  const visibles = [];
  let mostradas = 0;
  for (const t of tareas) {
    if (!t.hecha && mostradas < 3) {
      visibles.push(t);
      mostradas++;
    } else if (t.hecha && recientes.has(t.id)) visibles.push(t);
  }
  const ocultas = pendientes.length - mostradas;

  return (
    <Tarjeta className="flex flex-col p-4 sm:p-5">
      <CabeceraTarjeta titulo="Tareas pendientes">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 tabular-nums dark:bg-emerald-500/15 dark:text-emerald-300">
          {hechas}/{total}
        </span>
      </CabeceraTarjeta>
      <div className="mt-1 divide-y divide-slate-100 dark:divide-white/5">
        {visibles.map((t) => (
          <FilaTarea key={t.id} tarea={t} alternar={alternarTarea} />
        ))}
        {visibles.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">¡Nada pendiente! 🎉</p>}
      </div>
      {ocultas > 0 && (
        <button type="button" onClick={verTodas} className={`mt-1 self-start rounded-full px-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 ${foco}`}>
          +{ocultas} {ocultas === 1 ? "tarea más" : "tareas más"}
        </button>
      )}
      <div className="mt-3">
        {formAbierto ? (
          <FormNuevaTarea onAnadir={nuevaTarea} onCancelar={() => setFormAbierto(false)} />
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

function Ecosistema({ apps, alternarApp }) {
  const conectadas = apps.filter((a) => a.conectada).length;
  const todas = conectadas === apps.length;
  return (
    <Tarjeta className="p-4 sm:p-5">
      <CabeceraTarjeta titulo="Tu ecosistema">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            todas ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          }`}
        >
          <span className={`size-1.5 rounded-full ${todas ? "bg-emerald-500" : "bg-amber-500"}`} />
          {todas ? "Conectado" : `${conectadas}/${apps.length} conectadas`}
        </span>
      </CabeceraTarjeta>
      <ul className="mt-3 grid grid-cols-3 gap-2.5">
        {apps.map(({ id, nombre, icono: I, fondo, conectada }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => alternarApp(id)}
              aria-pressed={conectada}
              aria-label={`${nombre}: ${conectada ? "conectado, pulsa para desconectar" : "desconectado, pulsa para conectar"}`}
              className={`flex w-full flex-col items-center gap-1.5 rounded-xl p-3 ring-1 ring-slate-100 transition hover:ring-indigo-200 dark:ring-white/5 dark:hover:ring-indigo-500/40 ${foco} ${conectada ? "" : "opacity-50 grayscale"}`}
            >
              <span className={`relative grid size-11 place-items-center rounded-2xl ${fondo}`}>
                <I className="size-5" />
                <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${conectada ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
              </span>
              <span className="text-xs font-semibold">{nombre}</span>
            </button>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function mensajeMotivador(avance, pendientes) {
  if (avance >= 1) return "¡Día completado! Te has ganado un buen descanso. 🎉";
  const corta = [...pendientes].sort((a, b) => a.min - b.min)[0];
  if (avance >= 0.7) return `¡Vas muy bien! Termina «${corta.titulo}» y cierra el día con fuerza.`;
  if (avance >= 0.4) return `Buen ritmo. Céntrate en «${corta.titulo}» y lo demás irá saliendo.`;
  return `Empieza por algo corto: «${corta.titulo}». Coger impulso es lo más difícil.`;
}

function ResumenHoy({ avance, pendientes, minRestantes, abrirResumen }) {
  return (
    <Tarjeta className="p-4 sm:p-5">
      <CabeceraTarjeta titulo="Resumen de hoy" />
      <div className="mt-3 flex items-center gap-4">
        <Anillo valor={avance} tam={104} grosor={10} color="text-indigo-500 dark:text-indigo-400">
          <span className="text-center">
            <span className="block text-2xl leading-none font-extrabold tracking-tight tabular-nums">{Math.round(avance * 100)}%</span>
            <span className="mt-1 block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Avance del día</span>
          </span>
        </Anillo>
        <div className="min-w-0">
          <p className="text-sm leading-relaxed font-semibold text-slate-700 dark:text-slate-200">{mensajeMotivador(avance, pendientes)}</p>
          {minRestantes > 0 && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Te quedan {pendientes.length} {pendientes.length === 1 ? "tarea" : "tareas"} · unos {duracion(minRestantes)}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={abrirResumen}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:brightness-110 active:scale-[0.99] ${foco}`}
      >
        <Sparkles className="size-4" /> Resumen matutino IA
      </button>
    </Tarjeta>
  );
}

/* ───────────────────────── Resumen matutino IA ───────────────────────── */

function construirResumen({ nombre, ahora, eventos, correos, pendientes, avance }) {
  const sinLeer = correos.filter((c) => !c.leido);
  const reuniones = eventos.filter((e) => e.tipo === "evento");
  const bloques = eventos.filter((e) => e.tipo === "foco");
  const minPend = pendientes.reduce((s, t) => s + t.min, 0);

  // Próximo hueco libre de al menos 45 min entre eventos (desde ahora).
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  let hueco = null;
  for (let i = 0; i < eventos.length - 1; i++) {
    const desde = Math.max(aMin(eventos[i].fin), minAhora);
    const libre = aMin(eventos[i + 1].inicio) - desde;
    if (libre >= 45) {
      const hhmm = `${String(Math.floor(desde / 60)).padStart(2, "0")}:${String(desde % 60).padStart(2, "0")}`;
      hueco = { desde: hhmm, hasta: eventos[i + 1].inicio, min: libre };
      break;
    }
  }
  const caben = [];
  if (hueco) {
    let resto = hueco.min;
    for (const t of [...pendientes].sort((a, b) => a.min - b.min)) {
      if (t.min <= resto) {
        caben.push(t);
        resto -= t.min;
      }
    }
  }

  return [
    {
      titulo: "Agenda",
      icono: CalendarDays,
      color: "text-blue-600 dark:text-blue-400",
      texto: eventos.length
        ? `Tienes ${reuniones.length} ${reuniones.length === 1 ? "evento" : "eventos"}${bloques.length ? ` y ${bloques.length} ${bloques.length === 1 ? "bloque" : "bloques"} de foco` : ""}: ${eventos.map((e) => `${e.titulo} a las ${e.inicio}`).join(", ")}.`
        : "Hoy no tienes nada en la agenda. Buen día para avanzar a tu ritmo.",
    },
    {
      titulo: "Correo",
      icono: Inbox,
      color: "text-orange-500",
      texto: sinLeer.length
        ? `${sinLeer.length} ${sinLeer.length === 1 ? "correo sin leer" : "correos sin leer"}. ${
            sinLeer.some((c) => c.id === 1) ? "Lo primero: revisa la alerta de seguridad de Google. " : ""
          }${sinLeer.some((c) => c.id === 4) ? "Laura espera tu propuesta hoy." : ""}`.trim()
        : "Bandeja al día. No tienes correos pendientes.",
    },
    {
      titulo: "Tareas",
      icono: ListTodo,
      color: "text-emerald-600 dark:text-emerald-400",
      texto: pendientes.length
        ? `Llevas un ${Math.round(avance * 100)} % del día. Te quedan ${pendientes.length} ${pendientes.length === 1 ? "tarea" : "tareas"}, unos ${duracion(minPend)} en total.`
        : "Has terminado todas las tareas. ¡Enhorabuena!",
    },
    hueco && caben.length
      ? {
          titulo: "Sugerencia",
          icono: Sparkles,
          color: "text-violet-600 dark:text-violet-400",
          texto: `Tienes un hueco de ${hueco.desde} a ${hueco.hasta}. Aprovéchalo para ${new Intl.ListFormat("es", { type: "conjunction" }).format(caben.slice(0, 3).map((t) => `«${t.titulo}»`))}.`,
        }
      : {
          titulo: "Sugerencia",
          icono: Sparkles,
          color: "text-violet-600 dark:text-violet-400",
          texto: `${nombre.trim() || "Diego"}, guarda 10 minutos al final del día para dejar preparado mañana.`,
        },
  ].map((s) => ({ ...s, hora: ahora }));
}

function ResumenIA({ abierto, onCerrar, avisar, ...datos }) {
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);
  const [secciones, setSecciones] = useState([]);
  const datosRef = useRef(datos);
  datosRef.current = datos;

  useEffect(() => {
    if (!abierto) return;
    setCargando(true);
    const t = setTimeout(() => {
      setSecciones(construirResumen(datosRef.current));
      setCargando(false);
    }, 1100);
    return () => clearTimeout(t);
  }, [abierto, version]);

  const copiar = async () => {
    const texto = secciones.map((s) => `${s.titulo}: ${s.texto}`).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      avisar("Resumen copiado");
    } catch {
      avisar("No se pudo copiar: selecciona el texto a mano");
    }
  };

  return (
    <Hoja abierta={abierto} onCerrar={onCerrar} titulo="Resumen matutino IA" icono={Sparkles}>
      <p className="-mt-2 mb-4 text-sm text-slate-500 dark:text-slate-400">Generado a partir de tu calendario, tu correo y tus tareas · {fechaLarga(datos.ahora)}</p>
      {cargando ? (
        <div className="grid grid-cols-1 gap-3" aria-live="polite" aria-busy="true">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="size-4 motion-safe:animate-pulse" /> Preparando tu resumen…
          </p>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
              <div className="h-3 w-24 rounded bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
              <div className="mt-2 h-3 w-full rounded bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
              <div className="mt-1.5 h-3 w-2/3 rounded bg-slate-200 motion-safe:animate-pulse dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5" aria-live="polite">
          {secciones.map(({ titulo, icono: I, color, texto }, i) => (
            <div key={titulo} className="rounded-xl bg-slate-50 p-3.5 motion-safe:animate-sheet dark:bg-white/5" style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}>
              <p className={`flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase ${color}`}>
                <I className="size-4" /> {titulo}
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700 dark:text-slate-200">{texto}</p>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setVersion((v) => v + 1)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 ${foco}`}
            >
              <RefreshCw className="size-4" /> Regenerar
            </button>
            <button type="button" onClick={copiar} className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 ${foco}`}>
              <Copy className="size-4" /> Copiar
            </button>
          </div>
        </div>
      )}
    </Hoja>
  );
}

/* ───────────────────────── Otras pestañas ───────────────────────── */

function TituloVista({ titulo, subtitulo, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pt-2 pb-4">
      <div>
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}

const HORA_INICIO = 8;
const HORA_FIN = 21;
const PX_HORA = 56;

function VistaCalendario({ ahora, enEspacio }) {
  const hoyIdx = diaSemana(ahora);
  const [dia, setDia] = useState(hoyIdx);
  const lunes = new Date(ahora);
  lunes.setDate(ahora.getDate() - hoyIdx);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return d;
  });
  const eventosDe = (i) => (i === hoyIdx ? EVENTOS_HOY : (EVENTOS_SEMANA[i] ?? [])).filter(enEspacio);
  const eventos = eventosDe(dia);
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const lineaAhora = dia === hoyIdx && minAhora >= HORA_INICIO * 60 && minAhora <= HORA_FIN * 60 ? ((minAhora - HORA_INICIO * 60) / 60) * PX_HORA : null;

  return (
    <div>
      <TituloVista titulo="Calendario" subtitulo={capital(new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(ahora))} />
      <Tarjeta className="p-2">
        <ul className="grid grid-cols-7 gap-1">
          {dias.map((d, i) => {
            const sel = i === dia;
            const n = eventosDe(i).length;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setDia(i)}
                  aria-pressed={sel}
                  className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-2 ${foco} ${
                    sel ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 dark:bg-indigo-500" : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`text-[11px] font-bold uppercase ${sel ? "text-indigo-100" : "text-slate-400"}`}>{new Intl.DateTimeFormat("es-ES", { weekday: "narrow" }).format(d)}</span>
                  <span className={`text-base font-extrabold tabular-nums ${!sel && i === hoyIdx ? "text-indigo-600 dark:text-indigo-400" : ""}`}>{d.getDate()}</span>
                  <span className={`h-1 w-1 rounded-full ${n ? (sel ? "bg-white" : "bg-indigo-400") : "bg-transparent"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </Tarjeta>

      <Tarjeta className="mt-4 p-4 sm:p-5">
        <CabeceraTarjeta titulo={dia === hoyIdx ? "Hoy" : capital(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(dias[dia]))}>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {eventos.length} {eventos.length === 1 ? "elemento" : "elementos"}
          </span>
        </CabeceraTarjeta>
        <div className="relative mt-4" style={{ height: (HORA_FIN - HORA_INICIO) * PX_HORA }}>
          {Array.from({ length: HORA_FIN - HORA_INICIO + 1 }, (_, i) => (
            <div key={i} className="absolute inset-x-0 flex items-start gap-3" style={{ top: i * PX_HORA }}>
              <span className="-mt-2 w-11 shrink-0 text-right text-[11px] font-semibold text-slate-400 tabular-nums">{String(HORA_INICIO + i).padStart(2, "0")}:00</span>
              <span className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
            </div>
          ))}
          {eventos.map((e) => {
            const c = COLOR[e.color];
            const top = ((aMin(e.inicio) - HORA_INICIO * 60) / 60) * PX_HORA;
            const alto = Math.max(((aMin(e.fin) - aMin(e.inicio)) / 60) * PX_HORA - 4, 28);
            return (
              <div key={e.id} className={`absolute right-0 left-14 flex gap-2.5 overflow-hidden rounded-xl p-2 pr-3 ${c.suave}`} style={{ top: top + 2, height: alto }}>
                <span className={`w-1 shrink-0 rounded-full ${c.barra}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{e.titulo}</p>
                  <p className={`truncate text-xs font-medium ${c.texto}`}>
                    {e.inicio}–{e.fin} · {e.lugar}
                  </p>
                </div>
              </div>
            );
          })}
          {lineaAhora !== null && (
            <div className="pointer-events-none absolute right-0 left-12 flex items-center" style={{ top: lineaAhora }} aria-label="Hora actual">
              <span className="-ml-1 size-2.5 rounded-full bg-rose-500" />
              <span className="h-0.5 flex-1 bg-rose-500" />
            </div>
          )}
        </div>
      </Tarjeta>
    </div>
  );
}

function VistaTareas({ tareas, alternarTarea, nuevaTarea, borrarTarea, avance }) {
  const [filtro, setFiltro] = useState("pendientes");
  const lista = tareas.filter((t) => (filtro === "todas" ? true : filtro === "hechas" ? t.hecha : !t.hecha));
  const hechas = tareas.filter((t) => t.hecha).length;
  return (
    <div>
      <TituloVista titulo="Tareas" subtitulo={`${hechas} de ${tareas.length} completadas · ${Math.round(avance * 100)} % del tiempo planificado`} />
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500" style={{ width: `${avance * 100}%` }} />
      </div>
      <Tarjeta className="mt-4 p-4 sm:p-5">
        <FormNuevaTarea onAnadir={nuevaTarea} autoFocus={false} />
        <div className="mt-4 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="tablist" aria-label="Filtrar tareas">
          {[
            ["pendientes", "Pendientes"],
            ["hechas", "Hechas"],
            ["todas", "Todas"],
          ].map(([id, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filtro === id}
              onClick={() => setFiltro(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${foco} ${filtro === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
          {lista.map((t) => (
            <FilaTarea key={t.id} tarea={t} alternar={alternarTarea} onBorrar={borrarTarea} />
          ))}
          {lista.length === 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{filtro === "pendientes" ? "¡Todo hecho por hoy! 🎉" : "No hay tareas aquí."}</p>}
        </div>
      </Tarjeta>
    </div>
  );
}

function VistaCorreo({ correos, abrirCorreo, marcarTodo }) {
  const [soloSinLeer, setSoloSinLeer] = useState(false);
  const lista = soloSinLeer ? correos.filter((c) => !c.leido) : correos;
  const sinLeer = correos.filter((c) => !c.leido).length;
  return (
    <div>
      <TituloVista titulo="Correo" subtitulo={sinLeer ? `${sinLeer} sin leer` : "Bandeja al día"}>
        <button
          type="button"
          onClick={marcarTodo}
          disabled={!sinLeer}
          className={`rounded-full bg-white px-3 py-2 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-slate-900/5 disabled:opacity-40 dark:bg-slate-900 dark:text-indigo-400 dark:ring-white/10 ${foco}`}
        >
          Marcar todo como leído
        </button>
      </TituloVista>
      <Tarjeta className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 pb-2">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Solo sin leer</span>
          <Interruptor activo={soloSinLeer} onClick={() => setSoloSinLeer((s) => !s)} etiqueta="Mostrar solo sin leer" />
        </div>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {lista.map((c) => (
            <li key={c.id}>
              <FilaCorreo correo={c} onClick={() => abrirCorreo(c)} />
            </li>
          ))}
        </ul>
        {lista.length === 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No tienes correos sin leer. ✨</p>}
      </Tarjeta>
    </div>
  );
}

function VistaAjustes({ nombre, setNombre, oscuro, alternarTema, avisos, setAvisos, horaResumen, setHoraResumen, apps, alternarApp, restablecer }) {
  const fila = "flex items-center justify-between gap-3 py-3.5";
  return (
    <div>
      <TituloVista titulo="Ajustes" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta className="p-4 sm:p-5">
          <CabeceraTarjeta titulo="Perfil y preferencias" />
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            <div className={fila}>
              <label htmlFor="ajuste-nombre" className="text-sm font-semibold">
                Tu nombre
              </label>
              <input
                id="ajuste-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-40 rounded-lg bg-slate-50 px-3 py-2 text-right text-sm font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:ring-white/10"
              />
            </div>
            <div className={fila}>
              <span className="text-sm font-semibold">Modo oscuro</span>
              <Interruptor activo={oscuro} onClick={alternarTema} etiqueta="Modo oscuro" />
            </div>
            <div className={fila}>
              <span className="text-sm font-semibold">Notificaciones</span>
              <Interruptor activo={avisos} onClick={() => setAvisos((a) => !a)} etiqueta="Notificaciones" />
            </div>
            <div className={fila}>
              <label htmlFor="ajuste-hora" className="text-sm font-semibold">
                Hora del resumen matutino
              </label>
              <select
                id="ajuste-hora"
                value={horaResumen}
                onChange={(e) => setHoraResumen(e.target.value)}
                className="rounded-lg bg-slate-50 px-2 py-2 text-sm font-semibold ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-950 dark:ring-white/10"
              >
                {["06:30", "07:00", "07:30", "08:00", "08:30"].map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </Tarjeta>
        <Tarjeta className="p-4 sm:p-5">
          <CabeceraTarjeta titulo="Herramientas conectadas" />
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {apps.map(({ id, nombre: n, icono: I, fondo, conectada, sync }) => (
              <li key={id} className={fila}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${fondo}`}>
                    <I className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{n}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{conectada ? `Sincronizado ${sync}` : "Desconectado"}</span>
                  </span>
                </span>
                <Interruptor activo={conectada} onClick={() => alternarApp(id)} etiqueta={`Conectar ${n}`} />
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
      <button
        type="button"
        onClick={restablecer}
        className={`mt-4 w-full rounded-xl bg-white py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-slate-900/5 hover:text-rose-600 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10 ${foco}`}
      >
        Restablecer datos de ejemplo
      </button>
      <p className="mt-3 text-center text-xs text-slate-400">Los datos son de ejemplo: al recargar la página vuelven a su estado inicial.</p>
    </div>
  );
}
