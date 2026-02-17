const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

class AppDatabase {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.app = null;
    }

    async init(app) {
        this.app = app;
        const userDataPath = app.getPath('userData');
        this.dbPath = path.join(userDataPath, 'accapp.db');

        const SQL = await initSqlJs();

        // Load existing database or create new
        if (fs.existsSync(this.dbPath)) {
            const buffer = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buffer);
        } else {
            this.db = new SQL.Database();
        }

        this.createTables();
        this.seedDefaultData();
        this.initRepositories();
        this.save();
    }

    save() {
        const data = this.db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    run(sql, params = []) {
        this.db.run(sql, params);
        // IMPORTANT: Get last_insert_rowid BEFORE save() to ensure it reflects the just-executed INSERT
        const stmt = this.db.prepare("SELECT last_insert_rowid() as id");
        stmt.step();
        const lastId = stmt.getAsObject().id;
        stmt.free();
        this.save();
        return { lastInsertRowid: lastId };
    }

    get(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            const row = { ...stmt.getAsObject() };
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    }

    all(sql, params = []) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) results.push({ ...stmt.getAsObject() });
        stmt.free();
        return results;
    }

    exec(sql) { this.db.exec(sql); this.save(); }

    createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, full_name TEXT, role TEXT DEFAULT 'user', is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, module TEXT NOT NULL, can_view INTEGER DEFAULT 1, can_create INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0, can_delete INTEGER DEFAULT 0, UNIQUE(role, module));
      CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_number TEXT, balance REAL DEFAULT 0, credit_limit REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_number TEXT, balance REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, parent_id INTEGER, account_type TEXT NOT NULL, nature TEXT NOT NULL, balance REAL DEFAULT 0, is_active INTEGER DEFAULT 1, can_post INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (parent_id) REFERENCES accounts(id));
      CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, description TEXT, unit TEXT DEFAULT 'قطعة', category TEXT, purchase_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, stock_quantity REAL DEFAULT 0, min_stock REAL DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT UNIQUE NOT NULL, type TEXT NOT NULL, customer_id INTEGER, supplier_id INTEGER, date TEXT NOT NULL, due_date TEXT, subtotal REAL DEFAULT 0, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, paid REAL DEFAULT 0, status TEXT DEFAULT 'pending', payment_method TEXT DEFAULT 'cash', payment_account_id INTEGER, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, product_id INTEGER, description TEXT, quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL NOT NULL, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS vouchers (id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_number TEXT UNIQUE NOT NULL, type TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL, account_id INTEGER, customer_id INTEGER, supplier_id INTEGER, payment_method TEXT DEFAULT 'cash', invoice_id INTEGER, reference TEXT, description TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_number TEXT UNIQUE NOT NULL, date TEXT NOT NULL, description TEXT, reference TEXT, is_posted INTEGER DEFAULT 0, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER NOT NULL, account_id INTEGER NOT NULL, debit REAL DEFAULT 0, credit REAL DEFAULT 0, description TEXT, FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT, category TEXT DEFAULT 'general');
    `);

        /// Migration for existing databases - add missing columns
        try {
            // Check if payment_method column exists
            const columns = this.all("PRAGMA table_info(invoices)");
            const hasPaymentMethod = columns.some(col => col.name === 'payment_method');
            const hasPaymentAccount = columns.some(col => col.name === 'payment_account_id');

            if (!hasPaymentMethod) {
                this.exec("ALTER TABLE invoices ADD COLUMN payment_method TEXT DEFAULT 'cash'");
            }
            if (!hasPaymentAccount) {
                this.exec("ALTER TABLE invoices ADD COLUMN payment_account_id INTEGER");
            }

            // Check vouchers for invoice_id
            const voucherCols = this.all("PRAGMA table_info(vouchers)");
            const hasInvoiceId = voucherCols.some(col => col.name === 'invoice_id');
            if (!hasInvoiceId) {
                this.exec("ALTER TABLE vouchers ADD COLUMN invoice_id INTEGER");
            }
        } catch (e) {
            console.log('Migration check:', e.message);
        }
    }

    seedDefaultData() {
        // Admin user
        const admin = this.get('SELECT id FROM users WHERE username = ?', ['admin']);
        if (!admin) this.run("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)", ['admin', 'admin123', 'مدير النظام', 'admin']);

        // Accounts
        const count = this.get('SELECT COUNT(*) as count FROM accounts');
        if (count.count === 0) {
            const accs = [
                ['1', 'الأصول', null, 'asset', 'debit'], ['2', 'الخصوم', null, 'liability', 'credit'], ['3', 'حقوق الملكية', null, 'equity', 'credit'], ['4', 'الإيرادات', null, 'revenue', 'credit'], ['5', 'المصروفات', null, 'expense', 'debit'],
                ['11', 'الأصول المتداولة', '1', 'asset', 'debit'], ['111', 'الصندوق', '11', 'asset', 'debit'], ['112', 'البنك', '11', 'asset', 'debit'], ['113', 'العملاء', '11', 'asset', 'debit'],
                ['21', 'الخصوم المتداولة', '2', 'liability', 'credit'], ['211', 'الموردون', '21', 'liability', 'credit'],
                ['41', 'إيرادات المبيعات', '4', 'revenue', 'credit'], ['51', 'تكلفة المبيعات', '5', 'expense', 'debit']
            ];
            for (const [code, name, parent, type, nature] of accs) {
                const parentId = parent ? this.get('SELECT id FROM accounts WHERE code = ?', [parent])?.id : null;
                this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)", [code, name, parentId, type, nature]);
            }
        }

        // Settings
        const settings = [
            ['company_name', 'شركتي', 'company'], ['company_address', '', 'company'], ['company_phone', '', 'company'], ['company_email', '', 'company'],
            ['currency', 'دينار كويتي', 'general'], ['currency_symbol', 'د.ك', 'general'], ['decimal_places', '3', 'general'],
            ['tax_rate', '0', 'tax'], ['theme', 'light', 'appearance'],
            ['invoice_title_sales', 'فاتورة مبيعات', 'invoice'], ['invoice_title_purchase', 'فاتورة مشتريات', 'invoice'],
            ['invoice_footer', 'شكراً لتعاملكم معنا', 'invoice'], ['show_logo', 'yes', 'invoice'], ['show_company_info', 'yes', 'invoice'],
            ['paper_size', 'A4', 'invoice'], ['paper_orientation', 'portrait', 'invoice']
        ];
        for (const [key, value, category] of settings) {
            this.run("INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)", [key, value, category]);
        }
    }

    initRepositories() {
        this.users = new UsersRepo(this);
        this.customers = new CustomersRepo(this);
        this.suppliers = new SuppliersRepo(this);
        this.accounts = new AccountsRepo(this);
        this.products = new ProductsRepo(this);
        this.invoices = new InvoicesRepo(this);
        this.vouchers = new VouchersRepo(this);
        this.journal = new JournalRepo(this);
        this.reports = new ReportsRepo(this);
        this.settings = new SettingsRepo(this);
    }

    backup() {
        const backupPath = path.join(this.app.getPath('documents'), `accapp_backup_${Date.now()}.db`);
        const data = this.db.export();
        fs.writeFileSync(backupPath, Buffer.from(data));
        return { success: true, path: backupPath };
    }
}

class UsersRepo {
    constructor(db) { this.db = db; }
    login(username, password) {
        const user = this.db.get('SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1', [username, password]);
        if (user) { delete user.password_hash; return { success: true, user }; }
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    getAll() { return this.db.all('SELECT id, username, full_name, role, is_active, created_at FROM users'); }
    create(user) { try { const r = this.db.run("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)", [user.username, user.password, user.full_name, user.role || 'user']); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(user) { try { if (user.password) this.db.run("UPDATE users SET username=?, password_hash=?, full_name=?, role=?, is_active=? WHERE id=?", [user.username, user.password, user.full_name, user.role, user.is_active ? 1 : 0, user.id]); else this.db.run("UPDATE users SET username=?, full_name=?, role=?, is_active=? WHERE id=?", [user.username, user.full_name, user.role, user.is_active ? 1 : 0, user.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
    delete(id) { try { this.db.run('DELETE FROM users WHERE id = ? AND id != 1', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

class CustomersRepo {
    constructor(db) { this.db = db; }
    getAll() { return this.db.all('SELECT * FROM customers ORDER BY name'); }
    getById(id) { return this.db.get('SELECT * FROM customers WHERE id = ?', [id]); }
    create(c) { try { const count = this.db.get('SELECT COUNT(*) as count FROM customers').count; const code = c.code || `C${String(count + 1).padStart(4, '0')}`; const r = this.db.run("INSERT INTO customers (code, name, phone, email, address, tax_number, credit_limit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [code, c.name, c.phone, c.email, c.address, c.tax_number, c.credit_limit || 0, c.notes]); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(c) { try { this.db.run("UPDATE customers SET name=?, phone=?, email=?, address=?, tax_number=?, credit_limit=?, notes=?, is_active=? WHERE id=?", [c.name, c.phone, c.email, c.address, c.tax_number, c.credit_limit, c.notes, c.is_active ? 1 : 0, c.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
    delete(id) { try { this.db.run('DELETE FROM customers WHERE id = ?', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

class SuppliersRepo {
    constructor(db) { this.db = db; }
    getAll() { return this.db.all('SELECT * FROM suppliers ORDER BY name'); }
    getById(id) { return this.db.get('SELECT * FROM suppliers WHERE id = ?', [id]); }
    create(s) { try { const count = this.db.get('SELECT COUNT(*) as count FROM suppliers').count; const code = s.code || `S${String(count + 1).padStart(4, '0')}`; const r = this.db.run("INSERT INTO suppliers (code, name, phone, email, address, tax_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?)", [code, s.name, s.phone, s.email, s.address, s.tax_number, s.notes]); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(s) { try { this.db.run("UPDATE suppliers SET name=?, phone=?, email=?, address=?, tax_number=?, notes=?, is_active=? WHERE id=?", [s.name, s.phone, s.email, s.address, s.tax_number, s.notes, s.is_active ? 1 : 0, s.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
    delete(id) { try { this.db.run('DELETE FROM suppliers WHERE id = ?', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

class AccountsRepo {
    constructor(db) { this.db = db; }
    getAll() { return this.db.all('SELECT * FROM accounts ORDER BY code'); }
    getTree() {
        const accounts = this.getAll();
        const map = {}; const roots = [];
        for (const a of accounts) { a.children = []; map[a.id] = a; }
        for (const a of accounts) { if (a.parent_id && map[a.parent_id]) map[a.parent_id].children.push(a); else roots.push(a); }
        return roots;
    }
    getBankAccounts() {
        // Get cash and bank accounts (codes starting with 111 or 112)
        return this.db.all("SELECT * FROM accounts WHERE (code LIKE '111%' OR code LIKE '112%') AND can_post = 1 ORDER BY code");
    }
    create(a) { try { const r = this.db.run("INSERT INTO accounts (code, name, parent_id, account_type, nature, can_post) VALUES (?, ?, ?, ?, ?, ?)", [a.code, a.name, a.parent_id || null, a.account_type, a.nature, a.can_post ? 1 : 0]); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(a) { try { this.db.run("UPDATE accounts SET code=?, name=?, parent_id=?, account_type=?, nature=?, can_post=?, is_active=? WHERE id=?", [a.code, a.name, a.parent_id || null, a.account_type, a.nature, a.can_post ? 1 : 0, a.is_active ? 1 : 0, a.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
    delete(id) { const hasChildren = this.db.get('SELECT COUNT(*) as count FROM accounts WHERE parent_id = ?', [id]); if (hasChildren.count > 0) return { success: false, error: 'لا يمكن حذف حساب له فرعية' }; try { this.db.run('DELETE FROM accounts WHERE id = ?', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

class ProductsRepo {
    constructor(db) { this.db = db; }
    getAll() { return this.db.all('SELECT * FROM products ORDER BY name'); }
    create(p) { try { const count = this.db.get('SELECT COUNT(*) as count FROM products').count; const code = p.code || `P${String(count + 1).padStart(4, '0')}`; const r = this.db.run("INSERT INTO products (code, name, description, unit, category, purchase_price, sale_price, stock_quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [code, p.name, p.description, p.unit, p.category, p.purchase_price || 0, p.sale_price || 0, p.stock_quantity || 0, p.min_stock || 0]); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(p) { try { this.db.run("UPDATE products SET name=?, description=?, unit=?, category=?, purchase_price=?, sale_price=?, stock_quantity=?, min_stock=?, is_active=? WHERE id=?", [p.name, p.description, p.unit, p.category, p.purchase_price, p.sale_price, p.stock_quantity, p.min_stock, p.is_active ? 1 : 0, p.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
    delete(id) { try { this.db.run('DELETE FROM products WHERE id = ?', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

class InvoicesRepo {
    constructor(db) { this.db = db; }
    getAll(type) { return type ? this.db.all("SELECT i.*, c.name as customer_name, s.name as supplier_name FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id LEFT JOIN suppliers s ON i.supplier_id=s.id WHERE i.type=? ORDER BY i.date DESC", [type]) : this.db.all("SELECT i.*, c.name as customer_name, s.name as supplier_name FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id LEFT JOIN suppliers s ON i.supplier_id=s.id ORDER BY i.date DESC"); }
    getById(id) {
        const invoiceId = parseInt(id, 10);
        console.log('[getById] Looking for invoice:', invoiceId);
        const inv = this.db.get("SELECT i.*, c.name as customer_name, s.name as supplier_name FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id LEFT JOIN suppliers s ON i.supplier_id=s.id WHERE i.id=?", [invoiceId]);
        console.log('[getById] Invoice found:', inv ? 'yes' : 'no');
        if (inv) {
            const items = this.db.all("SELECT ii.*, p.name as product_name FROM invoice_items ii LEFT JOIN products p ON ii.product_id=p.id WHERE ii.invoice_id=?", [invoiceId]);
            console.log('[getById] Items found:', items?.length || 0);
            console.log('[getById] Items:', JSON.stringify(items));
            // Return a fresh plain object to ensure IPC serialization works
            return { ...inv, items: items || [] };
        }
        return inv;
    }
    create(inv) {
        try {
            const count = this.db.get('SELECT COUNT(*) as count FROM invoices')?.count || 0;
            const prefix = inv.type === 'sales' ? 'SL-' : 'PU-';
            const num = inv.invoice_number || `${prefix}${String(count + 1).padStart(6, '0')}`;

            // Helper to convert undefined to null (sql.js cannot bind undefined)
            const n = (v) => v === undefined ? null : v;

            const r = this.db.run(
                "INSERT INTO invoices (invoice_number, type, customer_id, supplier_id, date, due_date, subtotal, discount, tax, total, status, payment_method, payment_account_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [num, inv.type, n(inv.customer_id), n(inv.supplier_id), inv.date, n(inv.due_date), n(inv.subtotal) || 0, n(inv.discount) || 0, n(inv.tax) || 0, n(inv.total) || 0, n(inv.status) || 'pending', n(inv.payment_method) || 'cash', n(inv.payment_account_id), n(inv.notes), n(inv.created_by)]
            );
            const invId = Number(r.lastInsertRowid);
            console.log('[create] Invoice created with ID:', invId, 'type:', typeof invId);
            console.log('[create] Items to insert:', inv.items?.length || 0);

            // Insert invoice items
            for (const item of inv.items || []) {
                const productId = item.product_id ? parseInt(item.product_id, 10) : null;
                const description = item.description || '';
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const discount = parseFloat(item.discount) || 0;
                const tax = parseFloat(item.tax) || 0;
                const total = parseFloat(item.total) || (quantity * unitPrice);

                console.log('[create] Inserting item with invoice_id:', invId, 'productId:', productId, 'qty:', quantity);
                this.db.run(
                    "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [invId, productId, description, quantity, unitPrice, discount, tax, total]
                );

                // Update product stock
                if (productId) {
                    const stockChange = inv.type === 'sales' ? -quantity : quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockChange, productId]);
                }
            }

            // Verify items were saved
            const savedItems = this.db.all("SELECT * FROM invoice_items WHERE invoice_id = ?", [invId]);
            console.log('[create] Verified saved items:', savedItems?.length || 0);

            // Update customer/supplier balance ONLY for pending invoices
            // Paid invoices don't create a debt/receivable
            if (inv.status !== 'paid') {
                if (inv.type === 'sales' && inv.customer_id) this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [inv.total, inv.customer_id]);
                else if (inv.type === 'purchase' && inv.supplier_id) this.db.run('UPDATE suppliers SET balance = balance + ? WHERE id = ?', [inv.total, inv.supplier_id]);
            }

            // Update account balances for paid invoices
            // Update account balances for paid invoices
            if (inv.status === 'paid') {
                let accountToUpdate = null;
                if (inv.payment_method === 'cash') {
                    accountToUpdate = this.db.get("SELECT id FROM accounts WHERE code = '111'");
                } else if (inv.payment_method === 'bank') {
                    accountToUpdate = this.db.get("SELECT id FROM accounts WHERE code = '112'");
                }

                if (accountToUpdate) {
                    if (inv.type === 'sales') {
                        this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [inv.total, accountToUpdate.id]);
                    } else if (inv.type === 'purchase') {
                        this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [inv.total, accountToUpdate.id]);
                    }
                }
            }


            return { success: true, id: invId, invoice_number: num };
        } catch (err) {
            console.error('Invoice creation error:', err);
            return { success: false, error: err.message || String(err) };
        }
    }
    update(inv) {
        const n = (v) => v === undefined ? null : v;
        const invId = parseInt(inv.id, 10);
        try {
            // Get old invoice data to reverse changes
            const oldInvoice = this.getById(invId);
            if (!oldInvoice) return { success: false, error: 'Invoice not found' };

            // 1. Reverse old stock changes
            for (const oldItem of oldInvoice.items || []) {
                if (oldItem.product_id) {
                    // Reverse: sales = add back, purchase = subtract back
                    const stockReverse = oldInvoice.type === 'sales' ? oldItem.quantity : -oldItem.quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockReverse, oldItem.product_id]);
                }
            }

            // 2. Reverse old account balance (if was paid)
            if (oldInvoice.status === 'paid') {
                let oldAccount = null;
                if (oldInvoice.payment_method === 'cash') {
                    oldAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
                } else if (oldInvoice.payment_method === 'bank') {
                    oldAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
                }
                if (oldAccount) {
                    // Reverse: sales = subtract, purchase = add
                    if (oldInvoice.type === 'sales') {
                        this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldInvoice.total, oldAccount.id]);
                    } else {
                        this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldInvoice.total, oldAccount.id]);
                    }
                }
            }

            // 3. Reverse old customer/supplier balance (if was pending)
            if (oldInvoice.status !== 'paid') {
                if (oldInvoice.type === 'sales' && oldInvoice.customer_id) {
                    this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [oldInvoice.total, oldInvoice.customer_id]);
                } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
                    this.db.run('UPDATE suppliers SET balance = balance - ? WHERE id = ?', [oldInvoice.total, oldInvoice.supplier_id]);
                }
            }

            // 4. Update invoice header
            this.db.run("UPDATE invoices SET customer_id=?, supplier_id=?, date=?, due_date=?, subtotal=?, discount=?, tax=?, total=?, status=?, payment_method=?, notes=? WHERE id=?",
                [n(inv.customer_id), n(inv.supplier_id), inv.date, n(inv.due_date), n(inv.subtotal) || 0, n(inv.discount) || 0, n(inv.tax) || 0, n(inv.total) || 0, n(inv.status) || 'pending', n(inv.payment_method) || 'cash', n(inv.notes), invId]);

            // 5. Delete old items and insert new ones
            this.db.run("DELETE FROM invoice_items WHERE invoice_id = ?", [invId]);

            for (const item of inv.items || []) {
                const productId = item.product_id ? parseInt(item.product_id, 10) : null;
                const description = item.description || '';
                const quantity = parseFloat(item.quantity) || 0;
                const unitPrice = parseFloat(item.unit_price) || 0;
                const discount = parseFloat(item.discount) || 0;
                const tax = parseFloat(item.tax) || 0;
                const total = parseFloat(item.total) || (quantity * unitPrice);

                this.db.run(
                    "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [invId, productId, description, quantity, unitPrice, discount, tax, total]
                );

                // Apply new stock change
                if (productId) {
                    const stockChange = oldInvoice.type === 'sales' ? -quantity : quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockChange, productId]);
                }
            }

            // 6. Apply new customer/supplier balance (if pending)
            if (inv.status !== 'paid') {
                if (oldInvoice.type === 'sales' && inv.customer_id) {
                    this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [inv.total, inv.customer_id]);
                } else if (oldInvoice.type === 'purchase' && inv.supplier_id) {
                    this.db.run('UPDATE suppliers SET balance = balance + ? WHERE id = ?', [inv.total, inv.supplier_id]);
                }
            }

            // 7. Apply new account balance (if paid)
            if (inv.status === 'paid') {
                let newAccount = null;
                if (inv.payment_method === 'cash') {
                    newAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
                } else if (inv.payment_method === 'bank') {
                    newAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
                }
                if (newAccount) {
                    if (oldInvoice.type === 'sales') {
                        this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [inv.total, newAccount.id]);
                    } else if (oldInvoice.type === 'purchase') {
                        this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [inv.total, newAccount.id]);
                    }
                }
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    delete(id) {
        try {
            // Get invoice details before deleting to reverse changes
            const invoice = this.getById(id);
            if (!invoice) return { success: false, error: 'Invoice not found' };

            // Reverse inventory changes
            for (const item of invoice.items || []) {
                if (item.product_id) {
                    // Reverse stock: sales added stock back (+), purchase removed stock (-)
                    const stockChange = invoice.type === 'sales' ? item.quantity : -item.quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockChange, item.product_id]);
                }
            }

            // Reverse balance changes ONLY for pending invoices
            if (invoice.status !== 'paid') {
                if (invoice.type === 'sales' && invoice.customer_id) {
                    this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [invoice.total, invoice.customer_id]);
                } else if (invoice.type === 'purchase' && invoice.supplier_id) {
                    this.db.run('UPDATE suppliers SET balance = balance - ? WHERE id = ?', [invoice.total, invoice.supplier_id]);
                }
            }

            // Reverse account balance changes for paid invoices
            if (invoice.status === 'paid') {
                let accountToUpdate = null;

                if (invoice.payment_method === 'cash') {
                    // Get the cash account (الصندوق - code 111)
                    accountToUpdate = this.db.get("SELECT id FROM accounts WHERE code = '111'");
                } else if (invoice.payment_method === 'bank') {
                    // Get the bank account (البنك - code 112)
                    accountToUpdate = this.db.get("SELECT id FROM accounts WHERE code = '112'");
                }

                if (accountToUpdate) {
                    if (invoice.type === 'sales') {
                        // Reverse sales: decrease account balance
                        this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [invoice.total, accountToUpdate.id]);
                    } else if (invoice.type === 'purchase') {
                        // Reverse purchase: increase account balance
                        this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [invoice.total, accountToUpdate.id]);
                    }
                }
            }

            // Delete invoice items and invoice
            this.db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
            this.db.run('DELETE FROM invoices WHERE id = ?', [id]);

            return { success: true };
        } catch (e) {
            console.error('Invoice deletion error:', e);
            return { success: false, error: e.message };
        }
    }
    getPendingByCustomer(customerId) {
        return this.db.all("SELECT * FROM invoices WHERE customer_id = ? AND status = 'pending' ORDER BY date DESC", [customerId]);
    }
    getPendingBySupplier(supplierId) {
        return this.db.all("SELECT * FROM invoices WHERE supplier_id = ? AND status = 'pending' ORDER BY date DESC", [supplierId]);
    }
    updateStatus(id, status) {
        try {
            this.db.run('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
    getByCustomer(customerId) {
        return this.db.all("SELECT * FROM invoices WHERE customer_id = ? ORDER BY date DESC", [customerId]);
    }
    getBySupplier(supplierId) {
        return this.db.all("SELECT * FROM invoices WHERE supplier_id = ? ORDER BY date DESC", [supplierId]);
    }
}




class VouchersRepo {
    constructor(db) { this.db = db; }
    getAll(type) { return type ? this.db.all("SELECT v.*, a.name as account_name, c.name as customer_name, s.name as supplier_name FROM vouchers v LEFT JOIN accounts a ON v.account_id=a.id LEFT JOIN customers c ON v.customer_id=c.id LEFT JOIN suppliers s ON v.supplier_id=s.id WHERE v.type=? ORDER BY v.date DESC", [type]) : this.db.all("SELECT v.*, a.name as account_name, c.name as customer_name, s.name as supplier_name FROM vouchers v LEFT JOIN accounts a ON v.account_id=a.id LEFT JOIN customers c ON v.customer_id=c.id LEFT JOIN suppliers s ON v.supplier_id=s.id ORDER BY v.date DESC"); }
    getById(id) { return this.db.get("SELECT v.*, a.name as account_name, c.name as customer_name, s.name as supplier_name FROM vouchers v LEFT JOIN accounts a ON v.account_id=a.id LEFT JOIN customers c ON v.customer_id=c.id LEFT JOIN suppliers s ON v.supplier_id=s.id WHERE v.id=?", [id]); }
    create(v) {
        const n = (val) => val === undefined ? null : val;
        try {
            const countResult = this.db.get('SELECT COUNT(*) as count FROM vouchers WHERE type = ?', [v.type]);
            const count = countResult ? countResult.count : 0;
            const prefix = v.type === 'receipt' ? 'RV-' : 'PV-';
            const num = v.voucher_number || `${prefix}${String(count + 1).padStart(6, '0')}`;
            const r = this.db.run("INSERT INTO vouchers (voucher_number, type, date, amount, account_id, customer_id, supplier_id, payment_method, invoice_id, reference, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [num, v.type, v.date, n(v.amount) || 0, n(v.account_id), n(v.customer_id), n(v.supplier_id), n(v.payment_method), n(v.invoice_id), n(v.reference), n(v.description), n(v.created_by)]);

            // Update customer/supplier balance
            if (v.type === 'receipt' && v.customer_id) this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [v.amount, v.customer_id]);
            else if (v.type === 'payment' && v.supplier_id) this.db.run('UPDATE suppliers SET balance = balance - ? WHERE id = ?', [v.amount, v.supplier_id]);

            // Update cash/bank account balance
            const paymentMethod = v.payment_method || 'cash';
            let cashBankAccount = null;
            if (paymentMethod === 'cash') {
                cashBankAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
            } else if (paymentMethod === 'bank') {
                cashBankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
            }
            if (cashBankAccount) {
                if (v.type === 'receipt') {
                    // Receipt: money comes IN → increase cash/bank
                    this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [v.amount, cashBankAccount.id]);
                } else {
                    // Payment: money goes OUT → decrease cash/bank
                    this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [v.amount, cashBankAccount.id]);
                }
            }

            // Update linked invoice status to paid
            if (v.invoice_id) {
                this.db.run("UPDATE invoices SET status = 'paid', paid = paid + ? WHERE id = ?", [v.amount, v.invoice_id]);
            }

            return { success: true, id: r.lastInsertRowid, voucher_number: num };
        } catch (e) { return { success: false, error: e.message }; }
    }
    update(v) {
        const n = (val) => val === undefined ? null : val;
        try {
            this.db.run("UPDATE vouchers SET date=?, amount=?, account_id=?, payment_method=?, reference=?, description=? WHERE id=?",
                [v.date, n(v.amount) || 0, n(v.account_id), n(v.payment_method), n(v.reference), n(v.description), v.id]);
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
    delete(id) {
        try {
            // Get voucher to reverse balance changes
            const voucher = this.getById(id);
            if (voucher) {
                if (voucher.type === 'receipt' && voucher.customer_id) {
                    this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [voucher.amount, voucher.customer_id]);
                } else if (voucher.type === 'payment' && voucher.supplier_id) {
                    this.db.run('UPDATE suppliers SET balance = balance + ? WHERE id = ?', [voucher.amount, voucher.supplier_id]);
                }

                // Reverse cash/bank account balance
                const paymentMethod = voucher.payment_method || 'cash';
                let cashBankAccount = null;
                if (paymentMethod === 'cash') {
                    cashBankAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
                } else if (paymentMethod === 'bank') {
                    cashBankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
                }
                if (cashBankAccount) {
                    if (voucher.type === 'receipt') {
                        // Reverse receipt: decrease cash/bank
                        this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [voucher.amount, cashBankAccount.id]);
                    } else {
                        // Reverse payment: increase cash/bank
                        this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [voucher.amount, cashBankAccount.id]);
                    }
                }

                // Revert invoice status if linked
                if (voucher.invoice_id) {
                    this.db.run("UPDATE invoices SET status = 'pending', paid = paid - ? WHERE id = ?", [voucher.amount, voucher.invoice_id]);
                }
            }
            this.db.run('DELETE FROM vouchers WHERE id = ?', [id]);
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
}


class JournalRepo {
    constructor(db) { this.db = db; }
    getAll() { const entries = this.db.all('SELECT * FROM journal_entries ORDER BY date DESC'); for (const e of entries) e.lines = this.db.all("SELECT jl.*, a.name as account_name, a.code as account_code FROM journal_entry_lines jl LEFT JOIN accounts a ON jl.account_id=a.id WHERE jl.entry_id=?", [e.id]); return entries; }
    create(e) {
        const n = (val) => val === undefined ? null : val;
        try {
            const countResult = this.db.get('SELECT COUNT(*) as count FROM journal_entries');
            const count = countResult ? countResult.count : 0;
            const num = e.entry_number || `JE-${String(count + 1).padStart(6, '0')}`;
            const r = this.db.run("INSERT INTO journal_entries (entry_number, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?)",
                [num, e.date, n(e.description), n(e.reference), n(e.created_by)]);
            const entryId = r.lastInsertRowid;
            for (const line of e.lines || []) {
                this.db.run("INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                    [entryId, line.account_id, n(line.debit) || 0, n(line.credit) || 0, n(line.description)]);
                const change = (line.debit || 0) - (line.credit || 0);
                this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
            }
            return { success: true, id: entryId, entry_number: num };
        } catch (err) { return { success: false, error: err.message }; }
    }
    delete(id) { try { this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [id]); this.db.run('DELETE FROM journal_entries WHERE id = ?', [id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}


class ReportsRepo {
    constructor(db) { this.db = db; }
    accountStatement(accountId, startDate, endDate) {
        const account = this.db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
        let sql = "SELECT jel.id, je.date, je.entry_number, jel.description, jel.debit, jel.credit FROM journal_entry_lines jel JOIN journal_entries je ON jel.entry_id=je.id WHERE jel.account_id=?";
        const params = [accountId];
        if (startDate) { sql += ' AND je.date >= ?'; params.push(startDate); }
        if (endDate) { sql += ' AND je.date <= ?'; params.push(endDate); }
        sql += ' ORDER BY je.date, je.id';
        const transactions = this.db.all(sql, params);
        let balance = 0;
        const statement = transactions.map(t => { balance += (t.debit || 0) - (t.credit || 0); return { ...t, balance }; });
        return { account, statement, opening_balance: 0, closing_balance: balance };
    }
    trialBalance(date) {
        let sql = "SELECT a.id, a.code, a.name, a.account_type, a.nature, COALESCE(SUM(jel.debit),0) as total_debit, COALESCE(SUM(jel.credit),0) as total_credit FROM accounts a LEFT JOIN journal_entry_lines jel ON a.id=jel.account_id LEFT JOIN journal_entries je ON jel.entry_id=je.id";
        if (date) sql += ` WHERE je.date <= ? OR je.date IS NULL`;
        sql += ` GROUP BY a.id ORDER BY a.code`;
        const accounts = date ? this.db.all(sql, [date]) : this.db.all(sql);
        const result = accounts.map(a => ({ ...a, balance: a.total_debit - a.total_credit }));
        const totals = { debit: result.reduce((s, a) => s + Math.max(0, a.balance), 0), credit: result.reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0) };
        return { accounts: result, totals };
    }
    salesReport(startDate, endDate) {
        let sql = "SELECT i.id, i.invoice_number, i.date, i.total, i.status, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id=c.id WHERE i.type='sales'";
        const params = [];
        if (startDate) { sql += ' AND i.date >= ?'; params.push(startDate); }
        if (endDate) { sql += ' AND i.date <= ?'; params.push(endDate); }
        sql += ' ORDER BY i.date DESC';
        const invoices = this.db.all(sql, params);
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }
    purchasesReport(startDate, endDate) {
        let sql = "SELECT i.id, i.invoice_number, i.date, i.total, i.status, s.name as supplier_name FROM invoices i LEFT JOIN suppliers s ON i.supplier_id=s.id WHERE i.type='purchase'";
        const params = [];
        if (startDate) { sql += ' AND i.date >= ?'; params.push(startDate); }
        if (endDate) { sql += ' AND i.date <= ?'; params.push(endDate); }
        sql += ' ORDER BY i.date DESC';
        const invoices = this.db.all(sql, params);
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }
}

class SettingsRepo {
    constructor(db) { this.db = db; }
    get(key) { const s = this.db.get('SELECT value FROM settings WHERE key = ?', [key]); return s ? s.value : null; }
    getAll() { const settings = this.db.all('SELECT key, value, category FROM settings'); const result = {}; for (const s of settings) { if (!result[s.category]) result[s.category] = {}; result[s.category][s.key] = s.value; } return result; }
    set(key, value) { try { this.db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
}

module.exports = new AppDatabase();
