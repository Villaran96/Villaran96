# Apps IA

Cuatro apps de ejemplo hechas con React, Tailwind CSS y `lucide-react`. Cada app es un solo componente en un solo archivo `.jsx`, con diseño mobile-first, modo claro y oscuro, y datos de ejemplo que reaccionan a lo que haces.

| App | Archivo | Qué hace |
|---|---|---|
| Mi Vida | `mi-vida/MiVida.jsx` | Saludo y fecha, métricas rápidas, últimos correos, agenda de hoy, tareas con «+ Nueva tarea», herramientas conectadas, avance del día y resumen matutino IA en un modal. Pestañas: Inicio, Calendario, Tareas, Correo y Ajustes. |
| Asesor Financiero | `asesor-financiero/AsesorFinanciero.jsx` | Saldo con sparkline, gastos del mes con dona y desglose por categoría, alertas de presupuesto, meta «Viaje a Europa» con aportes, próximos pagos y formulario de gasto. Pestañas: Inicio, Transacciones, Metas y Chat IA. |
| Entrenador IA | `entrenador-ia/EntrenadorIA.jsx` | Banner de plan actualizado con configurador de objetivos, calorías y macros, comidas marcables, rutina Push con sobrecarga progresiva y gráfica de peso de 8 semanas. Pestañas: Hoy, Nutrición, Entrenamiento y Progreso. |
| Segundo Cerebro | `segundo-cerebro/SegundoCerebro.jsx` | Categorías de documentos, chat que responde citando documento y página, recordatorios, subida de archivos con el clip, buscador y notas. Pestañas: Inicio, Segundo Cerebro, Documentos y Recordatorios. |

## Verlas en tu ordenador

```console
cd apps
npm install
npm run dev
```

Abre la dirección que muestra la terminal (normalmente http://localhost:5173). La portada enlaza a las cuatro apps; también puedes ir directo a `/mi-vida/`, `/asesor-financiero/`, `/entrenador-ia/` o `/segundo-cerebro/`.

## Generar archivos para compartir

```console
npm run build
```

Crea `dist/<app>/index.html`: cada app en un único archivo HTML con todo dentro. Se abre con doble clic, sin servidor, y se puede subir tal cual a Netlify, Cloudflare Pages o GitHub Pages.

```console
npm run build:artifact
```

Crea `dist-artifact/<app>.html`, la versión para publicar como artefacto en claude.ai: carga React desde cdnjs y deja que claude.ai ponga el `<html>`, `<head>` y `<body>`.

Para generar solo una app, añade su nombre: `npm run build -- mi-vida`.

## Usar una app en otro proyecto

Cada `.jsx` exporta un componente por defecto y solo depende de `react` y `lucide-react`. Para llevártelo a otro proyecto con Tailwind CSS 4:

1. Copia el `.jsx`.
2. Copia `shared/base.css` e impórtalo junto a Tailwind (define la variante `dark:`, el margen lateral `gutter` y las animaciones).
3. Define `--page` y `--ink` en `:root` como en el `styles.css` de la app, y la fuente si quieres la misma.

## Cómo funcionan

- **Datos de ejemplo.** Todo vive en el estado de React: al recargar la página vuelve al estado inicial. No se envía nada a ningún servidor; los archivos que subes en Segundo Cerebro solo se listan.
- **IA simulada.** El resumen matutino, el chat financiero y el chat de documentos responden con reglas a partir de los datos de la propia app, así que las cifras cuadran con lo que ves (por ejemplo, si registras un gasto, el chat lo tiene en cuenta).
- **Modo oscuro.** Sigue al sistema y el botón de luna o sol lo cambia. La elección se recuerda en el navegador.
- **Fechas.** Las fechas de vencimiento, pagos y semanas se calculan desde hoy.

## Decisiones respecto a los prompts originales

- **Mi Vida.** El saludo cambia con la hora («Buenos días», «Buenas tardes» o «Buenas noches»). «2 eventos hoy» cuenta las reuniones; «Editar contenido» a las 16:00 es un bloque de foco. El avance del día es el tiempo de tareas hecho sobre el planificado, que da el 72 % de partida, y la productividad del 85 % es semanal.
- **Asesor Financiero.** La categoría Vivienda tiene un presupuesto de $24,000 porque incluye la renta de $12,000 que vence en 16 días. Pagar la tarjeta BBVA no cuenta como gasto nuevo (los gastos ya están en las categorías).
- **Entrenador IA.** El subtítulo dice 6 ejercicios, así que a los 4 del prompt se suman extensión de tríceps y aperturas en polea. Las grasas salen al 87 % (65 de 75 g redondeado) en vez del 86 %. Hay una cuarta comida (batido de proteína, 200 kcal) para que las comidas sumen las 2,450 kcal del anillo.
- **Segundo Cerebro.** El prompt dice que el seguro vence el 14 de marzo de 2026, pero esa fecha ya ha pasado: la app usa el próximo 14 de marzo para que el recordatorio de un mes antes tenga sentido.
