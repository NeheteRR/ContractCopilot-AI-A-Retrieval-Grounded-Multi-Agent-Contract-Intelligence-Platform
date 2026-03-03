def ollama_generate(prompt, model="gpt-oss:20b", max_tokens=800):

    payload = {
        "model": model,
        "prompt": prompt,
        "options": {
            "temperature": 0.0,
            "top_p": 0.9
        }
    }