# TrainingHub — estado actual

## En curso
Rama `cursor/informe-foto-editor-ae84`.

El informe 6 (`microciclo (6).pdf`) muestra la pizarra mal: JPEG 1050×680 inventado por cairosvg (jugadores al lado contrario) y CSS que estiraba/dejaba el césped flotando en blanco.

Arreglo:
- El PDF descarta esa foto (tamaño 1050×680 / 680×525 o césped `#2d7a2d`) y la borra de `grafico_data`.
- Al generar el microciclo, el front recaptura el SVG real del editor y guarda `preview`.
- La celda ya no fuerza 520×336; `object-fit: contain` sobre césped `#2D5016`.
