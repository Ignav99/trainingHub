-- Migration 007: Enhanced Data Model
-- Microciclos, RPE, Convocatorias, Comunicación, AI, KB, RFEF, Onboarding

-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ MICROCICLOS ============

CREATE TABLE microciclos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    partido_id UUID REFERENCES partidos(id),
    objetivo_principal TEXT,
    objetivo_tactico TEXT,
    objetivo_fisico TEXT,
    estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','planificado','en_curso','completado')),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ REGISTROS RPE ============

CREATE TABLE registros_rpe (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    sesion_id UUID REFERENCES sesiones(id),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    rpe INTEGER NOT NULL CHECK (rpe BETWEEN 1 AND 10),
    duracion_percibida INTEGER,  -- minutos percibidos
    sueno INTEGER CHECK (sueno BETWEEN 1 AND 5),
    fatiga INTEGER CHECK (fatiga BETWEEN 1 AND 5),
    dolor INTEGER CHECK (dolor BETWEEN 1 AND 5),
    estres INTEGER CHECK (estres BETWEEN 1 AND 5),
    humor INTEGER CHECK (humor BETWEEN 1 AND 5),
    carga_sesion DECIMAL(6,1),  -- RPE * duracion
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CONVOCATORIAS ============

CREATE TABLE convocatorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
    jugador_id UUID NOT NULL REFERENCES jugadores(id),
    titular BOOLEAN DEFAULT false,
    posicion_asignada VARCHAR(50),
    dorsal INTEGER,
    minutos_jugados INTEGER DEFAULT 0,
    goles INTEGER DEFAULT 0,
    asistencias INTEGER DEFAULT 0,
    tarjeta_amarilla BOOLEAN DEFAULT false,
    tarjeta_roja BOOLEAN DEFAULT false,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(partido_id, jugador_id)
);

-- ============ CONVERSACIONES (chat interno) ============

CREATE TABLE conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID REFERENCES equipos(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('directa','grupo','canal')),
    nombre VARCHAR(255),
    creado_por UUID NOT NULL REFERENCES usuarios(id),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ MENSAJES ============

CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL REFERENCES usuarios(id),
    contenido TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'texto' CHECK (tipo IN ('texto','imagen','archivo','sistema')),
    archivo_url TEXT,
    fijado BOOLEAN DEFAULT false,
    editado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CONVERSACION PARTICIPANTES ============

CREATE TABLE conversacion_participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    rol VARCHAR(20) DEFAULT 'miembro' CHECK (rol IN ('admin','miembro')),
    ultimo_leido TIMESTAMPTZ,
    silenciado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversacion_id, usuario_id)
);

-- ============ NOTIFICACIONES ============

CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT,
    entidad_tipo VARCHAR(50),
    entidad_id UUID,
    leida BOOLEAN DEFAULT false,
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja','normal','alta','urgente')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ DOCUMENTOS KB (Knowledge Base) ============

CREATE TABLE documentos_kb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizacion_id UUID REFERENCES organizaciones(id),
    titulo VARCHAR(255) NOT NULL,
    fuente VARCHAR(255),
    tipo VARCHAR(50) DEFAULT 'manual' CHECK (tipo IN ('manual','pdf','url','seed')),
    contenido_texto TEXT,
    archivo_url TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesando','indexado','error')),
    num_chunks INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CHUNKS KB (vectorizados) ============

CREATE TABLE chunks_kb (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID NOT NULL REFERENCES documentos_kb(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    posicion INTEGER NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ AI CONVERSACIONES ============

CREATE TABLE ai_conversaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    equipo_id UUID REFERENCES equipos(id),
    titulo VARCHAR(255),
    contexto JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ AI MENSAJES ============

CREATE TABLE ai_mensajes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES ai_conversaciones(id) ON DELETE CASCADE,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('user','assistant','system')),
    contenido TEXT NOT NULL,
    herramientas_usadas JSONB DEFAULT '[]',
    tokens_input INTEGER,
    tokens_output INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ RFEF COMPETICIONES ============

CREATE TABLE rfef_competiciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    rfef_id VARCHAR(100),
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    grupo VARCHAR(100),
    temporada VARCHAR(20),
    url_fuente TEXT,
    clasificacion JSONB DEFAULT '[]',
    calendario JSONB DEFAULT '[]',
    ultima_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ RFEF JORNADAS ============

CREATE TABLE rfef_jornadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competicion_id UUID NOT NULL REFERENCES rfef_competiciones(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    fecha DATE,
    partidos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(competicion_id, numero)
);

-- ============ ONBOARDING PROGRESO ============

CREATE TABLE onboarding_progreso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    paso_actual INTEGER DEFAULT 1,
    pasos_completados JSONB DEFAULT '{}',
    completado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ALTERACIONES A TABLAS EXISTENTES ============

ALTER TABLE sesiones ADD COLUMN IF NOT EXISTS microciclo_id UUID REFERENCES microciclos(id);
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id);

-- ============ INDICES ============

CREATE INDEX idx_microciclos_equipo ON microciclos(equipo_id);
CREATE INDEX idx_microciclos_fechas ON microciclos(fecha_inicio, fecha_fin);
CREATE INDEX idx_registros_rpe_jugador ON registros_rpe(jugador_id);
CREATE INDEX idx_registros_rpe_sesion ON registros_rpe(sesion_id);
CREATE INDEX idx_registros_rpe_fecha ON registros_rpe(fecha);
CREATE INDEX idx_convocatorias_partido ON convocatorias(partido_id);
CREATE INDEX idx_convocatorias_jugador ON convocatorias(jugador_id);
CREATE INDEX idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX idx_mensajes_fecha ON mensajes(created_at);
CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON notificaciones(usuario_id, leida);
CREATE INDEX idx_chunks_kb_documento ON chunks_kb(documento_id);
CREATE INDEX idx_ai_mensajes_conversacion ON ai_mensajes(conversacion_id);
CREATE INDEX idx_rfef_jornadas_competicion ON rfef_jornadas(competicion_id);
CREATE INDEX idx_sesiones_microciclo ON sesiones(microciclo_id);

