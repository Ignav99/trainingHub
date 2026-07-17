# Catálogo canónico de variables — Sesiones & Tareas

**Versión:** 1.0 · 2026-07-17  
**Estado:** fuente de verdad para implementación  
**Marco teórico:** modelo de juego (momentos) + microciclo MD± (carga relativa al partido) + práctica estructurada (formatos de tarea) + periodización táctica (principio → contenido), sin sobrecargar al staff.

---

## 0. Decisiones cerradas

| Tema | Decisión |
|------|----------|
| Create sesión | **Convocatoria primero** (+ chip MD + fecha) → control de sesión |
| IA al crear sesión | **Eliminada** (botón muerto; `/sesiones/nueva-ai` → redirect a `/sesiones/nueva`) |
| IA dónde sí | Diseño de sesión (boceto desde biblioteca), buscar/redactar tareas |
| Acceso | Todos ven/editan todo (sin gates de rol en UI) |
| Datización | Pocos ejes **obligatorios filtrables**; resto opcional avanzado |
| Contenidos | Catálogo DB nivel 1 visible; nivel 2 opcional al detallar |
| Variantes | Grafo `tarea_origen_id` + `tipo_variante` |

### Principio de diseño
Cada variable debe responder al menos a una de: **filtrar**, **recomendar**, **ordenar carga del microciclo**, **comunicar al staff**. Si no hace ninguna → se elimina o pasa a texto libre.

---

## 1. Vocabulario unificado (códigos canónicos)

Hoy hay drift entre UI, catálogos HTTP y DB. **Una sola cadena de códigos en toda la app.**

### 1.0 Contexto de periodo (`contexto_periodo`) — NUEVO

El MD competitivo **no aplica** igual en pretemporada ni en transición. Ya existe en microciclo (`fase_temporada` / `tipo_microciclo`); la sesión debe **heredarlo** y poder filtrarse.

| Código | Cuándo | Qué marca el “día de carga” |
|--------|--------|------------------------------|
| `competicion` | Liga/copa semanal | `match_day` (MD±) **obligatorio** |
| `pretemporada` | Bloques sin rival oficial (o amistoso opcional) | `dia_carga` (§1.1b), `match_day` **opcional/null** |
| `transicion` | Post-temporada / puente | Igual que pretemporada (día de carga) |

**Herencia automática:** si la sesión se crea desde un microciclo con `fase_temporada=pretemporada` o `tipo_microciclo=pretemporada` → `contexto_periodo=pretemporada` sin preguntar. Si el usuario crea sesión suelta, elige contexto (default `competicion`).

Sala del Lunes ya cambia el morfociclo a **días de calendario** en pretemporada; esto alinea la sesión con ese modo.

### 1.1 Match Day (`match_day`) — 7 valores (solo competición)

| Código | Nombre | Carga relativa | Uso típico |
|--------|--------|----------------|------------|
| `MD+1` | Recuperación | Muy baja | Regeneración activa, RCF/MOV |
| `MD+2` | Regeneración | Baja | Volumen técnico bajo, rondos |
| `MD-4` | Fuerza / Tensión | Alta | SSG, AVD, GYM fuerza |
| `MD-3` | Resistencia / Potencia | Alta–media | Posesión, PCO, carga acumulada |
| `MD-2` | Velocidad / Específico | Media | Evoluciones, velocidad, ABP ligero |
| `MD-1` | Activación | Baja–media | Rondos, ABP, activación |
| `MD` | Partido | Competición | Día de partido oficial |

En pretemporada/transición: **no forzar MD**. UI oculta chips MD y muestra §1.1b.  
(Compat: sesiones viejas de pretemporada con un MD inventado se migran a `dia_carga` aproximado.)

### 1.1b Día de carga en bloque (`dia_carga`) — NUEVO (pretemporada / transición)

Sustituto del MD cuando no hay partido ancla. Filtrable y usable por el recomendador.

| Código | Nombre | Intención | Categorías preferidas (guía) |
|--------|--------|-----------|------------------------------|
| `PT-R` | Regeneración | Recuperar, movilidad, bajo impacto | RCF, MOV, RND |
| `PT-A` | Adaptación | Reentrada, volumen controlado, técnica | RND, ACO, POS, MOV |
| `PT-V` | Volumen | Mucho trabajo, densidad media | JDP, POS, PCO, GYM |
| `PT-I` | Intensidad | Calidad, SSG, duelos, potencia | SSG, AVD, GYM, EVO |
| `PT-E` | Específico / modelo | Principios de juego, ABP, estructura | JDP, AVD, ABP, POR |
| `PT-F` | Amistoso / simulación | Partido o interno (como “MD” de bloque) | — (evitar GYM/PRV pesado) |

