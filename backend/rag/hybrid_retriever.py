from typing import List
from langchain_core.documents import Document
from langchain_community.retrievers import BM25Retriever

from backend.rag.vectorstore import get_vectorstore

# Global BM25 cache (per contract)
bm25_cache: dict[str, tuple[BM25Retriever, list[Document]]] = {}


# -------------------------------------------------------
# Build BM25 for a contract — preserves original Documents
# so metadata (contract_id, section, etc.) is never lost.
# -------------------------------------------------------
def build_bm25(contract_id: str) -> tuple[BM25Retriever, list[Document]]:
    vectordb = get_vectorstore()

    # Use a real representative query to seed reliably.
    # Multiple broad seeds cover the full contract better
    # than a single empty-query hack.
    seed_queries = [
        "contract obligation payment termination liability",
        "party agreement clause section",
        "confidential intellectual property warranty",
    ]

    seen_ids: set[str] = set()
    all_docs: list[Document] = []

    for seed in seed_queries:
        results = vectordb.similarity_search(
            query=seed,
            k=500,
            filter={"contract_id": contract_id},
        )
        for doc in results:
            # Deduplicate by content to avoid repeated chunks
            content_key = doc.page_content.strip()
            if content_key not in seen_ids:
                seen_ids.add(content_key)
                all_docs.append(doc)

    if not all_docs:
        raise ValueError(f"No documents found for contract_id={contract_id!r}")

    texts = [d.page_content for d in all_docs]
    bm25 = BM25Retriever.from_texts(texts)
    bm25.k = 20

    # Return both the retriever AND the original docs so we
    # can map BM25 results back to their full Document objects.
    return bm25, all_docs


def get_bm25(contract_id: str) -> tuple[BM25Retriever, list[Document]]:
    if contract_id not in bm25_cache:
        bm25_cache[contract_id] = build_bm25(contract_id)
    return bm25_cache[contract_id]


def invalidate_bm25_cache(contract_id: str) -> None:
    """Call this after uploading a new version of a contract."""
    bm25_cache.pop(contract_id, None)


# -------------------------------------------------------
# Dense retrieval
# -------------------------------------------------------
def dense_retrieve(query: str, contract_id: str, k: int = 10) -> list[Document]:
    vectordb = get_vectorstore()
    retriever = vectordb.as_retriever(
        search_kwargs={"k": k, "filter": {"contract_id": contract_id}}
    )
    return retriever.invoke(query)


# -------------------------------------------------------
# BM25 retrieval — returns full Documents (with metadata)
# -------------------------------------------------------
def bm25_retrieve(query: str, contract_id: str) -> list[Document]:
    bm25, source_docs = get_bm25(contract_id)

    # BM25Retriever returns new Document objects that have lost
    # metadata. We map back by content to restore the originals.
    raw_results = bm25.invoke(query)
    content_to_doc = {d.page_content: d for d in source_docs}

    restored: list[Document] = []
    for r in raw_results:
        original = content_to_doc.get(r.page_content)
        restored.append(original if original is not None else r)

    return restored


# -------------------------------------------------------
# Reciprocal Rank Fusion — now returns full Documents
# -------------------------------------------------------
def reciprocal_rank_fusion(
    results_list: list[list[Document]], k: int = 60
) -> list[Document]:
    scores: dict[str, float] = {}
    content_to_doc: dict[str, Document] = {}

    for docs in results_list:
        for rank, doc in enumerate(docs):
            content = doc.page_content.strip()
            if content not in scores:
                scores[content] = 0.0
                content_to_doc[content] = doc
            scores[content] += 1.0 / (k + rank + 1)

    sorted_contents = sorted(scores, key=lambda c: scores[c], reverse=True)
    return [content_to_doc[c] for c in sorted_contents]


# -------------------------------------------------------
# Main hybrid retriever — returns Document objects
# -------------------------------------------------------
def hybrid_retrieve(
    query: str, contract_id: str, k: int = 8
) -> list[Document]:
    dense_docs = dense_retrieve(query, contract_id, k=15)
    keyword_docs = bm25_retrieve(query, contract_id)
    fused_docs = reciprocal_rank_fusion([dense_docs, keyword_docs])
    return fused_docs[:k]