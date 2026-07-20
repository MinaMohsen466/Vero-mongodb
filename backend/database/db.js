const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Load models & helper functions
const models = require('./models');
const { getNextSequenceValue, syncSequence, User, Customer, Supplier, Account, Setting, Permission } = models;

// Load repositories
const repos = require('./repositories');
const {
    UsersRepo, CustomersRepo, SuppliersRepo, AccountsRepo, ProductsRepo,
    InvoicesRepo, VouchersRepo, JournalRepo, ReportsRepo, SettingsRepo,
    PermissionsRepo, EmployeesRepo, SalaryRepo, LeavesRepo, DeductionsRepo,
    ExpensesRepo, SystemRepo, CouponsRepo, OffersRepo, ActivityLogRepo,
    StockTransfersRepo, ReturnsRepo
} = repos;

// Password security helpers
const PBKDF2_ITERATIONS_V2 = 600000;
const PBKDF2_ITERATIONS_V1 = 1000;

function hashPassword(password) {
    if (!password) return '';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V2, 64, 'sha512').toString('hex');
    return `pbkdf2v2$${salt}$${hash}`;
}
function verifyPassword(password, storedPassword) {
    if (!storedPassword || !password) return false;
    if (storedPassword.startsWith('pbkdf2v2$')) {
        const parts = storedPassword.split('$');
        if (parts.length === 3) {
            const salt = parts[1];
            const originalHash = parts[2];
            const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V2, 64, 'sha512').toString('hex');
            try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex')); } catch(e) { return false; }
        }
    }
    if (storedPassword.startsWith('pbkdf2$')) {
        const parts = storedPassword.split('$');
        if (parts.length === 3) {
            const salt = parts[1];
            const originalHash = parts[2];
            const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS_V1, 64, 'sha512').toString('hex');
            try { return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex')); } catch(e) { return false; }
        }
    }
    console.warn('[Security] Plaintext password comparison detected - will be upgraded on next login');
    return password === storedPassword;
}

