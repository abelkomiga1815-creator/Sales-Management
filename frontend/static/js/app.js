closed// Shop Ledger PWA - Main Application Script

// API Configuration
const API_BASE = '/api';
const API_CUSTOMERS = `${API_BASE}/customers/`;
const API_TRANSACTIONS = `${API_BASE}/transactions/create/`;
const API_DAILY_SUMMARY = `${API_BASE}/daily-summary/`;
const API_ACTIVITY_REPORT = `${API_BASE}/activity-report/`;
const API_DEBTS = `${API_BASE}/transactions/?type=DEBT`;

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
    businessName: document.getElementById('businessName'),
    logoutButton: document.getElementById('logoutButton'),
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
    borrowerFieldGroup: document.getElementById('borrowerFieldGroup'),
    borrowerNameInput: document.getElementById('borrowerNameInput'),
    borrowerRequired: document.getElementById('borrowerRequired'),
    payerFieldGroup: document.getElementById('payerFieldGroup'),
    payerNameInput: document.getElementById('payerNameInput'),
    payerRequired: document.getElementById('payerRequired'),
    productNameInput: document.getElementById('productNameInput'),
    productRequired: document.getElementById('productRequired'),
    historyModal: document.getElementById('historyModal'),
    historyCloseBtn: document.getElementById('historyCloseBtn'),
    reportButton: document.getElementById('reportButton'),
    backupButton: document.getElementById('backupButton'),
    reportModal: document.getElementById('reportModal'),
    reportCloseBtn: document.getElementById('reportCloseBtn'),
    reportSummary: document.getElementById('reportSummary'),
    reportTransactions: document.getElementById('reportTransactions'),
    customerDetail: document.getElementById('customerDetail'),
    transactionsHistory: document.getElementById('transactionsHistory'),
    debtsList: document.getElementById('debtsList'),
    debtsCount: document.getElementById('debtsCount'),
    debtsModal: document.getElementById('debtsModal'),
    debtsCloseBtn: document.getElementById('debtsCloseBtn'),
    debtsManagement: document.getElementById('debtsManagement'),
    toast: document.getElementById('toast'),
};

// ========================================
// Utility Functions
// ========================================

function formatCurrency(amount) {
    const formattedAmount = new Intl.NumberFormat('sw-TZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parseFloat(amount));
        return `TSh ${formattedAmount}`;
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
        const response = await fetch(API_CUSTOMERS, { credentials: 'include' });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login/';
                return [];
            }
            throw new Error('Failed to fetch customers');
        }
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

async function loadCurrentUser() {
    const response = await fetch(`${API_BASE}/auth/me/`, { credentials: 'include' });
    if (response.status === 401 || response.status === 403) {
        window.location.href = '/login/';
        return;
    }
    if (!response.ok) throw new Error('Unable to load account');
    const user = await response.json();
    elements.businessName.textContent = `${user.business_name} (${user.username})`;
}

async function logoutUser() {
    await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        headers: {'X-CSRFToken': getCSRFToken()},
    });
    window.location.href = '/login/';
}

function startGoogleBackup() {
    window.location.href = `${API_BASE}/backup/google/start/`;
}

