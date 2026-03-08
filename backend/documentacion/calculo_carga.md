# Sistema de Calculo de Carga (sRPE)

Documento tecnico que describe el sistema completo de calculo de carga de entrenamiento
basado en sRPE (session Rate of Perceived Exertion) de Kabin-e.

**Archivo principal**: `app/services/load_calculation_service.py`

---

## 1. Conceptos Basicos

| Concepto | Descripcion |
|----------|-------------|
| **RPE** | Percepcion subjetiva del esfuerzo (1-10) |
| **sRPE** | RPE de sesion = RPE x Duracion (en minutos) |
| **Carga aguda** | Suma de toda la carga en los ultimos **7 dias** |
| **Carga cronica** | Media semanal de carga en los ultimos **28 dias** (total / 4) |
| **ACWR** | Ratio Aguda:Cronica = carga_aguda / carga_cronica |

---

## 2. Fuentes de Carga

Un jugador acumula carga de **dos fuentes**:

### 2a. Sesiones de entrenamiento

Prioridad de calculo:

1. **RPE manual** (tabla `registros_rpe`) — Siempre tiene prioridad si existe
2. **Estimacion automatica** desde las tareas de la sesion — Solo si no hay RPE manual

### 2b. Partidos

- Se calcula automaticamente desde `minutos_jugados` en `convocatorias`
- Los porteros tienen un techo de RPE reducido (ver seccion 5)

---

## 3. Estimacion Automatica de Sesion

**Funcion**: `estimate_session_load(intensidad_objetivo, tareas)`

### Constantes base RPE por intensidad

| Intensidad | RPE base |
|------------|----------|
| alta | 8.0 |
| media | 5.5 |
| baja | 3.5 |
| muy_baja | 2.0 |

Si no se especifica intensidad, se usa **media (5.5)** por defecto.

### Modificador de densidad

| Densidad | Multiplicador |
|----------|--------------|
| alta | x1.3 |
| media | x1.0 |
| baja | x0.7 |

### Modificador cognitivo

| Nivel cognitivo | Multiplicador |
|-----------------|--------------|
| 1 (bajo) | x0.9 |
| 2 (medio) | x1.0 |
| 3 (alto) | x1.1 |

### Formula por tarea

```
RPE_tarea = min(RPE_base × Mod_densidad × Mod_cognitivo, 10.0)
```

### Agregacion a nivel sesion

```
RPE_sesion = SUM(RPE_tarea × Duracion_tarea) / SUM(Duracion_tarea)
Carga_sesion = RPE_sesion × Duracion_total
```

### Ejemplo

Sesion de intensidad **alta** (RPE base = 8.0), dos tareas:

| Tarea | Duracion | Densidad | Nivel Cog. | RPE calculado |
|-------|----------|----------|------------|---------------|
| Rondo | 10 min | media (x1.0) | 2 (x1.0) | 8.0 |
| Partido | 20 min | alta (x1.3) | 3 (x1.1) | min(8 x 1.3 x 1.1, 10) = 10.0 |

```
RPE_sesion = (8.0×10 + 10.0×20) / 30 = 280/30 = 9.33
Carga_sesion = 9.33 × 30 = 280.0
```

---

## 4. RPE Manual (Override)

**Tabla**: `registros_rpe`

Campos clave:
- `rpe` (1-10): Percepcion subjetiva del jugador
- `duracion_percibida` (minutos): Duracion que el jugador percibio
- `carga_sesion`: Calculado automaticamente = `rpe × duracion_percibida`

**Regla**: Si existe un registro RPE manual para una sesion, **siempre se usa** ese valor
en lugar de la estimacion automatica, sin importar el tipo de participacion.

---

## 5. Carga de Partidos

**Funcion**: `calculate_match_load(minutos, es_portero)`

### Jugador de campo

```
RPE_partido = min(10.0 × minutos / 90, 10.0)
Carga_partido = RPE_partido × minutos
```

### Portero

Los porteros tienen una demanda fisica significativamente menor que los jugadores de campo.
Su techo de RPE es **6.0** (vs 10.0 para campo), lo que resulta en ~40% menos carga auto-estimada.

```
RPE_portero = min(6.0 × minutos / 90, 6.0)
Carga_portero = RPE_portero × minutos
```

### Tabla comparativa

| Jugador | Minutos | RPE | Carga |
|---------|---------|-----|-------|
| Campo | 90 | 10.0 | 900 |
| Campo | 45 | 5.0 | 225 |
| Portero | 90 | 6.0 | 540 |
| Portero | 45 | 3.0 | 135 |

El campo `es_portero` se obtiene de la tabla `jugadores`.

---

## 6. Tipo de Participacion y su Efecto

Desde la Fase 2, cada asistencia puede tener un `tipo_participacion`:

