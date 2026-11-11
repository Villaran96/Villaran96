# Contrapeso

Plataforma de matched betting por suscripción, en español:
- Oddsmatcher con cuotas reales y enlaces directos al partido.
- Calculadoras.
- Guía paso a paso.
- Bonos guiados casa por casa.
- Registro de beneficios.
- Tres planes de pago: Bienvenida, Recurrentes y Método. El Método tiene plazas limitadas y se contrata con un contrato firmado online.

Funciona de dos formas:
- **Con el servidor** (`node server/server.mjs`): cuentas, pagos con Stripe, contenido de pago protegido, contrato firmado y cuotas centralizadas. Es la forma de venderla.
- **Sin servidor** (cualquier hosting estático o la vista previa de claude.ai): todo funciona en el navegador con cuotas de demostración. Un selector deja ver la web como la vería cada plan.

## Qué hace

| Sección | Qué hace |
|---|---|
| Portada | Para visitantes: presentación, cómo funciona, planes y preguntas frecuentes. Para clientes: primeros pasos, siguiente paso de cada bono, beneficios y las mejores cuotas del momento. |
| Oddsmatcher | Unas 9.000 parejas de cuotas en la demostración. Mercados 1X2, ganador, más/menos 1,5, 2,5 y 3,5 goles y ambos marcan. Modos calificante, freebet SNR y freebet SR. Filtros rápidos (95 % o más, freebets a cuota 4–9, hoy, solo mis casas, liquidez) y detallados (cuotas, rating, liquidez mínima, fechas, mercados, casas, exchanges, ligas). Cada fila tiene **enlace directo a la casa y a Betfair**. Al pulsar el partido se despliega el cálculo explicado: qué apostar, dónde y cuánto, resultado en cada caso, fórmula del rating con los números, liquidez y antigüedad de las cuotas. |
| Favor-favor | Surebets entre casas y freebets cubiertas solo con apuestas a favor, en todos los mercados. |
| Calculadoras | Favor-contra (calificante, SNR, SR, reembolso, underlay/overlay, sensibilidad a la cuota en contra), favor-favor, combinadas cubiertas selección a selección y rollover. Cada una explica cómo calcula. |
| Bonos | Tres pestañas. **Bienvenida**: guía de cada casa ordenada por valor. **Recurrentes**: calendario semanal de promociones. **Mis bonos**: tus bonos paso a paso. Cada paso tiene un botón que abre la web de la casa, el oddsmatcher filtrado con esa casa, la cuota mínima y el importe, o la calculadora ya rellena. Una barra arriba recuerda el bono en curso; al anotar una apuesta, el paso se marca como hecho. |
| Beneficios | Registro, gráficos, desglose por casa, tipo y año, exportación CSV y copias de seguridad. Con cuenta, se guarda en el servidor y se ve en cualquier dispositivo. |
| Guía | 11 lecciones con ejemplos calculados en directo, tests y botones que abren la herramienta con los números del ejemplo. La lección 4 explica a fondo las freebets SNR y SR: qué son, cómo se cubren, retención según la cuota y cómo reconocerlas en las condiciones. |
| Método | Página de venta con plazas restantes y el proceso: solicitud → contrato → pago → acceso. El contrato se rellena con los datos del cliente y valida DNI/NIE. Se firma en pantalla y guarda como prueba la huella SHA-256 del texto, la fecha, la IP y el navegador, con copia por correo. Las lecciones (10 por defecto, sobre Hacienda, organización y cuentas) incluyen una calculadora de impuestos y una hoja de control fiscal por año con tus propios datos. |
| Planes | Los cuatro planes, comparativa y preguntas sobre la suscripción. |
| Cuenta | Registro (con confirmación de mayoría de edad y aceptación de condiciones), acceso, recuperación de contraseña por correo, gestión del pago en el portal de Stripe, cambio de contraseña y borrado de cuenta. |
| Administración | Lista de puesta en marcha. Edición de guías de bienvenida, recurrentes y lecciones del Método. Planes y precios, datos de la empresa, usuarios (con cambio de plan manual), solicitudes del Método y contratos firmados. |
| Legal | Aviso legal, privacidad, cookies, condiciones de contratación y juego responsable, rellenados con los datos de la empresa. |

