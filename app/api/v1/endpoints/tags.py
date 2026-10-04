from fastapi import APIRouter, Depends, status
from sqlalchemy import cast, select, String
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.dependencies.auth import get_current_user, get_current_active_superuser
from app.core.database import get_db
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.ticket import Ticket
from app.models.ticket_tag import TicketTag
from app.models.ticket_audit_log import TicketAuditLog
from app.models.user import User
from app.schemas.ticket_tag import TicketTagCreate, TicketTagResponse

router = APIRouter(prefix="/tags", tags=["Tags"])


@router.get("/", response_model=list[TicketTagResponse])
async def list_tags(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(TicketTag).order_by(TicketTag.name.asc()))
    return result.scalars().all()


@router.post("/", response_model=TicketTagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(tag_in: TicketTagCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_active_superuser)):
    name = tag_in.name.strip()
    existing = await db.scalar(select(TicketTag.id).where(TicketTag.name.ilike(name)))
    if existing:
        raise BadRequestException(detail="A tag with this name already exists")
    tag = TicketTag(name=name, color=tag_in.color)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_active_superuser)):
    tag = await db.get(TicketTag, tag_id)
    if not tag:
        raise NotFoundException(detail="Tag not found")
    result = await db.execute(select(Ticket).where(cast(Ticket.tags, String).ilike(f'%"{tag.name}"%')))
    for ticket in result.scalars().all():
        old_tags = ticket.tags or []
        new_tags = [value for value in old_tags if value != tag.name]
        if old_tags != new_tags:
            ticket.tags = new_tags
            db.add(TicketAuditLog(ticket_id=ticket.id, user_id=current_user.id, action_type="tags", old_value=", ".join(old_tags), new_value=", ".join(new_tags)))
    await db.delete(tag)
    await db.commit()
