"""
TrainingHub Pro - Modelos del Modulo Medico
GDPR Art. 9 - Datos de categoria especial
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class TipoRegistroMedico(str, Enum):
    LESION = "lesion"
    ENFERMEDAD = "enfermedad"
    MOLESTIAS = "molestias"
    REHABILITACION = "rehabilitacion"
    OTRO = "otro"


class EstadoRegistroMedico(str, Enum):
    ACTIVO = "activo"
    EN_RECUPERACION = "en_recuperacion"
    ALTA = "alta"
    CRONICO = "cronico"


class DisponibilidadOperativa(str, Enum):
    """Espectro de disponibilidad para entrenos / convocatorias."""
    FUERA = "fuera"
    INDIVIDUAL = "individual"
    GRUPO_ADAPTADO = "grupo_adaptado"
    PLENO = "pleno"


class SeveridadLesion(str, Enum):
    LEVE = "leve"
    MODERADA = "moderada"
    GRAVE = "grave"


class LadoCorporal(str, Enum):
    IZQUIERDO = "izquierdo"
    DERECHO = "derecho"
    BILATERAL = "bilateral"
    NO_APLICA = "no_aplica"


class FaseRTP(str, Enum):
    FASE_1_CONTROL_DOLOR = "fase_1_control_dolor"
    FASE_2_MOVILIDAD = "fase_2_movilidad"
    FASE_3_FUERZA_BASE = "fase_3_fuerza_base"
    FASE_4_FUERZA_FUNCIONAL = "fase_4_fuerza_funcional"
    FASE_5_CARRERA_LINEAL = "fase_5_carrera_lineal"
    FASE_6_CAMBIOS_DIRECCION = "fase_6_cambios_direccion"
    FASE_7_ENTRENAMIENTO_EQUIPO = "fase_7_entrenamiento_equipo"
    FASE_8_COMPETICION = "fase_8_competicion"


class TipoPruebaMedica(str, Enum):
    IMAGEN = "imagen"
    RECONOCIMIENTO = "reconocimiento"
    ISOKINETICO = "isokinetico"
    GPS_CAMPO = "gps_campo"
    LABORATORIO = "laboratorio"
    FUNCIONAL = "funcional"
    OTRO = "otro"


class AccionMedica(str, Enum):
    VER = "ver"
    CREAR = "crear"
    EDITAR = "editar"
    ELIMINAR = "eliminar"
    EXPORTAR = "exportar"


# ============ Registros Medicos ============

class RegistroMedicoCreate(BaseModel):
    """Schema para crear registro medico."""
    jugador_id: UUID
    equipo_id: UUID
    tipo: TipoRegistroMedico
    titulo: str = Field(..., min_length=1, max_length=255)
    descripcion: Optional[str] = None
    diagnostico: Optional[str] = None      # Will be encrypted
    diagnostico_fisioterapeutico: Optional[str] = None
    tratamiento: Optional[str] = None      # Will be encrypted
    medicacion: Optional[str] = None       # Will be encrypted
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    fecha_alta: Optional[date] = None
    dias_baja_estimados: Optional[int] = None
    protocolo_recuperacion: Optional[dict] = None
    documentos_urls: Optional[list[str]] = None
    estado: Optional[EstadoRegistroMedico] = None
    solo_medico: bool = True
    registro_padre_id: Optional[UUID] = None
    severidad: Optional[SeveridadLesion] = None
    zona_corporal: Optional[str] = Field(None, max_length=100)
    lado: Optional[LadoCorporal] = None
    mecanismo: Optional[str] = Field(None, max_length=255)
    es_relesion: bool = False
    registro_origen_id: Optional[UUID] = None
    disponibilidad: Optional[DisponibilidadOperativa] = None
    fase_rtp: Optional[FaseRTP] = None


class RegistroMedicoUpdate(BaseModel):
    """Schema para actualizar registro medico."""
    titulo: Optional[str] = Field(None, max_length=255)
    descripcion: Optional[str] = None
    diagnostico: Optional[str] = None
    diagnostico_fisioterapeutico: Optional[str] = None
    tratamiento: Optional[str] = None
    medicacion: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    fecha_alta: Optional[date] = None
    dias_baja_estimados: Optional[int] = None
    dias_baja_reales: Optional[int] = None
    protocolo_recuperacion: Optional[dict] = None
    documentos_urls: Optional[list[str]] = None
    estado: Optional[EstadoRegistroMedico] = None
    solo_medico: Optional[bool] = None
    registro_padre_id: Optional[UUID] = None
    severidad: Optional[SeveridadLesion] = None
    zona_corporal: Optional[str] = Field(None, max_length=100)
    lado: Optional[LadoCorporal] = None
    mecanismo: Optional[str] = Field(None, max_length=255)
    es_relesion: Optional[bool] = None
    registro_origen_id: Optional[UUID] = None
    disponibilidad: Optional[DisponibilidadOperativa] = None
    fase_rtp: Optional[FaseRTP] = None


class RegistroMedicoResponse(BaseModel):
    """Schema de respuesta de registro medico."""
    id: UUID
    jugador_id: UUID
    equipo_id: UUID
    tipo: TipoRegistroMedico
    titulo: str
    descripcion: Optional[str] = None
    diagnostico: Optional[str] = None      # Decrypted for authorized users
    diagnostico_fisioterapeutico: Optional[str] = None
    tratamiento: Optional[str] = None      # Decrypted for authorized users
    medicacion: Optional[str] = None       # Decrypted for authorized users
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    fecha_alta: Optional[date] = None
    dias_baja_estimados: Optional[int] = None
    dias_baja_reales: Optional[int] = None
    protocolo_recuperacion: Optional[dict] = None
    documentos_urls: Optional[list[str]] = None
    estado: EstadoRegistroMedico = EstadoRegistroMedico.ACTIVO
    documentos: list = []
    creado_por: UUID
    solo_medico: bool = True
    registro_padre_id: Optional[UUID] = None
    severidad: Optional[SeveridadLesion] = None
    zona_corporal: Optional[str] = None
    lado: Optional[LadoCorporal] = None
    mecanismo: Optional[str] = None
    es_relesion: bool = False
    registro_origen_id: Optional[UUID] = None
    disponibilidad: Optional[DisponibilidadOperativa] = None
    fase_rtp: Optional[FaseRTP] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RegistroMedicoSummary(BaseModel):
    """Summary view for entrenador_principal (no clinical details)."""
    id: UUID
    jugador_id: UUID
    tipo: TipoRegistroMedico
    titulo: str
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    fecha_alta: Optional[date] = None
    dias_baja_estimados: Optional[int] = None
    estado: EstadoRegistroMedico = EstadoRegistroMedico.ACTIVO
    disponibilidad: Optional[DisponibilidadOperativa] = None
    fase_rtp: Optional[FaseRTP] = None
    severidad: Optional[SeveridadLesion] = None
    zona_corporal: Optional[str] = None
    created_at: datetime


class RegistroMedicoListResponse(BaseModel):
    data: List[RegistroMedicoResponse]
    total: int


class MarkFitRequest(BaseModel):
    fecha_alta: Optional[date] = None
    dias_baja_reales: Optional[int] = None


class PruebaMedicaCreate(BaseModel):
    tipo: TipoPruebaMedica = TipoPruebaMedica.OTRO
    titulo: str = Field(..., min_length=1, max_length=255)
    fecha: date
    resultado: Optional[str] = None
    apto: Optional[bool] = None
    documento_url: Optional[str] = None
    notas: Optional[str] = None


class PruebaMedicaUpdate(BaseModel):
    tipo: Optional[TipoPruebaMedica] = None
    titulo: Optional[str] = Field(None, max_length=255)
    fecha: Optional[date] = None
    resultado: Optional[str] = None
    apto: Optional[bool] = None
    documento_url: Optional[str] = None
    notas: Optional[str] = None


class PruebaMedicaResponse(BaseModel):
    id: UUID
    registro_medico_id: UUID
    jugador_id: UUID
    equipo_id: UUID
    tipo: TipoPruebaMedica
    titulo: str
    fecha: date
    resultado: Optional[str] = None
    apto: Optional[bool] = None
    documento_url: Optional[str] = None
    notas: Optional[str] = None
    creado_por: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Access Log ============

class AccesoMedicoLogResponse(BaseModel):
    id: UUID
    registro_medico_id: UUID
    usuario_id: UUID
    accion: AccionMedica
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AccesoMedicoLogListResponse(BaseModel):
    data: List[AccesoMedicoLogResponse]
    total: int


# ============ Permisos Personalizados ============

class PermisosPersonalizadosCreate(BaseModel):
    """Schema para configurar permisos personalizados."""
    equipo_id: UUID
    rol_en_equipo: Optional[str] = None
    usuario_id: Optional[UUID] = None
    puede_crear_sesiones: Optional[bool] = None
    puede_editar_sesiones: Optional[bool] = None
    puede_eliminar_sesiones: Optional[bool] = None
    puede_crear_tareas: Optional[bool] = None
    puede_editar_tareas: Optional[bool] = None
    puede_eliminar_tareas: Optional[bool] = None
    puede_gestionar_plantilla: Optional[bool] = None
    puede_crear_convocatorias: Optional[bool] = None
    puede_ver_rivales: Optional[bool] = None
    puede_editar_rivales: Optional[bool] = None
    puede_subir_videos: Optional[bool] = None
    puede_exportar: Optional[bool] = None
    puede_usar_ai: Optional[bool] = None
    puede_gestionar_kb: Optional[bool] = None
    puede_ver_datos_medicos: Optional[bool] = None


class PermisosPersonalizadosResponse(BaseModel):
    id: UUID
    equipo_id: UUID
    rol_en_equipo: Optional[str] = None
    usuario_id: Optional[UUID] = None
    puede_crear_sesiones: Optional[bool] = None
    puede_editar_sesiones: Optional[bool] = None
    puede_eliminar_sesiones: Optional[bool] = None
    puede_crear_tareas: Optional[bool] = None
    puede_editar_tareas: Optional[bool] = None
    puede_eliminar_tareas: Optional[bool] = None
    puede_gestionar_plantilla: Optional[bool] = None
    puede_crear_convocatorias: Optional[bool] = None
    puede_ver_rivales: Optional[bool] = None
    puede_editar_rivales: Optional[bool] = None
    puede_subir_videos: Optional[bool] = None
    puede_exportar: Optional[bool] = None
    puede_usar_ai: Optional[bool] = None
    puede_gestionar_kb: Optional[bool] = None
    puede_ver_datos_medicos: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
