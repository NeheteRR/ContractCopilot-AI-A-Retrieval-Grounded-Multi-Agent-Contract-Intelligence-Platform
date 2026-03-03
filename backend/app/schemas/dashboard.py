from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_obligations: int
    high_risk_count: int
    critical_risk_count: int
    overdue_count: int
    validation_issues_count: int
    faithfulness_score: float