import os
import sys
import cv2
import fitz  # PyMuPDF
import numpy as np
from pathlib import Path
from unittest.mock import MagicMock

# --- SHIM FOR PADDLEOCR/PADDLEX DEPENDENCY CONFLICTS ---
def _stub_langchain():
    for mod_name in [
        "langchain", "langchain.docstore", "langchain.docstore.document",
        "langchain.text_splitter", "langchain.embeddings", 
        "langchain.vectorstores", "langchain.chat_models"
    ]:
        if mod_name not in sys.modules:
            sys.modules[mod_name] = MagicMock()

_stub_langchain()
# ---------------------------------------------------------

try:
    from paddleocr import PPStructureV3 as PPStructure
except ImportError:
    try:
        from paddleocr import PPStructure
    except ImportError:
        from paddleocr.paddleocr import PPStructure 

# Initialize the engine
try:
    table_engine = PPStructure(lang='en')
except TypeError:
    table_engine = PPStructure()

# Output directories at the project root
OUTPUT_ROOT = Path("output")
IMAGES_BASE_DIR = OUTPUT_ROOT / "contract_images"
TEXT_BASE_DIR = OUTPUT_ROOT / "extracted_text"

# Ensure directories exist
IMAGES_BASE_DIR.mkdir(parents=True, exist_ok=True)
TEXT_BASE_DIR.mkdir(parents=True, exist_ok=True)

def extract_structured_content(file_path_str: str):
    """
    Extracts structured text from images or PDFs using PaddleOCR.
    Saves each page as an image and the full text as a markdown file.
    """
    file_path = Path(str(file_path_str))
    if not file_path.exists():
        return f"Error: File not found at {file_path_str}"

    doc_name = file_path.stem
    img_output_dir = IMAGES_BASE_DIR / doc_name
    img_output_dir.mkdir(parents=True, exist_ok=True)

    extension = file_path.suffix.lower()
    image_paths = []

    # 1. Prepare images
    if extension == ".pdf":
        doc = fitz.open(file_path)
        for i, page in enumerate(doc):
            pix = page.get_pixmap()
            img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
            if pix.n == 3: img_data = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
            elif pix.n == 4: img_data = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
            page_path = img_output_dir / f"page_{i+1}.png"
            cv2.imwrite(str(page_path), img_data)
            image_paths.append(page_path)
        doc.close()
    elif extension in [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]:
        img = cv2.imread(str(file_path))
        if img is not None:
            page_path = img_output_dir / f"original_image{extension}"
            cv2.imwrite(str(page_path), img)
            image_paths.append(page_path)
    else:
        return f"Error: Unsupported file type {extension}"

    # 2. Process with PaddleOCR
    import gc
    all_text = []
    for img_path in image_paths:
        img = cv2.imread(str(img_path))
        if img is None: continue
        
        # PPStructure objects should be called directly
        try:
            results = table_engine(img)
        except Exception as e:
            print(f"OCR Error on {img_path}: {e}")
            results = []
        
        # Cleanup image memory ASAP
        del img
        gc.collect()
        
        page_text = []
        for result in results:
            if isinstance(result, list):
                for line in result:
                    if isinstance(line, list) and len(line) > 1 and isinstance(line[1], (list, tuple)):
                        page_text.append(str(line[1][0]))
                    else:
                        page_text.append(str(line))
            elif isinstance(result, dict):
                if "res" in result:
                    res = result["res"]
                    if isinstance(res, list):
                        for sub in res:
                            if isinstance(sub, dict) and "text" in sub:
                                page_text.append(sub["text"])
                    elif isinstance(res, dict) and "text" in res:
                        page_text.append(res["text"])
                elif "text" in result:
                    page_text.append(result["text"])
        all_text.append("\n".join(page_text))

    full_text = "\n\n--- Page Break ---\n\n".join(all_text)

    # 3. Save extracted text to file
    text_file_path = TEXT_BASE_DIR / f"{doc_name}.md"
    text_file_path.write_text(full_text, encoding="utf-8")

    return full_text