"""
Authentication and Authorization Utilities
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from typing import List

from database.smart_models import User, UserRole

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = None
) -> User:
    """Get current authenticated user from JWT token"""
    from backend.main import auth_manager
    return await auth_manager.get_current_user(credentials, session)

def require_role(allowed_roles: List[UserRole]):
    """Require specific user roles"""
    from backend.main import auth_manager
    return auth_manager.require_role(allowed_roles)
