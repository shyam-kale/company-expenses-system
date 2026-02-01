// Main Application Controller
class ExpenseSystem {
    constructor() {
        this.expenses = [];
        this.charts = {};
        this.currentSection = 'dashboard';
        this.csvData = null;
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        this.updateDateTime();
        this.loadExpenses();
        this.setupCharts();
        this.checkSystemStatus();
        this.setupAnimations();
        
        // Load sample data if no data exists
        if (this.expenses.length === 0) {
            this.loadSampleData();
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.sidebar a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(link.getAttribute('href').substring(1));
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.getElementById('themeToggle').textContent = 
                document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
            this.updateCharts();
        });

        // Expense form
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // File upload
        document.getElementById('csvFile').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // Initialize date
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    showSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.sidebar a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === sectionId) {
                link.classList.add('active');
            }
        });

        // Update content
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        this.currentSection = sectionId;

        // Load section-specific data
        switch(sectionId) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'reports':
                this.generateReport();
                break;
            case 'predictions':
                this.predictExpenses();
                break;
        }
    }

    async loadExpenses() {
        try {
            // Simulate API call
            const response = await fetch('http://localhost:5000/api/expenses');
            if (response.ok) {
                this.expenses = await response.json();
            } else {
                // Load from localStorage as fallback
                const saved = localStorage.getItem('expenses');
                this.expenses = saved ? JSON.parse(saved) : [];
            }
            this.updateExpenseList();
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading expenses:', error);
            this.showNotification('Could not connect to server. Using local data.', 'warning');
            const saved = localStorage.getItem('expenses');
            this.expenses = saved ? JSON.parse(saved) : [];
            this.updateExpenseList();
            this.updateDashboard();
        }
    }

    async addExpense() {
        const form = document.getElementById('expenseForm');
        const expense = {
            id: Date.now(),
            name: document.getElementById('expenseName').value,
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            department: document.getElementById('department').value,
            description: document.getElementById('description').value,
            timestamp: new Date().toISOString()
        };

        // Add animation
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.textContent = 'Adding...';
        submitBtn.disabled = true;

        try {
            // Simulate API call
            const response = await fetch('http://localhost:5000/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expense)
            });

            if (response.ok) {
                this.expenses.push(expense);
                localStorage.setItem('expenses', JSON.stringify(this.expenses));
                
                // Animation success
                submitBtn.textContent = '✓ Added!';
                submitBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
                
                setTimeout(() => {
                    submitBtn.textContent = 'Add Expense';
                    submitBtn.disabled = false;
                    submitBtn.style.background = 'linear-gradient(135deg, var(--secondary-color), #1abc9c)';
                    form.reset();
                    document.getElementById('date').value = new Date().toISOString().split('T')[0];
                }, 1000);

                this.updateExpenseList();
                this.updateDashboard();
                this.showNotification('Expense added successfully!', 'success');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            this.expenses.push(expense);
            localStorage.setItem('expenses', JSON.stringify(this.expenses));
            
            submitBtn.textContent = '✓ Added Locally';
            submitBtn.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
            
            setTimeout(() => {
                submitBtn.textContent = 'Add Expense';
                submitBtn.disabled = false;
                submitBtn.style.background = 'linear-gradient(135deg, var(--secondary-color), #1abc9c)';
                form.reset();
            }, 1000);

            this.updateExpenseList();
            this.updateDashboard();
            this.showNotification('Expense saved locally (server offline)', 'warning');
        }
    }

    updateExpenseList() {
        const tbody = document.getElementById('expenseTableBody');
        tbody.innerHTML = '';

        // Show last 10 expenses
        const recentExpenses = [...this.expenses]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        recentExpenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${expense.name}</td>
                <td>$${expense.amount.toFixed(2)}</td>
                <td><span class="category-badge">${expense.category}</span></td>
                <td>${new Date(expense.date).toLocaleDateString()}</td>
                <td>
                    <button onclick="expenseSystem.deleteExpense(${expense.id})" class="delete-btn">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(exp => exp.id !== id);
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        this.updateExpenseList();
        this.updateDashboard();
        this.showNotification('Expense deleted', 'info');
    }

    updateDashboard() {
        if (this.expenses.length === 0) return;

        const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const monthlyAvg = total / (this.expenses.length || 1);
        
        // Category analysis
        const categories = {};
        this.expenses.forEach(exp => {
            categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
        });
        
        const topCategory = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];

        // Update cards with animations
        this.animateValue('totalExpenses', 0, total, 1000);
        this.animateValue('monthlyAverage', 0, monthlyAvg, 1000);
        
        document.getElementById('topCategory').querySelector('.amount').textContent = topCategory[0];
        document.getElementById('topCategory').querySelector('.trend').textContent = `$${topCategory[1].toFixed(2)}`;
        
        const alerts = this.expenses.filter(exp => exp.amount > 10000).length;
        document.getElementById('alerts').querySelector('.amount').textContent = alerts;
        document.getElementById('alerts').querySelector('.trend').style.color = alerts > 0 ? '#e74c3c' : '#27ae60';

        // Update charts
        this.updateCharts();
    }

    animateValue(elementId, start, end, duration) {
        const element = document.getElementById(elementId).querySelector('.amount');
        let startTimestamp = null;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = `$${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        
        window.requestAnimationFrame(step);
    }

    setupCharts() {
        // Expense Trend Chart
        const trendCtx = document.getElementById('expenseTrendChart').getContext('2d');
        this.charts.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Expenses Over Time',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });

        // Category Distribution Chart
        const categoryCtx = document.getElementById('categoryDistributionChart').getContext('2d');
        this.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
                        '#9b59b6', '#1abc9c', '#d35400', '#34495e'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                animation: {
                    animateRotate: true,
                    animateScale: true
                },
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // Prediction Chart
        const predictionCtx = document.getElementById('predictionChart').getContext('2d');
        this.charts.prediction = new Chart(predictionCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Historical',
                        data: [],
                        borderColor: '#3498db',
                        borderWidth: 2,
                        fill: false
                    },
                    {
                        label: 'Predicted',
                        data: [],
                        borderColor: '#e74c3c',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.expenses.length === 0) return;

        // Group expenses by month
        const monthlyData = {};
        this.expenses.forEach(exp => {
            const date = new Date(exp.date);
            const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += exp.amount;
        });

        const months = Object.keys(monthlyData).sort();
        const amounts = months.map(month => monthlyData[month]);

        // Update trend chart
        this.charts.trend.data.labels = months;
        this.charts.trend.data.datasets[0].data = amounts;
        this.charts.trend.update();

        // Update category chart
        const categories = {};
        this.expenses.forEach(exp => {
            categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
        });

        this.charts.category.data.labels = Object.keys(categories);
        this.charts.category.data.datasets[0].data = Object.values(categories);
        this.charts.category.update();
    }

    async generateReport() {
        const type = document.getElementById('reportType').value;
        const month = document.getElementById('reportMonth').value;
        
        let filteredExpenses = [...this.expenses];
        
        if (month) {
            filteredExpenses = filteredExpenses.filter(exp => 
                exp.date.startsWith(month)
            );
        }

        let reportData;
        switch(type) {
            case 'monthly':
                reportData = this.generateMonthlyReport(filteredExpenses);
                break;
            case 'category':
                reportData = this.generateCategoryReport(filteredExpenses);
                break;
            case 'department':
                reportData = this.generateDepartmentReport(filteredExpenses);
                break;
        }

        this.displayReport(reportData, type);
    }

    generateMonthlyReport(expenses) {
        const monthly = {};
        expenses.forEach(exp => {
            const date = new Date(exp.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthly[key]) monthly[key] = 0;
            monthly[key] += exp.amount;
        });
        return monthly;
    }

    generateCategoryReport(expenses) {
        const categories = {};
        expenses.forEach(exp => {
            categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
        });
        return categories;
    }

    generateDepartmentReport(expenses) {
        const departments = {};
        expenses.forEach(exp => {
            departments[exp.department] = (departments[exp.department] || 0) + exp.amount;
        });
        return departments;
    }

    displayReport(data, type) {
        const ctx = document.getElementById('reportChart').getContext('2d');
        
        if (this.charts.report) {
            this.charts.report.destroy();
        }

        const labels = Object.keys(data);
        const values = Object.values(data);

        this.charts.report = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: type === 'monthly' ? 'Monthly Expenses' : 
                           type === 'category' ? 'Category Expenses' : 'Department Expenses',
                    data: values,
                    backgroundColor: this.generateColors(labels.length),
                    borderColor: '#2c3e50',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                animation: {
                    duration: 1000
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Create HTML table
        let tableHtml = '<table class="report-table"><thead><tr><th>Item</th><th>Amount</th><th>Percentage</th></tr></thead><tbody>';
        const total = values.reduce((a, b) => a + b, 0);
        
        labels.forEach((label, index) => {
            const amount = values[index];
            const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
            tableHtml += `
                <tr>
                    <td>${label}</td>
                    <td>$${amount.toFixed(2)}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        tableHtml += `</tbody></table>`;
        document.getElementById('reportTable').innerHTML = tableHtml;
    }

    generateColors(count) {
        const colors = [];
        const hueStep = 360 / count;
        
        for (let i = 0; i < count; i++) {
            const hue = i * hueStep;
            colors.push(`hsl(${hue}, 70%, 60%)`);
        }
        
        return colors;
    }

    async predictExpenses() {
        const months = parseInt(document.getElementById('monthsToPredict').value) || 3;
        
        // Show loading animation
        const chartContainer = document.querySelector('.prediction-results');
        chartContainer.classList.add('loading');
        
        try {
            // Simulate API call to ML model
            const response = await fetch('http://localhost:5000/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    months: months,
                    history: this.expenses
                })
            });

            if (response.ok) {
                const predictions = await response.json();
                this.displayPredictions(predictions);
            } else {
                // Fallback to simple prediction
                this.fallbackPrediction(months);
            }
        } catch (error) {
            console.error('Prediction error:', error);
            this.fallbackPrediction(months);
        } finally {
            chartContainer.classList.remove('loading');
        }
    }

    fallbackPrediction(months) {
        // Simple moving average prediction
        const monthlyData = {};
        this.expenses.forEach(exp => {
            const date = new Date(exp.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyData[key]) monthlyData[key] = 0;
            monthlyData[key] += exp.amount;
        });

        const values = Object.values(monthlyData);
        if (values.length === 0) {
            this.showNotification('Not enough data for predictions', 'warning');
            return;
        }

        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const lastValue = values[values.length - 1];
        
        const predictions = [];
        const labels = [];
        
        // Historical data
        Object.keys(monthlyData).forEach((month, i) => {
            labels.push(month);
            predictions.push({
                month: month,
                predicted: values[i],
                confidence: 1.0
            });
        });

        // Future predictions
        for (let i = 1; i <= months; i++) {
            const nextMonth = labels[labels.length - 1].split('-');
            let year = parseInt(nextMonth[0]);
            let month = parseInt(nextMonth[1]) + i;
            
            if (month > 12) {
                month -= 12;
                year += 1;
            }
            
            const monthKey = `${year}-${month}`;
            labels.push(monthKey);
            
            const prediction = avg * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
            predictions.push({
                month: monthKey,
                predicted: prediction,
                confidence: 0.7 - (i * 0.1) // Decreasing confidence
            });
        }

        this.displayPredictions(predictions);
    }

    displayPredictions(predictions) {
        const historical = predictions.slice(0, predictions.length - 3);
        const future = predictions.slice(-3);
        
        const labels = predictions.map(p => p.month);
        const historicalData = predictions.map(p => p.predicted);
        const futureData = [...Array(historical.length).fill(null), ...future.map(p => p.predicted)];

        this.charts.prediction.data.labels = labels;
        this.charts.prediction.data.datasets[0].data = historicalData;
        this.charts.prediction.data.datasets[1].data = futureData;
        this.charts.prediction.update();

        // Display prediction details
        let detailsHtml = '<div class="prediction-details"><h3>Prediction Details</h3>';
        future.forEach((pred, i) => {
            detailsHtml += `
                <div class="prediction-item">
                    <strong>${pred.month}:</strong> $${pred.predicted.toFixed(2)}
                    <div class="confidence-bar" style="width: ${pred.confidence * 100}%">
                        ${Math.round(pred.confidence * 100)}% confidence
                    </div>
                </div>
            `;
        });
        detailsHtml += '</div>';
        
        document.getElementById('predictionDetails').innerHTML = detailsHtml;
    }

    async trainModel() {
        this.showNotification('Training model... This may take a moment.', 'info');
        
        try {
            const response = await fetch('http://localhost:5000/api/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expenses: this.expenses })
            });

            if (response.ok) {
                this.showNotification('Model trained successfully!', 'success');
            }
        } catch (error) {
            this.showNotification('Training failed. Using existing model.', 'warning');
        }
    }

    handleFileUpload(file) {
        if (!file) return;
        
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <div class="file-info-card">
                <strong>Selected File:</strong> ${file.name}<br>
                <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                <strong>Type:</strong> ${file.type}
            </div>
        `;
        
        document.getElementById('processBtn').disabled = false;
        
        // Read and preview CSV
        const reader = new FileReader();
        reader.onload = (e) => {
            this.csvData = e.target.result;
            this.previewCSV();
        };
        reader.readAsText(file);
    }

    previewCSV() {
        if (!this.csvData) return;
        
        const rows = this.csvData.split('\n').slice(0, 10); // First 10 rows
        let previewHtml = '<table class="csv-preview-table"><thead>';
        
        rows.forEach((row, i) => {
            const cells = row.split(',');
            previewHtml += '<tr>';
            cells.forEach(cell => {
                if (i === 0) {
                    previewHtml += `<th>${cell}</th>`;
                } else {
                    previewHtml += `<td>${cell}</td>`;
                }
            });
            previewHtml += '</tr>';
        });
        
        previewHtml += '</table>';
        document.getElementById('csvPreview').innerHTML = previewHtml;
        document.getElementById('importBtn').disabled = false;
    }

    async processCSV() {
        if (!this.csvData) {
            this.showNotification('No CSV data to process', 'warning');
            return;
        }

        const rows = this.csvData.split('\n');
        const hasHeader = document.getElementById('headerCheck').checked;
        const startIndex = hasHeader ? 1 : 0;
        
        let processedCount = 0;
        const newExpenses = [];

        for (let i = startIndex; i < rows.length; i++) {
            const cells = rows[i].split(',');
            if (cells.length >= 4) {
                const expense = {
                    id: Date.now() + i,
                    name: cells[0]?.trim() || `Expense ${i}`,
                    amount: parseFloat(cells[1]) || 0,
                    category: cells[2]?.trim() || 'Other',
                    date: cells[3]?.trim() || new Date().toISOString().split('T')[0],
                    department: cells[4]?.trim() || 'General',
                    description: cells[5]?.trim() || 'Imported from CSV'
                };
                
                newExpenses.push(expense);
                processedCount++;
            }
        }

        // Add to expenses with animation
        this.showNotification(`Processed ${processedCount} expenses`, 'success');
        this.expenses.push(...newExpenses);
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        
        // Animate the addition
        const importBtn = document.getElementById('importBtn');
        importBtn.textContent = `✓ Imported ${processedCount} items`;
        importBtn.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';
        
        setTimeout(() => {
            importBtn.textContent = 'Import to Database';
            importBtn.style.background = 'linear-gradient(135deg, var(--secondary-color), #1abc9c)';
            importBtn.disabled = true;
        }, 2000);

        this.updateExpenseList();
        this.updateDashboard();
    }

    async importToDatabase() {
        if (!this.csvData) {
            this.showNotification('No CSV data to import', 'warning');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'text/csv' },
                body: this.csvData
            });

            if (response.ok) {
                this.showNotification('Data imported to database successfully!', 'success');
            }
        } catch (error) {
            this.showNotification('Database import failed. Data saved locally.', 'warning');
        }
    }

    exportToCSV() {
        if (this.expenses.length === 0) {
            this.showNotification('No data to export', 'warning');
            return;
        }

        const headers = ['Name', 'Amount', 'Category', 'Date', 'Department', 'Description'];
        const csvRows = [headers.join(',')];
        
        this.expenses.forEach(exp => {
            const row = [
                `"${exp.name}"`,
                exp.amount,
                exp.category,
                exp.date,
                exp.department,
                `"${exp.description}"`
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Data exported to CSV', 'success');
    }

    // Visualization Methods
    showSunburst() {
        const canvas = document.getElementById('visualizationCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw sunburst visualization
        const categories = {};
        this.expenses.forEach(exp => {
            categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
        });

        const total = Object.values(categories).reduce((a, b) => a + b, 0);
        let startAngle = 0;
        const colors = this.generateColors(Object.keys(categories).length);
        let colorIndex = 0;

        Object.entries(categories).forEach(([category, amount]) => {
            const sliceAngle = (amount / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(200, 200);
            ctx.arc(200, 200, 150, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            
            ctx.fillStyle = colors[colorIndex % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Label
            const midAngle = startAngle + sliceAngle / 2;
            const labelX = 200 + Math.cos(midAngle) * 100;
            const labelY = 200 + Math.sin(midAngle) * 100;
            
            ctx.fillStyle = '#2c3e50';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(category, labelX, labelY);
            
            startAngle += sliceAngle;
            colorIndex++;
        });
    }

    showHeatmap() {
        const canvas = document.getElementById('visualizationCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create heatmap data (expenses by day of week and hour)
        const heatmap = Array(7).fill().map(() => Array(24).fill(0));
        
        this.expenses.forEach(exp => {
            const date = new Date(exp.date);
            const day = date.getDay();
            const hour = date.getHours();
            heatmap[day][hour] += exp.amount;
        });
        
        // Find max value for normalization
        const maxValue = Math.max(...heatmap.flat());
        
        // Draw heatmap
        const cellWidth = canvas.width / 24;
        const cellHeight = canvas.height / 7;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const value = heatmap[day][hour];
                const intensity = maxValue > 0 ? value / maxValue : 0;
                
                // Color gradient from blue (low) to red (high)
                const red = Math.min(255, Math.floor(255 * intensity));
                const blue = Math.min(255, Math.floor(255 * (1 - intensity)));
                
                ctx.fillStyle = `rgb(${red}, 100, ${blue})`;
                ctx.fillRect(hour * cellWidth, day * cellHeight, cellWidth, cellHeight);
                
                // Border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(hour * cellWidth, day * cellHeight, cellWidth, cellHeight);
                
                // Label hours
                if (day === 0) {
                    ctx.fillStyle = '#2c3e50';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(hour.toString(), hour * cellWidth + cellWidth / 2, 15);
                }
                
                // Label days
                if (hour === 0) {
                    ctx.fillStyle = '#2c3e50';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(days[day], 5, day * cellHeight + cellHeight / 2 + 3);
                }
            }
        }
    }

    showTimeline() {
        const animationArea = document.getElementById('animationArea');
        animationArea.innerHTML = '';
        
        // Group expenses by month
        const monthlyExpenses = {};
        this.expenses.forEach(exp => {
            const date = new Date(exp.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            if (!monthlyExpenses[key]) monthlyExpenses[key] = [];
            monthlyExpenses[key].push(exp);
        });
        
        const months = Object.keys(monthlyExpenses).sort();
        const maxExpenses = Math.max(...months.map(m => monthlyExpenses[m].length));
        
        // Create timeline visualization
        months.forEach((month, index) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'timeline-month';
            monthDiv.style.left = `${(index / months.length) * 100}%`;
            monthDiv.style.animationDelay = `${index * 0.1}s`;
            
            const expenses = monthlyExpenses[month];
            const height = (expenses.length / maxExpenses) * 100;
            
            monthDiv.innerHTML = `
                <div class="timeline-bar" style="height: ${height}%"></div>
                <div class="timeline-label">${month}</div>
                <div class="timeline-tooltip">
                    ${month}: ${expenses.length} expenses<br>
                    Total: $${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                </div>
            `;
            
            animationArea.appendChild(monthDiv);
        });
    }

    showBubble() {
        const canvas = document.getElementById('visualizationCanvas');
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create bubble chart: x=date, y=amount, size=amount, color=category
        const categories = [...new Set(this.expenses.map(exp => exp.category))];
        const categoryColors = {};
        categories.forEach((cat, i) => {
            categoryColors[cat] = this.generateColors(categories.length)[i];
        });
        
        // Animate bubbles
        let frame = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            this.expenses.forEach((exp, i) => {
                const date = new Date(exp.date);
                const x = ((date - new Date('2023-01-01')) / (365 * 24 * 60 * 60 * 1000)) * canvas.width;
                const y = canvas.height - (exp.amount / 10000) * canvas.height;
                const radius = Math.sqrt(exp.amount) / 10;
                
                // Pulsing animation
                const pulse = Math.sin(frame * 0.05 + i) * 2;
                const currentRadius = radius + pulse;
                
                ctx.beginPath();
                ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = categoryColors[exp.category];
                ctx.globalAlpha = 0.7;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = '#2c3e50';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Label for large bubbles
                if (exp.amount > 5000) {
                    ctx.fillStyle = '#2c3e50';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(exp.name.substring(0, 10), x, y);
                }
            });
            
            frame++;
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    loadSampleData() {
        const sampleExpenses = [
            {
                id: 1,
                name: "Office Rent",
                amount: 5000,
                category: "Office Supplies",
                date: "2024-01-15",
                department: "Finance",
                description: "Monthly office rent payment"
            },
            {
                id: 2,
                name: "Laptop Purchase",
                amount: 1200,
                category: "Hardware",
                date: "2024-01-20",
                department: "IT",
                description: "New laptop for developer"
            },
            {
                id: 3,
                name: "Marketing Campaign",
                amount: 3000,
                category: "Marketing",
                date: "2024-02-01",
                department: "Marketing",
                description: "Q1 marketing campaign"
            },
            {
                id: 4,
                name: "Business Travel",
                amount: 1500,
                category: "Travel",
                date: "2024-02-10",
                department: "Sales",
                description: "Client meeting travel expenses"
            },
            {
                id: 5,
                name: "Software License",
                amount: 800,
                category: "Software",
                date: "2024-02-15",
                department: "IT",
                description: "Annual software license renewal"
            },
            {
                id: 6,
                name: "Team Lunch",
                amount: 300,
                category: "Other",
                date: "2024-02-20",
                department: "HR",
                description: "Monthly team building lunch"
            },
            {
                id: 7,
                name: "Electricity Bill",
                amount: 450,
                category: "Utilities",
                date: "2024-03-01",
                department: "Finance",
                description: "Office electricity bill"
            },
            {
                id: 8,
                name: "Office Furniture",
                amount: 2000,
                category: "Office Supplies",
                date: "2024-03-05",
                department: "HR",
                description: "New office chairs and desks"
            }
        ];

        this.expenses = sampleExpenses;
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        this.updateExpenseList();
        this.updateDashboard();
        this.showNotification('Loaded sample data', 'info');
    }

    checkSystemStatus() {
        // Check database connection
        fetch('http://localhost:5000/api/health')
            .then(response => {
                if (response.ok) {
                    document.getElementById('dbStatus').textContent = 'Database: Online';
                    document.getElementById('dbStatus').className = 'status online';
                } else {
                    throw new Error('Database offline');
                }
            })
            .catch(() => {
                document.getElementById('dbStatus').textContent = 'Database: Offline';
                document.getElementById('dbStatus').className = 'status offline';
            });

        // Check ML model status
        fetch('http://localhost:5000/api/ml-status')
            .then(response => {
                if (response.ok) {
                    document.getElementById('mlStatus').textContent = 'ML Model: Ready';
                    document.getElementById('mlStatus').className = 'status online';
                } else {
                    throw new Error('ML model not ready');
                }
            })
            .catch(() => {
                document.getElementById('mlStatus').textContent = 'ML Model: Offline';
                document.getElementById('mlStatus').className = 'status offline';
            });
    }

    setupAnimations() {
        // Add CSS animations for interactive elements
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .floating {
                animation: float 3s ease-in-out infinite;
            }
            
            .timeline-month {
                position: absolute;
                bottom: 0;
                width: 30px;
                animation: growUp 1s ease-out forwards;
                opacity: 0;
            }
            
            @keyframes growUp {
                to {
                    opacity: 1;
                }
            }
            
            .timeline-bar {
                width: 20px;
                background: linear-gradient(to top, var(--secondary-color), #1abc9c);
                margin: 0 auto;
                border-radius: 10px 10px 0 0;
                transition: height 0.5s ease;
            }
            
            .timeline-label {
                position: absolute;
                bottom: -25px;
                width: 100%;
                text-align: center;
                font-size: 10px;
                transform: rotate(-45deg);
                white-space: nowrap;
            }
            
            .timeline-tooltip {
                display: none;
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: var(--card-bg);
                padding: 5px;
                border-radius: 5px;
                box-shadow: var(--shadow);
                font-size: 12px;
                white-space: nowrap;
                z-index: 100;
            }
            
            .timeline-month:hover .timeline-tooltip {
                display: block;
            }
            
            .category-badge {
                display: inline-block;
                padding: 2px 8px;
                background: var(--secondary-color);
                color: white;
                border-radius: 12px;
                font-size: 12px;
                animation: popIn 0.3s ease;
            }
            
            .confidence-bar {
                height: 10px;
                background: linear-gradient(90deg, #2ecc71, #f39c12);
                border-radius: 5px;
                margin: 5px 0;
                color: white;
                font-size: 10px;
                text-align: center;
                line-height: 10px;
                transition: width 1s ease;
            }
            
            .delete-btn {
                background-color: #e74c3c;
                padding: 3px 10px;
                font-size: 12px;
            }
            
            .delete-btn:hover {
                background-color: #c0392b;
            }
        `;
        document.head.appendChild(style);

        // Add floating animation to cards
        const cards = document.querySelectorAll('.card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    updateDateTime() {
        const now = new Date();
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('lastUpdated').textContent = now.toLocaleTimeString();
        
        // Update every minute
        setTimeout(() => this.updateDateTime(), 60000);
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.background = type === 'success' ? '#27ae60' : 
                                       type === 'warning' ? '#f39c12' : 
                                       type === 'error' ? '#e74c3c' : '#3498db';
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.expenseSystem = new ExpenseSystem();
});