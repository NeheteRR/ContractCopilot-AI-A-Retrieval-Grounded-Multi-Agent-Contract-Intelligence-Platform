from backend.celery.celery_app import celery_app
from backend.orchestration.contract_service import process_contract


@celery_app.task(bind=True, max_retries=3)
def enqueue_contract_processing(self, contract_id: str, file_path: str):
    try:
        result = process_contract(
            contract_id=contract_id,
            file_path=file_path,
            run_evaluation=False,  # Move evaluation async
            trigger_async_notifications=False
        )

        # After processing → trigger next tasks
        from backend.celery.notification_tasks import dispatch_notifications
        from backend.celery.evaluation_tasks import run_evaluation_task

        dispatch_notifications.delay(result["tasks"])
        run_evaluation_task.delay(contract_id)

        return {"status": "completed"}

    except Exception as e:
        raise self.retry(exc=e, countdown=10)