# Diseño normalizado de los PDF de Kabin-e

Todo lo que se exporta de la app (sesiones, tareas, partidos, convocatorias,
informes de partido y rival, plan de partido, ABP, informes, calendario…) sigue
este sistema. Una sola salida por motor:

| Motor | Punto único | Qué aporta |
|---|---|---|
| Backend (WeasyPrint) | `app/services/pdf_marca.py::html_a_pdf` | fuentes embebidas, variables `--k-*`, marca de agua, pie con nº de página |
| Navegador (jsPDF) | `src/lib/pdf/marca.ts` (`prepararPdf` → … → `cerrarPdf`) | lo mismo para los PDF generados en cliente |

## Tipografía
- **Schibsted Grotesk** (la de la app): 400 texto, 600 etiquetas/datos, 800 títulos (tracking −0.02em).
- **IBM Plex Mono** solo para eyebrows, dorsales, minutos y números de página (mayúsculas, tracking .14–.16em).
- Prohibido: Bebas Neue, Barlow, Helvetica, Inter, Google Fonts por red. La base CSS fuerza la familia en todo el documento.

## Color (Configuración → Identidad del club)
- `--k-primario` / `--k-secundario`: colores del club. **Nunca** hardcodear colores de marca.
- Texto sobre fondo de color: `--k-sobre-primario` / `--k-sobre-secundario` (blanco o tinta según contraste).
- Texto en color sobre blanco: `--k-primario-texto` (oscurecido hasta 4.5:1).
- Fondos suaves: `--k-primario-suave` (92 % blanco), `--k-primario-medio` (75 %), `--k-secundario-suave`.
- Neutros: tinta `#0E1334`, tinta suave `#5A618C`, línea `#E3E6EF`. Página siempre blanca (sin fondos oscuros a sangre).
- Colores semánticos permitidos solo con significado: verde/ámbar/rojo de estado (disponible, duda, baja), rojo de tarjeta, colores de fase de juego si ya existían como código.

## Estructura de página
1. **Cabecera** (`_marca/cabecera.html` · `cabeceraPdf`): escudo del club (o isotipo), club en versalitas, título 800, subtítulo y meta a la derecha; filete de 0.6 mm en primario.
2. **Secciones** `.k-seccion`: barra de 1 mm en primario + título 800.
3. **Tarjetas** `.k-tarjeta`: blanco, borde 0.25 mm `--k-linea`, radio 2.6 mm. `.k-tarjeta-suave` sobre primario suave.
4. **Tablas** `.k-tabla`: cabecera en primario con texto `--k-sobre-primario`, filas cebra en primario suave.
5. **Datos** `.k-dato` + `.k-dato-label`.
6. **Pie** (automático): isotipo + logotipo Kabin-e + club + título · nº de página en mono.
7. **Marca de agua** (automática): isotipo de Kabin-e teñido con el primario del club, 5.5 % de opacidad, girado −12°, en todas las páginas.

## Logo
- Isotipo: `frontend/public/brand/kabine-mark.svg` — silueta única, sin facetas, degradado suave azul→violeta (o tinta plana de un color).
- Logotipo: `frontend/public/brand/kabine-wordmark.svg` — "Kabin-e" en Schibsted Grotesk 800 a trazos (`fill=currentColor`).
- Componente React: `@/components/brand/KabineLogo`.
