const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class VouchersRepo {
    constructor(db) { this.db = db; }

    async recalculateInvoicePaid(invoiceId) {
        if (!invoiceId) return;
        const inv = await Invoice.findOne({ id: invoiceId });
        if (!inv) return;

        const vouchers = await Voucher.find({ invoice_id: invoiceId }).sort({ date: 1, id: 1 });
        let remainingBalance = inv.total || 0;
        let totalPaid = 0;

        for (const v of vouchers) {
            const canApply = Math.min(v.amount, remainingBalance);
            if (v.applied_amount !== canApply) {
                await Voucher.updateOne({ id: v.id }, { $set: { applied_amount: canApply } });
            }
            remainingBalance -= canApply;
            totalPaid += canApply;
        }

        const newStatus = totalPaid >= inv.total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';
        await Invoice.updateOne({ id: invoiceId }, { $set: { paid: totalPaid, status: newStatus } });
    }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const vouchers = await Voucher.find(filter).sort({ date: -1 }).lean();
        if (vouchers.length === 0) return [];

        const accounts = await Account.find({}).lean();
        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();

        const accountMap = new Map(accounts.map(a => [a.id, a.name]));
        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

        for (const v of vouchers) {
            if (v.account_id) {
                v.account_name = accountMap.get(v.account_id) || '';
            }
            if (v.customer_id) {
                v.customer_name = customerMap.get(v.customer_id) || '';
            }
            if (v.supplier_id) {
                v.supplier_name = supplierMap.get(v.supplier_id) || '';
            }
        }
        return vouchers;
    }

    async getById(id) {
        const v = await Voucher.findOne({ id }).lean();
        if (v) {
            if (v.account_id) {
                const a = await Account.findOne({ id: v.account_id }).lean();
                v.account_name = a ? a.name : '';
            }
            if (v.customer_id) {
                const c = await Customer.findOne({ id: v.customer_id }).lean();
                v.customer_name = c ? c.name : '';
            }
            if (v.supplier_id) {
                const s = await Supplier.findOne({ id: v.supplier_id }).lean();
                v.supplier_name = s ? s.name : '';
            }
        }
        return v;
    }

    async _createVoucherJournalEntry(v, voucherId, num) {
        const amount = parseFloat(v.amount) || 0;
        if (amount === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });

        const paymentMethod = v.payment_method || 'cash';
        const cashBankAcct = (paymentMethod === 'bank' && bankAccount) ? bankAccount : cashAccount;

        if (v.type === 'receipt') {
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: amount, credit: 0, description: `سند قبض ${num}` });
            const creditAcct = v.supplier_id ? suppliersAccount : customersAccount;
            if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: amount, description: `سند قبض ${num}` });
        } else if (v.type === 'payment') {
            const debitAcct = v.customer_id ? customersAccount : suppliersAccount;
            if (debitAcct) lines.push({ account_id: debitAcct.id, debit: amount, credit: 0, description: `سند صرف ${num}` });
            if (cashBankAcct) lines.push({ account_id: cashBankAcct.id, debit: 0, credit: amount, description: `سند صرف ${num}` });
        }

        if (lines.length < 2) return null;

        const jeMaxNumDoc = await JournalEntry.findOne().sort({ id: -1 }).lean();
        let jeMaxNum = 0;
        if (jeMaxNumDoc && jeMaxNumDoc.entry_number) {
            const match = jeMaxNumDoc.entry_number.match(/JE-(\d+)/);
            if (match) jeMaxNum = parseInt(match[1], 10);
        }
        const jeNextNum = jeMaxNum + 1;
        const jeNum = `JE-${String(jeNextNum).padStart(6, '0')}`;
        const jeDesc = v.type === 'receipt' ? `قيد سند قبض ${num}` : `قيد سند صرف ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');

        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: v.date,
            description: jeDesc,
            reference: num,
            created_by: v.created_by || null,
            lines: lines
        });

        for (const line of lines) {
            const change = (line.debit || 0) - (line.credit || 0);
            await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
        }

        return jeId;
    }

    async _deleteJournalEntry(journalEntryId) {
        if (!journalEntryId) return;
        const je = await JournalEntry.findOne({ id: journalEntryId });
        if (je) {
            for (const line of je.lines || []) {
                const change = (line.credit || 0) - (line.debit || 0);
                await Account.updateOne({ id: line.account_id }, { $inc: { balance: change } });
            }
            await JournalEntry.deleteOne({ id: journalEntryId });
        }
    }

    async create(v) {
        try {
            const lastDoc = await Voucher.findOne({ type: v.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.voucher_number) {
                const match = lastDoc.voucher_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = v.type === 'receipt' ? 'RV-' : 'PV-';
            const num = v.voucher_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            let appliedAmount = 0;
            if (v.invoice_id) {
                const inv = await Invoice.findOne({ id: v.invoice_id });
                if (inv) {
                    const invoiceRemaining = (inv.total || 0) - (inv.paid || 0);
                    appliedAmount = Math.min(parseFloat(v.amount) || 0, invoiceRemaining);
                } else {
                    appliedAmount = parseFloat(v.amount) || 0;
                }
            }

            const nextId = await getNextSequenceValue('vouchers');
            await Voucher.create({
                id: nextId, voucher_number: num, type: v.type, date: v.date, amount: v.amount || 0,
                applied_amount: appliedAmount, account_id: v.account_id || null, customer_id: v.customer_id || null,
                supplier_id: v.supplier_id || null, payment_method: v.payment_method || 'cash',
                invoice_id: v.invoice_id || null, reference: v.reference || null,
                description: v.description || null, created_by: v.created_by || null
            });

            if (v.type === 'receipt') {
                if (v.customer_id) await Customer.updateOne({ id: v.customer_id }, { $inc: { balance: -v.amount } });
                else if (v.supplier_id) await Supplier.updateOne({ id: v.supplier_id }, { $inc: { balance: v.amount } });
            } else if (v.type === 'payment') {
                if (v.supplier_id) await Supplier.updateOne({ id: v.supplier_id }, { $inc: { balance: -v.amount } });
                else if (v.customer_id) await Customer.updateOne({ id: v.customer_id }, { $inc: { balance: v.amount } });
            }

            if (v.invoice_id) {
                await this.recalculateInvoicePaid(v.invoice_id);
            }

            const jeId = await this._createVoucherJournalEntry(v, nextId, num);
            if (jeId) {
                await Voucher.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
            }

            if (v.invoice_id && v.type === 'receipt') {
                const invAfter = await Invoice.findOne({ id: v.invoice_id });
                if (invAfter && invAfter.paid >= invAfter.total) {
                    const linkedPlan = await InstallmentPlan.findOne({ invoice_id: v.invoice_id, status: { $ne: 'completed' } });
                    if (linkedPlan) {
                        await InstallmentPayment.updateMany({ plan_id: linkedPlan.id, status: 'pending' }, {
                            $set: { status: 'paid', paid_date: v.date, payment_method: v.payment_method || 'cash', notes: 'مدفوع عبر سند قبض ' + num }
                        });
                        await InstallmentPlan.updateOne({ id: linkedPlan.id }, { $set: { status: 'completed' } });
                    }
                }
            }

            return { success: true, id: nextId, voucher_number: num };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(v) {
        try {
            const old = await this.getById(v.id);
            if (!old) return { success: false, error: 'Voucher not found' };

            // 1. Reverse old customer/supplier balance
            if (old.type === 'receipt') {
                if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: old.amount } });
                else if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: -old.amount } });
            } else if (old.type === 'payment') {
                if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: old.amount } });
                else if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: -old.amount } });
            }

            // 2. Delete old journal entry
            if (old.journal_entry_id) {
                await this._deleteJournalEntry(old.journal_entry_id);
            }

            // 3. Update voucher
            await Voucher.updateOne({ id: v.id }, {
                $set: {
                    date: v.date, amount: v.amount || 0, applied_amount: 0,
                    payment_method: v.payment_method || 'cash', reference: v.reference,
                    description: v.description, journal_entry_id: null
                }
            });

            // 4. Apply new customer/supplier balance
            const amount = parseFloat(v.amount) || 0;
            if (old.type === 'receipt') {
                if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: -amount } });
                else if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: amount } });
            } else if (old.type === 'payment') {
                if (old.supplier_id) await Supplier.updateOne({ id: old.supplier_id }, { $inc: { balance: -amount } });
                else if (old.customer_id) await Customer.updateOne({ id: old.customer_id }, { $inc: { balance: amount } });
            }

            // 5. Recalculate invoice paid status and voucher applied amounts
            if (old.invoice_id) {
                await this.recalculateInvoicePaid(old.invoice_id);
            }

            // 8. Create new journal entry
            const newVoucher = { ...old, amount, payment_method: v.payment_method || 'cash', date: v.date };
            const jeId = await this._createVoucherJournalEntry(newVoucher, v.id, old.voucher_number);
            if (jeId) {
                await Voucher.updateOne({ id: v.id }, { $set: { journal_entry_id: jeId } });
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const voucher = await this.getById(id);
            if (voucher) {
                if (voucher.type === 'receipt') {
                    if (voucher.customer_id) await Customer.updateOne({ id: voucher.customer_id }, { $inc: { balance: voucher.amount } });
                    else if (voucher.supplier_id) await Supplier.updateOne({ id: voucher.supplier_id }, { $inc: { balance: -voucher.amount } });
                } else if (voucher.type === 'payment') {
                    if (voucher.supplier_id) await Supplier.updateOne({ id: voucher.supplier_id }, { $inc: { balance: voucher.amount } });
                    else if (voucher.customer_id) await Customer.updateOne({ id: voucher.customer_id }, { $inc: { balance: -voucher.amount } });
                }

                if (voucher.journal_entry_id) {
                    await this._deleteJournalEntry(voucher.journal_entry_id);
                }

                // Delete first, so recalculateInvoicePaid doesn't count it
                await Voucher.deleteOne({ id });

                if (voucher.invoice_id) {
                    await this.recalculateInvoicePaid(voucher.invoice_id);
                }
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = VouchersRepo;
