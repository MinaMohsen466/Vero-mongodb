const mongoose = require('mongoose');

const EmployeeDeductionSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employee_id: { type: Number, required: true },
    month: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: String,
    created_at: { type: Date, default: Date.now }
});
const EmployeeDeduction = mongoose.model('EmployeeDeduction', EmployeeDeductionSchema);

module.exports = EmployeeDeduction;
