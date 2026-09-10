# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min).
- **Cloudflare R2** para los recortes. PUT firmado desde el navegador. Playback con GET firmado (`url_play`).
- Retención: **30 días después del partido** (`partido.fecha + 30`). Sin partido (rival/plan): 30 días desde el alta. Partido aún no jugado: no se borra.
- Cron diario: aviso al staff 7 días antes (una vez por carpeta) y **borrado de toda la carpeta** en R2 + DB. No hay OAuth a Drive: si hay URL de carpeta, el usuario descarga un zip y la abre; si no, solo zip. También «Borrar todo».
- Sala: columna de carpetas plegable (vídeo más grande). Pizarra con **Mover**. Tablet: modo **Acercar** (pellizco, no pinta) + Original; **Repetir 2s**, fotograma a fotograma y rebobinar manteniendo pulsado.
- Reproductor único (`VideoPlayer`): barra de seek bajo el vídeo + rebobinado al mantener pulsado. Informe rival, plan, revisión, sala, análisis, organizer y vídeos subidos de partido lo comparten.

## Partidos: lista plegable + presentación
La columna de próximos/jugados se puede ocultar para ganar tablero. **Presentar** (informe rival y plan de partido) abre una charla a pantalla completa: portada, contexto/once (informe), cada fase y los clips de esa fase. En cada fase, si hay pizarra animada, se reproduce en bucle al lado de las frases. PPT sigue como descarga (Exportar → Descargar PPT). PDF para enviar.

La pizarra de informe y plan usa el mismo editor que las tareas (`TareaPizarraEditor` / campo entero / animación). Preview compacta + Editar abre el editor a pantalla completa. Vector en `pizarra_diagrama`; PNG en `pizarra_tactica` para el PDF.

## Ficha rival
Solo Scouting, Informe rival, Plan de partido, ABP y Equipación. Plan ida/vuelta. PDF informe rival alineado con el plan. En el partido, la primera pestaña es **Plan del rival** (el mismo informe de la ficha, enlace a `/rivales/:id?tab=informe`). En la pizarra del plan/informe: colocar jugadores no abre el panel de rol; doble clic para nombre/rol; el editor no tapa el césped.

## Estadísticas y amistosos
Amarillas, rojas, goles y asistencias de plantilla/carga son de competición por defecto. Los amistosos se conservan y se ven con el filtro de ámbito.
