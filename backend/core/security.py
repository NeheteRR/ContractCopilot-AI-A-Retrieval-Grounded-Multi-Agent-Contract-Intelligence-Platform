import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

# ==============================
# CONFIG
# ==============================

SECRET_KEY = "supersecretkey"  # ⚠️ In production, use env variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# ==============================
# PASSWORD HASHING (FIXED)
# ==============================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    # bcrypt limit fix (72 bytes)
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password[:72], hashed_password)
    except Exception:
        return False


# ==============================
# JWT TOKEN
# ==============================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ==============================
# DATABASE
# ==============================

DB_NAME = "system3.db"


def get_db_connection():
    return sqlite3.connect(DB_NAME)


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')

    # Check if admin exists
    cursor.execute("SELECT id FROM users WHERE email = ?", ("admin@example.com",))
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (
                "Admin User",
                "admin@example.com",
                get_password_hash("admin123"),
                "admin"
            )
        )

    conn.commit()
    conn.close()


# ==============================
# AUTH HELPERS
# ==============================

def get_user_by_email(email: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, name, email, password_hash, role FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    conn.close()

    return user


def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)

    if not user:
        return None

    user_id, name, email, password_hash, role = user

    if not verify_password(password, password_hash):
        return None

    return {
        "id": user_id,
        "name": name,
        "email": email,
        "role": role
    }


# ==============================
# INIT DB ON START
# ==============================

init_db()