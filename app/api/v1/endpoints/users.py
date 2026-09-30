from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.v1.dependencies.auth import get_current_user, get_current_active_superuser
from app.models.user import User
from app.repositories.user_repository import user_repository
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    users = await user_repository.get_multi(db, skip=skip, limit=limit)
    return users
