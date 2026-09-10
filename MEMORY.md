# TrainingHub — estado actual

## Revisión de vídeo
Dos herramientas: **Video Análisis** (partido entero local, nunca a la nube) y **Revisión** (recortes cortos en informes).
- Capacidad objetivo: ~2 min ≈ 87–100 MB; **7–10 clips/partido** (~1 GB, charla 15–30 min).
- **Cloudflare R2** para los recortes. PUT firmado desde el navegador. Playback con GET firmado (`url_play`).
- Retención: **30 días después del partido** (`partido.fecha + 30`). Sin partido (rival/plan): 30 días desde el alta. Partido aún no jugado: no se borra.
- Cron diario: aviso al staff 7 días antes (una vez por carpeta) y **borrado de toda la carpeta** en R2 + DB. No hay OAuth a Drive: si hay URL de carpeta, el usuario descarga un zip y la abre; si no, solo zip. También «Borrar todo».
- Sala: columna de carpetas plegable (vídeo más grande). Pizarra con **Mover**. Tablet: modo **Acercar** (pellizco, no pinta) + Original; **Repetir 2s**, fotograma a fotograma y rebobinar manteniendo pulsado.

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

## Plan de partido PDF y pizarra
El PDF del plan (Exportar PDF en Sala Lunes / partido / rival) ya no lleva “TrainingHub Pro” ni “Generado”. Cabecera con escudo, club, rival, fecha, hora, campo y localía. Los campogramas respetan el aspect ratio del campo (portería abajo). Desde el plan se pueden enlazar y editar jugadas ABP, y en ataque organizado se linkean saques de puerta. La pizarra del plan tiene los mismos movimientos, zonas y comentarios que la herramienta táctica.

## Ficha rival
Solo quedan Scouting, Informe rival, Plan de partido, ABP y Equipación. El plan se guarda aparte en **ida** y **vuelta** (primer partido oficial vs ese rival = ida). El PDF del informe rival usa el mismo cromado que el plan (escudo, sin TrainingHub Pro, campogramas sin aplastar).

## Estadísticas y amistosos
Amarillas, rojas, goles y el resto de agregados de plantilla/carga son de competición por defecto. Los amistosos se conservan en el partido y se pueden ver con el ámbito «Amistosos» o «Conjunta». No cuentan para ciclos de tarjetas.
