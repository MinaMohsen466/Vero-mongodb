import React, { useState, useEffect, useRef } from 'react';
import {
    BarChart3, FileText, TrendingUp, TrendingDown, Printer, Calendar,
    DollarSign, ShoppingBag, BarChart2, Download
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
    const { t, user } = useAuth();
    const [activeReport, setActiveReport] = useState('sales_summary');
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [products, setProducts] = useState([]);
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
            setSettings(st || {});
        });
    }, []);

    // Auto-generate when switching report type
    useEffect(() => {
        setReportData(null);
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
                const allInvoices = await window.api.invoices.getAll('sales');
                const filtered = (allInvoices || []).filter(inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                });
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
                const totalSales = filtered.reduce((s, i) => s + (i.total || 0), 0);
                const totalPaid = filtered.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
                const totalPending = filtered.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
                data = { chartData, totalSales, totalPaid, totalPending, count: filtered.length, invoices: filtered.slice(0, 50) };

            } else if (activeReport === 'purchases_summary') {
                const allInvoices = await window.api.invoices.getAll('purchase');
                const filtered = (allInvoices || []).filter(inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                });
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
                const total = filtered.reduce((s, i) => s + (i.total || 0), 0);
                data = { chartData, total, count: filtered.length, invoices: filtered.slice(0, 50) };

            } else if (activeReport === 'profit_loss') {
                const [sales, purchases, expensesRows, salaries, allProducts] = await Promise.all([
                    window.api.invoices.getAll('sales'),
                    window.api.invoices.getAll('purchase'),
                    window.api.expenses.getAll(),
                    window.api.salaries.getAll(),
                    window.api.products.getAll()
                ]);
                const filterFn = inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                };
                const dateInRange = date => {
                    if (!date) return false;
                    const d = String(date).substring(0, 10);
                    if (filters.start_date && d < filters.start_date) return false;
                    if (filters.end_date && d > filters.end_date) return false;
                    return true;
                };
                const filteredSales = (sales || []).filter(filterFn);
                const filteredPurchases = (purchases || []).filter(filterFn);
                const filteredExpenses = (expensesRows || []).filter(ex => dateInRange(ex.date));
                const salaryFallback = (salaries || []).filter(s => {
                    const alreadyInExpenses = filteredExpenses.some(ex =>
                        (ex.source_type === 'salary' && Number(ex.source_id) === Number(s.id)) ||
                        ex.payment_number === s.payment_number
                    );
                    return !alreadyInExpenses && dateInRange(s.payment_date || s.created_at);
                });
                const totalExpensesAmt = filteredExpenses.reduce((sum, ex) => sum + (parseFloat(ex.amount) || 0), 0)
                    + salaryFallback.reduce((sum, s) => sum + (parseFloat(s.net_salary) || 0), 0);
                const totalSalesAmt = filteredSales.reduce((s, i) => s + (i.total || 0), 0);
                const totalPurchasesAmt = filteredPurchases.reduce((s, i) => s + (i.total || 0), 0);
                const activeProducts = (allProducts || []).filter(p => p.is_active);
                const totalInventoryValue = activeProducts.reduce((s, p) => s + ((p.stock_quantity || 0) * (p.purchase_price || 0)), 0);
                const grossProfit = totalSalesAmt - totalPurchasesAmt;
                const netProfit = grossProfit + totalInventoryValue - totalExpensesAmt;
                const lowStock = activeProducts.filter(p => (p.stock_quantity || 0) <= 5);
                // Monthly both
                const byMonth = {};
                filteredSales.forEach(inv => {
                    const m = inv.date?.substring(0, 7);
                    if (!m) return;
                    byMonth[m] = byMonth[m] || { month: m, label: '', sales: 0, purchases: 0, profit: 0 };
                    byMonth[m]['sales'] += inv.total || 0;
                });
                filteredPurchases.forEach(inv => {
                    const m = inv.date?.substring(0, 7);
                    if (!m) return;
                    byMonth[m] = byMonth[m] || { month: m, label: '', sales: 0, purchases: 0, profit: 0 };
                    byMonth[m]['purchases'] += inv.total || 0;
                });
                const chartData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(r => {
                    const [y, m] = r.month.split('-');
                    return { ...r, label: `${MONTHS_AR[parseInt(m) - 1]}`, profit: r['sales'] - r['purchases'] };
                });
                data = { totalSales: totalSalesAmt, totalPurchases: totalPurchasesAmt, totalExpenses: totalExpensesAmt, grossProfit, profit: netProfit, chartData, products: activeProducts, totalInventoryValue, lowStock };

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
                    name: supplier?.name, phone: supplier?.phone,
                    statement, totalDebit: statement.reduce((s, r) => s + r.debit, 0),
                    totalCredit: statement.reduce((s, r) => s + r.credit, 0), balance
                };

            } else if (activeReport === 'trial_balance') {
                data = await window.api.reports.trialBalance(filters.end_date);
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
        window.api.print.invoice(html);
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
            rows.push([t('rep_totalSales') || 'Total Sales', reportData.totalSales]);
            rows.push([t('rep_totalPurchases') || 'Total Purchases', reportData.totalPurchases]);
            rows.push([t('rep_grossProfit') || 'Gross Profit', reportData.grossProfit]);
            rows.push([t('rep_totalExpenses') || 'Total Expenses', reportData.totalExpenses]);
            rows.push([t('rep_netProfit') || 'Net Profit', reportData.profit]);
            rows.push([t('rep_stockValue') || 'Stock Value', reportData.totalInventoryValue || 0]);
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
            rows.push([t('date') || 'Date', t('vouch_description') || 'Description', t('debit') || 'Debit', t('credit') || 'Credit', t('balance') || 'Balance']);
            (reportData.statement || []).forEach(r => rows.push([r.date, r.description, r.debit || 0, r.credit || 0, r.balance || 0]));
            rows.push([]);
            rows.push([t('rep_total') || 'Total', '', reportData.totalDebit, reportData.totalCredit, reportData.balance]);
        } else if (activeReport === 'trial_balance') {
            fileName = 'trial_balance.csv';
            rows.push([t('code') || 'Code', t('acc_name') || 'Account Name', t('debit') || 'Debit', t('credit') || 'Credit']);
            (reportData.accounts || []).filter(a => a.total_debit || a.total_credit).forEach(a => {
                rows.push([a.code, a.name, a.total_debit || 0, a.total_credit || 0]);
            });
            rows.push(['', t('rep_total') || 'Total', reportData.totals?.debit || 0, reportData.totals?.credit || 0]);
        }

        if (rows.length === 0) return;
        const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        await window.api.file.saveText({ content: csv, defaultName: fileName, filters: [{ name: 'CSV Files', extensions: ['csv'] }] });
    };

    const reports = [
        { id: 'sales_summary', label: t('rep_salesReport') || 'Sales Report', icon: TrendingUp },
        { id: 'purchases_summary', label: t('rep_purchasesReport') || 'Purchases Report', icon: TrendingDown },
        { id: 'profit_loss', label: t('rep_profitLoss') || 'Profit & Loss', icon: BarChart2 },
        { id: 'trial_balance', label: t('rep_trialBalance') || 'Trial Balance', icon: FileText },
    ];

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

            {/* ── Sidebar ────────────────────────────── */}
            <div style={{
                width: '210px', flexShrink: 0, background: 'var(--bg-primary)',
                borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
                padding: '16px 10px', gap: '4px', overflowY: 'auto'
            }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 8px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('menu_reports')}
                </p>
                {reports.map(r => (
                    <button
                        key={r.id}
                        onClick={() => setActiveReport(r.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '9px',
                            padding: '9px 12px', borderRadius: '9px', border: 'none',
                            cursor: 'pointer', textAlign: 'right', fontSize: '0.85rem',
                            fontWeight: activeReport === r.id ? 700 : 400,
                            background: activeReport === r.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                            color: activeReport === r.id ? 'var(--primary)' : 'var(--text-secondary)',
                            transition: 'all 0.15s'
                        }}
                    >
                        <r.icon size={16} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{r.label}</span>
                        {activeReport === r.id && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />}
                    </button>
                ))}
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
                                    options={customers.map(c => ({ value: String(c.id), label: c.name, subLabel: c.phone }))}
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
                                    options={suppliers.map(s => ({ value: String(s.id), label: s.name, subLabel: s.phone }))}
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
                            {activeReport === 'sales_summary' && (
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
                            {activeReport === 'purchases_summary' && (
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
                            {activeReport === 'profit_loss' && (
                                <div>
                                    <h2 style={{ marginBottom: '16px' }}>💰 {t('rep_profitLoss') || 'Profit & Loss Report'}</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                                        <StatCard label={t('rep_totalSales') || 'Total Sales'} val={fmt(reportData.totalSales)} color="#6366F1" />
                                        <StatCard label={t('rep_totalPurchases') || 'Total Purchases'} val={fmt(reportData.totalPurchases)} color="#EF4444" />
                                        <StatCard label={t('rep_totalExpenses') || 'Total Expenses'} val={fmt(reportData.totalExpenses)} color="#8B5CF6" />
                                        <StatCard label={t('rep_stockValue') || 'Stock Value'} val={fmt(reportData.totalInventoryValue)} color="#0F766E" />
                                        <div style={{
                                            background: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2',
                                            border: `2px solid ${reportData.profit >= 0 ? '#10B981' : '#EF4444'}`,
                                            borderRadius: '12px', padding: '16px', textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: reportData.profit >= 0 ? '#059669' : '#DC2626' }}>
                                                {fmt(Math.abs(reportData.profit))}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: reportData.profit >= 0 ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                                                {reportData.profit >= 0 ? `✅ ${t('rep_netProfit') || 'Net Profit'}` : `❌ ${t('rep_netLoss') || 'Net Loss'}`}
                                            </div>
                                        </div>
                                    </div>
                                    {reportData.chartData?.length > 0 && (
                                        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
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
                                    {/* Expense summary table */}
                                    {reportData && (
                                        <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: 'var(--bg-secondary)' }}>
                                                        <th style={thStyle}>{t('vouch_description') || 'Description'}</th>
                                                        <th style={thStyle}>{t('total') || 'Total'}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr><td style={tdStyle}>{t('rep_totalSales') || 'Total Sales'}</td><td style={{ ...tdStyle, color: '#6366F1', fontWeight: 700 }}>{fmt(reportData.totalSales)}</td></tr>
                                                    <tr><td style={tdStyle}>{t('rep_totalPurchases') || 'Total Purchases'}</td><td style={{ ...tdStyle, color: '#EF4444', fontWeight: 700 }}>{fmt(reportData.totalPurchases)}</td></tr>
                                                    <tr style={{ background: '#f0f9ff' }}><td style={{ ...tdStyle, fontWeight: 600 }}>{t('rep_grossProfit') || 'Gross Profit'}</td><td style={{ ...tdStyle, fontWeight: 700, color: reportData.grossProfit >= 0 ? '#059669' : '#DC2626' }}>{fmt(reportData.grossProfit)}</td></tr>
                                                    <tr><td style={tdStyle}>+ {t('rep_stockValue') || 'Stock Value'}</td><td style={{ ...tdStyle, color: '#0F766E', fontWeight: 600 }}>{fmt(reportData.totalInventoryValue)}</td></tr>
                                                    <tr><td style={tdStyle}>➖ {t('rep_totalExpenses') || 'Total Expenses'}</td><td style={{ ...tdStyle, color: '#8B5CF6', fontWeight: 600 }}>{fmt(reportData.totalExpenses)}</td></tr>
                                                    <tr style={{ background: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2', fontWeight: 700 }}><td style={tdStyle}>{reportData.profit >= 0 ? `✅ ${t('rep_netProfit') || 'Net Profit'}` : `❌ ${t('rep_netLoss') || 'Net Loss'}`}</td><td style={{ ...tdStyle, fontSize: '1.1rem', color: reportData.profit >= 0 ? '#059669' : '#DC2626' }}>{fmt(Math.abs(reportData.profit))}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    {reportData.products?.length > 0 && (
                                        <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_inventoryReport') || 'Product Prices'}</h3>
                                                <span style={{ fontSize: '0.8rem', color: reportData.lowStock?.length ? '#D97706' : 'var(--text-muted)', fontWeight: 600 }}>
                                                    {t('rep_lowStock') || 'Low Stock'}: {reportData.lowStock?.length || 0}
                                                </span>
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
                                                    {reportData.products.map((p, i) => (
                                                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: p.stock_quantity <= 0 ? '#FFF7F7' : p.stock_quantity <= 5 ? '#FFFBEB' : 'transparent' }}>
                                                            <td style={tdStyle}>{i + 1}</td>
                                                            <td style={tdStyle}><strong>{p.name}</strong></td>
                                                            <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.code}</td>
                                                            <td style={tdStyle}>{p.category || '-'}</td>
                                                            <td style={{ ...tdStyle, fontWeight: 700, color: p.stock_quantity <= 0 ? '#EF4444' : p.stock_quantity <= 5 ? '#F59E0B' : '#10B981' }}>{p.stock_quantity || 0}</td>
                                                            <td style={tdStyle}>{fmt(p.purchase_price)}</td>
                                                            <td style={tdStyle}>{fmt(p.sale_price)}</td>
                                                            <td style={{ ...tdStyle, fontWeight: 700, color: '#0F766E' }}>{fmt((p.stock_quantity || 0) * (p.purchase_price || 0))}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                                        <td colSpan="7" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                                                        <td style={{ ...tdStyle, color: '#0F766E', fontSize: '1rem' }}>{fmt(reportData.totalInventoryValue)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
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

                            {/* ── Customer / Supplier Statement ── */}
                            {(activeReport === 'customer_statement' || activeReport === 'supplier_statement') && reportData.statement && (
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
                                                <span style={{ fontSize: '0.75rem', marginRight: '4px' }}>{reportData.balance > 0 ? `(${t('debit') || 'Debit'})` : `(${t('credit') || 'Credit'})`}</span>
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
                                                    <th style={thStyle}>{t('debit') || 'Debit'}</th>
                                                    <th style={thStyle}>{t('credit') || 'Credit'}</th>
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
                            {activeReport === 'trial_balance' && reportData && (
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
                                                    <th style={thStyle}>{t('debit') || 'Debit'}</th>
                                                    <th style={thStyle}>{t('credit') || 'Credit'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reportData.accounts?.filter(a => a.total_debit !== 0 || a.total_credit !== 0).map(a => (
                                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.code}</td>
                                                        <td style={tdStyle}>{a.name}</td>
                                                        <td style={{ ...tdStyle, color: a.total_debit > 0 ? '#EF4444' : 'var(--text-muted)' }}>{a.total_debit > 0 ? fmt(a.total_debit) : '-'}</td>
                                                        <td style={{ ...tdStyle, color: a.total_credit > 0 ? '#10B981' : 'var(--text-muted)' }}>{a.total_credit > 0 ? fmt(a.total_credit) : '-'}</td>
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
