import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

app.dependency_overrides[get_db] = override_get_db

@pytest_asyncio.fixture(autouse=True, scope="function")
async def setup_database() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def test_user(setup_database) -> User:
    async with TestingSessionLocal() as session:
        user = User(
            email="customer@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test Customer",
            role=UserRole.CUSTOMER,
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

@pytest_asyncio.fixture
async def test_agent(setup_database) -> User:
    async with TestingSessionLocal() as session:
        agent = User(
            email="agent@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test Agent",
            role=UserRole.AGENT,
            is_active=True
        )
        session.add(agent)
        await session.commit()
        await session.refresh(agent)
        return agent

@pytest_asyncio.fixture
async def test_admin(setup_database) -> User:
    async with TestingSessionLocal() as session:
        admin = User(
            email="admin@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        return admin
