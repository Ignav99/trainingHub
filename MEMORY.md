# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Subida de recortes: el navegador manda el fichero **directo a Supabase Storage** (URL firmada). El API solo firma y confirma. El proxy anterior cargaba el vídeo en RAM y Render mataba la instancia (`failed to fetch` + restart).
- El bucket `revision-clips` se crea/actualiza a **200MB**. El 413 `EntityTooLarge` en 87MB era el tope default de 50MB. Si el proyecto es Free, Supabase no deja más de 50MB a nivel global (hay que Pro o recortar más).
- Informe de partido: **ya no hay bloque «Añadir video»** encima de Revisión (era el mismo flujo). Solo Revisión.
- La librería no bloquea la UI: «Subir recorte» funciona aunque el pack aún no haya cargado. Si falla, hay reintentar (antes el spinner «Cargando librería…» se quedaba eterno si el POST fallaba porque `!pack` seguía activo).
- Lista de partidos y GET de un partido van sin `pre_match_intel` (JSON enorme). El intel se pide en su endpoint.
- Informe de partido y informe rival (fases + Once probable) tienen librería de carpetas.
- Desde el analizador: «A revisión» recorta en el PC y sube solo ese fragmento.
- Sala: HDMI en el PC + tablet por el 5G del móvil. Sync por WebSocket `/v1/ws`.
- Retención 30 días. Sin Drive conectado no se borra nada.
Migración: `080_revision_video.sql`.


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
