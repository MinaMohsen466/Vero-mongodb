import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Truck, FileText, ToggleLeft, ToggleRight, Filter, Printer } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Suppliers() {
    const { user, t } = useAuth();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierInvoices, setSupplierInvoices] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [statementStartDate, setStatementStartDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [statementEndDate, setStatementEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_number: '', notes: '', is_active: 1,
        opening_balance: 0, opening_balance_date: new Date().toISOString().split('T')[0],
        code: ''
    });

    const searchInputRef = React.useRef(null);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#supplier-form button[type="submit"]') || document.querySelector('button[form="supplier-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        }, New: () => {
            if (!showModal && user?.permissions?.suppliers?.can_create) openModal();
        },
        Escape: () => {
            if (showModal) closeModal();
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    useEffect(() => { loadSuppliers(); }, []);

    useEffect(() => {
        let previousBalance = 0;
        const filtered = [];

        allTransactions.forEach(row => {
            if (statementStartDate && row.date < statementStartDate) {
                previousBalance += (row.credit || 0) - (row.debit || 0);
            } else if (statementEndDate && row.date > statementEndDate) {
                // Ignore transactions after end date
            } else {
                filtered.push(row);
            }
        });

        let balance = previousBalance;
        const statement = [];

        // Prepend previous balance row if start date filter is active
        if (statementStartDate) {
            statement.push({
                date: statementStartDate,
                description: t('previous_balance') || 'رصيد سابق (منقول)',
                debit: 0,
                credit: 0,
                balance: previousBalance,
                isPreviousBalance: true
            });
        }

        filtered.forEach(row => {
            balance += (row.credit || 0) - (row.debit || 0);
            statement.push({ ...row, balance });
        });

        setSupplierInvoices(statement);
    }, [allTransactions, statementStartDate, statementEndDate]);

    const loadSuppliers = async () => {
        try {
            const data = await window.api.suppliers.getAll();
            setSuppliers(data);
        } catch (error) { console.error('Error loading suppliers:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSupplier) {
                await window.api.suppliers.update({ ...formData, id: editingSupplier.id });
                toast.success(t('savedSuccess') || 'Supplier data updated successfully');
            } else {
                await window.api.suppliers.create(formData);
                toast.success(t('savedSuccess') || 'Supplier added successfully');
            }
            loadSuppliers();
            closeModal();
        } catch (error) {
            console.error('Error saving supplier:', error);
            toast.error(t('errorOccurred') || 'Error occurred while saving supplier data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('supp_deleteConfirm') || 'Are you sure you want to delete this supplier?')) {
            try {
                await window.api.suppliers.delete(id);
                toast.success(t('savedSuccess') || 'Supplier deleted successfully');
                loadSuppliers();
            } catch (error) {
                console.error('Error deleting supplier:', error);
                toast.error(t('errorOccurred') || 'Error occurred while deleting supplier');
            }
        }
    };

    const handleToggleActive = async (supplier) => {
        try {
            const newStatus = supplier.is_active ? 0 : 1;
            await window.api.suppliers.update({ ...supplier, is_active: newStatus });
            toast.success(t('savedSuccess') || (newStatus ? 'Supplier activated' : 'Supplier deactivated'));
            loadSuppliers();
        } catch (error) {
            console.error('Error toggling supplier status:', error);
            toast.error(t('errorOccurred') || 'Error occurred while changing supplier status');
        }
    };

    const openModal = async (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name || '', phone: supplier.phone || '', email: supplier.email || '',
                address: supplier.address || '', tax_number: supplier.tax_number || '',
                notes: supplier.notes || '', is_active: supplier.is_active !== undefined ? supplier.is_active : 1,
                opening_balance: supplier.opening_balance || 0,
                opening_balance_date: supplier.opening_balance_date || new Date().toISOString().split('T')[0],
                code: supplier.code || ''
            });
            setShowModal(true);
        } else {
            setEditingSupplier(null);
            setSaving(true);
            try {
                const nextCode = await window.api.suppliers.getNextCode();
                setFormData({
                    name: '', phone: '', email: '', address: '', tax_number: '', notes: '', is_active: 1,
                    opening_balance: 0,
                    opening_balance_date: new Date().toISOString().split('T')[0],
                    code: nextCode
                });
                setShowModal(true);
            } catch (e) {
                console.error(e);
            } finally {
                setSaving(false);
            }
        }
    };

    const closeModal = () => { setShowModal(false); setEditingSupplier(null); };

    const handlePrintStatement = async () => {
        if (!selectedSupplier) return;
        try {
            const settings = await window.api.settings.getAll();
            const companyName = settings?.company?.company_name || 'ڤيرو المحاسبي';
            const companyPhone = settings?.company?.company_phone || '';
            const companyAddress = settings?.company?.company_address || '';
            const currency = settings?.general?.currency || t('currency_kd') || 'د.ك';

            const totalDebit = supplierInvoices.reduce((acc, row) => acc + (row.debit || 0), 0);
            const totalCredit = supplierInvoices.reduce((acc, row) => acc + (row.credit || 0), 0);
            const lastRow = supplierInvoices[supplierInvoices.length - 1];
            const finalBalance = lastRow ? Math.abs(lastRow.balance) : 0;
            const finalBalanceRaw = lastRow ? lastRow.balance : 0;
            const balanceText = finalBalanceRaw > 0 ? (t('acc_credit') || 'دائن') : (t('acc_debit') || 'مدين');

            const rowsHtml = supplierInvoices.map(row => `
                <tr style="${row.isPreviousBalance ? 'background-color: #f8fafc; font-style: italic;' : ''}">
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">${row.isPreviousBalance ? '' : new Date(row.date).toLocaleDateString('en-GB')}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold;">${row.description}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: left; direction: ltr; color: ${row.debit > 0 ? '#ef4444' : '#64748b'}">${row.debit > 0 ? (new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(row.debit) + ' ' + currency) : '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: left; direction: ltr; color: ${row.credit > 0 ? '#10b981' : '#64748b'}">${row.credit > 0 ? (new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(row.credit) + ' ' + currency) : '-'}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: left; direction: ltr; font-weight: bold;">${(new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(Math.abs(row.balance))) + ' ' + currency}</td>
                </tr>
            `).join('');

            const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>${t('rep_supplierStatement') || 'كشف حساب مورد'} - ${selectedSupplier.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
                    .company-info { text-align: right; }
                    .company-name { font-size: 22px; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
                    .company-details { font-size: 13px; color: #64748b; line-height: 1.5; }
                    .statement-title { text-align: left; }
                    .title-text { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 5px; }
                    .date-text { font-size: 12px; color: #64748b; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
                    .info-col { font-size: 14px; line-height: 1.8; }
                    .info-col strong { color: #475569; }
                    .table-container { margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; text-align: right; }
                    th { background: #1e293b; color: #fff; padding: 12px 10px; font-size: 13px; font-weight: bold; }
                    .summary-container { display: flex; justify-content: flex-end; gap: 30px; border-top: 2px solid #cbd5e1; padding-top: 15px; margin-top: 10px; }
                    .summary-item { font-size: 15px; line-height: 1.8; text-align: left; }
                    .summary-item strong { display: inline-block; width: 120px; text-align: right; margin-left: 10px; }
                    .balance-box { background: #fef2f2; border: 1px solid #fee2e2; padding: 12px 20px; border-radius: 6px; font-size: 18px; font-weight: bold; color: #ef4444; margin-top: 10px; display: inline-flex; align-items: center; gap: 10px; }
                    .balance-box.credit { background: #f0fdf4; border: 1px solid #dcfce7; color: #16a34a; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                        @page { margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company-info">
                        <div class="company-name">${companyName}</div>
                        <div class="company-details">
                            ${companyAddress ? `<div>${companyAddress}</div>` : ''}
                            ${companyPhone ? `<div>تلفون: <span dir="ltr">${companyPhone}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="statement-title">
                        <div class="title-text">${t('rep_supplierStatement') || 'كشف حساب مورد'}</div>
                        <div class="date-text">تاريخ الطباعة: ${new Date().toLocaleDateString('ar-KW')}</div>
                        ${statementStartDate || statementEndDate ? `<div class="date-text" style="margin-top: 4px;">الفترة: ${statementStartDate ? new Date(statementStartDate).toLocaleDateString('ar-KW') : 'البداية'} إلى ${statementEndDate ? new Date(statementEndDate).toLocaleDateString('ar-KW') : 'اليوم'}</div>` : ''}
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-col">
                        <div><strong>الكود:</strong> ${selectedSupplier.code}</div>
                        <div><strong>المورد:</strong> ${selectedSupplier.name}</div>
                    </div>
                    <div class="info-col">
                        <div><strong>تلفون:</strong> <span dir="ltr">${selectedSupplier.phone || '-'}</span></div>
                        <div><strong>العنوان:</strong> ${selectedSupplier.address || '-'}</div>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="border-radius: 0 6px 6px 0;">التاريخ</th>
                                <th>البيان</th>
                                <th style="text-align: left;">مدين</th>
                                <th style="text-align: left;">دائن</th>
                                <th style="text-align: left; border-radius: 6px 0 0 6px;">الرصيد التراكمي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>

                <div style="text-align: left;">
                    <div class="summary-container">
                        <div class="summary-item">
                            <div><strong>إجمالي المدين:</strong> <span style="direction: ltr; display: inline-block;">${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(totalDebit)} ${currency}</span></div>
                            <div><strong>إجمالي الدائن:</strong> <span style="direction: ltr; display: inline-block;">${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(totalCredit)} ${currency}</span></div>
                        </div>
                    </div>
                    <div class="balance-box ${finalBalanceRaw > 0 ? '' : 'credit'}">
                        <span>رصيد الفترة المستحق:</span>
                        <span style="direction: ltr; display: inline-block;">${new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(finalBalance)} ${currency} (${balanceText})</span>
                    </div>
                </div>
            </body>
            </html>
            `;

            if (window.api?.print?.invoice) {
                await window.api.print.invoice(html, { paperSize: 'A4', paperOrientation: 'portrait' });
            } else {
                const win = window.open('', '_blank');
                win.document.write(html);
                win.document.close();
                win.onload = () => setTimeout(() => win.print(), 300);
            }
        } catch (e) {
            console.error("Error printing statement:", e);
            toast.error("حدث خطأ أثناء طباعة كشف الحساب");
        }
    };

    const showSupplierInvoices = async (supplier) => {
        setSelectedSupplier(supplier);
        try {
            const [invoices, vouchers, returnsData] = await Promise.all([
                window.api.invoices.getBySupplier(supplier.id),
                window.api.vouchers.getAll('payment'),
                window.api.returns.getAll('purchase_return')
            ]);
            const paymentVouchers = (vouchers || []).filter(v => Number(v.supplier_id) === Number(supplier.id));
            const supplierReturns = (returnsData || []).filter(r => Number(r.supplier_id) === Number(supplier.id));
            let seq = 0;
            const rows = [];

            const opBalance = parseFloat(supplier.opening_balance) || 0;
            if (opBalance > 0) {
                rows.push({
                    date: supplier.opening_balance_date || supplier.created_at?.substring(0, 10) || new Date().toISOString().split('T')[0],
                    description: t('rep_openingBalance') || 'رصيد افتتاحي',
                    debit: 0,
                    credit: opBalance,
                    seq: seq++
                });
            }

            (invoices || []).forEach(inv => {
                rows.push({
                    date: inv.date,
                    description: `${t('inv_number') || 'Invoice'} ${inv.invoice_number}`,
                    debit: 0,
                    credit: inv.total || 0,
                    seq: seq++
                });
                const hasVoucherPayment = paymentVouchers.some(v => Number(v.invoice_id) === Number(inv.id));
                const paidWithoutVoucher = !hasVoucherPayment && ((inv.status === 'paid' && !(inv.paid > 0)) || inv.paid > 0);
                if (paidWithoutVoucher) {
                    rows.push({
                        date: inv.date,
                        description: `${t('inv_paid') || 'Paid'} ${inv.invoice_number}`,
                        debit: inv.paid > 0 ? inv.paid : inv.total || 0,
                        credit: 0,
                        seq: seq++
                    });
                }
            });

            paymentVouchers.forEach(v => {
                rows.push({
                    date: v.date,
                    description: v.description || `${t('payment_voucher') || 'سند صرف'} ${v.voucher_number}`,
                    debit: v.amount || 0,
                    credit: 0,
                    seq: seq++
                });
            });

            supplierReturns.forEach(ret => {
                if (ret.payment_method === 'credit') {
                    rows.push({
                        date: ret.date,
                        description: `${t('purchase_return') || 'مرتجع مشتريات'} ${ret.return_number} (${t('on_account') || 'على الحساب'})`,
                        debit: ret.total || 0,
                        credit: 0,
                        seq: seq++
                    });
                } else {
                    rows.push({
                        date: ret.date,
                        description: `${t('purchase_return') || 'مرتجع مشتريات'} ${ret.return_number} (${t('cash') || 'نقداً'})`,
                        debit: ret.total || 0,
                        credit: 0,
                        seq: seq++
                    });
                    rows.push({
                        date: ret.date,
                        description: `${t('refund_received') || 'دفعة استرداد نقدي مرتجع'} ${ret.return_number}`,
                        debit: 0,
                        credit: ret.total || 0,
                        seq: seq++
                    });
                }
            });

            const sortedRows = rows.sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.seq - b.seq);
            setAllTransactions(sortedRows);
        } catch (e) { console.error(e); setAllTransactions([]); }
        setShowInvoicesModal(true);
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.phone?.includes(searchQuery) || s.code?.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && s.is_active) ||
            (statusFilter === 'inactive' && !s.is_active) ||
            (statusFilter === 'has_balance' && s.balance > 0);
        return matchesSearch && matchesStatus;
    }).sort((a, b) => (a.code || '').localeCompare((b.code || ''), undefined, {numeric: true, sensitivity: 'base'}));

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (t('currency_kd') || 'KD');

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="form-input"
                            placeholder={t('search') + " (Ctrl+F)"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '250px' }}
                        />
                        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '180px' }}>
                            <option value="all">{t('all')}</option>
                            <option value="active">{t('activeOnly')}</option>
                            <option value="inactive">{t('inactive')}</option>
                            <option value="has_balance">{t('supp_hasBalance') || 'ذمم دائنة مستحقة'}</option>
                        </select>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {filteredSuppliers.length} {t('menu_suppliers')}
                    </span>
                </div>
                {(user?.role === 'admin' || user?.permissions?.suppliers?.can_create) && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> {t('add')}
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredSuppliers.length === 0 ? (
                        <div className="empty-state"><Truck size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('code')}</th><th>{t('name')}</th><th>{t('phone')}</th><th>{t('email')}</th>
                                        <th>{t('balance')}</th><th>{t('status')}</th><th>{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSuppliers.map(supplier => (
                                        <tr key={supplier.id}
                                            style={{ cursor: 'pointer', opacity: supplier.is_active ? 1 : 0.6 }}
                                            onClick={() => showSupplierInvoices(supplier)}>
                                            <td>{supplier.code}</td>
                                            <td className="font-bold">{supplier.name}</td>
                                            <td><span dir="ltr">{supplier.phone || '-'}</span></td>
                                            <td>{supplier.email || '-'}</td>
                                            <td className={`font-bold ${supplier.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(supplier.balance)}
                                            </td>
                                            <td><span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-danger'}`}>{supplier.is_active ? t('active') : t('inactive')}</span></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    {(user?.role === 'admin' || user?.permissions?.suppliers?.can_edit) && (
                                                        <>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(supplier)} title={t('edit')}><Edit2 size={16} /></button>
                                                            <button
                                                                className={`btn btn-ghost btn-sm ${supplier.is_active ? 'text-warning' : 'text-success'}`}
                                                                onClick={() => handleToggleActive(supplier)}
                                                                title={supplier.is_active ? t('inactive') : t('active')}>
                                                                {supplier.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                            </button>
                                                        </>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.suppliers?.can_delete) && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(supplier.id)} title={t('delete')}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Supplier Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editingSupplier ? t('supp_edit') : t('supp_add')}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')} (Esc)</button>
                        <button type="submit" form="supplier-form" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-btn" style={{ marginInlineEnd: '8px' }}></span>}{saving ? (t('savingProgress') || 'Saving...') : t('save') + ' (Ctrl+S)'}</button>
                    </>
                }
            >
                <form id="supplier-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('code') || 'الكود'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>({t('auto_generated') || 'تلقائي'})</span></label><input type="text" className="form-input" value={formData.code} readOnly style={{ opacity: 0.7, cursor: 'default', background: 'var(--bg-secondary)' }} /></div>
                        <div className="form-group"><label className="form-label">{t('supp_name')} *</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('phone')}</label><input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('email')}</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('supp_taxNumber')}</label><input type="text" className="form-input" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('address')}</label><input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('opening_balance')}</label>
                            <input type="number" className="form-input" value={formData.opening_balance}
                                onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                                min="0" step="0.001" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('opening_balance_date')}</label>
                            <input type="date" className="form-input" value={formData.opening_balance_date}
                                onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('status')}</label>
                            <select className="form-select" value={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}>
                                <option value={1}>{t('active')}</option>
                                <option value={0}>{t('inactive')}</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">{t('notes')}</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                    </div>
                </form>
            </Modal>

            {/* Supplier Statement Modal */}
            <Modal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} title={`${t('rep_supplierStatement') || 'Supplier Statement'}: ${selectedSupplier?.name || ''}`} size="lg"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                        <button className="btn btn-primary" onClick={handlePrintStatement} disabled={supplierInvoices.length === 0}>
                            <Printer size={18} /> {t('print') || 'Print'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowInvoicesModal(false)}>{t('close')}</button>
                    </div>
                }>
                {/* Details Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <div><strong>{t('code')}:</strong> {selectedSupplier?.code}</div>
                    {selectedSupplier?.phone && <div><strong>{t('phone')}:</strong> <span dir="ltr">{selectedSupplier?.phone}</span></div>}
                    {selectedSupplier?.email && <div><strong>{t('email')}:</strong> {selectedSupplier?.email}</div>}
                    {selectedSupplier?.address && <div><strong>{t('address')}:</strong> {selectedSupplier?.address}</div>}
                </div>

                {/* Date Filter Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '16px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{t('rep_fromDate') || 'من تاريخ'}:</label>
                        <input type="date" className="form-input" value={statementStartDate} onChange={e => setStatementStartDate(e.target.value)} style={{ padding: '6px 10px', width: '150px' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{t('rep_toDate') || 'إلى تاريخ'}:</label>
                        <input type="date" className="form-input" value={statementEndDate} onChange={e => setStatementEndDate(e.target.value)} style={{ padding: '6px 10px', width: '150px' }} />
                    </div>
                    <button className="btn btn-secondary" onClick={() => { setStatementStartDate(''); setStatementEndDate(''); }} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                        {t('clearFilter') || 'مسح التصفية'}
                    </button>
                </div>

                {supplierInvoices.length === 0 ? (
                    <div className="empty-state"><FileText size={48} /><h3>{t('noData')}</h3></div>
                ) : (
                    <>
                        <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('date')}</th>
                                        <th>{t('vouch_description') || 'Description'}</th>
                                        <th style={{ textAlign: 'left' }}>{t('acc_debit') || 'Debit'}</th>
                                        <th style={{ textAlign: 'left' }}>{t('acc_credit') || 'Credit'}</th>
                                        <th style={{ textAlign: 'left' }}>{t('balance')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierInvoices.map((row, i) => (
                                        <tr key={i} style={row.isPreviousBalance ? { backgroundColor: 'var(--bg-secondary)', fontStyle: 'italic' } : {}}>
                                            <td>{row.isPreviousBalance ? '-' : new Date(row.date).toLocaleDateString('en-GB')}</td>
                                            <td className="font-bold">{row.description}</td>
                                            <td className="text-danger" style={{ textAlign: 'left', direction: 'ltr' }}>{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td className="text-success" style={{ textAlign: 'left', direction: 'ltr' }}>{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className={row.balance > 0 ? 'text-danger font-bold' : 'text-success font-bold'} style={{ textAlign: 'left', direction: 'ltr' }}>{formatCurrency(Math.abs(row.balance))}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end', borderTop: '2px solid var(--border-color)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', gap: '24px', fontSize: '0.95rem' }}>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>{t('rep_totalDebit') || 'إجمالي المدين'}: </span>
                                    <strong style={{ direction: 'ltr', display: 'inline-block' }}>{formatCurrency(supplierInvoices.reduce((s, r) => s + (r.debit || 0), 0))}</strong>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>{t('rep_totalCredit') || 'إجمالي الدائن'}: </span>
                                    <strong style={{ direction: 'ltr', display: 'inline-block' }}>{formatCurrency(supplierInvoices.reduce((s, r) => s + (r.credit || 0), 0))}</strong>
                                </div>
                            </div>
                            <div style={{ padding: '12px', backgroundColor: (supplierInvoices[supplierInvoices.length - 1]?.balance || 0) > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${(supplierInvoices[supplierInvoices.length - 1]?.balance || 0) > 0 ? '#fee2e2' : '#dcfce7'}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('supp_currentBalance') || 'الرصيد الحالي المستحق'}:</span>
                                <span className={(supplierInvoices[supplierInvoices.length - 1]?.balance || 0) > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.25rem', fontWeight: 'bold', direction: 'ltr' }}>
                                    {formatCurrency(Math.abs(supplierInvoices[supplierInvoices.length - 1]?.balance || 0))} {(supplierInvoices[supplierInvoices.length - 1]?.balance || 0) > 0 ? `(${t('acc_credit') || 'دائن'})` : `(${t('acc_debit') || 'مدين'})`}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}

export default Suppliers;
