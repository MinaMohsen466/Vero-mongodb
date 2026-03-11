import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Search, ShoppingCart, Printer, X, Edit, Download } from 'lucide-react';
import Modal from '../components/Modal';
import InvoicePrintPreview from '../components/InvoicePrintPreview';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

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

    const emptyForm = () => ({
        customer_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '',
        status: 'paid', payment_method: 'cash', payment_account_id: '',
        items: [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }]
    });

    const [formData, setFormData] = useState(emptyForm());
    const searchInputRef = React.useRef(null);

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
            if (showViewModal) setShowViewModal(false);
            if (showPrintPreview) setShowPrintPreview(false);
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [invoicesData, customersData, productsData, settingsData, accountsData] = await Promise.all([
                window.api.invoices.getAll('sales'),
                window.api.customers.getAll(),
                window.api.products.getAll(),
                window.api.settings.getAll(),
                window.api.accounts.getBankAccounts ? window.api.accounts.getBankAccounts() : Promise.resolve([])
            ]);
            setInvoices(invoicesData || []);
            setCustomers(customersData || []);
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
            unit_price: product?.sale_price || 0,
            total: calculateItemTotal({ ...newItems[index], unit_price: product?.sale_price || 0 })
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

    // Stock validation: check if selling more than available stock
    const validateStock = () => {
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        if (allowNegative) return true; // Skip validation if allowed

        for (const item of formData.items) {
            if (!item.product_id) continue;
            const product = products.find(p => p.id === parseInt(item.product_id));
            if (!product) continue;

            const currentStock = product.stock_quantity || 0;
            const requestedQty = parseFloat(item.quantity) || 0;

            if (requestedQty > currentStock) {
                setError(`${t('inv_stockError') || 'Requested quantity exceeds available stock'}: "${product.name}" - ${t('inv_available') || 'Available'}: ${currentStock}, ${t('inv_requested') || 'Requested'}: ${requestedQty}`);
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const validItems = formData.items.filter(item => (item.product_id || item.description) && item.quantity > 0);
        if (validItems.length === 0) {
            setError(t('inv_noItems'));
            return;
        }

        // Stock validation for sales
        if (!editMode && !validateStock()) {
            return;
        }

        // Credit limit validation for pending (credit) invoices
        if (formData.status === 'pending' && formData.customer_id) {
            const customer = customers.find(c => c.id === parseInt(formData.customer_id));
            if (customer && customer.credit_limit > 0) {
                const totals = calculateTotals();
                const newBalance = (customer.balance || 0) + totals.total;
                if (newBalance > customer.credit_limit) {
                    const formatCurr = (a) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(a || 0);
                    setError(t('errorOccurred') + `: ${t('cust_creditLimit')} - ${customer.name}`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const totals = calculateTotals();
            const invoiceData = {
                type: 'sales',
                customer_id: formData.customer_id ? parseInt(formData.customer_id) : null,
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
                toast.success(t('savedSuccess') || (editMode ? 'Invoice updated successfully' : 'Invoice saved successfully'));
                await loadData();
                closeModal();
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
            console.log('[handleEdit] Loading invoice:', invoiceId);
            const invoice = await window.api.invoices.getById(invoiceId);
            console.log('[handleEdit] Got invoice:', invoice);
            console.log('[handleEdit] Invoice items:', invoice?.items);

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
                    total: Number(item.total) || 0
                }));
                console.log('[handleEdit] Mapped items:', mappedItems);
            } else {
                console.log('[handleEdit] No items found, using empty row');
                mappedItems = [{ product_id: '', description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }];
            }

            setEditMode(true);
            setEditingId(invoiceId);
            setError('');
            setFormData({
                customer_id: invoice.customer_id != null ? String(invoice.customer_id) : '',
                date: invoice.date || new Date().toISOString().split('T')[0],
                due_date: invoice.due_date || '',
                notes: invoice.notes || '',
                status: invoice.status || 'paid',
                payment_method: invoice.payment_method || 'cash',
                payment_account_id: invoice.payment_account_id != null ? String(invoice.payment_account_id) : '',
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
            console.log('[SalesInvoices.viewInvoice] Fresh settings reloaded:', freshSettings);
            console.log('[SalesInvoices.viewInvoice] Logo path:', freshSettings?.company?.company_logo);

            const invoice = await window.api.invoices.getById(id);
            setSelectedInvoice(invoice);
            setShowViewModal(true);
        } catch (e) {
            console.error('[SalesInvoices.viewInvoice] Error:', e);
        }
    };

    const printInvoice = async () => {
        if (!selectedInvoice) return;
        const currencySymbol = settings.general?.currency_symbol || (t('currency_kd') || 'KD');
        const invoiceTitle = settings.invoice?.invoice_title_sales || (t('sales_invoice') || 'Sales Invoice');
        const invoiceFooter = settings.invoice?.invoice_footer || (t('invoice_footer_default') || 'Thank you for your business');
        const invoiceTerms = settings.invoice?.invoice_terms || '';
        const companyName = settings.company?.company_name || (t('my_company') || 'My Company');
        const companyAddress = settings.company?.company_address || '';
        const companyPhone = settings.company?.company_phone || '';
        const companyEmail = settings.company?.company_email || '';
        const companyTaxNumber = settings.company?.company_tax_number || '';
        const companyLogo = settings.company?.company_logo || '';
        let logoBase64 = '';
        if (companyLogo && window.api?.file?.readAsBase64) {
            logoBase64 = await window.api.file.readAsBase64(companyLogo) || '';
        }
        const logoHtml = logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="max-height:60px;max-width:140px;object-fit:contain" />` : '';
        const showCompanyInfo = settings.invoice?.show_company_info !== 'no';
        const companyInfoHtml = showCompanyInfo ? `<div style="line-height:1.5"><h1 style="margin:0;font-size:20px;font-weight:700">${companyName}</h1>${companyAddress ? `<p style="margin:2px 0;font-size:11px;color:#555">${companyAddress}</p>` : ''}${companyPhone ? `<p style="margin:2px 0;font-size:11px;color:#555">${t('phone_abbr') || 'Tel'}: ${companyPhone}</p>` : ''}${companyEmail ? `<p style="margin:2px 0;font-size:11px;color:#555">${companyEmail}</p>` : ''}${companyTaxNumber ? `<p style="margin:2px 0;font-size:11px;color:#555">${t('tax_number_abbr') || 'Tax No'}: ${companyTaxNumber}</p>` : ''}</div>` : '';
        const inv = selectedInvoice;
        const statusLabel = inv.status === 'paid' ? (t('inv_paid') || 'Paid') : inv.status === 'partial' ? (t('inv_partial') || 'Partially Paid') : (t('inv_credit') || 'Credit');
        const formatCurr = (a) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(a || 0) + ' ' + currencySymbol;
        const statusColor = inv.status === 'paid' ? '#22c55e' : inv.status === 'partial' ? '#f59e0b' : '#ef4444';

        const itemsHtml = (inv.items || []).map((item, i) => `<tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}"><td style="padding:10px 12px;text-align:center;color:#64748b;font-size:13px">${i + 1}</td><td style="padding:10px 12px;font-weight:500">${item.product_name || item.description || '-'}</td><td style="padding:10px 12px;text-align:center">${item.quantity}</td><td style="padding:10px 12px;text-align:center">${Number(item.unit_price).toFixed(3)} ${currencySymbol}</td><td style="padding:10px 12px;text-align:center;font-weight:600;color:#1a365d">${Number(item.total).toFixed(3)} ${currencySymbol}</td></tr>`).join('');

        const isRtl = document.documentElement.dir === 'rtl';
        const alignLeft = isRtl ? 'right' : 'left';
        const alignRight = isRtl ? 'left' : 'right';

        const html = `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}"><head><meta charset="UTF-8"><style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo','Arial',sans-serif;padding:0;background:white;color:#334155;font-size:14px}.invoice-page{max-width:780px;margin:0 auto;padding:30px}.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px}.divider{height:3px;background:linear-gradient(90deg,#1a365d 0%,#3b82f6 50%,#1a365d 100%);border-radius:2px;margin-bottom:20px}.invoice-title-bar{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#1a365d,#2563eb);color:white;padding:12px 20px;border-radius:8px;margin-bottom:20px}.invoice-title-bar h2{margin:0;font-size:18px;font-weight:600}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px}.meta-box{padding:15px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}.meta-box h4{font-size:12px;color:#64748b;margin-bottom:8px}.meta-box .value{font-weight:600;color:#1a365d}table{width:100%;border-collapse:collapse;margin-bottom:20px}thead th{background:linear-gradient(135deg,#1a365d,#2563eb);color:white;padding:11px 12px;font-weight:600;font-size:13px;text-align:${isRtl ? 'right' : 'left'}}thead th:first-child{border-radius:${isRtl ? '0 8px 0 0' : '8px 0 0 0'}}thead th:last-child{border-radius:${isRtl ? '8px 0 0 0' : '0 8px 0 0'}}.totals-section{display:flex;justify-content:flex-end;margin-bottom:20px;${isRtl ? 'justify-content:flex-start;' : ''}}.totals-table{width:280px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}.totals-table tr td{padding:10px 15px;font-size:13px}.totals-table tr:last-child{background:linear-gradient(135deg,#1a365d,#2563eb);color:white;font-size:16px;font-weight:700}.notes-box{padding:12px 15px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:15px;font-size:13px}.terms-box{padding:12px 15px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;font-size:12px}.footer{border-top:2px solid #e2e8f0;padding-top:15px;text-align:center;color:#64748b;font-size:13px}.status-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;color:white}@media print{body{padding:0}.invoice-page{padding:15px}@page{margin:10mm}}</style></head><body><div class="invoice-page"><div class="header"><div style="display:flex;align-items:center;gap:15px">${logoHtml}${companyInfoHtml}</div><div style="text-align:${alignRight}"><p style="font-size:13px;color:#64748b;margin:3px 0"><strong>${t('inv_number') || 'Invoice No'}:</strong> ${inv.invoice_number}</p><p style="font-size:13px;color:#64748b;margin:3px 0"><strong>${t('date') || 'Date'}:</strong> ${new Date(inv.date).toLocaleDateString('en-GB')}</p>${inv.due_date ? `<p style="font-size:13px;color:#64748b;margin:3px 0"><strong>${t('inv_dueDate') || 'Due Date'}:</strong> ${new Date(inv.due_date).toLocaleDateString('en-GB')}</p>` : ''}</div></div><div class="divider"></div><div class="invoice-title-bar"><h2>${invoiceTitle}</h2><span class="status-badge" style="background:${statusColor}">${statusLabel}</span></div><div class="meta-grid"><div class="meta-box"><h4>${t('customer_data') || 'Customer Data'}</h4><p class="value">${inv.customer_name || (t('cash_customer') || 'Cash Customer')}</p></div><div class="meta-box"><h4>${t('payment_info') || 'Payment Info'}</h4><p><strong>${t('status') || 'Status'}:</strong> <span style="color:${statusColor};font-weight:600">${statusLabel}</span></p>${inv.payment_method ? `<p><strong>${t('inv_paymentMethod') || 'Payment Method'}:</strong> ${inv.payment_method === 'cash' ? (t('inv_cash') || 'Cash') : inv.payment_method === 'bank' ? (t('inv_bank') || 'Bank Transfer') : inv.payment_method}</p>` : ''}</div></div><table><thead><tr><th style="width:40px;text-align:center">#</th><th>${t('inv_product') || 'Item'}</th><th style="width:80px;text-align:center">${t('inv_quantity') || 'Qty'}</th><th style="width:110px;text-align:center">${t('inv_unitPrice') || 'Price'}</th><th style="width:110px;text-align:center">${t('inv_itemTotal') || 'Total'}</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="totals-section"><table class="totals-table">${inv.subtotal && inv.subtotal !== inv.total ? `<tr style="background:#f8fafc"><td>${t('subtotal') || 'Subtotal'}</td><td style="text-align:${alignLeft}">${formatCurr(inv.subtotal)}</td></tr>` : ''}${inv.discount ? `<tr style="background:#fef2f2"><td>${t('discount') || 'Discount'}</td><td style="text-align:${alignLeft};color:#ef4444">- ${formatCurr(inv.discount)}</td></tr>` : ''}${inv.tax ? `<tr style="background:#f0f9ff"><td>${t('tax') || 'Tax'}</td><td style="text-align:${alignLeft}">${formatCurr(inv.tax)}</td></tr>` : ''}<tr><td>${t('final_total') || 'Final Total'}</td><td style="text-align:${alignLeft}">${formatCurr(inv.total)}</td></tr></table></div>${inv.notes ? `<div class="notes-box"><strong>${t('notes') || 'Notes'}:</strong> ${inv.notes}</div>` : ''}${invoiceTerms ? `<div class="terms-box"><strong style="display:block;margin-bottom:5px">${t('terms_and_conditions') || 'Terms and Conditions'}:</strong><div style="white-space:pre-wrap;color:#475569">${invoiceTerms}</div></div>` : ''}<div class="footer"><p>${invoiceFooter}</p></div></div></body></html>`;
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

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.invoice_number?.includes(searchQuery) || inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
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

    const getStatusLabel = (status) => {
        if (status === 'paid') return t('inv_paid');
        if (status === 'partial') return t('inv_partial');
        if (status === 'cancelled') return t('inv_cancelled');
        return t('inv_pending');
    };

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
                    style={{ width: '130px', margin: 0 }}>
                    <option value="all">{t('all') || 'All Statuses'}</option>
                    <option value="paid">{t('inv_paid') || 'Paid'}</option>
                    <option value="pending">{t('inv_credit') || 'Credit'}</option>
                </select>
                {/* Customer Filter */}
                <div style={{ width: '200px' }}>
                    <SearchableSelect
                        options={customers.map(c => ({ value: String(c.id), label: c.name }))}
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
                {user?.permissions?.sales_invoices?.can_create && (
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
                                    {filteredInvoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td className="font-bold">{inv.invoice_number}</td>
                                            <td>{inv.customer_name || '-'}</td>
                                            <td>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td className="font-bold">{formatCurrency(inv.total)}</td>
                                            <td><span className={`badge ${inv.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{getStatusLabel(inv.status)}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    {user?.permissions?.sales_invoices?.can_view && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => viewInvoice(inv.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {user?.permissions?.sales_invoices?.can_edit && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(inv.id)} title={t('edit')}><Edit size={16} /></button>
                                                    )}
                                                    {user?.permissions?.sales_invoices?.can_view && (
                                                        <button className="btn btn-ghost btn-sm" onClick={async () => { await viewInvoice(inv.id); setShowPrintPreview(true); }} title={t('inv_print')}><Printer size={16} /></button>
                                                    )}
                                                    {user?.permissions?.sales_invoices?.can_delete && (
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
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? t('sinv_edit') : t('sinv_add')} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')} (Esc)</button><button type="submit" form="sales-invoice-form" className="btn btn-primary" disabled={saving}>{saving ? t('savingProgress') : t('save') + ' (Ctrl+S)'}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form id="sales-invoice-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('sinv_customer')}</label>
                            <SearchableSelect
                                options={customers.map(c => ({ value: String(c.id), label: c.name }))}
                                value={formData.customer_id ? String(formData.customer_id) : ''}
                                onChange={(val) => setFormData({ ...formData, customer_id: val })}
                                placeholder={t('sinv_selectCustomer')}
                                emptyLabel={t('sinv_selectCustomer')}
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
                                    {formData.items.map((item, index) => {
                                        const product = item.product_id ? products.find(p => p.id === parseInt(item.product_id)) : null;
                                        const stockInfo = product ? ` (${t('inv_available') || 'Available'}: ${product.stock_quantity || 0})` : '';
                                        return (
                                            <tr key={index}>
                                                <td style={{ minWidth: '200px' }}>
                                                    <SearchableSelect
                                                        options={products.map(p => ({ value: String(p.id), label: `${p.name} (${p.stock_quantity || 0})`, subLabel: p.code }))}
                                                        value={item.product_id ? String(item.product_id) : ''}
                                                        onChange={(val) => handleProductChange(index, val)}
                                                        placeholder={t('inv_selectProduct')}
                                                        emptyLabel={t('inv_selectProduct')}
                                                    />
                                                </td>
                                                <td><input type="text" className="form-input" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} style={{ margin: 0 }} /></td>
                                                <td><input type="number" className="form-input" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} min="1" step="1" style={{ margin: 0 }} /></td>
                                                <td><input type="number" className="form-input" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} step="0.25" style={{ margin: 0 }} /></td>
                                                <td className="font-bold">{formatCurrency(calculateItemTotal(item))}</td>
                                                <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeItem(index)}><X size={16} /></button></td>
                                            </tr>
                                        );
                                    })}
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
                        <div className="form-row mb-4"><div><strong>{t('sinv_customer')}:</strong> {selectedInvoice.customer_name || '-'}</div><div><strong>{t('date')}:</strong> {new Date(selectedInvoice.date).toLocaleDateString('en-GB')}</div></div>
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
                    type="sales"
                    onClose={() => setShowPrintPreview(false)}
                />
            )}
        </div>
    );
}

export default SalesInvoices;
