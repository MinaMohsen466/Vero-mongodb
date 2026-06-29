const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // System
    system: {
        isFirstRun: () => ipcRenderer.invoke('system:isFirstRun'),
        runSetup: (data) => ipcRenderer.invoke('system:runSetup', data),
        verifySetupAccess: (username, password) => ipcRenderer.invoke('system:verifySetupAccess', { username, password })
    },

    // Users & Auth
    users: {
        login: (username, password) => ipcRenderer.invoke('users:login', { username, password }),
        getAll: () => ipcRenderer.invoke('users:getAll'),
        create: (user) => ipcRenderer.invoke('users:create', user),
        update: (user) => ipcRenderer.invoke('users:update', user),
        delete: (id) => ipcRenderer.invoke('users:delete', id),
        setCurrentUser: (user) => ipcRenderer.invoke('users:setCurrentUser', user)
    },

    // Customers
    customers: {
        getAll: () => ipcRenderer.invoke('customers:getAll'),
        getById: (id) => ipcRenderer.invoke('customers:getById', id),
        create: (customer) => ipcRenderer.invoke('customers:create', customer),
        update: (customer) => ipcRenderer.invoke('customers:update', customer),
        delete: (id) => ipcRenderer.invoke('customers:delete', id)
    },

    // Suppliers
    suppliers: {
        getAll: () => ipcRenderer.invoke('suppliers:getAll'),
        getById: (id) => ipcRenderer.invoke('suppliers:getById', id),
        create: (supplier) => ipcRenderer.invoke('suppliers:create', supplier),
        update: (supplier) => ipcRenderer.invoke('suppliers:update', supplier),
        delete: (id) => ipcRenderer.invoke('suppliers:delete', id)
    },

    // Accounts
    accounts: {
        getAll: () => ipcRenderer.invoke('accounts:getAll'),
        getTree: () => ipcRenderer.invoke('accounts:getTree'),
        getBankAccounts: () => ipcRenderer.invoke('accounts:getBankAccounts'),
        create: (account) => ipcRenderer.invoke('accounts:create', account),
        update: (account) => ipcRenderer.invoke('accounts:update', account),
        delete: (id) => ipcRenderer.invoke('accounts:delete', id)
    },

    // Products
    products: {
        getAll: () => ipcRenderer.invoke('products:getAll'),
        getAllSortedBySales: () => ipcRenderer.invoke('products:getAllSortedBySales'),
        create: (product) => ipcRenderer.invoke('products:create', product),
        update: (product) => ipcRenderer.invoke('products:update', product),
        delete: (id) => ipcRenderer.invoke('products:delete', id),
        deleteAll: () => ipcRenderer.invoke('products:deleteAll'),
        getMovements: (id, startDate, endDate) => ipcRenderer.invoke('products:getMovements', { id, startDate, endDate }),
        addWarehouseStock: (id, quantity) => ipcRenderer.invoke('products:addWarehouseStock', { id, quantity })
    },

    // Invoices
    invoices: {
        getAll: (type) => ipcRenderer.invoke('invoices:getAll', type),
        getById: (id) => ipcRenderer.invoke('invoices:getById', id),
        create: (invoice) => ipcRenderer.invoke('invoices:create', invoice),
        update: (invoice) => ipcRenderer.invoke('invoices:update', invoice),
        delete: (id) => ipcRenderer.invoke('invoices:delete', id),
        getPendingByCustomer: (customerId) => ipcRenderer.invoke('invoices:getPendingByCustomer', customerId),
        getPendingBySupplier: (supplierId) => ipcRenderer.invoke('invoices:getPendingBySupplier', supplierId),
        getByCustomer: (customerId) => ipcRenderer.invoke('invoices:getByCustomer', customerId),
        getBySupplier: (supplierId) => ipcRenderer.invoke('invoices:getBySupplier', supplierId),
        updateStatus: (id, status) => ipcRenderer.invoke('invoices:updateStatus', { id, status })
    },

    // Returns
    returns: {
        getAll: (type) => ipcRenderer.invoke('returns:getAll', type),
        getById: (id) => ipcRenderer.invoke('returns:getById', id),
        create: (ret) => ipcRenderer.invoke('returns:create', ret),
        delete: (id) => ipcRenderer.invoke('returns:delete', id)
    },

    // Vouchers
    vouchers: {
        getAll: (type) => ipcRenderer.invoke('vouchers:getAll', type),
        getById: (id) => ipcRenderer.invoke('vouchers:getById', id),
        create: (voucher) => ipcRenderer.invoke('vouchers:create', voucher),
        update: (voucher) => ipcRenderer.invoke('vouchers:update', voucher),
        delete: (id) => ipcRenderer.invoke('vouchers:delete', id)
    },

    // Journal Entries
    journal: {
        getAll: () => ipcRenderer.invoke('journal:getAll'),
        create: (entry) => ipcRenderer.invoke('journal:create', entry),
        delete: (id) => ipcRenderer.invoke('journal:delete', id)
    },

    // Reports
    reports: {
        accountStatement: (accountId, startDate, endDate) =>
            ipcRenderer.invoke('reports:accountStatement', { accountId, startDate, endDate }),
        trialBalance: (date) => ipcRenderer.invoke('reports:trialBalance', { date }),
        salesReport: (startDate, endDate) =>
            ipcRenderer.invoke('reports:salesReport', { startDate, endDate }),
        purchasesReport: (startDate, endDate) =>
            ipcRenderer.invoke('reports:purchasesReport', { startDate, endDate })
    },

    // Settings
    settings: {
        get: (key) => ipcRenderer.invoke('settings:get', key),
        getAll: () => ipcRenderer.invoke('settings:getAll'),
        set: (category, key, value) => ipcRenderer.invoke('settings:set', { category, key, value }),
        backup: () => ipcRenderer.invoke('settings:backup'),
        backupToPath: (destPath) => ipcRenderer.invoke('settings:backupToPath', destPath),
        getDbPath: () => ipcRenderer.invoke('settings:getDbPath'),
        getDbSize: () => ipcRenderer.invoke('settings:getDbSize'),
        changeDbPath: (newFolderPath) => ipcRenderer.invoke('settings:changeDbPath', newFolderPath),
        restore: (filePath) => ipcRenderer.invoke('settings:restore', filePath),
        resetApp: () => ipcRenderer.invoke('settings:resetApp'),
        optimizeDb: () => ipcRenderer.invoke('settings:optimizeDb')
    },

    // Permissions
    permissions: {
        getByRole: (role) => ipcRenderer.invoke('permissions:getByRole', role),
        savePermissions: (role, permissions) => ipcRenderer.invoke('permissions:savePermissions', { role, permissions }),
        getUserPermissions: (userId) => ipcRenderer.invoke('permissions:getUserPermissions', userId),
        saveUserPermissions: (userId, permissions) => ipcRenderer.invoke('permissions:saveUserPermissions', { userId, permissions }),
        clearUserPermissions: (userId) => ipcRenderer.invoke('permissions:clearUserPermissions', userId)
    },

    // HR: Employees
    employees: {
        getAll: () => ipcRenderer.invoke('employees:getAll'),
        getById: (id) => ipcRenderer.invoke('employees:getById', id),
        create: (emp) => ipcRenderer.invoke('employees:create', emp),
        update: (emp) => ipcRenderer.invoke('employees:update', emp),
        delete: (id) => ipcRenderer.invoke('employees:delete', id),
        getSummary: (id) => ipcRenderer.invoke('employees:getSummary', id)
    },

    // HR: Salaries
    salaries: {
        getAll: () => ipcRenderer.invoke('salaries:getAll'),
        getByEmployee: (id) => ipcRenderer.invoke('salaries:getByEmployee', id),
        pay: (payment) => ipcRenderer.invoke('salaries:pay', payment),
        delete: (id) => ipcRenderer.invoke('salaries:delete', id),
        getTotal: (startDate, endDate) => ipcRenderer.invoke('salaries:getTotal', { startDate, endDate })
    },

    // HR: Leaves
    leaves: {
        getAll: () => ipcRenderer.invoke('leaves:getAll'),
        getByEmployee: (id) => ipcRenderer.invoke('leaves:getByEmployee', id),
        create: (leave) => ipcRenderer.invoke('leaves:create', leave),
        updateStatus: (id, status, approvedBy) => ipcRenderer.invoke('leaves:updateStatus', { id, status, approvedBy }),
        delete: (id) => ipcRenderer.invoke('leaves:delete', id)
    },

    // HR: Deductions
    deductions: {
        getAll: () => ipcRenderer.invoke('deductions:getAll'),
        getByEmployee: (id) => ipcRenderer.invoke('deductions:getByEmployee', id),
        create: (deduction) => ipcRenderer.invoke('deductions:create', deduction),
        delete: (id) => ipcRenderer.invoke('deductions:delete', id)
    },

    // Expenses
    expenses: {
        getAll: () => ipcRenderer.invoke('expenses:getAll'),
        create: (payment) => ipcRenderer.invoke('expenses:create', payment),
        delete: (id) => ipcRenderer.invoke('expenses:delete', id),
        getTotal: (startDate, endDate, category) => ipcRenderer.invoke('expenses:getTotal', { startDate, endDate, category })
    },

    // Stock Transfers (Warehouse)
    stockTransfers: {
        getAll: () => ipcRenderer.invoke('stockTransfers:getAll'),
        getById: (id) => ipcRenderer.invoke('stockTransfers:getById', id),
        create: (transfer) => ipcRenderer.invoke('stockTransfers:create', transfer),
        delete: (id) => ipcRenderer.invoke('stockTransfers:delete', id)
    },

    // Dialog
    dialog: {
        openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
        saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
    },

    // Print
    print: {
        invoice: (invoiceHtml, options) => ipcRenderer.invoke('print:invoice', invoiceHtml, options)
    },

    // Coupons
    coupons: {
        getAll: () => ipcRenderer.invoke('coupons:getAll'),
        create: (data) => ipcRenderer.invoke('coupons:create', data),
        update: (data) => ipcRenderer.invoke('coupons:update', data),
        delete: (id) => ipcRenderer.invoke('coupons:delete', id),
        validate: (code) => ipcRenderer.invoke('coupons:validate', code),
        incrementUse: (id) => ipcRenderer.invoke('coupons:incrementUse', id)
    },

    // Offers
    offers: {
        getAll: () => ipcRenderer.invoke('offers:getAll'),
        getActive: () => ipcRenderer.invoke('offers:getActive'),
        create: (data) => ipcRenderer.invoke('offers:create', data),
        update: (data) => ipcRenderer.invoke('offers:update', data),
        delete: (id) => ipcRenderer.invoke('offers:delete', id)
    },

    // File utils
    file: {
        readAsBase64: (filePath) => ipcRenderer.invoke('file:readAsBase64', filePath),
        copyLogo: (srcPath) => ipcRenderer.invoke('file:copyLogo', srcPath),
        saveText: (options) => ipcRenderer.invoke('file:saveText', options)
    },

    // Database backup management
    database: {
        getBackupPath: () => ipcRenderer.invoke('database:getBackupPath'),
        setBackupPath: (backupPath) => ipcRenderer.invoke('database:setBackupPath', backupPath),
        testBackupPath: (testPath) => ipcRenderer.invoke('database:testBackupPath', testPath),
        selectBackupPath: () => ipcRenderer.invoke('database:selectBackupPath')
    },

    // Activity Log
    activityLog: {
        getAll: (filters) => ipcRenderer.invoke('activityLog:getAll', filters)
    },

    // Window focus helper
    refocus: () => ipcRenderer.send('window:refocus')
});

