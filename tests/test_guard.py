from backend.guards.grounding_guard import apply_grounding_guard

sample_obligations = [
    {"id": 1, "action_required": "Pay invoice within 30 days"}
]

context = ["The client shall pay invoice within 30 days of receipt."]

if __name__ == "__main__":
    validated = apply_grounding_guard(sample_obligations, context)
    print(validated)