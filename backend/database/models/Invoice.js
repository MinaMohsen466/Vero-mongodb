const mongoose = require('mongoose');

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

module.exports = Invoice;
