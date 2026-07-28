# PDF reducido redesign notes

## WeasyPrint lesson (from own `tarea_pdf.html`)
- Flex `flex:1` column fill **collapses** in WeasyPrint
- Use **fixed-height TABLE** (`table-layout: fixed`) + `overflow: hidden` on page box
- Force SVG size with `width/height !important` in mm

## Layout (A4 landscape, 1 page)
1. Header meta (logo, title, MD, fecha/lugar)
2. Conceptos: fases · subfases · of/def · ABP (not keywords)
3. Objetivo = user text (no keyword chips)
4. Roster: columns of ~5 names
5. Tasks: 2×2 table, board ~52mm + short caption

## Keywords
- Internal only (search NL) — hidden from SesionDefinirForm UI and share/PDF
