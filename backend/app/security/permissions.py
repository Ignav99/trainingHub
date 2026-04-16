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
    VIDEO_TAG_CREATE = "video_tag.create"
    VIDEO_TAG_READ = "video_tag.read"
    VIDEO_TAG_DELETE = "video_tag.delete"

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

    # ABP (Set Pieces)
    ABP_CREATE = "abp.create"
    ABP_READ = "abp.read"
    ABP_UPDATE = "abp.update"
    ABP_DELETE = "abp.delete"

    # Nutrition
    NUTRITION_CREATE = "nutrition.create"
    NUTRITION_READ = "nutrition.read"
    NUTRITION_UPDATE = "nutrition.update"

    # Player/Tutor permissions
    PLAYER_VIEW_SHARED = "player.view_shared"
    PLAYER_SEND_RPE = "player.send_rpe"
    PLAYER_CHAT_STAFF = "player.chat_staff"
    PLAYER_VIEW_PROFILE = "player.view_profile"
    PLAYER_EDIT_BASIC = "player.edit_basic"
    PLAYER_VIEW_MEDICAL = "player.view_medical"
    TUTOR_REVOKE_ACCESS = "tutor.revoke_access"


# ============ Default Permissions by Team Role ============

# Full permissions shared by ALL coaching staff (CT) roles.
# Every CT member can create, read, update and delete everything.
_CT_FULL_PERMISSIONS = {
    # Sessions
    Permission.SESSION_CREATE, Permission.SESSION_READ,
    Permission.SESSION_UPDATE, Permission.SESSION_DELETE,
    # Tasks
    Permission.TASK_CREATE, Permission.TASK_READ,
    Permission.TASK_UPDATE, Permission.TASK_DELETE,
    # Microcycles
    Permission.MICROCICLO_CREATE, Permission.MICROCICLO_READ,
    Permission.MICROCICLO_UPDATE, Permission.MICROCICLO_DELETE,
    # Squad / Players
    Permission.PLANTILLA_READ, Permission.PLANTILLA_MANAGE,
    Permission.JUGADOR_UPDATE,
    # Medical
    Permission.MEDICAL_CREATE, Permission.MEDICAL_READ,
    Permission.MEDICAL_UPDATE, Permission.MEDICAL_READ_SUMMARY,
    # Matches / Rivals
    Permission.PARTIDO_CREATE, Permission.PARTIDO_READ,
    Permission.PARTIDO_UPDATE, Permission.PARTIDO_DELETE,
    Permission.RIVAL_CREATE, Permission.RIVAL_READ,
    Permission.RIVAL_UPDATE, Permission.RIVAL_DELETE,
    # Convocatorias
    Permission.CONVOCATORIA_CREATE, Permission.CONVOCATORIA_READ,
    Permission.CONVOCATORIA_UPDATE,
    # RPE / Wellness
    Permission.RPE_READ, Permission.RPE_CREATE,
    # Communication
    Permission.COMUNICACION_CREATE_GRUPO, Permission.COMUNICACION_SEND_MESSAGE,
    Permission.COMUNICACION_MSG_JUGADORES,
    # Video / Media
    Permission.VIDEO_UPLOAD, Permission.VIDEO_READ,
    Permission.VIDEO_TAG_CREATE, Permission.VIDEO_TAG_READ, Permission.VIDEO_TAG_DELETE,
    # Exports
    Permission.EXPORT_DATA,
    # AI / Knowledge Base
    Permission.AI_USE,
    Permission.KB_READ, Permission.KB_CREATE,
    Permission.KB_UPDATE, Permission.KB_DELETE,
    # ABP
    Permission.ABP_CREATE, Permission.ABP_READ,
    Permission.ABP_UPDATE, Permission.ABP_DELETE,
    # Nutrition
    Permission.NUTRITION_CREATE, Permission.NUTRITION_READ,
    Permission.NUTRITION_UPDATE,
    # Team config
    Permission.CONFIG_TEAM,
    Permission.INVITACION_MANAGE,
    Permission.TRANSFERIR_PROPIEDAD,
}

# Player read-only permissions (no create/update/delete on team data)
_PLAYER_READ_ONLY = {
    Permission.PLAYER_VIEW_SHARED,
    Permission.PLAYER_VIEW_PROFILE,
    Permission.PLAYER_VIEW_MEDICAL,
    Permission.PLAYER_CHAT_STAFF,
    Permission.PLAYER_SEND_RPE,
    Permission.SESSION_READ,
    Permission.PLANTILLA_READ,
    Permission.PARTIDO_READ,
    Permission.CONVOCATORIA_READ,
    Permission.RIVAL_READ,
    Permission.RPE_READ,
    Permission.VIDEO_READ,
    Permission.VIDEO_TAG_READ,
    Permission.ABP_READ,
}

DEFAULT_PERMISSIONS: dict[str, set[Permission]] = {
    # All CT roles get full permissions
    "entrenador_principal": set(_CT_FULL_PERMISSIONS),
    "segundo_entrenador":   set(_CT_FULL_PERMISSIONS),
    "preparador_fisico":    set(_CT_FULL_PERMISSIONS),
    "entrenador_porteros":  set(_CT_FULL_PERMISSIONS),
    "analista":             set(_CT_FULL_PERMISSIONS),
    "fisio":                set(_CT_FULL_PERMISSIONS),
    "delegado":             set(_CT_FULL_PERMISSIONS),

    # Players: read-only (+ nutrition read)
    "jugador": set(_PLAYER_READ_ONLY) | {Permission.NUTRITION_READ},

    # Tutors: same as player + revoke access
    "tutor": set(_PLAYER_READ_ONLY) | {Permission.TUTOR_REVOKE_ACCESS},
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
