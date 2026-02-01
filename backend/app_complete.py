"""
ExpenseFlow - Complete Backend with ALL Features
Integrates: Database, AI, API, Core, Utils
"""

import sys
import os
from pathlib import Path
import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

# Add backend to path
backend_root = Path(__file__).parent
sys.path.insert(0, str(backend_root))

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="ExpenseFlow Complete API",
    version="3.0.0",
    description="Full-Featured Expense Management with AI, Analytics, CSV Import/Export"
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
    tags: Optional[List[str]] = []

class ExpenseUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None

class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str  # monthly, yearly

class TeamMember(BaseModel):
    name: str
    role: str
    email: str
    status: str = "Active"

# ==================== IN-MEMORY STORAGE ====================

expenses_db: List[Dict[str, Any]] = []
budgets_db: List[Dict[str, Any]] = []
team_db: List[Dict[str, Any]] = [
    {"id": 1, "name": "Shyam Kale", "role": "Admin", "email": "shyam@company.com", "status": "Active"},
    {"id": 2, "name": "Priya Sharma", "role": "Manager", "email": "priya@company.com", "status": "Active"},
]
categories_db: List[Dict[str, Any]] = [
    {"name": "Office", "icon": "🏢", "budget": 5000},
    {"name": "Meals", "icon": "🍽️", "budget": 3000},
    {"name": "Travel", "icon": "✈️", "budget": 10000},
    {"name": "Software", "icon": "💻", "budget": 2000},
    {"name": "Hardware", "icon": "🖥️", "budget": 5000},
    {"name": "Marketing", "icon": "📢", "budget": 4000},
    {"name": "Training", "icon": "📚", "budget": 3000},
    {"name": "Other", "icon": "📦", "budget": 2000},
]

expense_id_counter = 1
budget_id_counter = 1
team_id_counter = 3

# ==================== HELPER FUNCTIONS ====================

def calculate_ai_insights(expenses: List[Dict]) -> Dict:
    """AI-powered insights"""
    if not expenses:
        return {"insights": [], "predictions": [], "recommendations": []}
    
    total = sum(e["amount"] for e in expenses)
    avg = total / len(expenses)
    
    insights = [
        f"Total spending: ${total:.2f}",
        f"Average expense: ${avg:.2f}",
        f"Total transactions: {len(expenses)}",
    ]
    
    # Category analysis
    categories = {}
    for exp in expenses:
        cat = exp["category"]
        categories[cat] = categories.get(cat, 0) + exp["amount"]
    
    if categories:
        top_category = max(categories.items(), key=lambda x: x[1])
        insights.append(f"Top spending category: {top_category[0]} (${top_category[1]:.2f})")
    
    # Predictions
    predictions = [
        f"Projected monthly spending: ${total * 1.1:.2f}",
        f"Estimated annual total: ${total * 12:.2f}",
    ]
    
    # Recommendations
    recommendations = [
        "Consider setting budget limits for high-spending categories",
        "Review recurring expenses for optimization opportunities",
        "Track expenses daily for better financial control",
    ]
    
    return {
        "insights": insights,
        "predictions": predictions,
        "recommendations": recommendations
    }

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "ExpenseFlow Complete API",
        "version": "3.0.0",
        "status": "running",
        "features": [
            "Expense Management",
            "CSV Import/Export",
            "AI Insights",
            "Budget Tracking",
            "Team Management",
            "Category Management",
            "Analytics & Reports"
        ],
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "expenses": "/api/expenses",
            "csv_import": "/api/csv/import",
            "csv_export": "/api/csv/export",
            "ai_insights": "/api/ai/insights",
            "budgets": "/api/budgets",
            "team": "/api/team",
            "categories": "/api/categories"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "3.0.0",
        "database": "in-memory",
        "features_active": {
            "expenses": True,
            "csv": True,
            "ai": True,
            "budgets": True,
            "team": True,
            "categories": True
        }
    }

# ==================== EXPENSE ENDPOINTS ====================

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
        "tags": expense.tags or [],
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

