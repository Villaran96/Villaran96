# Web de Cierzo NFC (venta al por mayor)

Página de venta de las tarjetas NFC de reseñas, hecha con el sistema de diseño de Cierzo NFC: tarjeta 3D interactiva (Three.js), vídeo promocional, ventajas, personalización, precios por volumen con calculadora, proceso de pedido, preguntas frecuentes y formulario de pedido.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `page.html` | La página (contenido, estilos y código). Es lo que se publica como vista previa en claude.ai. |
| `index.html` | La web lista para subir a tu dominio. Se genera desde `page.html`, no la edites a mano. |
| `config.js` | Formulario, enlaces de pago y política de privacidad. Es el único archivo que tienes que tocar para ponerla en marcha. |
| `assets/` | Diseño de la tarjeta, foto real, logo, vídeo (`promo.mp4`, versión ligera del anuncio), portada del vídeo e imagen para compartir (`og.jpg`). |
| `scripts/build.py` | Genera `index.html`. |
| `scripts/make-og.py` | Genera `assets/og.jpg`, la imagen que sale al compartir el enlace en WhatsApp o redes (requiere Pillow). |

## Ver la web en tu ordenador

```console
cd web
python3 -m http.server 8000
```

Abre http://localhost:8000. Hay que usar un servidor: si abres `index.html` con doble clic, el navegador bloquea la imagen de la tarjeta 3D y puede no verse.

## Ponerla en marcha

### 1. Recibir los pedidos del formulario

Sin configurar, el formulario no envía nada: muestra el resumen del pedido para copiarlo y lo dice claramente.

Con [Formspree](https://formspree.io) (tiene plan gratuito):

1. Crea una cuenta y un formulario nuevo.
2. Copia su dirección, del tipo `https://formspree.io/f/abcdwxyz`.
3. Pégala en `formEndpoint` dentro de `config.js`.

Cada pedido te llega por email con nombre, empresa, email, teléfono, tipo de cliente, cantidad, precio por tarjeta y un resumen listo para copiar. Vale cualquier servicio que acepte un POST en JSON.

### 2. Cobrar los packs online

Los botones «Comprar pack 25/50/100» llevan al formulario con esa cantidad. Si quieres cobro directo, crea un enlace de pago por pack con [Stripe Payment Links](https://stripe.com/es/payments/payment-links) y pégalos en `checkout` dentro de `config.js`:

| Pack | Importe sin IVA | Con IVA (21 %) |
|---|---|---|
| Pack 25 | 225 € | 272,25 € |
| Pack 50 | 350 € | 423,50 € |
| Pack 100 | 500 € | 605 € |

Como cada tarjeta lleva el diseño y el enlace del cliente, en Stripe añade un campo personalizado para que escriba el nombre del negocio y su enlace de Google, o escríbele tú después del pago.

### 3. Política de privacidad y textos legales

Una web que vende y recoge datos en España necesita, como mínimo: aviso legal (titular, NIF y domicilio), política de privacidad (RGPD) y condiciones de venta (plazos, envío, devoluciones). Cuando tengas la política de privacidad publicada, pon su dirección en `privacyUrl` dentro de `config.js` y aparecerá el enlace junto a la casilla del formulario.

La web carga la fuente Figtree desde Google Fonts. Si prefieres no enviar datos a Google, descarga la fuente, súbela a `assets/` y cambia el `<link>` de Google Fonts por un `@font-face`.

### 4. Subirla a internet

Sube la carpeta `web` entera (con `index.html`, `config.js` y `assets/`) a cualquier alojamiento estático:

- [Netlify Drop](https://app.netlify.com/drop): arrastra la carpeta y listo; luego conectas tu dominio.
- [Cloudflare Pages](https://pages.cloudflare.com) o [GitHub Pages](https://pages.github.com): gratis y con dominio propio.

Cuando sepas el dominio, regenera `index.html` con él para que la imagen al compartir funcione en todas las apps:

```console
python3 scripts/build.py --site https://tu-dominio.es
```

## Cambiar precios o textos

Los textos se editan en `page.html`. Después, regenera la web publicable:

```console
python3 scripts/build.py
```

Los precios están en varios sitios de `page.html` que deben coincidir:

- Las tres tarjetas de precio (`#precios`): precio por tarjeta y total del pack.
- La calculadora: `TIERS` (tramos) y `CUSTOM_FROM` (desde cuántas tarjetas el precio es a medida) en el script, y los botones de tramo (`.tier`).
- La pregunta «¿Cuál es el pedido mínimo?».
- `PRICES` en `scripts/build.py` (precio mínimo y máximo para Google).

## Cómo se han calculado los precios

Coste por tarjeta: 2 €. Diseño personalizado y programación incluidos en todos los tramos. Precios sin IVA.

| Tramo | Precio por tarjeta | Margen por tarjeta | Margen del pedido mínimo del tramo |
|---|---|---|---|
| 25 a 49 | 9 € | 7 € | 175 € (25 tarjetas) |
| 50 a 99 | 7 € | 5 € | 250 € (50 tarjetas) |
| 100 a 249 | 5 € | 3 € | 300 € (100 tarjetas) |
| 250 a 499 | 4 € | 2 € | 500 € (250 tarjetas) |
| 500 o más | A medida (máx. 4 €) | Lo decides tú | |

Los tramos bajos llevan más margen porque el trabajo de diseño y prueba es casi el mismo para 25 que para 500 tarjetas. El envío no está incluido: la web dice que el plazo y el envío se confirman antes de pagar.
