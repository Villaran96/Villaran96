// Contenido por defecto: datos del sitio, ejemplos de guías y promociones, y las
// lecciones del Método. El administrador lo cambia desde el panel; estos valores
// se usan al arrancar por primera vez y en la vista previa sin servidor.

export const DEFAULT_SITE = {
  brand: 'Contrapeso',
  legalName: '',
  nif: '',
  address: '',
  email: '',
  supportUrl: '',
  betfairTemplate: 'https://www.betfair.es/exchange/plus/football/market/{marketId}',
  contractReviewed: false,
};

/**
 * Guías de los bonos de bienvenida de las cinco casas del método. Las condiciones son
 * las publicadas en noviembre de 2026 y cambian a menudo: el administrador las revisa
 * y edita desde el panel. `howto` es el «cómo se hace» en Markdown sencillo.
 */
export const DEFAULT_GUIDES = [
  {
    id: 'bet365',
    bookie: 'Bet365',
    title: 'Duplica tu primer depósito hasta 200 € en créditos de apuesta',
    kind: 'bet_get',
    params: { qualStake: 200, minOdds: 1.5, freebet: 200, freebetType: 'snr', minDeposit: 5, claimDays: 30, expiryDays: 7 },
    conditions: 'Condiciones publicadas en noviembre de 2026: 100 % de tu primer depósito en créditos de apuesta, hasta 200 €. Depósito mínimo 5 €. Para recibirlos, apuesta el importe del depósito a cuota 1,50 o más. Pide la oferta en los 30 días siguientes al registro. Los créditos caducan a los 7 días y las ganancias no incluyen su importe (funcionan como freebets SNR).',
    howto: `**Lo que vale:** con un depósito de 200 € sacas unos 150 €: la calificante cubierta te cuesta unos euros y los créditos se convierten en dinero al 75–80 %.

## Antes de empezar
- El bono es el 100 % de **tu primer depósito**: si depositas 100 €, recibes 100 € en créditos. Deposita lo que vayas a usar.
- Necesitas saldo en Betfair para la responsabilidad de la calificante: con 200 € a cuota 2,00 son unos 205 €.

## La apuesta calificante
- Apuesta el importe del depósito a cuota **1,50 o más**. Puede ser una apuesta o varias que sumen ese importe.
- Elige un rating del 95 % o más y cubre cada apuesta en Betfair justo después.
- Los créditos llegan cuando se liquidan las apuestas calificantes.

## Los créditos de apuesta
- Funcionan como freebets **SNR**: si aciertas cobras solo la ganancia.
- Puedes repartirlos. Con 200 €, haz 2 a 4 apuestas de 50–100 € a cuota 4–8: necesitas menos saldo en Betfair (unos 160 € de responsabilidad por cada 50 € a cuota 5) y es más fácil que haya liquidez.
- Caducan a los **7 días**: úsalos pronto.

## Cuidado con
- Pedir la oferta en la sección de ofertas de bet365 dentro de los **30 días** siguientes al registro.
- Las apuestas anuladas o cerradas con cash out normalmente no cuentan para la calificante: no las uses.`,
    url: 'https://www.bet365.es',
    reviewed: '2026-11',
  },
  {
    id: 'winamax',
    bookie: 'Winamax',
    title: 'Reembolso del 150 % de tus apuestas perdedoras, hasta 150 € en freebets',
    kind: 'refund',
    params: { stake: 100, refund: 150, minOdds: 1.01, minDeposit: 15, days: 30 },
    conditions: 'Condiciones publicadas en noviembre de 2026: si tus apuestas pierden, te devuelven el 150 % en freebets, hasta 150 €. Cuentan las apuestas perdidas hasta el importe de tu primer depósito y como máximo 100 €, durante los 30 días siguientes al depósito. Depósito mínimo 15 €. Sin cuota mínima. Valen simples y combinadas; no cuentan las apuestas con freebets, las de sistema ni las cerradas con cash out. Las freebets llegan en unas 2 horas.',
    howto: `**Lo que vale:** unos 75–90 € con una apuesta de 100 € a cuota alta.

## La idea
Si pierdes, te devuelven 150 € por cada 100 € perdidos. Por eso conviene **una sola apuesta de 100 €** (lo máximo que cuenta) a cuota alta: cuanto más alta, más probable es que pierda en la casa y más vale el reembolso.

## Paso a paso
- Deposita **100 €**: el reembolso cuenta hasta el importe del depósito.
- En el oddsmatcher, modo **Reembolso** con 100 € de apuesta y 150 € de reembolso. Ordena por rating y elige una cuota entre 3 y 8.
- Apuesta los 100 € a favor y cúbrelos en Betfair con lo que diga la calculadora, que ya cuenta con el reembolso.
- Si **gana** la apuesta a favor, el bono acaba ahí con el beneficio asegurado.
- Si **pierde**, te llegan 150 € en freebets en unas horas: juégalas a cuota 4–8 y cúbrelas.

## Cuidado con
- No cierres la apuesta con cash out: deja de contar.
- Cuentan las pérdidas de los 30 días siguientes al depósito hasta 100 €: haz la apuesta del bono y no mezcles otras.`,
    url: 'https://www.winamax.es/apuestas-deportivas',
    reviewed: '2026-11',
  },
  {
    id: 'daznbet',
    bookie: 'DAZN Bet',
    title: '100 % de tu primera apuesta en freebets, hasta 200 €, y 10 € extra',
    kind: 'bet_get',
    params: { qualStake: 200, minOdds: 1.5, freebet: 200, freebetType: 'snr', minDeposit: 5, expiryDays: 7, accaShare: 50, extra: 10 },
    conditions: 'Condiciones publicadas en noviembre de 2026: recibes en freebets el 100 % de tu primera apuesta, hasta 200 €, y 10 € más si esa apuesta es de fútbol y de 10 € o más. La mitad de las freebets se juega en cualquier mercado y la otra mitad en combinadas o creador de apuestas. Caducan a los 7 días. Promoción hasta el 31/12/2026. Algunas webs la describen como reembolso solo si pierdes y con cuota mínima 2,00: confírmalo en daznbet.es antes de apostar.',
    howto: `**Lo que vale:** unos 155 € con una primera apuesta de 200 €.

## La apuesta calificante
- Tu **primera apuesta** marca el tamaño del bono: 200 € dan 200 € en freebets.
- Hazla en **fútbol** y de 10 € o más para llevarte también los 10 € extra.
- Respeta la cuota mínima (1,50 según las condiciones publicadas; si la web dice 2,00, usa 2,00) y cúbrela en Betfair.

## Las freebets
- **100 € para cualquier mercado:** juégalas a cuota 4–8 y cúbrelas como freebet SNR.
- **100 € para combinadas:** haz una combinada de 2 partidos distintos con cuota total entre 4 y 8 y cúbrela selección a selección con la calculadora de **Combinadas** en modo freebet SNR. Cubre la primera antes de que empiece y la segunda cuando acierte la primera.
- Caducan a los **7 días**.

## Cuidado con
- El creador de apuestas (varias selecciones del mismo partido) no se puede cubrir bien en Betfair: usa combinadas de partidos distintos.`,
    url: 'https://www.daznbet.es',
    reviewed: '2026-11',
  },
  {
    id: 'sportium',
    bookie: 'Sportium',
    title: '100 % de tu primer depósito hasta 200 €, con rollover x8',
    kind: 'rollover',
    params: { deposit: 200, bonus: 200, multiplier: 8, base: 'bonus', minOdds: 1.5, minDeposit: 10, days: 30 },
    conditions: 'Condiciones publicadas en noviembre de 2026: bono del 100 % de tu primer depósito, hasta 200 €. Depósito mínimo 10 €. Hay que apostarlo 8 veces a cuota 1,50 o más en 30 días. Algunas webs describen otra versión en dos depósitos de 100 € con freebets: mira la vigente en sportium.es.',
    howto: `**Lo que vale:** unos 150 € con 200 € de bono, si liberas el rollover con buen rating.

## Antes de empezar
- Abre la **calculadora de Rollover**: con 200 € de bono y x8 hay que apostar 1.600 €. Con un rating medio del 97 % cuesta unos 48 €.
- Lee si el rollover se calcula sobre el bono o sobre depósito + bono: cambia mucho lo que hay que apostar.

## Liberar el rollover
- Haz calificantes a cuota **1,50–2,50**: cuanto más baja la cuota, menos saldo necesitas en Betfair.
- Elige rating del 96 % o más y liquidez suficiente.
- Anota cada apuesta: así sabes cuánto llevas.
- Tienes **30 días**: reparte las apuestas.

## Cuidado con
- Cuando una apuesta a favor pierde, el saldo de la casa baja y el dinero queda en Betfair. Si la casa se queda sin saldo antes de completar el rollover, pierdes el bono, aunque lo cubierto en Betfair compensa esa apuesta.`,
    url: 'https://www.sportium.es',
    reviewed: '2026-11',
  },
  {
    id: 'retabet',
    bookie: 'Retabet',
    title: '100 % de tu primer depósito en freebets, hasta 200 €',
    kind: 'bet_get',
    params: { qualStake: 200, minOdds: 2, freebet: 200, freebetType: 'snr', minDeposit: 20, claimDays: 7, chunk: 25 },
    conditions: 'Condiciones publicadas en noviembre de 2026: 100 % del primer depósito en freebets, hasta 200 €. Depósito mínimo 20 € (según algunas webs, sin PayPal). Apuesta el importe depositado a cuota 2,00 o más en los 7 días siguientes. Las freebets son de 25 € como máximo cada una y no valen para apuestas de sistema.',
    howto: `**Lo que vale:** unos 150 € con un depósito de 200 €.

## La apuesta calificante
- Deposita con tarjeta o transferencia (algunas webs indican que PayPal no vale).
- Apuesta el importe del depósito a cuota **2,00 o más** en los **7 días** siguientes y cúbrelo en Betfair.

## Las freebets
- Llegan en freebets de **25 €** como máximo: con 200 € son 8.
- Juega cada una a cuota 4–8 y cúbrela como SNR. Hazlas de una en una: con 25 € a cuota 5 necesitas unos 80 € de saldo en Betfair.

## Cuidado con
- No uses las freebets en apuestas de sistema.`,
    url: 'https://www.retabet.es',
    reviewed: '2026-11',
  },
];

