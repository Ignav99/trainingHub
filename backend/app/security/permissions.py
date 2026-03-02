"""
TrainingHub Pro - Permission Enum and Default Permission Matrix
Defines all granular permissions and the default set per team role.
"""

from enum import Enum


class Permission(str, Enum):
    """All granular permissions in the system."""

    # Sessions
    SESSION_CREATE = "session.create"
    SESSION_READ = "session.read"
    SESSION_UPDATE = "session.update"
    SESSION_DELETE = "session.delete"

    # Tasks
    TASK_CREATE = "task.create"
    TASK_READ = "task.read"
    TASK_UPDATE = "task.update"
    TASK_DELETE = "task.delete"

    # Microcycles
    MICROCICLO_CREATE = "microciclo.create"
    MICROCICLO_READ = "microciclo.read"
    MICROCICLO_UPDATE = "microciclo.update"
    MICROCICLO_DELETE = "microciclo.delete"

    # Squad / Players
    PLANTILLA_READ = "plantilla.read"
    PLANTILLA_MANAGE = "plantilla.manage"  # alta/baja jugadores
    JUGADOR_UPDATE = "jugador.update"

    # Medical
    MEDICAL_CREATE = "medical.create"
    MEDICAL_READ = "medical.read"
    MEDICAL_UPDATE = "medical.update"
    MEDICAL_READ_SUMMARY = "medical.read_summary"  # limited view for entrenador_principal

    # Matches / Rivals
    PARTIDO_CREATE = "partido.create"
    PARTIDO_READ = "partido.read"
    PARTIDO_UPDATE = "partido.update"
    PARTIDO_DELETE = "partido.delete"
    RIVAL_CREATE = "rival.create"
    RIVAL_READ = "rival.read"
    RIVAL_UPDATE = "rival.update"
    RIVAL_DELETE = "rival.delete"

    # Convocatorias
    CONVOCATORIA_CREATE = "convocatoria.create"
    CONVOCATORIA_READ = "convocatoria.read"
    CONVOCATORIA_UPDATE = "convocatoria.update"

    # RPE / Wellness
    RPE_READ = "rpe.read"
    RPE_CREATE = "rpe.create"

    # Communication
    COMUNICACION_CREATE_GRUPO = "comunicacion.create_grupo"
    COMUNICACION_SEND_MESSAGE = "comunicacion.send_message"
    COMUNICACION_MSG_JUGADORES = "comunicacion.msg_jugadores"

    # Video / Media
    VIDEO_UPLOAD = "video.upload"
    VIDEO_READ = "video.read"

    # Exports
    EXPORT_DATA = "export.data"

    # AI
    AI_USE = "ai.use"
    KB_READ = "kb.read"
    KB_CREATE = "kb.create"
    KB_UPDATE = "kb.update"
    KB_DELETE = "kb.delete"

    # Team config
    CONFIG_TEAM = "config.team"
    INVITACION_MANAGE = "invitacion.manage"
    TRANSFERIR_PROPIEDAD = "transferir.propiedad"

    # Club-level permissions
    CLUB_VIEW_ALL_TEAMS = "club.view_all_teams"
    CLUB_EDIT_CROSS_TEAM = "club.edit_cross_team"
    CLUB_MANAGE_BILLING = "club.manage_billing"
    CLUB_INVITE_USERS = "club.invite_users"
    CLUB_MANAGE_TEAMS = "club.manage_teams"
    CLUB_VIEW_STATS = "club.view_stats"
    CLUB_MANAGE_ORG = "club.manage_org"
    CLUB_VIEW_AUDIT = "club.view_audit"

    # Player/Tutor permissions
    PLAYER_VIEW_SHARED = "player.view_shared"
    PLAYER_SEND_RPE = "player.send_rpe"
    PLAYER_CHAT_STAFF = "player.chat_staff"
    PLAYER_VIEW_PROFILE = "player.view_profile"
    PLAYER_EDIT_BASIC = "player.edit_basic"
    PLAYER_VIEW_MEDICAL = "player.view_medical"
    TUTOR_REVOKE_ACCESS = "tutor.revoke_access"


# ============ Default Permissions by Team Role ============

