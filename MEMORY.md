# TrainingHub Pro — Memory

## Last updated: 2026-07-23

## Active: Pizarra táctica pro (tareas)

Referencia visual: `docs/mejoras/` (capturas de Alonbalon). De ahí salen 3 patrones
que estamos replicando: tarjetas de biblioteca con la pizarra como hero + badge ▶
cuando la tarea tiene animación, modal de tarea con imagen + vídeo, y "Espacio de
juego 35x20m" impreso por tarea en el PDF de sesión.

### Escala y métricas
`ABPPitch` trabaja a **10 unidades SVG = 1 metro** (verificable: área grande = 403 u = 40,32 m).
`frontend/src/lib/tacticalMetrics.ts` es la única fuente de verdad: `zoneGeometry()`
(lados, m², forma) y `classifySpace()` (5 bandas de m²/jugador → densidad, tipo de
esfuerzo, categorías sugeridas, FC). `summaryToTareaPatch()` vuelca eso sobre la tarea.

### Una sola pizarra
`tactical-board/` es la buena y ahora se usa también dentro de las tareas vía
`TareaPizarraEditor` (modo `embedded`). `tarea-editor/TareaGraphicEditor` queda como
legacy sin uso en las rutas de tarea.

### Formato en `tareas.grafico_data` (sin migración)
`{ elements, arrows, zones, pitchType, tipo: 'static'|'animated', frames? }`.
Retrocompatible: los diagramas antiguos solo traen los tres primeros. `GET /tareas`
hace `select("*")`, así que la biblioteca ya recibe `frames` y anima en bucle.

### Piezas compartidas (no duplicar render)
`BoardSymbols.tsx` (símbolos), `BoardArrow.tsx` + `arrowPaths.ts` (8 movimientos),
`interpolate.ts` (interpolación de keyframes, la usan `AnimationPlayer` y
`TacticalBoardMini`).

## Activo: "Crea tu ejercicio" a pantalla completa

Referencia: `docs/mejoras/crear_tarea.png`. Al crear tarea desde la sesión se abre
`components/tareas/TareaCreatorFullscreen.tsx` (overlay `fixed inset-0`), no el
minidiálogo de antes. Tres bloques: información general, enfoque táctico y
metodológico, volumen de trabajo. El "Espacio de trabajo" (20x30m) se rellena solo
desde la pizarra vía `onApplyEspacio`.

Mapeo de campos → BD:
- Tipo → `categoria_id` (el backend resuelve el código "RND" al UUID)
- Objetivos → `tags` · Contenidos ofensivos/defensivos → `consignas_*`
- Competitividad → `forma_puntuar` (ya existía; NO se creó columna duplicada)
- Complejidad / Dificultad / Exigencia → columnas nuevas (migración **054**)
- En la referencia la tarea se llama como su tipo: el título es opcional y por
  defecto toma el nombre de la categoría.

**Migración 054 pendiente de aplicar a mano** (`psql $DATABASE_URL -f
backend/migrations/054_tarea_complejidad_dificultad.sql`). Mientras no esté,
`crear_tarea_en_sesion` detecta el error y reintenta sin esas 3 columnas.

### Escala de la pizarra
`ELEMENT_SIZES` está en unidades de campo (10 u = 1 m): jugador 16 (1,6 m), balón 9.
Los símbolos de material se dibujaron sobre una retícula mayor y se corrigen con
`SYMBOL_SCALE` en `BoardSymbols.tsx`. Las herramientas de colocación son **sticky**:
`addElement` ya no resetea `activeTool`, se sale con Esc.

### Capacidad física por espacio (m²/jugador)
En `tacticalMetrics.ts`, con umbrales de la literatura de juegos reducidos:
<50 fuerza (sin sprint posible) · <120 fuerza-resistencia (pico ACC/DEC, 4v4) ·
<200 resistencia · <300 resistencia-velocidad · ≥300 velocidad (~320 = 11v11).
`UMBRALES_DEMANDA` distingue con/sin porteros (TD 187/115, alta int. 262/166,
sprint 316/295) y el panel marca qué demandas de partido replica el espacio.

### Variables de diseño de sesión
`docs/mejoras/variables_sesion.png`. Bloque "¿Qué necesitas trabajar?" en
`sesiones/nueva`: espacio disponible, jugadores de campo, fases de juego,
objetivos, contenidos ofensivos y defensivos. Comparten catálogo con las tareas,
así que sesión y tarea se filtran con el mismo vocabulario.
**Migración 055 pendiente de aplicar.** El create de sesión reintenta sin esas
columnas si aún no está.

### Pendiente / siguiente
- Validación visual la hace el usuario en Render tras el deploy.
- `/tareas/nueva` sigue con el wizard de 5 pasos: candidato a adoptar el mismo
  creador a pantalla completa.

## Catálogo variables sesiones/tareas

Ver `.cursor/memory/catalogo-variables-canonico.md`. Botón Nueva sesión con IA eliminado.
