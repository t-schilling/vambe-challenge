import json
import asyncio
import google.generativeai as genai
from app.config import settings

genai.configure(api_key=settings.gemini_api_key)
model = genai.GenerativeModel("gemini-1.5-flash")

CATEGORY_SCHEMA = {
    "sector": "string — industria del cliente (ej: healthcare, retail, logistics, education, tech, finance, legal, hospitality, consulting, real_estate, ngo, creative, construction, agriculture, transport)",
    "interaction_volume_tier": "enum: small | medium | large | unknown  (small=<100/día, medium=100-300/día, large=>300/día)",
    "interaction_volume_estimate": "integer — número estimado de interacciones diarias mencionadas, 0 si no se menciona",
    "discovery_channel": "enum: conference | google | linkedin | colleague | podcast | webinar | article | fair | other",
    "primary_use_case": "enum: customer_support | appointment_scheduling | order_tracking | faq_automation | lead_qualification",
    "main_pain_point": "enum: high_volume | slow_response | team_overload | repetitive_queries | scaling",
    "integration_needs": "array of strings from: crm, ticketing, booking, database, ecommerce, calendar, other",
    "client_sentiment": "enum: very_positive | positive | neutral | skeptical",
    "urgency": "enum: high | medium | low",
    "company_size": "enum: startup | small | medium | large",
    "meeting_depth": "enum: superficial | moderate | deep — qué tan detallada y profunda es la transcripción",
    "client_engagement": "enum: low | medium | high — qué tan activo y detallado fue el cliente al describir su situación",
}

PROMPT_TEMPLATE = """Analiza esta transcripción de una reunión de ventas de Vambe (plataforma de chatbot para atención al cliente automatizada).

Extrae las siguientes categorías y devuelve ÚNICAMENTE un JSON válido sin texto adicional:

{schema}

Transcripción:
{transcript}

Responde solo con el JSON, sin markdown ni explicaciones."""


async def categorize_transcript(transcript: str) -> dict:
    schema_str = json.dumps(CATEGORY_SCHEMA, ensure_ascii=False, indent=2)
    prompt = PROMPT_TEMPLATE.format(schema=schema_str, transcript=transcript)

    response = await asyncio.to_thread(model.generate_content, prompt)
    text = response.text.strip()

    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)


async def generate_insights(metrics: dict) -> dict:
    prompt = f"""Eres un analista de negocio experto en ventas B2B y herramientas de automatización.
Analiza las siguientes métricas de pipeline de ventas de Vambe y genera un análisis ejecutivo.

Métricas:
{json.dumps(metrics, ensure_ascii=False, indent=2)}

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{{
  "hallazgos": ["hallazgo 1", "hallazgo 2", ...],
  "recomendaciones": ["recomendación 1", "recomendación 2", ...],
  "oportunidades": ["oportunidad 1", "oportunidad 2", ...],
  "riesgos": ["riesgo 1", "riesgo 2", ...]
}}

Cada array debe tener entre 3 y 5 items. Sé específico con los datos. Responde solo con el JSON."""

    response = await asyncio.to_thread(model.generate_content, prompt)
    text = response.text.strip()

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)
