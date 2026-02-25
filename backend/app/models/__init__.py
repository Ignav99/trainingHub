"""
TrainingHub Pro - Models Package
Exporta todos los modelos Pydantic.
"""

from app.models.tarea import (
    FaseJuego,
    Densidad,
    NivelCognitivo,
    CategoriaTareaBase,
    CategoriaTareaResponse,
    TareaBase,
    TareaCreate,
    TareaUpdate,
    TareaResponse,
    TareaListResponse,
    TareaFiltros,
)

from app.models.sesion import (
    MatchDay,
    FaseSesion,
    EstadoSesion,
    Intensidad,
    GrupoFormacion,
    EspacioFormacion,
    FormacionEquipos,
    FormacionEquiposUpdate,
    SesionTareaBase,
    SesionTareaCreate,
    SesionTareaResponse,
    SesionTareaUpdate,
    SesionTareasBatchUpdate,
    SesionBase,
    SesionCreate,
    SesionUpdate,
    SesionResponse,
    SesionListResponse,
    SesionFiltros,
    RecomendadorInput,
    RecomendadorOutput,
    TareaRecomendada,
    MatchDayConfig,
    # AI Recommender
    AITareaNueva,
    AIRecomendadorInput,
    AIRecomendadorOutput,
    AIFaseRecomendacion,
    AICargaEstimada,
)

from app.models.asistencia import (
    MotivoAusencia,
    AsistenciaCreate,
    AsistenciaBatchCreate,
    AsistenciaUpdate,
    AsistenciaResponse,
    AsistenciaListResponse,
    AsistenciaResumen,
    AsistenciaHistoricoJugador,
    AsistenciaHistoricoResponse,
)

from app.models.usuario import (
    RolUsuario,
    RolEnEquipo,
    OrganizacionBase,
    OrganizacionCreate,
    OrganizacionUpdate,
    OrganizacionResponse,
    EquipoBase,
    EquipoCreate,
    EquipoUpdate,
    EquipoResponse,
    EquipoListResponse,
    UsuarioBase,
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioUpdateAdmin,
    UsuarioResponse,
    UsuarioListResponse,
    UsuarioEquipoBase,
    UsuarioEquipoCreate,
    UsuarioEquipoResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
)

from app.models.jugador import (
    PiernaDominante,
    EstadoJugador,
    Posicion,
    JugadorBase,
    JugadorCreate,
    JugadorUpdate,
    JugadorResponse,
    JugadorListResponse,
    JugadorFiltros,
    JugadorInvitadoCreate,
    PosicionResponse,
    PosicionListResponse,
)

from app.models.partido import (
    TipoCompeticion,
    LocaliaPartido,
    ResultadoPartido,
    RivalBase,
    RivalCreate,
    RivalUpdate,
    RivalResponse,
    RivalListResponse,
    PartidoBase,
    PartidoCreate,
    PartidoUpdate,
    PartidoResponse,
    PartidoListResponse,
    PartidoFiltros,
)

from app.models.microciclo import (
    EstadoMicrociclo,
    MicrocicloBase,
    MicrocicloCreate,
    MicrocicloUpdate,
    MicrocicloResponse,
    MicrocicloListResponse,
)

from app.models.rpe import (
    RPEBase,
    RPECreate,
    RPEResponse,
    RPEListResponse,
)

from app.models.convocatoria import (
    ConvocatoriaBase,
    ConvocatoriaCreate,
    ConvocatoriaUpdate,
    ConvocatoriaResponse,
    ConvocatoriaListResponse,
)

from app.models.comunicacion import (
    TipoConversacion,
    TipoMensaje,
    RolParticipante,
    PrioridadNotificacion,
    ConversacionBase,
    ConversacionCreate,
    ConversacionResponse,
    MensajeBase,
    MensajeCreate,
    MensajeResponse,
    ParticipanteResponse,
    NotificacionBase,
    NotificacionCreate,
    NotificacionResponse,
    NotificacionListResponse,
)

from app.models.ai_chat import (
    RolMensajeAI,
    AIConversacionBase,
    AIConversacionCreate,
    AIConversacionResponse,
    AIMensajeBase,
    AIMensajeCreate,
    AIMensajeResponse,
    AIChatRequest,
    AIChatResponse,
)

