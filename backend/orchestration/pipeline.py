from datetime import date
from typing import Dict

# RAG Layer
from backend.rag.hybrid_retriever import hybrid_retrieve
from backend.guards.grounding_guard import apply_grounding_guard

# Agents
from backend.agents.agent1_clause_parser import run_clause_parser
from backend.agents.agent2_obligation_extractor import run_obligation_extractor
from backend.agents.agent3_deadline_engine import run_deadline_engine
from backend.agents.agent4_risk_engine import run_risk_engine
from backend.agents.agent5_action_planner import run_action_planner
from backend.agents.agent6_validator import run_validator


# -----------------------------
# Query Templates for Retrieval
# -----------------------------

CLAUSE_QUERY = """
Extract all contractual clauses, especially those containing obligations,
duties, payment terms, deadlines, termination conditions, and penalties.
"""

OBLIGATION_QUERY = """
Find sections that contain binding obligations, duties,
requirements, compliance clauses, timelines, and financial commitments.
"""


# -----------------------------
# Main Pipeline Function
# -----------------------------

def run_contract_pipeline(
    contract_id: str,
    reference_date: str = None,
    use_llm_validation: bool = False
) -> Dict:
    """
    Full System 3 Orchestration:
    Hybrid RAG → Agents → Validation → Action Plan
    """

    if not reference_date:
        reference_date = date.today().isoformat()

    # ========================================
    # PHASE 2 — Hybrid Retrieval
    # ========================================

    clause_chunks = hybrid_retrieve(
        query=CLAUSE_QUERY,
        contract_id=contract_id
    )

    if not clause_chunks:
        return {
            "contract_id": contract_id,
            "status": "no_context_found",
            "message": "No relevant chunks retrieved from vector DB."
        }
    
    def deduplicate_text_blocks(blocks):
        seen = set()
        unique = []
        for b in blocks:
            t = b.strip()
            if t not in seen:
                seen.add(t)
                unique.append(t)
        return unique

    clause_chunks = deduplicate_text_blocks(clause_chunks)
    # ========================================
    # PHASE 1 — Agent 1
    # ========================================

    clauses = run_clause_parser(
        contract_id=contract_id,
        retrieved_chunks=clause_chunks
    )

    # ========================================
    # PHASE 1 — Agent 2
    # ========================================

    obligations = run_obligation_extractor(
        contract_id=contract_id,
        clauses=clauses
    )

    # 🔥 Apply Grounding Guard
    obligations = apply_grounding_guard(
        obligations=obligations,
        context_chunks=clause_chunks,
        lexical_threshold=0.25,
        use_llm_check=True
    )

    # ========================================
    # PHASE 1 — Agent 3
    # ========================================

    normalized_deadlines = run_deadline_engine(
        contract_id=contract_id,
        obligations=obligations,
        reference_date=reference_date
    )

    # Merge normalized deadlines back
    norm_map = {n["id"]: n for n in normalized_deadlines}

    for ob in obligations:
        oid = ob.get("id")
        if oid in norm_map:
            ob["deadline"] = norm_map[oid].get("deadline")

    # ========================================
    # PHASE 1 — Agent 4 (Risk)
    # ========================================

    risks = run_risk_engine(
        contract_id=contract_id,
        obligations=obligations
    )

    # ========================================
    # PHASE 1 — Agent 6 (Validator)
    # ========================================

    validation_report = run_validator(
        contract_id=contract_id,
        obligations=obligations,
        risks=risks,
        reference_date=reference_date,
        use_llm=use_llm_validation
    )

    # ========================================
    # PHASE 1 — Agent 5 (Action Planner)
    # ========================================

    tasks = run_action_planner(
        contract_id=contract_id,
        obligations=obligations,
        risks=risks
    )

    # ========================================
    # Final Structured Output
    # ========================================

    return {
        "contract_id": contract_id,
        "reference_date": reference_date,
        "clauses_count": len(clauses),
        "obligations_count": len(obligations),
        "risks_count": len(risks),
        "tasks_count": len(tasks),
        "validation_status": validation_report.get("status"),
        "clauses": clauses,
        "obligations": obligations,
        "risks": risks,
        "tasks": tasks,
        "validation": validation_report
    }