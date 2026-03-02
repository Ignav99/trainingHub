"""
TrainingHub Pro - License Service
Business logic for subscription management, trial handling, and plan enforcement.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.database import get_supabase

logger = logging.getLogger(__name__)


class LicenseService:
    """High-level subscription management operations."""

    @staticmethod
    def create_trial_subscription(organizacion_id: str, plan_codigo: str = "free_trial") -> dict:
        """Create a new trial subscription for an organization."""
        supabase = get_supabase()

        # Get free trial plan
        plan = (
            supabase.table("planes")
            .select("*")
            .eq("codigo", plan_codigo)
            .single()
            .execute()
        )
        if not plan.data:
            logger.error(f"Plan {plan_codigo} not found")
            return {}

        trial_days = plan.data.get("dias_prueba", 14)
        now = datetime.now(timezone.utc)

        sub_data = {
            "organizacion_id": organizacion_id,
            "plan_id": plan.data["id"],
            "estado": "trial",
            "ciclo": "mensual",
            "fecha_inicio": now.isoformat(),
            "trial_fin": (now + timedelta(days=trial_days)).isoformat(),
            "uso_ai_calls_reset_at": now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat(),
        }

        result = supabase.table("suscripciones").insert(sub_data).execute()

        # Record in history
        supabase.table("historial_suscripciones").insert({
            "organizacion_id": organizacion_id,
            "plan_nuevo_id": plan.data["id"],
            "accion": "created",
            "motivo": "Registro nuevo - trial",
        }).execute()

        return result.data[0] if result.data else {}

    @staticmethod
    def activate_subscription(organizacion_id: str, plan_codigo: str, ciclo: str = "mensual") -> dict:
        """Activate a paid subscription (after Stripe payment)."""
        supabase = get_supabase()

        plan = supabase.table("planes").select("*").eq("codigo", plan_codigo).single().execute()
        if not plan.data:
            return {}

        now = datetime.now(timezone.utc)
        if ciclo == "anual":
            next_payment = now + timedelta(days=365)
        else:
            next_payment = now + timedelta(days=30)

        # Get current subscription
        current_sub = (
            supabase.table("suscripciones")
            .select("plan_id, estado")
            .eq("organizacion_id", organizacion_id)
            .single()
            .execute()
        )

        old_plan_id = current_sub.data["plan_id"] if current_sub.data else None

        result = supabase.table("suscripciones").update({
            "plan_id": plan.data["id"],
            "estado": "active",
            "ciclo": ciclo,
            "fecha_proximo_pago": next_payment.isoformat(),
            "trial_convertido": True if current_sub.data and current_sub.data.get("estado") == "trial" else False,
        }).eq("organizacion_id", organizacion_id).execute()

        # History
        supabase.table("historial_suscripciones").insert({
            "organizacion_id": organizacion_id,
            "plan_anterior_id": old_plan_id,
            "plan_nuevo_id": plan.data["id"],
            "accion": "upgraded" if old_plan_id != plan.data["id"] else "renewed",
        }).execute()

        return result.data[0] if result.data else {}

    @staticmethod
    def handle_payment_failed(organizacion_id: str) -> None:
        """Handle failed payment - move to past_due."""
        supabase = get_supabase()
        supabase.table("suscripciones").update({
            "estado": "past_due",
        }).eq("organizacion_id", organizacion_id).execute()

    @staticmethod
    def handle_grace_period(organizacion_id: str) -> None:
        """Move subscription to grace period (read-only, 30 days)."""
        supabase = get_supabase()
        now = datetime.now(timezone.utc)
        supabase.table("suscripciones").update({
            "estado": "grace_period",
            "fecha_gracia_fin": (now + timedelta(days=30)).isoformat(),
        }).eq("organizacion_id", organizacion_id).execute()

    @staticmethod
    def handle_suspension(organizacion_id: str) -> None:
        """Suspend subscription (no access except billing)."""
        supabase = get_supabase()
        supabase.table("suscripciones").update({
            "estado": "suspended",
        }).eq("organizacion_id", organizacion_id).execute()

        supabase.table("historial_suscripciones").insert({
            "organizacion_id": organizacion_id,
            "accion": "suspended",
            "motivo": "Pago no recibido tras periodo de gracia",
        }).execute()

    @staticmethod
    def reactivate_subscription(organizacion_id: str) -> dict:
        """Reactivate a suspended subscription after payment."""
        supabase = get_supabase()

        now = datetime.now(timezone.utc)
        result = supabase.table("suscripciones").update({
            "estado": "active",
            "fecha_proximo_pago": (now + timedelta(days=30)).isoformat(),
            "fecha_gracia_fin": None,
        }).eq("organizacion_id", organizacion_id).execute()

        supabase.table("historial_suscripciones").insert({
            "organizacion_id": organizacion_id,
            "accion": "reactivated",
        }).execute()

        return result.data[0] if result.data else {}

    @staticmethod
    def process_expired_trials() -> int:
        """
        Cron job: Process all expired trials.
        Returns count of processed trials.
        """
        supabase = get_supabase()
        now = datetime.now(timezone.utc)

        expired = (
            supabase.table("suscripciones")
            .select("id, organizacion_id, plan_id")
            .eq("estado", "trial")
            .lt("trial_fin", now.isoformat())
            .execute()
        )

        count = 0
        for sub in expired.data:
            try:
                supabase.table("suscripciones").update({
                    "estado": "cancelled",
                }).eq("id", sub["id"]).execute()

                supabase.table("historial_suscripciones").insert({
                    "organizacion_id": sub["organizacion_id"],
                    "plan_anterior_id": sub["plan_id"],
                    "accion": "cancelled",
                    "motivo": "Trial expirado sin conversion",
                }).execute()
                count += 1
            except Exception as e:
                logger.error(f"Error processing expired trial {sub['id']}: {e}")

        return count

    @staticmethod
    def process_grace_period_expirations() -> int:
        """
        Cron job: Suspend subscriptions whose grace period has ended.
        """
        supabase = get_supabase()
        now = datetime.now(timezone.utc)

        expired = (
            supabase.table("suscripciones")
            .select("id, organizacion_id")
            .eq("estado", "grace_period")
            .lt("fecha_gracia_fin", now.isoformat())
            .execute()
        )

        count = 0
        for sub in expired.data:
            try:
                LicenseService.handle_suspension(sub["organizacion_id"])
                count += 1
            except Exception as e:
                logger.error(f"Error suspending {sub['id']}: {e}")

        return count
