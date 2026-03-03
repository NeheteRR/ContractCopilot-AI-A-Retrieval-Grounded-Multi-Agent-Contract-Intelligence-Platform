from typing import List, Dict
from datetime import date, timedelta
from dateutil import parser as dtparser


def parse_date_safe(d):
    try:
        return dtparser.isoparse(d).date()
    except:
        return None


def calculate_deadline_bucket(due_date: str):
    today = date.today()
    dt = parse_date_safe(due_date)

    if not dt:
        return "no_due_date"

    if dt < today:
        return "overdue"

    delta = (dt - today).days

    if delta <= 7:
        return "this_week"
    elif delta <= 30:
        return "this_month"
    else:
        return "future"


def run_action_planner(
    contract_id: str,
    obligations: List[Dict],
    risks: List[Dict]
) -> List[Dict]:

    risk_map = {r["obligation_id"]: r for r in risks}

    tasks = []

    for ob in obligations:
        oid = ob.get("id")

        deadline = ob.get("deadline", {}).get("normalized")
        bucket = calculate_deadline_bucket(deadline)

        risk_info = risk_map.get(oid, {})
        risk_score = risk_info.get("risk_score", 1)

        priority = "normal"

        if risk_score >= 9:
            priority = "critical"
        elif risk_score >= 6:
            priority = "high"
        elif bucket == "overdue":
            priority = "high"

        task = {
            "contract_id": contract_id,
            "obligation_id": oid,
            "title": ob.get("action_required"),
            "responsible_party": ob.get("responsible_party"),
            "due_date": deadline,
            "bucket": bucket,
            "priority": priority,
            "risk_score": risk_score,
            "notify": priority in ["high", "critical"]
        }

        tasks.append(task)

    # Sort by:
    # 1. Criticality
    # 2. Deadline
    # 3. Risk score

    def sort_key(t):
        priority_order = {
            "critical": 0,
            "high": 1,
            "normal": 2
        }
        return (
            priority_order.get(t["priority"], 3),
            t["due_date"] or "9999-12-31",
            -t["risk_score"]
        )

    tasks.sort(key=sort_key)

    return tasks