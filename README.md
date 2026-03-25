# Contract Copilot AI: High-Performance Multi-Agent Legal Intelligence Platform

**Contract Copilot AI** is a production-grade system designed for high-precision contract analysis, obligation tracking, and risk management. Using a "System 3" architecture, it combines layout-aware OCR, hybrid RAG (Retrieval-Augmented Generation), and a multi-agent orchestration layer to deliver grounded and actionable legal insights.

---

## 📂 Detailed Project Structure

```text
├── backend/
│   ├── agents/             # Modular LLM Agents for specialized extraction
│   │   ├── agent1_clause_parser.py        # Extracts raw legal clauses via RAG context
│   │   ├── agent2_obligation_extractor.py # Identifies binding parties and duties
│   │   ├── agent3_deadline_engine.py      # Normalizes complex dates into ISO formats
│   │   ├── agent4_risk_engine.py          # Categorizes legal risks & impact severity
│   │   ├── agent5_action_planner.py       # Generates strategic post-analysis tasks
│   │   └── agent6_validator.py           # Cross-checks extractions vs source grounding
│   ├── app/routers/        # FastAPI REST API endpoints
│   ├── celery/             # Celery task queue & broker configuration
│   ├── database/           # SQLite + SQLAlchemy persistence layer
│   ├── ingestion/          # Document processing & OCR pipeline
│   │   ├── ppstructure_parser.py          # PaddleOCR-based layout & table analysis
│   │   ├── chunker.py                     # Recursive character-based text splitting
│   │   └── pdf_loader.py                  # PyMuPDF-based document rasterization
│   ├── orchestration/      # Pipeline flow control & grounding guards
│   ├── rag/                # Advanced Retrieval core
│   │   ├── hybrid_retriever.py            # RRF fusion logic (Dense + Sparse)
│   │   ├── rag_chain.py                   # Query expansion & cross-encoder reranking
│   │   └── vectorstore.py                 # ChromaDB collection management
│   └── notifications/      # SMTP email alerts & ICS calendar generation
├── data/                   # Input repository for raw PDF/Image contracts
├── frontend/               # Next.js 14+ Dashboard & Interactive Timeline
├── output/                 # Artifact storage (extracted text, OCR page images)
├── worker/                 # Single-script entry for Celery background workers
└── main.py                 # Unified FastAPI entry point
```

---

## 🛠️ System Architecture & Data Flow

### 1. Ingestion & Reasoning Pipeline
1.  **OCR Ingestion**: Contracts are processed via `PaddleOCR` (PPStructureV3). Layout analysis identifies tables and headers, preserving semantic hierarchy.
2.  **Hybrid RAG**: Retrieval uses **Reciprocal Rank Fusion (RRF)** to combine keyword results (BM25) with semantic results (ChromaDB Vector Search).
3.  **Cross-Encoder Reranking**: Chunks are re-scored using `ms-marco-MiniLM-L-6-v2` to ensure the top context is 100% relevant to the specific clause being analyzed.
4.  **Multi-Agent Orchestration**: Six specialized agents execute sequentially. **Agent 6 (Validator)** uses a **Grounding Guard** to verify each extraction against the source text using lexical overlap thresholds.

### 2. Monitoring & Actions
*   **Notifications**: Asynchronous Celery tasks monitor extracted obligations and send automated email reminders + ICS calendar invites.
*   **Evaluation**: The system is calibrated using **RAGAS** metrics (Faithfulness, Recall, Relevancy) to maintain high legal precision.

---

## ⚙️ Essential Setup Information

### 1. Prerequisites (Strict)
*   **Python**: 3.10 or 3.11 (Recommended)
*   **Ollama**: Install and run locally. Execute `ollama pull gemma3:4b`.
*   **Redis**: Required as the message broker for Celery notifications.
*   **Hardware**: A GPU (NVIDIA 8GB+ VRAM) is strongly recommended for `PaddleOCR` and `Sentence Transformers`.

### 2. Environment Configuration (`.env`)
Ensure the following keys are present in your root `.env`:
```env
# Backend & RAG
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=gemma3:4b

# Database & Broker
REDIS_URL=redis://localhost:6379/0

# Notifications (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
NOTIFICATION_RECIPIENT=alerts-receiver@company.com
```

### 3. Service Execution Order (Standard)
To run the full system manually, start services in this specific order:
1.  **Ollama**: `ollama serve`
2.  **Redis Server**: Ensure Redis is running (Windows: `redis-server.exe`).
3.  **FastAPI Backend**: `uvicorn main:app --reload --port 8001`
4.  **Celery Worker**: `celery -A backend.celery.celery_app worker --loglevel=info`
5.  **Frontend**: `npm run dev` (within `/frontend`)

### 4. Docker Orchestration (Recommended)
The fastest way to start the entire system (Redis, Backend, Worker, Frontend) is using Docker Compose:

```bash
# Build and start all services
docker compose up --build
```

**Note**: When running in Docker, the system is configured to look for **Ollama** at `http://host.docker.internal:11434`. Ensure Ollama is running on your host machine.

---

## 📡 API Endpoints Summary

| Route | Method | Description |
| :--- | :--- | :--- |
| `/analyze` | POST | Trigger the 6-agent pipeline for a new contract document. |
| `/stats` | GET | Global metrics for dashboard KPI cards. |
| `/risks` | GET | Comprehensive risk feed for the Risks Dashboard. |
| `/timeline` | GET | Calendar-ready events for the Timeline Dashboard. |
| `/test-email` | POST | Verification endpoint for SMTP configuration. |

---

## 🔥 Why This Matters (Resume Snapshot)
*   **Solves Hallucinations**: Implements a dedicated **Grounding Guard** layer that cross-references LLM outputs against source chunks before persistence.
*   **Advanced Retrieval**: Moving beyond "Naive RAG" with **Multi-Query Expansion** and **Reranking**.
*   **Industrial OCR**: Uses `PPStructure` to handle real-world document messiness (columns, tables, varying fonts).
*   **Production Patterns**: Uses Asynchronous Task Queues (Celery) and Repository patterns for clean, scalable backend design.

---
**Technical Note**: If encountering `shm.dll` errors on Windows during torch loading, ensure `import torch` is the first line in your entry scripts.
