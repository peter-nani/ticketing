from typing import List, Optional, Tuple
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, cast, String
from sqlalchemy.orm import selectinload
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.comment import Comment
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate
from app.repositories.base import BaseRepository

class TicketRepository(BaseRepository[Ticket, TicketCreate, TicketUpdate]):
    async def get_with_relations(self, db: AsyncSession, ticket_id: int) -> Optional[Ticket]:
        result = await db.execute(
            select(Ticket)
            .options(
                selectinload(Ticket.reporter),
                selectinload(Ticket.assignee),
                selectinload(Ticket.comments).selectinload(Comment.author) if hasattr(Ticket, 'comments') else selectinload(Ticket.comments),
                selectinload(Ticket.attachments)
            )
            .filter(Ticket.id == ticket_id, Ticket.is_deleted == False)
        )
        return result.scalars().first()

    async def get_multi_filtered(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        category: Optional[TicketCategory] = None,
        assignee_id: Optional[int] = None,
        reporter_id: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Ticket], int]:
        query = select(Ticket).filter(Ticket.is_deleted == False)

        if status:
            query = query.filter(Ticket.status == status)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if category:
            query = query.filter(Ticket.category == category)
        if assignee_id is not None:
            query = query.filter(Ticket.assignee_id.is_(None) if assignee_id == 0 else Ticket.assignee_id == assignee_id)
        if reporter_id:
            query = query.filter(Ticket.reporter_id == reporter_id)
        if search:
            tag_names = [quoted or bare for quoted, bare in re.findall(r'(?:^|\s)tag:(?:"([^"]+)"|([^\s]+))', search, flags=re.IGNORECASE)]
            for tag_name in tag_names:
                query = query.filter(cast(Ticket.tags, String).ilike(f'%"{tag_name.strip(chr(34))}"%'))
            reporters = [quoted or bare for quoted, bare in re.findall(r'(?:^|\s)reporter:(?:"([^"]+)"|([^\s]+))', search, flags=re.IGNORECASE)]
            for reporter in reporters:
                pattern = f"%{reporter.strip()}%"
                query = query.filter(Ticket.reporter.has(or_(User.full_name.ilike(pattern), User.email.ilike(pattern))))
            remaining = re.sub(r'(?:^|\s)(?:tag|reporter):(?:"[^"]+"|[^\s]+)', " ", search, flags=re.IGNORECASE).strip()
            if remaining:
                pattern = f"%{remaining}%"
                query = query.filter(or_(
                    Ticket.title.ilike(pattern), Ticket.description.ilike(pattern),
                    cast(Ticket.tags, String).ilike(pattern),
                    Ticket.reporter.has(or_(User.full_name.ilike(pattern), User.email.ilike(pattern))),
                    Ticket.assignee.has(or_(User.full_name.ilike(pattern), User.email.ilike(pattern)))
                ))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await db.execute(count_query)
        total = total_res.scalar_one()

        # Fetch paginated with relations
        query = query.options(
            selectinload(Ticket.reporter),
            selectinload(Ticket.assignee),
            selectinload(Ticket.comments).selectinload(Comment.author),
            selectinload(Ticket.attachments)
        ).order_by(Ticket.created_at.desc(), Ticket.id.desc()).offset(skip).limit(limit)

        result = await db.execute(query)
        items = result.scalars().all()

        return items, total

ticket_repository = TicketRepository(Ticket)
