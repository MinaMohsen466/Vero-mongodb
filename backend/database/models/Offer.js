const mongoose = require('mongoose');

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

module.exports = Offer;
