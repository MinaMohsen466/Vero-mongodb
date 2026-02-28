import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, TrendingUp, TrendingDown, Users, Truck } from 'lucide-react';
import { useAuth } from '../App';

function Reports() {
    const { t } = useAuth();
    const [activeReport, setActiveReport] = useState('customer_statement');
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ customer_id: '', supplier_id: '', account_id: '', start_date: '', end_date: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        Promise.all([
            window.api.customers.getAll(),
            window.api.suppliers.getAll(),
            window.api.accounts.getAll()
        ]).then(([c, s, a]) => {
            setCustomers(c || []);
            setSuppliers(s || []);
            setAccounts(a || []);
        });
    }, []);

    const generateReport = async () => {
        setLoading(true);
        try {
            let data;
            if (activeReport === 'customer_statement') {
                if (!filters.customer_id) { setLoading(false); return; }
                // Get all invoices for this customer
                const invoices = await window.api.invoices.getByCustomer(parseInt(filters.customer_id));
                const customer = customers.find(c => c.id === parseInt(filters.customer_id));
                const filtered = (invoices || []).filter(inv => {
                    if (filters.start_date && inv.date < filters.start_date) return false;
                    if (filters.end_date && inv.date > filters.end_date) return false;
                    return true;
                });
                let balance = 0;
                const statement = filtered.map(inv => {
                    const debit = inv.status !== 'paid' ? inv.total : 0; // Amount owed
                    const credit = inv.status === 'paid' ? inv.total : 0; // Amount paid
                    balance += debit - credit;
                    return {
                        date: inv.date,
                        description: inv.invoice_number + (inv.status === 'paid' ? ` (${t('inv_paid')})` : ` (${t('inv_pending')})`),
                        debit,
                        credit,
                        balance
                    };
                });
                data = { name: customer?.name, statement, totalDebit: statement.reduce((s, r) => s + r.debit, 0), totalCredit: statement.reduce((s, r) => s + r.credit, 0), balance };
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
                    const debit = inv.status !== 'paid' ? inv.total : 0;
                    const credit = inv.status === 'paid' ? inv.total : 0;
                    balance += debit - credit;
                    return {
                        date: inv.date,
                        description: inv.invoice_number + (inv.status === 'paid' ? ` (${t('inv_paid')})` : ` (${t('inv_pending')})`),
                        debit,
                        credit,
                        balance
                    };
                });
                data = { name: supplier?.name, statement, totalDebit: statement.reduce((s, r) => s + r.debit, 0), totalCredit: statement.reduce((s, r) => s + r.credit, 0), balance };
            } else if (activeReport === 'account_statement') {
                if (!filters.account_id) { setLoading(false); return; }
                data = await window.api.reports.accountStatement(parseInt(filters.account_id), filters.start_date, filters.end_date);
            } else if (activeReport === 'trial_balance') {
                data = await window.api.reports.trialBalance(filters.end_date);
            } else if (activeReport === 'sales') {
                data = await window.api.reports.salesReport(filters.start_date, filters.end_date);
            } else {
                data = await window.api.reports.purchasesReport(filters.start_date, filters.end_date);
            }
            setReportData(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (a) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(a || 0) + ' د.ك';

    const reports = [
        { id: 'customer_statement', label: t('rep_customerStatement'), icon: Users },
        { id: 'supplier_statement', label: t('rep_supplierStatement'), icon: Truck },
        { id: 'account_statement', label: t('rep_accountStatement'), icon: FileText },
        { id: 'trial_balance', label: t('rep_trialBalance'), icon: BarChart3 },
        { id: 'sales', label: t('rep_salesReport'), icon: TrendingUp },
        { id: 'purchases', label: t('rep_purchasesReport'), icon: TrendingDown }
    ];

    return (
        <div>
            <div className="page-header">
                <div className="tabs" style={{ marginBottom: 0, border: 'none', flexWrap: 'wrap' }}>
                    {reports.map(r => (
                        <button key={r.id} className={`tab ${activeReport === r.id ? 'active' : ''}`} onClick={() => { setActiveReport(r.id); setReportData(null); }}>
                            <r.icon size={18} /> {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-body">
                    <div className="form-row">
                        {activeReport === 'customer_statement' && (
                            <div className="form-group">
                                <label className="form-label">{t('dash_customer')}</label>
                                <select className="form-select" value={filters.customer_id} onChange={e => setFilters({ ...filters, customer_id: e.target.value })}>
                                    <option value="">{t('rep_selectCustomer')}</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.balance)})</option>)}
                                </select>
                            </div>
                        )}
                        {activeReport === 'supplier_statement' && (
                            <div className="form-group">
                                <label className="form-label">{t('dash_supplier')}</label>
                                <select className="form-select" value={filters.supplier_id} onChange={e => setFilters({ ...filters, supplier_id: e.target.value })}>
                                    <option value="">{t('rep_selectSupplier')}</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.balance)})</option>)}
                                </select>
                            </div>
                        )}
                        {activeReport === 'account_statement' && (
                            <div className="form-group">
                                <label className="form-label">{t('rep_selectAccount')}</label>
                                <select className="form-select" value={filters.account_id} onChange={e => setFilters({ ...filters, account_id: e.target.value })}>
                                    <option value="">{t('rep_selectAccount')}</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">{t('rep_fromDate')}</label>
                            <input type="date" className="form-input" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('rep_toDate')}</label>
                            <input type="date" className="form-input" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })} />
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={generateReport} disabled={loading}>{loading ? '...' : t('rep_generate')}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {!reportData ? (
                        <div className="empty-state">
                            <BarChart3 size={48} />
                            <h3>{t('rep_selectAndGenerate') || 'اختر التقرير ثم اضغط عرض'}</h3>
                        </div>
                    ) : (activeReport === 'customer_statement' || activeReport === 'supplier_statement') ? (
                        <div>
                            <h3 className="mb-4">
                                {activeReport === 'customer_statement' ? t('rep_customerStatement') : t('rep_supplierStatement')}: {reportData.name}
                            </h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('date')}</th>
                                        <th>{t('description')}</th>
                                        <th>{t('acc_debit')}</th>
                                        <th>{t('acc_credit')}</th>
                                        <th>{t('balance')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.statement?.map((row, i) => (
                                        <tr key={i}>
                                            <td>{new Date(row.date).toLocaleDateString('ar-EG')}</td>
                                            <td>{row.description}</td>
                                            <td>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className={row.balance >= 0 ? 'text-danger' : 'text-success'}>{formatCurrency(Math.abs(row.balance))}</td>
                                        </tr>
                                    ))}
                                    {reportData.statement?.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{t('noData')}</td></tr>
                                    )}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                                        <td colSpan="2">{t('total')}</td>
                                        <td>{formatCurrency(reportData.totalDebit)}</td>
                                        <td>{formatCurrency(reportData.totalCredit)}</td>
                                        <td className={reportData.balance >= 0 ? 'text-danger' : 'text-success'}>{formatCurrency(Math.abs(reportData.balance))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : activeReport === 'account_statement' ? (
                        <div>
                            <h3 className="mb-4">{t('rep_accountStatement')}: {reportData.account?.name}</h3>
                            <table>
                                <thead><tr><th>{t('date')}</th><th>{t('je_number')}</th><th>{t('acc_debit')}</th><th>{t('acc_credit')}</th><th>{t('balance')}</th></tr></thead>
                                <tbody>
                                    {reportData.statement?.map((row, i) => (
                                        <tr key={i}>
                                            <td>{new Date(row.date).toLocaleDateString('ar-EG')}</td>
                                            <td>{row.entry_number}</td>
                                            <td>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className={row.balance >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(Math.abs(row.balance))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : activeReport === 'trial_balance' ? (
                        <div>
                            <h3 className="mb-4">{t('rep_trialBalance')}</h3>
                            <table>
                                <thead><tr><th>{t('code')}</th><th>{t('acc_name')}</th><th>{t('acc_debit')}</th><th>{t('acc_credit')}</th></tr></thead>
                                <tbody>
                                    {reportData.accounts?.filter(a => a.total_debit !== 0 || a.total_credit !== 0).map(a => (
                                        <tr key={a.id}>
                                            <td>{a.code}</td>
                                            <td>{a.name}</td>
                                            <td>{a.total_debit > 0 ? formatCurrency(a.total_debit) : '-'}</td>
                                            <td>{a.total_credit > 0 ? formatCurrency(a.total_credit) : '-'}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                                        <td colSpan="2">{t('total')}</td>
                                        <td>{formatCurrency(reportData.totals?.debit)}</td>
                                        <td>{formatCurrency(reportData.totals?.credit)}</td>
                                    </tr>
                                    <tr style={{ background: reportData.totals?.debit === reportData.totals?.credit ? 'var(--success-light)' : 'var(--danger-light)', fontWeight: 'bold' }}>
                                        <td colSpan="2">{t('balance')}</td>
                                        <td colSpan="2">{formatCurrency(Math.abs(reportData.totals?.debit - reportData.totals?.credit))}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div>
                            <div className="stats-grid mb-4">
                                <div className="stat-card"><div className="stat-content"><h3>{formatCurrency(reportData.total)}</h3><p>{t('total')}</p></div></div>
                                <div className="stat-card"><div className="stat-content"><h3>{reportData.count}</h3><p>{t('vouch_invoice')}</p></div></div>
                            </div>
                            <table>
                                <thead><tr><th>{t('inv_number')}</th><th>{t('date')}</th><th>{t('total')}</th></tr></thead>
                                <tbody>
                                    {reportData.invoices?.map(inv => (
                                        <tr key={inv.id}>
                                            <td>{inv.invoice_number}</td>
                                            <td>{new Date(inv.date).toLocaleDateString('ar-EG')}</td>
                                            <td>{formatCurrency(inv.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Reports;
