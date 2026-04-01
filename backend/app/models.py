from sqlalchemy import Column, Integer, String, Float, Boolean, Date, JSON
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)

    # CSV fields
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True)
    telefono = Column(String)
    fecha_reunion = Column(Date)
    vendedor = Column(String, index=True)
    closed = Column(Boolean, default=False)
    transcripcion = Column(String)

    # Computed
    transcript_word_count = Column(Integer)

    # LLM categories
    sector = Column(String)
    interaction_volume_tier = Column(String)  # small, medium, large, unknown
    interaction_volume_estimate = Column(Integer)
    discovery_channel = Column(String)        # conference, google, linkedin, colleague, podcast, webinar, article, fair
    primary_use_case = Column(String)         # customer_support, appointment_scheduling, order_tracking, faq_automation, lead_qualification
    main_pain_point = Column(String)          # high_volume, slow_response, team_overload, repetitive_queries, scaling
    integration_needs = Column(JSON)          # list of strings
    client_sentiment = Column(String)         # very_positive, positive, neutral, skeptical
    urgency = Column(String)                  # high, medium, low
    company_size = Column(String)             # startup, small, medium, large
    meeting_depth = Column(String)            # superficial, moderate, deep
    client_engagement = Column(String)        # low, medium, high

    categorized = Column(Boolean, default=False)
