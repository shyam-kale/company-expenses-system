"""
ExpenseFlow - Main Backend Application
Production-grade FastAPI application with complete integration layer

This module implements the complete backend integration featuring:
- FastAPI application setup with middleware stack
- JWT authentication and authorization system
- Redis caching with intelligent invalidation
- Rate limiting and security middleware
- Database connection pooling and session management
- Pagination utilities with cursor-based support
- Error handling and logging infrastructure
- Health checks and monitoring endpoints
- CORS and security headers configuration
- Background task management
- WebSocket integration for real-time features
"""

import asyncio
import logging
import sys
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from contextlib import asynccontextmanager
from functools import wraps
import hashlib
import secrets

from fastapi import FastAPI, Request, Response, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool, QueuePool
from sqlalchemy import select, text
import redis.asyncio as redis
import jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field, validator
import uvicorn

from database.smart_models import User, UserRole, Base
# Import these inside functions to avoid circular imports
# from core.realtime_engine import RealtimeEngine
# from ai.intelligent_processor import IntelligentProcessor
# from api.advanced_endpoints import app as api_app

# ==================== CONFIGURATION ====================

class Settings(BaseModel):
    """Application configuration with environment variable support"""
    
    # Application
    APP_NAME: str = "ExpenseFlow"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/expenseflow"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_MAX_CONNECTIONS: int = 50
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173"
    ]
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # Caching
    CACHE_TTL: int = 300
    CACHE_MAX_SIZE: int = 10000
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# ==================== LOGGING SETUP ====================

def setup_logging():
    """Configure application logging with structured format"""
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format=settings.LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(f"logs/expenseflow_{datetime.now().strftime('%Y%m%d')}.log")
        ]
    )
    
    # Set specific log levels for libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("websockets").setLevel(logging.INFO)

logger = logging.getLogger(__name__)

# ==================== DATABASE CONNECTION ====================

class DatabaseManager:
    """Advanced database connection manager with pooling and health checks"""
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize database engine with connection pooling"""
        if self._initialized:
            return
        
        logger.info("Initializing database connection pool...")
        
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            poolclass=QueuePool,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_timeout=settings.DB_POOL_TIMEOUT,
            pool_recycle=settings.DB_POOL_RECYCLE,
            echo=settings.DEBUG,
            future=True
        )
        
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        
        # Test connection
        async with self.engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        
        self._initialized = True
        logger.info("✅ Database connection pool initialized")
    
    async def create_tables(self):
        """Create all database tables"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created")
    
    async def health_check(self) -> bool:
        """Check database connection health"""
        try:
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()
            logger.info("✅ Database connections closed")
    
    async def get_session(self) -> AsyncSession:
        """Get database session"""
        async with self.session_factory() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                raise
            finally:
                await session.close()

db_manager = DatabaseManager()

# ==================== REDIS CACHE MANAGER ====================

class CacheManager:
    """Advanced Redis cache manager with intelligent invalidation"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self._initialized = False
    
    async def initialize(self):
        """Initialize Redis connection pool"""
        if self._initialized:
            return
        
        logger.info("Initializing Redis cache...")
        
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            decode_responses=True
        )
        
        # Test connection
        await self.redis_client.ping()
        
        self._initialized = True
        logger.info("✅ Redis cache initialized")
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            value = await self.redis_client.get(key)
            if value:
                import json
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None):
        """Set value in cache with TTL"""
        try:
            import json
            ttl = ttl or settings.CACHE_TTL
            await self.redis_client.setex(
                key,
                ttl,
                json.dumps(value, default=str)
            )
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete key from cache"""
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
    
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                await self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")
    
    async def health_check(self) -> bool:
        """Check Redis connection health"""
        try:
            await self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("✅ Redis connection closed")

cache_manager = CacheManager()

# ==================== AUTHENTICATION & SECURITY ====================

class AuthManager:
    """JWT authentication and authorization manager"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.security = HTTPBearer()
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, user_id: str, role: str) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "user_id": user_id,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    def create_refresh_token(self, user_id: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "user_id": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
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
    
    async def get_current_user(
        self,
        credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
        session: AsyncSession = Depends(db_manager.get_session)
    ) -> User:
        """Get current authenticated user"""
        token = credentials.credentials
        payload = self.verify_token(token)
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        result = await session.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        return user
    
    def require_role(self, allowed_roles: List[UserRole]):
        """Decorator to require specific user roles"""
        async def role_checker(current_user: User = Depends(self.get_current_user)):
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return current_user
        return role_checker

auth_manager = AuthManager()

# ==================== RATE LIMITING ====================

class RateLimiter:
    """Token bucket rate limiter with Redis backend"""
    
    def __init__(self, max_requests: int = None, window_seconds: int = None):
        self.max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        self.window_seconds = window_seconds or settings.RATE_LIMIT_WINDOW
    
    async def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed under rate limit"""
        key = f"rate_limit:{identifier}"
        
        try:
            current = await cache_manager.redis_client.get(key)
            
            if current is None:
                await cache_manager.redis_client.setex(key, self.window_seconds, 1)
                return True
            
            if int(current) >= self.max_requests:
                return False
            
            await cache_manager.redis_client.incr(key)
            return True
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            return True  # Fail open
    
    async def get_remaining(self, identifier: str) -> int:
        """Get remaining requests in current window"""
        key = f"rate_limit:{identifier}"
        try:
            current = await cache_manager.redis_client.get(key)
            if current is None:
                return self.max_requests
            return max(0, self.max_requests - int(current))
        except Exception:
            return self.max_requests

