import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Search, FileText, Printer, X, Edit, Download, ArrowRightLeft } from 'lucide-react';
import Modal from '../components/Modal';
import InvoicePrintPreview from '../components/InvoicePrintPreview';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth, isColorUnit } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

const parseDbDate = (dbDate) => {
    if (!dbDate) return new Date();
    if (dbDate instanceof Date) return dbDate;
    if (typeof dbDate !== 'string') {
        const d = new Date(dbDate);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    if (dbDate.includes('Z') || dbDate.includes('+') || (dbDate.includes('-') && dbDate.includes(':') && dbDate.includes('T'))) {
        return new Date(dbDate);
    }
    return new Date(dbDate.replace(' ', 'T') + 'Z');
};

function Quotations() {
    const { t, user } = useAuth();
    const canCreate = user?.role === 'admin' || user?.permissions?.quotations?.can_create;
    const canView = user?.role === 'admin' || user?.permissions?.quotations?.can_view;
    const canEdit = user?.role === 'admin' || user?.permissions?.quotations?.can_edit;
    const canDelete = user?.role === 'admin' || user?.permissions?.quotations?.can_delete;

    const [quotations, setQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [customerFilter, setCustomerFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const emptyForm = () => ({
        customer_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
        status: 'pending', payment_method: 'cash', payment_account_id: '', paid: 0,
        manual_discount: 0,
        items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }]
    });

    const [formData, setFormData] = useState(emptyForm());
    const searchInputRef = React.useRef(null);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#quotation-form button[type="submit"]') || document.querySelector('button[form="quotation-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && canCreate) openModal();
        },
        Escape: () => {
            if (showModal) closeModal();
            if (showPrintPreview) setShowPrintPreview(false);
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [quotationsData, customersData, productsData, settingsData] = await Promise.all([
                window.api.invoices.getAll('quotation'),
                window.api.customers.getAll(),
                window.api.products.getAll(),
                window.api.settings.getAll()
            ]);
            setQuotations(quotationsData || []);
            setCustomers(customersData || []);
            setProducts(productsData || []);
            setSettings(settingsData || {});
        } catch (e) { console.error('Error loading data:', e); }
        setLoading(false);
    };

    const handleProductChange = (index, productId) => {
        const prod = products.find(p => p.id === parseInt(productId));
        const updated = [...formData.items];
        if (prod) {
            updated[index] = {
                ...updated[index],
                product_id: productId,
                description: prod.name,
                unit_price: prod.sale_price || 0,
                unit: prod.unit || 'قطعة',
                total: (prod.sale_price || 0) * (updated[index].quantity || 1)
            };
        } else {
            updated[index] = {
                ...updated[index],
                product_id: '',
                description: '',
                unit_price: 0,
                unit: 'قطعة',
                total: 0
            };
        }
        
        let newItems = updated;
        const lastItem = updated[updated.length - 1];
        if (prod && lastItem && lastItem.product_id !== '') {
            newItems = [...updated, { product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }];
        }
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, val) => {
        const updated = [...formData.items];
        updated[index][field] = val;
        
        if (field === 'quantity' || field === 'unit_price') {
            const qty = parseFloat(updated[index].quantity) || 0;
            const price = parseFloat(updated[index].unit_price) || 0;
            updated[index].total = qty * price;
        }
        setFormData({ ...formData, items: updated });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }]
        });
    };

    const removeItem = (index) => {
        const updated = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: updated.length ? updated : [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }] });
    };

    // Calculations
    const itemsSubtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const manualDiscountVal = parseFloat(formData.manual_discount) || 0;
    const finalTotal = Math.max(0, itemsSubtotal - manualDiscountVal);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.customer_id) { setError(t('customer_required') || 'Customer is required'); return; }
        
        // Filter out empty rows (product_id is empty string)
        const validItems = formData.items.filter(item => item.product_id !== '');
        
        if (validItems.length === 0) {
            setError(t('inv_itemError') || 'Please select products with valid quantities');
            return;
        }
        
        if (validItems.some(item => !item.quantity || parseFloat(item.quantity) <= 0)) {
            setError(t('inv_itemError') || 'Please select products with valid quantities');
            return;
        }

        setSaving(true);
        setError('');

        const finalSubtotal = validItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const finalDiscount = parseFloat(formData.manual_discount) || 0;
        const finalTotal = Math.max(0, finalSubtotal - finalDiscount);

        const payload = {
            ...formData,
            id: editingId,
            type: 'quotation',
            subtotal: finalSubtotal,
            discount: finalDiscount,
            total: finalTotal,
            paid: 0, // quotations have no payment transaction
            tax: 0,
            manual_discount: finalDiscount,
            created_by: user?.id,
            items: validItems.map(item => ({
                product_id: parseInt(item.product_id),
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
                discount: 0,
                tax: 0,
                total: parseFloat(item.total),
                color: item.color || null
            }))
        };

        try {
            const result = editMode 
                ? await window.api.invoices.update(payload)
                : await window.api.invoices.create(payload);

            if (result.success) {
                toast.success(editMode ? (t('updatedSuccess') || 'Saved successfully') : (t('savedSuccess') || 'Saved successfully'));
                closeModal();
                loadData();
            } else {
                setError(result.error || t('errorOccurred'));
            }
        } catch (e) {
            console.error(e);
            setError(t('errorOccurred'));
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (confirm(t('delete_confirm') || 'هل أنت متأكد من الحذف؟')) {
            try {
                const result = await window.api.invoices.delete(id);
                if (result.success) {
                    toast.success(t('deletedSuccess') || 'Deleted successfully');
                    loadData();
                } else {
                    toast.error(result.error || t('errorOccurred'));
                }
            } catch (error) {
                console.error(error);
                toast.error(t('errorOccurred'));
            }
        }
    };

    const handleEdit = async (id) => {
        try {
            const quotation = await window.api.invoices.getById(id);
            if (!quotation) { toast.error(t('inv_loadError')); return; }
            if (quotation.status === 'converted') {
                toast.error(t('quotation_already_converted_error') || 'لا يمكن تعديل عرض سعر تم تحويله لفاتورة');
                return;
            }

            const mapped = quotation.items.map(item => ({
                product_id: item.product_id ? String(item.product_id) : '',
                description: item.description || item.product_name || '',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                discount: 0,
                total: Number(item.total) || 0,
                color: item.color || '',
                unit: item.unit || ''
            }));

            setEditMode(true);
            setEditingId(id);
            setError('');
            setFormData({
                customer_id: quotation.customer_id ? String(quotation.customer_id) : '',
                date: quotation.date || new Date().toISOString().split('T')[0],
                due_date: quotation.due_date || '',
                notes: quotation.notes || '',
                status: quotation.status || 'pending',
                payment_method: quotation.payment_method || 'cash',
                payment_account_id: quotation.payment_account_id ? String(quotation.payment_account_id) : '',
                paid: 0,
                manual_discount: quotation.manual_discount || 0,
                items: mapped
            });
            setShowModal(true);
        } catch (e) {
            console.error(e);
            toast.error(t('errorOccurred'));
        }
    };

    const viewQuotation = async (id) => {
        try {
            const freshSettings = await window.api.settings.getAll();
            setSettings(freshSettings || {});
            const quotation = await window.api.invoices.getById(id);
            setSelectedQuotation(quotation);
            setShowPrintPreview(true);
        } catch (e) {
            console.error(e);
        }
    };

    const handleConvertToInvoice = async (quotation) => {
        if (!confirm(t('convert_to_sales_invoice_confirm') || 'هل أنت متأكد من تحويل عرض السعر هذا إلى فاتورة مبيعات؟')) return;
        setSaving(true);
        try {
            const invoiceData = {
                type: 'sales',
                customer_id: quotation.customer_id,
                date: new Date().toISOString().split('T')[0],
                due_date: quotation.due_date,
                subtotal: quotation.subtotal,
                discount: quotation.discount,
                tax: quotation.tax,
                total: quotation.total,
                paid: quotation.payment_method === 'credit' ? 0 : quotation.total,
                status: quotation.payment_method === 'credit' ? 'pending' : 'paid',
                payment_method: quotation.payment_method,
                payment_account_id: quotation.payment_account_id,
                notes: quotation.notes || '',
                created_by: user?.id,
                manual_discount: quotation.manual_discount || 0,
                coupon_code: quotation.coupon_code,
                items: quotation.items.map(item => ({
                    product_id: item.product_id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount: item.discount,
                    tax: item.tax,
                    total: item.total,
                    color: item.color || null
                }))
            };
            const result = await window.api.invoices.create(invoiceData);
            if (result.success) {
                // Update quotation status to converted
                await window.api.invoices.update({
                    ...quotation,
                    status: 'converted'
                });
                toast.success(t('quotation_converted_success') || 'تم تحويل عرض السعر إلى فاتورة بنجاح!');
                setShowPrintPreview(false);
                loadData();
            } else {
                toast.error(result.error || 'خطأ أثناء تحويل عرض السعر');
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء عملية التحويل');
        }
        setSaving(false);
    };

    const openModal = () => {
        setError('');
        setEditMode(false);
        setEditingId(null);
        const cashCust = customers.find(c => c.code === 'CUST-CASH');
        const defaultForm = emptyForm();
        if (cashCust) {
            defaultForm.customer_id = String(cashCust.id);
        }
        setFormData(defaultForm);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setError('');
        setEditMode(false);
        setEditingId(null);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));

    const filteredQuotations = quotations.filter(q => {
        const matchesSearch = 
            q.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            q.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.items || []).some(item => 
                item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
        const matchesCustomer = !customerFilter || String(q.customer_id) === customerFilter;
        const matchesDateFrom = !dateFrom || q.date >= dateFrom;
        const matchesDateTo = !dateTo || q.date <= dateTo;
        return matchesSearch && matchesStatus && matchesCustomer && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id - a.id;
    });

    const getStatusLabel = (status) => {
        if (status === 'converted') return t('converted') || 'تم تحويلها فاتورة';
        return t('quotation_active') || 'نشط / معلق';
    };

    const exportCSV = async () => {
        const rows = [[
            t('inv_number') || 'Quotation Number',
            t('sinv_customer') || 'Customer',
            t('date') || 'Date',
            t('subtotal') || 'Subtotal',
            t('discount') || 'Discount',
            t('total') || 'Total',
            t('status') || 'Status',
            t('notes') || 'Notes'
        ]];
        filteredQuotations.forEach(q => {
            rows.push([
                q.invoice_number || '',
                q.customer_name || '',
                q.date || '',
                q.subtotal || 0,
                q.discount || 0,
                q.total || 0,
                q.status === 'converted' ? (t('converted') || 'Converted') : (t('pending') || 'Pending'),
                q.notes || ''
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        await window.api.file.saveText({ content: csv, defaultName: 'Quotations.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="form-input"
                        placeholder={t('search') + " (Ctrl+F)"}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingRight: '40px', width: '220px', margin: 0 }}
                    />
                    <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '150px', margin: 0 }}>
                    <option value="all">{t('all') || 'All statuses'}</option>
                    <option value="pending">{t('quotation_active') || 'نشط / معلق'}</option>
                    <option value="converted">{t('converted') || 'تم تحويلها فاتورة'}</option>
                </select>
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={customers.map(c => ({ value: String(c.id), label: c.name }))}
                        value={customerFilter}
                        onChange={setCustomerFilter}
                        placeholder={t('all') || "All Customers"}
                        emptyLabel={t('all') || "All Customers"}
                    />
                </div>
                <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('from_date') || "From Date"} />
                <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('to_date') || "To Date"} />
                {(searchQuery || statusFilter !== 'all' || customerFilter || dateFrom || dateTo) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCustomerFilter(''); setDateFrom(''); setDateTo(''); }}
                        style={{ color: 'var(--text-muted)' }}>✕ {t('clear') || 'Clear'}</button>
                )}
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filteredQuotations.length} {t('menu_quotations')}</span>
                <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
                    <Download size={16} /> CSV
                </button>
                {canCreate && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> {t('new_quotation')}</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredQuotations.length === 0 ? (
                        <div className="empty-state"><FileText size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>{t('inv_number')}</th><th>{t('sinv_customer')}</th><th>{t('date')}</th><th>{t('total')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                                <tbody>
                                    {filteredQuotations.map(q => (
                                        <tr key={q.id}>
                                            <td className="font-bold">{q.invoice_number}</td>
                                            <td>{q.customer_name || '-'}</td>
                                            <td>
                                                <div>{new Date(q.date).toLocaleDateString('en-GB')}</div>
                                                {q.created_at && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {parseDbDate(q.created_at).toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="font-bold">
                                                {formatCurrency(q.total)}
                                                {q.discount > 0 && <span style={{ display: 'block', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{t('discount')}: {formatCurrency(q.discount)}</span>}
                                            </td>
                                            <td>
                                                <span className={`badge ${q.status === 'converted' ? 'badge-success' : 'badge-warning'}`}>{getStatusLabel(q.status)}</span>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    {canView && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewQuotation(q.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {canEdit && q.status !== 'converted' && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(q.id)} title={t('edit')}><Edit size={16} /></button>
                                                    )}
                                                    {canView && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewQuotation(q.id)} title={t('inv_print')}><Printer size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_create) && q.status !== 'converted' && (
                                                        <button className="btn btn-ghost btn-sm text-primary" onClick={() => handleConvertToInvoice(q)} title={t('convert_to_sales_invoice')}><ArrowRightLeft size={16} /></button>
                                                    )}
                                                    {canDelete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(q.id)} title={t('delete')}><Trash2 size={16} /></button>
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

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? t('new_quotation') : t('new_quotation')} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')} (Esc)</button><button type="submit" form="quotation-form" className="btn btn-primary" disabled={saving}>{saving ? t('savingProgress') : t('save') + ' (Ctrl+S)'}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form id="quotation-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                            📄 {t('invoice_details') || 'معلومات عرض السعر الأساسية'}
                        </div>
                        <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 600 }}>{t('sinv_customer')} <span style={{ color: '#ef4444' }}>*</span></label>
                                <SearchableSelect
                                    options={customers.map(c => ({ value: String(c.id), label: c.name }))}
                                    value={formData.customer_id}
                                    onChange={val => setFormData({ ...formData, customer_id: val })}
                                    placeholder={t('select_customer')}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 600 }}>{t('date')}</label>
                                <input type="date" className="form-input" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontWeight: 600 }}>{t('due_date') || 'صالح حتى'}</label>
                                <input type="date" className="form-input" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)' }}>🛍️ {t('invoice_items') || 'الأصناف والبنود'}</div>
                        </div>
                        <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-primary)' }}>
                                        <th style={{ width: '40%' }}>{t('product') || 'المنتج'}</th>
                                        <th>{t('quantity') || 'الكمية'}</th>
                                        <th>{t('unit_price') || 'سعر الوحدة'}</th>
                                        <th>{t('total') || 'الإجمالي'}</th>
                                        {settings.general?.enable_product_color === 'yes' && <th style={{ width: '120px' }}>{t('color') || 'اللون'}</th>}
                                        <th style={{ width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <SearchableSelect
                                                    options={products.filter(p => p.is_active).map(p => ({ value: String(p.id), label: `${p.name} - ${p.sale_price}` }))}
                                                    value={item.product_id}
                                                    onChange={val => handleProductChange(idx, val)}
                                                    placeholder={t('select_product')}
                                                />
                                            </td>
                                            <td>
                                                <input type="number" step="any" min="0.001" className="form-input" style={{ margin: 0 }} value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} required />
                                            </td>
                                            <td>
                                                <input type="number" step="any" min="0" className="form-input" style={{ margin: 0 }} value={item.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} required />
                                            </td>
                                            <td className="font-bold" style={{ verticalAlign: 'middle' }}>{formatCurrency(item.total)}</td>
                                            {settings.general?.enable_product_color === 'yes' && (
                                                <td>
                                                    {isColorUnit(item.unit) ? (
                                                        <input type="text" className="form-input" style={{ margin: 0 }} value={item.color || ''} onChange={e => handleItemChange(idx, 'color', e.target.value)} placeholder={t('color')} />
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</span>}
                                                </td>
                                            )}
                                            <td>
                                                <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeItem(idx)}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ {t('add_item') || 'إضافة صنف'}</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontWeight: 600 }}>{t('notes')}</label>
                            <textarea className="form-input" style={{ flex: 1, minHeight: '80px', margin: 0 }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder={t('notes')} />
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                                <span>{t('subtotal') || 'المجموع الفرعي'}:</span>
                                <span>{formatCurrency(itemsSubtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('discount') || 'الخصم'}:</span>
                                <input type="number" className="form-input" style={{ width: '120px', textAlign: 'left', margin: 0, padding: '6px 10px' }} value={formData.manual_discount} onChange={e => setFormData({ ...formData, manual_discount: e.target.value })} min="0" step="any" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: '10px', fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary)' }}>
                                <span>{t('final_total') || 'الإجمالي النهائي'}:</span>
                                <span>{formatCurrency(finalTotal)}</span>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Print Preview Modal */}
            {showPrintPreview && selectedQuotation && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '900px', maxWidth: '95vw', maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{t('quotation') || 'عرض السعر'}</h3>
                            <button onClick={() => setShowPrintPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                            <InvoicePrintPreview
                                invoice={selectedQuotation}
                                settings={settings}
                                type="quotation"
                                onClose={() => setShowPrintPreview(false)}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
                            <button className="btn btn-secondary" onClick={() => setShowPrintPreview(false)}>{t('close')}</button>
                            {selectedQuotation.status !== 'converted' && (user?.role === 'admin' || user?.permissions?.sales_invoices?.can_create) && (
                                <button className="btn btn-primary" onClick={() => handleConvertToInvoice(selectedQuotation)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ArrowRightLeft size={16} /> {t('convert_to_sales_invoice')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Quotations;