Opcional en sesión de pretemporada: `semana_bloque` (1..N) y/o `doble_sesion` bool (mañana/tarde) — útiles pero no bloquean datización.

**Tareas:** `match_days_recomendados` se complementa con `dias_carga_recomendados[]` (mismos códigos PT-*). En competición se usa MD; en pretemporada PT.

### 1.2 Fase de juego (`fase_juego`) — 6 valores

Alineado a momentos del modelo de juego (no inventar `transicion_ofensiva`):

| Código | Nombre |
|--------|--------|
| `ataque_organizado` | Ataque organizado |
| `defensa_organizada` | Defensa organizada |
| `transicion_defensa_ataque` | Transición defensa → ataque |
| `transicion_ataque_defensa` | Transición ataque → defensa |
| `balon_parado_ofensivo` | ABP ofensivo |
| `balon_parado_defensivo` | ABP defensivo |

**Migrar / aliasar y borrar:** `transicion_ofensiva`, `transicion_defensiva`, `abp_ofensivo`, `abp_defensivo`, `transicion_def_ataque`, `transicion_ataq_defensa`, `balon_parado` (genérico en contenidos → mapear a of/def).

### 1.3 Fase dentro de la sesión (`fase_sesion`) — estructura

| Código | Nombre | Rol |
|--------|--------|-----|
| `activacion` | Activación | Siempre |
| `desarrollo_1` … `desarrollo_6` | Desarrollo | 1–2 por defecto; hasta 6 si hace falta |
| `vuelta_calma` | Vuelta a la calma | Siempre |

### 1.4 Intensidad (`intensidad_objetivo`) — sesión

`alta` | `media` | `baja` | `muy_baja`

### 1.5 Densidad (`densidad`) — tarea

`alta` | `media` | `baja`  
(Relación trabajo/pausa percibida; no sustituye a duración.)

### 1.6 Estado sesión

`borrador` | `planificada` | `completada` | `cancelada`

---

## 2. SESIÓN — variables

### 2.1 Núcleo (obligatorio / casi) — pestaña Sesión + create

| Variable | Tipo | Opciones / regla | ¿Filtra? | Notas |
|----------|------|------------------|----------|-------|
| `titulo` | text | libre | sí (búsqueda) | Tras create puede ser provisional |
| `fecha` | date | — | sí | |
| `hora` | time | opcional | no | Logística |
| `lugar` | text/cat corta | chips: Campo 1, Campo 2, Gimnasio, Sala… (org) | sí | Empieza free + sugerencias |
| `equipo_id` | uuid | — | sí | Contexto |
| `contexto_periodo` | enum **NUEVO** | §1.0 | **sí** | Hereda del microciclo |
| `match_day` | enum | §1.1 | **sí** (si competición) | Chip; **null** en pretemporada |
| `dia_carga` | enum **NUEVO** | §1.1b | **sí** (si pre/transición) | Chip PT-* |
| `tipo_sesion` | enum **NUEVO** | ver §2.2 | **sí** | Eje maestro de filtrado |
| `objetivo_principal` | text corto | 1 frase | búsqueda | Obligatorio para “sesión completa” |
| `contenido_principal_id` | FK contenidos | nivel 1 del catálogo | **sí** | 1 contenido ancla |
| `fase_juego_principal` | enum §1.2 | nullable si tipo físico/recuperación | **sí** | |
| `intensidad_objetivo` | enum §1.4 | — | **sí** | |
| `microciclo_id` | uuid | opcional | sí | Sala del Lunes |
| `dia_numero` / `orden` | int | auto | orden | |

### 2.2 `tipo_sesion` (nuevo enum cerrado)

