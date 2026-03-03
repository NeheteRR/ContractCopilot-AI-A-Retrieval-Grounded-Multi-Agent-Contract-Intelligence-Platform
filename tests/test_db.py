from backend.database.engine import SessionLocal
from backend.database.models import Contract

def test_db_connection():
    db = SessionLocal()
    contracts = db.query(Contract).all()
    print("DB Connected. Contracts:", contracts)
    db.close()

if __name__ == "__main__":
    test_db_connection()