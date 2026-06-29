const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');
const AdminConfig = require('./admin-config');

let mainWindow;
let adminConfig = null;
let currentUser = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        title: 'Vero',
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, '../public/icon.png'),
        autoHideMenuBar: true
    });

    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(async () => {
    // Initialize admin config first
    const userDataPath = app.getPath('userData');
    adminConfig = new AdminConfig(userDataPath);
    adminConfig.init();
    db.setAdminConfig(adminConfig);
    
    await db.init(app);
    console.log('Database initialized successfully');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (db && typeof db.forceSave === 'function') {
        db.forceSave();
    }
});

// ==================== IPC Handlers ====================

// Helper: log activity safely
function logActivity(action, module, entity_id, entity_ref, data) {
    try {
        const user_id = data?._userId || (currentUser ? currentUser.id : null);
        const user_name = data?._userName || (currentUser ? (currentUser.full_name || currentUser.username) : 'غير معروف');
        db.activityLog.log({ user_id, user_name, action, module, entity_id, entity_ref });
    } catch (e) { /* silent */ }
}

// --- System Setup ---
ipcMain.handle('system:isFirstRun', async () => db.system.isFirstRun());
ipcMain.handle('system:runSetup', async (event, data) => db.system.runSetup(data));

// Setup gate: verify master admin credentials before allowing company creation
const SETUP_ADMIN_USERNAME = 'admin';
ipcMain.handle('system:verifySetupAccess', async (event, { username, password }) => {
    if (!adminConfig) {
        return { success: false, message: 'Configuration not initialized' };
    }
    const SETUP_ADMIN_PASSWORD = adminConfig.getAdminPassword();
    if (username === SETUP_ADMIN_USERNAME && password === SETUP_ADMIN_PASSWORD) {
        return { success: true };
    }
    return { success: false, message: 'Invalid admin credentials' };
});

// --- Users & Auth ---
ipcMain.handle('users:login', async (event, { username, password }) => {
    const result = db.users.login(username, password);
    if (result.success) {
        currentUser = result.user;
        db.activityLog.log({ user_id: result.user.id, user_name: result.user.full_name || username, action: 'login', module: 'users', entity_ref: username });
    }
    return result;
});
ipcMain.handle('users:setCurrentUser', async (event, user) => {
    currentUser = user;
    return { success: true };
});
ipcMain.handle('users:getAll', async () => db.users.getAll());
ipcMain.handle('users:create', async (event, user) => {
    const result = db.users.create(user);
    if (result.success) logActivity('create', 'users', result.id, user.username, user);
    return result;
});
ipcMain.handle('users:update', async (event, user) => {
    const result = db.users.update(user);
    if (result.success) logActivity('update', 'users', user.id, user.username, user);
    return result;
});
ipcMain.handle('users:delete', async (event, id) => {
    const result = db.users.delete(id);
    if (result.success) logActivity('delete', 'users', id, String(id), {});
    return result;
});

// --- Customers ---
ipcMain.handle('customers:getAll', async () => db.customers.getAll());
ipcMain.handle('customers:getById', async (event, id) => db.customers.getById(id));
ipcMain.handle('customers:create', async (event, customer) => {
    const result = db.customers.create(customer);
    if (result.success) logActivity('create', 'customers', result.id, customer.name, customer);
    return result;
});
ipcMain.handle('customers:update', async (event, customer) => {
    const result = db.customers.update(customer);
    if (result.success) logActivity('update', 'customers', customer.id, customer.name, customer);
    return result;
});
ipcMain.handle('customers:delete', async (event, id) => {
    const existing = db.customers.getById(id);
    const result = db.customers.delete(id);
    if (result.success) logActivity('delete', 'customers', id, existing?.name || String(id), {});
    return result;
});