/** Promociones recurrentes de ejemplo. days: días de la semana (0 domingo … 6 sábado); vacío = siempre. */
export const DEFAULT_PROMOS = [
  { id: 'p1', bookie: 'Bet365', kind: 'boost', params: { stake: 10, boostedOdds: 3.2, layOdds: 2.9 }, schedule: 'Todos los días', days: [], conditions: 'Ejemplo: cuota mejorada en un partido destacado, apuesta máxima 10 €. Pon aquí la de cada día.', url: 'https://www.bet365.es', example: true },
  { id: 'p2', bookie: 'Winamax', kind: 'bet_get', params: { qualStake: 20, minOdds: 1.8, freebet: 5, freebetType: 'snr' }, schedule: 'Los lunes', days: [1], conditions: 'Ejemplo: apuesta 20 € el fin de semana y recibe 5 € en freebet el lunes.', url: 'https://www.winamax.es/apuestas-deportivas', example: true },
  { id: 'p3', bookie: 'DAZN Bet', kind: 'refund', params: { stake: 25, refund: 25, minOdds: 2 }, schedule: 'Los martes y miércoles', days: [2, 3], conditions: 'Ejemplo: reembolso de hasta 25 € en el partido de Champions destacado.', url: 'https://www.daznbet.es', example: true },
  { id: 'p4', bookie: 'Sportium', kind: 'freebet', params: { freebet: 5, minOdds: 1.5, freebetType: 'snr' }, schedule: 'Los viernes', days: [5], conditions: 'Ejemplo: 5 € en apuesta gratis por apostar 25 € durante la semana.', url: 'https://www.sportium.es', example: true },
  { id: 'p5', bookie: 'Retabet', kind: 'boost', params: { stake: 20, boostedOdds: 2.5, layOdds: 2.3 }, schedule: 'Los sábados y domingos', days: [6, 0], conditions: 'Ejemplo: cuota mejorada en el partido grande de LaLiga.', url: 'https://www.retabet.es', example: true },
];

