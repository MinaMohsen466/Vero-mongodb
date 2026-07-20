const mongoose = require('mongoose');

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

module.exports = Voucher;
