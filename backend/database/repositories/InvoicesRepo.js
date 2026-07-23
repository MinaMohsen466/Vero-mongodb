const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class InvoicesRepo {
    constructor(db) { this.db = db; }
    
    async getAll(type) {
        const filter = type ? { type } : {};
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        if (invoices.length === 0) return [];

        const customers = await Customer.find({}).lean();
        const suppliers = await Supplier.find({}).lean();
        const products = await Product.find({}).lean();

        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        const productMap = new Map(products.map(p => [p.id, p.name]));

        for (const inv of invoices) {
            if (inv.customer_id) {
                inv.customer_name = customerMap.get(inv.customer_id) || '';
            }
            if (inv.supplier_id) {
                inv.supplier_name = supplierMap.get(inv.supplier_id) || '';
            }
            for (const item of inv.items || []) {
                if (item.product_id) {
                    item.product_name = productMap.get(item.product_id) || '';
                }
            }
        }
        return invoices;
    }

    async getById(id) {
        const invoiceId = parseInt(id, 10);
        const inv = await Invoice.findOne({ id: invoiceId }).lean();
        if (inv) {
            if (inv.customer_id) {
                const c = await Customer.findOne({ id: inv.customer_id }).lean();
                inv.customer_name = c ? c.name : '';
            }
            if (inv.supplier_id) {
                const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                inv.supplier_name = s ? s.name : '';
            }
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
            return inv;
        }
        return null;
    }

    async _createInvoiceJournalEntry(inv, invId, num) {
        const total = parseFloat(inv.total) || 0;
        if (total === 0) return null;

        const lines = [];
        const cashAccount = await Account.findOne({ code: '111' });
        const bankAccount = await Account.findOne({ code: '112' });
        const customersAccount = await Account.findOne({ code: '113' });
        const suppliersAccount = await Account.findOne({ code: '211' });
        const revenueAccount = await Account.findOne({ code: '41' });
        const costAccount = await Account.findOne({ code: '51' });

        if (inv.type === 'sales') {
            const paid = parseFloat(inv.paid) || 0;
            const remaining = total - paid;
            if (paid > 0) {
                const debitAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (debitAcct) lines.push({ account_id: debitAcct.id, debit: paid, credit: 0, description: `فاتورة مبيعات ${num}` });
            }
            if (remaining > 0) {
                if (customersAccount) lines.push({ account_id: customersAccount.id, debit: remaining, credit: 0, description: `فاتورة مبيعات آجلة ${num}` });
            }
            if (revenueAccount) lines.push({ account_id: revenueAccount.id, debit: 0, credit: total, description: `فاتورة مبيعات ${num}` });
        } else if (inv.type === 'purchase') {
            const paid = parseFloat(inv.paid) || 0;
            const remaining = total - paid;
            if (costAccount) lines.push({ account_id: costAccount.id, debit: total, credit: 0, description: `فاتورة مشتريات ${num}` });
            if (paid > 0) {
                const creditAcct = (inv.payment_method === 'bank' && bankAccount) ? bankAccount : cashAccount;
                if (creditAcct) lines.push({ account_id: creditAcct.id, debit: 0, credit: paid, description: `فاتورة مشتريات ${num}` });
            }
            if (remaining > 0) {
                if (suppliersAccount) lines.push({ account_id: suppliersAccount.id, debit: 0, credit: remaining, description: `فاتورة مشتريات آجلة ${num}` });
            }
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
        const jeDesc = inv.type === 'sales' ? `قيد فاتورة مبيعات ${num}` : `قيد فاتورة مشتريات ${num}`;
        const jeId = await getNextSequenceValue('journal_entries');
        
        await JournalEntry.create({
            id: jeId,
            entry_number: jeNum,
            date: inv.date,
            description: jeDesc,
            reference: num,
            created_by: inv.created_by || null,
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

    async create(inv) {
        try {
            if (inv.type === 'sales' && inv.customer_id) {
                const remaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                if (remaining > 0) {
                    const customer = await Customer.findOne({ id: parseInt(inv.customer_id, 10) }).lean();
                    if (customer && customer.credit_limit > 0) {
                        const newBalance = (customer.balance || 0) + remaining;
                        if (newBalance > customer.credit_limit) {
                            return { success: false, error: `تجاوز الحد الائتماني المسموح به للعميل "${customer.name}" (الرصيد بعد الفاتورة: ${newBalance.toFixed(3)}، الحد الأقصى: ${customer.credit_limit.toFixed(3)})` };
                        }
                    }
                }
            }

            const lastDoc = await Invoice.findOne({ type: inv.type }).sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.invoice_number) {
                const match = lastDoc.invoice_number.match(/-(\d+)$/);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const prefix = inv.type === 'sales' ? 'SL-' : (inv.type === 'purchase' ? 'PU-' : 'QT-');
            const num = inv.invoice_number || `${prefix}${String(nextNumVal).padStart(6, '0')}`;

            const items = (inv.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount: parseFloat(item.discount) || 0,
                tax: parseFloat(item.tax) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            // Check stock availability BEFORE creating invoice
            if (inv.type !== 'quotation' && inv.type === 'sales') {
                const allowNegativeSetting = await Setting.findOne({ key: 'allow_negative_stock' }).lean();
                const allowNegative = allowNegativeSetting && (allowNegativeSetting.value === 'yes' || allowNegativeSetting.value === '1');
                if (!allowNegative) {
                    for (const item of items) {
                        if (item.product_id) {
                            const product = await Product.findOne({ id: item.product_id }).lean();
                            if (product && (product.shop_stock || 0) < item.quantity) {
                                return { success: false, error: `الكمية المتوفرة في المخزن للمنتج "${product.name}" (${product.shop_stock || 0}) غير كافية للبيع (المطلوب: ${item.quantity})` };
                            }
                        }
                    }
                }
            }

            const nextId = await getNextSequenceValue('invoices');
            await Invoice.create({
                id: nextId, invoice_number: num, type: inv.type, customer_id: inv.customer_id || null,
                supplier_id: inv.supplier_id || null, date: inv.date, due_date: inv.due_date || null,
                subtotal: inv.subtotal || 0, discount: inv.discount || 0, tax: inv.tax || 0,
                total: inv.total || 0, paid: inv.paid || 0, status: inv.status || 'pending',
                payment_method: inv.payment_method || 'cash', payment_account_id: inv.payment_account_id || null,
                notes: inv.notes || null, created_by: inv.created_by || null, image: inv.image || null,
                manual_discount: inv.manual_discount || 0, coupon_code: inv.coupon_code || null,
                items
            });

            if (inv.type !== 'quotation') {
                for (const item of items) {
                    if (item.product_id) {
                        if (inv.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        } else if (inv.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        }
                    }
                }

                const remaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                if (remaining > 0) {
                    if (inv.type === 'sales' && inv.customer_id) {
                        await Customer.updateOne({ id: inv.customer_id }, { $inc: { balance: remaining } });
                    } else if (inv.type === 'purchase' && inv.supplier_id) {
                        await Supplier.updateOne({ id: inv.supplier_id }, { $inc: { balance: remaining } });
                    }
                }

                const jeId = await this._createInvoiceJournalEntry(inv, nextId, num);
                if (jeId) {
                    await Invoice.updateOne({ id: nextId }, { $set: { journal_entry_id: jeId } });
                }
            }

            return { success: true, id: nextId, invoice_number: num };
        } catch (err) {
            console.error('Invoice creation error:', err);
            return { success: false, error: err.message || String(err) };
        }
    }

    async update(inv) {
        const invId = parseInt(inv.id, 10);
        try {
            const oldInvoice = await this.getById(invId);
            if (!oldInvoice) return { success: false, error: 'Invoice not found' };

            if (oldInvoice.type !== 'quotation' && oldInvoice.type === 'sales' && inv.customer_id) {
                const newRemaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                const oldRemaining = (oldInvoice.total || 0) - (oldInvoice.paid || 0);
                const customer = await Customer.findOne({ id: parseInt(inv.customer_id, 10) }).lean();
                if (customer && customer.credit_limit > 0) {
                    let netChange = 0;
                    if (oldInvoice.customer_id === parseInt(inv.customer_id, 10)) {
                        netChange = newRemaining - oldRemaining;
                    } else {
                        netChange = newRemaining;
                    }
                    const projectedBalance = (customer.balance || 0) + netChange;
                    if (projectedBalance > customer.credit_limit) {
                        return { success: false, error: `تجاوز الحد الائتماني المسموح به للعميل "${customer.name}" (الرصيد بعد التعديل: ${projectedBalance.toFixed(3)}، الحد الأقصى: ${customer.credit_limit.toFixed(3)})` };
                    }
                }
            }

            if (oldInvoice.type !== 'quotation') {
                for (const oldItem of oldInvoice.items || []) {
                    if (oldItem.product_id) {
                        if (oldInvoice.type === 'sales') {
                            await Product.updateOne({ id: oldItem.product_id }, {
                                $inc: { shop_stock: oldItem.quantity, stock_quantity: oldItem.quantity }
                            });
                        } else if (oldInvoice.type === 'purchase') {
                            await Product.updateOne({ id: oldItem.product_id }, {
                                $inc: { shop_stock: -oldItem.quantity, stock_quantity: -oldItem.quantity }
                            });
                        }
                    }
                }

                const oldRemaining = (oldInvoice.total || 0) - (oldInvoice.paid || 0);
                if (oldRemaining > 0) {
                    if (oldInvoice.type === 'sales' && oldInvoice.customer_id) {
                        await Customer.updateOne({ id: oldInvoice.customer_id }, { $inc: { balance: -oldRemaining } });
                    } else if (oldInvoice.type === 'purchase' && oldInvoice.supplier_id) {
                        await Supplier.updateOne({ id: oldInvoice.supplier_id }, { $inc: { balance: -oldRemaining } });
                    }
                }

                if (oldInvoice.journal_entry_id) {
                    await this._deleteJournalEntry(oldInvoice.journal_entry_id);
                }
            }

            const items = (inv.items || []).map(item => ({
                product_id: item.product_id ? parseInt(item.product_id, 10) : null,
                description: item.description || '',
                quantity: parseFloat(item.quantity) || 0,
                unit_price: parseFloat(item.unit_price) || 0,
                discount: parseFloat(item.discount) || 0,
                tax: parseFloat(item.tax) || 0,
                total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
            }));

            await Invoice.updateOne({ id: invId }, {
                $set: {
                    customer_id: inv.customer_id || null, supplier_id: inv.supplier_id || null, date: inv.date,
                    due_date: inv.due_date || null, subtotal: inv.subtotal || 0, discount: inv.discount || 0,
                    tax: inv.tax || 0, total: inv.total || 0, paid: inv.paid || 0, status: inv.status || 'pending',
                    payment_method: inv.payment_method || 'cash', notes: inv.notes || null, image: inv.image || null,
                    manual_discount: inv.manual_discount || 0, coupon_code: inv.coupon_code || null,
                    items
                }
            });

            if (oldInvoice.type !== 'quotation') {
                for (const item of items) {
                    if (item.product_id) {
                        if (oldInvoice.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        } else if (oldInvoice.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        }
                    }
                }

                const newRemaining = (parseFloat(inv.total) || 0) - (parseFloat(inv.paid) || 0);
                if (newRemaining > 0) {
                    if (oldInvoice.type === 'sales' && inv.customer_id) {
                        await Customer.updateOne({ id: inv.customer_id }, { $inc: { balance: newRemaining } });
                    } else if (oldInvoice.type === 'purchase' && inv.supplier_id) {
                        await Supplier.updateOne({ id: inv.supplier_id }, { $inc: { balance: newRemaining } });
                    }
                }

                const jeId = await this._createInvoiceJournalEntry({ ...inv, type: oldInvoice.type }, invId, oldInvoice.invoice_number);
                if (jeId) {
                    await Invoice.updateOne({ id: invId }, { $set: { journal_entry_id: jeId } });
                }
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const invoice = await this.getById(id);
            if (!invoice) return { success: false, error: 'Invoice not found' };

            if (invoice.type !== 'quotation') {
                for (const item of invoice.items || []) {
                    if (item.product_id) {
                        if (invoice.type === 'sales') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: item.quantity, stock_quantity: item.quantity }
                            });
                        } else if (invoice.type === 'purchase') {
                            await Product.updateOne({ id: item.product_id }, {
                                $inc: { shop_stock: -item.quantity, stock_quantity: -item.quantity }
                            });
                        }
                    }
                }
            }

            if (invoice.type !== 'quotation') {
                const remaining = (invoice.total || 0) - (invoice.paid || 0);
                if (remaining > 0) {
                    if (invoice.type === 'sales' && invoice.customer_id) {
                        await Customer.updateOne({ id: invoice.customer_id }, { $inc: { balance: -remaining } });
                    } else if (invoice.type === 'purchase' && invoice.supplier_id) {
                        await Supplier.updateOne({ id: invoice.supplier_id }, { $inc: { balance: -remaining } });
                    }
                }
            }

            if (invoice.type !== 'quotation' && invoice.journal_entry_id) {
                await this._deleteJournalEntry(invoice.journal_entry_id);
            }

            await Invoice.deleteOne({ id });
            return { success: true };
        } catch (e) {
            console.error('Invoice deletion error:', e);
            return { success: false, error: e.message };
        }
    }

    async getPendingByCustomer(customerId) {
        return await Invoice.find({ customer_id: customerId, status: 'pending' }).sort({ date: -1 }).lean();
    }

    async getPendingBySupplier(supplierId) {
        return await Invoice.find({ supplier_id: supplierId, status: 'pending' }).sort({ date: -1 }).lean();
    }

    async updateStatus(id, status) {
        try {
            await Invoice.updateOne({ id }, { $set: { status } });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getByCustomer(customerId) {
        const invoices = await Invoice.find({ customer_id: customerId }).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
        }
        return invoices;
    }

    async getBySupplier(supplierId) {
        const invoices = await Invoice.find({ supplier_id: supplierId }).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    const p = await Product.findOne({ id: item.product_id }).lean();
                    item.product_name = p ? p.name : '';
                }
            }
        }
        return invoices;
    }
}

module.exports = InvoicesRepo;
