# Visión — pausa y handoff

**Estado:** pausado el 11 sep 2026. No hay UI ni worker en producción.  
**Retomar:** leer este archivo + `docs/VISION_PLAN.md`. El chat largo no hace falta.

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

1. Tracking + homografía (al menos los nuestros).
2. Eventing de lo que se pueda extraer.
3. Recortes automáticos (situaciones / solos / por jugador).
4. Eventos ligados a jugadores cuando el track esté cerca.
5. Colecciones automáticas por fase.
6. Distancias y físico **visible** (no GPS). Error típico ~20 %. Solo lo que entra en cuadro.

### No hacemos (hasta que el probe de 60 s convenza)

- Subir el MP4 a la API.
- Sustituir la botonera humana.
- Dibujar en el vídeo desde la mesa (sigue en la sala de presentación).
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
| Contrato JSON `kabine.vision.v0` (tracks, ball, H, events con `confirmed`, phases, physical) | Diseñado, no implementado |
| Fases 0–5 del worker/UI | Diseñadas, **cero código de producto** |
| Probe CPU en la VM (`yolo11n` COCO, no RF-DETR) | Hecho |
| Script `scripts/vision_bench.py` | Hecho (en `main`) |
| Bench en el Mac (Apple Silicon, Metal) | Hecho — clip 21 s |
| 60 s / 10 min / partido entero 4–5 GB | **No hecho** |
| Panel Visión en la mesa | **No hecho** |
| `vision-worker/` HTTP 127.0.0.1 | **No hecho** |

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

### 2. Código de producto (fase 0+1)

Paquete `vision-worker/` (Python 3.11+, MPS):

- `GET /health`
- `POST /jobs` `{ path, start_s, end_s, our_team }` — **path local, no URL**
- `GET /jobs/:id` → status + ruta del JSON

UI en la mesa: toggle **Visión**, «Analizar 60 s» alrededor del cabezal. Si `/health` falla, card «Instala Visión en este PC». Sin worker la botonera sigue igual.

Pesos en `~/.cache/kabine-vision/`, no en git.

Detector de producto: **RF-DETR Apache**, no Ultralytics.

### 3. Fases después (detalle en `VISION_PLAN.md`)

0 cascarón → 1 cuerpos + “estos son los nuestros” (blanco) → 2 auto clips vía botonera → 3 spotting 17 clases con confirmar → 4 fases + metros visibles → 5 ball actions densas. TrackLab/GSR más tarde.

---

## Archivos en el repo

| Ruta | Qué es |
|---|---|
| `docs/VISION_HANDOFF.md` | Este documento (pausa) |
| `docs/VISION_PLAN.md` | Plan técnico vivo |
| `docs/VIDEO_TOOL_ARCHITECTURE.md` | Mesa local; Veo 4–5 GB no se sube |
| `scripts/vision_bench.py` | Cronómetro Mac ↔ VM |
| `scripts/vision_probe.py` | Probe con cajas anotadas (CPU, YOLO COCO) |
| `_inbox/` | Gitignore. PDF + clip de prueba **no** van a GitHub |

En el Mac: carpeta `~/kabine-vision-bench/` (`vision_bench.py`, `clip.mp4`, pesos `yolo11n.pt` locales).

---

## JSON de producto (recordatorio)

Un archivo por partido, `schema: kabine.vision.v0`. La mesa solo lee; el worker solo escribe. Eventos con `confirmed: null | true | false` — el humano manda. `our_kit: "white"`.

---

Cuando se reabra: no repetir el PDF, el stack ni el bench de 21 s. Empezar por `ls` de `VEO/` y 60 s del partido de 4–5 GB.
