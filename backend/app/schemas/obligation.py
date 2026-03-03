from pydantic import BaseModel
from typing import Optional


class ObligationResponse(BaseModel):
    id: int
    action_required: str
    responsible_party: Optional[str]
    due_date: Optional[str]
    risk_score: Optional[float]
    priority: Optional[str]
    validation_status: Optional[str]
    grounding_confidence: Optional[float]