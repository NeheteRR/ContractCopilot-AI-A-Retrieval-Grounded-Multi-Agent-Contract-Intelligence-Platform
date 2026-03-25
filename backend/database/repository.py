from backend.database.engine import SessionLocal
from backend.database.models import (
    Contract, Clause, Obligation,
    Risk, Task, ValidationIssue
)


def save_contract_pipeline_result(result: dict):
    db = SessionLocal()
    try:
        contract_id = result["contract_id"]
        print(f"DEBUG: Saving results for contract_id: '{contract_id}'")

        # Upsert: Delete existing contract data if it exists to allow re-processing
        existing_contract = db.query(Contract).filter_by(id=contract_id).first()
        if existing_contract:
            print(f"DEBUG: Contract '{contract_id}' already exists. Overwriting...")
            # Use subqueries to avoid join() + delete() restriction in SQLAlchemy
            ob_ids = db.query(Obligation.id).filter_by(contract_id=contract_id).subquery()
            
            db.query(Risk).filter(Risk.obligation_id.in_(ob_ids)).delete(synchronize_session=False)
            db.query(Task).filter(Task.obligation_id.in_(ob_ids)).delete(synchronize_session=False)
            db.query(ValidationIssue).filter(ValidationIssue.obligation_id.in_(ob_ids)).delete(synchronize_session=False)
            
            db.query(Obligation).filter_by(contract_id=contract_id).delete(synchronize_session=False)
            db.query(Clause).filter_by(contract_id=contract_id).delete(synchronize_session=False)
            db.delete(existing_contract)
            db.commit()

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
                validation_status=result.get("validation", {}).get("status", "pending")
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
        if "validation" in result and "issues" in result["validation"]:
            for issue in result["validation"]["issues"]:
                vi = ValidationIssue(
                    obligation_id=obligation_map.get(issue.get("obligation_id")),
                    severity=issue.get("severity"),
                    category=issue.get("category"),
                    message=issue.get("message")
                )
                db.add(vi)

        db.commit()
        print(f"DEBUG: Successfully saved contract '{contract_id}' to database.")
    except Exception as e:
        db.rollback()
        print(f"ERROR: Failed to save contract results: {e}")
        raise e
    finally:
        db.close()

def save_pipeline_trace(contract_id: str, step_name: str, status: str, duration: str, input_summary: str, output_summary: str, details: list = None):
    # Dynamic import to avoid circular dependency
    from backend.database.models import PipelineTrace
    import json
    from datetime import datetime

    db = SessionLocal()
    try:
        # Check if we should delete old traces for this contract to keep it clean
        if step_name == "Ingestion":
             db.query(PipelineTrace).filter_by(contract_id=contract_id).delete()
             db.commit()

        # Defensive conversion: Ensure duration is a float
        try:
            val = str(duration).lower().replace('s', '')
            float_duration = float(val)
        except (ValueError, TypeError):
            float_duration = 0.0

        trace = PipelineTrace(
            contract_id=contract_id,
            step_name=step_name,
            status=status,
            duration=float_duration,
            input_summary=input_summary,
            output_summary=output_summary,
            details_json=json.dumps(details or []),
            timestamp=datetime.now().isoformat()
        )
        db.add(trace)
        db.commit()
    except Exception as e:
        print(f"ERROR: Failed to save pipeline trace: {e}")
    finally:
        db.close()