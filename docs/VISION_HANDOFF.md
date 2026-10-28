# Visión — pausa y handoff

**Estado:** 28 oct 2026. Memoria corta para otra IA: [`docs/VISION_MEMORIA.md`](./VISION_MEMORIA.md). El dato del módulo 1 es el tracking a 10 fps entre los cuatro pitidos. El entrenador marca también el color de las dos camisetas, igual que los pitidos. Los dorsales salen del acta del partido (convocatoria y dorsales rivales del anotador) y solo se acepta un número si está en esa lista. El JSON sigue al lado del vídeo y en `~/.kabine/vision`. El detector de producto (RF-DETR) sigue sin estar: la lectura actual usa césped, líneas y color de camiseta. Un partido de noche todavía no coloca a cada jugador de verdad.  
**Ahora:** módulo 1. Los módulos 2 y 3 no se construyen.  
**Retomar:** `docs/VISION_MEMORIA.md`, este archivo y `docs/VISION_PLAN.md`.

Nombre en producto: **Visión**. Vive dentro de Video Análisis (`/video-analisis`), no es una app ni una ruta nueva.

---

## Scope (qué es y qué no)

Visión analiza el partido **en el mismo Mac que abre Veo**. Un disparo después del partido, no en directo. Escribe un JSON; la mesa (botonera, cinta, `extractClip`) recorta como ahora.

El partido **nunca** sale del PC. Ni Render, ni Supabase, ni Roboflow cloud, ni GPU alquilada.

```
MP4 local  →  worker Python en 127.0.0.1  →  JSON kabine.vision.v0
                                          →  la mesa lee el JSON
                                          →  extractClip saca recortes cortos
```

### Pedimos, en este orden

1. **Módulo 1, ahora.** Los dos equipos, cada jugador, el balón y la homografía automática, del inicio al final que marque el entrenador. Metros solo de lo que se ve.
2. **Módulo 2, después.** Sala de pintar sobre copias de nuestros cortes, con el dibujo pegado al césped (Sportscode Studio: calibración, Track Full, línea de conducción).
3. **Módulo 3, después y sin estudiarlo ahora.** Eventos, recortes automáticos, fases y colecciones.

### No hacemos (hasta que el módulo 1 se vea en una parte)

- Subir el MP4 a la API.
- Sustituir la botonera humana.
- Construir el módulo 2 o el 3.
- Fuera de juego, xG, orbis, dorsales como identidad principal.
- Entrenar SoccerNet / GSR en la VM cloud (no hay GPU de usuario ahí).

Presentar / `SalaStage` / dossier Presentar **no se tocan**.

---

## Stack acordado (licencias)

Kabine es producto cerrado. No copiar motores GPL/AGPL al repo.

| Pieza | Licencia | Uso |
|---|---|---|
| RF-DETR Nano–Large | Apache 2.0 | **Detector de producto** |
| `roboflow/trackers` BoT-SORT | Apache 2.0 | **Tracker** (Veo panea; ByteTrack solo no basta) |
| `roboflow/sports` TeamClassifier | MIT | Kits (SigLIP). No usar el YOLO del demo |
| `roboflow/supervision` | MIT | Slicer del balón |
| Ultralytics YOLO | AGPL | **Solo probe local**, no producto |
| Tactix / PitchWise.Lab | GPL | Ideas sí, código no |
| SoccerNet GSR / TrackLab | GPL + NDA vídeos | Más adelante |

PDF leído (8 páginas): *Open-Source Computer Vision Stack for Soccer Video Analysis (2025-2026)*. Estuvo en `_inbox/` (gitignore; no está en GitHub).

Kit nuestro: **blanco**. Rival azul oscuro, portero rival amarillo, árbitro azul claro (fuera del cluster). Pin `our_kit: "white"`. HSV bajo luz de torres **falla**.

Cámara: **Veo**, 3/4 de campo, paneo. Partido típico **4–5 GB**.

---

## Lo hecho (hasta la pausa)

