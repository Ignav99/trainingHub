# Plan: Workflow sesiones + datización (sin IA al crear)

**Fecha:** 2026-07-17  
**Estado:** diseño (no implementar aún)  
**Decisión de producto:** todos ven/editan todo; sin IA para *crear* sesión; IA solo para biblioteca / redacción / boceto desde biblioteca.

---

## 1. Problema actual (auditoría breve)

### Crear sesión hoy
- `/sesiones/nueva`: Config → Tareas → Convocatoria (orden invertido respecto a lo que quieres).
- `/sesiones/nueva-ai`: chat IA para inventar sesión completa (a eliminar como camino principal).
- `mode=assisted` + recomendador IA al crear: sobran.

### Detalle hoy (#166)
- Timeline 5 fases (Contexto → Diseño → Convocatoria → Campo → Cierre).
- Convocatoria/margen ya están bien; el problema es el **orden de entrada** y el **ruido de IA al crear**.

### Datización hoy
**Tareas:** muchos campos (táctico, físico, gym, tags, variantes como texto libre). Biblioteca UI filtra poco; backend filtra más.  
**Contenidos** (`contenidos` + `tareas_contenidos`): taxonomía útil **ya en DB pero muerto en app**.  
**Sesiones:** campos tácticos en modelo (`fase_juego_principal`, `principio_tactico_principal`) **casi no se editan en UI**.  
**Variantes:** no hay grafo plantilla→variante; solo listas de texto / copy-on-write de plantillas.  
**IA:** inventa tareas con frecuencia; no fuerza coincidencias datizadas de biblioteca.

---

## 2. Objetivo de producto

1. **Entrar a crear = convocatoria primero** (quién viene hoy).
2. **Luego** abrir el control de sesión (pestañas): asistencia/margen (mantener) + datos de sesión + diseño de tareas.
3. **Sin IA para crear la sesión** (quitar `nueva-ai` como flujo principal; opcionalmente deprecate).
4. **IA solo dentro del diseño:**
   - buscar / recomendar tareas de biblioteca,
   - ayudar a redactar una tarea,
   - boceto de sesión = secuencia de tareas **de biblioteca** (importar o crear variante).
5. **Todo datizado, pero simple** → filtrar biblioteca, recomendaciones gráficas, coincidencias por tipo de sesión y por tarea.

---

## 3. Workflow propuesto (UX)

```
[Lista Sesiones] → [Nueva sesión]
        │
        ▼
┌───────────────────────────┐
│  1. CONVOCATORIA          │  ← único paso de creación
│  (AttendanceStep actual)  │
│  Confirmar / Saltar       │
└─────────────┬─────────────┘
              │ crea sesión "cascarón"
              │ (fecha hoy o ?fecha=, MD inferido o pedir 1 campo)
              ▼
┌───────────────────────────┐
│  2. CONTROL DE SESIÓN     │  ← detalle /sesiones/[id]
│  Pestañas (no wizard IA)  │
└───────────────────────────┘
```

### Pestañas del control (simplificar el timeline #166)

| Pestaña | Contenido | Notas |
|---------|-----------|--------|
| **Convocatoria** | Asistencia + tipos participación + margen + invitados | **Mantener casi tal cual** (ya está bien) |
| **Sesión** | Datos datizados de la sesión (título, MD, objetivo, taxonomía corta) | Formulario claro, autosave |
| **Diseño** | Fases + tareas biblioteca + variantes + **IA boceto/recomendar** | Aquí vive la IA |
| **Campo** | Secuencia + pizarra + PDF | Ligero |
| **Cierre** | Notas post + RPE link + completar | Como ahora |

**Orden al aterrizar tras crear:** abrir en **Sesión** (rellenar título/MD/objetivo) o **Diseño** si ya hay MD por query. Convocatoria ya hecha en el paso 1; pestaña Convocatoria para editar.

### Crear: mínimos obligatorios antes de insert
- `equipo_id`, `fecha` (query o hoy), `match_day` (selector compacto en cabecera de convocatoria o default MD-3).
- `titulo` provisional: `"Sesión {fecha}"` → se edita en pestaña Sesión.
- Asistencias batch si confirmó convocatoria.

### Qué se elimina / depreca
- Flujo principal `/sesiones/nueva-ai` y CTA “Nueva con IA”.
- Paso “Recomendación asistida” en `/sesiones/nueva`.
- Wizard multi-paso Config→Tareas→Convocatoria como create (sustituido por convocatoria → detalle).

---

## 4. Datización SIMPLE (núcleo)

Principio: **pocos ejes que sirven para filtrar y recomendar**. El resto es opcional/avanzado o texto libre.

### 4.1 Sesión — ejes canónicos (obligatorios / casi)

