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

## Lectura `estable-1` (código, todavía sin repetir Nervión)

El JSON de las 15:57 no cambia solo. Hay que `git pull` en `main`, reiniciar `scripts/vision_server.py` y volver a guardar el partido. El archivo viejo lleva otro `reader` y se recalcula. El vídeo sigue en el Mac: esta pasada no lo ha vuelto a leer.

Lo que cambia en el código, medido en un vídeo dibujado con vallas blancas y manchas que saltan (`write_noise_fixture`, 24 fotogramas):

| Listón | Resultado del vídeo de ruido |
|---|---|
| Las vallas claras no cuentan como jugadores | máximo 4 jugadores en un fotograma |
| Un id aguanta | el track más largo tiene 10 muestras (1 s) |
| El equipo no cambia por un fotograma suelto | cobertura de equipo 1 |
| El balón no atraviesa el campo | ningún paso de menos de 0,25 s supera 40 m/s |
| Una homografía que teletransporta el césped se tira | el fotograma malo queda con `accepted: false` y se conserva la anterior |
| Sin calibración nueva, el césped caduca a los 1,5 s | un jugador 2 s después ya no lleva x,y |

Reglas: los pies tienen que pisar césped cuando el césped se ve; el equipo se vota; el balón se descarta si sale del campo o va a más de 40 m/s; dos homografías seguidas no pueden mover la imagen más de 18 m.

Eso quita el balón a 363 m/s y el césped pegado durante minutos. No pone a los jugadores de verdad: sigue haciendo falta RF-DETR en el Mac. Los módulos 2 y 3 siguen sin construirse.

---

## Tercera pasada: Nervión con `estable-1` (28 oct 2026, 16:52 Europe/Madrid)

Archivo sustituido en `main` por el commit `ebe39d9` (`Add files via upload`). Mismo nombre, `pack1`, `reader` `estable-1`, 2,8 MB. Detector `field`. Pitidos, camisetas y acta iguales. 57254 fotogramas.

| Medida | Field (15:57) | estable-1 (esta pasada) |
|---|---|---|
| Tracks de jugador | 14752. Árbitros: 0 | 14262. Árbitros: 0 |
| Equipo | 4199 nuestros, 10553 rival | 4165 nuestros, 10097 rival |
| Muestras de jugador | 160961 | 144151 |
| Con x,y y sin salto imposible | 56101. Fuera del rectángulo: 28268 | 7011. Fuera del rectángulo: 4130. Dentro: 2881 |
| Segundos con alguien dentro del campo | — | 190 s de 5731 s de partido |
| Homografías aceptadas | 1572 (1478 / 94). Racha 6,5 s | 1386 (1259 / 127). Racha 3,1 s. Ninguna de 5 s |
| Balón | 56564. Mediana 363 m/s | 4380 (1626 vistas, 2754 sostenidas). Mediana 13,7 m/s. Máximo 39,9. Ningún paso corto por encima de 40. 806 de las 1626 vistas caen fuera del rectángulo. La cadena mediana dura 1 muestra; la más larga, 53 |
| Gente en un fotograma | mediana 3, p90 7, máximo 17 | mediana 2, p90 6, máximo 16 |
| Duración de un id | mediana 0,2 s. El más largo: 67 s | mediana 0,2 s (2 muestras). p90: 3,0 s. El más largo: 58 s y casi sin metros |
| Dorsales | 23 tracks. El 1, 30 s; el 5, 29 s | 21 tracks, números 1, 2, 3, 4, 5, 7, 8, 13, 15, 16, 17 y 21. El 1, 30 s; el 5, 29 s; el 3, 25 s. El mismo número sigue saliendo en varios tracks |
| Metros | suma 15647 m | suma 1965 m. 529 tracks pasan de 1 m. El máximo de un id: 15 m |

