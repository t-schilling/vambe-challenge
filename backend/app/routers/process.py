from fastapi import APIRouter, BackgroundTasks, Query
from app.database import AsyncSessionLocal
from app.services.csv_processor import process_csv
from app.config import settings

router = APIRouter(prefix="/api", tags=["process"])

# In-memory processing state (sufficient for single-instance deploy)
_state: dict = {"running": False, "last_result": None}


async def _run_processing(force: bool) -> None:
    _state["running"] = True
    try:
        async with AsyncSessionLocal() as db:
            result = await process_csv(db, settings.csv_path, force=force)
            _state["last_result"] = result
    finally:
        _state["running"] = False


@router.post("/process")
async def trigger_processing(
    background_tasks: BackgroundTasks,
    force: bool = Query(False, description="Re-categorize already processed clients"),
):
    if _state["running"]:
        return {"message": "Processing already running", "status": "running"}
    background_tasks.add_task(_run_processing, force)
    return {"message": "Processing started in background", "status": "started"}


@router.get("/process/status")
async def processing_status():
    return {"running": _state["running"], "last_result": _state["last_result"]}
