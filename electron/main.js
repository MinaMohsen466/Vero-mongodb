const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

let mainWindow;

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

// ==================== IPC Handlers ====================

// --- System Setup ---
ipcMain.handle('system:isFirstRun', async () => db.system.isFirstRun());
ipcMain.handle('system:runSetup', async (event, data) => db.system.runSetup(data));

// --- Users & Auth ---
ipcMain.handle('users:login', async (event, { username, password }) => db.users.login(username, password));
ipcMain.handle('users:getAll', async () => db.users.getAll());
ipcMain.handle('users:create', async (event, user) => db.users.create(user));
ipcMain.handle('users:update', async (event, user) => db.users.update(user));
ipcMain.handle('users:delete', async (event, id) => db.users.delete(id));

// --- Customers ---
ipcMain.handle('customers:getAll', async () => db.customers.getAll());
ipcMain.handle('customers:getById', async (event, id) => db.customers.getById(id));
ipcMain.handle('customers:create', async (event, customer) => db.customers.create(customer));
ipcMain.handle('customers:update', async (event, customer) => db.customers.update(customer));
ipcMain.handle('customers:delete', async (event, id) => db.customers.delete(id));

// --- Suppliers ---
ipcMain.handle('suppliers:getAll', async () => db.suppliers.getAll());
ipcMain.handle('suppliers:getById', async (event, id) => db.suppliers.getById(id));
ipcMain.handle('suppliers:create', async (event, supplier) => db.suppliers.create(supplier));
ipcMain.handle('suppliers:update', async (event, supplier) => db.suppliers.update(supplier));
ipcMain.handle('suppliers:delete', async (event, id) => db.suppliers.delete(id));

// --- Accounts ---
ipcMain.handle('accounts:getAll', async () => db.accounts.getAll());
ipcMain.handle('accounts:getTree', async () => db.accounts.getTree());
ipcMain.handle('accounts:create', async (event, account) => db.accounts.create(account));
ipcMain.handle('accounts:update', async (event, account) => db.accounts.update(account));
ipcMain.handle('accounts:delete', async (event, id) => db.accounts.delete(id));
ipcMain.handle('accounts:getBankAccounts', async () => db.accounts.getBankAccounts());

// --- Products ---
ipcMain.handle('products:getAll', async () => db.products.getAll());
ipcMain.handle('products:create', async (event, product) => db.products.create(product));
ipcMain.handle('products:update', async (event, product) => db.products.update(product));
ipcMain.handle('products:delete', async (event, id) => db.products.delete(id));

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
    return result;
});
ipcMain.handle('invoices:update', async (event, invoice) => db.invoices.update(invoice));
ipcMain.handle('invoices:delete', async (event, id) => db.invoices.delete(id));
ipcMain.handle('invoices:getPendingByCustomer', async (event, customerId) => db.invoices.getPendingByCustomer(customerId));
ipcMain.handle('invoices:getPendingBySupplier', async (event, supplierId) => db.invoices.getPendingBySupplier(supplierId));
ipcMain.handle('invoices:getByCustomer', async (event, customerId) => db.invoices.getByCustomer(customerId));
ipcMain.handle('invoices:getBySupplier', async (event, supplierId) => db.invoices.getBySupplier(supplierId));
ipcMain.handle('invoices:updateStatus', async (event, { id, status }) => db.invoices.updateStatus(id, status));

// --- Vouchers ---
ipcMain.handle('vouchers:getAll', async (event, type) => db.vouchers.getAll(type));
ipcMain.handle('vouchers:getById', async (event, id) => db.vouchers.getById(id));
ipcMain.handle('vouchers:create', async (event, voucher) => db.vouchers.create(voucher));
ipcMain.handle('vouchers:update', async (event, voucher) => db.vouchers.update(voucher));
ipcMain.handle('vouchers:delete', async (event, id) => db.vouchers.delete(id));

