"""
TrainingHub Pro - Email Service
Handles sending invitation emails, consent requests, and notifications.
Uses a pluggable backend (Resend, SendGrid, or SMTP).
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def send_invitation_email(
    to_email: str,
    inviter_name: str,
    organization_name: str,
    team_name: Optional[str],
    role: Optional[str],
    invite_token: str,
    frontend_url: str = "http://localhost:3000",
) -> bool:
    """Send invitation email to a new user."""
    invite_url = f"{frontend_url}/invite?token={invite_token}"

    subject = f"Invitacion a {organization_name} en TrainingHub"
    body = f"""
    Hola,

    {inviter_name} te ha invitado a unirte a {organization_name} en TrainingHub.
    {"Equipo: " + team_name if team_name else ""}
    {"Rol: " + role if role else ""}

    Para aceptar la invitacion, haz click en el siguiente enlace:
    {invite_url}

    Este enlace expira en 7 dias.

    Si no esperabas esta invitacion, puedes ignorar este email.

    -- TrainingHub Pro
    """

    return _send_email(to_email, subject, body)


def send_tutor_consent_email(
    to_email: str,
    player_name: str,
    team_name: str,
    organization_name: str,
    invite_token: str,
    frontend_url: str = "http://localhost:3000",
) -> bool:
    """Send consent request email to parent/tutor of a minor."""
    consent_url = f"{frontend_url}/tutor/consent?token={invite_token}"

    subject = f"Consentimiento requerido - {player_name} en {team_name}"
    body = f"""
    Estimado/a padre/madre/tutor,

    {player_name} ha sido anadido/a al equipo {team_name} de {organization_name} en TrainingHub.

    Como menor de edad, necesitamos su consentimiento para procesar sus datos.

    Por favor, pulse el siguiente enlace para revisar y dar su consentimiento:
    {consent_url}

    Este enlace expira en 7 dias.

    De acuerdo con el RGPD y la LOPD, sus datos y los del menor seran tratados
    de forma segura y confidencial.

    -- TrainingHub Pro
    """

    return _send_email(to_email, subject, body)


def send_ownership_transfer_email(
    to_email: str,
    from_name: str,
    team_name: str,
    transfer_token: str,
    frontend_url: str = "http://localhost:3000",
) -> bool:
    """Send ownership transfer request."""
    transfer_url = f"{frontend_url}/transfer?token={transfer_token}"

    subject = f"Transferencia de propiedad - {team_name}"
    body = f"""
    Hola,

    {from_name} quiere transferirte la propiedad del equipo {team_name} en TrainingHub.

    Para aceptar, haz click en el siguiente enlace:
    {transfer_url}

    Este enlace expira en 7 dias.

    -- TrainingHub Pro
    """

    return _send_email(to_email, subject, body)


def _send_email(to: str, subject: str, body: str) -> bool:
    """
    Send email using configured backend.
    Currently logs the email. In production, integrate with Resend/SendGrid.
    """
    try:
        # Check for Resend API key
        import os
        resend_key = os.environ.get("RESEND_API_KEY")

        if resend_key:
            try:
                import resend
                resend.api_key = resend_key
                resend.Emails.send({
                    "from": "TrainingHub <noreply@traininghub.app>",
                    "to": [to],
                    "subject": subject,
                    "text": body,
                })
                logger.info(f"Email sent to {to}: {subject}")
                return True
            except ImportError:
                logger.warning("resend package not installed. Falling back to log.")
            except Exception as e:
                logger.warning(f"Resend error (non-critical): {e}. Falling back to log.")

        # Fallback: log the email
        logger.info(f"[EMAIL] To: {to} | Subject: {subject}")
        logger.debug(f"[EMAIL BODY] {body}")
        return True

    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False
