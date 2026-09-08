# TrainingHub — estado actual

## Sesión: filial a mano en convocatoria
La plantilla entra sola. El filial sale en «Añadir del filial» y hay que meterlo a mano (predisño y sesión creada). Quitar un jugador del filial quita la tarjeta al instante y persiste en segundo plano. Ocultar filial los saca todos de golpe.

## Informe rival: once manual
En Once Probable se puede escribir el 11 a mano (formación + nombres/dorsales en el campo o en la tabla) sin extraer actas. Cargar desde actas sigue disponible y no borra jugadores añadidos a mano.

## Sesión duplicada + ABP saque de centro
Al crear una sesión, un doble POST generaba dos filas. El alta envía un UUID de cliente y el backend reutiliza la PK. ABP incluye `saque_centro`.

## Sesión: contexto rival
Al crear/editar sesión se quitó el campo libre Competición. El rival es un select de rivales del equipo.
