# Plan: Base de Datos Profesional de Tareas de Fútbol

## Visión
Crear una base de datos exhaustiva de tareas/ejercicios de entrenamiento de fútbol profesional que cubra todas las dimensiones del juego y permita a la IA recomendar ejercicios personalizados.

---

## 1. CATEGORÍAS DE TAREAS (Ya implementadas)

| Código | Nombre | Naturaleza | Uso Principal |
|--------|--------|------------|---------------|
| RND | Rondo | Micro | Técnica en fatiga, velocidad mental |
| JDP | Juego de Posición | Meso | Estructura real, hombre libre |
| POS | Posesión/Conservación | Variable | Mantenimiento, condición física |
| EVO | Evoluciones/Oleadas | Meso | Automatismos de finalización |
| AVD | Ataque vs Defensa | Meso | Trabajo sectorial/intersectorial |
| PCO | Partido Condicionado | Macro | Transferencia al plan de partido |
| ACO | Acciones Combinadas | Micro | Circuitos sin oposición |
| SSG | Fútbol Reducido | Micro | Alta intensidad, duelos |
| ABP | Balón Parado | Estrategia | Córners, faltas, saques |

---

## 2. LAS 5 FASES DEL JUEGO

### 2.1 Ataque Organizado (AO)
**Principios:**
- Amplitud y profundidad
- Movilidad y desmarques
- Creación de superioridades
- Progresión hacia portería rival
- Finalización

**Subprincipios:**
- Salida de balón desde portero
- Construcción en zona 1
- Progresión en zona 2
- Creación en zona 3
- Finalización en área

### 2.2 Transición Defensa-Ataque (TDA)
**Principios:**
- Velocidad en la transición
- Aprovechamiento del desorden rival
- Verticalidad
- Amplitud rápida
- Finalización rápida

**Subprincipios:**
- Contraataque directo
- Ataque rápido
- Transición posicional

### 2.3 Defensa Organizada (DO)
**Principios:**
- Compactación del equipo
- Presión sobre el balón
- Coberturas y permutas
- Vigilancias defensivas
- Protección de portería

**Subprincipios:**
- Bloque alto
- Bloque medio
- Bloque bajo
- Pressing tras pérdida

### 2.4 Transición Ataque-Defensa (TAD)
**Principios:**
- Reacción inmediata a la pérdida
- Pressing tras pérdida (6 segundos)
- Repliegue intensivo
- Balance defensivo

**Subprincipios:**
- Gegenpressing
- Repliegue posicional
- Temporización

### 2.5 Acciones a Balón Parado (ABP)
**Ofensivas:**
- Córners ofensivos
- Faltas laterales
- Faltas frontales
- Saques de banda largos
- Penaltis

**Defensivas:**
- Defensa de córners (zonal/individual/mixta)
- Defensa de faltas
- Organización en saques

---

## 3. DIMENSIONES DEL ENTRENAMIENTO

### 3.1 Técnica
- Control orientado
- Pase corto/medio/largo
- Conducción
- Regate
- Centros
- Remate
- Juego de cabeza
- Técnica de portero

### 3.2 Táctica
- Posicionamiento
- Timing de acciones
- Lectura del juego
- Toma de decisiones
- Automatismos colectivos

### 3.3 Física
- Resistencia aeróbica
- Resistencia anaeróbica
- Velocidad de reacción
- Velocidad máxima
- Fuerza explosiva
- Agilidad/cambios de dirección
- Coordinación
- Flexibilidad

### 3.4 Psicológica
- Concentración
- Comunicación
- Liderazgo
- Gestión de presión
- Competitividad
- Cohesión grupal
- Resiliencia
- Toma de decisiones bajo presión

---

## 4. ESTRUCTURA DE TAREA PROFESIONAL

