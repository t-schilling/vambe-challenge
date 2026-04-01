from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models import Client
from app.schemas import ClientListResponse, ClientOut

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    vendedor: Optional[str] = None,
    sector: Optional[str] = None,
    closed: Optional[bool] = None,
    client_sentiment: Optional[str] = None,
    discovery_channel: Optional[str] = None,
    primary_use_case: Optional[str] = None,
    meeting_depth: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Client)

    if search:
        query = query.where(
            Client.nombre.ilike(f"%{search}%") | Client.correo.ilike(f"%{search}%")
        )
    if vendedor:
        query = query.where(Client.vendedor == vendedor)
    if sector:
        query = query.where(Client.sector == sector)
    if closed is not None:
        query = query.where(Client.closed == closed)
    if client_sentiment:
        query = query.where(Client.client_sentiment == client_sentiment)
    if discovery_channel:
        query = query.where(Client.discovery_channel == discovery_channel)
    if primary_use_case:
        query = query.where(Client.primary_use_case == primary_use_case)
    if meeting_depth:
        query = query.where(Client.meeting_depth == meeting_depth)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return ClientListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/filter-options")
async def get_filter_options(db: AsyncSession = Depends(get_db)):
    """Returns distinct values for each filterable field."""
    fields = ["vendedor", "sector", "discovery_channel", "primary_use_case",
              "client_sentiment", "meeting_depth", "urgency", "company_size",
              "interaction_volume_tier", "main_pain_point", "client_engagement"]

    result = {}
    for field in fields:
        col = getattr(Client, field)
        res = await db.execute(select(col).distinct().where(col.isnot(None)))
        result[field] = sorted([r[0] for r in res.all() if r[0]])

    return result
