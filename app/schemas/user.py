from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(min_length=8, max_length=72)
    role: UserRole = UserRole.CUSTOMER
    is_active: bool = True

class AdminUserCreate(BaseModel):
    """Payload accepted only by the local, single-use bootstrap operation."""
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(min_length=8, max_length=72)

class UserRegistration(BaseModel):
    """Public sign-up payload; callers cannot choose their role or active state."""
    email: EmailStr
    full_name: Optional[str] = None
    password: str = Field(min_length=8, max_length=72)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)

class UserInDB(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserResponse(UserInDB):
    pass

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[int] = None
    token_type: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str
