# Visión — memoria para otra IA

Consulta rápida. El chat largo no hace falta. Última pasada: 28 oct 2026, Europe/Madrid.

Producto: **Kabine / TrainingHub**. Módulo **Visión**, dentro de Video Análisis (`/video-analisis`). No es una ruta nueva.

Los módulos 2 (dibujo tipo Sportscode) y 3 (eventos y recortes automáticos) están descritos en `docs/VISION_PLAN.md` y **no se construyen** hasta que un partido real de noche deje jugadores, equipos, balón y homografía creíbles.

El partido (4–5 GB, Veo) **no sale del PC**. Ni Render, ni Supabase, ni una GPU alquilada.

---

## Dónde está cada cosa

| Qué | Ruta |
|---|---|
| Panel en la mesa | `frontend/src/components/video-analyzer/VisionProbe.tsx` |
| Se abre desde | `frontend/src/components/video-analyzer/VideoAnalyzer.tsx` (botón Visión, solo con vídeo local). Recibe `partidoId`. |
| Tipos y parsers (colores, dorsales, césped) | `frontend/src/lib/visionPreview.ts` |
| Estilos | `frontend/src/components/video-analyzer/video-desk.css` (clases `vd-vision-*`) |
| Worker local | `vision-worker/kabine_vision/` |
| Arranque | `python3 scripts/vision_server.py` → `127.0.0.1:8765` |
| Lectura de campo (camisetas, líneas, balón, dorsal) | `vision-worker/kabine_vision/field.py` |
| Fichas de color del ejemplo antiguo | `vision-worker/kabine_vision/blobs.py` |
| Tracks, equipos, metros | `vision-worker/kabine_vision/pipeline.py`, `tracking.py` |
| Homografía DLT | `vision-worker/kabine_vision/homography.py` |
| Partido entero, JSON, métricas | `vision-worker/kabine_vision/match.py` |
| HTTP | `vision-worker/kabine_vision/server.py` |
| Plan y handoff | `docs/VISION_PLAN.md`, `docs/VISION_HANDOFF.md` |

JSON en disco (`encoding: "pack1"`, sigue siendo `.kabine-vision.json`):

- Al lado del vídeo: `mismo-nombre.kabine-vision.json`
- Copia del programa: `~/.kabine/vision/partidos/{nombre}-{bytes}.kabine-vision.json`
- Índice: `~/.kabine/vision/index.json` (clave `filename:size`)
- Override: `KABINE_VISION_DIR`
- Escritura: `vision-worker/kabine_vision/compact.py`. El worker expande al leer (`load_sidecar`). El navegador sigue recibiendo muestras `{t, px, py, x, y}`.

La web de GitHub no acepta un archivo de más de **25 MB**. El JSON largo de Nervión pesaba 17,5 MB y, con x,y en casi todas las muestras, pasa de 25 MB. pack1 guarda diferencias en vez de repetir las claves. Medido el 28 oct 2026 sobre el archivo real: **17,5 MB → 4,8 MB**, las 370107 muestras iguales. El mismo partido con x,y en todas las muestras cabe en **6,1 MB**.

Recomprimir el archivo que ya existe, sin volver a leer el vídeo:

```bash
python3 scripts/vision_compact.py "/ruta/al/partido.kabine-vision.json"
```

Al abrir un JSON antiguo, el server también lo reescribe en pack1. Dentro del archivo, el campo `pack` explica las letras a otra IA. `P` solo píxel, `F` césped, `R` velocidad rechazada, `B` balón, `H` balón retenido. Tiempo en ms, píxel en décimas, x/y en diezmilésimas del campo. La primera muestra de cada track es absoluta y el resto son diferencias. `metrics` queda en claro al principio.

Si los pitidos, los dos colores y los dorsales coinciden con el archivo (±0,05 s en los pitidos), `POST /match` no vuelve a leer el vídeo.

---

## Tecnologías y licencias

Kabine es producto cerrado. No copiar motores GPL/AGPL al repo.

| Pieza | Licencia | Estado en el código |
|---|---|---|
| OpenCV + NumPy | Apache / BSD | Lo que corre hoy en el worker |
| RF-DETR Nano–Large | Apache 2.0 | **Detector de producto. Todavía no está en el Mac** |
| `roboflow/trackers` BoT-SORT | Apache 2.0 | Tracker previsto (Veo panea). No integrado |
| McByte (mismo paquete) | Apache 2.0 | Solo si en un clip de 60 s aguanta mejor el id que BoT-SORT |
| `roboflow/sports` TeamClassifier (SigLIP) | MIT | Previsto para kits. No usar el YOLO de su demo |
| `roboflow/supervision` | MIT | Previsto para teselas del balón |
| Ultralytics YOLO | AGPL | **Prohibido en producto.** Solo hubo un probe local |
| Tactix / PitchWise.Lab | GPL | Ideas sí, código no |
| SoccerNet GSR / TrackLab | GPL + NDA | Más adelante |

