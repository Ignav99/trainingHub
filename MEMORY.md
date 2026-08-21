# TrainingHub — estado actual

## En curso
Escritura asistida + etiquetas técnicas de sesión. Rama `cursor/escritura-etiquetas-ae84`.

Dos fallos:
1. La reflexión del partido (y el resto de campos de redacción) solo aplicaba el diccionario local, o se perdía al pulsar Guardar porque el blur cancelaba el timer. Ahora: pule gramática/léxico vía IA, aplica en blur con flushSync, y al pulsar Guardar espera la corrección. Autenticación: cualquier usuario logueado (no exige permiso AI_USE).
2. Añadir etiqueta técnica en diseño de sesión no se veía (solo 12 chips del catálogo) y no persistía si PostgREST no tenía TEXT[] `contenidos_tecnicos_*`. Dual-write a JSONB `contenidos_ofensivos/defensivos` + UI de chips libres + Enter/Añadir.

## Hecho reciente
PR #246 — SIATE GO/PES + guardado rápido. En producción.
