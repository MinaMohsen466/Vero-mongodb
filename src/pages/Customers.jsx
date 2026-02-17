import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Users, FileText, X } from 'lucide-react';
import Modal from '../components/Modal';

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showInvoicesModal, setShowInvoicesModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: ''
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
            } else {
                await window.api.customers.create(formData);
            }
            loadCustomers();
            closeModal();
        } catch (error) { console.error('Error saving customer:', error); }
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
            try {
                await window.api.customers.delete(id);
                loadCustomers();
            } catch (error) { console.error('Error deleting customer:', error); }
        }
    };

    const openModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name || '', phone: customer.phone || '', email: customer.email || '',
                address: customer.address || '', tax_number: customer.tax_number || '',
                credit_limit: customer.credit_limit || 0, notes: customer.notes || ''
            });
        } else {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingCustomer(null); };

    // Show customer invoices in modal
    const showCustomerInvoices = async (customer) => {
        setSelectedCustomer(customer);
        try {
            const invoices = await window.api.invoices.getByCustomer(customer.id);
            setCustomerInvoices(invoices || []);
        } catch (e) { console.error(e); setCustomerInvoices([]); }
        setShowInvoicesModal(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) || c.code?.includes(searchQuery)
    );

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' د.ك';

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div className="flex items-center gap-4">
                    <div style={{ position: 'relative' }}>
                        <input type="text" className="form-input" placeholder="بحث عن عميل..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '300px' }} />
                        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> إضافة عميل
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredCustomers.length === 0 ? (
                        <div className="empty-state"><Users size={48} /><h3>لا يوجد عملاء</h3><p>قم بإضافة عميل جديد للبدء</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الكود</th><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>الرصيد</th><th>الحالة</th><th>الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map(customer => (
                                        <tr key={customer.id} style={{ cursor: 'pointer' }} onClick={() => showCustomerInvoices(customer)}>
                                            <td>{customer.code}</td>
                                            <td className="font-bold">{customer.name}</td>
                                            <td>{customer.phone || '-'}</td>
                                            <td>{customer.email || '-'}</td>
                                            <td className={`font-bold ${customer.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(customer.balance)}
                                            </td>
                                            <td><span className={`badge ${customer.is_active ? 'badge-success' : 'badge-danger'}`}>{customer.is_active ? 'نشط' : 'غير نشط'}</span></td>
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openModal(customer)} title="تعديل"><Edit2 size={16} /></button>
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(customer.id)} title="حذف"><Trash2 size={16} /></button>
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
            <Modal isOpen={showModal} onClose={closeModal} title={editingCustomer ? 'تعديل عميل' : 'إضافة عميل جديد'}
                footer={<><button className="btn btn-secondary" onClick={closeModal}>إلغاء</button><button className="btn btn-primary" onClick={handleSubmit}>{editingCustomer ? 'حفظ التغييرات' : 'إضافة'}</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">اسم العميل *</label><input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">رقم الهاتف</label><input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">البريد الإلكتروني</label><input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">الرقم الضريبي</label><input type="text" className="form-input" value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">العنوان</label><input type="text" className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">حد الائتمان</label><input type="number" className="form-input" value={formData.credit_limit} onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">ملاحظات</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
                </form>
            </Modal>

            {/* Customer Invoices Modal */}
            <Modal isOpen={showInvoicesModal} onClose={() => setShowInvoicesModal(false)} title={`فواتير العميل: ${selectedCustomer?.name || ''}`} size="lg"
                footer={<button className="btn btn-secondary" onClick={() => setShowInvoicesModal(false)}>إغلاق</button>}>
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                    <strong>الرصيد الحالي: </strong>
                    <span className={selectedCustomer?.balance > 0 ? 'text-danger' : 'text-success'} style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                        {formatCurrency(selectedCustomer?.balance)}
                    </span>
                </div>
                {customerInvoices.length === 0 ? (
                    <div className="empty-state"><FileText size={48} /><h3>لا توجد فواتير</h3></div>
                ) : (
                    <table>
                        <thead>
                            <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>الإجمالي</th><th>المدفوع</th><th>الحالة</th></tr>
                        </thead>
                        <tbody>
                            {customerInvoices.map(inv => (
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

export default Customers;
