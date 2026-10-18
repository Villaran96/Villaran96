// Segundo Cerebro: contratos, pólizas, impuestos y notas en un solo sitio, con un chat que responde
// citando el documento y la página (búsqueda simulada sobre los datos de ejemplo). Un solo archivo.
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
  Moon,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";

/* ───────────────────────── Fechas ───────────────────────── */

const HOY = (() => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
})();
const fecha = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const diasHasta = (d) => Math.round((d - HOY) / 86_400_000);
const larga = (d) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(d);
const corta = (d) => new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(d).replace(".", "");
const lista = (xs) => new Intl.ListFormat("es", { type: "conjunction" }).format(xs);

// La póliza del auto se renueva cada 14 de marzo: la próxima fecha a partir de hoy.
const VENCE_AUTO = (() => {
  const y = HOY >= new Date(HOY.getFullYear(), 2, 14) ? HOY.getFullYear() + 1 : HOY.getFullYear();
  return new Date(y, 2, 14);
})();
const INICIO_AUTO = new Date(VENCE_AUTO.getFullYear() - 1, 2, 14);
const AVISO_AUTO = new Date(VENCE_AUTO.getFullYear(), 1, 14);

/* ───────────────────────── Datos de ejemplo ───────────────────────── */

const CATEGORIAS = [
  { id: "contratos", nombre: "Contratos", unidad: "docs", icono: FileText, color: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300", anillo: "ring-blue-400" },
  { id: "seguros", nombre: "Seguros", unidad: "docs", icono: ShieldCheck, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300", anillo: "ring-emerald-400" },
  { id: "impuestos", nombre: "Impuestos", unidad: "docs", icono: Landmark, color: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300", anillo: "ring-orange-400" },
  { id: "notas", nombre: "Notas e ideas", unidad: "notas", icono: Lightbulb, color: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300", anillo: "ring-violet-400" },
];
const CAT = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

// fin: fecha de vencimiento (o null si no vence); estado: texto cuando no hay fecha de fin.
const DOCUMENTOS_INICIALES = [
  // Contratos (12)
  {
    id: "renta",
    cat: "contratos",
    nombre: "Contrato de arrendamiento · Depto. Roma Norte.pdf",
    subido: "2026-07-28",
    inicio: "2026-08-01",
    fin: "2027-07-31",
    paginas: 14,
    tamano: "3.1 MB",
    resumen: "Arrendamiento de vivienda en Orizaba 54, depto. 302, Roma Norte, CDMX. Arrendadora: Mariana Ortega Ruiz.",
    datos: [
      ["Renta mensual", "$12,000 MXN, se paga del 1 al 5 de cada mes"],
      ["Depósito en garantía", "$12,000 MXN (un mes)"],
      ["Aumento anual", "Según la inflación (INPC), al renovar"],
      ["Mascotas", "Permitidas, una mascota pequeña"],
      ["Salida anticipada", "Avisar con 60 días; penalización de un mes de renta"],
      ["Mantenimiento", "Incluido en la renta"],
    ],
    pagina: {
      n: 3,
      lineas: ["CLÁUSULA TERCERA. RENTA.", "El ARRENDATARIO pagará una renta mensual de $12,000.00 (doce mil pesos 00/100 M.N.)", "dentro de los primeros cinco días naturales de cada mes."],
      destacado: "Vigencia: del 1 de agosto de 2026 al 31 de julio de 2027.",
    },
    claves: ["renta", "arrendamiento", "depa", "departamento", "casa", "alquiler", "roma", "deposito", "mascotas"],
  },
  {
    id: "laboral",
    cat: "contratos",
    nombre: "Contrato laboral · Grupo Altavista.pdf",
    subido: "2024-01-15",
    inicio: "2024-01-15",
    fin: null,
    estado: "Indefinido",
    paginas: 9,
    tamano: "1.2 MB",
    resumen: "Contrato por tiempo indefinido como diseñador sénior. Incluye seguro de vida y vales de despensa.",
    datos: [
      ["Puesto", "Diseñador sénior"],
      ["Jornada", "Lunes a viernes, híbrido (2 días en oficina)"],
      ["Vacaciones", "18 días al año"],
      ["Prestaciones", "Seguro de vida, vales de despensa, aguinaldo de 30 días"],
    ],
    claves: ["trabajo", "laboral", "empleo", "sueldo", "vacaciones", "altavista"],
  },
  {
    id: "nube",
    cat: "contratos",
    nombre: "Contrato de servicios · Nube Creativa.pdf",
    subido: "2026-02-26",
    inicio: "2026-03-01",
    fin: "2027-02-28",
    paginas: 6,
    tamano: "820 KB",
    resumen: "Prestación de servicios de diseño y contenido para redes sociales. Pago mensual contra factura.",
    datos: [
      ["Honorarios", "$18,000 MXN al mes más IVA"],
      ["Entregables", "12 piezas y 4 reels al mes"],
      ["Renovación", "Automática salvo aviso 30 días antes"],
    ],
    claves: ["servicios", "cliente", "freelance", "nube", "honorarios", "redes"],
  },
  {
    id: "nda",
    cat: "contratos",
    nombre: "Acuerdo de confidencialidad · Studio Lumen.pdf",
    subido: "2026-06-10",
    inicio: "2026-06-10",
    fin: "2028-06-10",
    paginas: 4,
    tamano: "410 KB",
    resumen: "NDA bilateral para el proyecto de identidad de marca de Studio Lumen.",
    datos: [
      ["Duración", "2 años"],
      ["Penalización", "$250,000 MXN por incumplimiento"],
    ],
    claves: ["nda", "confidencialidad", "lumen"],
  },
  {
    id: "telmex",
    cat: "contratos",
    nombre: "Contrato de internet · Telmex.pdf",
    subido: "2025-06-01",
    inicio: "2025-06-01",
    fin: "2026-11-30",
    paginas: 5,
    tamano: "690 KB",
    resumen: "Internet de fibra de 200 Mbps con plazo forzoso de 18 meses.",
    datos: [
      ["Mensualidad", "$589 MXN"],
      ["Velocidad", "200 Mbps"],
      ["Cancelación anticipada", "Penalización de $1,200 MXN"],
    ],
    claves: ["internet", "telmex", "wifi", "fibra"],
  },
  {
    id: "telcel",
    cat: "contratos",
    nombre: "Contrato de telefonía · Telcel.pdf",
    subido: "2025-07-15",
    inicio: "2025-07-15",
    fin: "2027-01-15",
    paginas: 7,
    tamano: "760 KB",
    resumen: "Plan Telcel Libre 5000 a 18 meses con equipo incluido.",
    datos: [
      ["Mensualidad", "$499 MXN"],
      ["Datos", "20 GB y redes sociales ilimitadas"],
    ],
    claves: ["telefono", "celular", "movil", "telcel", "plan"],
  },
  {
    id: "gym",
    cat: "contratos",
    nombre: "Contrato de gimnasio · Smart Fit.pdf",
    subido: "2026-01-02",
    inicio: "2026-01-02",
    fin: "2026-12-31",
    paginas: 3,
    tamano: "380 KB",
    resumen: "Membresía Black anual con acceso a todas las sedes.",
    datos: [
      ["Mensualidad", "$599 MXN"],
      ["Permanencia", "12 meses"],
    ],
    claves: ["gimnasio", "gym", "smart fit", "membresia"],
  },
  {
    id: "mazda",
    cat: "contratos",
    nombre: "Contrato de compraventa · Mazda 3 2022.pdf",
    subido: "2025-05-05",
    inicio: "2025-05-05",
    fin: null,
    estado: "Cumplido",
    paginas: 5,
    tamano: "1.6 MB",
    resumen: "Compra del Mazda 3 sedán 2022 a particular. Factura endosada y tarjeta de circulación a tu nombre.",
    datos: [
      ["Precio", "$315,000 MXN"],
      ["Placas", "MXA-482-C"],
    ],
    claves: ["auto", "coche", "carro", "mazda", "compraventa", "vehiculo"],
  },
  {
    id: "credito",
    cat: "contratos",
    nombre: "Contrato de crédito personal · BBVA.pdf",
    subido: "2025-09-15",
    inicio: "2025-09-15",
    fin: "2027-09-15",
    paginas: 11,
    tamano: "1.9 MB",
    resumen: "Crédito personal de $70,000 MXN a 24 meses.",
    datos: [
      ["Pago mensual", "$3,450 MXN"],
      ["Tasa", "21.9 % anual fija"],
      ["Pago anticipado", "Sin penalización"],
    ],
    claves: ["credito", "prestamo", "bbva", "deuda", "banco"],
  },
  {
    id: "origen",
    cat: "contratos",
    nombre: "Contrato freelance · Revista Origen.pdf",
    subido: "2025-01-28",
    inicio: "2025-02-01",
    fin: "2026-01-31",
    paginas: 4,
    tamano: "520 KB",
    resumen: "Ilustraciones mensuales para la sección de cultura de Revista Origen.",
    datos: [["Honorarios", "$6,500 MXN por ilustración"]],
    claves: ["freelance", "revista", "origen", "ilustracion"],
  },
  {
    id: "mantenimiento",
    cat: "contratos",
    nombre: "Contrato de mantenimiento · Edificio Orizaba 54.pdf",
    subido: "2026-08-01",
    inicio: "2026-01-01",
    fin: "2026-12-31",
    paginas: 3,
    tamano: "300 KB",
    resumen: "Reglamento y cuota de mantenimiento del edificio, incluida en la renta.",
    datos: [["Cuota", "$1,500 MXN al mes (la paga la arrendadora)"]],
    claves: ["mantenimiento", "edificio", "condominio"],
  },
  {
    id: "narvarte",
    cat: "contratos",
    nombre: "Contrato de arrendamiento anterior · Narvarte.pdf",
    subido: "2024-08-01",
    inicio: "2024-08-01",
    fin: "2026-07-31",
    paginas: 12,
    tamano: "2.7 MB",
    resumen: "Arrendamiento anterior en la colonia Narvarte. Depósito devuelto en agosto de 2026.",
    datos: [
      ["Renta", "$10,500 MXN al mes"],
      ["Depósito", "Devuelto el 12 de agosto de 2026"],
    ],
    claves: ["narvarte", "arrendamiento anterior"],
  },
  // Seguros (5)
  {
    id: "gnp",
    cat: "seguros",
    nombre: "Póliza Seguro GNP.pdf",
    subido: iso(INICIO_AUTO),
    inicio: iso(INICIO_AUTO),
    fin: iso(VENCE_AUTO),
    paginas: 8,
    tamano: "2.4 MB",
    resumen: "Seguro de auto con cobertura amplia para el Mazda 3 2022.",
    datos: [
      ["Cobertura", "Amplia"],
      ["Vigencia", `${corta(INICIO_AUTO)} – ${corta(VENCE_AUTO)}`],
      ["Aseguradora", "GNP Seguros"],
      ["Número de póliza", "589274631"],
      ["Prima anual", "$14,850 MXN"],
      ["Deducible", "5 % daños materiales, 10 % robo total"],
    ],
    pagina: {
      n: 2,
      lineas: ["CARÁTULA DE PÓLIZA · AUTOMÓVILES RESIDENTES", "Asegurado: Diego Salinas · Vehículo: Mazda 3 Sedán i Sport 2022", "Póliza: 589274631 · Paquete: Cobertura amplia"],
      destacado: `Vigencia: del ${INICIO_AUTO.toLocaleDateString("es-MX")} a las 12:00 h al ${VENCE_AUTO.toLocaleDateString("es-MX")} a las 12:00 h.`,
    },
    claves: ["seguro de auto", "auto", "coche", "carro", "gnp", "poliza", "mazda", "vehiculo"],
  },
  {
    id: "gmm",
    cat: "seguros",
    nombre: "Seguro de gastos médicos mayores · AXA.pdf",
    subido: "2026-06-01",
    inicio: "2026-06-01",
    fin: "2027-06-01",
    paginas: 22,
    tamano: "4.8 MB",
    resumen: "Póliza individual de gastos médicos mayores.",
    datos: [
      ["Suma asegurada", "$15,000,000 MXN"],
      ["Deducible", "$25,000 MXN"],
      ["Coaseguro", "10 % con tope de $45,000 MXN"],
    ],
    claves: ["gastos medicos", "medico", "salud", "axa", "hospital"],
  },
  {
    id: "vida",
    cat: "seguros",
    nombre: "Seguro de vida · MetLife (prestación laboral).pdf",
    subido: "2024-02-01",
    inicio: "2024-02-01",
    fin: null,
    estado: "Mientras dure el empleo",
    paginas: 6,
    tamano: "900 KB",
    resumen: "Seguro de vida grupal incluido en tu contrato con Grupo Altavista.",
    datos: [
      ["Suma asegurada", "24 meses de sueldo"],
      ["Beneficiarios", "Ana Salinas (50 %), Carmen López (50 %)"],
    ],
    claves: ["vida", "metlife", "beneficiarios"],
  },
  {
    id: "hogar",
    cat: "seguros",
    nombre: "Seguro de hogar · Chubb.pdf",
    subido: "2025-11-20",
    inicio: "2025-11-20",
    fin: "2026-11-20",
    paginas: 10,
    tamano: "1.4 MB",
    resumen: "Seguro de contenidos y responsabilidad civil para el departamento.",
    datos: [
      ["Contenidos", "$450,000 MXN"],
      ["Responsabilidad civil", "$1,000,000 MXN"],
      ["Prima anual", "$3,280 MXN"],
    ],
    claves: ["hogar", "casa", "chubb", "contenidos"],
  },
  {
    id: "viaje",
    cat: "seguros",
    nombre: "Cotización seguro de viaje · Assist Card.pdf",
    subido: "2026-10-02",
    inicio: null,
    fin: null,
    estado: "Cotización",
    paginas: 2,
    tamano: "240 KB",
    resumen: "Cotización de asistencia en viaje para 10 días en Europa (requisito Schengen).",
    datos: [
      ["Cobertura médica", "€60,000"],
      ["Precio", "$1,980 MXN"],
    ],
    claves: ["viaje", "europa", "schengen", "assist card"],
  },
  // Impuestos (8)
  {
    id: "anual25",
    cat: "impuestos",
    nombre: "Declaración anual 2025 · SAT.pdf",
    subido: "2026-04-28",
    inicio: null,
    fin: null,
    estado: "Presentada",
    paginas: 6,
    tamano: "1.1 MB",
    resumen: "Declaración anual del ejercicio 2025, presentada el 28 de abril de 2026.",
    datos: [
      ["Ingresos acumulables", "$612,400 MXN"],
      ["Deducciones personales", "$42,600 MXN"],
      ["ISR a cargo (pagado)", "$18,450 MXN"],
    ],
    pagina: {
      n: 4,
      lineas: ["DETERMINACIÓN DEL IMPUESTO", "Ingresos acumulables: $612,400 · Deducciones personales: $42,600", "Retenciones y pagos provisionales acreditados."],
      destacado: "ISR a cargo: $18,450.00 · Pagado el 28/04/2026.",
    },
    claves: ["impuestos", "declaracion", "anual", "sat", "isr", "2025", "pague"],
  },
  {
    id: "acuse25",
    cat: "impuestos",
    nombre: "Acuse de declaración anual 2025.pdf",
    subido: "2026-04-28",
    inicio: null,
    fin: null,
    estado: "Presentada",
    paginas: 1,
    tamano: "180 KB",
    resumen: "Acuse de recibo del SAT con número de operación 260428117349.",
    datos: [["Número de operación", "260428117349"]],
    claves: ["acuse", "sat", "declaracion"],
  },
  {
    id: "anual24",
    cat: "impuestos",
    nombre: "Declaración anual 2024 · SAT.pdf",
    subido: "2025-04-22",
    inicio: null,
    fin: null,
    estado: "Presentada",
    paginas: 6,
    tamano: "1.0 MB",
    resumen: "Declaración anual 2024 con saldo a favor, devuelto en mayo de 2025.",
    datos: [["Saldo a favor", "$6,320 MXN (devuelto)"]],
    claves: ["declaracion", "2024", "saldo a favor", "devolucion"],
  },
  {
    id: "csf",
    cat: "impuestos",
    nombre: "Constancia de situación fiscal.pdf",
    subido: "2026-09-08",
    inicio: null,
    fin: null,
    estado: "Al día",
    paginas: 2,
    tamano: "160 KB",
    resumen: "Constancia del SAT con régimen de sueldos y salarios y actividad empresarial y profesional.",
    datos: [
      ["RFC", "SALD900101AB1"],
      ["Régimen", "Sueldos y salarios · Actividad profesional"],
    ],
    claves: ["constancia", "rfc", "situacion fiscal", "regimen"],
  },
  {
    id: "prov1",
    cat: "impuestos",
    nombre: "Pagos provisionales ISR · ene–jun 2026.pdf",
    subido: "2026-07-17",
    inicio: null,
    fin: null,
    estado: "Pagado",
    paginas: 6,
    tamano: "740 KB",
    resumen: "Pagos provisionales mensuales del ISR por actividad profesional, de enero a junio de 2026.",
    datos: [["Total pagado", "$21,300 MXN"]],
    claves: ["pagos provisionales", "isr", "mensual", "2026"],
  },
  {
    id: "prov2",
    cat: "impuestos",
    nombre: "Pagos provisionales ISR · jul–sep 2026.pdf",
    subido: "2026-10-16",
    inicio: null,
    fin: null,
    estado: "Pagado",
    paginas: 3,
    tamano: "420 KB",
    resumen: "Pagos provisionales de julio a septiembre de 2026.",
    datos: [["Total pagado", "$11,050 MXN"]],
    claves: ["pagos provisionales", "isr", "mensual", "2026"],
  },
  {
    id: "deducibles",
    cat: "impuestos",
    nombre: "Facturas deducibles 2025 (resumen).pdf",
    subido: "2026-03-30",
    inicio: null,
    fin: null,
    estado: "Archivado",
    paginas: 4,
    tamano: "610 KB",
    resumen: "Resumen de facturas deducibles: honorarios médicos, lentes y seguro de gastos médicos.",
    datos: [["Total deducible", "$42,600 MXN"]],
    claves: ["deducibles", "facturas", "deducciones"],
  },
  {
    id: "tenencia",
    cat: "impuestos",
    nombre: "Tenencia y refrendo 2026 · CDMX.pdf",
    subido: "2026-03-10",
    inicio: null,
    fin: null,
    estado: "Pagado",
    paginas: 1,
    tamano: "150 KB",
    resumen: "Pago de tenencia y refrendo vehicular 2026 del Mazda 3.",
    datos: [["Importe", "$3,872 MXN"]],
    claves: ["tenencia", "refrendo", "auto", "cdmx"],
  },
];

const NOTAS_INICIALES = [
  ["Ideas para el reel de octubre", "Antes y después del estudio, 3 trucos de iluminación y cierre invitando a la newsletter.", "Ideas", "2026-10-15"],
  ["Presupuesto viaje a Europa", "Vuelos $18,000 · hoteles $16,000 · comida y transporte $12,000 · extras $4,000. Total: $50,000.", "Viajes", "2026-10-12"],
  ["Itinerario Europa (borrador)", "Madrid 3 noches → Lisboa 3 → Oporto 2. Mirar trenes Lisboa–Oporto.", "Viajes", "2026-10-11"],
  ["Pendientes con el contador", "Enviar facturas de septiembre antes del día 10. Preguntar por deducción de colegiaturas.", "Trabajo", "2026-10-09"],
  ["Regalo para Ana", "Le encantó la cerámica de Tlaquepaque. Buscar taller en Coyoacán.", "Personal", "2026-10-08"],
  ["Preguntas para la llamada con cliente", "¿Plazos de la fase 2? ¿Quién aprueba los diseños? ¿Presupuesto para fotos?", "Trabajo", "2026-10-07"],
  ["Idea de negocio: tarjetas NFC", "Tarjetas NFC de reseñas para restaurantes. Packs de 25, 50 y 100 con diseño incluido.", "Ideas", "2026-10-05"],
  ["Libros pendientes", "El infinito en un junco · Pedro Páramo (releer) · Hábitos atómicos.", "Aprendizaje", "2026-10-03"],
  ["Medidas del depa", "Sala 4.20 × 3.60 m. Ventana 1.80 m. Hueco del librero 2.10 m.", "Personal", "2026-09-30"],
  ["Notas reunión rediseño web", "Menú más corto, casos de éxito arriba y formulario de contacto en 3 pasos.", "Trabajo", "2026-09-28"],
  ["Receta: tinga de pollo", "Jitomate, cebolla, chipotle y pollo deshebrado. 20 min a fuego bajo.", "Recetas", "2026-09-27"],
  ["Restaurantes por probar", "Lardo (repetir), Máximo, Masala y Maíz, Rosetta.", "Personal", "2026-09-25"],
  ["Rutina de mañana", "Agua, 10 min de estiramientos, planificar las 3 tareas del día antes de abrir el correo.", "Personal", "2026-09-22"],
  ["Frases para la newsletter", "«Diseñar es decidir qué quitar». «Lo simple se recuerda».", "Ideas", "2026-09-20"],
  ["Aprendizajes del tercer trimestre", "Cobrar el 50 % por adelantado. Limitar a 2 rondas de cambios.", "Trabajo", "2026-09-18"],
  ["Guion podcast · episodio 12", "Tema: cómo ponerle precio a tu trabajo creativo. Invitada: Laura Martín.", "Ideas", "2026-09-16"],
  ["Pendientes del coche", "Verificación hecha. Servicio de los 45,000 km en noviembre.", "Personal", "2026-09-14"],
  ["Objetivos 2027", "Viaje a Europa, fondo de emergencia completo y lanzar el podcast.", "Personal", "2026-09-12"],
  ["Lecturas sobre IA", "Artículos sobre agentes y diseño de producto con IA. Guardar los mejores en Notion.", "Aprendizaje", "2026-09-10"],
  ["Proveedores de fotografía", "Estudio Nómada (producto) · Paula R. (retrato) · renta de luces en Doctores.", "Trabajo", "2026-09-08"],
  ["Plantilla de propuesta", "Contexto, objetivos, entregables, calendario, inversión y condiciones.", "Trabajo", "2026-09-05"],
  ["Fiesta de Laura", "Sábado 7. Llevar mezcal y algo dulce.", "Personal", "2026-09-03"],
  ["Ejercicios de movilidad", "Cadera 90/90, gato-camello, rotaciones torácicas. 3 × 10.", "Personal", "2026-09-01"],
  ["Receta: chilaquiles verdes", "Salsa de tomate verde con serrano, totopos, crema, queso fresco y huevo.", "Recetas", "2026-08-29"],
  ["Hábitos que quiero mantener", "Leer 20 min al día, entrenar 5 días, revisar finanzas los domingos.", "Personal", "2026-08-26"],
  ["Feedback del taller de marca", "Gustó el ejercicio de arquetipos. Faltó tiempo para la parte práctica.", "Trabajo", "2026-08-22"],
  ["Películas recomendadas", "Perfect Days · Roma (volver a ver) · Aftersun.", "Personal", "2026-08-19"],
  ["Checklist de la mudanza", "Cambiar domicilio en el banco y el SAT. Contratar internet. Recoger depósito.", "Personal", "2026-08-02"],
  ["Contenido: finanzas personales", "Serie de 5 reels: presupuesto, fondo de emergencia, metas, deudas e inversión.", "Ideas", "2026-07-30"],
  ["Curso de fotografía · notas", "Regla de tercios, triángulo de exposición y luz de ventana para producto.", "Aprendizaje", "2026-07-25"],
  ["Plantas del balcón", "Regar el potus cada 7 días. La lavanda necesita más sol.", "Personal", "2026-07-20"],
  ["Ideas para el estudio en casa", "Fondo de papel gris, una ventana como luz principal y rebotador blanco.", "Ideas", "2026-07-16"],
  ["Contraseña del wifi para visitas", "Está en la nota del refri. No guardarla aquí.", "Personal", "2026-07-10"],
  ["Mapa mental del podcast", "Temas: precios, clientes, herramientas y salud mental del freelance.", "Ideas", "2026-07-05"],
].map(([titulo, texto, etiqueta, fecha], i) => ({ id: `n${i + 1}`, titulo, texto, etiqueta, fecha }));

const RECORDATORIOS_INICIALES = [
  { id: "r-hogar", titulo: "Renovar el seguro de hogar (Chubb)", fecha: "2026-11-13", doc: "hogar", activo: true },
  { id: "r-sat", titulo: "Pago provisional de octubre (SAT)", fecha: "2026-11-17", doc: "prov2", activo: true },
  { id: "r-telmex", titulo: "Fin del plazo forzoso de Telmex", fecha: "2026-11-23", doc: "telmex", activo: true },
  { id: "r-gym", titulo: "Decidir si renuevo el gimnasio", fecha: "2026-12-15", doc: "gym", activo: false },
];

const SUGERENCIAS = ["¿Qué contratos tengo vigentes?", "¿Cuánto pagué de impuestos?", "Resumen de mi contrato actual"];

const VISTAS = [
  { id: "chat", nombre: "Chat" },
  { id: "documentos", nombre: "Documentos" },
  { id: "notas", nombre: "Notas" },
  { id: "recordatorios", nombre: "Recordatorios" },
];

/* ───────────────────────── Utilidades ───────────────────────── */

const normalizar = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function estadoDoc(doc) {
  if (!doc.fin) return { texto: doc.estado ?? "Archivado", tono: "gris" };
  const d = diasHasta(fecha(doc.fin));
  if (d < 0) return { texto: "Vencido", tono: "rojo" };
  if (d <= 60) return { texto: `Vence en ${d} días`, tono: "ambar" };
  return { texto: "Vigente", tono: "verde" };
}

const TONOS = {
  verde: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ambar: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  rojo: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  gris: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
};

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

/* ───────────────────────── Respuestas del chat (RAG simulado) ───────────────────────── */

function respuestaSeguroAuto(recordatorioActivo) {
  return {
    texto: `Tu seguro de auto vence el **${larga(VENCE_AUTO)}**. Este dato está en el documento «Póliza Seguro GNP.pdf» (página 2).`,
    fuentes: [{ doc: "gnp", pagina: 2 }],
    vinetas: [`**Cobertura:** amplia`, `**Vigencia:** ${corta(INICIO_AUTO)} – ${corta(VENCE_AUTO)}`, `**Aseguradora:** GNP Seguros`, `**Número de póliza:** 589274631`],
    sugerencia: recordatorioActivo
      ? null
      : { texto: "¿Te gustaría que te avise 1 mes antes de la renovación?", recordatorio: { id: "r-gnp", titulo: "Renovación del seguro de auto (GNP)", fecha: iso(AVISO_AUTO), doc: "gnp" } },
  };
}

function responder(pregunta, { documentos, notas, recordatorios }) {
  const q = normalizar(pregunta);
  const doc = (id) => documentos.find((d) => d.id === id);
  const yaAvisa = (id) => recordatorios.some((r) => r.id === id && r.activo);

  if (/(seguro|poliza).*(auto|coche|carro)|(auto|coche|carro).*(seguro|poliza)|gnp/.test(q)) return respuestaSeguroAuto(yaAvisa("r-gnp"));

  if (/vigente|activos|que contratos/.test(q)) {
    const vigentes = documentos.filter((d) => d.cat === "contratos" && (d.fin ? diasHasta(fecha(d.fin)) >= 0 : d.estado === "Indefinido"));
    const pronto = vigentes.filter((d) => d.fin && diasHasta(fecha(d.fin)) <= 90).sort((a, b) => fecha(a.fin) - fecha(b.fin));
    return {
      texto:
        `Tienes **${vigentes.length} contratos vigentes**. ${pronto.length ? `Ojo con ${pronto.length === 1 ? "uno que vence" : `${pronto.length} que vencen`} en los próximos 3 meses.` : ""}`.trim(),
      vinetas: vigentes.map(
        (d) =>
          `**${d.nombre.replace(/\.pdf$/, "").replace(/^Contrato (de |)/, "")}**: ${d.fin ? `hasta el ${corta(fecha(d.fin))}${diasHasta(fecha(d.fin)) <= 90 ? " ⚠️" : ""}` : d.estado.toLowerCase()}`,
      ),
      fuentes: pronto.slice(0, 2).map((d) => ({ doc: d.id })),
      sugerencia:
        pronto[0] && !recordatorios.some((r) => r.doc === pronto[0].id)
          ? {
              texto: `¿Te aviso una semana antes de que termine «${pronto[0].nombre.replace(/\.pdf$/, "")}»?`,
              recordatorio: {
                id: `r-${pronto[0].id}`,
                titulo: `Vence ${pronto[0].nombre.replace(/\.pdf$/, "")}`,
                fecha: iso(new Date(fecha(pronto[0].fin).getTime() - 7 * 86_400_000)),
                doc: pronto[0].id,
              },
            }
          : null,
    };
  }

  if (/impuesto|sat\b|isr|declaracion|pague|tenencia/.test(q)) {
    return {
      texto:
        "En tu **declaración anual 2025** (presentada el 28 de abril de 2026) pagaste **$18,450 MXN** de ISR. En 2026 llevas **$32,350 MXN** en pagos provisionales y **$3,872 MXN** de tenencia y refrendo.",
      vinetas: [
        "**Pagos provisionales ene–jun 2026:** $21,300",
        "**Pagos provisionales jul–sep 2026:** $11,050",
        "**Declaración 2024:** saldo a favor de $6,320 (ya devuelto)",
        "**Deducciones personales 2025:** $42,600",
      ],
      fuentes: [{ doc: "anual25", pagina: 4 }, { doc: "prov2" }],
      sugerencia: yaAvisa("r-sat")
        ? null
        : { texto: "¿Quieres que te recuerde el próximo pago provisional?", recordatorio: { id: "r-sat", titulo: "Pago provisional de octubre (SAT)", fecha: "2026-11-17", doc: "prov2" } },
    };
  }

  if (/contrato actual|mi contrato|arrendamiento|renta|depa|alquiler/.test(q)) {
    const d = doc("renta");
    return {
      texto: `Tu contrato actual es el **arrendamiento del depto. en Roma Norte**, vigente del ${corta(fecha(d.inicio))} al **${corta(fecha(d.fin))}** (te quedan ${diasHasta(fecha(d.fin))} días).`,
      vinetas: d.datos.map(([k, v]) => `**${k}:** ${v}`),
      fuentes: [{ doc: "renta", pagina: 3 }],
      sugerencia: recordatorios.some((r) => r.doc === "renta")
        ? null
        : {
            texto: "¿Te aviso 60 días antes del fin para negociar la renovación?",
            recordatorio: { id: "r-renta", titulo: "Negociar la renovación del depa", fecha: iso(new Date(fecha(d.fin).getTime() - 60 * 86_400_000)), doc: "renta" },
          },
    };
  }

  if (/vence|vencimiento|caduca|renovar|proxim/.test(q)) {
    const proximos = documentos
      .filter((d) => d.fin && diasHasta(fecha(d.fin)) >= 0)
      .sort((a, b) => fecha(a.fin) - fecha(b.fin))
      .slice(0, 5);
    return {
      texto: "Estos son tus próximos vencimientos:",
      vinetas: proximos.map((d) => `**${corta(fecha(d.fin))}** · ${d.nombre.replace(/\.pdf$/, "")} (en ${diasHasta(fecha(d.fin))} días)`),
      fuentes: proximos.slice(0, 2).map((d) => ({ doc: d.id })),
    };
  }

  if (/^resumen\s+de\s+«(.+)»$/.test(pregunta.trim())) {
    const nombre = pregunta.trim().match(/«(.+)»/)[1];
    const d = documentos.find((x) => x.nombre === nombre);
    if (d) {
      return {
        texto: `**${d.nombre}**: ${d.resumen}`,
        vinetas: (d.datos ?? []).map(([k, v]) => `**${k}:** ${v}`),
        fuentes: [{ doc: d.id, pagina: d.pagina?.n }],
      };
    }
  }

  // Búsqueda por palabras: documentos y notas que comparten más términos con la pregunta.
  const terminos = q.split(/[^a-z0-9ñ]+/).filter((t) => t.length > 3 && !["cual", "cuales", "tengo", "donde", "sobre", "tiene", "para", "como", "cuanto", "cuando", "esta", "este", "mis"].includes(t));
  const puntuar = (texto) => terminos.reduce((s, t) => s + (normalizar(texto).includes(t) ? 1 : 0), 0);
  const docs = documentos
    .map((d) => ({ d, p: puntuar([d.nombre, d.resumen, ...(d.claves ?? []), ...(d.datos ?? []).flat()].join(" ")) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);
  const ns = notas
    .map((n) => ({ n, p: puntuar(`${n.titulo} ${n.texto} ${n.etiqueta}`) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);

  if (!docs.length && !ns.length) {
    return { texto: "No encontré nada sobre eso en tus documentos ni en tus notas. Si tienes el archivo, súbelo con el clip 📎 y te respondo al momento." };
  }
  return {
    texto: "Encontré esto relacionado con tu pregunta:",
    vinetas: [...docs.slice(0, 3).map(({ d }) => `**${d.nombre.replace(/\.pdf$/, "")}**: ${d.resumen}`), ...ns.slice(0, 2).map(({ n }) => `**Nota «${n.titulo}»**: ${n.texto}`)],
    fuentes: docs.slice(0, 2).map(({ d }) => ({ doc: d.id })),
  };
}

/* ───────────────────────── Piezas de interfaz ───────────────────────── */

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";
const campo =
  "w-full rounded-xl bg-zinc-50 px-3.5 py-2.5 text-[15px] ring-1 ring-zinc-200 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-500 dark:bg-white/5 dark:ring-white/10";

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

function Interruptor({ activo, onClick, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${foco} ${activo ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${activo ? "translate-x-5" : ""}`} />
    </button>
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
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px] motion-safe:animate-fade" />
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white pt-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl gutter-lg sm:rounded-3xl sm:pb-6 dark:bg-[#1c1b24] dark:ring-1 dark:ring-white/10 motion-safe:animate-sheet ${ancha ? "sm:max-w-xl" : "sm:max-w-md"}`}
      >
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

function IconoPdf({ tam = "size-10" }) {
  return (
    <span className={`relative grid ${tam} shrink-0 place-items-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300`}>
      <FileText className="size-5" />
      <span className="absolute -bottom-1 rounded bg-red-600 px-1 text-[8px] leading-3 font-extrabold text-white">PDF</span>
    </span>
  );
}

function MiniDoc({ doc, pagina, onAbrir }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-zinc-200 dark:bg-white/5 dark:ring-white/10">
      <IconoPdf />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{doc.nombre}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {CAT[doc.cat].nombre} · {doc.tamano}
          {pagina ? ` · página ${pagina}` : ` · ${doc.paginas} págs.`}
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

/* ───────────────────────── App ───────────────────────── */

export default function SegundoCerebro() {
  const [oscuro, alternarTema] = useTema("segundo-cerebro:tema");
  const [pantalla, setPantalla] = useState("cerebro"); // "inicio" | "cerebro"
  const [vista, setVista] = useState("chat");
  const [filtroCat, setFiltroCat] = useState(null);
  const [documentos, setDocumentos] = useState(DOCUMENTOS_INICIALES);
  const [notas, setNotas] = useState(NOTAS_INICIALES);
  const [recordatorios, setRecordatorios] = useState(RECORDATORIOS_INICIALES);
  const [mensajes, setMensajes] = useState(() => [
    { id: 1, de: "yo", texto: "¿Cuándo vence mi seguro de auto?" },
    { id: 2, de: "ia", ...respuestaSeguroAuto(false) },
  ]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [hoja, setHoja] = useState(null); // {doc} | {nota} | "buscar" | {subir: File} | "recordatorio" | "nota-nueva"
  const [toast, setToast] = useState(null);
  const toastRef = useRef();
  const archivoRef = useRef();
  const estadoRef = useRef();
  estadoRef.current = { documentos, notas, recordatorios };

  const avisar = useCallback((texto) => {
    clearTimeout(toastRef.current);
    setToast(texto);
    toastRef.current = setTimeout(() => setToast(null), 2800);
  }, []);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const cuentas = {
    contratos: documentos.filter((d) => d.cat === "contratos").length,
    seguros: documentos.filter((d) => d.cat === "seguros").length,
    impuestos: documentos.filter((d) => d.cat === "impuestos").length,
    notas: notas.length,
  };

  const irA = (v) => {
    setPantalla("cerebro");
    setVista(v);
  };

  const preguntar = (pregunta) => {
    const p = pregunta.trim();
    if (!p || escribiendo) return;
    irA("chat");
    setMensajes((ms) => [...ms, { id: Date.now(), de: "yo", texto: p }]);
    setEscribiendo(true);
    setTimeout(
      () => {
        setMensajes((ms) => [...ms, { id: Date.now() + 1, de: "ia", ...responder(p, estadoRef.current) }]);
        setEscribiendo(false);
      },
      800 + Math.min(p.length * 10, 500),
    );
  };

  const activarRecordatorio = (r) => {
    setRecordatorios((rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? { ...x, activo: true } : x)) : [...rs, { ...r, activo: true }]));
    avisar(`Te avisaré el ${corta(fecha(r.fecha))}`);
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

  const subirArchivo = (archivo, cat) => {
    const kb = archivo.size / 1024;
    const tamano = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`;
    if (cat === "notas") {
      setNotas((ns) => [{ id: `n${Date.now()}`, titulo: archivo.name, texto: `Archivo adjunto (${tamano}).`, etiqueta: "Archivo", fecha: iso(HOY) }, ...ns]);
    } else {
      setDocumentos((ds) => [
        {
          id: `d${Date.now()}`,
          cat,
          nombre: archivo.name,
          subido: iso(HOY),
          inicio: null,
          fin: null,
          estado: "Nuevo",
          paginas: "—",
          tamano,
          resumen: "Subido hoy. Aún no hay datos extraídos de este archivo.",
          datos: [],
          claves: [],
        },
        ...ds,
      ]);
    }
    cerrarHoja();
    irA("chat");
    setMensajes((ms) => [
      ...ms,
      { id: Date.now(), de: "ia", texto: `📎 Guardé **${archivo.name}** en **${CAT[cat].nombre}**. Ya aparece en tus ${cat === "notas" ? "notas" : "documentos"} y puedes preguntarme por él.` },
    ]);
    avisar(`${archivo.name} subido`);
  };

  const tabInferior = pantalla === "inicio" ? "inicio" : vista === "documentos" ? "documentos" : vista === "recordatorios" ? "recordatorios" : "cerebro";
  const docAbierto = hoja?.doc ? documentos.find((d) => d.id === hoja.doc) : null;

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
          <button
            type="button"
            onClick={alternarTema}
            aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={`grid size-10 place-items-center rounded-full text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-white/10 ${foco}`}
          >
            {oscuro ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <span className="ml-1 grid size-10 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900" aria-label="Diego">
            D
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl gutter pb-[calc(96px+env(safe-area-inset-bottom,0px))]">
        {pantalla === "inicio" ? (
          <Inicio
            documentos={documentos}
            notas={notas}
            recordatorios={recordatorios}
            cuentas={cuentas}
            abrirDoc={(id) => setHoja({ doc: id })}
            irA={irA}
            preguntar={preguntar}
            elegirCategoria={elegirCategoria}
          />
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

            <div className="no-scrollbar -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
              {CATEGORIAS.map((c) => {
                const activa = (vista === "documentos" && filtroCat === c.id) || (vista === "notas" && c.id === "notas");
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => elegirCategoria(c.id)}
                    aria-pressed={activa}
                    className={`flex w-[138px] shrink-0 items-center gap-2.5 rounded-2xl bg-white p-3 text-left ring-1 transition hover:ring-zinc-300 sm:w-auto dark:bg-[#18171f] dark:hover:ring-white/20 ${foco} ${activa ? `ring-2 ${c.anillo}` : "ring-zinc-900/[0.06] dark:ring-white/10"}`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.color}`}>
                      <c.icono className="size-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{c.nombre}</span>
                      <span className="block text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                        {cuentas[c.id]} {c.unidad}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              {vista === "chat" && (
                <VistaChat
                  mensajes={mensajes}
                  escribiendo={escribiendo}
                  documentos={documentos}
                  recordatorios={recordatorios}
                  preguntar={preguntar}
                  abrirDoc={(id) => setHoja({ doc: id })}
                  activarRecordatorio={activarRecordatorio}
                  onClip={() => archivoRef.current?.click()}
                />
              )}
              {vista === "documentos" && (
                <VistaDocumentos documentos={documentos} filtroCat={filtroCat} setFiltroCat={setFiltroCat} abrirDoc={(id) => setHoja({ doc: id })} onSubir={() => archivoRef.current?.click()} />
              )}
              {vista === "notas" && <VistaNotas notas={notas} abrirNota={(id) => setHoja({ nota: id })} onNueva={() => setHoja("nota-nueva")} />}
              {vista === "recordatorios" && (
                <VistaRecordatorios
                  recordatorios={recordatorios}
                  documentos={documentos}
                  alternar={(id) => setRecordatorios((rs) => rs.map((r) => (r.id === id ? { ...r, activo: !r.activo } : r)))}
                  borrar={(id) => {
                    setRecordatorios((rs) => rs.filter((r) => r.id !== id));
                    avisar("Recordatorio eliminado");
                  }}
                  abrirDoc={(id) => setHoja({ doc: id })}
                  onNuevo={() => setHoja("recordatorio")}
                />
              )}
            </div>
          </>
        )}
      </main>

      <input
        ref={archivoRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.heic"
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
                  className={`flex w-full flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-semibold ${foco} ${activo ? "text-violet-700 dark:text-violet-300" : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
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
        <VisorDoc
          doc={docAbierto}
          onCerrar={cerrarHoja}
          preguntar={(p) => {
            cerrarHoja();
            preguntar(p);
          }}
        />
      )}

      {hoja?.nota && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Nota" icono={StickyNote}>
          {(() => {
            const n = notas.find((x) => x.id === hoja.nota);
            return (
              n && (
                <article>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{n.etiqueta}</span>
                  <h3 className="mt-3 text-xl font-bold">{n.titulo}</h3>
                  <p className="mt-2 font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">{n.texto}</p>
                  <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">Creada el {larga(fecha(n.fecha))}</p>
                </article>
              )
            );
          })()}
        </Hoja>
      )}

      <Hoja abierta={hoja === "buscar"} onCerrar={cerrarHoja} titulo="Buscar" icono={Search}>
        <Buscador
          documentos={documentos}
          notas={notas}
          abrirDoc={(id) => setHoja({ doc: id })}
          abrirNota={(id) => setHoja({ nota: id })}
          preguntar={(p) => {
            cerrarHoja();
            preguntar(p);
          }}
        />
      </Hoja>

      {hoja?.subir && (
        <Hoja abierta onCerrar={cerrarHoja} titulo="Subir documento" icono={Upload}>
          <FormSubir archivo={hoja.subir} onGuardar={subirArchivo} />
        </Hoja>
      )}

      <Hoja abierta={hoja === "recordatorio"} onCerrar={cerrarHoja} titulo="Nuevo recordatorio" icono={BellRing}>
        <FormRecordatorio
          documentos={documentos}
          onGuardar={(r) => {
            setRecordatorios((rs) => [...rs, { ...r, id: `r${Date.now()}`, activo: true }]);
            cerrarHoja();
            avisar(`Te avisaré el ${corta(fecha(r.fecha))}`);
          }}
        />
      </Hoja>

      <Hoja abierta={hoja === "nota-nueva"} onCerrar={cerrarHoja} titulo="Nueva nota" icono={StickyNote}>
        <FormNota
          etiquetas={[...new Set(notas.map((n) => n.etiqueta))]}
          onGuardar={(n) => {
            setNotas((ns) => [{ ...n, id: `n${Date.now()}`, fecha: iso(HOY) }, ...ns]);
            cerrarHoja();
            avisar("Nota guardada");
          }}
        />
      </Hoja>
    </div>
  );
}

/* ───────────────────────── Chat ───────────────────────── */

function MensajeIA({ m, documentos, recordatorios, abrirDoc, activarRecordatorio }) {
  const activado = m.sugerencia?.recordatorio && recordatorios.some((r) => r.id === m.sugerencia.recordatorio.id && r.activo);
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
              return d && <MiniDoc key={f.doc} doc={d} pagina={f.pagina} onAbrir={() => abrirDoc(d.id)} />;
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
        {m.sugerencia && (
          <div className="mt-4 rounded-xl bg-violet-50 p-3.5 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-500/20">
            <p className="text-sm font-medium text-violet-950 dark:text-violet-100">💡 {m.sugerencia.texto}</p>
            <button
              type="button"
              disabled={activado}
              onClick={() => activarRecordatorio(m.sugerencia.recordatorio)}
              className={`mt-2.5 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${foco} ${activado ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
            >
              {activado ? (
                <>
                  <Check className="size-4" /> Recordatorio activado · {corta(fecha(m.sugerencia.recordatorio.fecha))}
                </>
              ) : (
                <>🔔 Activar recordatorio</>
              )}
            </button>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

function VistaChat({ mensajes, escribiendo, documentos, recordatorios, preguntar, abrirDoc, activarRecordatorio, onClip }) {
  const [texto, setTexto] = useState("");
  const finRef = useRef();
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length, escribiendo]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4" aria-live="polite">
        {mensajes.map((m) =>
          m.de === "yo" ? (
            <p key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-[15px] font-medium text-white shadow-sm motion-safe:animate-pop">
              {m.texto}
            </p>
          ) : (
            <MensajeIA key={m.id} m={m} documentos={documentos} recordatorios={recordatorios} abrirDoc={abrirDoc} activarRecordatorio={activarRecordatorio} />
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

function FilaDoc({ doc, onClick }) {
  const e = estadoDoc(doc);
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 ${foco}`}>
      <IconoPdf />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{doc.nombre}</span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {CAT[doc.cat].nombre} · {doc.tamano} · subido el {corta(fecha(doc.subido))}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${TONOS[e.tono]}`}>{e.texto}</span>
    </button>
  );
}

function VistaDocumentos({ documentos, filtroCat, setFiltroCat, abrirDoc, onSubir }) {
  const [q, setQ] = useState("");
  const nq = normalizar(q.trim());
  const filtrados = documentos.filter((d) => (!filtroCat || d.cat === filtroCat) && (!nq || normalizar(`${d.nombre} ${d.resumen}`).includes(nq)));
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
            <FilaDoc doc={d} onClick={() => abrirDoc(d.id)} />
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && <p className="px-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No hay documentos con ese filtro.</p>}
    </Tarjeta>
  );
}

function VistaNotas({ notas, abrirNota, onNueva }) {
  const [etiqueta, setEtiqueta] = useState(null);
  const etiquetas = [...new Set(notas.map((n) => n.etiqueta))];
  const visibles = notas.filter((n) => !etiqueta || n.etiqueta === etiqueta);
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          {[null, ...etiquetas].map((t) => (
            <button
              key={t ?? "todas"}
              type="button"
              aria-pressed={etiqueta === t}
              onClick={() => setEtiqueta(t)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${foco} ${etiqueta === t ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-zinc-900 dark:ring-white" : "bg-white ring-zinc-200 dark:bg-transparent dark:ring-white/15"}`}
            >
              {t ?? `Todas (${notas.length})`}
            </button>
          ))}
        </div>
        <button type="button" onClick={onNueva} aria-label="Nueva nota" className={`grid size-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 ${foco}`}>
          <Plus className="size-5" />
        </button>
      </div>
      <ul className="mt-3 columns-1 gap-3 sm:columns-2">
        {visibles.map((n) => (
          <li key={n.id} className="mb-3 break-inside-avoid">
            <button
              type="button"
              onClick={() => abrirNota(n.id)}
              className={`w-full rounded-2xl bg-white p-4 text-left ring-1 ring-zinc-900/[0.06] hover:ring-violet-300 dark:bg-[#18171f] dark:ring-white/10 dark:hover:ring-violet-500/40 ${foco}`}
            >
              <span className="flex items-center justify-between gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{n.etiqueta}</span>
                {corta(fecha(n.fecha))}
              </span>
              <span className="mt-2 block font-bold">{n.titulo}</span>
              <span className="mt-1 block font-serif text-[15px] leading-snug text-zinc-600 dark:text-zinc-400">{n.texto}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VistaRecordatorios({ recordatorios, documentos, alternar, borrar, abrirDoc, onNuevo }) {
  const ordenados = [...recordatorios].sort((a, b) => fecha(a.fecha) - fecha(b.fecha));
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
          const d = diasHasta(fecha(r.fecha));
          const doc = documentos.find((x) => x.id === r.doc);
          return (
            <li key={r.id} className={`flex items-center gap-3 px-1 py-3 ${r.activo ? "" : "opacity-55"}`}>
              <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-zinc-50 py-1.5 text-center dark:bg-white/5">
                <span className="text-[10px] font-bold text-violet-600 uppercase dark:text-violet-400">
                  {new Intl.DateTimeFormat("es-MX", { month: "short" }).format(fecha(r.fecha)).replace(".", "")}
                </span>
                <span className="text-lg leading-none font-extrabold tabular-nums">{fecha(r.fecha).getDate()}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.titulo}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{d < 0 ? "Ya pasó" : d === 0 ? "Hoy" : `En ${d} días`}</p>
                {doc && (
                  <button
                    type="button"
                    onClick={() => abrirDoc(doc.id)}
                    className={`block max-w-full truncate text-left text-xs font-semibold text-violet-700 underline-offset-2 hover:underline dark:text-violet-300 ${foco}`}
                  >
                    {doc.nombre.replace(/\.pdf$/, "")}
                  </button>
                )}
              </div>
              <Interruptor activo={r.activo} onClick={() => alternar(r.id)} etiqueta={`Avisar: ${r.titulo}`} />
              <button
                type="button"
                onClick={() => borrar(r.id)}
                aria-label={`Eliminar «${r.titulo}»`}
                className={`grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 ${foco}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
      {ordenados.length === 0 && <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No tienes recordatorios.</p>}
    </Tarjeta>
  );
}

/* ───────────────────────── Inicio ───────────────────────── */

function Inicio({ documentos, notas, recordatorios, cuentas, abrirDoc, irA, preguntar, elegirCategoria }) {
  const proximos = documentos
    .filter((d) => d.fin && diasHasta(fecha(d.fin)) >= 0 && diasHasta(fecha(d.fin)) <= 180)
    .sort((a, b) => fecha(a.fin) - fecha(b.fin))
    .slice(0, 4);
  const recientes = [...documentos].sort((a, b) => fecha(b.subido) - fecha(a.subido)).slice(0, 4);
  const activos = recordatorios.filter((r) => r.activo && diasHasta(fecha(r.fecha)) >= 0).length;
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="pt-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Hola, Diego</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Tienes {documentos.length} documentos, {notas.length} notas y {activos} recordatorios activos.
        </p>
      </div>
      <button
        type="button"
        onClick={() => irA("chat")}
        className={`flex items-center gap-3 rounded-2xl bg-violet-600 p-4 text-left text-white shadow-lg shadow-violet-600/25 hover:bg-violet-700 ${foco}`}
      >
        <MessageSquare className="size-6 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Pregúntale a tu Segundo Cerebro</span>
          <span className="block text-sm text-violet-100">Fechas, importes y cláusulas al instante</span>
        </span>
        <ChevronRight className="size-5" />
      </button>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {CATEGORIAS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => elegirCategoria(c.id)}
            className={`flex items-center gap-2.5 rounded-2xl bg-white p-3 text-left ring-1 ring-zinc-900/[0.06] hover:ring-zinc-300 dark:bg-[#18171f] dark:ring-white/10 ${foco}`}
          >
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.color}`}>
              <c.icono className="size-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{c.nombre}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                {cuentas[c.id]} {c.unidad}
              </span>
            </span>
          </button>
        ))}
      </div>
      <Tarjeta className="p-4">
        <h3 className="flex items-center justify-between gap-2 text-sm font-bold">
          Próximos vencimientos
          <button type="button" onClick={() => preguntar("¿Qué vence próximamente?")} className={`text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300 ${foco}`}>
            Preguntar
          </button>
        </h3>
        <ul className="mt-2">
          {proximos.map((d) => (
            <li key={d.id}>
              <FilaDoc doc={d} onClick={() => abrirDoc(d.id)} />
            </li>
          ))}
        </ul>
      </Tarjeta>
      <Tarjeta className="p-4">
        <h3 className="text-sm font-bold">Añadidos recientemente</h3>
        <ul className="mt-2">
          {recientes.map((d) => (
            <li key={d.id}>
              <FilaDoc doc={d} onClick={() => abrirDoc(d.id)} />
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

/* ───────────────────────── Hojas ───────────────────────── */

function VisorDoc({ doc, onCerrar, preguntar }) {
  const e = estadoDoc(doc);
  return (
    <Hoja abierta onCerrar={onCerrar} titulo={doc.nombre} icono={FileText} ancha>
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className={`rounded-full px-2 py-0.5 font-bold ${TONOS[e.tono]}`}>{e.texto}</span>
        <span>
          {CAT[doc.cat].nombre} · {doc.paginas} págs. · {doc.tamano}
        </span>
      </div>
      {/* Página simulada del PDF con el dato resaltado */}
      <div className="mt-4 rounded-xl bg-zinc-100 p-3 sm:p-5 dark:bg-black/30">
        <div className="mx-auto max-w-md rounded-sm bg-white p-5 text-zinc-800 shadow-md">
          <p className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            {doc.nombre.replace(/\.pdf$/, "")} · página {doc.pagina?.n ?? 1}
          </p>
          {(doc.pagina?.lineas ?? [doc.resumen]).map((l, i) => (
            <p key={i} className={`mt-2 font-serif text-[13px] leading-snug ${i === 0 && doc.pagina ? "font-semibold" : ""}`}>
              {l}
            </p>
          ))}
          {doc.pagina?.destacado && <p className="mt-2 rounded bg-yellow-200/80 px-1 font-serif text-[13px] leading-snug">{doc.pagina.destacado}</p>}
          {[92, 100, 84, 96, 70].map((w, i) => (
            <span key={i} className="mt-2 block h-1.5 rounded-full bg-zinc-200" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{doc.resumen}</p>
      {doc.datos?.length > 0 && (
        <dl className="mt-3 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-200 dark:divide-white/5 dark:ring-white/10">
          {doc.datos.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-3 py-2 text-sm">
              <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{k}</dt>
              <dd className="min-w-0 text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        type="button"
        onClick={() => preguntar(`Resumen de «${doc.nombre}»`)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}
      >
        <Sparkles className="size-4" /> Preguntar sobre este documento
      </button>
    </Hoja>
  );
}

function Buscador({ documentos, notas, abrirDoc, abrirNota, preguntar }) {
  const [q, setQ] = useState("");
  const nq = normalizar(q.trim());
  const docs = nq ? documentos.filter((d) => normalizar(`${d.nombre} ${d.resumen} ${(d.claves ?? []).join(" ")}`).includes(nq)).slice(0, 6) : [];
  const ns = nq ? notas.filter((n) => normalizar(`${n.titulo} ${n.texto}`).includes(nq)).slice(0, 4) : [];
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
            <FilaDoc key={d.id} doc={d} onClick={() => abrirDoc(d.id)} />
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
          {!docs.length && !ns.length && <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">Sin coincidencias exactas.</p>}
          <button
            type="button"
            onClick={() => preguntar(q)}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-50 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-300 ${foco}`}
          >
            <Sparkles className="size-4" /> Preguntar «{q.trim()}» al chat
          </button>
        </div>
      )}
    </div>
  );
}

function sugerirCategoria(nombre) {
  const n = normalizar(nombre);
  if (/poliza|seguro|gnp|axa|aseguradora/.test(n)) return "seguros";
  if (/sat|isr|impuesto|declaracion|factura|cfdi|predial|tenencia/.test(n)) return "impuestos";
  if (/nota|idea|apunte|\.txt$|\.md$/.test(n)) return "notas";
  return "contratos";
}

function FormSubir({ archivo, onGuardar }) {
  const [cat, setCat] = useState(() => sugerirCategoria(archivo.name));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(archivo, cat);
      }}
    >
      <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-white/5">
        <IconoPdf />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{archivo.name}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{archivo.size > 1048576 ? `${(archivo.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(archivo.size / 1024))} KB`}</p>
        </div>
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold">¿En qué carpeta lo guardo?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={cat === c.id}
              onClick={() => setCat(c.id)}
              className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-sm font-semibold ring-1 ${foco} ${cat === c.id ? `ring-2 ${c.anillo} bg-white dark:bg-white/5` : "ring-zinc-200 dark:ring-white/10"}`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${c.color}`}>
                <c.icono className="size-4" />
              </span>
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">El archivo se queda en esta página: no se envía a ningún servidor. Al recargar, vuelven los datos de ejemplo.</p>
      <button type="submit" className={`mt-4 w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 ${foco}`}>
        Guardar en {CAT[cat].nombre}
      </button>
    </form>
  );
}

function FormRecordatorio({ documentos, onGuardar }) {
  const [titulo, setTitulo] = useState("");
  const [cuando, setCuando] = useState(() => iso(new Date(HOY.getTime() + 7 * 86_400_000)));
  const [doc, setDoc] = useState("");
  const valido = titulo.trim() && cuando;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ titulo: titulo.trim(), fecha: cuando, doc: doc || null });
      }}
      className="grid grid-cols-1 gap-3"
    >
      <div>
        <label htmlFor="rec-titulo" className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          ¿De qué te aviso?
        </label>
        <input id="rec-titulo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Renovar el pasaporte" className={campo} />
      </div>
      <div>
        <label htmlFor="rec-fecha" className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Fecha
        </label>
        <input id="rec-fecha" type="date" min={iso(HOY)} value={cuando} onChange={(e) => setCuando(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="rec-doc" className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
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
      <button type="submit" disabled={!valido} className={`mt-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}>
        Crear recordatorio
      </button>
    </form>
  );
}

function FormNota({ etiquetas, onGuardar }) {
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [etiqueta, setEtiqueta] = useState("Ideas");
  const valido = titulo.trim() && texto.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ titulo: titulo.trim(), texto: texto.trim(), etiqueta });
      }}
      className="grid grid-cols-1 gap-3"
    >
      <div>
        <label htmlFor="nota-titulo" className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Título
        </label>
        <input id="nota-titulo" autoFocus value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Idea para el próximo reel" className={campo} />
      </div>
      <div>
        <label htmlFor="nota-texto" className="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Nota
        </label>
        <textarea id="nota-texto" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} className={`${campo} resize-none font-serif text-base`} />
      </div>
      <div className="flex flex-wrap gap-2">
        {etiquetas.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={etiqueta === t}
            onClick={() => setEtiqueta(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${foco} ${etiqueta === t ? "bg-violet-600 text-white ring-violet-600" : "ring-zinc-200 dark:ring-white/15"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <button type="submit" disabled={!valido} className={`mt-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 ${foco}`}>
        Guardar nota
      </button>
    </form>
  );
}