| Tipo | Descripcion | Auto-estimacion | RPE manual |
|------|-------------|-----------------|------------|
| `sesion` | Participo en la sesion normal | SI | SI |
| `fisio` | Solo hizo trabajo de fisio/recuperacion | NO | SI |
| `margen` | Estuvo al margen (reserva) | NO | SI |
| `[]` (vacio) | Registro antiguo, se trata como `sesion` | SI | SI |

**Regla clave**: El RPE manual **siempre cuenta** sin importar el tipo.
La estimacion automatica **solo aplica** si el tipo incluye `'sesion'` o esta vacio (legacy).

---

## 7. Ventanas Temporales y ACWR

### Ventanas

| Ventana | Periodo | Calculo |
|---------|---------|---------|
| **Aguda** | Ultimos 7 dias | Suma directa de todas las cargas |
| **Cronica** | Ultimos 28 dias | Suma total / 4 (media semanal) |

### Ratio ACWR

```
ACWR = Carga_aguda / Carga_cronica
```

Si `carga_cronica = 0`, el ratio es `null` y se clasifica como "optimo".

### Niveles de carga

| Nivel | Rango ACWR | Significado |
|-------|-----------|-------------|
| **Critico** | > 1.5 | Riesgo alto de lesion. Carga aguda 50%+ superior a la cronica |
| **Alto** | 1.3 - 1.5 | Zona de riesgo moderado |
| **Optimo** | 0.8 - 1.3 | Rango ideal de entrenamiento progresivo |
| **Bajo** | < 0.8 | Estimulo de entrenamiento insuficiente |

### Interpretacion practica

- **Critico**: Reducir volumen/intensidad inmediatamente
- **Alto**: Monitorizar de cerca, considerar reducir carga
- **Optimo**: Mantener progresion normal
- **Bajo**: Puede aumentar volumen/intensidad sin riesgo

---

## 8. Datos Almacenados

**Tabla**: `carga_acumulada_jugador`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `jugador_id` | UUID (PK) | ID del jugador |
| `equipo_id` | UUID | ID del equipo |
| `carga_aguda` | float | Carga total ultimos 7 dias |
| `carga_cronica` | float | Media semanal ultimos 28 dias |
| `ratio_acwr` | float/null | Ratio aguda/cronica |
| `nivel_carga` | enum | optimo, alto, critico, bajo |
| `ultima_carga` | float | Carga de la ultima actividad |
| `ultima_actividad_fecha` | date/null | Fecha de la ultima actividad |
| `dias_sin_actividad` | int | Dias desde la ultima actividad |
| `wellness_valor` | int/null | Bienestar subjetivo (1-10) |
| `wellness_fecha` | date/null | Fecha del ultimo registro de bienestar |

---

## 9. Cuando se Recalcula

| Trigger | Endpoint | Que recalcula |
|---------|----------|---------------|
| Guardar asistencia (sesion completada) | `POST /sesiones/{id}/asistencias` | Cada jugador presente |
| Actualizar stats de partido | `PUT /convocatorias/batch-update` | Cada jugador con minutos |
| Recalculo manual | `POST /carga/recalcular/{equipo_id}` | Todo el equipo |

---

## 10. Flujo Completo de Calculo

```
recalculate_player_load(jugador_id, equipo_id)
│
├─ 1. Obtener es_portero del jugador
│
├─ 2. SESIONES (ultimos 28 dias)
│   ├─ Fetch asistencias (presente=true) con tipo_participacion
│   ├─ Separar: all_sesion_ids (RPE manual) vs sesion_ids_for_auto (tipo=sesion)
│   └─ Para cada sesion completada:
│       ├─ Hay RPE manual? → Usar carga_sesion (siempre)
│       ├─ No hay RPE manual + tipo=sesion? → Estimar desde tareas
│       └─ No hay RPE manual + tipo=fisio/margen? → Skip (carga=0)
│
├─ 3. PARTIDOS (ultimos 28 dias)
│   ├─ Fetch convocatorias con minutos_jugados > 0
│   └─ Para cada partido:
│       └─ calculate_match_load(minutos, es_portero)
│
├─ 4. AGREGAR
│   ├─ Carga aguda = sum(loads ultimos 7d)
│   ├─ Carga cronica = sum(loads ultimos 28d) / 4
│   ├─ ACWR = aguda / cronica
│   └─ Nivel = clasificar(ACWR)
│
└─ 5. UPSERT en carga_acumulada_jugador
```

---

## 11. Endpoints API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/carga/equipo/{equipo_id}` | Carga de todos los jugadores del equipo |
| PUT | `/carga/wellness/{jugador_id}` | Actualizar bienestar (1-10) |
| POST | `/carga/recalcular/{equipo_id}` | Forzar recalculo de todo el equipo |

---

## 12. Archivos Relacionados

| Archivo | Contenido |
|---------|-----------|
| `app/services/load_calculation_service.py` | Servicio principal de calculo |
| `app/api/v1/carga.py` | Endpoints de carga |
| `app/api/v1/rpe.py` | Endpoints de RPE manual |
| `app/models/carga.py` | Modelos de respuesta |
| `app/models/rpe.py` | Modelos de RPE |
