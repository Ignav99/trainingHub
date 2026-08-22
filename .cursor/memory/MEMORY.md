# TrainingHub — estado actual

## En curso
Rama `cursor/informe-fotos-asistencia-ae84`.
El PDF `microciclo (4)` del escritorio es un download viejo: hay que regenerar el informe.

Causa de pizarras vacías: el dossier pedía grafico_data en lote + Jinja autoescape + CSS 48mm/object-fit distinto al PDF de sesión.
Ahora: embed por sesión como `sesiones.py`, JPEG one-by-one si falta, `_get_jinja_env_v2`, CSS 75.5mm del PDF reducido, `render_diagram_thumbnail` si hay dibujo.

Detalle global por sesión: asistencia (sesión/fisio/margen/ausente+motivo), RPE/carga, trabajo al margen, lesiones operativas (sin diagnóstico).
