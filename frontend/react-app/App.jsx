import React, { useState, useEffect } from 'react';
import ExpenseDashboard from './components/ExpenseDashboard';
import ExpenseForm from './components/ExpenseForm';
import Visualization from './components/Visualization';
import './styles.css';

function App() {
    const [expenses, setExpenses] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/expenses');
            if (response.ok) {
                const data = await response.json();
                setExpenses(data);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
        }
    };

    const addExpense = async (expense) => {
        try {
            const response = await fetch('http://localhost:5000/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });
            
            if (response.ok) {
                loadExpenses();
                return true;
            }
        } catch (error) {
            console.error('Error adding expense:', error);
        }
        return false;
    };

    const tabs = [
        { id: 'dashboard', label: '📊 Dashboard' },
        { id: 'expenses', label: '💰 Expenses' },
        { id: 'visualization', label: '📈 Visualization' },
        { id: 'predictions', label: '🔮 Predictions' }
    ];

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>Company Expenses System</h1>
                <nav className="app-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="app-main">
                {activeTab === 'dashboard' && (
                    <ExpenseDashboard expenses={expenses} />
                )}
                {activeTab === 'expenses' && (
                    <ExpenseForm onAddExpense={addExpense} />
                )}
                {activeTab === 'visualization' && (
                    <Visualization expenses={expenses} />
                )}
                {activeTab === 'predictions' && (
                    <div className="predictions-container">
                        <h2>Expense Predictions</h2>
                        {/* Prediction components here */}
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;