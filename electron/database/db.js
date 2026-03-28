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
        const configPath = path.join(userDataPath, 'vero-config.json');

        // Read custom db path from config if it exists
        let customDbPath = null;
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.dbPath && fs.existsSync(config.dbPath)) {
                    customDbPath = config.dbPath;
                }
            }
        } catch (e) { /* ignore config errors */ }

        this.dbPath = customDbPath || path.join(userDataPath, 'accapp.db');
        this.configPath = configPath;

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
      CREATE TABLE IF NOT EXISTS user_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, module TEXT NOT NULL, can_view INTEGER DEFAULT 1, can_create INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0, can_delete INTEGER DEFAULT 0, UNIQUE(user_id, module), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_number TEXT, balance REAL DEFAULT 0, credit_limit REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT, tax_number TEXT, balance REAL DEFAULT 0, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, parent_id INTEGER, account_type TEXT NOT NULL, nature TEXT NOT NULL, balance REAL DEFAULT 0, is_active INTEGER DEFAULT 1, can_post INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (parent_id) REFERENCES accounts(id));
      CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, description TEXT, unit TEXT DEFAULT 'قطعة', category TEXT, purchase_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, stock_quantity REAL DEFAULT 0, min_stock REAL DEFAULT 0, image TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_number TEXT UNIQUE NOT NULL, type TEXT NOT NULL, customer_id INTEGER, supplier_id INTEGER, date TEXT NOT NULL, due_date TEXT, subtotal REAL DEFAULT 0, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL DEFAULT 0, paid REAL DEFAULT 0, status TEXT DEFAULT 'pending', payment_method TEXT DEFAULT 'cash', payment_account_id INTEGER, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS invoice_items (id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id INTEGER NOT NULL, product_id INTEGER, description TEXT, quantity REAL NOT NULL, unit_price REAL NOT NULL, discount REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL NOT NULL, FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS vouchers (id INTEGER PRIMARY KEY AUTOINCREMENT, voucher_number TEXT UNIQUE NOT NULL, type TEXT NOT NULL, date TEXT NOT NULL, amount REAL NOT NULL, account_id INTEGER, customer_id INTEGER, supplier_id INTEGER, payment_method TEXT DEFAULT 'cash', invoice_id INTEGER, reference TEXT, description TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS journal_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_number TEXT UNIQUE NOT NULL, date TEXT NOT NULL, description TEXT, reference TEXT, is_posted INTEGER DEFAULT 0, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS journal_entry_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, entry_id INTEGER NOT NULL, account_id INTEGER NOT NULL, debit REAL DEFAULT 0, credit REAL DEFAULT 0, description TEXT, FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT, category TEXT DEFAULT 'general');
      CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, job_title TEXT, department TEXT, hire_date TEXT, base_salary REAL DEFAULT 0, phone TEXT, email TEXT, national_id TEXT, address TEXT, account_id INTEGER, bank_account TEXT, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (account_id) REFERENCES accounts(id));
      CREATE TABLE IF NOT EXISTS employee_leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER NOT NULL, reason TEXT, status TEXT DEFAULT 'pending', approved_by INTEGER, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
      CREATE TABLE IF NOT EXISTS employee_deductions (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month TEXT NOT NULL, amount REAL NOT NULL, reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
      CREATE TABLE IF NOT EXISTS salary_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, payment_number TEXT UNIQUE NOT NULL, employee_id INTEGER NOT NULL, month TEXT NOT NULL, base_salary REAL DEFAULT 0, deductions REAL DEFAULT 0, net_salary REAL DEFAULT 0, payment_method TEXT DEFAULT 'cash', payment_account_id INTEGER, journal_entry_id INTEGER, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
      CREATE TABLE IF NOT EXISTS rent_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, payment_number TEXT UNIQUE NOT NULL, month TEXT NOT NULL, amount REAL NOT NULL, description TEXT, payment_method TEXT DEFAULT 'cash', payment_account_id INTEGER, journal_entry_id INTEGER, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
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

            // Check products for image
            const productCols = this.all("PRAGMA table_info(products)");
            const hasImage = productCols.some(col => col.name === 'image');
            if (!hasImage) {
                this.exec("ALTER TABLE products ADD COLUMN image TEXT");
            }
        } catch (e) {
            console.log('Migration check:', e.message);
        }

        // Migration: add user_permissions table for per-user individual permissions
        try {
            const upCols = this.all("PRAGMA table_info(user_permissions)");
            if (upCols.length === 0) {
                this.exec(`CREATE TABLE IF NOT EXISTS user_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, module TEXT NOT NULL, can_view INTEGER DEFAULT 1, can_create INTEGER DEFAULT 0, can_edit INTEGER DEFAULT 0, can_delete INTEGER DEFAULT 0, UNIQUE(user_id, module), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE)`);
            }
        } catch (e) { console.log('user_permissions migration:', e.message); }

        // HR migrations - fix incompatible employees table
        try {
            const empCols = this.all("PRAGMA table_info(employees)");
            if (empCols.length > 0) {
                // Check if it has the 'name' column - if not, table is old/incompatible
                const hasName = empCols.some(c => c.name === 'name');
                if (!hasName) {
                    console.log('HR Migration: dropping incompatible employees table and recreating...');
                    this.db.exec('DROP TABLE IF EXISTS employee_leaves');
                    this.db.exec('DROP TABLE IF EXISTS employee_deductions');
                    this.db.exec('DROP TABLE IF EXISTS salary_payments');
                    this.db.exec('DROP TABLE IF EXISTS employees');
                    this.db.exec(`
                        CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, name TEXT NOT NULL, job_title TEXT, department TEXT, hire_date TEXT, base_salary REAL DEFAULT 0, phone TEXT, email TEXT, national_id TEXT, address TEXT, account_id INTEGER, bank_account TEXT, notes TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (account_id) REFERENCES accounts(id));
                        CREATE TABLE IF NOT EXISTS employee_leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, leave_type TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, days INTEGER NOT NULL, reason TEXT, status TEXT DEFAULT 'pending', approved_by INTEGER, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
                        CREATE TABLE IF NOT EXISTS employee_deductions (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, month TEXT NOT NULL, amount REAL NOT NULL, reason TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
                        CREATE TABLE IF NOT EXISTS salary_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, payment_number TEXT UNIQUE NOT NULL, employee_id INTEGER NOT NULL, month TEXT NOT NULL, base_salary REAL DEFAULT 0, deductions REAL DEFAULT 0, net_salary REAL DEFAULT 0, payment_method TEXT DEFAULT 'cash', payment_account_id INTEGER, journal_entry_id INTEGER, notes TEXT, created_by INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES employees(id));
                    `);
                    this.save();
                }
            }
        } catch (e) {
            console.log('HR Migration:', e.message);
        }
    }

    seedDefaultData() {
        // Admin user
        const admin = this.get('SELECT id FROM users WHERE username = ?', ['admin']);
        if (!admin) this.run("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)", ['admin', 'password123', 'مدير النظام', 'admin']);

        // Accounts
        const count = this.get('SELECT COUNT(*) as count FROM accounts');
        if (count.count === 0) {
            const accs = [
                ['1', 'الأصول', null, 'asset', 'debit'], ['2', 'الخصوم', null, 'liability', 'credit'], ['3', 'حقوق الملكية', null, 'equity', 'credit'], ['4', 'الإيرادات', null, 'revenue', 'credit'], ['5', 'المصروفات', null, 'expense', 'debit'],
                ['11', 'الأصول المتداولة', '1', 'asset', 'debit'], ['111', 'الصندوق', '11', 'asset', 'debit'], ['112', 'البنك', '11', 'asset', 'debit'], ['113', 'العملاء', '11', 'asset', 'debit'],
                ['21', 'الخصوم المتداولة', '2', 'liability', 'credit'], ['211', 'الموردون', '21', 'liability', 'credit'],
                ['41', 'إيرادات المبيعات', '4', 'revenue', 'credit'], ['51', 'تكلفة المبيعات', '5', 'expense', 'debit'],
                ['52', 'مصروفات الرواتب', '5', 'expense', 'debit'],
                ['521', 'رواتب الموظفين', '52', 'expense', 'debit'],
                ['53', 'مصروفات الإيجار', '5', 'expense', 'debit']
            ];
            for (const [code, name, parent, type, nature] of accs) {
                const parentId = parent ? this.get('SELECT id FROM accounts WHERE code = ?', [parent])?.id : null;
                this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)", [code, name, parentId, type, nature]);
            }
        } else {
            // Ensure salaries accounts exist for existing databases
            const salaryMain = this.get("SELECT id FROM accounts WHERE code = '52'");
            if (!salaryMain) {
                const expenseParent = this.get("SELECT id FROM accounts WHERE code = '5'");
                const r = this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['52', 'مصروفات الرواتب', expenseParent?.id || null, 'expense', 'debit']);
                const salaryMainId = r.lastInsertRowid;
                this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['521', 'رواتب الموظفين', salaryMainId, 'expense', 'debit']);
            } else {
                const salaryChildren = this.get("SELECT id FROM accounts WHERE code = '521'");
                if (!salaryChildren) {
                    this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                        ['521', 'رواتب الموظفين', salaryMain.id, 'expense', 'debit']);
                }
            }
            // Ensure rent expense account exists
            const rentMain = this.get("SELECT id FROM accounts WHERE code = '53'");
            if (!rentMain) {
                const expenseParent = this.get("SELECT id FROM accounts WHERE code = '5'");
                this.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['53', 'مصروفات الإيجار', expenseParent?.id || null, 'expense', 'debit']);
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
            const modules = ['dashboard', 'customers', 'suppliers', 'products', 'sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers', 'chart_of_accounts', 'cash_bank', 'journal_entries', 'reports', 'settings', 'users', 'permissions', 'hr', 'pos', 'database', 'financial_summary'];
            for (const mod of modules) {
                // Admin: full access to everything
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', mod]);
            }
            // Accountant: view most, create/edit on financial modules, no access to users/settings/permissions
            const accountantPerms = {
                dashboard: [1, 0, 0, 0], customers: [1, 1, 1, 0], suppliers: [1, 1, 1, 0], products: [1, 1, 1, 0],
                sales_invoices: [1, 1, 1, 0], purchase_invoices: [1, 1, 1, 0], receipt_vouchers: [1, 1, 1, 0], payment_vouchers: [1, 1, 1, 0],
                chart_of_accounts: [1, 0, 0, 0], cash_bank: [1, 0, 0, 0], journal_entries: [1, 1, 0, 0], reports: [1, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0], hr: [1, 1, 1, 0], pos: [1, 1, 1, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(accountantPerms)) {
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)", ['accountant', mod, v, c, e, d]);
            }
            // User: very limited - only dashboard, sales invoices, receipt vouchers
            const userPerms = {
                dashboard: [1, 0, 0, 0], customers: [0, 0, 0, 0], suppliers: [0, 0, 0, 0], products: [0, 0, 0, 0],
                sales_invoices: [1, 1, 0, 0], purchase_invoices: [0, 0, 0, 0], receipt_vouchers: [1, 1, 0, 0], payment_vouchers: [0, 0, 0, 0],
                chart_of_accounts: [0, 0, 0, 0], cash_bank: [0, 0, 0, 0], journal_entries: [0, 0, 0, 0], reports: [0, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0], hr: [0, 0, 0, 0], pos: [1, 1, 1, 0], database: [0, 0, 0, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(userPerms)) {
                this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)", ['user', mod, v, c, e, d]);
            }
        } else {
            // Migration: add hr permission for existing admins
            try {
                const adminHr = this.get("SELECT id FROM permissions WHERE role='admin' AND module='hr'");
                if (!adminHr) {
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', 'hr']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 0)", ['accountant', 'hr']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 0, 0, 0, 0)", ['user', 'hr']);
                }
                // Ensure pos permission exists for existing databases
                const adminPos = this.get("SELECT id FROM permissions WHERE role='admin' AND module='pos'");
                if (!adminPos) {
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', 'pos']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 0)", ['accountant', 'pos']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 0)", ['user', 'pos']);
                }
            } catch (e) { console.log('HR permission migration:', e.message); }

            // Migration: add database permission for existing users
            try {
                const adminDb = this.get("SELECT id FROM permissions WHERE role='admin' AND module='database'");
                if (!adminDb) {
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', 'database']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 0, 0, 0, 0)", ['accountant', 'database']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 0, 0, 0, 0)", ['user', 'database']);
                }
            } catch (e) { console.log('Database permission migration:', e.message); }

            // Migration: add financial_summary permission for existing users
            try {
                const adminFs = this.get("SELECT id FROM permissions WHERE role='admin' AND module='financial_summary'");
                if (!adminFs) {
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)", ['admin', 'financial_summary']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 0, 0, 0)", ['accountant', 'financial_summary']);
                    this.run("INSERT OR IGNORE INTO permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 0, 0, 0, 0)", ['user', 'financial_summary']);
                }
            } catch (e) { console.log('Financial summary permission migration:', e.message); }
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
        this.employees = new EmployeesRepo(this);
        this.salaries = new SalaryRepo(this);
        this.leaves = new LeavesRepo(this);
        this.deductions = new DeductionsRepo(this);
        this.rent = new RentRepo(this);
        this.system = new SystemRepo(this);
    }

    backup() {
        const backupPath = path.join(this.app.getPath('documents'), `accapp_backup_${Date.now()}.db`);
        const data = this.db.export();
        fs.writeFileSync(backupPath, Buffer.from(data));
        return { success: true, path: backupPath };
    }

    backupToPath(destPath) {
        try {
            const data = this.db.export();
            fs.writeFileSync(destPath, Buffer.from(data));
            return { success: true, path: destPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    getDbPath() {
        return this.dbPath;
    }

    changeDbPath(newFolderPath) {
        try {
            const newDbPath = path.join(newFolderPath, 'accapp.db');
            // Save current db to new location
            const data = this.db.export();
            fs.writeFileSync(newDbPath, Buffer.from(data));
            // Write config to persist the new path
            fs.writeFileSync(this.configPath, JSON.stringify({ dbPath: newDbPath }, null, 2));
            return { success: true, path: newDbPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    vacuum() {
        try {
            this.db.exec("VACUUM");
            this.save();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class UsersRepo {
    constructor(db) { this.db = db; }
    login(username, password) {
        const user = this.db.get('SELECT * FROM users WHERE username = ? AND password_hash = ? AND is_active = 1', [username, password]);
        if (user) {
            delete user.password_hash;
            // Admins (company managers) always have full permissions — hardcoded
            if (user.role === 'admin') {
                const permMap = {};
                const modules = ['dashboard', 'customers', 'suppliers', 'products', 'sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers', 'chart_of_accounts', 'cash_bank', 'journal_entries', 'reports', 'settings', 'users', 'permissions', 'hr', 'pos', 'financial_summary', 'database'];
                for (const mod of modules) permMap[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                user.permissions = permMap;
                return { success: true, user };
            }
            // Non-admin: load role-based permissions
            const rolePerms = this.db.all('SELECT * FROM permissions WHERE role = ?', [user.role]);
            const permMap = {};
            for (const p of rolePerms) {
                permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
            }
            // Check for individual permissions override
            const hasIndividual = this.db.get('SELECT COUNT(*) as count FROM user_permissions WHERE user_id = ?', [user.id]);
            if (hasIndividual && hasIndividual.count > 0) {
                const userPerms = this.db.all('SELECT * FROM user_permissions WHERE user_id = ?', [user.id]);
                for (const p of userPerms) {
                    permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
                }
                user.has_individual_permissions = true;
            }
            user.permissions = permMap;
            return { success: true, user };
        }
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    getAll() { return this.db.all('SELECT id, username, full_name, role, is_active, created_at FROM users'); }
    create(user) { try { const r = this.db.run("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)", [user.username, user.password, user.full_name, user.role || 'user']); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(user) {
        try {
            if (user.password) {
                if (user.current_password !== undefined) {
                    const existing = this.db.get('SELECT password_hash FROM users WHERE id = ?', [user.id]);
                    if (!existing || existing.password_hash !== user.current_password) {
                        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
                    }
                }
                this.db.run("UPDATE users SET username=?, password_hash=?, full_name=?, role=?, is_active=? WHERE id=?", [user.username, user.password, user.full_name, user.role, user.is_active ? 1 : 0, user.id]);
            } else {
                this.db.run("UPDATE users SET username=?, full_name=?, role=?, is_active=? WHERE id=?", [user.username, user.full_name, user.role, user.is_active ? 1 : 0, user.id]);
            }
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
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
    create(p) { try { const count = this.db.get('SELECT COUNT(*) as count FROM products').count; const code = p.code || `P${String(count + 1).padStart(4, '0')}`; const r = this.db.run("INSERT INTO products (code, name, description, unit, category, purchase_price, sale_price, stock_quantity, min_stock, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [code, p.name, p.description, p.unit, p.category, p.purchase_price || 0, p.sale_price || 0, p.stock_quantity || 0, p.min_stock || 0, p.image || null]); return { success: true, id: r.lastInsertRowid }; } catch (e) { return { success: false, error: e.message }; } }
    update(p) { try { this.db.run("UPDATE products SET name=?, description=?, unit=?, category=?, purchase_price=?, sale_price=?, stock_quantity=?, min_stock=?, image=?, is_active=? WHERE id=?", [p.name, p.description, p.unit, p.category, p.purchase_price, p.sale_price, p.stock_quantity, p.min_stock, p.image || null, p.is_active ? 1 : 0, p.id]); return { success: true }; } catch (e) { return { success: false, error: e.message }; } }
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

            // Update linked invoice paid amount
            if (v.invoice_id) {
                this.db.run("UPDATE invoices SET paid = paid + ? WHERE id = ?", [v.amount, v.invoice_id]);
                // Smart status: check if fully paid, partially paid, or still pending
                const inv = this.db.get("SELECT total, paid FROM invoices WHERE id = ?", [v.invoice_id]);
                if (inv) {
                    const newStatus = inv.paid >= inv.total ? 'paid' : inv.paid > 0 ? 'partial' : 'pending';
                    this.db.run("UPDATE invoices SET status = ? WHERE id = ?", [newStatus, v.invoice_id]);
                }
            }

            // Auto-create journal entry
            const jeId = this._createVoucherJournalEntry(v, r.lastInsertRowid, num);
            if (jeId) {
                this.db.run('UPDATE vouchers SET journal_entry_id = ? WHERE id = ?', [jeId, r.lastInsertRowid]);
            }

            // If this voucher fully paid an invoice that has an installment plan, complete the plan
            if (v.invoice_id && v.type === 'receipt') {
                const invAfter = this.db.get('SELECT total, paid FROM invoices WHERE id = ?', [v.invoice_id]);
                if (invAfter && invAfter.paid >= invAfter.total) {
                    // Find any active installment plan linked to this invoice
                    const linkedPlan = this.db.get("SELECT * FROM installment_plans WHERE invoice_id = ? AND status != 'completed'", [v.invoice_id]);
                    if (linkedPlan) {
                        // Mark all pending payments as completed
                        const pendingPayments = this.db.all("SELECT * FROM installment_payments WHERE plan_id = ? AND status = 'pending'", [linkedPlan.id]);
                        for (const pmt of pendingPayments) {
                            // Reverse customer balance that was pre-charged for pending installments
                            if (linkedPlan.customer_id) {
                                // Don't double-deduct: the voucher already reduced customer balance
                                // Just mark installment as complete without touching balance again
                            }
                            this.db.run(
                                "UPDATE installment_payments SET status = 'paid', paid_date = ?, payment_method = ?, notes = ? WHERE id = ?",
                                [v.date, v.payment_method || 'cash', 'مدفوع عبر سند قبض ' + num, pmt.id]
                            );
                        }
                        this.db.run("UPDATE installment_plans SET status = 'completed' WHERE id = ?", [linkedPlan.id]);
                    }
                }
            }

            return { success: true, id: r.lastInsertRowid, voucher_number: num };
        } catch (e) { return { success: false, error: e.message }; }
    }
    update(v) {
        const n = (val) => val === undefined ? null : val;
        try {
            // Get old voucher to reverse effects
            const old = this.getById(v.id);
            if (!old) return { success: false, error: 'Voucher not found' };

            // 1. Reverse old customer/supplier balance
            if (old.type === 'receipt' && old.customer_id) {
                this.db.run('UPDATE customers SET balance = balance + ? WHERE id = ?', [old.amount, old.customer_id]);
            } else if (old.type === 'payment' && old.supplier_id) {
                this.db.run('UPDATE suppliers SET balance = balance + ? WHERE id = ?', [old.amount, old.supplier_id]);
            }

            // 2. Reverse old invoice paid amount if linked
            if (old.invoice_id) {
                this.db.run("UPDATE invoices SET status = 'pending', paid = CASE WHEN paid - ? < 0 THEN 0 ELSE paid - ? END WHERE id = ?",
                    [old.amount, old.amount, old.invoice_id]);
            }

            // 3. Delete old journal entry (also reverses account balances)
            if (old.journal_entry_id) {
                this._deleteJournalEntry(old.journal_entry_id);
            }

            // 4. Update the voucher record
            this.db.run("UPDATE vouchers SET date=?, amount=?, payment_method=?, reference=?, description=?, journal_entry_id=NULL WHERE id=?",
                [v.date, n(v.amount) || 0, n(v.payment_method) || 'cash', n(v.reference), n(v.description), v.id]);

            // Re-read the voucher with updated values to build journal entry
            const amount = parseFloat(v.amount) || 0;

            // 5. Apply new customer/supplier balance
            if (old.type === 'receipt' && old.customer_id) {
                this.db.run('UPDATE customers SET balance = balance - ? WHERE id = ?', [amount, old.customer_id]);
            } else if (old.type === 'payment' && old.supplier_id) {
                this.db.run('UPDATE suppliers SET balance = balance - ? WHERE id = ?', [amount, old.supplier_id]);
            }

            // 6. Re-apply linked invoice paid amount if linked
            if (old.invoice_id) {
                this.db.run("UPDATE invoices SET paid = paid + ? WHERE id = ?", [amount, old.invoice_id]);
                // Smart status: check if fully paid, partially paid, or still pending
                const inv = this.db.get("SELECT total, paid FROM invoices WHERE id = ?", [old.invoice_id]);
                if (inv) {
                    const newStatus = inv.paid >= inv.total ? 'paid' : inv.paid > 0 ? 'partial' : 'pending';
                    this.db.run("UPDATE invoices SET status = ? WHERE id = ?", [newStatus, old.invoice_id]);
                }
            }

            // 7. Create new journal entry
            const newVoucher = { ...old, amount, payment_method: v.payment_method || 'cash', date: v.date };
            const jeId = this._createVoucherJournalEntry(newVoucher, v.id, old.voucher_number);
            if (jeId) {
                this.db.run('UPDATE vouchers SET journal_entry_id = ? WHERE id = ?', [jeId, v.id]);
            }

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
                    this.db.run("UPDATE invoices SET paid = CASE WHEN paid - ? < 0 THEN 0 ELSE paid - ? END WHERE id = ?", [voucher.amount, voucher.amount, voucher.invoice_id]);
                    // Smart status: check remaining paid amount
                    const inv = this.db.get("SELECT total, paid FROM invoices WHERE id = ?", [voucher.invoice_id]);
                    if (inv) {
                        const newStatus = inv.paid >= inv.total ? 'paid' : inv.paid > 0 ? 'partial' : 'pending';
                        this.db.run("UPDATE invoices SET status = ? WHERE id = ?", [newStatus, voucher.invoice_id]);
                    }
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
        const totals = { debit: result.reduce((s, a) => s + a.total_debit, 0), credit: result.reduce((s, a) => s + a.total_credit, 0) };
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

    set(category, key, value) {
        try {
            // Check if key exists
            const existing = this.db.get('SELECT id FROM settings WHERE key = ?', [key]);
            if (existing) {
                // Update if exists
                this.db.run('UPDATE settings SET value = ?, category = ? WHERE key = ?', [value, category, key]);
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

    // --- Role-based permissions ---
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

    // --- Per-user individual permissions ---
    getUserPermissions(userId) {
        const userPerms = this.db.all('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
        if (userPerms.length === 0) {
            // No individual perms set — return empty object (will use role defaults)
            return { hasIndividual: false, permissions: {} };
        }
        const result = {};
        for (const p of userPerms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return { hasIndividual: true, permissions: result };
    }

    saveUserPermissions(userId, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                const existing = this.db.get('SELECT id FROM user_permissions WHERE user_id = ? AND module = ?', [userId, module]);
                if (existing) {
                    this.db.run('UPDATE user_permissions SET can_view=?, can_create=?, can_edit=?, can_delete=? WHERE user_id=? AND module=?',
                        [actions.can_view ? 1 : 0, actions.can_create ? 1 : 0, actions.can_edit ? 1 : 0, actions.can_delete ? 1 : 0, userId, module]);
                } else {
                    this.db.run('INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
                        [userId, module, actions.can_view ? 1 : 0, actions.can_create ? 1 : 0, actions.can_edit ? 1 : 0, actions.can_delete ? 1 : 0]);
                }
            }
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }

    clearUserPermissions(userId) {
        try {
            this.db.run('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
            return { success: true };
        } catch (e) { return { success: false, error: e.message }; }
    }
}

// ==================== HR Repositories ====================

class EmployeesRepo {
    constructor(db) { this.db = db; }

    getAll() {
        return this.db.all(`
            SELECT e.*, a.name as account_name, a.code as account_code
            FROM employees e
            LEFT JOIN accounts a ON e.account_id = a.id
            ORDER BY e.name
        `);
    }

    getById(id) {
        return this.db.get(`
            SELECT e.*, a.name as account_name, a.code as account_code
            FROM employees e
            LEFT JOIN accounts a ON e.account_id = a.id
            WHERE e.id = ?
        `, [id]);
    }

    create(emp) {
        try {
            const count = this.db.get('SELECT COUNT(*) as count FROM employees').count;

            // Unique employee code
            let empNum = count + 1;
            let code = emp.code;
            if (!code) {
                do {
                    code = `EMP${String(empNum).padStart(4, '0')}`;
                    if (!this.db.get('SELECT id FROM employees WHERE code = ?', [code])) break;
                    empNum++;
                } while (empNum < count + 200);
            }

            // Ensure salary parent account exists - ALWAYS query after INSERT OR IGNORE
            let mainSalary = this.db.get("SELECT id FROM accounts WHERE code = '52'");
            if (!mainSalary) {
                const expParent = this.db.get("SELECT id FROM accounts WHERE code = '5'");
                this.db.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['52', 'مصروفات الرواتب', expParent?.id || null, 'expense', 'debit']);
                mainSalary = this.db.get("SELECT id FROM accounts WHERE code = '52'");
            }

            let salaryParent = this.db.get("SELECT id FROM accounts WHERE code = '521'");
            if (!salaryParent) {
                this.db.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['521', 'رواتب الموظفين', mainSalary?.id || null, 'expense', 'debit']);
                salaryParent = this.db.get("SELECT id FROM accounts WHERE code = '521'");
            }

            // Generate UNIQUE account code (avoid UNIQUE constraint failure)
            let suffix = empNum;
            let empAccountCode;
            do {
                empAccountCode = `521${String(suffix).padStart(4, '0')}`;
                if (!this.db.get('SELECT id FROM accounts WHERE code = ?', [empAccountCode])) break;
                suffix++;
            } while (suffix < empNum + 500);

            const empAccountName = `راتب ${emp.name}`;
            const accResult = this.db.run(
                "INSERT INTO accounts (code, name, parent_id, account_type, nature, can_post) VALUES (?, ?, ?, ?, ?, ?)",
                [empAccountCode, empAccountName, salaryParent?.id || null, 'expense', 'debit', 1]
            );
            const accountId = accResult.lastInsertRowid;

            const r = this.db.run(
                "INSERT INTO employees (code, name, job_title, department, hire_date, base_salary, phone, email, national_id, address, account_id, bank_account, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [code, emp.name, emp.job_title || '', emp.department || '', emp.hire_date || '', emp.base_salary || 0,
                    emp.phone || '', emp.email || '', emp.national_id || '', emp.address || '',
                    accountId, emp.bank_account || '', emp.notes || '']
            );
            return { success: true, id: r.lastInsertRowid, account_id: accountId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    update(emp) {
        try {
            this.db.run(
                "UPDATE employees SET name=?, job_title=?, department=?, hire_date=?, base_salary=?, phone=?, email=?, national_id=?, address=?, bank_account=?, notes=?, is_active=? WHERE id=?",
                [emp.name, emp.job_title || '', emp.department || '', emp.hire_date || '', emp.base_salary || 0, emp.phone || '', emp.email || '', emp.national_id || '', emp.address || '', emp.bank_account || '', emp.notes || '', emp.is_active ? 1 : 0, emp.id]
            );
            // Update linked account name
            if (emp.account_id) {
                this.db.run("UPDATE accounts SET name=? WHERE id=?", [`راتب ${emp.name}`, emp.account_id]);
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    delete(id) {
        try {
            const emp = this.getById(id);
            if (!emp) return { success: false, error: 'الموظف غير موجود' };
            // Check if has salary payments
            const salaries = this.db.get('SELECT COUNT(*) as count FROM salary_payments WHERE employee_id = ?', [id]);
            if (salaries.count > 0) return { success: false, error: 'لا يمكن حذف موظف لديه مدفوعات رواتب' };
            this.db.run('DELETE FROM employees WHERE id = ?', [id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    getSummary(id) {
        const emp = this.getById(id);
        if (!emp) return null;
        const leaves = this.db.all("SELECT * FROM employee_leaves WHERE employee_id = ? ORDER BY start_date DESC", [id]);
        const deductions = this.db.all("SELECT * FROM employee_deductions WHERE employee_id = ? ORDER BY created_at DESC", [id]);
        const salaries = this.db.all("SELECT * FROM salary_payments WHERE employee_id = ? ORDER BY month DESC", [id]);
        return { employee: emp, leaves, deductions, salaries };
    }
}

class SalaryRepo {
    constructor(db) { this.db = db; }

    getAll() {
        return this.db.all(`
            SELECT sp.*, e.name as employee_name, e.job_title, e.department,
                   a.name as payment_account_name
            FROM salary_payments sp
            LEFT JOIN employees e ON sp.employee_id = e.id
            LEFT JOIN accounts a ON sp.payment_account_id = a.id
            ORDER BY sp.created_at DESC
        `);
    }

    getByEmployee(employeeId) {
        return this.db.all(
            "SELECT * FROM salary_payments WHERE employee_id = ? ORDER BY month DESC",
            [employeeId]
        );
    }

    pay(payment) {
        const n = (v) => v === undefined ? null : v;
        try {
            const count = this.db.get('SELECT COUNT(*) as count FROM salary_payments').count;
            const payNum = `SAL-${String(count + 1).padStart(6, '0')}`;

            const emp = this.db.get('SELECT * FROM employees WHERE id = ?', [payment.employee_id]);
            if (!emp) return { success: false, error: 'الموظف غير موجود' };

            // Check if already paid for this month
            const existing = this.db.get(
                "SELECT id FROM salary_payments WHERE employee_id = ? AND month = ?",
                [payment.employee_id, payment.month]
            );
            if (existing) return { success: false, error: 'تم صرف راتب هذا الشهر مسبقاً' };

            // Get deductions for this month
            const monthDeductions = this.db.get(
                "SELECT COALESCE(SUM(amount), 0) as total FROM employee_deductions WHERE employee_id = ? AND month = ?",
                [payment.employee_id, payment.month]
            );
            const totalDeductions = n(payment.deductions) || monthDeductions?.total || 0;
            const baseSalary = n(payment.base_salary) || emp.base_salary || 0;
            const netSalary = parseFloat(baseSalary) - parseFloat(totalDeductions);

            // Get payment accounts
            const cashAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
            const bankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
            let paymentAccountId = n(payment.payment_account_id);
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            // Employee salary account
            const empAccount = emp.account_id;

            // Create journal entry: Debit salary expense, Credit cash/bank
            // Use MAX id+1 to avoid UNIQUE constraint conflicts with existing/deleted entries
            let jeNum;
            let jeAttempt = 0;
            do {
                const maxJe = this.db.get("SELECT COALESCE(MAX(CAST(REPLACE(entry_number,'JE-','') AS INTEGER)),0) as mx FROM journal_entries");
                const nextNum = (maxJe?.mx || 0) + 1 + jeAttempt;
                jeNum = `JE-${String(nextNum).padStart(6, '0')}`;
                const jeExists = this.db.get('SELECT id FROM journal_entries WHERE entry_number = ?', [jeNum]);
                if (!jeExists) break;
                jeAttempt++;
            } while (jeAttempt < 100);

            const jeDesc = `قيد راتب ${emp.name} - ${payment.month}`;
            const jeR = this.db.run(
                "INSERT INTO journal_entries (entry_number, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?)",
                [jeNum, payment.date || new Date().toISOString().split('T')[0], jeDesc, payNum, n(payment.created_by)]
            );
            const jeId = jeR.lastInsertRowid;

            // Line 1: Debit employee salary account (expense)
            if (empAccount) {
                this.db.run(
                    "INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                    [jeId, empAccount, netSalary, 0, `راتب ${emp.name} - ${payment.month}`]
                );
                this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [netSalary, empAccount]);
            }

            // Line 2: Credit cash/bank account
            if (paymentAccountId) {
                this.db.run(
                    "INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                    [jeId, paymentAccountId, 0, netSalary, `صرف راتب ${emp.name} - ${payment.month}`]
                );
                this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [netSalary, paymentAccountId]);
            }

            // Save salary payment record
            const r = this.db.run(
                "INSERT INTO salary_payments (payment_number, employee_id, month, base_salary, deductions, net_salary, payment_method, payment_account_id, journal_entry_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [payNum, payment.employee_id, payment.month, baseSalary, totalDeductions, netSalary,
                    n(payment.payment_method) || 'cash', n(paymentAccountId), jeId, n(payment.notes), n(payment.created_by)]
            );

            return { success: true, id: r.lastInsertRowid, payment_number: payNum, net_salary: netSalary };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    getTotal(startDate, endDate) {
        try {
            let sql = 'SELECT COALESCE(SUM(net_salary), 0) as total FROM salary_payments WHERE 1=1';
            const params = [];
            if (startDate) { sql += ' AND created_at >= ?'; params.push(startDate); }
            if (endDate) { sql += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }
            const r = this.db.get(sql, params);
            return r?.total || 0;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    delete(id) {
        try {
            const payment = this.db.get('SELECT * FROM salary_payments WHERE id = ?', [id]);
            if (!payment) return { success: false, error: 'السجل غير موجود' };

            // Reverse journal entry
            if (payment.journal_entry_id) {
                const lines = this.db.all('SELECT * FROM journal_entry_lines WHERE entry_id = ?', [payment.journal_entry_id]);
                for (const line of lines) {
                    const change = (line.credit || 0) - (line.debit || 0);
                    this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
                }
                this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [payment.journal_entry_id]);
                this.db.run('DELETE FROM journal_entries WHERE id = ?', [payment.journal_entry_id]);
            }

            this.db.run('DELETE FROM salary_payments WHERE id = ?', [id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class LeavesRepo {
    constructor(db) { this.db = db; }

    getAll() {
        return this.db.all(`
            SELECT el.*, e.name as employee_name, e.department
            FROM employee_leaves el
            LEFT JOIN employees e ON el.employee_id = e.id
            ORDER BY el.start_date DESC
        `);
    }

    getByEmployee(employeeId) {
        return this.db.all(
            "SELECT * FROM employee_leaves WHERE employee_id = ? ORDER BY start_date DESC",
            [employeeId]
        );
    }

    create(leave) {
        try {
            const r = this.db.run(
                "INSERT INTO employee_leaves (employee_id, leave_type, start_date, end_date, days, reason, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [leave.employee_id, leave.leave_type, leave.start_date, leave.end_date,
                leave.days || 1, leave.reason || '', leave.status || 'pending', leave.notes || '']
            );
            return { success: true, id: r.lastInsertRowid };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    updateStatus(id, status, approvedBy) {
        try {
            this.db.run(
                "UPDATE employee_leaves SET status=?, approved_by=? WHERE id=?",
                [status, approvedBy || null, id]
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    delete(id) {
        try {
            this.db.run('DELETE FROM employee_leaves WHERE id = ?', [id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class DeductionsRepo {
    constructor(db) { this.db = db; }

    getAll() {
        return this.db.all(`
            SELECT ed.*, e.name as employee_name, e.department
            FROM employee_deductions ed
            LEFT JOIN employees e ON ed.employee_id = e.id
            ORDER BY ed.created_at DESC
        `);
    }

    getByEmployee(employeeId) {
        return this.db.all(
            "SELECT * FROM employee_deductions WHERE employee_id = ? ORDER BY created_at DESC",
            [employeeId]
        );
    }

    create(deduction) {
        try {
            const r = this.db.run(
                "INSERT INTO employee_deductions (employee_id, month, amount, reason) VALUES (?, ?, ?, ?)",
                [deduction.employee_id, deduction.month, deduction.amount, deduction.reason || '']
            );
            return { success: true, id: r.lastInsertRowid };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    delete(id) {
        try {
            this.db.run('DELETE FROM employee_deductions WHERE id = ?', [id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class RentRepo {
    constructor(db) { this.db = db; }

    getAll() {
        return this.db.all(`
            SELECT rp.*, a.name as payment_account_name
            FROM rent_payments rp
            LEFT JOIN accounts a ON rp.payment_account_id = a.id
            ORDER BY rp.created_at DESC
        `);
    }

    getTotal(startDate, endDate) {
        try {
            let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM rent_payments WHERE 1=1';
            const params = [];
            if (startDate) { sql += ' AND created_at >= ?'; params.push(startDate); }
            if (endDate) { sql += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }
            const r = this.db.get(sql, params);
            return r?.total || 0;
        } catch (e) { return 0; }
    }

    pay(payment) {
        const n = (v) => v === undefined ? null : v;
        try {
            const count = this.db.get('SELECT COUNT(*) as count FROM rent_payments').count;
            const payNum = `RENT-${String(count + 1).padStart(6, '0')}`;
            const amount = parseFloat(payment.amount) || 0;
            if (amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

            // Get payment accounts
            const cashAccount = this.db.get("SELECT id FROM accounts WHERE code = '111'");
            const bankAccount = this.db.get("SELECT id FROM accounts WHERE code = '112'");
            let paymentAccountId = n(payment.payment_account_id);
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            // Get rent expense account
            let rentAccount = this.db.get("SELECT id FROM accounts WHERE code = '53'");
            if (!rentAccount) {
                const expParent = this.db.get("SELECT id FROM accounts WHERE code = '5'");
                this.db.run("INSERT OR IGNORE INTO accounts (code, name, parent_id, account_type, nature) VALUES (?, ?, ?, ?, ?)",
                    ['53', 'مصروفات الإيجار', expParent?.id || null, 'expense', 'debit']);
                rentAccount = this.db.get("SELECT id FROM accounts WHERE code = '53'");
            }

            // Create journal entry: Debit rent expense, Credit cash/bank
            let jeNum;
            let jeAttempt = 0;
            do {
                const maxJe = this.db.get("SELECT COALESCE(MAX(CAST(REPLACE(entry_number,'JE-','') AS INTEGER)),0) as mx FROM journal_entries");
                const nextNum = (maxJe?.mx || 0) + 1 + jeAttempt;
                jeNum = `JE-${String(nextNum).padStart(6, '0')}`;
                const jeExists = this.db.get('SELECT id FROM journal_entries WHERE entry_number = ?', [jeNum]);
                if (!jeExists) break;
                jeAttempt++;
            } while (jeAttempt < 100);

            const desc = payment.description || 'دفعة إيجار';
            const jeDesc = `قيد إيجار - ${payment.month} - ${desc}`;
            const jeR = this.db.run(
                "INSERT INTO journal_entries (entry_number, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?)",
                [jeNum, payment.date || new Date().toISOString().split('T')[0], jeDesc, payNum, n(payment.created_by)]
            );
            const jeId = jeR.lastInsertRowid;

            // Line 1: Debit rent expense account
            if (rentAccount) {
                this.db.run(
                    "INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                    [jeId, rentAccount.id, amount, 0, `إيجار ${payment.month} - ${desc}`]
                );
                this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, rentAccount.id]);
            }

            // Line 2: Credit cash/bank account
            if (paymentAccountId) {
                this.db.run(
                    "INSERT INTO journal_entry_lines (entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
                    [jeId, paymentAccountId, 0, amount, `صرف إيجار ${payment.month}`]
                );
                this.db.run('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, paymentAccountId]);
            }

            // Save rent payment record
            const r = this.db.run(
                "INSERT INTO rent_payments (payment_number, month, amount, description, payment_method, payment_account_id, journal_entry_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [payNum, payment.month, amount, desc, n(payment.payment_method) || 'cash', n(paymentAccountId), jeId, n(payment.notes), n(payment.created_by)]
            );

            return { success: true, id: r.lastInsertRowid, payment_number: payNum };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    delete(id) {
        try {
            const payment = this.db.get('SELECT * FROM rent_payments WHERE id = ?', [id]);
            if (!payment) return { success: false, error: 'السجل غير موجود' };

            // Reverse journal entry
            if (payment.journal_entry_id) {
                const lines = this.db.all('SELECT * FROM journal_entry_lines WHERE entry_id = ?', [payment.journal_entry_id]);
                for (const line of lines) {
                    const change = (line.credit || 0) - (line.debit || 0);
                    this.db.run('UPDATE accounts SET balance = balance + ? WHERE id = ?', [change, line.account_id]);
                }
                this.db.run('DELETE FROM journal_entry_lines WHERE entry_id = ?', [payment.journal_entry_id]);
                this.db.run('DELETE FROM journal_entries WHERE id = ?', [payment.journal_entry_id]);
            }

            this.db.run('DELETE FROM rent_payments WHERE id = ?', [id]);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

class SystemRepo {
    constructor(db) { this.db = db; }

    isFirstRun() {
        const setupComplete = this.db.get("SELECT value FROM settings WHERE key = 'setup_complete'");
        if (setupComplete) {
            return setupComplete.value === '0';
        }

        // For backward compatibility: check if it's an existing configured DB
        const admin = this.db.get("SELECT password_hash FROM users WHERE role = 'admin'");
        const companyName = this.db.get("SELECT value FROM settings WHERE key = 'company_name'");

        let isDefault = true;
        if (admin && admin.password_hash !== 'password123') isDefault = false;
        if (companyName && companyName.value !== 'شركتي') isDefault = false;

        const invoicesDb = this.db.get("SELECT COUNT(*) as c FROM invoices");
        if (invoicesDb && invoicesDb.c > 0) isDefault = false;

        // Auto-fix existing configured databases
        if (!isDefault) {
            this.db.run("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('setup_complete', '1', 'system')");
            return false;
        }

        return true;
    }

    runSetup(data) {
        try {
            // Update company settings
            if (data.company_name) this.db.run("UPDATE settings SET value=? WHERE key='company_name'", [data.company_name]);
            this.db.run("UPDATE settings SET value=? WHERE key='company_phone'", [data.company_phone || '']);
            this.db.run("UPDATE settings SET value=? WHERE key='company_address'", [data.company_address || '']);
            this.db.run("UPDATE settings SET value=? WHERE key='company_tax_number'", [data.company_tax_number || '']);
            this.db.run("UPDATE settings SET value=? WHERE key='currency'", [data.currency || 'دينار كويتي']);

            if (data.company_logo) {
                this.db.run("UPDATE settings SET value=? WHERE key='company_logo'", [data.company_logo]);
            }
            if (data.invoice_template) {
                this.db.run("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('invoice_template', ?, 'invoice')", [data.invoice_template]);
            }

            // Negative stock setting
            const allowNegative = data.allow_negative_stock ? '1' : '0';
            this.db.run("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('allow_negative_stock', ?, 'general')", [allowNegative]);

            // Create secondary admin user (Company Manager)
            if (data.admin_username && data.admin_password) {
                if (data.admin_username.toLowerCase() === 'admin') {
                    throw new Error("لا يمكن استخدام اسم المستخدم 'admin' لأنه محجوز للنظام الأساسي. الرجاء اختيار اسم آخر.");
                }

                // Allow creation of a new admin role user, but keep the original admin untouched
                this.db.run("INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')",
                    [data.admin_username, data.admin_password, data.admin_name || 'مدير الشركة']);
            }

            // Mark setup as complete
            this.db.run("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('setup_complete', '1', 'system')");
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}


module.exports = new AppDatabase();
