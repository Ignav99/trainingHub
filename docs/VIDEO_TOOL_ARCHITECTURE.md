# Video Tool — Arquitectura Técnica

## Resumen

La herramienta de video de TrainingHub es un **analizador táctico de video** que permite a entrenadores etiquetar momentos, crear clips, dibujar anotaciones y organizar playlists. Combina procesamiento **100% local en el navegador** para el análisis con servicios cloud para persistencia y extracción de clips.

---

## ¿Corre en local o en la nube?

### **El video se reproduce localmente en el navegador**

| Componente | Dónde ejecuta | Detalle |
|-----------|---------------|---------|
| Reproducción de video | **Navegador (local)** | `<video>` nativo + HLS.js |
| Dibujos/anotaciones | **Navegador (local)** | Canvas SVG, sin server |
| Creación de clips | **Navegador (local)** | MediaRecorder API → WebM |
| Freeze frames | **Navegador (local)** | Canvas.drawImage → JPEG |
| Tags/etiquetas CRUD | **Backend (Render)** | FastAPI → Supabase |
| Extracción de clips MP4 | **Backend (Render)** | ffmpeg lee URL remota |
| Almacenamiento de uploads | **Supabase Storage** | Bucket `partido-videos` |

**Flujo clave**: Cuando el usuario selecciona un archivo local de 15GB, **NO se sube al servidor**. Se crea un `URL.createObjectURL(file)` y el `<video>` lo reproduce directamente desde memoria del navegador. Solo los metadatos (tags, categorías, playlists) se envían al backend.

---

## ¿Cómo aguanta videos de 15GB?

### Opción A: Archivo local (sin subir)
```
Usuario selecciona video.mp4 (15GB) desde disco
     ↓
URL.createObjectURL(file)  →  blob:http://...
     ↓
<video src="blob:...">  ←  El navegador lee del disco directo
     ↓
NO hay upload. NO hay transferencia de red.
El video se reproduce desde el filesystem local via el blob URL.
```

- **Limitación**: El archivo solo existe en la pestaña del navegador. Si se cierra, se pierde el acceso.
- **RAM**: El navegador NO carga los 15GB en RAM; usa streaming del disco con range requests internos.

### Opción B: Video externo + HLS streaming
```
Video alojado en Vimeo/S3/CloudFront como HLS (.m3u8)
     ↓
POST /videos/link  →  Se guarda la URL en DB
     ↓
VideoPlayer detecta .m3u8  →  Inicializa HLS.js
     ↓
HLS.js descarga solo los segmentos necesarios (~10s cada uno)
     ↓
Buffer: máx 30s adelante, 60s máximo total
```

- **Ideal para equipos**: El video se sube una vez a un servicio de streaming y todos los entrenadores acceden.
- **Ancho de banda**: Solo descarga los segmentos que el usuario está viendo.

### Opción C: Upload directo (solo clips pequeños)
- Límite: **50MB** por archivo
- Se sube a Supabase Storage bucket `partido-videos`
- No es viable para videos completos de partidos

---

## Stack Tecnológico

### Backend
| Tecnología | Uso |
|-----------|-----|
| **FastAPI** (Python) | API REST |
| **Supabase** (PostgreSQL) | DB + Storage |
| **ffmpeg** | Extracción de clips desde URLs remotas |
| **Render** | Hosting (auto-deploy desde `main`) |

### Frontend
| Tecnología | Uso |
|-----------|-----|
| **Next.js** (React) | Framework |
| **HLS.js** | Streaming adaptativo de video |
| **Zustand** | Estado global (tags, clips) |
| **MediaRecorder API** | Exportar clips como WebM |
| **Canvas API** | Freeze frames + export PNG |
| **SVG** | Sistema de dibujo (flechas, rectángulos, círculos, trazos libres) |

---

## Componentes Principales

### 1. VideoPlayer (`VideoPlayer.tsx`)
- Reproductor personalizado con controles propios
- Soporta: play/pause, seek ±5s, frame step, velocidad (0.25x–2x)
- **HLS.js**: Detecta URLs `.m3u8` automáticamente
- **Clip range mode**: Restringe reproducción a un rango temporal
- Expone `ref` con métodos: `seekTo()`, `getCurrentTime()`, `pause()`, `play()`

### 2. VideoAnalyzer (`VideoAnalyzer.tsx`)
**3 modos de operación:**

| Modo | Descripción |
|------|-------------|
| **General** | Reproducción + timeline + crear clips |
| **Editor de Clip** | Timeline virtual + freeze frames + filtrado temporal |
| **Dibujo** | Overlay SVG con herramientas de anotación |

