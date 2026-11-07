---
name: niche-reels
description: Producir vídeos animados verticales con voz y subtítulos para canales de un solo nicho (YouTube Shorts, TikTok, Reels). Dado un nicho, planifica la serie, escribe guiones con datos verificados, genera la voz, anima las escenas con el kit de Remotion, sincroniza los subtítulos, se revisa a sí mismo y entrega MP4 + título/descripción. Usar cuando el usuario diga un nicho («hazme vídeos de misterios del océano»), pida «el vídeo de X» o una tanda de vídeos para un canal.
---

Este es el trabajo que enseña el vídeo de referencia del usuario, hecho de principio a fin sin intervención:
**guion → voz → escenas animadas → subtítulos sincronizados → revisión propia → arreglos → listo para subir.**
Todo corre en local (sin APIs de pago): Piper (voz) + Whisper (tiempos) + Remotion (animación y render).

## Preparación (una vez por entorno)

```console
cd editor
npm ci
npm run explainer:setup     # .venv con piper-tts y faster-whisper + efectos y música ambiental
```

Comprueba que `ffmpeg`, `node` y Chromium (`/opt/pw-browsers/chromium_headless_shell-*`) existen. `remotion.config.ts` localiza el navegador solo.

## Flujo por nicho

### 1. Biblia del canal (`editor/niches/<nicho>.md`, una sola vez)

Define y guarda: nombre del canal y promesa en una frase · público · tono · paleta y color de acento · ambiente musical (`deep`, `space`, `mystery`, `lofi`) · voz y velocidad (`es_ES-davefx-medium`, `speed` ~1.05) · fórmula de vídeo (qué estructura se repite) · **30 ideas de vídeo** con título provisional, ordenadas, para publicar **uno al día, cada uno distinto**. El canal de un solo nicho es lo que enseña el vídeo: coherencia total de tema y estética, variedad total de contenido.

### 2. Cada vídeo (slug `<nicho>-NN`, p. ej. `oceano-02`)

1. **Investiga antes de escribir** (WebSearch si el tema son hechos, ciencia, historia, dinero, salud…). Anota fuente y fecha de cada cifra. Si un dato no es sólido, se matiza («cerca de», «según…») o se descarta. **Nunca inventes cifras ni citas.** La ficción se presenta como ficción.
2. **Guion** (35–55 s, 100–150 palabras, ritmo ~2,6–3,2 palabras/s):
   - Gancho en los primeros 2 s: una afirmación sorprendente o una pregunta, nunca «hola, bienvenidos».
   - Una sola idea por vídeo, con progresión: gancho → 4–6 beats → remate.
   - Frases de ≤ 14 palabras. Cifras concretas. 1–2 `*palabras clave*` por escena (salen en el color de acento).
   - Cierre que invite a seguir el canal y enlace con el siguiente vídeo («mañana, más profundo»).
3. **`public/story/<slug>/script.json`**: `meta` (canal, episodio, acento, voz, música, `pronounce` para lo que la voz lea mal: siglas, nombres propios en inglés…) y una escena por beat con `narration`, `scene`, `props` y `sfx`. Ejemplo completo: `public/story/oceano-01/script.json`.
4. **Escenas**: en `src/story/scenes/<nicho>.tsx`, compuestas con el kit (`src/story/kit/`). Registra cada una en `src/story/scenes/index.ts`. Cada escena recibe `{ t, g, dur, cue(n), props }`: `cue(n)` da el segundo en que se dice la palabra n, para sincronizar cada elemento con la voz.
5. **Voz y render** con un solo comando:
   ```console
   npm run video -- story <slug>
   ```
   Hace voz + tiempos → render → `ffprobe` → volumen medio → `out/<slug>.mp4` y `out/<slug>-hoja.png`.
