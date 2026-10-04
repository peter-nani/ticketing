from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings, is_allowed_user_email
from app.api.v1.dependencies.auth import get_current_user, get_current_active_superuser
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.user import User, UserRole
from app.repositories.user_repository import user_repository
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def read_user_me(
    current_user: User = Depends(get_current_user)
):
    return current_user

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser)
):
    users = await user_repository.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    if not is_allowed_user_email(str(user_in.email)):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise BadRequestException(detail=f"Use an email address ending in @{domain} to create a user")
    if await user_repository.get_by_email(db, email=str(user_in.email)):
        raise BadRequestException(detail="Email already registered")
    return await user_repository.create(db, obj_in=user_in)

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    user = await user_repository.get(db, id=user_id)
    if not user:
        raise NotFoundException(detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)
    email = update_data.get("email")
    if email and str(email).lower() != user.email.lower() and not is_allowed_user_email(str(email)):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise BadRequestException(detail=f"Use an email address ending in @{domain}")
    if email and email != user.email:
        existing = await user_repository.get_by_email(db, email=str(email))
        if existing:
            raise BadRequestException(detail="Email already registered")

    new_role = update_data.get("role") or user.role
    new_is_active = update_data.get("is_active")
    if new_is_active is None:
        new_is_active = user.is_active
    becomes_active_admin = new_role == UserRole.ADMIN and new_is_active is True
    was_active_admin = user.role == UserRole.ADMIN and user.is_active
    if user.id == current_user.id and was_active_admin and not becomes_active_admin:
        raise BadRequestException(detail="You cannot remove your own administrator access")
    if was_active_admin and not becomes_active_admin:
        active_admins = await db.scalar(
            select(func.count(User.id)).where(
                User.role == UserRole.ADMIN,
                User.is_active.is_(True),
            )
        )
        if active_admins <= 1:
            raise BadRequestException(detail="At least one active administrator must remain")

    return await user_repository.update_user(db, db_obj=user, obj_in=user_in)
