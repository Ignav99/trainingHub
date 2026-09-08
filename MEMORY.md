# TrainingHub — estado actual

## Informe rival: once manual
En Once Probable se puede escribir el 11 a mano (formación + nombres/dorsales en el campo o en la tabla) sin extraer actas. Cargar desde actas sigue disponible y no borra jugadores añadidos a mano.

## Sesión duplicada + ABP saque de centro
Al crear una sesión, un doble POST (doble clic / Crear + Siguiente / retry de insert) generaba dos filas. El alta ahora envía un UUID de cliente, el backend reutiliza la PK si el insert se reintenta, y hay candado en el wizard. ABP incluye `saque_centro`.

## Sesión: contexto rival
Al crear/editar sesión se quitó el campo libre Competición (solo liga / grupo RFEF). El rival es un select de rivales del equipo.
