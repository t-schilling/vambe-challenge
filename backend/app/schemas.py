from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class ClientBase(BaseModel):
    nombre: str
    correo: str
    telefono: Optional[str] = None
    fecha_reunion: Optional[date] = None
    vendedor: Optional[str] = None
    closed: bool = False
    transcripcion: Optional[str] = None
    transcript_word_count: Optional[int] = None


class ClientCategory(BaseModel):
    sector: Optional[str] = None
    interaction_volume_tier: Optional[str] = None
    interaction_volume_estimate: Optional[int] = None
    discovery_channel: Optional[str] = None
    primary_use_case: Optional[str] = None
    main_pain_point: Optional[str] = None
    integration_needs: Optional[List[str]] = None
    client_sentiment: Optional[str] = None
    urgency: Optional[str] = None
    company_size: Optional[str] = None
    meeting_depth: Optional[str] = None
    client_engagement: Optional[str] = None


class ClientOut(ClientBase, ClientCategory):
    id: int
    categorized: bool

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ClientOut]


class ProcessResponse(BaseModel):
    processed: int
    skipped: int
    errors: int


class InsightRequest(BaseModel):
    metrics: dict


class InsightResponse(BaseModel):
    hallazgos: List[str]
    recomendaciones: List[str]
    oportunidades: List[str]
    riesgos: List[str]
