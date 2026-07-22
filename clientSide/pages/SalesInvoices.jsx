import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Trash2, Search, ShoppingCart, Printer, X, Edit, Download } from 'lucide-react';
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

function SalesInvoices() {
    const { t, user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [customerFilter, setCustomerFilter] = useState('');
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

    const [activeOffers, setActiveOffers] = useState([]);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [visibleInvoicesCount, setVisibleInvoicesCount] = useState(50);

    const emptyForm = () => ({
        customer_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
        status: 'paid', payment_method: 'cash', payment_account_id: '', paid: 0,
        manual_discount: 0,
        items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }]
    });

    const [formData, setFormData] = useState(emptyForm());
    const searchInputRef = React.useRef(null);

    const productOptions = useMemo(() => {
        return products.map(p => ({ value: String(p.id), label: `${p.name} (${p.shop_stock || 0})`, subLabel: p.code }));
    }, [products]);

    const customerOptions = useMemo(() => {
        return [...customers].sort((a, b) => a.code === 'CUST-CASH' ? -1 : b.code === 'CUST-CASH' ? 1 : 0).map(c => ({ value: String(c.id), label: c.name }));
    }, [customers]);

    const customerFilterOptions = useMemo(() => {
        return customers.map(c => ({ value: String(c.id), label: c.name }));
    }, [customers]);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#sales-invoice-form button[type="submit"]') || document.querySelector('button[form="sales-invoice-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.sales_invoices?.can_create) openModal();
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
    }, [searchQuery, statusFilter, customerFilter, dateFrom, dateTo]);

    useEffect(() => {
        const savedDraft = localStorage.getItem('sales_invoice_draft');
        if (savedDraft) {
            try {
                const { showModal: savedShow, formData: savedForm, editMode: savedEdit, editingId: savedId, couponCode: savedCoupon, appliedCoupon: savedApplied } = JSON.parse(savedDraft);
                if (savedShow) {
                    setShowModal(savedShow);
                    setFormData(savedForm);
                    setEditMode(savedEdit);
                    setEditingId(savedId);
                    setCouponCode(savedCoupon || '');
                    setAppliedCoupon(savedApplied || null);
                }
            } catch (e) {
                console.error('Error parsing sales draft:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (showModal) {
            localStorage.setItem('sales_invoice_draft', JSON.stringify({ showModal, formData, editMode, editingId, couponCode, appliedCoupon }));
        } else {
            localStorage.removeItem('sales_invoice_draft');
        }
    }, [showModal, formData, editMode, editingId, couponCode, appliedCoupon]);

    const loadData = async () => {
        try {
            const [invoicesData, customersData, productsData, settingsData, accountsData, offersData] = await Promise.all([
                window.api.invoices.getAll('sales'),
                window.api.customers.getAll(),
                window.api.products.getAll(),
                window.api.settings.getAll(),
                window.api.accounts.getBankAccounts ? window.api.accounts.getBankAccounts() : Promise.resolve([]),
                window.api.offers.getActive()
            ]);
            setInvoices(invoicesData || []);
            setCustomers(customersData || []);
            setProducts(productsData || []);
            setSettings(settingsData || {});
            setBankAccounts(accountsData || []);
            setActiveOffers(offersData || []);
        } catch (e) { console.error('Error loading data:', e); }
        setLoading(false);
    };

    const calculateItemTotal = (item) => {
        let finalPrice = parseFloat(item.unit_price) || 0;
        let qty = parseFloat(item.quantity) || 0;
        let finalTotal = finalPrice * qty;
        let discountManual = 0; // Removing item.discount double-dip since we don't have manual item discounts in UI
        let appliedOffer = null;
        let bogoFreeQty = 0;

        const product = products.find(p => p.id === parseInt(item.product_id));
        const category = product ? product.category : null;

        const offer = activeOffers.find(o => 
            o.target_type === 'all' || 
            (o.target_type === 'product' && String(o.target_id) === String(item.product_id)) ||
            (o.target_type === 'category' && o.target_id === category)
        );

        if (offer) {
            appliedOffer = offer;
            if (offer.offer_type === 'percentage') {
                const discAmt = finalPrice * (parseFloat(offer.discount_value) / 100);
                finalPrice = finalPrice - discAmt;
                finalTotal = finalPrice * qty;
            } else if (offer.offer_type === 'fixed') {
                finalPrice = Math.max(0, finalPrice - parseFloat(offer.discount_value));
                finalTotal = finalPrice * qty;
            } else if (offer.offer_type === 'bogo') {
                const bundleSize = offer.buy_qty + offer.get_qty;
                const bundles = Math.floor(qty / bundleSize);
                bogoFreeQty = bundles * offer.get_qty;
                finalTotal = finalPrice * (qty - bogoFreeQty);
            }
        }

        const totalAfterManualDiscount = Math.max(0, finalTotal - discountManual);

        return {
            finalPrice,
            finalTotal: totalAfterManualDiscount,
            appliedOffer,
            bogoFreeQty,
            discountCalculated: (item.unit_price * qty) - totalAfterManualDiscount
        };
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item).finalTotal, 0);
        let couponDiscountAmount = 0;
        if (appliedCoupon) {
            if (appliedCoupon.discount_type === 'percentage') {
                couponDiscountAmount = subtotal * (parseFloat(appliedCoupon.discount_value) / 100);
            } else {
                couponDiscountAmount = parseFloat(appliedCoupon.discount_value);
            }
        }
        
        const manualDiscount = parseFloat(formData.manual_discount) || 0;
        const totalDiscount = couponDiscountAmount + manualDiscount;
        const actualTotalDiscount = Math.min(subtotal, totalDiscount);
        const finalTotal = subtotal - actualTotalDiscount;
        return { subtotal, total: finalTotal, couponDiscountAmount, manualDiscount, totalDiscount: actualTotalDiscount };
    };

    const handleProductChange = (index, productId) => {
        const product = products.find(p => p.id === parseInt(productId));
        const newItems = [...formData.items];
        newItems[index] = {
            ...newItems[index],
            product_id: productId,
            description: product?.name || '',
            unit_price: product?.sale_price || 0,
            unit: product?.unit || '',
        };
        newItems[index].total = calculateItemTotal(newItems[index]).finalTotal;
        // Auto-add new row if product was selected on the last row
        if (productId && index === newItems.length - 1) {
            newItems.push({ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' });
        }
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        newItems[index].total = calculateItemTotal(newItems[index]).finalTotal;
        setFormData({ ...formData, items: newItems });
    };

    const addItem = () => setFormData({ ...formData, items: [...formData.items, { product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '' }] });
    const removeItem = (index) => formData.items.length > 1 && setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });

    // Stock validation: check if selling more than available stock
    const validateStock = () => {
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        if (allowNegative) return true; // Skip validation if allowed

        for (const item of formData.items) {
            if (!item.product_id) continue;
            const product = products.find(p => p.id === parseInt(item.product_id));
            if (!product) continue;

            const currentStock = product.shop_stock || 0;
            const requestedQty = parseFloat(item.quantity) || 0;

            if (requestedQty > currentStock) {
                setError(`${t('inv_stockError') || 'Requested quantity exceeds available stock'}: "${product.name}" - ${t('inv_available') || 'Available'}: ${currentStock}, ${t('inv_requested') || 'Requested'}: ${requestedQty}`);
                return false;
            }
        }
        return true;
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) { setAppliedCoupon(null); return; }
        const result = await window.api.coupons.validate(couponCode);
        if (result.valid) {
            const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item).finalTotal, 0);
            let couponVal = 0;
            if (result.coupon.discount_type === 'percentage') {
                couponVal = subtotal * (parseFloat(result.coupon.discount_value) / 100);
            } else {
                couponVal = parseFloat(result.coupon.discount_value);
            }
            const manualDiscount = parseFloat(formData.manual_discount) || 0;
            const remainingBeforeCoupon = Math.max(0, subtotal - manualDiscount);
            if (couponVal > remainingBeforeCoupon) {
                toast.error('قيمة خصم الكوبون أكبر من قيمة الفاتورة المتبقية، لا يمكن تطبيقه');
                setCouponCode('');
                setAppliedCoupon(null);
                return;
            }

            setAppliedCoupon(result.coupon);
            toast.success(t('coupon_applied_success') || 'Coupon applied successfully!');
        } else {
            toast.error(result.error);
            setAppliedCoupon(null);
            setCouponCode('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validItems = formData.items.filter(item => (item.product_id || item.description) && item.quantity > 0);
        const totals = calculateTotals();
        if (totals.couponDiscountAmount > totals.subtotal) {
            setError('قيمة خصم الكوبون أكبر من قيمة الفاتورة، تم إلغاء الكوبون');
            return;
        }
        if (totals.manualDiscount > totals.subtotal - totals.couponDiscountAmount) {
            setError('قيمة الخصم الإضافي لا يمكن أن تتجاوز قيمة الفاتورة المتبقية');
            return;
        }
        if (validItems.length === 0) {
            setError(t('inv_noItems'));
            return;
        }

        // Require customer for unpaid invoices
        const selectedCustomerObj = customers.find(c => String(c.id) === String(formData.customer_id));
        if (formData.status !== 'paid' && (!formData.customer_id || (selectedCustomerObj && selectedCustomerObj.code === 'CUST-CASH'))) {
            setError(t('cash_customer_no_credit') || 'لا يمكن إجراء عملية بيع آجل للعميل النقدي');
            return;
        }

        // Stock validation for sales
        if (!editMode && !validateStock()) {
            return;
        }

        // Credit limit validation for pending (credit) or partial invoices
        if ((formData.status === 'pending' || formData.status === 'partial') && formData.customer_id) {
            const customer = customers.find(c => c.id === parseInt(formData.customer_id));
            if (customer && customer.credit_limit > 0) {
                const totals = calculateTotals();
                const paidVal = formData.status === 'partial' ? (parseFloat(formData.paid) || 0) : 0;
                const remaining = totals.total - paidVal;
                const newBalance = (customer.balance || 0) + remaining;
                if (newBalance > customer.credit_limit) {
                    const formatCurr = (a) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(a || 0);
                    setError(t('errorOccurred') + `: ${t('cust_creditLimit')} - ${customer.name}`);
                    return;
                }
            }
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
                type: 'sales',
                customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
                date: formData.date,
                due_date: formData.due_date || null,
                notes: formData.notes,
                subtotal: totals.subtotal,
                discount: totals.totalDiscount,
                manual_discount: totals.manualDiscount,
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                tax: 0,
                total: totals.total,
                paid: paidAmount,
                status: formData.status,
                payment_method: (formData.status === 'paid' || formData.status === 'partial') ? formData.payment_method : 'credit',
                payment_account_id: formData.payment_account_id ? parseInt(formData.payment_account_id) : null,
                items: validItems.map(item => ({
                    product_id: item.product_id ? parseInt(item.product_id) : null,
                    description: item.description,
                    quantity: parseFloat(item.quantity) || 0,
                    unit_price: parseFloat(item.unit_price) || 0,
                    discount: calculateItemTotal(item).discountCalculated,
                    tax: 0,
                    total: calculateItemTotal(item).finalTotal,
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
                if (appliedCoupon && !editMode) {
                    await window.api.coupons.incrementUse(appliedCoupon.id);
                }
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
        if (confirm((t('inv_deleteConfirm') || 'Are you sure you want to delete this invoice?') + ' ' + (t('sinv_deleteNote') || ''))) {
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
            const invoice = await window.api.invoices.getById(invoiceId);

            if (!invoice) {
                toast.error(t('inv_loadError'));
                return;
            }

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
            } else {
                mappedItems = [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0, color: '', unit: '' }];
            }

            setEditMode(true);
            setEditingId(invoiceId);
            setError('');
            if (invoice.coupon_code) {
                setCouponCode(invoice.coupon_code);
                window.api.coupons.validate(invoice.coupon_code).then(res => {
                    if (res.success && res.coupon) {
                        setAppliedCoupon(res.coupon);
                    }
                }).catch(e => console.error('Error loading coupon:', e));
            } else {
                setCouponCode('');
                setAppliedCoupon(null);
            }
            setFormData({
                customer_id: invoice.customer_id != null ? String(invoice.customer_id) : '',
                date: invoice.date || new Date().toISOString().split('T')[0],
                due_date: invoice.due_date || '',
                notes: invoice.notes || '',
                status: invoice.status || 'paid',
                payment_method: invoice.payment_method || 'cash',
                payment_account_id: invoice.payment_account_id != null ? String(invoice.payment_account_id) : '',
                paid: invoice.paid || 0,
                manual_discount: invoice.manual_discount || 0,
                items: mappedItems
            });
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
            console.error('[SalesInvoices.viewInvoice] Error:', e);
        }
    };

    const openModal = () => {
        setError('');
        setEditMode(false);
        setEditingId(null);
        setCouponCode('');
        setAppliedCoupon(null);
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

    const getStatusLabel = (status) => {
        if (status === 'paid') return t('inv_paid') || 'مدفوعة';
        if (status === 'partial') return t('inv_partial') || 'مدفوعة جزئياً';
        if (status === 'written_off') return 'دين معدوم (مشطوبة)';
        if (status === 'cancelled') return t('inv_cancelled') || 'ملغاة';
        return t('inv_pending') || 'آجلة (غير مدفوعة)';
    };

    const filteredInvoices = invoices.filter(inv => {
        const q = searchQuery.toLowerCase().trim();
        const statusLbl = (getStatusLabel(inv.status) || '').toLowerCase();
        const matchesSearch = !q ||
            inv.invoice_number?.toLowerCase().includes(q) || 
            inv.customer_name?.toLowerCase().includes(q) ||
            statusLbl.includes(q) ||
            (inv.status === 'pending' && (q.includes('آجل') || q.includes('اجل') || q.includes('غير مدفوع'))) ||
            (inv.status === 'partial' && (q.includes('جزئ') || q.includes('جزئي'))) ||
            (inv.status === 'written_off' && (q.includes('معدوم') || q.includes('شطب') || q.includes('متعثر'))) ||
            (inv.status === 'paid' && q.includes('مدفوع')) ||
            (inv.items || []).some(item => 
                item.product_name?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q)
            );
        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
        const matchesCustomer = !customerFilter || String(inv.customer_id) === customerFilter;
        const matchesDateFrom = !dateFrom || inv.date >= dateFrom;
        const matchesDateTo = !dateTo || inv.date <= dateTo;
        return matchesSearch && matchesStatus && matchesCustomer && matchesDateFrom && matchesDateTo;
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
            t('sinv_customer') || 'Customer',
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
                inv.customer_name || '',
                inv.date || '',
                inv.subtotal || 0,
                inv.discount || 0,
                inv.total || 0,
                inv.status === 'paid' ? (t('inv_paid') || 'Paid') : (t('inv_credit') || 'Credit'),
                inv.notes || ''
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
        await window.api.file.saveText({ content: csv, defaultName: 'Sales_Invoices.csv', filters: [{ name: 'CSV', extensions: ['csv'] }] });
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
                {/* Status Filter */}
                <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: '160px', margin: 0 }}>
                    <option value="all">{t('all') || 'كل الحالات'}</option>
                    <option value="paid">{t('inv_paid') || 'مدفوعة'}</option>
                    <option value="pending">{t('inv_pending') || 'آجلة (غير مدفوعة)'}</option>
                    <option value="partial">{t('inv_partial') || 'مدفوعة جزئياً'}</option>
                    <option value="written_off">ديون معدومة (مشطوبة)</option>
                </select>
                {/* Customer Filter */}
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={customerFilterOptions}
                        value={customerFilter}
                        onChange={setCustomerFilter}
                        placeholder={t('all') || "All Customers"}
                        emptyLabel={t('all') || "All Customers"}
                    />
                </div>
                {/* Date From */}
                <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('from_date') || "From Date"} />
                {/* Date To */}
                <input type="date" className="form-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    style={{ width: '150px', margin: 0 }} title={t('to_date') || "To Date"} />
                {/* Clear */}
                {(searchQuery || statusFilter !== 'all' || customerFilter || dateFrom || dateTo) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCustomerFilter(''); setDateFrom(''); setDateTo(''); }}
                        style={{ color: 'var(--text-muted)' }}>✕ {t('clear') || 'Clear'}</button>
                )}
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filteredInvoices.length} {t('menu_sales')}</span>
                <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669' }}>
                    <Download size={16} /> CSV
                </button>
                {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_create) && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> {t('sinv_add')}</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredInvoices.length === 0 ? (
                        <div className="empty-state"><ShoppingCart size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>{t('inv_number')}</th><th>{t('sinv_customer')}</th><th>{t('date')}</th><th>{t('total')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                                <tbody>
                                    {filteredInvoices.slice(0, visibleInvoicesCount).map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-bold">{inv.invoice_number}</td>
                                            <td>{inv.customer_name || '-'}</td>
                                            <td>
                                                <div>{new Date(inv.date).toLocaleDateString('en-GB')}</div>
                                                {inv.created_at && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {parseDbDate(inv.created_at).toLocaleTimeString('ar-KW', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="font-bold">
                                                {formatCurrency(inv.total)}
                                                {inv.discount > 0 && <span style={{ display: 'block', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>{t('discount')}: {formatCurrency(inv.discount)}</span>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span
                                                        className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'written_off' ? 'badge-danger' : 'badge-warning'}`}
                                                        style={inv.status === 'written_off' ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' } : {}}
                                                    >
                                                        {getStatusLabel(inv.status)}
                                                    </span>
                                                    {(inv.status === 'paid' || inv.status === 'partial') && inv.payment_method && inv.payment_method !== 'credit' && (
                                                        <span style={{ fontSize: '11px', color: '#666', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ddd', whiteSpace: 'nowrap' }}>
                                                            {inv.payment_method === 'bank' ? (t('inv_bank') || 'بنكي') : inv.payment_method === 'cash' ? (t('inv_cash') || 'نقدي') : inv.payment_method}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="table-actions">
                                                    {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_view) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_edit) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv.id)} title={t('edit')}><Edit size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_view) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_print')}><Printer size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.sales_invoices?.can_delete) && (
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
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? t('sinv_edit') : t('sinv_add')} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')} (Esc)</button><button type="submit" form="sales-invoice-form" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-btn" style={{ marginInlineEnd: '8px' }}></span>}{saving ? t('savingProgress') : t('save') + ' (Ctrl+S)'}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form id="sales-invoice-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Card 1: معلومات الفاتورة الأساسية */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '4px' }}>
                            📄 {t('invoice_details') || 'معلومات الفاتورة الأساسية'}
                        </div>
                        <div className="form-row" style={{ margin: 0, gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: '600' }}>{t('sinv_customer')}</label>
                                <SearchableSelect
                                    options={customerOptions}
                                    value={formData.customer_id ? String(formData.customer_id) : ''}
                                    onChange={(val) => {
                                        const selected = customers.find(c => String(c.id) === String(val));
                                        const isCash = selected && selected.code === 'CUST-CASH';
                                        setFormData(prev => {
                                            const newStatus = isCash ? 'paid' : prev.status;
                                            return {
                                                ...prev,
                                                customer_id: val,
                                                status: newStatus,
                                                paid: newStatus === 'paid' ? calculateTotals().total : prev.paid
                                            };
                                        });
                                    }}
                                    placeholder={t('sinv_selectCustomer')}
                                    emptyLabel={t('sinv_selectCustomer')}
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
                                        const selected = customers.find(c => String(c.id) === String(formData.customer_id));
                                        return selected && selected.code === 'CUST-CASH';
                                    })()}>{t('inv_partial')}</option>
                                    <option value="pending" disabled={(() => {
                                        const selected = customers.find(c => String(c.id) === String(formData.customer_id));
                                        return selected && selected.code === 'CUST-CASH';
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

                    {/* Card 2: أصناف الفاتورة */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '12px' }}>
                            📦 {t('inv_product') || 'أصناف الفاتورة'}
                        </div>
                        <div className="table-container" style={{ margin: 0 }}>
                            <table>
                                <thead><tr><th style={{ width: '200px' }}>{t('inv_product')}</th><th>{t('description')}</th><th style={{ width: '120px' }}>{t('inv_quantity')}</th><th style={{ width: '100px' }}>{t('inv_unitPrice')}</th>{settings?.general?.enable_product_color === 'yes' && <th style={{ width: '100px' }}>{t('color') || 'Color'}</th>}<th style={{ width: '100px' }}>{t('inv_itemTotal')}</th><th style={{ width: '50px' }}></th></tr></thead>
                                <tbody>
                                    {formData.items.map((item, index) => {
                                        const product = item.product_id ? products.find(p => p.id === parseInt(item.product_id)) : null;
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
                                                <td>
                                                    <input type="number" className="form-input" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} step="0.25" style={{ margin: 0, height: '38px' }} />
                                                    {calculateItemTotal(item).finalPrice < item.unit_price && (
                                                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                                                            {formatCurrency(calculateItemTotal(item).finalPrice)}
                                                        </span>
                                                    )}
                                                </td>
                                                {showColorField && <td><input type="text" className="form-input" placeholder={t('color') || 'Color'} value={item.color || ''} onChange={(e) => handleItemChange(index, 'color', e.target.value)} style={{ margin: 0, height: '38px' }} /></td>}
                                                <td className="font-bold" style={{ whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(calculateItemTotal(item).finalTotal)}
                                                    {calculateItemTotal(item).appliedOffer && (
                                                        <span style={{ display: 'block', fontSize: '0.65rem', background: '#10B981', color: 'white', padding: '1px 4px', borderRadius: 4, marginTop: 2, width: 'fit-content' }}>
                                                            {calculateItemTotal(item).bogoFreeQty > 0 ? `${t('bogo_applied_badge') || 'BOGO Free'} ${calculateItemTotal(item).bogoFreeQty}` : (t('offer_applied_badge') || 'Offer Active')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeItem(index)} style={{ padding: '6px' }}><X size={16} /></button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <button type="button" className="btn btn-secondary" onClick={addItem}><Plus size={16} /> {t('inv_addItem')}</button>
                                
                                {/* Coupon Application UI */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '240px', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px 8px', background: 'var(--bg-primary)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>🏷️ {t('coupon') || 'Coupon'}:</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder={t('coupon_code_placeholder') || 'كود...'}
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value)}
                                        disabled={!!appliedCoupon}
                                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', letterSpacing: 1, textTransform: 'uppercase', margin: 0, height: '28px', border: 'none', background: 'transparent' }}
                                    />
                                    {!appliedCoupon ? (
                                        <button type="button" onClick={handleApplyCoupon} style={{ padding: '2px 8px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', height: '26px' }}>
                                            {t('apply_coupon') || 'تطبيق'}
                                        </button>
                                    ) : (
                                        <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} style={{ padding: '2px 6px', background: 'var(--error, #ef4444)', color: '#fff', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Manual Discount Input */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '180px', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px 8px', background: 'var(--bg-primary)' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>💸 {t('discount') || 'خصم إضافي'}:</span>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={formData.manual_discount === 0 ? '' : formData.manual_discount}
                                        onChange={e => {
                                            const subtotal = formData.items.reduce((sum, item) => sum + calculateItemTotal(item).finalTotal, 0);
                                            let couponVal = 0;
                                            if (appliedCoupon) {
                                                if (appliedCoupon.discount_type === 'percentage') {
                                                    couponVal = subtotal * (parseFloat(appliedCoupon.discount_value) / 100);
                                                } else {
                                                    couponVal = parseFloat(appliedCoupon.discount_value);
                                                }
                                            }
                                            const maxAllowed = Math.max(0, subtotal - couponVal);
                                            const val = parseFloat(e.target.value) || 0;
                                            if (val > maxAllowed) {
                                                toast.error('قيمة الخصم الإضافي لا يمكن أن تتجاوز قيمة الفاتورة المتبقية');
                                                setFormData({ ...formData, manual_discount: maxAllowed });
                                            } else {
                                                setFormData({ ...formData, manual_discount: val });
                                            }
                                        }}
                                        style={{ flex: 1, padding: '4px 6px', fontSize: '0.8rem', margin: 0, height: '28px', border: 'none', background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                {appliedCoupon && (
                                    <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                                        ✓ {t('coupon_applied_success') || 'خصم الكوبون'}: -{formatCurrency(calculateTotals().couponDiscountAmount)}
                                    </div>
                                )}
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    {t('inv_total')}: {formatCurrency(calculateTotals().total)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: الملاحظات */}
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label className="form-label" style={{ fontWeight: '600', marginBottom: 0 }}>✍️ {t('notes')}</label>
                            <textarea className="form-textarea" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
                        </div>
                    </div>
                </form>
            </Modal>



            {/* Print Preview Modal */}
            {showPrintPreview && selectedInvoice && (
                <InvoicePrintPreview
                    invoice={selectedInvoice}
                    settings={settings}
                    type="sales"
                    onClose={() => setShowPrintPreview(false)}
                />
            )}
        </div>
    );
}

export default SalesInvoices;
