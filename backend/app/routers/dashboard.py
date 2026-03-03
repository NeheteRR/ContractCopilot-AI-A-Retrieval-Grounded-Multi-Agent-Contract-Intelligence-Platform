from fastapi import APIRouter
from backend.database.engine import SessionLocal
from backend.database.models import Obligation, Risk, EvaluationScore
from datetime import date

router = APIRouter(prefix="/contracts", tags=["Dashboard"])


@router.get("/{contract_id}/dashboard")
def get_dashboard(contract_id: str):

    db = SessionLocal()

    obligations = db.query(Obligation).filter_by(contract_id=contract_id).all()
    risks = db.query(Risk).join(Obligation).filter(
        Obligation.contract_id == contract_id
    ).all()

    evaluation = db.query(EvaluationScore).filter_by(contract_id=contract_id).first()

    total = len(obligations)
    high_risk = sum(1 for r in risks if r.risk_score >= 6)
    critical = sum(1 for r in risks if r.risk_score >= 9)
    

    today = date.today().isoformat()

    overdue = sum(
        1 for o in obligations
        if o.normalized_due_date and o.normalized_due_date < today
    )

    response = {
        "total_obligations": total,
        "high_risk_count": high_risk,
        "critical_risk_count": critical,
        "overdue_count": overdue,
        "validation_issues_count": 0,
        "faithfulness_score": evaluation.faithfulness if evaluation else None
    }

    db.close()
    return response