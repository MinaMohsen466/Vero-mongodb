const mongoose = require('mongoose');

const InstallmentPlanSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    invoice_id: Number,
    customer_id: Number,
    status: { type: String, default: 'pending' }
});
const InstallmentPlan = mongoose.model('InstallmentPlan', InstallmentPlanSchema);

module.exports = InstallmentPlan;
