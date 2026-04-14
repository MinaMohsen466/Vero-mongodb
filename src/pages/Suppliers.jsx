import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Truck, FileText, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Suppliers() {
    const { user, t } = useAuth();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supplierInvoices, setSupplierInvoices] = useState([]);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_number: '', notes: '', is_active: 1
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

    const loadSuppliers = async () => {
        try {
            const data = await window.api.suppliers.getAll();
            setSuppliers(data);
        } catch (error) { console.error('Error loading suppliers:', error); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    const openModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name || '', phone: supplier.phone || '', email: supplier.email || '',
                address: supplier.address || '', tax_number: supplier.tax_number || '',
                notes: supplier.notes || '', is_active: supplier.is_active !== undefined ? supplier.is_active : 1
            });
        } else {
            setEditingSupplier(null);
            setFormData({ name: '', phone: '', email: '', address: '', tax_number: '', notes: '', is_active: 1 });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingSupplier(null); };

    const showSupplierInvoices = async (supplier) => {
        setSelectedSupplier(supplier);
        try {
            const invoices = await window.api.invoices.getBySupplier(supplier.id);
            setSupplierInvoices(invoices || []);
        } catch (e) { console.error(e); setSupplierInvoices([]); }
        setShowInvoicesModal(true);
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.phone?.includes(searchQuery) || s.code?.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && s.is_active) ||
            (statusFilter === 'inactive' && !s.is_active);
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
                            style={{ width: '140px' }}>
                            <option value="all">{t('all')}</option>
                            <option value="active">{t('activeOnly')}</option>
                            <option value="inactive">{t('inactive')}</option>
                        </select>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {filteredSuppliers.length} {t('menu_suppliers')}
                    </span>
                </div>
                {user?.permissions?.suppliers?.can_create && (
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
                                            <td>{supplier.phone || '-'}</td>
                                            <td>{supplier.email || '-'}</td>
                                            <td className={`font-bold ${supplier.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(supplier.balance)}
                                            </td>
                                            <td><span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-danger'}`}>{supplier.is_active ? t('active') : t('inactive')}</span></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    {user?.permissions?.suppliers?.can_edit && (
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
                                                    {user?.permissions?.suppliers?.can_delete && (
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
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel')} (Esc)</button>
                        <button type="submit" form="supplier-form" className="btn btn-primary">{t('save')} (Ctrl+S)</button>
                    </>
                }
            >
                <form id="supplier-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('supp_name')} *</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">{t('phone')}</label><input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('email')}</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('supp_taxNumber')}</label><input type="text" className="form-input" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">{t('address')}</label><input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
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

            {/* Supplier Invoices Modal */}
            <Modal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} title={`${t('supp_invoices')}: ${selectedSupplier?.name || ''}`} size="lg"
                footer={<button className="btn btn-secondary" onClick={() => setShowInvoicesModal(false)}>{t('close')}</button>}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <strong>{t('supp_currentBalance')}: </strong>
                    <span className={selectedSupplier?.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {formatCurrency(selectedSupplier?.balance)}
                    </span>
                </div>
                {supplierInvoices.length === 0 ? (
                    <div className="empty-state"><FileText size={48} /><h3>{t('noData')}</h3></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>{t('inv_number')}</th><th>{t('date')}</th><th>{t('total')}</th><th>{t('supp_paidAmount')}</th><th>{t('status')}</th></tr>
                        </thead>
                        <tbody>
                            {supplierInvoices.map(inv => (
                                <tr key={inv.id}>
                                    <td className="font-bold">{inv.invoice_number}</td>
                                    <td>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                    <td>{formatCurrency(inv.total)}</td>
                                    <td>{formatCurrency(inv.paid || 0)}</td>
                                    <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{inv.status === 'paid' ? t('inv_paid') : t('supp_creditLabel')}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Modal>
        </div>
    );
}

export default Suppliers;
