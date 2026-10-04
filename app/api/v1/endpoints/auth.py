from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings, is_allowed_user_email
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.repositories.user_repository import user_repository
from app.schemas.user import RefreshTokenRequest, Token, TokenPayload, UserCreate, UserRegistration, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/config")
async def auth_config():
    return {"allowed_user_email_domain": settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip().lower()}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegistration,
    db: AsyncSession = Depends(get_db)
):
    if not is_allowed_user_email(user_in.email):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise BadRequestException(detail=f"Use an email address ending in @{domain} to create an account")
    existing = await user_repository.get_by_email(db, email=user_in.email)
    if existing:
        raise BadRequestException(detail="Email already registered")
    user = await user_repository.create(
        db,
        obj_in=UserCreate(**user_in.model_dump()),
    )
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
    refresh_token = create_refresh_token(subject=user.id)
    return Token(access_token=access_token, refresh_token=refresh_token, token_type="bearer")

@router.post("/refresh", response_model=Token)
async def refresh(
    token_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token_in.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        token_data = TokenPayload(**payload)
        if token_data.token_type != "refresh" or token_data.sub is None:
            raise ValueError("Refresh token required")
    except (JWTError, ValueError):
        raise UnauthorizedException(detail="Invalid or expired refresh token")

    user = await user_repository.get(db, id=token_data.sub)
    if not user or not user.is_active:
        raise UnauthorizedException(detail="Invalid or inactive user")

    return Token(
        access_token=create_access_token(subject=user.id),
        refresh_token=create_refresh_token(subject=user.id),
        token_type="bearer",
    )
