import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Trash2, Search, ShoppingBag, Printer, X, Edit, Download } from 'lucide-react';
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

    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(50);

    const emptyForm = () => {
        const defaultSupp = suppliers.find(s => s.code === 'SUPP-CASH');
        return {
            supplier_id: defaultSupp ? String(defaultSupp.id) : '', 
            date: new Date().toISOString().split('T')[0], 
            due_date: '', 
            notes: '',
            status: 'paid', 
            payment_method: 'cash', 
            payment_account_id: '', 
            paid: 0, 
            image: '',
            manual_discount: 0,
            items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }]
        };
    };

    const [formData, setFormData] = useState(emptyForm());
    const searchInputRef = React.useRef(null);

    const productOptions = useMemo(() => {
        return products.map(p => ({ value: String(p.id), label: p.name, subLabel: p.code }));
    }, [products]);

    const supplierOptions = useMemo(() => {
        return [...suppliers].sort((a, b) => a.code === 'SUPP-CASH' ? -1 : b.code === 'SUPP-CASH' ? 1 : 0).map(s => ({ value: String(s.id), label: s.name }));
    }, [suppliers]);

    const supplierFilterOptions = useMemo(() => {
        return suppliers.map(s => ({ value: String(s.id), label: s.name }));
    }, [suppliers]);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#purchase-invoice-form button[type="submit"]') || document.querySelector('button[form="purchase-invoice-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.purchase_invoices?.can_create) openModal();
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

    useEffect(() => {
        setVisibleInvoicesCount(50);
    }, [searchQuery, statusFilter, supplierFilter, dateFrom, dateTo]);

    useEffect(() => {
        const savedDraft = localStorage.getItem('purchase_invoice_draft');
        if (savedDraft) {
            try {
                const { showModal: savedShow, formData: savedForm, editMode: savedEdit, editingId: savedId } = JSON.parse(savedDraft);
                if (savedShow) {
                    setShowModal(savedShow);
                    setFormData(savedForm);
                    setEditMode(savedEdit);
                    setEditingId(savedId);
                }
            } catch (e) {
                console.error('Error parsing purchase draft:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (showModal) {
            localStorage.setItem('purchase_invoice_draft', JSON.stringify({ showModal, formData, editMode, editingId }));
        } else {
            localStorage.removeItem('purchase_invoice_draft');
        }
    }, [showModal, formData, editMode, editingId]);

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
        const manualDiscount = parseFloat(formData.manual_discount) || 0;
        const total = Math.max(0, subtotal - manualDiscount);
        return { subtotal, total, manualDiscount };
    };

    const handleProductChange = (index, productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        const newItems = [...formData.items];
        newItems[index] = {
            ...newItems[index],
            product_id: productId,
            description: product?.name || '',
            unit_price: product?.purchase_price || 0,
            unit: product?.unit || '',
            total: calculateItemTotal({ ...newItems[index], unit_price: product?.purchase_price || 0 })
        };
        // Auto-add new row if product was selected on the last row
        if (productId && index === newItems.length - 1) {
            newItems.push({ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' });
        }
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        newItems[index].total = calculateItemTotal(newItems[index]);
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }] });
    const removeItem = (index) => formData.items.length > 1 && setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validItems = formData.items.filter(item => (item.product_id || item.description) && item.quantity > 0);
        const totals = calculateTotals();
        if (totals.manualDiscount > totals.subtotal) {
            setError('قيمة الخصم لا يمكن أن تتجاوز قيمة الفاتورة');
            return;
        }
        if (validItems.length === 0) {
            setError(t('inv_noItems'));
            return;
        }

        // Require supplier for unpaid invoices
        const selectedSupplierObj = suppliers.find(s => String(s.id) === String(formData.supplier_id));
        if (formData.status !== 'paid' && (!formData.supplier_id || (selectedSupplierObj && selectedSupplierObj.code === 'SUPP-CASH'))) {
            setError(t('cash_supplier_no_credit') || 'لا يمكن إجراء عملية شراء آجل من المورد النقدي');
            return;
        }

        if (formData.status === 'partial') {
            const totals = calculateTotals();
            const paidVal = parseFloat(formData.paid) || 0;
            if (paidVal <= 0) {
                setError('يجب إدخال مبلغ مدفوع أكبر من الصفر للدفع الجزئي');
                return;
            }
            if (paidVal >= totals.total) {
                setError('المبلغ المدفوع يجب أن يكون أقل من إجمالي الفاتورة للدفع الجزئي');
                return;
            }
        }

        setSaving(true);
        try {
            const totals = calculateTotals();
            let paidAmount = 0;
            if (formData.status === 'paid') {
                paidAmount = totals.total;
            } else if (formData.status === 'partial') {
                paidAmount = parseFloat(formData.paid) || 0;
            }
            const invoiceData = {
                type: 'purchase',
                supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
                date: formData.date,
                due_date: formData.due_date || null,
                notes: formData.notes,
                subtotal: totals.subtotal,
                discount: totals.manualDiscount,
                manual_discount: totals.manualDiscount,
                tax: 0,
                total: totals.total,
                paid: paidAmount,
                status: formData.status,
                payment_method: (formData.status === 'paid' || formData.status === 'partial') ? formData.payment_method : 'credit',
                payment_account_id: formData.payment_account_id ? parseInt(formData.payment_account_id) : null,
                image: formData.image || null,
                items: validItems.map(item => ({
                    product_id: item.product_id ? parseInt(item.product_id) : null,
                    description: item.description,
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount: parseFloat(item.discount) || 0,
                    tax: 0,
                    total: parseFloat(item.total) || 0,
                    color: item.color || null,
                    unit: item.unit || null
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
                toast.success(t('savedSuccess') || (editMode ? 'Invoice updated successfully' : 'Invoice saved successfully'));
                await loadData();
                closeModal();

                // Open the in-app invoice preview immediately
                const targetId = editMode ? editingId : result.id;
                if (targetId) {
                    try {
                        const freshSettings = await window.api.settings.getAll();
                        setSettings(freshSettings || {});
                        const invoice = await window.api.invoices.getById(targetId);
                        setSelectedInvoice(invoice);
                        setShowPrintPreview(true);
                    } catch (e) {
                        console.error('Error opening preview after save:', e);
                    }
                }
            } else {
                const errorMsg = result.error || t('inv_saveError') || 'Error saving invoice';
                setError(errorMsg);
                toast.error(errorMsg);
            }
        } catch (e) {
            console.error('Error saving invoice:', e);
            const errorMsg = (t('inv_saveError') || 'Error') + ': ' + e.message;
            setError(errorMsg);
            toast.error(errorMsg);
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (confirm((t('inv_deleteConfirm') || 'Are you sure you want to delete this invoice?') + ' ' + (t('pinv_deleteNote') || ''))) {
            try {
                const result = await window.api.invoices.delete(id);
                if (result.success) {
                    toast.success(t('deletedSuccess') || 'Invoice deleted successfully');
                    loadData();
                } else {
                    toast.error((t('errorOccurred') || 'Error occurred') + ': ' + (result.error || t('deleteFailed') || 'Delete failed'));
                }
            } catch (error) {
                console.error('Error deleting invoice:', error);
                toast.error(t('errorOccurred') || 'Error occurred while deleting invoice');
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
                toast.error(t('inv_loadError'));
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
                    total: Number(item.total) || 0,
                    color: item.color || '',
                    unit: item.unit || ''
                }));
                console.log('[handleEdit] Mapped items:', mappedItems);
            } else {
                console.log('[handleEdit] No items found, using empty row');
                mappedItems = [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }];
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
                paid: invoice.paid || 0,
                image: invoice.image || '',
                manual_discount: invoice.manual_discount || 0,
                items: mappedItems
            });

            // Open the modal
            setShowModal(true);
        } catch (err) {
            console.error('[handleEdit] Error:', err);
            toast.error(t('inv_loadError') + ': ' + err.message);
        }
    };

    const viewInvoice = async (id) => {
        try {
            // Reload fresh settings to get latest logo/terms
            const freshSettings = await window.api.settings.getAll();
            setSettings(freshSettings || {});

            const invoice = await window.api.invoices.getById(id);
            setSelectedInvoice(invoice);
            setShowPrintPreview(true);
        } catch (e) {
            console.error('[PurchaseInvoices.viewInvoice] Error:', e);
        }
    };

    const openModal = () => {
        setError('');
        setEditMode(false);
        setEditingId(null);
        const cashSupp = suppliers.find(s => s.code === 'SUPP-CASH');
        const defaultForm = emptyForm();
        if (cashSupp) {
            defaultForm.supplier_id = String(cashSupp.id);
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

    const handleImageUpload = async () => {
        try {
            const result = await window.api.dialog.openFile({
                properties: ['openFile'],
                filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const base64 = await window.api.file.readAsBase64(result.filePaths[0]);
                if (base64) {
                    const img = new Image();
                    img.src = base64;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_DIMENSION = 600;

                        if (width > height) {
                            if (width > MAX_DIMENSION) {
                                height = Math.round(height * (MAX_DIMENSION / width));
                                width = MAX_DIMENSION;
                            }
                        } else {
                            if (height > MAX_DIMENSION) {
                                width = Math.round(width * (MAX_DIMENSION / height));
                                height = MAX_DIMENSION;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        setFormData(prev => ({ ...prev, image: compressedBase64 }));
                    };
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(t('errorOccurred') || 'An error occurred while uploading the image');
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));

    const getStatusLabel = (status) => {
        if (status === 'paid') return t('inv_paid') || 'مدفوعة';
        if (status === 'partial') return t('inv_partial') || 'مدفوعة جزئياً';
        if (status === 'cancelled') return t('inv_cancelled') || 'ملغاة';
        return t('inv_pending') || 'آجلة (غير مدفوعة)';
    };

    const filteredInvoices = invoices.filter(inv => {
        const q = searchQuery.toLowerCase().trim();
        const statusLbl = (getStatusLabel(inv.status) || '').toLowerCase();
        const matchesSearch = !q ||
            inv.invoice_number?.toLowerCase().includes(q) || 
            inv.supplier_name?.toLowerCase().includes(q) ||
            statusLbl.includes(q) ||
            (inv.status === 'pending' && (q.includes('آجل') || q.includes('اجل') || q.includes('غير مدفوع'))) ||
            (inv.status === 'partial' && (q.includes('جزئ') || q.includes('جزئي'))) ||
            (inv.status === 'paid' && q.includes('مدفوع')) ||
            (inv.items || []).some(item => 
                item.product_name?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q)
            );
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const matchesSupplier = !supplierFilter || String(inv.supplier_id) === supplierFilter;
        const matchesDateFrom = !dateFrom || inv.date >= dateFrom;
        const matchesDateTo = !dateTo || inv.date <= dateTo;
        return matchesSearch && matchesStatus && matchesSupplier && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => {
        // Sort by date descending, then by id descending
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id - a.id;
    });

    const exportCSV = async () => {
        const rows = [[
            t('inv_number') || 'Invoice Number',
            t('pinv_supplier') || 'Supplier',
            t('date') || 'Date',
            t('subtotal') || 'Subtotal',
            t('discount') || 'Discount',
            t('total') || 'Total',
            t('status') || 'Status',
            t('notes') || 'Notes'
        ]];
        filteredInvoices.forEach(inv => {
            rows.push([
                inv.invoice_number || '',
                inv.supplier_name || '',
                inv.date || '',
                inv.subtotal || 0,
                inv.discount || 0,
                inv.total || 0,
                inv.status === 'paid' ? (t('inv_paid') || 'Paid') : (t('inv_credit') || 'Credit'),
                inv.notes || ''
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        await window.api.file.saveText({ content: csv, defaultName: 'Purchase_Invoices.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                {/* Search */}
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
                    style={{ width: '160px', margin: 0 }}>
                    <option value="all">{t('all') || 'كل الحالات'}</option>
                    <option value="paid">{t('inv_paid') || 'مدفوعة'}</option>
                    <option value="pending">{t('inv_pending') || 'آجلة (غير مدفوعة)'}</option>
                    <option value="partial">{t('inv_partial') || 'مدفوعة جزئياً'}</option>
                </select>
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={supplierFilterOptions}
                        value={supplierFilter}
                        onChange={setSupplierFilter}
                        placeholder={t('all') || "All Suppliers"}
                        emptyLabel={t('all') || "All Suppliers"}
                    />
                </div>
                <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('from_date') || "From Date"} />
                <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('to_date') || "To Date"} />
                {(searchQuery || statusFilter !== 'all' || supplierFilter || dateFrom || dateTo) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setSupplierFilter(''); setDateFrom(''); setDateTo(''); }}
                        style={{ color: 'var(--text-muted)' }}>✕ {t('clear') || 'Clear'}</button>
                )}
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filteredInvoices.length} {t('menu_purchases')}</span>
                <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
                    <Download size={16} /> CSV
                </button>
                {(user?.role === 'admin' || user?.permissions?.purchase_invoices?.can_create) && (
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
                                    {filteredInvoices.slice(0, visibleInvoicesCount).map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-bold">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {inv.invoice_number}
                                                    {inv.image && (
                                                        <span 
                                                            title={t('invoice_attachment') || 'يحتوي على مرفق صور'}
                                                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: '0.85rem' }}
                                                            onClick={(e) => { e.stopPropagation(); viewInvoice(inv.id); }}
                                                        >
                                                            📎
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{inv.supplier_name || '-'}</td>
                                            <td>
                                                <div>{new Date(inv.date).toLocaleDateString('en-GB')}</div>
                                                {inv.created_at && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {parseDbDate(inv.created_at).toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="font-bold">{formatCurrency(inv.total)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{getStatusLabel(inv.status)}</span>
                                                    {(inv.status === 'paid' || inv.status === 'partial') && inv.payment_method && inv.payment_method !== 'credit' && (
                                                        <span style={{ fontSize: '11px', color: '#666', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                                                            {inv.payment_method === 'bank' ? (t('inv_bank') || 'بنكي') : inv.payment_method === 'cash' ? (t('inv_cash') || 'نقدي') : inv.payment_method}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    {(user?.role === 'admin' || user?.permissions?.purchase_invoices?.can_view) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.purchase_invoices?.can_edit) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv.id)} title={t('edit')}><Edit size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.purchase_invoices?.can_view) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_print')}><Printer size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.purchase_invoices?.can_delete) && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(inv.id)} title={t('delete')}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredInvoices.length > visibleInvoicesCount && (
                                <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => setVisibleInvoicesCount(prev => prev + 50)}
                                        style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                                    >
                                        {t('load_more') || 'تحميل المزيد'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? t('pinv_edit') || 'Edit Purchase Invoice' : t('pinv_add') || 'New Purchase Invoice'} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel') || 'Cancel'} (Esc)</button><button type="submit" form="purchase-invoice-form" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-btn" style={{ marginInlineEnd: '8px' }}></span>}{saving ? (t('savingProgress') || 'Saving...') : (t('save') || 'Save') + ' (Ctrl+S)'}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form id="purchase-invoice-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    
                    {/* Card 1: معلومات الفاتورة الأساسية */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                            📄 {t('invoice_details') || 'معلومات الفاتورة الأساسية'}
                        </div>
                        <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: '600' }}>{t('pinv_supplier')}</label>
                                <SearchableSelect
                                    options={supplierOptions}
                                    value={formData.supplier_id ? String(formData.supplier_id) : ''}
                                    onChange={(val) => {
                                        const selected = suppliers.find(s => String(s.id) === String(val));
                                        const isCash = selected && selected.code === 'SUPP-CASH';
                                        setFormData(prev => {
                                            const newStatus = isCash ? 'paid' : prev.status;
                                            return {
                                                ...prev,
                                                supplier_id: val,
                                                status: newStatus,
                                                paid: newStatus === 'paid' ? calculateTotals().total : prev.paid
                                            };
                                        });
                                    }}
                                    placeholder={t('pinv_selectSupplier')}
                                    emptyLabel={t('pinv_selectSupplier')}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontWeight: '600' }}>{t('inv_date')}</label><input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} style={{ height: '40px' }} /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label" style={{ fontWeight: '600' }}>{t('inv_dueDate')}</label><input type="date" className="form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} style={{ height: '40px' }} /></div>
                        </div>

                        <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: '600' }}>{t('inv_status')}</label>
                                <select className="form-select" value={formData.status} onChange={(e) => {
                                    const newStatus = e.target.value;
                                    let newPaid = formData.paid;
                                    if (newStatus === 'paid') {
                                        newPaid = calculateTotals().total;
                                    } else if (newStatus === 'pending') {
                                        newPaid = 0;
                                    }
                                    setFormData({ ...formData, status: newStatus, paid: newPaid });
                                }} style={{ height: '40px' }}>
                                    <option value="paid">{t('inv_paid')}</option>
                                    <option value="partial" disabled={(() => {
                                        const selected = suppliers.find(s => String(s.id) === String(formData.supplier_id));
                                        return selected && selected.code === 'SUPP-CASH';
                                    })()}>{t('inv_partial')}</option>
                                    <option value="pending" disabled={(() => {
                                        const selected = suppliers.find(s => String(s.id) === String(formData.supplier_id));
                                        return selected && selected.code === 'SUPP-CASH';
                                    })()}>{t('inv_credit')}</option>
                                </select>
                            </div>
                            {(formData.status === 'paid' || formData.status === 'partial') && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: '600' }}>{t('inv_paymentMethod')}</label>
                                    <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} style={{ height: '40px' }}>
                                        <option value="cash">{t('inv_cash')}</option>
                                        <option value="bank">{t('inv_bank')}</option>
                                    </select>
                                </div>
                            )}
                            {formData.status === 'partial' && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontWeight: '600' }}>{t('paid_amount')} *</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={formData.paid} 
                                        onChange={(e) => setFormData({ ...formData, paid: parseFloat(e.target.value) || 0 })} 
                                        step="0.250"
                                        min="0"
                                        required 
                                        style={{ height: '40px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: بنود الفاتورة */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                            📦 {t('inv_product') || 'أصناف الفاتورة'}
                        </div>
                        <div className="table-container" style={{ margin: 0 }}>
                            <table>
                                <thead><tr><th style={{ width: '200px' }}>{t('inv_product')}</th><th>{t('description')}</th><th style={{ width: '120px' }}>{t('inv_quantity')}</th><th style={{ width: '100px' }}>{t('inv_unitPrice')}</th>{settings?.general?.enable_product_color === 'yes' && <th style={{ width: '100px' }}>{t('color') || 'Color'}</th>}<th style={{ width: '100px' }}>{t('inv_itemTotal')}</th><th style={{ width: '50px' }}></th></tr></thead>
                                <tbody>
                                    {formData.items.map((item, index) => {
                                        const product = products.find(p => p.id === (item.product_id ? parseInt(item.product_id) : null));
                                        const showColorField = settings?.general?.enable_product_color === 'yes' && isColorUnit(product?.unit);
                                        return (
                                        <tr key={index}>
                                            <td style={{ minWidth: '200px' }}>
                                                <SearchableSelect
                                                    options={productOptions}
                                                    value={item.product_id ? String(item.product_id) : ''}
                                                    onChange={(val) => handleProductChange(index, val)}
                                                    placeholder={t('inv_selectProduct')}
                                                    emptyLabel={t('inv_selectProduct')}
                                                />
                                            </td>
                                            <td><input type="text" className="form-input" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ margin: 0, height: '38px' }} /></td>
                                            <td><input type="number" className="form-input" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} min="1" step="1" style={{ margin: 0, height: '38px' }} /></td>
                                            <td><input type="number" className="form-input" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} step="0.25" style={{ margin: 0, height: '38px' }} /></td>
                                            {showColorField && <td><input type="text" className="form-input" placeholder={t('color') || 'Color'} value={item.color || ''} onChange={(e) => handleItemChange(index, 'color', e.target.value)} style={{ margin: 0, height: '38px' }} /></td>}
                                            <td className="font-bold" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(calculateItemTotal(item))}</td>
                                            <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeItem(index)} style={{ padding: '6px' }}><X size={16} /></button></td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button type="button" className="btn btn-secondary" onClick={addItem}><Plus size={16} /> {t('inv_addItem')}</button>
                                
                                {/* Manual Discount Input */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '180px', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px 8px', background: 'var(--bg-primary)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>💸 {t('discount') || 'الخصم'}:</span>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={formData.manual_discount === 0 ? '' : formData.manual_discount}
                                        onChange={e => {
                                            const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price) - (item.discount || 0), 0);
                                            const val = parseFloat(e.target.value) || 0;
                                            if (val > subtotal) {
                                                toast.error('قيمة الخصم لا يمكن أن تتجاوز قيمة الفاتورة');
                                                setFormData({ ...formData, manual_discount: subtotal });
                                            } else {
                                                setFormData({ ...formData, manual_discount: val });
                                            }
                                        }}
                                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', margin: 0, height: '28px', border: 'none', background: 'transparent' }}
                                    />
                                </div>
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{t('inv_total')}: {formatCurrency(calculateTotals().total)}</div>
                        </div>
                    </div>

                    {/* Card 3: الملاحظات ومرفق الفاتورة */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: 0 }}>✍️ {t('notes')}</label>
                            <textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ minHeight: '120px', resize: 'vertical' }} />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: 0 }}>📷 {t('invoice_attachment') || 'صورة الفاتورة / الإيصال'}</label>
                            <div 
                                onClick={handleImageUpload}
                                style={{ 
                                    border: formData.image ? '1px solid var(--border)' : '2px dashed var(--border)', 
                                    background: 'var(--bg-primary)', 
                                    borderRadius: '12px', 
                                    padding: '16px',
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    cursor: 'pointer',
                                    minHeight: '120px',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                {formData.image ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                                        <img src={formData.image} alt="Invoice Attachment" style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'contain', borderRadius: '6px' }} />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{t('click_to_change') || 'تغيير الصورة'}</span>
                                            <span 
                                                onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, image: '' })); }} 
                                                style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}
                                            >
                                                {t('delete') || 'حذف'}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                        <Plus size={24} style={{ opacity: 0.7 }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{t('upload_invoice_image') || 'اضغط هنا لرفع صورة الفاتورة الورقية'}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>JPG, PNG, WEBP (Max 800px)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
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
