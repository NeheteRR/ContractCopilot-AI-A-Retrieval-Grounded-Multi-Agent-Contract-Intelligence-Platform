from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import Obligation

router = APIRouter(prefix="/contracts", tags=["Obligations"])


@router.get("/{contract_id}/obligations")
def get_obligations(contract_id: str):

    db = SessionLocal()

    obligations = db.query(Obligation).filter_by(contract_id=contract_id).all()

    response = [
        {
            "id": o.id,
            "action_required": o.action_required,
            "responsible_party": o.responsible_party,
            "due_date": o.normalized_due_date,
            "risk_score": o.risk_score,
            "validation_status": o.validation_status,
            "grounding_confidence": o.grounding_confidence
        }
        for o in obligations
    ]

    db.close()
    return response