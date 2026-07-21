const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class SalaryRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const payments = await SalaryPayment.find({}).sort({ created_at: -1 }).lean();
        for (const sp of payments) {
            const e = await Employee.findOne({ id: sp.employee_id }).lean();
            sp.employee_name = e ? e.name : '';
            sp.job_title = e ? e.job_title : '';
            sp.department = e ? e.department : '';
            
            if (sp.journal_entry_id) {
                const je = await JournalEntry.findOne({ id: sp.journal_entry_id }).lean();
                sp.payment_date = je ? je.date : '';
            }
            if (sp.payment_account_id) {
                const a = await Account.findOne({ id: sp.payment_account_id }).lean();
                sp.payment_account_name = a ? a.name : '';
            }
        }
        return payments;
    }

    async getByEmployee(employeeId) {
        return await SalaryPayment.find({ employee_id: employeeId }).sort({ month: -1 }).lean();
    }

    async pay(payment) {
        try {
            const lastDoc = await SalaryPayment.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.payment_number) {
                const match = lastDoc.payment_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const payNum = `SAL-${String(nextNumVal).padStart(6, '0')}`;

            const emp = await Employee.findOne({ id: payment.employee_id });
            if (!emp) return { success: false, error: 'الموظف غير موجود' };

            const existing = await SalaryPayment.findOne({ employee_id: payment.employee_id, month: payment.month });
            if (existing) return { success: false, error: 'تم صرف راتب هذا الشهر مسبقاً' };

            const monthDeductions = await EmployeeDeduction.aggregate([
                { $match: { employee_id: parseInt(payment.employee_id, 10), month: payment.month } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalDeductions = payment.deductions !== undefined ? parseFloat(payment.deductions) : (monthDeductions[0]?.total || 0);
            const baseSalary = payment.base_salary !== undefined ? parseFloat(payment.base_salary) : (emp.base_salary || 0);
            const netSalary = baseSalary - totalDeductions;

            const cashAccount = await Account.findOne({ code: '111' });
            const bankAccount = await Account.findOne({ code: '112' });
            let paymentAccountId = payment.payment_account_id ? parseInt(payment.payment_account_id, 10) : null;
            if (!paymentAccountId) {
                paymentAccountId = payment.payment_method === 'bank' ? bankAccount?.id : cashAccount?.id;
            }

            const empAccount = emp.account_id;

            const maxJe = await JournalEntry.findOne().sort({ id: -1 }).lean();
            let maxJeVal = 0;
            if (maxJe && maxJe.entry_number) {
                const match = maxJe.entry_number.match(/JE-(\d+)/);
                if (match) maxJeVal = parseInt(match[1], 10);
            }
            const jeNum = `JE-${String(maxJeVal + 1).padStart(6, '0')}`;
            const paymentDate = payment.date || new Date().toISOString().split('T')[0];
            const jeDesc = `قيد راتب ${emp.name} - ${payment.month}`;
            const jeId = await getNextSequenceValue('journal_entries');

            const lines = [];
            if (empAccount) {
                lines.push({ account_id: empAccount, debit: netSalary, credit: 0, description: `راتب ${emp.name} - ${payment.month}` });
            }
            if (paymentAccountId) {
                lines.push({ account_id: paymentAccountId, debit: 0, credit: netSalary, description: `صرف راتب ${emp.name} - ${payment.month}` });
            }

            await JournalEntry.create({
                id: jeId, entry_number: jeNum, date: paymentDate, description: jeDesc, reference: payNum,
                created_by: payment.created_by || null, lines
            });

            if (empAccount) await Account.updateOne({ id: empAccount }, { $inc: { balance: netSalary } });
            if (paymentAccountId) await Account.updateOne({ id: paymentAccountId }, { $inc: { balance: -netSalary } });

            const nextId = await getNextSequenceValue('salary_payments');
            await SalaryPayment.create({
                id: nextId, payment_number: payNum, employee_id: payment.employee_id, month: payment.month,
                base_salary: baseSalary, deductions: totalDeductions, net_salary: netSalary,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, notes: payment.notes || null, created_by: payment.created_by || null
            });

            await Expense.create({
                id: await getNextSequenceValue('expenses'), payment_number: payNum, category: 'salary',
                date: paymentDate, amount: netSalary, description: `راتب ${emp.name} - ${payment.month}`,
                payment_method: payment.payment_method || 'cash', payment_account_id: paymentAccountId,
                journal_entry_id: jeId, source_type: 'salary', source_id: nextId, notes: payment.notes || null,
                created_by: payment.created_by || null
            });

            return { success: true, id: nextId, payment_number: payNum, net_salary: netSalary };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getTotal(startDate, endDate) {
        try {
            const filter = {};
            if (startDate || endDate) {
                filter.created_at = {};
                if (startDate) filter.created_at.$gte = new Date(startDate);
                if (endDate) filter.created_at.$lte = new Date(endDate + 'T23:59:59.999Z');
            }
            const payments = await SalaryPayment.find(filter).lean();
            return payments.reduce((sum, p) => sum + (p.net_salary || 0), 0);
        } catch (e) {
            return 0;
        }
    }

    async delete(id) {
        try {
            const payment = await SalaryPayment.findOne({ id });
            if (!payment) return { success: false, error: 'السجل غير موجود' };

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

            await Expense.deleteOne({ source_type: 'salary', source_id: id });
            await SalaryPayment.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = SalaryRepo;
