"""
Security Utilities
"""

import jwt
from typing import Dict, Any
from fastapi import HTTPException, status

def verify_jwt_token(token: str, secret_key: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

class RateLimiter:
    """Simple rate limiter"""
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = {}
    
    def allow_request(self) -> bool:
        """Check if request is allowed"""
        return True  # Simplified for now
