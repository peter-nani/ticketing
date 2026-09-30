from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload
from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketCategory
from app.models.comment import Comment
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
    ) -> Tuple[List[Ticket], int]:
        query = select(Ticket).filter(Ticket.is_deleted == False)

        if status:
            query = query.filter(Ticket.status == status)
        if priority:
            query = query.filter(Ticket.priority == priority)
        if category:
            query = query.filter(Ticket.category == category)
        if assignee_id:
            query = query.filter(Ticket.assignee_id == assignee_id)
        if reporter_id:
            query = query.filter(Ticket.reporter_id == reporter_id)

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
        ).offset(skip).limit(limit)

        result = await db.execute(query)
        items = result.scalars().all()

        return items, total

ticket_repository = TicketRepository(Ticket)
