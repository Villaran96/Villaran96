# Editor de vídeo con Remotion

Proyecto vertical 1080×1920 a 30 fps.

## Promo «Tarjeta NFC de reseñas» (`NfcPromo`)

Anuncio definitivo de 52,5 s en 8 escenas con la tarjeta real de Cierzo NFC modelada en 3D (Three.js), banda sonora sintetizada y sincronizada al fotograma. Todas las escenas empiezan en un pulso de la música (120 BPM).

| # | Escena | Archivo | Qué pasa |
|---|---|---|---|
| 1 | Gancho | `src/scenes/HookScene.tsx` | Texto cinético con glitch RGB y tachado sobre un campo 3D de tarjetas desenfocadas (`src/three/CardField.tsx`) |
| 2 | Pregunta | `src/scenes/QuestionScene.tsx` | Reloj que se dibuja, subrayado tipo marcador y tensión hasta el drop |
| 3 | Tarjeta 3D | `src/scenes/FilmScene.tsx` | Un solo espacio 3D: se enciende el foco, la tarjeta gira de canto a frente con reflejo en el suelo; después macros con cortes en cada compás (mensaje, G, chip NFC con ondas 3D, canto de acrílico) y plano héroe |
| 4 | Foto real | `src/scenes/PhotoScene.tsx` | Foto del producto con Ken Burns, inclinación 3D, marcas de encuadre y etiqueta «FOTO REAL» |
| 5 | Cómo funciona | `src/scenes/HowItWorksScene.tsx` | Tarjeta 3D sobre encimera de piedra (`src/three/TableCard.tsx`); el móvil toca exactamente el chip (proyección 3D→pantalla), ondas 3D, reseña, check y confeti |
| 6 | Resultados | `src/scenes/ResultsScene.tsx` | Notificaciones apiladas, contadores y gráfica (datos de ejemplo) |
| 7 | Ventajas | `src/scenes/FeaturesScene.tsx` | 4 diapositivas con iconos dibujados y transiciones wipe, flip y clock-wipe |
| 8 | Llamada a la acción | `src/scenes/CtaScene.tsx` | La tarjeta 3D baja girando y aterriza con reflejo; botón con pulso, logo de Cierzo NFC y fundido |

Uniones: push-cut, light leak (WebGL), whip-pan, recorte (`cropOut`: la escena se recorta en tarjeta redondeada y sale volando), iris, zoom punch y light leak.

### Cambiar textos

Los textos de cada escena están en `src/NfcPromo.tsx`. También se pueden editar desde Remotion Studio (`npm run dev`): cada escena tiene su propia composición en la carpeta **Escenas**.

### La tarjeta en 3D

- `src/three/stage.tsx`: modelo de la tarjeta (cuadrado redondeado extruido de 3 mm, acrílico con barniz, cara impresa y dorso espejado), reflejo en el suelo que se desvanece con la distancia, luces de estudio con contraluces de marca, entorno de reflejos generado en local y cámara controlada por fotograma. `SPOTS` marca los puntos del diseño que encuadran los macros.
- `public/tarjetas/diseno.jpg`: diseño de la cara frontal (cuadrado). Para otro diseño, sustituye la imagen (o pasa `frontImage` en la composición `NfcPromo`) y ajusta `SPOTS` si cambia la maquetación.
- `public/tarjetas/foto-real-hd.jpg`: foto real del producto. `public/tarjetas/logo-cierzo.png`: logo del cierre.

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
- Ese Chromium no tiene HTML-in-canvas, así que las transiciones de shader de `@remotion/transitions` no funcionan. Por eso `src/components/transitions.tsx` incluye whip-pan, zoom punch y recorte hechos en CSS.
- Three.js renderiza por software (sin GPU): el render completo tarda bastante más que un vídeo 2D.
- Las fuentes (Inter Tight e Instrument Serif) se sirven desde `public/fonts`, porque el navegador de render no pasa por el proxy.

## Transcripción con Whisper

`scripts/transcribe.sh` genera subtítulos por palabra con whisper.cpp. Necesita el modelo en `models/ggml-<modelo>.bin` (ver `scripts/get-model.sh`).
