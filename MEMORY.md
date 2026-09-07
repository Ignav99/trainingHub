# TrainingHub — estado actual

## Sesión: contexto rival (en curso)
Al crear/editar sesión se quitó el campo libre **Competición** (solo liga / grupo RFEF). El rival es un select de `rivales` del equipo, igual que Sala del Lunes. Si la sesión cae en un microciclo con `rival_id`, se hereda automáticamente.

## Brief técnico: cargas / RPE / ACWR
Dos sistemas: diseño de sesión (`sesion_carga.py`) y carga del jugador (sRPE/EWMA). No entra en este cambio.

## En curso
Rama `cursor/sesion-contexto-rival-4e77`.
