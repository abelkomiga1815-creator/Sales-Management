// Shop Ledger - Internationalization (i18n)
// Supports English (en) and Kiswahili (sw)

const translations = {
    en: {
        // App
        app_name: 'Shop Ledger',
        app_title: 'Shop Ledger',

        // Navigation
        logout: 'Log out',
        install_app: 'Install app',
        settings: 'Settings',
        language: 'Language',

        // Auth
        sign_in: 'Sign in',
        sign_in_desc: 'Sign in to your business ledger.',
        create_account: 'Create account',
        create_account_desc: 'Create an account for your business.',
        register_your_business: 'Register your business',
        already_have_account: 'Already have an account? Sign in',
        username: 'Username',
        password: 'Password',
        business_name: 'Business name',
        forgot_password: 'Forgot Password?',
        auth_error_generic: 'An error occurred.',

        // Forgot Password
        forgot_password_title: 'Reset Password',
        forgot_password_desc: 'Enter your username and we\'ll send you an OTP.',
        send_otp: 'Send OTP',
        enter_otp: 'Enter OTP',
        enter_otp_desc: 'Enter the 6-digit code sent to your email.',
        verify_otp: 'Verify OTP',
        set_new_password: 'Set New Password',
        new_password: 'New Password',
        confirm_password: 'Confirm Password',
        reset_password: 'Reset Password',
        otp_sent: 'If an account with that username exists, an OTP has been sent.',
        otp_verified: 'OTP verified. Set your new password.',
        password_reset_success: 'Password updated successfully. You can now log in.',
        back_to_login: 'Back to Login',
        passwords_do_not_match: 'Passwords do not match.',
        password_too_short: 'Password must be at least 8 characters.',

        // Password Strength
        password_strength: 'Password Strength',
        strength_weak: 'Weak',
        strength_medium: 'Medium',
        strength_strong: 'Strong',
        req_length: 'At least 8 characters',
        req_uppercase: 'One uppercase letter',
        req_lowercase: 'One lowercase letter',
        req_number: 'One number',
        req_special: 'One special character',

        // Dashboard
        today_summary: 'Today\'s Summary',
        total_credit_given: 'Total Credit Given',
        total_cash_received: 'Total Cash Received',
        net_cash_flow: 'Net Cash Flow',
        total_sales: 'Total Sales',
        view_full_report: 'View full report',
        backup_google_drive: 'Backup to Google Drive',

        // Customers
        customers: 'Customers',
        no_customers_found: 'No customers found',
        search_customer: 'Search customer by name or phone...',
        name: 'Name',
        phone: 'Phone',
        current_balance: 'Current Balance',

        // Transactions
        add_transaction: 'Add Transaction',
        transaction_type: 'Transaction Type',
        credit_given: 'Credit (Given)',
        debit_payed: 'Debit Payed',
        sale: 'Sale',
        debt: 'Debt',
        amount: 'Amount',
        description: 'Description',
        product: 'Product',
        customer_label: 'Customer',
        select_customer: 'Select a customer...',
        borrower_name_label: 'Borrower Name',
        enter_borrower_name: 'Enter borrower name...',
        customer_name_label: 'Customer Name',
        enter_customer_name: 'Enter customer name...',
        enter_product_borrowed: 'Enter product borrowed...',
        enter_product_sold: 'Enter product sold...',
        enter_product_service: 'Enter product/service name...',
        enter_product_name: 'Enter product name...',
        cancel: 'Cancel',
        add: 'Add Transaction',
        transaction_added: 'Transaction added successfully!',
        new_balance: 'New balance:',
        product_sale_recorded: 'Product sale recorded.',
        failed_create_transaction: 'Failed to create transaction',
        delete_transaction: 'Delete',
        delete_confirm: 'Delete this transaction? This cannot be undone.',
        transaction_deleted: 'Transaction deleted',
        no_transactions: 'No transactions yet',

        // Debts
        recorded_debts: 'Recorded Debts',
        no_debts: 'No debts recorded',
        manage_debts: 'Manage Debts',
        debt_information: 'Debt Information',
        borrower_name: 'Borrower Name',
        product_borrowed: 'Product Borrowed',
        date_recorded: 'Date Recorded',
        total_amount: 'Amount',
        total_paid: 'Debit Payed',
        remaining_balance: 'Remaining Balance',
        payment_status: 'Status',
        status_unpaid: 'UNPAID',
        status_partial: 'PARTIALLY PAID',
        status_paid: 'PAID',
        make_payment: 'Make Payment',
        payment_amount: 'Payment Amount',
        payment_description: 'Payment description (optional)',
        record_payment: 'Record Payment',
        payment_recorded: 'Payment recorded successfully!',
        payment_history: 'Payment History',
        no_payments: 'No payments recorded yet.',
        mark_as_repaid: 'Mark as Repaid',
        delete_record: 'Delete Record',
        mark_repaid_confirm: 'Mark this debt as repaid?',
        debt_marked_repaid: 'Debt marked as repaid!',
        delete_record_confirm: 'Delete this debt record? This cannot be undone.',
        debt_record_deleted: 'Debt record deleted',

        // Report
        full_activity_report: 'Full Activity Report',
        transactions_label: 'Transactions',
        credit_given_label: 'Credit given',
        cash_received_label: 'Cash received',
        net_cash_flow_label: 'Net cash flow',
        sales_label: 'Sales',
        no_activity: 'No activity recorded yet',

        // Transaction History
        transaction_history: 'Transaction History',

        // Settings
        language_setting: 'Language',
        english: 'English',
        kiswahili: 'Kiswahili',
        save: 'Save',
        settings_saved: 'Settings saved successfully.',

        // Backup
        backup_success: 'Backup uploaded to Google Drive.',
        backup_error: 'Google Drive backup failed.',

        // Validation
        select_customer_error: 'Please select a customer',
        enter_product_error: 'Please enter the product name',
        enter_borrower_error: 'Please enter the borrower name',
        enter_customer_name_error: 'Please enter the customer name',

        // Misc
        loading: 'Loading...',
        app_loaded: 'App loaded successfully',
        error_loading_app: 'Error loading app',
        offline_error: 'Offline - API requests require internet connection',
    },
    sw: {
        // App
        app_name: 'Shop Ledger',
        app_title: 'Shop Ledger',

        // Navigation
        logout: 'Ondoka',
        install_app: 'Sakinisha programu',
        settings: 'Mipangilio',
        language: 'Lugha',

        // Auth
        sign_in: 'Ingia',
        sign_in_desc: 'Ingia kwenye kitabu cha biashara yako.',
        create_account: 'Fungua akaunti',
        create_account_desc: 'Fungua akaunti kwa biashara yako.',
        register_your_business: 'Jiandikishe biashara yako',
        already_have_account: 'Tayari una akaunti? Ingia',
        username: 'Jina la mtumiaji',
        password: 'Nenosiri',
        business_name: 'Jina la biashara',
        forgot_password: 'Umesahau Nenosiri?',
        auth_error_generic: 'Kuna hitilafu imetokea.',

        // Forgot Password
        forgot_password_title: 'Weka upya Nenosiri',
        forgot_password_desc: 'Weka jina la mtumiaji na tutakutumia OTP.',
        send_otp: 'Tuma OTP',
        enter_otp: 'Weka OTP',
        enter_otp_desc: 'Weka nambari ya tarakimu 6 iliyojwa kwa barua pepe yako.',
        verify_otp: 'Thibitisha OTP',
        set_new_password: 'Weka Nenosiri Jipya',
        new_password: 'Nenosiri Jipya',
        confirm_password: 'Thibitisha Nenosiri',
        reset_password: 'Weka upya Nenosiri',
        otp_sent: 'Kama akaunti yenye jina hilo la mtumiajiipo, OTP imetumwa.',
        otp_verified: 'OTP imethibitishwa. Weka nenosiri lako jipya.',
        password_reset_success: 'Nenosiri limepdatesha. Sasa unaweza kuingia.',
        back_to_login: 'Rudi kwenye Kuingia',
        passwords_do_not_match: 'Nenosiri hazifanani.',
        password_too_short: 'Nenosiri lazima iwe na angalau herufi 8.',

        // Password Strength
        password_strength: 'Nguvu ya Nenosiri',
        strength_weak: 'Dhaifu',
        strength_medium: 'Wastani',
        strength_strong: 'Imara',
        req_length: 'Angalau herufi 8',
        req_uppercase: 'Herufi moja kubwa',
        req_lowercase: 'Herufi moja ndogo',
        req_number: 'Nambari moja',
        req_special: 'Herufi maalum moja',

        // Dashboard
        today_summary: 'Muhtasari wa Leo',
        total_credit_given: 'Jumla ya Mikopo',
        total_cash_received: 'Jumla ya Fedha Zilizopokelewa',
        net_cash_flow: 'Mtiririko wa Fedha',
        total_sales: 'Jumla ya Mauzo',
        view_full_report: 'Tazama ripoti kamili',
        backup_google_drive: 'Hifadhi kwenye Google Drive',

        // Customers
        customers: 'Wateja',
        no_customers_found: 'Hakuna wateja waliopatikana',
        search_customer: 'Tafuta mteja kwa jina au simu...',
        name: 'Jina',
        phone: 'Simu',
        current_balance: 'Salio la Sasa',

        // Transactions
        add_transaction: 'Ongeza Muamala',
        transaction_type: 'Aina ya Muamala',
        credit_given: 'Mikopo (Imetolewa)',
        debit_payed: 'Deni Limelemwa',
        sale: 'Uuzaji',
        debt: 'Deni',
        amount: 'Kiasi',
        description: 'Maelezo',
        product: 'Bidhaa',
        customer_label: 'Mteja',
        select_customer: 'Chagua mteja...',
        borrower_name_label: 'Jina la Mkopaji',
        enter_borrower_name: 'Weka jina la mkopaji...',
        customer_name_label: 'Jina la Mteja',
        enter_customer_name: 'Weka jina la mteja...',
        enter_product_borrowed: 'Weka bidhaa iliyokopwa...',
        enter_product_sold: 'Weka bidhaa iliyouzwa...',
        enter_product_service: 'Weka jina la bidhaa/huduma...',
        enter_product_name: 'Weka jina la bidhaa...',
        cancel: 'Ghairi',
        add: 'Ongeza Muamala',
        transaction_added: 'Muamala umefanikiwa kuongezwa!',
        new_balance: 'Salio jipya:',
        product_sale_recorded: 'Uuzaji wa bidhaa umerekodwa.',
        failed_create_transaction: 'Imeshindikana kuunda muamala',
        delete_transaction: 'Futa',
        delete_confirm: 'Futa muamala huu? Haitaweza kutenduliwa.',
        transaction_deleted: 'Muamala umefutwa',
        no_transactions: 'Hakuna miamala bado',

        // Debts
        recorded_debts: 'Deni Zilizorekodiwa',
        no_debts: 'Hakuna deni zilizorekodiwa',
        manage_debts: 'Simamia Deni',
        debt_information: 'Taarifa za Deni',
        borrower_name: 'Jina la Mkopaji',
        product_borrowed: 'Bidhaa Iliyokopwa',
        date_recorded: 'Tarehe Iliyorekodiwa',
        total_amount: 'Kiasi',
        total_paid: 'Deni Limelemwa',
        remaining_balance: 'Salio Lilobaki',
        payment_status: 'Hali',
        status_unpaid: 'HAIJALIPWA',
        status_partial: 'IMELIWA KIASI',
        status_paid: 'IMELIWA',
        make_payment: 'Fanya Malipo',
        payment_amount: 'Kiasi cha Malipo',
        payment_description: 'Maelezo ya malipo (si lazima)',
        record_payment: 'Rekodi Malipo',
        payment_recorded: 'Malipo yamerekodwa kwa mafanikio!',
        payment_history: 'Historia ya Malipo',
        no_payments: 'Hakuna malipo yaliyorekodiwa bado.',
        mark_as_repaid: 'Weka kama Imeliwa',
        delete_record: 'Futa Rekodi',
        mark_repaid_confirm: 'Weka deni hili kama limeliwa?',
        debt_marked_repaid: 'Deni limewekwa kama limeliwa!',
        delete_record_confirm: 'Futa rekodi ya deni hili? Haitaweza kutenduliwa.',
        debt_record_deleted: 'Rekodi ya deni imefutwa',

        // Report
        full_activity_report: 'Ripoti Kamili ya Shughuli',
        transactions_label: 'Miamala',
        credit_given_label: 'Mikopo imetolewa',
        cash_received_label: 'Fedha zilizopokelewa',
        net_cash_flow_label: 'Mtiririko wa fedha',
        sales_label: 'Mauzo',
        no_activity: 'Hakuna shughuli iliyorekodiwa bado',

        // Transaction History
        transaction_history: 'Historia ya Miamala',

        // Settings
        language_setting: 'Lugha',
        english: 'Kiingereza',
        kiswahili: 'Kiswahili',
        save: 'Hifadhi',
        settings_saved: 'Mipangilio imehifadhiwa kwa mafanikio.',

        // Backup
        backup_success: 'Nakala ya data imepakiwa kwenye Google Drive.',
        backup_error: 'Nakala ya Google Drive imeshindikana.',

        // Validation
        select_customer_error: 'Tafadhali chagua mteja',
        enter_product_error: 'Tafadhali weka jina la bidhaa',
        enter_borrower_error: 'Tafadhali weka jina la mkopaji',
        enter_customer_name_error: 'Tafadhali weka jina la mteja',

        // Misc
        loading: 'Inapakia...',
        app_loaded: 'Programu imepakiwa kwa mafanikio',
        error_loading_app: 'Hitilafu katika kupakia programu',
        offline_error: 'Nje ya mtandao - Maombi ya API yanahitaji muunganisho wa intaneti',
    }
};

let currentLanguage = 'en';

function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('shop_ledger_lang', lang);
    }
}

function t(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
}

function getStoredLanguage() {
    return localStorage.getItem('shop_ledger_lang') || 'en';
}
