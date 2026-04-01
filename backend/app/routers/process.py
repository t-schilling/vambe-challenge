from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.csv_processor import process_csv
from app.schemas import ProcessResponse
from app.config import settings

router = APIRouter(prefix="/api", tags=["process"])


@router.post("/process", response_model=ProcessResponse)
async def trigger_processing(
    force: bool = Query(False, description="Re-categorize already processed clients"),
    db: AsyncSession = Depends(get_db),
):
    result = await process_csv(db, settings.csv_path, force=force)
    return ProcessResponse(**result)
