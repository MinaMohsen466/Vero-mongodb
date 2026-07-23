const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue, syncSequence 
} = require('../models');

class PermissionsRepo {
    constructor(db) { this.db = db; }

    async getByRole(role) {
        const perms = await Permission.find({ role }).lean();
        const result = {};
        for (const p of perms) {
            result[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
        }
        if (role === 'admin') {
            const allMods = [
                'dashboard', 'customers', 'suppliers', 'products', 'products_import', 'products_export',
                'excel_backup', 'sales_invoices', 'sales_returns', 'purchase_invoices', 'purchase_returns',
                'quotations', 'offers', 'vouchers', 'receipt_vouchers', 'payment_vouchers', 'journal_entries',
                'expenses', 'hr', 'warehouse', 'pos', 'reports', 'settings', 'permissions', 'users', 'activity_log',
                'admin_system_reset', 'admin_delete_products', 'admin_activity_log', 'admin_user_management', 'admin_cloud_database', 'admin_excel_export'
            ];
            for (const mod of allMods) {
                if (result[mod] === undefined) {
                    result[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                }
            }
        }
        return result;
    }

    async savePermissions(role, permissions) {
        try {
            await syncSequence('permissionId', Permission);

            // Clean up any legacy docs with id: null
            try {
                const nullDocs = await Permission.find({ $or: [{ id: null }, { id: { $exists: false } }] });
                for (const doc of nullDocs) {
                    const maxDoc = await Permission.findOne({ id: { $ne: null } }).sort({ id: -1 }).lean();
                    const nextId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id + 1 : 1;
                    await Permission.updateOne({ _id: doc._id }, { $set: { id: nextId } });
                }
            } catch (err) {}

            for (const [module, actions] of Object.entries(permissions)) {
                const existing = await Permission.findOne({ role, module });
                if (existing) {
                    await Permission.updateOne({ _id: existing._id }, {
                        $set: {
                            can_view: actions.can_view ? true : false,
                            can_create: actions.can_create ? true : false,
                            can_edit: actions.can_edit ? true : false,
                            can_delete: actions.can_delete ? true : false
                        }
                    });
                } else {
                    const maxDoc = await Permission.findOne().sort({ id: -1 }).lean();
                    const maxId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id : 0;
                    const seqId = await getNextSequenceValue('permissionId');
                    const id = Math.max(seqId, maxId + 1);
                    if (id > seqId) {
                        await Counter.findByIdAndUpdate('permissionId', { $set: { seq: id } }, { upsert: true });
                    }

                    await Permission.create({
                        id,
                        role,
                        module,
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    });
                }
            }
            return { success: true };
        } catch (e) {
            console.error('Error saving role permissions:', e);
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
        // Ensure admin special modules default to enabled if missing or empty
        const userDoc = await User.findOne({ id: userId }).lean();
        if (userDoc && (userDoc.id === 1 || userDoc.username === 'admin')) {
            const adminSpecialMods = [
                'admin_system_reset', 'admin_delete_products', 'admin_activity_log',
                'admin_user_management', 'admin_cloud_database', 'admin_excel_export'
            ];
            for (const mod of adminSpecialMods) {
                if (result[mod] === undefined) {
                    result[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                }
            }
        }
        return { hasIndividual: true, permissions: result };
    }

    async saveUserPermissions(userId, permissions) {
        try {
            await syncSequence('userPermissionId', UserPermission);

            // Clean up any legacy docs with id: null
            try {
                const nullUserDocs = await UserPermission.find({ $or: [{ id: null }, { id: { $exists: false } }] });
                for (const doc of nullUserDocs) {
                    const maxDoc = await UserPermission.findOne({ id: { $ne: null } }).sort({ id: -1 }).lean();
                    const nextId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id + 1 : 1;
                    await UserPermission.updateOne({ _id: doc._id }, { $set: { id: nextId } });
                }
            } catch (err) {}

            for (const [module, actions] of Object.entries(permissions)) {
                const existing = await UserPermission.findOne({ user_id: userId, module });
                if (existing) {
                    await UserPermission.updateOne({ _id: existing._id }, {
                        $set: {
                            can_view: actions.can_view ? true : false,
                            can_create: actions.can_create ? true : false,
                            can_edit: actions.can_edit ? true : false,
                            can_delete: actions.can_delete ? true : false
                        }
                    });
                } else {
                    const maxDoc = await UserPermission.findOne().sort({ id: -1 }).lean();
                    const maxId = (maxDoc && typeof maxDoc.id === 'number') ? maxDoc.id : 0;
                    const seqId = await getNextSequenceValue('userPermissionId');
                    const id = Math.max(seqId, maxId + 1);
                    if (id > seqId) {
                        await Counter.findByIdAndUpdate('userPermissionId', { $set: { seq: id } }, { upsert: true });
                    }

                    await UserPermission.create({
                        id,
                        user_id: userId,
                        module,
                        can_view: actions.can_view ? true : false,
                        can_create: actions.can_create ? true : false,
                        can_edit: actions.can_edit ? true : false,
                        can_delete: actions.can_delete ? true : false
                    });
                }
            }
            return { success: true };
        } catch (e) {
            console.error('Error saving user permissions:', e);
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
