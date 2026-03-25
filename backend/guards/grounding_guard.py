import json
import re
from typing import List, Dict
from backend.llm.ollama_client import ollama_generate


# ==========================================================
# 1️⃣ Deterministic Lexical Overlap Check
# ==========================================================

def lexical_overlap_score(obligation_text: str, context_chunks: List[str]) -> float:
    """
    Calculates lexical overlap ratio between obligation text and context chunks.
    """

    if not obligation_text:
        return 0.0

    obligation_words = set(re.findall(r"\w+", obligation_text.lower()))
    if not obligation_words:
        return 0.0

    max_score = 0.0

    for chunk in context_chunks:
        chunk_words = set(re.findall(r"\w+", chunk.lower()))
        overlap = obligation_words.intersection(chunk_words)

        score = len(overlap) / len(obligation_words)
        max_score = max(max_score, score)

    return max_score


# ==========================================================
# 2️⃣ LLM Grounding Verification (Structured JSON)
# ==========================================================

GROUNDING_PROMPT = """
You are a contract faithfulness verification assistant.

Context:
{context}

Obligation:
{obligation}

Question:
Is this obligation explicitly supported by the context?

Return STRICT JSON:

{{
  "grounded": true/false,
  "confidence": 0.0,
  "reason": "short explanation"
}}
"""


def extract_json_safe(text: str):
    """
    Safely extract JSON from LLM response.
    """
    if not text:
        return None

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


def llm_grounding_check(
    obligation: Dict,
    context_chunks: List[str],
    model: str = "gemma3:4b"
) -> Dict:

    context = "\n\n".join(context_chunks)

    prompt = GROUNDING_PROMPT.format(
        context=context,
        obligation=json.dumps(obligation, ensure_ascii=False)
    )

    response = ollama_generate(
        prompt,
        model=model,
        max_tokens=300
    )

    if not response or "response" not in response:
        return {
            "grounded": False,
            "confidence": 0.0,
            "reason": "LLM returned no response"
        }

    parsed = extract_json_safe(response.get("response", ""))

    if not parsed:
        return {
            "grounded": False,
            "confidence": 0.0,
            "reason": "Invalid JSON from LLM"
        }

    return parsed


# ==========================================================
# 3️⃣ Strict YES/NO Grounding Check (High Faithfulness Boost)
# ==========================================================

STRICT_PROMPT = """
Context:
{context}

Obligation:
{obligation}

Is this obligation explicitly stated in the context?

Answer ONLY YES or NO.
"""


def strict_yes_no_check(
    obligation: Dict,
    context_chunks: List[str],
    model: str = "gemma3:4b"
) -> bool:

    context = "\n\n".join(context_chunks)

    prompt = STRICT_PROMPT.format(
        context=context,
        obligation=obligation.get("action_required", "")
    )

    response = ollama_generate(
        prompt,
        model=model,
        max_tokens=20
    )

    if not response or "response" not in response:
        return False

    answer = response.get("response", "").strip().upper()

    return answer.startswith("YES")


# ==========================================================
# 4️⃣ Public Guard Function (Phase 6 Optimized)
# ==========================================================

def apply_grounding_guard(
    obligations: List[Dict],
    context_chunks: List[str],
    lexical_threshold: float = 0.25,
    confidence_threshold: float = 0.75,
    use_llm_check: bool = True,
    use_strict_check: bool = True
) -> List[Dict]:
    """
    Multi-layer grounding guard:

    1. Lexical overlap filter
    2. Structured LLM verification
    3. Strict YES/NO verification
    """

    validated = []

    for ob in obligations:

        action_text = ob.get("action_required", "")

        # -----------------------------------------
        # Step 1: Deterministic lexical filter
        # -----------------------------------------

        overlap_score = lexical_overlap_score(action_text, context_chunks)

        if overlap_score < lexical_threshold:
            continue

        # -----------------------------------------
        # Step 2: Structured LLM grounding check
        # -----------------------------------------

        if use_llm_check:
            result = llm_grounding_check(ob, context_chunks)

            if not result.get("grounded", False):
                continue

            if result.get("confidence", 0.0) < confidence_threshold:
                continue

            ob["grounding_confidence"] = result.get("confidence", 0.0)
            ob["grounding_reason"] = result.get("reason", "")

        # -----------------------------------------
        # Step 3: Strict YES/NO double check
        # -----------------------------------------

        if use_strict_check:
            if not strict_yes_no_check(ob, context_chunks):
                continue

        validated.append(ob)

    return validated