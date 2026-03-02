"""
TrainingHub Pro - Modelos de GDPR/RGPD y Control Parental
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class TipoConsentimiento(str, Enum):
    TERMINOS_SERVICIO = "terminos_servicio"
    POLITICA_PRIVACIDAD = "politica_privacidad"
    DATOS_PERSONALES = "datos_personales"
    DATOS_MEDICOS = "datos_medicos"
    COMUNICACIONES_MARKETING = "comunicaciones_marketing"
    TRATAMIENTO_IMAGEN = "tratamiento_imagen"
    TRANSFERENCIA_DATOS = "transferencia_datos"
    MENOR_REPRESENTACION = "menor_representacion"


class TipoSolicitudGDPR(str, Enum):
    ACCESO = "acceso"
    RECTIFICACION = "rectificacion"
    SUPRESION = "supresion"
    PORTABILIDAD = "portabilidad"
    OPOSICION = "oposicion"
    LIMITACION = "limitacion"


class EstadoSolicitudGDPR(str, Enum):
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADA = "completada"
    RECHAZADA = "rechazada"


class RelacionTutor(str, Enum):
    PADRE = "padre"
    MADRE = "madre"
    TUTOR_LEGAL = "tutor_legal"


class MetodoConsentimiento(str, Enum):
    DIGITAL = "digital"
    PRESENCIAL = "presencial"
    DOCUMENTO = "documento"


# ============ Vinculos Tutor ============

class VinculoTutorCreate(BaseModel):
    """Schema para crear vinculo tutor-menor."""
    jugador_id: UUID
    relacion: RelacionTutor
    consentimiento_metodo: MetodoConsentimiento = MetodoConsentimiento.DIGITAL


class VinculoTutorResponse(BaseModel):
    id: UUID
    jugador_id: UUID
    tutor_usuario_id: UUID
    relacion: RelacionTutor
    consentimiento_otorgado: bool
    consentimiento_fecha: Optional[datetime] = None
    consentimiento_ip: Optional[str] = None
    consentimiento_metodo: Optional[MetodoConsentimiento] = None
    documento_consentimiento_url: Optional[str] = None
    consentimiento_revocado: bool = False
    revocacion_fecha: Optional[datetime] = None
    activo: bool = True
    verificado: bool = False
    verificado_fecha: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VinculoTutorListResponse(BaseModel):
    data: List[VinculoTutorResponse]


# ============ Consentimientos GDPR ============

class ConsentimientoCreate(BaseModel):
    """Schema para registrar consentimiento."""
    tipo: TipoConsentimiento
    version: str = "1.0"
    otorgado: bool = True


class ConsentimientoResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    tipo: TipoConsentimiento
    version: str
    otorgado: bool
    ip_address: Optional[str] = None
    fecha: datetime
    revocado: bool = False
    revocado_fecha: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConsentimientoListResponse(BaseModel):
    data: List[ConsentimientoResponse]


class ConsentimientoBulkCreate(BaseModel):
    """Para registrar multiples consentimientos a la vez (registro/invitacion)."""
    consentimientos: List[ConsentimientoCreate]


# ============ Solicitudes GDPR ============

class SolicitudGDPRCreate(BaseModel):
    """Schema para crear solicitud de derechos GDPR."""
    tipo: TipoSolicitudGDPR
    descripcion: Optional[str] = None


class SolicitudGDPRResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    tipo: TipoSolicitudGDPR
    estado: EstadoSolicitudGDPR
    descripcion: Optional[str] = None
    respuesta: Optional[str] = None
    procesado_por: Optional[UUID] = None
    fecha_limite: datetime
    fecha_completada: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SolicitudGDPRListResponse(BaseModel):
    data: List[SolicitudGDPRResponse]
    total: int


class SolicitudGDPRUpdateAdmin(BaseModel):
    """Schema para que admin procese solicitud GDPR."""
    estado: EstadoSolicitudGDPR
    respuesta: Optional[str] = None


# ============ Tutor Accept Flow ============

class TutorVerifyResponse(BaseModel):
    """Info devuelta al padre/tutor al verificar invitacion."""
    jugador_nombre: str
    jugador_apellidos: Optional[str] = None
    equipo_nombre: str
    organizacion_nombre: str
    consentimientos_requeridos: List[str]


class TutorAcceptRequest(BaseModel):
    """Schema para que el tutor acepte y cree su cuenta."""
    token: str
    nombre: str = Field(..., min_length=2, max_length=255)
    apellidos: Optional[str] = None
    password: str = Field(..., min_length=8)
    relacion: RelacionTutor
    consentimientos: List[ConsentimientoCreate]


# ============ Data Export (Portabilidad) ============

class DataExportResponse(BaseModel):
    """Respuesta con URL de descarga de datos exportados."""
    download_url: str
    expires_at: datetime
    formato: str = "json"
