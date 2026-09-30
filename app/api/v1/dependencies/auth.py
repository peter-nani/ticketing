from fastapi import Depends, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.models.user import User, UserRole
from app.repositories.user_repository import user_repository
from app.schemas.user import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=["HS256"]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValueError):
        raise UnauthorizedException(detail="Could not validate credentials")
    
    user = await user_repository.get(db, id=token_data.sub)
    if not user:
        raise UnauthorizedException(detail="User not found")
    if not user.is_active:
        raise ForbiddenException(detail="Inactive user")
    return user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise ForbiddenException(detail="The user doesn't have enough privileges")
    return current_user

async def get_current_active_agent_or_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [UserRole.ADMIN, UserRole.AGENT]:
        raise ForbiddenException(detail="The user doesn't have agent or admin privileges")
    return current_user
