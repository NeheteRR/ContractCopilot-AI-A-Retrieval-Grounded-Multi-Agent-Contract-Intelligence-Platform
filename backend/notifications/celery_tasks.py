from celery import shared_task
from backend.celery.celery_app import celery_app
from backend.notifications.notification_service import NotificationService


@shared_task
def send_notification(task):
    print(f"Sending notification for task {task['title']}")

def trigger_notifications(tasks):
    # Call the real dispatch task instead of the placeholder print
    if tasks:
        dispatch_notifications.delay(tasks)

@celery_app.task(bind=True, max_retries=3)
def send_deadline_task(self, task: dict):
    try:
        NotificationService.send_deadline_alert(task)
    except Exception as e:
        raise self.retry(exc=e, countdown=30)


@celery_app.task(bind=True, max_retries=3)
def send_risk_task(self, risk: dict):
    try:
        NotificationService.send_risk_alert(risk)
    except Exception as e:
        raise self.retry(exc=e, countdown=30)


@celery_app.task
def dispatch_notifications(tasks: list):
    for task in tasks:
        if task.get("notify"):
            send_deadline_task.delay(task)