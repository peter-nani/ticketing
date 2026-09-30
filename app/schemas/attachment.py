from datetime import datetime
from pydantic import BaseModel
from app.schemas.user import UserResponse

class AttachmentResponse(BaseModel):
    id: int
    ticket_id: int
    file_path: str
    filename: str
    mime_type: str
    uploaded_by: int
    uploaded_at: datetime
    uploader: UserResponse

    class Config:
        from_attributes = True
