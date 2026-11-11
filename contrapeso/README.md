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
- **Sin servidor** (cualquier hosting estático o la vista previa de claude.ai): todo funciona en el navegador con cuotas de demostración. Un selector deja ver la web como la vería cada plan.

## Qué hace

| Sección | Qué hace |
|---|---|
| Portada | Para visitantes: presentación, cómo funciona, planes y preguntas frecuentes. Para clientes: primeros pasos, **tus 5 casas** (hecha, en curso o por hacer, lo que vale cada bono y botones a su guía), siguiente paso de cada bono, beneficios y las mejores cuotas del momento. |
| Oddsmatcher | Miles de parejas de cuotas en la demostración. Mercados 1X2, ganador, más/menos 1,5, 2,5 y 3,5 goles y ambos marcan. Tres modos: **calificante**, **freebet** (SNR) y **reembolso** (por ejemplo Winamax: rating con el valor del reembolso si pierdes). Filtros rápidos y detallados (cuotas, rating, liquidez, fechas, mercados, casas, exchanges y ligas). Cada fila tiene **enlace directo a la casa y a Betfair**. Al pulsar el partido se despliega el cálculo explicado. En **«Comprobar cuota real»** escribes la cuota que ves en la casa y en Betfair y se recalcula todo. Si tu fuente de cuotas no trae alguna de tus casas, te lo dice. |
| Calculadoras | **Favor-contra** (calificante, SNR, SR, reembolso, underlay/overlay y sensibilidad a la cuota en contra). **Combinadas** cubiertas selección a selección (freebets de DAZN Bet en combinadas). **Rollover** (Sportium). Cada una dice para qué casa la usas y explica cómo calcula. |
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

| Casa | Bono | Cómo se saca | Herramienta |
|---|---|---|---|
| Bet365 | Hasta 200 € en créditos de apuesta | Calificante a 1,50 o más, cubierta. Créditos SNR a cuota 4–8, cubiertos. | Oddsmatcher y favor-contra |
| Winamax | Reembolso del 150 % de lo perdido (hasta 100 € apostados → 150 €) | Una apuesta de 100 € a cuota alta cubierta contando con el reembolso. Si pierde, freebets a cuota 4–8. | Oddsmatcher en modo reembolso |
| DAZN Bet | 100 % de la primera apuesta en freebets, hasta 200 €, y 10 € extra | Calificante cubierta. La mitad de las freebets va en combinadas: se cubren selección a selección. | Combinadas |
| Sportium | Bono de 200 € con rollover x8 | Calcula si sale a cuenta y libera el rollover con calificantes de cuota baja y buen rating. | Rollover y oddsmatcher |
| Retabet | 100 % del primer depósito en freebets, hasta 200 € (en freebets de 25 €) | Calificante a 2,00 o más cubierta. Freebets SNR cubiertas una a una. | Oddsmatcher y favor-contra |

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
| `ODDSAPIIO_KEY` | Clave de odds-api.io: cuotas de **Bet365, Winamax, DAZN Bet, Sportium y Retabet**. |
| `ODDSAPIIO_BOOKMAKERS`, `ODDSAPIIO_LEAGUES`, `ODDSAPIIO_MAX_EVENTS` | Casas tal como las nombra odds-api.io (por defecto `Bet365,Winamax ES,DAZN Bet,Sportium,Retabet ES`), ligas y número de partidos. |
| `ODDS_API_KEY` | Clave de The Odds API: más casas europeas y Betfair internacional. |
| `SPORTS`, `REGIONS`, `MARKETS`, `REFRESH_MINUTES` | Ligas, regiones (`eu`), mercados (`h2h,totals`) y frecuencia de descarga (10 min) de The Odds API. |
| `BETFAIR_APP_KEY`, `BETFAIR_USERNAME`, `BETFAIR_PASSWORD` | Cuotas en contra reales de **Betfair.es** con su liquidez y enlace directo al mercado. |
| `BETFAIR_COMPETITIONS`, `BETFAIR_HOURS` | Competiciones de Betfair (por nombre, en inglés) y horas por delante (96). |

### Stripe

