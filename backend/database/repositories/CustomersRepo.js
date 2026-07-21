const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class CustomersRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Customer.find({}).sort({ name: 1 }).lean();
    }

    async getById(id) {
        return await Customer.findOne({ id }).lean();
    }

    async create(c) {
        try {
            // Check for duplicate name
            const duplicateName = await Customer.findOne({ name: c.name });
            if (duplicateName) {
                return { success: false, error: 'اسم العميل موجود بالفعل ومسجل مسبقاً' };
            }

            const lastDoc = await Customer.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/C(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            
            // Loop until a completely unique code is generated
            let code = c.code;
            if (!code) {
                let isUnique = false;
                while (!isUnique) {
                    code = `C${String(nextNumVal).padStart(4, '0')}`;
                    const dup = await Customer.findOne({ code });
                    if (!dup) {
                        isUnique = true;
                    } else {
                        nextNumVal++;
                    }
                }
            }

            const openingBalance = parseFloat(c.opening_balance) || 0;
            const openingDate = c.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const nextId = await getNextSequenceValue('customers');
            await Customer.create({
                id: nextId, code, name: c.name, phone: c.phone, email: c.email, address: c.address,
                tax_number: c.tax_number, credit_limit: c.credit_limit || 0, notes: c.notes,
                opening_balance: openingBalance, opening_balance_date: openingDate, balance: openingBalance
            });
            
            if (openingBalance > 0) {
                const jeId = await this.db._handleOpeningBalance('customer', nextId, 0, null, openingBalance, openingDate, code, c.name);
                if (jeId) {
                    await Customer.updateOne({ id: nextId }, { $set: { opening_balance_je_id: jeId } });
                }
            }
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(c) {
        try {
            // Check for duplicate name
            if (c.name !== undefined) {
                const duplicateName = await Customer.findOne({ name: c.name, id: { $ne: c.id } });
                if (duplicateName) {
                    return { success: false, error: 'اسم العميل موجود بالفعل ومسجل مسبقاً' };
                }
            }

            const old = await Customer.findOne({ id: c.id });
            if (!old) return { success: false, error: 'Customer not found' };

            const oldOpeningBalance = parseFloat(old.opening_balance) || 0;
            const newOpeningBalance = parseFloat(c.opening_balance) || 0;
            const oldJeId = old.opening_balance_je_id;
            const openingDate = c.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const balanceDiff = newOpeningBalance - oldOpeningBalance;
            const newBalance = (old.balance || 0) + balanceDiff;

            let newJeId = oldJeId;
            if (newOpeningBalance !== oldOpeningBalance || openingDate !== old.opening_balance_date) {
                newJeId = await this.db._handleOpeningBalance('customer', c.id, oldOpeningBalance, oldJeId, newOpeningBalance, openingDate, old.code, c.name);
            }

            await Customer.updateOne({ id: c.id }, {
                $set: {
                    name: c.name, phone: c.phone, email: c.email, address: c.address, tax_number: c.tax_number,
                    credit_limit: c.credit_limit, notes: c.notes, is_active: c.is_active ? true : false,
                    opening_balance: newOpeningBalance, opening_balance_date: openingDate, opening_balance_je_id: newJeId,
                    balance: newBalance
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const old = await Customer.findOne({ id });
            if (old && old.opening_balance_je_id) {
                try {
                    await this.db.journal.delete(old.opening_balance_je_id);
                } catch (e) {
                    console.error("Error deleting opening balance journal entry:", e);
                }
            }
            await Customer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getNextCode() {
        try {
            const lastDoc = await Customer.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/C(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            let code = '';
            let isUnique = false;
            while (!isUnique) {
                code = `C${String(nextNumVal).padStart(4, '0')}`;
                const dup = await Customer.findOne({ code });
                if (!dup) {
                    isUnique = true;
                } else {
                    nextNumVal++;
                }
            }
            return code;
        } catch (e) {
            console.error('Error generating next customer code:', e);
            return '';
        }
    }
}

module.exports = CustomersRepo;
