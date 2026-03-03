from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import Risk, Obligation

router = APIRouter(prefix="/contracts", tags=["Risks"])


@router.get("/{contract_id}/risks")
def get_risks(contract_id: str):

    db = SessionLocal()

    risks = db.query(Risk).join(Obligation).filter(
        Obligation.contract_id == contract_id
    ).all()

    response = [
        {
            "obligation_id": r.obligation_id,
            "category": r.category,
            "severity": r.severity,
            "likelihood": r.likelihood,
            "risk_score": r.risk_score
        }
        for r in risks
    ]

    db.close()
    return response