from app.models.knowledge_base import (
    TipoDocumentoKB,
    EstadoDocumentoKB,
    DocumentoKBBase,
    DocumentoKBCreate,
    DocumentoKBResponse,
    ChunkKBResponse,
    KBSearchRequest,
    KBSearchResult,
    KBSearchResponse,
)

# New models for licensing, roles, and security
from app.models.suscripcion import (
    TipoLicencia,
    EstadoSuscripcion,
    CicloSuscripcion,
    AccionHistorial,
    PlanResponse,
    PlanListResponse,
    SuscripcionResponse,
    SuscripcionCreate,
    SuscripcionUpdate,
    SuscripcionUpgrade,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    HistorialSuscripcionResponse,
    HistorialListResponse,
    UsageResponse,
)

from app.models.invitacion import (
    EstadoInvitacion,
    EstadoTransferencia,
    InvitacionCreate,
    InvitacionResponse,
    InvitacionListResponse,
    InvitacionVerifyResponse,
    InvitacionAcceptRequest,
    TransferenciaCreate,
    TransferenciaResponse,
)

from app.models.gdpr import (
    TipoConsentimiento,
    TipoSolicitudGDPR,
    EstadoSolicitudGDPR,
    RelacionTutor,
    MetodoConsentimiento,
    VinculoTutorCreate,
    VinculoTutorResponse,
    VinculoTutorListResponse,
    ConsentimientoCreate,
    ConsentimientoResponse,
    ConsentimientoListResponse,
    ConsentimientoBulkCreate,
    SolicitudGDPRCreate,
    SolicitudGDPRResponse,
    SolicitudGDPRListResponse,
    SolicitudGDPRUpdateAdmin,
    TutorVerifyResponse,
    TutorAcceptRequest,
    DataExportResponse,
)

from app.models.medico import (
    TipoRegistroMedico,
    EstadoRegistroMedico,
    AccionMedica,
    RegistroMedicoCreate,
    RegistroMedicoUpdate,
    RegistroMedicoResponse,
    RegistroMedicoSummary,
    RegistroMedicoListResponse,
    AccesoMedicoLogResponse,
    AccesoMedicoLogListResponse,
    PermisosPersonalizadosCreate,
    PermisosPersonalizadosResponse,
)

