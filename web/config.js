/* Configuración de la web publicada (index.html). Rellena lo que tengas; lo vacío se queda como está.

   formEndpoint  URL que recibe los pedidos del formulario por POST en JSON.
                 Ejemplo con Formspree: "https://formspree.io/f/abcdwxyz"
                 Vacío: el formulario muestra el resumen del pedido para copiarlo, pero no lo envía.

   checkout      Enlaces de pago de cada pack (por ejemplo, Stripe Payment Links).
                 Vacío: el botón «Comprar pack» lleva al formulario con esa cantidad.

   privacyUrl    Dirección de tu política de privacidad. Si la pones, aparece el enlace
                 junto a la casilla de aceptación del formulario. */
window.CIERZO_CONFIG = {
  formEndpoint: "",
  checkout: {
    pack25: "",
    pack50: "",
    pack100: ""
  },
  privacyUrl: ""
};
