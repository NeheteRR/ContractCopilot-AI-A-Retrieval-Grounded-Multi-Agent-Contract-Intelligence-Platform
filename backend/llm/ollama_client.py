import requests

OLLAMA_URL = "http://localhost:11434/api/generate"


def ollama_generate(prompt, model="gemma3:4b", max_tokens=800):

    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.0,
            "top_p": 0.9,
            "num_predict": max_tokens
        }
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()

        return response.json()

    except Exception as e:
        print("Ollama Error:", e)
        return None