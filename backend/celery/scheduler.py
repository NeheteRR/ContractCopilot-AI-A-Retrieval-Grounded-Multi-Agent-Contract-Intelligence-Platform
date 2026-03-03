from backend.celery.celery_app import celery_app
from celery.schedules import crontab


celery_app.conf.beat_schedule = {
    "check-deadlines-daily": {
        "task": "backend.celery.scheduler.check_deadlines",
        "schedule": crontab(hour=9, minute=0)
    }
}


@celery_app.task
def check_deadlines():
    print("Running daily deadline check...")