import smtplib
import ssl
import os
from email.message import EmailMessage
from dotenv import load_dotenv
from backend.database.engine import SessionLocal
from backend.database.models import EmailLog

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")


def send_email(
    to: str,
    subject: str,
    body_html: str,
    attachment: bytes = None,
    attachment_name: str = None
):
    db = SessionLocal()

    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content("This email requires HTML support.")
    msg.add_alternative(body_html, subtype="html")

    if attachment and attachment_name:
        msg.add_attachment(
            attachment,
            maintype="application",
            subtype="octet-stream",
            filename=attachment_name
        )

    try:
        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)

        log = EmailLog(
            recipient=to,
            subject=subject,
            status="sent"
        )
        db.add(log)
        db.commit()

    except Exception as e:
        log = EmailLog(
            recipient=to,
            subject=subject,
            status=f"failed: {str(e)}"
        )
        db.add(log)
        db.commit()
        raise

    finally:
        db.close()