Qué sí cambió: el balón ya no cruza el campo a cientos de metros por segundo, y las coordenadas que quedan se mueven a velocidad de persona (mediana 2,4 m/s entre las que no se rechazan). El archivo baja de 4,9 MB a 2,8 MB.

Qué sigue sin valer para el módulo 2: un id dura dos décimas, el césped válido cabe en unos tres minutos sueltos del partido, y el balón sigue siendo manchas claras en el borde (la mitad de las vistas caen fuera del rectángulo, y muchas de las de dentro están en la banda). El tope de 40 m/s frena el disparate; no encuentra el balón. La máscara de color de noche no ha cambiado. Sigue haciendo falta RF-DETR en el Mac. Los módulos 2 y 3 siguen sin construirse.

---

## Hacia dónde vamos

El módulo 1 se da por usable en un partido de noche cuando el JSON de Nervión cumpla las cuatro cosas a la vez:

1. La mediana de duración de un id pasa de 1 s.
2. Hay una racha de homografía de más de 8 s.
3. El balón está dentro del rectángulo, en cadenas de varias muestras, con mediana por debajo de 20 m/s.
4. Hay jugadores dentro del campo durante más de unos minutos, no solo 190 s.

`estable-2` ya está leído en Nervión (cuarta pasada, abajo). El balón es lo único cerca del listón. La mediana de id subió de 0,2 s a 0,6 s y se quedó corta de 1 s: quedan 2434 tracks de un solo fotograma, que no se pueden enganchar porque no reaparecen. Eso es el detector de color. El siguiente cambio es RF-DETR en el Mac, no otro ajuste de la máscara. La homografía sigue sin encadenar (racha máxima 4 s). BoT-SORT entra solo si, con RF-DETR, el paneo sigue partiendo ids que sí se ven. El dorsal y el modelo de balón van detrás. Los módulos 2 y 3 no se construyen hasta cumplir el listón.

Cada pasada se anota aquí con el commit del JSON, el `reader` y la tabla contra la anterior.

---

## Lectura `estable-2` (código, pendiente de volver a leer Nervión)

Responde a la tercera pasada, no a un vídeo nuevo. `reader` = `estable-2`. El JSON de las 16:52 no se reabre: hay que `git pull` en `main`, reiniciar `scripts/vision_server.py` y guardar el partido otra vez.

| Lo que salió mal a las 16:52 | Qué hace `estable-2` |
|---|---|
| Un id dura 0,2 s. Una caja sin solape no enganchaba aunque el jugador se hubiera movido un cuerpo | Se predice dónde va a estar y se engancha hasta 1,25 cuerpos, durante 2 s. Si el equipo ya está votado, no se cruza con el otro color |
| La racha de césped bajó de 6,5 s a 3,1 s. Un temblor de unos 20 m tiraba la calibración, y si el suavizado temblaba se tiraba también la medida buena | Se admite un paso de 28 m. Si el suavizado no vale, se queda la medida. Si los jugadores que ya seguimos salen disparados, esa calibración no entra. Sin líneas nuevas el césped aguanta 3 s. Si en un fotograma la mayoría de los pasos son imposibles, se suelta |
| 806 vistas de balón fuera del rectángulo y 2754 posiciones sostenidas. La cadena mediana dura 1 muestra | El balón tiene que caer dentro del rectángulo, confirmarse 3 veces en menos de medio segundo, y solo se sostiene 3 fotogramas si va a 20 m/s o menos. Una mancha suelta no se guarda |
| 4130 coordenadas de jugador fuera del rectángulo contaban como válidas | Un pie que cae a más de 6 m del césped se rechaza y no mueve el track |

Medido aquí, sin el MP4: 31 tests en `vision-worker`. Un jugador que desaparece 0,2 s y se mueve 40 px sigue siendo un solo id. Un balón que avanza despacio se queda; uno fuera del campo o que salta de banda a banda no se guarda. Las vallas claras siguen sin contar. El vídeo dibujado de camisetas y acta no empeora.

