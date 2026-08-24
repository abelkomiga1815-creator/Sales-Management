// Shop Ledger PWA - Main Application Script

// API Configuration
const API_BASE = '/api';
const API_CUSTOMERS = `${API_BASE}/customers/`;
const API_TRANSACTIONS = `${API_BASE}/transactions/create/`;
const API_DAILY_SUMMARY = `${API_BASE}/daily-summary/`;

// State Management
const appState = {
    customers: [],
    filteredCustomers: [],
    currentCustomer: null,
    isLoading: false,
};

// DOM Elements
const elements = {
    headerDate: document.getElementById('headerDate'),
    totalCreditGiven: document.getElementById('totalCreditGiven'),
    totalCashReceived: document.getElementById('totalCashReceived'),
    netCashFlow: document.getElementById('netCashFlow'),
    totalSales: document.getElementById('totalSales'),
    customersList: document.getElementById('customersList'),
    customerCount: document.getElementById('customerCount'),
    searchInput: document.getElementById('searchInput'),
    fabButton: document.getElementById('fabButton'),
    transactionModal: document.getElementById('transactionModal'),
    transactionForm: document.getElementById('transactionForm'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    modalCancelBtn: document.getElementById('modalCancelBtn'),
    customerSelect: document.getElementById('customerSelect'),
    customerFieldGroup: document.getElementById('customerFieldGroup'),
    productNameInput: document.getElementById('productNameInput'),
    productRequired: document.getElementById('productRequired'),
    historyModal: document.getElementById('historyModal'),
    historyCloseBtn: document.getElementById('historyCloseBtn'),
    customerDetail: document.getElementById('customerDetail'),
    transactionsHistory: document.getElementById('transactionsHistory'),
    toast: document.getElementById('toast'),
};

// ========================================
// Utility Functions
// ========================================

function formatCurrency(amount) {
    return `₹ ${parseFloat(amount).toFixed(2)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getTodayDate() {
    const date = new Date();
    return date.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function showToast(message, type = 'info', duration = 3000) {
    elements.toast.textContent = message;
    elements.toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// ========================================
// API Calls
// ========================================

async function fetchCustomers() {
    try {
        const response = await fetch(API_CUSTOMERS);
        if (!response.ok) throw new Error('Failed to fetch customers');
        const data = await response.json();
        appState.customers = data.results || data;
        appState.filteredCustomers = [...appState.customers];
        populateCustomerSelect();
        return data;
    } catch (error) {
        console.error('Error fetching customers:', error);
        showToast('Failed to load customers', 'error');
        return [];
    }
}

async function fetchDailySummary() {
    try {
        const response = await fetch(API_DAILY_SUMMARY);
        if (!response.ok) throw new Error('Failed to fetch daily summary');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching daily summary:', error);
        showToast('Failed to load summary', 'error');
        return null;
    }
}

async function fetchCustomerHistory(customerId) {
    try {
        const response = await fetch(`${API_CUSTOMERS}${customerId}/history/`);
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching customer history:', error);
        showToast('Failed to load transaction history', 'error');
        return null;
    }
}

async function createTransaction(formData) {
    try {
        const response = await fetch(API_TRANSACTIONS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({
                customer: formData.customer ? parseInt(formData.customer) : null,
                product_name: formData.product_name || '',
                type: formData.type,
                amount: parseFloat(formData.amount),
                description: formData.description || '',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating transaction:', error);
        showToast(`Failed to create transaction: ${error.message}`, 'error');
        return null;
    }
}

async function createCustomer(name, phone) {
    try {
        const response = await fetch(API_CUSTOMERS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({ name, phone }),
        });

        if (!response.ok) throw new Error('Failed to create customer');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating customer:', error);
        showToast('Failed to create customer', 'error');
        return null;
    }
}

// ========================================
// UI Rendering
// ========================================

function renderCustomers() {
    if (appState.filteredCustomers.length === 0) {
        elements.customersList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No customers found</p></div>';
        elements.customerCount.textContent = '0';
        return;
    }

    elements.customersList.innerHTML = appState.filteredCustomers.map(customer => `
        <div class="customer-card" onclick="showCustomerHistory(${customer.id})">
            <div class="customer-header">
                <div>
                    <div class="customer-name">${customer.name}</div>
                    ${customer.phone ? `<div class="customer-phone">📱 ${customer.phone}</div>` : ''}
                </div>
            </div>
            <div class="customer-balance ${customer.total_balance > 0 ? 'balance-positive' : customer.total_balance < 0 ? 'balance-negative' : 'balance-zero'}">
                ${formatCurrency(customer.total_balance)}
            </div>
        </div>
    `).join('');

    elements.customerCount.textContent = appState.filteredCustomers.length;
}

async function updateDailySummary() {
    const summary = await fetchDailySummary();
    if (summary) {
        elements.totalCreditGiven.textContent = formatCurrency(summary.total_credit_given);
        elements.totalCashReceived.textContent = formatCurrency(summary.total_cash_received);
        elements.netCashFlow.textContent = formatCurrency(summary.net_cash_flow);
        elements.totalSales.textContent = formatCurrency(summary.total_sales);
    }
}

function populateCustomerSelect() {
    const html = '<option value="">Select a customer...</option>' +
        appState.customers.map(customer =>
            `<option value="${customer.id}">${customer.name}${customer.phone ? ` (${customer.phone})` : ''}</option>`
        ).join('');
    elements.customerSelect.innerHTML = html;
}

function updateHeaderDate() {
    elements.headerDate.textContent = getTodayDate();
}

function searchCustomers(query) {
    const lowerQuery = query.toLowerCase();
    appState.filteredCustomers = appState.customers.filter(customer =>
        customer.name.toLowerCase().includes(lowerQuery) ||
        (customer.phone && customer.phone.includes(query))
    );
    renderCustomers();
}

async function showCustomerHistory(customerId) {
    const data = await fetchCustomerHistory(customerId);
    if (!data) return;

    const customer = data.customer;
    const transactions = data.transactions || [];

    // Render customer details
    elements.customerDetail.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Name:</span>
            <span class="detail-value">${customer.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${customer.phone || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Current Balance:</span>
            <span class="detail-value" style="font-size: 18px; font-weight: 700;">
                ${formatCurrency(customer.total_balance)}
            </span>
        </div>
    `;

    // Render transactions
    if (transactions.length === 0) {
        elements.transactionsHistory.innerHTML = '<div class="no-transactions">No transactions yet</div>';
    } else {
        elements.transactionsHistory.innerHTML = transactions.map(txn => `
            <div class="transaction-item ${txn.type}">
                <div class="transaction-header">
                    <span class="transaction-type ${txn.type}">${txn.type}</span>
                    <span class="transaction-amount">${formatCurrency(txn.amount)}</span>
                </div>
                ${txn.description ? `<div class="transaction-description">${txn.description}</div>` : ''}
                <div class="transaction-date">${formatDate(txn.date_created)}</div>
            </div>
        `).join('');
    }

    // Show modal
    elements.historyModal.classList.add('active');
}

// ========================================
// Modal Management
// ========================================

function openTransactionModal() {
    elements.transactionModal.classList.add('active');
    elements.transactionForm.reset();
    elements.productNameInput.focus();
}

function updateTransactionFields() {
    const type = document.querySelector('input[name="type"]:checked')?.value;
    const isSale = type === 'SALE';
    elements.customerFieldGroup.hidden = isSale;
    elements.customerSelect.required = !isSale;
    elements.productNameInput.required = isSale;
    elements.productRequired.hidden = !isSale;
}

function closeTransactionModal() {
    elements.transactionModal.classList.remove('active');
}

function closeHistoryModal() {
    elements.historyModal.classList.remove('active');
}

function closeAllModals() {
    closeTransactionModal();
    closeHistoryModal();
}

// ========================================
// Event Listeners
// ========================================

// Header and Date
updateHeaderDate();

// FAB Button
elements.fabButton.addEventListener('click', openTransactionModal);

document.querySelectorAll('input[name="type"]').forEach(input => {
    input.addEventListener('change', updateTransactionFields);
});
updateTransactionFields();

// Modal Controls
elements.modalCloseBtn.addEventListener('click', closeTransactionModal);
elements.modalCancelBtn.addEventListener('click', closeTransactionModal);
elements.historyCloseBtn.addEventListener('click', closeHistoryModal);

// Close modal on outside click
[elements.transactionModal, elements.historyModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAllModals();
        }
    });
});

