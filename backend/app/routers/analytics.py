from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, text
from collections import defaultdict
from datetime import date as date_type
from typing import Optional
from app.database import get_db
from app.models import Client
from app.schemas import InsightRequest, InsightResponse
from app.services.categorizer import generate_insights

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def close_rate(closed_count: int, total: int) -> float:
    return round(closed_count / total * 100, 1) if total > 0 else 0.0


async def global_filters(
    vendedor: Optional[str] = Query(None),
    date_from: Optional[date_type] = Query(None),
    date_to: Optional[date_type] = Query(None),
) -> dict:
    return {"vendedor": vendedor, "date_from": date_from, "date_to": date_to}


def apply_filters(query, gf: dict):
    if gf["vendedor"]:
        query = query.where(Client.vendedor == gf["vendedor"])
    if gf["date_from"]:
        query = query.where(Client.fecha_reunion >= gf["date_from"])
    if gf["date_to"]:
        query = query.where(Client.fecha_reunion <= gf["date_to"])
    return query


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    result = await db.execute(
        apply_filters(
            select(
                func.count(Client.id).label("total"),
                func.sum(case((Client.closed == True, 1), else_=0)).label("closed_count"),
                func.avg(Client.transcript_word_count).label("avg_words"),
                func.avg(Client.interaction_volume_estimate).label("avg_volume"),
                func.sum(case((Client.meeting_depth == "deep", 1), else_=0)).label("deep_count"),
            ),
            gf,
        )
    )
    row = result.one()

    vend_q = apply_filters(
        select(
            Client.vendedor,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.vendedor.isnot(None)).group_by(Client.vendedor),
        gf,
    )
    vend_result = await db.execute(vend_q)
    vendedores = vend_result.all()
    top_vendedor = max(
        [v for v in vendedores if v.total >= 2],
        key=lambda v: v.closed / v.total if v.total > 0 else 0,
        default=None,
    )

    deep_count = int(row.deep_count or 0)
    total = row.total or 0
    return {
        "total_clients": total,
        "closed_count": int(row.closed_count or 0),
        "close_rate": close_rate(int(row.closed_count or 0), total),
        "avg_transcript_words": round(float(row.avg_words or 0), 1),
        "avg_interaction_volume": round(float(row.avg_volume or 0), 1),
        "top_vendedor": top_vendedor.vendedor if top_vendedor else None,
        "deep_count": deep_count,
        "pct_deep": round(deep_count / total * 100, 1) if total > 0 else 0.0,
    }


