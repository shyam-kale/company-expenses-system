"""
ExpenseFlow - Simplified Backend Starter
Minimal version without complex dependencies for testing
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="ExpenseFlow API",
    version="2.0.0",
    description="Simplified Expense Management API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: str
    description: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    category: str
    date: str
    description: Optional[str]
    created_at: str

# ==================== IN-MEMORY STORAGE ====================

expenses_db: List[Dict[str, Any]] = []
expense_id_counter = 1

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ExpenseFlow API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "expenses": "/api/expenses"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "services": {
            "api": "healthy",
            "database": "in-memory",
            "cache": "not-configured",
            "realtime": "not-configured",
            "ai": "not-configured"
        }
    }

@app.get("/api/expenses")
async def get_expenses():
    """Get all expenses"""
    return {
        "success": True,
        "count": len(expenses_db),
        "expenses": expenses_db
    }

@app.post("/api/expenses", status_code=201)
async def create_expense(expense: ExpenseCreate):
    """Create a new expense"""
    global expense_id_counter
    
    new_expense = {
        "id": expense_id_counter,
        "title": expense.title,
        "amount": expense.amount,
        "category": expense.category,
        "date": expense.date,
        "description": expense.description,
        "created_at": datetime.now().isoformat()
    }
    
    expenses_db.append(new_expense)
    expense_id_counter += 1
    
    return {
        "success": True,
        "message": "Expense created successfully",
        "expense": new_expense
    }

@app.get("/api/expenses/{expense_id}")
async def get_expense(expense_id: int):
    """Get a single expense"""
    for expense in expenses_db:
        if expense["id"] == expense_id:
            return {
                "success": True,
                "expense": expense
            }
    
    raise HTTPException(status_code=404, detail="Expense not found")

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(expense_id: int):
    """Delete an expense"""
    global expenses_db
    
    for i, expense in enumerate(expenses_db):
        if expense["id"] == expense_id:
            deleted_expense = expenses_db.pop(i)
            return {
                "success": True,
                "message": "Expense deleted successfully",
                "expense": deleted_expense
            }
    
    raise HTTPException(status_code=404, detail="Expense not found")

@app.get("/api/stats")
async def get_stats():
    """Get expense statistics"""
    if not expenses_db:
        return {
            "success": True,
            "stats": {
                "total_expenses": 0,
                "total_amount": 0,
                "average_amount": 0,
                "categories": {}
            }
        }
    
    total_amount = sum(e["amount"] for e in expenses_db)
    categories = {}
    
    for expense in expenses_db:
        cat = expense["category"]
        if cat not in categories:
            categories[cat] = {"count": 0, "total": 0}
        categories[cat]["count"] += 1
        categories[cat]["total"] += expense["amount"]
    
    return {
        "success": True,
        "stats": {
            "total_expenses": len(expenses_db),
            "total_amount": total_amount,
            "average_amount": total_amount / len(expenses_db),
            "categories": categories
        }
    }

# ==================== ERROR HANDLERS ====================

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

# ==================== MAIN ====================

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting ExpenseFlow Simplified Backend")
    print("=" * 60)
    print("Host: 0.0.0.0")
    print("Port: 8000")
    print("=" * 60)
    print()
    print("📚 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("🔄 Frontend Test: http://localhost:8000/../frontend/test.html")
    print()
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
