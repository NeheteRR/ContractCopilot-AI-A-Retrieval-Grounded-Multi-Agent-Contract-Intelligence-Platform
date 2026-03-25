import torch # CRITICAL: Load torch DLLs first on Windows to avoid shm.dll errors
import os
import shutil
import json
from pathlib import Path
from typing import Optional, List, Dict
from urllib.parse import unquote, quote
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# Internal Imports
from backend.orchestration.contract_service import process_contract
from backend.rag.rag_chain import answer_question
from backend.rag.vectorstore import get_vectorstore
from backend.database.engine import SessionLocal
from backend.database.models import Contract, Obligation, Risk, EvaluationScore, Clause, EmailLog
from sqlalchemy import func
from datetime import datetime

from backend.app.routers.auth import router as auth_router
from backend.app.routers.contracts import router as contracts_router
from backend.app.routers.dashboard import router as dashboard_router
from backend.app.routers.evaluation import router as eval_router
from backend.app.routers.obligations import router as obligations_router
from backend.app.routers.risks import router as risks_router
from backend.app.routers.timeline import router as timeline_router
# Setup Directories
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"

DATA_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

from backend.database.init_db import init_db

app = FastAPI(title="Contract Copilot AI Backend")

# Initialize Database
init_db()

app.include_router(auth_router)
app.include_router(contracts_router)
app.include_router(dashboard_router)
app.include_router(eval_router)
app.include_router(obligations_router)
app.include_router(risks_router)
app.include_router(timeline_router)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://[::1]:3000",
        "http://[::1]:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Output directory
app.mount("/output", StaticFiles(directory="output"), name="output")

class ChatRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"message": "Contract Copilot AI API is running"}

