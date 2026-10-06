import hashlib
import hmac
from datetime import datetime, timezone
from typing import List, Optional
import structlog
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.security import APIKeyHeader
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.config import settings, is_allowed_user_email
from app.api.v1.dependencies.auth import get_current_user, get_current_active_superuser
from app.core.exceptions import BadRequestException, NotFoundException, UnauthorizedException
from app.core.security import get_password_hash
from app.models.admin_bootstrap import AdminBootstrapCredential
from app.models.user import User, UserRole
from app.repositories.user_repository import user_repository
from app.schemas.user import AdminUserCreate, UserCreate, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])
logger = structlog.get_logger(__name__)
bootstrap_login_header = APIKeyHeader(
    name="X-Admin-Bootstrap-Login",
    scheme_name="BootstrapLogin",
    description="One-time login issued by the operational CLI. Expires after 45 minutes.",
    auto_error=False,
)

@router.post("/create-admin-user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    user_in: AdminUserCreate,
    db: AsyncSession = Depends(get_db),
    bootstrap_login: Optional[str] = Depends(bootstrap_login_header),
):
    """Create the first administrator using the short-lived CLI bootstrap login."""
    if not bootstrap_login:
        raise UnauthorizedException(detail="A valid bootstrap login is required")

    credential = await db.scalar(
        select(AdminBootstrapCredential).where(AdminBootstrapCredential.id == 1)
    )
    token_hash = hashlib.sha256(bootstrap_login.encode("utf-8")).hexdigest()
    if not credential or not hmac.compare_digest(credential.token_hash, token_hash):
        raise UnauthorizedException(detail="A valid bootstrap login is required")
    expires_at = credential.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if credential.consumed_at is not None or expires_at <= datetime.now(timezone.utc):
        raise UnauthorizedException(detail="The administrator bootstrap login has expired or was already used")

    if not is_allowed_user_email(str(user_in.email)):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise BadRequestException(detail=f"Use an email address ending in @{domain} to create an administrator")
    if await db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN)):
        raise BadRequestException(detail="An administrator already exists; bootstrap can only create the first administrator")
    if await user_repository.get_by_email(db, email=str(user_in.email)):
        raise BadRequestException(detail="Email already registered")

    user = User(
        email=str(user_in.email),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.ADMIN,
        is_active=True,
    )
    now = datetime.now(timezone.utc)
    consume_result = await db.execute(
        update(AdminBootstrapCredential)
        .where(
            AdminBootstrapCredential.id == 1,
            AdminBootstrapCredential.token_hash == token_hash,
            AdminBootstrapCredential.consumed_at.is_(None),
            AdminBootstrapCredential.expires_at > now,
        )
        .values(consumed_at=now)
    )
    if consume_result.rowcount != 1:
        await db.rollback()
        raise UnauthorizedException(detail="The administrator bootstrap login has expired or was already used")
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise BadRequestException(detail="Could not create the administrator account") from exc
    await db.refresh(user)
    logger.info("administrator_created", user_id=user.id, email=user.email, created_by="local_bootstrap_cli")
    return user

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
    result = await db.scalars(
        select(User)
        .where(~User.email.like("deleted-user-%@deleted.invalid"))
        .order_by(User.id)
        .offset(skip)
        .limit(limit)
    )
    return result.all()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    if not is_allowed_user_email(str(user_in.email)):
        domain = settings.ALLOWED_USER_EMAIL_DOMAIN.lstrip("@").strip()
        raise BadRequestException(detail=f"Use an email address ending in @{domain} to create a user")
    if await user_repository.get_by_email(db, email=str(user_in.email)):
        raise BadRequestException(detail="Email already registered")
    user = await user_repository.create(db, obj_in=user_in)
    if user.role == UserRole.ADMIN:
        logger.info("administrator_created", user_id=user.id, email=user.email, created_by_user_id=current_user.id)
    return user

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

    previous_role = user.role
    previous_active = user.is_active
    updated = await user_repository.update_user(db, db_obj=user, obj_in=user_in)
    if previous_role != UserRole.ADMIN and updated.role == UserRole.ADMIN:
        logger.info("administrator_created", user_id=updated.id, email=updated.email, created_by_user_id=current_user.id)
    elif previous_role == UserRole.ADMIN and updated.role != UserRole.ADMIN:
        logger.info("administrator_access_revoked", user_id=updated.id, email=updated.email, changed_by_user_id=current_user.id)
    elif previous_role == UserRole.ADMIN and previous_active and not updated.is_active:
        logger.info("administrator_access_revoked", user_id=updated.id, email=updated.email, changed_by_user_id=current_user.id)
    return updated

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Anonymize an account while retaining its ticket and activity history."""
    user = await user_repository.get(db, id=user_id)
    if not user:
        raise NotFoundException(detail="User not found")
    if user.id == current_user.id:
        raise BadRequestException(detail="You cannot delete your own account")
    if user.role == UserRole.ADMIN and user.is_active:
        active_admins = await db.scalar(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        if active_admins <= 1:
            raise BadRequestException(detail="At least one active administrator must remain")
    was_admin = user.role == UserRole.ADMIN
    deleted_email = user.email
    user.email = f"deleted-user-{user.id}@deleted.invalid"
    user.full_name = "Deleted user"
    user.is_active = False
    db.add(user)
    await db.commit()
    logger.info(
        "administrator_deleted" if was_admin else "user_deleted",
        user_id=user.id,
        email=deleted_email,
        deleted_by_user_id=current_user.id,
        ticket_history_retained=True,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
