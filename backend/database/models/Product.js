const mongoose = require('mongoose');

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

module.exports = Product;
