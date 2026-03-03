from backend.database.engine import SessionLocal
from backend.database.models import (
    Contract, Clause, Obligation,
    Risk, Task, ValidationIssue
)


def save_contract_pipeline_result(result: dict):
    db = SessionLocal()

    contract_id = result["contract_id"]

    contract = Contract(
        id=contract_id,
        name=contract_id
    )
    db.add(contract)

    # Save clauses
    clause_map = {}
    for c in result["clauses"]:
        clause = Clause(
            contract_id=contract_id,
            clause_type=c.get("type"),
            text=c.get("text"),
            source_chunk=c.get("source")
        )
        db.add(clause)
        db.flush()
        clause_map[c.get("text")] = clause.id

    # Save obligations
    obligation_map = {}
    for ob in result["obligations"]:
        obligation = Obligation(
            contract_id=contract_id,
            clause_id=clause_map.get(ob.get("source_clause")),
            action_required=ob.get("action_required"),
            responsible_party=ob.get("responsible_party"),
            raw_deadline=ob.get("deadline", {}).get("raw"),
            normalized_due_date=ob.get("deadline", {}).get("normalized"),
            risk_score=ob.get("risk_score"),
            grounding_confidence=ob.get("grounding_confidence"),
            validation_status=result["validation"]["status"]
        )
        db.add(obligation)
        db.flush()
        obligation_map[ob.get("id")] = obligation.id

    # Save risks
    for r in result["risks"]:
        risk = Risk(
            obligation_id=obligation_map.get(r.get("obligation_id")),
            category=r.get("risk_category"),
            severity=r.get("severity"),
            likelihood=r.get("likelihood"),
            risk_score=r.get("risk_score")
        )
        db.add(risk)

    # Save tasks
    for t in result["tasks"]:
        task = Task(
            obligation_id=obligation_map.get(t.get("obligation_id")),
            title=t.get("title"),
            priority=t.get("priority"),
            due_date=t.get("due_date"),
            notify=t.get("notify")
        )
        db.add(task)

    # Save validation issues
    for issue in result["validation"]["issues"]:
        vi = ValidationIssue(
            obligation_id=obligation_map.get(issue.get("obligation_id")),
            severity=issue.get("severity"),
            category=issue.get("category"),
            message=issue.get("message")
        )
        db.add(vi)

    db.commit()
    db.close()