// Backup encryption helpers
function encryptData(text, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decryptData(encryptedText, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Invalid encrypted backup format');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Global plugin to trigger automatic backup on database modifications
function autoBackupPlugin(schema) {
    const trigger = () => {
        if (typeof dbInstance !== 'undefined' && dbInstance) {
            dbInstance.triggerAutoBackup();
        }
    };
    schema.post('save', trigger);
    schema.post('updateOne', trigger);
    schema.post('updateMany', trigger);
    schema.post('deleteOne', trigger);
    schema.post('deleteMany', trigger);
    schema.post('findOneAndUpdate', trigger);
    schema.post('findOneAndDelete', trigger);
}
mongoose.plugin(autoBackupPlugin);

// Explicit collections mapping for backup/restore
const collections = {
    counters: models.Counter,
    users: models.User,
    permissions: models.Permission,
    user_permissions: models.UserPermission,
    customers: models.Customer,
    suppliers: models.Supplier,
    accounts: models.Account,
    products: models.Product,
    invoices: models.Invoice,
    vouchers: models.Voucher,
    journal_entries: models.JournalEntry,
    settings: models.Setting,
    employees: models.Employee,
    employee_leaves: models.EmployeeLeave,
    employee_deductions: models.EmployeeDeduction,
    salary_payments: models.SalaryPayment,
    expenses: models.Expense,
    coupons: models.Coupon,
    offers: models.Offer,
    activity_log: models.ActivityLog,
    returns: models.Return,
    stock_transfers: models.StockTransfer,
    installment_plans: models.InstallmentPlan,
    installment_payments: models.InstallmentPayment,
    deleted_records: models.DeletedRecord
};

class CacheManager {
    constructor(ttlMs = 30000) {
        this.cache = new Map();
        this.ttlMs = ttlMs;
    }

    get(category, key = 'all') {
        const fullKey = `${category}:${key}`;
        if (this.cache.has(fullKey)) {
            const { value, expiry } = this.cache.get(fullKey);
            if (Date.now() < expiry) {
                try {
                    return JSON.parse(JSON.stringify(value));
                } catch (e) {
                    return value;
                }
            }
            this.cache.delete(fullKey);
        }
        return null;
    }

    set(category, value, key = 'all') {
        const fullKey = `${category}:${key}`;
        const expiry = Date.now() + this.ttlMs;
        let valueToStore = value;
        try {
            valueToStore = JSON.parse(JSON.stringify(value));
        } catch (e) {}
        this.cache.set(fullKey, { value: valueToStore, expiry });
    }

    invalidate(category) {
        for (const fullKey of this.cache.keys()) {
            if (fullKey.startsWith(`${category}:`)) {
                this.cache.delete(fullKey);
            }
        }
    }

    clearAll() {
        this.cache.clear();
    }
}

class AppDatabase {
    constructor() {
        this.app = null;
        this.configPath = null;
        this.adminConfig = null;
        this.lastAutoBackupTime = 0;
        this.cache = new CacheManager(30000); // 30 seconds TTL
    }

    setAdminConfig(adminConfig) {
        this.adminConfig = adminConfig;
    }

    async triggerAutoBackup() {
        try {
            const now = Date.now();
            // Throttle to run at most once every 5 minutes (300,000 ms)
            if (now - this.lastAutoBackupTime < 300000) {
                return;
            }

            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                if (config.backupPath) {
                    console.log('[DB] Triggering background automatic backup...');
                    this.lastAutoBackupTime = now;

                    // Run backup in background asynchronously (do not await)
                    this.backupToPath(config.backupPath).then(res => {
                        if (res.success) {
                            console.log('[DB] Background automatic backup completed successfully');
                            try {
                                const currentConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                                currentConfig.lastBackupTime = new Date().toISOString();
                                fs.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
                            } catch (e) {}
                        } else {
                            console.error('[DB] Background automatic backup failed:', res.error);
                        }
                    }).catch(err => {
                        console.error('[DB] Background automatic backup error:', err);
                    });
                }
            }
        } catch (e) {
            console.error('[DB] Error triggering automatic backup:', e);
        }
    }

    async init(app) {
        this.app = app;
        const userDataPath = app.getPath('userData');
        this.configPath = path.join(userDataPath, 'vero-config.json');

        // Load environment variables from .env if it exists
        try {
            const pathsToSearch = [];
            if (process.execPath) {
                pathsToSearch.push(path.join(path.dirname(process.execPath), '.env'));
            }
            if (app && typeof app.getAppPath === 'function') {
                pathsToSearch.push(path.join(app.getAppPath(), '.env'));
            }
            pathsToSearch.push(path.join(process.cwd(), '.env'));

            let envPath = null;
            for (const p of pathsToSearch) {
                if (fs.existsSync(p)) {
                    envPath = p;
                    break;
                }
            }

            if (envPath) {
                console.log('[DB] Loading environment variables from:', envPath);
                const envContent = fs.readFileSync(envPath, 'utf8');
                envContent.split('\n').forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        const parts = trimmed.split('=');
                        if (parts.length >= 2) {
                            const key = parts[0].trim();
                            const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                            process.env[key] = val;
                        }
                    }
                });
            } else {
                console.log('[DB] No .env file found in searched paths:', pathsToSearch);
            }
        } catch (e) {
            console.error('[DB] Error loading .env:', e);
        }

        let mongoUri = 'mongodb://127.0.0.1:27017/vero';
        if (process.env.MONGODB_URI) {
            mongoUri = process.env.MONGODB_URI;
        } else {
            try {
                if (fs.existsSync(this.configPath)) {
                    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                    if (config.mongoUri) {
                        mongoUri = config.mongoUri;
                    }
                }
            } catch (e) {}
        }

        console.log('[DB] Connecting to MongoDB:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
        await mongoose.connect(mongoUri);
        console.log('[DB] Connected to MongoDB');

        // Sync all sequences
        for (const [name, model] of Object.entries(collections)) {
            if (name !== 'counters') {
                await syncSequence(name, model);
            }
        }

        this.initRepositories();
        await this.seedDefaultData();
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
        this.expenses = new ExpensesRepo(this);
        this.system = new SystemRepo(this);
        this.activityLog = new ActivityLogRepo(this);
        this.stockTransfers = new StockTransfersRepo(this);
        this.returns = new ReturnsRepo(this);
        this.coupons = new CouponsRepo(this);
        this.offers = new OffersRepo(this);
        this._applyCachingToRepositories();
    }

    _applyCachingToRepositories() {
        const reposToCache = [
            { name: 'customers', category: 'customers' },
            { name: 'suppliers', category: 'suppliers' },
            { name: 'accounts', category: 'accounts' },
            { name: 'products', category: 'products' },
            { name: 'invoices', category: 'invoices' },
            { name: 'vouchers', category: 'vouchers' },
            { name: 'expenses', category: 'expenses' },
            { name: 'salaries', category: 'salaries' },
            { name: 'returns', category: 'returns' },
            { name: 'stockTransfers', category: 'stockTransfers' },
            { name: 'coupons', category: 'coupons' },
            { name: 'offers', category: 'offers' },
            { name: 'reports', category: 'reports' },
            { name: 'settings', category: 'settings' },
            { name: 'employees', category: 'employees' },
            { name: 'leaves', category: 'leaves' },
            { name: 'deductions', category: 'deductions' }
        ];

        for (const repoInfo of reposToCache) {
            const repo = this[repoInfo.name];
            if (!repo) continue;

            const proto = Object.getPrototypeOf(repo);
            const methods = Object.getOwnPropertyNames(proto);
            const activeWrites = new Map();

            for (const methodName of methods) {
                if (methodName === 'constructor' || typeof repo[methodName] !== 'function') continue;

                const originalMethod = repo[methodName];
                const isWrite = methodName.startsWith('create') || 
                                methodName.startsWith('update') || 
                                methodName.startsWith('delete') || 
                                methodName.startsWith('save') || 
                                methodName.startsWith('add') || 
                                methodName.startsWith('pay') || 
                                methodName.startsWith('set') || 
                                methodName.startsWith('clear') || 
                                methodName.startsWith('increment') || 
                                methodName.startsWith('bulk') || 
                                methodName.startsWith('runSetup');

                const isRead = !isWrite && methodName !== 'constructor' && typeof repo[methodName] === 'function';

                if (isRead) {
                    repo[methodName] = async function(...args) {
                        const key = `${methodName}_${JSON.stringify(args)}`;
                        const cached = repo.db.cache.get(repoInfo.category, key);
                        if (cached !== null) {
                            return cached;
                         }
                        const result = await originalMethod.apply(repo, args);
                        repo.db.cache.set(repoInfo.category, result, key);
                        return result;
                    };
                } else if (isWrite) {
                    repo[methodName] = async function(...args) {
                        const callKey = `${methodName}_${JSON.stringify(args)}`;
                        if (activeWrites.has(callKey)) {
                            console.warn(`[DB] Coalesced duplicate write call to ${repoInfo.name}.${methodName}`);
                            return activeWrites.get(callKey);
                        }

                        const promise = originalMethod.apply(repo, args).finally(() => {
                            activeWrites.delete(callKey);
                        });

                        activeWrites.set(callKey, promise);

                        const result = await promise;
                        repo.db.cache.clearAll();
                        return result;
                    };
                }
            }
        }
    }

    async _handleOpeningBalance(type, entityId, oldBalance, oldJeId, newBalance, newDate, entityCode, entityName) {
        if (oldJeId) {
            try {
                await this.journal.delete(oldJeId);
            } catch (e) {
                console.error(`Error deleting old opening balance journal entry:`, e);
            }
        }

        if (!newBalance || parseFloat(newBalance) === 0) {
            return null;
        }

        const accountsPayable = await Account.findOne({ code: '211' });
        const accountsReceivable = await Account.findOne({ code: '113' });
        const openingBalancesAcc = await Account.findOne({ code: '399' });

        if (!openingBalancesAcc) {
            console.error("Opening balances account (399) not found!");
            return null;
        }

        const amt = parseFloat(newBalance);
        const lines = [];

        if (type === 'supplier') {
            if (accountsPayable) {
                lines.push({
                    account_id: openingBalancesAcc.id,
                    debit: amt,
                    credit: 0,
                    description: `رصيد افتتاحي للمورد ${entityName} (${entityCode})`
                });
                lines.push({
                    account_id: accountsPayable.id,
                    debit: 0,
                    credit: amt,
                    description: `رصيد افتتاحي للمورد ${entityName} (${entityCode})`
                });
            }
        } else if (type === 'customer') {
            if (accountsReceivable) {
                lines.push({
                    account_id: accountsReceivable.id,
                    debit: amt,
                    credit: 0,
                    description: `رصيد افتتاحي للعميل ${entityName} (${entityCode})`
                });
                lines.push({
                    account_id: openingBalancesAcc.id,
                    debit: 0,
                    credit: amt,
                    description: `رصيد افتتاحي للعميل ${entityName} (${entityCode})`
                });
            }
        }

        if (lines.length > 0) {
            const entryDesc = type === 'supplier' 
                ? `رصيد افتتاحي للمورد ${entityName}` 
                : `رصيد افتتاحي للعميل ${entityName}`;
            
            const jeResult = await this.journal.create({
                date: newDate || new Date().toISOString().split('T')[0],
                description: entryDesc,
                reference: entityCode,
                lines: lines
            });

            if (jeResult.success) {
                return jeResult.id;
            } else {
                console.error("Failed to create opening balance journal entry:", jeResult.error);
            }
        }
        return null;
    }

    async seedDefaultData() {
        const adminPassword = this.adminConfig?.getAdminPassword() || 'Vero123*';
        
        // Admin user
        const admin = await User.findOne({ username: 'admin' });
        if (!admin) {
            const nextId = await getNextSequenceValue('users');
            await User.create({ id: nextId, username: 'admin', password_hash: hashPassword(adminPassword), full_name: 'مدير النظام', role: 'admin' });
        } else {
            const isMatch = verifyPassword(adminPassword, admin.password_hash);
            if (!isMatch || !admin.password_hash.startsWith('pbkdf2v2$')) {
                await User.updateOne({ username: 'admin' }, { $set: { password_hash: hashPassword(adminPassword) } });
            }
        }

        // Cash customer & supplier
        const cashCust = await Customer.findOne({ code: 'CUST-CASH' });
        if (!cashCust) {
            const nextId = await getNextSequenceValue('customers');
            await Customer.create({ id: nextId, code: 'CUST-CASH', name: 'عميل نقدي', phone: '', balance: 0, credit_limit: 0, opening_balance: 0, is_active: true });
        }
        const cashSupp = await Supplier.findOne({ code: 'SUPP-CASH' });
        if (!cashSupp) {
            const nextId = await getNextSequenceValue('suppliers');
            await Supplier.create({ id: nextId, code: 'SUPP-CASH', name: 'مورد نقدي', phone: '', balance: 0, opening_balance: 0, is_active: true });
        }

        // Chart of accounts
        const count = await Account.countDocuments();
        if (count === 0) {
            const accs = [
                ['1', 'الأصول', null, 'asset', 'debit'], ['2', 'الخصوم', null, 'liability', 'credit'], ['3', 'حقوق الملكية', null, 'equity', 'credit'], ['4', 'الإيرادات', null, 'revenue', 'credit'], ['5', 'المصروفات', null, 'expense', 'debit'],
                ['11', 'الأصول المتداولة', '1', 'asset', 'debit'], ['111', 'الصندوق', '11', 'asset', 'debit'], ['112', 'البنك', '11', 'asset', 'debit'], ['113', 'العملاء', '11', 'asset', 'debit'],
                ['21', 'الخصوم المتداولة', '2', 'liability', 'credit'], ['211', 'الموردون', '21', 'liability', 'credit'],
                ['399', 'الأرصدة الافتتاحية', '3', 'equity', 'credit'],
                ['41', 'إيرادات المبيعات', '4', 'revenue', 'credit'], ['51', 'تكلفة المبيعات', '5', 'expense', 'debit'],
                ['52', 'مصروفات الرواتب', '5', 'expense', 'debit'],
                ['521', 'رواتب الموظفين', '52', 'expense', 'debit'],
                ['53', 'مصروفات الإيجار', '5', 'expense', 'debit'],
                ['54', 'مصروفات الضيافة', '5', 'expense', 'debit'],
                ['55', 'مصروفات الكهرباء والماء', '5', 'expense', 'debit'],
                ['56', 'مصروفات الصيانة', '5', 'expense', 'debit'],
                ['57', 'مصروفات أخرى', '5', 'expense', 'debit']
            ];
            for (const [code, name, parent, type, nature] of accs) {
                const parentId = parent ? (await Account.findOne({ code: parent }))?.id : null;
                const nextId = await getNextSequenceValue('accounts');
                await Account.create({ id: nextId, code, name, parent_id: parentId, account_type: type, nature, can_post: true });
            }
        }

        // Settings
        const settings = [
            ['company_name', 'شركتي', 'company'], ['company_address', '', 'company'], ['company_phone', '', 'company'], ['company_email', '', 'company'], ['company_tax_number', '', 'company'], ['company_logo', '', 'company'],
            ['currency', 'دينار كويتي', 'general'], ['currency_symbol', 'د.ك', 'general'], ['decimal_places', '3', 'general'],
            ['tax_rate', '0', 'tax'], ['theme', 'light', 'appearance'],
            ['invoice_title_sales', 'فاتورة مبيعات', 'invoice'], ['invoice_title_purchase', 'فاتورة مشتريات', 'invoice'],
            ['invoice_footer', 'شكراً لتعاملكم معنا', 'invoice'], ['invoice_terms', '', 'invoice'], ['show_logo', 'yes', 'invoice'], ['show_company_info', 'yes', 'invoice'],
            ['paper_size', 'A4', 'invoice'], ['paper_orientation', 'portrait', 'invoice'],
            ['logo_position', 'center', 'invoice'], ['logo_size', 'medium', 'invoice']
        ];
        for (const [key, value, category] of settings) {
            const exists = await Setting.findOne({ key });
            if (!exists) {
                await Setting.create({ key, value, category });
            }
        }

        // Default Permissions
        const permCount = await Permission.countDocuments();
        if (permCount === 0) {
            const modules = ['dashboard', 'customers', 'suppliers', 'products', 'sales_invoices', 'purchase_invoices', 'receipt_vouchers', 'payment_vouchers', 'chart_of_accounts', 'cash_bank', 'journal_entries', 'reports', 'settings', 'users', 'permissions', 'hr', 'expenses', 'pos', 'database', 'financial_summary', 'warehouse', 'offers', 'sales_returns', 'purchase_returns', 'quotations'];
            for (const mod of modules) {
                const nextId = await getNextSequenceValue('permissions');
                await Permission.create({ id: nextId, role: 'admin', module: mod, can_view: true, can_create: true, can_edit: true, can_delete: true });
            }
            const accountantPerms = {
                dashboard: [1, 0, 0, 0], customers: [1, 1, 1, 0], suppliers: [1, 1, 1, 0], products: [1, 1, 1, 0],
                sales_invoices: [1, 1, 1, 0], purchase_invoices: [1, 1, 1, 0], receipt_vouchers: [1, 1, 1, 0], payment_vouchers: [1, 1, 1, 0],
                chart_of_accounts: [1, 0, 0, 0], cash_bank: [1, 0, 0, 0], journal_entries: [1, 1, 0, 0], reports: [1, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0], hr: [1, 1, 1, 0], expenses: [1, 1, 1, 0], pos: [1, 1, 1, 0],
                sales_returns: [1, 1, 1, 0], purchase_returns: [1, 1, 1, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(accountantPerms)) {
                const nextId = await getNextSequenceValue('permissions');
                await Permission.create({ id: nextId, role: 'accountant', module: mod, can_view: !!v, can_create: !!c, can_edit: !!e, can_delete: !!d });
            }
            const userPerms = {
                dashboard: [1, 0, 0, 0], customers: [0, 0, 0, 0], suppliers: [0, 0, 0, 0], products: [0, 0, 0, 0],
                sales_invoices: [1, 1, 0, 0], purchase_invoices: [0, 0, 0, 0], receipt_vouchers: [1, 1, 0, 0], payment_vouchers: [0, 0, 0, 0],
                chart_of_accounts: [0, 0, 0, 0], cash_bank: [0, 0, 0, 0], journal_entries: [0, 0, 0, 0], reports: [0, 0, 0, 0],
                settings: [0, 0, 0, 0], users: [0, 0, 0, 0], permissions: [0, 0, 0, 0], hr: [0, 0, 0, 0], expenses: [0, 0, 0, 0], pos: [1, 1, 1, 0], database: [0, 0, 0, 0],
                sales_returns: [1, 1, 0, 0], purchase_returns: [0, 0, 0, 0]
            };
            for (const [mod, [v, c, e, d]] of Object.entries(userPerms)) {
                const nextId = await getNextSequenceValue('permissions');
                await Permission.create({ id: nextId, role: 'user', module: mod, can_view: !!v, can_create: !!c, can_edit: !!e, can_delete: !!d });
            }
        }

        // Self-healing migration: Seed products_import and products_export permissions if missing
        try {
            const roles = ['admin', 'accountant', 'user'];
            const newModules = ['products_import', 'products_export'];
            for (const role of roles) {
                for (const mod of newModules) {
                    const exists = await Permission.findOne({ role, module: mod });
                    if (!exists) {
                        const nextId = await getNextSequenceValue('permissions');
                        const canView = role === 'admin' || role === 'accountant';
                        await Permission.create({
                            id: nextId,
                            role,
                            module: mod,
                            can_view: canView,
                            can_create: canView,
                            can_edit: false,
                            can_delete: false
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[DB] Error migrating import/export permissions:', e);
        }

        // Self-healing migration: Recalculate paid amounts for all invoices to heal any out-of-sync states
        try {
            const InvoiceModel = collections.invoices || models.Invoice;
            if (InvoiceModel) {
                const invoices = await InvoiceModel.find({}).lean();
                for (const inv of invoices) {
                    await this.vouchers.recalculateInvoicePaid(inv.id);
                }
            }
        } catch (e) {
            console.error('[DB] Error running invoice repair migration:', e);
        }
    }

    async backup() {
        try {
            const backupData = {};
            for (const [name, model] of Object.entries(collections)) {
                backupData[name] = await model.find({}).lean();
            }
            const jsonText = JSON.stringify(backupData, null, 2);
            const backupKey = this.adminConfig?.getBackupKey();
            const encryptedText = backupKey ? encryptData(jsonText, backupKey) : jsonText;
            
            const backupPath = path.join(this.app.getPath('documents'), `vero_backup_${Date.now()}.json`);
            fs.writeFileSync(backupPath, encryptedText, 'utf8');

            try {
                let config = {};
                if (fs.existsSync(this.configPath)) {
                    config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                }
                config.lastBackupTime = new Date().toISOString();
                fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
            } catch (e) {}

            return { success: true, path: backupPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async backupToPath(destPath) {
        try {
            const backupData = {};
            for (const [name, model] of Object.entries(collections)) {
                backupData[name] = await model.find({}).lean();
            }
            const jsonText = JSON.stringify(backupData, null, 2);
            const backupKey = this.adminConfig?.getBackupKey();
            const encryptedText = backupKey ? encryptData(jsonText, backupKey) : jsonText;
            
            fs.writeFileSync(destPath, encryptedText, 'utf8');
            return { success: true, path: destPath };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async restore(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'ملف النسخة الاحتياطية غير موجود' };
            }
            let rawData = fs.readFileSync(filePath, 'utf8');
            
            let backupData;
            if (rawData.trim().startsWith('{')) {
                backupData = JSON.parse(rawData);
            } else {
                // Determine potential keys to decrypt the backup file:
                // 1. Current fixed backup key
                const fixedKey = this.adminConfig?.getBackupKey();
                
                // 2. Legacy backup key from config (could contain old random key)
                const legacyKey = this.adminConfig?.getLegacyBackupKey ? this.adminConfig.getLegacyBackupKey() : null;
                
                // 3. Hash of the current admin password
                const currentPasswordKey = this.adminConfig ? crypto.createHash('sha256').update(this.adminConfig.getAdminPassword()).digest('hex') : null;
                
                // 4. Hash of the default admin password 'Vero123*'
                const defaultPasswordKey = crypto.createHash('sha256').update('Vero123*').digest('hex');
                
                // 5. Hash of manager default keyword
                const managerPasswordKey = crypto.createHash('sha256').update('manager').digest('hex');
                
                const candidateKeys = [
                    fixedKey,
                    legacyKey,
                    currentPasswordKey,
                    defaultPasswordKey,
                    managerPasswordKey
                ].filter((k, i, self) => k && self.indexOf(k) === i); // Unique keys only
                
                let decryptedText = null;
                
                for (const key of candidateKeys) {
                    try {
                        decryptedText = decryptData(rawData, key);
                        // Validate if it is valid JSON
                        JSON.parse(decryptedText);
                        // If it succeeded, we got the right key!
                        break;
                    } catch (err) {
                        decryptedText = null;
                    }
                }
                
                if (!decryptedText) {
                    return { 
                        success: false, 
                        error: 'فشل فك تشفير ملف النسخة الاحتياطية. قد يكون الملف مشفراً بمفتاح آخر أو تالفاً.' 
                    };
                }
                backupData = JSON.parse(decryptedText);
            }
            
            // Create in-memory backup before restoring for rollback safety
            const tempBackup = {};
            for (const [name, model] of Object.entries(collections)) {
                if (backupData[name]) {
                    tempBackup[name] = await model.find({}).lean();
                }
            }

            try {
                for (const [name, model] of Object.entries(collections)) {
                    if (backupData[name]) {
                        await model.deleteMany({});
                        if (backupData[name].length > 0) {
                            await model.insertMany(backupData[name]);
                        }
                    }
                }
            } catch (restoreError) {
                console.error('[DB] Restore failed, attempting rollback:', restoreError.message);
                for (const [name, model] of Object.entries(collections)) {
                    if (tempBackup[name]) {
                        try {
                            await model.deleteMany({});
                            if (tempBackup[name].length > 0) {
                                await model.insertMany(tempBackup[name]);
                            }
                        } catch (rollbackErr) {
                            console.error('[DB] Rollback failed for ' + name + ':', rollbackErr.message);
                        }
                    }
                }
                throw restoreError;
            }

            this.cache.clearAll();
            return { success: true, message: 'تم استعادة النسخة الاحتياطية بنجاح' };
        } catch (e) {
            console.error('[DB] Restore error:', e);
            return { success: false, error: 'فشل استعادة النسخة الاحتياطية: ' + e.message };
        }
    }

    getDbPath() {
        return this.configPath;
    }

    async getBackupPath() {
        try {
            if (fs.existsSync(this.configPath)) {
                const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                return {
                    backupDbPath: config.backupPath || null,
                    lastBackupTime: config.lastBackupTime || null
                };
            }
        } catch (e) {}
        return { backupDbPath: null, lastBackupTime: null };
    }

    async setBackupPath(backupPath) {
        try {
            let config = {};
            if (fs.existsSync(this.configPath)) {
                config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
            config.backupPath = backupPath;
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async changeDbPath(newFolderPath) {
        return { success: true };
    }

    async testBackupPath(testPath) {
        try {
            const testDir = path.dirname(testPath);
            fs.mkdirSync(testDir, { recursive: true });
            fs.writeFileSync(testPath, 'test');
            fs.unlinkSync(testPath);
            return { success: true, message: 'المسار صحيح وقابل للكتابة' };
        } catch (e) {
            return { success: false, error: 'فشل الوصول للمسار: ' + e.message };
        }
    }

    forceSave() {
        console.log('[DB] MongoDB is real-time persisted, forceSave ignored.');
    }

    async vacuum() {
        return { success: true };
    }

    async resetApp(options = {}) {
        const isFullReset = !options || Object.keys(options).length === 0 || options.deleteSettingsAndUsers;

        if (isFullReset) {
            for (const model of Object.values(collections)) {
                await model.deleteMany({});
            }
            await this.seedDefaultData();
        } else {
            // Selective reset
            if (options.deleteTransactions) {
                const txModels = [
                    collections.invoices,
                    collections.vouchers,
                    collections.journal_entries,
                    collections.salary_payments,
                    collections.employee_leaves,
                    collections.employee_deductions,
                    collections.expenses,
                    collections.returns,
                    collections.stock_transfers,
                    collections.installment_payments,
                    collections.installment_plans,
                    collections.activity_log,
                    collections.deleted_records
                ].filter(Boolean);
                for (const model of txModels) {
                    await model.deleteMany({});
                }
                if (collections.counters) {
                    await collections.counters.deleteMany({ name: { $in: ['invoices', 'vouchers', 'journal_entries', 'salary_payments', 'expenses', 'returns', 'stock_transfers', 'installment_plans'] } });
                }
                if (collections.accounts) {
                    await collections.accounts.updateMany({}, { $set: { balance: 0, initial_balance: 0 } });
                }
            }
            if (options.deleteProducts) {
                const prodModels = [
                    collections.products,
                    collections.coupons,
                    collections.offers
                ].filter(Boolean);
                for (const model of prodModels) {
                    await model.deleteMany({});
                }
                if (collections.counters) {
                    await collections.counters.deleteMany({ name: { $in: ['products', 'offers', 'coupons'] } });
                }
            }
            if (options.deleteContacts) {
                const contactModels = [
                    collections.customers,
                    collections.suppliers
                ].filter(Boolean);
                for (const model of contactModels) {
                    await model.deleteMany({});
                }
                if (collections.counters) {
                    await collections.counters.deleteMany({ name: { $in: ['customers', 'suppliers'] } });
                }
            }
        }
        
        if (this.cache) {
            this.cache.clearAll();
        }
        return { success: true };
    }
}

const dbInstance = new AppDatabase();
module.exports = dbInstance;
