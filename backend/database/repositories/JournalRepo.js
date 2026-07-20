const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class JournalRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        const entries = await JournalEntry.find({}).sort({ date: -1 }).lean();
        if (entries.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const accountMap = new Map(accounts.map(a => [a.id, a]));

        for (const e of entries) {
            for (const line of e.lines || []) {
                const a = accountMap.get(line.account_id);
                line.account_name = a ? a.name : '';
                line.account_code = a ? a.code : '';
            }
        }
        return entries;
    }

    async create(e) {
        try {
            const maxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxNumVal = 0;
            if (maxNumDoc && maxNumDoc.entry_number) {
                const match = maxNumDoc.entry_number.match(/JE-(\d+)/);
                if (match) maxNumVal = parseInt(match[1], 10);
            }
            const nextNum = maxNumVal + 1;
            const num = e.entry_number || `JE-${String(nextNum).padStart(6, '0')}`;
            
            const nextId = await getNextSequenceValue('journal_entries');
            await JournalEntry.create({
                id: nextId,
                entry_number: num,
                date: e.date,
                description: e.description || null,
                reference: e.reference || null,
                created_by: e.created_by || null,
                lines: (e.lines || []).map(line => ({
                    account_id: line.account_id,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    description: line.description || ''
                }))
            });

            for (const line of e.lines || []) {
                const change = (line.debit || 0) - (line.credit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }

            return { success: true, id: nextId, entry_number: num };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async delete(id) {
        try {
            const je = await JournalEntry.findOne({ id });
            if (je) {
                for (const line of je.lines || []) {
                    const change = (line.credit || 0) - (line.debit || 0);
                    await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
                }
                await JournalEntry.deleteOne({ id });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = JournalRepo;