// --- Suppliers ---
ipcMain.handle('suppliers:getAll', async () => db.suppliers.getAll());
ipcMain.handle('suppliers:getById', async (event, id) => db.suppliers.getById(id));
ipcMain.handle('suppliers:create', async (event, supplier) => {
    const result = db.suppliers.create(supplier);
    if (result.success) logActivity('create', 'suppliers', result.id, supplier.name, supplier);
    return result;
});
ipcMain.handle('suppliers:update', async (event, supplier) => {
    const result = db.suppliers.update(supplier);
    if (result.success) logActivity('update', 'suppliers', supplier.id, supplier.name, supplier);
    return result;
});
ipcMain.handle('suppliers:delete', async (event, id) => {
    const existing = db.suppliers.getById(id);
    const result = db.suppliers.delete(id);
    if (result.success) logActivity('delete', 'suppliers', id, existing?.name || String(id), {});
    return result;
});

// --- Accounts ---
ipcMain.handle('accounts:getAll', async () => db.accounts.getAll());
ipcMain.handle('accounts:getTree', async () => db.accounts.getTree());
ipcMain.handle('accounts:create', async (event, account) => {
    const result = db.accounts.create(account);
    if (result.success) logActivity('create', 'accounts', result.id, account.name, account);
    return result;
});
ipcMain.handle('accounts:update', async (event, account) => {
    const result = db.accounts.update(account);
    if (result.success) logActivity('update', 'accounts', account.id, account.name, account);
    return result;
});
ipcMain.handle('accounts:delete', async (event, id) => {
    const result = db.accounts.delete(id);
    if (result.success) logActivity('delete', 'accounts', id, String(id), {});
    return result;
});
ipcMain.handle('accounts:getBankAccounts', async () => db.accounts.getBankAccounts());

// --- Products ---
ipcMain.handle('products:getAll', async () => db.products.getAll());
ipcMain.handle('products:getAllSortedBySales', async () => db.products.getAllSortedBySales());
ipcMain.handle('products:create', async (event, product) => {
    const result = db.products.create(product);
    if (result.success) logActivity('create', 'products', result.id, product.name, product);
    return result;
});
ipcMain.handle('products:update', async (event, product) => {
    const result = db.products.update(product);
    if (result.success) logActivity('update', 'products', product.id, product.name, product);
    return result;
});
ipcMain.handle('products:delete', async (event, id) => {
    const result = db.products.delete(id);
    if (result.success) logActivity('delete', 'products', id, String(id), {});
    return result;
});
ipcMain.handle('products:deleteAll', async () => {
    const result = db.products.deleteAll();
    if (result.success) logActivity('delete', 'products', 0, 'all_products', { deleted: result.deleted || 0 });
    return result;
});
ipcMain.handle('products:getMovements', async (event, { id, startDate, endDate }) => db.products.getMovements(id, startDate, endDate));
ipcMain.handle('products:addWarehouseStock', async (event, { id, quantity }) => {
    const result = db.products.addWarehouseStock(id, quantity);
    if (result.success) {
        const prod = db.products.getAll().find(p => p.id === id);
        logActivity('update', 'warehouse', id, prod?.name || String(id), { added_quantity: quantity });
    }
    return result;
});

