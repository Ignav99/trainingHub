# TrainingHub — agent memory

## Branch: `cursor/sesion-abp-pdf-ae84` (2026-07-28)

### ABP (separado ofensivo / defensivo)
- `abp_config.ofensivo: string[]` — tipos ABP ofensivos (multi)
- `abp_config.defensivo: string[]` — tipos ABP defensivos (multi)
- `activo` se deriva: true si hay tipos en algún lado
- Legacy `lado` / `lados` / `tipos` se migran al leer/escribir
- UI: dos `MultiSelect` compactos (Ofensivo / Defensivo) en SesionDefinirForm
- PDF/share: etiqueta tipo `Ofensivo: corner, falta · Defensivo: corner`

### PDF / URL
- **Reducido** (1 A4): escudo, contexto, objetivos, ABP, convocatoria coloreada
  (sesión/fisio/margen/ausentes con badges multi-tipo), ejercicios con mini pizarra
- Botones PDF: loading por acción
- Storage: `{id}_reducido.pdf` / `{id}_extendido.pdf`
- **URL share**: pestañas Resumen / Tareas / Convocatoria