| Qué | Estado |
|---|---|
| Leer el PDF de licencias | Hecho |
| Plan vivo `docs/VISION_PLAN.md` | Hecho |
| Contrato JSON `kabine.vision.v0` (tracks, ball, H, phases, physical) | El tramo inicio–final ya lo escribe `run_span`. `events` y `phases` salen vacíos |
| Fases 0–5 del worker/UI | Prueba corta en la mesa y en `127.0.0.1:8765`. Pesos RF-DETR: no |
| Probe CPU en la VM (`yolo11n` COCO, no RF-DETR) | Hecho |
| Script `scripts/vision_bench.py` | Hecho (en `main`) |
| Bench en el Mac (Apple Silicon, Metal) | Hecho — clip 21 s |
| 60 s / 10 min / partido entero 4–5 GB | **No hecho** |
| Panel Visión en la mesa | Botón **Visión** dentro de la mesa, después de abrir un vídeo. Cuatro pitidos, sin teclear la ruta. Ejemplo de 2 s para ver el césped. La reproducción automática ya está en producción |
| Permiso de red local | Chrome puede bloquear `https` → `http://127.0.0.1`. El primer intento va en el clic, el botón no se queda muerto, y el texto pide el candado de la barra |
| `python3 scripts/vision_server.py` | Hecho. Escucha solo en 127.0.0.1:8765 |
| `vision-worker/` homografía, equipos, balón, filtro de 12 m/s | Hecho y probado con un partido sintético (`python3 tests/test_module1.py`) |
| `vision-worker/` HTTP 127.0.0.1 | `/health`, `/fixture`, `/preview`, `/preview-file`, `/match`, `/recall`, `/choose` |

### Clip de prueba

- En el Mac: `~/Desktop/prueba2.mp4` (sin espacio; ~11 MB).
- 20,85 s, 1920×1080, 29,97 fps, H.264, sin audio.
- Veo, noche, césped artificial, líneas naranja + blanco.
- En la VM: `_inbox/prueba 2.mp4` (gitignore).

También en el Escritorio (no medidos): `Ataque organizado — 15.01-15.19.mp4` (~54 MB) y carpeta `VEO/` (candidato al partido 4–5 GB). El último comando pedido, **sin ejecutar**, era `ls -lh /Users/User/Desktop/VEO`.

### Números

Mismo clip, YOLO COCO `yolo11n`, stride 6 (~5 fps), 640 px. **No** es el detector de producto.

| | VM Linux CPU (OpenCV) | **Mac arm64 MPS (imageio)** |
|---|---|---|
| Decode | 550 fps | 143 fps |
| Detect 21 s | 3,9 s · 27 inf/s | **9,2 s · 11 inf/s** |
| Extra 90 min (solo cajas) | ~17 min | **~40 min** |
| RAM | ~530 MB | **512 MB** |
| Personas/frame | 8–19 | 8–18 (media 12,4) |
| Balón COCO | 0 | 0 |

JSON del Mac (resumen): `device: mps`, `backend: imageio`, `opencv: 5.0.0`, `ffmpeg_build: true`.

**Conclusión hardware:** Metal funciona. Un partido de cajas entra en una tarde; el pipeline real (RF-DETR + BoT-SORT + homografía + slicer) será ×2–×4 → una noche. **No mini PC** para un partido. **No GPU alquilada.** Sample ~5 fps, no 30.

El balón COCO no sirve. Hará falta modelo de fútbol + teselas.

---

## Trampas del Mac (no repetir)

1. **Terminal no lee el Escritorio** hasta Ajustes → Privacidad y seguridad → Archivos y carpetas → Terminal/Cursor → Escritorio. Luego Cmd+Q y reabrir. Sintoma: `Operation not permitted` o `cp: No such file`.
2. El clip se llama **`prueba2.mp4`**, no `prueba 2.mp4`.
3. Copiar el mp4 a `~/kabine-vision-bench/clip.mp4` y analizar **esa** copia.
4. No `pip uninstall opencv-python-headless`. Headless es para YOLO; el MP4 lo lee **imageio-ffmpeg**.
5. Bajar el script con `curl -fL` desde **`main`**, nunca desde `cursor/*` (GitHub responde 404 y machaca el archivo).
6. Usar siempre el Python de pyenv:  
   `/Users/User/.pyenv/versions/3.11.9/bin/python3`

