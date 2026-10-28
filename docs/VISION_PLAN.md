# Visión — plan de análisis automático en Video Análisis

> **Reapertura (27 oct 2026).** Tres módulos. Ahora solo el 1: homografía y tracking automático entre un inicio y un final. El 2 (dibujo tipo Sportscode) y el 3 (eventos y recortes automáticos) quedan escritos aquí y no se construyen todavía. Handoff: [`docs/VISION_HANDOFF.md`](./VISION_HANDOFF.md).
>
> El PDF de 8 páginas (*Open-Source Computer Vision Stack for Soccer Video Analysis, 2025-2026*) se leyó en septiembre y **no está en `docs/`**: vivía en `_inbox/` (gitignore). Este archivo es el plan.

Modo **Visión** dentro de la mesa de `/video-analisis`. No es una app aparte.

---

## Módulos

El partido sigue sin salir del PC. El worker escribe JSON; la mesa lo lee.

### 1 — Homografía y tracking (el que se hace ahora)

El entrenador marca cuatro pitidos en el vídeo: inicial, final de la primera parte, inicio de la segunda y pitido final. Visión recorre solo esos dos tramos, a 10 fotogramas por segundo. No se escribe la ruta: el programa recuerda el archivo o abre el selector del Mac. El JSON queda al lado del partido (`nombre.kabine-vision.json`) y hay otra copia en `~/.kabine/vision`. El descanso y lo de antes y después no entra.

Lee los **dos equipos**, cada futbolista, el balón y el árbitro. Mantiene el mismo id cuando la cámara de Veo panea. Calcula la **homografía sola**, frame a frame, y la suaviza. Si un frame cae fuera del campo, se descarta esa homografía y se arrastra la última válida (la misma regla que Hudl Tracking Data aplicó el 13 may 2026: rechazar calibraciones fuera del césped).

Sale en el JSON: `tracks` de los dos equipos, `ball`, `homography`, y metros **visibles** por track (solo lo que entra en cuadro, con la etiqueta de error ~20 %). Las velocidades imposibles se tiran y la posición se suaviza (Hudl, 13 ago 2026). No hay eventos, no hay recortes automáticos y no hay pizarra en este módulo.

La puerta de ingeniería no cambia: antes de una parte entera, 60 s de un partido Veo de 4–5 GB. El botón de producto ya no es «60 s alrededor del cabezal»: es inicio y final.

Tracker de salida: **BoT-SORT** en `roboflow/trackers` (Apache 2.0), que ya compensa el paneo. En el mismo paquete está **McByte** (también Apache, compensación de cámara encendida). En su propia tabla, McByte sube el HOTA de SoccerNet de 84,5 a 85,0 y el de SportsMOT de 73,8 a 76,5, pero pide máscaras y puede alargar la noche en el Mac. Se prueba en el mismo clip de 60 s y solo sustituye a BoT-SORT si el id aguanta los cruces y el tiempo sigue siendo de una noche. McByte++ (arXiv 2608.15688, ago 2026) queda fuera hasta que el código exista y la licencia sea Apache o MIT.

### 2 — Dibujo con homografía (después; no ahora)

Cuando el módulo 1 dé una homografía estable, una sala de pintar al estilo **Hudl Sportscode Studio**. No es otra mesa de análisis. Recibe **copias** de los cortes que ya hacemos (vídeo análisis, revisión o biblioteca). Borrar o retocar el corte de origen no borra el dibujo: Studio lo separó así el 22 jul 2026.

Dos capas:

- Dibujo pegado al fotograma (flecha, círculo, texto).
- Dibujo pegado al césped (zona, línea de conducción, flecha de pase). La homografía del módulo 1 lo mantiene mientras Veo panea. Si la homografía falla, el entrenador arrastra unos puntos a las líneas («calibration frame» de Studio) y se guarda para ese corte.

Seguir a un jugador es elegir su track y pulsar el equivalente de **Track Full**: el gráfico lo acompaña el tramo del corte. Los colores salen de la plantilla de Kabine, no de un catálogo externo. Presets de estilo para no redibujar el mismo lenguaje cada semana.