6. **Revisión propia (obligatoria, no se entrega sin hacerla):** abre la hoja con un fotograma por escena y para cada escena comprueba: ¿se lee el texto? ¿algo se solapa con el HUD o con los subtítulos? ¿algo sale del encuadre? ¿la cifra de pantalla coincide con lo que se dice? ¿el movimiento tiene sentido? Para ver instantes concretos de un vídeo: `PROPS='{"slug":"<slug>"}' node scripts/stills.mjs out/x.png Story:<fotograma> Story:<otro>` (una hoja de contactos), o `npx remotion still Story out/x.png --frame=N --props='{"slug":"<slug>"}'` a tamaño completo. Corrige y vuelve a renderizar hasta que esté limpio.
7. **Entrega**: MP4 + `out/<slug>.md` con título (≤ 60 caracteres, con la palabra clave al principio), descripción de 2–3 líneas, 3–5 hashtags, texto de la miniatura y la fuente de cada dato.

### 3. Tandas (una serie de vídeos de un nicho)

Un vídeo por cada idea de la biblia. **Varía de verdad**: gancho distinto, escenas distintas, ritmo distinto, no solo cambiar el texto de la misma plantilla. Si un vídeo necesita un elemento visual que el kit no tiene (un animal, un edificio, un planeta con anillos, una gráfica), créalo en `src/story/kit/` en vez de forzar uno que no encaja, y revisa el resultado con `StoryKit` (composición de catálogo del kit).


## Voz de producción (no usar Piper para publicar)

Piper (la voz por defecto de `build-voice.py`) es sólo para borradores: entona la mitad que un locutor real (variación de tono σ ≈ 2,8 semitonos frente a ≈ 5,4) y suena sin vida. Para publicar:

1. **Elegir voz midiendo, no a ojo.** `scripts/explainer/voice-metrics.py referencia.wav candidata1.mp3 …` compara tono medio, variación y rango. Con las previsualizaciones de Higgsfield (`list_voices`) el preset más cercano al vídeo de referencia del usuario fue **Arthur**.
2. **Generar por escenas** con Higgsfield (`generate_audio_batch`, modelo `elevenlabs_v4`, `stability` 0,4, `similarity_boost` 0,75). Por escenas, para repetir solo la que cambie y gastar menos créditos. Coste medido: ≈ 0,46 créditos por 100 caracteres (v4) y ≈ 0,31 (v4 turbo).
3. **Descargar** los MP3 a `public/story/<slug>/voice-src/<id-escena>.mp3`.
4. **Montar:** `.venv/bin/python scripts/explainer/build-voice.py <slug> --kind story --voices-dir public/story/<slug>/voice-src --tempo 1.08 --match-pitch --target-f0 145`.
5. **Comprobar** con `voice-metrics.py`: σ ≥ 5 st y rango ≥ 16 st; y que Whisper transcriba ≥ 90 % del guion (dicción correcta).

Límites del entorno que ya han dado problemas:
- El proxy bloquea por defecto los servidores de Higgsfield (`d1xarpci4ikg0w.cloudfront.net`, `cdn.higgsfield.ai`, `d8j0ntlcm91z4.cloudfront.net`): hay que añadirlos con `update_environment` (pide aprobación al usuario).
- Higgsfield limita el ritmo (`429 rate_limit_reached`): un lote de 6 aceptó 3. Reenviar solo las rechazadas, de una en una; las rechazadas no cobran.
- La cuenta gratuita tiene pocos créditos: consultar `balance` y `get_cost` antes y decir cuánto se va a gastar.
- **No se clona la voz de una persona real** a partir de un vídeo suyo sin su permiso. Se elige la voz de biblioteca más parecida o el usuario graba la suya.
- Si no hay créditos: `ELEVENLABS_API_KEY` del usuario (con `request_credential`) o, como último recurso, Piper marcando el vídeo como borrador.

## Zonas seguras del lienzo (1080 × 1920)

| Zona | y | Contenido |
|---|---|---|
| HUD superior | 80–280 | etiqueta del canal (izq.), medidor/cifra de contexto (dcha.) |
| Escena | 300–1250 | criaturas, infografía, cifras grandes |
| Subtítulos | 1290–1560 | `StoryCaptions` (3 palabras, la activa en el acento) |
| Margen inferior | 1560–1920 | degradado oscuro; no poner nada importante |

El borde derecho (x > 940) lo ocupa la regla del medidor de profundidad si está activo.

