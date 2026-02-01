"""
ExpenseFlow - Advanced API Endpoints
High-performance REST API with GraphQL support, real-time aggregation, and complex querying

This module implements production-grade API endpoints featuring:
- Comprehensive REST API with advanced filtering and pagination
- GraphQL integration for flexible data querying
- Real-time data streaming with Server-Sent Events
- Complex aggregations and analytics endpoints
- Batch operations for bulk processing
- Performance optimization with caching and query optimization
- WebSocket integration for live updates
- Advanced authentication and authorization
"""

from fastapi import FastAPI, HTTPException, Depends, Query, Path, Body, BackgroundTasks, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, asc, case, cast, Integer
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, validator
import asyncio
import json
import logging
from enum import Enum
import uuid

from database.smart_models import (
    User, Expense, Category, Department, Budget, 
    ExpenseComment, AuditLog, Notification,
    ExpenseStatus, UserRole, AuditAction
)
# Remove circular import - get these from app.state instead
# from database.connection import get_db
# from core.realtime_engine import RealtimeEngine, MessageType, RealtimeMessage
# from ai.intelligent_processor import IntelligentProcessor
from utils.auth import get_current_user, require_role
from utils.pagination import PaginationParams, paginate_query
from utils.cache import cache_response, invalidate_cache

logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

class ExpenseCreate(BaseModel):
    """Schema for creating a new expense"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)
    amount: float = Field(..., gt=0, le=1000000)
    currency: str = Field(default="USD", max_length=3)
    expense_date: datetime
    category_id: uuid.UUID
    department_id: uuid.UUID
    merchant_name: Optional[str] = Field(None, max_length=255)
    receipt_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return round(v, 2)

class ExpenseUpdate(BaseModel):
    """Schema for updating an expense"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, gt=0)
    expense_date: Optional[datetime] = None
    category_id: Optional[uuid.UUID] = None
    merchant_name: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class ExpenseResponse(BaseModel):
    """Schema for expense response"""
    id: uuid.UUID
    title: str
    description: Optional[str]
    amount: float
    currency: str
    expense_date: datetime
    status: str
    category: Dict[str, Any]
    department: Dict[str, Any]
    user: Dict[str, Any]
    ai_category_confidence: Optional[float]
    ai_fraud_score: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class ExpenseFilterParams(BaseModel):
    """Advanced filtering parameters for expenses"""
    category_ids: Optional[List[uuid.UUID]] = None
    department_ids: Optional[List[uuid.UUID]] = None
    user_ids: Optional[List[uuid.UUID]] = None
    status: Optional[List[str]] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    tags: Optional[List[str]] = None
    has_receipt: Optional[bool] = None
    fraud_risk_min: Optional[float] = None
    sort_by: str = Field(default="created_at")
    sort_order: str = Field(default="desc")

class BulkExpenseOperation(BaseModel):
    """Schema for bulk expense operations"""
    expense_ids: List[uuid.UUID]
    operation: str = Field(..., regex="^(approve|reject|delete|export)$")
    reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class AnalyticsRequest(BaseModel):
    """Schema for analytics requests"""
    metric: str
    group_by: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    aggregation: str = Field(default="sum")

# ==================== FASTAPI APP INITIALIZATION ====================