La sala de presentación sigue siendo la sala de presentación. Pintar es esta sala, sobre el corte, con el campo ya calibrado.

### 3 — Eventos y recortes automáticos (después; no se estudia ahora)

Cuando el tracking se crea, se monta el eventing y los recortes solos. El detalle viejo (spotting, fases, físico fino) sigue más abajo en «Fases de implementación» 2–5. No se abre esa línea hasta que el módulo 1 se vea bien en una parte.

El mercado ya lo vende (Veo Analytics 2, 19 ago 2026: distancia, velocidad, sprints, entradas y pases desde la Veo, sin wearables). SoccerNet 2026 midió anticipación de acciones y el mejor `mAP` medio fue 24: no da para cortar el vídeo del entrenador solo. Por eso el módulo 3 espera.

---

## Qué ha salido desde la pausa del 11 sep 2026

| Fecha | Qué | Qué nos llevamos |
|---|---|---|
| 13 may 2026 | Hudl Tracking Data v1.1.0 | Tirar homografías que caen fuera del campo. |
| 22 jul 2026 | Sportscode Studio Notes 01 | Cortes independientes, línea de conducción, colores de equipo automáticos, captura del fotograma. |
| 13 ago 2026 | Hudl Tracking Data v2.0.4 | Suavizar posiciones y corregir velocidades imposibles. |
| 13 ago 2026 | Nacsport 10.1 | Presentaciones en directo desde el etiquetado. Idea para el módulo 3, no para ahora. |
| 19 ago 2026 | Veo Analytics 2 | Una sola Veo ya da ficha por jugador. Nuestro listón de «metros visibles». El vídeo de ellos sale a su nube; el nuestro no. |
| ago 2026 | McByte++ (arXiv 2608.15688) | Tracking largo sin reentrenar. Esperar código y licencia. |
| 3 sep 2026 | TactiVision, muestra UCL | Una cámara táctica → tracks, identidad, homografía, mapas. Misma forma que el módulo 1. No es dependencia. |
| 22 sep 2026 | Hudl Tracking Data v2.0.5 | Si cambia la ficha del partido, se puede reprocesar el tracking. El JSON de Visión se puede volver a tirar sobre el mismo MP4. |
| 24 sep 2026 | Nacsport en macOS Golden Gate | Nada de visión. El worker del Mac tiene que seguir en Apple Silicon. |
| 2026 | SoccerNet Challenges (arXiv 2607.07320) | Cinco tareas nuevas: anticipar la acción, asignarla a dorsal, vista nueva, localizar en un campo ya calibrado y preguntas. La localización Synloc asume cámara fija y calibración dada: no sustituye nuestra homografía de Veo. |

