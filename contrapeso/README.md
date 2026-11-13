# Contrapeso

Plataforma de matched betting por suscripción, en español:
- Oddsmatcher con cuotas reales, enlaces directos al partido y modos calificante, freebet y reembolso.
- Calculadoras de favor-contra, combinadas y rollover.
- Guía paso a paso, con un capítulo para cada una de las 5 casas: **Bet365, Winamax, DAZN Bet, Sportium y Retabet**.
- Bonos guiados casa por casa.
- Registro de beneficios.
- Tres planes de pago, con pago mensual o anual: Bienvenida, Recurrentes y Método. El Método tiene plazas limitadas y se contrata con un contrato firmado online.

Funciona de dos formas:
- **Con el servidor** (`node server/server.mjs`): cuentas, pagos con Stripe, contenido de pago protegido, contrato firmado y cuotas centralizadas. Es la forma de venderla.
- **Sin servidor** (cualquier hosting estático o la vista previa de claude.ai): calculadoras, guía, bonos y beneficios funcionan en el navegador. Un selector deja ver la web como la vería cada plan.

> **Los partidos del oddsmatcher solo son reales con una fuente de cuotas conectada.** Sin ella la web no inventa partidos: lo dice y explica qué falta. Hay una simulación opcional para ver cómo funciona; va marcada como «Simulado», sin enlaces, porque esos partidos no existen. Mira [Ver partidos reales](#ver-partidos-reales).

## Qué hace

| Sección | Qué hace |
|---|---|
| Portada | Para visitantes: presentación, cómo funciona, planes y preguntas frecuentes. Para clientes: primeros pasos, **tus 5 casas** (hecha, en curso o por hacer, lo que vale cada bono y botones a su guía), siguiente paso de cada bono, beneficios y las mejores cuotas del momento. |
| Oddsmatcher | Todos los partidos de cada casa (fútbol, tenis y baloncesto) para los próximos 7 días. Mercados 1X2, ganador, más/menos 1,5, 2,5 y 3,5 goles y ambos marcan. Tres modos: **calificante**, **freebet** (SNR) y **reembolso** (por ejemplo Winamax: rating con el valor del reembolso si pierdes). Filtros rápidos y detallados (cuotas, rating, liquidez, fechas, deportes, mercados, casas, exchanges y ligas, con buscador de ligas). Cada fila tiene **enlace directo a la casa y a Betfair**. Al pulsar el partido se despliega el cálculo explicado. En **«Comprobar cuota real»** escribes la cuota que ves en la casa y en Betfair y se recalcula todo. Si tu fuente de cuotas no trae alguna de tus casas, te lo dice. |
| Calculadoras | **Favor-contra** (calificante, SNR, SR, reembolso, underlay/overlay y sensibilidad a la cuota en contra). **Combinadas** cubiertas selección a selección (freebets de DAZN Bet en combinadas). **Rollover** (por si Sportium ofrece su versión con rollover). Cada una dice para qué casa la usas y explica cómo calcula. |
| Bonos | Tres pestañas. **Bienvenida**: las 5 casas ordenadas por valor, con condiciones, fecha de revisión y enlace a «Cómo se hace». **Recurrentes**: calendario semanal de promociones. **Mis bonos**: tus bonos paso a paso. Cada paso tiene un botón que abre la casa, el oddsmatcher filtrado (casa, cuota mínima, importe y modo) o la calculadora ya rellena. Una barra arriba recuerda el bono en curso. |
| Beneficios | Registro, gráficos, desglose por casa, tipo y año, exportación CSV y copias de seguridad. Con cuenta, se guarda en el servidor y se ve en cualquier dispositivo. |
| Guía | Capítulo **Aprende**: 11 lecciones con ejemplos calculados en directo, tests y botones que abren la herramienta. La lección 4 explica a fondo las freebets SNR y SR. Capítulo **Tus 5 casas**: una lección por casa con lo que vale, la tabla de condiciones, cómo se hace, qué evitar y los pasos con botones. Al pulsar un botón, el bono se apunta en Mis bonos. |
| Método | Página de venta con plazas restantes y el proceso: solicitud → contrato → pago (mensual o anual) → acceso. El contrato se rellena con los datos del cliente y valida DNI/NIE. Se firma en pantalla y guarda como prueba la huella SHA-256 del texto, la fecha, la IP y el navegador, con copia por correo. Las lecciones (10 por defecto, sobre Hacienda, organización y cuentas) incluyen una calculadora de impuestos y una hoja de control fiscal. |
| Planes | Selector **mensual / anual** con lo que se ahorra y el equivalente al mes. Prueba gratis de 7 días. Con una suscripción en marcha, subir, bajar o pasar a anual cambia **la misma suscripción** con prorrateo, tras confirmar: nunca se paga dos veces. |
| Cuenta | Registro (mayoría de edad y condiciones), acceso y recuperación de contraseña por correo. Plan y forma de pago, con fecha de renovación o de fin de la prueba. **Cancelar** (con confirmación; el acceso sigue hasta el final del periodo) y **reactivar**. Portal de Stripe para tarjeta y facturas. Cambio de contraseña y borrado de cuenta. |
| Administración | Lista de puesta en marcha. Guías de bienvenida (título, condiciones, «cómo se hace», fecha de revisión y todos los números), recurrentes y lecciones del Método. Planes con precio mensual y anual. **Pagos**: «Conectar con Stripe», códigos de descuento, suscripciones por plan e ingresos al mes. También datos de la empresa, usuarios, solicitudes y contratos. |
| Legal | Aviso legal, privacidad, cookies, condiciones de contratación (con pago anual, cambios de plan y cancelación) y juego responsable, rellenados con los datos de la empresa. |

## Tus 5 casas

Las guías vienen con las condiciones publicadas en noviembre de 2026. Las casas cambian sus ofertas a menudo: revísalas y edítalas en Administración → Bienvenida (cada guía guarda la fecha de revisión que ve el cliente).

| Casa | Bono | Cómo se saca | Valor estimado |
|---|---|---|---|
| Bet365 | Hasta 200 € en créditos de apuesta | Calificante a 1,50 o más, cubierta. Créditos SNR cubiertos. | 123 € (109–132) |
| Winamax | Reembolso del 150 % de lo perdido (hasta 100 € apostados → 150 €) | Una apuesta de 100 € cubierta contando con el reembolso (oddsmatcher en modo reembolso). | 62 € (54–67) |
| DAZN Bet | 100 % de la primera apuesta en freebets, hasta 200 €, y 10 € extra | Calificante cubierta. La mitad de las freebets va en combinadas: se cubren selección a selección. | 124 € (110–133) |
| Sportium | Hasta 200 € en apuestas gratis con los dos primeros depósitos | Dos calificantes de 100 € y dos apuestas gratis de 100 €, a cuota 5,00 como máximo. Algunas webs describen otra versión con rollover x8. | 123 € (109–132) |
| Retabet | 100 % del primer depósito en freebets, hasta 200 € (en freebets de 25 €) | Calificante a 2,00 o más cubierta. Freebets SNR cubiertas una a una. | 116 € (103–125) |

Los valores son **estimaciones prudentes**: cuentan con cuotas moderadas (freebets a cuota 3,25, calificantes al 95 %) para no necesitar mucho saldo en Betfair. Están calibrados con la tabla pública de ganancias de bienvenida de NinjaBet (Bet365 110–130 €, DAZN Bet 110–130 €, Sportium 120–140 €, Retabet 100–120 €, Winamax 50–70 €). Cada usuario cambia los supuestos en Ajustes, y cada guía enseña de dónde sale su cifra.

## Planes y qué desbloquean

| | Gratis | Bienvenida | Recurrentes | Método |
|---|---|---|---|---|
| Calculadoras, guía, seguimiento | ✓ | ✓ | ✓ | ✓ |
| Oddsmatcher | 5 mejores | completo | completo | completo |
| Cómo se hace el bono de cada casa y avisos de cuotas | — | ✓ | ✓ | ✓ |
| Promociones recurrentes | — | — | ✓ | ✓ |
| Lecciones y hoja fiscal del Método | — | — | — | ✓ (con contrato firmado) |

Precios por defecto (se cambian en Administración → Planes):

| Plan | Mensual | Anual |
|---|---|---|
| Bienvenida | 14,99 € | 149 € |
| Recurrentes | 24,99 € | 249 € |
| Método (20 plazas) | 79 € | 790 € |

**El servidor aplica los bloqueos**: el plan gratuito solo recibe los partidos de las 5 mejores cuotas y el contenido de pago no sale del servidor sin el plan.

## Ponerla en marcha

Necesitas Node 18 o superior. No hay dependencias que instalar.

```bash
cd contrapeso
```

```bash
ADMIN_EMAILS=tu@correo.es node server/server.mjs
```

Abre `http://localhost:8080`, crea una cuenta con ese correo y tendrás el panel de Administración. Para la web publicada, define `SITE_URL=https://tudominio.es` (con https las cookies van marcadas como seguras).

### Variables de entorno

| Variable | Para qué |
|---|---|
| `ADMIN_EMAILS` | Correos de administración, separados por comas. |
| `SITE_URL` | Dirección pública, por ejemplo `https://tudominio.es`. |
| `PORT` | Puerto (por defecto 8080). |
| `DATA_DIR` | Carpeta de la base de datos (por defecto `data/`). **Haz copias de `data/db.json`.** |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe. Con ella, el panel crea solo productos, precios y webhook. |
| `STRIPE_WEBHOOK_SECRET` | Opcional: secreto de un webhook que hayas creado tú. Si no lo pones, se crea desde el panel. |
| `STRIPE_PRICE_BIENVENIDA`, `STRIPE_PRICE_RECURRENTES`, `STRIPE_PRICE_METODO` y los mismos con `_ANUAL` | Opcional: precios (`price_…`) que ya tengas en Stripe. Si no, los crea el panel. |
| `STRIPE_METODO_MODE` | `payment` si el Método se cobra en un pago único (por defecto, suscripción). |
| `RESEND_API_KEY`, `MAIL_FROM` | Correo con Resend: bienvenida, plan activo, cambio de plan, cancelación, reactivación, fin de la prueba, cobro fallido, contraseña y contrato. Sin clave, los correos salen en la consola del servidor. |
| `ODDSAPIIO_KEY` | Clave de odds-api.io: cuotas de **Bet365, Winamax y Retabet** de España y, si quieres, Betfair Exchange. |
| `ODDSAPIIO_BOOKMAKERS` | Casas con su nombre exacto en odds-api.io. Por defecto `Bet365 ES,Winamax ES,Retabet ES,Betfair ES,Betfair Exchange` (5, las que permite el plan Starter). |
| `ODDSAPIIO_SPORTS`, `ODDSAPIIO_HOURS`, `ODDSAPIIO_MAX_EVENTS` | Deportes (`football,tennis,basketball`), horas por delante (168 = 7 días) y tope de partidos (2500). Por defecto se traen **todos los partidos con cuota en cada casa**. |
| `ODDSAPIIO_LEAGUES` | Opcional: limita el fútbol a unas ligas (por ejemplo `spain-laliga,england-premier-league`). Vacío = todas. |
| `NEXT_PUBLIC_ODDS_API_KEY` (o `ODDS_API_KEY`) | Clave de The Odds API. Puede ir en el archivo `.env`. Solo la usa el servidor. |
| `SPORTS`, `MARKETS`, `ODDS_API_BOOKMAKERS` | Ligas (`soccer_spain_la_liga`), mercados (`h2h`; los «en contra» se añaden solos) y casas (`bet365,winamax_fr,betfair_ex_eu`; `regions` para pedir por región). |
| `REGIONS`, `REFRESH_MINUTES` | Región si no se piden casas (`eu`) y tiempo mínimo entre descargas (10 min); el servidor espera más si hace falta para no agotar los créditos del mes. |
| `BETFAIR_APP_KEY`, `BETFAIR_USERNAME`, `BETFAIR_PASSWORD` | Cuotas en contra reales de **Betfair.es** con su liquidez y enlace directo al mercado. |
| `BETFAIR_COMPETITIONS`, `BETFAIR_HOURS` | `all` (por defecto) trae **todas las competiciones**; o una lista de nombres en inglés para limitarlas. Horas por delante: 168. |

### Stripe

1. Crea la cuenta en Stripe y pon la clave secreta en `STRIPE_SECRET_KEY` y la dirección pública con https en `SITE_URL`.
2. Entra en Administración → Pagos y pulsa **Conectar con Stripe**. Crea un producto por plan, sus precios mensual y anual con IVA incluido y el webhook con todos los eventos que usa la web. Si después cambias un precio en Planes, se crea el precio nuevo y quien ya paga sigue con el anterior.
3. Activa el portal de cliente en Stripe (Ajustes → Billing → Customer portal) para que los clientes cambien la tarjeta y descarguen facturas.
4. Si quieres, crea códigos de descuento en Administración → Pagos (por ejemplo LANZAMIENTO al 30 % durante 3 meses). Se escriben en la página de pago.

La web usa la versión `2024-06-20` de la API de Stripe, fijada en cada llamada.

### The Odds API (conectada)

La web ya descarga cuotas reales de **La Liga** con The Odds API.

1. Copia `.env.example` como `.env` y pon tu clave en `NEXT_PUBLIC_ODDS_API_KEY`. El archivo `.env` no se sube al repositorio.
2. Arranca el servidor: `node server/server.mjs`. Lee la clave del `.env` y la usa **solo en el servidor**: el navegador recibe las cuotas ya descargadas, nunca la clave (aunque el nombre lleve `NEXT_PUBLIC_`).
3. El oddsmatcher enseña los partidos en dos vistas: **Oddsmatcher** (cada selección con su cuota a favor, la cuota en contra de Betfair y el rating) y **Por partido (1X2)** (el 1, X y 2 de cada casa en columnas).

Qué se pide y por qué:

| Parámetro | Valor | Motivo |
|---|---|---|
| `oddsFormat` | `decimal` | `eu` no existe: la API responde 422 «Invalid odds format» |
| `bookmakers` | `bet365,winamax_fr,betfair_ex_eu` | Winamax solo está como `winamax_fr` y `winamax_de`. Bet365 no está para La Liga (comprobado el 13/11/2026); se pide igual por si la añaden |
| `markets` | `h2h,h2h_lay` | Sin `h2h_lay` no llega la cuota **en contra** de Betfair y no se puede cubrir nada |

Créditos: cada descarga gasta 2 (1X2 a favor y en contra). El plan gratuito trae 500 al mes, así que el servidor **reparte los que quedan hasta fin de mes** (con 497 créditos, una descarga cada hora y media o dos horas, nunca menos de `REFRESH_MINUTES`). Si la clave no vale (401), se acaban los créditos o la API frena las peticiones (429), la web enseña un mensaje claro en vez de romperse y conserva las últimas cuotas buenas, con su hora.

Lo que The Odds API **no** puede dar para tus 5 casas: Bet365, DAZN Bet, Sportium, Retabet ni Winamax España (solo Winamax Francia, cuyas cuotas son parecidas pero no iguales). Para tus casas españolas, odds-api.io y la API de Betfair.es (más abajo).

Si el servidor está detrás de un proxy, Node necesita `NODE_USE_ENV_PROXY=1` (Node 22.21 o superior) para salir a internet con `fetch`.

### Ver partidos reales

Lo que hace falta para que el oddsmatcher enseñe partidos de verdad, con sus enlaces:

| Para | Hace falta | Qué da |
|---|---|---|
| Bet365, Winamax y Retabet | Una clave de odds-api.io (de pago; sus planes empiezan en 49 £ al mes) | Todos sus partidos y cuotas, y el enlace directo al partido en la casa |
| Betfair.es | Una clave de aplicación de la API de Betfair (se crea con tu cuenta de Betfair.es) | La cuota en contra y la liquidez reales del exchange español, y el número de mercado para el enlace directo |
| DAZN Bet y Sportium | Nada disponible: ningún proveedor da sus cuotas | Se escribe su cuota en «Comprobar cuota real» de cada partido |

Antes de publicar nada, comprueba tus claves desde tu ordenador (Node 18 o superior):

```bash
ODDSAPIIO_KEY=tu_clave node scripts/snapshot.mjs --check
```

Enseña cuántos partidos trae cada casa, cuántas cuotas se emparejan con el exchange, qué parte lleva enlace directo y las mejores calificantes del momento. Con las claves de Betfair.es, añade `BETFAIR_APP_KEY`, `BETFAIR_USERNAME` y `BETFAIR_PASSWORD` delante.

Después arranca la web con las mismas variables y abre `http://localhost:8080`:

```bash
ODDSAPIIO_KEY=tu_clave ADMIN_EMAILS=tu@correo.es node server/server.mjs
```

Notas:

- Betfair.es y casi todas las casas bloquean el acceso desde fuera de España. El servidor tiene que estar en España (o tu ordenador) para usar la API de Betfair.es.
- Betfair pide una licencia comercial para enseñar sus datos a clientes de pago. Consúltalo con ellos antes de vender.
- Sin servidor, `node scripts/snapshot.mjs` guarda las cuotas del momento en `assets/cuotas.json` y la web las enseña como «Cuotas reales guardadas», con su hora. No se actualizan solas.

### Cuotas

- **odds-api.io** (`ODDSAPIIO_KEY`) es la fuente para tus casas españolas. Según su lista pública de casas (noviembre de 2026), da **Bet365 ES, Winamax ES y Retabet ES**. **DAZN Bet y Sportium solo están en su versión italiana**, que no sirve. Para esas dos casas, en el oddsmatcher se escribe la cuota real en «Comprobar cuota real».
  - Las cuotas solo llegan de las casas **seleccionadas en tu cuenta** de odds-api.io. El servidor las selecciona solo la primera vez. Tu plan limita cuántas: Starter (5) basta para las tres casas, Betfair ES y Betfair Exchange.
  - Trae **todos los partidos** con cuota en cada casa para los próximos 7 días (fútbol, tenis y baloncesto), paginando y con 4 peticiones a la vez. Con unos 2.500 partidos son unas 270 peticiones por descarga; el plan de pago permite 5.000 a la hora.
  - Cada cuota trae su enlace directo a la apuesta en la casa cuando odds-api.io lo da; si no, el enlace al partido.
  - **Betfair Exchange** (el internacional) trae cuota en contra y liquidez, así que el oddsmatcher funciona solo con odds-api.io. Si además conectas Betfair.es, manda Betfair.es, que es el que se usa en España. `Betfair ES` también se pide por defecto: si trae cuotas en contra, el servidor la usa como Betfair.es y su enlace va directo al partido; si no, sale como una casa más.
  - El conector sigue la documentación oficial y la especificación OpenAPI y tiene pruebas con respuestas de ese formato, pero **no se ha probado con una clave real**. Cualquier error de la API sale en Administración → Resumen → Cuotas.
- **The Odds API** (`ODDS_API_KEY`) añade más casas europeas y Betfair internacional, con enlaces al partido cuando la casa los da. El servidor une las dos fuentes partido a partido aunque los nombres de los equipos no coincidan.
- **Betfair.es** (`BETFAIR_*`) da las cuotas en contra del exchange español, que tiene su propio mercado y su propia liquidez, y el número de mercado de cada partido, que es lo que permite **abrir Betfair directamente en ese mercado**. Trae todas las competiciones de fútbol, tenis y baloncesto de los próximos 7 días. Necesitas una cuenta de Betfair.es, una clave de aplicación (App Key, se crea en el portal de desarrolladores de Betfair) y que la cuenta permita iniciar sesión por API.

### Enlaces directos al partido

Cada botón de casa o de Betfair usa el mejor enlace que haya:

1. **Al partido** (etiqueta verde): la fuente de cuotas da la dirección exacta. odds-api.io la da para Bet365, Winamax y Retabet (a veces directa a la apuesta). La API de Betfair.es da el número de mercado.
2. **Buscar** (etiqueta azul): se abre el buscador de la casa con el equipo escrito y se copia el partido. Sirve para DAZN Bet y Sportium, para la vista previa y cuando falta el enlace exacto.
3. **Portada**: se abre la casa y se copia el partido para pegarlo en su buscador.

Se configura en **Administración → Enlaces** pegando direcciones reales, sin escribir plantillas:

- **Betfair.es**: abre cualquier partido en betfair.es, entra en «Cuotas de partido» y pega la dirección. La web cambia el número de mercado (`1.xxxxxxxxx`) por el de cada partido. Por defecto usa `https://www.betfair.es/exchange/plus/{sport}/market/{marketId}`.
- La misma pestaña enseña qué parte de las cuotas cargadas va **directa al partido** en cada casa y en Betfair, para comprobarlo de un vistazo.
- **Cada casa**: busca «Sevilla» en su web y pega la dirección de la página de resultados. Si la dirección no cambia al buscar, esa casa no permite enlazar la búsqueda.

Desde fuera de España no se pueden abrir betfair.es ni la mayoría de casas (bloquean el acceso), así que estos formatos hay que tomarlos desde España. El de Betfair.es que viene por defecto está sin comprobar.
- Sin fuente de una casa, en cada partido del oddsmatcher se puede escribir la cuota real y el cálculo es el mismo.

### Desplegar

Sirve cualquier hosting que ejecute Node con disco persistente (un VPS, Render, Railway o Fly.io con un volumen para `DATA_DIR`). Pon delante HTTPS. La base de datos es un archivo JSON, suficiente para cientos de clientes; para miles, cambia `server/db.mjs` por PostgreSQL manteniendo la forma de los datos.

## Antes de vender: revisión legal

Esto no es asesoramiento legal. Antes de cobrar, revisa con un abogado:

- **El contrato del Método y los textos legales** (`js/contract.js` y `js/views/legal.js`). Son plantillas. Marca la casilla en Administración → Empresa cuando estén revisados.
- **Publicidad del juego.** El Tribunal Supremo anuló en abril de 2024 parte del Real Decreto 958/2020, incluida la prohibición de los bonos de bienvenida, y el Ministerio de Consumo ha impulsado recuperar esas limitaciones por ley. Comprueba la situación actual, sobre todo si vas a usar enlaces de afiliado, nombres de casas o publicidad.
- **El módulo de Hacienda.** Está escrito como información general (art. 33.5.d de la Ley del IRPF: las pérdidas del juego compensan solo hasta las ganancias del mismo año) y avisa de que no es asesoramiento personalizado. Revisa que el enfoque de tu método encaje.
- **Consumidores.** Derecho de desistimiento de 14 días (en el contrato del Método se pide el acceso inmediato y la renuncia expresa), renovación automática mensual o anual, información precontractual y datos del titular (LSSI).
- **Protección de datos.** Registro de actividades, contratos de encargado con Stripe, el hosting y el correo. Las tipografías se cargan desde Google Fonts; puedes alojarlas en tu servidor.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `page.html` | La página sin cabecera (lo que se publica como vista previa en claude.ai). |
| `index.html` | La web para tu dominio. Se genera con `node scripts/build.mjs`; no la edites a mano. |
| `css/app.css` | Estilos, tema claro y oscuro. |
| `js/calc.js` | Fórmulas: favor-contra, combinadas, rollover y valor de bonos (con freebets en combinadas). |
| `js/odds.js` | Modelo de cuotas con varios mercados, oddsmatcher (calificante, freebet y reembolso), cliente de The Odds API y demostración con las 5 casas. |
| `js/links.js` | Enlaces directos: aprende la dirección de Betfair.es y la búsqueda de cada casa. |
| `js/data.js`, `js/content.js` | Casas, tipos de bono con sus pasos y las guías de las 5 casas. |
| `js/plans.js`, `js/contract.js` | Planes (mensual y anual) y permisos, y contrato del Método. Los usan la web y el servidor. |
| `js/core.js`, `js/app.js`, `js/views/` | La interfaz. |
| `server/server.mjs` | Servidor: web, API, cuentas, pagos, contrato, administración y cuotas. |
| `server/oddsapiio.mjs`, `server/betfair.mjs`, `server/merge.mjs`, `server/oddsfeed.mjs` | odds-api.io, Betfair.es, emparejado de partidos entre fuentes y descarga centralizada. |
| `server/auth.mjs`, `server/billing.mjs`, `server/db.mjs`, `server/mail.mjs` | Contraseñas y sesiones, Stripe (alta automática, cambio de plan, cancelación y cupones), base de datos y correo. |
| `scripts/snapshot.mjs` | Comprueba las fuentes de cuotas (`--check`) o guarda una instantánea de cuotas reales. |
| `tests/` | 71 pruebas: fórmulas, cuotas, emparejado de fuentes, odds-api.io, Betfair, contrato, permisos y el servidor de extremo a extremo con Stripe simulado (`npm test`). |

## Fórmulas

Con cuota a favor B, cuota en contra L, comisión c e importe S:

- Calificante: en contra = S·B / (L − c). Rating = B·(1 − c) / (L − c).
- Freebet sin devolución (SNR): en contra = S·(B − 1) / (L − c). Retención = (B − 1)·(1 − c) / (L − c).
- Freebet con devolución (SR): en contra = S·B / (L − c).
- Reembolso R con retención r: en contra = (S·B − R·r) / (L − c). En el oddsmatcher, rating = beneficio / S.
- Combinadas: de la última selección a la primera, en contra(n) = retorno / (L(n) − c) y en contra(i) = en contra(i+1)·(1 − c) / (L(i) − c).
- Rollover: valor = bono − (1 − rating medio) · lo que hay que apostar.

Solo para mayores de 18 años. Ayuda: [jugarbien.es](https://www.jugarbien.es).
