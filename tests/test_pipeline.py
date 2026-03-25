from backend.orchestration.pipeline import run_contract_pipeline

if __name__ == "__main__":
    result = run_contract_pipeline("contract_1")
    print(result["validation_status"])