from backend.notifications.email.smtp_client import send_email
from backend.notifications.calendar.ics_generator import generate_ics_event
import os

DEFAULT_RECIPIENT = os.getenv("NOTIFICATION_RECIPIENT", "manager@company.com")


class NotificationService:

    @staticmethod
    def send_deadline_alert(task: dict):

        subject = f"Deadline Reminder: {task['title']}"

        html_body = f"""
        <h3>Obligation Reminder</h3>
        <p><strong>Task:</strong> {task['title']}</p>
        <p><strong>Due Date:</strong> {task['due_date']}</p>
        <p><strong>Priority:</strong> {task['priority']}</p>
        """

        ics_file = None

        if task.get("due_date"):
            ics_file = generate_ics_event(task["title"], task["due_date"])

        send_email(
            to=DEFAULT_RECIPIENT,
            subject=subject,
            body_html=html_body,
            attachment=ics_file,
            attachment_name="event.ics" if ics_file else None
        )

    @staticmethod
    def send_risk_alert(risk: dict):

        subject = f"High Risk Alert: Obligation {risk['obligation_id']}"

        html_body = f"""
        <h3>Risk Escalation Alert</h3>
        <p><strong>Category:</strong> {risk['category']}</p>
        <p><strong>Severity:</strong> {risk['severity']}</p>
        <p><strong>Risk Score:</strong> {risk['risk_score']}</p>
        """

        send_email(
            to="manager@company.com",
            subject=subject,
            body_html=html_body
        )