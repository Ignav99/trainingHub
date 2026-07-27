# Task library filters + creator field model (audit 2026-07-27)

## Library page filters (`tareas/page.tsx`)
API: categoria, modalidad, fase_juego, densidad, nivel_cognitivo, jugadores_min/max, busqueda, biblioteca, solo_madres, orden/direccion.
Client-only: contenidoOf→objetivos_tacticos|tags, contenidoDef→objetivos_tecnicos|consignas_ofensivas, orientacionFisica.
Defaults: all empty; soloMadres=false; sort=created_at:desc; tab=mis_tareas; page=1; limit=12.
Source: static `@/lib/catalogos/canonico` (not HTTP catalogos).

## Creator (`TareaCreatorFullscreen.tsx`)
Visible: titulo, categoria (tipo), modalidad, jugadores/porteros, FaseSubfasePicker, desarrollo, reglas, anotaciones, objetivos tacticos/tecnicos, SIATE (GO/PES), orientaciones+etiquetas fisicas, series/min/descanso, carga chips from pizarra.
Hidden/auto: densidad, nivel_cognitivo, espacio, tipo_esfuerzo, FC — from board.
On submit maps tags←objetivos_tacticos, consignas_ofensivas←objetivos_tecnicos, consignas_defensivas=[].
Variante UI only if tarea_origen_id set (initialFromMother); library "Crear variante" hits API then old `/editar` page.

## Misalignments
- Subfases/principio not filterable in library UI (BE has principio_tactico param unused by FE).
- complejidad SIATE / etiquetas_fisicas / tipo_variante not filterable.
- densidad+cognitivo filterable but not manually set in creator (board-only).
- Backend `/catalogos/*` stale vs canonico (missing ABP fases, old category codes).
- num_variantes never enriched in list_tareas → Madre badge dead.
- listVariantes API unused in FE; detail page still shows legacy text `variantes[]`.
- Dual editors: nueva/creator vs legacy editar (manual densidad/cognitivo + catalogos HTTP).