-- INDICE VECTORIAL para busqueda de embeddings
CREATE INDEX idx_chunks_kb_embedding ON chunks_kb USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============ RLS EN TODAS LAS TABLAS NUEVAS ============

ALTER TABLE microciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_rpe ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocatorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversacion_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks_kb ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfef_competiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfef_jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progreso ENABLE ROW LEVEL SECURITY;

-- ============ TRIGGERS updated_at ============

CREATE TRIGGER update_microciclos_updated_at BEFORE UPDATE ON microciclos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_convocatorias_updated_at BEFORE UPDATE ON convocatorias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversaciones_updated_at BEFORE UPDATE ON conversaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mensajes_updated_at BEFORE UPDATE ON mensajes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentos_kb_updated_at BEFORE UPDATE ON documentos_kb
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversaciones_updated_at BEFORE UPDATE ON ai_conversaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfef_competiciones_updated_at BEFORE UPDATE ON rfef_competiciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rfef_jornadas_updated_at BEFORE UPDATE ON rfef_jornadas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_progreso_updated_at BEFORE UPDATE ON onboarding_progreso
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ POLICIES BASICAS ============

-- Microciclos: visibles por equipo
CREATE POLICY "microciclos_select" ON microciclos FOR SELECT USING (
    equipo_id IN (SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid())
);
CREATE POLICY "microciclos_insert" ON microciclos FOR INSERT WITH CHECK (
    equipo_id IN (SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid())
);

-- RPE: jugadores ven sus propios, staff ve todos del equipo
CREATE POLICY "rpe_select" ON registros_rpe FOR SELECT USING (true);
CREATE POLICY "rpe_insert" ON registros_rpe FOR INSERT WITH CHECK (true);

-- Convocatorias: visibles por equipo del partido
CREATE POLICY "convocatorias_select" ON convocatorias FOR SELECT USING (true);
CREATE POLICY "convocatorias_insert" ON convocatorias FOR INSERT WITH CHECK (true);

-- Conversaciones: participantes
CREATE POLICY "conversaciones_select" ON conversaciones FOR SELECT USING (
    id IN (SELECT conversacion_id FROM conversacion_participantes WHERE usuario_id = auth.uid())
    OR creado_por = auth.uid()
);
CREATE POLICY "conversaciones_insert" ON conversaciones FOR INSERT WITH CHECK (
    creado_por = auth.uid()
);

-- Mensajes: participantes de la conversación
CREATE POLICY "mensajes_select" ON mensajes FOR SELECT USING (
    conversacion_id IN (
        SELECT conversacion_id FROM conversacion_participantes WHERE usuario_id = auth.uid()
    )
);
CREATE POLICY "mensajes_insert" ON mensajes FOR INSERT WITH CHECK (
    autor_id = auth.uid()
);

-- Participantes: ver los propios
CREATE POLICY "participantes_select" ON conversacion_participantes FOR SELECT USING (
    usuario_id = auth.uid()
    OR conversacion_id IN (
        SELECT conversacion_id FROM conversacion_participantes WHERE usuario_id = auth.uid()
    )
);

-- Notificaciones: solo las propias
CREATE POLICY "notificaciones_select" ON notificaciones FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "notificaciones_update" ON notificaciones FOR UPDATE USING (usuario_id = auth.uid());

-- Documentos KB: por organización
CREATE POLICY "documentos_kb_select" ON documentos_kb FOR SELECT USING (
    organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid())
);
CREATE POLICY "documentos_kb_insert" ON documentos_kb FOR INSERT WITH CHECK (
    organizacion_id IN (SELECT organizacion_id FROM usuarios WHERE id = auth.uid())
);

-- Chunks KB: por documento accesible
CREATE POLICY "chunks_kb_select" ON chunks_kb FOR SELECT USING (
    documento_id IN (
        SELECT id FROM documentos_kb WHERE organizacion_id IN (
            SELECT organizacion_id FROM usuarios WHERE id = auth.uid()
        )
    )
);

-- AI: solo las propias
CREATE POLICY "ai_conv_select" ON ai_conversaciones FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "ai_conv_insert" ON ai_conversaciones FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "ai_msg_select" ON ai_mensajes FOR SELECT USING (
    conversacion_id IN (SELECT id FROM ai_conversaciones WHERE usuario_id = auth.uid())
);
CREATE POLICY "ai_msg_insert" ON ai_mensajes FOR INSERT WITH CHECK (
    conversacion_id IN (SELECT id FROM ai_conversaciones WHERE usuario_id = auth.uid())
);

-- RFEF: por equipo
CREATE POLICY "rfef_competiciones_select" ON rfef_competiciones FOR SELECT USING (
    equipo_id IN (SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid())
);
CREATE POLICY "rfef_jornadas_select" ON rfef_jornadas FOR SELECT USING (
    competicion_id IN (
        SELECT id FROM rfef_competiciones WHERE equipo_id IN (
            SELECT equipo_id FROM usuarios_equipos WHERE usuario_id = auth.uid()
        )
    )
);

-- Onboarding: solo el propio
CREATE POLICY "onboarding_select" ON onboarding_progreso FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "onboarding_all" ON onboarding_progreso FOR ALL USING (usuario_id = auth.uid());
