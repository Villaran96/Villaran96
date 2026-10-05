# Editor de vídeo con Remotion

Proyecto vertical 1080×1920 a 30 fps.

## Promo «Tarjeta NFC de reseñas» (`NfcPromo`)

Anuncio de 37 s en 7 escenas, con banda sonora sintetizada y sincronizada al fotograma.

| # | Escena | Archivo | Qué pasa |
|---|---|---|---|
| 1 | Gancho | `src/scenes/HookScene.tsx` | Texto cinético palabra a palabra, glitch RGB, tachado y vibración de cámara |
| 2 | Pregunta | `src/scenes/QuestionScene.tsx` | Reloj que se dibuja, subrayado tipo marcador y tensión creciente hasta el drop |
| 3 | Revelación | `src/scenes/RevealScene.tsx` | La tarjeta cae girando en 3D con motion blur, rebota, recibe un reflejo especular y el título entra letra a letra |
| 4 | Cómo funciona | `src/scenes/HowItWorksScene.tsx` | El móvil toca la tarjeta (ondas NFC), se abre la reseña, se rellenan 5 estrellas, se escribe el texto, check y confeti |
| 5 | Resultados | `src/scenes/ResultsScene.tsx` | Notificaciones que se apilan, contadores y gráfica con línea de tendencia (datos de ejemplo) |
| 6 | Ventajas | `src/scenes/FeaturesScene.tsx` | 4 diapositivas con iconos dibujados y transiciones wipe, flip y clock-wipe |
| 7 | Llamada a la acción | `src/scenes/CtaScene.tsx` | La tarjeta gira 2,5 vueltas, botón con pulso y brillo, fundido a negro |

Uniones entre escenas: push-cut, light leak (WebGL), whip-pan, iris, zoom punch y light leak.

### Cambiar textos

Los textos de cada escena están en `src/NfcPromo.tsx`. También se pueden editar desde Remotion Studio (`npm run dev`): cada escena tiene su propia composición en la carpeta **Escenas**.

### Usar fotos reales de la tarjeta

1. Copia la foto del frente de la tarjeta a `public/tarjetas/frente.png` (horizontal, proporción 85,6 × 54 mm, idealmente sin fondo).
2. En `src/Root.tsx`, en la composición `NfcPromo`, cambia `frontImage: ""` por `frontImage: "tarjetas/frente.png"` y `businessName` por el nombre del negocio.

La foto sustituye al diseño generado en las escenas 3, 4 y 7, y mantiene el 3D, el grosor y los reflejos.

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