Kit nuestro por defecto en el club: blanco. El entrenador ahora puede cambiar los dos colores. `our_team` sigue siendo `0` (el nuestro).

Cámara: Veo, de noche, 3/4 o campo entero, paneo. Vídeo típico 1920×1080, 4–5 GB.

---

## Qué hace el módulo 1

1. El entrenador marca cuatro tiempos, como antes: pitido inicial, final de la 1ª, inicio de la 2ª, pitido final.
2. Marca **camiseta nuestra** y **camiseta rival** (selector de color). Si el vídeo se abre desde un partido, se rellenan con `GET /partidos/{id}/equipaciones` → `color_camiseta_principal` de la propia y de la rival.
3. Los dorsales:
   - Nuestros: `GET /convocatorias/partido/{id}` (`dorsal`, o si falta el del `jugador`).
   - Rivales: `partido.notas_pre` → JSON del anotador → `rivalDorsals` (enteros 0–99).
   - Se pueden corregir en los dos campos de texto. El botón «Usar dorsales del acta» vuelve a copiarlos.
4. `POST /match` manda `whistles`, `kits: {ours, rival}` y `roster: {ours, rival}` más la ruta que el Mac ya recuerda (`/recall`, `/choose`).
5. Solo se decodifican los dos tramos, a 10 fps (`stride = round(fps_video / 10)`). El descanso no se lee.
6. El minimapa es una comprobación: como mucho 1800 puntos. El archivo del disco guarda todas las muestras.

Endpoints: `GET /health`, `POST /fixture`, `POST /preview`, `POST /preview-file`, `POST /match`, `GET /match?path=`, `POST /recall`, `POST /choose`.

Chrome desde `https://traininghub-frontend-eu.onrender.com` bloquea `http://127.0.0.1` hasta que el candado permita **Acceso a la red local**. Comprobación: abrir `http://127.0.0.1:8765/health` y ver `{"ok": true}`.

En el Mac el proceso tiene que seguir en la terminal. Python que ya funcionó: `/Users/User/.pyenv/versions/3.11.9/bin/python3`. Tras cada cambio de `main`: `git checkout main && git pull` y volver a arrancar el server. Si no, las rutas nuevas responden 404.

---

## Lectura actual (no es RF-DETR)

`detect_field` en `field.py`, solo cuando llegan los dos colores. Sin colores, `/match` sigue en `detect_blobs` (el ejemplo dibujado de fichas).

| Señal | Cómo |
|---|---|
| Jugador | Máscara HSV del color de camiseta. Apertura morfológica para quitar líneas finas. Alto/ancho entre 1,15 y 5,5. Área entre ~0,07 % y 4,5 % del fotograma. NMS. Tope 26 jugadores y 4 árbitros por fotograma |
| Equipo | El color más cercano. El nuestro es el de «camiseta nuestra» → `team: 0`. Ya no depende de partir la luminancia en dos (eso dejó todos los `team` a null en Nervión) |
| Árbitro | Amarillo HSV, salvo que una de las dos camisetas ya sea amarilla |
| Homografía | Líneas blancas o naranjas finas sobre césped. El cuadrilátero exterior se mapea a 105×68 m. Si no hay líneas, esquinas naranjas del ejemplo (fallback). DLT con normalización de Hartley, el centro del fotograma tiene que caer en el campo (margen 8 m), y se suaviza con la homografía anterior. Una calibración mala no sustituye a la última buena |
| Balón | Mancha pequeña y redonda (relleno del recuadro ≥ 0,55, aspecto ~1), fuera de un jugador. También el magenta del ejemplo |
| Dorsal | Recorte del torso si la caja es bastante alta. Tinta distinta de la camiseta, comparada con una fuente 5×7. Hace falta verlo 2 veces en el mismo track. Se tira si el número no está en el acta de ese equipo. Un mismo dorsal no se queda en dos tracks del mismo equipo a la vez |
| Identidad | IoU + cercanía + color parecido. No se asocia un track que lleva más de 1,2 s sin verse. No se abre un id nuevo si ya hay 26 jugadores vivos |

En fotogramas anchos de Veo el dorsal ocupa pocos píxeles: la mayoría de los números quedarán vacíos hasta tener un lector de cerca. El acta igual viaja en el JSON (`roster`), que es la lista legal.

