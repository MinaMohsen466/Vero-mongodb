const mongoose = require('mongoose');

const InstallmentPaymentSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    plan_id: Number,
    status: { type: String, default: 'pending' },
    paid_date: String,
    payment_method: String,
    notes: String
});
const InstallmentPayment = mongoose.model('InstallmentPayment', InstallmentPaymentSchema);

module.exports = InstallmentPayment;
