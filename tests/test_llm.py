from backend.llm.ollama_client import ollama_generate

if __name__ == "__main__":
    response = ollama_generate("Say hello")
    print("LLM Response:", response)