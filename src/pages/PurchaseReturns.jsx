import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Search, Printer, X, Download } from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

function PurchaseReturns() {
    const { t, user } = useAuth();
    const [returns, setReturns] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        supplier_id: '',
        invoice_id: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        payment_account_id: '',
        notes: '',
        items: []
    });

    // Selected Invoice Items to Return
    const [selectedInvoiceItems, setSelectedInvoiceItems] = useState([]);

    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions?.purchase_returns || {};
    const canView = isAdmin || permissions.can_view;
    const canCreate = isAdmin || permissions.can_create;
    const canDelete = isAdmin || permissions.can_delete;

    useEffect(() => {
        if (canView) {
            loadData();
        }
    }, [canView]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [returnsData, suppliersData, invoicesData, accountsData] = await Promise.all([
                window.api.returns.getAll('purchase_return'),
                window.api.suppliers.getAll(),
                window.api.invoices.getAll('purchase'),
                window.api.accounts.getBankAccounts ? window.api.accounts.getBankAccounts() : Promise.resolve([])
            ]);
            setReturns(returnsData || []);
            setSuppliers(suppliersData || []);
            setInvoices(invoicesData || []);
            setBankAccounts(accountsData || []);
        } catch (e) {
            console.error('Error loading returns data:', e);
            toast.error(t('errorOccurred') || 'Error loading data');
        }
        setLoading(false);
    };

    const handleSupplierChange = (supplierId) => {
        setFormData({
            ...formData,
            supplier_id: supplierId,
            invoice_id: '',
            items: []
        });
        setSelectedInvoiceItems([]);
    };

    const handleInvoiceChange = async (invoiceId) => {
        if (!invoiceId) {
            setFormData({ ...formData, invoice_id: '', items: [] });
            setSelectedInvoiceItems([]);
            return;
        }

        try {
            const invoice = await window.api.invoices.getById(invoiceId);
            if (!invoice) {
                toast.error(t('invoice_not_found') || 'Invoice not found');
                return;
            }

            // Fetch previous returns for this invoice
            const allReturns = returns.filter(r => r.invoice_id === parseInt(invoiceId));
            const prevReturnedQty = {};
            for (const ret of allReturns) {
                for (const item of ret.items || []) {
                    if (item.product_id) {
                        prevReturnedQty[item.product_id] = (prevReturnedQty[item.product_id] || 0) + item.quantity;
                    }
                }
            }

            // Map items with purchased quantity, returned quantity, and current return quantity
            const items = (invoice.items || []).map(item => {
                const alreadyReturned = prevReturnedQty[item.product_id] || 0;
                const remaining = Math.max(0, item.quantity - alreadyReturned);
                return {
                    product_id: item.product_id,
                    description: item.description || item.product_name,
                    sold_quantity: item.quantity,
                    already_returned: alreadyReturned,
                    remaining: remaining,
                    unit_price: item.unit_price,
                    quantity: 0, // Current return quantity
                    total: 0
                };
            }).filter(item => item.remaining > 0);

            setSelectedInvoiceItems(items);
            setFormData({
                ...formData,
                invoice_id: invoiceId,
                items: []
            });
        } catch (e) {
            console.error('Error fetching invoice details:', e);
            toast.error(t('inv_loadError') || 'Error loading invoice');
        }
    };

    const handleReturnQtyChange = (index, value) => {
        const qty = parseFloat(value) || 0;
        const newItems = [...selectedInvoiceItems];
        const item = newItems[index];

        if (qty > item.remaining) {
            toast.error(`${t('ret_stockError') || 'Returned quantity exceeds the quantity available for return'} (المتاح: ${item.remaining})`);
            return;
        }

        item.quantity = qty;
        item.total = qty * item.unit_price;
        setSelectedInvoiceItems(newItems);

        // Update formData items (only items with quantity > 0)
        const activeItems = newItems
            .filter(it => it.quantity > 0)
            .map(it => ({
                product_id: it.product_id,
                description: it.description,
                quantity: it.quantity,
                unit_price: it.unit_price,
                total: it.total
            }));

        setFormData(prev => ({
            ...prev,
            items: activeItems
        }));
    };

    const calculateReturnTotals = () => {
        const subtotal = selectedInvoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const total = subtotal; // Simpler returns without extra calculations
        return { subtotal, total };
    };

    const openModal = () => {
        setFormData({
            supplier_id: '',
            invoice_id: '',
            date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            payment_account_id: bankAccounts[0]?.id || '',
            notes: '',
            items: []
        });
        setSelectedInvoiceItems([]);
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.supplier_id) {
            setError(t('supplier_required') || 'يجب اختيار المورد');
            return;
        }

        const validItems = formData.items.filter(it => it.quantity > 0);
        if (validItems.length === 0) {
            setError(t('ret_noItems') || 'يرجى إضافة منتجات للإرجاع بكميات صحيحة');
            return;
        }

        setSaving(true);
        try {
            const { subtotal, total } = calculateReturnTotals();
            const returnData = {
                ...formData,
                type: 'purchase_return',
                subtotal,
                total,
                refunded_amount: total,
                created_by: user?.id || null
            };

            const result = await window.api.returns.create(returnData);
            if (result.success) {
                toast.success(t('return_success') || 'Return registered successfully!');
                closeModal();
                loadData();
            } else {
                setError(result.error || 'حدث خطأ أثناء حفظ المرتجع');
            }
        } catch (err) {
            console.error(err);
            setError(t('errorOccurred') || 'Error occurred');
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('return_delete_confirm') || 'هل أنت متأكد من حذف هذا المرتجع؟ سيتم تعديل المخازن والحسابات.')) {
            return;
        }

        try {
            const result = await window.api.returns.delete(id);
            if (result.success) {
                toast.success(t('return_deleted') || 'Return deleted successfully!');
                loadData();
            } else {
                toast.error(result.error || 'حدث خطأ أثناء الحذف');
            }
        } catch (e) {
            console.error('Error deleting return:', e);
            toast.error(t('errorOccurred') || 'Error occurred');
        }
    };

    const handleViewDetails = (ret) => {
        setSelectedReturn(ret);
        setShowViewModal(true);
    };

    // Filter and Search
    const filteredReturns = returns.filter(ret => {
        const matchesSearch = ret.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (ret.invoice_number && ret.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (ret.notes && ret.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesSupplier = !supplierFilter || String(ret.supplier_id) === supplierFilter;
        return matchesSearch && matchesSupplier;
    });

    const formatCurrency = (val) => {
        const decimalPlaces = parseInt(window.localStorage.getItem('decimal_places') || '3');
        return parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
    };

    if (!canView) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3>{t('permissionDenied') || 'صلاحية غير كافية للدخول'}</h3>
            </div>
        );
    }

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const { subtotal: currentSubtotal, total: currentTotal } = calculateReturnTotals();

    // Invoices list filtered by selected supplier
    const supplierInvoices = invoices.filter(inv => inv.supplier_id === parseInt(formData.supplier_id));

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('search') || 'بحث...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingRight: '40px', width: '220px', margin: 0 }}
                    />
                    <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                {/* Supplier Filter */}
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={suppliers.map(s => ({ value: String(s.id), label: s.name }))}
                        value={supplierFilter}
                        onChange={setSupplierFilter}
                        placeholder={t('all') || 'كل الموردين'}
                        emptyLabel={t('all') || 'كل الموردين'}
                    />
                </div>
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {filteredReturns.length} {t('purchase_returns')}
                </span>
                {canCreate && (
                    <button className="btn btn-primary" onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={16} />
                        {t('add_return') || 'إرجاع مشتريات'}
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="table-responsive" style={{ background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>{t('return_number') || 'رقم المرتجع'}</th>
                            <th>{t('original_invoice') || 'الفاتورة الأصلية'}</th>
                            <th>{t('supplier') || 'المورد'}</th>
                            <th>{t('date') || 'التاريخ'}</th>
                            <th>{t('total') || 'الإجمالي'}</th>
                            <th>{t('payment_method') || 'طريقة الرد'}</th>
                            <th>{t('actions') || 'الإجراءات'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredReturns.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    {t('no_records') || 'لا توجد بيانات لعرضها'}
                                </td>
                            </tr>
                        ) : (
                            filteredReturns.map(ret => (
                                <tr key={ret.id}>
                                    <td><strong>{ret.return_number}</strong></td>
                                    <td>{ret.invoice_number || '-'}</td>
                                    <td>{ret.supplier_name || '-'}</td>
                                    <td>{ret.date}</td>
                                    <td>{formatCurrency(ret.total)}</td>
                                    <td>{ret.payment_method === 'bank' ? t('bank') || 'بنك' : t('cash') || 'نقداً'}</td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleViewDetails(ret)} title={t('view')}>
                                                <Eye size={16} />
                                            </button>
                                            {canDelete && (
                                                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(ret.id)} title={t('delete')}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Modal */}
            <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={t('return_details') || 'تفاصيل المرتجع'} size="lg">
                {selectedReturn && (
                    <div style={{ padding: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('return_number') || 'رقم المرتجع'}</p>
                                <p style={{ margin: '4px 0', fontWeight: 'bold', fontSize: '1.1rem' }}>{selectedReturn.return_number}</p>
                            </div>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('original_invoice') || 'الفاتورة الأصلية'}</p>
                                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>{selectedReturn.invoice_number || '-'}</p>
                            </div>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('supplier') || 'المورد'}</p>
                                <p style={{ margin: '4px 0' }}>{selectedReturn.supplier_name || '-'}</p>
                            </div>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('date') || 'التاريخ'}</p>
                                <p style={{ margin: '4px 0' }}>{selectedReturn.date}</p>
                            </div>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('payment_method') || 'طريقة الرد'}</p>
                                <p style={{ margin: '4px 0' }}>{selectedReturn.payment_method === 'bank' ? (t('bank') || 'بنك') : (t('cash') || 'نقداً')}</p>
                            </div>
                            <div>
                                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('total') || 'الإجمالي'}</p>
                                <p style={{ margin: '4px 0', fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>{formatCurrency(selectedReturn.total)}</p>
                            </div>
                        </div>

                        {selectedReturn.notes && (
                            <div style={{ marginBottom: '20px', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('notes') || 'ملاحظات'}</p>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{selectedReturn.notes}</p>
                            </div>
                        )}

                        <h4 style={{ marginBottom: '10px' }}>{t('return_items') || 'الأصناف المرتجعة'}</h4>
                        <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>{t('product') || 'المنتج'}</th>
                                        <th>{t('quantity') || 'الكمية'}</th>
                                        <th>{t('price') || 'السعر'}</th>
                                        <th>{t('total') || 'الإجمالي'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReturn.items && selectedReturn.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.product_name || item.description}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency(item.unit_price)}</td>
                                            <td>{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Return Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={t('add_return') || 'إرجاع مشتريات'} size="lg">
                <form onSubmit={handleSubmit} style={{ padding: '10px' }}>
                    {error && <div style={{ color: 'var(--danger)', padding: '10px', borderRadius: '8px', background: 'var(--danger-light)', marginBottom: '15px', border: '1px solid var(--danger-border)', fontSize: '0.9rem' }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label className="form-label">{t('supplier') || 'المورد'} *</label>
                            <SearchableSelect
                                options={suppliers.map(s => ({ value: String(s.id), label: s.name }))}
                                value={formData.supplier_id}
                                onChange={handleSupplierChange}
                                placeholder={t('select_supplier') || 'اختر المورد...'}
                            />
                        </div>

                        <div>
                            <label className="form-label">{t('original_invoice') || 'الفاتورة الأصلية'}</label>
                            <select
                                className="form-select"
                                value={formData.invoice_id}
                                onChange={(e) => handleInvoiceChange(e.target.value)}
                                disabled={!formData.supplier_id}
                            >
                                <option value="">{t('select_invoice') || 'اختر الفاتورة...'}</option>
                                {supplierInvoices.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.invoice_number} ({inv.date}) - {formatCurrency(inv.total)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">{t('date') || 'التاريخ'} *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="form-label">{t('payment_method') || 'طريقة رد المال'}</label>
                            <select
                                className="form-select"
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="cash">{t('cash') || 'نقداً (من الصندوق)'}</option>
                                <option value="bank">{t('bank') || 'بنك'}</option>
                            </select>
                        </div>

                        {formData.payment_method === 'bank' && (
                            <div>
                                <label className="form-label">{t('bank_account') || 'الحساب البنكي'}</label>
                                <select
                                    className="form-select"
                                    value={formData.payment_account_id}
                                    onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
                                >
                                    {bankAccounts.map(ac => (
                                        <option key={ac.id} value={ac.id}>{ac.name} ({ac.code})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label className="form-label">{t('notes') || 'ملاحظات'}</label>
                        <textarea
                            className="form-input"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows="2"
                            placeholder={t('return_notes_placeholder') || 'أدخل ملاحظات الإرجاع...'}
                        />
                    </div>

                    {selectedInvoiceItems.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '10px' }}>{t('invoice_items') || 'عناصر الفاتورة'}</h4>
                            <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>{t('product') || 'المنتج'}</th>
                                            <th>{t('purchased') || 'المشترى'}</th>
                                            <th>{t('returned') || 'المرتجع'}</th>
                                            <th>{t('unit_price') || 'السعر'}</th>
                                            <th style={{ width: '120px' }}>{t('return_quantity') || 'الكمية المرتجعة'}</th>
                                            <th>{t('total') || 'الإجمالي'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedInvoiceItems.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{item.description}</td>
                                                <td>{item.sold_quantity}</td>
                                                <td>{item.already_returned}</td>
                                                <td>{formatCurrency(item.unit_price)}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input form-input-sm"
                                                        value={item.quantity === 0 ? '' : item.quantity}
                                                        onChange={(e) => handleReturnQtyChange(idx, e.target.value)}
                                                        min="0"
                                                        max={item.remaining}
                                                        step="any"
                                                        style={{ margin: 0, padding: '4px 8px' }}
                                                        placeholder={`حد أقصى ${item.remaining}`}
                                                    />
                                                </td>
                                                <td>{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Return summary */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('refunded') || 'المبلغ المسترد نقداً'}</span>
                            <h3 style={{ margin: '5px 0 0 0', color: 'var(--primary)' }}>{formatCurrency(currentTotal)}</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel')}</button>
                            <button type="submit" className="btn btn-primary" disabled={saving || formData.items.length === 0}>
                                {saving ? (t('saving') || 'جارٍ الحفظ...') : (t('save') || 'حفظ')}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default PurchaseReturns;
