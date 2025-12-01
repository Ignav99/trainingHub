# 🏟️ TRAININGHUB PRO - DOCUMENTO MAESTRO

> **Versión:** 1.0.0  
> **Fecha:** Diciembre 2024  
> **Autor:** Club Atlético Central - Departamento de Metodología  
> **Estado:** En desarrollo

---

## 📋 ÍNDICE

1. [Visión del Producto](#1-visión-del-producto)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Modelo de Datos](#3-modelo-de-datos)
4. [Taxonomía de Tareas](#4-taxonomía-de-tareas)
5. [Especificación de Funcionalidades](#5-especificación-de-funcionalidades)
6. [Diseño de API](#6-diseño-de-api)
7. [Flujos de Usuario (UX)](#7-flujos-de-usuario-ux)
8. [Diseño de Interfaces](#8-diseño-de-interfaces)
9. [Sistema de Recomendación](#9-sistema-de-recomendación)
10. [Generación de PDFs](#10-generación-de-pdfs)
11. [Seguridad y Autenticación](#11-seguridad-y-autenticación)
12. [Plan de Desarrollo](#12-plan-de-desarrollo)
13. [Configuración de Entorno](#13-configuración-de-entorno)
14. [Guía de Despliegue](#14-guía-de-despliegue)

---

## 1. VISIÓN DEL PRODUCTO

### 1.1 Descripción General

**TrainingHub Pro** es una aplicación web profesional diseñada para la gestión integral de sesiones de entrenamiento de fútbol. Permite a los cuerpos técnicos crear, organizar y compartir tareas y sesiones de entrenamiento siguiendo metodología UEFA y principios de periodización táctica.

### 1.2 Problema que Resuelve

- Fragmentación de información de entrenamientos en documentos dispersos
- Falta de estandarización en el diseño de tareas
- Dificultad para compartir metodología entre técnicos
- Ausencia de herramientas que integren carga física + táctica + cognitiva
- Documentación no profesional para presentar a clubes/jugadores

### 1.3 Usuarios Objetivo

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Administrador** | Director deportivo o coordinador | Gestión completa del club, equipos y usuarios |
| **Técnico Principal** | Entrenador jefe de un equipo | CRUD completo de tareas/sesiones de su equipo |
| **Técnico Asistente** | Segundo entrenador, preparador físico | Crear tareas, editar sesiones asignadas |
| **Visualizador** | Analista, ojeador | Solo lectura de contenidos |

### 1.4 Propuesta de Valor

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROPUESTA DE VALOR ÚNICA                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Metodología UEFA B integrada en cada tarea                              │
│  ✅ Sistema de recomendación inteligente basado en Match Day               │
│  ✅ PDFs profesionales con branding del club                               │
│  ✅ Biblioteca colaborativa de tareas                                       │
│  ✅ Control de carga física, táctica y cognitiva                           │
│  ✅ Multi-equipo con gestión de permisos                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITECTURA GENERAL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         FRONTEND                                     │   │
│  │  Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui   │   │
│  │  • Server Components para SEO y performance                         │   │
│  │  • Client Components para interactividad                            │   │
│  │  • Zustand para estado global                                       │   │
│  │  • React Hook Form + Zod para formularios                          │   │
│  │  • Fabric.js para editor de gráficos de tareas                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          BACKEND API                                 │   │
│  │  FastAPI (Python 3.11+) + Pydantic v2                               │   │
│  │  • Endpoints REST para todas las operaciones                        │   │
│  │  • Autenticación JWT via Supabase                                   │   │
│  │  • Generación de PDFs con WeasyPrint                                │   │
│  │  • Sistema de recomendación con reglas + embeddings                 │   │
│  │  • Validación de datos con Pydantic                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         BASE DE DATOS                                │   │
│  │  Supabase (PostgreSQL 15+)                                          │   │
│  │  • Auth: Sistema de autenticación integrado                         │   │
│  │  • Database: PostgreSQL con RLS (Row Level Security)                │   │
│  │  • Storage: Almacenamiento de logos, gráficos, PDFs                 │   │
│  │  • Realtime: Subscripciones para colaboración (futuro)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DEPLOYMENT                                   │   │
│  │  Frontend: Vercel (optimizado para Next.js)                         │   │
│  │  Backend: Render (Web Service Python)                               │   │
│  │  Database: Supabase Cloud (tier gratuito inicialmente)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estructura de Carpetas

```
traininghub-pro/
├── docs/                          # Documentación
│   ├── MASTER_PLAN.md            # Este documento
│   ├── API_REFERENCE.md          # Documentación de API
│   └── DEPLOYMENT.md             # Guía de despliegue
│
├── frontend/                      # Aplicación Next.js
│   ├── src/
│   │   ├── app/                  # App Router (páginas)
│   │   │   ├── (auth)/          # Grupo de rutas auth
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/     # Grupo rutas protegidas
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx     # Dashboard principal
│   │   │   │   ├── tareas/
│   │   │   │   │   ├── page.tsx         # Lista de tareas
│   │   │   │   │   ├── nueva/page.tsx   # Crear tarea
│   │   │   │   │   └── [id]/page.tsx    # Editar tarea
│   │   │   │   ├── sesiones/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── nueva/page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── biblioteca/
│   │   │   │   └── configuracion/
│   │   │   ├── api/             # API Routes (BFF)
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/              # Componentes shadcn/ui
│   │   │   ├── forms/           # Formularios específicos
│   │   │   │   ├── TareaForm.tsx
│   │   │   │   └── SesionForm.tsx
│   │   │   ├── cards/           # Tarjetas de visualización
│   │   │   ├── editor/          # Editor gráfico de tareas
│   │   │   └── layout/          # Header, Sidebar, etc.
│   │   ├── lib/
│   │   │   ├── supabase/        # Cliente Supabase
│   │   │   ├── api/             # Funciones de API
│   │   │   ├── utils/           # Utilidades
│   │   │   └── validations/     # Schemas Zod
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Zustand stores
│   │   └── types/               # TypeScript types
│   ├── public/
│   │   └── assets/
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── tsconfig.json
│
├── backend/                       # API FastAPI
│   ├── app/
│   │   ├── main.py              # Punto de entrada
│   │   ├── config.py            # Configuración
│   │   ├── database.py          # Conexión DB
│   │   ├── dependencies.py      # Dependencias (auth, etc)
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── router.py    # Router principal
│   │   │   │   ├── auth.py
│   │   │   │   ├── tareas.py
│   │   │   │   ├── sesiones.py
│   │   │   │   ├── equipos.py
│   │   │   │   ├── usuarios.py
│   │   │   │   └── recomendador.py
│   │   ├── models/              # Modelos Pydantic
│   │   │   ├── __init__.py
│   │   │   ├── tarea.py
│   │   │   ├── sesion.py
│   │   │   ├── equipo.py
│   │   │   └── usuario.py
│   │   ├── services/            # Lógica de negocio
│   │   │   ├── tarea_service.py
│   │   │   ├── sesion_service.py
│   │   │   ├── recomendador_service.py
│   │   │   └── pdf_service.py
│   │   ├── templates/           # Templates HTML para PDFs
│   │   │   ├── sesion_pdf.html
│   │   │   └── tarea_pdf.html
│   │   └── utils/
│   │       ├── pdf_generator.py
│   │       └── validators.py
│   ├── tests/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── render.yaml
│
├── database/                      # Scripts SQL
│   ├── migrations/
│   ├── seeds/
│   │   └── taxonomia_tareas.sql  # Datos iniciales
│   └── schema.sql                # Esquema completo
│
├── .env.example                   # Variables de entorno ejemplo
├── .gitignore
├── docker-compose.yml            # Para desarrollo local
└── README.md
```

### 2.3 Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Usuario                                                                    │
│     │                                                                       │
│     ▼                                                                       │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐           │
│  │ Browser │─────▶│ Next.js │─────▶│ FastAPI │─────▶│Supabase │           │
│  │         │◀─────│ (Vercel)│◀─────│ (Render)│◀─────│  (DB)   │           │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘           │
│                         │                │                                  │
│                         │                ▼                                  │
│                         │          ┌─────────┐                             │
│                         │          │  PDF    │                             │
│                         │          │Generator│                             │
│                         │          └─────────┘                             │
│                         │                │                                  │
│                         ▼                ▼                                  │
│                   ┌─────────────────────────┐                              │
│                   │    Supabase Storage     │                              │
│                   │  (logos, PDFs, gráficos)│                              │
│                   └─────────────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. MODELO DE DATOS

### 3.1 Diagrama Entidad-Relación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DIAGRAMA ENTIDAD-RELACIÓN                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ORGANIZACION │────1:N──│   EQUIPO    │────N:M──│   USUARIO   │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│         │                       │                       │                   │
│         │                       │                       │                   │
│         │                       ▼                       │                   │
│         │                ┌─────────────┐                │                   │
│         │                │   SESION    │◀───────────────┘                   │
│         │                └─────────────┘                                    │
│         │                       │                                           │
│         │                       │ 1:N                                       │
│         │                       ▼                                           │
│         │                ┌─────────────┐                                    │
│         │                │SESION_TAREA │ (tabla intermedia con orden)       │
│         │                └─────────────┘                                    │
│         │                       │                                           │
│         │                       │ N:1                                       │
│         │                       ▼                                           │
│         │                ┌─────────────┐         ┌─────────────┐           │
│         └───────────────▶│    TAREA    │────N:1──│  CATEGORIA  │           │
│                          └─────────────┘         │    TAREA    │           │
│                                 │                └─────────────┘           │
│                                 │                                           │
│                    ┌────────────┼────────────┐                             │
│                    ▼            ▼            ▼                             │
│             ┌───────────┐┌───────────┐┌───────────┐                        │
│             │  REGLAS   ││ COACHING  ││ CONTENIDO │                        │
│             │PROVOCACION││  POINTS   ││  TACTICO  │                        │
│             └───────────┘└───────────┘└───────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Esquema de Tablas

#### 3.2.1 Tabla: `organizaciones`
```sql
CREATE TABLE organizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    logo_url TEXT,
    color_primario VARCHAR(7) DEFAULT '#1a365d',  -- Hex color
    color_secundario VARCHAR(7) DEFAULT '#ffffff',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.2 Tabla: `equipos`
```sql
CREATE TABLE equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacion_id UUID REFERENCES organizaciones(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),  -- "Juvenil A", "Cadete B", etc.
    temporada VARCHAR(20),   -- "2024-2025"
    num_jugadores_plantilla INTEGER DEFAULT 22,
    sistema_juego VARCHAR(20) DEFAULT '1-4-3-3',
    config JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.3 Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id),  -- Link con Supabase Auth
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellidos VARCHAR(255),
    avatar_url TEXT,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'tecnico_principal', 'tecnico_asistente', 'visualizador')),
    organizacion_id UUID REFERENCES organizaciones(id),
    config JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.4 Tabla: `usuarios_equipos` (Relación N:M)
```sql
CREATE TABLE usuarios_equipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE,
    rol_en_equipo VARCHAR(50) DEFAULT 'tecnico',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, equipo_id)
);
```

#### 3.2.5 Tabla: `categorias_tarea`
```sql
CREATE TABLE categorias_tarea (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(10) UNIQUE NOT NULL,  -- RND, JDP, POS, etc.
    nombre VARCHAR(100) NOT NULL,
    nombre_corto VARCHAR(50),
    descripcion TEXT,
    naturaleza VARCHAR(50),  -- micro, meso, macro
    objetivo_principal TEXT,
    icono VARCHAR(50),
    color VARCHAR(7),
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true
);
```

#### 3.2.6 Tabla: `tareas` (TABLA PRINCIPAL)
```sql
CREATE TABLE tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    titulo VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),  -- Código interno opcional
    categoria_id UUID REFERENCES categorias_tarea(id),
    
    -- Propiedad
    organizacion_id UUID REFERENCES organizaciones(id),
    equipo_id UUID REFERENCES equipos(id),  -- NULL = disponible para toda la org
    creado_por UUID REFERENCES usuarios(id),
    
    -- Ficha Técnica - Tiempo
    duracion_total INTEGER NOT NULL,  -- minutos
    num_series INTEGER DEFAULT 1,
    duracion_serie INTEGER,  -- minutos por serie
    tiempo_descanso INTEGER DEFAULT 0,  -- segundos entre series
    
    -- Ficha Técnica - Espacio
    espacio_largo DECIMAL(5,1),  -- metros
    espacio_ancho DECIMAL(5,1),  -- metros
    espacio_forma VARCHAR(50) DEFAULT 'rectangular',  -- rectangular, cuadrado, circular, irregular
    
    -- Ficha Técnica - Jugadores
    num_jugadores_min INTEGER NOT NULL,
    num_jugadores_max INTEGER,
    num_porteros INTEGER DEFAULT 0,
    estructura_equipos VARCHAR(100),  -- "4vs4+3", "5vs5+2 comodines"
    
    -- Estructura y Reglas
    descripcion TEXT,
    como_inicia TEXT,
    como_finaliza TEXT,
    
    -- Reglas de provocación (JSONB para flexibilidad)
    reglas_tecnicas JSONB DEFAULT '[]',
    reglas_tacticas JSONB DEFAULT '[]',
    reglas_psicologicas JSONB DEFAULT '[]',
    forma_puntuar TEXT,
    
    -- Contenido Táctico
    fase_juego VARCHAR(50) CHECK (fase_juego IN (
        'ataque_organizado', 
        'defensa_organizada', 
        'transicion_ataque_defensa', 
        'transicion_defensa_ataque'
    )),
    principio_tactico VARCHAR(255),
    subprincipio_tactico VARCHAR(255),
    accion_tecnica VARCHAR(255),
    intencion_tactica VARCHAR(255),
    
    -- Carga Física
    tipo_esfuerzo VARCHAR(100),  -- "Fuerza explosiva", "Resistencia potencia", etc.
    m2_por_jugador DECIMAL(6,1),  -- Calculado automáticamente
    ratio_trabajo_descanso VARCHAR(20),  -- "1:1", "2:1", etc.
    densidad VARCHAR(20) CHECK (densidad IN ('alta', 'media', 'baja')),
    fc_esperada_min INTEGER,  -- % FC máxima
    fc_esperada_max INTEGER,
    
    -- Carga Cognitiva
    nivel_cognitivo INTEGER CHECK (nivel_cognitivo BETWEEN 1 AND 3),
    
    -- Coaching Points
    consignas_ofensivas JSONB DEFAULT '[]',
    consignas_defensivas JSONB DEFAULT '[]',
    errores_comunes JSONB DEFAULT '[]',
    
    -- Gráfico
    grafico_url TEXT,  -- URL al storage
    grafico_svg TEXT,  -- SVG inline para edición
    grafico_data JSONB,  -- Datos para reconstruir en editor
    
    -- Metadatos
    es_plantilla BOOLEAN DEFAULT false,
    es_publica BOOLEAN DEFAULT false,  -- Visible para otros equipos de la org
    tags JSONB DEFAULT '[]',
    valoracion_media DECIMAL(2,1),
    num_usos INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_tareas_organizacion ON tareas(organizacion_id);
CREATE INDEX idx_tareas_categoria ON tareas(categoria_id);
CREATE INDEX idx_tareas_fase ON tareas(fase_juego);
CREATE INDEX idx_tareas_nivel_cognitivo ON tareas(nivel_cognitivo);
```

#### 3.2.7 Tabla: `sesiones`
```sql
CREATE TABLE sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    
    -- Contexto
    equipo_id UUID NOT NULL REFERENCES equipos(id),
    creado_por UUID REFERENCES usuarios(id),
    
    -- Match Day
    match_day VARCHAR(10) NOT NULL,  -- "MD+1", "MD-4", "MD-3", "MD-2", "MD-1", "MD"
    rival VARCHAR(255),  -- Partido de referencia
    competicion VARCHAR(255),
    
    -- Planificación
    duracion_total INTEGER,  -- minutos (calculado de las tareas)
    objetivo_principal TEXT,
    
    -- Objetivo Táctico Global
    fase_juego_principal VARCHAR(50),
    principio_tactico_principal VARCHAR(255),
    
    -- Carga
    carga_fisica_objetivo VARCHAR(100),  -- "Fuerza", "Resistencia", "Velocidad", "Recuperación"
    intensidad_objetivo VARCHAR(20) CHECK (intensidad_objetivo IN ('alta', 'media', 'baja', 'muy_baja')),
    
    -- Estado
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'planificada', 'completada', 'cancelada')),
    
    -- Notas
    notas_pre TEXT,  -- Notas previas a la sesión
    notas_post TEXT,  -- Feedback post-sesión
    
    -- PDF generado
    pdf_url TEXT,
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2.8 Tabla: `sesion_tareas` (Relación con orden)
```sql
CREATE TABLE sesion_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    tarea_id UUID NOT NULL REFERENCES tareas(id),
    
    -- Orden y fase dentro de la sesión
    orden INTEGER NOT NULL,
    fase_sesion VARCHAR(50) NOT NULL CHECK (fase_sesion IN (
        'activacion',      -- Calentamiento/Introducción
        'desarrollo_1',    -- Tarea principal 1 (sectorial)
        'desarrollo_2',    -- Tarea principal 2 (colectiva)
        'vuelta_calma'     -- Cierre
    )),
    
    -- Sobrescritura de parámetros (si el técnico modifica algo)
    duracion_override INTEGER,
    notas TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sesion_id, orden)
);
```

### 3.3 Enums y Catálogos

#### Match Day y Carga Física Asociada
```sql
-- Tabla de referencia para la lógica de recomendación
CREATE TABLE match_day_config (
    codigo VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(50),
    dias_desde_partido INTEGER,  -- Negativo = antes, Positivo = después
    carga_fisica VARCHAR(100),
    espacios_recomendados VARCHAR(255),
    nivel_cognitivo_max INTEGER,
    descripcion TEXT,
    orden INTEGER
);

INSERT INTO match_day_config VALUES
('MD+1', 'Recuperación', 1, 'Recuperación activa', 'Amplios, sin intensidad', 1, 'Día después del partido. Carga muy baja, cognitivo bajo.', 1),
('MD+2', 'Regeneración', 2, 'Regeneración', 'Amplios', 1, 'Segundo día post-partido. Carga baja.', 2),
('MD-4', 'Fuerza/Tensión', -4, 'Fuerza explosiva', 'Reducidos, muchos duelos', 3, 'Espacios reducidos, alta aceleración/frenada.', 3),
('MD-3', 'Resistencia', -3, 'Resistencia a la potencia', 'Grandes, tiempos largos', 3, 'Espacios grandes, mayor número de jugadores.', 4),
('MD-2', 'Velocidad', -2, 'Velocidad máxima', 'Medios/grandes, tiempos cortos', 2, 'Alta velocidad, mucha pausa.', 5),
('MD-1', 'Activación', -1, 'Activación/Reacción', 'Variables', 2, 'Rondos, velocidad reacción, ABP.', 6),
('MD', 'Partido', 0, 'Competición', 'Campo completo', 3, 'Día de partido.', 7);
```

#### Fases de Juego y Principios
```sql
CREATE TABLE fases_juego (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE,
    nombre VARCHAR(100),
    descripcion TEXT
);

CREATE TABLE principios_tacticos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fase_juego_codigo VARCHAR(50) REFERENCES fases_juego(codigo),
    nombre VARCHAR(255),
    descripcion TEXT,
    orden INTEGER
);

CREATE TABLE subprincipios_tacticos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principio_id UUID REFERENCES principios_tacticos(id),
    nombre VARCHAR(255),
    descripcion TEXT,
    orden INTEGER
);

-- Datos iniciales
INSERT INTO fases_juego VALUES
(gen_random_uuid(), 'ataque_organizado', 'Ataque Organizado', 'Fase de posesión del balón con el equipo organizado'),
(gen_random_uuid(), 'defensa_organizada', 'Defensa Organizada', 'Fase sin balón con el equipo organizado'),
(gen_random_uuid(), 'transicion_ataque_defensa', 'Transición Ataque-Defensa', 'Momento de pérdida del balón'),
(gen_random_uuid(), 'transicion_defensa_ataque', 'Transición Defensa-Ataque', 'Momento de recuperación del balón');

-- Ejemplo de principios para Ataque Organizado
INSERT INTO principios_tacticos (id, fase_juego_codigo, nombre, orden) VALUES
(gen_random_uuid(), 'ataque_organizado', 'Salida de balón', 1),
(gen_random_uuid(), 'ataque_organizado', 'Progresión', 2),
(gen_random_uuid(), 'ataque_organizado', 'Creación de ocasiones', 3),
(gen_random_uuid(), 'ataque_organizado', 'Finalización', 4),
(gen_random_uuid(), 'ataque_organizado', 'Ataque por bandas', 5),
(gen_random_uuid(), 'ataque_organizado', 'Ataque por interior', 6);
```

---

## 4. TAXONOMÍA DE TAREAS

### 4.1 Categorías Principales

| Código | Nombre | Naturaleza | Objetivo Táctico-Físico | M²/Jugador |
|--------|--------|------------|------------------------|------------|
| `RND` | Rondo | Micro | Técnica en fatiga, velocidad mental, perfiles | 50-80 |
| `JDP` | Juego de Posición | Meso | Jugar en posición real, hombre libre, viajar juntos | 80-120 |
| `POS` | Posesión/Conservación | Variable | Condición física integrada, presión tras pérdida | 100-150 |
| `EVO` | Evoluciones/Oleadas | Meso | Automatismos de finalización, transiciones rápidas | 150-200 |
| `AVD` | Ataque vs Defensa | Meso/Macro | Simulación de fase de juego específica | 150-250 |
| `PCO` | Partido Condicionado | Macro | Transferencia total al plan de partido | 200-300 |
| `ACO` | Acciones Combinadas | Micro | Ajuste técnico, calentamiento, recuperación | Variable |
| `SSG` | Fútbol Reducido (SSG) | Micro | Alta intensidad física, duelos, fuerza | 60-100 |
| `ABP` | Acciones Balón Parado | Estrategia | Córners, faltas, saques de banda | Variable |

### 4.2 Matriz Match Day - Tipo de Tarea

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               MATRIZ DE RECOMENDACIÓN: MATCH DAY vs CATEGORÍA               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              │ MD+1  │ MD-4  │ MD-3  │ MD-2  │ MD-1  │                     │
│ ─────────────┼───────┼───────┼───────┼───────┼───────┤                     │
│ Rondo (RND)  │  ✓✓   │  ✓    │  ✓    │  ✓    │  ✓✓   │                     │
│ JdP (JDP)    │  ✓    │  ✓✓   │  ✓✓   │  ✓    │  ✓    │                     │
│ Posesión     │  ✓    │  ✓    │  ✓✓   │  ✓    │   -   │                     │
│ Evoluciones  │   -   │  ✓    │  ✓    │  ✓✓   │  ✓    │                     │
│ AvsD         │   -   │  ✓✓   │  ✓✓   │  ✓    │   -   │                     │
│ Partido Cond │   -   │  ✓    │  ✓✓   │  ✓    │   -   │                     │
│ SSG          │   -   │  ✓✓   │  ✓    │   -   │   -   │                     │
│ ABP          │  ✓    │   -   │   -   │  ✓    │  ✓✓   │                     │
│                                                                             │
│ ✓✓ = Muy recomendado | ✓ = Recomendado | - = No recomendado               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Nivel Cognitivo

| Nivel | Nombre | Descripción | Cuándo usar |
|-------|--------|-------------|-------------|
| 1 | Baja | Tareas conocidas, pocas reglas, ejecución automática | MD+1, MD-1, calentamientos |
| 2 | Media | Toma de decisión con oposición, reglas claras | MD-2, trabajo específico |
| 3 | Alta/Estrés | Incertidumbre, cambio de reglas, inferioridad numérica | MD-4, MD-3, simular competición |

---

## 5. ESPECIFICACIÓN DE FUNCIONALIDADES

### 5.1 Módulo: Gestión de Tareas

#### F-TAR-001: Crear Tarea
**Descripción:** Permite crear una nueva tarea desde cero o desde plantilla.

**Flujo:**
1. Usuario accede a "Nueva Tarea"
2. Selecciona: crear desde cero / usar plantilla
3. Si plantilla → selecciona de biblioteca → pre-rellena campos
4. Completa wizard de 6 pasos:
   - Paso 1: Datos básicos (título, categoría)
   - Paso 2: Tiempo y espacio
   - Paso 3: Jugadores y estructura
   - Paso 4: Reglas de provocación
   - Paso 5: Contenido táctico
   - Paso 6: Gráfico y coaching points
5. Guarda como borrador o publica

**Validaciones:**
- Título obligatorio (min 5 caracteres)
- Categoría obligatoria
- Duración > 0
- Jugadores min > 0
- Al menos una consigna

#### F-TAR-002: Editor Gráfico de Tarea
**Descripción:** Canvas interactivo para dibujar la disposición de la tarea.

**Elementos disponibles:**
- Jugadores (círculos de colores: equipo A, equipo B, comodines, porteros)
- Conos (triángulos)
- Porterías (rectángulos)
- Zonas (rectángulos con transparencia)
- Líneas y flechas (movimientos, pases)
- Texto

**Funciones:**
- Arrastrar y soltar elementos
- Rotar elementos
- Cambiar colores
- Guardar como SVG
- Exportar como PNG

#### F-TAR-003: Biblioteca de Tareas
**Descripción:** Vista de todas las tareas disponibles con filtros avanzados.

**Filtros:**
- Categoría (RND, JDP, etc.)
- Fase de juego
- Principio táctico
- Número de jugadores (rango)
- Duración (rango)
- Nivel cognitivo
- Match Day recomendado
- Tags
- Creado por

**Ordenación:**
- Más recientes
- Más usadas
- Mejor valoradas
- Alfabético

### 5.2 Módulo: Gestión de Sesiones

#### F-SES-001: Crear Sesión Manual
**Descripción:** Crear sesión seleccionando tareas manualmente.

**Flujo:**
1. Datos básicos: fecha, equipo, Match Day
2. Seleccionar tareas de biblioteca para cada fase:
   - Activación (1-2 tareas)
   - Desarrollo 1 (1-2 tareas)
   - Desarrollo 2 (1-2 tareas)
   - Vuelta a calma (0-1 tarea)
3. Ordenar con drag & drop
4. Ajustar duraciones si necesario
5. Añadir notas
6. Guardar

#### F-SES-002: Crear Sesión Asistida (Recomendador)
**Descripción:** El sistema recomienda tareas basándose en parámetros.

**Flujo:**
1. Introducir parámetros:
   - Match Day
   - Número de jugadores disponibles
   - Espacio disponible
   - Objetivo táctico (fase + principio)
   - Duración total deseada
2. Sistema genera recomendaciones para cada fase
3. Usuario selecciona entre opciones
4. Puede editar/sustituir cualquier tarea
5. Confirma y guarda

#### F-SES-003: Exportar Sesión a PDF
**Descripción:** Genera documento PDF profesional.

**Contenido del PDF:**
- Portada con logo del club
- Datos de la sesión (fecha, equipo, MD, objetivo)
- Resumen visual de la sesión
- Ficha detallada de cada tarea con:
  - Gráfico
  - Descripción
  - Reglas
  - Coaching points
- Notas del entrenador

### 5.3 Módulo: Administración

#### F-ADM-001: Gestión de Organización
- Subir/cambiar logo
- Configurar colores corporativos
- Ver estadísticas globales

#### F-ADM-002: Gestión de Equipos
- Crear/editar/archivar equipos
- Asignar técnicos a equipos
- Configurar plantilla por equipo

#### F-ADM-003: Gestión de Usuarios
- Invitar usuarios (por email)
- Asignar roles
- Desactivar usuarios

---

## 6. DISEÑO DE API

### 6.1 Endpoints Principales

```
BASE URL: https://api.traininghub.pro/v1

# Autenticación (delegada a Supabase)
POST   /auth/login
POST   /auth/register
POST   /auth/logout
POST   /auth/refresh

# Usuarios
GET    /usuarios/me
PUT    /usuarios/me
GET    /usuarios                    # Solo admin
GET    /usuarios/{id}               # Solo admin

# Equipos
GET    /equipos
GET    /equipos/{id}
POST   /equipos                     # Solo admin
PUT    /equipos/{id}                # Solo admin
DELETE /equipos/{id}                # Solo admin

# Tareas
GET    /tareas                      # Lista con filtros
GET    /tareas/{id}
POST   /tareas
PUT    /tareas/{id}
DELETE /tareas/{id}
POST   /tareas/{id}/duplicar
GET    /tareas/{id}/grafico         # Obtener SVG
PUT    /tareas/{id}/grafico         # Guardar SVG

# Categorías de Tarea
GET    /categorias-tarea

# Sesiones
GET    /sesiones
GET    /sesiones/{id}
POST   /sesiones
PUT    /sesiones/{id}
DELETE /sesiones/{id}
POST   /sesiones/{id}/tareas        # Añadir tarea a sesión
PUT    /sesiones/{id}/tareas/{tarea_id}  # Modificar orden/config
DELETE /sesiones/{id}/tareas/{tarea_id}
POST   /sesiones/{id}/pdf           # Generar PDF

# Recomendador
POST   /recomendador/sesion         # Obtener recomendaciones

# Catálogos
GET    /catalogos/fases-juego
GET    /catalogos/principios/{fase}
GET    /catalogos/subprincipios/{principio_id}
GET    /catalogos/match-days
```

### 6.2 Ejemplos de Request/Response

#### GET /tareas
```json
// Request
GET /v1/tareas?categoria=JDP&fase=ataque_organizado&jugadores_min=8&limit=10

// Response
{
  "data": [
    {
      "id": "uuid-123",
      "titulo": "Juego de Posición 4+3vs4 para salida de balón",
      "categoria": {
        "codigo": "JDP",
        "nombre": "Juego de Posición"
      },
      "duracion_total": 20,
      "num_jugadores_min": 11,
      "fase_juego": "ataque_organizado",
      "principio_tactico": "Salida de balón",
      "nivel_cognitivo": 2,
      "grafico_url": "https://storage.supabase.co/...",
      "num_usos": 15,
      "valoracion_media": 4.5
    }
  ],
  "pagination": {
    "total": 47,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

#### POST /recomendador/sesion
```json
// Request
{
  "match_day": "MD-3",
  "num_jugadores": 18,
  "num_porteros": 2,
  "espacio_disponible": "campo_completo",
  "duracion_total": 90,
  "fase_juego": "ataque_organizado",
  "principio_tactico": "Salida de balón"
}

// Response
{
  "recomendaciones": {
    "activacion": [
      {
        "tarea": { /* objeto tarea completo */ },
        "score": 0.95,
        "razon": "Rondo ideal para activación en MD-3"
      },
      {
        "tarea": { /* alternativa */ },
        "score": 0.87,
        "razon": "Alternativa con mayor componente físico"
      }
    ],
    "desarrollo_1": [
      {
        "tarea": { /* objeto tarea */ },
        "score": 0.98,
        "razon": "JdP específico para salida de balón con estructura de 11 jugadores"
      }
    ],
    "desarrollo_2": [ /* ... */ ],
    "vuelta_calma": [ /* ... */ ]
  },
  "metadata": {
    "carga_fisica_estimada": "Resistencia",
    "duracion_total_estimada": 88,
    "nivel_cognitivo_promedio": 2.3
  }
}
```

---

## 7. FLUJOS DE USUARIO (UX)

### 7.1 Flujo: Primer Uso (Onboarding)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUJO DE ONBOARDING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REGISTRO                                                                │
│     └─▶ Email + Contraseña                                                  │
│         └─▶ Confirmar email                                                 │
│                                                                             │
│  2. SETUP ORGANIZACIÓN (si es admin)                                        │
│     └─▶ Nombre del club                                                     │
│         └─▶ Subir logo (opcional)                                           │
│             └─▶ Seleccionar colores                                         │
│                                                                             │
│  3. CREAR PRIMER EQUIPO                                                     │
│     └─▶ Nombre del equipo                                                   │
│         └─▶ Categoría                                                       │
│             └─▶ Número de jugadores                                         │
│                                                                             │
│  4. TOUR GUIADO                                                             │
│     └─▶ Mostrar dashboard                                                   │
│         └─▶ Explicar secciones principales                                  │
│             └─▶ Sugerir crear primera tarea                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Flujo: Crear Sesión Asistida

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUJO: CREAR SESIÓN ASISTIDA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PASO 1: CONFIGURACIÓN                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  Fecha: [Calendar picker]                                              │ │
│  │  Equipo: [Dropdown]                                                    │ │
│  │  Match Day: [MD+1] [MD-4] [MD-3] [MD-2] [MD-1] ← Toggle buttons      │ │
│  │  Jugadores disponibles: [18] [+][-]                                   │ │
│  │  Porteros: [2]                                                         │ │
│  │  Espacio: [●Campo completo ○Medio campo ○Área doble]                  │ │
│  │  Duración total: [90 min] slider                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                [Siguiente →]                │
│                                                                             │
│  PASO 2: OBJETIVO TÁCTICO                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  FASE DE JUEGO                                                   │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │ │
│  │  │  │ Ataque   │ │ Defensa  │ │Trans A-D │ │Trans D-A │           │  │ │
│  │  │  │Organizado│ │Organizada│ │          │ │          │           │  │ │
│  │  │  │    ●     │ │    ○     │ │    ○     │ │    ○     │           │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                        │ │
│  │  Principio: [Salida de balón ▼]                                       │ │
│  │  Sub-principio (opcional): [Tercer hombre ▼]                          │ │
│  │                                                                        │ │
│  │  Énfasis físico adicional: [□Fuerza □Velocidad □Resistencia]          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      [← Anterior] [🤖 Generar →]           │
│                                                                             │
│  PASO 3: SELECCIÓN DE TAREAS                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  📍 ACTIVACIÓN (15-20 min) ─────────────────────────────              │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                     │ │
│  │  │ ● Rondo 4vs2        │  │ ○ Rueda pases +     │                     │ │
│  │  │   ⏱15min 👥10       │  │   movilidad         │                     │ │
│  │  │   ⭐ Recomendada     │  │   ⏱12min 👥18       │                     │ │
│  │  │   [Preview][Editar] │  │   [Preview]         │                     │ │
│  │  └─────────────────────┘  └─────────────────────┘                     │ │
│  │                                                                        │ │
│  │  📍 DESARROLLO 1 (20-25 min) ───────────────────────                  │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                     │ │
│  │  │ ● JdP 4+3vs4        │  │ ○ Posesión 8vs4+2   │                     │ │
│  │  │   Salida balón      │  │   Zonas             │                     │ │
│  │  │   ⏱20min 📐40x30    │  │   ⏱25min            │                     │ │
│  │  │   ⭐ Recomendada     │  │   [Preview]         │                     │ │
│  │  └─────────────────────┘  └─────────────────────┘                     │ │
│  │                                                                        │ │
│  │  📍 DESARROLLO 2 (25-30 min) ───────────────────────                  │ │
│  │  ...                                                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      [← Anterior] [Confirmar →]            │
│                                                                             │
│  PASO 4: REVISIÓN Y GUARDADO                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │  RESUMEN DE SESIÓN                                                     │ │
│  │  ──────────────────────                                                │ │
│  │  Fecha: 05/12/2024  |  Equipo: Juvenil A  |  MD-3                     │ │
│  │  Duración total: 87 min  |  Carga: Resistencia                        │ │
│  │                                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 1. Rondo 4vs2              │ Activación    │ 15 min │ [↑][↓][✎] │ │ │
│  │  │ 2. JdP 4+3vs4 Salida balón │ Desarrollo 1  │ 20 min │ [↑][↓][✎] │ │ │
│  │  │ 3. Partido 10vs10 cond.    │ Desarrollo 2  │ 30 min │ [↑][↓][✎] │ │ │
│  │  │ 4. Estiramientos + charla  │ Vuelta calma  │ 10 min │ [↑][↓][✎] │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                        │ │
│  │  Notas adicionales:                                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │ [Textarea para notas del entrenador]                             │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                         [← Anterior] [Guardar borrador] [Guardar y PDF →]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. DISEÑO DE INTERFACES

### 8.1 Sistema de Diseño

**Colores base (modo claro):**
```css
--background: #ffffff
--foreground: #0a0a0a
--primary: #1a365d (azul oscuro profesional)
--primary-foreground: #ffffff
--secondary: #f1f5f9
--accent: #10b981 (verde éxito)
--destructive: #ef4444
--muted: #64748b
--border: #e2e8f0
```

**Tipografía:**
```css
--font-sans: 'Inter', system-ui, sans-serif
--font-mono: 'JetBrains Mono', monospace
```

**Espaciado:**
```css
--spacing-xs: 0.25rem (4px)
--spacing-sm: 0.5rem (8px)
--spacing-md: 1rem (16px)
--spacing-lg: 1.5rem (24px)
--spacing-xl: 2rem (32px)
```

### 8.2 Componentes Principales

#### Card de Tarea
```
┌─────────────────────────────────────────────────────┐
│ [Gráfico miniatura]                    🏷️ JdP      │
│                                                     │
│ Juego de Posición 4+3vs4 para salida de balón      │
│                                                     │
│ ⏱️ 20 min  |  👥 11-14  |  📐 40x30m               │
│                                                     │
│ 🎯 Ataque Organizado > Salida de balón             │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ Nivel cognitivo: ██░░░ (2/3)                   ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ⭐ 4.5  |  📊 15 usos                               │
│                                    [Ver] [Usar]     │
└─────────────────────────────────────────────────────┘
```

#### Sidebar de Navegación
```
┌───────────────────────────┐
│ 🏟️ TrainingHub Pro        │
│ ─────────────────────────  │
│                           │
│ 📊 Dashboard              │
│                           │
│ CONTENIDO                 │
│ ├─ 📋 Tareas              │
│ │  └─ Nueva tarea         │
│ └─ 📅 Sesiones            │
│    └─ Nueva sesión        │
│                           │
│ BIBLIOTECA                │
│ └─ 📚 Explorar            │
│                           │
│ ─────────────────────────  │
│ EQUIPO ACTUAL             │
│ [Juvenil A ▼]             │
│                           │
│ ─────────────────────────  │
│ ⚙️ Configuración          │
│ 👤 Mi perfil              │
│                           │
└───────────────────────────┘
```

---

## 9. SISTEMA DE RECOMENDACIÓN

### 9.1 Algoritmo de Recomendación

El sistema de recomendación se basa en un **scoring ponderado** de múltiples factores:

```python
def calcular_score_tarea(tarea, parametros_sesion):
    score = 0.0
    
    # Factor 1: Compatibilidad con Match Day (peso: 30%)
    score += compatibilidad_match_day(tarea, parametros_sesion.match_day) * 0.30
    
    # Factor 2: Coincidencia táctica (peso: 25%)
    score += coincidencia_tactica(tarea, parametros_sesion) * 0.25
    
    # Factor 3: Ajuste de jugadores (peso: 20%)
    score += ajuste_jugadores(tarea, parametros_sesion.num_jugadores) * 0.20
    
    # Factor 4: Ajuste de espacio (peso: 10%)
    score += ajuste_espacio(tarea, parametros_sesion.espacio) * 0.10
    
    # Factor 5: Popularidad/Valoración (peso: 10%)
    score += (tarea.valoracion_media / 5.0) * 0.10
    
    # Factor 6: Variedad (peso: 5%) - Evitar repetir tareas recientes
    score += factor_variedad(tarea, historial_equipo) * 0.05
    
    return score
```

### 9.2 Reglas de Match Day

```python
REGLAS_MATCH_DAY = {
    "MD+1": {
        "categorias_preferidas": ["RND", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 1,
        "m2_por_jugador": ">150",
        "intensidad": "muy_baja"
    },
    "MD-4": {
        "categorias_preferidas": ["SSG", "JDP", "AVD"],
        "categorias_evitar": ["ACO"],
        "nivel_cognitivo_max": 3,
        "m2_por_jugador": "<100",
        "intensidad": "alta"
    },
    "MD-3": {
        "categorias_preferidas": ["JDP", "POS", "PCO", "AVD"],
        "categorias_evitar": ["SSG"],
        "nivel_cognitivo_max": 3,
        "m2_por_jugador": "100-200",
        "intensidad": "alta"
    },
    "MD-2": {
        "categorias_preferidas": ["EVO", "JDP"],
        "categorias_evitar": ["SSG", "PCO"],
        "nivel_cognitivo_max": 2,
        "m2_por_jugador": ">150",
        "intensidad": "media"
    },
    "MD-1": {
        "categorias_preferidas": ["RND", "ABP", "ACO"],
        "categorias_evitar": ["SSG", "AVD", "PCO"],
        "nivel_cognitivo_max": 2,
        "m2_por_jugador": "variable",
        "intensidad": "baja"
    }
}
```

---

## 10. GENERACIÓN DE PDFs

### 10.1 Estructura del PDF de Sesión

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PÁGINA 1: PORTADA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        [LOGO DEL CLUB]                                      │
│                                                                             │
│                    ─────────────────────────                                │
│                                                                             │
│                      SESIÓN DE ENTRENAMIENTO                                │
│                                                                             │
│                         Juvenil A                                           │
│                       Temporada 2024-25                                     │
│                                                                             │
│                    ─────────────────────────                                │
│                                                                             │
│                    Fecha: 05 de Diciembre 2024                              │
│                    Match Day: MD-3                                          │
│                    Duración: 90 minutos                                     │
│                                                                             │
│                    Objetivo: Salida de balón                                │
│                                                                             │
│                    ─────────────────────────                                │
│                                                                             │
│                    Preparado por: Ignacio Ruiz                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PÁGINA 2: RESUMEN                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ESTRUCTURA DE LA SESIÓN                                                    │
│  ════════════════════════                                                   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ FASE          │ TAREA                          │ DURACIÓN │ PÁGINA    ││
│  ├───────────────┼────────────────────────────────┼──────────┼───────────┤│
│  │ Activación    │ Rondo 4vs2 con movilidad       │ 15 min   │ 3         ││
│  │ Desarrollo 1  │ JdP 4+3vs4 Salida de balón     │ 20 min   │ 4         ││
│  │ Desarrollo 2  │ Partido 10vs10 condicionado    │ 30 min   │ 5         ││
│  │ Vuelta calma  │ Estiramientos + charla táctica │ 10 min   │ 6         ││
│  └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  CARGA DE LA SESIÓN                                                         │
│  ══════════════════                                                         │
│                                                                             │
│  Tipo de esfuerzo: Resistencia a la potencia                               │
│  Intensidad: Alta                                                           │
│  Nivel cognitivo promedio: 2.3 / 3                                         │
│                                                                             │
│  NOTAS DEL ENTRENADOR                                                       │
│  ════════════════════                                                       │
│                                                                             │
│  [Notas que el entrenador haya añadido]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    PÁGINAS 3+: FICHAS DE TAREAS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TAREA 1: ACTIVACIÓN                                  [Logo pequeño]  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  Rondo 4vs2 con movilidad                               ⏱️ 15 min   │  │
│  │  ───────────────────────────────                                     │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────┐  DATOS TÉCNICOS                    │  │
│  │  │                             │  ─────────────                      │  │
│  │  │     [GRÁFICO DE LA TAREA]   │  Categoría: Rondo                  │  │
│  │  │                             │  Espacio: 10x10m                   │  │
│  │  │                             │  Jugadores: 6-8                    │  │
│  │  │                             │  Series: 3x4min                    │  │
│  │  │                             │  Descanso: 1min                    │  │
│  │  └─────────────────────────────┘                                     │  │
│  │                                                                      │  │
│  │  DESCRIPCIÓN                                                         │  │
│  │  ───────────                                                         │  │
│  │  4 jugadores mantienen posesión contra 2 defensores. El defensor   │  │
│  │  que pierde el duelo entra a defender.                              │  │
│  │                                                                      │  │
│  │  REGLAS DE PROVOCACIÓN                                               │  │
│  │  ─────────────────────                                               │  │
│  │  • Máximo 2 toques                                                   │  │
│  │  • Si pasa entre los dos defensores = punto extra                   │  │
│  │  • Cambio de defensor cada 8 pases                                  │  │
│  │                                                                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐│  │
│  │  │ 🔵 CONSIGNAS OFENSIVAS     │ 🔴 CONSIGNAS DEFENSIVAS           ││  │
│  │  ├─────────────────────────────┼───────────────────────────────────┤│  │
│  │  │ • Perfiles orientados       │ • Presión coordinada              ││  │
│  │  │ • Pase tenso, con ventaja   │ • Cerrar línea de pase interior   ││  │
│  │  │ • Mirar antes de recibir    │ • Comunicación constante          ││  │
│  │  └─────────────────────────────┴───────────────────────────────────┘│  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Implementación Técnica

**Tecnología:** WeasyPrint (Python) + Jinja2 templates + CSS

```python
# backend/app/services/pdf_service.py

from weasyprint import HTML, CSS
from jinja2 import Environment, FileSystemLoader

class PDFService:
    def __init__(self):
        self.env = Environment(loader=FileSystemLoader('templates'))
        
    def generar_pdf_sesion(self, sesion: Sesion, organizacion: Organizacion) -> bytes:
        template = self.env.get_template('sesion_pdf.html')
        
        html_content = template.render(
            sesion=sesion,
            organizacion=organizacion,
            tareas=sesion.tareas,
            fecha_formateada=sesion.fecha.strftime('%d de %B de %Y')
        )
        
        css = CSS(filename='templates/pdf_styles.css')
        
        pdf = HTML(string=html_content).write_pdf(stylesheets=[css])
        
        return pdf
```

---

## 11. SEGURIDAD Y AUTENTICACIÓN

### 11.1 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FLUJO DE AUTENTICACIÓN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuario envía credenciales a Supabase Auth                              │
│     └─▶ POST supabase.auth.signInWithPassword({email, password})           │
│                                                                             │
│  2. Supabase devuelve tokens                                                │
│     └─▶ { access_token, refresh_token, user }                              │
│                                                                             │
│  3. Frontend almacena tokens (httpOnly cookies via middleware)              │
│                                                                             │
│  4. Cada request a FastAPI incluye Authorization header                     │
│     └─▶ Authorization: Bearer {access_token}                               │
│                                                                             │
│  5. FastAPI valida token con Supabase                                       │
│     └─▶ supabase.auth.get_user(token)                                      │
│                                                                             │
│  6. Si válido, extrae user_id y consulta rol/permisos                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Row Level Security (RLS)

```sql
-- Política: Los usuarios solo ven tareas de su organización
CREATE POLICY "Usuarios ven tareas de su organización" ON tareas
    FOR SELECT
    USING (
        organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    );

-- Política: Solo técnicos principales y admins pueden crear tareas
CREATE POLICY "Técnicos crean tareas" ON tareas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE id = auth.uid() 
            AND rol IN ('admin', 'tecnico_principal', 'tecnico_asistente')
        )
    );

-- Política: Usuarios solo modifican sus propias tareas
CREATE POLICY "Usuarios editan sus tareas" ON tareas
    FOR UPDATE
    USING (creado_por = auth.uid())
    WITH CHECK (creado_por = auth.uid());
```

---

## 12. PLAN DE DESARROLLO

### 12.1 Fases del Proyecto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROADMAP DE DESARROLLO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FASE 1: MVP (Semanas 1-3)                                                  │
│  ═══════════════════════════                                                │
│  □ Setup proyecto (estructura, dependencias)                                │
│  □ Configurar Supabase (auth, database, storage)                           │
│  □ Implementar autenticación básica                                        │
│  □ CRUD de tareas (sin editor gráfico)                                     │
│  □ CRUD de sesiones (manual)                                               │
│  □ Generación básica de PDF                                                │
│  □ Deploy inicial en Render + Vercel                                       │
│                                                                             │
│  FASE 2: CORE (Semanas 4-5)                                                 │
│  ═════════════════════════                                                  │
│  □ Editor gráfico de tareas (Fabric.js)                                    │
│  □ Sistema de recomendación (reglas básicas)                               │
│  □ Biblioteca con filtros avanzados                                        │
│  □ PDFs profesionales con branding                                         │
│  □ Dashboard con estadísticas                                              │
│                                                                             │
│  FASE 3: MULTI-EQUIPO (Semanas 6-7)                                         │
│  ════════════════════════════════                                           │
│  □ Gestión de organizaciones                                                │
│  □ Gestión de equipos                                                       │
│  □ Sistema de roles y permisos                                             │
│  □ Invitación de usuarios                                                  │
│  □ RLS completo                                                            │
│                                                                             │
│  FASE 4: OPTIMIZACIÓN (Semana 8)                                            │
│  ═══════════════════════════════                                            │
│  □ Performance frontend (lazy loading, caching)                            │
│  □ Tests automatizados                                                     │
│  □ Documentación de usuario                                                │
│  □ Onboarding/tour guiado                                                  │
│                                                                             │
│  FASE 5: EXTRAS (Futuro)                                                    │
│  ══════════════════════                                                     │
│  □ Integración Claude API para recomendaciones avanzadas                   │
│  □ Exportar a Google Calendar                                              │
│  □ App móvil (React Native / PWA)                                          │
│  □ Colaboración en tiempo real                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Entregables por Sprint

| Sprint | Duración | Entregables |
|--------|----------|-------------|
| Sprint 1 | 1 semana | Estructura proyecto, auth, modelos DB |
| Sprint 2 | 1 semana | CRUD tareas, formularios frontend |
| Sprint 3 | 1 semana | CRUD sesiones, PDF básico, deploy |
| Sprint 4 | 1 semana | Editor gráfico, biblioteca filtros |
| Sprint 5 | 1 semana | Recomendador, PDFs profesionales |
| Sprint 6 | 1 semana | Multi-equipo, roles |
| Sprint 7 | 1 semana | Pulido, tests, docs |

---

## 13. CONFIGURACIÓN DE ENTORNO

### 13.1 Requisitos Previos

**Sistema:**
- macOS / Linux / Windows (WSL2)
- Node.js 18+ 
- Python 3.11+
- Git

**Cuentas necesarias:**
- Supabase (gratuito)
- Vercel (gratuito)
- Render (gratuito)
- GitHub

### 13.2 Variables de Entorno

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,https://traininghub.vercel.app

# Opcional: Claude API para recomendaciones avanzadas
ANTHROPIC_API_KEY=sk-ant-...
```

### 13.3 Comandos de Setup

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/traininghub-pro.git
cd traininghub-pro

# Setup Frontend
cd frontend
npm install
cp .env.example .env.local
# Editar .env.local con tus valores
npm run dev

# Setup Backend (en otra terminal)
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con tus valores
uvicorn app.main:app --reload
```

---

## 14. GUÍA DE DESPLIEGUE

### 14.1 Deploy Frontend (Vercel)

1. Conectar repositorio GitHub a Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Build command: `npm run build`
4. Output directory: `.next`
5. Cada push a `main` despliega automáticamente

### 14.2 Deploy Backend (Render)

1. Crear nuevo Web Service en Render
2. Conectar repositorio GitHub
3. Configurar:
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Añadir variables de entorno
5. Cada push a `main` despliega automáticamente

### 14.3 Configuración Supabase

1. Crear proyecto en supabase.com
2. Ejecutar scripts de `database/schema.sql`
3. Configurar Storage buckets:
   - `logos` - público
   - `graficos` - autenticado
   - `pdfs` - autenticado
4. Configurar RLS policies
5. Copiar URL y keys a variables de entorno

---

## ANEXOS

### A. Glosario de Términos

| Término | Definición |
|---------|------------|
| Match Day (MD) | Día relativo al partido. MD-3 = 3 días antes |
| Rondo | Ejercicio de posesión en espacio reducido |
| JdP | Juego de Posición |
| SSG | Small Sided Game (fútbol reducido) |
| ABP | Acción a Balón Parado |
| RLS | Row Level Security (seguridad a nivel de fila) |

### B. Referencias

- Metodología UEFA B - RFEF
- Periodización Táctica - Vítor Frade
- El camino del entrenador - Seirul·lo
- Documentación Supabase: https://supabase.com/docs
- Documentación Next.js: https://nextjs.org/docs
- Documentación FastAPI: https://fastapi.tiangolo.com

---

**Documento generado para Club Atlético Central**  
**Versión 1.0.0 - Diciembre 2024**
