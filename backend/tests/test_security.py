"""
Tests for the security module: permissions, license checking, encryption.
"""

import pytest
from datetime import date, datetime, timezone
from uuid import uuid4


# ============ Permission Tests ============

class TestPermissions:
    """Tests for the Permission enum and default permission matrix."""

    def test_permission_enum_values(self):
        from app.security.permissions import Permission

        assert Permission.SESSION_CREATE.value == "session.create"
        assert Permission.MEDICAL_READ.value == "medical.read"
        assert Permission.AI_USE.value == "ai.use"
        assert Permission.CLUB_MANAGE_BILLING.value == "club.manage_billing"

    def test_default_permissions_all_roles_defined(self):
        from app.security.permissions import DEFAULT_PERMISSIONS

        expected_roles = {
            "entrenador_principal", "segundo_entrenador", "preparador_fisico",
            "entrenador_porteros", "analista", "fisio", "delegado",
            "jugador", "tutor",
        }
        assert expected_roles == set(DEFAULT_PERMISSIONS.keys())

    def test_entrenador_principal_has_all_core_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["entrenador_principal"]
        assert Permission.SESSION_CREATE in perms
        assert Permission.SESSION_DELETE in perms
        assert Permission.TASK_CREATE in perms
        assert Permission.PLANTILLA_MANAGE in perms
        assert Permission.CONFIG_TEAM in perms
        assert Permission.INVITACION_MANAGE in perms
        assert Permission.TRANSFERIR_PROPIEDAD in perms
        assert Permission.AI_USE in perms

    def test_fisio_has_medical_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["fisio"]
        assert Permission.MEDICAL_CREATE in perms
        assert Permission.MEDICAL_READ in perms
        assert Permission.MEDICAL_UPDATE in perms
        # Fisio should NOT have session create
        assert Permission.SESSION_CREATE not in perms
        # Fisio should NOT have AI
        assert Permission.AI_USE not in perms

    def test_delegado_has_match_and_convocatoria_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["delegado"]
        assert Permission.PARTIDO_CREATE in perms
        assert Permission.CONVOCATORIA_CREATE in perms
        assert Permission.COMUNICACION_MSG_JUGADORES in perms
        # Delegado should NOT have session create
        assert Permission.SESSION_CREATE not in perms

    def test_analista_has_rival_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["analista"]
        assert Permission.RIVAL_CREATE in perms
        assert Permission.RIVAL_DELETE in perms
        assert Permission.VIDEO_UPLOAD in perms
        # Analista should NOT have medical
        assert Permission.MEDICAL_READ not in perms

    def test_segundo_entrenador_no_transferencia(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["segundo_entrenador"]
        assert Permission.TRANSFERIR_PROPIEDAD not in perms
        assert Permission.CONFIG_TEAM not in perms

    def test_jugador_has_player_permissions(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["jugador"]
        assert Permission.PLAYER_VIEW_SHARED in perms
        assert Permission.PLAYER_SEND_RPE in perms
        assert Permission.PLAYER_CHAT_STAFF in perms
        # Jugador should NOT have staff permissions
        assert Permission.SESSION_CREATE not in perms

    def test_tutor_has_revoke_access(self):
        from app.security.permissions import DEFAULT_PERMISSIONS, Permission

        perms = DEFAULT_PERMISSIONS["tutor"]
        assert Permission.TUTOR_REVOKE_ACCESS in perms
        assert Permission.PLAYER_VIEW_SHARED in perms

    def test_club_role_permissions(self):
        from app.security.permissions import CLUB_ROLE_PERMISSIONS, Permission

        presidente = CLUB_ROLE_PERMISSIONS["presidente"]
        assert Permission.CLUB_VIEW_ALL_TEAMS in presidente
        assert Permission.CLUB_MANAGE_BILLING in presidente
        assert Permission.CLUB_MANAGE_ORG in presidente

        director = CLUB_ROLE_PERMISSIONS["director_deportivo"]
        assert Permission.CLUB_MANAGE_BILLING not in director
        assert Permission.CLUB_MANAGE_TEAMS in director

        secretario = CLUB_ROLE_PERMISSIONS["secretario"]
        assert Permission.CLUB_VIEW_AUDIT in secretario
        assert Permission.CLUB_MANAGE_TEAMS not in secretario


# ============ Encryption Tests ============

class TestEncryption:
    """Tests for AES-256-GCM encryption of medical data."""

    def test_encrypt_decrypt_roundtrip(self):
        from app.security.encryption import encrypt_field, decrypt_field

        plaintext = "Diagnostico: Rotura de ligamento cruzado anterior"
        encrypted = encrypt_field(plaintext)

        assert encrypted is not None
        assert encrypted != plaintext
        assert len(encrypted) > len(plaintext)

        decrypted = decrypt_field(encrypted)
        assert decrypted == plaintext

    def test_encrypt_none_returns_none(self):
        from app.security.encryption import encrypt_field, decrypt_field

        assert encrypt_field(None) is None
        assert decrypt_field(None) is None

    def test_encrypt_empty_string(self):
        from app.security.encryption import encrypt_field, decrypt_field

        encrypted = encrypt_field("")
        decrypted = decrypt_field(encrypted)
        assert decrypted == ""

    def test_encrypt_unicode(self):
        from app.security.encryption import encrypt_field, decrypt_field

        plaintext = "Diagnostico: Lesion en el musculo del gluteo mayor"
        encrypted = encrypt_field(plaintext)
        decrypted = decrypt_field(encrypted)
        assert decrypted == plaintext

    def test_different_encryptions_are_different(self):
        """Each encryption should produce a unique result due to random nonce."""
        from app.security.encryption import encrypt_field

        plaintext = "Same text"
        enc1 = encrypt_field(plaintext)
        enc2 = encrypt_field(plaintext)
        assert enc1 != enc2  # Random nonce makes each unique

    def test_generate_key(self):
        from app.security.encryption import generate_encryption_key
        import base64

        key_b64 = generate_encryption_key()
        key_bytes = base64.b64decode(key_b64)
        assert len(key_bytes) == 32  # 256 bits


# ============ Model Tests ============

class TestNewModels:
    """Tests for new Pydantic models."""

    def test_plan_response(self):
        from app.models.suscripcion import PlanResponse

        plan = PlanResponse(
            id=uuid4(),
            codigo="equipo_basico",
            nombre="Equipo Basico",
            tipo_licencia="equipo",
            max_equipos=1,
            max_usuarios_por_equipo=5,
            max_jugadores_por_equipo=30,
            max_storage_mb=500,
            max_ai_calls_month=30,
            max_kb_documents=10,
            features={"video_enabled": False},
            precio_mensual_cents=999,
            precio_anual_cents=9990,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert plan.codigo == "equipo_basico"
        assert plan.precio_mensual_cents == 999

    def test_suscripcion_response(self):
        from app.models.suscripcion import SuscripcionResponse

        sub = SuscripcionResponse(
            id=uuid4(),
            organizacion_id=uuid4(),
            plan_id=uuid4(),
            estado="trial",
            ciclo="mensual",
            fecha_inicio=datetime.now(),
            trial_fin=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert sub.estado == "trial"

    def test_invitacion_create(self):
        from app.models.invitacion import InvitacionCreate

        invite = InvitacionCreate(
            email="test@example.com",
            nombre="Test User",
            equipo_id=uuid4(),
            rol_en_equipo="segundo_entrenador",
        )
        assert invite.email == "test@example.com"
        assert invite.es_invitacion_tutor is False

    def test_invitacion_tutor_create(self):
        from app.models.invitacion import InvitacionCreate

        invite = InvitacionCreate(
            email="padre@example.com",
            nombre="Padre Garcia",
            es_invitacion_tutor=True,
            jugador_id=uuid4(),
        )
        assert invite.es_invitacion_tutor is True
        assert invite.jugador_id is not None

    def test_registro_medico_create(self):
        from app.models.medico import RegistroMedicoCreate

        registro = RegistroMedicoCreate(
            jugador_id=uuid4(),
            equipo_id=uuid4(),
            tipo="lesion",
            titulo="Esguince tobillo derecho",
            diagnostico="Esguince grado II",
            tratamiento="Reposo + fisioterapia",
            fecha_inicio=date.today(),
            dias_baja_estimados=21,
        )
        assert registro.tipo == "lesion"
        assert registro.solo_medico is True

    def test_consentimiento_create(self):
        from app.models.gdpr import ConsentimientoCreate, TipoConsentimiento

        consent = ConsentimientoCreate(
            tipo=TipoConsentimiento.TERMINOS_SERVICIO,
            version="1.0",
            otorgado=True,
        )
        assert consent.otorgado is True

    def test_solicitud_gdpr_create(self):
        from app.models.gdpr import SolicitudGDPRCreate, TipoSolicitudGDPR

        solicitud = SolicitudGDPRCreate(
            tipo=TipoSolicitudGDPR.ACCESO,
            descripcion="Quiero acceder a todos mis datos",
        )
        assert solicitud.tipo == TipoSolicitudGDPR.ACCESO

    def test_vinculo_tutor_create(self):
        from app.models.gdpr import VinculoTutorCreate, RelacionTutor

        vinculo = VinculoTutorCreate(
            jugador_id=uuid4(),
            relacion=RelacionTutor.PADRE,
        )
        assert vinculo.relacion == RelacionTutor.PADRE

    def test_usage_response(self):
        from app.models.suscripcion import UsageResponse

        usage = UsageResponse(
            equipos=1,
            max_equipos=5,
            storage_mb=100,
            max_storage_mb=5120,
            ai_calls_month=15,
            max_ai_calls_month=100,
        )
        assert usage.equipos < usage.max_equipos

    def test_permisos_personalizados(self):
        from app.models.medico import PermisosPersonalizadosCreate

        perms = PermisosPersonalizadosCreate(
            equipo_id=uuid4(),
            rol_en_equipo="segundo_entrenador",
            puede_crear_sesiones=True,
            puede_eliminar_sesiones=False,
            puede_usar_ai=True,
        )
        assert perms.puede_crear_sesiones is True
        assert perms.puede_eliminar_sesiones is False


# ============ Role Enum Tests ============

class TestExpandedRoles:
    """Tests for expanded role enums."""

    def test_rol_usuario_all_values(self):
        from app.models.usuario import RolUsuario

        expected = {
            "superadmin_plataforma", "admin",
            "tecnico_principal", "tecnico_asistente", "visualizador",
            "presidente", "director_deportivo", "secretario",
            "entrenador_principal", "segundo_entrenador", "preparador_fisico",
            "entrenador_porteros", "analista", "fisio", "delegado",
            "jugador", "tutor",
        }
        actual = {r.value for r in RolUsuario}
        assert expected == actual

    def test_rol_en_equipo_all_values(self):
        from app.models.usuario import RolEnEquipo

        expected = {
            "entrenador_principal", "segundo_entrenador", "preparador_fisico",
            "entrenador_porteros", "analista", "fisio", "delegado", "jugador",
        }
        actual = {r.value for r in RolEnEquipo}
        assert expected == actual

    def test_backwards_compat_admin_role(self):
        from app.models.usuario import RolUsuario

        assert RolUsuario.ADMIN.value == "admin"
        assert RolUsuario.TECNICO_PRINCIPAL.value == "tecnico_principal"

    def test_usuario_response_new_fields(self):
        from app.models.usuario import UsuarioResponse

        user = UsuarioResponse(
            id=uuid4(),
            email="test@example.com",
            nombre="Test",
            rol="entrenador_principal",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            es_menor=False,
            mfa_enabled=False,
            gdpr_consentimiento=True,
        )
        assert user.es_menor is False
        assert user.gdpr_consentimiento is True

    def test_organizacion_response_new_fields(self):
        from app.models.usuario import OrganizacionResponse

        org = OrganizacionResponse(
            id=uuid4(),
            nombre="Test Club",
            tipo_licencia="club",
            owner_id=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        assert org.tipo_licencia == "club"
        assert org.owner_id is not None


# ============ AuthContext Tests ============

class TestAuthContext:
    """Tests for the AuthContext dataclass."""

    def test_auth_context_creation(self):
        from app.security.dependencies import AuthContext
        from app.security.permissions import Permission

        ctx = AuthContext(
            user=None,  # Simplified for testing
            user_id="user-123",
            organizacion_id="org-456",
            equipo_id="team-789",
            rol_en_equipo="entrenador_principal",
            permissions={Permission.SESSION_CREATE, Permission.SESSION_READ},
            subscription_status="active",
        )
        assert ctx.user_id == "user-123"
        assert Permission.SESSION_CREATE in ctx.permissions
        assert ctx.is_read_only is False

    def test_auth_context_read_only(self):
        from app.security.dependencies import AuthContext

        ctx = AuthContext(
            user=None,
            user_id="user-123",
            organizacion_id="org-456",
            is_read_only=True,
        )
        assert ctx.is_read_only is True


# ============ Custom Permissions Override Tests ============

class TestCustomPermissionOverrides:
    """Tests for the permission override logic."""

    def test_apply_custom_permissions_grant(self):
        from app.security.dependencies import _apply_custom_permissions
        from app.security.permissions import Permission

        effective = {Permission.SESSION_READ}
        custom = {
            "puede_crear_sesiones": True,
            "puede_editar_sesiones": True,
        }
        _apply_custom_permissions(effective, custom)

        assert Permission.SESSION_CREATE in effective
        assert Permission.SESSION_UPDATE in effective

    def test_apply_custom_permissions_revoke(self):
        from app.security.dependencies import _apply_custom_permissions
        from app.security.permissions import Permission

        effective = {Permission.SESSION_CREATE, Permission.SESSION_READ, Permission.AI_USE}
        custom = {
            "puede_crear_sesiones": False,
            "puede_usar_ai": False,
        }
        _apply_custom_permissions(effective, custom)

        assert Permission.SESSION_CREATE not in effective
        assert Permission.AI_USE not in effective
        assert Permission.SESSION_READ in effective  # Not affected

    def test_apply_custom_permissions_none_no_change(self):
        from app.security.dependencies import _apply_custom_permissions
        from app.security.permissions import Permission

        effective = {Permission.SESSION_CREATE, Permission.SESSION_READ}
        custom = {
            "puede_crear_sesiones": None,  # No override
            "puede_editar_sesiones": None,
        }
        _apply_custom_permissions(effective, custom)

        assert Permission.SESSION_CREATE in effective  # Unchanged
        assert Permission.SESSION_READ in effective