// --- Invoices ---
ipcMain.handle('invoices:getAll', async (event, type) => db.invoices.getAll(type));
ipcMain.handle('invoices:getById', async (event, id) => {
    console.log('[IPC] invoices:getById called with id:', id, 'type:', typeof id);
    const result = db.invoices.getById(id);
    console.log('[IPC] invoices:getById result - has items:', result?.items?.length || 0);
    console.log('[IPC] invoices:getById items:', JSON.stringify(result?.items));
    return result;
});
ipcMain.handle('invoices:create', async (event, invoice) => {
    console.log('Creating invoice:', JSON.stringify(invoice, null, 2));
    const result = db.invoices.create(invoice);
    console.log('Invoice result:', result);
    if (result.success) logActivity('create', invoice.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', result.id, result.invoice_number, invoice);
    return result;
});
ipcMain.handle('invoices:update', async (event, invoice) => {
    const result = db.invoices.update(invoice);
    if (result.success) logActivity('update', invoice.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', invoice.id, invoice.invoice_number, invoice);
    return result;
});
ipcMain.handle('invoices:delete', async (event, id) => {
    const existing = db.invoices.getById(id);
    const result = db.invoices.delete(id);
    if (result.success) logActivity('delete', existing?.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', id, existing?.invoice_number || String(id), {});
    return result;
});
ipcMain.handle('invoices:getPendingByCustomer', async (event, customerId) => db.invoices.getPendingByCustomer(customerId));
ipcMain.handle('invoices:getPendingBySupplier', async (event, supplierId) => db.invoices.getPendingBySupplier(supplierId));
ipcMain.handle('invoices:getByCustomer', async (event, customerId) => db.invoices.getByCustomer(customerId));
ipcMain.handle('invoices:getBySupplier', async (event, supplierId) => db.invoices.getBySupplier(supplierId));
ipcMain.handle('invoices:updateStatus', async (event, { id, status }) => db.invoices.updateStatus(id, status));

// --- Returns ---
ipcMain.handle('returns:getAll', async (event, type) => db.returns.getAll(type));
ipcMain.handle('returns:getById', async (event, id) => db.returns.getById(id));
ipcMain.handle('returns:create', async (event, ret) => {
    const result = db.returns.create(ret);
    if (result.success) logActivity('create', ret.type === 'sales_return' ? 'sales_returns' : 'purchase_returns', result.id, result.return_number, ret);
    return result;
});
ipcMain.handle('returns:delete', async (event, id) => {
    const existing = db.returns.getById(id);
    const result = db.returns.delete(id);
    if (result.success) logActivity('delete', existing?.type === 'sales_return' ? 'sales_returns' : 'purchase_returns', id, existing?.return_number || String(id), {});
    return result;
});

// --- Vouchers ---
ipcMain.handle('vouchers:getAll', async (event, type) => db.vouchers.getAll(type));
ipcMain.handle('vouchers:getById', async (event, id) => db.vouchers.getById(id));
ipcMain.handle('vouchers:create', async (event, voucher) => {
    const result = db.vouchers.create(voucher);
    if (result.success) logActivity('create', 'vouchers', result.id, result.voucher_number, voucher);
    return result;
});
ipcMain.handle('vouchers:update', async (event, voucher) => {
    const result = db.vouchers.update(voucher);
    if (result.success) logActivity('update', 'vouchers', voucher.id, voucher.voucher_number, voucher);
    return result;
});
ipcMain.handle('vouchers:delete', async (event, id) => {
    const existing = db.vouchers.getById(id);
    const result = db.vouchers.delete(id);
    if (result.success) logActivity('delete', 'vouchers', id, existing?.voucher_number || String(id), {});
    return result;
});

// --- HR ---
ipcMain.handle('employees:getAll', async () => db.employees.getAll());
ipcMain.handle('employees:getById', async (event, id) => db.employees.getById(id));
ipcMain.handle('employees:create', async (event, emp) => {
    const result = db.employees.create(emp);
    if (result.success) logActivity('create', 'employees', result.id, emp.name, emp);
    return result;
});
ipcMain.handle('employees:update', async (event, emp) => {
    const result = db.employees.update(emp);
    if (result.success) logActivity('update', 'employees', emp.id, emp.name, emp);
    return result;
});
ipcMain.handle('employees:delete', async (event, id) => {
    const result = db.employees.delete(id);
    if (result.success) logActivity('delete', 'employees', id, String(id), {});
    return result;
});
ipcMain.handle('employees:getSummary', async (event, id) => db.employees.getSummary(id));

ipcMain.handle('salaries:getAll', async () => db.salaries.getAll());
ipcMain.handle('salaries:getByEmployee', async (event, id) => db.salaries.getByEmployee(id));
ipcMain.handle('salaries:pay', async (event, payment) => {
    const result = db.salaries.pay(payment);
    if (result.success) logActivity('create', 'salaries', result.id, payment.payment_number || String(result.id), payment);
    return result;
});
ipcMain.handle('salaries:delete', async (event, id) => {
    const result = db.salaries.delete(id);
    if (result.success) logActivity('delete', 'salaries', id, String(id), {});
    return result;
});
ipcMain.handle('salaries:getTotal', async (event, { startDate, endDate }) => db.salaries.getTotal(startDate, endDate));

ipcMain.handle('leaves:getAll', async () => db.leaves.getAll());
ipcMain.handle('leaves:getByEmployee', async (event, id) => db.leaves.getByEmployee(id));
ipcMain.handle('leaves:create', async (event, leave) => {
    const result = db.leaves.create(leave);
    if (result.success) logActivity('create', 'leaves', result.id, leave.leave_type, leave);
    return result;
});
ipcMain.handle('leaves:updateStatus', async (event, { id, status, approvedBy }) => {
    const result = db.leaves.updateStatus(id, status, approvedBy);
    if (result.success) logActivity('update', 'leaves', id, status, { status, approvedBy });
    return result;
});
ipcMain.handle('leaves:delete', async (event, id) => {
    const result = db.leaves.delete(id);
    if (result.success) logActivity('delete', 'leaves', id, String(id), {});
    return result;
});

ipcMain.handle('deductions:getAll', async () => db.deductions.getAll());
ipcMain.handle('deductions:getByEmployee', async (event, id) => db.deductions.getByEmployee(id));
ipcMain.handle('deductions:create', async (event, deduction) => {
    const result = db.deductions.create(deduction);
    if (result.success) logActivity('create', 'deductions', result.id, deduction.reason, deduction);
    return result;
});
ipcMain.handle('deductions:delete', async (event, id) => {
    const result = db.deductions.delete(id);
    if (result.success) logActivity('delete', 'deductions', id, String(id), {});
    return result;
});

// --- Expenses ---
ipcMain.handle('expenses:getAll', async () => db.expenses.getAll());
ipcMain.handle('expenses:create', async (event, data) => {
    const result = db.expenses.create(data);
    if (result.success) logActivity('create', 'expenses', result.id, data.payment_number || String(result.id), data);
    return result;
});
ipcMain.handle('expenses:delete', async (event, id) => {
    const result = db.expenses.delete(id);
    if (result.success) logActivity('delete', 'expenses', id, String(id), {});
    return result;
});
ipcMain.handle('expenses:getTotal', async (event, { startDate, endDate, category }) => db.expenses.getTotal(startDate, endDate, category));

// --- Stock Transfers ---
ipcMain.handle('stockTransfers:getAll', async () => db.stockTransfers.getAll());
ipcMain.handle('stockTransfers:getById', async (event, id) => db.stockTransfers.getById(id));
ipcMain.handle('stockTransfers:create', async (event, transfer) => {
    const result = db.stockTransfers.create(transfer);
    if (result.success) logActivity('create', 'warehouse', result.id, result.transfer_number, transfer);
    return result;
});
ipcMain.handle('stockTransfers:delete', async (event, id) => {
    const existing = db.stockTransfers.getById(id);
    const result = db.stockTransfers.delete(id);
    if (result.success) logActivity('delete', 'warehouse', id, existing?.transfer_number || String(id), {});
    return result;
});

// --- Journal Entries ---
ipcMain.handle('journal:getAll', async () => db.journal.getAll());
ipcMain.handle('journal:create', async (event, entry) => {
    const result = db.journal.create(entry);
    if (result.success) logActivity('create', 'journal_entries', result.id, result.entry_number, entry);
    return result;
});
ipcMain.handle('journal:delete', async (event, id) => {
    const result = db.journal.delete(id);
    if (result.success) logActivity('delete', 'journal_entries', id, String(id), {});
    return result;
});

// --- Reports ---
ipcMain.handle('reports:accountStatement', async (event, { accountId, startDate, endDate }) => db.reports.accountStatement(accountId, startDate, endDate));
ipcMain.handle('reports:trialBalance', async (event, { date }) => db.reports.trialBalance(date));
ipcMain.handle('reports:salesReport', async (event, { startDate, endDate }) => db.reports.salesReport(startDate, endDate));
ipcMain.handle('reports:purchasesReport', async (event, { startDate, endDate }) => db.reports.purchasesReport(startDate, endDate));

// --- Offers & Coupons ---
ipcMain.handle('coupons:getAll', async () => db.coupons.getAll());
ipcMain.handle('coupons:create', async (event, data) => {
    const result = db.coupons.create(data);
    if (result.success) logActivity('create', 'coupons', result.id, data.code, data);
    return result;
});
ipcMain.handle('coupons:update', async (event, data) => {
    const result = db.coupons.update(data);
    if (result.success) logActivity('update', 'coupons', data.id, data.code, data);
    return result;
});
ipcMain.handle('coupons:delete', async (event, id) => {
    const result = db.coupons.delete(id);
    if (result.success) logActivity('delete', 'coupons', id, String(id), {});
    return result;
});
ipcMain.handle('coupons:validate', async (event, code) => db.coupons.validate(code));
ipcMain.handle('coupons:incrementUse', async (event, id) => db.coupons.incrementUse(id));

ipcMain.handle('offers:getAll', async () => db.offers.getAll());
ipcMain.handle('offers:getActive', async () => db.offers.getActive());
ipcMain.handle('offers:create', async (event, data) => {
    const result = db.offers.create(data);
    if (result.success) logActivity('create', 'offers', result.id, data.title, data);
    return result;
});
ipcMain.handle('offers:update', async (event, data) => {
    const result = db.offers.update(data);
    if (result.success) logActivity('update', 'offers', data.id, data.title, data);
    return result;
});
ipcMain.handle('offers:delete', async (event, id) => {
    const result = db.offers.delete(id);
    if (result.success) logActivity('delete', 'offers', id, String(id), {});
    return result;
});

// --- Settings ---
ipcMain.handle('settings:get', async (event, key) => db.settings.get(key));
ipcMain.handle('settings:getAll', async () => db.settings.getAll());
ipcMain.handle('settings:set', async (event, { category, key, value }) => db.settings.set(category, key, value));
ipcMain.handle('settings:backup', async () => db.backup());
ipcMain.handle('settings:backupToPath', async (event, destPath) => db.backupToPath(destPath));
ipcMain.handle('settings:getDbPath', async () => db.getDbPath());
ipcMain.handle('settings:changeDbPath', async (event, newFolderPath) => {
    const result = db.changeDbPath(newFolderPath);
    if (result.success) {
        setTimeout(() => { app.relaunch(); app.exit(0); }, 500);
    }
    return result;
});
ipcMain.handle('settings:restore', async (event, filePath) => db.restore(filePath));
ipcMain.handle('settings:optimizeDb', async () => db.vacuum());

// Get database file size
ipcMain.handle('settings:getDbSize', async () => {
    try {
        const dbFilePath = db.getDbPath ? db.getDbPath() : null;
        if (!dbFilePath || !fs.existsSync(dbFilePath)) return null;
        const stats = fs.statSync(dbFilePath);
        const bytes = stats.size;
        if (bytes < 1024) return `${bytes} بايت`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
    } catch (e) { return null; }
});

// Reset application (delete all data)
ipcMain.handle('settings:resetApp', async () => {
    try {
        if (db.resetApp) {
            await db.resetApp();
        } else {
            const dbFilePath = db.getDbPath ? db.getDbPath() : null;
            if (dbFilePath && fs.existsSync(dbFilePath)) fs.unlinkSync(dbFilePath);
        }
        app.relaunch();
        app.exit(0);
        return { success: true };
    } catch (e) {
        console.error('[settings:resetApp] Error:', e);
        return { success: false, error: e.message };
    }
});

// --- Permissions ---
ipcMain.handle('permissions:getByRole', async (event, role) => db.permissions.getByRole(role));
ipcMain.handle('permissions:savePermissions', async (event, { role, permissions }) => db.permissions.savePermissions(role, permissions));
ipcMain.handle('permissions:getUserPermissions', async (event, userId) => db.permissions.getUserPermissions(userId));
ipcMain.handle('permissions:saveUserPermissions', async (event, { userId, permissions }) => db.permissions.saveUserPermissions(userId, permissions));
ipcMain.handle('permissions:clearUserPermissions', async (event, userId) => db.permissions.clearUserPermissions(userId));

// --- Activity Log ---
ipcMain.handle('activityLog:getAll', async (event, filters) => {
    return db.activityLog.getAll(filters || {});
});

// --- File Dialog ---
ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    if (mainWindow) {
        setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.blur();
                mainWindow.focus();
            }
        }, 100);
    }
    return result;
});

