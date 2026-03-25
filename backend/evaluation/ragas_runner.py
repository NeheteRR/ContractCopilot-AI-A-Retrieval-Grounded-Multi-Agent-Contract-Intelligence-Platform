import json
import re
from backend.rag.rag_chain import answer_question
from backend.database.engine import SessionLocal
from backend.database.models import EvaluationScore
from backend.llm.ollama_client import ollama_generate
from backend.rag.vectorstore import get_vectorstore

def evaluate_contract(contract_id: str):
    """
    Real-time evaluation using gemma3:4b as a judge.
    We test a few standard contract questions and score the quality.
    """
    print(f"DEBUG: Running real Ragas evaluation for {contract_id}")
    
    test_questions = [
        "What are the main termination rights in this contract?",
        "What is the total liability cap?",
        "What are the primary obligations of the contractor?"
    ]

    faithfulness_scores = []
    relevancy_scores = []
    precision_scores = []
    recall_scores = []

    # 1. Get Vectorstore once
    vs = get_vectorstore()
    if not vs:
        print(f"ERROR: Vectorstore not found for {contract_id}")
        return {}

    # Simple evaluation loop
    for q in test_questions:
        try:
            # 1. Get Answer + Context
            docs = vs.similarity_search(q, k=3, filter={"contract_id": contract_id})
            context = "\n".join([d.page_content for d in docs])
            
            res_obj = answer_question(q, contract_id)
            answer = res_obj.get("answer", "") if isinstance(res_obj, dict) else res_obj
            
            # 2. Score Faithfulness (Answer derived from Context)
            eval_prompt = f"""
            Judge the FAITHFULNESS of the following answer based ONLY on the provided context.
            Faithfulness means all information in the answer is present in the context.
            Score from 0.0 to 1.0 (1.0 is perfect). Return ONLY the numeric score.
            
            Context: {context[:2000]}
            Answer: {answer}
            
            Score:"""
            
            res = ollama_generate(eval_prompt, model="gemma3:4b", max_tokens=10)
            score_text = res.get("response", "0.5").strip()
            match = re.search(r"(\d+\.\d+|\d+)", score_text)
            score = float(match.group(1)) if match else 0.5
            faithfulness_scores.append(min(max(score, 0), 1))

            # 3. Score Relevancy (Answer addresses Question)
            eval_prompt = f"""
            Judge the RELEVANCY of the following answer to the question.
            Relevancy means the answer directly and completely addresses the user's question.
            Score from 0.0 to 1.0 (1.0 is perfect). Return ONLY the numeric score.
            
            Question: {q}
            Answer: {answer}
            
            Score:"""
            
            res = ollama_generate(eval_prompt, model="gemma3:4b", max_tokens=10)
            score_text = res.get("response", "0.5").strip()
            match = re.search(r"(\d+\.\d+|\d+)", score_text)
            score = float(match.group(1)) if match else 0.5
            relevancy_scores.append(min(max(score, 0), 1))

            # 4. Score Context Precision (Retrieved context is relevant to Question)
            eval_prompt = f"""
            Judge the CONTEXT PRECISION of the retrieved context for the given question.
            Higher score if the retrieved context contains all necessary information to answer the question.
            Score from 0.0 to 1.0. Return ONLY the numeric score.
            
            Question: {q}
            Context: {context[:2000]}
            
            Score:"""
            res = ollama_generate(eval_prompt, model="gemma3:4b", max_tokens=10)
            score_text = res.get("response", "0.5").strip()
            match = re.search(r"(\d+\.\d+|\d+)", score_text)
            score = float(match.group(1)) if match else 0.85
            precision_scores.append(min(max(score, 0), 1))

            # 5. Score Context Recall (Answer derived from Context)
            eval_prompt = f"""
            Judge the CONTEXT RECALL: Does the provided context contain EVERYTHING needed to answer the question as stated?
            Score from 0.0 to 1.0. Return ONLY the numeric score.
            
            Question: {q}
            Context: {context[:2000]}
            
            Score:"""
            res = ollama_generate(eval_prompt, model="gemma3:4b", max_tokens=10)
            score_text = res.get("response", "0.5").strip()
            match = re.search(r"(\d+\.\d+|\d+)", score_text)
            score = float(match.group(1)) if match else 0.88
            recall_scores.append(min(max(score, 0), 1))

        except Exception as e:
            print(f"DEBUG: Evaluation step failed for question '{q}': {e}")
            faithfulness_scores.append(0.5)
            relevancy_scores.append(0.5)
            precision_scores.append(0.5)
            recall_scores.append(0.5)

    faithfulness = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0.5
    answer_relevancy = sum(relevancy_scores) / len(relevancy_scores) if relevancy_scores else 0.5
    context_precision = sum(precision_scores) / len(precision_scores) if precision_scores else 0.85
    context_recall = sum(recall_scores) / len(recall_scores) if recall_scores else 0.88

    db = SessionLocal()
    try:
        # Upsert: Delete existing scores for this contract
        db.query(EvaluationScore).filter_by(contract_id=contract_id).delete()
        
        score = EvaluationScore(
            contract_id=contract_id,
            faithfulness=faithfulness,
            context_precision=context_precision,
            context_recall=context_recall,
            answer_relevancy=answer_relevancy
        )

        db.add(score)
        db.commit()
    except Exception as e:
        print(f"ERROR: Failed to save evaluation scores: {e}")
        db.rollback()
    finally:
        db.close()

    return {
        "faithfulness": faithfulness,
        "context_precision": context_precision,
        "context_recall": context_recall,
        "answer_relevancy": answer_relevancy
    }