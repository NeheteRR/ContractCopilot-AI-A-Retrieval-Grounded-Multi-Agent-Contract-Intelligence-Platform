import json
import re
from typing import List, Dict
from backend.llm.ollama_client import ollama_generate  # reuse your client

ALLOWED_TYPES = [
    "Deliverable","Responsibility","Payment","Timeline","Deadline",
    "Confidentiality","Penalty","Termination","Communication","Scope",
    "Risk","Amendment","Event","Miscellaneous"
]

SYSTEM_PROMPT = """
You are Agent 1: Document Understanding Agent in a Contract Analysis System.

Segment the document into typed clauses.

STRICT JSON ONLY:
{
  "clauses": [
    {
      "type": "<one allowed type>",
      "text": "<exact text>",
      "source": "retrieved_chunk"
    }
  ]
}
"""

def extract_json(text: str):
    text = text.strip()
    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            return None
    return None


def run_clause_parser(contract_id: str, retrieved_chunks: List[str], model="gemma3:4b") -> List[Dict]:
    """
    Pure function version of Agent 1.
    """

    full_text = "\n\n".join(retrieved_chunks)

    prompt = SYSTEM_PROMPT + f"\n\nDocument text:\n{full_text}"

    response = ollama_generate(prompt, model=model, max_tokens=2000)
    model_text = response.get("response", "")

    parsed = extract_json(model_text)

    if not parsed:
        return []

    clauses = parsed.get("clauses", [])

    # Enforce allowed types
    for c in clauses:
        if c.get("type") not in ALLOWED_TYPES:
            c["type"] = "Miscellaneous"

    return clauses