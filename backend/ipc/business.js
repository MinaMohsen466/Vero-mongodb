module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    // --- Expenses ---
    ipcMain.handle('expenses:getAll', async () => await db.expenses.getAll());
    ipcMain.handle('expenses:create', async (event, data) => {
        const result = await db.expenses.create(data);
        if (result.success) await logActivity('create', 'expenses', result.id, data.payment_number || String(result.id), data);
        return result;
    });
    ipcMain.handle('expenses:delete', async (event, id) => {
        const result = await db.expenses.delete(id);
        if (result.success) await logActivity('delete', 'expenses', id, String(id), {});
        return result;
    });
    ipcMain.handle('expenses:getTotal', async (event, { startDate, endDate, category }) => await db.expenses.getTotal(startDate, endDate, category));

    // --- Stock Transfers ---
    ipcMain.handle('stockTransfers:getAll', async () => await db.stockTransfers.getAll());
    ipcMain.handle('stockTransfers:getById', async (event, id) => await db.stockTransfers.getById(id));
    ipcMain.handle('stockTransfers:create', async (event, transfer) => {
        const result = await db.stockTransfers.create(transfer);
        if (result.success) await logActivity('create', 'warehouse', result.id, result.transfer_number, transfer);
        return result;
    });
    ipcMain.handle('stockTransfers:delete', async (event, id) => {
        const existing = await db.stockTransfers.getById(id);
        const result = await db.stockTransfers.delete(id);
        if (result.success) await logActivity('delete', 'warehouse', id, existing?.transfer_number || String(id), {});
        return result;
    });

    // --- Reports ---
    ipcMain.handle('reports:accountStatement', async (event, { accountId, startDate, endDate }) => await db.reports.accountStatement(accountId, startDate, endDate));
    ipcMain.handle('reports:trialBalance', async (event, { date }) => await db.reports.trialBalance(date));
    ipcMain.handle('reports:salesReport', async (event, { startDate, endDate }) => await db.reports.salesReport(startDate, endDate));
    ipcMain.handle('reports:purchasesReport', async (event, { startDate, endDate }) => await db.reports.purchasesReport(startDate, endDate));
    ipcMain.handle('reports:profitLoss', async (event, { startDate, endDate }) => await db.reports.profitLoss(startDate, endDate));
    ipcMain.handle('reports:detailedInventory', async (event, { startDate, endDate }) => await db.reports.detailedInventory(startDate, endDate));

    // --- Offers & Coupons ---
    ipcMain.handle('coupons:getAll', async () => await db.coupons.getAll());
    ipcMain.handle('coupons:create', async (event, data) => {
        const result = await db.coupons.create(data);
        if (result.success) await logActivity('create', 'coupons', result.id, data.code, data);
        return result;
    });
    ipcMain.handle('coupons:update', async (event, data) => {
        const result = await db.coupons.update(data);
        if (result.success) await logActivity('update', 'coupons', data.id, data.code, data);
        return result;
    });
    ipcMain.handle('coupons:delete', async (event, id) => {
        const result = await db.coupons.delete(id);
        if (result.success) await logActivity('delete', 'coupons', id, String(id), {});
        return result;
    });
    ipcMain.handle('coupons:validate', async (event, code) => await db.coupons.validate(code));
    ipcMain.handle('coupons:incrementUse', async (event, id) => await db.coupons.incrementUse(id));

    ipcMain.handle('offers:getAll', async () => await db.offers.getAll());
    ipcMain.handle('offers:getActive', async () => await db.offers.getActive());
    ipcMain.handle('offers:create', async (event, data) => {
        const result = await db.offers.create(data);
        if (result.success) await logActivity('create', 'offers', result.id, data.title, data);
        return result;
    });
    ipcMain.handle('offers:update', async (event, data) => {
        const result = await db.offers.update(data);
        if (result.success) await logActivity('update', 'offers', data.id, data.title, data);
        return result;
    });
    ipcMain.handle('offers:delete', async (event, id) => {
        const result = await db.offers.delete(id);
        if (result.success) await logActivity('delete', 'offers', id, String(id), {});
        return result;
    });
};
