from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import Obligation

router = APIRouter(prefix="/contracts", tags=["Timeline"])


@router.get("/{contract_id}/timeline")
def get_timeline(contract_id: str):

    db = SessionLocal()

    obligations = db.query(Obligation).filter_by(contract_id=contract_id).all()

    response = [
        {
            "title": o.action_required,
            "date": o.normalized_due_date,
            "priority": o.risk_score
        }
        for o in obligations
        if o.normalized_due_date
    ]

    db.close()
    return response