_ALL_STAFF_READ = {
    Permission.SESSION_READ,
    Permission.PLANTILLA_READ,
    Permission.RPE_READ,
    Permission.CONVOCATORIA_READ,
    Permission.PARTIDO_READ,
    Permission.RIVAL_READ,
    Permission.VIDEO_READ,
    Permission.COMUNICACION_SEND_MESSAGE,
}

DEFAULT_PERMISSIONS: dict[str, set[Permission]] = {
    "entrenador_principal": {
        # Full CRUD on everything
        Permission.SESSION_CREATE, Permission.SESSION_READ,
        Permission.SESSION_UPDATE, Permission.SESSION_DELETE,
        Permission.TASK_CREATE, Permission.TASK_READ,
        Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.MICROCICLO_CREATE, Permission.MICROCICLO_READ,
        Permission.MICROCICLO_UPDATE, Permission.MICROCICLO_DELETE,
        Permission.PLANTILLA_READ, Permission.PLANTILLA_MANAGE,
        Permission.JUGADOR_UPDATE,
        Permission.MEDICAL_READ_SUMMARY,
        Permission.PARTIDO_CREATE, Permission.PARTIDO_READ,
        Permission.PARTIDO_UPDATE, Permission.PARTIDO_DELETE,
        Permission.RIVAL_CREATE, Permission.RIVAL_READ,
        Permission.RIVAL_UPDATE, Permission.RIVAL_DELETE,
        Permission.CONVOCATORIA_CREATE, Permission.CONVOCATORIA_READ,
        Permission.CONVOCATORIA_UPDATE,
        Permission.RPE_READ, Permission.RPE_CREATE,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.COMUNICACION_MSG_JUGADORES,
        Permission.VIDEO_UPLOAD, Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
        Permission.AI_USE,
        Permission.KB_READ, Permission.KB_CREATE,
        Permission.KB_UPDATE, Permission.KB_DELETE,
        Permission.CONFIG_TEAM,
        Permission.INVITACION_MANAGE,
        Permission.TRANSFERIR_PROPIEDAD,
    },

    "segundo_entrenador": {
        # CRU on most things (configurable), delete on own creations
        Permission.SESSION_CREATE, Permission.SESSION_READ,
        Permission.SESSION_UPDATE, Permission.SESSION_DELETE,
        Permission.TASK_CREATE, Permission.TASK_READ,
        Permission.TASK_UPDATE, Permission.TASK_DELETE,
        Permission.MICROCICLO_CREATE, Permission.MICROCICLO_READ,
        Permission.MICROCICLO_UPDATE,
        Permission.PLANTILLA_READ,
        Permission.JUGADOR_UPDATE,
        Permission.PARTIDO_CREATE, Permission.PARTIDO_READ,
        Permission.PARTIDO_UPDATE,
        Permission.RIVAL_CREATE, Permission.RIVAL_READ,
        Permission.RIVAL_UPDATE,
        Permission.CONVOCATORIA_CREATE, Permission.CONVOCATORIA_READ,
        Permission.CONVOCATORIA_UPDATE,
        Permission.RPE_READ, Permission.RPE_CREATE,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.COMUNICACION_MSG_JUGADORES,
        Permission.VIDEO_UPLOAD, Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
        Permission.AI_USE,
        Permission.KB_READ, Permission.KB_CREATE, Permission.KB_UPDATE,
    },

    "preparador_fisico": {
        # Physical focus: sessions (physical), tasks (physical), medical read
        Permission.SESSION_CREATE, Permission.SESSION_READ,
        Permission.SESSION_UPDATE,
        Permission.TASK_CREATE, Permission.TASK_READ,
        Permission.MICROCICLO_READ,
        Permission.PLANTILLA_READ,
        Permission.JUGADOR_UPDATE,  # physical attributes
        Permission.MEDICAL_READ,  # physical-related medical data
        Permission.PARTIDO_READ,
        Permission.RIVAL_READ,
        Permission.CONVOCATORIA_READ,
        Permission.RPE_READ, Permission.RPE_CREATE,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
        Permission.AI_USE,
        Permission.KB_READ,
    },

    "entrenador_porteros": {
        # Goalkeeper focus
        Permission.SESSION_CREATE, Permission.SESSION_READ,
        Permission.SESSION_UPDATE,
        Permission.TASK_CREATE, Permission.TASK_READ,
        Permission.MICROCICLO_READ,
        Permission.PLANTILLA_READ,
        Permission.JUGADOR_UPDATE,  # goalkeeper attributes
        Permission.PARTIDO_READ,
        Permission.RIVAL_READ,
        Permission.CONVOCATORIA_READ,
        Permission.RPE_READ, Permission.RPE_CREATE,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
        Permission.AI_USE,
        Permission.KB_READ,
    },

    "analista": {
        # Analysis focus: rivals, video, read everything
        Permission.SESSION_READ,
        Permission.TASK_READ,
        Permission.MICROCICLO_READ,
        Permission.PLANTILLA_READ,
        Permission.PARTIDO_READ,
        Permission.RIVAL_CREATE, Permission.RIVAL_READ,
        Permission.RIVAL_UPDATE, Permission.RIVAL_DELETE,
        Permission.CONVOCATORIA_READ,
        Permission.RPE_READ,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.VIDEO_UPLOAD, Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
        Permission.AI_USE,
        Permission.KB_READ,
    },

    "fisio": {
        # Medical full CRUD, limited view on other areas
        Permission.SESSION_READ,
        Permission.PLANTILLA_READ,
        Permission.MEDICAL_CREATE, Permission.MEDICAL_READ,
        Permission.MEDICAL_UPDATE,
        Permission.PARTIDO_READ,
        Permission.CONVOCATORIA_READ,
        Permission.RPE_READ,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
    },

    "delegado": {
        # Administrative: matches, convocatorias, communication
        Permission.SESSION_READ,
        Permission.PLANTILLA_READ,
        Permission.PARTIDO_CREATE, Permission.PARTIDO_READ,
        Permission.PARTIDO_UPDATE,
        Permission.RIVAL_READ,
        Permission.CONVOCATORIA_CREATE, Permission.CONVOCATORIA_READ,
        Permission.CONVOCATORIA_UPDATE,
        Permission.RPE_READ,
        Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
        Permission.COMUNICACION_MSG_JUGADORES,
        Permission.VIDEO_READ,
        Permission.EXPORT_DATA,
    },

    "jugador": {
        Permission.PLAYER_VIEW_SHARED,
        Permission.PLAYER_SEND_RPE,
        Permission.PLAYER_CHAT_STAFF,
        Permission.PLAYER_VIEW_PROFILE,
        Permission.PLAYER_EDIT_BASIC,
        Permission.PLAYER_VIEW_MEDICAL,
    },

    "tutor": {
        Permission.PLAYER_VIEW_SHARED,
        Permission.PLAYER_SEND_RPE,
        Permission.PLAYER_CHAT_STAFF,
        Permission.PLAYER_VIEW_PROFILE,
        Permission.PLAYER_EDIT_BASIC,
        Permission.PLAYER_VIEW_MEDICAL,
        Permission.TUTOR_REVOKE_ACCESS,
    },
}

