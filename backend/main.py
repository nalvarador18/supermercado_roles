"""main.py — FastAPI entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.modules.database import init_db
from app.routers import auth, analytics

app = FastAPI(title="Plataforma Analítica Supermercado", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(auth.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
