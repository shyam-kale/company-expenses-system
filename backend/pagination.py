
"""
Pagination Utilities
"""

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select as sa_select
from typing import Dict, Any

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size

async def paginate_query(query, session: AsyncSession, pagination: PaginationParams) -> Dict[str, Any]:
    """Paginate SQLAlchemy query"""
    # Get total count
    count_query = sa_select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    paginated_query = query.offset(pagination.offset).limit(pagination.limit)
    result = await session.execute(paginated_query)
    items = result.scalars().all()
    
    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
        "total_pages": (total + pagination.page_size - 1) // pagination.page_size
    }