| Código | Cuándo | Contenidos / fases esperados |
|--------|--------|------------------------------|
| `tecnica` | Técnica individual / circuital | TEC_* |
| `tactica` | Principios del modelo | TAC_* + fase_juego |
| `fisica` | Condición / gym / prevención | FIS_*, GYM/PRV/MOV/RCF |
| `mixta` | Técnico-táctica + carga | lo habitual mid-week |
| `abp` | Estrategia balón parado | TAC_ABP_* / fase BP |
| `recuperacion` | MD+1/+2 | RCF/MOV, intensidad baja |
| `porteros` | Específica GK (campo o integrada) | POR / TEC_PORTERO |
| `partido` | MD o amistoso controlado | mínimo diseño de tareas |

En **pretemporada**, `tipo_sesion` brilla más (física, mixta, abp, porteros…) porque no hay MD que “explique” la sesión. El par `tipo_sesion` + `dia_carga` + `contenido_principal` es la datización clave del bloque.

### 2.3 Secundario (opcional, visible)

| Variable | Opciones | Acción |
|----------|----------|--------|
| `rival` | texto | mantener |
| `competicion` | texto | mantener |
| `plan_partido_id` / `fase_plan` | link plan | mantener; `fase_plan` usa códigos §1.2 |
| `notas_pre` / `notas_post` | texto | mantener |
| `materiales` | chips sugeridos | catálogo corto §2.5 |
| `tags` | 0–5 de catálogo controlado §6 | **nuevo** |
| `staff_asistentes` | free/json | mantener oculto/avanzado |

### 2.4 Eliminar / no exigir en sesión

| Campo actual | Decisión |
|--------------|----------|
| `principio_tactico_principal` free-text | **Eliminar de UI**; sustituido por `contenido_principal_id` |
| `carga_fisica_objetivo` free-text | **Eliminar**; redundante con `intensidad_objetivo` + MD |
| `espacio_disponible` solo recomendador | No persistir salvo que se use en Campo |
| Doble “objetivo” + “principio” + “fase” sin contenido | Simplificar a objetivo + contenido + fase |

### 2.5 Materiales (catálogo corto sugerido)

`balones` | `petos` | `conos` | `picas` | `vallas` | `escaleras` | `gomas` | `porterias_reducidas` | `maniquies` | `gps` | `pulsometros`

(Códigos snake; UI con label bonito.)

### 2.6 Convocatoria (variables de asistencia — mantener)

| Variable | Opciones |
|----------|----------|
| `presente` | bool |
| `motivo_ausencia` | `lesion` \| `enfermedad` \| `sancion` \| `permiso` \| `seleccion` \| `viaje` \| `otro` |
| `tipo_participacion[]` | `sesion` \| `fisio` \| `margen` \| `presente` |
| Margen | objetivo, responsable, `fase_recuperacion`, duración, tareas margen — **mantener** |

---

## 3. TAREA — variables

### 3.1 Núcleo (obligatorio al guardar en biblioteca)

| Variable | Tipo | Opciones | ¿Filtra? |
|----------|------|----------|----------|
| `titulo` | text | — | sí |
| `categoria_id` / código | enum catálogo §3.2 | **sí** |
| `fase_juego` | §1.2 o null si gym/recup | **sí** |
| `contenidos[]` | 1 principal + ≤2 sec. | catálogo §4 | **sí** |
| `match_days_recomendados[]` | subset §1.1 o `todos` | **sí** |
| `densidad` | §1.5 | **sí** |
| `num_jugadores_min` / `max` | int | **sí** |
| `num_porteros` | int | sí |
| `duracion_total` | min | **sí** |
| `es_plantilla` | bool | sí (Mis / Club) |
| `tags[]` | catálogo §6 | **sí** |

### 3.2 Categoría / formato (`categorias_tarea`) — mantener 14

Agrupación para UI:

**Campo / juego**
| Código | Nombre corto |
|--------|----------------|
| `RND` | Rondo |
| `JDP` | Juego de posición |
| `POS` | Posesión |
| `EVO` | Evoluciones |
| `AVD` | Ataque vs defensa |
| `PCO` | Partido condicionado |
| `ACO` | Acciones combinadas |
| `SSG` | Fútbol reducido |
| `ABP` | Balón parado |
| `POR` | Portero |

**Complementario**
| Código | Nombre corto |
|--------|----------------|
| `GYM` | Fuerza / gym |
| `PRV` | Prevención |
| `MOV` | Movilidad |
| `RCF` | Recuperación física |

### 3.3 Estructura & espacio (núcleo operativo)

