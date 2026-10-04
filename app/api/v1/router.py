from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, tickets
from app.api.v1.endpoints import tags

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(tickets.router)
api_router.include_router(tags.router)
