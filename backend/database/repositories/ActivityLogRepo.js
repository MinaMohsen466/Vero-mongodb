const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class ActivityLogRepo {
    constructor(db) { this.db = db; }

    async log({ user_id, user_name, action, module, entity_id, entity_ref }) {
        try {
            const nextId = await getNextSequenceValue('activity_log');
            await ActivityLog.create({
                id: nextId, user_id: user_id || null, user_name: user_name || 'system',
                action, module, entity_id: entity_id || null, entity_ref: entity_ref || null
            });
        } catch (e) {
            console.error('[ActivityLog] Failed to log:', e.message);
        }
    }

    async getAll({ module, action, user_name, startDate, endDate, limit } = {}) {
        try {
            const filter = {};
            if (module) filter.module = module;
            if (action) filter.action = action;
            if (user_name) filter.user_name = new RegExp(user_name, 'i');
            if (startDate || endDate) {
                filter.created_at = {};
                if (startDate) filter.created_at.$gte = new Date(startDate + 'T00:00:00.000Z');
                if (endDate) filter.created_at.$lte = new Date(endDate + 'T23:59:59.999Z');
            }
            return await ActivityLog.find(filter).sort({ id: -1 }).limit(limit || 500).lean();
        } catch (e) {
            console.error('[ActivityLog] getAll error:', e.message);
            return [];
        }
    }
}

module.exports = ActivityLogRepo;
