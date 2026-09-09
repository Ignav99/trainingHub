# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min). ~15 GB cada 15 días y luego se borra.
- **Opción elegida: Cloudflare R2**, no Supabase Pro (25 $/mes). El navegador hace PUT a URL firmada; el fichero no pasa por Render (evita OOM). Playback sin egress de pago. 15 GB × 15 días = céntimos. Supabase Free sigue para DB/auth.
- Sin vars `R2_*` en el API de Render, se usa Supabase Storage (Free capea a **50 MB/archivo** — un clip de 87 MB sigue en 413).
- Vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=revision-clips`, `R2_PUBLIC_BASE_URL` (URL pública del bucket). CORS: PUT/GET/HEAD desde el frontend Render + localhost.
- Cron `POST /v1/revision/cron/archive` **borra** clips caducados (R2 + Storage). Partidos aún no jugados alargan `hot_until`.
- Informe de partido: **ya no hay bloque «Añadir video»** encima de Revisión. Solo Revisión.
- La librería no bloquea la UI: «Subir recorte» funciona aunque el pack aún no haya cargado.
- Lista de partidos y GET de un partido van sin `pre_match_intel`.
- Desde el analizador: «A revisión» recorta en el PC y sube solo ese fragmento (progreso %).
- Sala: HDMI en el PC + tablet por el 5G del móvil. Sync por WebSocket `/v1/ws`.
Migración: `080_revision_video.sql`.

## Tratamiento (enfermería / ficha)
Los días/sesiones del cuaderno se pueden **editar** (lápiz) además de eliminar. El PUT ya existía; ahora el fisio lo usa desde la ficha y desde el caso.

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
