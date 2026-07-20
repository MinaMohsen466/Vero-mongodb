const mongoose = require('mongoose');

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

module.exports = Expense;
