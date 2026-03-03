from backend.rag.vectorstore import get_vectorstore


def dense_retrieve(query: str, contract_id: str, k: int = 6):
    vectordb = get_vectorstore()

    retriever = vectordb.as_retriever(
        search_kwargs={
            "k": k,
            "filter": {"contract_id": contract_id}
        }
    )

    docs = retriever.invoke(query)
    return docs