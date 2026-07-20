const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class ReturnsRepo {
    constructor(db) { this.db = db; }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const returns = await Return.find(filter).sort({ date: -1 }).lean();
        if (returns.length === 0) return [];

        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();
        const invoices = await Invoice.find({}).lean();
        const products = await Product.find({}).lean();

        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        const invoiceMap = new Map(invoices.map(i => [i.id, i.invoice_number]));
        const productMap = new Map(products.map(p => [p.id, p.name]));

        for (const ret of returns) {
            if (ret.customer_id) {
                ret.customer_name = customerMap.get(ret.customer_id) || '';
            }
            if (ret.supplier_id) {
                ret.supplier_name = supplierMap.get(ret.supplier_id) || '';
            }
            if (ret.invoice_id) {
                ret.invoice_number = invoiceMap.get(ret.invoice_id) || '';
            }
            for (const item of ret.items || []) {
                item.product_name = productMap.get(item.product_id) || '';
            }
        }
        return returns;
    }

    async getById(id) {
        const returnId = parseInt(id, 10);
        const ret = await Return.findOne({ id: returnId }).lean();
        if (ret) {
            if (ret.customer_id) {
                const c = await Customer.findOne({ id: ret.customer_id }).lean();
                ret.customer_name = c ? c.name : '';
            }
            if (ret.supplier_id) {
                const s = await Supplier.findOne({ id: ret.supplier_id }).lean();
                ret.supplier_name = s ? s.name : '';
            }
            if (ret.invoice_id) {
                const inv = await Invoice.findOne({ id: ret.invoice_id }).lean();
                ret.invoice_number = inv ? inv.invoice_number : '';
            }
            for (const item of ret.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
            }
            return ret;
        }
        return null;
    }

    async _createReturnJournalEntry(ret, returnId, num) {
        const total = parseFloat(ret.total) || 0;
        if (total === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });
        const revenueAccount = await Account.findOne({ code: '41' });
        const costAccount = await Account.findOne({ code: '51' });

        if (ret.type === 'sales_return') {
            if (revenueAccount) lines.push({ account_id: revenueAccount.id, debit: total, credit: 0, description: `مرتجع مبيعات ${num}` });
            const creditAcct = (ret.payment_method === 'bank' && bankAccount) ? bankAccount : 
                               (ret.payment_method === 'credit' && customersAccount) ? customersAccount : cashAccount;
            if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: total, description: `مرتجع مبيعات ${num}` });
        } else if (ret.type === 'purchase_return') {
            const debitAcct = (ret.payment_method === 'bank' && bankAccount) ? bankAccount : 
                              (ret.payment_method === 'credit' && suppliersAccount) ? suppliersAccount : cashAccount;
            if (debitAcct) lines.push({ account_id: debitAcct.id, debit: total, credit: 0, description: `مرتجع مشتريات ${num}` });
            if (costAccount) lines.push({ account_id: costAccount.id, debit: 0, credit: total, description: `مرتجع مشتريات ${num}` });
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
        const jeDesc = ret.type === 'sales_return' ? `قيد مرتجع مبيعات ${num}` : `قيد مرتجع مشتريات ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');

        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: ret.date,
            description: jeDesc,
            reference: num,
            created_by: ret.created_by || null,
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

    async create(ret) {
        try {
            if (ret.invoice_id) {
                const invoice = await Invoice.findOne({ id: ret.invoice_id }).lean();
                if (!invoice) return { success: false, error: 'الفاتورة الأصلية غير موجودة' };

                const prevReturns = await Return.find({ invoice_id: ret.invoice_id }).lean();
                const prevReturnedMap = {};
                for (const pr of prevReturns) {
                    for (const item of pr.items || []) {
                        prevReturnedMap[item.product_id] = (prevReturnedMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }

                for (const item of ret.items || []) {
                    if (!item.product_id) continue;
                    const originalItem = invoice.items.find(ii => ii.product_id === parseInt(item.product_id, 10));
                    if (!originalItem) {
                        return { success: false, error: 'المنتج المرتجع غير موجود في الفاتورة الأصلية' };
                    }
                    const alreadyReturned = prevReturnedMap[item.product_id] || 0;
                    const remainingToReturn = originalItem.quantity - alreadyReturned;
                    if (item.quantity > remainingToReturn) {
                        return { success: false, error: `الكمية المراد إرجاعها للمنتج "${item.description || originalItem.description}" (${item.quantity}) تتجاوز الكمية المتاحة للإرجاع (${remainingToReturn})` };
                    }
                    if (ret.type === 'purchase_return') {
                        const product = await Product.findOne({ id: item.product_id }).lean();
                        if (product && product.shop_stock < item.quantity) {
                            return { success: false, error: `الكمية المتوفرة في المخزن للمنتج "${product.name}" (${product.shop_stock}) غير كافية لإتمام مرتجع المشتريات (المطلوب إرجاعه: ${item.quantity})` };
                        }
                    }
                }
            }

            const lastDoc = await Return.findOne({ type: ret.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.return_number) {
                const match = lastDoc.return_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = ret.type === 'sales_return' ? 'RT-SL-' : 'RT-PU-';
            const num = ret.return_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            const items = (ret.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            const nextId = await getNextSequenceValue('returns');
            await Return.create({
                id: nextId, return_number: num, invoice_id: ret.invoice_id || null, type: ret.type,
                customer_id: ret.customer_id || null, supplier_id: ret.supplier_id || null, date: ret.date,
                subtotal: ret.subtotal || 0, discount: ret.discount || 0, total: ret.total || 0,
                refunded_amount: ret.total || 0, payment_method: ret.payment_method || 'cash',
                payment_account_id: ret.payment_account_id || null, notes: ret.notes || null,
                created_by: ret.created_by || null, items
            });

            for (const item of items) {
                if (item.product_id) {
                    if (ret.type === 'sales_return') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                        });
                    }
                }
            }

            const jeId = await this._createReturnJournalEntry(ret, nextId, num);
            if (jeId) {
                await Return.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
            }

            if (ret.payment_method === 'credit') {
                if (ret.type === 'sales_return' && ret.customer_id) {
                    await Customer.updateOne({ id: ret.customer_id }, { $inc: { balance: -(parseFloat(ret.total) || 0) } });
                } else if (ret.type === 'purchase_return' && ret.supplier_id) {
                    await Supplier.updateOne({ id: ret.supplier_id }, { $inc: { balance: -(parseFloat(ret.total) || 0) } });
                }
            }

            return { success: true, id: nextId, return_number: num };
        } catch (e) {
            console.error('Return creation error:', e);
            return { success: false, error: e.message || String(e) };
        }
    }

    async delete(id) {
        try {
            const ret = await this.getById(id);
            if (!ret) return { success: false, error: 'Return not found' };

            for (const item of ret.items || []) {
                if (item.product_id) {
                    if (ret.type === 'sales_return') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                        });
                    }
                }
            }

            if (ret.journal_entry_id) {
                await this._deleteJournalEntry(ret.journal_entry_id);
            }

            if (ret.payment_method === 'credit') {
                if (ret.type === 'sales_return' && ret.customer_id) {
                    await Customer.updateOne({ id: ret.customer_id }, { $inc: { balance: parseFloat(ret.total) || 0 } });
                } else if (ret.type === 'purchase_return' && ret.supplier_id) {
                    await Supplier.updateOne({ id: ret.supplier_id }, { $inc: { balance: parseFloat(ret.total) || 0 } });
                }
            }

            await Return.deleteOne({ id });
            return { success: true };
        } catch (e) {
            console.error('Return deletion error:', e);
            return { success: false, error: e.message };
        }
    }
}

module.exports = ReturnsRepo;
