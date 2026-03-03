from backend.agents.agent4_risk_engine import run_risk_engine

sample_obligations = [
    {
        "id": 1,
        "action_required": "Pay invoice within 30 days",
        "responsible_party": "Client",
        "deadline": {"normalized": "2025-04-01"}
    }
]

if __name__ == "__main__":
    risks = run_risk_engine("contract_1", sample_obligations)
    print(risks)