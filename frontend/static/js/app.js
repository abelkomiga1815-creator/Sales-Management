// Shop Ledger PWA - Main Application Script

// API Configuration
const API_BASE = '/api';
const API_CUSTOMERS = `${API_BASE}/customers/`;
const API_TRANSACTIONS = `${API_BASE}/transactions/create/`;
const API_DAILY_SUMMARY = `${API_BASE}/daily-summary/`;
const API_ACTIVITY_REPORT = `${API_BASE}/activity-report/`;
const API_DEBTS = `${API_BASE}/transactions/?type=DEBT`;
const API_DEBT_PAY = `${API_BASE}/debts/pay/`;
const API_PREFERENCES = `${API_BASE}/preferences/`;

// State Management
const appState = {
    customers: [],
    filteredCustomers: [],
    currentCustomer: null,
    isLoading: false,
    currentLanguage: 'en',
};

// DOM Elements
const elements = {
    headerDate: document.getElementById('headerDate'),
    businessName: document.getElementById('businessName'),
    logoutButton: document.getElementById('logoutButton'),
    settingsButton: document.getElementById('settingsButton'),
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
    settingsModal: document.getElementById('settingsModal'),
    settingsCloseBtn: document.getElementById('settingsCloseBtn'),
    settingsCancelBtn: document.getElementById('settingsCancelBtn'),
    settingsSaveBtn: document.getElementById('settingsSaveBtn'),
    languageSelect: document.getElementById('languageSelect'),
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
// Language / i18n
// ========================================

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update specific elements
    const creditLabel = document.querySelector('#creditRadioLabel .radio-text');
    if (creditLabel) creditLabel.textContent = t('credit_given');
    const debitLabel = document.querySelector('input[value="DEBIT"]');
    if (debitLabel) {
        const labelSpan = debitLabel.closest('.radio-label').querySelector('.radio-text');
        if (labelSpan) labelSpan.textContent = t('debit_payed');
    }
    const debtLabel = document.querySelector('input[value="DEBT"]');
    if (debtLabel) {
        const labelSpan = debtLabel.closest('.radio-label').querySelector('.radio-text');
        if (labelSpan) labelSpan.textContent = t('debt');
    }
    const saleLabel = document.querySelector('input[value="SALE"]');
    if (saleLabel) {
        const labelSpan = saleLabel.closest('.radio-label').querySelector('.radio-text');
        if (labelSpan) labelSpan.textContent = t('sale');
    }
}

async function loadLanguagePreference() {
    try {
        const response = await fetch(API_PREFERENCES, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            setLanguage(data.language || 'en');
        }
    } catch (_) {}
    appState.currentLanguage = getStoredLanguage();
    setLanguage(appState.currentLanguage);
    applyTranslations();
}

async function saveLanguagePreference(lang) {
    try {
        const response = await fetch(API_PREFERENCES, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({language: lang}),
        });
        if (response.ok) {
            setLanguage(lang);
            appState.currentLanguage = lang;
            applyTranslations();
            showToast(t('settings_saved'), 'success');
        }
    } catch (_) {
        showToast('Failed to save settings', 'error');
    }
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
    if (user.language) {
        setLanguage(user.language);
        appState.currentLanguage = user.language;
        applyTranslations();
    }
}

async function logoutUser() {
    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        }
    } catch (_) {}
    await fetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
        credentials: 'include',
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
        return await response.json();
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
        return await response.json();
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

async function fetchDebtPayments(debtId) {
    try {
        const response = await fetch(`${API_BASE}/debts/${debtId}/payments/`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
            window.location.href = '/login/';
            return null;
        }
        if (!response.ok) throw new Error('Failed to fetch payments');
        return await response.json();
    } catch (error) {
        console.error('Error fetching debt payments:', error);
        return null;
    }
}

async function createDebtPayment(debtId, amount, description) {
    try {
        const response = await fetch(API_DEBT_PAY, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
            },
            body: JSON.stringify({debt_id: debtId, amount: parseFloat(amount), description: description || ''}),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || err.amount || 'Payment failed');
        }
        return await response.json();
    } catch (error) {
        console.error('Error creating payment:', error);
        showToast(`Payment failed: ${error.message}`, 'error');
        return null;
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
        return await response.json();
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
        return await response.json();
    } catch (error) {
        console.error('Error creating customer:', error);
        showToast('Failed to create customer', 'error');
        return null;
    }
}

