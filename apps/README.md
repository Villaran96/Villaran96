# Apps IA

Cuatro apps hechas con React, Tailwind CSS y `lucide-react`. Cada app es un solo componente en un solo archivo `.jsx`, con diseño mobile-first.

Cada app arranca solo con lo que viene en su prompt y no trae nada más. Todo lo que añades, marcas o borras se guarda, y los números (contadores, porcentajes y gráficas) salen de tus datos.

| App | Archivo | Qué puedes hacer |
|---|---|---|
| Mi Vida | `mi-vida/MiVida.jsx` | Añadir y marcar tareas, añadir y borrar eventos por día, añadir correos y marcarlos como leídos, y ver el resumen matutino generado con tus datos. Tiene modo oscuro. |
| Asesor Financiero | `asesor-financiero/AsesorFinanciero.jsx` | Registrar gastos, asignar un presupuesto a cada categoría, actualizar el saldo, aportar a metas y crear metas nuevas, añadir pagos y marcarlos como pagados, y preguntar al chat por tus datos. Tiene modo oscuro. |
| Entrenador IA | `entrenador-ia/EntrenadorIA.jsx` | Cambiar objetivos, marcar comidas y ejercicios del día, editar comidas, ejercicios y cargas, y registrar peso y grasa corporal. |
| Segundo Cerebro | `segundo-cerebro/SegundoCerebro.jsx` | Subir documentos a sus carpetas, añadirles vencimiento y datos clave, preguntar al chat por ellos, crear notas y recordatorios, y buscar. |

## Dónde se guardan tus datos

- **Publicadas en claude.ai:** en la parte privada de tu cuenta, así que ves lo mismo en el móvil y en el ordenador. Nadie más ve tus datos, aunque compartas el enlace: cada persona tiene los suyos. En Segundo Cerebro los archivos que subes (PDF, imágenes y texto) se guardan en la propia página.
- **En tu ordenador (con `npm run dev` o los archivos de `dist/`):** en el navegador.

Si un archivo de Segundo Cerebro no se puede subir a claude.ai (por ejemplo, un `.docx`), se guarda solo en el navegador donde lo subiste y la app lo indica.

## Cómo se calculan los números

| App | Dato | Cálculo |
|---|---|---|
| Mi Vida | Eventos hoy, correos sin leer, tareas listas | Se cuentan tus eventos de hoy, tus correos sin leer y tus tareas de hoy. Las tareas pendientes de días anteriores pasan a hoy. |
| Mi Vida | Productividad | Tareas hechas sobre tareas totales de la semana (de lunes a domingo). |
| Mi Vida | Avance del día | Tareas de hoy hechas sobre tareas de hoy. |
| Asesor Financiero | +12.4 % y ↑ 8 % | Comparan con el mes anterior. El primer mes, el saldo y el gasto del mes anterior se deducen de esos porcentajes del prompt. Después se guarda el cierre real de cada mes. |
| Asesor Financiero | Alerta de presupuesto | Sale cuando una categoría supera el presupuesto que le asignes. Al principio no hay presupuestos. |
| Asesor Financiero | En buen camino y meses que faltan | La meta empieza hoy con el ahorro del prompt y vence dentro de 4 meses. Vas en buen camino si llevas lo que tocaría a estas alturas para llegar a tiempo. |
| Entrenador IA | Calorías y macros | Suma de las comidas que marcas hoy. Los gramos de cada comida son opcionales: las del prompt no los traen, así que hay que añadirlos editando la comida. |
| Entrenador IA | Peso, grasa y gráfica | Registros de peso de las últimas 8 semanas. Arranca con 81 kg hace 7 semanas, 79 kg la semana pasada y 78.4 kg hoy, deducidos de −2.6 kg y −0.6 kg. |
| Entrenador IA | Fuerza media | Cambio medio de carga de los ejercicios con historial en las últimas 8 semanas. Al principio solo hay historial en press de banca (de 77.5 a 80 kg). |
| Entrenador IA | Día 4 de 5 | Avanza un día cada vez que completas todos los ejercicios y vuelve a 1 al pasar del número de días por semana. |
| Segundo Cerebro | Número de documentos y notas | Se cuentan los que tienes en cada carpeta. |

## Diferencias con los prompts

Algunas cifras de los prompts no cuadran con los elementos que traen. Como las apps no inventan datos, se ven distintas hasta que añades los tuyos:

- **Mi Vida:** 3 eventos, 3 correos sin leer, 0/3 tareas listas y 0 % de avance (el prompt dice 2, 5, 3/7, 85 % y 72 %). La hora de los 3 correos es la de la primera vez que abres la app, porque el prompt no la indica.
- **Asesor Financiero:** el desplegable «Este mes» muestra los meses de los que hay gastos.
- **Entrenador IA:** el anillo de calorías empieza en 0 porque ninguna comida está marcada. Si las marcas todas suman 2,250 kcal, no 2,450. Las barras de macros empiezan en 0 g. El entrenamiento dice «4 ejercicios», los que trae el prompt, y la fuerza media sale +3 %, no +12 %.
- **Segundo Cerebro:** Contratos 0, Seguros 1, Impuestos 0 y Notas 0 (el prompt dice 12, 5, 8 y 34). El seguro vence el 14 de marzo de 2026, como dice el prompt, pero esa fecha ya pasó: el chat dice «venció» y propone actualizar la fecha. Cuando la cambias, aparece el botón «🔔 Activar recordatorio».
- **Selector «Mi Vida» de la cabecera:** solo tiene la opción «Mi Vida», porque el prompt no dice qué más debe tener.

Las respuestas «IA» (el resumen matutino, el chat financiero y el chat de documentos) son simuladas, como piden los prompts: se construyen solo con tus datos.

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

Crea `dist-artifact/<app>.html`, la versión para publicar como artefacto en claude.ai: carga React desde cdnjs y deja que claude.ai ponga el `<html>`, `<head>` y `<body>`. Al publicarla hay que declarar las capacidades `db` y `user` (y `assets` en Segundo Cerebro) para que los datos se guarden en la cuenta.

Para generar solo una app, añade su nombre: `npm run build -- mi-vida`.

## Usar una app en otro proyecto

Cada `.jsx` exporta un componente por defecto y solo depende de `react` y `lucide-react`. Para llevártelo a otro proyecto con Tailwind CSS 4:

1. Copia el `.jsx`.
2. Copia `shared/base.css` e impórtalo junto a Tailwind (define la variante `dark:`, el margen lateral `gutter` y las animaciones).
3. Define `--page` y `--ink` en `:root` como en el `styles.css` de la app, y la fuente si quieres la misma.
