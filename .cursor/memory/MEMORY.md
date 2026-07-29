# TrainingHub — agent memory

## 2026-07-29 — Fotos de jugador transversales

Branch: `cursor/jugador-foto-transversal-ae84`

### Diseño
- Columna `jugadores.foto_url` (ya existía)
- Bucket `player-photos` (migración 068) + path `{org_id}/jugadores/{jugador_id}/avatar.{ext}`
- Upload/delete solo vía API autenticada: `POST/DELETE /jugadores/{id}/foto`
- PUT genérico ignora `foto_url` (evita URLs arbitrarias)
- Validación MIME + magic bytes, máx 5MB, JPEG/PNG/WebP, URL con cache-bust `?v=`

### Frontend
- Componente compartido `PlayerAvatar` (foto + iniciales/dorsal + fallback onError)
- Ficha: cámara siempre disponible + borrar foto (ya no Supabase anon client)
- Cableado: plantilla, convocatoria/partido, enfermería, sesión asistencia, equipos DnD, margen, dashboard, equipo

### Next
- Aplicar migración 068 en Supabase prod si el bucket no existe (service también intenta create_bucket)
- Opcional: resize/crop server-side con Pillow más adelante
