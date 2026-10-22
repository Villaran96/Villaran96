# Apps IA

Cuatro apps hechas con React, Tailwind CSS y `lucide-react`. Cada app es un solo componente en un solo archivo `.jsx`, con diseño mobile-first.

Cada app arranca solo con lo que viene en su prompt y no trae nada más (Asesor Financiero arranca vacía y se llena con tus extractos). Todo lo que añades, marcas o borras se guarda, y los números (contadores, porcentajes y gráficas) salen de tus datos.

| App | Archivo | Qué puedes hacer |
|---|---|---|
| Mi Vida | `mi-vida/MiVida.jsx` | Añadir y marcar tareas, añadir y borrar eventos por día, añadir correos y marcarlos como leídos, y ver el resumen matutino generado con tus datos. Tiene modo oscuro. |
| Asesor Financiero | `asesor-financiero/AsesorFinanciero.jsx` y `asesor-financiero/finanzas.js` | Importar los movimientos de Revolut y Ruralvía, ver gastos, ingresos y ahorro de cada mes, poner presupuestos y metas, seguir el beneficio del matched betting y preguntar al chat por tus cuentas. Tiene modo oscuro. Más detalles en [Asesor Financiero](#asesor-financiero-revolut-y-ruralvía). |
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
| Asesor Financiero | Saldo de cada cuenta | Último saldo del extracto (o el que ajustes a mano) más o menos los movimientos de después. |
| Asesor Financiero | Ingresos y gastos del mes | Suma de los movimientos de las categorías de ingreso y de gasto. Los traspasos entre tus cuentas y el matched betting no cuentan como gasto ni como ingreso. |
| Asesor Financiero | Ahorro del mes | Ingresos − gastos + resultado del matched betting del mes. |
| Asesor Financiero | Beneficio del matched betting | Retirado de las casas − depositado − herramientas + saldo que tienes ahora en las casas − saldo que tenías al empezar. |
| Asesor Financiero | Gastos fijos | Gastos del mismo comercio que se repiten en meses distintos con un importe parecido. |
| Entrenador IA | Calorías y macros | Suma de las comidas que marcas hoy. Los gramos de cada comida son opcionales: las del prompt no los traen, así que hay que añadirlos editando la comida. |
| Entrenador IA | Peso, grasa y gráfica | Registros de peso de las últimas 8 semanas. Arranca con 81 kg hace 7 semanas, 79 kg la semana pasada y 78.4 kg hoy, deducidos de −2.6 kg y −0.6 kg. |
| Entrenador IA | Fuerza media | Cambio medio de carga de los ejercicios con historial en las últimas 8 semanas. Al principio solo hay historial en press de banca (de 77.5 a 80 kg). |
| Entrenador IA | Día 4 de 5 | Avanza un día cada vez que completas todos los ejercicios y vuelve a 1 al pasar del número de días por semana. |
| Segundo Cerebro | Número de documentos y notas | Se cuentan los que tienes en cada carpeta. |

## Diferencias con los prompts

Algunas cifras de los prompts no cuadran con los elementos que traen. Como las apps no inventan datos, se ven distintas hasta que añades los tuyos:

- **Mi Vida:** 3 eventos, 3 correos sin leer, 0/3 tareas listas y 0 % de avance (el prompt dice 2, 5, 3/7, 85 % y 72 %). La hora de los 3 correos es la de la primera vez que abres la app, porque el prompt no la indica.
- **Entrenador IA:** el anillo de calorías empieza en 0 porque ninguna comida está marcada. Si las marcas todas suman 2,250 kcal, no 2,450. Las barras de macros empiezan en 0 g. El entrenamiento dice «4 ejercicios», los que trae el prompt, y la fuerza media sale +3 %, no +12 %.
- **Segundo Cerebro:** Contratos 0, Seguros 1, Impuestos 0 y Notas 0 (el prompt dice 12, 5, 8 y 34). El seguro vence el 14 de marzo de 2026, como dice el prompt, pero esa fecha ya pasó: el chat dice «venció» y propone actualizar la fecha. Cuando la cambias, aparece el botón «🔔 Activar recordatorio».
- **Selector «Mi Vida» de la cabecera:** solo tiene la opción «Mi Vida», porque el prompt no dice qué más debe tener.

Las respuestas «IA» del resumen matutino y del chat de documentos son simuladas, como piden los prompts: se construyen solo con tus datos. El chat de Asesor Financiero usa la IA de Claude cuando la app está publicada en claude.ai, y respuestas sencillas con tus datos cuando no.

## Asesor Financiero: Revolut y Ruralvía

Ni Revolut ni Ruralvía tienen una conexión que la app pueda usar, así que los movimientos se suben desde los extractos del banco. Puedes subir periodos que se solapen: lo que ya estaba no se repite, aunque venga en otro formato.

### Qué puedes subir

| Formato | De dónde sale |
|---|---|
| CSV o Excel de Revolut | App de Revolut → cuenta en euros → Extracto → Excel o CSV. Los movimientos pendientes, los de otras divisas y los de las huchas no se importan. Las comisiones salen como un gasto aparte. |
| Excel o CSV de Ruralvía (o de otro banco) | ruralvia.com → cuenta → movimientos → descargar o exportar. La app busca sola las columnas de fecha, concepto, importe (o cargo y abono) y saldo; si no las encuentra, te pregunta cuál es cada una. |
| Norma 43 (`.n43`, `.aeb`, `.q43`, `.txt`) | El formato estándar de los bancos españoles. Ruralvía lo ofrece al exportar movimientos. |
| Texto pegado | Copia la lista de movimientos de la web o de la app y pégala. |
| Capturas de pantalla | Si solo tienes la app del móvil, haz capturas de la lista y la IA las lee. Revisas los movimientos antes de importarlos. Solo funciona en claude.ai. |

Los PDF no se pueden leer: descarga el extracto en Excel, CSV o Norma 43, o haz capturas.

### Cómo clasifica los movimientos

1. Tus reglas: cuando cambias la categoría de un movimiento, puedes decir «usar siempre esta categoría para los que contengan…». La regla se aplica a lo que ya tienes y a lo que importes después.
2. Casas de apuestas: los depósitos y retiradas de las casas que tienes en la pestaña MB van a matched betting. Puedes añadir casas y sus palabras clave.
3. Traspasos entre tus cuentas: las recargas de Revolut, los cargos de Revolut en Ruralvía y los movimientos opuestos del mismo importe entre tus dos cuentas en 3 días se marcan como traspaso y no cuentan como gasto ni como ingreso.
4. Palabras habituales (Mercadona, Glovo, Bizum, recibos, cajeros…).
5. Lo que quede sin categoría sale avisado, y puedes clasificarlo a mano o con la IA.

### Ponerla en la pantalla de inicio del móvil

- **iPhone (Safari):** abre el enlace de la app, pulsa Compartir y luego «Añadir a pantalla de inicio».
- **Android (Chrome):** abre el enlace, pulsa el menú ⋮ y luego «Añadir a pantalla de inicio».

Los datos se guardan en tu cuenta de claude.ai, así que ves lo mismo en el móvil y en el ordenador. Desde Ajustes puedes exportar los movimientos a CSV, hacer una copia de seguridad y restaurarla.

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

Crea `dist-artifact/<app>.html`, la versión para publicar como artefacto en claude.ai: carga React desde cdnjs y deja que claude.ai ponga el `<html>`, `<head>` y `<body>`. Al publicarla hay que declarar las capacidades `db` y `user` (y `assets` en Segundo Cerebro) para que los datos se guarden en la cuenta. Asesor Financiero usa además `sample` con imágenes (la IA) y `downloads` (exportar).

Para generar solo una app, añade su nombre: `npm run build -- mi-vida`.

## Usar una app en otro proyecto

Cada `.jsx` exporta un componente por defecto y solo depende de `react` y `lucide-react`. Para llevártelo a otro proyecto con Tailwind CSS 4:

1. Copia el `.jsx` (y `finanzas.js` en Asesor Financiero).
2. Copia `shared/base.css` e impórtalo junto a Tailwind (define la variante `dark:`, el margen lateral `gutter` y las animaciones).
3. Define `--page` y `--ink` en `:root` como en el `styles.css` de la app, y la fuente si quieres la misma.
