# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min).
- **Cloudflare R2** para los recortes. PUT firmado desde el navegador. Playback con GET firmado (`url_play`).
- Retención: **30 días después del partido** (`partido.fecha + 30`). Sin partido (rival/plan): 30 días desde el alta. Partido aún no jugado: no se borra.
- Cron diario: aviso al staff 7 días antes (una vez por carpeta) y **borrado de toda la carpeta** en R2 + DB. No hay OAuth a Drive: si hay URL de carpeta, el usuario descarga un zip y la abre; si no, solo zip. También «Borrar todo».
- Sala de recorte: **Presentar** en Revisión abre QR (`SalaHostDialog` → `/revision/{code}` con `current_clip_id`). Pizarra, play, rebobinar, acercar. No tocar ese flujo.
- Sala de presentación: **Presentar** en Informe Rival / Plan de Partido abre QR de charla (sesión sin `clip_id`). La tablet entra en `PresentacionSala`: mismas diapositivas, dibujo y control de vídeo. Clips de revisión intercalados por fase / once. `sala_sync` reenvía `slide` y `show`.
- Tablet: al ocultar carpetas el vídeo crece con `object-contain` (`presenterEmbed`) y no se recorta. Barras de dibujo/zoom (`SalaFloatingChrome`) flotan `z-50` sobre el pellizco.

## Partidos: lista plegable + presentación
La columna de próximos/jugados se puede ocultar para ganar tablero. **Presentar** (informe rival y plan de partido) abre sala QR a pantalla completa: portada (escudo rival junto al nombre), contexto/once (informe), cada fase y los clips de esa fase (inline + revisión). Escudo del club en todas las diapositivas. Si no hay diagrama dibujado, la fase no muestra césped vacío. PPT sigue como descarga (Exportar → Descargar PPT). PDF para enviar.

La pizarra de informe y plan usa el mismo editor que las tareas (`TareaPizarraEditor` / campo entero / animación). Preview compacta + Editar abre el editor a pantalla completa. Vector en `pizarra_diagrama`; PNG en `pizarra_tactica` para el PDF.

## Ficha rival
Solo Scouting, Informe Rival, Plan de Partido, ABP y Equipación. Plan ida/vuelta. PDF Informe Rival alineado con el plan. En el partido, la primera pestaña es **Informe Rival** (el mismo informe de la ficha, enlace a `/rivales/:id?tab=informe`). En la pizarra del plan/informe: colocar jugadores no abre el panel de rol; doble clic para nombre/rol; el editor no tapa el césped.

**Comentarios Rival** (Contexto → textarea, `estrategia.notas`) es el olfato del entrenador. Vive en `rivales.scout_manual`, no en intel. `extractPersistentScout` los tiene que guardar; `mergeScoutOnLoad` no los pisa con el plan semanal vacío.

## Estadísticas y amistosos
Amarillas, rojas, goles y asistencias de plantilla/carga son de competición por defecto. Los amistosos se conservan y se ven con el filtro de ámbito.
