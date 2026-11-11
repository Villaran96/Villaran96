# Contrapeso

Plataforma de matched betting en español: oddsmatcher con cuotas reales, calculadoras, guía de bonos paso a paso y registro de beneficios. Funciona como web estática (sin instalar nada) o con un pequeño servidor en Node que descarga las cuotas para todos tus usuarios.

## Qué hace

| Sección | Qué hace |
|---|---|
| Resumen | Beneficio total y del mes, valor pendiente de tus bonos, gráfico mensual, siguiente paso de cada bono y las mejores cuotas del momento. |
| Oddsmatcher · favor-contra | Empareja la cuota a favor de cada casa con la mejor cuota en contra de los exchanges (teniendo en cuenta la comisión de cada uno). Modos calificante, freebet SNR y freebet SR. Filtros por importe, cuota mínima y máxima, rating mínimo (uno por modo), fecha, texto, casas, exchanges y ligas. Orden por fecha, cuotas o rating. Actualización automática y aviso de cuotas nuevas por encima del rating que elijas. «Calcular» abre la calculadora ya rellena. |
| Oddsmatcher · favor-favor | Busca combinaciones para cubrir todos los resultados con apuestas a favor en casas distintas: con dinero (surebets) o jugando una freebet en una casa y cubriendo el resto en otras. |
| Calculadora favor-contra | Calificante, freebet SNR, freebet SR y reembolso con retención. Underlay y overlay con un deslizador, tabla de resultados por casa y exchange, responsabilidad, rating o retención, y una tabla de cuánto cambia el beneficio si la cuota en contra se mueve uno o dos escalones de Betfair. |
| Calculadora favor-favor | De 2 a 8 resultados, comisión por pata (para apostar a favor en un exchange), freebets en cualquier pata, fijar una apuesta o repartir un total, y redondeo de importes a céntimos, 10 céntimos o euros con el beneficio recalculado con los importes redondeados. |
| Calculadora de combinadas | Cubre una combinada selección a selección. Marca cada selección como acertada o fallada, escribe lo que pusiste de verdad en contra y recalcula lo que queda. Beneficio en cada caso. |
| Calculadora de rollover | Valor esperado de un bono con rollover, coste de liberarlo, rating mínimo para que salga a cuenta y número de apuestas. |
| Bonos | Apunta promociones de 6 tipos (apuesta y recibe, reembolso, freebet directa, rollover, cuota mejorada y otras). Cada una genera sus pasos con botones que abren el oddsmatcher filtrado por esa casa o la calculadora rellena. Valor estimado de cada bono, fecha límite, progreso y lista de casas que aún no has usado. Al completar un bono se anota solo en Beneficios. |
| Beneficios | Registro de operaciones, beneficio acumulado, desglose por casa y por tipo, exportación a CSV (para Excel y la declaración de la renta) y copia de seguridad en JSON. |
| Aprende | Explicación con un ejemplo calculado en vivo, riesgos reales y glosario. |
| Ajustes | Fuente de cuotas, comisiones de cada exchange, supuestos para valorar bonos, avisos, tema claro u oscuro y copia de seguridad. |

Al abrirla por primera vez hay datos de ejemplo marcados como «Ejemplo» en Bonos y Beneficios para que veas cómo queda. Se borran con un botón.

## Cuotas reales

Hay tres fuentes, que se eligen en Ajustes:

1. **Demostración.** Cuotas simuladas que se mueven cada minuto, con los escalones de precio reales de Betfair. Para aprender a usar la herramienta.
2. **The Odds API desde el navegador.** Cada usuario pone su clave de [the-odds-api.com](https://the-odds-api.com) (tiene plan gratuito de 500 créditos al mes). Cada actualización gasta 1 crédito por liga y región, y la web reutiliza las cuotas durante los minutos que elijas para no gastar de más.
3. **Tu servidor (recomendado para dar servicio a otros).** El servidor incluido descarga las cuotas cada pocos minutos con tu clave y las sirve a todos los usuarios. La clave no sale nunca del servidor.

The Odds API da las cuotas en contra de Betfair Exchange y Matchbook en el mercado `h2h_lay` y las de casas europeas como William Hill, Marathonbet, Betsson, Unibet, Winamax o Pinnacle. **No cubre todas las casas españolas** (por ejemplo Bet365, Codere, Sportium o Kirolbet). Para tener las mismas casas que las plataformas de pago hace falta un proveedor de cuotas que las incluya. El código está preparado para enchufarlo: basta con convertir su respuesta al formato interno de `normalizeTheOddsApi` en `js/odds.js` y servirla desde `/api/odds`.

## Ponerla en marcha

Solo la web (sin servidor): sube la carpeta a cualquier hosting estático (GitHub Pages, Netlify, Cloudflare Pages...). Funciona en modo demostración y con la clave de The Odds API de cada usuario.

Con servidor (Node 18 o superior, sin dependencias):

```bash
cd contrapeso
```

```bash
ODDS_API_KEY=tu_clave node server/server.mjs
```

Abre `http://localhost:8080`, ve a Ajustes → Fuente de cuotas → «Tu servidor» y pulsa «Cargar cuotas». Variables opcionales: `SPORTS` (ligas separadas por comas), `REGIONS` (por defecto `eu`), `REFRESH_MINUTES` (por defecto 10), `PORT` y `ALLOW_ORIGIN` (si la web está en otro dominio).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `page.html` | La página sin cabecera. Es lo que se publica como vista previa en claude.ai. |
| `index.html` | La web lista para subir a tu dominio. Se genera con `node scripts/build.mjs`; no la edites a mano. |
| `css/app.css` | Estilos, con tema claro y oscuro. |
| `js/calc.js` | Todas las fórmulas: favor-contra, favor-favor, combinadas, rollover y valor de bonos. |
| `js/odds.js` | Fuentes de cuotas, normalización, oddsmatcher, buscador favor-favor y datos de demostración. |
| `js/data.js` | Catálogo de casas, tipos de bono con sus pasos y glosario. |
| `js/app.js` | La interfaz. |
| `server/server.mjs` | Servidor: sirve la web y `/api/odds` con caché. |
| `tests/` | Pruebas de las fórmulas y del cliente de cuotas (`node --test tests/*.test.mjs`). |

## Fórmulas

Con cuota a favor B, cuota en contra L, comisión c e importe S:

- Calificante: en contra = S·B / (L − c). Rating = B·(1 − c) / (L − c).
- Freebet sin devolución (SNR): en contra = S·(B − 1) / (L − c). Retención = (B − 1)·(1 − c) / (L − c).
- Freebet con devolución (SR): en contra = S·B / (L − c).
- Reembolso R con retención r: en contra = (S·B − R·r) / (L − c).
- Combinadas: se calcula de la última selección a la primera, en contra(n) = retorno / (L(n) − c) y en contra(i) = en contra(i+1)·(1 − c) / (L(i) − c), para que el beneficio sea el mismo falle la selección que falle.

## Lo que falta para ser un negocio como los de pago

- Cuentas de usuario y suscripciones (por ejemplo con Supabase y Stripe). Ahora los datos se guardan en el navegador de cada persona.
- Un proveedor de cuotas con todas las casas españolas.
- Las condiciones actualizadas de cada bono. Cambian a menudo y hay que mantenerlas a mano; la herramienta ya genera los pasos y el valor a partir de ellas.
- Comunidad y soporte (Telegram, Discord).

Solo para mayores de 18 años. Las ganancias del juego tributan en el IRPF. Ayuda: [jugarbien.es](https://www.jugarbien.es).