```json
{
  "titulo": "Rondo 4v2 con transiciones",
  "categoria": "RND",
  "fase_juego": "ataque_organizado",

  // ESPACIO
  "espacio": {
    "largo": 10,
    "ancho": 10,
    "forma": "cuadrado"
  },

  // JUGADORES
  "jugadores": {
    "min": 6,
    "max": 8,
    "porteros": 0,
    "estructura": "4v2"
  },

  // TIEMPO
  "tiempo": {
    "duracion_total": 12,
    "series": 4,
    "duracion_serie": 2,
    "descanso": 1
  },

  // DESCRIPCIÓN
  "descripcion": "...",
  "como_inicia": "Entrenador pasa balón a equipo poseedor",
  "como_finaliza": "2 robos seguidos o tiempo",

  // REGLAS DE PROVOCACIÓN
  "reglas": {
    "tecnicas": ["Máximo 2 toques", "Solo pie derecho"],
    "tacticas": ["Comodín entra al robar", "Cambio por perder"],
    "psicologicas": ["Equipo perdedor hace flexiones"]
  },

  // CONTENIDO TÁCTICO
  "tactica": {
    "principio": "Conservación del balón",
    "subprincipio": "Movilidad constante",
    "accion_tecnica": "Pase y control",
    "intencion": "Encontrar hombre libre"
  },

  // CARGA
  "carga": {
    "fisica": {
      "tipo": "Intermitente alta intensidad",
      "m2_jugador": 16.6,
      "ratio": "1:1",
      "densidad": "alta",
      "fc_min": 150,
      "fc_max": 175
    },
    "cognitiva": 2
  },

  // COACHING
  "coaching": {
    "consignas_ofensivas": ["Orientar el cuerpo", "Balón al pie alejado"],
    "consignas_defensivas": ["Presión en parejas", "Cerrar líneas de pase"],
    "errores_comunes": ["Estáticos", "Pase telegráfico"]
  },

  // VARIANTES
  "variantes": [
    {"nombre": "1 toque", "dificultad": "+1"},
    {"nombre": "5v2", "dificultad": "-1"}
  ],

  // PROGRESIONES
  "progresiones": [
    "4v2 básico → 4v2+1 → 5v2 → Rondo posicional"
  ],

  // MATERIAL
  "material": ["Petos 2 colores", "Conos", "8 balones"],

  // MATCH DAY
  "match_days_recomendados": ["MD-1", "MD+2"],

  // TAGS
  "tags": ["posesión", "pressing", "transiciones", "activación"]
}
```

---

## 5. CANTIDAD DE TAREAS OBJETIVO

### Por Categoría (mínimo):
- RND: 20 tareas
- JDP: 25 tareas
- POS: 20 tareas
- EVO: 15 tareas
- AVD: 25 tareas
- PCO: 15 tareas
- ACO: 15 tareas
- SSG: 20 tareas
- ABP: 25 tareas (ofensivas + defensivas)

**TOTAL MÍNIMO: 180 tareas profesionales**

### Por Fase de Juego:
- Ataque Organizado: 50 tareas
- Transición D-A: 25 tareas
- Defensa Organizada: 40 tareas
- Transición A-D: 25 tareas
- Balón Parado: 40 tareas

---

## 6. PIPELINE DE DESARROLLO

### Fase 1: Ampliar Modelo (1-2 días)
- [ ] Añadir campo `variantes` (JSONB)
- [ ] Añadir campo `progresiones` (JSONB)
- [ ] Añadir campo `material` (JSONB)
- [ ] Añadir campo `match_days_recomendados` (JSONB)
- [ ] Ampliar fases de juego (añadir ABP como fase)

### Fase 2: Script de Seed (3-5 días)
- [ ] Crear seed con 30 rondos profesionales
- [ ] Crear seed con 25 juegos de posición
- [ ] Crear seed con tareas de cada categoría
- [ ] Incluir gráficos SVG básicos

### Fase 3: Sistema de Recomendación (2-3 días)
- [ ] Endpoint POST /v1/recomendador
- [ ] Algoritmo de scoring mejorado
- [ ] Filtros por múltiples criterios
- [ ] Integración con IA para explicaciones

### Fase 4: UI de Asistente (3-4 días)
- [ ] Formulario de contexto (rival, MD, objetivos)
- [ ] Vista de recomendaciones
- [ ] Drag & drop para armar sesión
- [ ] Preview de sesión completa

### Fase 5: Gráficos (2-3 días)
- [ ] Editor SVG básico
- [ ] Plantillas de campo
- [ ] Símbolos de jugadores/movimientos
- [ ] Exportación PNG

---

## 7. PRÓXIMOS PASOS INMEDIATOS

1. **Crear migración** para añadir campos nuevos a `tareas`
2. **Crear script seed** con primeras 50 tareas profesionales
3. **Ejecutar en Supabase** y verificar datos
4. **Probar en frontend** que se muestran correctamente

---

## 8. FUENTES DE INFORMACIÓN PARA TAREAS

- Metodología UEFA Pro
- Modelo de juego FC Barcelona (Cruyff/Guardiola)
- Periodización táctica (Vítor Frade)
- Metodología Seirul·lo
- Entrenadores: Guardiola, Klopp, Ancelotti, Luis Enrique
- Libros: "Periodización Táctica", "El Proceso de Entrenamiento en Fútbol"