| Campo | Por qué | UI |
|-------|---------|-----|
| `titulo` | identidad | Sesión |
| `fecha` + `hora` + `lugar` | logística | Sesión |
| `match_day` | carga / filtro / microciclo | Sesión (chips) |
| `objetivo_principal` | 1 frase | Sesión |
| `tipo_sesion` **NUEVO** | enum corto: `tecnica` \| `tactica` \| `fisica` \| `mixta` \| `abp` \| `recuperacion` \| `porteros` | Sesión |
| `fase_juego_principal` | 1 fase (o null si mixta/física) | Sesión |
| `contenido_principal_id` **NUEVO** (FK → `contenidos`) | 1 contenido maestro | Select del catálogo existente |
| `intensidad_objetivo` | alta/media/baja/muy_baja | Sesión |
| `microciclo_id` / `dia_numero` / `orden` | Sala del Lunes | auto o link |
| `tags` **NUEVO** JSONB corto | 0–5 tags controlados | chips |

Opcional (no bloquear): rival, competición, plan_partido, notas_pre/post, materiales, staff.

**Quitar de lo “obligatorio mental”:** no exigir principio + subprincipio + carga_fisica + 10 campos tácticos en create.

### 4.2 Tarea — ejes canónicos

| Campo | Uso filtro/IA |
|-------|----------------|
| `titulo`, `descripcion` | búsqueda + embedding |
| `categoria_id` | biblioteca |
| `fase_juego` | sesión ↔ tarea |
| `contenido_ids` (vía `tareas_contenidos`, 1 principal + 0–2 secundarios) | **revivir** tabla ya migrada |
| `match_days_recomendados` | ya existe; usarlo en UI + recomendador |
| `densidad` | carga |
| `num_jugadores_min/max` (+ porteros) | convocatoria size |
| `duracion_total` | diseño |
| `tags` (pocos, controlados) | filtro |
| `es_plantilla` | biblioteca club |
| `tarea_origen_id` **NUEVO** | grafo variante |
| `tipo_variante` **NUEVO** | `original` \| `progresion` \| `regresion` \| `adaptacion` \| `contexto` |

**Avanzado / colapsado (no en el primer formulario):** consignas, errores, espacio m², FC, gym fields, grafico — se editan en “Más detalle” o al expandir tarea.

**No reinventar:** reactivar `contenidos` en vez de otro árbol de principios free-text. Principios del catálogo HTTP pueden mapearse a códigos de `contenidos` o quedar como atajo de UI que escribe el mismo FK.

### 4.3 Variantes (simple, no 1M de cosas)

```
Plantilla (es_plantilla=true, tarea_origen_id=null)
    ├── Variante A (tarea_origen_id → plantilla, tipo=progresion)
    ├── Variante B (tipo=regresion)
    └── Variante C (tipo=adaptacion, p.ej. menos jugadores)
```

Al añadir a sesión:
1. **Usar tal cual** (link a plantilla/variante existente), o  
2. **Crear variante de sesión** (copy-on-write → nueva fila con `tarea_origen_id`, `es_plantilla=false`) editable sin romper biblioteca.

UI: en picker, tarjeta con “Usar” / “Variar…” (diff mínimo: jugadores, espacio, consignas).

---

## 5. Rol de la IA (dónde sí / dónde no)

| Situación | IA | Comportamiento |
|-----------|-----|----------------|
| Crear sesión | **NO** | Solo convocatoria + cascarón |
| Pestaña Diseño → “Boceto de sesión” | **SÍ** | Dado MD + tipo_sesion + contenido + nº presentes → propone 4 fases con **IDs de biblioteca** + razón; si no hay match, pide ampliar biblioteca o “crear tarea guiada”, no inventa 8 ejercicios opacos |
| Picker tarea → buscar | **SÍ** | Semantic search + filtros datizados (ya hay embedding) |
| “Ayúdame a redactar” en tarea | **SÍ** | Reescribe descripción/consignas; no cambia taxonomía sin confirmación |
| ai-crear inventando tarea suelta | **Restringir** | Solo si usuario elige “Nueva tarea”; al guardar **obligar** ejes canónicos |
| Chat `/sesiones/nueva-ai` | **Deprecar** | Redirect a create convocatoria |

**Recomendaciones gráficas:** cards con gráfico miniatura (`grafico_data` / svg), badges MD/fase/contenido, score de match (jugadores vs convocatoria, MD, contenido). Click = importar o variar.

---

## 6. Biblioteca y filtros (objetivo real)

### Filtros de primer nivel (UI biblioteca + picker sesión)
1. Texto / IA semántica  
2. Categoría  
3. Fase de juego  
4. Contenido (catálogo)  
5. Match day  
6. Densidad  
7. Nº jugadores (rango)  
8. Solo plantillas / Mis variantes  
9. Tags

