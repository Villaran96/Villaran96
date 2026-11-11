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

/** Guías de bonos de bienvenida. Marcadas como ejemplo hasta que el administrador ponga las reales. */
export const DEFAULT_GUIDES = [
  { id: 'g1', bookie: 'Bet365', kind: 'bet_get', params: { qualStake: 10, minOdds: 1.5, freebet: 30, freebetType: 'snr' }, conditions: 'Condiciones de ejemplo: apuesta 10 € a cuota 1,50 o más en tu primer depósito y recibe 30 € en apuestas gratis de 10 €.', url: 'https://www.bet365.es', example: true },
  { id: 'g2', bookie: 'Codere', kind: 'refund', params: { stake: 200, refund: 200, minOdds: 1.5 }, conditions: 'Condiciones de ejemplo: si tu primera apuesta pierde, te devolvemos hasta 200 € en apuestas gratis.', url: 'https://www.codere.es', example: true },
  { id: 'g3', bookie: 'Sportium', kind: 'bet_get', params: { qualStake: 25, minOdds: 1.5, freebet: 25, freebetType: 'snr' }, conditions: 'Condiciones de ejemplo: apuesta 25 € y recibe 25 € en apuestas gratis.', url: 'https://www.sportium.es', example: true },
  { id: 'g4', bookie: 'Bwin', kind: 'refund', params: { stake: 100, refund: 100, minOdds: 1.7 }, conditions: 'Condiciones de ejemplo: reembolso de tu primera apuesta de hasta 100 € si pierde, a cuota mínima 1,70.', url: 'https://www.bwin.es', example: true },
  { id: 'g5', bookie: 'William Hill', kind: 'bet_get', params: { qualStake: 10, minOdds: 2, freebet: 30, freebetType: 'snr' }, conditions: 'Condiciones de ejemplo: apuesta 10 € a cuota 2,00 o más y recibe 30 € en apuestas gratis.', url: 'https://www.williamhill.es', example: true },
  { id: 'g6', bookie: 'Luckia', kind: 'rollover', params: { deposit: 100, bonus: 100, multiplier: 5, base: 'bonus', minOdds: 1.8 }, conditions: 'Condiciones de ejemplo: bono del 100 % hasta 100 € con rollover x5 a cuota mínima 1,80.', url: 'https://www.luckia.es', example: true },
  { id: 'g7', bookie: 'Retabet', kind: 'freebet', params: { freebet: 10, minOdds: 1.5, freebetType: 'snr' }, conditions: 'Condiciones de ejemplo: 10 € en apuesta gratis al verificar tu cuenta.', url: 'https://www.retabet.es', example: true },
  { id: 'g8', bookie: 'Winamax', kind: 'refund', params: { stake: 100, refund: 100, minOdds: 1.5 }, conditions: 'Condiciones de ejemplo: primera apuesta reembolsada hasta 100 € en dinero real si pierde.', url: 'https://www.winamax.es', example: true },
];

/** Promociones recurrentes. days: días de la semana (0 domingo … 6 sábado); vacío = siempre. */
export const DEFAULT_PROMOS = [
  { id: 'p1', bookie: 'Bet365', kind: 'boost', params: { stake: 10, boostedOdds: 3.2, layOdds: 2.9 }, schedule: 'Todos los días', days: [], conditions: 'Ejemplo: supercuota diaria en un partido destacado, apuesta máxima 10 €.', url: 'https://www.bet365.es', example: true },
  { id: 'p2', bookie: 'Codere', kind: 'bet_get', params: { qualStake: 20, minOdds: 1.8, freebet: 5, freebetType: 'snr' }, schedule: 'Cada lunes', days: [1], conditions: 'Ejemplo: apuesta 20 € el fin de semana y recibe 5 € el lunes.', url: 'https://www.codere.es', example: true },
  { id: 'p3', bookie: 'Sportium', kind: 'refund', params: { stake: 25, refund: 25, minOdds: 2 }, schedule: 'Martes y miércoles de Champions', days: [2, 3], conditions: 'Ejemplo: reembolso de hasta 25 € si tu apuesta a ganador del partido pierde.', url: 'https://www.sportium.es', example: true },
  { id: 'p4', bookie: 'Bwin', kind: 'freebet', params: { freebet: 5, minOdds: 1.5, freebetType: 'snr' }, schedule: 'Cada viernes', days: [5], conditions: 'Ejemplo: 5 € en apuesta gratis por apostar 25 € durante la semana.', url: 'https://www.bwin.es', example: true },
  { id: 'p5', bookie: 'Kirolbet', kind: 'boost', params: { stake: 20, boostedOdds: 2.5, layOdds: 2.3 }, schedule: 'Fines de semana de LaLiga', days: [6, 0], conditions: 'Ejemplo: cuota mejorada en el partido grande de la jornada.', url: 'https://www.kirolbet.es', example: true },
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