// --- Journal Entries ---
ipcMain.handle('journal:getAll', async () => db.journal.getAll());
ipcMain.handle('journal:create', async (event, entry) => db.journal.create(entry));
ipcMain.handle('journal:delete', async (event, id) => db.journal.delete(id));

// --- Reports ---
ipcMain.handle('reports:accountStatement', async (event, { accountId, startDate, endDate }) => db.reports.accountStatement(accountId, startDate, endDate));
ipcMain.handle('reports:trialBalance', async (event, { date }) => db.reports.trialBalance(date));
ipcMain.handle('reports:salesReport', async (event, { startDate, endDate }) => db.reports.salesReport(startDate, endDate));
ipcMain.handle('reports:purchasesReport', async (event, { startDate, endDate }) => db.reports.purchasesReport(startDate, endDate));

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

// --- HR: Employees ---
ipcMain.handle('employees:getAll', async () => db.employees.getAll());
ipcMain.handle('employees:getById', async (event, id) => db.employees.getById(id));
ipcMain.handle('employees:create', async (event, emp) => db.employees.create(emp));
ipcMain.handle('employees:update', async (event, emp) => db.employees.update(emp));
ipcMain.handle('employees:delete', async (event, id) => db.employees.delete(id));
ipcMain.handle('employees:getSummary', async (event, id) => db.employees.getSummary(id));

// --- HR: Salaries ---
ipcMain.handle('salaries:getAll', async () => db.salaries.getAll());
ipcMain.handle('salaries:getByEmployee', async (event, id) => db.salaries.getByEmployee(id));
ipcMain.handle('salaries:pay', async (event, payment) => db.salaries.pay(payment));
ipcMain.handle('salaries:delete', async (event, id) => db.salaries.delete(id));

// --- HR: Leaves ---
ipcMain.handle('leaves:getAll', async () => db.leaves.getAll());
ipcMain.handle('leaves:getByEmployee', async (event, id) => db.leaves.getByEmployee(id));
ipcMain.handle('leaves:create', async (event, leave) => db.leaves.create(leave));
ipcMain.handle('leaves:updateStatus', async (event, { id, status, approvedBy }) => db.leaves.updateStatus(id, status, approvedBy));
ipcMain.handle('leaves:delete', async (event, id) => db.leaves.delete(id));

// --- HR: Deductions ---
ipcMain.handle('deductions:getAll', async () => db.deductions.getAll());
ipcMain.handle('deductions:getByEmployee', async (event, id) => db.deductions.getByEmployee(id));
ipcMain.handle('deductions:create', async (event, ded) => db.deductions.create(ded));
ipcMain.handle('deductions:delete', async (event, id) => db.deductions.delete(id));

// --- HR: Rent ---
ipcMain.handle('rent:getAll', async () => db.rent.getAll());
ipcMain.handle('rent:pay', async (event, payment) => db.rent.pay(payment));
ipcMain.handle('rent:delete', async (event, id) => db.rent.delete(id));
ipcMain.handle('rent:getTotal', async (event, { startDate, endDate }) => db.rent.getTotal(startDate, endDate));
ipcMain.handle('salaries:getTotal', async (event, { startDate, endDate }) => db.salaries.getTotal(startDate, endDate));

// --- File Dialog ---
ipcMain.handle('dialog:openFile', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('dialog:saveFile', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

// --- Print ---
ipcMain.handle('print:invoice', async (event, invoiceHtml) => {
    const printWindow = new BrowserWindow({
        width: 800, height: 600, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(invoiceHtml)}`);

    printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.print({ silent: false, printBackground: true }, (success, errorType) => {
            printWindow.close();
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
        if (result.canceled || !result.filePath) return { success: false };
        fs.writeFileSync(result.filePath, '\uFEFF' + content, 'utf8'); // BOM for Excel Arabic support
        return { success: true, filePath: result.filePath };
    } catch (e) {
        console.error('[file:saveText] Error:', e);
        return { success: false, error: e.message };
    }
});