### Filtros sesión (lista)
- fecha, MD, `tipo_sesion`, contenido, estado, intensidad, microciclo

### Fix técnicos previos (bloquean filtrado hoy)
- Multi-categoría FE vs API singular.
- Tab Mis tareas vs Biblioteca sin filtro real por autor/`es_publica`.
- Tags en schema sin filter API.
- `contenidos` sin endpoints FE.

---

## 7. Arquitectura técnica (fases de implementación)

### Fase A — Workflow create (UX)
1. Nuevo `/sesiones/nueva`: solo convocatoria (+ fecha/MD compactos).
2. `POST` create cascarón + batch asistencias → `/sesiones/{id}?tab=sesion`.
3. Quitar CTAs a `nueva-ai`; soft-redirect `nueva-ai` → `nueva`.
4. Detalle: pestañas Sesión | Diseño | Convocatoria | Campo | Cierre (reescribir shell #166).

### Fase B — Datización sesión
1. Migración: `tipo_sesion`, `contenido_principal_id`, `tags`.
2. UI pestaña Sesión con ejes canónicos + autosave.
3. Checklist “sesión datizada” suave (no bloquear; badge en lista).

### Fase C — Datización tarea + variantes
1. Migración: `tarea_origen_id`, `tipo_variante`.
2. API: listar variantes, crear variante desde plantilla.
3. Form create/edit tarea: **primero ejes canónicos**; resto colapsado.
4. Wire `contenidos` + `tareas_contenidos` (CRUD mínimo + filtro).
5. Arreglar filtros biblioteca (mis/club, tags, MD, multi-cat).

### Fase D — IA biblioteca-first
1. Endpoint `POST /sesiones/{id}/recomendar-boceto`: contexto sesión + convocatoria → solo library IDs.
2. UI Diseño: panel boceto con cards gráficas + “Aplicar / Variar / Descartar”.
3. Picker: semantic + filtros; “Redactar con IA” en editor tarea.
4. Endurecer prompts: prohibir inventar si hay ≥N candidatos con score.

### Fase E — Limpieza
1. Deprecar design-chat sesión / assisted create.
2. Unificar `/biblioteca` vs `/tareas`.
3. Seeds: asegurar `contenidos` + `match_days_recomendados` + embeddings.

---

## 8. Migraciones previstas (cuando se implemente)

```
063_sesion_datizacion.sql
  - sesiones.tipo_sesion TEXT CHECK (...)
  - sesiones.contenido_principal_id UUID REFERENCES contenidos(id)
  - sesiones.tags JSONB DEFAULT '[]'

064_tarea_variantes.sql
  - tareas.tarea_origen_id UUID REFERENCES tareas(id)
  - tareas.tipo_variante TEXT CHECK (...)
  - index (tarea_origen_id)
```

`contenidos` / `tareas_contenidos` / embeddings / `match_days_recomendados` **ya existen** → no recrear.

---

## 9. Criterios de éxito

- Crear sesión = convocatoria en &lt;30s y aterrizar en control.
- Cero dependencia de IA para tener una sesión usable.
- Toda tarea nueva en club tiene: categoría, fase o físico, ≥1 contenido, MD recomendados o “cualquiera”, jugadores, duración.
- Boceto IA: ≥80% tareas con `tarea_id` de biblioteca en pruebas con lib ≥50.
- Biblioteca filtrable por los 9 ejes de §6 sin campos muertos en UI.
- Variante de sesión no muta la plantilla del club.

---

## 10. Decisiones abiertas (para validar contigo)

1. **¿MD obligatorio en la pantalla de convocatoria** o se elige después en pestaña Sesión?  
   Recomendación: chip MD en convocatoria (afecta sugerencias de carga/margen).
2. **¿`tipo_sesion` enum cerrado** como arriba u otro set (ej. incluir `amistoso`/`partido`)?  
3. **¿Contenidos:** reactivar catálogo DB tal cual, o recortar a ~30 códigos “nivel 1” visibles?  
   Recomendación: UI solo nivel 1 (+ buscar); nivel 2 opcional.
4. **¿Deprecar `nueva-ai` ya o dejar enlace oculto un tiempo?**  
   Recomendación: redirect + quitar botón.

---

## 11. Relación con #166

#166 metió timeline 5 fases + migrate 062. Este plan **reusa** Convocatoria/Campo/Cierre y el trabajo de detalle, pero:
- cambia el **orden de create**,
- fusiona Contexto+datos en pestaña **Sesión**,
- mueve IA al **Diseño biblioteca-first**,
- añade datización real (063/064 + contenidos vivos).

No tirar #166: iterar encima.
