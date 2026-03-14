-- Portero Tareas: goalkeeper-specific training exercises linked to sessions
CREATE TABLE portero_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesion_id UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
    equipo_id UUID NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
    orden INT NOT NULL DEFAULT 0,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    duracion INT DEFAULT 10,
    intensidad VARCHAR(20) DEFAULT 'media',
    tipo VARCHAR(50),
    diagram JSONB,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portero_tareas_sesion ON portero_tareas(sesion_id);
CREATE INDEX idx_portero_tareas_equipo ON portero_tareas(equipo_id);

ALTER TABLE portero_tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portero_tareas_all" ON portero_tareas FOR ALL USING (true) WITH CHECK (true);

-- Add POR (Portero/GK) category to the tareas catalog
INSERT INTO categorias_tarea (codigo, nombre, nombre_corto, color, orden, activo)
VALUES ('POR', 'Portero (GK)', 'POR', '#22C55E', 10, true)
ON CONFLICT (codigo) DO NOTHING;
