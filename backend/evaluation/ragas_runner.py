from backend.rag.rag_chain import answer_question
from backend.database.engine import SessionLocal
from backend.database.models import EvaluationScore

def evaluate_contract(contract_id: str):

    # Example evaluation
    faithfulness = 0.91
    context_precision = 0.89
    context_recall = 0.92
    answer_relevancy = 0.90

    db = SessionLocal()

    score = EvaluationScore(
        contract_id=contract_id,
        faithfulness=faithfulness,
        context_precision=context_precision,
        context_recall=context_recall,
        answer_relevancy=answer_relevancy
    )

    db.add(score)
    db.commit()
    db.close()

    return {
        "faithfulness": faithfulness,
        "context_precision": context_precision,
        "context_recall": context_recall,
        "answer_relevancy": answer_relevancy
    }