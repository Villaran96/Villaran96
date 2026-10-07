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

## Anuncio en motion graphics (`MotionPromo`)

Anuncio de 34 s en estilo motion graphics plano, hecho solo a partir de la foto de la tarjeta (`public/motion/tarjeta.png`): sus cuatro colores, las ondas de las esquinas, las estrellas y el icono NFC.

| # | Escena | Archivo | Qué pasa |
|---|---|---|---|
| 1 | 5 estrellas | `src/motion/scenes/MgHook.tsx` | Cuatro bolas de color chocan, sale una estrella que se reparte en cinco y el texto «Tu negocio merece 5 estrellas» con rotulador |
| 2 | El problema | `src/motion/scenes/MgProblem.tsx` | Fondo oscuro: las estrellas pierden el color y se caen; un bocadillo escribe y se desinfla |
| 3 | La tarjeta | `src/motion/scenes/MgReveal.tsx` | Cortinilla de ondas de colores, la tarjeta entra con una pila de color detrás y se voltea para enseñar el chip NFC |
| 4 | Cómo funciona | `src/motion/scenes/MgHow.tsx` | Un móvil plano toca la tarjeta, salen ondas NFC, se rellenan las estrellas y un check verde cubre la pantalla |
| 5 | Ventajas | `src/motion/scenes/MgBenefits.tsx` | Cuatro paneles de color con iconos que se dibujan y una rejilla 2 × 2 que se recoge en cuatro puntos |
| 6 | Cierre | `src/motion/scenes/MgCta.tsx` | Los puntos giran y se convierten en la tarjeta; «Un toque. Una reseña.», logo y botón |

- Tiempos: `src/motion/timeline.json` (120 BPM, cada escena empieza en un compás). Las piezas comunes (estrellas, ondas, trazos, móvil plano, cortinillas) están en `src/motion/kit.tsx`.
- Música y efectos: `python3 scripts/make-motion-audio.py` genera `public/audio/motion-promo.wav` a partir de la misma línea de tiempo.

```console
npx remotion render MotionPromo out/motion-promo.mp4 --concurrency=4 --crf=18
```

## Tres estilos más

Cada uno con su guion, formato, música y efectos propios (sintetizados con `scripts/synth.py`).

| Composición | Formato | Estilo | Archivos | Música |
|---|---|---|---|---|
| `ArcadePromo` | 1080 × 1920, 27 s | Videojuego de 8 bits: pantalla de título, nivel sin tarjeta, cofre con la tarjeta, nivel con combo de reseñas, «nivel superado» y «¿continuar?». Todo se dibuja en un lienzo de 180 × 320 píxeles con fuente propia de 5 × 7 (con tildes y eñe). | `src/arcade/` | Chiptune a 150 BPM: `python3 scripts/make-arcade-audio.py` |
| `EditorialPromo` | 1920 × 1080, 24 s | Revista suiza en blanco y negro, «Manual de las cinco estrellas»: retícula de 12 columnas, números gigantes, recortes de la foto de la tarjeta como único color y cierre en negativo. | `src/editorial/` | Minimal house a 120 BPM: `python3 scripts/make-editorial-audio.py` |
| `IsoPromo` | 1080 × 1080, 21 s | Diorama isométrico low-poly (Three.js, sombreado *toon*): una cafetería en una isla flotante de 8:00 a 22:00; cada cliente toca la tarjeta y una estrella vuela al cartel. | `src/iso/` | Lo-fi a 90 BPM con vinilo, pájaros y grillos: `python3 scripts/make-iso-audio.py` |

```console
npx remotion render ArcadePromo out/arcade-promo.mp4 --concurrency=4 --crf=18
npx remotion render EditorialPromo out/editorial-promo.mp4 --concurrency=4 --crf=18
npx remotion render IsoPromo out/iso-promo.mp4 --concurrency=4 --crf=18
```

## Transcripción con Whisper

`scripts/transcribe.sh` genera subtítulos por palabra con whisper.cpp. Necesita el modelo en `models/ggml-<modelo>.bin` (ver `scripts/get-model.sh`).
