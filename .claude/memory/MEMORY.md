# TrainingHub — estado actual

## En curso
Biblioteca de tareas: las tareas SÍ se guardaban. El listado las ocultaba.

Causas:
- Filtro oculto `familia: madres` + `solo_madres=true` (el selector estaba escondido).
- El API sobrescribía `total` con `len(página)` (12), así que no había página 2.

Rama `cursor/tareas-biblioteca-paginacion-ae84`.

## Hecho reciente
PR #259 — comodín en pizarra, descanso en segundos, escritura (live).
PR #258 — biblioteca de microciclos en dashboard + bloques de defensa (live).
