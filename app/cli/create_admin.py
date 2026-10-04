"""Create the first administrator without putting credentials in source or env files."""

import asyncio
from getpass import getpass

from sqlalchemy import select

from app.core.config import settings, is_allowed_user_email
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.repositories.user_repository import user_repository
from app.schemas.user import UserCreate


async def main() -> None:
    email = input("Administrator email: ").strip()
    if not is_allowed_user_email(email):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise SystemExit(f"Use an administrator email ending in @{domain}.")
    full_name = input("Administrator name (optional): ").strip() or None
    password = getpass("Administrator password (8–72 characters): ")
    confirmation = getpass("Confirm password: ")
    if password != confirmation:
        raise SystemExit("Passwords do not match.")

    async with AsyncSessionLocal() as db:
        existing = await user_repository.get_by_email(db, email=email)
        if existing:
            raise SystemExit("That email already has an account; use the admin UI to change its role.")
        admin_exists = await db.scalar(
            select(User.id).where(User.role == UserRole.ADMIN, User.is_active.is_(True)).limit(1)
        )
        if admin_exists:
            raise SystemExit("An active administrator already exists; create additional admins in the admin UI.")
        user = await user_repository.create(
            db,
            obj_in=UserCreate(
                email=email,
                full_name=full_name,
                password=password,
                role=UserRole.ADMIN,
                is_active=True,
            ),
        )
        print(f"Created initial administrator account {user.email} (user ID {user.id}).")


if __name__ == "__main__":
    asyncio.run(main())