@router.get("/by-sector")
async def by_sector(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.sector,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.sector.isnot(None)).group_by(Client.sector).order_by(func.count(Client.id).desc()),
        gf,
    )
    result = await db.execute(q)
    return [
        {"sector": r.sector, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-salesperson")
async def by_salesperson(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.vendedor,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
            func.avg(Client.transcript_word_count).label("avg_words"),
        ).where(Client.vendedor.isnot(None)).group_by(Client.vendedor).order_by(func.count(Client.id).desc()),
        gf,
    )
    result = await db.execute(q)
    rows = result.all()

    depth_q = apply_filters(
        select(Client.vendedor, Client.meeting_depth, func.count(Client.id).label("count"))
        .where(Client.vendedor.isnot(None), Client.meeting_depth.isnot(None))
        .group_by(Client.vendedor, Client.meeting_depth),
        gf,
    )
    depth_result = await db.execute(depth_q)
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
async def by_channel(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.discovery_channel,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.discovery_channel.isnot(None)).group_by(Client.discovery_channel).order_by(func.count(Client.id).desc()),
        gf,
    )
    result = await db.execute(q)
    return [
        {"channel": r.discovery_channel, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-volume")
async def by_volume(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.interaction_volume_tier,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.interaction_volume_tier.isnot(None)).group_by(Client.interaction_volume_tier),
        gf,
    )
    result = await db.execute(q)
    order = {"small": 0, "medium": 1, "large": 2, "unknown": 3}
    rows = sorted(result.all(), key=lambda r: order.get(r.interaction_volume_tier, 99))
    return [
        {"tier": r.interaction_volume_tier, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in rows
    ]


@router.get("/by-use-case")
async def by_use_case(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.primary_use_case,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.primary_use_case.isnot(None)).group_by(Client.primary_use_case).order_by(func.count(Client.id).desc()),
        gf,
    )
    result = await db.execute(q)
    return [
        {"use_case": r.primary_use_case, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-pain-point")
async def by_pain_point(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.main_pain_point,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.main_pain_point.isnot(None)).group_by(Client.main_pain_point).order_by(func.count(Client.id).desc()),
        gf,
    )
    result = await db.execute(q)
    return [
        {"pain_point": r.main_pain_point, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-meeting-depth")
async def by_meeting_depth(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.meeting_depth,
            Client.client_engagement,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.meeting_depth.isnot(None), Client.client_engagement.isnot(None)).group_by(Client.meeting_depth, Client.client_engagement),
        gf,
    )
    result = await db.execute(q)
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
async def timeline(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    month_expr = func.to_char(Client.fecha_reunion, "YYYY-MM").label("month")
    q = apply_filters(
        select(
            month_expr,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.fecha_reunion.isnot(None)).group_by(month_expr).order_by(month_expr),
        gf,
    )
    result = await db.execute(q)
    return [
        {"month": r.month, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in result.all()
    ]


@router.get("/by-company-size")
async def by_company_size(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.company_size,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        ).where(Client.company_size.isnot(None)).group_by(Client.company_size),
        gf,
    )
    result = await db.execute(q)
    order = {"startup": 0, "small": 1, "medium": 2, "large": 3}
    rows = sorted(result.all(), key=lambda r: order.get(r.company_size, 99))
    return [
        {"company_size": r.company_size, "total": r.total, "closed": int(r.closed or 0),
         "close_rate": close_rate(int(r.closed or 0), r.total)}
        for r in rows
    ]


@router.get("/by-integration-needs")
async def by_integration_needs(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    conditions = ["integration_needs IS NOT NULL"]
    params: dict = {}
    if gf["vendedor"]:
        conditions.append("vendedor = :vendedor")
        params["vendedor"] = gf["vendedor"]
    if gf["date_from"]:
        conditions.append("fecha_reunion >= :date_from")
        params["date_from"] = gf["date_from"]
    if gf["date_to"]:
        conditions.append("fecha_reunion <= :date_to")
        params["date_to"] = gf["date_to"]

    where = " AND ".join(conditions)
    # Raw SQL is required here: json_array_elements_text (PostgreSQL lateral join)
    # has no direct SQLAlchemy ORM equivalent for unnesting JSON arrays.
    # User-supplied values are passed via named params (:vendedor, :date_from, :date_to)
    # — no SQL injection risk.
    result = await db.execute(
        text(f"""
            SELECT value AS need, COUNT(*) AS total
            FROM clients, json_array_elements_text(integration_needs::json) AS value
            WHERE {where}
            GROUP BY value
            ORDER BY total DESC
        """),
        params,
    )
    return [{"need": r.need, "total": r.total} for r in result.all()]


@router.get("/sector-by-channel")
async def sector_by_channel(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.sector,
            Client.discovery_channel,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        )
        .where(Client.sector.isnot(None))
        .where(Client.discovery_channel.isnot(None))
        .group_by(Client.sector, Client.discovery_channel),
        gf,
    )
    result = await db.execute(q)
    return [
        {
            "sector": r.sector,
            "channel": r.discovery_channel,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
        }
        for r in result.all()
    ]


@router.get("/usecase-by-companysize")
async def usecase_by_companysize(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.primary_use_case,
            Client.company_size,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        )
        .where(Client.primary_use_case.isnot(None))
        .where(Client.company_size.isnot(None))
        .group_by(Client.primary_use_case, Client.company_size),
        gf,
    )
    result = await db.execute(q)
    return [
        {
            "use_case": r.primary_use_case,
            "company_size": r.company_size,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
        }
        for r in result.all()
    ]


@router.get("/companysize-by-channel")
async def companysize_by_channel(
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    q = apply_filters(
        select(
            Client.company_size,
            Client.discovery_channel,
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        )
        .where(Client.company_size.isnot(None))
        .where(Client.discovery_channel.isnot(None))
        .group_by(Client.company_size, Client.discovery_channel),
        gf,
    )
    result = await db.execute(q)
    return [
        {
            "company_size": r.company_size,
            "channel": r.discovery_channel,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
        }
        for r in result.all()
    ]


VALID_DIMENSIONS = {
    "sector", "vendedor", "discovery_channel", "primary_use_case",
    "main_pain_point", "client_sentiment", "urgency", "company_size",
    "interaction_volume_tier", "meeting_depth", "client_engagement",
}


@router.get("/cross")
async def cross_analysis(
    dim1: str = Query(...),
    dim2: str = Query(...),
    db: AsyncSession = Depends(get_db),
    gf: dict = Depends(global_filters),
):
    from fastapi import HTTPException
    if dim1 not in VALID_DIMENSIONS or dim2 not in VALID_DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid dimension. Valid: {sorted(VALID_DIMENSIONS)}")
    col1 = getattr(Client, dim1)
    col2 = getattr(Client, dim2)
    q = apply_filters(
        select(
            col1.label("dim1_value"),
            col2.label("dim2_value"),
            func.count(Client.id).label("total"),
            func.sum(case((Client.closed == True, 1), else_=0)).label("closed"),
        )
        .where(col1.isnot(None), col2.isnot(None))
        .group_by(col1, col2),
        gf,
    )
    result = await db.execute(q)
    return [
        {
            "dim1_value": r.dim1_value,
            "dim2_value": r.dim2_value,
            "total": r.total,
            "closed": int(r.closed or 0),
            "close_rate": close_rate(int(r.closed or 0), r.total),
        }
        for r in result.all()
    ]


@router.post("/insights", response_model=InsightResponse)
async def get_insights(request: InsightRequest):
    result = await generate_insights(request.metrics)
    return InsightResponse(**result)