Piezas que se leen y no se copian si arrastran YOLO AGPL: [Falcon](https://github.com/duarteprazeres/falcon) (el pipeline más parecido a Veo: flujo óptico, Kalman del balón 10 frames, unir tracks por color, homografía manual si fallan los keypoints) y el demo de `roboflow/sports`. [TactiFootVision](https://github.com/RedHot099/TactiFootVision) dice Apache 2.0 y ya encadena RF-DETR, tracking, equipos y homografía: se mira el mapa de fases antes de escribir el worker, y se deja fuera si mete Ultralytics.

> PDF **leído** (8 páginas): *Open-Source Computer Vision Stack for Soccer Video Analysis: Tools, Models, and Licensing Guide (2025-2026)*. TL;DR del propio informe: Roboflow (`sports` MIT + `trackers` Apache + `supervision` MIT) y detector **RF-DETR Apache 2.0**; no Ultralytics AGPL en producto cerrado; SoccerNet GSR es el SOTA académico (GPL + NDA de vídeos).
>
> Clip de prueba **leído**: `_inbox/prueba 2.mp4` — Veo, 20,85 s, 1920×1080, 29,97 fps, H.264, sin audio, 11 MB. Kit **blanco** vs rival azul oscuro; portero rival amarillo; árbitro azul claro. Cámara alta táctica que **panea** (al final se acerca a la portería izquierda).
>
> Writeup práctico extra: [Ignit](https://ignit.group/blog/world-cup-2026-building-football-analytics-with-open-source-computer-vision). Tareas: [SoccerNet](https://www.soccer-net.org/tasks).

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

El orden de producto es el de los tres módulos de arriba. El detalle histórico:

1. **Ahora.** Tracking de los dos equipos, jugadores y balón, más homografía automática, entre un inicio y un final. Metros visibles como consecuencia.
2. **Después.** Dibujo pegado al césped, sobre copias de nuestros cortes.
3. **Después, y sin estudiarlo ahora.** Eventos, recortes automáticos, fases y colecciones.

La TV muestra &lt;50 % de la actividad. Metros y km son solo de lo que entra en cuadro. Error típico ~20 %. No prometemos fuera de juego, xG ni físico de 90 min.

---

## De dónde sale el stack (documento open-source)

El artículo de Ignit monta un overlay de fin de semana en un portátil Apple Silicon, **sin entrenar nada y sin GPU en la nube**. Encadena estas etapas; cada una alimenta la siguiente:

| Etapa | Qué hace | Pieza open-source |
|---|---|---|
| Detección | Cajas por frame: jugador, portero, árbitro, balón | **Producción:** [RF-DETR](https://github.com/roboflow/rf-detr) (Apache 2.0). Probe: pesos Universe [football-players-detection](https://universe.roboflow.com/roboflow-jvuqo/football-players-detection-3zvbc). Ultralytics YOLO solo con licencia Enterprise; AGPL no entra en Kabine cerrado. |
| Tracking | La misma persona sigue siendo el mismo id | **Producción:** [`roboflow/trackers`](https://github.com/roboflow/trackers) Apache 2.0 con **BoT-SORT** (compensa paneo/zoom Veo). No BoxMOT (AGPL). |
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
- Kit **blanco**: no fiarse solo de KMeans (árbitro, líneas, sobreexposición). Pin `our_kit: "white"`, sacar la clase referee del clustering, y que el usuario confirme el cluster.

---

## Licencias (el PDF es una guía de esto)

Kabine es producto cerrado. **No copiar** motores GPL/AGPL al repo. El worker puede *llamar* a pesos con licencia permisiva.

| Pieza | Licencia | ¿En Visión? |
|---|---|---|
| [RF-DETR](https://github.com/roboflow/rf-detr) Nano–Large | Apache 2.0 | **Detector por defecto** |
| [`roboflow/trackers`](https://github.com/roboflow/trackers) (SORT, ByteTrack, OC-SORT, BoT-SORT) | Apache 2.0 | **Tracker de producto** |
| [`roboflow/sports`](https://github.com/roboflow/sports) | **MIT** (el demo arrastra YOLO AGPL) | Pipeline de referencia RADAR; no usar su YOLO |
| Ultralytics YOLO (v8/11/26) | **AGPL-3.0** o [Enterprise de pago](https://www.ultralytics.com/license) | No en el producto. Probe local aparte, como mucho |
| [Tactix](https://github.com/rondo-labs/Tactix) | **GPL-3.0** | Ideas sí; código no |
| [PitchWise.Lab](https://github.com/arturbuszka/PitchWise.Lab) | **GPL-3.0** (.NET / GSR) | Igual |
| SoccerNet kits (TrackLab, sn-gamestate, spotting) | mezclan GPL / investigación / NDA de vídeos | Usar tareas y métricas; no vender sus pesos |
| [SoccerMaster](https://github.com/haolinyang-hlyang/SoccerMaster) (CVPR 2026) | research; YOLO+GSR+Qwen | Candidato a largo plazo, no v0 |
| RF-DETR XL/2XL (`rfdetr[plus]`) | PML 1.0 (no Apache) | No |

Tactix es el pipeline más parecido a lo que queremos (detección → tracks → kits → homografía → minimapa → Voronoi / pases / transiciones / ABP, export JSON). Lo usamos de **mapa de fases**, no de dependencia.

Tutoriales MIT (también arrastran YOLO AGPL por dentro): [abdullahtarek/football_analysis](https://github.com/abdullahtarek/football_analysis) (el más clonado), [Tony-Luna/soccer-video-analytics](https://github.com/Tony-Luna/soccer-video-analytics). Calibración SOTA: [No-Bells-Just-Whistles](https://github.com/mguti97/No-Bells-Just-Whistles), [PnLCalib](https://github.com/mguti97/PnLCalib). Balón: TrackNet o dataset [football-ball-detection](https://universe.roboflow.com/roboflow-jvuqo/football-ball-detection-rejhg) + slicer. Offside: no hay repo llave en mano.

Cámara **Veo** (nuestro clip): el PDF dice que en vista amplia los jugadores salen más pequeños y que BoT-SORT importa porque hay paneo. SoccerTrack v2 es para cámara fija; Veo no es fija.

Hardware (PDF): hace falta GPU. T4 Colab para el tutorial; RTX 3090 ~3 GB VRAM en el ejemplo Roboflow; GTX 1650 ~2–4 FPS 720p. Esta VM cloud **no tiene NVIDIA** — aquí solo probe de frames. El worker real corre en vuestro PC (MPS o CUDA).

---

## Probe `prueba 2.mp4` (hecho)

| Campo | Valor |
|---|---|
| Duración | 20,85 s |
| Imagen | 1920×1080, 29,97 fps, H.264 High, ~4 Mbps, sin audio |
| Cámara | Veo elevada, 3/4 de campo, paneo hacia portería |
| Nuestros | Blanco |
| Rival | Azul oscuro; portero amarillo |
| Árbitro | Azul claro (no meterlo en el cluster de kits) |
| Césped | Artificial, líneas naranjas + blancas, de noche con torre |

### Bench Mac (hecho) — Apple Silicon, `device: mps`, `prueba2.mp4`

Terminal no podía leer el Escritorio hasta dar permiso en Ajustes → Privacidad → Archivos y carpetas. El archivo real es `~/Desktop/prueba2.mp4` (no `prueba 2.mp4`). Copia a `kabine-vision-bench/clip.mp4`. Backend **imageio** (OpenCV headless + FFmpeg embebido).

| | Esta VM Linux CPU | **Mac arm64 MPS** |
|---|---|---|
| Decode | 550 fps (OpenCV) | 143 fps (imageio) |
| Detect ~5 fps (21 s) | 3,9 s · 27 inf/s | **9,2 s · 11 inf/s** |
| Extrapolación 90 min (solo cajas) | ~17 min | **~40 min** |
| RAM | ~530 MB | **512 MB** |
| Personas/frame | 8–19 (media 12) | 8–18 (media 12,4) |
| Balón COCO | 0 | **0** |

Metal **sí** está activo. El Mac es más lento que esta CPU porque imageio copia cada frame; sigue cabiendo en una tarde. Pipeline real ×2–×4 → una noche. **No hace falta mini PC** para un partido. No hace falta 30 fps.

### Bench CPU (esta VM, `yolo11n` COCO, 640 px) — `scripts/vision_bench.py`

Clip `prueba 2.mp4` (20,85 s, 625 frames, 1080p). Decode OpenCV ~550 fps. RAM ~530 MB: **el MP4 de 4–5 GB no se carga entero**.

| Modo | Inferencias | Tiempo | Velocidad | Extrapolación 90 min (solo cajas) |
|---|---|---|---|---|
| Decode | 0 | 1,1 s | 550 fps de lectura | ~5 min |
| Stride 6 (~5 fps) | 105 | **3,9 s** | 27 inf/s | **~17 min** |
| Stride 1 (30 fps) | 625 | 12,7 s | 49 inf/s | ~55 min |

Siguiente: 60 s de un partido Veo de 4–5 GB (`--max-seconds 60 --backend imageio`). El HSV del probe CPU falla con la luz verde; en producto será SigLIP + pin blanco.

Script de cajas anotadas: `scripts/vision_probe.py`. Script comparable Mac ↔ esta VM: `scripts/vision_bench.py`.

---

El MP4 y el PDF se **quitan de git** (siguen en `_inbox/` local, gitignore). No deben vivir en GitHub.

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

Pintar sobre el césped es el módulo 2, cuando la homografía aguante. Hasta entonces la sala de presentación no se convierte en pizarra de vídeo.

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
  "our_kit": "white",
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

Las fases 0 y 1 son el módulo 1. La fase 2 en adelante es el módulo 3 y no se abre ahora. El módulo 2 (dibujo) no tenía fase propia: queda descrito arriba y se hace entre el 1 y el 3.

### 0 — Cascarón (primer merge)

- Toggle **Visión** en la mesa.
- Job `idle | running | done | error`.
- El entrenador marca **inicio y final**. El primer disparo de prueba sigue siendo 60 s; el control de producto es el tramo.
- Worker local: HTTP `127.0.0.1` o cola en disco. Si no está instalado, la UI dice cómo levantarlo. Render no ejecuta inferencia.
- Escribir JSON vacío + status.

### 1 — Cuerpos en el césped

- RF-DETR + BoT-SORT (prueba McByte en el mismo tramo) + keypoints + homography suavizada + minimapa.
- “Estos son los nuestros”: kit **blanco** por defecto; el usuario confirma el cluster (blanco vs rival).
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

Ya está el paso de después del detector: `kabine_vision.run_span` acepta o sostiene la homografía, separa los dos equipos, sostiene el balón hasta 10 fotogramas y no suma metros por encima de 12 m/s. Probado con cajas sintéticas. Aún no están el HTTP, los pesos ni la mesa.

- `GET /health`
- `POST /jobs` `{ path, start_s, end_s, our_team }` — path de archivo local, no URL.
- `GET /jobs/:id` → status + ruta del JSON.

UI: si `/health` falla, card “Instala Visión en este PC” con `pip`/`uv` y el comando. Sin worker no hay análisis y el partido sigue usándose a mano.

No meter pesos en el repo. Primera corrida los baja a `~/.cache/kabine-vision/`.

---

## Cómo correrlo (hardware y coste)

**No alquilar un servidor en Render ni un GPU cloud por cada partido.** El MP4 de 90 min no sale del PC. Render es la web; Visión es un worker en la máquina que ya tiene el archivo de Veo.

Es **un disparo después del partido**, no en directo. Pulsa «Analizar», se genera el JSON una vez, y esa semana se recorta a mano encima. No se paga por minuto de juego.

El MP4 de partido son **4–5 GB** (Veo). Eso cabe en el Mac y en un disco USB. No justifica alquilar GPU: subir 5 GB a RunPod solo para ahorrar una noche en el Mac no merece la pena.

---

| Opción | Cuándo | Coste | Privacidad |
|---|---|---|---|
| **1. El Mac de Veo (Metal / MPS)** | Empieza aquí. El clip de prueba ya es Veo. | 0 € extra. Tiempo: 21 s en minutos; un tiempo en **unas horas / de noche** (M1 más lento, M4 Pro/Max mejor). | El partido no se mueve |
| **2. Mini PC NVIDIA en el club** (RTX 4060 8 GB o 4070) | Si el Mac se queda corto o hay varios partidos/fin de semana | Compra **una vez** (~300–800 €). Luz ~céntimos por partido. El PDF cita ~3 GB VRAM en un 3090 para el ejemplo Roboflow. | Igual: disco local |
| **3. GPU alquilada** (RunPod / Vast / Lambda, 1–3 h) | Solo si un día aceptáis que el vídeo **salga** del edificio | Orden de **1–5 USD por partido**. Subir 4–5 GB es rápido; el problema es privacidad, no el peso. | **No** es el flujo Kabine |

Colab T4 (el tutorial de Roboflow) también se lleva el vídeo a Google. No.

**Recomendación (partido 4–5 GB):** analizar **en este Mac**, una vez, a **~5 fps** (1 de cada 6 frames). El peso no es el problema (cabe en disco; OpenCV lo lee a ~550 fps). El tiempo sí: por eso no se manda a Render ni a un GPU alquilado.

### Escalera de pruebas (mismo script)

En el Mac: el vídeo lo lee **imageio-ffmpeg**; OpenCV headless solo hace falta para YOLO. No desinstales headless. Copia el mp4 **fuera** del Escritorio. El script se baja de `main` (`curl -fL`), nunca de una rama `cursor/*`.

```bash
PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
mkdir -p /Users/User/kabine-vision-bench
cd /Users/User/kabine-vision-bench
curl -fL -o vision_bench.py https://raw.githubusercontent.com/Ignav99/trainingHub/main/scripts/vision_bench.py
$PY -m pip install --only-binary=:all: opencv-python-headless imageio imageio-ffmpeg ultralytics numpy
ls -lh ~/Desktop/*.mp4 ~/Downloads/*.mp4 2>/dev/null
cp "/Users/User/Desktop/prueba 2.mp4" ./clip.mp4
ls -lh ./clip.mp4
$PY vision_bench.py --video ./clip.mp4 --stride 6 --backend imageio
$PY vision_bench.py --video ./partido.mp4 --max-seconds 60 --stride 6 --backend imageio
```

Pegad el JSON. Decisión:

| 60 s del partido a stride 6 | Qué implica un 90 min | Siguiente paso |
|---|---|---|
| < ~20 s | Detect ~30 min; pipeline completo una tarde | Seguir a 10 min, luego un tiempo de noche |
| 20–90 s | Una noche | Seguir; no comprar nada aún |
| \> 2 min o el Mac se queda sin RAM | Mini PC NVIDIA una vez | No alquilar GPU por partido |

El chip (M1/M2/M3/M4 + GB) sigue ayudando a estimar, pero **el JSON de 60 s manda**.

---

## Fuera de alcance (hasta que el módulo 1 se vea)

- Subir el MP4 a la API.
- Entrenar SoccerNet en este entorno (no hay GPU de usuario aquí).
- xG, orbis, fuera de juego automático.
- Sustituir la botonera humana.
- Construir el módulo 2 (dibujo) o el módulo 3 (eventos y recortes) antes de que el tracking de una parte se crea.
- Leer dorsales como identidad principal. El dorsal llega con el módulo 3, si llega.

---

## Cómo pasarme archivos (agente cloud)

Este agente **no ve** `/Users/User/Desktop` ni el disco del Mac. Corre en una VM Linux.

| Dónde | ¿Lo leo? |
|---|---|
| Escritorio del Mac (`/Users/User/Desktop`) | No |
| Chat de Cursor (arrastrar PDF/clip) | Sí — lo mejor |
| `/workspace/_inbox/` en este repo (gitignore) | Sí, si el archivo llega a la VM |
| Escritorio de la VM (`/home/ubuntu/Desktop`) | Sí, pero solo hay PDFs viejos de Kabine; tú no puedes copiar ahí desde el Mac |
| GitHub / Render | **No** — el upload a `_inbox/` en main se borra; el partido no va al repo |

El PDF y `prueba 2.mp4` ya se leyeron desde `_inbox/` (upload a GitHub). Siguientes clips: mismo `_inbox/` **sin commit**, o un recorte aún más corto.

## Preguntas abiertas (no bloquean el módulo 1)

1. ~~Cámara~~ → **Veo** (clip de prueba).
2. ~~Mac~~ → arm64, **MPS**. 21 s a 5 fps = 9,2 s (~40 min / 90 min solo cajas). Falta 60 s del partido 4–5 GB.
3. ~~PDF~~ → leído; RF-DETR + `roboflow/trackers` BoT-SORT.