/**
 * Lecciones del Método, en un Markdown sencillo: ## títulos, listas con - o 1.,
 * > notas, **negrita** y [enlaces](https://...). {marca} se cambia por el nombre
 * del sitio y [[calc-impuesto]] y [[hoja-fiscal]] por herramientas interactivas.
 */
export const DEFAULT_LESSONS = [
  {
    id: 'm1',
    title: 'Cómo tributan las ganancias del juego',
    minutes: 6,
    body: `Lo que ganas apostando no es un sueldo ni el rendimiento de un negocio: para Hacienda es una **ganancia patrimonial**, según la Ley 35/2006 del IRPF.

## Lo esencial
- Las ganancias del juego se suman a la **base imponible general** del IRPF, la misma que tu sueldo. Pagan a tu tipo marginal.
- Las apuestas con casas online **no llevan retención**: nadie te descuenta nada al cobrar, así que lo pagas al hacer la declaración.
- Se declara por **año natural** (de enero a diciembre) en la campaña de la renta del año siguiente.
- Cuenta el **resultado de las apuestas** (lo que ganas en las acertadas y lo que pierdes en las falladas), no el dinero que ingresas o retiras de las casas.

## Con el matched betting
Cada operación tiene dos apuestas: una a favor en la casa y otra en contra en el exchange. Casi siempre una gana y la otra pierde. Las dos son juego, así que **las pérdidas del exchange compensan las ganancias de las casas**, con el límite que verás en la lección siguiente.

> Ejemplo: en un año ganas 1.240 € en las casas y pierdes 860 € en Betfair. Tu resultado del juego es de 380 €.

## Lo que no cambia nada
- Que no hayas retirado el dinero: la ganancia existe cuando se liquida la apuesta.
- Que sean cantidades pequeñas: las apuestas online no tienen el mínimo exento de los premios de loterías.`,
  },
  {
    id: 'm2',
    title: 'Ganancias y pérdidas: cómo se compensan',
    minutes: 5,
    body: `El artículo 33.5.d de la Ley del IRPF permite restar las pérdidas del juego, pero **solo hasta el importe de las ganancias del juego del mismo año**.

## Cómo se aplica
1. Suma lo que has ganado en apuestas en el año.
2. Suma lo que has perdido.
3. Si las pérdidas son menores que las ganancias, tributas por la diferencia.
4. Si son mayores, el resultado es cero y **el exceso no se puede llevar a años siguientes**.

> Ejemplo A: ganancias 2.100 €, pérdidas 1.650 €. Tributas por 450 €.

> Ejemplo B: ganancias 300 €, pérdidas 420 €. No tributas, pero los 120 € de diferencia no cuentan para el año que viene.

## Solo entre juego
Las pérdidas del juego solo compensan ganancias del juego. No reducen tu sueldo ni otras ganancias, como las de vender acciones.

## Casas con licencia
Usa solo operadores con licencia en España: los tienes en [ordenacionjuego.es](https://www.ordenacionjuego.es). Hay consultas de la Dirección General de Tributos que relacionan el cómputo de las pérdidas con operadores habilitados; si alguna vez usaste otros, revísalo con un asesor.`,
  },
  {
    id: 'm3',
    title: 'Bonos, freebets y reembolsos en la declaración',
    minutes: 4,
    body: `Las promociones cambian cómo llegas al dinero, no cómo tributa.

- **Freebet que gana:** lo que cobras es ganancia del juego.
- **Freebet que pierde:** no pusiste dinero, así que no hay pérdida que declarar.
- **Apuesta calificante:** su resultado (casi siempre unos céntimos de pérdida entre casa y exchange) se integra como cualquier otra apuesta.
- **Reembolsos y saldo de bono:** cuando se convierten en dinero que puedes retirar, forman parte de tu resultado del juego. Algunos casos concretos, como regalos de fidelidad en efectivo, no están detallados en la ley: si son cantidades importantes, consúltalo.
- **Comisión del exchange:** reduce lo que cobras en las apuestas ganadas; ya está descontada en el resultado.

> Anota cada operación en Beneficios al cerrarla. Al final del año tendrás el resultado de cada casa y del exchange para compararlo con los certificados.`,
  },
  {
    id: 'm4',
    title: '¿Tengo que hacer la declaración?',
    minutes: 4,
    body: `Las ganancias del juego no llevan retención, así que pueden obligarte a presentar la declaración aunque por tu sueldo no tuvieras que hacerlo.

## Qué mirar
- El artículo 96 de la Ley del IRPF dice quién no está obligado. Esas excepciones exigen, en general, que tus ingresos vengan **solo** de las fuentes que enumera (sueldo por debajo de cierto límite, rendimientos con retención…). Las ganancias del juego sin retención no están entre ellas.
- Tampoco están obligados quienes, sumando trabajo, capital, actividades y ganancias patrimoniales, no pasan de 1.000 € al año y tienen pérdidas patrimoniales por debajo de 500 €.
- Los límites cambian: compruébalos cada año en la web de la Agencia Tributaria antes de la campaña.

> Lo prudente: si el año ha acabado con resultado del juego positivo, cuenta con presentar la declaración y compruébalo en Renta Web.

## Si no estás obligado
Si el resultado del año es negativo no hay nada que pagar por el juego. Aun así, guarda la documentación por si Hacienda pregunta por tus movimientos con las casas.`,
  },
  {
    id: 'm5',
    title: 'Qué documentos pedir y guardar',
    minutes: 4,
    body: `## Al terminar cada año
1. Pide a cada casa en la que hayas apostado el **certificado de ganancias y pérdidas** del año. Suele estar en tu área de cliente o se pide al servicio de atención.
2. Descarga el **extracto de tu cuenta del exchange** del año.
3. Exporta tus operaciones desde Beneficios en CSV.
4. Guarda los extractos bancarios con los depósitos y retiradas.

## Cuánto tiempo
Hacienda puede revisar una declaración durante 4 años desde que acaba el plazo para presentarla. Guárdalo todo al menos ese tiempo.

## Tu lista de certificados
La hoja de control fiscal de abajo lista, año por año, las casas con las que has operado según tu registro, para que no se te quede ningún certificado sin pedir.

[[hoja-fiscal]]`,
  },
  {
    id: 'm6',
    title: 'Paso a paso en Renta Web',
    minutes: 5,
    body: `1. Entra en Renta Web con Cl@ve, certificado digital o número de referencia.
2. Revisa los datos fiscales que Hacienda ya tiene de ti.
3. Ve al apartado de **ganancias y pérdidas patrimoniales que no derivan de la transmisión de elementos patrimoniales**. Ahí están las casillas de las ganancias y de las pérdidas del juego.
4. Escribe el total de ganancias y el total de pérdidas del año, sumando los certificados de todas las casas y del exchange.
5. Comprueba que las pérdidas que cuentan no superan a las ganancias: Renta Web aplica el límite.
6. Revisa el resultado de la declaración y preséntala.

> Los números de casilla cambian de un año a otro. Búscalas con el buscador de casillas de Renta Web escribiendo «juego».`,
  },
  {
    id: 'm7',
    title: 'Cuánto puedes tener que pagar',
    minutes: 3,
    body: `Las ganancias del juego se suman a tu base general, así que pagan a tu **tipo marginal**: el porcentaje del tramo más alto en el que caen tus ingresos.

- Con ingresos de entre 20.000 € y 35.000 € al año, el tipo marginal ronda el 30 %; entre 35.000 € y 60.000 €, el 37 %.
- Cada comunidad autónoma fija su parte de la escala, así que varía un poco según dónde vivas.

Estima lo que pagarás y apártalo durante el año para que la declaración no te pille sin dinero.

[[calc-impuesto]]`,
  },
  {
    id: 'm8',
    title: 'Si Hacienda te escribe',
    minutes: 3,
    body: `- Lee con calma qué te piden y el plazo para contestar, que suele ser de 10 días hábiles.
- Responde por la sede electrónica con los certificados de las casas, el extracto del exchange y tu registro de operaciones.
- Explica que son apuestas cubiertas: las ganancias de las casas y las pérdidas del exchange forman parte del mismo resultado del juego.
- Si la cantidad es importante o no entiendes el requerimiento, busca un asesor fiscal antes de contestar.`,
  },
  {
    id: 'm9',
    title: 'Organización: banca, saldo y tiempo',
    minutes: 4,
    body: `- Usa una cuenta bancaria y una tarjeta solo para esto: verás el dinero que tienes dentro y justificarás los movimientos sin esfuerzo.
- Como orientación, con 150 € a 300 € puedes hacer los bonos de bienvenida de uno en uno: necesitas la apuesta calificante en la casa y la responsabilidad en el exchange.
- Al principio, haz los bonos de uno en uno y marca cada paso en Bonos.
- Mira los plazos de cada promoción: algunas caducan a los 7 días.
- Aparta cada mes la parte estimada de impuestos.`,
  },
  {
    id: 'm10',
    title: 'Cuidar tus cuentas',
    minutes: 3,
    body: `Las casas pueden limitar las cuentas que solo usan promociones. Hacer matched betting no es ilegal, pero cada operador decide a quién ofrece sus promociones.

- Lee y cumple las condiciones de cada promoción.
- No uses cuentas de otras personas ni abras dos cuentas en la misma casa: está prohibido y te pueden cerrar la cuenta y retener el saldo.
- Retira el dinero con normalidad; no hace falta dejar saldo parado.
- Empieza por las promociones que más valen, por si alguna casa te limita.`,
  },
];
