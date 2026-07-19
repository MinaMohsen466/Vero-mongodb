const mongoose = require('mongoose');

// ==================== Sequence Counter Schema ====================
const CounterSchema = new mongoose.Schema({
    _id: String,
    seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', CounterSchema);

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        sequenceName,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.seq;
}

async function syncSequence(sequenceName, model) {
    const maxDoc = await model.findOne().sort({ id: -1 }).lean().exec();
    const maxId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id : 0;
    await Counter.findByIdAndUpdate(
        sequenceName,
        { $max: { seq: maxId } },
        { upsert: true }
    );
}

// ==================== Schemas & Models ====================

const UserSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    username: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    full_name: String,
    role: { type: String, default: 'user' },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const PermissionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    role: { type: String, required: true },
    module: { type: String, required: true },
    can_view: { type: Boolean, default: false },
    can_create: { type: Boolean, default: false },
    can_edit: { type: Boolean, default: false },
    can_delete: { type: Boolean, default: false }
});
const Permission = mongoose.model('Permission', PermissionSchema);

const UserPermissionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_id: { type: Number, required: true },
    module: { type: String, required: true },
    can_view: { type: Boolean, default: false },
    can_create: { type: Boolean, default: false },
    can_edit: { type: Boolean, default: false },
    can_delete: { type: Boolean, default: false }
});
const UserPermission = mongoose.model('UserPermission', UserPermissionSchema);

const CustomerSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    tax_number: String,
    balance: { type: Number, default: 0 },
    credit_limit: { type: Number, default: 0 },
    notes: String,
    is_active: { type: Boolean, default: true },
    opening_balance: { type: Number, default: 0 },
    opening_balance_date: String,
    opening_balance_je_id: Number,
    created_at: { type: Date, default: Date.now }
});
CustomerSchema.index({ id: 1 });
CustomerSchema.index({ code: 1 });
const Customer = mongoose.model('Customer', CustomerSchema);

const SupplierSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    tax_number: String,
    balance: { type: Number, default: 0 },
    notes: String,
    is_active: { type: Boolean, default: true },
    opening_balance: { type: Number, default: 0 },
    opening_balance_date: String,
    opening_balance_je_id: Number,
    created_at: { type: Date, default: Date.now }
});
SupplierSchema.index({ id: 1 });
SupplierSchema.index({ code: 1 });
const Supplier = mongoose.model('Supplier', SupplierSchema);

const AccountSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    parent_id: Number,
    account_type: { type: String, required: true },
    nature: { type: String, required: true },
    balance: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    can_post: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Account = mongoose.model('Account', AccountSchema);

const ProductSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    description: String,
    unit: { type: String, default: 'قطعة' },
    category: String,
    purchase_price: { type: Number, default: 0 },
    sale_price: { type: Number, default: 0 },
    stock_quantity: { type: Number, default: 0 },
    min_stock: { type: Number, default: 0 },
    image: String,
    supplier_id: Number,
    supplier_ids: { type: [Number], default: [] },
    is_active: { type: Boolean, default: true },
    dozen_price: { type: Number, default: 0 },
    dozen_qty: { type: Number, default: 1 },
    warehouse_stock: { type: Number, default: 0 },
    shop_stock: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
ProductSchema.index({ id: 1 });
ProductSchema.index({ code: 1 });
const Product = mongoose.model('Product', ProductSchema);

const DeletedRecordSchema = new mongoose.Schema({
    entity_type: { type: String, required: true },
    entity_id: { type: Number, required: true },
    deleted_at: { type: Date, default: Date.now }
});
const DeletedRecord = mongoose.model('DeletedRecord', DeletedRecordSchema);

const InvoiceItemSchema = new mongoose.Schema({
    product_id: Number,
    description: String,
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true }
});

const InvoiceSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    invoice_number: { type: String, unique: true, required: true },
    type: { type: String, required: true }, // sales, purchase, quotation
    customer_id: Number,
    supplier_id: Number,
    date: { type: String, required: true },
    due_date: String,
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
    status: { type: String, default: 'pending' },
    payment_method: { type: String, default: 'cash' },
    payment_account_id: Number,
    notes: String,
    created_by: Number,
    manual_discount: { type: Number, default: 0 },
    coupon_code: String,
    image: String,
    journal_entry_id: Number,
    items: [InvoiceItemSchema],
    created_at: { type: Date, default: Date.now }
});
InvoiceSchema.index({ type: 1, date: -1 });
const Invoice = mongoose.model('Invoice', InvoiceSchema);

const VoucherSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    voucher_number: { type: String, unique: true, required: true },
    type: { type: String, required: true }, // receipt, payment
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    applied_amount: { type: Number, default: 0 },
    account_id: Number,
    customer_id: Number,
    supplier_id: Number,
    payment_method: { type: String, default: 'cash' },
    invoice_id: Number,
    reference: String,
    description: String,
    created_by: Number,
    journal_entry_id: Number,
    created_at: { type: Date, default: Date.now }
});
VoucherSchema.index({ type: 1, date: -1 });
const Voucher = mongoose.model('Voucher', VoucherSchema);

const JournalEntryLineSchema = new mongoose.Schema({
    account_id: { type: Number, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    description: String
});

const JournalEntrySchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    entry_number: { type: String, unique: true, required: true },
    date: { type: String, required: true },
    description: String,
    reference: String,
    is_posted: { type: Boolean, default: false },
    created_by: Number,
    lines: [JournalEntryLineSchema],
    created_at: { type: Date, default: Date.now }
});
JournalEntrySchema.index({ date: -1 });
const JournalEntry = mongoose.model('JournalEntry', JournalEntrySchema);

const SettingSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: String,
    category: { type: String, default: 'general' }
});
const Setting = mongoose.model('Setting', SettingSchema);

const EmployeeSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    job_title: String,
    department: String,
    hire_date: String,
    base_salary: { type: Number, default: 0 },
    phone: String,
    email: String,
    national_id: String,
    address: String,
    account_id: Number,
    bank_account: String,
    notes: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Employee = mongoose.model('Employee', EmployeeSchema);

const EmployeeLeaveSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employee_id: { type: Number, required: true },
    leave_type: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    days: { type: Number, required: true },
    reason: String,
    status: { type: String, default: 'pending' },
    approved_by: Number,
    notes: String,
    created_at: { type: Date, default: Date.now }
});
const EmployeeLeave = mongoose.model('EmployeeLeave', EmployeeLeaveSchema);

const EmployeeDeductionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employee_id: { type: Number, required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: String,
    created_at: { type: Date, default: Date.now }
});
const EmployeeDeduction = mongoose.model('EmployeeDeduction', EmployeeDeductionSchema);

const SalaryPaymentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    payment_number: { type: String, unique: true, required: true },
    employee_id: { type: Number, required: true },
    month: { type: String, required: true },
    base_salary: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    net_salary: { type: Number, default: 0 },
    payment_method: { type: String, default: 'cash' },
    payment_account_id: Number,
    journal_entry_id: Number,
    notes: String,
    created_by: Number,
    created_at: { type: Date, default: Date.now }
});
const SalaryPayment = mongoose.model('SalaryPayment', SalaryPaymentSchema);

const ExpenseSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    payment_number: { type: String, unique: true, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    description: String,
    payment_method: { type: String, default: 'cash' },
    payment_account_id: Number,
    journal_entry_id: Number,
    source_type: String,
    source_id: Number,
    notes: String,
    created_by: Number,
    created_at: { type: Date, default: Date.now }
});
ExpenseSchema.index({ date: -1 });
const Expense = mongoose.model('Expense', ExpenseSchema);

const CouponSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true, required: true },
    discount_type: { type: String, required: true },
    discount_value: { type: Number, required: true },
    max_uses: { type: Number, default: 0 },
    current_uses: { type: Number, default: 0 },
    valid_from: String,
    valid_to: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Coupon = mongoose.model('Coupon', CouponSchema);

const OfferSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    title: { type: String, required: true },
    offer_type: { type: String, required: true },
    discount_value: { type: Number, default: 0 },
    target_type: { type: String, required: true },
    target_id: String,
    buy_qty: { type: Number, default: 0 },
    get_qty: { type: Number, default: 0 },
    valid_from: String,
    valid_to: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Offer = mongoose.model('Offer', OfferSchema);

const ActivityLogSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    user_id: Number,
    user_name: { type: String, required: true },
    action: { type: String, required: true },
    module: { type: String, required: true },
    entity_id: Number,
    entity_ref: String,
    created_at: { type: Date, default: Date.now }
});
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

const ReturnItemSchema = new mongoose.Schema({
    product_id: Number,
    description: String,
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    total: { type: Number, required: true }
});

const ReturnSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    return_number: { type: String, unique: true, required: true },
    invoice_id: Number,
    type: { type: String, required: true }, // sales_return, purchase_return
    customer_id: Number,
    supplier_id: Number,
    date: { type: String, required: true },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    refunded_amount: { type: Number, default: 0 },
    payment_method: { type: String, default: 'cash' },
    payment_account_id: Number,
    notes: String,
    journal_entry_id: Number,
    created_by: Number,
    items: [ReturnItemSchema],
    created_at: { type: Date, default: Date.now }
});
ReturnSchema.index({ type: 1, date: -1 });
const Return = mongoose.model('Return', ReturnSchema);

const StockTransferItemSchema = new mongoose.Schema({
    product_id: { type: Number, required: true },
    quantity: { type: Number, required: true }
});

const StockTransferSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    transfer_number: { type: String, unique: true, required: true },
    date: { type: String, required: true },
    status: { type: String, default: 'completed' },
    direction: { type: String, default: 'shop_to_warehouse' },
    notes: String,
    created_by: Number,
    items: [StockTransferItemSchema],
    created_at: { type: Date, default: Date.now }
});
const StockTransfer = mongoose.model('StockTransfer', StockTransferSchema);

const InstallmentPlanSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    invoice_id: Number,
    customer_id: Number,
    status: { type: String, default: 'pending' }
});
const InstallmentPlan = mongoose.model('InstallmentPlan', InstallmentPlanSchema);

const InstallmentPaymentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    plan_id: Number,
    status: { type: String, default: 'pending' },
    paid_date: String,
    payment_method: String,
    notes: String
});
const InstallmentPayment = mongoose.model('InstallmentPayment', InstallmentPaymentSchema);

module.exports = {
    Counter,
    User,
    Permission,
    UserPermission,
    Customer,
    Supplier,
    Account,
    Product,
    Invoice,
    Voucher,
    JournalEntry,
    Setting,
    Employee,
    EmployeeLeave,
    EmployeeDeduction,
    SalaryPayment,
    Expense,
    Coupon,
    Offer,
    ActivityLog,
    Return,
    StockTransfer,
    InstallmentPlan,
    InstallmentPayment,
    DeletedRecord,
    getNextSequenceValue,
    syncSequence
};
