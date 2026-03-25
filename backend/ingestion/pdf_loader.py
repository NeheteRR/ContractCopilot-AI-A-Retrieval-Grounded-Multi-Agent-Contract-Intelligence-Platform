from langchain_core.documents import Document
from backend.ingestion.ppstructure_parser import extract_structured_content

def load_pdf(path: str):
    """
    Overgraded PDF loader that uses OCR/Structure analysis instead of basic PyPDF.
    Returns a list of Documents for compatibility with the chunker.
    """
    # 1. Extract text via our enhanced OCR pipeline
    # This also saves images to output/contract_images/ and text to output/extracted_text/
    extracted_text = extract_structured_content(path)
    
    # 2. Wrap in Document object for LangChain compatibility
    return [Document(page_content=extracted_text, metadata={"source": str(path)})]