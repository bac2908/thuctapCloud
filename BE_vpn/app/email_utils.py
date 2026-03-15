import logging
import smtplib
import ssl
from email.message import EmailMessage
from app.config import Settings


logger = logging.getLogger(__name__)


def send_email(settings: Settings, to_email: str, subject: str, body: str) -> None:
    """Send email via SMTP; supports STARTTLS (default) and SMTPS on port 465."""
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_pass or not settings.smtp_from:
        if settings.smtp_fallback_to_console:
            logger.warning(
                "SMTP chưa được cấu hình. Email giả lập tới %s | %s\n%s",
                to_email,
                subject,
                body,
            )
            return
        raise ValueError("SMTP chưa được cấu hình")

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    context = ssl.create_default_context()

    # Use SMTPS if port 465 and TLS flag is false; else use STARTTLS
    if settings.smtp_port == 465 and not settings.smtp_use_tls:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.ehlo()
            if settings.smtp_use_tls:
                server.starttls(context=context)
                server.ehlo()
            server.login(settings.smtp_user, settings.smtp_pass)
            server.send_message(msg)