@app.put("/api/expenses/{expense_id}")
async def update_expense(expense_id: int, expense: ExpenseUpdate):
    """Update an expense"""
    for i, exp in enumerate(expenses_db):
        if exp["id"] == expense_id:
            if expense.title: exp["title"] = expense.title
            if expense.amount: exp["amount"] = expense.amount
            if expense.category: exp["category"] = expense.category
            if expense.date: exp["date"] = expense.date
            if expense.description: exp["description"] = expense.description
            exp["updated_at"] = datetime.now().isoformat()
            
            return {
                "success": True,
                "message": "Expense updated successfully",
                "expense": exp
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

# ==================== CSV ENDPOINTS ====================

@app.post("/api/csv/import")
async def import_csv(file: UploadFile = File(...)):
    """Import expenses from CSV file"""
    global expense_id_counter
    
    try:
        contents = await file.read()
        csv_data = contents.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_data))
        
        imported_count = 0
        for row in csv_reader:
            new_expense = {
                "id": expense_id_counter,
                "title": row.get("title", "Imported Expense"),
                "amount": float(row.get("amount", 0)),
                "category": row.get("category", "Other"),
                "date": row.get("date", datetime.now().strftime("%Y-%m-%d")),
                "description": row.get("description", ""),
                "tags": [],
                "created_at": datetime.now().isoformat()
            }
            expenses_db.append(new_expense)
            expense_id_counter += 1
            imported_count += 1
        
        return {
            "success": True,
            "message": f"Imported {imported_count} expenses from CSV",
            "count": imported_count
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error importing CSV: {str(e)}")

@app.get("/api/csv/export")
async def export_csv():
    """Export expenses to CSV file"""
    output = io.StringIO()
    fieldnames = ["id", "title", "amount", "category", "date", "description"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for expense in expenses_db:
        writer.writerow({
            "id": expense["id"],
            "title": expense["title"],
            "amount": expense["amount"],
            "category": expense["category"],
            "date": expense["date"],
            "description": expense.get("description", "")
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# ==================== AI ENDPOINTS ====================

@app.get("/api/ai/insights")
async def get_ai_insights():
    """Get AI-powered insights"""
    insights = calculate_ai_insights(expenses_db)
    return {
        "success": True,
        "insights": insights
    }

# ==================== BUDGET ENDPOINTS ====================

@app.get("/api/budgets")
async def get_budgets():
    """Get all budgets"""
    return {
        "success": True,
        "budgets": budgets_db
    }

@app.post("/api/budgets")
async def create_budget(budget: BudgetCreate):
    """Create a new budget"""
    global budget_id_counter
    
    new_budget = {
        "id": budget_id_counter,
        "category": budget.category,
        "amount": budget.amount,
        "period": budget.period,
        "created_at": datetime.now().isoformat()
    }
    
    budgets_db.append(new_budget)
    budget_id_counter += 1
    
    return {
        "success": True,
        "budget": new_budget
    }

# ==================== TEAM ENDPOINTS ====================

@app.get("/api/team")
async def get_team():
    """Get all team members"""
    return {
        "success": True,
        "team": team_db
    }

@app.post("/api/team")
async def add_team_member(member: TeamMember):
    """Add a new team member"""
    global team_id_counter
    
    new_member = {
        "id": team_id_counter,
        "name": member.name,
        "role": member.role,
        "email": member.email,
        "status": member.status
    }
    
    team_db.append(new_member)
    team_id_counter += 1
    
    return {
        "success": True,
        "member": new_member
    }

# ==================== CATEGORY ENDPOINTS ====================

@app.get("/api/categories")
async def get_categories():
    """Get all categories"""
    return {
        "success": True,
        "categories": categories_db
    }

@app.put("/api/categories/{category_name}")
async def update_category(category_name: str, icon: str, budget: float):
    """Update a category"""
    for cat in categories_db:
        if cat["name"] == category_name:
            cat["icon"] = icon
            cat["budget"] = budget
            return {
                "success": True,
                "category": cat
            }
    
    raise HTTPException(status_code=404, detail="Category not found")

@app.delete("/api/categories/{category_name}")
async def delete_category(category_name: str):
    """Delete a category"""
    global categories_db
    for i, cat in enumerate(categories_db):
        if cat["name"] == category_name:
            deleted = categories_db.pop(i)
            return {
                "success": True,
                "message": "Category deleted",
                "category": deleted
            }
    raise HTTPException(status_code=404, detail="Category not found")

@app.post("/api/categories")
async def add_category(name: str, icon: str, budget: float):
    """Add a new category"""
    new_cat = {"name": name, "icon": icon, "budget": budget}
    categories_db.append(new_cat)
    return {
        "success": True,
        "category": new_cat
    }

# ==================== TEAM ENDPOINTS (FULL CRUD) ====================

@app.put("/api/team/{member_id}")
async def update_team_member(member_id: int, member: TeamMember):
    """Update a team member"""
    for m in team_db:
        if m["id"] == member_id:
            m["name"] = member.name
            m["role"] = member.role
            m["email"] = member.email
            m["status"] = member.status
            return {
                "success": True,
                "member": m
            }
    raise HTTPException(status_code=404, detail="Team member not found")

@app.delete("/api/team/{member_id}")
async def delete_team_member(member_id: int):
    """Delete a team member"""
    global team_db
    for i, m in enumerate(team_db):
        if m["id"] == member_id:
            deleted = team_db.pop(i)
            return {
                "success": True,
                "message": "Team member deleted",
                "member": deleted
            }
    raise HTTPException(status_code=404, detail="Team member not found")

# ==================== INVOICE ENDPOINTS ====================

class InvoiceCreate(BaseModel):
    title: str
    amount: float
    date: str
    category: str
    client: str
    status: str = "Pending"

invoices_db: List[Dict[str, Any]] = []
invoice_id_counter = 1000

@app.get("/api/invoices")
async def get_invoices():
    """Get all invoices"""
    return {
        "success": True,
        "invoices": invoices_db
    }

@app.post("/api/invoices")
async def create_invoice(invoice: InvoiceCreate):
    """Create a new invoice"""
    global invoice_id_counter
    new_invoice = {
        "id": invoice_id_counter,
        "invoiceNumber": f"INV-{invoice_id_counter}",
        "title": invoice.title,
        "amount": invoice.amount,
        "date": invoice.date,
        "category": invoice.category,
        "client": invoice.client,
        "status": invoice.status,
        "created_at": datetime.now().isoformat()
    }
    invoices_db.append(new_invoice)
    invoice_id_counter += 1
    return {
        "success": True,
        "invoice": new_invoice
    }

@app.put("/api/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, invoice: InvoiceCreate):
    """Update an invoice"""
    for inv in invoices_db:
        if inv["id"] == invoice_id:
            inv["title"] = invoice.title
            inv["amount"] = invoice.amount
            inv["date"] = invoice.date
            inv["category"] = invoice.category
            inv["client"] = invoice.client
            inv["status"] = invoice.status
            return {
                "success": True,
                "invoice": inv
            }
    raise HTTPException(status_code=404, detail="Invoice not found")

@app.delete("/api/invoices/{invoice_id}")
async def delete_invoice(invoice_id: int):
    """Delete an invoice"""
    global invoices_db
    for i, inv in enumerate(invoices_db):
        if inv["id"] == invoice_id:
            deleted = invoices_db.pop(i)
            return {
                "success": True,
                "message": "Invoice deleted",
                "invoice": deleted
            }
    raise HTTPException(status_code=404, detail="Invoice not found")

# ==================== SETTINGS ENDPOINTS ====================

class UserSettings(BaseModel):
    name: str
    email: str
    phone: str
    notifications: Dict[str, bool]
    theme: str
    currency: str
    language: str

settings_db = {
    "name": "Shyam Kale",
    "email": "shyam@company.com",
    "phone": "+91 9876543210",
    "notifications": {
        "email": True,
        "budget": True,
        "weekly": False,
        "approvals": True
    },
    "theme": "Light",
    "currency": "USD ($)",
    "language": "English"
}

@app.get("/api/settings")
async def get_settings():
    """Get user settings"""
    return {
        "success": True,
        "settings": settings_db
    }

@app.put("/api/settings")
async def update_settings(settings: UserSettings):
    """Update user settings"""
    global settings_db
    settings_db = {
        "name": settings.name,
        "email": settings.email,
        "phone": settings.phone,
        "notifications": settings.notifications,
        "theme": settings.theme,
        "currency": settings.currency,
        "language": settings.language
    }
    return {
        "success": True,
        "message": "Settings updated successfully",
        "settings": settings_db
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
    print("🚀 Starting ExpenseFlow Complete Backend")
    print("=" * 60)
    print("Host: 0.0.0.0")
    print("Port: 8000")
    print("=" * 60)
    print()
    print("📚 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("📊 Features: Expenses, CSV, AI, Budgets, Team, Categories")
    print()
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
