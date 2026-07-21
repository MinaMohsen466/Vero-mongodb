const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class SuppliersRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Supplier.find({}).sort({ name: 1 }).lean();
    }

    async getById(id) {
        return await Supplier.findOne({ id }).lean();
    }

    async create(s) {
        try {
            // Check for duplicate name
            const duplicateName = await Supplier.findOne({ name: s.name });
            if (duplicateName) {
                return { success: false, error: 'اسم المورد موجود بالفعل ومسجل مسبقاً' };
            }

            const lastDoc = await Supplier.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/S(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            
            // Loop until a completely unique code is generated
            let code = s.code;
            if (!code) {
                let isUnique = false;
                while (!isUnique) {
                    code = `S${String(nextNumVal).padStart(4, '0')}`;
                    const dup = await Supplier.findOne({ code });
                    if (!dup) {
                        isUnique = true;
                    } else {
                        nextNumVal++;
                    }
                }
            }

            const openingBalance = parseFloat(s.opening_balance) || 0;
            const openingDate = s.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const nextId = await getNextSequenceValue('suppliers');
            await Supplier.create({
                id: nextId, code, name: s.name, phone: s.phone, email: s.email, address: s.address,
                tax_number: s.tax_number, notes: s.notes, opening_balance: openingBalance,
                opening_balance_date: openingDate, balance: openingBalance
            });
            
            if (openingBalance > 0) {
                const jeId = await this.db._handleOpeningBalance('supplier', nextId, 0, null, openingBalance, openingDate, code, s.name);
                if (jeId) {
                    await Supplier.updateOne({ id: nextId }, { $set: { opening_balance_je_id: jeId } });
                }
            }
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(s) {
        try {
            // Check for duplicate name
            if (s.name !== undefined) {
                const duplicateName = await Supplier.findOne({ name: s.name, id: { $ne: s.id } });
                if (duplicateName) {
                    return { success: false, error: 'اسم المورد موجود بالفعل ومسجل مسبقاً' };
                }
            }

            const old = await Supplier.findOne({ id: s.id });
            if (!old) return { success: false, error: 'Supplier not found' };

            const oldOpeningBalance = parseFloat(old.opening_balance) || 0;
            const newOpeningBalance = parseFloat(s.opening_balance) || 0;
            const oldJeId = old.opening_balance_je_id;
            const openingDate = s.opening_balance_date || new Date().toISOString().split('T')[0];
            
            const balanceDiff = newOpeningBalance - oldOpeningBalance;
            const newBalance = (old.balance || 0) + balanceDiff;

            let newJeId = oldJeId;
            if (newOpeningBalance !== oldOpeningBalance || openingDate !== old.opening_balance_date) {
                newJeId = await this.db._handleOpeningBalance('supplier', s.id, oldOpeningBalance, oldJeId, newOpeningBalance, openingDate, old.code, s.name);
            }

            await Supplier.updateOne({ id: s.id }, {
                $set: {
                    name: s.name, phone: s.phone, email: s.email, address: s.address, tax_number: s.tax_number,
                    notes: s.notes, is_active: s.is_active ? true : false, opening_balance: newOpeningBalance,
                    opening_balance_date: openingDate, opening_balance_je_id: newJeId, balance: newBalance
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const old = await Supplier.findOne({ id });
            if (old && old.opening_balance_je_id) {
                try {
                    await this.db.journal.delete(old.opening_balance_je_id);
                } catch (e) {
                    console.error("Error deleting opening balance journal entry:", e);
                }
            }
            await Supplier.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getNextCode() {
        try {
            const lastDoc = await Supplier.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/S(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            let code = '';
            let isUnique = false;
            while (!isUnique) {
                code = `S${String(nextNumVal).padStart(4, '0')}`;
                const dup = await Supplier.findOne({ code });
                if (!dup) {
                    isUnique = true;
                } else {
                    nextNumVal++;
                }
            }
            return code;
        } catch (e) {
            console.error('Error generating next supplier code:', e);
            return '';
        }
    }
}

module.exports = SuppliersRepo;
