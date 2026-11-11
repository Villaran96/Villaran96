// Contrato del plan Método. La web y el servidor generan exactamente el mismo
// texto a partir de los mismos datos: el servidor comprueba que la huella SHA-256
// que firma el cliente corresponde al texto que se le enseñó.
//
// PLANTILLA: revísala con un abogado antes de usarla con clientes reales.

export const CONTRACT_VERSION = '1.0';

const PENDING = '[pendiente]';
const val = (x) => (x && String(x).trim() ? String(x).trim() : PENDING);

const longDate = (d) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(d));
const eur = (x) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(x) || 0);

/** Datos que entran en el contrato, con marcadores visibles si falta alguno. */
export function contractData({ site = {}, signer = {}, plan = {}, date = new Date() }) {
  const interval = plan.interval === 'year' ? 'al año' : plan.interval === 'once' ? 'en un único pago' : 'al mes';
  return {
    brand: val(site.brand || 'Contrapeso'),
    legalName: val(site.legalName),
    nif: val(site.nif),
    address: val(site.address),
    email: val(site.email),
    signerName: val(signer.name),
    signerDni: val(signer.dni && String(signer.dni).toUpperCase()),
    signerAddress: val(signer.address),
    signerEmail: val(signer.email),
    price: `${eur(plan.price)} ${interval}, impuestos incluidos`,
    seats: Number(plan.seats) > 0 ? String(plan.seats) : 'limitado',
    renews: plan.interval !== 'once',
    date: longDate(date),
    version: CONTRACT_VERSION,
  };
}

