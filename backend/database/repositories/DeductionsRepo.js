const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class DeductionsRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const deductions = await EmployeeDeduction.find({}).sort({ created_at: -1 }).lean();
        for (const ed of deductions) {
            const e = await Employee.findOne({ id: ed.employee_id }).lean();
            ed.employee_name = e ? e.name : '';
            ed.department = e ? e.department : '';
        }
        return deductions;
    }

    async getByEmployee(employeeId) {
        return await EmployeeDeduction.find({ employee_id: employeeId }).sort({ created_at: -1 }).lean();
    }

    async create(deduction) {
        try {
            const nextId = await getNextSequenceValue('employee_deductions');
            await EmployeeDeduction.create({
                id: nextId, employee_id: deduction.employee_id, month: deduction.month,
                amount: deduction.amount, reason: deduction.reason || ''
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await EmployeeDeduction.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = DeductionsRepo;
