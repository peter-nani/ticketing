from sqlalchemy import Column, DateTime, Integer, String, func
from app.core.database import Base


class AdminBootstrapCredential(Base):
    __tablename__ = "admin_bootstrap_credentials"

    # A fixed primary key makes bootstrap issuance globally one-time.
    id = Column(Integer, primary_key=True, default=1)
    token_hash = Column(String(64), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
