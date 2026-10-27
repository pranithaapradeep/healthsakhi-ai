from fastapi import APIRouter

from ..assessment.router import router as assessment_router
from ..auth.router import router as auth_router
from ..chat.router import router as chat_router
from ..hospitals.router import router as hospitals_router
from ..safety.router import router as safety_router
from .routes import conversations, health, profile

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(health.router)
api_v1.include_router(auth_router)
api_v1.include_router(profile.router)
api_v1.include_router(conversations.router)
api_v1.include_router(chat_router)
api_v1.include_router(safety_router)
api_v1.include_router(assessment_router)
api_v1.include_router(hospitals_router)

# Unversioned liveness probe for load balancers and the frontend status indicator.
api_root = APIRouter(prefix="/api")
api_root.include_router(health.router)