@app.post("/analyze")
async def analyze_contract(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    contract_id = unquote(Path(file.filename).stem)
    file_path = DATA_DIR / file.filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Run in background
    background_tasks.add_task(
        process_contract,
        contract_id=contract_id,
        file_path=str(file_path),
        run_evaluation=True,
        trigger_async_notifications=True
    )
    
    return {
        "status": "processing",
        "contract_id": contract_id,
        "message": "Analysis started in background"
    }

@app.get("/stats")
def get_dashboard_stats():
    db = SessionLocal()
    try:
        total_contracts = db.query(Contract).count()
        total_obligations = db.query(Obligation).count()
        
        # High risks count (severity == 'high' or score >= 6)
        high_risks = db.query(Risk).filter((Risk.severity.ilike('high')) | (Risk.risk_score >= 6)).count()
        medium_risks = db.query(Risk).filter((Risk.severity.ilike('medium')) | ((Risk.risk_score >= 3) & (Risk.risk_score < 6))).count()
        low_risks = db.query(Risk).filter((Risk.severity.ilike('low')) | (Risk.risk_score < 3)).count()

        # Deadlines approaching
        today_str = datetime.now().date().isoformat()
        upcoming_deadlines = db.query(Obligation).filter(
            Obligation.normalized_due_date >= today_str
        ).count()
        
        return {
            "totalContracts": total_contracts,
            "activeObligations": total_obligations,
            "highRisks": high_risks,
            "upcomingDeadlines": upcoming_deadlines,
            "riskDistribution": [
                {"name": "High Risk", "value": high_risks, "color": "oklch(0.6 0.2 25)"},
                {"name": "Medium Risk", "value": medium_risks, "color": "oklch(0.8 0.15 85)"},
                {"name": "Low Risk", "value": low_risks, "color": "oklch(0.72 0.15 180)"},
            ]
        }
    finally:
        db.close()

@app.get("/dashboard/stats")
def get_sidebar_stats():
    db = SessionLocal()
    try:
        contracts_count = db.query(Contract).count()
        risks_count = db.query(Risk).count()
        obligations_count = db.query(Obligation).count()
        
        return {
            "contracts": contracts_count,
            "risks": risks_count,
            "obligations": obligations_count
        }
    finally:
        db.close()

@app.get("/contracts")
async def list_contracts():
    db = SessionLocal()
    try:
        contracts = db.query(Contract).all()
        result = []
        for c in contracts:
            obs_count = db.query(Obligation).filter_by(contract_id=c.id).count()
            risks_count = db.query(Risk).join(Obligation).filter(Obligation.contract_id == c.id).count()
            
            result.append({
                "id": c.id,
                "name": c.name or c.id,
                "type": "Standard",
                "status": "Completed", 
                "uploadDate": c.upload_date.isoformat() if c.upload_date else "Unknown",
                "obligations": obs_count,
                "risks": risks_count
            })
            
        return sorted(result, key=lambda x: x["uploadDate"], reverse=True)
    finally:
        db.close()

@app.get("/deadlines")
def get_deadlines():
    db = SessionLocal()
    try:
        obligations = db.query(Obligation).filter(Obligation.normalized_due_date.isnot(None)).all()
        result = []
        for o in obligations:
            try:
                due_date = datetime.strptime(o.normalized_due_date, "%Y-%m-%d").date()
                days_left = (due_date - datetime.now().date()).days
            except:
                days_left = 30
                
            c_name = o.contract.name if o.contract and o.contract.name else o.contract_id
            
            result.append({
                "id": str(o.id),
                "contract": c_name,
                "deadline": o.normalized_due_date,
                "daysLeft": days_left,
                "type": o.action_required[:30] + "..." if o.action_required else "Deadline",
                "priority": "high" if o.risk_score and o.risk_score >= 6 else "medium"
            })
            
        result.sort(key=lambda x: x["daysLeft"])
        return result[:10]
    finally:
        db.close()



@app.get("/risks")
def get_all_risks():
    db = SessionLocal()
    try:
        # Join Risk with Obligation and Contract to get full context
        query = (
            db.query(Risk, Obligation, Contract)
            .join(Obligation, Risk.obligation_id == Obligation.id)
            .join(Contract, Obligation.contract_id == Contract.id)
            .all()
        )
        
        result = []
        for risk, ob, cert in query:
            result.append({
                "id": risk.id,
                "contractId": cert.id,
                "contract": cert.name,
                "title": ob.action_required[:50] + "..." if len(ob.action_required) > 50 else ob.action_required,
                "description": ob.action_required,
                "category": risk.category,
                "severity": risk.severity.lower() if risk.severity else "medium",
                "impactScore": risk.risk_score or 5.0,
                "recommendation": "Review clause for compliance."
            })
        return result
    finally:
        db.close()

@app.get("/timeline")
def get_global_timeline():
    db = SessionLocal()
    try:
        # Fetch obligations with deadlines
        query = (
            db.query(Obligation, Contract)
            .join(Contract, Obligation.contract_id == Contract.id)
            .filter(Obligation.normalized_due_date != None)
            .all()
        )
        
        result = []
        for ob, cert in query:
            # Simple risk mapping for timeline
            risk_level = "low"
            if ob.risk_score and ob.risk_score > 0.7:
                risk_level = "high"
            elif ob.risk_score and ob.risk_score > 0.4:
                risk_level = "medium"

            result.append({
                "id": f"OB-{ob.id}",
                "date": ob.normalized_due_date,
                "title": ob.action_required[:40] + "..." if len(ob.action_required) > 40 else ob.action_required,
                "contract": cert.name,
                "contractId": cert.id,
                "type": "deadline",
                "riskLevel": risk_level
            })
        return result
    finally:
        db.close()

@app.get("/obligations")
def get_all_obligations():
    db = SessionLocal()
    try:
        obligations = db.query(Obligation).all()
        result = []
        for o in obligations:
            c_name = o.contract.name if o.contract and o.contract.name else o.contract_id
            result.append({
                "id": str(o.id),
                "title": o.action_required[:50] + "..." if o.action_required else "Obligation",
                "contract": c_name,
                "contractId": o.contract_id,
                "clauseRef": "N/A", 
                "deadline": o.normalized_due_date or o.raw_deadline or "Unknown",
                "riskLevel": "high" if o.risk_score and o.risk_score >= 6 else "low",
                "status": o.validation_status.lower() if o.validation_status else "pending"
            })
        return result
    finally:
        db.close()

@app.get("/evaluations")
def get_evaluations():
    db = SessionLocal()
    try:
        evals = db.query(EvaluationScore).all()
        recent_evals = []
        
        for e in evals:
            c = db.query(Contract).filter_by(id=e.contract_id).first()
            c_name = c.name if c and c.name else e.contract_id
            c_date = c.upload_date.isoformat() if c and c.upload_date else datetime.now().date().isoformat()
            
            f_score = e.faithfulness or 0.0
            r_score = e.answer_relevancy or 0.0
            rec_score = e.context_recall or 0.0
            
            recent_evals.append({
                "id": f"EVAL-{str(e.contract_id)[:8].upper()}",
                "contract": c_name,
                "date": c_date,
                "faithfulness": round(f_score * 100, 1),
                "relevance": round(r_score * 100, 1),
                "recall": round(rec_score * 100, 1),
                "status": "passed" if f_score > 0.9 else "review"
            })
            
        recent_evals = sorted(recent_evals, key=lambda x: x["date"], reverse=True)[:15]
        
        if not recent_evals:
            avg_faith, avg_rel, avg_rec = 0, 0, 0
            trend_data = []
        else:
            avg_faith = sum(e["faithfulness"] for e in recent_evals) / len(recent_evals)
            avg_rel = sum(e["relevance"] for e in recent_evals) / len(recent_evals)
            avg_rec = sum(e["recall"] for e in recent_evals) / len(recent_evals)
            
            trend_data = []
            for e in list(reversed(recent_evals[:6])):
                trend_data.append({
                    "date": e["date"][5:],
                    "faithfulness": e["faithfulness"],
                    "relevance": e["relevance"],
                    "recall": e["recall"]
                })
            
        metrics = [
            {
                "name": "Faithfulness",
                "value": round(avg_faith, 1),
                "change": 0.0,
                "isPositive": True,
                "description": "Measures how factually accurate the AI responses are compared to source documents",
                "target": 95,
            },
            {
                "name": "Relevance",
                "value": round(avg_rel, 1),
                "change": 0.0,
                "isPositive": True,
                "description": "Evaluates how well the extracted information relates to the query context",
                "target": 90,
            },
            {
                "name": "Recall",
                "value": round(avg_rec, 1),
                "change": 0.0,
                "isPositive": True,
                "description": "Measures the completeness of information extraction from source documents",
                "target": 88,
            }
        ]
        
        return {
            "trendData": trend_data,
            "metrics": metrics,
            "recentEvaluations": recent_evals
        }
    finally:
        db.close()



@app.get("/notifications")
def get_notifications():
    db = SessionLocal()
    try:
        # Fetch the latest 10 email logs to represent system notifications
        logs = db.query(EmailLog).order_by(EmailLog.id.desc()).limit(10).all()
        result = []
        for log in logs:
            # Map status/subject to a more user-friendly format for the feed
            ntype = "success" if "sent" in log.status.lower() else "warning"
            icon_type = "info" if "reminder" in log.subject.lower() else "warning"
            
            result.append({
                "id": log.id,
                "title": log.subject,
                "description": f"Status: {log.status} to {log.recipient}",
                "time": "Recent",
                "type": ntype
            })
        return result
    finally:
        db.close()

@app.post("/test-email")
async def test_email_notification():
    from backend.notifications.notification_service import NotificationService
    try:
        mock_task = {
            "title": "Manual SMTP Test",
            "due_date": datetime.now().strftime("%Y-%m-%d"),
            "priority": "High"
        }
        NotificationService.send_deadline_alert(mock_task)
        return {"status": "success", "message": "Test email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")

@app.get("/contracts/{contract_id}")
def get_contract_details(contract_id: str):
    print(f"DEBUG: Fetching details for contract_id: '{contract_id}'")
    db = SessionLocal()
    try:
        # Try multiple ID forms to handle encoding mismatches
        candidates = [contract_id, unquote(contract_id), quote(contract_id)]
        contract = None
        for cid in candidates:
            contract = db.query(Contract).filter_by(id=cid).first()
            if contract:
                contract_id = cid  # use the matched form
                break
            
        if not contract:
            # Fallback to JSON if DB entry is missing
            result_path = OUTPUT_DIR / "final_results" / f"{unquote(contract_id)}_analysis.json"
            if result_path.exists():
                with open(result_path, "r") as f:
                    return json.load(f)
            raise HTTPException(status_code=404, detail="Contract not found")
        
        clauses = db.query(Clause).filter_by(contract_id=contract_id).all()
        obligations = db.query(Obligation).filter_by(contract_id=contract_id).all()
        
        # Get risks via obligations
        risks = db.query(Risk).join(Obligation).filter(Obligation.contract_id == contract_id).all()
        
        return {
            "id": contract.id,
            "name": contract.name or contract.id,
            "upload_date": contract.upload_date.isoformat() if contract.upload_date else None,
            "clauses": [
                {
                    "type": c.clause_type,
                    "text": c.text,
                    "source": f"Section {c.id}" # Placeholder for source
                } for c in clauses
            ],
            "obligations": [
                {
                    "id": o.id,
                    "action_required": o.action_required,
                    "responsible_party": o.responsible_party,
                    "deadline": {"raw": o.raw_deadline, "normalized": o.normalized_due_date},
                    "risk_level": "high" if o.risk_score and o.risk_score >= 6 else "low",
                    "source_clause": next((c.text[:100] for c in clauses if c.id == o.clause_id), "N/A")
                } for o in obligations
            ],
            "risks": [
                {
                    "id": r.id,
                    "title": r.category or "Risk",
                    "description": f"Risk identified in obligation {r.obligation_id}",
                    "severity": r.severity or "medium",
                    "impactScore": r.risk_score or 5.0
                } for r in risks
            ]
        }
    finally:
        db.close()

@app.get("/contracts/{contract_id}/status")
def get_contract_status(contract_id: str):
    print(f"DEBUG: Checking status for contract_id: '{contract_id}'")
    db = SessionLocal()
    try:
        # Try multiple ID forms
        candidates = [contract_id, unquote(contract_id), quote(contract_id)]
        contract = None
        for cid in candidates:
            contract = db.query(Contract).filter_by(id=cid).first()
            if contract:
                break
            
        if contract:
            return {"status": "completed", "progress": 100}
            
        # 2. Check Traces (Granular progress)
        from backend.database.models import PipelineTrace
        traces = db.query(PipelineTrace).filter_by(contract_id=contract_id).all()
        trace_steps = {t.step_name: t.status for t in traces}
        
        if "Ragas Evaluation" in trace_steps: return {"status": "processing", "progress": 95}
        if "Persistence" in trace_steps: return {"status": "processing", "progress": 85}
        if "AI Extraction" in trace_steps: return {"status": "processing", "progress": 70}
        if "Vector Indexing" in trace_steps:
             if trace_steps["Vector Indexing"] == "success":
                 return {"status": "processing", "progress": 60}
             return {"status": "processing", "progress": 50}
        if "Ingestion" in trace_steps: return {"status": "processing", "progress": 30}

        # 3. Check file system as fallbacks
        images_dir = OUTPUT_DIR / "contract_images" / contract_id
        if images_dir.exists():
            return {"status": "processing", "progress": 40}
            
        return {"status": "not_found", "progress": 0}
    finally:
        db.close()

@app.post("/contracts/{contract_id}/chat")
async def chat_with_contract(contract_id: str, request: ChatRequest):
    # Retrieve context from vector store
    try:
        # Use centralized RAG pipeline
        result = answer_question(request.message, contract_id)
        
        return {
            "response": result.get("answer", "I couldn't generate an answer."),
            "sources": result.get("sources", []),
            "queries": result.get("queries", [])
        }
    except Exception as e:
        print(f"Chat Error for contract {contract_id}: {e}")
        return {"response": f"AI Error: {str(e)}", "sources": [], "queries": []}

@app.get("/contracts/{contract_id}/trace")
def get_contract_trace(contract_id: str):
    from backend.database.models import PipelineTrace
    db = SessionLocal()
    try:
        traces = db.query(PipelineTrace).filter_by(contract_id=contract_id).all()
        result = []
        for t in traces:
            result.append({
                "id": t.id,
                "name": t.step_name,
                "status": t.status,
                "duration": t.duration,
                "input": t.input_summary,
                "output": t.output_summary,
                "details": json.loads(t.details_json) if t.details_json else []
            })
        return result
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
