const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class CustomersRepo {
    constructor(db) { this.db = db; }
    
    async recalculateCustomerBalance(customerId) {
        try {
            const customer = await Customer.findOne({ id: customerId }).lean();
            if (!customer) return 0;

            const opBalance = parseFloat(customer.opening_balance) || 0;

            const invoices = await Invoice.find({ customer_id: customerId, type: 'sales' }).lean();
            const totalInvoices = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

            const vouchers = await Voucher.find({ customer_id: customerId, type: 'receipt' }).lean();
            const totalVouchers = vouchers.reduce((sum, v) => sum + (v.amount || 0), 0);

            const badDebts = await Expense.find({ category: 'bad_debt', reference: `BAD-DEBT-CUST-${customerId}` }).lean();
            const totalBadDebts = badDebts.reduce((sum, e) => sum + (e.amount || 0), 0);

            if (badDebts.length === 0) {
                // If no active bad debts exist for this customer, clean any leftover write-off notes and revert written_off statuses
                const customerInvoices = await Invoice.find({ customer_id: customerId }).lean();
                for (const inv of customerInvoices) {
                    if (inv.notes && (inv.notes.includes('شطب') || inv.notes.includes('إعدام') || inv.notes.includes('دين معدوم'))) {
                        let cleanNotes = (inv.notes || '').replace(/\[?تم شطب\/إعدام مبلغ .*? كدين معدوم\]?/g, '').replace(/\[?تم شطب.*?\]?/g, '').trim();
                        const vouchers = await Voucher.find({ invoice_id: inv.id }).lean();
                        let voucherPaid = vouchers.reduce((sum, v) => sum + (v.applied_amount || v.amount || 0), 0);
                        let newStatus = inv.status === 'written_off'
                            ? (voucherPaid >= inv.total ? 'paid' : voucherPaid > 0 ? 'partial' : 'pending')
                            : inv.status;
                        await Invoice.updateOne(
                            { id: inv.id },
                            { $set: { status: newStatus, paid: voucherPaid, notes: cleanNotes || null } }
                        );
                    }
                }
            }

            const returns = await Return.find({ customer_id: customerId, type: 'sales_return' }).lean();
            let netReturnsCredit = 0;
            returns.forEach(r => {
                if (r.payment_method === 'credit') {
                    netReturnsCredit += (r.total || 0);
                }
            });

            const liveBalance = opBalance + totalInvoices - totalVouchers - totalBadDebts - netReturnsCredit;
            await Customer.updateOne({ id: customerId }, { $set: { balance: liveBalance } });
            return liveBalance;
        } catch (e) {
            console.error('Error recalculating customer balance:', e);
            return 0;
        }
    }

    async getAll() {
        const customers = await Customer.find({}).sort({ name: 1 }).lean();
        for (const c of customers) {
            c.balance = await this.recalculateCustomerBalance(c.id);
        }
        return customers;
    }

    async getById(id) {
        const customer = await Customer.findOne({ id }).lean();
        if (customer) {
            customer.balance = await this.recalculateCustomerBalance(id);
        }
        return customer;
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

    async writeOffDebt({ id, amount, reason, date }) {
        try {
            const customer = await Customer.findOne({ id }).lean();
            if (!customer) return { success: false, error: 'العميل غير موجود' };

            const amt = parseFloat(amount) || 0;
            if (amt <= 0) return { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };

            const oldBalance = customer.balance || 0;
            const newBalance = oldBalance - amt;

            // 1. Update customer balance
            await Customer.updateOne({ id }, { $set: { balance: newBalance } });

            const expDate = date || new Date().toISOString().split('T')[0];
            const desc = `إعدام دين متعثر/معدوم للعميل: ${customer.name} - السبب: ${reason || 'تعثر/وفاة/امتناع'}`;

            // 2. Create Journal Entry (Debit: 520 Bad Debts / Credit: 113 Accounts Receivable)
            let jeId = null;
            let arAcc = await Account.findOne({ code: '113' });
            if (!arAcc) arAcc = await Account.findOne({ name: /ذمم العملاء|العملاء/i });

            let expAcc = await Account.findOne({ code: '520' });
            if (!expAcc) expAcc = await Account.findOne({ name: /ديون معدومة/i });
            if (!expAcc) {
                const nextAccId = await getNextSequenceValue('accounts');
                expAcc = await Account.create({
                    id: nextAccId,
                    code: '520',
                    name: 'ديون معدومة',
                    type: 'expense',
                    balance: 0
                });
            }

            if (arAcc && expAcc) {
                jeId = await getNextSequenceValue('journal');
                const jeNum = `JE${String(jeId).padStart(6, '0')}`;
                const lines = [
                    { account_id: expAcc.id, debit: amt, credit: 0, description: desc },
                    { account_id: arAcc.id, debit: 0, credit: amt, description: desc }
                ];
                await JournalEntry.create({
                    id: jeId,
                    entry_number: jeNum,
                    date: expDate,
                    description: desc,
                    reference: `BAD-DEBT-CUST-${id}`,
                    lines
                });

                await Account.updateOne({ id: expAcc.id }, { $inc: { balance: amt } });
                await Account.updateOne({ id: arAcc.id }, { $inc: { balance: -amt } });
            }

            // 3. Create Expense record (Category: bad_debt / ديون معدومة)
            const expId = await getNextSequenceValue('expenses');
            const payNum = `EXP${String(expId).padStart(4, '0')}`;
            await Expense.create({
                id: expId,
                payment_number: payNum,
                category: 'bad_debt',
                date: expDate,
                amount: amt,
                description: desc,
                payment_method: 'other',
                journal_entry_id: jeId,
                reference: `BAD-DEBT-CUST-${id}`,
                notes: `تم شطب وإعدام الدين من كشف حساب العميل ${customer.name}`
            });

            // 4. Update customer's unpaid/pending/partial invoices status to 'written_off'
            let remAmt = amt;
            const unpaidInvoices = await Invoice.find({
                customer_id: id,
                type: 'sales',
                status: { $in: ['pending', 'partial'] }
            }).sort({ date: 1, id: 1 }).lean();

            for (const inv of unpaidInvoices) {
                if (remAmt <= 0) break;
                const unpaidAmt = (inv.total || 0) - (parseFloat(inv.paid) || 0);
                if (unpaidAmt <= 0) continue;

                const applyAmt = Math.min(unpaidAmt, remAmt);
                const newPaid = (parseFloat(inv.paid) || 0) + applyAmt;
                const isFullyApplied = newPaid >= inv.total;
                const noteAppend = ` [تم شطب/إعدام مبلغ ${applyAmt} كدين معدوم]`;

                await Invoice.updateOne(
                    { id: inv.id },
                    {
                        $set: {
                            paid: newPaid,
                            status: isFullyApplied ? 'written_off' : 'partial',
                            notes: (inv.notes || '') + noteAppend
                        }
                    }
                );
                remAmt -= applyAmt;
            }

            return { success: true, newBalance };
        } catch (e) {
            console.error('Error writing off customer debt:', e);
            return { success: false, error: e.message };
        }
    }
}

module.exports = CustomersRepo;
