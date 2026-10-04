from datetime import datetime
from pydantic import BaseModel
from typing import Optional
from app.schemas.user import UserResponse

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: int
    ticket_id: int
    author_id: int
    created_at: datetime
    author: UserResponse
    image_path: Optional[str] = None

    class Config:
        from_attributes = True