| Variable | Opciones canónicas | Notas |
|----------|-------------------|-------|
| `estructura_equipos` | texto tipo `5v5+2`, `4v4+3` | mantener free con validación suave |
| `espacio_forma` | `rectangular` \| `cuadrado` \| `circular` \| `pasillos` \| `libre` | **cerrar enum** (hoy free) |
| `espacio_largo` / `espacio_ancho` | metros | opcional pero útil |
| `num_series` / `duracion_serie` / `tiempo_descanso` | int | opcional; si se rellenan, OK |

### 3.4 Carga / cognición (simple)

| Variable | Opciones | Decisión |
|----------|----------|----------|
| `densidad` | alta/media/baja | **mantener** (núcleo) |
| `nivel_cognitivo` | `1` bajo · `2` medio · `3` alto | **mantener**; default por MD |
| `tipo_esfuerzo` | ver §3.5 | **cerrar enum**; deja de ser free-text caótico |
| `fc_esperada_min/max` | int | **avanzado / oculto** (pocos clubs lo usan) |
| `ratio_trabajo_descanso` | float/text | **avanzado** |

### 3.5 `tipo_esfuerzo` — enum cerrado (sustituye free-text)

| Código | Label |
|--------|-------|
| `continuo_bajo` | Continuo bajo |
| `intermitente_medio` | Intermitente medio |
| `intermitente_alto` | Intermitente alto |
| `velocidad` | Velocidad / aceleración |
| `fuerza` | Fuerza |
| `mixto` | Mixto |
| `regenerativo` | Regenerativo |

### 3.6 Coaching & narrativa (opcional, no filtro)

Mantener como texto / listas, **no** ejes de filtro:
`descripcion`, `como_inicia`, `como_finaliza`, `reglas_*`, `consignas_*`, `errores_comunes`, `forma_puntuar`, `objetivo_fisico`, `objetivo_psicologico`, `video_url`, gráficos.

### 3.7 Variantes (nuevo modelo)

| Variable | Opciones |
|----------|----------|
| `tarea_origen_id` | FK a plantilla/padre |
| `tipo_variante` | `original` \| `progresion` \| `regresion` \| `adaptacion` \| `contexto` |

**Eliminar como fuente de verdad:** arrays libres `variantes` / `progresiones` / `regresiones` como listas de strings sueltas.  
**Migración:** convertir texto existente a notas en variantes hijas o campo `notas_variante` de la hija.

### 3.8 Gym (solo si `categoria` ∈ GYM/PRV/MOV/RCF)

Mantener enums actuales (están bien):
- `zona_cuerpo`: `tren_superior` \| `tren_inferior` \| `core` \| `full_body`
- `objetivo_gym`: `fuerza_maxima` \| `hipertrofia` \| `potencia` \| `resistencia_muscular` \| `movilidad` \| `activacion` \| `recuperacion`
- `tipo_contraccion`: `concentrica` \| `excentrica` \| `isometrica` \| `pliometrica`
- `grupo_muscular[]` / `equipamiento[]`: catálogos FE actuales (suficientes)

`es_complementaria`: bool — mantener.

### 3.9 Eliminar / no usar en tarea

| Campo | Decisión |
|-------|----------|
| `principio_tactico` + `subprincipio_tactico` free-text | **Sustituir** por contenidos FK |
| `accion_tecnica` / `intencion_tactica` free | **eliminar de formularios**; si hace falta → contenido TEC/TAC |
| `situacion_tactica` / `posicion_entrenador` solo TS/AI | No columnas nuevas; texto en descripción si se quiere |
| Catálogo HTTP `principios/{fase}` paralelo | **Deprecar** a favor de contenidos |
| Tags libres infinitos de seeds | Sustituir por catálogo §6 (migrar los útiles) |

---

## 4. CONTENIDOS (catálogo maestro) — qué queda

Reactivar `contenidos` + `tareas_contenidos`. UI:

- **Selector principal:** solo `nivel = 1`
- **Detalle:** permitir 1–2 de `nivel = 2` como secundarios

### 4.1 Ajuste de códigos de fase en contenidos

Unificar a §1.2:
- `transicion_def_ataque` → `transicion_defensa_ataque`
- `transicion_ataq_defensa` → `transicion_ataque_defensa`
- `balon_parado` → no usar genérico; filas ABP llevan fase `balon_parado_ofensivo` o `_defensivo`

### 4.2 Nivel 1 — lista canónica (UI siempre)

