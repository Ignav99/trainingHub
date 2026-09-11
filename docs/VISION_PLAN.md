# Visión — plan de análisis automático en Video Análisis

Modo **Visión** dentro de la mesa de `/video-analisis`. No es una app aparte. Empieza pequeño y se apila complejidad.

> Documento de escritorio: el PDF `Open-source…` vive en el Mac (`/Users/User/Desktop`). Este agente cloud no monta ese disco. El contenido de abajo incorpora el writeup público que coincide con ese nombre y tema — [World Cup 2026: building football analytics with open-source computer vision](https://ignit.group/blog/world-cup-2026-building-football-analytics-with-open-source-computer-vision) (Ignit Group, julio 2026) — más el mapa de tareas [SoccerNet](https://www.soccer-net.org/tasks) y los kits oficiales. Si el PDF local trae enlaces extra, se añaden aquí sin cambiar la arquitectura.

---

## Regla dura

El partido **nunca** sale del PC. Ni a Render, ni a Supabase, ni a Roboflow cloud, ni a un GPU remoto.

```
MP4 local  →  worker Python en el mismo PC  →  JSON versionado en disco
                                           →  la mesa lee el JSON
                                           →  extractClip (ya existe) saca recortes
```

Los pesos se descargan una vez al cache local del worker. No van en git.

---

## Qué pedimos, en orden

1. Tracking + homografía (al menos los nuestros).
2. Eventing de lo que se pueda extraer; luego situaciones más complejas.
3. Recortes automáticos de situaciones / solos / por jugador.
4. Datos de evento por partido, asociados a jugadores cuando el track esté cerca.
5. Colecciones automáticas por fase de juego.
6. Distancias y físico **visible** (no GPS).
7. Familias de métricas: eventing, tracking, físico, fases/táctica.

La TV muestra &lt;50 % de la actividad. Metros y km son solo de lo que entra en cuadro. Error típico ~20 %. No prometemos fuera de juego, xG ni físico de 90 min.

---

## De dónde sale el stack (documento open-source)

El artículo de Ignit monta un overlay de fin de semana en un portátil Apple Silicon, **sin entrenar nada y sin GPU en la nube**. Encadena estas etapas; cada una alimenta la siguiente:

| Etapa | Qué hace | Pieza open-source |
|---|---|---|
| Detección | Cajas por frame: jugador, portero, árbitro, balón | YOLO afinado en [football-players-detection](https://universe.roboflow.com/roboflow-jvuqo/football-players-detection-3zvbc) (Roboflow Universe). No entrenar en v0. |
| Tracking | La misma persona sigue siendo el mismo id | [ByteTrack](https://github.com/ifzhang/ByteTrack) vía [`supervision`](https://github.com/roboflow/supervision) (`sv.ByteTrack`) |
| Equipos | Dos clusters de kit, sin leer dorsal | [`roboflow/sports`](https://github.com/roboflow/sports) `TeamClassifier`: crop → SigLIP → UMAP → KMeans |
| Balón | En el frame entero se pierde; hay que cortar en teselas | `sv.InferenceSlicer` + buffer corto cuando desaparece |
| Homografía | Caja de área, círculo, intersecciones → plano 105×68 | YOLO de [football-field-detection](https://universe.roboflow.com/roboflow-jvuqo/football-field-detection-f07vi) + `cv2.findHomography`. Suavizar entre frames. |
| Minimapa | Coordenadas de césped | `draw_pitch` en `roboflow/sports` |
| Stats v0 | Quien está más cerca del balón = poseedor; cambio estable = pase o pérdida | Geometría sobre el minimapa, no un modelo de eventos |

Notebook de arranque de Roboflow: [how-to-track-football-players](https://github.com/roboflow/notebooks).

### Lecciones del mismo documento (no ignorar)

- El homography **tiembla** si no se suaviza al panear la cámara.
- El clustering de kits solo es estable si el pase inicial ve **los dos equipos**. Un clip que empieza en un saque de banda lo tuerce.
- El balón **depende** del slicer. Sin teselas se pierde minutos.
- Los ids aguantan casi todo **excepto dos jugadores que se cruzan**. Ahí salta el número.
- Homografía plana: un balón en el aire se proyecta como si estuviera en el césped y se va al borde del mapa. Una cámara táctica alta falla menos que una de TV.
- PlayVision (baloncesto) enseña que el cuello de botella no es la arquitectura: es **anotar y corregir**. Visión tiene que dejar confirmar / rechazar eventos a mano.

---

## Mapa SoccerNet → nuestras capas

Cuando el v0 de Roboflow aguante 60 s, no reinventar eventing: hay benchmarks y pesos públicos.

**Tema 1 — entender el vídeo**

- [Action Spotting](https://github.com/SoccerNet/sn-spotting) — 17 clases dispersas: gol, tiros, córner, falta, tarjetas, saque, throw-in…
- [Ball Action Spotting](https://github.com/lRomul/ball-action-spotting) — 12 clases densas (~1 s): Pass, Drive, Header, High Pass, Out, Cross, Throw In, Shot, Block, Tackle, Free Kick, Goal. Baseline 2024: [recokick/ball-action-spotting](https://github.com/recokick/ball-action-spotting). Evolución con equipo: [sn-teamspotting](https://github.com/SoccerNet/sn-teamspotting) (T-DEED).
- Replay grounding, cortes de cámara, captioning, faltas multi-vista: **fuera de v0**.

**Tema 2 — el campo**

- [sn-calibration](https://github.com/SoccerNet/sn-calibration)
- [TVCalib](https://github.com/MM4SPA/tvcalib) / [PnLCalib](https://github.com/mguti97/PnLCalib) si los keypoints YOLO no bastan (zoom, portería).
- [BroadTrack](https://github.com/evs-broadcast/BroadTrack) — calibración de cámara de TV en movimiento; no homografía a secas.

**Tema 3 — el jugador**

- [sn-tracking](https://github.com/SoccerNet/sn-tracking)
- [sn-reid](https://github.com/SoccerNet/sn-reid)
- [sn-jersey](https://github.com/SoccerNet/sn-jersey) — dorsal **después** de tener tracks estables. En plano táctico el dorsal son pocos píxeles.

**Tema 4 — el partido**

- [sn-gamestate](https://github.com/SoccerNet/sn-gamestate) sobre [TrackLab](https://github.com/TrackingLaboratory/tracklab) — tracking + identidad + minimapa tipo videojuego. Objetivo de “minimapa completo”, no el primer merge.

---

## Otras piezas útiles (no el camino crítico)

Pipelines de un solo clip, mismos bloques YOLO + ByteTrack + homografía:

- [Adit-jain/Soccer_Analysis](https://github.com/Adit-jain/Soccer_Analysis) — pesos HuggingFace `soccana` / `Soccana_Keypoint`
- [duarteprazeres/falcon](https://github.com/duarteprazeres/falcon) — pensado para Veo; BoT-SORT + optical flow + fusión de tracks
- [mserra0/FootballVision](https://github.com/mserra0/FootballVision), [Smasko7/Football-Vision](https://github.com/Smasko7/Football-Vision), [Tony-Luna/soccer-video-analytics](https://github.com/Tony-Luna/soccer-video-analytics)
- Datos ya proyectados (para métricas, no para el worker de vídeo): [Kloppy](https://github.com/PySport/kloppy), [databallpy](https://github.com/Alek050/databallpy), [socceraction](https://github.com/ML-KULeuven/socceraction), [Metrica sample](https://github.com/metrica-sports/sample-data), [SkillCorner opendata](https://github.com/SkillCorner/opendata)

Listas: [awesome-sports-ai](https://github.com/moose-lab/awesome-sports-ai), [awesome-soccer-analytics](https://github.com/matiasmascioto/awesome-soccer-analytics).

---

## Cómo encaja en la mesa

La botonera, la cinta, las carpetas y `extractClip` **no se tocan**. Visión escribe timestamps; la mesa recorta con los pre/post de cada botón.

| Hoy (humano) | Visión |
|---|---|
| Pulsa Ataque −5/+8 | Evento `shot` o presión alta → mismo pre/post |
| Pulsa ABP −8/+12 | Evento `corner` / `free-kick` → carpeta ABP |
| Selecciona línea y zip | Colección auto “nuestros en ataque” |
| Envía a Revisión | Igual: solo el recorte corto, nunca el partido |

Dibujar sigue en la sala de presentación. Visión no abre pizarra sobre el partido.

Nombre en UI: **Visión**. Panel al lado de la botonera, no una ruta nueva.

---

## Contrato JSON (v0)

Un archivo por partido, junto al MP4 (o en `~/.kabine/vision/<matchId>/`). La mesa solo lee; el worker solo escribe.

```json
{
  "schema": "kabine.vision.v0",
  "source": { "path": "local", "fps": 25, "width": 1920, "height": 1080, "duration_s": 5640 },
  "job": { "status": "idle", "probe_s": 60, "error": null },
  "our_team": 0,
  "tracks": [
    { "id": 7, "team": 0, "role": "player", "samples": [{ "t": 12.04, "x": 0.42, "y": 0.61, "px": 910, "py": 540 }] }
  ],
  "ball": [{ "t": 12.04, "x": 0.50, "y": 0.50, "in_air": null }],
  "homography": [{ "t": 12.00, "H": [1, 0, 0, 0, 1, 0, 0, 0, 1] }],
  "events": [
    { "t": 12.40, "type": "pass", "team": 0, "track_id": 7, "confidence": 0.62, "confirmed": null }
  ],
  "phases": [{ "start": 10.0, "end": 24.0, "label": "ataque_organizado", "team": 0 }],
  "physical": [{ "track_id": 7, "visible_m": 312, "sprint_n": 2 }]
}
```

- `x,y` en césped 0–1 (largo × ancho). `px,py` en el frame, por si el homography falla ese instante.
- `confirmed`: `null` (propuesto) / `true` / `false`. El humano manda.
- `in_air` es null hasta tener profundidad; no fingir.
- Versionar `kabine.vision.v0` → `v1` cuando entren las 17 clases de spotting.

---

## Fases de implementación

### 0 — Cascarón (primer merge)

- Toggle **Visión** en la mesa.
- Job `idle | running | done | error`.
- Botón **Analizar 60 s** alrededor del cabezal (no el partido entero).
- Worker local: HTTP `127.0.0.1` o cola en disco. Si no está instalado, la UI dice cómo levantarlo. Render no ejecuta inferencia.
- Escribir JSON vacío + status.

### 1 — Cuerpos en el césped

- YOLO + ByteTrack + keypoints + homography suavizado + minimapa.
- “Estos son los nuestros”: el usuario pinta el kit (o elige el cluster 0/1).
- Overlay: elipses por track, id, color de equipo. Minimapa en una esquina del panel Visión, no encima de toda la mesa.
- Probe 60 s tiene que verse bien antes de un tiempo completo.

### 2 — Recortes automáticos

- De cada evento `t` (aunque de momento sea “posesión cambió” o “balón parado”) → `extractClip` con el pre/post del botón de fase.
- Carpeta Visión en la cinta, además de las 6 fases humanas.
- Solo / por jugador: todos los segmentos donde `track_id` está en cuadro ≥ N segundos.

### 3 — Eventos de partido

- Action spotting 17 clases, umbral alto, lista para confirmar.
- Si hay un track nuestro a &lt; X metros del evento, asociar `track_id`. Si no, evento de equipo.

### 4 — Fases + físico visible

- Heurística de fase sobre el minimapa (bloque bajo, ataque posicional, transición si el balón cruza medio campo en &lt; 8 s).
- Metros visibles, nº de sprints (umbral de velocidad sobre homography). Etiqueta clara: **solo lo que se ve**.

### 5 — Eventos densos + táctica

- Ball action spotting 12 clases.
- Reglas sobre el minimapa: 3ª / 4ª / 5ª línea, amplitud, distancia entre líneas. Confirmar siempre.

TrackLab / GSR entra cuando 1–4 estén en uso real. No en el primer sprint.

---

## Worker local (fase 0+1)

Paquete `vision-worker/` (Python 3.11+, opcional MPS/CUDA).

- `GET /health`
- `POST /jobs` `{ path, start_s, end_s, our_team }` — path de archivo local, no URL.
- `GET /jobs/:id` → status + ruta del JSON.

UI: si `/health` falla, card “Instala Visión en este PC” con `pip`/`uv` y el comando. Sin worker no hay análisis y el partido sigue usándose a mano.

No meter pesos en el repo. Primera corrida los baja a `~/.cache/kabine-vision/`.

---

## Fuera de alcance (hasta que el probe de 60 s convenza)

- Subir el MP4 a la API.
- Entrenar SoccerNet en este entorno (no hay GPU de usuario aquí).
- xG, orbis, fuera de juego automático.
- Sustituir la botonera humana.
- Dibujar en el vídeo desde la mesa (sigue en la sala).
- Leer dorsales como identidad principal.

---

## Preguntas abiertas (no bloquean la fase 0)

1. Cámara habitual: táctica fija / Veo vs. TV con replay y zoom.
2. GPU en el PC de análisis (MPS, NVIDIA, o CPU y solo probes).
3. ¿El PDF `Open-source…` del escritorio trae repos que no estén en este mapa? Adjuntarlo al chat y se fusionan aquí.
