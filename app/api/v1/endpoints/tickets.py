from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.exceptions import NotFoundException, ForbiddenException
from app.api.v1.dependencies.auth import get_current_user, get_current_active_agent_or_admin
from app.models.user import User, UserRole
from app.models.ticket import TicketStatus, TicketPriority, TicketCategory
from app.repositories.ticket_repository import ticket_repository
from app.repositories.comment_repository import comment_repository
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse
from app.schemas.comment import CommentCreate, CommentResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.create(db, obj_in=ticket_in, reporter_id=current_user.id)
    return await ticket_repository.get_with_relations(db, ticket.id)

@router.get("/", response_model=PaginatedResponse[TicketResponse])
async def list_tickets(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    category: Optional[TicketCategory] = None,
    assignee_id: Optional[int] = None,
    reporter_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    skip = (page - 1) * size
    
    # If customer, restrict tickets to their own reported tickets
    if current_user.role == UserRole.CUSTOMER:
        reporter_id = current_user.id

    items, total = await ticket_repository.get_multi_filtered(
        db,
        skip=skip,
        limit=size,
        status=status,
        priority=priority,
        category=category,
        assignee_id=assignee_id,
        reporter_id=reporter_id
    )

    pages = (total + size - 1) // size if size > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get_with_relations(db, ticket_id)
    if not ticket:
        raise NotFoundException(detail="Ticket not found")
    
    if current_user.role == UserRole.CUSTOMER and ticket.reporter_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions to view this ticket")
    
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_in: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket:
        raise NotFoundException(detail="Ticket not found")

    if current_user.role == UserRole.CUSTOMER:
        if ticket.reporter_id != current_user.id:
            raise ForbiddenException(detail="Not enough permissions")
        # Customers can only update title or description if open
        if ticket_in.status or ticket_in.assignee_id or ticket_in.priority or ticket_in.category:
            raise ForbiddenException(detail="Customers cannot change ticket status, priority, category or assignee")

    update_data = ticket_in.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == TicketStatus.RESOLVED and not ticket.resolved_at:
        update_data["resolved_at"] = datetime.now(timezone.utc)

    updated_ticket = await ticket_repository.update(db, db_obj=ticket, obj_in=update_data)
    return await ticket_repository.get_with_relations(db, updated_ticket.id)

@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: int,
    comment_in: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_repository.get(db, id=ticket_id)
    if not ticket:
        raise NotFoundException(detail="Ticket not found")
    if current_user.role == UserRole.CUSTOMER and ticket.reporter_id != current_user.id:
        raise ForbiddenException(detail="Not enough permissions")

    comment = await comment_repository.create(db, obj_in=comment_in, ticket_id=ticket_id, author_id=current_user.id)
    # fetch with author relationship
    comments = await comment_repository.get_by_ticket(db, ticket_id=ticket_id)
    for c in comments:
        if c.id == comment.id:
            return c
    return comment
