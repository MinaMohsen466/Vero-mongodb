const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class SettingsRepo {
    constructor(db) { this.db = db; }
    
    async get(key) {
        const s = await Setting.findOne({ key }).lean();
        return s ? s.value : null;
    }

    async getAll() {
        const settings = await Setting.find({}).lean();
        const result = {};
        for (const s of settings) {
            if (!result[s.category]) result[s.category] = {};
            result[s.category][s.key] = s.value;
        }
        return result;
    }

    async set(category, key, value) {
        try {
            await Setting.updateOne({ key }, { $set: { value, category } }, { upsert: true });
            return { success: true };
        } catch (e) {
            console.error('Settings save error:', e);
            return { success: false, error: e.message };
        }
    }
}

module.exports = SettingsRepo;
