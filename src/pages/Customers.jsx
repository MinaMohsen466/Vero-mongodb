import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, FileText, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Customers() {
    const { user, t } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [showModal, setShowModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: '', is_active: 1
    });

    const searchInputRef = React.useRef(null);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#customer-form button[type="submit"]') || document.querySelector('button[form="customer-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        }, New: () => {
            if (!showModal && user?.permissions?.customers?.can_create) openModal();
        },
        Escape: () => {
            if (showModal) closeModal();
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async () => {
        try {
            const data = await window.api.customers.getAll();
            setCustomers(data);
        } catch (error) { console.error('Error loading customers:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCustomer) {
                await window.api.customers.update({ ...formData, id: editingCustomer.id });
                toast.success(t('savedSuccess') || 'Customer data updated successfully');
            } else {
                await window.api.customers.create(formData);
                toast.success(t('savedSuccess') || 'Customer added successfully');
            }
            loadCustomers();
            closeModal();
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error(t('errorOccurred') || 'Error occurred while saving customer data');
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('cust_deleteConfirm') || 'Are you sure you want to delete this customer?')) {
            try {
                await window.api.customers.delete(id);
                toast.success(t('savedSuccess') || 'Customer deleted successfully');
                loadCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
                toast.error(t('errorOccurred') || 'Error occurred while deleting customer');
            }
        }
    };

    const handleToggleActive = async (customer) => {
        try {
            const newStatus = customer.is_active ? 0 : 1;
            await window.api.customers.update({ ...customer, is_active: newStatus });
            toast.success(t('savedSuccess') || (newStatus ? 'Customer activated' : 'Customer deactivated'));
            loadCustomers();
        } catch (error) {
            console.error('Error toggling customer status:', error);
            toast.error(t('errorOccurred') || 'Error occurred while changing customer status');
        }
    };

    const openModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name || '', phone: customer.phone || '', email: customer.email || '',
                address: customer.address || '', tax_number: customer.tax_number || '',
                credit_limit: customer.credit_limit || 0, notes: customer.notes || '',
                is_active: customer.is_active !== undefined ? customer.is_active : 1
            });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: '', is_active: 1 });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingCustomer(null); };

    const showCustomerInvoices = async (customer) => {
        setSelectedCustomer(customer);
        try {
            const [invoices, vouchers] = await Promise.all([
                window.api.invoices.getByCustomer(customer.id),
                window.api.vouchers.getAll('receipt')
            ]);
            const receiptVouchers = (vouchers || []).filter(v => Number(v.customer_id) === Number(customer.id));
            let seq = 0;
            const rows = [];

            (invoices || []).forEach(inv => {
                rows.push({
                    date: inv.date,
                    description: `${t('inv_number') || 'Invoice'} ${inv.invoice_number}`,
                    debit: inv.total || 0,
                    credit: 0,
                    seq: seq++
                });
                const hasVoucherPayment = receiptVouchers.some(v => Number(v.invoice_id) === Number(inv.id));
                const paidWithoutVoucher = !hasVoucherPayment && ((inv.status === 'paid' && !(inv.paid > 0)) || inv.paid > 0);
                if (paidWithoutVoucher) {
                    rows.push({
                        date: inv.date,
                        description: `${t('inv_paid') || 'Paid'} ${inv.invoice_number}`,
                        debit: 0,
                        credit: inv.paid > 0 ? inv.paid : inv.total || 0,
                        seq: seq++
                    });
                }
            });

            receiptVouchers.forEach(v => {
                rows.push({
                    date: v.date,
                    description: v.description || `${t('vouchers') || 'Voucher'} ${v.voucher_number}`,
                    debit: 0,
                    credit: v.amount || 0,
                    seq: seq++
                });
            });

            let balance = 0;
            const statement = rows
                .sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.seq - b.seq)
                .map(row => {
                    balance += (row.debit || 0) - (row.credit || 0);
                    return { ...row, balance };
                });
            setCustomerInvoices(statement);
        } catch (e) { console.error(e); setCustomerInvoices([]); }
        setShowInvoicesModal(true);
    };

    const filteredCustomers = customers.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery) || c.code?.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && c.is_active) ||
            (statusFilter === 'inactive' && !c.is_active);
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
                            placeholder={t('search') + ' (Ctrl+F)'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '250px' }}
                        /><Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '140px' }}>
                            <option value="all">{t('all') || 'All'}</option>
                            <option value="active">{t('activeOnly') || 'Active Only'}</option>
                            <option value="inactive">{t('inactive') || 'Inactive'}</option>
                        </select>
                    </div>
                    {/* Count badge */}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {filteredCustomers.length} {t('menu_customers')}
                    </span>
                </div>
                {user?.permissions?.customers?.can_create && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> {t('add')}
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredCustomers.length === 0 ? (
                        <div className="empty-state"><Users size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('code')}</th><th>{t('name')}</th><th>{t('phone')}</th><th>{t('balance')}</th>
                                        <th>{t('cust_creditLimit')}</th><th>{t('status')}</th><th>{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id}
                                            style={{ cursor: 'pointer', opacity: customer.is_active ? 1 : 0.6 }}
                                            onClick={() => showCustomerInvoices(customer)}>
                                            <td>{customer.code}</td>
                                            <td className="font-bold">{customer.name}</td>
                                            <td>{customer.phone || '-'}</td>
                                            <td className={`font-bold ${customer.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(customer.balance)}
                                            </td>
                                            <td>
                                                {customer.credit_limit > 0 ? (
                                                    <div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {formatCurrency(customer.credit_limit)}
                                                        </div>
                                                        {customer.balance > 0 && customer.credit_limit > 0 && (
                                                            <div style={{
                                                                fontSize: '0.75rem', fontWeight: 600,
                                                                color: customer.balance >= customer.credit_limit ? '#ef4444' : '#22c55e'
                                                            }}>
                                                                {customer.balance >= customer.credit_limit ? '⚠' : `✓ ${formatCurrency(customer.credit_limit - customer.balance)}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                                )}
                                            </td>
                                            <td><span className={`badge ${customer.is_active ? 'badge-success' : 'badge-danger'}`}>{customer.is_active ? t('active') : t('inactive')}</span></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    {user?.permissions?.customers?.can_edit && (
                                                        <>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(customer)} title={t('edit')}><Edit2 size={16} /></button>
                                                            <button
                                                                className={`btn btn-ghost btn-sm ${customer.is_active ? 'text-warning' : 'text-success'}`}
                                                                onClick={() => handleToggleActive(customer)}
                                                                title={customer.is_active ? t('inactive') : t('active')}>
                                                                {customer.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                            </button>
                                                        </>
                                                    )}
                                                    {user?.permissions?.customers?.can_delete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(customer.id)} title={t('delete')}><Trash2 size={16} /></button>
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

            {/* Add/Edit Customer Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editingCustomer ? t('cust_edit') : t('cust_add')}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel')} (Esc)</button>
                        <button type="submit" form="customer-form" className="btn btn-primary">{t('save')} (Ctrl+S)</button>
                    </>
                }
            >
                <form id="customer-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('cust_name')} *</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">{t('phone')}</label><input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('email')}</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('cust_taxNumber')}</label><input type="text" className="form-input" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">{t('address')}</label><input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('cust_creditLimit')}</label>
                            <input type="number" className="form-input" value={formData.credit_limit}
                                onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                                min="0" step="0.001" />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0 = {t('all') || 'No Limit'}</small>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('status')}</label>
                            <select className="form-select" value={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}>
                                <option value={1}>{t('active')}</option>
                                <option value={0}>{t('inactive')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group"><label className="form-label">{t('notes')}</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                </form>
            </Modal>

            {/* Customer Statement Modal */}
            <Modal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} title={`${t('rep_customerStatement') || 'Customer Statement'}: ${selectedCustomer?.name || ''}`} size="lg"
                footer={<button className="btn btn-secondary" onClick={() => setShowInvoicesModal(false)}>{t('close')}</button>}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('cust_currentBalance')}</div>
                        <div className={selectedCustomer?.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {formatCurrency(selectedCustomer?.balance)}
                        </div>
                    </div>
                    {selectedCustomer?.credit_limit > 0 && (
                        <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('cust_creditLimit')}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{formatCurrency(selectedCustomer?.credit_limit)}</div>
                            <div style={{ fontSize: '0.8rem', marginTop: '4px', color: selectedCustomer?.balance >= selectedCustomer?.credit_limit ? '#ef4444' : '#22c55e' }}>
                                {selectedCustomer?.balance >= selectedCustomer?.credit_limit
                                    ? '⚠'
                                    : `✓ ${formatCurrency(selectedCustomer?.credit_limit - selectedCustomer?.balance)}`}
                            </div>
                        </div>
                    )}
                </div>
                {customerInvoices.length === 0 ? (
                    <div className="empty-state"><FileText size={48} /><h3>{t('noData')}</h3></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>{t('date')}</th><th>{t('vouch_description') || 'Description'}</th><th>{t('debit') || 'Debit'}</th><th>{t('credit') || 'Credit'}</th><th>{t('balance')}</th></tr>
                        </thead>
                        <tbody>
                            {customerInvoices.map((row, i) => (
                                <tr key={i}>
                                    <td>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                    <td className="font-bold">{row.description}</td>
                                    <td className="text-danger">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                    <td className="text-success">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                    <td className={row.balance > 0 ? 'text-danger font-bold' : 'text-success font-bold'}>{formatCurrency(Math.abs(row.balance))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Modal>
        </div>
    );
}

export default Customers;