## Planes y qué desbloquean

| | Gratis | Bienvenida | Recurrentes | Método |
|---|---|---|---|---|
| Calculadoras, guía, seguimiento | ✓ | ✓ | ✓ | ✓ |
| Oddsmatcher | 5 mejores | completo | completo | completo |
| Favor-favor y avisos | — | ✓ | ✓ | ✓ |
| Guías de bienvenida por casa | — | ✓ | ✓ | ✓ |
| Promociones recurrentes | — | — | ✓ | ✓ |
| Lecciones y hoja fiscal del Método | — | — | — | ✓ (con contrato firmado) |

Los precios por defecto (14,99 €, 24,99 € y 79 € al mes; 20 plazas del Método) se cambian en Administración → Planes. **El servidor aplica los bloqueos**: el plan gratuito solo recibe los partidos de las 5 mejores cuotas y el contenido de pago no sale del servidor sin el plan.

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
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe. |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe. |
| `STRIPE_PRICE_BIENVENIDA`, `STRIPE_PRICE_RECURRENTES`, `STRIPE_PRICE_METODO` | Identificadores de precio (`price_…`) de cada plan. |
| `STRIPE_METODO_MODE` | `payment` si el Método se cobra en un pago único (por defecto, suscripción). |
| `RESEND_API_KEY`, `MAIL_FROM` | Correo transaccional con Resend. Sin clave, los correos salen en la consola del servidor. |
| `ODDS_API_KEY` | Clave de The Odds API para las cuotas de las casas. |
| `SPORTS`, `REGIONS`, `MARKETS`, `REFRESH_MINUTES` | Ligas, regiones (`eu`), mercados (`h2h,totals`) y frecuencia de descarga (10 min). |
| `BETFAIR_APP_KEY`, `BETFAIR_USERNAME`, `BETFAIR_PASSWORD` | Cuotas en contra reales de **Betfair.es** con su liquidez y enlace directo al mercado. |
| `BETFAIR_COMPETITIONS`, `BETFAIR_HOURS` | Competiciones de Betfair (por nombre, en inglés) y horas por delante (96). |

### Stripe