**Técnico (TEC)** — mantener 13 actuales (CONTROL…INTERCEPCION).

**Táctico — Ataque org.** — nivel 1:
`TAC_AO_SALIDA`, `TAC_AO_CONSTRUCCION`, `TAC_AO_CREACION`, `TAC_AO_FINALIZACION`  
(nivel 2: amplitud, profundidad, movilidad, superioridad, 3er hombre, cambio orient., interior, exterior, posicional)

**Táctico — TDA:**  
`TAC_TDA_CONTRAATAQUE`, `TAC_TDA_ATAQUE_RAPIDO`, `TAC_TDA_TRANSICION_POS`  
(+ nivel 2: verticalidad, conservar)

**Táctico — Defensa:**  
`TAC_DO_PRESSING`, `TAC_DO_REPLIEGUE`, `TAC_DO_MARCAJE`, `TAC_DO_COBERTURA`, `TAC_DO_PERMUTA`  
(+ nivel 2: bloques, compactación, basculación, fuera de juego, vigilancias, anticipación)

**Táctico — TAD:**  
`TAC_TAD_GEGENPRESSING`, `TAC_TAD_REPLIEGUE_INT`, `TAC_TAD_TEMPORIZACION`  
(+ nivel 2: balance, falta táctica)

**ABP ofensivo (fase BP of):** córner, falta frontal, falta lateral, banda, penalti  
**ABP defensivo (fase BP def):** defensa córner, defensa falta; nivel 2: zonal/individual/mixto

**Físico (FIS)** — recortar ruido en UI nivel 1 a:
`FIS_RESISTENCIA_AER`, `FIS_RSA`, `FIS_VELOCIDAD_MAX`, `FIS_ACELERACION`, `FIS_CAMBIO_DIR`, `FIS_FUERZA_EXPL`, `FIS_FUERZA_RES`, `FIS_COORDINACION`, `FIS_FLEXIBILIDAD`, `FIS_RECUPERACION`, `FIS_DUELOS`  
(Ocultar o fusionar: `FIS_RESISTENCIA_ANA`, `FIS_POTENCIA_AER`, `FIS_VELOCIDAD_REAC` → secundarios)

**Psicológico (PSI)** — nivel 1 visible (8, no 12):
`PSI_CONCENTRACION`, `PSI_TOMA_DECISION`, `PSI_COMUNICACION`, `PSI_COMPETITIVIDAD`, `PSI_RESILIENCIA`, `PSI_GESTION_PRESION`, `PSI_COHESION`, `PSI_VISION_JUEGO`  
(Resto nivel 2 / oculto)

**Dimensión `estrategico`:** no usar; ABP vive en táctico + fase BP.

### 4.3 Relación tarea–contenido

- Exactamente **1** `es_principal = true`
- Hasta **2** secundarios
- Relevancia 1–10 opcional (default 5); no exponer en UI v1

---

## 5. Matrices de recomendación

### 5.1 Competición — MD × categoría

Fuente: `match_day_config` (ya en DB). Catálogo HTTP debe devolver **los 7 MD**.

| MD | Preferidas | Evitar |
|----|------------|--------|
| MD+1 | RND, ACO, RCF, MOV | SSG, AVD, PCO |
| MD+2 | RND, ACO, POS | SSG, AVD |
| MD-4 | SSG, JDP, AVD, GYM | ACO |
| MD-3 | JDP, POS, PCO, AVD, GYM | SSG |
| MD-2 | EVO, JDP, MOV, PRV | SSG, PCO |
| MD-1 | RND, ABP, ACO | SSG, AVD, PCO, GYM |
| MD | — | GYM, PRV |

Nivel cognitivo máx. por MD: +1/+2 → 1; −1/−2 → 2; −3/−4/MD → 3.

### 5.2 Pretemporada — `dia_carga` × categoría

| Día | Preferidas | Evitar | Cog. máx |
|-----|------------|--------|----------|
| PT-R | RCF, MOV, RND | SSG, AVD, PCO, GYM | 1 |
| PT-A | RND, ACO, POS, MOV | SSG, AVD | 2 |
| PT-V | JDP, POS, PCO, GYM, ACO | — | 2 |
| PT-I | SSG, AVD, EVO, GYM | ACO suave | 3 |
| PT-E | JDP, AVD, ABP, POR, POS | GYM pesado | 3 |
| PT-F | (partido) | GYM, PRV | 3 |

