from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import clients, analytics, process
from app.config import settings

app = FastAPI(title="Vambe Analytics API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await init_db()


app.include_router(clients.router)
app.include_router(analytics.router)
app.include_router(process.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
