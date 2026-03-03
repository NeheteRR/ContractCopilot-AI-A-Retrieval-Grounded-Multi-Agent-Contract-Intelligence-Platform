from fastapi import FastAPI
from .routers import contracts   # ← relative import

app = FastAPI()

app.include_router(contracts.router)