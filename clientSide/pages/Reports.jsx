import React, { useState, useEffect } from 'react';
import {
    BarChart3, FileText, TrendingUp, TrendingDown, Printer, Calendar,
    DollarSign, ShoppingBag, BarChart2, Download, RotateCcw
} from 'lucide-react';
import { useAuth } from '../App';
import SearchableSelect from '../components/SearchableSelect';
import { MONTHS_AR } from './reports/shared';

import SalesReport from './reports/SalesReport';
import PurchasesReport from './reports/PurchasesReport';
import ProfitLossReport from './reports/ProfitLossReport';
import AgingReport from './reports/AgingReport';
import CashFlowReport from './reports/CashFlowReport';
import StatementReport from './reports/StatementReport';
import ProductProfitabilityReport from './reports/ProductProfitabilityReport';
import TrialBalanceReport from './reports/TrialBalanceReport';
import YearEndClosingReport from './reports/YearEndClosingReport';
import DetailedInventoryReport from './reports/DetailedInventoryReport';

function Reports() {
    const { t, user, theme, language } = useAuth();
    const isAr = language === 'ar';
    const [activeReport, setActiveReport] = useState('sales_summary');
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [settings, setSettings] = useState({});
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const currentYear = new Date().getFullYear();
    const firstDay = `${currentYear}-01-01`;
    const today = new Date().toISOString().split('T')[0];

    const [filters, setFilters] = useState({
        customer_id: '', supplier_id: '', account_id: '',
        start_date: firstDay, end_date: today
    });

    const [plSearchQuery, setPlSearchQuery] = useState('');
    const [plCategoryFilter, setPlCategoryFilter] = useState('');
    const [plStockFilter, setPlStockFilter] = useState('all');

    useEffect(() => {
        Promise.all([
            window.api.customers.getAll(),
            window.api.suppliers.getAll(),
            window.api.accounts.getAll(),
            window.api.products.getAll(),
            window.api.settings.getAll()
        ]).then(([c, s, a, p, st]) => {
            setCustomers(c || []);
            setSuppliers(s || []);
            setAccounts(a || []);
            setProducts(p || []);
            const cats = [...new Set((p || []).map(pr => pr.category).filter(Boolean))];
            setCategories(cats);
            setSettings(st || {});
        });
    }, []);

    // Auto-generate when switching report type
    useEffect(() => {
        setReportData(null);
        setPlSearchQuery('');
        setPlCategoryFilter('');
        setPlStockFilter('all');
    }, [activeReport]);

    const fmt = (v) => {
        const sym = settings.general?.currency_symbol || (t('currency_kd') || 'KD');
        const dec = parseInt(settings.general?.decimal_places || '3');
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: dec }).format(v || 0) + ' ' + sym;
    };

    const generateReport = async () => {
        setLoading(true);
        try {
            let data = null;

            if (activeReport === 'sales_summary') {
                const reportRes = await window.api.reports.salesReport(filters.start_date, filters.end_date);
                const filtered = reportRes.invoices || [];
                const byMonth = {};
                filtered.forEach(inv => {
                    const m = inv.date?.substring(0, 7);
                    if (!m) return;
                    byMonth[m] = byMonth[m] || { month: m, total: 0, paid: 0, pending: 0, count: 0 };
                    byMonth[m].total += inv.total || 0;
                    byMonth[m].count++;
                    if (inv.status === 'paid') byMonth[m].paid += inv.total || 0;
                    else byMonth[m].pending += inv.total || 0;
                });
                const chartData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({
                    ...r,
                    label: (() => { const [y, m] = r.month.split('-'); return `${MONTHS_AR[parseInt(m) - 1]} ${y}`; })()
                }));
                const totalSales = reportRes.total || 0;
                const totalPaid = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
                const totalPending = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
                data = { type: 'sales_summary', chartData, totalSales, totalPaid, totalPending, count: filtered.length, invoices: filtered.slice(0, 50) };

            } else if (activeReport === 'purchases_summary') {
                const reportRes = await window.api.reports.purchasesReport(filters.start_date, filters.end_date);
                const filtered = reportRes.invoices || [];
                const byMonth = {};
                filtered.forEach(inv => {
                    const m = inv.date?.substring(0, 7);
                    if (!m) return;
                    byMonth[m] = byMonth[m] || { month: m, total: 0, count: 0 };
                    byMonth[m].total += inv.total || 0;
                    byMonth[m].count++;
                });
                const chartData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(r => ({
                    ...r,
                    label: (() => { const [y, m] = r.month.split('-'); return `${MONTHS_AR[parseInt(m) - 1]} ${y}`; })()
                }));
                const total = reportRes.total || 0;
                data = { type: 'purchases_summary', chartData, total, count: filtered.length, invoices: filtered.slice(0, 50) };

            } else if (activeReport === 'profit_loss') {
                const reportRes = await window.api.reports.profitLoss(filters.start_date, filters.end_date);
                const chartData = (reportRes.chartData || []).map(r => {
                    const [y, m] = r.month.split('-');
                    return {
                        ...r,
                        label: `${MONTHS_AR[parseInt(m) - 1]} ${y}`
                    };
                });
                data = {
                    type: 'profit_loss',
                    ...reportRes,
                    chartData
                };

            } else if (activeReport === 'customer_statement') {
                if (!filters.customer_id) { setLoading(false); return; }
                const invoices = await window.api.invoices.getByCustomer(parseInt(filters.customer_id));
                const customer = customers.find(c => c.id === parseInt(filters.customer_id));
                const filtered = (invoices || []).filter(inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                });
                let balance = 0;
                const statement = filtered.map(inv => {
                    const isPaid = inv.status === 'paid';
                    const debit = !isPaid ? inv.total : 0;
                    const credit = isPaid ? inv.total : 0;
                    balance += debit - credit;
                    return { date: inv.date, description: `${inv.invoice_number} (${isPaid ? (t('inv_paid') || 'Paid') : (t('cust_creditLabel') || 'Credit')})`, debit, credit, balance };
                });
                data = {
                    type: 'customer_statement',
                    name: customer?.name, phone: customer?.phone,
                    statement, totalDebit: statement.reduce((s, r) => s + r.debit, 0),
                    totalCredit: statement.reduce((s, r) => s + r.credit, 0), balance
                };

            } else if (activeReport === 'supplier_statement') {
                if (!filters.supplier_id) { setLoading(false); return; }
                const invoices = await window.api.invoices.getBySupplier(parseInt(filters.supplier_id));
                const supplier = suppliers.find(s => s.id === parseInt(filters.supplier_id));
                const filtered = (invoices || []).filter(inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                });
                let balance = 0;
                const statement = filtered.map(inv => {
                    const isPaid = inv.status === 'paid';
                    const debit = !isPaid ? inv.total : 0;
                    const credit = isPaid ? inv.total : 0;
                    balance += debit - credit;
                    return { date: inv.date, description: `${inv.invoice_number} (${isPaid ? (t('inv_paid') || 'Paid') : (t('supp_creditLabel') || 'Credit')})`, debit, credit, balance };
                });
                data = {
                    type: 'supplier_statement',
                    name: supplier?.name, phone: supplier?.phone,
                    statement, totalDebit: statement.reduce((s, r) => s + r.debit, 0),
                    totalCredit: statement.reduce((s, r) => s + r.credit, 0), balance
                };

            } else if (activeReport === 'trial_balance') {
                const tb = await window.api.reports.trialBalance(filters.end_date);
                data = { type: 'trial_balance', ...tb };
            } else if (activeReport === 'detailed_inventory') {
                const reportRes = await window.api.reports.detailedInventory(filters.start_date, filters.end_date);
                data = {
                    type: 'detailed_inventory',
                    ...reportRes
                };

            } else if (activeReport === 'aging_report') {
                const [sales, purchases, allCustomers, allSuppliers] = await Promise.all([
                    window.api.invoices.getAll('sales'),
                    window.api.invoices.getAll('purchase'),
                    window.api.customers.getAll(),
                    window.api.suppliers.getAll()
                ]);

                const todayDate = new Date();
                const getAgeDays = (dateStr) => {
                    if (!dateStr) return 0;
                    const diffTime = todayDate - new Date(dateStr);
                    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                };

                const customerAging = {};
                (allCustomers || []).forEach(c => {
                    customerAging[c.id] = { id: c.id, name: c.name, phone: c.phone, total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0, currentBalance: c.balance || 0 };
                });

                (sales || []).forEach(inv => {
                    if (inv.status !== 'paid') {
                        const unpaid = (inv.total || 0) - (parseFloat(inv.paid) || 0);
                        if (unpaid <= 0) return;
                        const cId = inv.customer_id;
                        if (!customerAging[cId]) {
                            customerAging[cId] = { id: cId, name: inv.customer_name || `Customer #${cId}`, phone: '', total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0, currentBalance: 0 };
                        }
                        const age = getAgeDays(inv.date);
                        customerAging[cId].total += unpaid;
                        if (age <= 30) customerAging[cId].bracket1 += unpaid;
                        else if (age <= 60) customerAging[cId].bracket2 += unpaid;
                        else if (age <= 90) customerAging[cId].bracket3 += unpaid;
                        else customerAging[cId].bracket4 += unpaid;
                    }
                });

                Object.values(customerAging).forEach(c => {
                    if (c.currentBalance > c.total) {
                        const diff = c.currentBalance - c.total;
                        c.bracket4 += diff;
                        c.total += diff;
                    }
                });

                const supplierAging = {};
                (allSuppliers || []).forEach(s => {
                    supplierAging[s.id] = { id: s.id, name: s.name, phone: s.phone, total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0, currentBalance: s.balance || 0 };
                });

                (purchases || []).forEach(inv => {
                    if (inv.status !== 'paid') {
                        const unpaid = (inv.total || 0) - (parseFloat(inv.paid) || 0);
                        if (unpaid <= 0) return;
                        const sId = inv.supplier_id;
                        if (!supplierAging[sId]) {
                            supplierAging[sId] = { id: sId, name: inv.supplier_name || `Supplier #${sId}`, phone: '', total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0, currentBalance: 0 };
                        }
                        const age = getAgeDays(inv.date);
                        supplierAging[sId].total += unpaid;
                        if (age <= 30) supplierAging[sId].bracket1 += unpaid;
                        else if (age <= 60) supplierAging[sId].bracket2 += unpaid;
                        else if (age <= 90) supplierAging[sId].bracket3 += unpaid;
                        else supplierAging[sId].bracket4 += unpaid;
                    }
                });

                Object.values(supplierAging).forEach(s => {
                    if (s.currentBalance > s.total) {
                        const diff = s.currentBalance - s.total;
                        s.bracket4 += diff;
                        s.total += diff;
                    }
                });

                data = {
                    type: 'aging_report',
                    receivables: Object.values(customerAging).filter(c => c.total > 0),
                    payables: Object.values(supplierAging).filter(s => s.total > 0),
                    totals: {
                        receivables: Object.values(customerAging).reduce((sum, c) => sum + c.total, 0),
                        payables: Object.values(supplierAging).reduce((sum, s) => sum + s.total, 0),
                        recBracket1: Object.values(customerAging).reduce((sum, c) => sum + c.bracket1, 0),
                        recBracket2: Object.values(customerAging).reduce((sum, c) => sum + c.bracket2, 0),
                        recBracket3: Object.values(customerAging).reduce((sum, c) => sum + c.bracket3, 0),
                        recBracket4: Object.values(customerAging).reduce((sum, c) => sum + c.bracket4, 0),
                        payBracket1: Object.values(supplierAging).reduce((sum, s) => sum + s.bracket1, 0),
                        payBracket2: Object.values(supplierAging).reduce((sum, s) => sum + s.bracket2, 0),
                        payBracket3: Object.values(supplierAging).reduce((sum, s) => sum + s.bracket3, 0),
                        payBracket4: Object.values(supplierAging).reduce((sum, s) => sum + s.bracket4, 0)
                    }
                };

            } else if (activeReport === 'product_profitability') {
                const [sales, allProducts] = await Promise.all([
                    window.api.invoices.getAll('sales'),
                    window.api.products.getAll()
                ]);
                const filterFn = inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                };
                const filteredSales = (sales || []).filter(filterFn);

                const productSales = {};
                filteredSales.forEach(inv => {
                    if (inv.items && Array.isArray(inv.items)) {
                        inv.items.forEach(item => {
                            if (item.product_id) {
                                if (!productSales[item.product_id]) {
                                    productSales[item.product_id] = { qty: 0, revenue: 0 };
                                }
                                productSales[item.product_id].qty += parseFloat(item.quantity) || 0;
                                productSales[item.product_id].revenue += parseFloat(item.total) || 0;
                            }
                        });
                    }
                });

                const productsData = (allProducts || []).map(p => {
                    const salesInfo = productSales[p.id] || { qty: 0, revenue: 0 };
                    const costOfSales = salesInfo.qty * (parseFloat(p.purchase_price) || 0);
                    const grossProfit = salesInfo.revenue - costOfSales;
                    const margin = salesInfo.revenue > 0 ? (grossProfit / salesInfo.revenue) * 100 : 0;
                    return {
                        ...p,
                        qtySold: salesInfo.qty,
                        revenue: salesInfo.revenue,
                        costOfSales,
                        grossProfit,
                        margin
                    };
                }).filter(p => p.qtySold > 0).sort((a, b) => b.revenue - a.revenue);

                const categoryProfit = {};
                productsData.forEach(p => {
                    const cat = p.category || t('other') || 'أخرى';
                    if (!categoryProfit[cat]) {
                        categoryProfit[cat] = { category: cat, revenue: 0, costOfSales: 0, grossProfit: 0 };
                    }
                    categoryProfit[cat].revenue += p.revenue;
                    categoryProfit[cat].costOfSales += p.costOfSales;
                    categoryProfit[cat].grossProfit += p.grossProfit;
                });

                const categoriesData = Object.values(categoryProfit).map(c => ({
                    ...c,
                    margin: c.revenue > 0 ? (c.grossProfit / c.revenue) * 100 : 0
                })).sort((a, b) => b.revenue - a.revenue);

                const totalRevenue = productsData.reduce((sum, p) => sum + p.revenue, 0);
                const totalCost = productsData.reduce((sum, p) => sum + p.costOfSales, 0);
                const totalProfit = totalRevenue - totalCost;
                const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

                data = {
                    type: 'product_profitability',
                    products: productsData,
                    categories: categoriesData,
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    totalMargin
                };

            } else if (activeReport === 'cash_flow') {
                const CATEGORIES = [
                    { id: 'salary', labelAr: 'رواتب', labelEn: 'Salaries' },
                    { id: 'rent', labelAr: 'إيجار', labelEn: 'Rent' },
                    { id: 'hospitality', labelAr: 'ضيافة', labelEn: 'Hospitality' },
                    { id: 'utilities', labelAr: 'كهرباء وماء', labelEn: 'Utilities' },
                    { id: 'maintenance', labelAr: 'صيانة', labelEn: 'Maintenance' },
                    { id: 'other', labelAr: 'أخرى', labelEn: 'Other' },
                ];

                const [vouchers, expenses, salaries, startTrial] = await Promise.all([
                    window.api.vouchers.getAll(),
                    window.api.expenses.getAll(),
                    window.api.salaries.getAll(),
                    window.api.reports.trialBalance(filters.start_date)
                ]);

                const dateInRange = date => {
                    if (!date) return false;
                    const d = String(date).substring(0, 10);
                    if (filters.start_date && d < filters.start_date) return false;
                    if (filters.end_date && d > filters.end_date) return false;
                    return true;
                };

                const filteredVouchers = (vouchers || []).filter(v => dateInRange(v.date));
                const filteredExpenses = (expenses || []).filter(ex => dateInRange(ex.date));
                const salaryFallback = (salaries || []).filter(s => {
                    const alreadyInExpenses = filteredExpenses.some(ex =>
                        (ex.source_type === 'salary' && Number(ex.source_id) === Number(s.id)) ||
                        ex.payment_number === s.payment_number
                    );
                    return !alreadyInExpenses && dateInRange(s.payment_date || s.created_at);
                });

                const cbAccounts = (startTrial?.accounts || []).filter(a => a.code === '111' || a.code?.startsWith('111.') || a.code === '112' || a.code?.startsWith('112.'));
                const startingCash = cbAccounts.filter(a => a.code === '111' || a.code?.startsWith('111.')).reduce((sum, a) => sum + ((a.debit_balance || 0) - (a.credit_balance || 0)), 0);
                const startingBank = cbAccounts.filter(a => a.code === '112' || a.code?.startsWith('112.')).reduce((sum, a) => sum + ((a.debit_balance || 0) - (a.credit_balance || 0)), 0);
                const startingBalance = startingCash + startingBank;

                const receipts = filteredVouchers.filter(v => v.voucher_type === 'receipt');
                const totalReceipts = receipts.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);

                const payments = filteredVouchers.filter(v => v.voucher_type === 'payment');
                const totalPayments = payments.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);

                const totalExpenses = filteredExpenses.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0);
                const totalSalaries = salaryFallback.reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0);
                const totalOutflow = totalPayments + totalExpenses + totalSalaries;

                const netChange = totalReceipts - totalOutflow;
                const endingBalance = startingBalance + netChange;

                const cashInflow = receipts.filter(v => v.payment_method === 'cash').reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
                const bankInflow = receipts.filter(v => v.payment_method === 'bank').reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
                const cashOutflow = payments.filter(v => v.payment_method === 'cash').reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0)
                    + filteredExpenses.filter(ex => ex.payment_method === 'cash').reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0)
                    + salaryFallback.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0);
                const bankOutflow = payments.filter(v => v.payment_method === 'bank').reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0)
                    + filteredExpenses.filter(ex => ex.payment_method === 'bank').reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0)
                    + salaryFallback.filter(s => s.payment_method === 'bank').reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0);

                data = {
                    type: 'cash_flow',
                    startingBalance,
                    startingCash,
                    startingBank,
                    receipts,
                    payments,
                    totalReceipts,
                    totalPayments,
                    totalExpenses,
                    totalSalaries,
                    totalOutflow,
                    netChange,
                    endingBalance,
                    cashInflow,
                    bankInflow,
                    cashOutflow,
                    bankOutflow,
                    expensesByCategory: CATEGORIES.map(cat => ({
                        name: cat.labelAr,
                        value: filteredExpenses.filter(ex => ex.category === cat.id).reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0)
                    })).filter(c => c.value > 0)
                };
            } else if (activeReport === 'year_end_closing') {
                const [pl, tb, custs, supps] = await Promise.all([
                    window.api.reports.profitLoss(filters.start_date, filters.end_date),
                    window.api.reports.trialBalance(filters.end_date),
                    window.api.customers.getAll(),
                    window.api.suppliers.getAll()
                ]);
                const yr = filters.start_date ? filters.start_date.substring(0, 4) : String(currentYear);
                const nextYr = parseInt(yr) + 1;
                data = {
                    type: 'year_end_closing',
                    year: yr,
                    nextYear: nextYr,
                    netProfit: pl.netProfit || 0,
                    totalRevenue: pl.totalRevenue || 0,
                    totalExpenses: (pl.cogs || 0) + (pl.totalExpenses || 0),
                    grossProfit: pl.grossProfit || 0,
                    cogs: pl.cogs || 0,
                    operatingExpenses: pl.totalExpenses || 0,
                    customerBalances: (custs || []).map(c => ({ id: c.id, name: c.name, phone: c.phone, balance: c.balance || 0 })),
                    supplierBalances: (supps || []).map(s => ({ id: s.id, name: s.name, phone: s.phone, balance: s.balance || 0 })),
                    tb
                };
            }

            setReportData(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const printReport = () => {
        const el = document.getElementById('report-content');
        if (!el) return;
        const html = `<!DOCTYPE html><html dir="ltr" lang="en"><head><meta charset="UTF-8"><style>
            *{box-sizing:border-box;margin:0;padding:0;}
            body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111;}
            h2{font-size:16px;font-weight:bold;margin-bottom:8px;}
            h3{font-size:14px;font-weight:bold;margin:12px 0 6px;}
            table{width:100%;border-collapse:collapse;margin-top:8px;}
            th,td{border:1px solid #ddd;padding:6px 10px;text-align:left;}
            th{background:#f5f5f5;font-weight:bold;}
            .stat-row{display:flex;gap:20px;margin:10px 0;}
            .stat-box{border:1px solid #ddd;border-radius:6px;padding:10px 16px;flex:1;text-align:center;}
            .stat-box .val{font-size:18px;font-weight:bold;}
            .stat-box .lbl{font-size:11px;color:#666;}
            .text-success{color:#059669;}.text-danger{color:#DC2626;}
            @media print{body{margin:0;}}
        </style></head><body>${el.innerHTML}</body></html>`;
        window.api.print.invoice(html, { paperSize: 'A4', paperOrientation: 'portrait' });
    };

    const exportCSV = async () => {
        if (!reportData) return;
        let rows = [];
        let fileName = 'report.csv';

        if (activeReport === 'sales_summary' || activeReport === 'purchases_summary') {
            fileName = activeReport === 'sales_summary' ? 'sales.csv' : 'purchases.csv';
            rows.push([t('inv_number') || 'Invoice Number', t('dash_customer') + '/' + t('dash_supplier'), t('date') || 'Date', t('total') || 'Total', t('status') || 'Status']);
            (reportData.invoices || []).forEach(inv => {
                rows.push([inv.invoice_number, inv.customer_name || inv.supplier_name || '', inv.date, inv.total, inv.status === 'paid' ? (t('inv_paid') || 'Paid') : (t('cust_creditLabel') || 'Credit')]);
            });
        } else if (activeReport === 'profit_loss') {
            fileName = 'profit_loss.csv';
            rows.push([t('vouch_description') || 'Description', t('total') || 'Total']);
            rows.push(['--- ' + (t('rep_pl_leftSide') || 'Left Side (Revenues)') + ' ---', '']);
            rows.push([t('rep_totalSales') || 'Total Sales', reportData.totalSales]);
            rows.push([t('rep_endingInventory') || 'Ending Inventory', reportData.endingInventory || 0]);
            rows.push([t('rep_pl_leftTotal') || 'Left Side Total', reportData.leftSide || 0]);
            rows.push([]);
            rows.push(['--- ' + (t('rep_pl_rightSide') || 'Right Side (Expenses)') + ' ---', '']);
            rows.push([t('rep_totalPurchases') || 'Total Purchases', reportData.totalPurchases]);
            rows.push([t('rep_beginningInventory') || 'Beginning Inventory', reportData.beginningInventory || 0]);
            rows.push([t('rep_totalExpenses') || 'Total Expenses', reportData.totalExpenses]);
            rows.push([t('rep_pl_rightTotal') || 'Right Side Total', reportData.rightSide || 0]);
            rows.push([]);
            rows.push([t('rep_netProfit') || 'Net Profit', reportData.profit]);
            rows.push([t('rep_cashBankPosition') || 'Cash & Liquidity Position', reportData.cashBankBalance || 0]);
            rows.push([t('cb_cash') || 'Cash', reportData.cashBalance || 0]);
            rows.push([t('cb_bank') || 'Bank', reportData.bankBalance || 0]);
            if (reportData.chartData?.length) {
                rows.push([]);
                rows.push([t('rep_month') || 'Month', t('dash_sales') || 'Sales', t('dash_purchases') || 'Purchases', t('rep_profit') || 'Profit']);
                reportData.chartData.forEach(r => rows.push([r.label, r.sales, r.purchases, r.profit]));
            }
            if (reportData.products?.length) {
                rows.push([]);
                rows.push([t('name') || 'Item Name', t('code') || 'Code', t('category') || 'Category', t('prod_quantity') || 'Quantity', t('prod_purchasePrice') || 'Purchase Price', t('prod_salePrice') || 'Sale Price', t('rep_stockValue') || 'Stock Value']);
                reportData.products.forEach(p => {
                    rows.push([p.name, p.code, p.category || '', p.stock_quantity || 0, p.purchase_price || 0, p.sale_price || 0, (p.stock_quantity || 0) * (p.purchase_price || 0)]);
                });
            }
        } else if (activeReport === 'customer_statement' || activeReport === 'supplier_statement') {
            fileName = `statement_${reportData.name || ''}.csv`;
            rows.push([t('date') || 'Date', t('vouch_description') || 'Description', t('acc_debit') || 'Debit', t('acc_credit') || 'Credit', t('balance') || 'Balance']);
            (reportData.statement || []).forEach(r => rows.push([r.date, r.description, r.debit || 0, r.credit || 0, r.balance || 0]));
            rows.push([]);
            rows.push([t('rep_total') || 'Total', '', reportData.totalDebit, reportData.totalCredit, reportData.balance]);
        } else if (activeReport === 'trial_balance') {
            fileName = 'trial_balance.csv';
            rows.push([t('code') || 'Code', t('acc_name') || 'Account Name', t('acc_debit') || 'Debit', t('acc_credit') || 'Credit']);
            (reportData.accounts || []).filter(a => a.debit_balance || a.credit_balance).forEach(a => {
                rows.push([a.code, a.name, a.debit_balance || 0, a.credit_balance || 0]);
            });
            rows.push(['', t('rep_total') || 'Total', reportData.totals?.debit || 0, reportData.totals?.credit || 0]);
        } else if (activeReport === 'detailed_inventory') {
            fileName = 'inventory_cogs_report.csv';
            rows.push([
                t('code') || 'الكود', t('name') || 'اسم المنتج', t('category') || 'التصنيف',
                t('rep_currentStock') || 'المخزون الحالي', t('prod_purchasePrice') || 'سعر الشراء',
                t('rep_stockValueCost') || 'قيمة المخزون', t('rep_qtyPurchased') || 'المشتريات (كمية)',
                t('rep_qtySold') || 'المبيعات (كمية)', t('rep_cogs') || 'تكلفة المبيعات'
            ]);
            (reportData.products || []).forEach(p => {
                rows.push([p.code, p.name, p.category || '', p.stock_quantity, p.purchase_price, p.stockValue, p.qtyPurchased, p.qtySold, p.cogs]);
            });
            rows.push([]);
            rows.push([
                t('rep_total') || 'Total', '', '', '', '', reportData.totalValue, reportData.totalQtyPurchased, reportData.totalQtySold, reportData.totalCogs
            ]);
        } else if (activeReport === 'aging_report') {
            fileName = 'aging_report.csv';
            rows.push(['--- ' + (t('rep_customerReceivablesAging') || 'Receivables Aging') + ' ---']);
            rows.push([t('name') || 'Name', t('phone') || 'Phone', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', t('total') || 'Total']);
            (reportData.receivables || []).forEach(c => {
                rows.push([c.name, c.phone || '', c.bracket1, c.bracket2, c.bracket3, c.bracket4, c.total]);
            });
            rows.push([]);
            rows.push(['--- ' + (t('rep_supplierPayablesAging') || 'Payables Aging') + ' ---']);
            rows.push([t('name') || 'Name', t('phone') || 'Phone', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', t('total') || 'Total']);
            (reportData.payables || []).forEach(s => {
                rows.push([s.name, s.phone || '', s.bracket1, s.bracket2, s.bracket3, s.bracket4, s.total]);
            });
        } else if (activeReport === 'product_profitability') {
            fileName = 'product_profitability.csv';
            rows.push(['--- ' + (t('rep_categoryProfitability') || 'Category Profitability') + ' ---']);
            rows.push([t('category') || 'Category', t('rep_totalSales') || 'Sales', t('rep_cogs') || 'Cost of Sales', t('rep_profit') || 'Gross Profit', t('rep_profitMargin') || 'Profit Margin (%)']);
            (reportData.categories || []).forEach(c => {
                rows.push([c.category, c.revenue, c.costOfSales, c.grossProfit, `${c.margin.toFixed(2)}%`]);
            });
            rows.push([]);
            rows.push(['--- ' + (t('rep_productProfitabilityDetails') || 'Product Profitability') + ' ---']);
            rows.push([t('code') || 'Code', t('name') || 'Name', t('category') || 'Category', t('rep_qtySold') || 'Qty Sold', t('rep_salesValue') || 'Revenue', t('rep_cogsValue') || 'Cost', t('rep_profit') || 'Profit', t('rep_profitMargin') || 'Margin (%)']);
            (reportData.products || []).forEach(p => {
                rows.push([p.code, p.name, p.category || '', p.qtySold, p.revenue, p.costOfSales, p.grossProfit, `${p.margin.toFixed(2)}%`]);
            });
        } else if (activeReport === 'cash_flow') {
            fileName = 'cash_flow_statement.csv';
            rows.push([t('vouch_description') || 'Description', t('total') || 'Total']);
            rows.push([t('rep_startingBalance') || 'Starting Cash/Bank Balance', reportData.startingBalance]);
            rows.push([t('rep_cashInflowCustomers') || 'Inflows from customers', reportData.totalReceipts]);
            rows.push([t('rep_cashOutflowSuppliers') || 'Outflows to suppliers', reportData.totalPayments]);
            rows.push([t('rep_cashOutflowExpenses') || 'Expenses', reportData.totalExpenses]);
            rows.push([t('rep_cashOutflowSalaries') || 'Salaries', reportData.totalSalaries]);
            rows.push([t('rep_netChangeFlow') || 'Net Change', reportData.netChange]);
            rows.push([t('rep_endingBalance') || 'Ending Cash/Bank Balance', reportData.endingBalance]);
        }

        if (rows.length === 0) return;
        const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        await window.api.file.saveText({ content: csv, defaultName: fileName, filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
    };

    const reports = [
        { id: 'sales_summary', label: t('rep_salesReport') || 'Sales Report', icon: TrendingUp },
        { id: 'purchases_summary', label: t('rep_purchasesReport') || 'Purchases Report', icon: TrendingDown },
        { id: 'profit_loss', label: t('rep_profitLoss') || 'Profit & Loss', icon: BarChart2 },
        { id: 'aging_report', label: t('rep_aging_report') || 'تقرير أعمار الديون', icon: Calendar },
        { id: 'cash_flow', label: t('rep_cash_flow') || 'تقرير حركة التدفقات النقدية والسيولة', icon: DollarSign },
        { id: 'product_profitability', label: isAr ? 'ربحية المنتجات والأقسام' : 'Product Profitability', icon: ShoppingBag },
        { id: 'trial_balance', label: t('rep_trialBalance') || 'Trial Balance', icon: FileText },
        { id: 'year_end_closing', label: isAr ? 'الإقفال السنوي وتدوير السنوات المالية' : 'Year-End Closing & Roll Forward', icon: RotateCcw }
    ];

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

            {/* ── Sidebar ────────────────────────────── */}
            <div style={{
                width: 220, flexShrink: 0,
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderLeft: '1px solid var(--border)',
                borderRadius: '16px',
                margin: '16px 8px 16px 16px',
                padding: '16px 8px',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
                display: 'flex', flexDirection: 'column', overflowY: 'auto',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ padding: '0 12px 10px', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {t('menu_reports') || 'التقارير'}
                </div>
                {reports.map(r => {
                    const active = activeReport === r.id;
                    return (
                        <button
                            key={r.id}
                            onClick={() => setActiveReport(r.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: '4px 6px',
                                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'right', fontSize: '.85rem',
                                fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                                background: active ? 'var(--primary-light)' : 'transparent',
                                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                                transition: 'all 0.25s ease',
                                position: 'relative',
                                borderRight: active ? '3px solid var(--primary)' : '3px solid transparent',
                                paddingRight: active ? 11 : 14
                            }}
                        >
                            <r.icon size={15} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{r.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Main ───────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Filters bar */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {activeReport === 'customer_statement' && (
                            <div style={{ minWidth: '220px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('dash_customer') || 'Customer'}</label>
                                <SearchableSelect
                                    options={customers.filter(c => c.code !== 'CUST-CASH').map(c => ({ value: String(c.id), label: c.name, subLabel: c.phone }))}
                                    value={filters.customer_id}
                                    onChange={v => setFilters({ ...filters, customer_id: v })}
                                    placeholder={t('vouch_selectCustomer') || 'Select Customer...'}
                                    emptyLabel={t('vouch_selectCustomer') || 'Select Customer...'}
                                />
                            </div>
                        )}
                        {activeReport === 'supplier_statement' && (
                            <div style={{ minWidth: '220px' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('dash_supplier') || 'Supplier'}</label>
                                <SearchableSelect
                                    options={suppliers.filter(s => s.code !== 'SUPP-CASH').map(s => ({ value: String(s.id), label: s.name, subLabel: s.phone }))}
                                    value={filters.supplier_id}
                                    onChange={v => setFilters({ ...filters, supplier_id: v })}
                                    placeholder={t('vouch_selectSupplier') || 'Select Supplier...'}
                                    emptyLabel={t('vouch_selectSupplier') || 'Select Supplier...'}
                                />
                            </div>
                        )}
                        {activeReport !== 'inventory' && (
                            <>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('rep_fromDate') || 'From Date'}</label>
                                    <input type="date" className="form-input" value={filters.start_date}
                                        onChange={e => setFilters({ ...filters, start_date: e.target.value })} style={{ padding: '7px 10px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('rep_toDate') || 'To Date'}</label>
                                    <input type="date" className="form-input" value={filters.end_date}
                                        onChange={e => setFilters({ ...filters, end_date: e.target.value })} style={{ padding: '7px 10px' }} />
                                </div>
                            </>
                        )}
                        <button
                            onClick={generateReport} disabled={loading}
                            className="btn btn-primary"
                            style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <BarChart3 size={16} />
                            {loading ? (t('rep_loading') || 'Loading...') : (t('rep_showReport') || 'Show Report')}
                        </button>
                        {reportData && (
                            <>
                                <button onClick={printReport} className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Printer size={15} /> {t('print') || 'Print'}
                                </button>
                                <button onClick={exportCSV} className="btn btn-secondary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', borderColor: '#10B981' }}>
                                    <Download size={15} /> {t('rep_exportCsv') || 'Export CSV'}
                                </button>
                            </>
                        )}
                        {/* Date quick-picks & Fiscal Year Selector */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginRight: 'auto', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-alt)', padding: '3px 8px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <Calendar size={14} color="var(--primary)" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    {isAr ? 'السنة المالية:' : 'Fiscal Year:'}
                                </span>
                                <select
                                    style={{
                                        background: 'transparent', border: 'none', fontSize: '0.78rem', fontWeight: 700,
                                        color: 'var(--primary)', cursor: 'pointer', outline: 'none', padding: '2px 4px'
                                    }}
                                    value={filters.start_date ? filters.start_date.substring(0, 4) : String(currentYear)}
                                    onChange={e => {
                                        const yr = e.target.value;
                                        if (yr) {
                                            setFilters(f => ({ ...f, start_date: `${yr}-01-01`, end_date: `${yr}-12-31` }));
                                        }
                                    }}
                                >
                                    {Array.from({ length: Math.max(currentYear - 2026 + 3, 3) }, (_, i) => String(2026 + i)).map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>

                            {[
                                { label: t('rep_thisMonth') || 'This Month', s: `${today.slice(0, 7)}-01`, e: today },
                                { label: t('rep_thisYear') || 'This Year', s: firstDay, e: today },
                                { label: isAr ? 'عام 2026' : 'Year 2026', s: '2026-01-01', e: '2026-12-31' },
                                { label: isAr ? 'عام 2027' : 'Year 2027', s: '2027-01-01', e: '2027-12-31' },
                            ].map(q => (
                                <button key={q.label} onClick={() => setFilters(f => ({ ...f, start_date: q.s, end_date: q.e }))}
                                    style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {!reportData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                            <BarChart3 size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <h3 style={{ margin: 0 }}>{t('rep_emptyState') || 'Select a report and click "Show Report"'}</h3>
                        </div>
                    ) : (
                        <div id="report-content">
                            {activeReport === 'sales_summary' && (
                                <SalesReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'purchases_summary' && (
                                <PurchasesReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'profit_loss' && (
                                <ProfitLossReport
                                    reportData={reportData} fmt={fmt} categories={categories}
                                    plSearchQuery={plSearchQuery} setPlSearchQuery={setPlSearchQuery}
                                    plCategoryFilter={plCategoryFilter} setPlCategoryFilter={setPlCategoryFilter}
                                    plStockFilter={plStockFilter} setPlStockFilter={setPlStockFilter}
                                    t={t}
                                />
                            )}

                            {activeReport === 'aging_report' && (
                                <AgingReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'cash_flow' && (
                                <CashFlowReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {(activeReport === 'customer_statement' || activeReport === 'supplier_statement') && (
                                <StatementReport activeReport={activeReport} reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'product_profitability' && (
                                <ProductProfitabilityReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'trial_balance' && (
                                <TrialBalanceReport reportData={reportData} fmt={fmt} t={t} />
                            )}

                            {activeReport === 'year_end_closing' && (
                                <YearEndClosingReport reportData={reportData} fmt={fmt} isAr={isAr} t={t} />
                            )}

                            {activeReport === 'detailed_inventory' && (
                                <DetailedInventoryReport reportData={reportData} fmt={fmt} t={t} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Reports;