async function deleteTransaction(transactionId) {
    if (!confirm(t('delete_confirm'))) return false;
    try {
        const response = await fetch(`${API_BASE}/transactions/${transactionId}/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        if (!response.ok) throw new Error('Failed to delete transaction');
        showToast(t('transaction_deleted'), 'success');
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
        elements.customersList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p>${t('no_customers_found')}</p></div>`;
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
        elements.debtsList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>${t('no_debts')}</p></div>`;
        elements.debtsCount.textContent = '0';
        return;
    }

    elements.debtsList.innerHTML = debts.map(debt => `
        <div class="debt-card" onclick="showDebtDetail(${debt.id})">
            <div class="debt-header">
                <div class="debt-borrower">${debt.borrower_name || 'Unknown'}</div>
                <div class="debt-amount">${formatCurrency(debt.amount)}</div>
            </div>
            <div class="debt-product">${t('product')}: ${debt.product_name || 'N/A'}</div>
            <div class="debt-date">${formatDate(debt.date_created)}</div>
            ${debt.payment_status ? `<div class="debt-status debt-status-${debt.payment_status.toLowerCase()}">${debt.payment_status === 'PAID' ? t('status_paid') : debt.payment_status === 'PARTIALLY_PAID' ? t('status_partial') : t('status_unpaid')}</div>` : ''}
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
    const html = `<option value="">${t('select_customer')}</option>` +
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

    elements.customerDetail.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">${t('name')}:</span>
            <span class="detail-value">${customer.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${t('phone')}:</span>
            <span class="detail-value">${customer.phone || 'N/A'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">${t('current_balance')}:</span>
            <span class="detail-value" style="font-size: 18px; font-weight: 700;">
                ${formatCurrency(customer.total_balance)}
            </span>
        </div>
    `;

    if (transactions.length === 0) {
        elements.transactionsHistory.innerHTML = `<div class="no-transactions">${t('no_transactions')}</div>`;
    } else {
        elements.transactionsHistory.innerHTML = transactions.map(txn => `
            <div class="transaction-item ${txn.type}">
                <div class="transaction-header">
                    <span class="transaction-type ${txn.type}">${txn.type === 'CREDIT' ? t('credit_given') : txn.type === 'DEBIT' ? t('debit_payed') : txn.type === 'SALE' ? t('sale') : t('debt')}</span>
                    <span class="transaction-amount">${formatCurrency(txn.amount)}</span>
                </div>
                ${txn.description ? `<div class="transaction-description">${txn.description}</div>` : ''}
                <div class="transaction-footer">
                    <div class="transaction-date">${formatDate(txn.date_created)}</div>
                    <button type="button" class="delete-transaction" data-transaction-id="${txn.id}" title="${t('delete_transaction')}" aria-label="${t('delete_transaction')}">${t('delete_transaction')}</button>
                </div>
            </div>
        `).join('');
    }

    elements.historyModal.classList.add('active');
}

async function showActivityReport() {
    const report = await fetchActivityReport();
    if (!report) return;

    elements.reportSummary.innerHTML = `
        <div class="report-stat"><span>${t('transactions_label')}</span><strong>${report.total_transactions}</strong></div>
        <div class="report-stat"><span>${t('credit_given_label')}</span><strong>${formatCurrency(report.total_credit_given)}</strong></div>
        <div class="report-stat"><span>${t('cash_received_label')}</span><strong>${formatCurrency(report.total_cash_received)}</strong></div>
        <div class="report-stat"><span>${t('net_cash_flow_label')}</span><strong>${formatCurrency(report.net_cash_flow)}</strong></div>
        <div class="report-stat"><span>${t('sales_label')}</span><strong>${formatCurrency(report.total_sales)}</strong></div>
    `;

    elements.reportTransactions.innerHTML = report.transactions.length === 0
        ? `<div class="no-transactions">${t('no_activity')}</div>`
        : report.transactions.map(txn => `
            <div class="report-transaction">
                <div><strong>${txn.type === 'CREDIT' ? t('credit_given') : txn.type === 'DEBIT' ? t('debit_payed') : txn.type === 'SALE' ? t('sale') : t('debt')}</strong><span>${txn.customer_name || txn.product_name || 'General sale'}</span></div>
                <div class="report-description">${txn.product_name ? `${t('product')}: ${txn.product_name}` : ''}${txn.description ? `Description: ${txn.description}` : ''}</div>
                <strong>${formatCurrency(txn.amount)}</strong>
                <small>${formatDate(txn.date_created)}</small>
                <button type="button" class="delete-transaction" data-transaction-id="${txn.id}" title="${t('delete_transaction')}" aria-label="${t('delete_transaction')}">${t('delete_transaction')}</button>
            </div>
        `).join('');

    elements.reportModal.classList.add('active');
}

async function showDebtDetail(debtId) {
    const paymentData = await fetchDebtPayments(debtId);
    if (!paymentData) {
        showToast(t('failed_create_transaction'), 'error');
        return;
    }

    const debt = paymentData.debt;
    const payments = paymentData.payments || [];
    const totalPaid = paymentData.total_paid;
    const remaining = paymentData.remaining_balance;
    const payStatus = paymentData.status;
    const statusLabel = payStatus === 'PAID' ? t('status_paid') : payStatus === 'PARTIALLY_PAID' ? t('status_partial') : t('status_unpaid');
    const statusClass = payStatus === 'PAID' ? 'status-paid' : payStatus === 'PARTIALLY_PAID' ? 'status-partial' : 'status-unpaid';

    let paymentsHtml = '';
    if (payments.length > 0) {
        paymentsHtml = `
            <div class="payment-history">
                <h4>${t('payment_history')}</h4>
                ${payments.map(p => `
                    <div class="payment-item">
                        <div class="payment-info">
                            <span class="payment-amount">${formatCurrency(p.amount)}</span>
                            <span class="payment-date">${formatDate(p.date_created)}</span>
                        </div>
                        ${p.description ? `<div class="payment-desc">${p.description}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        paymentsHtml = `<div class="no-payments">${t('no_payments')}</div>`;
    }

    elements.debtsManagement.innerHTML = `
        <div class="debt-detail-container">
            <div class="debt-detail">
                <h3>${t('debt_information')}</h3>
                <div class="detail-row">
                    <span class="detail-label">${t('borrower_name')}:</span>
                    <span class="detail-value">${debt.borrower_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('product_borrowed')}:</span>
                    <span class="detail-value">${debt.product_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('total_amount')}:</span>
                    <span class="detail-value" style="font-size: 18px; font-weight: 700;">${formatCurrency(debt.amount)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('total_paid')}:</span>
                    <span class="detail-value" style="color: var(--debit-color); font-weight: 700;">${formatCurrency(totalPaid)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('remaining_balance')}:</span>
                    <span class="detail-value" style="color: var(--warning-color); font-weight: 700;">${formatCurrency(remaining)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('payment_status')}:</span>
                    <span class="debt-status-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">${t('date_recorded')}:</span>
                    <span class="detail-value">${formatDate(debt.date_created)}</span>
                </div>
                ${debt.description ? `
                <div class="detail-row">
                    <span class="detail-label">${t('description')}:</span>
                    <span class="detail-value">${debt.description}</span>
                </div>
                ` : ''}
            </div>

            ${payStatus !== 'PAID' ? `
            <div class="payment-form-container">
                <h4>${t('make_payment')}</h4>
                <form id="paymentForm" class="modal-form">
                    <div class="form-group">
                        <label for="paymentAmountInput">${t('payment_amount')}</label>
                        <input type="number" id="paymentAmountInput" class="form-input" step="0.01" min="0.01" max="${remaining}" required placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label for="paymentDescInput">${t('payment_description')}</label>
                        <input type="text" id="paymentDescInput" class="form-input" placeholder="${t('payment_description')}">
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn btn-primary">${t('record_payment')}</button>
                    </div>
                </form>
            </div>
            ` : ''}

            ${paymentsHtml}

            <div class="debt-actions">
                ${payStatus !== 'PAID' ? `<button type="button" class="btn btn-primary" onclick="markDebtAsRepaid(${debt.id})">${t('mark_as_repaid')}</button>` : ''}
                <button type="button" class="btn btn-secondary" onclick="deleteDebtRecord(${debt.id})">${t('delete_record')}</button>
            </div>
        </div>
    `;

    // Attach payment form handler
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = document.getElementById('paymentAmountInput').value;
            const desc = document.getElementById('paymentDescInput').value;
            if (!amount || parseFloat(amount) <= 0) {
                showToast('Please enter a valid amount', 'error');
                return;
            }
            const result = await createDebtPayment(debt.id, amount, desc);
            if (result) {
                showToast(t('payment_recorded'), 'success');
                await showDebtDetail(debtId);
                await renderDebts();
                await updateDailySummary();
            }
        });
    }

    elements.debtsModal.classList.add('active');
}

async function markDebtAsRepaid(debtId) {
    if (!confirm(t('mark_repaid_confirm'))) return;
    
    try {
        await fetch(`${API_BASE}/transactions/${debtId}/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        showToast(t('debt_marked_repaid'), 'success');
        elements.debtsModal.classList.remove('active');
        await renderDebts();
    } catch (error) {
        console.error('Error marking debt as repaid:', error);
        showToast('Failed to mark debt as repaid', 'error');
    }
}

async function deleteDebtRecord(debtId) {
    if (!confirm(t('delete_record_confirm'))) return;
    
    try {
        await fetch(`${API_BASE}/transactions/${debtId}/`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'X-CSRFToken': getCSRFToken() },
        });
        showToast(t('debt_record_deleted'), 'success');
        elements.debtsModal.classList.remove('active');
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
    const isCredit = type === 'CREDIT';
    const requiresCustomer = isCredit;

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
        elements.productNameInput.placeholder = t('enter_product_borrowed');
    } else if (isSale) {
        elements.productNameInput.placeholder = t('enter_product_sold');
    } else if (isDebit) {
        elements.productNameInput.placeholder = t('enter_product_service');
    } else {
        elements.productNameInput.placeholder = t('enter_product_name');
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

function closeSettingsModal() {
    elements.settingsModal.classList.remove('active');
}

function closeAllModals() {
    closeTransactionModal();
    closeHistoryModal();
    closeReportModal();
    closeDebtsModal();
    closeSettingsModal();
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

// Settings
elements.settingsButton.addEventListener('click', () => {
    elements.languageSelect.value = appState.currentLanguage;
    elements.settingsModal.classList.add('active');
});
elements.settingsCloseBtn.addEventListener('click', closeSettingsModal);
elements.settingsCancelBtn.addEventListener('click', closeSettingsModal);
elements.settingsSaveBtn.addEventListener('click', () => {
    const lang = elements.languageSelect.value;
    saveLanguagePreference(lang);
    closeSettingsModal();
});

// Hide Credit (Given) radio button - feature disabled but kept in backend
const creditRadioLabel = document.getElementById('creditRadioLabel');
if (creditRadioLabel) creditRadioLabel.style.display = 'none';

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
[elements.transactionModal, elements.historyModal, elements.reportModal, elements.debtsModal, elements.settingsModal].forEach(modal => {
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

    if (data.type !== 'SALE' && data.type !== 'DEBT' && data.type !== 'DEBIT' && data.type !== 'CREDIT' && !data.customer) {
        showToast(t('select_customer_error'), 'error');
        return;
    }

    if ((data.type === 'SALE' || data.type === 'DEBT' || data.type === 'DEBIT') && !data.product_name) {
        const messageMap = {
            'DEBT': t('enter_product_error'),
            'DEBIT': t('enter_product_error'),
            'SALE': t('enter_product_error')
        };
        showToast(messageMap[data.type] || t('enter_product_error'), 'error');
        return;
    }

    if (data.type === 'DEBT' && !data.borrower_name) {
        showToast(t('enter_borrower_error'), 'error');
        return;
    }

    if (data.type === 'DEBIT' && !data.payer_name) {
        showToast(t('enter_customer_name_error'), 'error');
        return;
    }

    const result = await createTransaction(data);
    if (result) {
        const balanceMessage = result.new_balance === null
            ? t('product_sale_recorded')
            : `${t('new_balance')} ${formatCurrency(result.new_balance)}`;
        showToast(`${t('transaction_added')} ${balanceMessage}`, 'success');
        closeTransactionModal();
        
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
        await loadLanguagePreference();
        await fetchCustomers();
        renderCustomers();
        await renderDebts();
        await updateDailySummary();

        const backupStatus = new URLSearchParams(window.location.search);
        if (backupStatus.get('backup') === 'success') {
            showToast(t('backup_success'), 'success');
        } else if (backupStatus.get('backup') === 'error') {
            showToast(backupStatus.get('message') || t('backup_error'), 'error', 6000);
        }
        if (backupStatus.has('backup')) {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        setInterval(async () => {
            await fetchCustomers();
            renderCustomers();
            await renderDebts();
            await updateDailySummary();
        }, 30000);
        
        showToast(t('app_loaded'), 'success', 2000);
    } catch (error) {
        console.error('Error initializing app:', error);
        if (window.location.pathname !== '/login/' && window.location.pathname !== '/register/') {
            showToast(t('error_loading_app'), 'error');
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
