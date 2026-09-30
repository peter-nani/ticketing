from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.repositories.user_repository import user_repository
from app.schemas.user import UserCreate, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    existing = await user_repository.get_by_email(db, email=user_in.email)
    if existing:
        raise BadRequestException(detail="Email already registered")
    user = await user_repository.create(db, obj_in=user_in)
    return user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    user = await user_repository.get_by_email(db, email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise UnauthorizedException(detail="Incorrect email or password")
    if not user.is_active:
        raise UnauthorizedException(detail="Inactive user")
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_access_token(subject=user.id) # In production, configure separate refresh lifetime
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")