### 5.3 Reglas de herencia / UX

1. Microciclo pretemporada → sesiones nuevas: `contexto_periodo=pretemporada`, UI de **día de carga**, sin exigir MD.  
2. Microciclo competición → `contexto_periodo=competicion`, chips MD.  
3. Amistoso en pretemporada (`modo_partido=amistoso_*` en plan_ct): sesión del día puede ser `dia_carga=PT-F` (+ rival opcional).  
4. Boceto IA: usa la matriz §5.1 o §5.2 según `contexto_periodo`.  
5. Lista de sesiones: filtro por contexto + MD **o** día de carga.

---

## 6. Tags controlados (máx. ~25)

Sustituyen el caos de tags de seeds. Multi-select 0–5.

`rondo` · `posesion` · `presion` · `1v1` · `2v1` · `superioridad` · `igualdad` · `inferioridad` · `finalizacion` · `salida_balon` · `juego_entre_lineas` · `banda` · `entre_periodos` · `activacion` · `competitivo` · `tecnico_aislado` · `toma_decision` · `portero_integrado` · `gps` · `sin_contacto` · `amistoso_interno`

(Todo lo demás de seeds se mapea o se descarta en migración de datos.)

---

## 7. Dónde se edita cada variable (UX)

### Create `/sesiones/nueva`
Solo: fecha, MD, convocatoria (asistencia). Título provisional auto.

### Pestaña **Sesión**
Núcleo §2.1 + secundario §2.3 (sin IA).

### Pestaña **Diseño**
Fases §1.3 + tareas (link/variante) + boceto IA biblioteca-first  
(usa MD, tipo_sesion, contenido, nº presentes, intensidad).

### Pestaña **Convocatoria**
§2.6 + margen (como hoy).

### Biblioteca `/tareas`
Filtros = núcleo §3.1 (+ gym si aplica). Form create: núcleo primero; avanzado colapsado.

---

## 8. Qué sobra hoy (lista de limpieza)

1. Botón / flujo **Nueva sesión con IA** (+ assisted create).  
2. Códigos de fase inventados en FE (`transicion_ofensiva`, etc.).  
3. Catálogos HTTP incompletos (MD sin +2/MD; fases sin BP).  
4. `principio_tactico*` free-text vs contenidos.  
5. `tipo_esfuerzo` free-text.  
6. `variantes/progresiones/regresiones` como strings sueltos.  
7. `carga_fisica_objetivo` en sesión.  
8. Página `/biblioteca` duplicada vs `/tareas`.  
9. Recomendador rules + AI duplicados; un solo boceto library-first.  
10. Campos gym visibles en tareas de campo (ocultar por categoría).

---

## 9. Migraciones previstas (implementación)

| ID | Contenido |
|----|-----------|
| `063` | `sesiones.tipo_sesion`, `contenido_principal_id`, `tags`; drop/ignore UI de `carga_fisica_objetivo` |
| `064` | Unificar CHECK `fase_juego` contenidos; remap códigos |
| `065` | `tareas.tarea_origen_id`, `tipo_variante`; `espacio_forma` CHECK; `tipo_esfuerzo` CHECK |
| `066` | Seed tags controlados; endpoint `/catalogos/v2` unificado (MD, fases, tipos, materiales, tags, contenidos) |

Datos: script de remap de fases/tags/principios → contenidos.

---

## 10. Criterio “sesión/tarea datizada”

**Sesión datizada:** título real + `contexto_periodo` + (`match_day` **o** `dia_carga`) + tipo_sesion + objetivo + (contenido **o** tipo recuperación/partido) + intensidad.  
**Tarea datizada:** título + categoría + (fase **o** gym) + ≥1 contenido principal + jugadores + duración + densidad + MD recomendados (o `todos`).

Badge en listas; no bloquea guardar borrador.

---

## 11. Implementación sugerida (orden)

1. ~~Matar botón IA create~~ (este PR)  
2. Fuente única `/catalogos/v2` + constants FE compartidas  
3. Create = convocatoria primero  
4. Pestaña Sesión con núcleo  
5. Contenidos vivos + filtros biblioteca  
6. Variantes  
7. Boceto IA library-first  

Este documento es el contrato. Cualquier campo nuevo exige: ¿filtra o recomienda? Si no → no entra al núcleo.
