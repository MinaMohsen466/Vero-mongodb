const mongoose = require('mongoose');

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
const Supplier = mongoose.model('Supplier', SupplierSchema);

module.exports = Supplier;
