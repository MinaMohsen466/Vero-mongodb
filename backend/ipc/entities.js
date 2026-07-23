module.exports = function(ipcMain, context) {
    const { db, logActivity } = context;

    const checkPermission = (moduleName, action) => {
        if (!context.currentUser) return false;
        if (context.currentUser.role === 'admin' || context.currentUser.id === 1 || context.currentUser.username === 'admin') return true;
        if (context.currentUser.permissions && context.currentUser.permissions[moduleName]) {
            const val = context.currentUser.permissions[moduleName][action];
            if (val !== undefined && val !== null) return !!val;
        }
        return context.currentUser.role === 'admin';
    };

    // --- Customers ---
    ipcMain.handle('customers:getAll', async () => await db.customers.getAll());
    ipcMain.handle('customers:getById', async (event, id) => await db.customers.getById(id));
    ipcMain.handle('customers:create', async (event, customer) => {
        if (!checkPermission('customers', 'can_create')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لإضافة العملاء.' };
        }
        const result = await db.customers.create(customer);
        if (result.success) await logActivity('create', 'customers', result.id, customer.name, customer);
        return result;
    });
    ipcMain.handle('customers:update', async (event, customer) => {
        if (!checkPermission('customers', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتعديل العملاء.' };
        }
        const result = await db.customers.update(customer);
        if (result.success) await logActivity('update', 'customers', customer.id, customer.name, customer);
        return result;
    });
    ipcMain.handle('customers:delete', async (event, id) => {
        if (!checkPermission('customers', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف العملاء.' };
        }
        const existing = await db.customers.getById(id);
        const result = await db.customers.delete(id);
        if (result.success) await logActivity('delete', 'customers', id, existing?.name || String(id), {});
        return result;
    });
    ipcMain.handle('customers:getNextCode', async () => await db.customers.getNextCode());
    ipcMain.handle('customers:writeOffDebt', async (event, payload) => {
        if (!checkPermission('customers', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لشطب وإعدام ديون العملاء.' };
        }
        const result = await db.customers.writeOffDebt(payload);
        if (result.success) await logActivity('update', 'customers', payload.id, `إعدام دين للعميل #${payload.id}`, payload);
        return result;
    });

    // --- Suppliers ---
    ipcMain.handle('suppliers:getAll', async () => await db.suppliers.getAll());
    ipcMain.handle('suppliers:getById', async (event, id) => await db.suppliers.getById(id));
    ipcMain.handle('suppliers:create', async (event, supplier) => {
        if (!checkPermission('suppliers', 'can_create')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لإضافة الموردين.' };
        }
        const result = await db.suppliers.create(supplier);
        if (result.success) await logActivity('create', 'suppliers', result.id, supplier.name, supplier);
        return result;
    });
    ipcMain.handle('suppliers:update', async (event, supplier) => {
        if (!checkPermission('suppliers', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتعديل الموردين.' };
        }
        const result = await db.suppliers.update(supplier);
        if (result.success) await logActivity('update', 'suppliers', supplier.id, supplier.name, supplier);
        return result;
    });
    ipcMain.handle('suppliers:delete', async (event, id) => {
        if (!checkPermission('suppliers', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف الموردين.' };
        }
        const existing = await db.suppliers.getById(id);
        const result = await db.suppliers.delete(id);
        if (result.success) await logActivity('delete', 'suppliers', id, existing?.name || String(id), {});
        return result;
    });
    ipcMain.handle('suppliers:getNextCode', async () => await db.suppliers.getNextCode());

    // --- Accounts ---
    ipcMain.handle('accounts:getAll', async () => await db.accounts.getAll());
    ipcMain.handle('accounts:getTree', async () => await db.accounts.getTree());
    ipcMain.handle('accounts:create', async (event, account) => {
        const result = await db.accounts.create(account);
        if (result.success) await logActivity('create', 'accounts', result.id, account.name, account);
        return result;
    });
    ipcMain.handle('accounts:update', async (event, account) => {
        const result = await db.accounts.update(account);
        if (result.success) await logActivity('update', 'accounts', account.id, account.name, account);
        return result;
    });
    ipcMain.handle('accounts:delete', async (event, id) => {
        const result = await db.accounts.delete(id);
        if (result.success) await logActivity('delete', 'accounts', id, String(id), {});
        return result;
    });
    ipcMain.handle('accounts:getBankAccounts', async () => await db.accounts.getBankAccounts());

    // --- Products ---
    ipcMain.handle('products:getAll', async () => await db.products.getAll());
    ipcMain.handle('products:getAllSortedBySales', async () => await db.products.getAllSortedBySales());
    ipcMain.handle('products:getSyncData', async (event, lastSyncTime) => await db.products.getSyncData(lastSyncTime));
    ipcMain.handle('products:create', async (event, product) => {
        if (!checkPermission('products', 'can_create')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لإضافة المنتجات.' };
        }
        const result = await db.products.create(product);
        if (result.success) await logActivity('create', 'products', result.id, product.name, product);
        return result;
    });
    ipcMain.handle('products:bulkCreate', async (event, products) => {
        if (!checkPermission('products', 'can_create') && !checkPermission('products_import', 'can_view')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لاستيراد المنتجات.' };
        }
        const result = await db.products.bulkCreate(products);
        if (result.success) await logActivity('create', 'products', 0, `bulk_create_${result.count}`, { count: result.count });
        return result;
    });
    ipcMain.handle('products:update', async (event, product) => {
        if (!checkPermission('products', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتعديل المنتجات.' };
        }
        const result = await db.products.update(product);
        if (result.success) await logActivity('update', 'products', product.id, product.name, product);
        return result;
    });
    ipcMain.handle('products:delete', async (event, id) => {
        if (!checkPermission('products', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف المنتجات.' };
        }
        const result = await db.products.delete(id);
        if (result.success) await logActivity('delete', 'products', id, String(id), {});
        return result;
    });
    ipcMain.handle('products:deleteAll', async () => {
        if (!checkPermission('products', 'can_delete')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لحذف المنتجات.' };
        }
        const result = await db.products.deleteAll();
        if (result.success) await logActivity('delete', 'products', 0, 'all_products', { deleted: result.deleted || 0 });
        return result;
    });
    ipcMain.handle('products:getMovements', async (event, { id, startDate, endDate }) => await db.products.getMovements(id, startDate, endDate));
    ipcMain.handle('products:addWarehouseStock', async (event, { id, quantity }) => {
        if (!checkPermission('warehouse', 'can_create') && !checkPermission('warehouse', 'can_edit')) {
            return { success: false, error: 'عذراً، لا تمتلك الصلاحية الكافية لتحديث مخزون المستودع.' };
        }
        const result = await db.products.addWarehouseStock(id, quantity);
        if (result.success) {
            const prod = (await db.products.getAll()).find(p => p.id === id);
            await logActivity('update', 'warehouse', id, prod?.name || String(id), { added_quantity: quantity });
        }
        return result;
    });
    ipcMain.handle('products:getNextCode', async () => await db.products.getNextCode());
};
