import json
import time
from pathlib import Path
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
from backend.database.repository import save_contract_pipeline_result, save_pipeline_trace

# Evaluation
from backend.evaluation.ragas_runner import evaluate_contract

# Notifications (Async)
from backend.notifications.celery_tasks import trigger_notifications

# Output directories at project root
RESULTS_BASE_DIR = Path("output/final_results")
RESULTS_BASE_DIR.mkdir(parents=True, exist_ok=True)

def process_contract(
    contract_id: str,
    file_path: str,
    run_evaluation: bool = True,
    trigger_async_notifications: bool = True
):
    """
    Full Phase 4 Orchestration with OCR integration and file-based output saving.
    """
    start_total = time.time()

    # =====================================
    # 1️⃣ OCR & Ingestion (Enhanced)
    # =====================================
    start_step = time.time()
    docs = load_pdf(file_path)
    chunks = chunk_documents(docs)
    enriched_chunks = enrich_chunks(chunks, contract_id)
    duration = time.time() - start_step
    
    save_pipeline_trace(
        contract_id=contract_id,
        step_name="Ingestion",
        status="success",
        duration=duration,
        input_summary=f"Raw PDF: {Path(file_path).name}",
        output_summary=f"{len(enriched_chunks)} enriched chunks created",
        details=[f"Pages: {len(docs)}", f"Chunks: {len(chunks)}"]
    )

    # =====================================
    # 2️⃣ Vector Index Build
    # =====================================
    start_step = time.time()
    save_pipeline_trace(
        contract_id=contract_id,
        step_name="Vector Indexing",
        status="running",
        duration=0.0,
        input_summary=f"{len(enriched_chunks)} chunks",
        output_summary="Starting indexing...",
        details=["Ollama embedding start"]
    )
    build_or_update_vectorstore(enriched_chunks, contract_id)
    duration = time.time() - start_step
    
    save_pipeline_trace(
        contract_id=contract_id,
        step_name="Vector Indexing",
        status="success",
        duration=duration,
        input_summary=f"{len(enriched_chunks)} chunks",
        output_summary="ChromaDB updated",
        details=["Indexing complete", f"Contract ID: {contract_id}"]
    )

    # =====================================
    # 3️⃣ Run Hybrid RAG + Agents
    # =====================================
    start_step = time.time()
    result = run_contract_pipeline(contract_id)
    duration = time.time() - start_step
    
    save_pipeline_trace(
        contract_id=contract_id,
        step_name="AI Extraction",
        status="success",
        duration=duration,
        input_summary="Hybrid RAG + 6-Agent Pipeline",
        output_summary=f"{result.get('obligations_count', 0)} obligations, {result.get('risks_count', 0)} risks",
        details=[
            f"Clauses: {result.get('clauses_count', 0)}",
            f"Tasks: {result.get('tasks_count', 0)}",
            f"Validation: {result.get('validation_status', 'N/A')}"
        ]
    )

    # =====================================
    # 4️⃣ Database Persist
    # =====================================
    start_step = time.time()
    save_contract_pipeline_result(result)
    duration = time.time() - start_step

    save_pipeline_trace(
        contract_id=contract_id,
        step_name="Persistence",
        status="success",
        duration=duration,
        input_summary="Structured Analysis Result",
        output_summary="SQL Data Saved",
        details=["Upsert complete", "All relations linked"]
    )

    # =====================================
    # 5️⃣ File System Persist (New)
    # =====================================
    result_file_path = RESULTS_BASE_DIR / f"{contract_id}_analysis.json"
    with open(result_file_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=4, default=str)

    # =====================================
    # 6️⃣ Async Notifications
    # =====================================
    if trigger_async_notifications and "tasks" in result:
        trigger_notifications(result["tasks"])

    # =====================================
    # 7️⃣ Evaluation Pipeline
    # =====================================
    if run_evaluation:
        start_step = time.time()
        try:
            evaluation_scores = evaluate_contract(contract_id)
            result["evaluation"] = evaluation_scores
            duration = time.time() - start_step
            
            save_pipeline_trace(
                contract_id=contract_id,
                step_name="Ragas Evaluation",
                status="success",
                duration=duration,
                input_summary="Extraction results + Contract context",
                output_summary=f"F:{evaluation_scores.get('faithfulness', 0):.2f}, R:{evaluation_scores.get('answer_relevancy', 0):.2f}",
                details=["Ragas metrics computed", "Scores saved to DB"]
            )
            
            with open(result_file_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=4, default=str)
        except Exception as e:
            print(f"Evaluation failed: {e}")
            save_pipeline_trace(
                contract_id=contract_id,
                step_name="Ragas Evaluation",
                status="failed",
                duration=0.0,
                input_summary="Attempting evaluation",
                output_summary=f"Error: {str(e)}",
                details=[]
            )

    return result