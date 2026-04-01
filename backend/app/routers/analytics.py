from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from collections import defaultdict
from app.database import get_db
from app.models import Client
from app.schemas import InsightRequest, InsightResponse
from app.services.categorizer import generate_insights

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def close_rate(closed_count: int, total: int) -> float:
    return round(closed_count / total * 100, 1) if total > 0 else 0.0


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed_count"),
            func.avg(Client.transcript_word_count).label("avg_words"),
            func.avg(Client.interaction_volume_estimate).label("avg_volume"),
        )
    )
    row = result.one()

    # Top vendedor by close rate (min 2 meetings)
    vend_result = await db.execute(
        select(
            Client.vendedor,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).group_by(Client.vendedor)
    )
    vendedores = vend_result.all()
    top_vendedor = max(
        [v for v in vendedores if v.total >= 2],
        key=lambda v: v.closed / v.total if v.total > 0 else 0,
        default=None,
    )

    return {
        "total_clients": row.total,
        "closed_count": int(row.closed_count or 0),
        "close_rate": close_rate(int(row.closed_count or 0), row.total),
        "avg_transcript_words": round(float(row.avg_words or 0), 1),
        "avg_interaction_volume": round(float(row.avg_volume or 0), 1),
        "top_vendedor": top_vendedor.vendedor if top_vendedor else None,
    }


@router.get("/by-sector")
async def by_sector(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.sector,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.sector.isnot(None)).group_by(Client.sector).order_by(func.count(Client.id).desc())
    )
    return [
        {"sector": r.sector, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-salesperson")
async def by_salesperson(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.vendedor,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
            func.avg(Client.transcript_word_count).label("avg_words"),
        ).where(Client.vendedor.isnot(None)).group_by(Client.vendedor).order_by(func.count(Client.id).desc())
    )

    rows = result.all()

    # meeting_depth distribution per vendedor
    depth_result = await db.execute(
        select(Client.vendedor, Client.meeting_depth, func.count(Client.id).label("count"))
        .where(Client.vendedor.isnot(None), Client.meeting_depth.isnot(None))
        .group_by(Client.vendedor, Client.meeting_depth)
    )
    depth_map = defaultdict(dict)
    for r in depth_result.all():
        depth_map[r.vendedor][r.meeting_depth] = r.count

    return [
        {
            "vendedor": r.vendedor,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
            "avg_words": round(float(r.avg_words or 0), 1),
            "meeting_depth_distribution": depth_map.get(r.vendedor, {}),
        }
        for r in rows
    ]


@router.get("/by-channel")
async def by_channel(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.discovery_channel,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.discovery_channel.isnot(None)).group_by(Client.discovery_channel).order_by(func.count(Client.id).desc())
    )
    return [
        {"channel": r.discovery_channel, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-volume")
async def by_volume(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.interaction_volume_tier,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.interaction_volume_tier.isnot(None)).group_by(Client.interaction_volume_tier)
    )
    order = {"small": 0, "medium": 1, "large": 2, "unknown": 3}
    rows = sorted(result.all(), key=lambda r: order.get(r.interaction_volume_tier, 99))
    return [
        {"tier": r.interaction_volume_tier, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in rows
    ]


@router.get("/by-use-case")
async def by_use_case(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.primary_use_case,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.primary_use_case.isnot(None)).group_by(Client.primary_use_case).order_by(func.count(Client.id).desc())
    )
    return [
        {"use_case": r.primary_use_case, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-pain-point")
async def by_pain_point(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.main_pain_point,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.main_pain_point.isnot(None)).group_by(Client.main_pain_point).order_by(func.count(Client.id).desc())
    )
    return [
        {"pain_point": r.main_pain_point, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-meeting-depth")
async def by_meeting_depth(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Client.meeting_depth,
            Client.client_engagement,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.meeting_depth.isnot(None)).group_by(Client.meeting_depth, Client.client_engagement)
    )
    return [
        {
            "meeting_depth": r.meeting_depth,
            "client_engagement": r.client_engagement,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
        }
        for r in result.all()
    ]


@router.get("/timeline")
async def timeline(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            func.strftime("%Y-%m", Client.fecha_reunion).label("month"),
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.fecha_reunion.isnot(None)).group_by("month").order_by("month")
    )
    return [
        {"month": r.month, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.post("/insights", response_model=InsightResponse)
async def get_insights(request: InsightRequest):
    result = await generate_insights(request.metrics)
    return InsightResponse(**result)
