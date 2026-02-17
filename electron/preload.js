const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Users & Auth
    users: {
        login: (username, password) => ipcRenderer.invoke('users:login', { username, password }),
        getAll: () => ipcRenderer.invoke('users:getAll'),
        create: (user) => ipcRenderer.invoke('users:create', user),
        update: (user) => ipcRenderer.invoke('users:update', user),
        delete: (id) => ipcRenderer.invoke('users:delete', id)
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
        create: (product) => ipcRenderer.invoke('products:create', product),
        update: (product) => ipcRenderer.invoke('products:update', product),
        delete: (id) => ipcRenderer.invoke('products:delete', id)
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
        set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
        backup: () => ipcRenderer.invoke('settings:backup'),
        restore: (filePath) => ipcRenderer.invoke('settings:restore', filePath)
    },

    // Dialog
    dialog: {
        openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
        saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options)
    },

    // Print
    print: {
        invoice: (invoiceHtml) => ipcRenderer.invoke('print:invoice', invoiceHtml)
    },

    // File utils
    file: {
        readAsBase64: (filePath) => ipcRenderer.invoke('file:readAsBase64', filePath)
    }
});
