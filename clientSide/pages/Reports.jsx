import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart3, FileText, TrendingUp, TrendingDown, Printer, Calendar,
    DollarSign, ShoppingBag, BarChart2, Download, Plus, Search
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../App';
import SearchableSelect from '../components/SearchableSelect';

// ── Helpers ──────────────────────────────────────────────────────────────────
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

const MONTHS_AR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Reports() {
    const { t, user, theme } = useAuth();
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
                // Monthly sales chart + totals
                const reportRes = await window.api.reports.salesReport(filters.start_date, filters.end_date);
                const filtered = reportRes.invoices || [];
                // Group by month
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
                    customerAging[c.id] = { id: c.id, name: c.name, phone: c.phone, total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0 };
                });

                (sales || []).forEach(inv => {
                    if (inv.status !== 'paid') {
                        const unpaid = (inv.total || 0) - (parseFloat(inv.paid) || 0);
                        if (unpaid <= 0) return;
                        const cId = inv.customer_id;
                        if (!customerAging[cId]) {
                            customerAging[cId] = { id: cId, name: inv.customer_name || `Customer #${cId}`, phone: '', total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0 };
                        }
                        const age = getAgeDays(inv.date);
                        customerAging[cId].total += unpaid;
                        if (age <= 30) customerAging[cId].bracket1 += unpaid;
                        else if (age <= 60) customerAging[cId].bracket2 += unpaid;
                        else if (age <= 90) customerAging[cId].bracket3 += unpaid;
                        else customerAging[cId].bracket4 += unpaid;
                    }
                });

                const supplierAging = {};
                (allSuppliers || []).forEach(s => {
                    supplierAging[s.id] = { id: s.id, name: s.name, phone: s.phone, total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0 };
                });

                (purchases || []).forEach(inv => {
                    if (inv.status !== 'paid') {
                        const unpaid = (inv.total || 0) - (parseFloat(inv.paid) || 0);
                        if (unpaid <= 0) return;
                        const sId = inv.supplier_id;
                        if (!supplierAging[sId]) {
                            supplierAging[sId] = { id: sId, name: inv.supplier_name || `Supplier #${sId}`, phone: '', total: 0, bracket1: 0, bracket2: 0, bracket3: 0, bracket4: 0 };
                        }
                        const age = getAgeDays(inv.date);
                        supplierAging[sId].total += unpaid;
                        if (age <= 30) supplierAging[sId].bracket1 += unpaid;
                        else if (age <= 60) supplierAging[sId].bracket2 += unpaid;
                        else if (age <= 90) supplierAging[sId].bracket3 += unpaid;
                        else supplierAging[sId].bracket4 += unpaid;
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
                    { id: 'salary',       labelAr: 'رواتب',           labelEn: 'Salaries' },
                    { id: 'rent',         labelAr: 'إيجار',          labelEn: 'Rent' },
                    { id: 'hospitality',  labelAr: 'ضيافة',           labelEn: 'Hospitality' },
                    { id: 'utilities',    labelAr: 'كهرباء وماء',     labelEn: 'Utilities' },
                    { id: 'maintenance',  labelAr: 'صيانة',           labelEn: 'Maintenance' },
                    { id: 'other',        labelAr: 'أخرى',            labelEn: 'Other' },
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
                t('code') || 'الكود',
                t('name') || 'اسم المنتج',
                t('category') || 'التصنيف',
                t('rep_currentStock') || 'المخزون الحالي',
                t('prod_purchasePrice') || 'سعر الشراء',
                t('rep_stockValueCost') || 'قيمة المخزون',
                t('rep_qtyPurchased') || 'المشتريات (كمية)',
                t('rep_qtySold') || 'المبيعات (كمية)',
                t('rep_cogs') || 'تكلفة المبيعات'
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
        { id: 'trial_balance', label: t('rep_trialBalance') || 'Trial Balance', icon: FileText },
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
                        {/* Date quick-picks */}
                        <div style={{ display: 'flex', gap: '6px', marginRight: 'auto' }}>
                            {[
                                { label: t('rep_thisMonth') || 'This Month', s: `${today.slice(0, 7)}-01`, e: today },
                                { label: t('rep_thisYear') || 'This Year', s: firstDay, e: today },
                                { label: t('rep_firstQuarter') || 'First Quarter', s: `${currentYear}-01-01`, e: `${currentYear}-03-31` },
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
                            {/* ── Sales Summary ── */}
                            {activeReport === 'sales_summary' && reportData.type === 'sales_summary' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📊 {t('rep_salesReport') || 'Sales Report'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        {[
                                            { label: t('rep_totalSales') || 'Total Sales', val: fmt(reportData.totalSales), color: '#6366F1', icon: TrendingUp },
                                            { label: t('rep_collectedSales') || 'Collected Sales', val: fmt(reportData.totalPaid), color: '#10B981', icon: DollarSign },
                                            { label: t('rep_receivables') || 'Receivables', val: fmt(reportData.totalPending), color: '#F59E0B', icon: Calendar },
                                            { label: t('rep_invoiceCount') || 'Invoice Count', val: reportData.count, color: '#3B82F6', icon: FileText },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <s.icon size={20} color={s.color} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {reportData.chartData?.length > 0 && (
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                                            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlySales') || 'Monthly Sales'}</h3>
                                            <ResponsiveContainer width="100%" height={240}>
                                                <BarChart data={reportData.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis dataKey="label" fontSize={11} />
                                                    <YAxis fontSize={11} />
                                                    <Tooltip formatter={(v) => fmt(v)} />
                                                    <Legend />
                                                    <Bar dataKey="paid" name={t('inv_paid') || 'Paid'} fill="#10B981" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="pending" name={t('cust_creditLabel') || 'Credit'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <InvoiceTable invoices={reportData.invoices} fmt={fmt} title={t('rep_invoiceDetails') || 'Invoice Details'} t={t} />
                                </div>
                            )}

                            {/* ── Purchases Summary ── */}
                            {activeReport === 'purchases_summary' && reportData.type === 'purchases_summary' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px' }}>📦 {t('rep_purchasesReport') || 'Purchases Report'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        {[
                                            { label: t('rep_totalPurchases') || 'Total Purchases', val: fmt(reportData.total), color: '#EF4444', icon: TrendingDown },
                                            { label: t('rep_invoiceCount') || 'Invoice Count', val: reportData.count, color: '#8B5CF6', icon: ShoppingBag },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <s.icon size={20} color={s.color} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {reportData.chartData?.length > 0 && (
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                                            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlyPurchases') || 'Monthly Purchases'}</h3>
                                            <ResponsiveContainer width="100%" height={240}>
                                                <BarChart data={reportData.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis dataKey="label" fontSize={11} />
                                                    <YAxis fontSize={11} />
                                                    <Tooltip formatter={(v) => fmt(v)} />
                                                    <Bar dataKey="total" name={t('dash_purchases') || 'Purchases'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <InvoiceTable invoices={reportData.invoices} fmt={fmt} title={t('rep_invoiceDetails') || 'Invoice Details'} t={t} />
                                </div>
                            )}

                            {/* ── Profit & Loss ── */}
                            {activeReport === 'profit_loss' && reportData.type === 'profit_loss' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px' }}>💰 {t('rep_profitLoss') || 'Profit & Loss Report'}</h2>
                                    {/* Net Profit/Loss highlight */}
                                    <div style={{
                                        background: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2',
                                        border: `2px solid ${reportData.profit >= 0 ? '#10B981' : '#EF4444'}`,
                                        borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px'
                                    }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: reportData.profit >= 0 ? '#059669' : '#DC2626' }}>
                                            {fmt(Math.abs(reportData.profit))}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: reportData.profit >= 0 ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                                            {reportData.profit >= 0 ? `✅ ${t('rep_netProfit') || 'Net Profit'}` : `❌ ${t('rep_netLoss') || 'Net Loss'}`}
                                        </div>
                                    </div>
                                    {reportData.chartData?.length > 0 && (
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                                            <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlyComparison') || 'Monthly Comparison'}</h3>
                                            <ResponsiveContainer width="100%" height={280}>
                                                <BarChart data={reportData.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis dataKey="label" fontSize={11} />
                                                    <YAxis fontSize={11} />
                                                    <Tooltip formatter={(v) => fmt(v)} />
                                                    <Legend />
                                                    <Bar dataKey="sales" name={t('dash_sales') || 'Sales'} fill="#6366F1" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="purchases" name={t('dash_purchases') || 'Purchases'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="profit" name={t('rep_profit') || 'Profit'} fill="#10B981" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    {/* Trading Account - Two-sided equation table */}
                                    {reportData && (
                                        <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', textAlign: 'center', fontSize: '0.95rem' }}>
                                                📊 {t('rep_pl_tradingAccount') || 'Trading Account & Profit/Loss'}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '200px' }}>
                                                {/* Right Side - Costs (الطرف المدين) */}
                                                <div style={{ borderLeft: '2px solid var(--border)' }}>
                                                    <div style={{ padding: '10px 14px', background: '#FEF2F2', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#DC2626', textAlign: 'center', fontSize: '0.85rem' }}>
                                                        {t('rep_pl_debitSide') || 'Debit Side (Expenses)'}
                                                    </div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalPurchases') || 'Total Purchases'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 600, color: '#EF4444', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalPurchases)}</td>
                                                            </tr>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_beginningInventory') || 'Beginning Inventory'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 600, color: '#F59E0B', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.beginningInventory)}</td>
                                                            </tr>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalExpenses') || 'Total Expenses'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 600, color: '#8B5CF6', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalExpenses)}</td>
                                                            </tr>
                                                            {reportData.profit > 0 && (
                                                                <tr style={{ borderBottom: '1px solid var(--border)', background: '#F0FDF4' }}>
                                                                    <td style={{ ...tdStyle, paddingRight: '20px', fontWeight: 700, color: '#059669' }}>✅ {t('rep_netProfit') || 'Net Profit'}</td>
                                                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#059669', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.profit)}</td>
                                                                </tr>
                                                            )}
                                                            <tr style={{ background: '#FEF2F2', fontWeight: 700, borderTop: '2px solid #EF4444' }}>
                                                                <td style={{ ...tdStyle, color: '#DC2626' }}>{t('rep_pl_debitTotal') || 'Total'}</td>
                                                                <td style={{ ...tdStyle, color: '#DC2626', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '1rem' }}>{fmt(reportData.totalPurchases + reportData.beginningInventory + reportData.totalExpenses + Math.max(0, reportData.profit))}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {/* Left Side - Revenue (الطرف الدائن) */}
                                                <div>
                                                    <div style={{ padding: '10px 14px', background: '#F0FDF4', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#059669', textAlign: 'center', fontSize: '0.85rem' }}>
                                                        {t('rep_pl_creditSide') || 'Credit Side (Revenues)'}
                                                    </div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <tbody>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalSales') || 'Total Sales'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 600, color: '#6366F1', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalSales)}</td>
                                                            </tr>
                                                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_endingInventory') || 'Ending Inventory'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 600, color: '#0F766E', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.endingInventory)}</td>
                                                            </tr>
                                                            {reportData.profit < 0 && (
                                                                <tr style={{ borderBottom: '1px solid var(--border)', background: '#FEF2F2' }}>
                                                                    <td style={{ ...tdStyle, paddingRight: '20px', fontWeight: 700, color: '#DC2626' }}>❌ {t('rep_netLoss') || 'Net Loss'}</td>
                                                                    <td style={{ ...tdStyle, fontWeight: 700, color: '#DC2626', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(Math.abs(reportData.profit))}</td>
                                                                </tr>
                                                            )}
                                                            <tr style={{ background: '#F0FDF4', fontWeight: 700, borderTop: '2px solid #10B981' }}>
                                                                <td style={{ ...tdStyle, color: '#059669' }}>{t('rep_pl_creditTotal') || 'Total'}</td>
                                                                <td style={{ ...tdStyle, color: '#059669', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '1rem' }}>{fmt(reportData.totalSales + reportData.endingInventory + Math.max(0, -reportData.profit))}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            {/* Equation display */}
                                            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <strong>{t('rep_pl_equation') || 'Equation'}:</strong>{' '}
                                                <span style={{ color: '#6366F1' }}>{t('rep_totalSales') || 'Total Sales'}</span> + {' '}
                                                <span style={{ color: '#0F766E' }}>{t('rep_endingInventory') || 'Ending Inventory'}</span> = {' '}
                                                <span style={{ color: '#EF4444' }}>{t('rep_totalPurchases') || 'Total Purchases'}</span> + {' '}
                                                <span style={{ color: '#F59E0B' }}>{t('rep_beginningInventory') || 'Beginning Inventory'}</span> + {' '}
                                                <span style={{ color: '#8B5CF6' }}>{t('rep_totalExpenses') || 'Total Expenses'}</span>
                                                {reportData.profit >= 0 ? 
                                                    <span style={{ color: '#059669' }}> + {t('rep_netProfit') || 'Net Profit'}</span> :
                                                    <span style={{ color: '#DC2626' }}> - {t('rep_netLoss') || 'Net Loss'}</span>
                                                }
                                            </div>
                                        </div>
                                    )}
                                    {/* Cash & Liquidity Position */}
                                    {reportData && (
                                        <div style={{ marginTop: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>🏦 {t('rep_cashBankPosition') || 'Cash & Liquidity Position (Cash & Banks)'}</span>
                                                <span style={{ fontSize: '1.1rem', color: reportData.cashBankBalance >= 0 ? '#0D9488' : '#DC2626', fontWeight: 'bold' }}>
                                                    {fmt(reportData.cashBankBalance)}
                                                </span>
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr>
                                                        <td style={tdStyle}>{t('cb_cash') || 'Cash'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 600, color: reportData.cashBalance >= 0 ? 'var(--text-main)' : '#DC2626' }}>{fmt(reportData.cashBalance)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={tdStyle}>{t('cb_bank') || 'Bank'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 600, color: reportData.bankBalance >= 0 ? 'var(--text-main)' : '#DC2626' }}>{fmt(reportData.bankBalance)}</td>
                                                    </tr>
                                                    <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}>{t('rep_cashBankBalance') || 'Total Available Cash'}</td>
                                                        <td style={{ ...tdStyle, color: reportData.cashBankBalance >= 0 ? '#0D9488' : '#DC2626' }}>{fmt(reportData.cashBankBalance)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {(() => {
                                        const filteredPlProducts = (reportData.products || []).filter(p => {
                                            const matchesSearch = !plSearchQuery || 
                                                p.name.toLowerCase().includes(plSearchQuery.toLowerCase()) || 
                                                p.code?.toLowerCase().includes(plSearchQuery.toLowerCase());
                                            const matchesCategory = !plCategoryFilter || p.category === plCategoryFilter;
                                            const matchesStock = plStockFilter === 'all' ? true :
                                                                 plStockFilter === 'low' ? (p.stock_quantity > 0 && p.stock_quantity <= 5) :
                                                                 plStockFilter === 'out' ? (p.stock_quantity <= 0) :
                                                                 plStockFilter === 'safe' ? (p.stock_quantity > 5) : true;
                                            return matchesSearch && matchesCategory && matchesStock;
                                        });
                                        const filteredEndingInventory = filteredPlProducts.reduce((sum, p) => sum + ((parseFloat(p.stock_quantity) || 0) * (parseFloat(p.purchase_price) || 0)), 0);

                                        if (reportData.products?.length === 0) return null;

                                        return (
                                            <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                                        <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>📊 {t('rep_inventoryReport') || 'تقرير المخزون'}</h3>
                                                        <span style={{ fontSize: '0.8rem', color: filteredPlProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length ? '#D97706' : 'var(--text-muted)', fontWeight: 600 }}>
                                                            {t('rep_lowStock') || 'Low Stock'}: {filteredPlProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Filter Controls Row */}
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {/* Search Input */}
                                                        <div style={{ position: 'relative', width: '200px' }}>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                placeholder={t('search') || 'بحث...'}
                                                                value={plSearchQuery}
                                                                onChange={e => setPlSearchQuery(e.target.value)}
                                                                style={{ paddingRight: '36px', height: '38px', width: '100%', margin: 0 }}
                                                            />
                                                            <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                        </div>

                                                        {/* Category Selector */}
                                                        {categories.length > 0 && (
                                                            <div style={{ width: '160px' }}>
                                                                <SearchableSelect
                                                                    options={categories.map(c => ({ value: c, label: c }))}
                                                                    value={plCategoryFilter}
                                                                    onChange={setPlCategoryFilter}
                                                                    placeholder={t('all') || 'جميع الفئات'}
                                                                    emptyLabel={t('all') || 'جميع الفئات'}
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Stock Status Selector */}
                                                        <select
                                                            className="form-select"
                                                            value={plStockFilter}
                                                            onChange={e => setPlStockFilter(e.target.value)}
                                                            style={{ width: '150px', height: '38px', margin: 0 }}
                                                        >
                                                            <option value="all">{t('all') || 'كل المنتجات'}</option>
                                                            <option value="low">{t('rep_lowStock') || 'نواقص المخزون (<= 5)'}</option>
                                                            <option value="out">{t('rep_outOfStock') || 'غير متوفر (<= 0)'}</option>
                                                            <option value="safe">{t('in_stock') || 'المتوفر (> 5)'}</option>
                                                        </select>

                                                        {/* Reset Button */}
                                                        {(plSearchQuery || plCategoryFilter || plStockFilter !== 'all') && (
                                                            <button 
                                                                className="btn btn-ghost btn-sm" 
                                                                onClick={() => { setPlSearchQuery(''); setPlCategoryFilter(''); setPlStockFilter('all'); }} 
                                                                style={{ color: 'var(--text-muted)', height: '38px', padding: '0 8px' }}
                                                            >
                                                                ✕ {t('clear') || 'مسح'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                                            <th style={thStyle}>#</th>
                                                            <th style={thStyle}>{t('name') || 'Item Name'}</th>
                                                            <th style={thStyle}>{t('code') || 'Code'}</th>
                                                            <th style={thStyle}>{t('category') || 'Category'}</th>
                                                            <th style={thStyle}>{t('prod_quantity') || 'QTY'}</th>
                                                            <th style={thStyle}>{t('prod_purchasePrice') || 'Purchase Price'}</th>
                                                            <th style={thStyle}>{t('prod_salePrice') || 'Sale Price'}</th>
                                                            <th style={thStyle}>{t('rep_stockValue') || 'Stock Value'}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredPlProducts.map((p, idx) => (
                                                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: p.stock_quantity <= 0 ? '#FFF7F7' : p.stock_quantity <= 5 ? '#FFFBEB' : 'transparent' }}>
                                                                <td style={tdStyle}>{idx + 1}</td>
                                                                <td style={tdStyle}><strong>{p.name}</strong></td>
                                                                <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.code}</td>
                                                                <td style={tdStyle}>{p.category || '-'}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 700, color: p.stock_quantity <= 0 ? '#EF4444' : p.stock_quantity <= 5 ? '#F59E0B' : '#10B981' }}>{p.stock_quantity || 0}</td>
                                                                <td style={tdStyle}>{fmt(p.purchase_price)}</td>
                                                                <td style={tdStyle}>{fmt(p.sale_price)}</td>
                                                                <td style={{ ...tdStyle, fontWeight: 700, color: '#0F766E' }}>{fmt((p.stock_quantity || 0) * (p.purchase_price || 0))}</td>
                                                            </tr>
                                                        ))}
                                                        {filteredPlProducts.length === 0 && (
                                                            <tr>
                                                                <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                                                    {t('noData') || 'لا توجد نتائج مطابقة للبحث'}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                            <td colSpan="7" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                                                            <td style={{ ...tdStyle, color: '#0F766E', fontSize: '1rem' }}>{fmt(filteredEndingInventory)}</td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* ── Inventory ── */}
                            {activeReport === 'inventory' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px' }}>📦 {t('rep_inventoryReport') || 'Inventory Report'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        <StatCard label={t('rep_stockValue') || 'Stock Value'} val={fmt(reportData.totalValue)} color="#6366F1" />
                                        <StatCard label={t('rep_itemsCount') || 'Items Count'} val={reportData.products?.length} color="#10B981" />
                                        <StatCard label={t('rep_lowStock') || 'Low Stock'} val={reportData.lowStock?.length} color="#F59E0B" />
                                        <StatCard label={t('rep_outOfStock') || 'Out of Stock'} val={reportData.outOfStock?.length} color="#EF4444" />
                                    </div>
                                    {reportData.outOfStock?.length > 0 && (
                                        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                                            <strong style={{ color: '#DC2626', fontSize: '0.85rem' }}>⚠️ {t('rep_outOfStockItems') || 'Out of stock items:'}</strong>
                                            <span style={{ color: '#991B1B', fontSize: '0.82rem', marginRight: '8px' }}>
                                                {reportData.outOfStock.map(p => p.name).join(' | ')}
                                            </span>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '20px' }}>
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                            <h3 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_distributionByCategory') || 'Distribution by Category'}</h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={reportData.byCategory} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                                    <XAxis type="number" fontSize={10} />
                                                    <YAxis dataKey="name" type="category" fontSize={11} width={80} />
                                                    <Tooltip formatter={(v) => fmt(v)} />
                                                    <Bar dataKey="value" name={t('rep_value') || 'Value'} fill="#6366F1" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {reportData.byCategory?.length <= 8 && (
                                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                                <h3 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_shares') || 'Shares'}</h3>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <RechartsPie>
                                                        <Pie data={reportData.byCategory} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                                                            {reportData.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                        </Pie>
                                                        <Tooltip />
                                                    </RechartsPie>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>#</th>
                                                    <th style={thStyle}>{t('name') || 'Item Name'}</th>
                                                    <th style={thStyle}>{t('code') || 'Code'}</th>
                                                    <th style={thStyle}>{t('category') || 'Category'}</th>
                                                    <th style={thStyle}>{t('prod_quantity') || 'QTY'}</th>
                                                    <th style={thStyle}>{t('prod_purchasePrice') || 'Purchase Price'}</th>
                                                    <th style={thStyle}>{t('prod_salePrice') || 'Sale Price'}</th>
                                                    <th style={thStyle}>{t('rep_stockValue') || 'Stock Value'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.products?.map((p, i) => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: p.stock_quantity <= 0 ? '#FFF7F7' : p.stock_quantity <= 5 ? '#FFFBEB' : 'transparent' }}>
                                                        <td style={tdStyle}>{i + 1}</td>
                                                        <td style={tdStyle}><strong>{p.name}</strong></td>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.code}</td>
                                                        <td style={tdStyle}>{p.category || '-'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: p.stock_quantity <= 0 ? '#EF4444' : p.stock_quantity <= 5 ? '#F59E0B' : '#10B981' }}>
                                                            {p.stock_quantity || 0}
                                                        </td>
                                                        <td style={tdStyle}>{fmt(p.purchase_price)}</td>
                                                        <td style={tdStyle}>{fmt(p.sale_price)}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#6366F1' }}>{fmt((p.stock_quantity || 0) * (p.purchase_price || 0))}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                    <td colSpan="7" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                                                    <td style={{ ...tdStyle, color: '#6366F1', fontSize: '1rem' }}>{fmt(reportData.totalValue)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Detailed Inventory & COGS report ── */}
                            {activeReport === 'detailed_inventory' && reportData && reportData.type === 'detailed_inventory' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📦 {t('rep_inventory_cogs') || 'تقرير المخزون وحركته وتكلفة المبيعات'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        {[
                                            { label: t('rep_totalStockValue') || 'إجمالي قيمة المخزون (بالتكلفة)', val: fmt(reportData.totalValue), color: '#6366F1', icon: ShoppingBag },
                                            { label: t('rep_totalCogs') || 'إجمالي تكلفة المبيعات (COGS)', val: fmt(reportData.totalCogs), color: '#EF4444', icon: TrendingDown },
                                            { label: t('rep_totalQtyPurchased') || 'الكمية المشتراة خلال الفترة', val: reportData.totalQtyPurchased, color: '#10B981', icon: Plus },
                                            { label: t('rep_totalQtySold') || 'الكمية المباعة خلال الفترة', val: reportData.totalQtySold, color: '#F59E0B', icon: DollarSign },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <s.icon size={20} color={s.color} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                            📋 {t('rep_inventoryDetails') || 'تفاصيل حركة وجرد المخزون'}
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('code') || 'الكود'}</th>
                                                    <th style={thStyle}>{t('name') || 'اسم المنتج'}</th>
                                                    <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                                                    <th style={thStyle}>{t('rep_currentStock') || 'المخزون الحالي'}</th>
                                                    <th style={thStyle}>{t('prod_purchasePrice') || 'سعر الشراء'}</th>
                                                    <th style={thStyle}>{t('rep_stockValueCost') || 'قيمة المخزون'}</th>
                                                    <th style={thStyle}>{t('rep_qtyPurchased') || 'المشتريات (كمية)'}</th>
                                                    <th style={thStyle}>{t('rep_qtySold') || 'المبيعات (كمية)'}</th>
                                                    <th style={thStyle}>{t('rep_cogs') || 'تكلفة المبيعات'}</th>
                                                    <th style={thStyle}>{t('status') || 'الحالة'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.products?.map((p) => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: p.stock_quantity <= 0 ? '#FFF7F7' : p.stock_quantity <= 5 ? '#FFFBEB' : 'transparent' }}>
                                                        <td style={tdStyle}>{p.code}</td>
                                                        <td style={tdStyle}><strong>{p.name}</strong></td>
                                                        <td style={tdStyle}>{p.category || '-'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700 }}>{p.stock_quantity || 0}</td>
                                                        <td style={tdStyle}>{fmt(p.purchase_price)}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#6366F1' }}>{fmt(p.stockValue)}</td>
                                                        <td style={tdStyle}>{p.qtyPurchased}</td>
                                                        <td style={tdStyle}>{p.qtySold}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#EF4444' }}>{fmt(p.cogs)}</td>
                                                        <td style={tdStyle}>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                                                                background: p.status === 'safe' ? '#D1FAE5' : p.status === 'low' ? '#FEF3C7' : '#FEE2E2',
                                                                color: p.status === 'safe' ? '#059669' : p.status === 'low' ? '#D97706' : '#DC2626'
                                                            }}>
                                                                {p.status === 'safe' ? (t('active') || 'آمن') : p.status === 'low' ? (t('dash_minStock') || 'منخفض') : (t('inactive') || 'نفذ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                    <td colSpan="3" style={tdStyle}>{t('rep_total') || 'الإجمالي'}</td>
                                                    <td style={tdStyle}>-</td>
                                                    <td style={tdStyle}>-</td>
                                                    <td style={{ ...tdStyle, color: '#6366F1' }}>{fmt(reportData.totalValue)}</td>
                                                    <td style={tdStyle}>{reportData.totalQtyPurchased}</td>
                                                    <td style={tdStyle}>{reportData.totalQtySold}</td>
                                                    <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totalCogs)}</td>
                                                    <td style={tdStyle}>-</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Aging Report ── */}
                            {activeReport === 'aging_report' && reportData && reportData.type === 'aging_report' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📅 {t('rep_aging_report') || 'تقرير أعمار الديون'}</h2>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                            <h3 style={{ marginBottom: '12px', color: '#3B82F6' }}>📈 {t('rep_totalReceivables') || 'إجمالي الذمم المدينة (العملاء)'}</h3>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB', marginBottom: '10px' }}>{fmt(reportData.totals?.receivables)}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                                                <div style={{ background: 'rgba(37,99,235,0.08)', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>1-30 {t('day') || 'يوم'}</strong><div style={{ color: '#2563EB', fontWeight: 700 }}>{fmt(reportData.totals?.recBracket1)}</div></div>
                                                <div style={{ background: 'rgba(37,99,235,0.08)', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>31-60 {t('day') || 'يوم'}</strong><div style={{ color: '#2563EB', fontWeight: 700 }}>{fmt(reportData.totals?.recBracket2)}</div></div>
                                                <div style={{ background: 'rgba(37,99,235,0.08)', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>61-90 {t('day') || 'يوم'}</strong><div style={{ color: '#2563EB', fontWeight: 700 }}>{fmt(reportData.totals?.recBracket3)}</div></div>
                                                <div style={{ background: 'rgba(37,99,235,0.08)', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>90+ {t('day') || 'يوم'}</strong><div style={{ color: '#2563EB', fontWeight: 700 }}>{fmt(reportData.totals?.recBracket4)}</div></div>
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                                            <h3 style={{ marginBottom: '12px', color: '#EF4444' }}>📉 {t('rep_totalPayables') || 'إجمالي الذمم الدائنة (الموردين)'}</h3>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginBottom: '10px' }}>{fmt(reportData.totals?.payables)}</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                                                <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>1-30 {t('day') || 'يوم'}</strong><div style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(reportData.totals?.payBracket1)}</div></div>
                                                <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>31-60 {t('day') || 'يوم'}</strong><div style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(reportData.totals?.payBracket2)}</div></div>
                                                <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>61-90 {t('day') || 'يوم'}</strong><div style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(reportData.totals?.payBracket3)}</div></div>
                                                <div style={{ background: '#FEF2F2', padding: 8, borderRadius: 6, textAlign: 'center' }}><strong>90+ {t('day') || 'يوم'}</strong><div style={{ color: '#DC2626', fontWeight: 700 }}>{fmt(reportData.totals?.payBracket4)}</div></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Receivables Table */}
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: '#2563EB' }}>
                                            👤 {t('rep_customerReceivablesAging') || 'تحليل أعمار ذمم العملاء المدينة'}
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('name') || 'الاسم'}</th>
                                                    <th style={thStyle}>{t('phone') || 'التلفون'}</th>
                                                    <th style={thStyle}>1-30 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>31-60 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>61-90 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>90+ {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>{t('total') || 'الإجمالي'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.receivables?.map(c => (
                                                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}><strong>{c.name}</strong></td>
                                                        <td style={tdStyle}>{c.phone || '-'}</td>
                                                        <td style={tdStyle}>{c.bracket1 > 0 ? fmt(c.bracket1) : '-'}</td>
                                                        <td style={tdStyle}>{c.bracket2 > 0 ? fmt(c.bracket2) : '-'}</td>
                                                        <td style={tdStyle}>{c.bracket3 > 0 ? fmt(c.bracket3) : '-'}</td>
                                                        <td style={tdStyle}>{c.bracket4 > 0 ? fmt(c.bracket4) : '-'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#2563EB' }}>{fmt(c.total)}</td>
                                                    </tr>
                                                ))}
                                                {reportData.receivables?.length === 0 && (
                                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('noData') || 'لا توجد ذمم مدينة مستحقة'}</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Payables Table */}
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: '#DC2626' }}>
                                            🏢 {t('rep_supplierPayablesAging') || 'تحليل أعمار التزامات الموردين الدائنة'}
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('name') || 'الاسم'}</th>
                                                    <th style={thStyle}>{t('phone') || 'التلفون'}</th>
                                                    <th style={thStyle}>1-30 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>31-60 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>61-90 {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>90+ {t('day') || 'يوم'}</th>
                                                    <th style={thStyle}>{t('total') || 'الإجمالي'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.payables?.map(s => (
                                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}><strong>{s.name}</strong></td>
                                                        <td style={tdStyle}>{s.phone || '-'}</td>
                                                        <td style={tdStyle}>{s.bracket1 > 0 ? fmt(s.bracket1) : '-'}</td>
                                                        <td style={tdStyle}>{s.bracket2 > 0 ? fmt(s.bracket2) : '-'}</td>
                                                        <td style={tdStyle}>{s.bracket3 > 0 ? fmt(s.bracket3) : '-'}</td>
                                                        <td style={tdStyle}>{s.bracket4 > 0 ? fmt(s.bracket4) : '-'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#DC2626' }}>{fmt(s.total)}</td>
                                                    </tr>
                                                ))}
                                                {reportData.payables?.length === 0 && (
                                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('noData') || 'لا توجد ذمم دائنة مستحقة'}</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Product & Category Profitability ── */}
                            {activeReport === 'product_profitability' && reportData && reportData.type === 'product_profitability' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📊 {t('rep_product_profitability') || 'تقرير ربحية المنتجات والتصنيفات'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        {[
                                            { label: t('rep_totalRevenue') || 'إجمالي الإيرادات', val: fmt(reportData.totalRevenue), color: '#6366F1', icon: TrendingUp },
                                            { label: t('rep_totalCostOfSales') || 'تكلفة المبيعات', val: fmt(reportData.totalCost), color: '#EF4444', icon: TrendingDown },
                                            { label: t('rep_grossProfit') || 'مجمل الربح', val: fmt(reportData.totalProfit), color: '#10B981', icon: DollarSign },
                                            { label: t('rep_profitMargin') || 'هامش الربح الإجمالي', val: `${(reportData.totalMargin || 0).toFixed(2)}%`, color: '#F59E0B', icon: BarChart3 },
                                        ].map(s => (
                                            <div key={s.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <s.icon size={20} color={s.color} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Category Profitability Table */}
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                            🏷️ {t('rep_categoryProfitability') || 'ربحية تصنيفات المنتجات'}
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                                                    <th style={thStyle}>{t('rep_totalSales') || 'المبيعات'}</th>
                                                    <th style={thStyle}>{t('rep_cogs') || 'التكلفة'}</th>
                                                    <th style={thStyle}>{t('rep_profit') || 'صافي الربح'}</th>
                                                    <th style={thStyle}>{t('rep_profitMargin') || 'هامش الربح'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.categories?.map(c => (
                                                    <tr key={c.category} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}><strong>{c.category}</strong></td>
                                                        <td style={tdStyle}>{fmt(c.revenue)}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(c.costOfSales)}</td>
                                                        <td style={{ ...tdStyle, color: '#10B981', fontWeight: 700 }}>{fmt(c.grossProfit)}</td>
                                                        <td style={{ ...tdStyle, color: '#F59E0B', fontWeight: 700 }}>{(c.margin || 0).toFixed(2)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Product Profitability Table */}
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                            📦 {t('rep_productProfitabilityDetails') || 'ربحية المنتجات الفردية'}
                                        </div>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('code') || 'الكود'}</th>
                                                    <th style={thStyle}>{t('name') || 'المنتج'}</th>
                                                    <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                                                    <th style={thStyle}>{t('rep_qtySold') || 'الكمية المباعة'}</th>
                                                    <th style={thStyle}>{t('rep_salesValue') || 'إيرادات المبيعات'}</th>
                                                    <th style={thStyle}>{t('rep_cogsValue') || 'تكلفة المبيعات'}</th>
                                                    <th style={thStyle}>{t('rep_profit') || 'الأرباح'}</th>
                                                    <th style={thStyle}>{t('rep_profitMargin') || 'الهامش'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.products?.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.code}</td>
                                                        <td style={tdStyle}><strong>{p.name}</strong></td>
                                                        <td style={tdStyle}>{p.category || '-'}</td>
                                                        <td style={tdStyle}>{p.qtySold}</td>
                                                        <td style={tdStyle}>{fmt(p.revenue)}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(p.costOfSales)}</td>
                                                        <td style={{ ...tdStyle, color: '#10B981', fontWeight: 700 }}>{fmt(p.grossProfit)}</td>
                                                        <td style={{ ...tdStyle, color: '#F59E0B', fontWeight: 700 }}>{(p.margin || 0).toFixed(2)}%</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Cash Flow report ── */}
                            {activeReport === 'cash_flow' && reportData && reportData.type === 'cash_flow' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>💸 {t('rep_cash_flow') || 'تقرير حركة التدفقات النقدية والسيولة'}</h2>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_startingBalance') || 'السيولة أول المدة'}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#6366F1', marginTop: '4px' }}>{fmt(reportData.startingBalance)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {t('cb_cash') || 'الصندوق'}: {fmt(reportData.startingCash)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.startingBank)}
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_totalCashInflow') || 'إجمالي المقبوضات (الواردة)'}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10B981', marginTop: '4px' }}>{fmt(reportData.totalReceipts)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {t('cb_cash') || 'الصندوق'}: {fmt(reportData.cashInflow)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.bankInflow)}
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_totalCashOutflow') || 'إجمالي المدفوعات (الصادرة)'}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#EF4444', marginTop: '4px' }}>{fmt(reportData.totalOutflow)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {t('cb_cash') || 'الصندوق'}: {fmt(reportData.cashOutflow)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.bankOutflow)}
                                            </div>
                                        </div>

                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_endingBalance') || 'السيولة آخر المدة'}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#F59E0B', marginTop: '4px' }}>{fmt(reportData.endingBalance)}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {t('rep_netChangeFlow') || 'صافي التدفق'}: <span style={{ color: reportData.netChange >= 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{reportData.netChange >= 0 ? '+' : ''}{fmt(reportData.netChange)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Breakdowns & Pie Chart of Expenses */}
                                    <div style={{ display: 'grid', gridTemplateColumns: (reportData.expensesByCategory?.length || 0) > 0 ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '24px' }}>
                                        {/* Statement table */}
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                                                📊 {t('rep_cashFlowSummaryStatement') || 'بيان ملخص التدفق النقدي والسيولة'}
                                            </div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}><strong>{t('rep_startingBalance') || 'رصيد النقدية والسيولة أول المدة'}</strong></td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'left' }}>{fmt(reportData.startingBalance)}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#F0FDF4' }}>
                                                        <td style={tdStyle}>➕ {t('rep_cashInflowCustomers') || 'مقبوضات نقدية من المبيعات والعملاء'}</td>
                                                        <td style={{ ...tdStyle, color: '#10B981', textAlign: 'left' }}>+{fmt(reportData.totalReceipts)}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                                        <td style={tdStyle}>➖ {t('rep_cashOutflowSuppliers') || 'مدفوعات نقدية للمشتريات والموردين'}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalPayments)}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                                        <td style={tdStyle}>➖ {t('rep_cashOutflowExpenses') || 'مصروفات تشغيلية وإدارية مدفوعة'}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalExpenses)}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                                        <td style={tdStyle}>➖ {t('rep_cashOutflowSalaries') || 'رواتب وأجور موظفين مدفوعة'}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalSalaries)}</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid var(--border)', fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                                        <td style={tdStyle}>📊 {t('rep_endingBalance') || 'إجمالي النقدية والسيولة آخر المدة'}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'left' }}>{fmt(reportData.endingBalance)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Expenses Pie Chart */}
                                        {reportData.expensesByCategory.length > 0 && (
                                            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <h3 style={{ marginBottom: '12px', alignSelf: 'flex-start', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>🏷️ {t('rep_expenseDistribution') || 'توزيع بنود المصروفات'}</h3>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <RechartsPie>
                                                        <Pie
                                                            data={reportData.expensesByCategory}
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={50}
                                                            outerRadius={80}
                                                            paddingAngle={3}
                                                            dataKey="value"
                                                        >
                                                            {reportData.expensesByCategory.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(v) => fmt(v)} />
                                                    </RechartsPie>
                                                </ResponsiveContainer>
                                                {/* Legend */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '10px', fontSize: '0.75rem' }}>
                                                    {reportData.expensesByCategory.map((entry, index) => (
                                                        <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                                                            {entry.name}: {fmt(entry.value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Customer / Supplier Statement ── */}
                            {(activeReport === 'customer_statement' || activeReport === 'supplier_statement') && reportData && (reportData.type === 'customer_statement' || reportData.type === 'supplier_statement') && reportData.statement && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div>
                                            <h2 style={{ margin: 0 }}>{activeReport === 'customer_statement' ? (t('rep_customerStatement') || 'Customer Statement') : (t('rep_supplierStatement') || 'Supplier Statement')}: <strong>{reportData.name}</strong></h2>
                                            {reportData.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>📞 {reportData.phone}</p>}
                                        </div>
                                        <div style={{
                                            padding: '10px 20px', borderRadius: '10px',
                                            background: reportData.balance > 0 ? '#FEF3C7' : '#D1FAE5',
                                            border: `1px solid ${reportData.balance > 0 ? '#F59E0B' : '#10B981'}`
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_finalBalance') || 'Final Balance'}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: reportData.balance > 0 ? '#D97706' : '#059669' }}>
                                                {fmt(Math.abs(reportData.balance))}
                                                <span style={{ fontSize: '0.75rem', marginRight: '4px' }}>{reportData.balance > 0 ? `(${t('acc_debit') || 'Debit'})` : `(${t('acc_credit') || 'Credit'})`}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                        <StatCard label={t('rep_totalDebit') || 'Total Debit'} val={fmt(reportData.totalDebit)} color="#EF4444" />
                                        <StatCard label={t('rep_totalCredit') || 'Total Credit'} val={fmt(reportData.totalCredit)} color="#10B981" />
                                    </div>
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('date') || 'Date'}</th>
                                                    <th style={thStyle}>{t('vouch_description') || 'Description'}</th>
                                                    <th style={thStyle}>{t('acc_debit') || 'Debit'}</th>
                                                    <th style={thStyle}>{t('acc_credit') || 'Credit'}</th>
                                                    <th style={thStyle}>{t('balance') || 'Balance'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.statement.map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                                        <td style={tdStyle}>{row.description}</td>
                                                        <td style={{ ...tdStyle, color: '#EF4444', fontWeight: row.debit > 0 ? 600 : 400 }}>{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                                                        <td style={{ ...tdStyle, color: '#10B981', fontWeight: row.credit > 0 ? 600 : 400 }}>{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 700, color: row.balance >= 0 ? '#D97706' : '#059669' }}>{fmt(Math.abs(row.balance))} {row.balance > 0 ? '🔴' : '🟢'}</td>
                                                    </tr>
                                                ))}
                                                {reportData.statement.length === 0 && (
                                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>{t('noData') || 'No transactions in this period'}</td></tr>
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                    <td colSpan="2" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                                                    <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totalDebit)}</td>
                                                    <td style={{ ...tdStyle, color: '#10B981' }}>{fmt(reportData.totalCredit)}</td>
                                                    <td style={{ ...tdStyle, color: reportData.balance > 0 ? '#D97706' : '#059669' }}>{fmt(Math.abs(reportData.balance))}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ── Trial Balance ── */}
                            {activeReport === 'trial_balance' && reportData && reportData.type === 'trial_balance' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px' }}>📋 {t('rep_trialBalance') || 'Trial Balance'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                        <StatCard label={t('rep_totalDebit') || 'Total Debit'} val={fmt(reportData.totals?.debit)} color="#EF4444" />
                                        <StatCard label={t('rep_totalCredit') || 'Total Credit'} val={fmt(reportData.totals?.credit)} color="#10B981" />
                                        <div style={{
                                            border: `2px solid ${Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#10B981' : '#EF4444'}`,
                                            borderRadius: '12px', padding: '14px', textAlign: 'center',
                                            background: Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#D1FAE5' : '#FEE2E2'
                                        }}>
                                            <div style={{ fontWeight: 800, color: Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#059669' : '#DC2626' }}>
                                                {Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? `✅ ${t('rep_balanced') || 'Balanced'}` : `❌ ${t('rep_unbalanced') || 'Unbalanced'}`}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('rep_difference') || 'Difference'}: {fmt(Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)))}</div>
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                                    <th style={thStyle}>{t('code') || 'Code'}</th>
                                                    <th style={thStyle}>{t('acc_name') || 'Account Name'}</th>
                                                    <th style={thStyle}>{t('acc_debit') || 'Debit'}</th>
                                                    <th style={thStyle}>{t('acc_credit') || 'Credit'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.accounts?.filter(a => a.debit_balance !== 0 || a.credit_balance !== 0).map(a => (
                                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.code}</td>
                                                        <td style={tdStyle}>{a.name}</td>
                                                        <td style={{ ...tdStyle, color: a.debit_balance > 0 ? '#EF4444' : 'var(--text-muted)' }}>{a.debit_balance > 0 ? fmt(a.debit_balance) : '-'}</td>
                                                        <td style={{ ...tdStyle, color: a.credit_balance > 0 ? '#10B981' : 'var(--text-muted)' }}>{a.credit_balance > 0 ? fmt(a.credit_balance) : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                    <td colSpan="2" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                                                    <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totals?.debit)}</td>
                                                    <td style={{ ...tdStyle, color: '#10B981' }}>{fmt(reportData.totals?.credit)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
const thStyle = { padding: '10px 14px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' };
const tdStyle = { padding: '9px 14px', fontSize: '0.85rem', color: 'var(--text-primary)' };

function StatCard({ label, val, color }) {
    return (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color }}>{val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

function InvoiceTable({ invoices, fmt, title, t }) {
    if (!invoices || invoices.length === 0) return null;
    return (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={thStyle}>{t('inv_number') || 'Invoice #'}</th>
                        <th style={thStyle}>{t('supp_customerSupplier') || 'Customer / Supplier'}</th>
                        <th style={thStyle}>{t('date') || 'Date'}</th>
                        <th style={thStyle}>{t('total') || 'Total'}</th>
                        <th style={thStyle}>{t('status') || 'Status'}</th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>{inv.invoice_number}</td>
                            <td style={tdStyle}>{inv.customer_name || inv.supplier_name || '-'}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                            <td style={{ ...tdStyle, fontWeight: 700, color: '#6366F1' }}>{fmt(inv.total)}</td>
                            <td style={tdStyle}>
                                <span style={{
                                    padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                    background: inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7',
                                    color: inv.status === 'paid' ? '#059669' : '#D97706'
                                }}>
                                    {inv.status === 'paid' ? (t('inv_paid') || 'Paid') : (t('cust_creditLabel') || 'Credit')}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default Reports;
