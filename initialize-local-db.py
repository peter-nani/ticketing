#!/usr/bin/env python3
"""Create the development database schema from the application's SQLAlchemy models."""

import asyncio

from app.core.database import Base, engine
from app.models import attachment, comment, ticket, user  # noqa: F401


async def main() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