**Sidebar (3 tabs):**
1. **Tagging** — TagMatrix con shortcuts de teclado (1-9)
2. **Tags** — Lista de tags + panel de detalle
3. **Clips** — Gestión local de clips + freeze frames

### 3. Sistema de Tagging
```
Categoría (ej: "Pase")          → shortcut: tecla 1-9
  └─ Descriptor (ej: "Corto")  → shortcut: Shift+1-9
     └─ Tag individual          → start_ms, end_ms, jugador, zona, fase
```

- **9 categorías por defecto**: Pase, Tiro, Entrada, Falta, Corner, Gol, Transición, Pérdida, Otro
- Cada tag tiene: timestamps, zona del campo (6 zonas), fase de juego, jugador asignado, nota, datos de dibujo

### 4. Clip Export Service (`video_clip_service.py`)
```
POST /video-tags/{id}/export-clip
     ↓
ffmpeg lee el video desde su URL (HTTP range requests)
     ↓
Extrae segmento [start_ms → end_ms]
     ↓
Re-codifica: H.264 + AAC → MP4
     ↓
Devuelve FileResponse al navegador
```
- Timeout: 120s por clip, 300s para compilaciones
- No descarga el video completo; ffmpeg hace streaming desde la URL

---

## Base de Datos

### Tablas del sistema de video tagging

```
partidos
  └─ videos_partido
       ├─ tipo: 'veo' | 'enlace_externo' | 'upload'
       ├─ url (enlace externo o URL pública de Supabase)
       ├─ storage_path (si fue upload)
       └─ video_tags
            ├─ category_id → video_tag_categories
            ├─ descriptor_id → video_tag_descriptors
            ├─ jugador_id → jugadores
            ├─ start_ms, end_ms
            ├─ fase, zona_campo
            ├─ drawing_data (JSONB)
            └─ source: 'manual' | 'ai' | 'import'

video_playlists
  └─ video_playlist_items
       └─ tag_id → video_tags
```

### Migración: `050_video_tagging_system.sql`
- 5 tablas con índices optimizados
- RLS (Row Level Security) por equipo
- Seed de 9 categorías por defecto

---

## API Endpoints

| Método | Ruta | Función |
|--------|------|---------|
| `GET` | `/videos/partido/{id}` | Listar videos de un partido |
| `POST` | `/videos/link` | Agregar video externo (Veo/URL) |
| `POST` | `/videos/upload` | Subir clip (máx 50MB) |
| `POST` | `/videos/{id}/tags` | Crear tag |
| `POST` | `/videos/{id}/tags/bulk` | Crear tags en lote |
| `GET` | `/videos/{id}/tags` | Listar tags (con filtros) |
| `PUT` | `/video-tags/{id}` | Editar tag |
| `DELETE` | `/video-tags/{id}` | Eliminar tag |
| `GET` | `/videos/{id}/tags/export-csv` | Exportar tags como CSV |
| `POST` | `/video-tags/{id}/export-clip` | Extraer clip MP4 (ffmpeg) |
| `GET` | `/equipos/{id}/video-tag-categories` | Listar categorías |
| `POST` | `/equipos/{id}/video-tag-categories/seed` | Crear 9 categorías default |

---

## Flujos de Trabajo

### Análisis de partido completo
1. Entrenador selecciona archivo de video local (o pega URL de Veo/streaming)
2. Video se reproduce en el navegador (sin upload)
3. Durante la reproducción, presiona teclas 1-9 para crear tags rápidos
4. Opcionalmente asigna jugador, descriptor, zona del campo
5. Crea playlists agrupando tags (ej: "Errores defensivos")
6. Exporta playlist como compilación MP4 o CSV

### Dibujo táctico sobre video
1. Pausa el video en un momento clave
2. Activa modo dibujo
3. Usa herramientas: flecha, rectángulo, círculo, trazo libre
4. Dibujos se guardan como JSONB en el tag

### Freeze frames
1. En modo editor de clip, pausa el video
2. Presiona F para capturar frame (canvas → JPEG)
3. El freeze frame se inserta en la timeline virtual
4. Se puede dibujar sobre el freeze frame
5. Al reproducir el clip, el video se pausa y muestra la imagen fija

---

## Limitaciones Actuales

| Limitación | Detalle |
|-----------|---------|
| Upload máximo | 50MB (solo clips cortos) |
| Sin transcodificación | Videos deben ser H.264 MP4 o HLS |
| Clips locales no persisten | Se pierden al recargar la página |
| Export clip frontend | Máx 2 min, formato WebM |
| Sin colaboración real-time | Un usuario a la vez por video |
| Audio en export local | Puede fallar (limitación de MediaRecorder) |
