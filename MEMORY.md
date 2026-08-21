# TrainingHub — estado actual

## En curso
Composer de informes (NL + profundidad + secciones) y arreglo de Estadísticas colgadas.
Rama `cursor/informes-composer-ae84`.

## Hecho reciente
PR #248 — gabinete v1 + amistosos fuera de competición.

## Decisiones
- Dashboard de estadísticas: sin `partidos!inner`; timeout 12s por query; stats/convocatorias por `partido_id`.
- Informes: spec (asunto, audiencia, profundidad, bloques, N últimos, notas) + parser ES + Claude opcional.
- PDF sigue WeasyPrint + Jinja2. Amistosos fuera de competición salvo que se pidan.
