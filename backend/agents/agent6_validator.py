import json
import re
from datetime import date
from typing import List, Dict, Optional
from dateutil import parser as dtparser

from backend.llm.ollama_client import ollama_generate

SEVERITY = {"low": 1, "medium": 2, "high": 3, "critical": 4}


# -----------------------
# Utility Helpers
# -----------------------

def is_iso_date(s: str) -> bool:
    if not s or not isinstance(s, str):
        return False
    try:
        dtparser.isoparse(s)
        return True
    except Exception:
        return False


def parse_iso(s: str):
    try:
        return dtparser.isoparse(s).date()
    except Exception:
        return None


def norm_text_for_dup(t: str) -> str:
    if not t:
        return ""
    return re.sub(r'\s+', ' ', t.strip().lower())


# -----------------------
# Optional LLM explanation
# -----------------------

def llm_explain(issue: Dict, obligation: Optional[Dict], model="gemma3:4b") -> Optional[str]:
    prompt = f"""
You are a contract validation assistant.
Issue: {json.dumps(issue, ensure_ascii=False)}
Source obligation: {json.dumps(obligation, ensure_ascii=False) if obligation else "null"}
Return a one-sentence suggested fix. No JSON.
"""
    try:
        resp = ollama_generate(prompt, model=model, max_tokens=120)
        return resp.get("response", "").strip()
    except Exception:
        return None


# -----------------------
# Core Validation Checks
# -----------------------

def check_obligation(ob: Dict, reference_date: str) -> List[Dict]:
    issues = []
    oid = ob.get("id")

    required_fields = ["action_required", "source_clause", "deadline"]

    for field in required_fields:
        if field not in ob or ob.get(field) in (None, "", {}):
            issues.append({
                "obligation_id": oid,
                "severity": "medium" if field == "deadline" else "low",
                "category": "missing_field",
                "field": field,
                "value": ob.get(field),
                "message": f"Required field '{field}' is missing or empty."
            })

    # Short action
    action = ob.get("action_required")
    if action and len(str(action).strip()) < 3:
        issues.append({
            "obligation_id": oid,
            "severity": "low",
            "category": "short_action",
            "field": "action_required",
            "value": action,
            "message": "action_required is unusually short."
        })

    # Responsible party
    if not ob.get("responsible_party"):
        issues.append({
            "obligation_id": oid,
            "severity": "low",
            "category": "missing_responsible",
            "field": "responsible_party",
            "value": ob.get("responsible_party"),
            "message": "responsible_party is missing."
        })

    # Deadline checks
    deadline = ob.get("deadline", {})
    raw = deadline.get("raw") if isinstance(deadline, dict) else None
    norm = deadline.get("normalized") if isinstance(deadline, dict) else None

    if not raw and not norm:
        issues.append({
            "obligation_id": oid,
            "severity": "medium",
            "category": "missing_deadline",
            "field": "deadline",
            "value": deadline,
            "message": "No deadline present."
        })

    if norm:
        if not is_iso_date(norm):
            issues.append({
                "obligation_id": oid,
                "severity": "high",
                "category": "invalid_normalized_date",
                "field": "deadline.normalized",
                "value": norm,
                "message": "deadline.normalized is not valid ISO date."
            })
        else:
            nd = parse_iso(norm)
            ref = parse_iso(reference_date) if reference_date else date.today()
            if nd and ref and nd < ref:
                issues.append({
                    "obligation_id": oid,
                    "severity": "high",
                    "category": "deadline_in_past",
                    "field": "deadline.normalized",
                    "value": norm,
                    "message": f"Deadline {norm} is before reference date {reference_date}."
                })

    return issues


# -----------------------
# Duplicate Detection
# -----------------------

def find_duplicates(obligations: List[Dict]) -> List[Dict]:
    issues = []
    seen = {}

    for ob in obligations:
        key = (
            norm_text_for_dup(ob.get("action_required")),
            (ob.get("responsible_party") or "").lower()
        )

        if key in seen:
            issues.append({
                "obligation_id": ob.get("id"),
                "severity": "low",
                "category": "duplicate",
                "message": f"Duplicate similar to obligation {seen[key]}",
                "field": "action_required",
                "value": ob.get("action_required")
            })
        else:
            seen[key] = ob.get("id")

    return issues


# -----------------------
# Conflict Detection
# -----------------------

def find_conflicts(obligations: List[Dict]) -> List[Dict]:
    issues = []
    mapping = {}

    for ob in obligations:
        key = norm_text_for_dup(ob.get("action_required"))
        norm = ob.get("deadline", {}).get("normalized")

        if key not in mapping:
            mapping[key] = {"norms": set(), "ids": []}

        if norm:
            # Handle potential dicts or non-strings from LLMs
            norm_str = json.dumps(norm) if isinstance(norm, (dict, list)) else str(norm)
            mapping[key]["norms"].add(norm_str)

        mapping[key]["ids"].append(ob.get("id"))

    for key, val in mapping.items():
        if len(val["norms"]) > 1:
            issues.append({
                "obligation_ids": val["ids"],
                "severity": "medium",
                "category": "conflicting_deadlines",
                "message": f"Multiple normalized deadlines: {list(val['norms'])}",
                "field": "deadline.normalized",
                "value": list(val["norms"])
            })

    return issues


# -----------------------
# Public Service Function
# -----------------------

def run_validator(
    contract_id: str,
    obligations: List[Dict],
    risks: Optional[List[Dict]] = None,
    reference_date: Optional[str] = None,
    use_llm: bool = False,
    llm_model: str = "gemma3:4b"
) -> Dict:

    if not reference_date:
        reference_date = date.today().isoformat()

    issues = []

    # Per-obligation checks
    for ob in obligations:
        issues += check_obligation(ob, reference_date)

    # Duplicates
    issues += find_duplicates(obligations)

    # Conflicts
    issues += find_conflicts(obligations)

    # Risk mismatch check
    if risks:
        for ob in obligations:
            if ob.get("penalties"):
                rid = ob.get("id")
                found = [r for r in risks if r.get("obligation_id") == rid]
                if not found:
                    issues.append({
                        "obligation_id": rid,
                        "severity": "low",
                        "category": "risk_mismatch",
                        "message": "Penalties exist but no corresponding risk entry.",
                        "field": "penalties",
                        "value": ob.get("penalties")
                    })

    # Add severity rank
    for i in issues:
        i["severity_rank"] = SEVERITY.get(i.get("severity", "low"), 1)
        i.setdefault("suggested_fix", None)

    # Optional LLM explanation
    if use_llm:
        for issue in issues:
            ob = next((o for o in obligations if o.get("id") == issue.get("obligation_id")), None)
            expl = llm_explain(issue, ob, model=llm_model)
            if expl:
                issue["suggested_fix"] = expl

    # Sort
    issues_sorted = sorted(
        issues,
        key=lambda x: (-x.get("severity_rank", 1), x.get("category", ""))
    )

    return {
        "contract_id": contract_id,
        "reference_date": reference_date,
        "total_obligations": len(obligations),
        "issues_count": len(issues_sorted),
        "status": "clean" if len(issues_sorted) == 0 else "issues_found",
        "issues": issues_sorted
    }