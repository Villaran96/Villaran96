// Textos legales: aviso legal, privacidad, cookies, condiciones de contratación y
// juego responsable. Se rellenan con los datos de la empresa (Admin → Empresa).
// PLANTILLAS: revísalas con un abogado antes de vender.

import {
  route, pageHead, site, brand, plans, priceLabel, isAdmin,
} from '../core.js';
import { esc, icon } from '../util.js';
import { PLAN_ORDER } from '../plans.js';

const v = (x, label) => (x && String(x).trim() ? esc(x) : `<span class="pending">[pendiente: ${esc(label)}]</span>`);

function notice() {
  const s = site();
  const missing = !(s.legalName && s.nif && s.address && s.email);
  if (!missing && s.contractReviewed) return '';
  return `<div class="banner banner-warn">${icon('info', 16)}<span>${missing ? 'Faltan datos de la empresa. ' : ''}Este texto es una plantilla: revísalo con un abogado antes de publicar la web.</span>${isAdmin() ? '<a class="btn btn-ghost btn-sm" href="#admin" data-act="admin-tab" data-tab="empresa">Completar datos</a>' : ''}</div>`;
}

function page(title, sections) {
  return `${pageHead(title, `Última actualización: noviembre de 2026`)}${notice()}
  <article class="panel prose legal">${sections.map(([h, body]) => `<h3>${h}</h3>${body}`).join('')}</article>`;
}

function aviso() {
  const s = site();
  return page('Aviso legal', [
    ['Titular de la web', `<p>En cumplimiento de la Ley 34/2002 de servicios de la sociedad de la información (LSSI), te informamos de que esta web, ${esc(brand())}, es de ${v(s.legalName, 'razón social')}, con NIF ${v(s.nif, 'NIF')} y domicilio en ${v(s.address, 'domicilio')}. Puedes escribirnos a ${v(s.email, 'correo de contacto')}.</p>`],
    ['Qué ofrecemos', `<p>${esc(brand())} es una herramienta y un programa formativo sobre apuestas cubiertas (matched betting) con operadores de juego con licencia en España. No somos un operador de juego: no aceptamos apuestas ni gestionamos dinero de los usuarios.</p>`],
    ['Uso de la web', '<p>La web es solo para mayores de 18 años. Te comprometes a usarla de acuerdo con la ley y con estas condiciones, y a no compartir tu cuenta ni los contenidos de pago.</p>'],
    ['Propiedad intelectual', `<p>Los textos, el diseño, el código y las herramientas son propiedad de ${v(s.legalName, 'razón social')} o de sus licenciantes. No puedes copiarlos ni difundirlos sin autorización por escrito.</p>`],
    ['Responsabilidad', '<p>Los cálculos se basan en las cuotas que dan las fuentes de datos y en lo que escribes; comprueba siempre las cuotas en la casa y en el exchange antes de apostar. Los contenidos son formativos y no son asesoramiento fiscal, legal ni financiero personalizado. No garantizamos ningún resultado económico.</p>'],
    ['Juego responsable', '<p>Solo para mayores de 18 años. Si el juego te genera problemas, pide ayuda en <a href="https://www.jugarbien.es" target="_blank" rel="noopener">jugarbien.es</a>.</p>'],
    ['Ley aplicable', '<p>Se aplica la ley española. Si eres consumidor, son competentes los juzgados de tu domicilio.</p>'],
  ]);
}

function privacidad() {
  const s = site();
  return page('Política de privacidad', [
    ['Responsable', `<p>${v(s.legalName, 'razón social')} (NIF ${v(s.nif, 'NIF')}), ${v(s.address, 'domicilio')}. Contacto: ${v(s.email, 'correo de contacto')}.</p>`],
    ['Qué datos tratamos y para qué', `<ul>
      <li><b>Cuenta:</b> nombre, correo y contraseña (guardada cifrada), para darte acceso.</li>
      <li><b>Tu actividad en la herramienta:</b> bonos, operaciones y preferencias que guardas, para que los veas en cualquier dispositivo.</li>
      <li><b>Pagos:</b> los gestiona Stripe. Nosotros solo recibimos el estado de tu suscripción y un identificador de cliente; nunca los datos de tu tarjeta.</li>
      <li><b>Contrato del Método:</b> nombre, DNI o NIE, domicilio, firma, fecha y hora, IP y navegador, como prueba de la firma.</li>
      <li><b>Correos:</b> te escribimos para el funcionamiento del servicio (bienvenida, contraseña, contrato, pagos).</li>
    </ul>`],
    ['Base legal', '<p>La ejecución del contrato que aceptas al registrarte o suscribirte, el cumplimiento de obligaciones legales (por ejemplo, fiscales y de conservación de contratos) y, cuando corresponda, tu consentimiento.</p>'],
    ['Con quién los compartimos', '<p>Con los proveedores que necesitamos para dar el servicio, como encargados del tratamiento: el alojamiento de la web, Stripe (pagos) y el servicio de envío de correo. Algunos pueden tratar datos fuera del Espacio Económico Europeo con las garantías del Reglamento General de Protección de Datos, como el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo.</p>'],
    ['Cuánto tiempo', '<p>Mientras tengas la cuenta. Después, solo lo que exija la ley: por ejemplo, las facturas y los contratos firmados durante los plazos legales de prescripción.</p>'],
    ['Tus derechos', `<p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a ${v(s.email, 'correo de contacto')}. Puedes borrar tu cuenta tú mismo desde Cuenta. Si crees que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).</p>`],
  ]);
}

