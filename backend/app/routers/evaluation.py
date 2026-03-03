from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import EvaluationScore

router = APIRouter(prefix="/contracts", tags=["Evaluation"])


@router.get("/{contract_id}/evaluation")
def get_evaluation(contract_id: str):

    db = SessionLocal()

    score = db.query(EvaluationScore).filter_by(contract_id=contract_id).first()

    db.close()

    if not score:
        return {"message": "No evaluation found"}

    return {
        "faithfulness": score.faithfulness,
        "context_precision": score.context_precision,
        "context_recall": score.context_recall,
        "answer_relevancy": score.answer_relevancy
    }