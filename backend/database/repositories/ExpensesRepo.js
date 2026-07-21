const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class ExpensesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const expenses = await Expense.find({}).sort({ date: -1, created_at: -1 }).lean();
        if (expenses.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const accountMap = new Map(accounts.map(a => [a.id, a.name]));

        for (const ex of expenses) {
            if (ex.payment_account_id) {
                ex.payment_account_name = accountMap.get(ex.payment_account_id) || '';
            }
        }
        return expenses;
    }

    async getTotal(startDate, endDate, category = null) {
        try {
            const filter = {};
            if (startDate || endDate) {
                filter.date = {};
                if (startDate) filter.date.$gte = startDate;
                if (endDate) filter.date.$lte = endDate;
            }
            if (category && category !== 'all') {
                filter.category = category;
            }
            
            const expenses = await Expense.find(filter).lean();
            let total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

            if (!category || category === 'all' || category === 'salary') {
                const salaryPayments = await SalaryPayment.find({}).lean();
                for (const sp of salaryPayments) {
                    const exists = await Expense.findOne({ source_type: 'salary', source_id: sp.id });
                    if (!exists) {
                        let spDate = sp.created_at ? sp.created_at.toISOString().substring(0, 10) : '';
                        if (sp.journal_entry_id) {
                            const je = await JournalEntry.findOne({ id: sp.journal_entry_id }).lean();
                            if (je) spDate = je.date;
                        }
                        const matchesDate = (!startDate || spDate >= startDate) && (!endDate || spDate <= endDate);
                        if (matchesDate) {
                            total += (sp.net_salary || 0);
                        }
                    }
                }
            }

            return total;
        } catch (e) {
            return 0;
        }
    }

    async create(payment) {
        try {
            const lastDoc = await Expense.findOne({}).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.payment_number) {
                const match = lastDoc.payment_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const payNum = `EXP-${String(nextNumVal).padStart(6, '0')}`;
            const amount = parseFloat(payment.amount) || 0;
            if (amount <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

            const category = payment.category || 'other';
            let targetAccountCode = '57'; // other
            if (category === 'rent') targetAccountCode = '53';
            else if (category === 'salary') targetAccountCode = '521';
            else if (category === 'hospitality') targetAccountCode = '54';
            else if (category === 'utilities') targetAccountCode = '55';
            else if (category === 'maintenance') targetAccountCode = '56';

            const cashAccount = await Account.findOne({ code: '111' });
            const bankAccount = await Account.findOne({ code: '112' });
            let paymentAccountId = payment.payment_account_id ? parseInt(payment.payment_account_id, 10) : null;
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            let expenseAccount = await Account.findOne({ code: targetAccountCode });
            if (!expenseAccount) {
                expenseAccount = await Account.findOne({ code: '5' });
            }

            const maxJe = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxJeVal = 0;
            if (maxJe && maxJe.entry_number) {
                const match = maxJe.entry_number.match(/JE-(\d+)/);
                if (match) maxJeVal = parseInt(match[1], 10);
            }
            const jeNum = `JE-${String(maxJeVal + 1).padStart(6, '0')}`;
            const desc = payment.description || `مصروفات ${expenseAccount?.name || 'عامة'}`;
            const jeDesc = `قيد مصروف - ${payment.date} - ${desc}`;
            const jeId = await getNextSequenceValue('journal_entries');

            const lines = [];
            if (expenseAccount) {
                lines.push({ account_id: expenseAccount.id, debit: amount, credit: 0, description: `مصروف ${payment.date} - ${desc}` });
            }
            if (paymentAccountId) {
                lines.push({ account_id: paymentAccountId, debit: 0, credit: amount, description: `دفع مصروف ${payment.date}` });
            }

            await JournalEntry.create({
                id: jeId, entry_number: jeNum, date: payment.date, description: jeDesc, reference: payNum,
                created_by: payment.created_by || null, lines
            });

            if (expenseAccount) await Account.updateOne({ id: expenseAccount.id }, { $inc: { balance: amount } });
            if (paymentAccountId) await Account.updateOne({ id: paymentAccountId }, { $inc: { balance: -amount } });

            const nextId = await getNextSequenceValue('expenses');
            await Expense.create({
                id: nextId, payment_number: payNum, category, date: payment.date, amount, description: desc,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, source_type: payment.source_type || null, source_id: payment.source_id || null,
                notes: payment.notes || null, created_by: payment.created_by || null
            });

            return { success: true, id: nextId, payment_number: payNum };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const payment = await Expense.findOne({ id });
            if (!payment) return { success: false, error: 'السجل غير موجود' };
            if (payment.source_type === 'salary') {
                return { success: false, error: 'مصروف الراتب مرتبط بسجل الرواتب. احذف صرف الراتب من شاشة الرواتب.' };
            }

            if (payment.journal_entry_id) {
                const je = await JournalEntry.findOne({ id: payment.journal_entry_id });
                if (je) {
                    for (const line of je.lines || []) {
                        const change = (line.credit || 0) - (line.debit || 0);
                        await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
                    }
                    await JournalEntry.deleteOne({ id: payment.journal_entry_id });
                }
            }

            await Expense.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = ExpensesRepo;
