import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Search, ShoppingBag, Printer, X, Edit } from 'lucide-react';
import Modal from '../components/Modal';
import InvoicePrintPreview from '../components/InvoicePrintPreview';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';

function PurchaseInvoices() {
    const { t, user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const emptyForm = () => ({
        supplier_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
        status: 'paid', payment_method: 'cash', payment_account_id: '',
        items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]
    });

    const [formData, setFormData] = useState(emptyForm());

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [invoicesData, suppliersData, productsData, settingsData, accountsData] = await Promise.all([
                window.api.invoices.getAll('purchase'),
                window.api.suppliers.getAll(),
                window.api.products.getAll(),
                window.api.settings.getAll(),
                window.api.accounts.getBankAccounts ? window.api.accounts.getBankAccounts() : Promise.resolve([])
            ]);
            setInvoices(invoicesData || []);
            setSuppliers(suppliersData || []);
            setProducts(productsData || []);
            setSettings(settingsData || {});
            setBankAccounts(accountsData || []);
        } catch (e) { console.error('Error loading data:', e); }
        setLoading(false);
    };

    const calculateItemTotal = (item) => (item.quantity * item.unit_price) - (item.discount || 0);
    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        return { subtotal, total: subtotal };
    };

    const handleProductChange = (index, productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        const newItems = [...formData.items];
        newItems[index] = {
            ...newItems[index],
            product_id: productId,
            description: product?.name || '',
            unit_price: product?.purchase_price || 0,
            total: calculateItemTotal({ ...newItems[index], unit_price: product?.purchase_price || 0 })
        };
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        newItems[index].total = calculateItemTotal(newItems[index]);
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }] });
    const removeItem = (index) => formData.items.length > 1 && setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validItems = formData.items.filter(item => (item.product_id || item.description) && item.quantity > 0);
        if (validItems.length === 0) {
            setError(t('inv_noItems'));
            return;
        }

        setSaving(true);
        try {
            const totals = calculateTotals();
            const invoiceData = {
                type: 'purchase',
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
                date: formData.date,
                due_date: formData.due_date || null,
                notes: formData.notes,
                subtotal: totals.subtotal,
                discount: 0,
                tax: 0,
                total: totals.total,
                status: formData.status,
                payment_method: formData.status === 'paid' ? formData.payment_method : 'credit',
                payment_account_id: formData.payment_account_id ? parseInt(formData.payment_account_id) : null,
                items: validItems.map(item => ({
                    product_id: item.product_id ? parseInt(item.product_id) : null,
                    description: item.description,
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount: parseFloat(item.discount) || 0,
                    tax: 0,
                    total: parseFloat(item.total) || 0
                }))
            };

            let result;
            if (editMode && editingId) {
                invoiceData.id = editingId;
                result = await window.api.invoices.update(invoiceData);
            } else {
                result = await window.api.invoices.create(invoiceData);
            }

            if (result.success) {
                await loadData();
                closeModal();
            } else {
                setError(result.error || t('inv_saveError'));
            }
        } catch (e) {
            console.error('Error saving invoice:', e);
            setError(t('inv_saveError') + ': ' + e.message);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (confirm(t('inv_deleteConfirm') + ' ' + t('pinv_deleteNote'))) {
            const result = await window.api.invoices.delete(id);
            if (result.success) {
                loadData();
            } else {
                alert(t('errorOccurred') + ': ' + (result.error || t('saveFailed')));
            }
        }
    };

    const handleEdit = async (invoiceId) => {
        try {
            console.log('[handleEdit] Loading invoice:', invoiceId);
            const invoice = await window.api.invoices.getById(invoiceId);
            console.log('[handleEdit] Got invoice:', invoice);
            console.log('[handleEdit] Invoice items:', invoice?.items);

            if (!invoice) {
                alert(t('inv_loadError'));
                return;
            }

            // Map items from the database format to form format
            let mappedItems = [];
            if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
                mappedItems = invoice.items.map(item => ({
                    product_id: item.product_id != null ? String(item.product_id) : '',
                    description: item.description || item.product_name || '',
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.unit_price) || 0,
                    discount: Number(item.discount) || 0,
                    total: Number(item.total) || 0
                }));
                console.log('[handleEdit] Mapped items:', mappedItems);
            } else {
                console.log('[handleEdit] No items found, using empty row');
                mappedItems = [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }];
            }

            // First reset everything
            setEditMode(true);
            setEditingId(invoiceId);
            setError('');

            // Set form data with mapped values
            setFormData({
                supplier_id: invoice.supplier_id != null ? String(invoice.supplier_id) : '',
                date: invoice.date || new Date().toISOString().split('T')[0],
                due_date: invoice.due_date || '',
                notes: invoice.notes || '',
                status: invoice.status || 'paid',
                payment_method: invoice.payment_method || 'cash',
                payment_account_id: invoice.payment_account_id != null ? String(invoice.payment_account_id) : '',
                items: mappedItems
            });

            // Open the modal
            setShowModal(true);
        } catch (err) {
            console.error('[handleEdit] Error:', err);
            alert(t('inv_loadError') + ': ' + err.message);
        }
    };

    const viewInvoice = async (id) => {
        const invoice = await window.api.invoices.getById(id);
        setSelectedInvoice(invoice);
        setShowViewModal(true);
    };

    const printInvoice = async () => {
        if (!selectedInvoice) return;
        const currencySymbol = settings.general?.currency_symbol || 'د.ك';
        const invoiceTitle = settings.invoice?.invoice_title_purchase || 'فاتورة مشتريات';
        const invoiceFooter = settings.invoice?.invoice_footer || 'شكراً لتعاملكم معنا';
        const companyName = settings.company?.company_name || 'شركتي';
        const companyLogo = settings.company?.company_logo || '';

        const logoHtml = companyLogo ? `<img src="${companyLogo}" alt="Logo" style="max-height:60px;max-width:150px;object-fit:contain" />` : '';

        const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>body{font-family:'Cairo','Arial',sans-serif;padding:40px;margin:0}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1e3a5f;padding-bottom:20px;margin-bottom:20px}.company{display:flex;align-items:center;gap:15px}.company h1{margin:0;font-size:24px;color:#1e3a5f}.info{text-align:left}.info p{margin:4px 0;font-size:14px}.supplier{margin:20px 0;padding:15px;background:#f8fafc;border-radius:8px;border-right:4px solid #1e3a5f}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #e2e8f0;padding:12px;text-align:right}th{background:#1e3a5f;color:white;font-weight:600}tr:nth-child(even){background:#f8fafc}.totals{margin-top:20px;display:flex;justify-content:flex-end}.totals table{width:280px;border:none}.totals td{border:none;padding:8px 12px}.total-row{font-size:18px;font-weight:bold;background:#1e3a5f;color:white;border-radius:8px}.footer{margin-top:40px;text-align:center;color:#64748b;border-top:1px solid #e2e8f0;padding-top:20px;font-size:14px}</style></head><body><div class="header"><div class="company">${logoHtml}<div><h1>${companyName}</h1><p style="color:#64748b;margin:0">${invoiceTitle}</p></div></div><div class="info"><p><strong>${t('inv_number')}:</strong> ${selectedInvoice.invoice_number}</p><p><strong>${t('date')}:</strong> ${new Date(selectedInvoice.date).toLocaleDateString('ar-KW')}</p>${selectedInvoice.due_date ? `<p><strong>${t('inv_dueDate')}:</strong> ${new Date(selectedInvoice.due_date).toLocaleDateString('ar-KW')}</p>` : ''}</div></div><div class="supplier"><strong>${t('pinv_supplier')}:</strong> ${selectedInvoice.supplier_name || '-'}</div><table><thead><tr><th style="width:40px">#</th><th>${t('inv_product')}</th><th style="width:80px">${t('inv_quantity')}</th><th style="width:100px">${t('inv_unitPrice')}</th><th style="width:100px">${t('inv_total')}</th></tr></thead><tbody>${selectedInvoice.items?.map((item, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${item.product_name || item.description}</td><td style="text-align:center">${item.quantity}</td><td>${Number(item.unit_price).toFixed(3)} ${currencySymbol}</td><td style="font-weight:bold">${Number(item.total).toFixed(3)} ${currencySymbol}</td></tr>`).join('')}</tbody></table><div class="totals"><table><tr class="total-row"><td>${t('inv_total')}:</td><td>${Number(selectedInvoice.total).toFixed(3)} ${currencySymbol}</td></tr></table></div>${selectedInvoice.notes ? `<div style="margin-top:20px;padding:10px;background:#fef9c3;border-radius:4px;font-size:14px"><strong>${t('notes')}:</strong> ${selectedInvoice.notes}</div>` : ''}<div class="footer"><p>${invoiceFooter}</p></div></body></html>`;
        await window.api.print.invoice(html);
    };

    const openModal = () => {
        setError('');
        setEditMode(false);
        setEditingId(null);
        setFormData(emptyForm());
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setError('');
        setEditMode(false);
        setEditingId(null);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || 'د.ك');

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.invoice_number?.includes(searchQuery) || inv.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const matchesSupplier = !supplierFilter || String(inv.supplier_id) === supplierFilter;
        const matchesDateFrom = !dateFrom || inv.date >= dateFrom;
        const matchesDateTo = !dateTo || inv.date <= dateTo;
        return matchesSearch && matchesStatus && matchesSupplier && matchesDateFrom && matchesDateTo;
    });

    const getStatusLabel = (status) => {
        if (status === 'paid') return t('inv_paid');
        if (status === 'partial') return t('inv_partial');
        if (status === 'cancelled') return t('inv_cancelled');
        return t('inv_pending');
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" placeholder={t('search')} value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingRight: '40px', width: '220px', margin: 0 }} />
                    <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '130px', margin: 0 }}>
                    <option value="all">كل الحالات</option>
                    <option value="paid">مدفوعة</option>
                    <option value="pending">آجلة</option>
                </select>
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={suppliers.map(s => ({ value: String(s.id), label: s.name }))}
                        value={supplierFilter}
                        onChange={setSupplierFilter}
                        placeholder="كل الموردين"
                        emptyLabel="كل الموردين"
                    />
                </div>
                <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title="من تاريخ" />
                <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title="إلى تاريخ" />
                {(searchQuery || statusFilter !== 'all' || supplierFilter || dateFrom || dateTo) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setSupplierFilter(''); setDateFrom(''); setDateTo(''); }}
                        style={{ color: 'var(--text-muted)' }}>✕ مسح</button>
                )}
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filteredInvoices.length} فاتورة</span>
                {user?.permissions?.purchase_invoices?.can_create && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> {t('pinv_add')}</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredInvoices.length === 0 ? (
                        <div className="empty-state"><ShoppingBag size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>{t('inv_number')}</th><th>{t('pinv_supplier')}</th><th>{t('date')}</th><th>{t('total')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                                <tbody>
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-bold">{inv.invoice_number}</td>
                                            <td>{inv.supplier_name || '-'}</td>
                                            <td>{new Date(inv.date).toLocaleDateString('ar-KW')}</td>
                                            <td className="font-bold">{formatCurrency(inv.total)}</td>
                                            <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{getStatusLabel(inv.status)}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    {user?.permissions?.purchase_invoices?.can_view && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {user?.permissions?.purchase_invoices?.can_edit && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv.id)} title={t('edit')}><Edit size={16} /></button>
                                                    )}
                                                    {user?.permissions?.purchase_invoices?.can_view && (
                                                        <button className="btn btn-ghost btn-sm" onClick={async () => { await viewInvoice(inv.id); setShowPrintPreview(true); }} title={t('inv_print')}><Printer size={16} /></button>
                                                    )}
                                                    {user?.permissions?.purchase_invoices?.can_delete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(inv.id)} title={t('delete')}><Trash2 size={16} /></button>
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
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? t('pinv_edit') : t('pinv_add')} size="lg" footer={<><button className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')}</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? t('savingProgress') : t('save')}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('pinv_supplier')}</label>
                            <SearchableSelect
                                options={suppliers.map(s => ({ value: String(s.id), label: s.name }))}
                                value={formData.supplier_id ? String(formData.supplier_id) : ''}
                                onChange={(val) => setFormData({ ...formData, supplier_id: val })}
                                placeholder={t('pinv_selectSupplier')}
                                emptyLabel={t('pinv_selectSupplier')}
                            />
                        </div>
                        <div className="form-group"><label className="form-label">{t('inv_date')}</label><input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('inv_dueDate')}</label><input type="date" className="form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} /></div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('inv_status')}</label>
                            <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                <option value="paid">{t('inv_paid')}</option>
                                <option value="pending">{t('inv_credit')}</option>
                            </select>
                        </div>
                        {formData.status === 'paid' && (
                            <div className="form-group">
                                <label className="form-label">{t('inv_paymentMethod')}</label>
                                <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                                    <option value="cash">{t('inv_cash')}</option>
                                    <option value="bank">{t('inv_bank')}</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <div className="flex justify-between items-center mb-2"><h4>{t('inv_product')}</h4></div>
                        <div className="table-container">
                            <table>
                                <thead><tr><th style={{ width: '200px' }}>{t('inv_product')}</th><th>{t('description')}</th><th style={{ width: '120px' }}>{t('inv_quantity')}</th><th style={{ width: '100px' }}>{t('inv_unitPrice')}</th><th style={{ width: '100px' }}>{t('inv_itemTotal')}</th><th style={{ width: '50px' }}></th></tr></thead>
                                <tbody>
                                    {formData.items.map((item, index) => (
                                        <tr key={index}>
                                            <td><select className="form-select" value={item.product_id} onChange={(e) => handleProductChange(index, e.target.value)} style={{ margin: 0 }}><option value="">{t('inv_selectProduct')}</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></td>
                                            <td><input type="text" className="form-input" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ margin: 0 }} /></td>
                                            <td><input type="number" className="form-input" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} min="1" step="1" style={{ margin: 0 }} /></td>
                                            <td><input type="number" className="form-input" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} step="0.25" style={{ margin: 0 }} /></td>
                                            <td className="font-bold">{formatCurrency(calculateItemTotal(item))}</td>
                                            <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeItem(index)}><X size={16} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={addItem} style={{ marginTop: '10px' }}><Plus size={16} /> {t('inv_addItem')}</button>
                        <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '1.2rem', fontWeight: 'bold' }}>{t('inv_total')}: {formatCurrency(calculateTotals().total)}</div>
                    </div>
                    <div className="form-group mt-4"><label className="form-label">{t('notes')}</label><textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ minHeight: '60px' }} /></div>
                </form>
            </Modal>

            {/* View Modal */}
            <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`${t('inv_view')} ${selectedInvoice?.invoice_number}`} size="lg" footer={<><button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>{t('close')}</button><button className="btn btn-primary" onClick={printInvoice}><Printer size={18} /> {t('inv_print')}</button></>}>
                {selectedInvoice && (
                    <div>
                        <div className="form-row mb-4"><div><strong>{t('pinv_supplier')}:</strong> {selectedInvoice.supplier_name || '-'}</div><div><strong>{t('date')}:</strong> {new Date(selectedInvoice.date).toLocaleDateString('ar-KW')}</div></div>
                        <div className="table-container">
                            <table><thead><tr><th>#</th><th>{t('inv_product')}</th><th>{t('inv_quantity')}</th><th>{t('inv_unitPrice')}</th><th>{t('inv_total')}</th></tr></thead><tbody>{selectedInvoice.items?.map((item, i) => <tr key={i}><td>{i + 1}</td><td>{item.product_name || item.description}</td><td>{item.quantity}</td><td>{formatCurrency(item.unit_price)}</td><td className="font-bold">{formatCurrency(item.total)}</td></tr>)}</tbody></table>
                        </div>
                        <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '1.2rem' }}><strong>{t('inv_total')}: {formatCurrency(selectedInvoice.total)}</strong></div>
                    </div>
                )}
            </Modal>

            {/* Print Preview Modal */}
            {showPrintPreview && selectedInvoice && (
                <InvoicePrintPreview
                    invoice={selectedInvoice}
                    settings={settings}
                    type="purchase"
                    onClose={() => setShowPrintPreview(false)}
                />
            )}
        </div>
    );
}

export default PurchaseInvoices;