# ============ Club Role Permissions ============

CLUB_ROLE_PERMISSIONS: dict[str, set[Permission]] = {
    "presidente": {
        Permission.CLUB_VIEW_ALL_TEAMS,
        Permission.CLUB_EDIT_CROSS_TEAM,
        Permission.CLUB_MANAGE_BILLING,
        Permission.CLUB_INVITE_USERS,
        Permission.CLUB_MANAGE_TEAMS,
        Permission.CLUB_VIEW_STATS,
        Permission.CLUB_MANAGE_ORG,
        Permission.CLUB_VIEW_AUDIT,
    },
    "director_deportivo": {
        Permission.CLUB_VIEW_ALL_TEAMS,
        Permission.CLUB_INVITE_USERS,
        Permission.CLUB_MANAGE_TEAMS,
        Permission.CLUB_VIEW_STATS,
    },
    "secretario": {
        Permission.CLUB_VIEW_ALL_TEAMS,
        Permission.CLUB_INVITE_USERS,
        Permission.CLUB_VIEW_STATS,
        Permission.CLUB_MANAGE_ORG,
        Permission.CLUB_VIEW_AUDIT,
    },
}

# ============ Feature Flags mapped to plan features ============

FEATURE_PERMISSIONS: dict[str, str] = {
    "video": "video_enabled",
    "rival_analysis": "rival_analysis_enabled",
    "rfef": "rfef_enabled",
    "medical": "medical_enabled",
    "branding": "branding_enabled",
    "advanced_stats": "advanced_stats_enabled",
}
