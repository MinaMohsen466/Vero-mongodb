const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class LeavesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const leaves = await EmployeeLeave.find({}).sort({ start_date: -1 }).lean();
        for (const el of leaves) {
            const e = await Employee.findOne({ id: el.employee_id }).lean();
            el.employee_name = e ? e.name : '';
            el.department = e ? e.department : '';
        }
        return leaves;
    }

    async getByEmployee(employeeId) {
        return await EmployeeLeave.find({ employee_id: employeeId }).sort({ start_date: -1 }).lean();
    }

    async create(leave) {
        try {
            const nextId = await getNextSequenceValue('employee_leaves');
            await EmployeeLeave.create({
                id: nextId, employee_id: leave.employee_id, leave_type: leave.leave_type,
                start_date: leave.start_date, end_date: leave.end_date, days: leave.days || 1,
                reason: leave.reason || '', status: leave.status || 'pending', notes: leave.notes || ''
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async updateStatus(id, status, approvedBy) {
        try {
            await EmployeeLeave.updateOne(
                { id },
                { $set: { status, approved_by: approvedBy || null } }
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await EmployeeLeave.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = LeavesRepo;
