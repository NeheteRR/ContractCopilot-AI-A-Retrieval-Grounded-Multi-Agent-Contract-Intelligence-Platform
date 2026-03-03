from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import Task, EmailLog
from backend.celery.notification_tasks import dispatch_notifications

router = APIRouter(prefix="/contracts", tags=["Notifications"])


# -------------------------------------------------
# 1️⃣ Trigger Notifications Manually
# -------------------------------------------------

@router.post("/{contract_id}/notify")
def trigger_contract_notifications(contract_id: str):

    db = SessionLocal()

    tasks = db.query(Task).join(Task).filter(
        Task.obligation_id != None
    ).all()

    formatted_tasks = [
        {
            "title": t.title,
            "due_date": t.due_date,
            "notify": t.notify
        }
        for t in tasks
    ]

    dispatch_notifications.delay(formatted_tasks)

    db.close()

    return {
        "status": "notification_dispatch_started",
        "contract_id": contract_id
    }


# -------------------------------------------------
# 2️⃣ Get Notification Logs
# -------------------------------------------------

@router.get("/{contract_id}/notifications")
def get_notification_logs(contract_id: str):

    db = SessionLocal()

    logs = db.query(EmailLog).all()

    response = [
        {
            "id": log.id,
            "recipient": log.recipient,
            "subject": log.subject,
            "status": log.status
        }
        for log in logs
    ]

    db.close()

    return response