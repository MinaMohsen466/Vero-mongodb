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
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        supplier_id: '',
        invoice_id: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        payment_account_id: '',
        notes: '',
        items: [],
        discount: 0
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
        const suppObj = suppliers.find(s => String(s.id) === String(supplierId));
        const isCashSupp = suppObj && suppObj.code === 'SUPP-CASH';
        setFormData({
            ...formData,
            supplier_id: supplierId,
            invoice_id: '',
            items: [],
            discount: 0,
            payment_method: isCashSupp ? 'cash' : formData.payment_method
        });
        setSelectedInvoiceItems([]);
        setSelectedInvoice(null);
    };

    const handleInvoiceChange = async (invoiceId) => {
        if (!invoiceId) {
            setFormData({ ...formData, invoice_id: '', items: [], discount: 0 });
            setSelectedInvoiceItems([]);
            setSelectedInvoice(null);
            return;
        }

        try {
            const invoice = await window.api.invoices.getById(invoiceId);
            if (!invoice) {
                toast.error(t('invoice_not_found') || 'Invoice not found');
                return;
            }
            setSelectedInvoice(invoice);

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
                // Default return price to net unit price paid (total / quantity) if available, otherwise original unit price
                const netPricePaid = item.quantity > 0 ? (item.total / item.quantity) : item.unit_price;
                return {
                    product_id: item.product_id,
                    description: item.description || item.product_name,
                    sold_quantity: item.quantity,
                    already_returned: alreadyReturned,
                    remaining: remaining,
                    unit_price: netPricePaid,
                    original_price: item.unit_price,
                    quantity: 0, // Current return quantity
                    total: 0
                };
            }).filter(item => item.remaining > 0);

            setSelectedInvoiceItems(items);
            setFormData({
                ...formData,
                invoice_id: invoiceId,
                items: [],
                discount: 0
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

        // Calculate proportional discount automatically
        let autoDiscount = 0;
        const newSubtotal = newItems.reduce((sum, it) => sum + (it.total || 0), 0);
        if (selectedInvoice) {
            const itemsSubtotal = (selectedInvoice.items || []).reduce((sum, it) => sum + (it.total || 0), 0);
            const invoiceLevelDiscount = Math.max(0, itemsSubtotal - (selectedInvoice.total || 0));
            if (itemsSubtotal > 0 && invoiceLevelDiscount > 0) {
                autoDiscount = newSubtotal * (invoiceLevelDiscount / itemsSubtotal);
            }
        }

        setFormData(prev => ({
            ...prev,
            items: activeItems,
            discount: parseFloat(autoDiscount.toFixed(3))
        }));
    };

    const handleReturnUnitPriceChange = (index, value) => {
        const price = parseFloat(value) || 0;
        const newItems = [...selectedInvoiceItems];
        const item = newItems[index];

        item.unit_price = price;
        item.total = item.quantity * price;
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

        // Calculate proportional discount automatically
        let autoDiscount = 0;
        const newSubtotal = newItems.reduce((sum, it) => sum + (it.total || 0), 0);
        if (selectedInvoice) {
            const itemsSubtotal = (selectedInvoice.items || []).reduce((sum, it) => sum + (it.total || 0), 0);
            const invoiceLevelDiscount = Math.max(0, itemsSubtotal - (selectedInvoice.total || 0));
            if (itemsSubtotal > 0 && invoiceLevelDiscount > 0) {
                autoDiscount = newSubtotal * (invoiceLevelDiscount / itemsSubtotal);
            }
        }

        setFormData(prev => ({
            ...prev,
            items: activeItems,
            discount: parseFloat(autoDiscount.toFixed(3))
        }));
    };

    const calculateReturnTotals = () => {
        const subtotal = selectedInvoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
        const discount = parseFloat(formData.discount) || 0;
        const total = Math.max(0, subtotal - discount);
        return { subtotal, discount, total };
    };

    const openModal = () => {
        setFormData({
            supplier_id: '',
            invoice_id: '',
            date: new Date().toISOString().split('T')[0],
            payment_method: 'cash',
            payment_account_id: bankAccounts[0]?.id || '',
            notes: '',
            items: [],
            discount: 0
        });
        setSelectedInvoiceItems([]);
        setSelectedInvoice(null);
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedInvoice(null);
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
            const { subtotal, discount, total } = calculateReturnTotals();
            const returnData = {
                ...formData,
                type: 'purchase_return',
                subtotal,
                discount,
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

    const { subtotal: currentSubtotal, discount: currentDiscount, total: currentTotal } = calculateReturnTotals();

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
                        options={suppliers.filter(s => s.code !== 'SUPP-CASH').map(s => ({ value: String(s.id), label: s.name }))}
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
                                    <td>{ret.payment_method === 'bank' ? t('bank') || 'بنك' : ret.payment_method === 'credit' ? t('on_account') || 'على الحساب' : t('cash') || 'نقداً'}</td>
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
                    <div style={{ padding: '15px', color: 'var(--text-primary)' }}>
                        {/* Premium Return Header Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            padding: '20px',
                            marginBottom: '24px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px dashed var(--border)', paddingBottom: '16px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
                                        {t('return_number') || 'رقم المرتجع'}
                                    </span>
                                    <h3 style={{ margin: '4px 0 0 0', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        {selectedReturn.return_number}
                                    </h3>
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10b981',
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        border: '1px solid rgba(16, 185, 129, 0.2)'
                                    }}>
                                        {t('completed') || 'مكتمل'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('original_invoice') || 'الفاتورة الأصلية'}</p>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{selectedReturn.invoice_number || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('supplier') || 'المورد'}</p>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{selectedReturn.supplier_name || '-'}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('date') || 'التاريخ'}</p>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{selectedReturn.date}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('payment_method') || 'طريقة الرد'}</p>
                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>
                                        {selectedReturn.payment_method === 'bank' ? (t('bank') || 'بنك') : selectedReturn.payment_method === 'credit' ? (t('on_account') || 'على الحساب') : (t('cash') || 'نقداً')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {selectedReturn.notes && (
                            <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(243, 244, 246, 0.5)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>{t('notes') || 'ملاحظات'}</p>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedReturn.notes}</p>
                            </div>
                        )}

                        <h4 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                            <span>📋</span> {t('return_items') || 'الأصناف المرتجعة'}
                        </h4>
                        <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
                            <table className="table table-sm" style={{ margin: 0 }}>
                                <thead style={{ background: 'var(--bg-secondary)' }}>
                                    <tr>
                                        <th style={{ padding: '10px 12px' }}>{t('product') || 'المنتج'}</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>{t('quantity') || 'الكمية'}</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('price') || 'السعر'}</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>{t('total') || 'الإجمالي'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedReturn.items && selectedReturn.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '10px 12px' }}><strong>{item.product_name || item.description}</strong></td>
                                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Invoice Summary Box */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            padding: '16px 20px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            maxWidth: '320px',
                            marginLeft: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{t('subtotal') || 'الإجمالي الفرعي'}:</span>
                                <span style={{ fontWeight: '600' }}>{formatCurrency(selectedReturn.subtotal)}</span>
                            </div>
                            {selectedReturn.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--danger)' }}>
                                    <span>{t('discount') || 'الخصم'}:</span>
                                    <span style={{ fontWeight: '600' }}>- {formatCurrency(selectedReturn.discount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{t('total') || 'الإجمالي الصافي'}:</span>
                                <span style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--primary)' }}>{formatCurrency(selectedReturn.total)}</span>
                            </div>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label className="form-label" style={{ margin: 0 }}>{t('supplier') || 'المورد'} *</label>
                                {formData.supplier_id && (() => {
                                    const supp = suppliers.find(s => String(s.id) === String(formData.supplier_id));
                                    if (!supp) return null;
                                    const balanceVal = supp.balance || 0;
                                    const isCredit = balanceVal > 0;
                                    return (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            color: isCredit ? 'var(--danger)' : 'var(--success)',
                                            background: isCredit ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            border: `1px solid ${isCredit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)'}`
                                        }}>
                                            الرصيد الحالي: {formatCurrency(Math.abs(balanceVal))} {isCredit ? '(دائن)' : '(مدين)'}
                                        </span>
                                    );
                                })()}
                            </div>
                            <SearchableSelect
                                options={[...suppliers].sort((a, b) => (a.code === 'SUPP-CASH' ? -1 : b.code === 'SUPP-CASH' ? 1 : 0)).map(s => ({ value: String(s.id), label: s.name }))}
                                value={formData.supplier_id}
                                onChange={handleSupplierChange}
                                placeholder={t('select_supplier') || 'اختر المورد...'}
                            />
                        </div>

                        <div>
                            <label className="form-label">{t('original_invoice') || 'الفاتورة الأصلية'}</label>
                            <SearchableSelect
                                options={supplierInvoices.map(inv => {
                                    const productNames = (inv.items || []).map(it => it.product_name || it.description || '').join(' ');
                                    return {
                                        value: String(inv.id),
                                        label: `${inv.invoice_number} (${inv.date}) - ${formatCurrency(inv.total)}`,
                                        searchKeywords: productNames
                                    };
                                })}
                                value={formData.invoice_id}
                                onChange={handleInvoiceChange}
                                placeholder={t('select_invoice') || 'اختر الفاتورة...'}
                                emptyLabel={t('select_invoice') || 'اختر الفاتورة...'}
                                disabled={!formData.supplier_id}
                            />
                        </div>

                        {selectedInvoice && (
                            <div style={{
                                gridColumn: '1 / -1',
                                background: 'rgba(37, 99, 235, 0.05)',
                                border: '1px dashed var(--primary)',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.88rem',
                                color: 'var(--text-primary)',
                                margin: '5px 0'
                            }}>
                                    {(() => {
                                        const itemsSubtotal = (selectedInvoice.items || []).reduce((sum, it) => sum + (it.total || 0), 0);
                                        const offersDiscount = Math.max(0, selectedInvoice.subtotal - itemsSubtotal);
                                        const manualDiscount = selectedInvoice.manual_discount || 0;
                                        const couponDiscount = Math.max(0, (itemsSubtotal - selectedInvoice.total) - manualDiscount);

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div>
                                                    <span>ℹ️ <strong>تفاصيل الفاتورة الأصلية:</strong> </span>
                                                    <span style={{ margin: '0 8px' }}></span>
                                                    <span>الإجمالي قبل الخصم: <strong style={{color:'var(--primary)'}}>{formatCurrency(selectedInvoice.subtotal)}</strong></span>
                                                    <span style={{ margin: '0 8px' }}>|</span>
                                                    <span>الصافي المدفوع: <strong>{formatCurrency(selectedInvoice.total)}</strong></span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                    {offersDiscount > 0 && <span>🏷️ خصم عروض المنتجات: <strong style={{color:'var(--danger)'}}>-{formatCurrency(offersDiscount)}</strong></span>}
                                                    {couponDiscount > 0 && <span>🎫 خصم الكوبون: <strong style={{color:'var(--danger)'}}>-{formatCurrency(couponDiscount)}</strong></span>}
                                                    {manualDiscount > 0 && <span>💸 خصم إضافي (يدوي): <strong style={{color:'var(--danger)'}}>-{formatCurrency(manualDiscount)}</strong></span>}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                {selectedInvoice.discount > 0 && (
                                    <span style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        خصم {((selectedInvoice.discount / selectedInvoice.subtotal) * 100).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        )}

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
                                {(() => {
                                    const suppObj = suppliers.find(s => String(s.id) === String(formData.supplier_id));
                                    const isCashSupp = suppObj && suppObj.code === 'SUPP-CASH';
                                    return !isCashSupp && (
                                        <option value="credit">{t('on_account') || 'على الحساب (خصم من المديونية)'}</option>
                                    );
                                })()}
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
                                            <th style={{ width: '130px' }}>{t('unit_price') || 'سعر الإرجاع'}</th>
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
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-input form-input-sm"
                                                        value={item.unit_price === 0 ? '' : item.unit_price}
                                                        onChange={(e) => handleReturnUnitPriceChange(idx, e.target.value)}
                                                        min="0"
                                                        step="any"
                                                        style={{
                                                            margin: 0,
                                                            padding: '4px 8px',
                                                            width: '100px',
                                                            borderColor: 'var(--border)',
                                                            borderRadius: '6px',
                                                            textAlign: 'center'
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                </td>
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
                                                <td style={{ fontWeight: '600' }}>{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Return summary and discount */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '24px',
                            marginBottom: '20px',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {t('subtotal') || 'إجمالي الأصناف المرتجعة'}
                                </span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: '600' }}>
                                    {formatCurrency(currentSubtotal)}
                                </h4>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label className="form-label" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {t('return_discount') || 'الخصم على المرتجع'}
                                </label>
                                <input
                                    type="number"
                                    className="form-input form-input-sm"
                                    value={formData.discount === 0 ? '' : formData.discount}
                                    onChange={(e) => {
                                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                                        setFormData(prev => ({ ...prev, discount: val }));
                                    }}
                                    min="0"
                                    max={currentSubtotal}
                                    step="any"
                                    style={{
                                        margin: 0,
                                        padding: '6px 12px',
                                        width: '130px',
                                        fontWeight: '600',
                                        color: 'var(--danger)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px'
                                    }}
                                    placeholder="0.00"
                                />
                            </div>
                            
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    {t('refunded') || 'المبلغ الصافي المسترد'}
                                </span>
                                <h3 style={{ margin: '4px 0 0 0', color: 'var(--primary)', fontSize: '1.6rem', fontWeight: '700' }}>
                                    {formatCurrency(currentTotal)}
                                </h3>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ padding: '8px 20px', borderRadius: '8px' }}>
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || formData.items.length === 0}
                                style={{ padding: '8px 24px', borderRadius: '8px', fontWeight: '600' }}
                            >
                                {saving ? (t('saving') || 'جارٍ الحفظ...') : (t('save') || 'حفظ المرتجع')}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default PurchaseReturns;