export function contractSections(d) {
  return [
    {
      title: '1. Partes',
      paras: [
        `De una parte, ${d.legalName}, con NIF ${d.nif} y domicilio en ${d.address}, titular de ${d.brand} (en adelante, «el prestador»). Correo de contacto: ${d.email}.`,
        `De otra parte, ${d.signerName}, con DNI/NIE ${d.signerDni}, domicilio en ${d.signerAddress} y correo electrónico ${d.signerEmail} (en adelante, «el cliente»).`,
      ],
    },
    {
      title: '2. Objeto',
      paras: [
        `El presente contrato regula el acceso del cliente al programa «Método» de ${d.brand}: contenidos formativos sobre apuestas cubiertas (matched betting) con operadores de juego con licencia en España, organización personal, y obligaciones fiscales de las ganancias del juego, junto con las herramientas de la plataforma incluidas en el plan.`,
      ],
    },
    {
      title: '3. Naturaleza formativa del servicio',
      paras: [
        'Los contenidos tienen carácter exclusivamente formativo e informativo y explican la normativa con carácter general. No constituyen asesoramiento fiscal, legal ni financiero personalizado y no sustituyen la consulta con un profesional colegiado o un asesor fiscal.',
        'El cliente es el único responsable de sus apuestas, de cumplir las condiciones de cada operador y de presentar correctamente sus declaraciones tributarias.',
        'El prestador no garantiza ningún resultado económico. Las promociones dependen de los operadores, que pueden modificarlas, retirarlas o limitar las cuentas en cualquier momento.',
      ],
    },
    {
      title: '4. Requisitos y compromisos del cliente',
      paras: [
        'El cliente declara ser mayor de 18 años, no estar inscrito en el Registro General de Interdicciones de Acceso al Juego (RGIAJ) y utilizar únicamente operadores con licencia de la Dirección General de Ordenación del Juego.',
        'El cliente se compromete a jugar de forma responsable. Puede encontrar ayuda en jugarbien.es.',
      ],
    },
    {
      title: '5. Precio, pago y plazas',
      paras: [
        `El precio del Método es de ${d.price}. El pago se realiza con tarjeta a través de Stripe, que procesa los datos de pago; el prestador no guarda los datos de la tarjeta.`,
        d.renews
          ? 'La suscripción se renueva automáticamente en cada periodo hasta que el cliente la cancele desde su cuenta. La cancelación tiene efecto al final del periodo ya pagado.'
          : 'El pago único da acceso durante el periodo indicado en la oferta.',
        `El número de plazas del Método es ${d.seats}. La plaza se asigna al completar la firma de este contrato y el primer pago.`,
      ],
    },
    {
      title: '6. Derecho de desistimiento',
      paras: [
        'El cliente, como consumidor, dispone de 14 días naturales desde la contratación para desistir sin necesidad de justificación (artículo 102 del texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios).',
        'Al firmar, el cliente solicita expresamente el acceso inmediato a los contenidos digitales y reconoce que pierde el derecho de desistimiento en cuanto comience ese acceso (artículo 103.m de la misma ley).',
      ],
    },
    {
      title: '7. Uso personal, confidencialidad y propiedad intelectual',
      paras: [
        'El acceso es personal e intransferible. El cliente no puede compartir su cuenta ni copiar, grabar, publicar, revender o difundir los contenidos, total o parcialmente, sin autorización por escrito del prestador.',
        `Todos los contenidos son propiedad de ${d.legalName} o de sus licenciantes. El incumplimiento de esta cláusula permite al prestador cancelar el acceso sin reembolso, sin perjuicio de reclamar los daños causados.`,
      ],
    },
    {
      title: '8. Responsabilidad',
      paras: [
        'El prestador no responde de las decisiones de los operadores, de errores al realizar apuestas, de cambios de cuotas ni de las consecuencias tributarias de las decisiones del cliente.',
        'En todo caso, la responsabilidad del prestador se limita a las cantidades pagadas por el cliente en los doce meses anteriores al hecho que la origine, salvo dolo o culpa grave.',
      ],
    },
    {
      title: '9. Duración y baja',
      paras: [
        'El contrato está vigente mientras la suscripción esté activa. Cualquiera de las partes puede resolverlo por incumplimiento de la otra, comunicándolo por correo electrónico.',
      ],
    },
    {
      title: '10. Protección de datos',
      paras: [
        `El responsable del tratamiento es ${d.legalName}. Los datos del cliente se tratan para gestionar este contrato y el acceso a la plataforma, con base en la ejecución del contrato, y se conservan mientras dure la relación y durante los plazos legales.`,
        `El cliente puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${d.email}, y reclamar ante la Agencia Española de Protección de Datos (aepd.es).`,
      ],
    },
    {
      title: '11. Firma electrónica',
      paras: [
        'El cliente firma este contrato por medios electrónicos. Como prueba, la plataforma registra su nombre, documento de identidad, fecha y hora, dirección IP, navegador, la huella SHA-256 de este texto y, en su caso, la firma manuscrita trazada en pantalla. Las partes reconocen la validez de esta firma electrónica conforme al Reglamento (UE) 910/2014 y a la Ley 6/2020.',
      ],
    },
    {
      title: '12. Ley aplicable y jurisdicción',
      paras: [
        'Este contrato se rige por la ley española. Para cualquier controversia serán competentes los juzgados y tribunales del domicilio del cliente.',
      ],
    },
  ];
}

export function contractTitle(d) {
  return `Contrato de acceso al programa Método de ${d.brand} · versión ${d.version}`;
}

/** Texto plano canónico (el que se firma y del que se calcula la huella). */
export function contractText(d) {
  const body = contractSections(d).map((s) => `${s.title}\n${s.paras.join('\n')}`).join('\n\n');
  return `${contractTitle(d)}\nFecha: ${d.date}\n\n${body}\n`;
}

export function contractHTML(d, esc) {
  return `<h2>${esc(contractTitle(d))}</h2><p class="muted">Fecha: ${esc(d.date)}</p>${contractSections(d).map((s) => `<h3>${esc(s.title)}</h3>${s.paras.map((p) => `<p>${esc(p)}</p>`).join('')}`).join('')}`;
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comprueba la letra de un DNI o NIE español. */
export function validDni(value) {
  const s = String(value || '').toUpperCase().replace(/[\s-]/g, '');
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(s);
  if (!m) return false;
  const [, prefix, digits, letter] = m;
  if (prefix && digits.length !== 7) return false;
  if (!prefix && digits.length !== 8) return false;
  const num = Number(`${prefix ? 'XYZ'.indexOf(prefix) : ''}${digits}`);
  return 'TRWAGMYFPDXBNJZSQVHLCKE'[num % 23] === letter;
}
