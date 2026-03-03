from backend.celery.celery_app import celery_app
from backend.evaluation.ragas_runner import evaluate_contract


@celery_app.task
def run_evaluation_task(contract_id: str):
    evaluate_contract(contract_id)