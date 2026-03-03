import json
import re
from typing import List, Dict
from backend.llm.ollama_client import ollama_generate
from backend.utils.json_validator import validate_obligation

SYSTEM_PROMPT = """
You are Agent 2: Obligation Extraction Agent.

Extract explicit obligations.

Return JSON:
{
  "obligations": [
    {
      "id": <int>,
      "type": "<deliverable|payment|compliance|recurring|other>",
      "action_required":"<str>",
      "responsible_party":"<str|null>",
      "deadline": {"raw":"<str|null>","normalized":"<YYYY-MM-DD|null>"},
      "conditions":"<str|null>",
      "penalties":"<str|null>",
      "risk_level":"<low|medium|high>",
      "source_clause":"<exact text>"
    }
  ]
}
"""

def extract_json(text: str):
    try:
        return json.loads(text)
    except:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
    return None


def run_obligation_extractor(contract_id: str, clauses: List[Dict], model="gpt-oss:20b") -> List[Dict]:

    prompt = SYSTEM_PROMPT + "\n\nClauses:\n" + json.dumps(clauses, ensure_ascii=False)

    response = ollama_generate(prompt, model=model, max_tokens=2000)
    model_text = response.get("response", "")

    parsed = extract_json(model_text)

    if not parsed:
        return []

    obligations = parsed.get("obligations", [])

    obligations = [ob for ob in obligations if validate_obligation(ob)]
    # assign local ids safely
    for idx, ob in enumerate(obligations, start=1):
        ob["id"] = idx

    return obligations