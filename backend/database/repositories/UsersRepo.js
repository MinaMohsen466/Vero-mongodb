const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');
const { hashPassword, verifyPassword } = require('../utils/security');

class UsersRepo {
    constructor(db) { this.db = db; }
    
    async login(username, password) {
        const userDoc = await User.findOne({ username, is_active: true });
        if (userDoc) {
            const isMatch = verifyPassword(password, userDoc.password_hash);
            if (isMatch) {
                // Auto-upgrade plain-text password to hash on successful login
                if (!userDoc.password_hash.startsWith('pbkdf2v2$')) {
                    userDoc.password_hash = hashPassword(password);
                    await User.updateOne({ id: userDoc.id }, { $set: { password_hash: userDoc.password_hash } });
                }

                const user = userDoc.toObject();
                delete user.password_hash;
                
                // Load permissions
                const rolePerms = await Permission.find({ role: user.role }).lean();
                const permMap = {};
                for (const p of rolePerms) {
                    permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
                }
                // User overrides
                const hasIndividual = await UserPermission.countDocuments({ user_id: user.id });
                if (hasIndividual > 0) {
                    const userPerms = await UserPermission.find({ user_id: user.id }).lean();
                    for (const p of userPerms) {
                        permMap[p.module] = { can_view: !!p.can_view, can_create: !!p.can_create, can_edit: !!p.can_edit, can_delete: !!p.can_delete };
                    }
                    user.has_individual_permissions = true;
                }
                if (user.role === 'admin') {
                    permMap['settings'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['permissions'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['dashboard'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    permMap['offers'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                }
                user.permissions = permMap;
                return { success: true, user };
            }
        }
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    async getAll() {
        return await User.find({}, 'id username full_name role is_active created_at').lean();
    }

    async create(user) {
        try {
            const nextId = await getNextSequenceValue('users');
            await User.create({
                id: nextId,
                username: user.username,
                password_hash: hashPassword(user.password),
                full_name: user.full_name,
                role: user.role || 'user'
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(user) {
        try {
            const updateData = {
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                is_active: user.is_active ? true : false
            };
            if (user.password) {
                if (user.current_password !== undefined) {
                    const existing = await User.findOne({ id: user.id });
                    if (!existing || !verifyPassword(user.current_password, existing.password_hash)) {
                        return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
                    }
                }
                updateData.password_hash = hashPassword(user.password);
            }
            await User.updateOne({ id: user.id }, { $set: updateData });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const numId = parseInt(id, 10);
            if (numId === 1) return { success: false, error: 'لا يمكن حذف حساب المدير الرئيسي' };
            await User.deleteOne({ id: numId });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = UsersRepo;
