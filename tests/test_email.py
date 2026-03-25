from backend.notifications.email.smtp_client import send_email

if __name__ == "__main__":
    send_email(
        to="3512411011@despu.edu.in",
        subject="System 3 Email Test",
        body_html="<h1>System 3 SMTP Working ✅</h1>"
    )