ipcMain.handle('dialog:saveFile', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    if (mainWindow) {
        setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.blur();
                mainWindow.focus();
            }
        }, 100);
    }
    return result;
});

// --- Print ---
ipcMain.handle('print:invoice', async (event, invoiceHtml, options = {}) => {
    const printWindow = new BrowserWindow({
        width: 800, height: 600, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);

    printWindow.webContents.on('did-finish-load', () => {
        let paperSize = options.paperSize;
        let paperOrientation = options.paperOrientation;

        if (!paperSize || !paperOrientation) {
            try {
                const settings = db.settings.getAll();
                const invoiceSettings = settings.invoice || {};
                if (!paperSize) paperSize = invoiceSettings.paper_size || 'A4';
                if (!paperOrientation) paperOrientation = invoiceSettings.paper_orientation || 'portrait';
            } catch (e) {
                if (!paperSize) paperSize = 'A4';
                if (!paperOrientation) paperOrientation = 'portrait';
            }
        }

        let pageSizeOption = 'A4';
        if (['A3', 'A4', 'A5', 'Letter', 'Legal'].includes(paperSize)) {
            pageSizeOption = paperSize;
        } else if (paperSize === 'thermal_110') {
            pageSizeOption = { width: 110000, height: 300000 };
        } else if (paperSize === 'thermal_80') {
            pageSizeOption = { width: 80000, height: 300000 };
        } else if (paperSize === 'thermal_76') {
            pageSizeOption = { width: 76000, height: 300000 };
        } else if (paperSize === 'thermal_58') {
            pageSizeOption = { width: 58000, height: 300000 };
        } else if (paperSize === 'thermal_57') {
            pageSizeOption = { width: 57000, height: 300000 };
        }

        const landscape = paperOrientation === 'landscape';
        const margins = paperSize.startsWith('thermal')
            ? { marginType: 'none' }
            : { marginType: 'default' };

        const printOptions = {
            silent: false,
            printBackground: true,
            landscape: landscape,
            pageSize: pageSizeOption,
            margins: margins
        };

        printWindow.webContents.print(printOptions, (success, errorType) => {
            printWindow.close();
            if (mainWindow) {
                setTimeout(() => {
                    if (!mainWindow.isDestroyed()) {
                        mainWindow.blur();
                        mainWindow.focus();
                    }
                }, 100);
            }
        });
    });

    return { success: true };
});

// --- File Read (for logo as base64) ---
ipcMain.handle('file:readAsBase64', async (event, filePath) => {
    try {
        console.log('[file:readAsBase64] Reading file:', filePath);
        if (!filePath) {
            console.log('[file:readAsBase64] No filePath provided');
            return null;
        }
        if (!fs.existsSync(filePath)) {
            console.error('[file:readAsBase64] File does not exist:', filePath);
            return null;
        }
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().slice(1);
        const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml' };
        const mime = mimeMap[ext] || 'image/png';
        const base64 = `data:${mime};base64,${data.toString('base64')}`;
        console.log('[file:readAsBase64] Successfully converted to base64, length:', base64.length);
        return base64;
    } catch (e) {
        console.error('[file:readAsBase64] Error reading file as base64:', e);
        return null;
    }
});

// --- Copy logo to app data ---
ipcMain.handle('file:copyLogo', async (event, srcPath) => {
    try {
        console.log('[file:copyLogo] Copying logo from:', srcPath);
        if (!srcPath || !fs.existsSync(srcPath)) {
            console.error('[file:copyLogo] Source file does not exist:', srcPath);
            return null;
        }
        const ext = path.extname(srcPath);
        const destDir = path.join(app.getPath('userData'));
        const destPath = path.join(destDir, `company_logo${ext}`);
        console.log('[file:copyLogo] Copying to:', destPath);
        fs.copyFileSync(srcPath, destPath);
        console.log('[file:copyLogo] Copy successful');
        return destPath;
    } catch (e) {
        console.error('[file:copyLogo] Error copying logo:', e);
        return null;
    }
});

// --- Save text/csv file to disk ---
ipcMain.handle('file:saveText', async (event, { content, defaultName, filters }) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultName || 'export.csv',
            filters: filters || [{ name: 'CSV Files', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }]
        });
        if (mainWindow) {
            setTimeout(() => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.blur();
                    mainWindow.focus();
                }
            }, 100);
        }
        if (result.canceled || !result.filePath) return { success: false };
        fs.writeFileSync(result.filePath, '\uFEFF' + content, 'utf8'); // BOM for Excel Arabic support
        return { success: true, filePath: result.filePath };
    } catch (e) {
        console.error('[file:saveText] Error:', e);
        return { success: false, error: e.message };
    }
});

