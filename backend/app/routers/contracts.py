from fastapi import APIRouter
from backend.celery.contract_tasks import enqueue_contract_processing

router = APIRouter(prefix="/contracts", tags=["Contracts"])


@router.post("/{contract_id}/upload")
def upload_contract(contract_id: str, file_path: str):
    """
    Upload contract and start async processing.
    """

    enqueue_contract_processing.delay(contract_id, file_path)

    return {
        "status": "processing_started",
        "contract_id": contract_id
    }