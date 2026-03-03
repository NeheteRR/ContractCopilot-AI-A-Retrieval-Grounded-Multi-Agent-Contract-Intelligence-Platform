def enrich_chunks(chunks, contract_id: str):
    for i, chunk in enumerate(chunks):
        chunk.metadata["contract_id"] = contract_id
        chunk.metadata["chunk_index"] = i
    return chunks