from __future__ import annotations

import hashlib
from typing import Any

from langchain_core.documents import Document
from backend.llm.ollama_client import ollama_generate
from backend.rag.hybrid_retriever import hybrid_retrieve

# -------------------------------------------------------
# Cross-encoder reranker (Lazy Initialization)
# -------------------------------------------------------
_reranker: CrossEncoder | None = None

def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


# -------------------------------------------------------
# Approximate token count (cheap, no tokenizer needed)
# -------------------------------------------------------
_CHARS_PER_TOKEN = 3.5  # conservative estimate for legal/contract text


def _approx_tokens(text: str) -> int:
    return int(len(text) / _CHARS_PER_TOKEN)


# -------------------------------------------------------
# LLM-driven query expansion
# Uses the same Ollama model so no extra dependency.
# Falls back to template expansion if LLM call fails.
# -------------------------------------------------------
_EXPANSION_PROMPT = """\
You are a legal contract analysis assistant.
Given the user question below, generate exactly 3 search queries that will
help retrieve the most relevant clauses from a contract document.

Rules:
- Each query must be on its own line, no numbering, no bullet points.
- Vary the phrasing: one close paraphrase, one focused on legal terminology,
  one focused on the contractual obligation or party responsible.
- Output ONLY the 3 queries, nothing else.

User question: {question}
"""


def expand_query(question: str, model: str = "gemma3:4b") -> list[str]:
    """Generate semantically diverse search queries via LLM."""
    try:
        prompt = _EXPANSION_PROMPT.format(question=question)
        result = ollama_generate(prompt, model=model, max_tokens=200)
        raw = result.get("response", "")
        queries = [q.strip() for q in raw.strip().splitlines() if q.strip()]
        if len(queries) >= 2:
            # Always keep the original question as the first query
            return [question] + queries[:3]
    except Exception:
        pass  # fall back to templates

    # Template fallback (original behaviour, kept as safety net)
    return [
        question,
        f"contract clause about {question}",
        f"legal obligation regarding {question}",
    ]


# -------------------------------------------------------
# Deduplication using content hash (handles whitespace diffs)
# -------------------------------------------------------
def _content_hash(text: str) -> str:
    normalised = " ".join(text.split())
    return hashlib.md5(normalised.encode()).hexdigest()


def deduplicate(docs: list[Document]) -> list[Document]:
    seen: set[str] = set()
    unique: list[Document] = []
    for doc in docs:
        h = _content_hash(doc.page_content)
        if h not in seen:
            seen.add(h)
            unique.append(doc)
    return unique


# -------------------------------------------------------
# Cross-encoder reranking
# -------------------------------------------------------
def rerank(query: str, docs: list[Document], top_k: int = 5) -> list[Document]:
    if not docs:
        return []
    
    # Lazy load to avoid DLL issues
    reranker_model = get_reranker()
    
    pairs = [[query, doc.page_content] for doc in docs]
    scores = reranker_model.predict(pairs)
    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:top_k]]


# -------------------------------------------------------
# Token-aware context builder
# Includes section metadata so the LLM can cite properly.
# -------------------------------------------------------
MAX_CONTEXT_TOKENS = 3000  # safe for most 4k-context models


def build_context(docs: list[Document]) -> tuple[str, list[dict[str, Any]]]:
    """
    Returns:
        context_str  — formatted string to inject into the prompt
        sources      — list of {index, section, contract_id} for citations
    """
    context_parts: list[str] = []
    sources: list[dict[str, Any]] = []
    running_tokens = 0

    for i, doc in enumerate(docs):
        section = doc.metadata.get("section", "general")
        contract_id = doc.metadata.get("contract_id", "unknown")
        header = f"[Clause {i + 1} | section: {section}]"
        chunk = f"{header}\n{doc.page_content}"
        chunk_tokens = _approx_tokens(chunk)

        if running_tokens + chunk_tokens > MAX_CONTEXT_TOKENS:
            break

        context_parts.append(chunk)
        running_tokens += chunk_tokens
        sources.append({
            "index": i + 1,
            "section": section,
            "contract_id": contract_id,
            "text": doc.page_content[:200] + "..."
        })

    return "\n\n".join(context_parts), sources


# -------------------------------------------------------
# Prompt template
# -------------------------------------------------------
PROMPT_TEMPLATE = """\
You are a legal contract analysis expert.

Answer STRICTLY using the provided context below.

Rules:
- Do NOT hallucinate or infer beyond what the context states.
- If the answer is not found, respond: "Not found in contract."
- Cite the clause number (e.g. [Clause 3]) whenever you reference specific text.
- Be precise, structured, and use plain language where possible.

Context:
{context}

Question:
{question}

Answer (structured, with clause references):
"""


# -------------------------------------------------------
# Main entry point
# -------------------------------------------------------
def answer_question(
    question: str,
    contract_id: str,
    model: str = "gemma3:4b",
    max_tokens: int = 800,
) -> dict[str, Any]:
    """
    Returns a dict with:
        answer   — the LLM response string
        sources  — list of source metadata dicts used in context
        queries  — the expanded queries that were run
    """
    # 1. LLM-driven query expansion
    expanded_queries = expand_query(question, model=model)

    # 2. Retrieve chunks for all expanded queries
    all_docs: list[Document] = []
    for q in expanded_queries:
        chunks = hybrid_retrieve(q, contract_id)
        all_docs.extend(chunks)

    # 3. Deduplicate by normalised content hash
    unique_docs = deduplicate(all_docs)

    # 4. Cross-encoder rerank
    reranked_docs = rerank(question, unique_docs, top_k=6)

    # 5. Token-aware context building (includes section headers)
    context, sources = build_context(reranked_docs)

    # 6. Build prompt and call LLM
    prompt = PROMPT_TEMPLATE.format(context=context, question=question)
    response = ollama_generate(prompt, model=model, max_tokens=max_tokens)

    return {
        "answer": response.get("response", ""),
        "sources": sources,
        "queries": expanded_queries,
    }