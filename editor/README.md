# Editor de vídeo con Remotion

Proyecto vertical 1080×1920 a 30 fps.

## Promo «Tarjeta NFC de reseñas» (`NfcPromo`)

Anuncio de 51,5 s en 9 escenas con la tarjeta real de Cierzo NFC, banda sonora sintetizada y sincronizada al fotograma.

| # | Escena | Archivo | Qué pasa |
|---|---|---|---|
| 1 | Gancho | `src/scenes/HookScene.tsx` | Texto cinético palabra a palabra, glitch RGB, tachado y vibración de cámara |
| 2 | Pregunta | `src/scenes/QuestionScene.tsx` | Reloj que se dibuja, subrayado tipo marcador y tensión creciente hasta el drop |
| 3 | Revelación | `src/scenes/RevealScene.tsx` | La tarjeta aparece de canto y gira hasta quedar de frente, con reflejo especular y reflejo en el suelo; título letra a letra |
| 4 | Detalles | `src/scenes/DetailsScene.tsx` | Recorrido macro con cámara continua: mensaje y estrellas, logo, chip NFC (con ondas) y canto de acrílico |
| 5 | Foto real | `src/scenes/PhotoScene.tsx` | La foto del producto con Ken Burns, inclinación 3D suave, marcas de encuadre y etiqueta «FOTO REAL» |
| 6 | Cómo funciona | `src/scenes/HowItWorksScene.tsx` | El móvil toca la tarjeta (ondas NFC), se abre la reseña, 5 estrellas, texto, check y confeti |
| 7 | Resultados | `src/scenes/ResultsScene.tsx` | Notificaciones apiladas, contadores y gráfica con línea de tendencia (datos de ejemplo) |
| 8 | Ventajas | `src/scenes/FeaturesScene.tsx` | 4 diapositivas con iconos dibujados y transiciones wipe, flip y clock-wipe |
| 9 | Llamada a la acción | `src/scenes/CtaScene.tsx` | Giro de 360° suave, botón con pulso y brillo, logo de Cierzo NFC y fundido a negro |

Uniones: push-cut, light leak (WebGL), fundido con encuadre idéntico (sin corte visible), whip-pan, slide, iris, zoom punch y light leak.

### Cambiar textos

Los textos de cada escena están en `src/NfcPromo.tsx`. También se pueden editar desde Remotion Studio (`npm run dev`): cada escena tiene su propia composición en la carpeta **Escenas**.

### La tarjeta

- `public/tarjetas/diseno.jpg`: diseño de la cara frontal (cuadrado; escalado ×2 con Lanczos para los zooms macro).
- `public/tarjetas/foto-real-hd.jpg`: foto real del producto (escena 5).
- `public/tarjetas/logo-cierzo.png`: logo recortado del diseño (cierre).
- `src/components/NfcCard.tsx` dibuja la tarjeta en 3D: canto de acrílico con grosor, sombreado según el ángulo, reflejo especular y cara trasera con la impresión vista a través del acrílico. `CARD_SPOTS` marca los puntos del diseño que encuadra la cámara en la escena de detalles.

Para otro diseño, sustituye `diseno.jpg` por una imagen cuadrada (o pasa `frontImage` en la composición `NfcPromo`) y, si cambia la maquetación, ajusta `CARD_SPOTS`.

### Tiempos y sonido

- `src/timeline.json` es la única fuente de tiempos: duración de escenas, transiciones y cada evento (palabras, toque NFC, estrellas, notificaciones…).
- `scripts/make-audio.py` lee ese archivo y sintetiza música (120 BPM, Am–F–C–G) y efectos, alineados al fotograma. Si cambias un tiempo, regenera el audio:

```console
python3 scripts/make-audio.py      # requiere numpy y scipy
```

### Renderizar

```console
npx remotion render NfcPromo out/nfc-promo.mp4 --concurrency=4 --crf=18
```

Para revisar fotogramas sueltos en una hoja de contactos (requiere Pillow):

```console
node scripts/stills.mjs hoja.png NfcPromo:200 NfcPromo:500 Reveal:40
```

### Notas del entorno

- `remotion.config.ts` usa el `headless_shell` de Chromium del sistema y WebGL por software (`angle`).
- Ese Chromium no tiene HTML-in-canvas, así que las transiciones de shader de `@remotion/transitions` no funcionan. Por eso `src/components/transitions.tsx` incluye whip-pan y zoom punch hechos en CSS.
- Las fuentes (Inter Tight e Instrument Serif) se sirven desde `public/fonts`, porque el navegador de render no pasa por el proxy.

## Transcripción con Whisper

`scripts/transcribe.sh` genera subtítulos por palabra con whisper.cpp. Necesita el modelo en `models/ggml-<modelo>.bin` (ver `scripts/get-model.sh`).