A 1920 px de ancho la máscara baja a 960 px. El dorsal se lee en el fotograma original.

---

## Contrato JSON (`kabine.vision.v0`)

Campos que ya había: `source`, `job`, `whistles`, `spans`, `tracks[]` (`id`, `team`, `role`, `samples`), `ball`, `homography`, `physical`, `events` (vacío), `phases` (vacío), `preview`.

Campos de esta pasada:

| Campo | Significado |
|---|---|
| `kits` | `{ours, rival}` en `#rrggbb`, o null si no se mandaron |
| `roster` | `{ours: number[], rival: number[]}` del acta o de lo que escribió el entrenador |
| `tracks[].dorsal` | Número aceptado, o null |
| `our_kit` | El hex nuestro si hay kits; si no, `"white"` |
| `metrics` | Ver abajo |
| `preview.detector` | `"field"` con colores, `"blobs"` sin ellos |
| `preview.metrics` | La misma métrica, también en la respuesta corta del minimapa |

`metrics`:

`players`, `teams_assigned`, `team_coverage`, `dorsals_read`, `dorsals_in_acta`, `ball_samples`, `homography_accepted`, `homography_primera`, `homography_segunda`, `samples`, `samples_on_pitch`, `pitch_coverage`, `max_players_in_frame`, `with_metres`.

`source.duration_s` es la suma de los dos tramos (antes se quedaba solo con la primera parte).

---

## Resultado real: CAC B vs Nervión (línea de base)

Archivo que el entrenador subió a propósito a `vision-worker/CAC B VS NERVION.kabine-vision.json` (commit `f5e61fa` en `main`, 17,5 MB). Es un partido de verdad, no un fixture. No borrarlo en un PR de código salvo que lo pida.

Detector de aquella pasada: **blobs**. El contenedor funcionó. El contenido no es tracking.

| Medida | Valor |
|---|---|
| Resolución / fps de muestra | 1920×1080, 10 fps |
| Pitidos (s) | 407,8 · 3252,1 · 4349,8 · 7236,5 |
| Fotogramas guardados | 57254 |
| Tracks | 5737 (5280 jugador, 457 árbitro) |
| `team` | null en todos |
| Muestras de jugador | 356043. Con x,y de campo: 41762. Solo píxel: 314281. `rejected_speed`: 2032 |
| Dónde hay césped | Solo 1ª parte, desde ~2759 s, unos 9 s de homografía aceptada. 2ª parte: 0 |
| Homografías | 4337 guardadas, 9 aceptadas (2759,7–2768,4 s) |
| Balón | 0 |
| Jugadores en un fotograma | mediana 4, p90 19, máximo 53 |
| Metros | mediana 0. Suma 11845,9 m repartida en tracks rotos. No usable |
| Copia | `~/Desktop/VEO/J5 CAC B VS NERVION/` y `~/.kabine/vision/partidos/CAC_B_VS_NERVION-4340468614.kabine-vision.json` |

Por qué: el detector buscaba colores exactos del ejemplo (blanco, azul, amarillo, esquinas naranjas, balón magenta). En Veo de noche eso marca líneas, vallas y camisetas como miles de «jugadores». Al no haber dos grupos de color, `assign_teams` no asignaba equipo. La 2ª parte resetea la homografía y no volvió a calibrar.

Hay que volver a lanzar ese partido **después** de `git pull` en `main` y de reiniciar el server, con los colores de las camisetas y el acta. Eso debe mover equipo, tope de gente por fotograma, líneas y balón. No va a igualar a RF-DETR.

---

## Segunda pasada: Nervión con camisetas y acta (28 oct 2026, 15:57 Europe/Madrid)

Archivo sustituido en `main` por el commit `e083ee0` (`Add files via upload`). Mismo nombre, ahora `pack1`, 4,9 MB. Detector `field`. Pitidos iguales. 57254 fotogramas. Camiseta nuestra `#ffffff`, rival `#fff157`. Acta nuestra: 2, 3, 5, 7, 13, 18, 19, 20, 21, 23, 24, 1, 4, 8, 10, 16, 17, 25. Acta rival en el JSON: solo 3, 8 y 15.

