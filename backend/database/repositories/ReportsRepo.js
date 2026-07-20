const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class ReportsRepo {
    constructor(db) { this.db = db; }
    
    async accountStatement(accountId, startDate, endDate) {
        const account = await Account.findOne({ id: accountId }).lean();
        const filter = { 'lines.account_id': parseInt(accountId, 10) };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const entries = await JournalEntry.find(filter).sort({ date: 1, id: 1 }).lean();
        
        const transactions = [];
        for (const je of entries) {
            for (const line of je.lines || []) {
                if (line.account_id === parseInt(accountId, 10)) {
                    transactions.push({
                        id: line._id ? line._id.toString() : String(Math.random()),
                        date: je.date,
                        entry_number: je.entry_number,
                        description: line.description,
                        debit: line.debit,
                        credit: line.credit
                    });
                }
            }
        }

        let balance = 0;
        const statement = transactions.map(t => {
            balance += (t.debit || 0) - (t.credit || 0);
            return { ...t, balance };
        });

        return { account, statement, opening_balance: 0, closing_balance: balance };
    }

    async trialBalance(date) {
        const accounts = await Account.find({}).sort({ code: 1 }).lean();
        const filter = date ? { date: { $lte: date } } : {};
        const entries = await JournalEntry.find(filter).lean();

        const debitMap = {};
        const creditMap = {};
        for (const je of entries) {
            for (const line of je.lines || []) {
                debitMap[line.account_id] = (debitMap[line.account_id] || 0) + (line.debit || 0);
                creditMap[line.account_id] = (creditMap[line.account_id] || 0) + (line.credit || 0);
            }
        }

        const result = accounts.map(a => {
            const total_debit = debitMap[a.id] || 0;
            const total_credit = creditMap[a.id] || 0;
            const netBalance = total_debit - total_credit;
            
            let debit_balance = 0;
            let credit_balance = 0;
            if (a.nature === 'debit') {
                if (netBalance >= 0) debit_balance = netBalance;
                else credit_balance = Math.abs(netBalance);
            } else {
                if (netBalance <= 0) credit_balance = Math.abs(netBalance);
                else debit_balance = netBalance;
            }
            return { ...a, total_debit, total_credit, balance: netBalance, debit_balance, credit_balance };
        });

        const totals = {
            debit: result.reduce((s, a) => s + a.debit_balance, 0),
            credit: result.reduce((s, a) => s + a.credit_balance, 0)
        };

        return { accounts: result, totals };
    }

    async salesReport(startDate, endDate) {
        const filter = { type: 'sales' };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            if (inv.customer_id) {
                const c = await Customer.findOne({ id: inv.customer_id }).lean();
                inv.customer_name = c ? c.name : '';
            }
        }
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }

    async purchasesReport(startDate, endDate) {
        const filter = { type: 'purchase' };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = startDate;
            if (endDate) filter.date.$lte = endDate;
        }
        const invoices = await Invoice.find(filter).sort({ date: -1 }).lean();
        for (const inv of invoices) {
            if (inv.supplier_id) {
                const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                inv.supplier_name = s ? s.name : '';
            }
        }
        return { invoices, total: invoices.reduce((s, i) => s + i.total, 0), count: invoices.length };
    }

    async profitLoss(startDate, endDate) {
        // 1. Total Sales
        const salesFilter = { type: 'sales' };
        if (startDate || endDate) {
            salesFilter.date = {};
            if (startDate) salesFilter.date.$gte = startDate;
            if (endDate) salesFilter.date.$lte = endDate;
        }
        const salesInvoices = await Invoice.find(salesFilter).lean();
        const totalSalesAmt = salesInvoices.reduce((s, i) => s + (i.total || 0), 0);

        // 2. Total Purchases
        const purchasesFilter = { type: 'purchase' };
        if (startDate || endDate) {
            purchasesFilter.date = {};
            if (startDate) purchasesFilter.date.$gte = startDate;
            if (endDate) purchasesFilter.date.$lte = endDate;
        }
        const purchaseInvoices = await Invoice.find(purchasesFilter).lean();
        const totalPurchasesAmt = purchaseInvoices.reduce((s, i) => s + (i.total || 0), 0);

        // 3. Expenses
        const totalExpensesAmt = await this.db.expenses.getTotal(startDate, endDate);

        // 4. Ending Inventory value
        const activeProducts = await Product.find({ is_active: true }).lean();
        const endingInventory = activeProducts.reduce((s, p) => s + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
        const beginningInventory = 0;
        
        const cogs = totalPurchasesAmt + beginningInventory - endingInventory;
        const grossProfit = totalSalesAmt - cogs;
        const rightSide = totalPurchasesAmt + beginningInventory + totalExpensesAmt;
        const leftSide = totalSalesAmt + endingInventory;
        const netProfit = leftSide - rightSide;

        const lowStock = activeProducts.filter(p => (p.stock_quantity || 0) <= 5);

        // 5. Chart data
        const chartFilter = {};
        if (startDate || endDate) {
            chartFilter.date = {};
            if (startDate) chartFilter.date.$gte = startDate;
            if (endDate) chartFilter.date.$lte = endDate;
        }
        const allInvoices = await Invoice.find(chartFilter).lean();
        const byMonth = {};
        for (const inv of allInvoices) {
            if (!inv.date) continue;
            const month = inv.date.substring(0, 7);
            byMonth[month] = byMonth[month] || { month, label: '', sales: 0, purchases: 0, profit: 0 };
            if (inv.type === 'sales') byMonth[month].sales += (inv.total || 0);
            else if (inv.type === 'purchase') byMonth[month].purchases += (inv.total || 0);
        }

        const MONTHS_AR = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const chartData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(r => {
            const parts = r.month.split('-');
            const m = parts[1] ? parseInt(parts[1], 10) : 1;
            return {
                ...r,
                label: MONTHS_AR[m - 1] || r.month,
                profit: r.sales - r.purchases
            };
        });

        // 6. Cash and Bank Balances
        const allAccounts = await Account.find({}).lean();
        const cashAccounts = allAccounts.filter(a => a.code === '111' || a.code?.startsWith('111.'));
        const bankAccounts = allAccounts.filter(a => a.code === '112' || a.code?.startsWith('112.'));
        const cashBalance = cashAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const bankBalance = bankAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const cashBankBalance = cashBalance + bankBalance;

        return {
            totalSales: totalSalesAmt,
            totalPurchases: totalPurchasesAmt,
            totalExpenses: totalExpensesAmt,
            cogs,
            grossProfit,
            profit: netProfit,
            chartData,
            products: activeProducts,
            endingInventory,
            beginningInventory,
            lowStock,
            cashBankBalance,
            cashBalance,
            bankBalance,
            leftSide,
            rightSide
        };
    }

    async detailedInventory(startDate, endDate) {
        const activeProducts = await Product.find({ is_active: true }).lean();
        const invoices = await Invoice.find({ type: { $in: ['sales', 'purchase'] } }).lean();

        const qtySoldMap = {};
        const qtyPurchasedMap = {};
        for (const inv of invoices) {
            const inDateRange = (!startDate || inv.date >= startDate) && (!endDate || inv.date <= endDate);
            if (!inDateRange) continue;
            
            for (const item of inv.items || []) {
                if (item.product_id) {
                    if (inv.type === 'sales') {
                        qtySoldMap[item.product_id] = (qtySoldMap[item.product_id] || 0) + (item.quantity || 0);
                    } else if (inv.type === 'purchase') {
                        qtyPurchasedMap[item.product_id] = (qtyPurchasedMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }
            }
        }

        const productsData = activeProducts.map(p => {
            const qtySold = qtySoldMap[p.id] || 0;
            const qtyPurchased = qtyPurchasedMap[p.id] || 0;
            const purchasePrice = parseFloat(p.purchase_price) || 0;
            const stockQty = parseFloat(p.stock_quantity) || 0;
            const cogs = qtySold * purchasePrice;
            const stockValue = stockQty * purchasePrice;
            return {
                ...p,
                qtySold,
                qtyPurchased,
                cogs,
                stockValue,
                status: stockQty <= 0 ? 'out' : stockQty <= 5 ? 'low' : 'safe'
            };
        });

        const totalValue = productsData.reduce((sum, p) => sum + p.stockValue, 0);
        const totalCogs = productsData.reduce((sum, p) => sum + p.cogs, 0);
        const totalQtySold = productsData.reduce((sum, p) => sum + p.qtySold, 0);
        const totalQtyPurchased = productsData.reduce((sum, p) => sum + p.qtyPurchased, 0);

        return {
            products: productsData,
            totalValue,
            totalCogs,
            totalQtySold,
            totalQtyPurchased
        };
    }
}

module.exports = ReportsRepo;
