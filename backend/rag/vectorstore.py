from __future__ import annotations

import os

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from backend.rag.embeddings import embeddings

CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")


def get_vectorstore() -> Chroma:
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
    )


# -------------------------------------------------------
# Section detection
# Ordered from most specific → least specific so that
# compound clauses (e.g. "payment and termination") land
# in the most legally significant category.
# -------------------------------------------------------
_SECTION_RULES: list[tuple[str, list[str]]] = [
    ("indemnification", ["indemnif", "hold harmless", "defend"]),
    ("liability",       ["limit.*liabilit", "liabilit", "damage", "consequential"]),
    ("termination",     ["terminat", "cancel", "expir", "cessation"]),
    ("payment",         ["payment", "invoice", "fee", "price", "compensation", "remunerat"]),
    ("confidentiality", ["confidential", "non-disclosure", "nda", "proprietary"]),
    ("intellectual_property", ["intellectual property", "ip ", "patent", "trademark", "copyright", "license"]),
    ("dispute",         ["dispute", "arbitrat", "mediati", "jurisdiction", "governing law"]),
    ("warranty",        ["warrant", "represent", "guarantee"]),
    ("force_majeure",   ["force majeure", "act of god", "unforeseen"]),
    ("definitions",     ["means ", "defined as", "definition", "\"herein\""]),
]


def detect_section(text: str) -> str:
    import re
    lowered = text.lower()
    for section, patterns in _SECTION_RULES:
        if any(re.search(p, lowered) for p in patterns):
            return section
    return "general"


# -------------------------------------------------------
# Build / update the vectorstore
# -------------------------------------------------------
def build_or_update_vectorstore(
    docs: list[Document], contract_id: str
) -> Chroma:
    vectordb = get_vectorstore()

    for doc in docs:
        section = detect_section(doc.page_content)
        doc.metadata = {
            **doc.metadata,           # preserve any existing metadata
            "contract_id": contract_id,
            "section": section,
        }

    print(
        f"[VectorStore] Adding {len(docs)} docs for contract_id={contract_id!r} ..."
    )
    try:
        vectordb.add_documents(docs)
        print("[VectorStore] Documents added successfully.")
    except Exception as exc:
        print(f"[VectorStore] ERROR: {exc}")
        raise

    return vectordb