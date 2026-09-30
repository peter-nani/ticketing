from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.schemas.user import UserResponse
from app.schemas.comment import CommentResponse
from app.schemas.attachment import AttachmentResponse

class TicketBase(BaseModel):
    title: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM
    category: TicketCategory

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    category: Optional[TicketCategory] = None
    assignee_id: Optional[int] = None

class TicketResponse(TicketBase):
    id: int
    status: TicketStatus
    reporter_id: int
    assignee_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_deleted: bool
    reporter: UserResponse
    assignee: Optional[UserResponse] = None
    comments: List[CommentResponse] = []
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True
