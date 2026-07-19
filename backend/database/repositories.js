const mongoose = require('mongoose');
const { 
    Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
    Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
    SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
    InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('./models');

// Password security helpers (from db.js)
const crypto = require('crypto');
function hashPassword(password) {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `pbkdf2$${salt}$${hash}`;
}
function verifyPassword(password, storedPassword) {
    if (!storedPassword || !password) return false;
    if (storedPassword.startsWith('pbkdf2$')) {
        const parts = storedPassword.split('$');
        if (parts.length === 3) {
            const salt = parts[1];
            const originalHash = parts[2];
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            return hash === originalHash;
        }
    }
    return password === storedPassword;
}

class UsersRepo {
    constructor(db) { this.db = db; }
    
    async login(username, password) {
        const userDoc = await User.findOne({ username, is_active: true });
        if (userDoc) {
            const isMatch = verifyPassword(password, userDoc.password_hash);
            if (isMatch) {
                // Auto-upgrade plain-text password to hash on successful login
                if (!userDoc.password_hash.startsWith('pbkdf2$')) {
                    userDoc.password_hash = hashPassword(password);
                    await User.updateOne({ id: userDoc.id }, { $set: { password_hash: userDoc.password_hash } });
                }

                const user = userDoc.toObject();
                delete user.password_hash;
                
                // Load permissions
                const rolePerms = await Permission.find({ role: user.role }).lean();
                const permMap = {};
                for (const p of rolePerms) {
                    permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
                }
                // User overrides
                const hasIndividual = await UserPermission.countDocuments({ user_id: user.id });
                if (hasIndividual > 0) {
                    const userPerms = await UserPermission.find({ user_id: user.id }).lean();
                    for (const p of userPerms) {
                        permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
                    }
                    user.has_individual_permissions = true;
                }
                if (user.role === 'admin') {
                    permMap['settings'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['permissions'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['dashboard'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['offers'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                }
                user.permissions = permMap;
                return { success: true, user };
            }
        }
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    async getAll() {
        return await User.find({}, 'id username full_name role is_active created_at').lean();
    }

    async create(user) {
        try {
            const nextId = await getNextSequenceValue('users');
            await User.create({
                id: nextId,
                username: user.username,
                password_hash: hashPassword(user.password),
                full_name: user.full_name,
                role: user.role || 'user'
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(user) {
        try {
            const updateData = {
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                is_active: user.is_active ? true : false
            };
            if (user.password) {
                if (user.current_password !== undefined) {
                    const existing = await User.findOne({ id: user.id });
                    if (!existing || !verifyPassword(user.current_password, existing.password_hash)) {
                        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
                    }
                }
                updateData.password_hash = hashPassword(user.password);
            }
            await User.updateOne({ id: user.id }, { $set: updateData });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await User.deleteOne({ id: id, id: { $ne: 1 } });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class CustomersRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Customer.find({}).sort({ name: 1 }).lean();
    }

    async getById(id) {
        return await Customer.findOne({ id }).lean();
    }

    async create(c) {
        try {
            const lastDoc = await Customer.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/C(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const code = c.code || `C${String(nextNumVal).padStart(4, '0')}`;
            const openingBalance = parseFloat(c.opening_balance) || 0;
            const openingDate = c.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const nextId = await getNextSequenceValue('customers');
            await Customer.create({
                id: nextId, code, name: c.name, phone: c.phone, email: c.email, address: c.address,
                tax_number: c.tax_number, credit_limit: c.credit_limit || 0, notes: c.notes,
                opening_balance: openingBalance, opening_balance_date: openingDate, balance: openingBalance
            });
            
            if (openingBalance > 0) {
                const jeId = await this.db._handleOpeningBalance('customer', nextId, 0, null, openingBalance, openingDate, code, c.name);
                if (jeId) {
                    await Customer.updateOne({ id: nextId }, { $set: { opening_balance_je_id: jeId } });
                }
            }
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(c) {
        try {
            const old = await Customer.findOne({ id: c.id });
            if (!old) return { success: false, error: 'Customer not found' };

            const oldOpeningBalance = parseFloat(old.opening_balance) || 0;
            const newOpeningBalance = parseFloat(c.opening_balance) || 0;
            const oldJeId = old.opening_balance_je_id;
            const openingDate = c.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const balanceDiff = newOpeningBalance - oldOpeningBalance;
            const newBalance = (old.balance || 0) + balanceDiff;

            let newJeId = oldJeId;
            if (newOpeningBalance !== oldOpeningBalance || openingDate !== old.opening_balance_date) {
                newJeId = await this.db._handleOpeningBalance('customer', c.id, oldOpeningBalance, oldJeId, newOpeningBalance, openingDate, old.code, c.name);
            }

            await Customer.updateOne({ id: c.id }, {
                $set: {
                    name: c.name, phone: c.phone, email: c.email, address: c.address, tax_number: c.tax_number,
                    credit_limit: c.credit_limit, notes: c.notes, is_active: c.is_active ? true : false,
                    opening_balance: newOpeningBalance, opening_balance_date: openingDate, opening_balance_je_id: newJeId,
                    balance: newBalance
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const old = await Customer.findOne({ id });
            if (old && old.opening_balance_je_id) {
                try {
                    await this.db.journal.delete(old.opening_balance_je_id);
                } catch (e) {
                    console.error("Error deleting opening balance journal entry:", e);
                }
            }
            await Customer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class SuppliersRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Supplier.find({}).sort({ name: 1 }).lean();
    }

    async getById(id) {
        return await Supplier.findOne({ id }).lean();
    }

    async create(s) {
        try {
            const lastDoc = await Supplier.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/S(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const code = s.code || `S${String(nextNumVal).padStart(4, '0')}`;
            const openingBalance = parseFloat(s.opening_balance) || 0;
            const openingDate = s.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const nextId = await getNextSequenceValue('suppliers');
            await Supplier.create({
                id: nextId, code, name: s.name, phone: s.phone, email: s.email, address: s.address,
                tax_number: s.tax_number, notes: s.notes, opening_balance: openingBalance,
                opening_balance_date: openingDate, balance: openingBalance
            });
            
            if (openingBalance > 0) {
                const jeId = await this.db._handleOpeningBalance('supplier', nextId, 0, null, openingBalance, openingDate, code, s.name);
                if (jeId) {
                    await Supplier.updateOne({ id: nextId }, { $set: { opening_balance_je_id: jeId } });
                }
            }
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(s) {
        try {
            const old = await Supplier.findOne({ id: s.id });
            if (!old) return { success: false, error: 'Supplier not found' };

            const oldOpeningBalance = parseFloat(old.opening_balance) || 0;
            const newOpeningBalance = parseFloat(s.opening_balance) || 0;
            const oldJeId = old.opening_balance_je_id;
            const openingDate = s.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const balanceDiff = newOpeningBalance - oldOpeningBalance;
            const newBalance = (old.balance || 0) + balanceDiff;

            let newJeId = oldJeId;
            if (newOpeningBalance !== oldOpeningBalance || openingDate !== old.opening_balance_date) {
                newJeId = await this.db._handleOpeningBalance('supplier', s.id, oldOpeningBalance, oldJeId, newOpeningBalance, openingDate, old.code, s.name);
            }

            await Supplier.updateOne({ id: s.id }, {
                $set: {
                    name: s.name, phone: s.phone, email: s.email, address: s.address, tax_number: s.tax_number,
                    notes: s.notes, is_active: s.is_active ? true : false, opening_balance: newOpeningBalance,
                    opening_balance_date: openingDate, opening_balance_je_id: newJeId, balance: newBalance
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const old = await Supplier.findOne({ id });
            if (old && old.opening_balance_je_id) {
                try {
                    await this.db.journal.delete(old.opening_balance_je_id);
                } catch (e) {
                    console.error("Error deleting opening balance journal entry:", e);
                }
            }
            await Supplier.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class AccountsRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Account.find({}).sort({ code: 1 }).lean();
    }

    async getTree() {
        const accounts = await this.getAll();
        const map = {}; const roots = [];
        for (const a of accounts) { a.children = []; map[a.id] = a; }
        for (const a of accounts) {
            if (a.parent_id && map[a.parent_id]) {
                map[a.parent_id].children.push(a);
            } else {
                roots.push(a);
            }
        }
        return roots;
    }

    async getBankAccounts() {
        return await Account.find({
            $or: [
                { code: /^111/ },
                { code: /^112/ }
            ],
            can_post: true
        }).sort({ code: 1 }).lean();
    }

    async create(a) {
        try {
            const nextId = await getNextSequenceValue('accounts');
            await Account.create({
                id: nextId, code: a.code, name: a.name, parent_id: a.parent_id || null,
                account_type: a.account_type, nature: a.nature, can_post: a.can_post ? true : false
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(a) {
        try {
            await Account.updateOne({ id: a.id }, {
                $set: {
                    code: a.code, name: a.name, parent_id: a.parent_id || null,
                    account_type: a.account_type, nature: a.nature, can_post: a.can_post ? true : false,
                    is_active: a.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        const hasChildren = await Account.countDocuments({ parent_id: id });
        if (hasChildren > 0) return { success: false, error: 'لا يمكن حذف حساب له فرعية' };
        try {
            await Account.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class ProductsRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Product.find({}).sort({ name: 1 }).lean();
    }

    async getAllSortedBySales() {
        const products = await Product.find({}).lean();
        const invoices = await Invoice.find({ type: 'sales' }).lean();
        const salesMap = {};
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
                }
            }
        }
        const result = products.map(p => ({
            ...p,
            total_sold: salesMap[p.id] || 0
        }));
        result.sort((a, b) => {
            if (b.total_sold !== a.total_sold) {
                return b.total_sold - a.total_sold;
            }
            return a.name.localeCompare(b.name);
        });
        return result;
    }

    async create(p) {
        try {
            const lastDoc = await Product.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/P(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const code = p.code || `P${String(nextNumVal).padStart(4, '0')}`;
            const warehouseStock = parseFloat(p.warehouse_stock) || 0;
            const shopStock = parseFloat(p.shop_stock) || 0;
            const totalStock = warehouseStock + shopStock;
            
            const nextId = await getNextSequenceValue('products');
            await Product.create({
                id: nextId, code, name: p.name, description: p.description, unit: p.unit, category: p.category,
                purchase_price: p.purchase_price || 0, sale_price: p.sale_price || 0, stock_quantity: totalStock,
                min_stock: p.min_stock || 0, image: p.image || null, supplier_id: p.supplier_id !== undefined ? p.supplier_id : null,
                supplier_ids: Array.isArray(p.supplier_ids) ? p.supplier_ids : [],
                warehouse_stock: warehouseStock, shop_stock: shopStock, dozen_price: p.dozen_price || 0,
                dozen_qty: parseFloat(p.dozen_qty) > 0 ? parseFloat(p.dozen_qty) : 1
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(p) {
        try {
            const warehouseStock = parseFloat(p.warehouse_stock) || 0;
            const shopStock = parseFloat(p.shop_stock) || 0;
            const totalStock = warehouseStock + shopStock;
            
            await Product.updateOne({ id: p.id }, {
                $set: {
                    name: p.name, description: p.description, unit: p.unit, category: p.category,
                    purchase_price: p.purchase_price || 0, sale_price: p.sale_price || 0, stock_quantity: totalStock,
                    min_stock: p.min_stock || 0, image: p.image || null, supplier_id: p.supplier_id !== undefined ? p.supplier_id : null,
                    supplier_ids: Array.isArray(p.supplier_ids) ? p.supplier_ids : [],
                    is_active: p.is_active ? true : false, warehouse_stock: warehouseStock, shop_stock: shopStock,
                    dozen_price: p.dozen_price || 0, dozen_qty: parseFloat(p.dozen_qty) > 0 ? parseFloat(p.dozen_qty) : 1
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const numId = parseInt(id, 10);
            await Product.deleteOne({ id: numId });
            await DeletedRecord.create({ entity_type: 'product', entity_id: numId });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async deleteAll() {
        try {
            const products = await Product.find({}, 'id').lean();
            const ids = products.map(p => p.id);
            const count = await Product.countDocuments();
            await Product.deleteMany({});
            for (const id of ids) {
                await DeletedRecord.create({ entity_type: 'product', entity_id: id });
            }
            return { success: true, deleted: count };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getSyncData(lastSyncTime) {
        try {
            let filter = {};
            let deletedFilter = null;
            
            if (lastSyncTime) {
                const lastSync = new Date(lastSyncTime);
                filter = {
                    $or: [
                        { updated_at: { $gt: lastSync } },
                        { created_at: { $gt: lastSync } }
                    ]
                };
                deletedFilter = {
                    entity_type: 'product',
                    deleted_at: { $gt: lastSync }
                };
            }

            // 1. Fetch updated/new products
            const updatedProducts = await Product.find(filter).lean();

            // Calculate total sales for these updated products (for sales-based sorting in POS)
            const productIds = updatedProducts.map(p => p.id);
            const invoices = await Invoice.find({ type: 'sales', 'items.product_id': { $in: productIds } }).lean();
            const salesMap = {};
            for (const inv of invoices) {
                for (const item of inv.items || []) {
                    if (item.product_id && productIds.includes(item.product_id)) {
                        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }
            }

            const changes = updatedProducts.map(p => ({
                ...p,
                _id: p._id ? p._id.toString() : undefined,
                created_at: p.created_at ? p.created_at.toISOString() : undefined,
                updated_at: p.updated_at ? p.updated_at.toISOString() : undefined,
                total_sold: salesMap[p.id] || 0
            }));

            // 2. Fetch deleted product IDs
            let deletedIds = [];
            if (deletedFilter) {
                const deletedRecords = await DeletedRecord.find(deletedFilter).lean();
                deletedIds = deletedRecords.map(r => r.entity_id);
            }

            return {
                success: true,
                changes,
                deleted: deletedIds,
                syncTime: new Date().toISOString(),
                dbSignature: `${mongoose.connection.host}/${mongoose.connection.name}`
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async addWarehouseStock(productId, quantity) {
        try {
            const id = parseInt(productId, 10);
            const qty = parseFloat(quantity) || 0;
            if (!id || qty <= 0) return { success: false, error: 'Invalid product or quantity' };
            await Product.updateOne(
                { id },
                { $inc: { warehouse_stock: qty, stock_quantity: qty } }
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getMovements(productId, startDate, endDate) {
        try {
            const filter = {
                'items.product_id': parseInt(productId, 10)
            };
            if (startDate || endDate) {
                filter.date = {};
                if (startDate) filter.date.$gte = startDate;
                if (endDate) filter.date.$lte = endDate;
            }
            const invoices = await Invoice.find(filter).sort({ date: -1, id: -1 }).lean();
            
            const movements = [];
            for (const inv of invoices) {
                const item = inv.items.find(ii => ii.product_id === parseInt(productId, 10));
                if (item) {
                    let customerName = '';
                    let supplierName = '';
                    if (inv.customer_id) {
                        const c = await Customer.findOne({ id: inv.customer_id }).lean();
                        customerName = c ? c.name : '';
                    }
                    if (inv.supplier_id) {
                        const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                        supplierName = s ? s.name : '';
                    }
                    movements.push({
                        id: inv.id,
                        invoice_id: inv.id,
                        invoice_number: inv.invoice_number,
                        type: inv.type,
                        date: inv.date,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        discount: item.discount,
                        total: item.total,
                        status: inv.status,
                        customer_name: customerName,
                        supplier_name: supplierName
                    });
                }
            }
            return { success: true, movements };
        } catch (e) {
            return { success: false, error: e.message, movements: [] };
        }
    }
}

class InvoicesRepo {
    constructor(db) { this.db = db; }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        if (invoices.length === 0) return [];

        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();
        const products = await Product.find({}).lean();

        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        const productMap = new Map(products.map(p => [p.id, p.name]));

        for (const inv of invoices) {
            if (inv.customer_id) {
                inv.customer_name = customerMap.get(inv.customer_id) || '';
            }
            if (inv.supplier_id) {
                inv.supplier_name = supplierMap.get(inv.supplier_id) || '';
            }
            for (const item of inv.items || []) {
                if (item.product_id) {
                    item.product_name = productMap.get(item.product_id) || '';
                }
            }
        }
        return invoices;
    }

    async getById(id) {
        const invoiceId = parseInt(id, 10);
        const inv = await Invoice.findOne({ id: invoiceId }).lean();
        if (inv) {
            if (inv.customer_id) {
                const c = await Customer.findOne({ id: inv.customer_id }).lean();
                inv.customer_name = c ? c.name : '';
            }
            if (inv.supplier_id) {
                const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                inv.supplier_name = s ? s.name : '';
            }
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
            return inv;
        }
        return null;
    }

    async _createInvoiceJournalEntry(inv, invId, num) {
        const total = parseFloat(inv.total) || 0;
        if (total === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });
        const revenueAccount = await Account.findOne({ code: '41' });
        const costAccount = await Account.findOne({ code: '51' });

        if (inv.type === 'sales') {
            const paid = parseFloat(inv.paid) || 0;
            const remaining = total - paid;
            if (paid > 0) {
                const debitAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (debitAcct) lines.push({ account_id: debitAcct.id, debit: paid, credit: 0, description: `فاتورة مبيعات ${num}` });
            }
            if (remaining > 0) {
                if (customersAccount) lines.push({ account_id: customersAccount.id, debit: remaining, credit: 0, description: `فاتورة مبيعات آجلة ${num}` });
            }
            if (revenueAccount) lines.push({ account_id: revenueAccount.id, debit: 0, credit: total, description: `فاتورة مبيعات ${num}` });
        } else if (inv.type === 'purchase') {
            const paid = parseFloat(inv.paid) || 0;
            const remaining = total - paid;
            if (costAccount) lines.push({ account_id: costAccount.id, debit: total, credit: 0, description: `فاتورة مشتريات ${num}` });
            if (paid > 0) {
                const creditAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: paid, description: `فاتورة مشتريات ${num}` });
            }
            if (remaining > 0) {
                if (suppliersAccount) lines.push({ account_id: suppliersAccount.id, debit: 0, credit: remaining, description: `فاتورة مشتريات آجلة ${num}` });
            }
        }

        if (lines.length < 2) return null;

        const jeMaxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
        let jeMaxNum = 0;
        if (jeMaxNumDoc && jeMaxNumDoc.entry_number) {
            const match = jeMaxNumDoc.entry_number.match(/JE-(\d+)/);
            if (match) jeMaxNum = parseInt(match[1], 10);
        }
        const jeNextNum = jeMaxNum + 1;
        const jeNum = `JE-${String(jeNextNum).padStart(6, '0')}`;
        const jeDesc = inv.type === 'sales' ? `قيد فاتورة مبيعات ${num}` : `قيد فاتورة مشتريات ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');
        
        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: inv.date,
            description: jeDesc,
            reference: num,
            created_by: inv.created_by || null,
            lines: lines
        });

        for (const line of lines) {
            const change = (line.debit || 0) - (line.credit || 0);
            await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
        }

        return jeId;
    }

    async _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        const je = await JournalEntry.findOne({ id: journalEntryId });
        if (je) {
            for (const line of je.lines || []) {
                const change = (line.credit || 0) - (line.debit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }
            await JournalEntry.deleteOne({ id: journalEntryId });
        }
    }

    async create(inv) {
        try {
            const lastDoc = await Invoice.findOne({ type: inv.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.invoice_number) {
                const match = lastDoc.invoice_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = inv.type === 'sales' ? 'SL-' : (inv.type === 'purchase' ? 'PU-' : 'QT-');
            const num = inv.invoice_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            const items = (inv.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount: parseFloat(item.discount) || 0,
                tax: parseFloat(item.tax) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            const nextId = await getNextSequenceValue('invoices');
            await Invoice.create({
                id: nextId, invoice_number: num, type: inv.type, customer_id: inv.customer_id || null,
                supplier_id: inv.supplier_id || null, date: inv.date, due_date: inv.due_date || null,
                subtotal: inv.subtotal || 0, discount: inv.discount || 0, tax: inv.tax || 0,
                total: inv.total || 0, paid: inv.paid || 0, status: inv.status || 'pending',
                payment_method: inv.payment_method || 'cash', payment_account_id: inv.payment_account_id || null,
                notes: inv.notes || null, created_by: inv.created_by || null, image: inv.image || null,
                manual_discount: inv.manual_discount || 0, coupon_code: inv.coupon_code || null,
                items
            });

            if (inv.type !== 'quotation') {
                for (const item of items) {
                    if (item.product_id) {
                        if (inv.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        } else if (inv.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        }
                    }
                }

                const remaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                if (remaining > 0) {
                    if (inv.type === 'sales' && inv.customer_id) {
                        await Customer.updateOne({ id: inv.customer_id }, { $inc: { balance: remaining } });
                    } else if (inv.type === 'purchase' && inv.supplier_id) {
                        await Supplier.updateOne({ id: inv.supplier_id }, { $inc: { balance: remaining } });
                    }
                }

                const jeId = await this._createInvoiceJournalEntry(inv, nextId, num);
                if (jeId) {
                    await Invoice.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
                }
            }

            return { success: true, id: nextId, invoice_number: num };
        } catch (err) {
            console.error('Invoice creation error:', err);
            return { success: false, error: err.message || String(err) };
        }
    }

    async update(inv) {
        const invId = parseInt(inv.id, 10);
        try {
            const oldInvoice = await this.getById(invId);
            if (!oldInvoice) return { success: false, error: 'Invoice not found' };

            if (oldInvoice.type !== 'quotation') {
                for (const oldItem of oldInvoice.items || []) {
                    if (oldItem.product_id) {
                        if (oldInvoice.type === 'sales') {
                            await Product.updateOne({ id: oldItem.product_id }, {
                                $inc: { shop_stock: oldItem.quantity, stock_quantity: oldItem.quantity }
                            });
                        } else if (oldInvoice.type === 'purchase') {
                            await Product.updateOne({ id: oldItem.product_id }, {
                                $inc: { shop_stock: -oldItem.quantity, stock_quantity: -oldItem.quantity }
                            });
                        }
                    }
                }

                const oldRemaining = (oldInvoice.total || 0) - (oldInvoice.paid || 0);
                if (oldRemaining > 0) {
                    if (oldInvoice.type === 'sales' && oldInvoice.customer_id) {
                        await Customer.updateOne({ id: oldInvoice.customer_id }, { $inc: { balance: -oldRemaining } });
                    } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
                        await Supplier.updateOne({ id: oldInvoice.supplier_id }, { $inc: { balance: -oldRemaining } });
                    }
                }

                if (oldInvoice.journal_entry_id) {
                    await this._deleteJournalEntry(oldInvoice.journal_entry_id);
                }
            }

            const items = (inv.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount: parseFloat(item.discount) || 0,
                tax: parseFloat(item.tax) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            await Invoice.updateOne({ id: invId }, {
                $set: {
                    customer_id: inv.customer_id || null, supplier_id: inv.supplier_id || null, date: inv.date,
                    due_date: inv.due_date || null, subtotal: inv.subtotal || 0, discount: inv.discount || 0,
                    tax: inv.tax || 0, total: inv.total || 0, paid: inv.paid || 0, status: inv.status || 'pending',
                    payment_method: inv.payment_method || 'cash', notes: inv.notes || null, image: inv.image || null,
                    manual_discount: inv.manual_discount || 0, coupon_code: inv.coupon_code || null,
                    items
                }
            });

            if (oldInvoice.type !== 'quotation') {
                for (const item of items) {
                    if (item.product_id) {
                        if (oldInvoice.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        } else if (oldInvoice.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        }
                    }
                }

                const newRemaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                if (newRemaining > 0) {
                    if (oldInvoice.type === 'sales' && inv.customer_id) {
                        await Customer.updateOne({ id: inv.customer_id }, { $inc: { balance: newRemaining } });
                    } else if (oldInvoice.type === 'purchase' && inv.supplier_id) {
                        await Supplier.updateOne({ id: inv.supplier_id }, { $inc: { balance: newRemaining } });
                    }
                }

                const jeId = await this._createInvoiceJournalEntry({ ...inv, type: oldInvoice.type }, invId, oldInvoice.invoice_number);
                if (jeId) {
                    await Invoice.updateOne({ id: invId }, { $set: { journal_entry_id: jeId } });
                }
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const invoice = await this.getById(id);
            if (!invoice) return { success: false, error: 'Invoice not found' };

            if (invoice.type !== 'quotation') {
                for (const item of invoice.items || []) {
                    if (item.product_id) {
                        if (invoice.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        } else if (invoice.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        }
                    }
                }
            }

            if (invoice.type !== 'quotation') {
                const remaining = (invoice.total || 0) - (invoice.paid || 0);
                if (remaining > 0) {
                    if (invoice.type === 'sales' && invoice.customer_id) {
                        await Customer.updateOne({ id: invoice.customer_id }, { $inc: { balance: -remaining } });
                    } else if (invoice.type === 'purchase' && invoice.supplier_id) {
                        await Supplier.updateOne({ id: invoice.supplier_id }, { $inc: { balance: -remaining } });
                    }
                }
            }

            if (invoice.type !== 'quotation' && invoice.journal_entry_id) {
                await this._deleteJournalEntry(invoice.journal_entry_id);
            }

            await Invoice.deleteOne({ id });
            return { success: true };
        } catch (e) {
            console.error('Invoice deletion error:', e);
            return { success: false, error: e.message };
        }
    }

    async getPendingByCustomer(customerId) {
        return await Invoice.find({ customer_id: customerId, status: 'pending' }).sort({ date: -1 }).lean();
    }

    async getPendingBySupplier(supplierId) {
        return await Invoice.find({ supplier_id: supplierId, status: 'pending' }).sort({ date: -1 }).lean();
    }

    async updateStatus(id, status) {
        try {
            await Invoice.updateOne({ id }, { $set: { status } });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getByCustomer(customerId) {
        const invoices = await Invoice.find({ customer_id: customerId }).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
        }
        return invoices;
    }

    async getBySupplier(supplierId) {
        const invoices = await Invoice.find({ supplier_id: supplierId }).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
        }
        return invoices;
    }
}

class VouchersRepo {
    constructor(db) { this.db = db; }

    async recalculateInvoicePaid(invoiceId) {
        if (!invoiceId) return;
        const inv = await Invoice.findOne({ id: invoiceId });
        if (!inv) return;

        const vouchers = await Voucher.find({ invoice_id: invoiceId }).sort({ date: 1, id: 1 });
        let remainingBalance = inv.total || 0;
        let totalPaid = 0;

        for (const v of vouchers) {
            const canApply = Math.min(v.amount, remainingBalance);
            if (v.applied_amount !== canApply) {
                await Voucher.updateOne({ id: v.id }, { $set: { applied_amount: canApply } });
            }
            remainingBalance -= canApply;
            totalPaid += canApply;
        }

        const newStatus = totalPaid >= inv.total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
        await Invoice.updateOne({ id: invoiceId }, { $set: { paid: totalPaid, status: newStatus } });
    }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const vouchers = await Voucher.find(filter).sort({ date: -1 }).lean();
        if (vouchers.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();

        const accountMap = new Map(accounts.map(a => [a.id, a.name]));
        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

        for (const v of vouchers) {
            if (v.account_id) {
                v.account_name = accountMap.get(v.account_id) || '';
            }
            if (v.customer_id) {
                v.customer_name = customerMap.get(v.customer_id) || '';
            }
            if (v.supplier_id) {
                v.supplier_name = supplierMap.get(v.supplier_id) || '';
            }
        }
        return vouchers;
    }

    async getById(id) {
        const v = await Voucher.findOne({ id }).lean();
        if (v) {
            if (v.account_id) {
                const a = await Account.findOne({ id: v.account_id }).lean();
                v.account_name = a ? a.name : '';
            }
            if (v.customer_id) {
                const c = await Customer.findOne({ id: v.customer_id }).lean();
                v.customer_name = c ? c.name : '';
            }
            if (v.supplier_id) {
                const s = await Supplier.findOne({ id: v.supplier_id }).lean();
                v.supplier_name = s ? s.name : '';
            }
        }
        return v;
    }

    async _createVoucherJournalEntry(v, voucherId, num) {
        const amount = parseFloat(v.amount) || 0;
        if (amount === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });

        const paymentMethod = v.payment_method || 'cash';
        const cashBankAcct = (paymentMethod === 'bank' && bankAccount) ? bankAccount : cashAccount;

        if (v.type === 'receipt') {
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: amount, credit: 0, description: `سند قبض ${num}` });
            const creditAcct = v.supplier_id ? suppliersAccount : customersAccount;
            if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: amount, description: `سند قبض ${num}` });
        } else if (v.type === 'payment') {
            const debitAcct = v.customer_id ? customersAccount : suppliersAccount;
            if (debitAcct) lines.push({ account_id: debitAcct.id, debit: amount, credit: 0, description: `سند صرف ${num}` });
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: 0, credit: amount, description: `سند صرف ${num}` });
        }

        if (lines.length < 2) return null;

        const jeMaxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
        let jeMaxNum = 0;
        if (jeMaxNumDoc && jeMaxNumDoc.entry_number) {
            const match = jeMaxNumDoc.entry_number.match(/JE-(\d+)/);
            if (match) jeMaxNum = parseInt(match[1], 10);
        }
        const jeNextNum = jeMaxNum + 1;
        const jeNum = `JE-${String(jeNextNum).padStart(6, '0')}`;
        const jeDesc = v.type === 'receipt' ? `قيد سند قبض ${num}` : `قيد سند صرف ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');

        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: v.date,
            description: jeDesc,
            reference: num,
            created_by: v.created_by || null,
            lines: lines
        });

        for (const line of lines) {
            const change = (line.debit || 0) - (line.credit || 0);
            await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
        }

        return jeId;
    }

    async _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        const je = await JournalEntry.findOne({ id: journalEntryId });
        if (je) {
            for (const line of je.lines || []) {
                const change = (line.credit || 0) - (line.debit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }
            await JournalEntry.deleteOne({ id: journalEntryId });
        }
    }

    async create(v) {
        try {
            const lastDoc = await Voucher.findOne({ type: v.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.voucher_number) {
                const match = lastDoc.voucher_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = v.type === 'receipt' ? 'RV-' : 'PV-';
            const num = v.voucher_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            let appliedAmount = 0;
            if (v.invoice_id) {
                const inv = await Invoice.findOne({ id: v.invoice_id });
                if (inv) {
                    const invoiceRemaining = (inv.total || 0) - (inv.paid || 0);
                    appliedAmount = Math.min(parseFloat(v.amount) || 0, invoiceRemaining);
                } else {
                    appliedAmount = parseFloat(v.amount) || 0;
                }
            }

            const nextId = await getNextSequenceValue('vouchers');
            await Voucher.create({
                id: nextId, voucher_number: num, type: v.type, date: v.date, amount: v.amount || 0,
                applied_amount: appliedAmount, account_id: v.account_id || null, customer_id: v.customer_id || null,
                supplier_id: v.supplier_id || null, payment_method: v.payment_method || 'cash',
                invoice_id: v.invoice_id || null, reference: v.reference || null,
                description: v.description || null, created_by: v.created_by || null
            });

            if (v.type === 'receipt') {
                if (v.customer_id) await Customer.updateOne({ id: v.customer_id }, { $inc: { balance: -v.amount } });
                else if (v.supplier_id) await Supplier.updateOne({ id: v.supplier_id }, { $inc: { balance: v.amount } });
            } else if (v.type === 'payment') {
                if (v.supplier_id) await Supplier.updateOne({ id: v.supplier_id }, { $inc: { balance: -v.amount } });
                else if (v.customer_id) await Customer.updateOne({ id: v.customer_id }, { $inc: { balance: v.amount } });
            }

            if (v.invoice_id) {
                await this.recalculateInvoicePaid(v.invoice_id);
            }

            const jeId = await this._createVoucherJournalEntry(v, nextId, num);
            if (jeId) {
                await Voucher.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
            }

            if (v.invoice_id && v.type === 'receipt') {
                const invAfter = await Invoice.findOne({ id: v.invoice_id });
                if (invAfter && invAfter.paid >= invAfter.total) {
                    const linkedPlan = await InstallmentPlan.findOne({ invoice_id: v.invoice_id, status: { $ne: 'completed' } });
                    if (linkedPlan) {
                        await InstallmentPayment.updateMany({ plan_id: linkedPlan.id, status: 'pending' }, {
                            $set: { status: 'paid', paid_date: v.date, payment_method: v.payment_method || 'cash', notes: 'مدفوع عبر سند قبض ' + num }
                        });
                        await InstallmentPlan.updateOne({ id: linkedPlan.id }, { $set: { status: 'completed' } });
                    }
                }
            }

            return { success: true, id: nextId, voucher_number: num };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(v) {
        try {
            const old = await this.getById(v.id);
            if (!old) return { success: false, error: 'Voucher not found' };

            // 1. Reverse old customer/supplier balance
            if (old.type === 'receipt') {
                if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: old.amount } });
                else if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: -old.amount } });
            } else if (old.type === 'payment') {
                if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: old.amount } });
                else if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: -old.amount } });
            }

            // 2. Delete old journal entry
            if (old.journal_entry_id) {
                await this._deleteJournalEntry(old.journal_entry_id);
            }

            // 3. Update voucher
            await Voucher.updateOne({ id: v.id }, {
                $set: {
                    date: v.date, amount: v.amount || 0, applied_amount: 0,
                    payment_method: v.payment_method || 'cash', reference: v.reference,
                    description: v.description, journal_entry_id: null
                }
            });

            // 4. Apply new customer/supplier balance
            const amount = parseFloat(v.amount) || 0;
            if (old.type === 'receipt') {
                if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: -amount } });
                else if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: amount } });
            } else if (old.type === 'payment') {
                if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: -amount } });
                else if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: amount } });
            }

            // 5. Recalculate invoice paid status and voucher applied amounts
            if (old.invoice_id) {
                await this.recalculateInvoicePaid(old.invoice_id);
            }

            // 8. Create new journal entry
            const newVoucher = { ...old, amount, payment_method: v.payment_method || 'cash', date: v.date };
            const jeId = await this._createVoucherJournalEntry(newVoucher, v.id, old.voucher_number);
            if (jeId) {
                await Voucher.updateOne({ id: v.id }, { $set: { journal_entry_id: jeId } });
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const voucher = await this.getById(id);
            if (voucher) {
                if (voucher.type === 'receipt') {
                    if (voucher.customer_id) await Customer.updateOne({ id: voucher.customer_id }, { $inc: { balance: voucher.amount } });
                    else if (voucher.supplier_id) await Supplier.updateOne({ id: voucher.supplier_id }, { $inc: { balance: -voucher.amount } });
                } else if (voucher.type === 'payment') {
                    if (voucher.supplier_id) await Supplier.updateOne({ id: voucher.supplier_id }, { $inc: { balance: voucher.amount } });
                    else if (voucher.customer_id) await Customer.updateOne({ id: voucher.customer_id }, { $inc: { balance: -voucher.amount } });
                }

                if (voucher.journal_entry_id) {
                    await this._deleteJournalEntry(voucher.journal_entry_id);
                }

                // Delete first, so recalculateInvoicePaid doesn't count it
                await Voucher.deleteOne({ id });

                if (voucher.invoice_id) {
                    await this.recalculateInvoicePaid(voucher.invoice_id);
                }
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class JournalRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        const entries = await JournalEntry.find({}).sort({ date: -1 }).lean();
        if (entries.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const accountMap = new Map(accounts.map(a => [a.id, a]));

        for (const e of entries) {
            for (const line of e.lines || []) {
                const a = accountMap.get(line.account_id);
                line.account_name = a ? a.name : '';
                line.account_code = a ? a.code : '';
            }
        }
        return entries;
    }

    async create(e) {
        try {
            const maxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxNumVal = 0;
            if (maxNumDoc && maxNumDoc.entry_number) {
                const match = maxNumDoc.entry_number.match(/JE-(\d+)/);
                if (match) maxNumVal = parseInt(match[1], 10);
            }
            const nextNum = maxNumVal + 1;
            const num = e.entry_number || `JE-${String(nextNum).padStart(6, '0')}`;
            
            const nextId = await getNextSequenceValue('journal_entries');
            await JournalEntry.create({
                id: nextId,
                entry_number: num,
                date: e.date,
                description: e.description || null,
                reference: e.reference || null,
                created_by: e.created_by || null,
                lines: (e.lines || []).map(line => ({
                    account_id: line.account_id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    description: line.description || ''
                }))
            });

            for (const line of e.lines || []) {
                const change = (line.debit || 0) - (line.credit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }

            return { success: true, id: nextId, entry_number: num };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async delete(id) {
        try {
            const je = await JournalEntry.findOne({ id });
            if (je) {
                for (const line of je.lines || []) {
                    const change = (line.credit || 0) - (line.debit || 0);
                    await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
                }
                await JournalEntry.deleteOne({ id });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class ReportsRepo {
    constructor(db) { this.db = db; }
    
    async accountStatement(accountId, startDate, endDate) {
        const account = await Account.findOne({ id: accountId }).lean();
        const filter = { 'lines.account_id': parseInt(accountId, 10) };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const entries = await JournalEntry.find(filter).sort({ date: 1, id: 1 }).lean();
        
        const transactions = [];
        for (const je of entries) {
            for (const line of je.lines || []) {
                if (line.account_id === parseInt(accountId, 10)) {
                    transactions.push({
                        id: line._id ? line._id.toString() : String(Math.random()),
                        date: je.date,
                        entry_number: je.entry_number,
                        description: line.description,
                        debit: line.debit,
                        credit: line.credit
                    });
                }
            }
        }

        let balance = 0;
        const statement = transactions.map(t => {
            balance += (t.debit || 0) - (t.credit || 0);
            return { ...t, balance };
        });

        return { account, statement, opening_balance: 0, closing_balance: balance };
    }

    async trialBalance(date) {
        const accounts = await Account.find({}).sort({ code: 1 }).lean();
        const filter = date ? { date: { $lte: date } } : {};
        const entries = await JournalEntry.find(filter).lean();

        const debitMap = {};
        const creditMap = {};
        for (const je of entries) {
            for (const line of je.lines || []) {
                debitMap[line.account_id] = (debitMap[line.account_id] || 0) + (line.debit || 0);
                creditMap[line.account_id] = (creditMap[line.account_id] || 0) + (line.credit || 0);
            }
        }

        const result = accounts.map(a => {
            const total_debit = debitMap[a.id] || 0;
            const total_credit = creditMap[a.id] || 0;
            const netBalance = total_debit - total_credit;
            
            let debit_balance = 0;
            let credit_balance = 0;
            if (a.nature === 'debit') {
                if (netBalance >= 0) debit_balance = netBalance;
                else credit_balance = Math.abs(netBalance);
            } else {
                if (netBalance <= 0) credit_balance = Math.abs(netBalance);
                else debit_balance = netBalance;
            }
            return { ...a, total_debit, total_credit, balance: netBalance, debit_balance, credit_balance };
        });

        const totals = {
            debit: result.reduce((s, a) => s + a.debit_balance, 0),
            credit: result.reduce((s, a) => s + a.credit_balance, 0)
        };

        return { accounts: result, totals };
    }

    async salesReport(startDate, endDate) {
        const filter = { type: 'sales' };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            if (inv.customer_id) {
                const c = await Customer.findOne({ id: inv.customer_id }).lean();
                inv.customer_name = c ? c.name : '';
            }
        }
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }

    async purchasesReport(startDate, endDate) {
        const filter = { type: 'purchase' };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            if (inv.supplier_id) {
                const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                inv.supplier_name = s ? s.name : '';
            }
        }
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }

    async profitLoss(startDate, endDate) {
        // 1. Total Sales
        const salesFilter = { type: 'sales' };
        if (startDate || endDate) {
            salesFilter.date = {};
            if (startDate) salesFilter.date.$gte = startDate;
            if (endDate) salesFilter.date.$lte = endDate;
        }
        const salesInvoices = await Invoice.find(salesFilter).lean();
        const totalSalesAmt = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);

        // 2. Total Purchases
        const purchasesFilter = { type: 'purchase' };
        if (startDate || endDate) {
            purchasesFilter.date = {};
            if (startDate) purchasesFilter.date.$gte = startDate;
            if (endDate) purchasesFilter.date.$lte = endDate;
        }
        const purchaseInvoices = await Invoice.find(purchasesFilter).lean();
        const totalPurchasesAmt = purchaseInvoices.reduce((s, i) => s + (i.total || 0), 0);

        // 3. Expenses
        const totalExpensesAmt = await this.db.expenses.getTotal(startDate, endDate);

        // 4. Ending Inventory value
        const activeProducts = await Product.find({ is_active: true }).lean();
        const endingInventory = activeProducts.reduce((s, p) => s + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
        const beginningInventory = 0;
        
        const cogs = totalPurchasesAmt + beginningInventory - endingInventory;
        const grossProfit = totalSalesAmt - cogs;
        const rightSide = totalPurchasesAmt + beginningInventory + totalExpensesAmt;
        const leftSide = totalSalesAmt + endingInventory;
        const netProfit = leftSide - rightSide;

        const lowStock = activeProducts.filter(p => (p.stock_quantity || 0) <= 5);

        // 5. Chart data
        const chartFilter = {};
        if (startDate || endDate) {
            chartFilter.date = {};
            if (startDate) chartFilter.date.$gte = startDate;
            if (endDate) chartFilter.date.$lte = endDate;
        }
        const allInvoices = await Invoice.find(chartFilter).lean();
        const byMonth = {};
        for (const inv of allInvoices) {
            if (!inv.date) continue;
            const month = inv.date.substring(0, 7);
            byMonth[month] = byMonth[month] || { month, label: '', sales: 0, purchases: 0, profit: 0 };
            if (inv.type === 'sales') byMonth[month].sales += (inv.total || 0);
            else if (inv.type === 'purchase') byMonth[month].purchases += (inv.total || 0);
        }

        const MONTHS_AR = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const chartData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(r => {
            const parts = r.month.split('-');
            const m = parts[1] ? parseInt(parts[1], 10) : 1;
            return {
                ...r,
                label: MONTHS_AR[m - 1] || r.month,
                profit: r.sales - r.purchases
            };
        });

        // 6. Cash and Bank Balances
        const allAccounts = await Account.find({}).lean();
        const cashAccounts = allAccounts.filter(a => a.code === '111' || a.code?.startsWith('111.'));
        const bankAccounts = allAccounts.filter(a => a.code === '112' || a.code?.startsWith('112.'));
        const cashBalance = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const bankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const cashBankBalance = cashBalance + bankBalance;

        return {
            totalSales: totalSalesAmt,
            totalPurchases: totalPurchasesAmt,
            totalExpenses: totalExpensesAmt,
            cogs,
            grossProfit,
            profit: netProfit,
            chartData,
            products: activeProducts,
            endingInventory,
            beginningInventory,
            lowStock,
            cashBankBalance,
            cashBalance,
            bankBalance,
            leftSide,
            rightSide
        };
    }

    async detailedInventory(startDate, endDate) {
        const activeProducts = await Product.find({ is_active: true }).lean();
        const invoices = await Invoice.find({ type: { $in: ['sales', 'purchase'] } }).lean();

        const qtySoldMap = {};
        const qtyPurchasedMap = {};
        for (const inv of invoices) {
            const inDateRange = (!startDate || inv.date >= startDate) && (!endDate || inv.date <= endDate);
            if (!inDateRange) continue;
            
            for (const item of inv.items || []) {
                if (item.product_id) {
                    if (inv.type === 'sales') {
                        qtySoldMap[item.product_id] = (qtySoldMap[item.product_id] || 0) + (item.quantity || 0);
                    } else if (inv.type === 'purchase') {
                        qtyPurchasedMap[item.product_id] = (qtyPurchasedMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }
            }
        }

        const productsData = activeProducts.map(p => {
            const qtySold = qtySoldMap[p.id] || 0;
            const qtyPurchased = qtyPurchasedMap[p.id] || 0;
            const purchasePrice = parseFloat(p.purchase_price) || 0;
            const stockQty = parseFloat(p.stock_quantity) || 0;
            const cogs = qtySold * purchasePrice;
            const stockValue = stockQty * purchasePrice;
            return {
                ...p,
                qtySold,
                qtyPurchased,
                cogs,
                stockValue,
                status: stockQty <= 0 ? 'out' : stockQty <= 5 ? 'low' : 'safe'
            };
        });

        const totalValue = productsData.reduce((sum, p) => sum + p.stockValue, 0);
        const totalCogs = productsData.reduce((sum, p) => sum + p.cogs, 0);
        const totalQtySold = productsData.reduce((sum, p) => sum + p.qtySold, 0);
        const totalQtyPurchased = productsData.reduce((sum, p) => sum + p.qtyPurchased, 0);

        return {
            products: productsData,
            totalValue,
            totalCogs,
            totalQtySold,
            totalQtyPurchased
        };
    }
}

class SettingsRepo {
    constructor(db) { this.db = db; }
    
    async get(key) {
        const s = await Setting.findOne({ key }).lean();
        return s ? s.value : null;
    }

    async getAll() {
        const settings = await Setting.find({}).lean();
        const result = {};
        for (const s of settings) {
            if (!result[s.category]) result[s.category] = {};
            result[s.category][s.key] = s.value;
        }
        return result;
    }

    async set(category, key, value) {
        try {
            await Setting.updateOne({ key }, { $set: { value, category } }, { upsert: true });
            return { success: true };
        } catch (e) {
            console.error('Settings save error:', e);
            return { success: false, error: e.message };
        }
    }
}

class PermissionsRepo {
    constructor(db) { this.db = db; }

    async getByRole(role) {
        const perms = await Permission.find({ role }).lean();
        const result = {};
        for (const p of perms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return result;
    }

    async savePermissions(role, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                await Permission.updateOne({ role, module }, {
                    $set: {
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    }
                }, { upsert: true });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getUserPermissions(userId) {
        const userPerms = await UserPermission.find({ user_id: userId }).lean();
        if (userPerms.length === 0) {
            return { hasIndividual: false, permissions: {} };
        }
        const result = {};
        for (const p of userPerms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return { hasIndividual: true, permissions: result };
    }

    async saveUserPermissions(userId, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                await UserPermission.updateOne({ user_id: userId, module }, {
                    $set: {
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    }
                }, { upsert: true });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async clearUserPermissions(userId) {
        try {
            await UserPermission.deleteMany({ user_id: userId });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class EmployeesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const employees = await Employee.find({}).sort({ name: 1 }).lean();
        for (const e of employees) {
            if (e.account_id) {
                const a = await Account.findOne({ id: e.account_id }).lean();
                e.account_name = a ? a.name : '';
                e.account_code = a ? a.code : '';
            }
        }
        return employees;
    }

    async getById(id) {
        const e = await Employee.findOne({ id }).lean();
        if (e && e.account_id) {
            const a = await Account.findOne({ id: e.account_id }).lean();
            e.account_name = a ? a.name : '';
            e.account_code = a ? a.code : '';
        }
        return e;
    }

    async create(emp) {
        try {
            const lastDoc = await Employee.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/EMP(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            let empNum = nextNumVal;
            let code = emp.code;
            if (!code) {
                do {
                    code = `EMP${String(empNum).padStart(4, '0')}`;
                    const exists = await Employee.findOne({ code });
                    if (!exists) break;
                    empNum++;
                } while (true);
            }

            let mainSalary = await Account.findOne({ code: '52' });
            if (!mainSalary) {
                const expParent = await Account.findOne({ code: '5' });
                const nextId = await getNextSequenceValue('accounts');
                await Account.create({
                    id: nextId, code: '52', name: 'مصروفات الرواتب', parent_id: expParent ? expParent.id : null,
                    account_type: 'expense', nature: 'debit', can_post: false
                });
                mainSalary = await Account.findOne({ code: '52' });
            }

            let salaryParent = await Account.findOne({ code: '521' });
            if (!salaryParent) {
                const nextId = await getNextSequenceValue('accounts');
                await Account.create({
                    id: nextId, code: '521', name: 'رواتب الموظفين', parent_id: mainSalary ? mainSalary.id : null,
                    account_type: 'expense', nature: 'debit', can_post: false
                });
                salaryParent = await Account.findOne({ code: '521' });
            }

            let suffix = empNum;
            let empAccountCode;
            do {
                empAccountCode = `521${String(suffix).padStart(4, '0')}`;
                const exists = await Account.findOne({ code: empAccountCode });
                if (!exists) break;
                suffix++;
            } while (suffix < empNum + 500);

            const empAccountName = `راتب ${emp.name}`;
            const nextAccId = await getNextSequenceValue('accounts');
            await Account.create({
                id: nextAccId, code: empAccountCode, name: empAccountName,
                parent_id: salaryParent ? salaryParent.id : null,
                account_type: 'expense', nature: 'debit', can_post: true
            });

            const nextId = await getNextSequenceValue('employees');
            await Employee.create({
                id: nextId, code, name: emp.name, job_title: emp.job_title || '',
                department: emp.department || '', hire_date: emp.hire_date || '',
                base_salary: emp.base_salary || 0, phone: emp.phone || '', email: emp.email || '',
                national_id: emp.national_id || '', address: emp.address || '',
                account_id: nextAccId, bank_account: emp.bank_account || '', notes: emp.notes || ''
            });

            return { success: true, id: nextId, account_id: nextAccId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(emp) {
        try {
            await Employee.updateOne({ id: emp.id }, {
                $set: {
                    name: emp.name, job_title: emp.job_title || '', department: emp.department || '',
                    hire_date: emp.hire_date || '', base_salary: emp.base_salary || 0, phone: emp.phone || '',
                    email: emp.email || '', national_id: emp.national_id || '', address: emp.address || '',
                    bank_account: emp.bank_account || '', notes: emp.notes || '', is_active: emp.is_active ? true : false
                }
            });
            if (emp.account_id) {
                await Account.updateOne({ id: emp.account_id }, { $set: { name: `راتب ${emp.name}` } });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const emp = await this.getById(id);
            if (!emp) return { success: false, error: 'الموظف غير موجود' };
            const salariesCount = await SalaryPayment.countDocuments({ employee_id: id });
            if (salariesCount > 0) return { success: false, error: 'لا يمكن حذف موظف لديه مدفوعات رواتب' };
            await Employee.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getSummary(id) {
        const emp = await this.getById(id);
        if (!emp) return null;
        const leaves = await EmployeeLeave.find({ employee_id: id }).sort({ start_date: -1 }).lean();
        const deductions = await EmployeeDeduction.find({ employee_id: id }).sort({ created_at: -1 }).lean();
        const salaries = await SalaryPayment.find({ employee_id: id }).sort({ month: -1 }).lean();
        return { employee: emp, leaves, deductions, salaries };
    }
}

class SalaryRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const payments = await SalaryPayment.find({}).sort({ created_at: -1 }).lean();
        for (const sp of payments) {
            const e = await Employee.findOne({ id: sp.employee_id }).lean();
            sp.employee_name = e ? e.name : '';
            sp.job_title = e ? e.job_title : '';
            sp.department = e ? e.department : '';
            
            if (sp.journal_entry_id) {
                const je = await JournalEntry.findOne({ id: sp.journal_entry_id }).lean();
                sp.payment_date = je ? je.date : '';
            }
            if (sp.payment_account_id) {
                const a = await Account.findOne({ id: sp.payment_account_id }).lean();
                sp.payment_account_name = a ? a.name : '';
            }
        }
        return payments;
    }

    async getByEmployee(employeeId) {
        return await SalaryPayment.find({ employee_id: employeeId }).sort({ month: -1 }).lean();
    }

    async pay(payment) {
        try {
            const lastDoc = await SalaryPayment.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.payment_number) {
                const match = lastDoc.payment_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const payNum = `SAL-${String(nextNumVal).padStart(6, '0')}`;

            const emp = await Employee.findOne({ id: payment.employee_id });
            if (!emp) return { success: false, error: 'الموظف غير موجود' };

            const existing = await SalaryPayment.findOne({ employee_id: payment.employee_id, month: payment.month });
            if (existing) return { success: false, error: 'تم صرف راتب هذا الشهر مسبقاً' };

            const monthDeductions = await EmployeeDeduction.aggregate([
                { $match: { employee_id: parseInt(payment.employee_id, 10), month: payment.month } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalDeductions = payment.deductions !== undefined ? parseFloat(payment.deductions) : (monthDeductions[0]?.total || 0);
            const baseSalary = payment.base_salary !== undefined ? parseFloat(payment.base_salary) : (emp.base_salary || 0);
            const netSalary = baseSalary - totalDeductions;

            const cashAccount = await Account.findOne({ code: '111' });
            const bankAccount = await Account.findOne({ code: '112' });
            let paymentAccountId = payment.payment_account_id ? parseInt(payment.payment_account_id, 10) : null;
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            const empAccount = emp.account_id;

            const maxJe = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxJeVal = 0;
            if (maxJe && maxJe.entry_number) {
                const match = maxJe.entry_number.match(/JE-(\d+)/);
                if (match) maxJeVal = parseInt(match[1], 10);
            }
            const jeNum = `JE-${String(maxJeVal + 1).padStart(6, '0')}`;
            const paymentDate = payment.date || new Date().toISOString().split('T')[0];
            const jeDesc = `قيد راتب ${emp.name} - ${payment.month}`;
            const jeId = await getNextSequenceValue('journal_entries');

            const lines = [];
            if (empAccount) {
                lines.push({ account_id: empAccount, debit: netSalary, credit: 0, description: `راتب ${emp.name} - ${payment.month}` });
            }
            if (paymentAccountId) {
                lines.push({ account_id: paymentAccountId, debit: 0, credit: netSalary, description: `صرف راتب ${emp.name} - ${payment.month}` });
            }

            await JournalEntry.create({
                id: jeId, entry_number: jeNum, date: paymentDate, description: jeDesc, reference: payNum,
                created_by: payment.created_by || null, lines
            });

            if (empAccount) await Account.updateOne({ id: empAccount }, { $inc: { balance: netSalary } });
            if (paymentAccountId) await Account.updateOne({ id: paymentAccountId }, { $inc: { balance: -netSalary } });

            const nextId = await getNextSequenceValue('salary_payments');
            await SalaryPayment.create({
                id: nextId, payment_number: payNum, employee_id: payment.employee_id, month: payment.month,
                base_salary: baseSalary, deductions: totalDeductions, net_salary: netSalary,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, notes: payment.notes || null, created_by: payment.created_by || null
            });

            await Expense.create({
                id: await getNextSequenceValue('expenses'), payment_number: payNum, category: 'salary',
                date: paymentDate, amount: netSalary, description: `راتب ${emp.name} - ${payment.month}`,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, source_type: 'salary', source_id: nextId, notes: payment.notes || null,
                created_by: payment.created_by || null
            });

            return { success: true, id: nextId, payment_number: payNum, net_salary: netSalary };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getTotal(startDate, endDate) {
        try {
            const filter = {};
            if (startDate || endDate) {
                filter.created_at = {};
                if (startDate) filter.created_at.$gte = new Date(startDate);
                if (endDate) filter.created_at.$lte = new Date(endDate + 'T23:59:59.999Z');
            }
            const payments = await SalaryPayment.find(filter).lean();
            return payments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
        } catch (e) {
            return 0;
        }
    }

    async delete(id) {
        try {
            const payment = await SalaryPayment.findOne({ id });
            if (!payment) return { success: false, error: 'السجل غير موجود' };

            if (payment.journal_entry_id) {
                const je = await JournalEntry.findOne({ id: payment.journal_entry_id });
                if (je) {
                    for (const line of je.lines || []) {
                        const change = (line.credit || 0) - (line.debit || 0);
                        await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
                    }
                    await JournalEntry.deleteOne({ id: payment.journal_entry_id });
                }
            }

            await Expense.deleteOne({ source_type: 'salary', source_id: id });
            await SalaryPayment.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class LeavesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const leaves = await EmployeeLeave.find({}).sort({ start_date: -1 }).lean();
        for (const el of leaves) {
            const e = await Employee.findOne({ id: el.employee_id }).lean();
            el.employee_name = e ? e.name : '';
            el.department = e ? e.department : '';
        }
        return leaves;
    }

    async getByEmployee(employeeId) {
        return await EmployeeLeave.find({ employee_id: employeeId }).sort({ start_date: -1 }).lean();
    }

    async create(leave) {
        try {
            const nextId = await getNextSequenceValue('employee_leaves');
            await EmployeeLeave.create({
                id: nextId, employee_id: leave.employee_id, leave_type: leave.leave_type,
                start_date: leave.start_date, end_date: leave.end_date, days: leave.days || 1,
                reason: leave.reason || '', status: leave.status || 'pending', notes: leave.notes || ''
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async updateStatus(id, status, approvedBy) {
        try {
            await EmployeeLeave.updateOne(
                { id },
                { $set: { status, approved_by: approvedBy || null } }
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await EmployeeLeave.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class DeductionsRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const deductions = await EmployeeDeduction.find({}).sort({ created_at: -1 }).lean();
        for (const ed of deductions) {
            const e = await Employee.findOne({ id: ed.employee_id }).lean();
            ed.employee_name = e ? e.name : '';
            ed.department = e ? e.department : '';
        }
        return deductions;
    }

    async getByEmployee(employeeId) {
        return await EmployeeDeduction.find({ employee_id: employeeId }).sort({ created_at: -1 }).lean();
    }

    async create(deduction) {
        try {
            const nextId = await getNextSequenceValue('employee_deductions');
            await EmployeeDeduction.create({
                id: nextId, employee_id: deduction.employee_id, month: deduction.month,
                amount: deduction.amount, reason: deduction.reason || ''
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await EmployeeDeduction.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class ExpensesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const expenses = await Expense.find({}).sort({ date: -1, created_at: -1 }).lean();
        if (expenses.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const accountMap = new Map(accounts.map(a => [a.id, a.name]));

        for (const ex of expenses) {
            if (ex.payment_account_id) {
                ex.payment_account_name = accountMap.get(ex.payment_account_id) || '';
            }
        }
        return expenses;
    }

    async getTotal(startDate, endDate, category = null) {
        try {
            const filter = {};
            if (startDate || endDate) {
                filter.date = {};
                if (startDate) filter.date.$gte = startDate;
                if (endDate) filter.date.$lte = endDate;
            }
            if (category && category !== 'all') {
                filter.category = category;
            }
            
            const expenses = await Expense.find(filter).lean();
            let total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            if (!category || category === 'all' || category === 'salary') {
                const salaryPayments = await SalaryPayment.find({}).lean();
                for (const sp of salaryPayments) {
                    const exists = await Expense.findOne({ source_type: 'salary', source_id: sp.id });
                    if (!exists) {
                        let spDate = sp.created_at ? sp.created_at.toISOString().substring(0, 10) : '';
                        if (sp.journal_entry_id) {
                            const je = await JournalEntry.findOne({ id: sp.journal_entry_id }).lean();
                            if (je) spDate = je.date;
                        }
                        const matchesDate = (!startDate || spDate >= startDate) && (!endDate || spDate <= endDate);
                        if (matchesDate) {
                            total += (sp.net_salary || 0);
                        }
                    }
                }
            }

            return total;
        } catch (e) {
            return 0;
        }
    }

    async create(payment) {
        try {
            const lastDoc = await Expense.findOne({}).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.payment_number) {
                const match = lastDoc.payment_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const payNum = `EXP-${String(nextNumVal).padStart(6, '0')}`;
            const amount = parseFloat(payment.amount) || 0;
            if (amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

            const category = payment.category || 'other';
            let targetAccountCode = '57'; // other
            if (category === 'rent') targetAccountCode = '53';
            else if (category === 'salary') targetAccountCode = '521';
            else if (category === 'hospitality') targetAccountCode = '54';
            else if (category === 'utilities') targetAccountCode = '55';
            else if (category === 'maintenance') targetAccountCode = '56';

            const cashAccount = await Account.findOne({ code: '111' });
            const bankAccount = await Account.findOne({ code: '112' });
            let paymentAccountId = payment.payment_account_id ? parseInt(payment.payment_account_id, 10) : null;
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            let expenseAccount = await Account.findOne({ code: targetAccountCode });
            if (!expenseAccount) {
                expenseAccount = await Account.findOne({ code: '5' });
            }

            const maxJe = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxJeVal = 0;
            if (maxJe && maxJe.entry_number) {
                const match = maxJe.entry_number.match(/JE-(\d+)/);
                if (match) maxJeVal = parseInt(match[1], 10);
            }
            const jeNum = `JE-${String(maxJeVal + 1).padStart(6, '0')}`;
            const desc = payment.description || `مصروفات ${expenseAccount?.name || 'عامة'}`;
            const jeDesc = `قيد مصروف - ${payment.date} - ${desc}`;
            const jeId = await getNextSequenceValue('journal_entries');

            const lines = [];
            if (expenseAccount) {
                lines.push({ account_id: expenseAccount.id, debit: amount, credit: 0, description: `مصروف ${payment.date} - ${desc}` });
            }
            if (paymentAccountId) {
                lines.push({ account_id: paymentAccountId, debit: 0, credit: amount, description: `دفع مصروف ${payment.date}` });
            }

            await JournalEntry.create({
                id: jeId, entry_number: jeNum, date: payment.date, description: jeDesc, reference: payNum,
                created_by: payment.created_by || null, lines
            });

            if (expenseAccount) await Account.updateOne({ id: expenseAccount.id }, { $inc: { balance: amount } });
            if (paymentAccountId) await Account.updateOne({ id: paymentAccountId }, { $inc: { balance: -amount } });

            const nextId = await getNextSequenceValue('expenses');
            await Expense.create({
                id: nextId, payment_number: payNum, category, date: payment.date, amount, description: desc,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, source_type: payment.source_type || null, source_id: payment.source_id || null,
                notes: payment.notes || null, created_by: payment.created_by || null
            });

            return { success: true, id: nextId, payment_number: payNum };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const payment = await Expense.findOne({ id });
            if (!payment) return { success: false, error: 'السجل غير موجود' };
            if (payment.source_type === 'salary') {
                return { success: false, error: 'مصروف الراتب مرتبط بسجل الرواتب. احذف صرف الراتب من شاشة الرواتب.' };
            }

            if (payment.journal_entry_id) {
                const je = await JournalEntry.findOne({ id: payment.journal_entry_id });
                if (je) {
                    for (const line of je.lines || []) {
                        const change = (line.credit || 0) - (line.debit || 0);
                        await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
                    }
                    await JournalEntry.deleteOne({ id: payment.journal_entry_id });
                }
            }

            await Expense.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class SystemRepo {
    constructor(db) { this.db = db; }

    async isFirstRun() {
        const setupComplete = await Setting.findOne({ key: 'setup_complete' }).lean();
        if (setupComplete) {
            return setupComplete.value === '0';
        }

        const admin = await User.findOne({ role: 'admin' }).lean();
        const companyName = await Setting.findOne({ key: 'company_name' }).lean();
        const defaultAdminPassword = this.db.adminConfig?.getAdminPassword();
        
        let isDefault = true;
        if (admin && !verifyPassword(defaultAdminPassword, admin.password_hash)) isDefault = false;
        if (companyName && companyName.value !== 'شركتي') isDefault = false;

        const invoicesCount = await Invoice.countDocuments();
        if (invoicesCount > 0) isDefault = false;

        if (!isDefault) {
            await Setting.updateOne({ key: 'setup_complete' }, { $set: { value: '1', category: 'system' } }, { upsert: true });
            return false;
        }

        return true;
    }

    async runSetup(data) {
        try {
            if (data.company_name) await Setting.updateOne({ key: 'company_name' }, { $set: { value: data.company_name, category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_phone' }, { $set: { value: data.company_phone || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_address' }, { $set: { value: data.company_address || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_tax_number' }, { $set: { value: data.company_tax_number || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'currency' }, { $set: { value: data.currency || 'دينار كويتي', category: 'general' } }, { upsert: true });

            if (data.company_logo) {
                await Setting.updateOne({ key: 'company_logo' }, { $set: { value: data.company_logo, category: 'company' } }, { upsert: true });
            }
            if (data.invoice_template) {
                await Setting.updateOne({ key: 'invoice_template' }, { $set: { value: data.invoice_template, category: 'invoice' } }, { upsert: true });
            }

            const allowNegative = data.allow_negative_stock ? '1' : '0';
            await Setting.updateOne({ key: 'allow_negative_stock' }, { $set: { value: allowNegative, category: 'general' } }, { upsert: true });

            if (data.admin_username && data.admin_password) {
                if (data.admin_username.toLowerCase() === 'admin') {
                    throw new Error("لا يمكن استخدام اسم المستخدم 'admin' لأنه محجوز للنظام الأساسي. الرجاء اختيار اسم آخر.");
                }
                const nextId = await getNextSequenceValue('users');
                await User.create({
                    id: nextId, username: data.admin_username, password_hash: hashPassword(data.admin_password),
                    full_name: data.admin_name || 'مدير الشركة', role: 'admin'
                });
            }

            await Setting.updateOne({ key: 'setup_complete' }, { $set: { value: '1', category: 'system' } }, { upsert: true });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class CouponsRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        return await Coupon.find({}).sort({ id: -1 }).lean();
    }

    async create(data) {
        try {
            const nextId = await getNextSequenceValue('coupons');
            await Coupon.create({
                id: nextId, code: data.code.toUpperCase(), discount_type: data.discount_type,
                discount_value: data.discount_value, max_uses: data.max_uses || 0,
                valid_from: data.valid_from || null, valid_to: data.valid_to || null,
                is_active: data.is_active !== undefined ? (data.is_active ? true : false) : true
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(data) {
        try {
            await Coupon.updateOne({ id: data.id }, {
                $set: {
                    code: data.code.toUpperCase(), discount_type: data.discount_type,
                    discount_value: data.discount_value, max_uses: data.max_uses,
                    valid_from: data.valid_from || null, valid_to: data.valid_to || null,
                    is_active: data.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await Coupon.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async validate(code) {
        const coupon = await Coupon.findOne({ code: new RegExp('^' + code + '$', 'i') }).lean();
        if (!coupon) return { valid: false, error: 'الكوبون غير موجود' };
        if (!coupon.is_active) return { valid: false, error: 'الكوبون غير مفعل' };
        
        if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
            return { valid: false, error: 'تم تجاوز الحد الأقصى لاستخدام الكوبون' };
        }
        
        const now = new Date().toISOString().split('T')[0];
        if (coupon.valid_from && now < coupon.valid_from) return { valid: false, error: 'تاريخ بداية الكوبون لم يحن بعد' };
        if (coupon.valid_to && now > coupon.valid_to) return { valid: false, error: 'الكوبون منتهي الصلاحية' };
        
        return { valid: true, coupon };
    }

    async incrementUse(id) {
        await Coupon.updateOne({ id }, { $inc: { current_uses: 1 } });
    }
}

class OffersRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        return await Offer.find({}).sort({ id: -1 }).lean();
    }

    async getActive() {
        const now = new Date().toISOString().split('T')[0];
        return await Offer.find({
            is_active: true,
            $and: [
                { $or: [{ valid_from: null }, { valid_from: { $lte: now } }] },
                { $or: [{ valid_to: null }, { valid_to: { $gte: now } }] }
            ]
        }).lean();
    }

    async create(data) {
        try {
            const nextId = await getNextSequenceValue('offers');
            await Offer.create({
                id: nextId, title: data.title, offer_type: data.offer_type,
                discount_value: data.discount_value || 0, target_type: data.target_type,
                target_id: data.target_id || null, buy_qty: data.buy_qty || 0,
                get_qty: data.get_qty || 0, valid_from: data.valid_from || null,
                valid_to: data.valid_to || null, is_active: data.is_active !== undefined ? (data.is_active ? true : false) : true
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(data) {
        try {
            await Offer.updateOne({ id: data.id }, {
                $set: {
                    title: data.title, offer_type: data.offer_type,
                    discount_value: data.discount_value || 0, target_type: data.target_type,
                    target_id: data.target_id || null, buy_qty: data.buy_qty || 0,
                    get_qty: data.get_qty || 0, valid_from: data.valid_from || null,
                    valid_to: data.valid_to || null, is_active: data.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await Offer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class ActivityLogRepo {
    constructor(db) { this.db = db; }

    async log({ user_id, user_name, action, module, entity_id, entity_ref }) {
        try {
            const nextId = await getNextSequenceValue('activity_log');
            await ActivityLog.create({
                id: nextId, user_id: user_id || null, user_name: user_name || 'system',
                action, module, entity_id: entity_id || null, entity_ref: entity_ref || null
            });
        } catch (e) {
            console.error('[ActivityLog] Failed to log:', e.message);
        }
    }

    async getAll({ module, action, user_name, startDate, endDate, limit } = {}) {
        try {
            const filter = {};
            if (module) filter.module = module;
            if (action) filter.action = action;
            if (user_name) filter.user_name = new RegExp(user_name, 'i');
            if (startDate || endDate) {
                filter.created_at = {};
                if (startDate) filter.created_at.$gte = new Date(startDate + 'T00:00:00.000Z');
                if (endDate) filter.created_at.$lte = new Date(endDate + 'T23:59:59.999Z');
            }
            return await ActivityLog.find(filter).sort({ id: -1 }).limit(limit || 500).lean();
        } catch (e) {
            console.error('[ActivityLog] getAll error:', e.message);
            return [];
        }
    }
}

class StockTransfersRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const transfers = await StockTransfer.find({}).sort({ date: -1, id: -1 }).lean();
        for (const tr of transfers) {
            for (const item of tr.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
                item.product_code = p ? p.code : '';
            }
        }
        return transfers;
    }

    async getById(id) {
        const tr = await StockTransfer.findOne({ id }).lean();
        if (tr) {
            for (const item of tr.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
                item.product_code = p ? p.code : '';
            }
            return tr;
        }
        return null;
    }

    async create(transfer) {
        try {
            let nextNumNum = 1;
            const lastTransfer = await StockTransfer.findOne().sort({ id: -1 }).lean();
            if (lastTransfer && lastTransfer.transfer_number) {
                const match = lastTransfer.transfer_number.match(/TR-(\d+)/);
                if (match) {
                    nextNumNum = parseInt(match[1], 10) + 1;
                }
            }
            const num = transfer.transfer_number || `TR-${String(nextNumNum).padStart(6, '0')}`;
            const direction = transfer.direction || 'shop_to_warehouse';

            const allowNegativeSetting = await Setting.findOne({ key: 'allow_negative_stock' }).lean();
            const allowNegative = allowNegativeSetting && (allowNegativeSetting.value === 'yes' || allowNegativeSetting.value === '1');

            if (!allowNegative) {
                for (const item of transfer.items || []) {
                    const productId = parseInt(item.product_id, 10);
                    const quantity = parseFloat(item.quantity) || 0;
                    if (!productId || quantity <= 0) continue;

                    const product = await Product.findOne({ id: productId });
                    if (!product) continue;

                    if (direction === 'warehouse_to_shop') {
                        if ((product.warehouse_stock || 0) < quantity) {
                            return { 
                                success: false, 
                                error: `الكمية المطلوبة للتحويل من المستودع غير متوفرة للمنتج "${product.name}" (المتاح: ${product.warehouse_stock || 0}، المطلوب: ${quantity})` 
                            };
                        }
                    } else {
                        if ((product.shop_stock || 0) < quantity) {
                            return { 
                                success: false, 
                                error: `الكمية المطلوبة للتحويل من المحل غير متوفرة للمنتج "${product.name}" (المتاح: ${product.shop_stock || 0}، المطلوب: ${quantity})` 
                            };
                        }
                    }
                }
            }

            const items = (transfer.items || []).map(item => ({
                product_id: parseInt(item.product_id, 10),
                quantity: parseFloat(item.quantity) || 0
            })).filter(item => item.product_id && item.quantity > 0);

            const nextId = await getNextSequenceValue('stock_transfers');
            await StockTransfer.create({
                id: nextId, transfer_number: num, date: transfer.date, status: transfer.status || 'completed',
                notes: transfer.notes || null, direction, created_by: transfer.created_by || null,
                items
            });

            for (const item of items) {
                if (direction === 'warehouse_to_shop') {
                    await Product.updateOne({ id: item.product_id }, {
                        $inc: { warehouse_stock: -item.quantity, shop_stock: item.quantity }
                    });
                } else {
                    await Product.updateOne({ id: item.product_id }, {
                        $inc: { shop_stock: -item.quantity, warehouse_stock: item.quantity }
                    });
                }
            }

            return { success: true, id: nextId, transfer_number: num };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const transfer = await this.getById(id);
            if (!transfer) return { success: false, error: 'Transfer not found' };

            const direction = transfer.direction || 'shop_to_warehouse';
            for (const item of transfer.items || []) {
                if (item.product_id) {
                    if (direction === 'warehouse_to_shop') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { warehouse_stock: item.quantity, shop_stock: -item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, warehouse_stock: -item.quantity }
                        });
                    }
                }
            }

            await StockTransfer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class ReturnsRepo {
    constructor(db) { this.db = db; }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const returns = await Return.find(filter).sort({ date: -1 }).lean();
        if (returns.length === 0) return [];

        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();
        const invoices = await Invoice.find({}).lean();
        const products = await Product.find({}).lean();

        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        const invoiceMap = new Map(invoices.map(i => [i.id, i.invoice_number]));
        const productMap = new Map(products.map(p => [p.id, p.name]));

        for (const ret of returns) {
            if (ret.customer_id) {
                ret.customer_name = customerMap.get(ret.customer_id) || '';
            }
            if (ret.supplier_id) {
                ret.supplier_name = supplierMap.get(ret.supplier_id) || '';
            }
            if (ret.invoice_id) {
                ret.invoice_number = invoiceMap.get(ret.invoice_id) || '';
            }
            for (const item of ret.items || []) {
                item.product_name = productMap.get(item.product_id) || '';
            }
        }
        return returns;
    }

    async getById(id) {
        const returnId = parseInt(id, 10);
        const ret = await Return.findOne({ id: returnId }).lean();
        if (ret) {
            if (ret.customer_id) {
                const c = await Customer.findOne({ id: ret.customer_id }).lean();
                ret.customer_name = c ? c.name : '';
            }
            if (ret.supplier_id) {
                const s = await Supplier.findOne({ id: ret.supplier_id }).lean();
                ret.supplier_name = s ? s.name : '';
            }
            if (ret.invoice_id) {
                const inv = await Invoice.findOne({ id: ret.invoice_id }).lean();
                ret.invoice_number = inv ? inv.invoice_number : '';
            }
            for (const item of ret.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
            }
            return ret;
        }
        return null;
    }

    async _createReturnJournalEntry(ret, returnId, num) {
        const total = parseFloat(ret.total) || 0;
        if (total === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });
        const revenueAccount = await Account.findOne({ code: '41' });
        const costAccount = await Account.findOne({ code: '51' });

        if (ret.type === 'sales_return') {
            if (revenueAccount) lines.push({ account_id: revenueAccount.id, debit: total, credit: 0, description: `مرتجع مبيعات ${num}` });
            const creditAcct = (ret.payment_method === 'bank' && bankAccount) ? bankAccount : 
                               (ret.payment_method === 'credit' && customersAccount) ? customersAccount : cashAccount;
            if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: total, description: `مرتجع مبيعات ${num}` });
        } else if (ret.type === 'purchase_return') {
            const debitAcct = (ret.payment_method === 'bank' && bankAccount) ? bankAccount : 
                              (ret.payment_method === 'credit' && suppliersAccount) ? suppliersAccount : cashAccount;
            if (debitAcct) lines.push({ account_id: debitAcct.id, debit: total, credit: 0, description: `مرتجع مشتريات ${num}` });
            if (costAccount) lines.push({ account_id: costAccount.id, debit: 0, credit: total, description: `مرتجع مشتريات ${num}` });
        }

        if (lines.length < 2) return null;

        const jeMaxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
        let jeMaxNum = 0;
        if (jeMaxNumDoc && jeMaxNumDoc.entry_number) {
            const match = jeMaxNumDoc.entry_number.match(/JE-(\d+)/);
            if (match) jeMaxNum = parseInt(match[1], 10);
        }
        const jeNextNum = jeMaxNum + 1;
        const jeNum = `JE-${String(jeNextNum).padStart(6, '0')}`;
        const jeDesc = ret.type === 'sales_return' ? `قيد مرتجع مبيعات ${num}` : `قيد مرتجع مشتريات ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');

        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: ret.date,
            description: jeDesc,
            reference: num,
            created_by: ret.created_by || null,
            lines: lines
        });

        for (const line of lines) {
            const change = (line.debit || 0) - (line.credit || 0);
            await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
        }

        return jeId;
    }

    async _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        const je = await JournalEntry.findOne({ id: journalEntryId });
        if (je) {
            for (const line of je.lines || []) {
                const change = (line.credit || 0) - (line.debit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }
            await JournalEntry.deleteOne({ id: journalEntryId });
        }
    }

    async create(ret) {
        try {
            if (ret.invoice_id) {
                const invoice = await Invoice.findOne({ id: ret.invoice_id }).lean();
                if (!invoice) return { success: false, error: 'الفاتورة الأصلية غير موجودة' };

                const prevReturns = await Return.find({ invoice_id: ret.invoice_id }).lean();
                const prevReturnedMap = {};
                for (const pr of prevReturns) {
                    for (const item of pr.items || []) {
                        prevReturnedMap[item.product_id] = (prevReturnedMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }

                for (const item of ret.items || []) {
                    if (!item.product_id) continue;
                    const originalItem = invoice.items.find(ii => ii.product_id === parseInt(item.product_id, 10));
                    if (!originalItem) {
                        return { success: false, error: 'المنتج المرتجع غير موجود في الفاتورة الأصلية' };
                    }
                    const alreadyReturned = prevReturnedMap[item.product_id] || 0;
                    const remainingToReturn = originalItem.quantity - alreadyReturned;
                    if (item.quantity > remainingToReturn) {
                        return { success: false, error: `الكمية المراد إرجاعها للمنتج "${item.description || originalItem.description}" (${item.quantity}) تتجاوز الكمية المتاحة للإرجاع (${remainingToReturn})` };
                    }
                    if (ret.type === 'purchase_return') {
                        const product = await Product.findOne({ id: item.product_id }).lean();
                        if (product && product.shop_stock < item.quantity) {
                            return { success: false, error: `الكمية المتوفرة في المخزن للمنتج "${product.name}" (${product.shop_stock}) غير كافية لإتمام مرتجع المشتريات (المطلوب إرجاعه: ${item.quantity})` };
                        }
                    }
                }
            }

            const lastDoc = await Return.findOne({ type: ret.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.return_number) {
                const match = lastDoc.return_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = ret.type === 'sales_return' ? 'RT-SL-' : 'RT-PU-';
            const num = ret.return_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            const items = (ret.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            const nextId = await getNextSequenceValue('returns');
            await Return.create({
                id: nextId, return_number: num, invoice_id: ret.invoice_id || null, type: ret.type,
                customer_id: ret.customer_id || null, supplier_id: ret.supplier_id || null, date: ret.date,
                subtotal: ret.subtotal || 0, discount: ret.discount || 0, total: ret.total || 0,
                refunded_amount: ret.total || 0, payment_method: ret.payment_method || 'cash',
                payment_account_id: ret.payment_account_id || null, notes: ret.notes || null,
                created_by: ret.created_by || null, items
            });

            for (const item of items) {
                if (item.product_id) {
                    if (ret.type === 'sales_return') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                        });
                    }
                }
            }

            const jeId = await this._createReturnJournalEntry(ret, nextId, num);
            if (jeId) {
                await Return.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
            }

            if (ret.payment_method === 'credit') {
                if (ret.type === 'sales_return' && ret.customer_id) {
                    await Customer.updateOne({ id: ret.customer_id }, { $inc: { balance: -(parseFloat(ret.total) || 0) } });
                } else if (ret.type === 'purchase_return' && ret.supplier_id) {
                    await Supplier.updateOne({ id: ret.supplier_id }, { $inc: { balance: -(parseFloat(ret.total) || 0) } });
                }
            }

            return { success: true, id: nextId, return_number: num };
        } catch (e) {
            console.error('Return creation error:', e);
            return { success: false, error: e.message || String(e) };
        }
    }

    async delete(id) {
        try {
            const ret = await this.getById(id);
            if (!ret) return { success: false, error: 'Return not found' };

            for (const item of ret.items || []) {
                if (item.product_id) {
                    if (ret.type === 'sales_return') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                        });
                    }
                }
            }

            if (ret.journal_entry_id) {
                await this._deleteJournalEntry(ret.journal_entry_id);
            }

            if (ret.payment_method === 'credit') {
                if (ret.type === 'sales_return' && ret.customer_id) {
                    await Customer.updateOne({ id: ret.customer_id }, { $inc: { balance: parseFloat(ret.total) || 0 } });
                } else if (ret.type === 'purchase_return' && ret.supplier_id) {
                    await Supplier.updateOne({ id: ret.supplier_id }, { $inc: { balance: parseFloat(ret.total) || 0 } });
                }
            }

            await Return.deleteOne({ id });
            return { success: true };
        } catch (e) {
            console.error('Return deletion error:', e);
            return { success: false, error: e.message };
        }
    }
}


module.exports = {
    UsersRepo,
    CustomersRepo,
    SuppliersRepo,
    AccountsRepo,
    ProductsRepo,
    InvoicesRepo,
    VouchersRepo,
    JournalRepo,
    ReportsRepo,
    SettingsRepo,
    PermissionsRepo,
    EmployeesRepo,
    SalaryRepo,
    LeavesRepo,
    DeductionsRepo,
    ExpensesRepo,
    SystemRepo,
    CouponsRepo,
    OffersRepo,
    ActivityLogRepo,
    StockTransfersRepo,
    ReturnsRepo
};
