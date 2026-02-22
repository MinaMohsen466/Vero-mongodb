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

            // Add journal_entry_id to invoices
            const hasInvJournal = columns.some(col => col.name === 'journal_entry_id');
            if (!hasInvJournal) {
                this.exec("ALTER TABLE invoices ADD COLUMN journal_entry_id INTEGER");
            }

            // Add journal_entry_id to vouchers
            const hasVchJournal = voucherCols.some(col => col.name === 'journal_entry_id');
            if (!hasVchJournal) {
                this.exec("ALTER TABLE vouchers ADD COLUMN journal_entry_id INTEGER");
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
            ['company_name', 'شركتي', 'company'], ['company_address', '', 'company'], ['company_phone', '', 'company'], ['company_email', '', 'company'], ['company_tax_number', '', 'company'], ['company_logo', '', 'company'],
            ['currency', 'دينار كويتي', 'general'], ['currency_symbol', 'د.ك', 'general'], ['decimal_places', '3', 'general'],
            ['tax_rate', '0', 'tax'], ['theme', 'light', 'appearance'],
            ['invoice_title_sales', 'فاتورة مبيعات', 'invoice'], ['invoice_title_purchase', 'فاتورة مشتريات', 'invoice'],
            ['invoice_footer', 'شكراً لتعاملكم معنا', 'invoice'], ['invoice_terms', '', 'invoice'], ['show_logo', 'yes', 'invoice'], ['show_company_info', 'yes', 'invoice'],
            ['paper_size', 'A4', 'invoice'], ['paper_orientation', 'portrait', 'invoice']
        ];
        for (const [key, value, category] of settings) {
            this.run("INSERT OR IGNORE INTO settings (key, value, category) VALUES (?, ?, ?)", [key, value, category]);
        }

        // Default Permissions
        const permCount = this.get('SELECT COUNT(*) as count FROM permissions');
        if (permCount.count === 0) {
            const modules = ['dashboard', 'customers', 'suppliers', 'products', 'sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers', 'chart_of_accounts', 'cash_bank', 'journal_entries', 'reports', 'settings', 'users', 'permissions'];
            for (const mod of modules) {
                // Admin: full access to everything
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', mod]);
            }
            // Accountant: view most, create/edit on financial modules, no access to users/settings/permissions
            const accountantPerms = {
                dashboard: [1, 0, 0, 0], customers: [1, 1, 1, 0], suppliers: [1, 1, 1, 0], products: [1, 1, 1, 0],
                sales_invoices: [1, 1, 1, 0], purchase_invoices: [1, 1, 1, 0], receipt_vouchers: [1, 1, 1, 0], payment_vouchers: [1, 1, 1, 0],
                chart_of_accounts: [1, 0, 0, 0], cash_bank: [1, 0, 0, 0], journal_entries: [1, 1, 0, 0], reports: [1, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(accountantPerms)) {
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)", ['accountant', mod, v, c, e, d]);
            }
            // User: very limited - only dashboard, sales invoices, receipt vouchers
            const userPerms = {
                dashboard: [1, 0, 0, 0], customers: [0, 0, 0, 0], suppliers: [0, 0, 0, 0], products: [0, 0, 0, 0],
                sales_invoices: [1, 1, 0, 0], purchase_invoices: [0, 0, 0, 0], receipt_vouchers: [1, 1, 0, 0], payment_vouchers: [0, 0, 0, 0],
                chart_of_accounts: [0, 0, 0, 0], cash_bank: [0, 0, 0, 0], journal_entries: [0, 0, 0, 0], reports: [0, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(userPerms)) {
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)", ['user', mod, v, c, e, d]);
            }
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
        this.permissions = new PermissionsRepo(this);
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
        if (user) {
            delete user.password_hash;
            // Attach permissions
            const perms = this.db.all('SELECT * FROM permissions WHERE role = ?', [user.role]);
            const permMap = {};
            for (const p of perms) {
                permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
            }
            user.permissions = permMap;
            return { success: true, user };
        }
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
    _createInvoiceJournalEntry(inv, invId, num) {
        // Build journal entry lines based on invoice type and status
        const total = parseFloat(inv.total) || 0;
        if (total === 0) return null;

        const lines = [];
        const cashAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
        const bankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
        const customersAccount = this.db.get("SELECT id FROM accounts WHERE code = '113'");
        const suppliersAccount = this.db.get("SELECT id FROM accounts WHERE code = '211'");
        const revenueAccount = this.db.get("SELECT id FROM accounts WHERE code = '41'");
        const costAccount = this.db.get("SELECT id FROM accounts WHERE code = '51'");

        if (inv.type === 'sales') {
            // Debit: cash/bank (paid) or customers (pending)
            if (inv.status === 'paid') {
                const debitAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (debitAcct) lines.push({ account_id: debitAcct.id, debit: total, credit: 0, description: `فاتورة مبيعات ${num}` });
            } else {
                if (customersAccount) lines.push({ account_id: customersAccount.id, debit: total, credit: 0, description: `فاتورة مبيعات آجلة ${num}` });
            }
            // Credit: revenue
            if (revenueAccount) lines.push({ account_id: revenueAccount.id, debit: 0, credit: total, description: `فاتورة مبيعات ${num}` });
        } else if (inv.type === 'purchase') {
            // Debit: cost of sales
            if (costAccount) lines.push({ account_id: costAccount.id, debit: total, credit: 0, description: `فاتورة مشتريات ${num}` });
            // Credit: cash/bank (paid) or suppliers (pending)
            if (inv.status === 'paid') {
                const creditAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: total, description: `فاتورة مشتريات ${num}` });
            } else {
                if (suppliersAccount) lines.push({ account_id: suppliersAccount.id, debit: 0, credit: total, description: `فاتورة مشتريات آجلة ${num}` });
            }
        }

        if (lines.length < 2) return null;

        // Create journal entry
        const jeMaxNum = this.db.get("SELECT MAX(CAST(SUBSTR(entry_number, 4) AS INTEGER)) as maxNum FROM journal_entries");
        const jeNextNum = (jeMaxNum?.maxNum || 0) + 1;
        const jeNum = `JE-${String(jeNextNum).padStart(6, '0')}`;
        const jeDesc = inv.type === 'sales' ? `قيد فاتورة مبيعات ${num}` : `قيد فاتورة مشتريات ${num}`;
        const jeR = this.db.run("INSERT INTO journal_entries (entry_number, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?)",
            [jeNum, inv.date, jeDesc, num, inv.created_by || null]);
        const jeId = jeR.lastInsertRowid;

        for (const line of lines) {
            this.db.run("INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                [jeId, line.account_id, line.debit, line.credit, line.description]);
            // Update account balance (debit increases, credit decreases for asset accounts)
            const change = (line.debit || 0) - (line.credit || 0);
            this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
        }

        return jeId;
    }

    _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        // Reverse account balances from journal entry lines
        const lines = this.db.all("SELECT * FROM journal_entry_lines WHERE entry_id = ?", [journalEntryId]);
        for (const line of lines) {
            const change = (line.credit || 0) - (line.debit || 0); // reverse: subtract debits, add credits
            this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
        }
        this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [journalEntryId]);
        this.db.run('DELETE FROM journal_entries WHERE id = ?', [journalEntryId]);
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

            // Insert invoice items
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

                // Update product stock
                if (productId) {
                    const stockChange = inv.type === 'sales' ? -quantity : quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockChange, productId]);
                }
            }

            // Update customer/supplier balance ONLY for pending invoices
            if (inv.status !== 'paid') {
                if (inv.type === 'sales' && inv.customer_id) this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [inv.total, inv.customer_id]);
                else if (inv.type === 'purchase' && inv.supplier_id) this.db.run('UPDATE suppliers SET balance = balance + ? WHERE id = ?', [inv.total, inv.supplier_id]);
            }

            // Auto-create journal entry
            const jeId = this._createInvoiceJournalEntry(inv, invId, num);
            if (jeId) {
                this.db.run('UPDATE invoices SET journal_entry_id = ? WHERE id = ?', [jeId, invId]);
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
                    const stockReverse = oldInvoice.type === 'sales' ? oldItem.quantity : -oldItem.quantity;
                    this.db.run('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [stockReverse, oldItem.product_id]);
                }
            }

            // 2. Reverse old customer/supplier balance (if was pending)
            if (oldInvoice.status !== 'paid') {
                if (oldInvoice.type === 'sales' && oldInvoice.customer_id) {
                    this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [oldInvoice.total, oldInvoice.customer_id]);
                } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
                    this.db.run('UPDATE suppliers SET balance = balance - ? WHERE id = ?', [oldInvoice.total, oldInvoice.supplier_id]);
                }
            }

            // 3. Delete old journal entry (reverses account balances automatically)
            if (oldInvoice.journal_entry_id) {
                this._deleteJournalEntry(oldInvoice.journal_entry_id);
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

            // 7. Create new journal entry
            const jeId = this._createInvoiceJournalEntry({ ...inv, type: oldInvoice.type }, invId, oldInvoice.invoice_number);
            this.db.run('UPDATE invoices SET journal_entry_id = ? WHERE id = ?', [jeId || null, invId]);

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

            // Delete linked journal entry (reverses account balances automatically)
            if (invoice.journal_entry_id) {
                this._deleteJournalEntry(invoice.journal_entry_id);
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

    _createVoucherJournalEntry(v, voucherId, num) {
        const amount = parseFloat(v.amount) || 0;
        if (amount === 0) return null;

        const lines = [];
        const cashAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
        const bankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
        const customersAccount = this.db.get("SELECT id FROM accounts WHERE code = '113'");
        const suppliersAccount = this.db.get("SELECT id FROM accounts WHERE code = '211'");

        const paymentMethod = v.payment_method || 'cash';
        const cashBankAcct = (paymentMethod === 'bank' && bankAccount) ? bankAccount : cashAccount;

        if (v.type === 'receipt') {
            // Receipt: Debit cash/bank, Credit customers
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: amount, credit: 0, description: `سند قبض ${num}` });
            if (customersAccount) lines.push({ account_id: customersAccount.id, debit: 0, credit: amount, description: `سند قبض ${num}` });
        } else if (v.type === 'payment') {
            // Payment: Debit suppliers, Credit cash/bank
            if (suppliersAccount) lines.push({ account_id: suppliersAccount.id, debit: amount, credit: 0, description: `سند صرف ${num}` });
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: 0, credit: amount, description: `سند صرف ${num}` });
        }

        if (lines.length < 2) return null;

        const jeCount = this.db.get('SELECT COUNT(*) as count FROM journal_entries')?.count || 0;
        const jeNum = `JE-${String(jeCount + 1).padStart(6, '0')}`;
        const jeDesc = v.type === 'receipt' ? `قيد سند قبض ${num}` : `قيد سند صرف ${num}`;
        const jeR = this.db.run("INSERT INTO journal_entries (entry_number, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?)",
            [jeNum, v.date, jeDesc, num, v.created_by || null]);
        const jeId = jeR.lastInsertRowid;

        for (const line of lines) {
            this.db.run("INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                [jeId, line.account_id, line.debit, line.credit, line.description]);
            // Update account balance
            const change = (line.debit || 0) - (line.credit || 0);
            this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
        }

        return jeId;
    }

    _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        const lines = this.db.all("SELECT * FROM journal_entry_lines WHERE entry_id = ?", [journalEntryId]);
        for (const line of lines) {
            const change = (line.credit || 0) - (line.debit || 0);
            this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
        }
        this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [journalEntryId]);
        this.db.run('DELETE FROM journal_entries WHERE id = ?', [journalEntryId]);
    }

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

            // Update linked invoice status to paid
            if (v.invoice_id) {
                this.db.run("UPDATE invoices SET status = 'paid', paid = paid + ? WHERE id = ?", [v.amount, v.invoice_id]);
            }

            // Auto-create journal entry
            const jeId = this._createVoucherJournalEntry(v, r.lastInsertRowid, num);
            if (jeId) {
                this.db.run('UPDATE vouchers SET journal_entry_id = ? WHERE id = ?', [jeId, r.lastInsertRowid]);
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

                // Delete linked journal entry (reverses account balances automatically)
                if (voucher.journal_entry_id) {
                    this._deleteJournalEntry(voucher.journal_entry_id);
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
            const maxNum = this.db.get("SELECT MAX(CAST(SUBSTR(entry_number, 4) AS INTEGER)) as maxNum FROM journal_entries");
            const nextNum = (maxNum?.maxNum || 0) + 1;
            const num = e.entry_number || `JE-${String(nextNum).padStart(6, '0')}`;
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
    delete(id) {
        try {
            // Reverse account balances before deleting
            const lines = this.db.all("SELECT * FROM journal_entry_lines WHERE entry_id = ?", [id]);
            for (const line of lines) {
                const change = (line.credit || 0) - (line.debit || 0);
                this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
            }
            this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [id]);
            this.db.run('DELETE FROM journal_entries WHERE id = ?', [id]);
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
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
    getAll() { 
        const settings = this.db.all('SELECT key, value, category FROM settings'); 
        console.log('[SettingsRepo.getAll] Raw settings from DB:', settings);
        const result = {}; 
        for (const s of settings) { 
            if (!result[s.category]) result[s.category] = {}; 
            result[s.category][s.key] = s.value; 
        } 
        console.log('[SettingsRepo.getAll] Formatted result:', result);
        return result; 
    }
    
    set(key, value) { 
        try { 
            // Determine category based on key prefix
            let category = 'general';
            if (key.startsWith('company_')) category = 'company';
            else if (key.startsWith('invoice_') || key.startsWith('show_') || key.startsWith('paper_') || key.startsWith('thank_')) category = 'invoice';
            else if (key === 'tax_rate') category = 'tax';
            
            // Check if key exists
            const existing = this.db.get('SELECT id FROM settings WHERE key = ?', [key]);
            if (existing) {
                // Update if exists
                this.db.run('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
            } else {
                // Insert if doesn't exist
                this.db.run('INSERT INTO settings (key, value, category) VALUES (?, ?, ?)', [key, value, category]);
            }
            return { success: true }; 
        } catch (e) { 
            console.error('Settings save error:', e);
            return { success: false, error: e.message }; 
        } 
    }
}

class PermissionsRepo {
    constructor(db) { this.db = db; }
    getByRole(role) {
        const perms = this.db.all('SELECT * FROM permissions WHERE role = ?', [role]);
        const result = {};
        for (const p of perms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return result;
    }
    savePermissions(role, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                const existing = this.db.get('SELECT id FROM permissions WHERE role = ? AND module = ?', [role, module]);
                if (existing) {
                    this.db.run('UPDATE permissions SET can_view=?, can_create=?, can_edit=?, can_delete=? WHERE role=? AND module=?',
                        [actions.can_view ? 1 : 0, actions.can_create ? 1 : 0, actions.can_edit ? 1 : 0, actions.can_delete ? 1 : 0, role, module]);
                } else {
                    this.db.run('INSERT INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
                        [role, module, actions.can_view ? 1 : 0, actions.can_create ? 1 : 0, actions.can_edit ? 1 : 0, actions.can_delete ? 1 : 0]);
                }
            }
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
}

module.exports = new AppDatabase();