async function fetchDailySummary() {
    try {
        const response = await fetch(API_DAILY_SUMMARY, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login/';
            return null;
        }
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
        const response = await fetch(`${API_CUSTOMERS}${customerId}/history/`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login/';
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching customer history:', error);
        showToast('Failed to load transaction history', 'error');
        return null;
    }
}

async function fetchActivityReport() {
    try {
        const response = await fetch(API_ACTIVITY_REPORT, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login/';
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch activity report');
        return await response.json();
    } catch (error) {
        console.error('Error fetching activity report:', error);
        showToast('Failed to load full report', 'error');
        return null;
    }
}

async function fetchDebts() {
    try {
        const response = await fetch(`${API_BASE}/transactions/?type=DEBT`, {
            credentials: 'include',
        });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login/';
            return [];
        }
        if (!response.ok) throw new Error('Failed to fetch debts');
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Error fetching debts:', error);
        showToast('Failed to load debts', 'error');
        return [];
    }
}

async function createTransaction(formData) {
    try {
        const response = await fetch(API_TRANSACTIONS, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({
                customer: formData.customer ? parseInt(formData.customer) : null,
                borrower_name: formData.type === 'DEBIT' ? (formData.payer_name || '') : (formData.borrower_name || ''),
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
            credentials: 'include',
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

async function deleteTransaction(transactionId) {
    if (!confirm('Delete this transaction? This cannot be undone.')) return false;

    try {
        const response = await fetch(`${API_BASE}/transactions/${transactionId}/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'X-CSRFToken': getCSRFToken(),
            },
        });

        if (!response.ok) throw new Error('Failed to delete transaction');
        showToast('Transaction deleted', 'success');
        return true;
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showToast('Failed to delete transaction', 'error');
        return false;
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

async function renderDebts() {
    const debts = await fetchDebts();
    
    if (debts.length === 0) {
        elements.debtsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No debts recorded</p></div>';
        elements.debtsCount.textContent = '0';
        return;
    }

    elements.debtsList.innerHTML = debts.map(debt => `
        <div class="debt-card" onclick="showDebtDetail(${debt.id})">
            <div class="debt-header">
                <div class="debt-borrower">${debt.borrower_name || 'Unknown'}</div>
                <div class="debt-amount">${formatCurrency(debt.amount)}</div>
            </div>
            <div class="debt-product">Product: ${debt.product_name || 'N/A'}</div>
            <div class="debt-date">${formatDate(debt.date_created)}</div>
            ${debt.description ? `<div class="debt-description">${debt.description}</div>` : ''}
        </div>
    `).join('');

    elements.debtsCount.textContent = debts.length;
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
    appState.currentCustomer = customer;

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
                <div class="transaction-footer">
                    <div class="transaction-date">${formatDate(txn.date_created)}</div>
                    <button type="button" class="delete-transaction" data-transaction-id="${txn.id}" title="Delete transaction" aria-label="Delete transaction">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Show modal
    elements.historyModal.classList.add('active');
}

async function showActivityReport() {
    const report = await fetchActivityReport();
    if (!report) return;

    elements.reportSummary.innerHTML = `
        <div class="report-stat"><span>Transactions</span><strong>${report.total_transactions}</strong></div>
        <div class="report-stat"><span>Credit given</span><strong>${formatCurrency(report.total_credit_given)}</strong></div>
        <div class="report-stat"><span>Cash received</span><strong>${formatCurrency(report.total_cash_received)}</strong></div>
        <div class="report-stat"><span>Net cash flow</span><strong>${formatCurrency(report.net_cash_flow)}</strong></div>
        <div class="report-stat"><span>Sales</span><strong>${formatCurrency(report.total_sales)}</strong></div>
    `;

    elements.reportTransactions.innerHTML = report.transactions.length === 0
        ? '<div class="no-transactions">No activity recorded yet</div>'
        : report.transactions.map(txn => `
            <div class="report-transaction">
                <div><strong>${txn.type}</strong><span>${txn.customer_name || txn.product_name || 'General sale'}</span></div>
                <div class="report-description">${txn.product_name ? `Product: ${txn.product_name}` : ''}${txn.description ? `Description: ${txn.description}` : ''}</div>
                <strong>${formatCurrency(txn.amount)}</strong>
                <small>${formatDate(txn.date_created)}</small>
                <button type="button" class="delete-transaction" data-transaction-id="${txn.id}" title="Delete transaction" aria-label="Delete transaction">Delete</button>
            </div>
        `).join('');

    elements.reportModal.classList.add('active');
}

async function showDebtDetail(debtId) {
    const debts = await fetchDebts();
    const debt = debts.find(d => d.id === debtId);
    
    if (!debt) {
        showToast('Debt not found', 'error');
        return;
    }

    elements.debtsManagement.innerHTML = `
        <div class="debt-detail-container">
            <div class="debt-detail">
                <h3>Debt Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Borrower Name:</span>
                    <span class="detail-value">${debt.borrower_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Product Borrowed:</span>
                    <span class="detail-value">${debt.product_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Amount:</span>
                    <span class="detail-value" style="font-size: 18px; font-weight: 700;">
                        ${formatCurrency(debt.amount)}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date Recorded:</span>
                    <span class="detail-value">${formatDate(debt.date_created)}</span>
                </div>
                ${debt.description ? `
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">${debt.description}</span>
                </div>
                ` : ''}
            </div>
            <div class="debt-actions">
                <button type="button" class="btn btn-primary" onclick="markDebtAsRepaid(${debt.id})">Mark as Repaid</button>
                <button type="button" class="btn btn-secondary" onclick="deleteDebtRecord(${debt.id})">Delete Record</button>
            </div>
        </div>
    `;

    elements.debtsModal.classList.add('active');
}

async function markDebtAsRepaid(debtId) {
    if (!confirm('Mark this debt as repaid?')) return;
    
    try {
        // Create a DEBIT transaction to offset the DEBT
        const debt = (await fetchDebts()).find(d => d.id === debtId);
        if (!debt) return;

        // Delete the original debt
        await fetch(`${API_BASE}/transactions/${debtId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken(),
            },
        });

        showToast('Debt marked as repaid!', 'success');
        elements.debtsModal.classList.remove('active');
        
        // Refresh debts
        await renderDebts();
    } catch (error) {
        console.error('Error marking debt as repaid:', error);
        showToast('Failed to mark debt as repaid', 'error');
    }
}

async function deleteDebtRecord(debtId) {
    if (!confirm('Delete this debt record? This cannot be undone.')) return;
    
    try {
        await fetch(`${API_BASE}/transactions/${debtId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCSRFToken(),
            },
        });

        showToast('Debt record deleted', 'success');
        elements.debtsModal.classList.remove('active');
        
        // Refresh debts
        await renderDebts();
    } catch (error) {
        console.error('Error deleting debt:', error);
        showToast('Failed to delete debt record', 'error');
    }
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
    const isDebt = type === 'DEBT';
    const isDebit = type === 'DEBIT';
    const requiresCustomer = !isSale && !isDebt && !isDebit;

    elements.customerFieldGroup.hidden = isSale || isDebt || isDebit;
    elements.customerSelect.required = requiresCustomer;
    elements.productNameInput.required = isSale || isDebt;
    elements.productRequired.hidden = !(isSale || isDebt);

    elements.borrowerFieldGroup.hidden = !isDebt;
    elements.borrowerNameInput.required = isDebt;
    elements.borrowerRequired.hidden = !isDebt;

    elements.payerFieldGroup.hidden = !isDebit;
    elements.payerNameInput.required = isDebit;
    elements.payerRequired.hidden = !isDebit;

    if (isDebt) {
        elements.productNameInput.placeholder = 'Enter product borrowed...';
    } else if (isSale) {
        elements.productNameInput.placeholder = 'Enter product sold...';
    } else if (isDebit) {
        elements.productNameInput.placeholder = 'Enter product/service name...';
    } else {
        elements.productNameInput.placeholder = 'Enter product name...';
    }
}

function closeTransactionModal() {
    elements.transactionModal.classList.remove('active');
}

function closeHistoryModal() {
    elements.historyModal.classList.remove('active');
}

function closeReportModal() {
    elements.reportModal.classList.remove('active');
}

function closeDebtsModal() {
    elements.debtsModal.classList.remove('active');
}

function closeAllModals() {
    closeTransactionModal();
    closeHistoryModal();
    closeReportModal();
    closeDebtsModal();
}

// ========================================
// Event Listeners
// ========================================

// Header and Date
updateHeaderDate();

// FAB Button
elements.fabButton.addEventListener('click', openTransactionModal);
elements.logoutButton.addEventListener('click', logoutUser);
elements.backupButton.addEventListener('click', startGoogleBackup);

document.querySelectorAll('input[name="type"]').forEach(input => {
    input.addEventListener('change', updateTransactionFields);
});
updateTransactionFields();

// Modal Controls
elements.modalCloseBtn.addEventListener('click', closeTransactionModal);
elements.modalCancelBtn.addEventListener('click', closeTransactionModal);
elements.historyCloseBtn.addEventListener('click', closeHistoryModal);
elements.reportButton.addEventListener('click', showActivityReport);
elements.reportCloseBtn.addEventListener('click', closeReportModal);
elements.debtsCloseBtn.addEventListener('click', closeDebtsModal);

elements.transactionsHistory.addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-transaction');
    if (!button) return;

    event.stopPropagation();
    if (await deleteTransaction(button.dataset.transactionId)) {
        await showCustomerHistory(appState.currentCustomer.id);
        await fetchCustomers();
        renderCustomers();
        await updateDailySummary();
    }
});

elements.reportTransactions.addEventListener('click', async (event) => {
    const button = event.target.closest('.delete-transaction');
    if (!button) return;

    event.stopPropagation();
    if (await deleteTransaction(button.dataset.transactionId)) {
        await showActivityReport();
        await fetchCustomers();
        renderCustomers();
        await updateDailySummary();
    }
});

// Close modal on outside click
[elements.transactionModal, elements.historyModal, elements.reportModal, elements.debtsModal].forEach(modal => {
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

    if (data.type !== 'SALE' && data.type !== 'DEBT' && data.type !== 'DEBIT' && !data.customer) {
        showToast('Please select a customer', 'error');
        return;
    }

    if ((data.type === 'SALE' || data.type === 'DEBT' || data.type === 'DEBIT') && !data.product_name) {
        const messageMap = {
            'DEBT': 'Please enter the product borrowed',
            'DEBIT': 'Please enter the product/service name',
            'SALE': 'Please enter the product sold'
        };
        showToast(messageMap[data.type] || 'Please enter the product name', 'error');
        return;
    }

    if (data.type === 'DEBT' && !data.borrower_name) {
        showToast('Please enter the borrower name', 'error');
        return;
    }

    if (data.type === 'DEBIT' && !data.payer_name) {
        showToast('Please enter the customer name', 'error');
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
        await renderDebts();
        await updateDailySummary();
    }
});

// ========================================
// Initialization
// ========================================

async function initApp() {
    if (!document.getElementById('businessName') || !document.getElementById('customersList') || !document.getElementById('toast')) {
        return;
    }

    appState.isLoading = true;
    
    try {
        await loadCurrentUser();
        // Load customers
        await fetchCustomers();
        renderCustomers();
        
        // Load debts
        await renderDebts();
        
        // Load daily summary
        await updateDailySummary();

        const backupStatus = new URLSearchParams(window.location.search);
        if (backupStatus.get('backup') === 'success') {
            showToast('Backup uploaded to Google Drive.', 'success');
        } else if (backupStatus.get('backup') === 'error') {
            showToast(backupStatus.get('message') || 'Google Drive backup failed.', 'error', 6000);
        }
        if (backupStatus.has('backup')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        // Setup refresh interval
        setInterval(async () => {
            await fetchCustomers();
            renderCustomers();
            await renderDebts();
            await updateDailySummary();
        }, 30000); // Refresh every 30 seconds
        
        showToast('App loaded successfully', 'success', 2000);
    } catch (error) {
        console.error('Error initializing app:', error);
        if (window.location.pathname !== '/login/' && window.location.pathname !== '/register/') {
            showToast('Error loading app', 'error');
        }
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
