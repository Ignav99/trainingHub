# TrainingHub — estado actual

## Layout móvil
La app es la misma (mismas rutas, mismas acciones). Por debajo de `lg` (1024px) el contenido se refluja para caber en el ancho de la pantalla y el documento no hace pan horizontal. El portátil a tamaño completo no cambia.

## Playbook ABP PDF
El PDF del playbook usa el campo ABP (portería abajo, mismas coords que el editor), no el campo horizontal de tareas. Portada con logo/club como el resto de PDFs. Nombres, roles, directrices, flechas y trails de animación salen en el diagrama.

## Sesión: filial a mano en convocatoria
La plantilla entra sola. El filial sale en «Añadir del filial» y hay que meterlo a mano (predisño y sesión creada). Quitar un jugador del filial quita la tarjeta al instante y persiste en segundo plano. Ocultar filial los saca todos de golpe.

## Informe rival: once manual
En Once Probable se puede escribir el 11 a mano (formación + nombres/dorsales en el campo o en la tabla) sin extraer actas. Cargar desde actas sigue disponible y no borra jugadores añadidos a mano.

## Sesión duplicada + ABP saque de centro
Al crear una sesión, un doble POST generaba dos filas. El alta envía un UUID de cliente y el backend reutiliza la PK. ABP incluye `saque_centro`.

## Sesión: contexto rival
Al crear/editar sesión se quitó el campo libre Competición. El rival es un select de rivales del equipo.
