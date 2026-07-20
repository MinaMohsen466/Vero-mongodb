const mongoose = require('mongoose');

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

module.exports = Coupon;
