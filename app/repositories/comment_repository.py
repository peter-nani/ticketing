from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.comment import Comment
from app.schemas.comment import CommentCreate
from app.repositories.base import BaseRepository

class CommentRepository(BaseRepository[Comment, CommentCreate, CommentCreate]):
    async def get_by_ticket(self, db: AsyncSession, *, ticket_id: int) -> List[Comment]:
        result = await db.execute(
            select(Comment)
            .options(selectinload(Comment.author))
            .filter(Comment.ticket_id == ticket_id)
        )
        return result.scalars().all()

comment_repository = CommentRepository(Comment)
