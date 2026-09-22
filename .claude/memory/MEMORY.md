# TrainingHub — agent memory

## RPE / cargas (2026-09-22)

- **Foster**: `registros_rpe.carga_sesion = rpe * duracion_percibida` (minutos efectivos del jugador).
- **Planning load**: `sesiones.carga_sesion` via `sesion_carga.py` (density × category × minutos efectivos). Reloj de sesión = SUM secuencial + MAX(3 lanes compensatorio) + partido.
- **Compensatorio**: `estructura_fases` bloque `tipo: compensatorio` con `lanes[3]`; tareas en `fase_sesion` `compensatorio_1|2|3`. Un jugador solo acumula su lane.
- **Tiempo efectivo**: `sesion_tareas.minutos_efectivos` (override). Default = reloj − descanso (`duracion_efectiva.py`). Si se edita con sesión `completada`, `_sync_rpe_durations_for_sesion` recálcula Foster + EWMA.
- **RPE sesión UI**: Acciones → Asignar RPE → `PUT /rpe/sesion/{id}/asignacion`.
- **RPE partido**: `convocatorias.rpe` + `registros_rpe.tipo=partido` (`partido_id`). Columna antes de Rend. en informe.
- **Migración**: `085_cargas_compensatorio_rpe.sql`.
- **Estimado**: `estimate_session_load` solo si no hay registro RPE del jugador; filtra lanes que no son suyos.
