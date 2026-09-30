from datetime import datetime
from pydantic import BaseModel
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

    class Config:
        from_attributes = True
