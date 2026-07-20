const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');
const { hashPassword, verifyPassword } = require('../utils/security');

class SystemRepo {
    constructor(db) { this.db = db; }

    async isFirstRun() {
        const setupComplete = await Setting.findOne({ key: 'setup_complete' }).lean();
        if (setupComplete) {
            return setupComplete.value === '0';
        }

        const admin = await User.findOne({ role: 'admin' }).lean();
        const companyName = await Setting.findOne({ key: 'company_name' }).lean();
        const defaultAdminPassword = this.db.adminConfig?.getAdminPassword();
        
        let isDefault = true;
        if (admin && !verifyPassword(defaultAdminPassword, admin.password_hash)) isDefault = false;
        if (companyName && companyName.value !== 'شركتي') isDefault = false;

        const invoicesCount = await Invoice.countDocuments();
        if (invoicesCount > 0) isDefault = false;

        if (!isDefault) {
            await Setting.updateOne({ key: 'setup_complete' }, { $set: { value: '1', category: 'system' } }, { upsert: true });
            return false;
        }

        return true;
    }

    async runSetup(data) {
        try {
            if (data.company_name) await Setting.updateOne({ key: 'company_name' }, { $set: { value: data.company_name, category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_phone' }, { $set: { value: data.company_phone || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_address' }, { $set: { value: data.company_address || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'company_tax_number' }, { $set: { value: data.company_tax_number || '', category: 'company' } }, { upsert: true });
            await Setting.updateOne({ key: 'currency' }, { $set: { value: data.currency || 'دينار كويتي', category: 'general' } }, { upsert: true });

            if (data.company_logo) {
                await Setting.updateOne({ key: 'company_logo' }, { $set: { value: data.company_logo, category: 'company' } }, { upsert: true });
            }
            if (data.invoice_template) {
                await Setting.updateOne({ key: 'invoice_template' }, { $set: { value: data.invoice_template, category: 'invoice' } }, { upsert: true });
            }

            const allowNegative = data.allow_negative_stock ? '1' : '0';
            await Setting.updateOne({ key: 'allow_negative_stock' }, { $set: { value: allowNegative, category: 'general' } }, { upsert: true });

            if (data.admin_username && data.admin_password) {
                if (data.admin_username.toLowerCase() === 'admin') {
                    throw new Error("لا يمكن استخدام اسم المستخدم 'admin' لأنه محجوز للنظام الأساسي. الرجاء اختيار اسم آخر.");
                }
                const nextId = await getNextSequenceValue('users');
                await User.create({
                    id: nextId, username: data.admin_username, password_hash: hashPassword(data.admin_password),
                    full_name: data.admin_name || 'مدير الشركة', role: 'admin'
                });
            }

            await Setting.updateOne({ key: 'setup_complete' }, { $set: { value: '1', category: 'system' } }, { upsert: true });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = SystemRepo;