__all__ = [
    # Tarea
    "FaseJuego", "Densidad", "NivelCognitivo",
    "CategoriaTareaBase", "CategoriaTareaResponse",
    "TareaBase", "TareaCreate", "TareaUpdate", "TareaResponse",
    "TareaListResponse", "TareaFiltros",
    # Sesion
    "MatchDay", "FaseSesion", "EstadoSesion", "Intensidad",
    "GrupoFormacion", "EspacioFormacion", "FormacionEquipos", "FormacionEquiposUpdate",
    "SesionTareaBase", "SesionTareaCreate", "SesionTareaResponse",
    "SesionTareaUpdate", "SesionTareasBatchUpdate",
    "SesionBase", "SesionCreate", "SesionUpdate", "SesionResponse",
    "SesionListResponse", "SesionFiltros",
    "RecomendadorInput", "RecomendadorOutput", "TareaRecomendada", "MatchDayConfig",
    "AITareaNueva", "AIRecomendadorInput", "AIRecomendadorOutput",
    "AIFaseRecomendacion", "AICargaEstimada",
    # Asistencia
    "MotivoAusencia", "AsistenciaCreate", "AsistenciaBatchCreate",
    "AsistenciaUpdate", "AsistenciaResponse", "AsistenciaListResponse",
    "AsistenciaResumen",
    "AsistenciaHistoricoJugador", "AsistenciaHistoricoResponse",
    # Usuario
    "RolUsuario", "RolEnEquipo",
    "OrganizacionBase", "OrganizacionCreate", "OrganizacionUpdate", "OrganizacionResponse",
    "EquipoBase", "EquipoCreate", "EquipoUpdate", "EquipoResponse", "EquipoListResponse",
    "UsuarioBase", "UsuarioCreate", "UsuarioUpdate", "UsuarioUpdateAdmin",
    "UsuarioResponse", "UsuarioListResponse",
    "UsuarioEquipoBase", "UsuarioEquipoCreate", "UsuarioEquipoResponse",
    "LoginRequest", "TokenResponse", "RefreshTokenRequest",
    # Jugador
    "PiernaDominante", "EstadoJugador", "Posicion",
    "JugadorBase", "JugadorCreate", "JugadorUpdate", "JugadorResponse",
    "JugadorListResponse", "JugadorFiltros", "JugadorInvitadoCreate",
    "PosicionResponse", "PosicionListResponse",
    # Partido y Rival
    "TipoCompeticion", "LocaliaPartido", "ResultadoPartido",
    "RivalBase", "RivalCreate", "RivalUpdate", "RivalResponse", "RivalListResponse",
    "PartidoBase", "PartidoCreate", "PartidoUpdate", "PartidoResponse",
    "PartidoListResponse", "PartidoFiltros",
    # Microciclo
    "EstadoMicrociclo",
    "MicrocicloBase", "MicrocicloCreate", "MicrocicloUpdate",
    "MicrocicloResponse", "MicrocicloListResponse",
    # RPE
    "RPEBase", "RPECreate", "RPEResponse", "RPEListResponse",
    # Convocatoria
    "ConvocatoriaBase", "ConvocatoriaCreate", "ConvocatoriaUpdate",
    "ConvocatoriaResponse", "ConvocatoriaListResponse",
    # Comunicacion
    "TipoConversacion", "TipoMensaje", "RolParticipante", "PrioridadNotificacion",
    "ConversacionBase", "ConversacionCreate", "ConversacionResponse",
    "MensajeBase", "MensajeCreate", "MensajeResponse",
    "ParticipanteResponse",
    "NotificacionBase", "NotificacionCreate", "NotificacionResponse", "NotificacionListResponse",
    # AI Chat
    "RolMensajeAI",
    "AIConversacionBase", "AIConversacionCreate", "AIConversacionResponse",
    "AIMensajeBase", "AIMensajeCreate", "AIMensajeResponse",
    "AIChatRequest", "AIChatResponse",
    # Knowledge Base
    "TipoDocumentoKB", "EstadoDocumentoKB",
    "DocumentoKBBase", "DocumentoKBCreate", "DocumentoKBResponse",
    "ChunkKBResponse", "KBSearchRequest", "KBSearchResult", "KBSearchResponse",
    # Suscripciones
    "TipoLicencia", "EstadoSuscripcion", "CicloSuscripcion", "AccionHistorial",
    "PlanResponse", "PlanListResponse",
    "SuscripcionResponse", "SuscripcionCreate", "SuscripcionUpdate", "SuscripcionUpgrade",
    "CheckoutSessionRequest", "CheckoutSessionResponse",
    "HistorialSuscripcionResponse", "HistorialListResponse", "UsageResponse",
    # Invitaciones
    "EstadoInvitacion", "EstadoTransferencia",
    "InvitacionCreate", "InvitacionResponse", "InvitacionListResponse",
    "InvitacionVerifyResponse", "InvitacionAcceptRequest",
    "TransferenciaCreate", "TransferenciaResponse",
    # GDPR
    "TipoConsentimiento", "TipoSolicitudGDPR", "EstadoSolicitudGDPR",
    "RelacionTutor", "MetodoConsentimiento",
    "VinculoTutorCreate", "VinculoTutorResponse", "VinculoTutorListResponse",
    "ConsentimientoCreate", "ConsentimientoResponse", "ConsentimientoListResponse",
    "ConsentimientoBulkCreate",
    "SolicitudGDPRCreate", "SolicitudGDPRResponse", "SolicitudGDPRListResponse",
    "SolicitudGDPRUpdateAdmin",
    "TutorVerifyResponse", "TutorAcceptRequest", "DataExportResponse",
    # Medico
    "TipoRegistroMedico", "EstadoRegistroMedico", "AccionMedica",
    "RegistroMedicoCreate", "RegistroMedicoUpdate", "RegistroMedicoResponse",
    "RegistroMedicoSummary", "RegistroMedicoListResponse",
    "AccesoMedicoLogResponse", "AccesoMedicoLogListResponse",
    "PermisosPersonalizadosCreate", "PermisosPersonalizadosResponse",
]
