"""
TrainingHub Pro - Stripe Webhook Handler
Procesa eventos de Stripe para gestionar el ciclo de vida de suscripciones.
"""

import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.config import get_settings
from app.services.license_service import LicenseService
from app.services.audit_service import log_action

logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Cron Jobs ============

@router.post("/cron/process-expirations")
async def process_expirations(request: Request):
    """
    Cron endpoint para procesar trials expirados y periodos de gracia.
    Protegido por SECRET_KEY en header X-Cron-Secret.
    Configurar en Render cron o llamar externamente cada hora.
    """
    settings = get_settings()
    cron_secret = request.headers.get("x-cron-secret")
    if cron_secret != settings.SECRET_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid cron secret")

    trials = LicenseService.process_expired_trials()
    grace = LicenseService.process_grace_period_expirations()

    logger.info(f"Cron: {trials} trials expired, {grace} grace periods suspended")
    return {"trials_expired": trials, "grace_suspended": grace}


# ============ Stripe Webhook ============

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Procesa webhooks de Stripe.
    Eventos manejados:
    - checkout.session.completed: activar suscripcion tras pago
    - invoice.payment_succeeded: renovar suscripcion
    - invoice.payment_failed: marcar como past_due
    - customer.subscription.deleted: cancelar suscripcion
    """
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe not configured",
        )

    # Verify webhook signature
    try:
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ImportError:
        logger.error("stripe package not installed")
        raise HTTPException(status_code=500, detail="Stripe SDK not available")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            _handle_checkout_completed(data)

        elif event_type == "invoice.payment_succeeded":
            _handle_payment_succeeded(data)

        elif event_type == "invoice.payment_failed":
            _handle_payment_failed(data)

        elif event_type == "customer.subscription.deleted":
            _handle_subscription_deleted(data)

        elif event_type == "customer.subscription.updated":
            _handle_subscription_updated(data)

    except Exception as e:
        logger.error(f"Error processing {event_type}: {e}")
        # Return 200 to avoid Stripe retries on business logic errors
        return {"status": "error", "detail": str(e)}

    return {"status": "ok", "event": event_type}


def _get_org_id_from_metadata(data: dict) -> str | None:
    """Extract organizacion_id from Stripe metadata."""
    metadata = data.get("metadata", {})
    return metadata.get("organizacion_id")


def _handle_checkout_completed(data: dict):
    """Checkout completado - activar suscripcion."""
    org_id = _get_org_id_from_metadata(data)
    if not org_id:
        logger.warning("checkout.session.completed without organizacion_id in metadata")
        return

    plan_codigo = data.get("metadata", {}).get("plan_codigo", "pro")
    ciclo = data.get("metadata", {}).get("ciclo", "mensual")

    LicenseService.activate_subscription(org_id, plan_codigo, ciclo)

    log_action(
        usuario_id="system",
        accion="activar_suscripcion",
        entidad_tipo="suscripcion",
        datos_nuevos={"plan": plan_codigo, "ciclo": ciclo, "trigger": "stripe_checkout"},
    )
    logger.info(f"Subscription activated for org {org_id}: {plan_codigo}/{ciclo}")


def _handle_payment_succeeded(data: dict):
    """Pago exitoso - renovar o reactivar."""
    from app.database import get_supabase

    customer_id = data.get("customer")
    if not customer_id:
        return

    # Look up org by stripe_customer_id
    supabase = get_supabase()
    sub = (
        supabase.table("suscripciones")
        .select("organizacion_id, estado")
        .eq("stripe_customer_id", customer_id)
        .single()
        .execute()
    )

    if not sub.data:
        logger.warning(f"No subscription found for Stripe customer {customer_id}")
        return

    org_id = sub.data["organizacion_id"]
    current_state = sub.data["estado"]

    if current_state in ("suspended", "past_due", "grace_period"):
        LicenseService.reactivate_subscription(org_id)
        logger.info(f"Subscription reactivated for org {org_id}")
    else:
        # Normal renewal - update next payment date
        from datetime import datetime, timedelta, timezone
        supabase.table("suscripciones").update({
            "fecha_proximo_pago": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        }).eq("organizacion_id", org_id).execute()
        logger.info(f"Subscription renewed for org {org_id}")


def _handle_payment_failed(data: dict):
    """Pago fallido - mover a past_due."""
    from app.database import get_supabase

    customer_id = data.get("customer")
    if not customer_id:
        return

    supabase = get_supabase()
    sub = (
        supabase.table("suscripciones")
        .select("organizacion_id, estado")
        .eq("stripe_customer_id", customer_id)
        .single()
        .execute()
    )

    if not sub.data:
        return

    org_id = sub.data["organizacion_id"]
    current_state = sub.data["estado"]

    if current_state == "active":
        LicenseService.handle_payment_failed(org_id)
        logger.warning(f"Payment failed for org {org_id} - moved to past_due")
    elif current_state == "past_due":
        # Second failure - move to grace period
        LicenseService.handle_grace_period(org_id)
        logger.warning(f"Second payment failure for org {org_id} - moved to grace_period")

    log_action(
        usuario_id="system",
        accion="pago_fallido",
        entidad_tipo="suscripcion",
        datos_nuevos={"org_id": org_id, "previous_state": current_state},
    )


def _handle_subscription_deleted(data: dict):
    """Suscripcion eliminada en Stripe - cancelar."""
    from app.database import get_supabase
    from datetime import datetime, timezone

    customer_id = data.get("customer")
    if not customer_id:
        return

    supabase = get_supabase()
    sub = (
        supabase.table("suscripciones")
        .select("organizacion_id, plan_id")
        .eq("stripe_customer_id", customer_id)
        .single()
        .execute()
    )

    if not sub.data:
        return

    org_id = sub.data["organizacion_id"]

    supabase.table("suscripciones").update({
        "estado": "cancelled",
        "fecha_cancelacion": datetime.now(timezone.utc).isoformat(),
    }).eq("organizacion_id", org_id).execute()

    supabase.table("historial_suscripciones").insert({
        "organizacion_id": org_id,
        "plan_anterior_id": sub.data["plan_id"],
        "accion": "cancelled",
        "motivo": "Cancelacion desde Stripe",
    }).execute()

    logger.info(f"Subscription cancelled for org {org_id}")


def _handle_subscription_updated(data: dict):
    """Suscripcion actualizada en Stripe (cambio de plan, etc)."""
    # Only process if status changed
    previous_attrs = data.get("previous_attributes", {})
    if "status" not in previous_attrs and "items" not in previous_attrs:
        return

    logger.info(f"Subscription updated: {data.get('id')}")
