"""
Cache Utilities
"""

from functools import wraps
from typing import Callable

def cache_response(ttl: int = 300):
    """Decorator for caching responses"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Cache logic handled by backend.main cache_manager
            return await func(*args, **kwargs)
        return wrapper
    return decorator

async def invalidate_cache(pattern: str):
    """Invalidate cache by pattern"""
    from backend.main import cache_manager
    await cache_manager.delete_pattern(f"response:*{pattern}*")
