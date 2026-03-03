from backend.celery.celery_app import celery_app
from backend.notifications.email_service import send_email


@celery_app.task(bind=True, max_retries=3)
def send_email_task(self, recipient: str, subject: str, body: str):
    try:
        send_email(recipient, subject, body)
    except Exception as e:
        raise self.retry(exc=e, countdown=30)


@celery_app.task
def dispatch_notifications(tasks: list):
    for task in tasks:
        if task.get("notify"):
            send_email_task.delay(
                recipient="manager@company.com",
                subject=f"High Priority Obligation: {task['title']}",
                body=f"Due date: {task['due_date']}"
            )