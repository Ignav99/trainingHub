# TrainingHub — estado actual

## Video Análisis (mesa de recortes)
Herramienta local a pantalla completa en `/video-analisis`. El partido **nunca** sale del PC.
- Una botonera: las 6 fases (ataque/defensa organizado, transiciones, ABP) con **tiempos distintos** (p. ej. ataque −5/+8, ABP −8/+12). Se pueden crear más botones, cambiar tamaño (s/m/l) y editar pre/post.
- Cada pulsación crea un recorte en la carpeta de ese botón y en la cinta del partido. La cinta se acerca con la rueda (Mayús + rueda o arrastrar la regla para desplazar).
- **Jog de partido largo:** dos dedos en el trackpad (un seek en vuelo, cabezal optimista) y flechas frame a frame (`requestVideoFrameCallback` + `currentTime`, nunca `fastSeek`). Shift+flecha = 1 s. El fps se estima al reproducir (25/50 típico de TV).
- Descargas en **MP4 sin audio**, misma resolución: CRF 21 + tope ~5 Mbps en 1080p (un recorte de 18s queda ~8–12 MB, no 50). Manita (H) para desplazar la cinta; clic en el nombre de la fila selecciona todos sus recortes para exportar esa línea. El partido no se sube.
- Sin pizarra ni ventanas flotantes en esta pantalla. El dibujo sigue en la sala de presentación.
- **Visión:** **Pausado 11 sep 2026.** Handoff: `docs/VISION_HANDOFF.md`. Mac MPS ok (21 s → ~40 min/partido solo cajas). Siguiente al retomar: 60 s del Veo 4–5 GB. Plan: `docs/VISION_PLAN.md`.

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min).
- **Cloudflare R2** para los recortes. PUT firmado desde el navegador. Playback con GET firmado (`url_play`).
- Retención: **30 días después del partido** (`partido.fecha + 30`). Sin partido (rival/plan): 30 días desde el alta. Partido aún no jugado: no se borra.
- Cron diario: aviso al staff 7 días antes (una vez por carpeta) y **borrado de toda la carpeta** en R2 + DB. No hay OAuth a Drive: si hay URL de carpeta, el usuario descarga un zip y la abre; si no, solo zip. También «Borrar todo».
- Sala de recorte: **Presentar** en Revisión abre QR (`SalaHostDialog` → `/revision/{code}` con `current_clip_id`). Pizarra, play, rebobinar, acercar. No tocar ese flujo.
- Sala de presentación: **Presentar** en Informe Rival / Plan de Partido abre QR de charla (sesión sin `clip_id`). La tablet entra en `PresentacionSala`. **La tablet también manda el cambio de diapositiva** (antes solo el host/PC). Enlace: reconecta solo, reintenta con `seq`/`ack`, y si los dos están en el mismo 5G/hotspot abre **WebRTC DataChannel** (`enlace directo`) para no salir a internet en cada pulsación. `sala_sync` reenvía `slide`, `show`, `seq`, `sala_signal`.
- Tablet: al ocultar carpetas el vídeo crece con `object-contain` (`presenterEmbed`) y no se recorta. Barras de dibujo/zoom (`SalaFloatingChrome`) flotan `z-50` sobre el pellizco. Mute de la tablet silencia el PC (`sala_sync.muted`). Pantalla completa del recuadro de vídeo (OS o theater) desde la tablet.

## Partidos: lista plegable + presentación
La columna de próximos/jugados se puede ocultar para ganar tablero. **Presentar** abre solo el informe o solo el plan. **Presentar todo** concatena primero el Informe Rival y después el Plan de Partido (mismas diapositivas, capítulos únicos). Sala QR a pantalla completa: portada (escudo rival junto al nombre), contexto/once (informe), cada fase y los clips de esa fase (inline + revisión). Escudo del club en todas las diapositivas. Si no hay diagrama dibujado, la fase no muestra césped vacío. PPT sigue como descarga (Exportar → Descargar PPT). PDF para enviar.

La pestaña **Convocatoria** abre **Cartel** (JPEG/PDF): todos los convocados por dorsal, sin 11 titular. Estadio y árbitro van **separados**; se quita `(F11)` / hierba o césped artificial para dejar solo el nombre del campo (también en citación). **Convocatoria** y jornada van más grandes; día/hora/lugar/árbitro más pequeños. El nombre del encuentro va debajo de la jornada; a la derecha, bajo el escudo visitante, recuadro verde sin fondo «Vestiremos con…» con camiseta, calzonas y medias. Calzonas y medias usan silueta orgánica (como la camiseta), no bloques. Equipación se puede mezclar local/visitante. Escudo en el pecho, dentro de la camiseta. `kit_convocatoria` admite `local`, `visitante` o `camiseta:pantalon:medias`. Citación (hora/lugar) editable. Convocar agrupa **Porteros** primero. El 11 se elige con desplegable en cada puesto. **El 11 titular se queda al recargar**: vive en `partidos.notas_pre` (`formacion` + `formacion_slots`) y en `convocatorias.titular`/`posicion_asignada`. Al abrir el partido se rehidrata desde el JSON (aunque llegue como objeto) o, si la lista no trae `notas_pre`, desde los titulares. Guardar no pisa el 11 con un campo vacío.

La pizarra de informe y plan usa el mismo editor que las tareas (`TareaPizarraEditor` / campo entero / animación). Preview compacta + Editar abre el editor a pantalla completa. Vector en `pizarra_diagrama`; PNG en `pizarra_tactica` para el PDF.

## Sala del lunes
Al planificar, el recuadro **Cargas** (junto a Disponibilidad) no se queda en el RPE medio: lista **críticos**, **altos**, **subcarga**, **wellness bajo** (≤4) y **sin carga reciente** (≥4 días), con ACWR/aguda. Enlace a `/rpe` y a la ficha del jugador.

## Ficha rival
Solo Scouting, Informe Rival, Plan de Partido, ABP y Equipación. Plan ida/vuelta. PDF Informe Rival alineado con el plan. En el partido, la primera pestaña es **Informe Rival** (el mismo informe de la ficha, enlace a `/rivales/:id?tab=informe`). En la pizarra del plan/informe: colocar jugadores no abre el panel de rol; doble clic para nombre/rol; el editor no tapa el césped.

**Comentarios Rival** (Contexto → textarea, `estrategia.notas`) es el olfato del entrenador. Vive en `rivales.scout_manual`, no en intel. `extractPersistentScout` los tiene que guardar; `mergeScoutOnLoad` no los pisa con el plan semanal vacío.

## Partidos: el calendario no puede desaparecer
Listar `/v1/partidos` **nunca** debe devolver 500 (ni un dashboard vacío) porque falte una columna SQL opcional (`arbitro`, etc.). El API reintenta el SELECT sin esa columna. El linker RFEF **no borra** `auto_creado` si el scrape viene vacío o incompleto (menos de la mitad de jornadas). Amistosos (`auto_creado=false`) no entran en ese purge. Si el calendario se ve vacío, es un error de lectura, no un borrado: mostrar aviso, no «Sin partidos». Migración 083: `ALTER TABLE partidos ADD COLUMN IF NOT EXISTS arbitro TEXT;`

## Estadísticas y amistosos
Amarillas, rojas, goles y asistencias de plantilla/carga son de competición por defecto. Los amistosos se conservan y se ven con el filtro de ámbito.
