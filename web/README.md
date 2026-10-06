# Web de Cierzo NFC (venta al por mayor)

Página de producto al estilo Apple para las tarjetas NFC de reseñas. Fondo negro de escenario con la tarjeta en 3D (Three.js), bandas blancas y grises, titulares grandes y compra tipo tienda. Los colores salen del logo de Cierzo NFC (degradado de azul a verde) y los textos siguen las normas de tono de la marca.

## Qué hay en la página

| Sección | Qué hace |
|---|---|
| Escenario (`#inicio`) | La tarjeta en 3D cuenta el producto mientras haces scroll: inicio con el titular, giro, canto de 3 mm, despiece por capas (diseño, acrílico, chip NFC y adhesivo) y cierre de frente. |
| Frase | Un párrafo que se ilumina palabra a palabra con el scroll. |
| Cómo funciona | Tres pasos con un móvil que cambia de pantalla según el scroll: acercar el móvil, abrir la ficha y valorar con estrellas. |
| La tarjeta (`#detalles`) | Mosaicos con fotos de producto (macro del canto, encimera, foto real) y ventajas. |
| El anuncio | El vídeo en bucle y un botón para verlo a pantalla completa con sonido. |
| Personaliza | Configurador en 3D: 5 estilos, nombre del negocio y mensaje. La tarjeta gira al cambiar de estilo y se puede arrastrar. |
| Precios | Tres packs con su foto, la calculadora por tramos y el precio a medida desde 500 tarjetas. |
| Pedido | Compra en tres pasos (cantidad, personalización y datos) con resumen fijo y vista previa del diseño elegido. |
| Preguntas, cierre y pie | Preguntas frecuentes, llamada final y pie con notas, enlaces y la mención a Google. |

Si el navegador no tiene WebGL o no carga Three.js, la página sigue funcionando: la tarjeta se ve como imagen con el mismo recorrido y el configurador usa una vista previa plana.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `page.html` | La página (contenido, estilos y código). Es lo que se publica como vista previa en claude.ai. |
| `index.html` | La web lista para subir a tu dominio. Se genera desde `page.html`, no la edites a mano. |
| `config.js` | Formulario, enlaces de pago y política de privacidad. Es el único archivo que tienes que tocar para ponerla en marcha. |
| `assets/diseno.jpg` | Diseño de la cara de la tarjeta. Es la textura del modelo 3D y del estilo «Original». |
| `assets/edge.webp`, `assets/counter.webp`, `assets/stack-25/50/100.webp` | Fotos de producto renderizadas con el modelo 3D del proyecto de vídeo (ver abajo). |
| `assets/foto-real.jpg` | Foto real del producto. |
| `assets/logo-mark.png` | Símbolo del logo sin el texto, para la navegación, el cierre y el favicon. |
| `assets/promo.mp4`, `assets/promo-poster.jpg` | Versión ligera del anuncio y su portada. |
| `assets/og.jpg` | Imagen que sale al compartir el enlace en WhatsApp o redes. |
| `scripts/build.py` | Genera `index.html`. |
| `scripts/make-og.py` | Genera `assets/og.jpg` a partir de `scripts/og-card.png`, un fotograma de la tarjeta 3D de la propia web (requiere Pillow). |

### Fotos de producto

Se renderizan desde el proyecto de Remotion (`editor/src/web/WebStills.tsx`) y se pasan a WebP con Pillow:

```console
cd editor
npx remotion still WebEdge out/edge.png --image-format=png
npx remotion still WebCounter out/counter.png --image-format=png
npx remotion still WebStack out/stack-8.png --image-format=png --props='{"count":8}'
```

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

Cada pedido te llega por email con nombre, empresa, email, teléfono, tipo de cliente, cantidad, precio por tarjeta, estilo, mensaje, nombre del negocio y un resumen listo para copiar. Vale cualquier servicio que acepte un POST en JSON.

### 2. Cobrar los packs online

Los botones «Comprar» de cada pack llevan al formulario con esa cantidad. Si quieres cobro directo, crea un enlace de pago por pack con [Stripe Payment Links](https://stripe.com/es/payments/payment-links) y pégalos en `checkout` dentro de `config.js`:

| Pack | Importe sin IVA | Con IVA (21 %) |
|---|---|---|
| Pack 25 | 225 € | 272,25 € |
| Pack 50 | 350 € | 423,50 € |
| Pack 100 | 500 € | 605 € |

Como cada tarjeta lleva el diseño y el enlace del cliente, en Stripe añade un campo personalizado para que escriba el nombre del negocio y su enlace de Google, o escríbele tú después del pago.

### 3. Política de privacidad y textos legales

Una web que vende y recoge datos en España necesita, como mínimo: aviso legal (titular, NIF y domicilio), política de privacidad (RGPD) y condiciones de venta (plazos, envío, devoluciones). Cuando tengas la política de privacidad publicada, pon su dirección en `privacyUrl` dentro de `config.js` y aparecerá el enlace junto a la casilla del formulario y en el pie.

En iPhone, iPad y Mac la web usa la fuente del sistema (San Francisco). En el resto de dispositivos carga Inter desde Google Fonts. Si prefieres no enviar datos a Google, descarga Inter, súbela a `assets/` y cambia el `<link>` de Google Fonts por un `@font-face`.

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

- Las tres tarjetas de precio (`#precios`): precio por tarjeta, total del pack y la línea de ahorro.
- Las opciones del paso 1 del pedido (`#pedido`).
- La calculadora: `TIERS` (tramos) y `CUSTOM_FROM` (desde cuántas tarjetas el precio es a medida) en el script, y los tramos de la lista `#tiers`.
- El texto del escenario «Desde 4 € por tarjeta» y su nota al pie.
- La pregunta «¿Cuál es el pedido mínimo?».
- `PRICES` en `scripts/build.py` (precio mínimo y máximo para Google).

El recorrido de la tarjeta 3D está en `KF` (dentro del script de la página): cada fotograma clave dice en qué punto del scroll (`p`) está la tarjeta, dónde (`x`, `y`), a qué tamaño (`s`), cómo de separadas están las capas (`e`) y su giro (`rx`, `ry`, `rz`). Los textos del escenario aparecen según su atributo `data-film="inicio,fin"`.

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
