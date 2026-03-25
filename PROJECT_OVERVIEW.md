# Contract Copilot AI: Comprehensive System Intelligence Overview

**Contract Copilot AI** is a state-of-the-art legal intelligence platform designed for the automated extraction, structured analysis, and proactive monitoring of contractual obligations, deadlines, and risks. 

The system follows a **"System 3" AI Orchestration Pattern** (Retrieval → Reasoning → Guarded Action), ensuring that every insight generated is grounded in the source text and actionable for the user.

---

## 1. Core Objective
Traditional contract management relies on manual review, which is error-prone and hard to scale. This project automates the entire lifecycle:
*   **Deciphering Complex Layouts**: Using layout-aware OCR for tables and headers.
*   **High-Precision Extraction**: Moving from "Naive RAG" to Hybrid RRF-based retrieval.
*   **Guaranteed Grounding**: Using multi-layered guards to prevent AI hallucinations.
*   **Actionable Intelligence**: Turning legal text into interactive dashboards and real-time alerts.

---

## 2. Technical Stack (The "Minute" Details)

### AI & Machine Learning Layer
*   **Orchestration**: `LangChain` & `LangGraph` for recursive multi-agent execution.
*   **LLM Engine**: `Ollama` running `gemma3:4b` locally for data privacy and low-latency reasoning.
*   **Embedding Model**: `HuggingFace` Sentence Transformers (Dense retrieval).
*   **Vector Storage**: `ChromaDB` with metadata persistence.
*   **Sparse Retriever**: `BM25` (Keyword-based) cached per contract.
*   **Reranker**: `Cross-Encoder` (`ms-marco-MiniLM-L-6-v2`) for deep semantic re-alignment.

### Document Processing Suite
*   **OCR Engine**: `PaddleOCR` + `PPStructureV3`. It doesn't just read text; it performs **Layout Analysis** to recognize tables, headers, and document hierarchy.
*   **Rasterization**: `PyMuPDF` (`fitz`) for PDF-to-image conversion at high DPI.
*   **Chunking strategy**: Recursive Character Text Splitting with specific legal-segment overlap.

### Backend Infrastructure
*   **Framework**: `FastAPI` (Asynchronous request handling).
*   **Database**: `SQLAlchemy` + `SQLite` (`system3.db`).
*   **Task Queue**: `Celery` + `Redis` for distributed background analysis.
*   **Notifications**: `SMTP` (Gmail) + `ICS Generator` for calendar event attachments.

### Frontend Dashboard
*   **Framework**: `Next.js 14` (App Router).
*   **UI Components**: `Tailwind CSS`, `ShadCN UI`, `Lucide Icons`.
*   **Analytics**: `Recharts` for risk distribution and KPI tracking.

---

## 3. High-Fidelity System Architecture

The project is structured to favor modularity and auditability:

```text
├── backend/
│   ├── agents/           # The Reasoning Core (Agents 1-6)
│   ├── orchestration/    # The Master Pipeline & Grounding Guards
│   ├── rag/              # Advanced Retrieval (Hybrid + Rerank + Expansion)
│   ├── ingestion/        # Document Parsing & OCR Pipeline
│   ├── database/         # Persistence (Models, Repositories)
│   ├── celery/           # Background Task Config
│   └── app/routers/      # API Interface
├── worker/               # Standalone analysis worker
├── frontend/             # Interactive User Interface
├── data/                 # Raw Contract Repository
├── output/               # Structured text & OCR Image artifacts
├── tests/                # Comprehensive Test Suite
└── docker-compose.yml    # Full-Stack Orchestration (Redis, Worker, API, UI)
```

---

## 4. End-to-End Execution Flow (Minute Detail)

### Phase 1: Ingestion & Geometric Analysis
1.  **PDF Rasterization**: The PDF is split into images.
2.  **Layout Analysis**: `PPStructure` identifies "Table", "Header", and "Text" regions.
3.  **Extraction**: Text is extracted and saved as structured Markdown to preserve bolding and hierarchy.
4.  **Indexing**: Chunks are stored in ChromaDB and a contract-specific BM25 index is built for the session.

### Phase 2: Hybrid Retrieval & Fusion
When a query is run (e.g., "Extract Payment Terms"):
1.  **Query Expansion**: LLM generates 3 variations of the query.
2.  **Parallel Retrieval**: Dense (Vector) and Sparse (BM25) results are pulled for all 4 queries.
3.  **Reciprocal Rank Fusion (RRF)**: Scores from different retrievers are fused into a single prioritized list.
4.  **Reranking**: The top 15 results are re-scored by the Cross-Encoder; only the top 6 most relevant chunks move to the next phase.

### Phase 3: The Multi-Agent Reasoning Loop
The system runs a 6-stage sequential agentic loop:
1.  **Agent 1 (Clause Parser)**: Pulls context and extracts raw legal clauses.
2.  **Agent 2 (Obligation Extractor)**: Identifies "Who" must do "What" by "When".
3.  **Grounding Guard**: Performs a **Lexical Overlap check (threshold > 0.25)** and an LLM-verification check to ensure the obligation is 100% factual.
4.  **Agent 3 (Deadline Engine)**: Normalizes vague dates (e.g., "Net 30") into specific timestamps relative to the `reference_date`.
5.  **Agent 4 (Risk Engine)**: Evaluates risks based on missing penalties or strictly binding language.
6.  **Agent 6 (Validator)**: Final audit for internal consistency and cross-clause conflicts.
7.  **Agent 5 (Action Planner)**: Creates a high-priority task list for the legal team.

### Phase 4: Persistence & Actions
1.  Results are saved to `system3.db`.
2.  Celery triggers a notification email to the configured recipient in `.env`.
3.  An `.ics` file is attached to the email for one-click calendar sync of deadlines.

---

## 5. Why This Project Stands Out (Unique Selling Points)

*   **System 3 RAG**: Most RAG systems just "retrieve and summarize". This system **Retrieves, Reasons, and Verifies**.
*   **Custom Grounding Guards**: It refuses to answer if it cannot find 25%+ lexical proof in the source chunks.
*   **Hybrid Search Fusion**: Combines the precision of keyword matching (BM25) with the semantic understanding of Vector search.
*   **Production Patterns**: Uses professional repository patterns, Celery task queues, and Docker orchestration instead of simple scripts.

---
**Confidentiality Note**: This overview is intended for internal architectural review and deep-dive technical assessment.
