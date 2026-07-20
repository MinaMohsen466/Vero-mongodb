const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    code: { type: String, unique: true },
    name: { type: String, required: true },
    job_title: String,
    department: String,
    hire_date: String,
    base_salary: { type: Number, default: 0 },
    phone: String,
    email: String,
    national_id: String,
    address: String,
    account_id: Number,
    bank_account: String,
    notes: String,
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});
const Employee = mongoose.model('Employee', EmployeeSchema);

module.exports = Employee;