Esto todavía no pone a los jugadores de verdad. La pasada real está en la sección siguiente.

---

## Cuarta pasada: Nervión con `estable-2` (29 oct 2026, 10:59 Europe/Madrid)

El archivo llegó subido al chat, no por commit. `pack1`, `reader` `estable-2`, 2,4 MB. Detector `field`. Mismo partido, mismos pitidos, camisetas y acta. 57254 fotogramas.

| Medida | estable-1 (16:52) | estable-2 (esta pasada) | Listón |
|---|---|---|---|
| Tracks de jugador | 14262. Árbitros: 0 | 9014. Árbitros: 0. 2550 nuestros, 6464 rival | — |
| Duración de un id | mediana 0,2 s (2 muestras). p90: 3,0 s | mediana 0,6 s (4 muestras). p90: 6,3 s. El más largo: 81 s. 3936 tracks pasan de 1 s. 2434 siguen siendo un solo fotograma | mediana por encima de 1 s. No llega |
| Homografías aceptadas | 1386. Racha 3,1 s | 1567 (1450 en la 1ª, 117 en la 2ª). Racha 4,0 s. Ninguna de 5 s | racha de más de 8 s. No llega |
| Balón | 4380. Mediana 13,7 m/s. Cadena mediana: 1. 806 de 1626 vistas fuera | 792 (649 vistas, 143 sostenidas). Mediana 5,3 m/s. p90: 23,8. Cadena mediana: 4. La más larga: 36. 586 de 649 vistas dentro del rectángulo. 5 pasos cortos pasan de 40 m/s | dentro, cadenas de varias muestras, mediana bajo 20 m/s. Casi |
| Segundos con alguien dentro del campo | 190 s | 94 s. Coordenadas sin salto: 2632. Dentro del rectángulo y sin rechazo: 1418 | más de unos minutos. Empeora |
| Gente en un fotograma | mediana 2, máximo 16 | mediana 2, máximo 16 | — |
| Dorsales | 21 tracks. El 1, 30 s | 21 tracks. Números 1, 2, 3, 4, 5, 7, 8, 13, 15, 16, 17, 21 y 24. El 1 aguanta 62 s; el 8, 38 s; el 24, 36 s | — |
| Metros | suma 1965 m. Máximo de un id: 15 m | suma 886 m. 197 tracks pasan de 1 m. Máximo de un id: 28 m | — |
| Muestras de jugador | 144151 | 144416 | — |

Qué sí cambió: el enganche alarga los ids que reaparecen (el 1 pasa de 30 s a 62 s) y el balón por fin se parece a un balón: va a 5 m/s, aguanta varias muestras y casi todo cae dentro del campo.

Qué no llega: la mediana sigue en 0,6 s por los 2434 fotogramas sueltos, el césped no encadena más de 4 s, y al rechazar los pies de fuera del campo el tiempo con alguien dentro baja de 190 s a 94 s. Con esto no se dibuja el partido. El siguiente paso es RF-DETR. Los módulos 2 y 3 siguen sin construirse.

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

## Rediseño RF-DETR + cámara física (29 oct 2026)

Sustituye la máscara de color cuando el Mac tiene `rfdetr` instalado. Sin `rfdetr` el servidor vuelve a `detect_field` / `detect_blobs`.

