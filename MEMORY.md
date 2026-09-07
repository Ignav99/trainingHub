# TrainingHub — estado actual

## Sesión duplicada + ABP saque de centro
Al crear una sesión, un doble POST (doble clic / Crear + Siguiente / retry de insert) generaba dos filas. El alta ahora envía un UUID de cliente, el backend reutiliza la PK si el insert se reintenta, y hay candado en el wizard. ABP incluye `saque_centro`.

## Sesión: contexto rival
Al crear/editar sesión se quitó el campo libre Competición (solo liga / grupo RFEF). El rival es un select de rivales del equipo.
