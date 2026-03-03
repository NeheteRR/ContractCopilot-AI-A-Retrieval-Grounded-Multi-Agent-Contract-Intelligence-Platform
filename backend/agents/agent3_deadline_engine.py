import json
import re
from typing import List, Dict
from backend.llm.ollama_client import ollama_generate

SYSTEM_PROMPT = """
You are Agent 3: Deadline Normalizer.

Return JSON:
{
  "normalized_obligations": [
    {
      "id": <int>,
      "deadline": {
        "raw": "<string>",
        "normalized": { ... }
      }
    }
  ]
}
"""

def extract_json(text):
    try:
        return json.loads(text)
    except:
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
    return None


def run_deadline_engine(contract_id: str, obligations: List[Dict], reference_date: str, model="gpt-oss:20b"):

    prompt = SYSTEM_PROMPT + f"\nReference date: {reference_date}\n\nObligations:\n" + json.dumps(obligations)

    response = ollama_generate(prompt, model=model)
    parsed = extract_json(response.get("response", ""))

    if not parsed:
        return []

    return parsed.get("normalized_obligations", [])