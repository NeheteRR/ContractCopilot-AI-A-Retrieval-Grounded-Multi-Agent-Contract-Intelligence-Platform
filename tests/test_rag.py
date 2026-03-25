from backend.rag.hybrid_retriever import hybrid_retrieve

if __name__ == "__main__":
    chunks = hybrid_retrieve(
        query="Find payment obligations",
        contract_id="contract_1"
    )
    print("Retrieved Chunks:", len(chunks))