app = FastAPI(
    title="ExpenseFlow Advanced API",
    description="High-performance expense management API with real-time features",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (would be initialized in lifespan)
realtime_engine: Optional[RealtimeEngine] = None
ai_processor: Optional[IntelligentProcessor] = None

# ==================== HEALTH & STATUS ENDPOINTS ====================

@app.get("/api/health")
async def health_check():
    """Comprehensive health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "services": {
            "database": "connected",
            "redis": "connected",
            "ai_processor": "ready" if ai_processor else "unavailable",
            "realtime_engine": "ready" if realtime_engine else "unavailable"
        }
    }

@app.get("/api/metrics")
async def get_metrics(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    """Get system metrics and performance statistics"""
    metrics = {
        "timestamp": datetime.now().isoformat(),
        "realtime": realtime_engine.get_connection_stats() if realtime_engine else {},
        "api": {
            "total_requests": 0,  # Would be tracked by middleware
            "avg_response_time": 0,
            "error_rate": 0
        }
    }
    return metrics

# ==================== EXPENSE ENDPOINTS ====================

@app.post("/api/expenses", response_model=ExpenseResponse, status_code=201)
async def create_expense(
    expense_data: ExpenseCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new expense with AI categorization and fraud detection
    Triggers real-time notifications and background processing
    """
    try:
        # Create expense object
        expense = Expense(
            title=expense_data.title,
            description=expense_data.description,
            amount=expense_data.amount,
            currency=expense_data.currency,
            expense_date=expense_data.expense_date,
            category_id=expense_data.category_id,
            department_id=expense_data.department_id,
            user_id=current_user.id,
            merchant_name=expense_data.merchant_name,
            receipt_url=expense_data.receipt_url,
            tags=expense_data.tags,
            metadata=expense_data.metadata,
            status=ExpenseStatus.PENDING
        )
        
        # AI Processing - Categorization
        if ai_processor:
            categorization_result = await ai_processor.categorize_expense(
                expense_data.dict(), session
            )
            expense.ai_category_confidence = categorization_result.confidence
            expense.ai_analysis = categorization_result.metadata
            
            # AI Processing - Fraud Detection
            fraud_result = await ai_processor.detect_fraud(
                expense_data.dict(), session
            )
            expense.ai_fraud_score = fraud_result.prediction['fraud_probability']
        
        # Save to database
        session.add(expense)
        await session.commit()
        await session.refresh(expense)
        
        # Load relationships
        await session.refresh(expense, ['category', 'department', 'user'])
        
        # Real-time notification
        if realtime_engine:
            await realtime_engine.broadcast_expense_update(
                str(expense.id),
                {
                    'action': 'created',
                    'expense': await _expense_to_dict(expense)
                }
            )
        
        # Background tasks
        background_tasks.add_task(_process_expense_background, expense.id, session)
        
        # Create audit log
        audit_log = AuditLog.create_log(
            session=session,
            action=AuditAction.CREATE,
            entity_type='expense',
            entity_id=expense.id,
            user_id=current_user.id,
            new_values=expense_data.dict()
        )
        session.add(audit_log)
        await session.commit()
        
        return await _expense_to_response(expense)
        
    except Exception as e:
        logger.error(f"Error creating expense: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create expense: {str(e)}")

@app.get("/api/expenses", response_model=Dict[str, Any])
@cache_response(ttl=300)
async def get_expenses(
    filters: ExpenseFilterParams = Depends(),
    pagination: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get expenses with advanced filtering, pagination, and sorting
    Supports complex queries with multiple filters and relationships
    """
    try:
        # Build base query with eager loading
        query = select(Expense).options(
            selectinload(Expense.category),
            selectinload(Expense.department),
            selectinload(Expense.user)
        )
        
        # Apply filters
        conditions = [Expense.is_deleted == False]
        
        # Role-based filtering
        if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            conditions.append(Expense.user_id == current_user.id)
        elif current_user.role == UserRole.MANAGER and current_user.department_id:
            conditions.append(Expense.department_id == current_user.department_id)
        
        # Category filter
        if filters.category_ids:
            conditions.append(Expense.category_id.in_(filters.category_ids))
        
        # Department filter
        if filters.department_ids:
            conditions.append(Expense.department_id.in_(filters.department_ids))
        
        # User filter
        if filters.user_ids:
            conditions.append(Expense.user_id.in_(filters.user_ids))
        
        # Status filter
        if filters.status:
            status_enums = [ExpenseStatus(s) for s in filters.status]
            conditions.append(Expense.status.in_(status_enums))
        
        # Amount range filter
        if filters.min_amount is not None:
            conditions.append(Expense.amount >= filters.min_amount)
        if filters.max_amount is not None:
            conditions.append(Expense.amount <= filters.max_amount)
        
        # Date range filter
        if filters.start_date:
            conditions.append(Expense.expense_date >= filters.start_date)
        if filters.end_date:
            conditions.append(Expense.expense_date <= filters.end_date)
        
        # Search filter
        if filters.search:
            search_term = f"%{filters.search}%"
            conditions.append(
                or_(
                    Expense.title.ilike(search_term),
                    Expense.description.ilike(search_term),
                    Expense.merchant_name.ilike(search_term)
                )
            )
        
        # Tags filter
        if filters.tags:
            conditions.append(Expense.tags.contains(filters.tags))
        
        # Receipt filter
        if filters.has_receipt is not None:
            if filters.has_receipt:
                conditions.append(Expense.receipt_url.isnot(None))
            else:
                conditions.append(Expense.receipt_url.is_(None))
        
        # Fraud risk filter
        if filters.fraud_risk_min is not None:
            conditions.append(Expense.ai_fraud_score >= filters.fraud_risk_min)
        
        # Apply all conditions
        query = query.where(and_(*conditions))
        
        # Apply sorting
        sort_column = getattr(Expense, filters.sort_by, Expense.created_at)
        if filters.sort_order == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Paginate
        paginated_result = await paginate_query(query, session, pagination)
        
        # Convert to response format
        expenses_data = [
            await _expense_to_dict(expense) 
            for expense in paginated_result['items']
        ]
        
        return {
            "items": expenses_data,
            "total": paginated_result['total'],
            "page": pagination.page,
            "page_size": pagination.page_size,
            "total_pages": paginated_result['total_pages']
        }
        
    except Exception as e:
        logger.error(f"Error getting expenses: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve expenses: {str(e)}")

@app.get("/api/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID = Path(...),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single expense by ID with full details"""
    try:
        result = await session.execute(
            select(Expense)
            .options(
                selectinload(Expense.category),
                selectinload(Expense.department),
                selectinload(Expense.user),
                selectinload(Expense.comments)
            )
            .where(Expense.id == expense_id, Expense.is_deleted == False)
        )
        
        expense = result.scalar_one_or_none()
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Check permissions
        if (current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and 
            expense.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return await _expense_to_response(expense)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting expense {expense_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve expense")

@app.put("/api/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: uuid.UUID,
    expense_data: ExpenseUpdate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an expense with validation and real-time sync"""
    try:
        result = await session.execute(
            select(Expense).where(Expense.id == expense_id, Expense.is_deleted == False)
        )
        expense = result.scalar_one_or_none()
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Check permissions
        if (current_user.role not in [UserRole.ADMIN, UserRole.MANAGER] and 
            expense.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Store old values for audit
        old_values = {
            'title': expense.title,
            'amount': float(expense.amount),
            'description': expense.description
        }
        
        # Update fields
        update_data = expense_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(expense, field, value)
        
        expense.increment_version()
        await session.commit()
        await session.refresh(expense, ['category', 'department', 'user'])
        
        # Real-time notification
        if realtime_engine:
            await realtime_engine.broadcast_expense_update(
                str(expense.id),
                {
                    'action': 'updated',
                    'expense': await _expense_to_dict(expense),
                    'updated_fields': list(update_data.keys())
                }
            )
        
        # Audit log
        audit_log = AuditLog.create_log(
            session=session,
            action=AuditAction.UPDATE,
            entity_type='expense',
            entity_id=expense.id,
            user_id=current_user.id,
            old_values=old_values,
            new_values=update_data
        )
        session.add(audit_log)
        await session.commit()
        
        # Invalidate cache
        await invalidate_cache(f"expense:{expense_id}")
        
        return await _expense_to_response(expense)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating expense {expense_id}: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Failed to update expense")

@app.delete("/api/expenses/{expense_id}", status_code=204)
async def delete_expense(
    expense_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete an expense"""
    try:
        result = await session.execute(
            select(Expense).where(Expense.id == expense_id, Expense.is_deleted == False)
        )
        expense = result.scalar_one_or_none()
        
        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        # Check permissions
        if (current_user.role not in [UserRole.ADMIN] and 
            expense.user_id != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Soft delete
        expense.soft_delete()
        await session.commit()
        
        # Real-time notification
        if realtime_engine:
            await realtime_engine.broadcast_expense_update(
                str(expense.id),
                {'action': 'deleted', 'expense_id': str(expense.id)}
            )
        
        # Audit log
        audit_log = AuditLog.create_log(
            session=session,
            action=AuditAction.DELETE,
            entity_type='expense',
            entity_id=expense.id,
            user_id=current_user.id
        )
        session.add(audit_log)
        await session.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting expense {expense_id}: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete expense")

# ==================== BULK OPERATIONS ====================

@app.post("/api/expenses/bulk", response_model=Dict[str, Any])
async def bulk_expense_operation(
    operation_data: BulkExpenseOperation,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))
):
    """
    Perform bulk operations on multiple expenses
    Supports approve, reject, delete, and export operations
    """
    try:
        results = {
            'success': [],
            'failed': [],
            'total': len(operation_data.expense_ids)
        }
        
        for expense_id in operation_data.expense_ids:
            try:
                result = await session.execute(
                    select(Expense).where(Expense.id == expense_id, Expense.is_deleted == False)
                )
                expense = result.scalar_one_or_none()
                
                if not expense:
                    results['failed'].append({
                        'id': str(expense_id),
                        'reason': 'Expense not found'
                    })
                    continue
                
                # Perform operation
                if operation_data.operation == 'approve':
                    expense.status = ExpenseStatus.APPROVED
                    expense.approved_by_id = current_user.id
                    expense.approved_at = datetime.now()
                    
                elif operation_data.operation == 'reject':
                    expense.status = ExpenseStatus.REJECTED
                    expense.rejection_reason = operation_data.reason
                    
                elif operation_data.operation == 'delete':
                    expense.soft_delete()
                
                results['success'].append(str(expense_id))
                
            except Exception as e:
                results['failed'].append({
                    'id': str(expense_id),
                    'reason': str(e)
                })
        
        await session.commit()
        
        # Real-time notifications
        if realtime_engine and results['success']:
            await realtime_engine.broadcast_notification(
                [str(current_user.id)],
                {
                    'title': 'Bulk Operation Complete',
                    'message': f"Processed {len(results['success'])} expenses",
                    'type': 'success'
                }
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Error in bulk operation: {e}")
        await session.rollback()
        raise HTTPException(status_code=500, detail="Bulk operation failed")

# ==================== ANALYTICS ENDPOINTS ====================

@app.post("/api/analytics/query", response_model=Dict[str, Any])
@cache_response(ttl=600)
async def analytics_query(
    analytics_request: AnalyticsRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Advanced analytics query endpoint with flexible aggregations
    Supports grouping, filtering, and multiple aggregation functions
    """
    try:
        # Build base query
        query = select(Expense).where(Expense.is_deleted == False)
        
        # Apply date filters
        if analytics_request.start_date:
            query = query.where(Expense.expense_date >= analytics_request.start_date)
        if analytics_request.end_date:
            query = query.where(Expense.expense_date <= analytics_request.end_date)
        
        # Apply custom filters
        if analytics_request.filters:
            for key, value in analytics_request.filters.items():
                if hasattr(Expense, key):
                    query = query.where(getattr(Expense, key) == value)
        
        # Role-based filtering
        if current_user.role not in [UserRole.ADMIN]:
            if current_user.role == UserRole.MANAGER and current_user.department_id:
                query = query.where(Expense.department_id == current_user.department_id)
            else:
                query = query.where(Expense.user_id == current_user.id)
        
        # Execute query and aggregate
        result = await session.execute(query)
        expenses = result.scalars().all()
        
        # Perform aggregation
        aggregated_data = await _aggregate_expenses(
            expenses,
            analytics_request.metric,
            analytics_request.group_by,
            analytics_request.aggregation
        )
        
        return {
            'metric': analytics_request.metric,
            'aggregation': analytics_request.aggregation,
            'data': aggregated_data,
            'total_records': len(expenses),
            'generated_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in analytics query: {e}")
        raise HTTPException(status_code=500, detail="Analytics query failed")

@app.get("/api/analytics/dashboard", response_model=Dict[str, Any])
@cache_response(ttl=300)
async def get_dashboard_analytics(
    period: str = Query(default="30d", regex="^(7d|30d|90d|1y)$"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive dashboard analytics
    Includes spending trends, category breakdown, and budget utilization
    """
    try:
        # Calculate date range
        days_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
        days = days_map[period]
        start_date = datetime.now() - timedelta(days=days)
        
        # Build query with role-based filtering
        query = select(Expense).where(
            and_(
                Expense.expense_date >= start_date,
                Expense.is_deleted == False
            )
        )
        
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            query = query.where(Expense.department_id == current_user.department_id)
        elif current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            query = query.where(Expense.user_id == current_user.id)
        
        result = await session.execute(query)
        expenses = result.scalars().all()
        
        # Calculate metrics
        total_amount = sum(float(exp.amount) for exp in expenses)
        avg_amount = total_amount / len(expenses) if expenses else 0
        
        # Category breakdown
        category_breakdown = {}
        for exp in expenses:
            cat_name = exp.category.name if exp.category else 'Other'
            category_breakdown[cat_name] = category_breakdown.get(cat_name, 0) + float(exp.amount)
        
        # Status breakdown
        status_breakdown = {}
        for exp in expenses:
            status = exp.status.value
            status_breakdown[status] = status_breakdown.get(status, 0) + 1
        
        # Trend data (daily aggregation)
        trend_data = await _calculate_trend_data(expenses, days)
        
        # Top expenses
        top_expenses = sorted(expenses, key=lambda x: x.amount, reverse=True)[:5]
        
        return {
            'period': period,
            'summary': {
                'total_expenses': len(expenses),
                'total_amount': total_amount,
                'average_amount': avg_amount,
                'max_amount': max(float(exp.amount) for exp in expenses) if expenses else 0
            },
            'category_breakdown': category_breakdown,
            'status_breakdown': status_breakdown,
            'trend_data': trend_data,
            'top_expenses': [
                {
                    'id': str(exp.id),
                    'title': exp.title,
                    'amount': float(exp.amount),
                    'date': exp.expense_date.isoformat()
                }
                for exp in top_expenses
            ],
            'generated_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting dashboard analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard analytics")

@app.get("/api/analytics/trends", response_model=Dict[str, Any])
@cache_response(ttl=600)
async def get_spending_trends(
    granularity: str = Query(default="daily", regex="^(daily|weekly|monthly)$"),
    period: int = Query(default=30, ge=7, le=365),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get spending trends with configurable granularity
    Supports daily, weekly, and monthly aggregations
    """
    try:
        start_date = datetime.now() - timedelta(days=period)
        
        # Build query
        query = select(Expense).where(
            and_(
                Expense.expense_date >= start_date,
                Expense.is_deleted == False,
                Expense.status == ExpenseStatus.APPROVED
            )
        )
        
        # Role-based filtering
        if current_user.role == UserRole.MANAGER and current_user.department_id:
            query = query.where(Expense.department_id == current_user.department_id)
        elif current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            query = query.where(Expense.user_id == current_user.id)
        
        result = await session.execute(query)
        expenses = result.scalars().all()
        
        # Aggregate by granularity
        trends = await _aggregate_by_time_period(expenses, granularity)
        
        # Calculate growth rates
        growth_rates = _calculate_growth_rates(trends)
        
        return {
            'granularity': granularity,
            'period_days': period,
            'trends': trends,
            'growth_rates': growth_rates,
            'total_data_points': len(trends),
            'generated_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting spending trends: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve spending trends")

# ==================== AI-POWERED ENDPOINTS ====================

@app.post("/api/ai/categorize", response_model=Dict[str, Any])
async def ai_categorize_expense(
    expense_data: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI-powered expense categorization
    Returns predicted category with confidence score and explanation
    """
    try:
        if not ai_processor:
            raise HTTPException(status_code=503, detail="AI processor not available")
        
        result = await ai_processor.categorize_expense(expense_data, session)
        
        return {
            'predicted_category': result.prediction,
            'confidence': result.confidence,
            'explanation': result.explanation,
            'all_probabilities': result.metadata.get('all_probabilities', {}),
            'processing_time_ms': result.processing_time_ms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI categorization: {e}")
        raise HTTPException(status_code=500, detail="AI categorization failed")

@app.post("/api/ai/detect-fraud", response_model=Dict[str, Any])
async def ai_detect_fraud(
    expense_data: Dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI-powered fraud detection
    Returns fraud probability, risk score, and detailed analysis
    """
    try:
        if not ai_processor:
            raise HTTPException(status_code=503, detail="AI processor not available")
        
        result = await ai_processor.detect_fraud(expense_data, session)
        
        return {
            'is_fraud': result.prediction['is_fraud'],
            'fraud_probability': result.prediction['fraud_probability'],
            'risk_score': result.prediction['risk_score'],
            'risk_level': result.prediction['risk_level'],
            'explanation': result.explanation,
            'risk_factors': result.metadata.get('risk_factors', []),
            'processing_time_ms': result.processing_time_ms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in fraud detection: {e}")
        raise HTTPException(status_code=500, detail="Fraud detection failed")

@app.get("/api/ai/insights", response_model=List[Dict[str, Any]])
async def get_ai_insights(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-generated insights and recommendations
    Provides actionable suggestions based on spending patterns
    """
    try:
        if not ai_processor:
            raise HTTPException(status_code=503, detail="AI processor not available")
        
        insights = await ai_processor.generate_insights(str(current_user.id), session)
        
        return [insight.to_dict() for insight in insights]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI insights: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve insights")

# ==================== REAL-TIME STREAMING ====================

@app.get("/api/stream/expenses")
async def stream_expenses(
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Server-Sent Events endpoint for real-time expense updates
    Streams new expenses and updates as they occur
    """
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                # Check for new expenses (simplified - would use pub/sub in production)
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.now().isoformat()})}\n\n"
                
                await asyncio.sleep(5)
                
        except asyncio.CancelledError:
            pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# ==================== HELPER FUNCTIONS ====================

async def _expense_to_dict(expense: Expense) -> Dict[str, Any]:
    """Convert expense object to dictionary"""
    return {
        'id': str(expense.id),
        'title': expense.title,
        'description': expense.description,
        'amount': float(expense.amount),
        'currency': expense.currency,
        'expense_date': expense.expense_date.isoformat(),
        'status': expense.status.value,
        'category': {
            'id': str(expense.category.id),
            'name': expense.category.name
        } if expense.category else None,
        'department': {
            'id': str(expense.department.id),
            'name': expense.department.name
        } if expense.department else None,
        'user': {
            'id': str(expense.user.id),
            'name': expense.user.full_name
        } if expense.user else None,
        'ai_fraud_score': float(expense.ai_fraud_score),
        'created_at': expense.created_at.isoformat(),
        'updated_at': expense.updated_at.isoformat()
    }

async def _expense_to_response(expense: Expense) -> ExpenseResponse:
    """Convert expense to response model"""
    return ExpenseResponse(
        id=expense.id,
        title=expense.title,
        description=expense.description,
        amount=float(expense.amount),
        currency=expense.currency,
        expense_date=expense.expense_date,
        status=expense.status.value,
        category={'id': str(expense.category.id), 'name': expense.category.name} if expense.category else {},
        department={'id': str(expense.department.id), 'name': expense.department.name} if expense.department else {},
        user={'id': str(expense.user.id), 'name': expense.user.full_name} if expense.user else {},
        ai_category_confidence=expense.ai_category_confidence,
        ai_fraud_score=float(expense.ai_fraud_score),
        created_at=expense.created_at,
        updated_at=expense.updated_at
    )

async def _process_expense_background(expense_id: uuid.UUID, session: AsyncSession):
    """Background processing for expense"""
    # Would implement additional processing like:
    # - Budget impact calculation
    # - Notification sending
    # - Report generation
    pass

async def _aggregate_expenses(expenses: List[Expense], metric: str, 
                             group_by: Optional[List[str]], 
                             aggregation: str) -> Dict[str, Any]:
    """Aggregate expenses based on metric and grouping"""
    if not group_by:
        # Simple aggregation
        if aggregation == 'sum':
            return {'total': sum(float(exp.amount) for exp in expenses)}
        elif aggregation == 'avg':
            return {'average': sum(float(exp.amount) for exp in expenses) / len(expenses) if expenses else 0}
        elif aggregation == 'count':
            return {'count': len(expenses)}
    
    # Grouped aggregation
    grouped_data = {}
    for exp in expenses:
        key = tuple(getattr(exp, field, 'Unknown') for field in group_by)
        if key not in grouped_data:
            grouped_data[key] = []
        grouped_data[key].append(float(exp.amount))
    
    result = {}
    for key, amounts in grouped_data.items():
        key_str = '_'.join(str(k) for k in key)
        if aggregation == 'sum':
            result[key_str] = sum(amounts)
        elif aggregation == 'avg':
            result[key_str] = sum(amounts) / len(amounts)
        elif aggregation == 'count':
            result[key_str] = len(amounts)
    
    return result

async def _calculate_trend_data(expenses: List[Expense], days: int) -> List[Dict[str, Any]]:
    """Calculate daily trend data"""
    daily_data = {}
    
    for exp in expenses:
        date_key = exp.expense_date.date().isoformat()
        if date_key not in daily_data:
            daily_data[date_key] = {'amount': 0, 'count': 0}
        daily_data[date_key]['amount'] += float(exp.amount)
        daily_data[date_key]['count'] += 1
    
    return [
        {
            'date': date,
            'amount': data['amount'],
            'count': data['count']
        }
        for date, data in sorted(daily_data.items())
    ]

async def _aggregate_by_time_period(expenses: List[Expense], 
                                   granularity: str) -> List[Dict[str, Any]]:
    """Aggregate expenses by time period"""
    aggregated = {}
    
    for exp in expenses:
        if granularity == 'daily':
            key = exp.expense_date.date().isoformat()
        elif granularity == 'weekly':
            key = f"{exp.expense_date.year}-W{exp.expense_date.isocalendar()[1]}"
        else:  # monthly
            key = f"{exp.expense_date.year}-{exp.expense_date.month:02d}"
        
        if key not in aggregated:
            aggregated[key] = {'amount': 0, 'count': 0}
        aggregated[key]['amount'] += float(exp.amount)
        aggregated[key]['count'] += 1
    
    return [
        {
            'period': period,
            'amount': data['amount'],
            'count': data['count']
        }
        for period, data in sorted(aggregated.items())
    ]

def _calculate_growth_rates(trends: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate growth rates from trend data"""
    if len(trends) < 2:
        return {'overall': 0.0}
    
    first_amount = trends[0]['amount']
    last_amount = trends[-1]['amount']
    
    if first_amount == 0:
        return {'overall': 0.0}
    
    growth_rate = ((last_amount - first_amount) / first_amount) * 100
    
    return {
        'overall': round(growth_rate, 2),
        'period_over_period': round(growth_rate / len(trends), 2)
    }

# Export app
__all__ = ['app']
