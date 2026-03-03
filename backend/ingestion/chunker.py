from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=250,
    chunk_overlap=75,
    separators=["\n\n", "\n", ".", " "]
)

def chunk_documents(docs):
    return splitter.split_documents(docs)