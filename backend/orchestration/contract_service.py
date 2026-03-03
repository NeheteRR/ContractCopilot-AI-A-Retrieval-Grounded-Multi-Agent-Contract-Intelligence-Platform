from datetime import date

# Ingestion
from backend.ingestion.pdf_loader import load_pdf
from backend.ingestion.chunker import chunk_documents
from backend.ingestion.metadata_enricher import enrich_chunks

# RAG
from backend.rag.vectorstore import build_or_update_vectorstore

# Pipeline
from backend.orchestration.pipeline import run_contract_pipeline

# Persistence
from backend.database.repository import save_contract_pipeline_result

# Evaluation
from backend.evaluation.ragas_runner import evaluate_contract

# Notifications (Async)
from backend.notifications.celery_tasks import trigger_notifications


def process_contract(
    contract_id: str,
    file_path: str,
    run_evaluation: bool = True,
    trigger_async_notifications: bool = True
):
    """
    Full Phase 4 Orchestration
    """

    # =====================================
    # 1️⃣ Upload & Ingestion
    # =====================================

    docs = load_pdf(file_path)

    chunks = chunk_documents(docs)

    enriched_chunks = enrich_chunks(chunks, contract_id)

    # =====================================
    # 2️⃣ Vector Index Build
    # =====================================

    build_or_update_vectorstore(enriched_chunks, contract_id)

    # =====================================
    # 3️⃣ Run Hybrid RAG + Agents
    # =====================================

    result = run_contract_pipeline(contract_id)

    # =====================================
    # 4️⃣ Database Persist
    # =====================================

    save_contract_pipeline_result(result)

    # =====================================
    # 5️⃣ Async Notifications
    # =====================================

    if trigger_async_notifications:
        trigger_notifications(result["tasks"])

    # =====================================
    # 6️⃣ Evaluation Pipeline
    # =====================================

    if run_evaluation:
        evaluation_scores = evaluate_contract(contract_id)
        result["evaluation"] = evaluation_scores

    return result