| Medida | Blobs (antes) | Field (esta pasada) |
|---|---|---|
| Tracks de jugador | 5280 | 14752. Árbitros: 0 |
| Equipo | null en todos | todos etiquetados: 4199 nuestros, 10553 rival |
| Muestras de jugador | 356043 | 160961 |
| Con x,y y sin salto imposible | 39730 | 56101. De esas, 28268 caen fuera del rectángulo del campo |
| Homografías aceptadas | 9, unos 9 s, solo 1ª | 1572 (1478 en la 1ª, 94 en la 2ª). Racha más larga: 6,5 s. Ninguna de 30 s |
| Balón | 0 | 56564 posiciones. Velocidad mediana 363 m/s. No es el balón |
| Gente en un fotograma | mediana 4, máximo 53 | mediana 3, p90 7, máximo 17 |
| Duración de un id | mediana ~2 s | mediana 2 muestras (0,2 s). p90: 22 muestras. El más largo: 67 s y casi todo rechazado por velocidad |
| Dorsales | 0 | 23 tracks. El más estable: el 1 nuestro, 30 s; el 5, 29 s. El mismo número sale en varios tracks |
| Metros | suma 11846, no usable | suma 15647 m. Mediana de quien se mueve: 1,2 m. No usable |

Qué sí cambió: las dos partes tienen alguna coordenada, el tope por fotograma bajó de 53 a 17, y el acta llega a leer un dorsal de cerca durante unos segundos.

Qué sigue sin valer para el módulo 2: la identidad (un id dura un par de décimas), el césped (la calibración no aguanta) y el balón (cualquier mancha blanca redonda). El rival `#fff157` es amarillo, así que el lector de árbitro se apaga. La máscara del blanco coge cualquier zona clara. En la 2ª parte, 5982 de 7027 tracks quedan como rival y solo hay 94 homografías válidas.

---

## Resultado del vídeo dibujado (lo que sí está medido)

`write_field_fixture`: césped, líneas blancas, dos camisetas, dorsales 7 y 8 nuestros, 4 y 5 rivales, balón blanco, árbitro amarillo. 16 fotogramas, 10 fps, dos partes. No es Veo.

| Medida | Valor |
|---|---|
| `team_coverage` | 1,0 (8/8 tracks de jugador, 4 por parte) |
| Dorsales en el acta | 8/8, solo {4, 5, 7, 8} |
| Balón | 12 muestras |
| Homografías aceptadas | 12/12, 6 en cada parte |
| `pitch_coverage` | 1,0 |
| Máximo de jugadores en un fotograma | 4 |
| Tracks con metros | 8 |

Un 9 pintado y fuera del acta se descarta. Las esquinas naranjas, sin líneas blancas, siguen abriendo el campo. Tests: `python3 -m unittest tests.test_compact tests.test_field tests.test_module1 tests.test_match tests.test_preview` dentro de `vision-worker`. Front: `node --experimental-strip-types --test src/lib/visionPreview.test.ts`.

---

## Qué falta para fiarse de un partido de noche

1. **RF-DETR** (Apache) en el Mac, en `~/.cache/kabine-vision/`. Sustituye a la máscara de color. Sin esto, una camiseta blanca sigue pudiendo confundirse con una línea gruesa o una valla clara.
2. **BoT-SORT** (Apache) para que el id sobreviva al paneo de Veo. El IoU actual aguanta el vídeo dibujado; en Nervión los ids duraban unos 2 s.
3. Homografía de líneas de verdad con la cámara a 3/4, no solo el rectángulo exterior del campo entero. Si Veo no enseña las cuatro bandas, el mapeo a 105×68 m es falso.
4. Balón con modelo de fútbol (el COCO no lo vio en el bench de 21 s). La mancha redonda es un apaño.
5. Dorsal en plano corto, o un lector entrenado. El 5×7 solo vale cuando el número se ve grande.
6. Bench de 60 s del partido de 4–5 GB en el Mac, y después el partido entero otra vez. Comparar `metrics` con la tabla de Nervión.

No hacer todavía: módulo 2, módulo 3, subir el MP4, Ultralytics en el producto.

---

## Cómo rerun en el Mac

```bash
cd /ruta/al/repo
git checkout main && git pull
PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
$PY scripts/vision_server.py
```

La última línea tiene que ser `Visión escuchando en http://127.0.0.1:8765`. Dejar la terminal abierta. En Kabine: abrir el partido, Visión, cuatro pitidos, colores, dorsales, Guardar tracking.

Si el JSON ya está escrito y pesa más de 25 MB, no hace falta repetir el partido:

```bash
$PY scripts/vision_compact.py "/Users/User/Desktop/VEO/J5 CAC B VS NERVION/CAC B VS NERVION.kabine-vision.json"
```

Permiso de Escritorio para Terminal si el vídeo está en el Escritorio (Ajustes → Privacidad y seguridad → Archivos y carpetas).
