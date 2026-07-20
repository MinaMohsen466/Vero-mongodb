const mongoose = require('mongoose');

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

module.exports = Return;