// Search Input
elements.searchInput.addEventListener('input', (e) => {
    searchCustomers(e.target.value);
});

// Transaction Form Submit
elements.transactionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(elements.transactionForm);
    const data = Object.fromEntries(formData);

    if (data.type !== 'SALE' && !data.customer) {
        showToast('Please select a customer', 'error');
        return;
    }

    if (data.type === 'SALE' && !data.product_name) {
        showToast('Please enter the product sold', 'error');
        return;
    }

    const result = await createTransaction(data);
    if (result) {
        const balanceMessage = result.new_balance === null
            ? 'Product sale recorded.'
            : `New balance: ${formatCurrency(result.new_balance)}`;
        showToast(`Transaction added successfully! ${balanceMessage}`, 'success');
        closeTransactionModal();
        
        // Refresh data
        await fetchCustomers();
        renderCustomers();
        await updateDailySummary();
    }
});

// ========================================
// Initialization
// ========================================

async function initApp() {
    appState.isLoading = true;
    
    try {
        // Load customers
        await fetchCustomers();
        renderCustomers();
        
        // Load daily summary
        await updateDailySummary();
        
        // Setup refresh interval
        setInterval(async () => {
            await fetchCustomers();
            renderCustomers();
            await updateDailySummary();
        }, 30000); // Refresh every 30 seconds
        
        showToast('App loaded successfully', 'success', 2000);
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error loading app', 'error');
    } finally {
        appState.isLoading = false;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
