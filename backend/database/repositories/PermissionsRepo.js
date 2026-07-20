const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class PermissionsRepo {
    constructor(db) { this.db = db; }

    async getByRole(role) {
        const perms = await Permission.find({ role }).lean();
        const result = {};
        for (const p of perms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return result;
    }

    async savePermissions(role, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                await Permission.updateOne({ role, module }, {
                    $set: {
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    }
                }, { upsert: true });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getUserPermissions(userId) {
        const userPerms = await UserPermission.find({ user_id: userId }).lean();
        if (userPerms.length === 0) {
            return { hasIndividual: false, permissions: {} };
        }
        const result = {};
        for (const p of userPerms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        return { hasIndividual: true, permissions: result };
    }

    async saveUserPermissions(userId, permissions) {
        try {
            for (const [module, actions] of Object.entries(permissions)) {
                await UserPermission.updateOne({ user_id: userId, module }, {
                    $set: {
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    }
                }, { upsert: true });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async clearUserPermissions(userId) {
        try {
            await UserPermission.deleteMany({ user_id: userId });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = PermissionsRepo;
