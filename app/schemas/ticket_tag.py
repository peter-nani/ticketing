from pydantic import BaseModel, Field, field_validator


class TicketTagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=48)
    color: str = Field(default="#607d8b", pattern=r"^#[0-9A-Fa-f]{6}$")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Tag name cannot be blank")
        return name


class TicketTagResponse(TicketTagCreate):
    id: int

    class Config:
        from_attributes = True