function cookies() {
  return page('Política de cookies', [
    ['Qué usamos', `<ul>
      <li><b>Cookie de sesión (cp_session):</b> técnica y necesaria para mantenerte dentro de tu cuenta. Caduca a los 30 días o al cerrar sesión.</li>
      <li><b>Almacenamiento local del navegador:</b> guarda tus preferencias y tus datos de trabajo (filtros, bonos, operaciones) en tu propio dispositivo.</li>
    </ul>
    <p>No usamos cookies de publicidad ni de analítica de terceros. Por eso no te pedimos consentimiento: las cookies técnicas necesarias para el servicio están exentas.</p>`],
    ['Tipografías', '<p>Las tipografías de la web se cargan desde Google Fonts, lo que hace que tu navegador se conecte a servidores de Google. Si prefieres evitarlo, el titular puede alojarlas en el propio servidor.</p>'],
    ['Cómo borrarlas', '<p>Puedes borrar las cookies y el almacenamiento local desde la configuración de tu navegador. Si borras la cookie de sesión tendrás que volver a entrar.</p>'],
  ]);
}

function condiciones() {
  const s = site();
  const p = plans();
  return page('Condiciones de contratación', [
    ['El servicio', `<p>${esc(brand())} ofrece herramientas (oddsmatcher, calculadoras, seguimiento) y contenidos formativos sobre apuestas cubiertas. Los planes y lo que incluye cada uno están en la página de Planes.</p>`],
    ['Precios', `<ul>${PLAN_ORDER.filter((id) => p[id].price > 0).map((id) => `<li><b>${esc(p[id].name)}:</b> ${esc(priceLabel(p[id]))}, impuestos incluidos.${p[id].trialDays ? ` Incluye ${p[id].trialDays} días de prueba la primera vez.` : ''}</li>`).join('')}</ul>`],
    ['Pago, renovación y cancelación', '<p>El pago se hace con tarjeta a través de Stripe. Las suscripciones se renuevan automáticamente al final de cada periodo hasta que las canceles desde Cuenta → Gestionar pago. Al cancelar mantienes el acceso hasta el final del periodo pagado. Si cancelas durante la prueba gratuita, no se te cobra nada.</p>'],
    ['Derecho de desistimiento', `<p>Tienes 14 días naturales desde la contratación para desistir escribiendo a ${v(s.email, 'correo de contacto')}. Si ya has empezado a usar el servicio, te devolveremos el importe descontando la parte proporcional del tiempo usado. El plan ${esc(p.metodo.name)} tiene condiciones propias que se recogen en su contrato.</p>`],
    ['Plan Método', `<p>El plan ${esc(p.metodo.name)} tiene plazas limitadas y se contrata firmando un contrato online, que recibirás por correo. En caso de diferencia, prevalece lo que diga ese contrato.</p>`],
    ['Uso de la cuenta', '<p>La cuenta es personal. Tienes que ser mayor de 18 años y no puedes compartir tu acceso ni los contenidos de pago. Si lo haces, podemos cancelar tu cuenta.</p>'],
    ['Sin garantía de resultados', '<p>Las promociones dependen de cada operador, que puede cambiarlas, retirarlas o limitar tu cuenta. No garantizamos ninguna ganancia. Los contenidos no son asesoramiento fiscal personalizado.</p>'],
    ['Reclamaciones', `<p>Escríbenos a ${v(s.email, 'correo de contacto')}. También puedes acudir a los servicios de consumo de tu comunidad autónoma.</p>`],
    ['Ley aplicable', '<p>Se aplica la ley española. Si eres consumidor, son competentes los juzgados de tu domicilio.</p>'],
  ]);
}

function juego() {
  return page('Juego responsable', [
    ['Una cuenta de números', '<p>El matched betting consiste en cubrir apuestas para convertir promociones en dinero sin depender del resultado. Si alguna vez te ves apostando para recuperar pérdidas, sin cubrir o con dinero que necesitas para otras cosas, para.</p>'],
    ['Señales de alarma', `<ul>
      <li>Apuestas sin cubrir «porque esta vez lo ves claro».</li>
      <li>Piensas en apuestas a todas horas o te cuesta parar.</li>
      <li>Escondes a tu entorno lo que haces o lo que pierdes.</li>
      <li>Usas dinero que necesitas para vivir.</li>
    </ul>`],
    ['Herramientas que tienes', '<ul><li>Límites de depósito en cada casa.</li><li>Autoexclusión en una casa concreta.</li><li>Inscripción en el Registro General de Interdicciones de Acceso al Juego (RGIAJ) para no poder jugar en ninguna casa con licencia en España.</li></ul>'],
    ['Dónde pedir ayuda', '<p>En <a href="https://www.jugarbien.es" target="_blank" rel="noopener">jugarbien.es</a>, la web de juego responsable de la Dirección General de Ordenación del Juego, encontrarás información, test de autoevaluación y recursos de ayuda cerca de ti.</p>'],
  ]);
}

route('aviso-legal', { render: aviso });
route('privacidad', { render: privacidad });
route('cookies', { render: cookies });
route('condiciones', { render: condiciones });
route('juego-responsable', { render: juego });
