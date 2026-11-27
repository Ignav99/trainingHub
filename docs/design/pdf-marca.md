# PDF y documentos de Kabin-e — superficie "Papel" de Cal

Todo lo que se exporta (PDF de sesiones, tareas, partidos, convocatorias,
informes, ABP, calendario, presentaciones PDF/PPTX y las salas de presentación)
sigue **Cal** (`docs/diseno/cal.md`). Si un documento parece "de otra app", está mal.

| Motor | Punto único |
|---|---|
| Backend (WeasyPrint) | `app/services/pdf_marca.py::html_a_pdf` + `templates/_marca/base.css` + macro `_marca/cabecera.html` |
| Navegador (jsPDF) | `src/lib/pdf/marca.ts` (`prepararPdf` → … → `cerrarPdf`) |

Lo automático en cada PDF: fuentes Encode Sans embebidas, variables `--c-*`,
logo de Kabin-e como marca de agua (color del club, 4.5 %) y pie con logo,
club, título y página.

## Reglas Cal en papel
1. **Una sola línea.** 0.4 mm (≈1.5 px) en tinta para lo que importa (línea bajo la cabecera,
   cabecera de tabla, caja fuerte); 0.25 mm en `--c-borde` para separar. Sin sombras, sin degradados.
2. **Rectángulo es cosa, círculo es persona.** Cajas con esquina casi viva (0.5 mm).
   Jugadores siempre como ficha redonda con dorsal (`.c-ficha`, `-titular`, `-duda`, `-baja`).
3. **El relleno dice algo**: el club (`.c-destacado`), un estado, hoy. Nada de cajas de color decorativas
   ni fondos de colores por sección. Página blanca.
4. **Sin pastillas.** El estado se escribe con una forma al lado: `.c-estado-baja` (tarjeta roja),
   `-aviso` (amarilla), `-ok` (visto), `-info` (círculo).
5. **Categorías de tarea**: color de peto **más** la sigla (`.c-peto` + texto). Nunca solo color.
6. **Tipografía Encode Sans**: estrecha (`.c-rotulo`, cabeceras de tabla, datos apretados; mayúsculas
   con tracking .08em), normal (texto), ancha (`.c-titulo`, `.c-seccion`, título de cabecera).
   Martian Mono (`.c-mono`) solo para tiempos de vídeo/GPS. Cifras tabulares siempre.
7. **Color**: tinta y neutros teñidos con el tono del club (`--c-tinta`, `--c-suave`, `--c-borde`,
   `--c-hundido`); `--c-club` es el color del club oscurecido a 4.5:1 (como `clubTone.ts`).
   Semánticos: `--c-baja`, `--c-aviso`, `--c-ok`, `--c-info`. Los colores de MD y de peto son
   semánticos y se permiten como muestra pequeña junto al texto.
8. **Tablas antes que rejillas de tarjetas**: filas con separador fino, cifras a la derecha.

## Piezas (`_marca/base.css`)
`.c-cabecera` (o macro `cabecera()`), `.c-seccion`, `.c-caja`, `.c-caja-fuerte`, `.c-hundido`,
`.c-destacado`, `.c-tabla`, `.c-dato` + `.c-dato-label`, `.c-rotulo`, `.c-titulo`, `.c-estado-*`,
`.c-ficha*`, `.c-peto`, `.c-pizarra`. Los alias antiguos `.k-*` siguen existiendo pero ya
renderizan en estilo Cal; en código nuevo usar `.c-*`.

## Contexto de plantilla
`tema` (de `tema_pdf`): `club` (nombre), `logo_url`, `color_club`, `color_club_suave`, `tinta`,
`tinta_suave`, `borde`, `hundido`, `aviso`, `baja`, `ok`, `info`. Globals Jinja:
`marca_data_uri(color)`, `wordmark_data_uri(color)`, `mezcla(a, b, t)`.

## Material de sesión
`app/services/material.py::material_de_tareas` — unión del material de las tareas
("material mínimo necesario"). La sesión no se marca a mano.

## Logo
Isotipo `frontend/public/brand/kabine-mark.svg` (en papel, plano de un color: el del club o tinta),
logotipo `kabine-wordmark.svg`. Componente React `@/components/brand/KabineLogo`. El logo aparece
SIEMPRE: en cada página de PDF (marca de agua + pie), en portada y pie de cada diapositiva PPTX y
en las salas de presentación.

## Presentaciones (PPTX y salas)
- **Descarga PPTX** (`backend/app/services/presentacion_pptx.py`): superficie **Papel** — fondo blanco, tinta y
  neutros teñidos con el tono del club (`tema_pdf`), una sola línea (1,5 px / 0,75 pt fina), sin sombras ni
  degradados, color del club como único acento, personas (once) como círculos con iniciales. Fuente `Encode Sans`
  puesta en cada run (PPTX no la embebe: si falta, PowerPoint/Keynote usan su sans). Logo: isotipo + logotipo grande en
  la portada y pequeño en el pie de cada diapositiva (PNG con cairosvg si está; si no, silueta dibujada con Pillow
  desde `MARCA_PATH` y el logotipo en texto).
- **Salas en pantalla** (`PresentacionSala`, `SalaStage`, `DossierPresenter`, `DossierSlides`): superficie
  **Visitante** siempre (`salaSuperficie` de `components/revision/salaCal.tsx`, también con los aspectos `acta`/`clasico`),
  solo tokens, rectángulos con `--radius`, personas en círculo, `SalaMarca` (isotipo + logotipo) en la cabecera de
  cada sala, en la portada y en la esquina de cada diapositiva.
