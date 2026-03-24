"""
TrainingHub Pro - License Checker
Validates subscription limits and feature gates.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.database import get_supabase

logger = logging.getLogger(__name__)


class LicenseChecker:
    """Validates organization usage against plan limits."""

    @staticmethod
    def get_subscription(organizacion_id: str) -> Optional[dict]:
        """Fetch subscription with plan details."""
        supabase = get_supabase()
        try:
            result = (
                supabase.table("suscripciones")
                .select("*, planes(*)")
                .eq("organizacion_id", organizacion_id)
                .single()
                .execute()
            )
            return result.data
        except Exception:
            return None

    @staticmethod
    def check_team_limit(organizacion_id: str) -> tuple[bool, str]:
        """Check if organization can create another team."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""  # No subscription = no limit

        plan = sub.get("planes", {})
        max_teams = plan.get("max_equipos", 1)
        current_teams = sub.get("uso_equipos", 0)

        if current_teams >= max_teams:
            return False, f"Limite de equipos alcanzado ({max_teams}). Actualice su plan."
        return True, ""

    @staticmethod
    def check_staff_limit(organizacion_id: str, equipo_id: str) -> tuple[bool, str]:
        """Check if team can add another staff member."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""

        plan = sub.get("planes", {})
        max_staff = plan.get("max_usuarios_por_equipo", 5)

        supabase = get_supabase()
        try:
            count_result = (
                supabase.table("usuarios_equipos")
                .select("id", count="exact")
                .eq("equipo_id", equipo_id)
                .execute()
            )
            current_staff = count_result.count or 0
            if current_staff >= max_staff:
                return False, f"Limite de miembros del cuerpo tecnico alcanzado ({max_staff}). Actualice su plan."
        except Exception:
            pass

        return True, ""

    @staticmethod
    def check_player_limit(organizacion_id: str, equipo_id: str) -> tuple[bool, str]:
        """Check if team can add another player."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""

        plan = sub.get("planes", {})
        max_players = plan.get("max_jugadores_por_equipo", 25)

        supabase = get_supabase()
        try:
            count_result = (
                supabase.table("jugadores")
                .select("id", count="exact")
                .eq("equipo_id", equipo_id)
                .execute()
            )
            current_players = count_result.count or 0
            if current_players >= max_players:
                return False, f"Limite de jugadores alcanzado ({max_players}). Actualice su plan."
        except Exception:
            pass

        return True, ""

    @staticmethod
    def check_storage_limit(organizacion_id: str, additional_mb: float = 0) -> tuple[bool, str]:
        """Check if organization has storage space."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""

        plan = sub.get("planes", {})
        max_storage = plan.get("max_storage_mb", 500)
        current_storage = sub.get("uso_storage_mb", 0)

        if current_storage + additional_mb > max_storage:
            return False, f"Limite de almacenamiento alcanzado ({max_storage} MB). Actualice su plan."
        return True, ""

    @staticmethod
    def check_ai_calls_limit(organizacion_id: str) -> tuple[bool, str]:
        """Check if organization has AI calls remaining.

        Gemini provider is essentially free, so skip limit check when using it.
        Also treats max_ai_calls_month <= 0 as unlimited.
        """
        from app.config import get_settings
        settings = get_settings()

        # Gemini is ~97% cheaper — don't enforce limits
        if getattr(settings, 'AI_PROVIDER', 'gemini').lower() == 'gemini':
            return True, ""

        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""

        plan = sub.get("planes", {})
        max_calls = plan.get("max_ai_calls_month", 50)

        # -1 or 0 means unlimited
        if max_calls <= 0:
            return True, ""

        current_calls = sub.get("uso_ai_calls_month", 0)

        # Check if we need to reset the counter
        reset_at = sub.get("uso_ai_calls_reset_at")
        if reset_at:
            from datetime import datetime, timezone
            reset_dt = datetime.fromisoformat(reset_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > reset_dt:
                # Reset counter
                supabase = get_supabase()
                try:
                    next_reset = datetime.now(timezone.utc).replace(
                        day=1, hour=0, minute=0, second=0, microsecond=0
                    )
                    if next_reset <= datetime.now(timezone.utc):
                        next_month = next_reset.month + 1
                        next_year = next_reset.year
                        if next_month > 12:
                            next_month = 1
                            next_year += 1
                        next_reset = next_reset.replace(month=next_month, year=next_year)

                    supabase.table("suscripciones").update({
                        "uso_ai_calls_month": 0,
                        "uso_ai_calls_reset_at": next_reset.isoformat(),
                    }).eq("organizacion_id", organizacion_id).execute()
                    current_calls = 0
                except Exception:
                    pass

        if current_calls >= max_calls:
            return False, f"Limite de llamadas AI alcanzado ({max_calls}/mes). Actualice su plan."
        return True, ""

    @staticmethod
    def check_kb_documents_limit(organizacion_id: str) -> tuple[bool, str]:
        """Check if organization can add more KB documents."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, ""

        plan = sub.get("planes", {})
        max_docs = plan.get("max_kb_documents", 10)

        supabase = get_supabase()
        try:
            count_result = (
                supabase.table("documentos_kb")
                .select("id", count="exact")
                .eq("organizacion_id", organizacion_id)
                .execute()
            )
            current_docs = count_result.count or 0
            if current_docs >= max_docs:
                return False, f"Limite de documentos KB alcanzado ({max_docs}). Actualice su plan."
        except Exception:
            pass

        return True, ""

    @staticmethod
    def increment_ai_calls(organizacion_id: str) -> None:
        """Increment AI call usage counter."""
        supabase = get_supabase()
        try:
            sub = LicenseChecker.get_subscription(organizacion_id)
            if sub:
                current = sub.get("uso_ai_calls_month", 0)
                supabase.table("suscripciones").update({
                    "uso_ai_calls_month": current + 1,
                }).eq("organizacion_id", organizacion_id).execute()
        except Exception as e:
            logger.error(f"Error incrementing AI calls: {e}")

    @staticmethod
    def increment_storage(organizacion_id: str, additional_mb: float) -> None:
        """Increment storage usage."""
        supabase = get_supabase()
        try:
            sub = LicenseChecker.get_subscription(organizacion_id)
            if sub:
                current = sub.get("uso_storage_mb", 0)
                supabase.table("suscripciones").update({
                    "uso_storage_mb": current + additional_mb,
                }).eq("organizacion_id", organizacion_id).execute()
        except Exception as e:
            logger.error(f"Error incrementing storage: {e}")

    @staticmethod
    def has_feature(organizacion_id: str, feature: str) -> bool:
        """Check if organization's plan includes a specific feature."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return False
        plan = sub.get("planes", {})
        features = plan.get("features", {})
        return features.get(feature, False)

    @staticmethod
    def check_trial_expiry(organizacion_id: str) -> tuple[bool, Optional[int]]:
        """Check if trial is still valid. Returns (is_valid, days_remaining)."""
        sub = LicenseChecker.get_subscription(organizacion_id)
        if not sub:
            return True, None

        if sub.get("estado") != "trial":
            return True, None

        trial_fin = sub.get("trial_fin")
        if not trial_fin:
            return True, None

        trial_end = datetime.fromisoformat(trial_fin.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        remaining = (trial_end - now).days

        if remaining < 0:
            # Trial expired - update status
            supabase = get_supabase()
            try:
                supabase.table("suscripciones").update({
                    "estado": "cancelled",
                }).eq("organizacion_id", organizacion_id).eq("estado", "trial").execute()

                supabase.table("historial_suscripciones").insert({
                    "organizacion_id": organizacion_id,
                    "plan_anterior_id": sub.get("plan_id"),
                    "accion": "cancelled",
                    "motivo": "Trial expirado sin conversion",
                }).execute()
            except Exception as e:
                logger.error(f"Error expiring trial: {e}")
            return False, 0

        return True, remaining
