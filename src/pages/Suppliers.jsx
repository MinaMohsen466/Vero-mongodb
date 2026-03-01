import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Truck, FileText, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';

function Suppliers() {
    const { user } = useAuth();
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
            } else {
                await window.api.suppliers.create(formData);
            }
            loadSuppliers();
            closeModal();
        } catch (error) { console.error('Error saving supplier:', error); }
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا المورد؟')) {
            try {
                await window.api.suppliers.delete(id);
                loadSuppliers();
            } catch (error) { console.error('Error deleting supplier:', error); }
        }
    };

    const handleToggleActive = async (supplier) => {
        try {
            const newStatus = supplier.is_active ? 0 : 1;
            await window.api.suppliers.update({ ...supplier, is_active: newStatus });
            loadSuppliers();
        } catch (error) { console.error('Error toggling supplier status:', error); }
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
    });

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' د.ك';

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="flex items-center gap-4" style={{ flexWrap: 'wrap', gap: '10px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <input type="text" className="form-input" placeholder="بحث عن مورد..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '260px' }} />
                        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    {/* Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} style={{ color: 'var(--text-muted)' }} />
                        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '140px' }}>
                            <option value="all">الكل</option>
                            <option value="active">النشطون فقط</option>
                            <option value="inactive">غير النشطين</option>
                        </select>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {filteredSuppliers.length} مورد
                    </span>
                </div>
                {user?.permissions?.suppliers?.can_create && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> إضافة مورد
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredSuppliers.length === 0 ? (
                        <div className="empty-state"><Truck size={48} /><h3>لا يوجد موردين</h3><p>قم بإضافة مورد جديد للبدء</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الكود</th><th>الاسم</th><th>الهاتف</th><th>البريد</th>
                                        <th>الرصيد</th><th>الحالة</th><th>الإجراءات</th>
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
                                            <td><span className={`badge ${supplier.is_active ? 'badge-success' : 'badge-danger'}`}>{supplier.is_active ? 'نشط' : 'غير نشط'}</span></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    {user?.permissions?.suppliers?.can_edit && (
                                                        <>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(supplier)} title="تعديل"><Edit2 size={16} /></button>
                                                            <button
                                                                className={`btn btn-ghost btn-sm ${supplier.is_active ? 'text-warning' : 'text-success'}`}
                                                                onClick={() => handleToggleActive(supplier)}
                                                                title={supplier.is_active ? 'تعطيل' : 'تفعيل'}>
                                                                {supplier.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                            </button>
                                                        </>
                                                    )}
                                                    {user?.permissions?.suppliers?.can_delete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(supplier.id)} title="حذف"><Trash2 size={16} /></button>
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
            <Modal isOpen={showModal} onClose={closeModal} title={editingSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>إلغاء</button><button className="btn btn-primary" onClick={handleSubmit}>{editingSupplier ? 'حفظ التغييرات' : 'إضافة'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">اسم المورد *</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">رقم الهاتف</label><input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">البريد الإلكتروني</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">الرقم الضريبي</label><input type="text" className="form-input" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">العنوان</label><input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">الحالة</label>
                            <select className="form-select" value={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}>
                                <option value={1}>نشط</option>
                                <option value={0}>غير نشط</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">ملاحظات</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                    </div>
                </form>
            </Modal>

            {/* Supplier Invoices Modal */}
            <Modal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} title={`فواتير المورد: ${selectedSupplier?.name || ''}`} size="lg"
                footer={<button className="btn btn-secondary" onClick={() => setShowInvoicesModal(false)}>إغلاق</button>}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <strong>الرصيد الحالي: </strong>
                    <span className={selectedSupplier?.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {formatCurrency(selectedSupplier?.balance)}
                    </span>
                </div>
                {supplierInvoices.length === 0 ? (
                    <div className="empty-state"><FileText size={48} /><h3>لا توجد فواتير</h3></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>الحالة</th></tr>
                        </thead>
                        <tbody>
                            {supplierInvoices.map(inv => (
                                <tr key={inv.id}>
                                    <td className="font-bold">{inv.invoice_number}</td>
                                    <td>{new Date(inv.date).toLocaleDateString('ar-EG')}</td>
                                    <td>{formatCurrency(inv.total)}</td>
                                    <td>{formatCurrency(inv.paid || 0)}</td>
                                    <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{inv.status === 'paid' ? 'مدفوعة' : 'آجلة'}</span></td>
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
