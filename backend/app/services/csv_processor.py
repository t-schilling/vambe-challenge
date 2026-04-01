import asyncio
import pandas as pd
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Client
from app.services.categorizer import categorize_transcript


def count_words(text: str) -> int:
    if not text:
        return 0
    return len(text.split())


def parse_date(val) -> date | None:
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None


async def process_csv(db: AsyncSession, csv_path: str, force: bool = False) -> dict:
    df = pd.read_csv(csv_path)
    df.columns = df.columns.str.strip()

    processed = 0
    skipped = 0
    errors = 0

    for _, row in df.iterrows():
        correo = str(row.get("Correo Electronico", "")).strip()

        # Check if already exists
        result = await db.execute(select(Client).where(Client.correo == correo))
        existing = result.scalar_one_or_none()

        if existing and existing.categorized and not force:
            skipped += 1
            continue

        transcript = str(row.get("Transcripcion", "")).strip()
        word_count = count_words(transcript)

        client_data = {
            "nombre": str(row.get("Nombre", "")).strip(),
            "correo": correo,
            "telefono": str(row.get("Numero de Telefono", "")).strip(),
            "fecha_reunion": parse_date(row.get("Fecha de la Reunion")),
            "vendedor": str(row.get("Vendedor asignado", "")).strip(),
            "closed": bool(int(row.get("closed", 0))),
            "transcripcion": transcript,
            "transcript_word_count": word_count,
        }

        try:
            categories = await categorize_transcript(transcript)
            client_data.update({
                "sector": categories.get("sector"),
                "interaction_volume_tier": categories.get("interaction_volume_tier"),
                "interaction_volume_estimate": categories.get("interaction_volume_estimate"),
                "discovery_channel": categories.get("discovery_channel"),
                "primary_use_case": categories.get("primary_use_case"),
                "main_pain_point": categories.get("main_pain_point"),
                "integration_needs": categories.get("integration_needs", []),
                "client_sentiment": categories.get("client_sentiment"),
                "urgency": categories.get("urgency"),
                "company_size": categories.get("company_size"),
                "meeting_depth": categories.get("meeting_depth"),
                "client_engagement": categories.get("client_engagement"),
                "categorized": True,
            })
            processed += 1
        except Exception as e:
            print(f"Error categorizing {correo}: {e}")
            client_data["categorized"] = False
            errors += 1

        if existing:
            for key, val in client_data.items():
                setattr(existing, key, val)
        else:
            db.add(Client(**client_data))

        await db.commit()

        # Rate limiting: respect Gemini free tier
        await asyncio.sleep(0.5)

    return {"processed": processed, "skipped": skipped, "errors": errors}
