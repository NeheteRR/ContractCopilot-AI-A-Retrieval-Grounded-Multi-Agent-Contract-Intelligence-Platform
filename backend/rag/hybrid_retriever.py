from typing import List
from backend.rag.retriever import dense_retrieve


KEYWORD_BOOST_TERMS = [
    "obligation",
    "shall",
    "must",
    "payment",
    "deadline",
    "termination",
    "penalty"
]


def keyword_boost_score(text: str):
    text_lower = text.lower()
    score = 0
    for kw in KEYWORD_BOOST_TERMS:
        if kw in text_lower:
            score += 1
    return score


def deduplicate_docs(docs):
    seen = set()
    unique = []

    for d in docs:
        content = d.page_content.strip()
        if content not in seen:
            seen.add(content)
            unique.append(d)

    return unique


def hybrid_retrieve(
    query: str,
    contract_id: str,
    k: int = 10
) -> List[str]:

    dense_docs = dense_retrieve(query, contract_id, k=k)

    # Deduplicate
    dense_docs = deduplicate_docs(dense_docs)

    # Boost scoring
    scored = []

    for d in dense_docs:
        score = keyword_boost_score(d.page_content)
        scored.append((score, d))

    # Sort by boost score descending
    scored.sort(key=lambda x: -x[0])

    # Take top 6 after boost
    top_docs = [d for _, d in scored[:6]]

    return [d.page_content for d in top_docs]