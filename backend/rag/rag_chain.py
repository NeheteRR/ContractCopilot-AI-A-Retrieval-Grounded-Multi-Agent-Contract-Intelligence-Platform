from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.llm.ollama_client import ollama_generate
from backend.rag.hybrid_retriever import hybrid_retrieve


PROMPT_TEMPLATE = """
You are a contract analysis assistant.

Use ONLY the provided context.
If answer not found, say you don't know.

Context:
{context}

Question:
{question}

Answer clearly in bullet points.
"""


def answer_question(question: str, contract_id: str):

    chunks = hybrid_retrieve(question, contract_id)

    context = "\n\n".join(chunks)

    prompt = PROMPT_TEMPLATE.format(
        context=context,
        question=question
    )

    response = ollama_generate(prompt, model="gpt-oss:20b", max_tokens=800)

    return response.get("response", "")