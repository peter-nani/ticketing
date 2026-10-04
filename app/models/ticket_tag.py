from sqlalchemy import Column, Integer, String
from app.core.database import Base


class TicketTag(Base):
    __tablename__ = "ticket_tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(48), nullable=False, unique=True, index=True)
    color = Column(String(16), nullable=False, default="#607d8b")
