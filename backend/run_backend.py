"""
ExpenseFlow Backend Starter
Adds project root to Python path and starts the FastAPI server
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Now import and run the main app
if __name__ == "__main__":
    import uvicorn
    from backend.main import app, settings
    
    print("=" * 60)
    print("🚀 Starting ExpenseFlow Backend Server")
    print("=" * 60)
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Host: {settings.HOST}")
    print(f"Port: {settings.PORT}")
    print(f"Debug: {settings.DEBUG}")
    print("=" * 60)
    print()
    print("📚 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("🔄 ReDoc: http://localhost:8000/redoc")
    print()
    print("=" * 60)
    
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
