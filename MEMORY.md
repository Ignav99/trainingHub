# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min).
- **Cloudflare R2** para los recortes. PUT firmado desde el navegador. Playback con GET firmado (`url_play`).
- Retención: **30 días después del partido** (`partido.fecha + 30`). Sin partido (rival/plan): 30 días desde el alta. Partido aún no jugado: no se borra.
- Cron diario: aviso al staff 7 días antes (una vez por carpeta) y **borrado de toda la carpeta** en R2 + DB. No hay OAuth a Drive: si hay URL de carpeta, el usuario descarga un zip y la abre; si no, solo zip. También «Borrar todo».
- Sala: columna de carpetas plegable (vídeo más grande). Pizarra con **Mover**. Tablet: modo **Acercar** (pellizco, no pinta) + Original; **Repetir 2s**, fotograma a fotograma y rebobinar manteniendo pulsado.

## Partidos: lista plegable + presentación
La columna de próximos/jugados se puede ocultar para ganar tablero. El botón Exportar de informe rival y plan de partido ofrece PDF (enviar) o Presentación (.pptx, abre en PowerPoint y Google Slides). La IA sintetiza el dossier en pocas diapos (claves, pocas palabras). Si la IA falla, hay un guion determinista. Informe de partido no se tocó.

## Ficha rival
Solo Scouting, Informe rival, Plan de partido, ABP y Equipación. Plan ida/vuelta. PDF informe rival alineado con el plan.

## Estadísticas y amistosos
Amarillas, rojas, goles y asistencias de plantilla/carga son de competición por defecto. Los amistosos se conservan y se ven con el filtro de ámbito.
