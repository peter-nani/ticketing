"""Issue the single-use credential required for local first-admin creation."""

import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal
from app.models.admin_bootstrap import AdminBootstrapCredential
from app.models.user import User, UserRole

logger = structlog.get_logger(__name__)
BOOTSTRAP_LIFETIME = timedelta(minutes=45)


async def main() -> None:
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        admin_count = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN))
        existing = await db.get(AdminBootstrapCredential, 1)
        if admin_count:
            raise SystemExit("An administrator already exists; create any additional admins through the authenticated user API.")
        if existing:
            old_expiry = existing.expires_at
            if old_expiry.tzinfo is None:
                old_expiry = old_expiry.replace(tzinfo=timezone.utc)
            if existing.consumed_at is not None:
                raise SystemExit("Administrator bootstrap has already been used.")
            if old_expiry > now:
                raise SystemExit("A bootstrap login is already active; it cannot be displayed a second time.")
            existing.token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            existing.created_at = now
            existing.expires_at = now + BOOTSTRAP_LIFETIME
            db.add(existing)
        else:
            db.add(AdminBootstrapCredential(
                id=1,
                token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
                created_at=now,
                expires_at=now + BOOTSTRAP_LIFETIME,
            ))
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise SystemExit("Administrator bootstrap has already been issued.") from exc

    logger.info("administrator_bootstrap_credential_issued", expires_at=(now + BOOTSTRAP_LIFETIME).isoformat())
    print("One-time administrator bootstrap login (valid for 45 minutes):")
    print(raw_token)
    print("Use it with the create-admin-user operation in /docs before it expires. It cannot be shown again.")


if __name__ == "__main__":
    asyncio.run(main())