## Kit disponible (`src/story/kit/`)

- **Escala/espacio** (`space.tsx`, `scenes/scale.tsx`): `Earth`, `Jupiter`, `Sun`, `Betelgeuse`, `SpaceBg`, `Measure`, `OrbitRing`, `PulseRing`, `BodyLabel`; cámara de «alejar» continua entre escenas.
- **Fondos**: `DeepWater` (profundidad 0–11.000 m: color, rayos, burbujas, nieve marina con parallax) · `StarField`, `Moon`, `Planet` (`sky.tsx`).
- **Criaturas/objetos**: `Whale`, `FishSchool`, `Jelly`, `Squid`, `Angler`, `Sub` (`water.tsx`). Todos reciben `x, y, s, flip, t, op`.
- **HUD**: `DepthMeter`, `BigStat` (cifra grande con cuenta), `Callout` (etiqueta con línea), `Gauge` (manómetro), `Banner` (sello rotulado).
- **Utilidades** (`util.ts`): `rand(seed)` determinista, `sway`, `ramp`, `mix`, `smoothPath`, `wrap`.
- **Transiciones** por escena (`"transition"` en el guion): `fade` (por defecto), `slide`, `zoom`, `cut`.
- **Efectos de sonido** (`sfx` en el guion): `pop`, `thud`, `whoosh`, `ding`, `boom`, `ping`, `tick`. **Música**: `story/music/{deep,space,mystery,lofi}.wav`, bucle sin cortes (`make-music.py` para añadir más).

## Reglas de animación

- Todo se calcula desde `t`: **sin CSS transitions/animations, sin `Math.random()`** (usa `rand(seed)`), o el render sale mal.
- Un elemento nuevo cada 2–4 s; nunca una escena estática más de 5 s.
- Cada elemento entra **cuando se dice**: `cue(n)`.
- Fondos continuos entre escenas (misma profundidad, mismo cielo) para que el solape parezca un único plano.
- Un solo foco de atención por escena.

## Monetización: qué hago y qué no

- **No subo nada a ninguna cuenta**: no tengo ni debo tener acceso a su canal. Dejo el MP4, el título, la descripción y los hashtags listos; subirlos y programarlos es cosa del usuario.
- La monetización en YouTube depende del Programa de Socios (requisitos de suscriptores y horas/visualizaciones que **cambian**; compruébalos en la ayuda de YouTube antes de prometer nada).
- YouTube penaliza el contenido «masivo/repetitivo/inauténtico»: cada vídeo debe aportar algo distinto (datos propios verificados, enfoque, narración con criterio). Un canal de plantillas con el texto cambiado no es una buena idea y puede quedarse sin monetizar.
- Música y efectos son de generación propia: sin derechos de terceros. Las voces de Piper son abiertas.

## Si algo falla

| Síntoma | Causa / arreglo |
|---|---|
| `Falta public/story/<slug>/timing.json` | Falta el paso de voz: `npm run video -- story <slug>` |
| `Escena desconocida «x»` | Regístrala en `src/story/scenes/index.ts` |
| La voz pronuncia mal una palabra | Añádela a `meta.pronounce` (`{ "Challenger": "Chálenyer" }`); los subtítulos siguen mostrando la original |
| Whisper alinea mal una escena | `--whisper medium` en `build-voice.py`, o frases más cortas |
| Chromium no arranca | `ls /opt/pw-browsers`; `remotion.config.ts` busca `chromium_headless_shell-*` |
| `metadata_errors` en faster-whisper | `pip install "av<17"` (ya fijado en `requirements.txt`) |
| Quiero otra voz | ver «Voz de producción»: `--voices-dir` con un audio por escena (ElevenLabs/Higgsfield) |
| `429 rate_limit_reached` en Higgsfield | reenviar solo las escenas rechazadas, de una en una |
| `CONNECT tunnel failed, response 403` al bajar audio | añadir el host del resultado con `update_environment` |
| El audio se recorta (pico 0 dB) | bajar el `volume` del efecto en `sfx` (el `boom` a ≤ 0,45) |
