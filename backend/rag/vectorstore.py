import os
from langchain_community.vectorstores import Chroma
from backend.rag.embeddings import embeddings

CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")


def get_vectorstore():
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings
    )


def build_or_update_vectorstore(docs, contract_id: str):
    vectordb = get_vectorstore()

    # attach contract_id metadata
    for d in docs:
        d.metadata["contract_id"] = contract_id

    vectordb.add_documents(docs)
    vectordb.persist()

    return vectordb