Setup que ya funciona en el Mac:

```bash
PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
cd /Users/User/kabine-vision-bench
curl -fL -o vision_bench.py https://raw.githubusercontent.com/Ignav99/trainingHub/main/scripts/vision_bench.py
$PY -m pip install --only-binary=:all: opencv-python-headless imageio imageio-ffmpeg ultralytics numpy
cp /Users/User/Desktop/prueba2.mp4 ./clip.mp4
$PY vision_bench.py --video ./clip.mp4 --stride 6 --backend imageio
```

---

## Cómo retomar

### 1. Medir 60 s del partido (primera cosa)

```bash
ls -lh /Users/User/Desktop/VEO
```

Copiar el MP4 de 4–5 GB a `kabine-vision-bench` (o leerlo si ya hay permiso de Escritorio) y:

```bash
PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
cd /Users/User/kabine-vision-bench
$PY vision_bench.py --video ./partido.mp4 --max-seconds 60 --stride 6 --backend imageio
```

| 60 s a 5 fps | 90 min solo cajas | Qué hacer |
|---|---|---|
| < ~20 s | ~30 min | 10 min, luego un tiempo de noche |
| 20–90 s | Una noche | Seguir; no comprar nada |
| \> 2 min o sin RAM | Mini PC NVIDIA una vez | No alquilar GPU |

### 2. Código de producto (módulo 1)

Inicio y final en la mesa. Detector RF-DETR. Tracker BoT-SORT, con una prueba de McByte en el mismo tramo de 60 s antes de cambiarlo. Homografía suavizada; se descarta la que cae fuera del campo.

Paquete `vision-worker/` (Python 3.11+, numpy). Hoy: `kabine_vision.run_span` convierte cajas de un tramo en el JSON. Mañana, en el Mac: HTTP y RF-DETR.

- `GET /health`
- `POST /jobs` `{ path, start_s, end_s, our_team }` — **path local, no URL**
- `GET /jobs/:id` → status + ruta del JSON

UI en la mesa: toggle **Visión** e inicio y final del tramo. El primer disparo de prueba sigue siendo 60 s. Si `/health` falla, card «Instala Visión en este PC». Sin worker la botonera sigue igual.

Pesos en `~/.cache/kabine-vision/`, no en git.

Detector de producto: **RF-DETR Apache**, no Ultralytics.

### 3. Lo que queda guardado y no se abre

Módulo 2: dibujo con homografía mantenida, sobre copias de los cortes. Módulo 3: el eventing y los recortes automáticos de las fases 2–5 del plan. TrackLab/GSR más tarde. El mercado de ago–sep 2026 (Veo Analytics 2, Hudl Tracking Data, Studio Notes, TactiVision, McByte) está resumido en `VISION_PLAN.md`.

---

## Archivos en el repo

| Ruta | Qué es |
|---|---|
| `docs/VISION_HANDOFF.md` | Este documento |
| `docs/VISION_PLAN.md` | Plan técnico vivo |
| `docs/VIDEO_TOOL_ARCHITECTURE.md` | Mesa local; Veo 4–5 GB no se sube |
| `vision-worker/` | Núcleo del módulo 1. Prueba: `python3 tests/test_module1.py` |
| `scripts/vision_bench.py` | Cronómetro Mac ↔ VM |
| `scripts/vision_probe.py` | Probe con cajas anotadas (CPU, YOLO COCO) |
| `_inbox/` | Gitignore. PDF + clip de prueba **no** van a GitHub |

En el Mac: carpeta `~/kabine-vision-bench/` (`vision_bench.py`, `clip.mp4`, pesos `yolo11n.pt` locales).

---

## JSON de producto (recordatorio)

Un archivo por partido, `schema: kabine.vision.v0`. La mesa solo lee; el worker solo escribe. Eventos con `confirmed: null | true | false` — el humano manda. `our_kit: "white"`.

---

El siguiente paso en el Mac es `ls` de `VEO/` y 60 s del partido de 4–5 GB, con RF-DETR. No repetir el PDF, el stack ni el bench de 21 s. El módulo 2 y el 3 siguen cerrados.
