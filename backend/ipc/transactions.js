module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    // --- Invoices ---
    ipcMain.handle('invoices:getAll', async (event, type) => await db.invoices.getAll(type));
    ipcMain.handle('invoices:getById', async (event, id) => {
        const result = await db.invoices.getById(id);
        return result;
    });
    ipcMain.handle('invoices:create', async (event, invoice) => {
        const result = await db.invoices.create(invoice);
        if (result.success) await logActivity('create', invoice.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', result.id, result.invoice_number, invoice);
        return result;
    });
    ipcMain.handle('invoices:update', async (event, invoice) => {
        const result = await db.invoices.update(invoice);
        if (result.success) await logActivity('update', invoice.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', invoice.id, invoice.invoice_number, invoice);
        return result;
    });
    ipcMain.handle('invoices:delete', async (event, id) => {
        const existing = await db.invoices.getById(id);
        const result = await db.invoices.delete(id);
        if (result.success) await logActivity('delete', existing?.type === 'sales' ? 'sales_invoices' : 'purchase_invoices', id, existing?.invoice_number || String(id), {});
        return result;
    });
    ipcMain.handle('invoices:getPendingByCustomer', async (event, customerId) => await db.invoices.getPendingByCustomer(customerId));
    ipcMain.handle('invoices:getPendingBySupplier', async (event, supplierId) => await db.invoices.getPendingBySupplier(supplierId));
    ipcMain.handle('invoices:getByCustomer', async (event, customerId) => await db.invoices.getByCustomer(customerId));
    ipcMain.handle('invoices:getBySupplier', async (event, supplierId) => await db.invoices.getBySupplier(supplierId));
    ipcMain.handle('invoices:updateStatus', async (event, { id, status }) => await db.invoices.updateStatus(id, status));

    // --- Returns ---
    ipcMain.handle('returns:getAll', async (event, type) => await db.returns.getAll(type));
    ipcMain.handle('returns:getById', async (event, id) => await db.returns.getById(id));
    ipcMain.handle('returns:create', async (event, ret) => {
        const result = await db.returns.create(ret);
        if (result.success) await logActivity('create', ret.type === 'sales_return' ? 'sales_returns' : 'purchase_returns', result.id, result.return_number, ret);
        return result;
    });
    ipcMain.handle('returns:delete', async (event, id) => {
        const existing = await db.returns.getById(id);
        const result = await db.returns.delete(id);
        if (result.success) await logActivity('delete', existing?.type === 'sales_return' ? 'sales_returns' : 'purchase_returns', id, existing?.return_number || String(id), {});
        return result;
    });

    // --- Vouchers ---
    ipcMain.handle('vouchers:getAll', async (event, type) => await db.vouchers.getAll(type));
    ipcMain.handle('vouchers:getById', async (event, id) => await db.vouchers.getById(id));
    ipcMain.handle('vouchers:create', async (event, voucher) => {
        const result = await db.vouchers.create(voucher);
        if (result.success) await logActivity('create', 'vouchers', result.id, result.voucher_number, voucher);
        return result;
    });
    ipcMain.handle('vouchers:update', async (event, voucher) => {
        const result = await db.vouchers.update(voucher);
        if (result.success) await logActivity('update', 'vouchers', voucher.id, voucher.voucher_number, voucher);
        return result;
    });
    ipcMain.handle('vouchers:delete', async (event, id) => {
        const existing = await db.vouchers.getById(id);
        const result = await db.vouchers.delete(id);
        if (result.success) await logActivity('delete', 'vouchers', id, existing?.voucher_number || String(id), {});
        return result;
    });

    // --- Journal Entries ---
    ipcMain.handle('journal:getAll', async () => await db.journal.getAll());
    ipcMain.handle('journal:create', async (event, entry) => {
        const result = await db.journal.create(entry);
        if (result.success) await logActivity('create', 'journal_entries', result.id, result.entry_number, entry);
        return result;
    });
    ipcMain.handle('journal:delete', async (event, id) => {
        const result = await db.journal.delete(id);
        if (result.success) await logActivity('delete', 'journal_entries', id, String(id), {});
        return result;
    });
};