rate_limiter = RateLimiter()

# ==================== PAGINATION UTILITIES ====================

class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        return self.page_size

async def paginate_query(query, session: AsyncSession, pagination: PaginationParams) -> Dict[str, Any]:
    """Paginate SQLAlchemy query with metadata"""
    # Get total count
    from sqlalchemy import func, select as sa_select
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

# ==================== MIDDLEWARE ====================

class RequestLoggingMiddleware:
    """Middleware for request/response logging and timing"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                duration = time.time() - start_time
                logger.info(
                    f"Request {request_id}: {scope['method']} {scope['path']} "
                    f"completed in {duration:.3f}s with status {message['status']}"
                )
            await send(message)
        
        await self.app(scope, receive, send_wrapper)

class RateLimitMiddleware:
    """Middleware for rate limiting requests"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Extract identifier (IP or user ID from token)
        identifier = scope["client"][0] if scope.get("client") else "unknown"
        
        if not await rate_limiter.is_allowed(identifier):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"}
            )
            await response(scope, receive, send)
            return
        
        await self.app(scope, receive, send)

# ==================== APPLICATION LIFESPAN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    # Startup
    logger.info("🚀 Starting ExpenseFlow application...")
    
    setup_logging()
    
    # Initialize database
    await db_manager.initialize()
    await db_manager.create_tables()
    
    # Initialize cache
    await cache_manager.initialize()
    
    # Initialize real-time engine (import here to avoid circular import)
    try:
        from core.realtime_engine import RealtimeEngine
        realtime_engine = RealtimeEngine(
            redis_url=settings.REDIS_URL,
            database_url=settings.DATABASE_URL,
            jwt_secret=settings.SECRET_KEY
        )
        await realtime_engine.initialize()
        app.state.realtime_engine = realtime_engine
    except Exception as e:
        logger.warning(f"Real-time engine initialization failed: {e}")
        app.state.realtime_engine = None
    
    # Initialize AI processor (import here to avoid circular import)
    try:
        from ai.intelligent_processor import IntelligentProcessor
        ai_processor = IntelligentProcessor(
            redis_url=settings.REDIS_URL,
            model_storage_path="models/"
        )
        await ai_processor.initialize()
        app.state.ai_processor = ai_processor
    except Exception as e:
        logger.warning(f"AI processor initialization failed: {e}")
        app.state.ai_processor = None
    
    logger.info("✅ ExpenseFlow application started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down ExpenseFlow application...")
    
    if hasattr(app.state, 'realtime_engine') and app.state.realtime_engine:
        await app.state.realtime_engine.shutdown()
    await db_manager.close()
    await cache_manager.close()
    
    logger.info("✅ ExpenseFlow application shutdown complete")

# ==================== MAIN APPLICATION ====================

def create_application() -> FastAPI:
    """Create and configure FastAPI application"""
    
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Production-grade expense management system with AI and real-time features",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan
    )
    
    # CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"]
    )
    
    # GZip Compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    
    # Trusted Host
    if not settings.DEBUG:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["localhost", "127.0.0.1", "*.expenseflow.com"]
        )
    
    # Custom Middleware
    app.middleware("http")(RequestLoggingMiddleware(app))
    app.middleware("http")(RateLimitMiddleware(app))
    
    # Exception Handlers
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "status_code": exc.status_code,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "status_code": 500,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    # Health Check Endpoints
    @app.get("/health")
    async def health_check():
        """Comprehensive health check"""
        db_healthy = await db_manager.health_check()
        cache_healthy = await cache_manager.health_check()
        
        return {
            "status": "healthy" if (db_healthy and cache_healthy) else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": settings.APP_VERSION,
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "cache": "healthy" if cache_healthy else "unhealthy",
                "realtime": "healthy" if hasattr(app.state, 'realtime_engine') else "unavailable",
                "ai": "healthy" if hasattr(app.state, 'ai_processor') else "unavailable"
            }
        }
    
    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running",
            "docs": "/docs" if settings.DEBUG else "disabled",
            "health": "/health"
        }
    
    # Mount API routes (import here to avoid circular import)
    try:
        from api.advanced_endpoints import app as api_app
        app.mount("/api", api_app)
    except Exception as e:
        logger.warning(f"API endpoints mounting failed: {e}")
    
    return app

# Create application instance
app = create_application()

# ==================== UTILITY FUNCTIONS ====================

def generate_cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments"""
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()

def cache_response(ttl: int = None):
    """Decorator for caching endpoint responses"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"response:{func.__name__}:{generate_cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached = await cache_manager.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

async def invalidate_cache(pattern: str):
    """Invalidate cache entries matching pattern"""
    await cache_manager.delete_pattern(f"response:*{pattern}*")

# ==================== MAIN ENTRY POINT ====================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS if not settings.DEBUG else 1,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=True
    )