| Pieza | Cómo |
|---|---|
| Personas y balón | RF-DETR Medium (Apache), clases COCO `person` y `sports ball`. Persona ≥ 0,3, balón ≥ 0,25. Si no hay balón, 2 mosaicos del campo (balón ≥ 0,2). Se tira el balón a menos de 1,5 m del punto de penalti o del centro |
| Cámara | `PitchCamera` (`camera.py`): posición fija de la cámara, tamaño del campo por partido, pan/tilt/zoom por fotograma contra las líneas. Arranque ~5 min con 16 fotogramas repartidos por el partido (fase `calibrando`), luego ~0,12 s/fotograma |
| Fuera del campo | Personas con los pies a más de 3 m fuera de la banda se descartan (público, banquillo) |
| Equipos, árbitro, porteros | Paleta Lab de 16 colores del torso sin césped, 8 grupos. Un grupo con ≤ 1,25 personas por fotograma es solitario: portero si está a < 22 m de una portería, árbitro si no. El resto se parte en dos equipos; el nuestro es el más cercano a la camiseta del formulario |
| Identidad | Enlace en metros del campo (2 m + 7 m/s por segundo sin ver, hasta 3 s), velocidad estimada, el equipo solo resta (×0,6). Después, `_stitch` une huecos de hasta 4 s si el candidato es claramente el único |
| Tope de velocidad | 12 m/s contra la última muestra aceptada + 1,2 m de ruido de calibración |
| Keypoints | 12+ puntos exactos del campo por fotograma calibrado (`kind: keypoint`) |

### Nota 0–100 (`score.py`)

100 = los 22 jugadores siguidos todo el rato, balón y árbitro perfectos. Partes: jugadores en pantalla 40 (contados por fotograma frente a los que se ven de verdad), identidad 20 (tracks largos), balón 20, árbitro 10, equipo + dorsal 10. Sin acta el dorsal no puntúa: el techo real sin acta es 95.

### Resultados en `prueba2.mp4` (18 s, desde el segundo 2)

| Versión | Nota |
|---|---|
| Lectura `estable-2` (color) | 52,9 |
| RF-DETR + cámara | 80,7 |
| + roles por color y tope de velocidad bien | 84,0 |
| Nota honesta (por fotograma, no unión por segundo) | 78,8 |
| + ruido de calibración y enlace en metros | 81,8 |
| + balón por mosaico, filtro de puntos, cosido | **84,8** |

Desglose de 84,8: jugadores 37,3/40, identidad 13,9/20, balón 19/20, árbitro 10/10, equipo+dorsal 4,6/10. Sin el dorsal (imposible sin acta) es 80,2 de 90 = **89 %**. Calibración en 184 de 189 fotogramas.

Probado y descartado: cerrar huecos de la máscara de césped (`MORPH_CLOSE` antes del componente mayor) bajó la calibración a 139/189 y la nota a 76,6.

Límites conocidos: en la vista de la portería izquierda (16–20 s) la homografía va 0,5–1 m desviada; la identidad se pierde cuando un jugador sale del plano en un paneo largo; dorsales en plano ancho casi no se leen.

Coste estimado del partido entero (~54 000 fotogramas a paso 3): 2–4 h en CPU del Mac.

### Instalar en el Mac

```bash
PY=/Users/User/.pyenv/versions/3.11.9/bin/python3
$PY -m pip install -r vision-worker/requirements-rfdetr.txt
$PY scripts/vision_server.py
```

`KABINE_DETECTOR=rfdetr` (por defecto) o `field` para volver a la lectura de color. `KABINE_RFDETR_SIZE=medium` (o `small` si va lento). La primera vez RF-DETR descarga sus pesos. En Kabine se verá primero «Calibrando la cámara y las camisetas…».

Tests: `python3 -m unittest discover -s tests` dentro de `vision-worker` (41).

---

## Qué falta para fiarse de un partido de noche

1. **RF-DETR** (Apache) en el Mac, en `~/.cache/kabine-vision/`. Sustituye a la máscara de color. Sin esto, una camiseta blanca sigue pudiendo confundirse con una línea gruesa o una valla clara.
2. **BoT-SORT** (Apache) solo si, con RF-DETR ya puesto, el paneo de Veo sigue partiendo los ids. `estable-2` ya predice el sitio del jugador y engancha un parpadeo de 0,2 s. Si la próxima pasada de Nervión sigue en 0,2 s de mediana, el fallo es el detector de color, no el tracker.
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
