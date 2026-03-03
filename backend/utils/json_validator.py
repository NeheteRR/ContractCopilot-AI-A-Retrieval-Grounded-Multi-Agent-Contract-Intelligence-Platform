from jsonschema import validate, ValidationError

OBLIGATION_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "number"},
        "action_required": {"type": "string"},
        "responsible_party": {"type": "string"},
        "source_clause": {"type": "string"}
    },
    "required": ["id", "action_required", "source_clause"]
}

def validate_obligation(ob):
    try:
        validate(instance=ob, schema=OBLIGATION_SCHEMA)
        return True
    except ValidationError:
        return False