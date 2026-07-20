const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class AccountsRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Account.find({}).sort({ code: 1 }).lean();
    }

    async getTree() {
        const accounts = await this.getAll();
        const map = {}; const roots = [];
        for (const a of accounts) { a.children = []; map[a.id] = a; }
        for (const a of accounts) {
            if (a.parent_id && map[a.parent_id]) {
                map[a.parent_id].children.push(a);
            } else {
                roots.push(a);
            }
        }
        return roots;
    }

    async getBankAccounts() {
        return await Account.find({
            $or: [
                { code: /^111/ },
                { code: /^112/ }
            ],
            can_post: true
        }).sort({ code: 1 }).lean();
    }

    async create(a) {
        try {
            const nextId = await getNextSequenceValue('accounts');
            await Account.create({
                id: nextId, code: a.code, name: a.name, parent_id: a.parent_id || null,
                account_type: a.account_type, nature: a.nature, can_post: a.can_post ? true : false
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(a) {
        try {
            await Account.updateOne({ id: a.id }, {
                $set: {
                    code: a.code, name: a.name, parent_id: a.parent_id || null,
                    account_type: a.account_type, nature: a.nature, can_post: a.can_post ? true : false,
                    is_active: a.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        const hasChildren = await Account.countDocuments({ parent_id: id });
        if (hasChildren > 0) return { success: false, error: 'لا يمكن حذف حساب له فرعية' };
        try {
            await Account.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = AccountsRepo;