// --- Database Backup Management ---
ipcMain.handle('database:getBackupPath', async () => {
    try {
        return db.getBackupPath();
    } catch (e) {
        console.error('[database:getBackupPath] Error:', e);
        return { backupDbPath: null, lastBackupTime: null };
    }
});

ipcMain.handle('database:setBackupPath', async (event, backupPath) => {
    try {
        const result = db.setBackupPath(backupPath);
        return result;
    } catch (e) {
        console.error('[database:setBackupPath] Error:', e);
        return { success: false, error: 'خطأ في تعيين مسار النسخة الاحتياطية' };
    }
});

ipcMain.handle('database:testBackupPath', async (event, testPath) => {
    try {
        const result = db.testBackupPath(testPath);
        return result;
    } catch (e) {
        console.error('[database:testBackupPath] Error:', e);
        return { success: false, error: 'فشل اختبار المسار' };
    }
});

ipcMain.handle('database:selectBackupPath', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'اختر مجلد لحفظ النسخة الاحتياطية'
        });
        if (mainWindow) {
            setTimeout(() => {
                if (!mainWindow.isDestroyed()) {
                    mainWindow.blur();
                    mainWindow.focus();
                }
            }, 100);
        }
        if (result.canceled || !result.filePaths.length) {
            return { success: false, canceled: true };
        }
        const selectedDir = result.filePaths[0];
        const backupPath = path.join(selectedDir, 'accapp_backup.db');
        return { success: true, path: backupPath };
    } catch (e) {
        console.error('[database:selectBackupPath] Error:', e);
        return { success: false, error: e.message };
    }
});

// --- Window Refocus Fix ---
ipcMain.on('window:refocus', () => {
    if (mainWindow) {
        setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
                mainWindow.blur();
                mainWindow.focus();
            }
        }, 100);
    }
});

// Start logging
console.log('All IPC handlers registered successfully');

