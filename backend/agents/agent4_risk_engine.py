import json
import re
from typing import List, Dict
from backend.llm.ollama_client import ollama_generate

SEVERITY_SCORE = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4
}

SYSTEM_PROMPT = """
You are Agent 4: Contract Risk Analysis Agent.

For each obligation, analyze risk based ONLY on the given obligation.

Return STRICT JSON:

{
  "risks": [
    {
      "obligation_id": <int>,
      "risk_category": "<operational|financial|legal|compliance|reputational>",
      "severity": "<low|medium|high|critical>",
      "likelihood": "<low|medium|high>",
      "impact": "<short explanation>",
      "mitigation": "<short mitigation strategy>"
    }
  ]
}

Do NOT invent obligations.
Analyze only provided obligations.
"""


def extract_json(text: str):
    try:
        return json.loads(text)
    except:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                return None
    return None


def run_risk_engine(
    contract_id: str,
    obligations: List[Dict],
    model: str = "gpt-oss:20b"
) -> List[Dict]:

    if not obligations:
        return []

    prompt = SYSTEM_PROMPT + "\n\nObligations:\n" + json.dumps(obligations, ensure_ascii=False)

    response = ollama_generate(prompt, model=model, max_tokens=1500)
    model_text = response.get("response", "")

    parsed = extract_json(model_text)

    if not parsed:
        return []

    risks = parsed.get("risks", [])

    # Add deterministic numeric scoring
    for r in risks:
        severity = r.get("severity", "low")
        likelihood = r.get("likelihood", "low")

        severity_score = SEVERITY_SCORE.get(severity, 1)
        likelihood_score = SEVERITY_SCORE.get(likelihood, 1)

        r["risk_score"] = severity_score * likelihood_score
        r["contract_id"] = contract_id

    return risks