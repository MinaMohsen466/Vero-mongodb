const mongoose = require('mongoose');

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

module.exports = StockTransfer;
