const mongoose = require('mongoose');

const EmployeeLeaveSchema = new mongoose.Schema({
    id: { type: Number, unique: true },
    employee_id: { type: Number, required: true },
    leave_type: { type: String, required: true },
    start_date: { type: String, required: true },
    end_date: { type: String, required: true },
    days: { type: Number, required: true },
    reason: String,
    status: { type: String, default: 'pending' },
    approved_by: Number,
    notes: String,
    created_at: { type: Date, default: Date.now }
});
const EmployeeLeave = mongoose.model('EmployeeLeave', EmployeeLeaveSchema);

module.exports = EmployeeLeave;
