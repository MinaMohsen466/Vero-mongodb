const mongoose = require('mongoose');

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

module.exports = SalaryPayment;
