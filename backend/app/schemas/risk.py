from pydantic import BaseModel


class RiskResponse(BaseModel):
    obligation_id: int
    category: str
    severity: str
    likelihood: str
    risk_score: float