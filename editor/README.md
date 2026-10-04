# Editor de vídeo vertical con subtítulos automáticos

Proyecto [Remotion](https://www.remotion.dev) para editar vídeos verticales (1080×1920, 30 fps) y
añadirles **subtítulos palabra a palabra** generados por [whisper.cpp](https://github.com/ggml-org/whisper.cpp),
sin depender de ningún servicio externo de transcripción.

```
tu-video.mp4 ──► scripts/transcribe.sh ──► public/tu-video.captions.json ──┐
     │                (whisper.cpp)                                        ├──► Remotion ──► out/video.mp4
     └────────────────────────────────────────────────────────────────────┘     (CaptionedVideo)
```

## Inicio rápido

```bash
cd editor
npm i                                   # 1. dependencias de Remotion
npm run setup:whisper                   # 2. compila whisper.cpp y baja el modelo (una vez, ~1 min)

cp /ruta/a/tu-video.mp4 public/video.mp4
npm run transcribe -- public/video.mp4 small es    # 3. genera public/video.captions.json
npx remotion render CaptionedVideo out/video.mp4   # 4. vídeo final con subtítulos
```

Si tu vídeo no se llama `video.mp4`, indícalo con `--props` (ver [Usar otro vídeo](#usar-otro-vídeo)).

## Requisitos

| Herramienta | Para qué | Notas |
| --- | --- | --- |
| Node.js y npm | Remotion | Probado con Node 22 |
| `ffmpeg` | `transcribe.sh` convierte el audio a WAV 16 kHz | |
| `git`, `cmake`, compilador C++ (`g++`/`clang++`) | Compilar whisper.cpp | Solo para `setup:whisper` |
| ≈ 0,5 GB de disco | Modelo `small` (466 MB) | Los modelos mayores ocupan más |

## Flujo de trabajo

### 1. Preparar Whisper (una sola vez por máquina o sesión)

```bash
npm run setup:whisper            # modelo "small" (por defecto)
npm run setup:whisper -- medium  # o otro modelo
```

El script (`scripts/setup-whisper.sh`) es idempotente: clona `whisper.cpp/`, compila `whisper-cli` y
descarga `models/ggml-<modelo>.bin`. Lo que ya existe no se repite, así que puedes lanzarlo siempre.

> `whisper.cpp/` y `models/` están en `.gitignore`: **no se suben a git**. En un contenedor nuevo
> (por ejemplo una sesión nueva de Claude Code en la nube) hay que volver a ejecutar `npm run setup:whisper`.

Modelos disponibles (aprox.; más grande = más preciso y más lento):

| Modelo | Tamaño | Cuándo usarlo |
| --- | --- | --- |
| `tiny`, `base` | 75 MB / 142 MB | Pruebas rápidas |
| `small` | 466 MB | Por defecto: buen equilibrio |
| `medium` | ≈ 1,5 GB | Español con acentos o audio con ruido |
| `large-v3-turbo` | ≈ 1,6 GB | Máxima calidad razonable |

### 2. Transcribir

```bash
npm run transcribe -- public/video.mp4 [modelo=small] [idioma=es]
```

Crea `public/<nombre>.captions.json` con una entrada por palabra en el formato `Caption` de Remotion:

```json
[
  { "text": " Hola",  "startMs": 320, "endMs": 640, "timestampMs": null, "confidence": null },
  { "text": " mundo", "startMs": 640, "endMs": 1100, "timestampMs": null, "confidence": null }
]
```

- El idioma es un código de Whisper (`es`, `en`, `fr`…) o `auto` para detectarlo.
- El `text` de cada palabra **lleva el espacio inicial**. Si corriges el JSON a mano, conserva ese espacio.
- Puedes editar el fichero para arreglar palabras mal reconocidas; los tiempos se mantienen.

### 3. Previsualizar y renderizar

```bash
npm run dev                                          # Remotion Studio (preview interactivo)
npx remotion render CaptionedVideo out/video.mp4     # vídeo final
npx remotion still CaptionedVideo out/frame.png --frame=60   # un fotograma, útil para ajustar estilo
```

El Studio abre un servidor en `http://localhost:3000`; en una máquina remota o en la nube no
suele ser accesible, así que ahí conviene usar `still` para revisar y `render` para el resultado.

La salida va a `out/`, que está ignorada por git.

### Usar otro vídeo

La composición `CaptionedVideo` busca por defecto `public/video.mp4` y sus subtítulos en
`public/video.captions.json`. **El `.captions.json` debe llamarse igual que el vídeo** (es lo que genera
`transcribe.sh`). Para otro nombre, pásalo como prop:

```bash
npx remotion render CaptionedVideo out/final.mp4 --props='{"videoSrc":"entrevista.mp4"}'
```

En el Studio puedes cambiar los mismos valores en el panel *Props*. La duración de la composición se
calcula sola a partir del vídeo.

## Personalizar los subtítulos

Todas son props de la composición `CaptionedVideo` (valores por defecto en `src/Captions.tsx`):

| Prop | Por defecto | Efecto |
| --- | --- | --- |
| `videoSrc` | `"video.mp4"` | Fichero dentro de `public/` |
| `combineTokensWithinMilliseconds` | `1200` | Cuántas palabras se agrupan por pantalla: más alto = frases más largas |
| `fontSize` | `84` | Tamaño del texto (px) |
| `bottom` | `380` | Distancia al borde inferior (px). Súbelo si la interfaz de TikTok/Reels tapa el texto |
| `textColor` | `#ffffff` | Color de las palabras |
| `highlightColor` | `#ffd60a` | Color de la palabra que se está diciendo |

```bash
npx remotion render CaptionedVideo out/video.mp4 \
  --props='{"videoSrc":"video.mp4","fontSize":96,"highlightColor":"#00e5ff","combineTokensWithinMilliseconds":800}'
```

`captions` también es una prop, pero **se rellena sola** desde el `.captions.json`; no la pases a mano.

## Estructura del proyecto

```
editor/
├── public/                  # Tus vídeos y los *.captions.json (se sirven con staticFile())
├── src/
│   ├── index.ts             # Punto de entrada de Remotion
│   ├── Root.tsx             # Registra las composiciones
│   ├── CaptionedVideo.tsx   # Composición: vídeo de fondo + subtítulos; lee duración y captions
│   └── Captions.tsx         # Subtítulos estilo TikTok (páginas de palabras, palabra activa resaltada)
├── scripts/
│   ├── setup-whisper.sh     # Clona, compila whisper.cpp y descarga el modelo
│   ├── get-model.sh         # Solo descarga un modelo ggml (lo usa el anterior)
│   └── transcribe.sh        # vídeo/audio → public/<nombre>.captions.json
├── whisper.cpp/             # (ignorado por git) código y binario de whisper
├── models/                  # (ignorado por git) modelos ggml-*.bin
├── remotion.config.ts       # Config de Remotion (Rspack, JPEG, sobrescribir salida)
├── .agents/, .claude/       # Skills oficiales de Remotion para asistentes de IA (ver skills-lock.json)
└── out/                     # (ignorado por git) vídeos renderizados
```

Cómo funciona por dentro:

- `CaptionedVideo.tsx` usa `calculateMetadata` para leer la duración del vídeo con `mediabunny` y cargar el
  `.captions.json`. Si falta el JSON, el vídeo se renderiza igualmente **sin subtítulos** y la consola avisa.
- `Captions.tsx` agrupa las palabras en "páginas" con `createTikTokStyleCaptions` (`@remotion/captions`).
  Cada página es una `<Sequence>` que termina cuando empieza la siguiente, así nunca se solapan.
  Las animaciones usan `useCurrentFrame()` e `interpolate()` (nada de CSS `transition`/`animation`,
  que no se renderiza bien en Remotion).
- `transcribe.sh` llama a `whisper-cli` con `-ml 1 -sow` (un segmento por palabra) y `-ojf` (JSON con tiempos
  en ms) y lo convierte al formato `Caption[]`.

## Trabajar en un entorno cloud con red restringida

En entornos como Claude Code en la nube, la red sale por una lista de dominios permitidos. Los que
necesita este proyecto (comprobados al montarlo):

| Dominio | Para qué |
| --- | --- |
| `registry.npmjs.org` | `npm i` |
| `github.com` | Clonar whisper.cpp |
| `huggingface.co` **y** `us.aws.cdn.hf.co` (o `*.hf.co`) | Descargar el modelo: Hugging Face redirige a un CDN que cambia según la región |

Se configuran en el entorno (menú de la nube de la sesión → *Edit* → *Network access* → *Custom* →
*Allowed domains*), manteniendo marcada la lista por defecto de gestores de paquetes. Los cambios de red
pueden aplicarse solo a **sesiones nuevas**.

Otros detalles de la nube:

- `remotion.config.ts` usa el Chromium ya instalado en el contenedor (`/opt/pw-browsers/...`) **solo si existe**;
  en tu máquina Remotion usa su propio navegador.
- Tus vídeos llegan al contenedor a través del repositorio (`public/`). GitHub rechaza ficheros de más de
  100 MB; para vídeos grandes usa [Git LFS](https://git-lfs.com) o súbelos por otro medio.
- `www.remotion.dev` no está en la lista, así que no se pueden bajar los "Elements" oficiales (p. ej. *Basic
  Captions*). Por eso `Captions.tsx` es un componente propio.

## Solución de problemas

| Síntoma | Causa y solución |
| --- | --- |
| `Host not in allowlist: …`, `403 Forbidden` o `CONNECT tunnel failed, response 403` | Falta un dominio en la red del entorno. Añádelo (ver sección anterior) y abre una sesión nueva si no se aplica. |
| `Falta whisper.cpp/build/bin/whisper-cli` o `Falta el modelo models/…` | Ejecuta `npm run setup:whisper` (o `-- <modelo>` si usas otro). |
| `No se pudo leer public/video.mp4` | No existe el vídeo por defecto. Copia tu vídeo como `public/video.mp4` o pasa `--props='{"videoSrc":"…"}'`. |
| El vídeo sale sin subtítulos y la consola dice *Sin subtítulos* | Falta `public/<nombre>.captions.json`. Ejecuta `npm run transcribe` con ese vídeo. |
| `npm run lint` da errores en `whisper.cpp/build/**/compiler_depend.ts` | CMake genera ficheros `.ts` que no son TypeScript. `tsconfig.json` ya excluye `whisper.cpp` y `models`; si mueves esas carpetas, actualiza el `exclude`. |
| Aviso `Detected differing memory amounts` al renderizar | Inofensivo en Docker/contenedores: Remotion usa la cifra menor. |
| Palabras mal transcritas | Usa un modelo mayor (`setup:whisper -- medium`) o corrige el `.captions.json` a mano. |
| El texto queda tapado por la interfaz de la red social | Sube la prop `bottom`. |

## Qué está verificado

Probado de principio a fin en un contenedor cloud (4 núcleos) con un vídeo vertical sintético de 11 s
(fondo generado + audio de ejemplo en inglés de whisper.cpp) y el modelo `small`:

- `setup:whisper` desde cero: ≈ 1 min; la segunda ejecución no hace nada.
- Transcripción: 22 palabras con tiempos por palabra en ≈ 5 s.
- `remotion compositions`, `still` y `render`: 1080×1920, 30 fps, H.264 + AAC, 330 fotogramas;
  el render de 11 s tardó ≈ 43 s. El Studio arranca (HTTP 200).
- `npm run lint` (ESLint + `tsc`) sin errores.

Todavía **no** se ha probado con un vídeo real en español ni con los modelos `medium`/`large-v3-turbo`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm i` | Instala dependencias |
| `npm run setup:whisper [-- modelo]` | Clona/compila whisper.cpp y descarga el modelo |
| `npm run transcribe -- <vídeo> [modelo] [idioma]` | Genera `public/<nombre>.captions.json` |
| `npm run dev` | Abre Remotion Studio |
| `npx remotion render CaptionedVideo out/video.mp4` | Renderiza el vídeo final |
| `npx remotion still CaptionedVideo out/frame.png --frame=N` | Renderiza un fotograma |
| `npm run lint` | ESLint + comprobación de tipos |
| `npm run upgrade` | Actualiza Remotion |

## Más información

- [Documentación de Remotion](https://www.remotion.dev/docs/the-fundamentals) · [`@remotion/captions`](https://www.remotion.dev/docs/captions)
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
- Remotion requiere licencia de empresa en algunos casos: [términos](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
