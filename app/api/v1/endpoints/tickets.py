from typing import Optional
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, Response, status, Query, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from app.core.database import get_db
from app.core.config import settings
from app.core.exceptions import NotFoundException, ForbiddenException
from app.api.v1.dependencies.auth import get_current_user, get_current_active_agent_or_admin, get_current_active_superuser
from app.models.user import User, UserRole
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.models.ticket_audit_log import TicketAuditLog
from app.models.ticket_tag import TicketTag
from app.repositories.ticket_repository import ticket_repository
from app.repositories.comment_repository import comment_repository
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketAuditLogResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.create(db, obj_in=ticket_in, reporter_id=current_user.id)
    return await ticket_repository.get_with_relations(db, ticket.id)

@router.get("/", response_model=PaginatedResponse[TicketResponse])
async def list_tickets(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    category: Optional[TicketCategory] = None,
    assignee_id: Optional[int] = Query(None, ge=0),
    reporter_id: Optional[int] = None,
    q: Optional[str] = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skip = (page - 1) * size
    
    items, total = await ticket_repository.get_multi_filtered(
        db,
        skip=skip,
        limit=size,
        status=status,
        priority=priority,
        category=category,
        assignee_id=assignee_id,
        reporter_id=reporter_id,
        search=q
    )

    pages = (total + size - 1) // size if size > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get_with_relations(db, ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")
    
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER:
        if ticket.reporter_id != current_user.id:
            raise ForbiddenException(detail="Not enough permissions")
        if any(field in ticket_in.model_fields_set for field in ("assignee_id", "priority", "category")):
            raise ForbiddenException(detail="Customers cannot change ticket priority, category or assignee")

    update_data = ticket_in.model_dump(exclude_unset=True)
    if "tags" in update_data:
        selected_tags = list(dict.fromkeys(tag.strip() for tag in (update_data["tags"] or []) if tag.strip()))
        if selected_tags:
            known = set((await db.scalars(select(TicketTag.name).where(TicketTag.name.in_(selected_tags)))).all())
            if known != set(selected_tags):
                raise ForbiddenException(detail="One or more selected tags are not available")
        update_data["tags"] = selected_tags
    if "status" in update_data and update_data["status"] != ticket.status:
        if update_data["status"] == TicketStatus.RESOLVED:
            update_data["resolved_at"] = datetime.now(timezone.utc)
        elif ticket.status == TicketStatus.RESOLVED:
            update_data["resolved_at"] = None

    changes = []
    for field, new_value in update_data.items():
        if field == "resolved_at":
            continue
        old_value = getattr(ticket, field)
        old_text = _audit_text(old_value)
        new_text = _audit_text(new_value)
        if old_text != new_text:
            changes.append((field, old_text, new_text))

    for field, new_value in update_data.items():
        setattr(ticket, field, new_value)
    db.add(ticket)
    for action_type, old_value, new_value in changes:
        db.add(TicketAuditLog(
            ticket_id=ticket.id,
            user_id=current_user.id,
            action_type=action_type,
            old_value=old_value,
            new_value=new_value,
        ))
    await db.commit()
    return await ticket_repository.get_with_relations(db, ticket.id)


def _audit_text(value) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "value"):
        return str(value.value)
    if isinstance(value, (list, dict)):
        import json
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


@router.get("/{ticket_id}/activity", response_model=list[TicketAuditLogResponse])
async def get_ticket_activity(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")
    result = await db.execute(
        select(TicketAuditLog)
        .options(joinedload(TicketAuditLog.actor))
        .where(TicketAuditLog.ticket_id == ticket_id)
        .order_by(TicketAuditLog.timestamp.asc(), TicketAuditLog.id.asc())
    )
    return [
        TicketAuditLogResponse(
            id=entry.id,
            ticket_id=entry.ticket_id,
            user_id=entry.user_id,
            action_type=entry.action_type,
            old_value=entry.old_value,
            new_value=entry.new_value,
            timestamp=entry.timestamp,
            actor_name=entry.actor.full_name or entry.actor.email,
        )
        for entry in result.scalars().all()
    ]

@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")
    ticket.is_deleted = True
    db.add(ticket)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: int,
    content: str = Form(""),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")
    if current_user.role == UserRole.CUSTOMER and ticket.reporter_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions")

    content = content.strip()
    if not content and image is None:
        raise HTTPException(status_code=422, detail="Add comment text or attach an image")
    if len(content) > 5000:
        raise HTTPException(status_code=422, detail="Comment text must not exceed 5,000 characters")

    stored_name = None
    if image is not None:
        data = await image.read(settings.COMMENT_IMAGE_MAX_BYTES + 1)
        if len(data) > settings.COMMENT_IMAGE_MAX_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds the configured size limit")
        extension = _image_extension(image.content_type, data)
        if extension is None:
            raise HTTPException(status_code=415, detail="Attach a valid PNG, JPEG, GIF, or WebP image")
        storage = Path(settings.TICKET_IMAGE_STORAGE_PATH).expanduser()
        storage.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid4().hex}{extension}"
        (storage / stored_name).write_bytes(data)

    from app.models.comment import Comment
    comment = Comment(content=content, image_path=stored_name, ticket_id=ticket_id, author_id=current_user.id)
    db.add(comment)
    try:
        await db.commit()
    except Exception:
        if stored_name:
            (Path(settings.TICKET_IMAGE_STORAGE_PATH).expanduser() / stored_name).unlink(missing_ok=True)
        raise
    await db.refresh(comment)
    comments = await comment_repository.get_by_ticket(db, ticket_id=ticket_id)
    for c in comments:
        if c.id == comment.id:
            return c
    return comment


def _image_extension(content_type: Optional[str], data: bytes) -> Optional[str]:
    signatures = {
        "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
        "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
        "image/gif": (b"GIF8", ".gif"),
        "image/webp": (b"RIFF", ".webp"),
    }
    normalized_type = (content_type or "").lower()
    signature = signatures.get(normalized_type)
    if not signature or not data.startswith(signature[0]):
        return None
    if normalized_type == "image/webp" and data[8:12] != b"WEBP":
        return None
    return signature[1]


@router.get("/{ticket_id}/comments/{comment_id}/image")
async def get_comment_image(
    ticket_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket or ticket.is_deleted:
        raise NotFoundException(detail="Ticket not found")
    from app.models.comment import Comment
    comment = await db.scalar(select(Comment).where(Comment.id == comment_id, Comment.ticket_id == ticket_id))
    if not comment or not comment.image_path:
        raise NotFoundException(detail="Comment image not found")
    storage = Path(settings.TICKET_IMAGE_STORAGE_PATH).expanduser().resolve()
    image_path = (storage / comment.image_path).resolve()
    if image_path.parent != storage or not image_path.is_file():
        raise NotFoundException(detail="Comment image not found")
    return FileResponse(image_path)