1. Crea la cuenta en Stripe y pon la clave secreta en `STRIPE_SECRET_KEY` y la dirección pública con https en `SITE_URL`.
2. Entra en Administración → Pagos y pulsa **Conectar con Stripe**. Crea un producto por plan, sus precios mensual y anual con IVA incluido y el webhook con todos los eventos que usa la web. Si después cambias un precio en Planes, se crea el precio nuevo y quien ya paga sigue con el anterior.
3. Activa el portal de cliente en Stripe (Ajustes → Billing → Customer portal) para que los clientes cambien la tarjeta y descarguen facturas.
4. Si quieres, crea códigos de descuento en Administración → Pagos (por ejemplo LANZAMIENTO al 30 % durante 3 meses). Se escriben en la página de pago.

La web usa la versión `2024-06-20` de la API de Stripe, fijada en cada llamada.

### Cuotas

- **odds-api.io** (`ODDSAPIIO_KEY`) es la fuente para tus 5 casas, que The Odds API no cubre en España. ⚠️ **El conector está sin probar con una clave real**: se escribió a partir de la documentación pública resumida, porque desde el entorno de desarrollo no se podía abrir su web. Lee varios nombres de campo posibles y deja cualquier error en Administración → Resumen → Cuotas. Pruébalo con tu clave antes de vender.
- **The Odds API** (`ODDS_API_KEY`) añade más casas europeas y Betfair internacional, con enlaces al partido cuando la casa los da. El servidor une las dos fuentes partido a partido aunque los nombres de los equipos no coincidan.
- **Betfair.es** (`BETFAIR_*`) da las cuotas en contra del exchange español, que tiene su propio mercado y su propia liquidez. Necesitas una cuenta de Betfair.es, una clave de aplicación (App Key) y que la cuenta permita iniciar sesión por API.
- **Enlace a Betfair**: abre cualquier mercado en betfair.es, copia la dirección y ponla en Administración → Empresa cambiando el número de mercado (`1.xxxxxxxx`) por `{marketId}`.
- Cuando no hay enlace directo al partido, el botón abre la casa y copia el nombre del partido para pegarlo en su buscador.
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
| `js/data.js`, `js/content.js` | Casas, tipos de bono con sus pasos y las guías de las 5 casas. |
| `js/plans.js`, `js/contract.js` | Planes (mensual y anual) y permisos, y contrato del Método. Los usan la web y el servidor. |
| `js/core.js`, `js/app.js`, `js/views/` | La interfaz. |
| `server/server.mjs` | Servidor: web, API, cuentas, pagos, contrato, administración y cuotas. |
| `server/oddsapiio.mjs`, `server/betfair.mjs`, `server/merge.mjs`, `server/oddsfeed.mjs` | odds-api.io, Betfair.es, emparejado de partidos entre fuentes y descarga centralizada. |
| `server/auth.mjs`, `server/billing.mjs`, `server/db.mjs`, `server/mail.mjs` | Contraseñas y sesiones, Stripe (alta automática, cambio de plan, cancelación y cupones), base de datos y correo. |
| `tests/` | 57 pruebas: fórmulas, cuotas, emparejado de fuentes, odds-api.io, Betfair, contrato, permisos y el servidor de extremo a extremo con Stripe simulado (`npm test`). |

## Fórmulas

Con cuota a favor B, cuota en contra L, comisión c e importe S:

- Calificante: en contra = S·B / (L − c). Rating = B·(1 − c) / (L − c).
- Freebet sin devolución (SNR): en contra = S·(B − 1) / (L − c). Retención = (B − 1)·(1 − c) / (L − c).
- Freebet con devolución (SR): en contra = S·B / (L − c).
- Reembolso R con retención r: en contra = (S·B − R·r) / (L − c). En el oddsmatcher, rating = beneficio / S.
- Combinadas: de la última selección a la primera, en contra(n) = retorno / (L(n) − c) y en contra(i) = en contra(i+1)·(1 − c) / (L(i) − c).
- Rollover: valor = bono − (1 − rating medio) · lo que hay que apostar.

Solo para mayores de 18 años. Ayuda: [jugarbien.es](https://www.jugarbien.es).
