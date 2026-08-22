# TrainingHub — estado actual

## En curso
Rama `cursor/informe-fotos-asistencia-ae84` (PR #254).
El verde mal puesto era SVG de césped incrustado en WeasyPrint. El dossier ahora solo mete JPEG/PNG.

Pipeline de pizarra:
1. `grafico_data.preview` (captura del editor)
2. `grafico_data->>preview` tarea a tarea si el embed no trae la foto
3. Raster JPEG con cairosvg del dibujo (nunca SVG en el HTML)
4. Si no hay foto, celda gris «Sin pizarra»