1. En Stripe crea un producto por plan con su precio mensual (o anual) y copia cada `price_…` en su variable.
2. Crea un webhook a `https://tudominio.es/api/stripe/webhook` con los eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`. Copia su secreto en `STRIPE_WEBHOOK_SECRET`.
3. Activa el portal de cliente en Stripe (Ajustes → Billing → Customer portal) para que los clientes cancelen y descarguen facturas.
4. Pon en Administración → Planes los mismos importes que cobra Stripe.

### Cuotas

- **The Odds API** (`ODDS_API_KEY`) da las cuotas de casas europeas, con enlaces al partido y al boleto cuando la casa los ofrece. Cada descarga gasta 1 crédito por liga, mercado y región: con 10 ligas, 2 mercados y descarga cada 10 minutos, unos 86.000 créditos al mes. Elige plan en the-odds-api.com o baja la frecuencia.
- **Betfair.es** (`BETFAIR_*`) da las cuotas en contra del exchange español, que tiene su propio mercado y su propia liquidez. El servidor empareja cada partido de las casas con el de Betfair aunque los nombres sean distintos («Ath Bilbao» y «Athletic Club»). Necesitas una cuenta de Betfair.es, una clave de aplicación (App Key) y que la cuenta permita iniciar sesión por API.
- **Falta**: The Odds API no cubre todas las casas españolas (por ejemplo Bet365, Codere, Sportium o Kirolbet). Para tenerlas hace falta un proveedor de cuotas que las incluya. Se conecta convirtiendo su respuesta al modelo de `js/odds.js`, igual que hace `normalizeTheOddsApi`.
- **Enlace a Betfair**: abre cualquier mercado en betfair.es, copia la dirección y ponla en Administración → Empresa cambiando el número de mercado (`1.xxxxxxxx`) por `{marketId}`.
- Cuando no hay enlace directo al partido, el botón abre la portada de la casa y copia el nombre del partido para pegarlo en su buscador.

### Desplegar

Sirve cualquier hosting que ejecute Node con disco persistente (un VPS, Render, Railway o Fly.io con un volumen para `DATA_DIR`). Pon delante HTTPS. La base de datos es un archivo JSON, suficiente para cientos de clientes; para miles, cambia `server/db.mjs` por PostgreSQL manteniendo la forma de los datos.

## Antes de vender: revisión legal

Esto no es asesoramiento legal. Antes de cobrar, revisa con un abogado:

- **El contrato del Método y los textos legales** (`js/contract.js` y `js/views/legal.js`). Son plantillas. Marca la casilla en Administración → Empresa cuando estén revisados.
- **Publicidad del juego.** El Tribunal Supremo anuló en abril de 2024 parte del Real Decreto 958/2020, incluida la prohibición de los bonos de bienvenida, y el Ministerio de Consumo ha impulsado recuperar esas limitaciones por ley. Comprueba la situación actual, sobre todo si vas a usar enlaces de afiliado o publicidad de casas.
- **El módulo de Hacienda.** Está escrito como información general (art. 33.5.d de la Ley del IRPF: las pérdidas del juego compensan solo hasta las ganancias del mismo año) y avisa de que no es asesoramiento personalizado. Revisa que el enfoque de tu método encaje.
- **Consumidores.** Derecho de desistimiento de 14 días (en el contrato del Método se pide el acceso inmediato y la renuncia expresa), información precontractual y datos del titular (LSSI).
- **Protección de datos.** Registro de actividades, contratos de encargado con Stripe, el hosting y el correo. Las tipografías se cargan desde Google Fonts; puedes alojarlas en tu servidor.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `page.html` | La página sin cabecera (lo que se publica como vista previa en claude.ai). |
| `index.html` | La web para tu dominio. Se genera con `node scripts/build.mjs`; no la edites a mano. |
| `css/app.css` | Estilos, tema claro y oscuro. |
| `js/calc.js` | Fórmulas: favor-contra, favor-favor, combinadas, rollover y valor de bonos. |
| `js/odds.js` | Modelo de cuotas con varios mercados, oddsmatcher, favor-favor, cliente de The Odds API y demostración. |
| `js/plans.js`, `js/contract.js`, `js/content.js` | Planes y permisos, contrato del Método y contenido por defecto. Los usan la web y el servidor. |
| `js/core.js`, `js/app.js`, `js/views/` | La interfaz. |
| `server/server.mjs` | Servidor: web, API, cuentas, pagos, contrato, administración y cuotas. |
| `server/betfair.mjs`, `server/merge.mjs`, `server/oddsfeed.mjs` | Betfair.es, emparejado de partidos y descarga centralizada. |
| `server/auth.mjs`, `server/billing.mjs`, `server/db.mjs`, `server/mail.mjs` | Contraseñas y sesiones, Stripe, base de datos y correo. |
| `tests/` | 54 pruebas: fórmulas, cuotas, Betfair, contrato, permisos y el servidor de extremo a extremo con Stripe simulado (`npm test`). |

## Fórmulas

Con cuota a favor B, cuota en contra L, comisión c e importe S:

- Calificante: en contra = S·B / (L − c). Rating = B·(1 − c) / (L − c).
- Freebet sin devolución (SNR): en contra = S·(B − 1) / (L − c). Retención = (B − 1)·(1 − c) / (L − c).
- Freebet con devolución (SR): en contra = S·B / (L − c).
- Reembolso R con retención r: en contra = (S·B − R·r) / (L − c).
- Combinadas: de la última selección a la primera, en contra(n) = retorno / (L(n) − c) y en contra(i) = en contra(i+1)·(1 − c) / (L(i) − c).

Solo para mayores de 18 años. Ayuda: [jugarbien.es](https://www.jugarbien.es).
