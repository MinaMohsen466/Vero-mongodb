const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class CouponsRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        return await Coupon.find({}).sort({ id: -1 }).lean();
    }

    async create(data) {
        try {
            const nextId = await getNextSequenceValue('coupons');
            await Coupon.create({
                id: nextId, code: data.code.toUpperCase(), discount_type: data.discount_type,
                discount_value: data.discount_value, max_uses: data.max_uses || 0,
                valid_from: data.valid_from || null, valid_to: data.valid_to || null,
                is_active: data.is_active !== undefined ? (data.is_active ? true : false) : true
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(data) {
        try {
            await Coupon.updateOne({ id: data.id }, {
                $set: {
                    code: data.code.toUpperCase(), discount_type: data.discount_type,
                    discount_value: data.discount_value, max_uses: data.max_uses,
                    valid_from: data.valid_from || null, valid_to: data.valid_to || null,
                    is_active: data.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await Coupon.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async validate(code) {
        const coupon = await Coupon.findOne({ code: new RegExp('^' + code + '$', 'i') }).lean();
        if (!coupon) return { valid: false, error: 'الكوبون غير موجود' };
        if (!coupon.is_active) return { valid: false, error: 'الكوبون غير مفعل' };
        
        if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
            return { valid: false, error: 'تم تجاوز الحد الأقصى لاستخدام الكوبون' };
        }
        
        const now = new Date().toISOString().split('T')[0];
        if (coupon.valid_from && now < coupon.valid_from) return { valid: false, error: 'تاريخ بداية الكوبون لم يحن بعد' };
        if (coupon.valid_to && now > coupon.valid_to) return { valid: false, error: 'الكوبون منتهي الصلاحية' };
        
        return { valid: true, coupon };
    }

    async incrementUse(id) {
        await Coupon.updateOne({ id }, { $inc: { current_uses: 1 } });
    }
}

module.exports = CouponsRepo;
