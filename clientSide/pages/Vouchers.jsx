import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Search, CreditCard, ArrowDownCircle, ArrowUpCircle, Edit } from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Vouchers() {
    const { t, user } = useAuth();
    const [vouchers, setVouchers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('receipt');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [partyType, setPartyType] = useState('customer');
    const [visibleVouchersCount, setVisibleVouchersCount] = useState(50);
    const [formData, setFormData] = useState({
        type: 'receipt', date: new Date().toISOString().split('T')[0],
        amount: 0, customer_id: '', supplier_id: '',
        payment_method: 'cash', invoice_id: '', reference: '', description: ''
    });
    const searchInputRef = React.useRef(null);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#voucher-form button[type="submit"]') || document.querySelector('button[form="voucher-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.[activeTab === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers']?.can_create) openModal(activeTab);
        },
        Escape: () => {
            if (showModal) closeModal();
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        setVisibleVouchersCount(50);
    }, [activeTab, searchQuery]);

    const loadData = async () => {
        try {
            const [vouchersData, customersData, suppliersData] = await Promise.all([
                window.api.vouchers.getAll(),
                window.api.customers.getAll(),
                window.api.suppliers.getAll()
            ]);
            setVouchers(vouchersData || []);
            setCustomers(customersData || []);
            setSuppliers(suppliersData || []);
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    // Load ALL unpaid invoices (those not fully paid) when customer/supplier changes
    const loadPendingInvoices = async (type, id, currentInvoiceId = null) => {
        if (!id || id === 'cash') { setPendingInvoices([]); return; }
        try {
            let invoices = [];
            if (type === 'receipt') {
                invoices = await window.api.invoices.getByCustomer(parseInt(id));
            } else {
                invoices = await window.api.invoices.getBySupplier(parseInt(id));
            }
            // Filter to only unpaid invoices (exclude if status is 'paid' or if paid >= total)
            // Always include the currently linked invoice so it stays visible during editing
            const unpaid = (invoices || []).filter(inv => {
                if (currentInvoiceId && inv.id === parseInt(currentInvoiceId)) return true; // Keep linked invoice
                if (inv.status === 'paid') return false; // Exclude fully paid invoices
                const paid = inv.paid || 0;
                const total = inv.total || 0;
                return paid < total; // Include if there's still balance due
            });
            setPendingInvoices(unpaid);
        } catch (e) { console.error(e); setPendingInvoices([]); }
    };

    const handlePartyTypeChange = (type) => {
        setPartyType(type);
        setFormData(prev => ({
            ...prev,
            customer_id: '',
            supplier_id: '',
            invoice_id: ''
        }));
        setPendingInvoices([]);
    };

    const handleCustomerChange = (e) => {
        const customerId = e.target.value;
        setFormData({ ...formData, customer_id: customerId, invoice_id: '' });
        setInvoiceSearch('');
        loadPendingInvoices('receipt', customerId);
    };

    const handleSupplierChange = (e) => {
        const supplierId = e.target.value;
        setFormData({ ...formData, supplier_id: supplierId, invoice_id: '' });
        setInvoiceSearch('');
        loadPendingInvoices('payment', supplierId);
    };

    // Calculate the remaining balance for the currently selected invoice
    const getSelectedInvoiceRemaining = () => {
        if (!formData.invoice_id) return null;
        const invoice = pendingInvoices.find(inv => String(inv.id) === String(formData.invoice_id));
        if (!invoice) return null;
        return invoice.total - (invoice.paid || 0);
    };
    const selectedInvoiceRemaining = getSelectedInvoiceRemaining();

    const handleInvoiceSelect = (invoiceId) => {
        if (String(formData.invoice_id) === String(invoiceId)) {
            // Deselect if clicking the same invoice
            setFormData({ ...formData, invoice_id: '', amount: 0 });
            return;
        }
        const invoice = pendingInvoices.find(inv => inv.id === parseInt(invoiceId));
        if (invoice) {
            const remaining = invoice.total - (invoice.paid || 0);
            setFormData({ ...formData, invoice_id: String(invoiceId), amount: remaining });
        } else {
            setFormData({ ...formData, invoice_id: '', amount: 0 });
        }
    };

    // Handle amount change with validation against selected invoice remaining
    const handleAmountChange = (e) => {
        let value = e.target.value;
        // Allow empty input for typing
        if (value === '' || value === undefined) {
            setFormData({ ...formData, amount: '' });
            return;
        }
        const numVal = parseFloat(value);
        // If an invoice is selected, cap at remaining balance
        if (formData.invoice_id && selectedInvoiceRemaining !== null) {
            if (numVal > selectedInvoiceRemaining) {
                toast.error(t('vouch_amount_exceeds') || `لا يمكن إدخال مبلغ أعلى من المتبقي من الفاتورة (${formatCurrency(selectedInvoiceRemaining)})`);
                setFormData({ ...formData, amount: selectedInvoiceRemaining });
                return;
            }
        }
        setFormData({ ...formData, amount: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!editMode) {
            if (partyType === 'customer' && !formData.customer_id) {
                toast.error(t('vouch_customer_required') || 'Customer is required');
                return;
            }
            if (partyType === 'supplier' && !formData.supplier_id) {
                toast.error(t('vouch_supplier_required') || 'Supplier is required');
                return;
            }
            if (parseFloat(formData.amount) <= 0) {
                toast.error(t('vouch_amount_required') || 'Amount must be greater than zero');
                return;
            }
            // Alert user if there are pending invoices but none was selected
            if (!formData.invoice_id && pendingInvoices.length > 0) {
                const confirmLink = window.confirm(
                    t('vouch_alert_has_pending_invoices') || 
                    'تنبيه: يوجد فواتير غير مدفوعة لهذا الحساب. هل تريد التراجع لاختيار فاتورة لربطها بالسند؟'
                );
                if (confirmLink) {
                    return; // Stop and let user select an invoice
                }
            }
            // Validate amount doesn't exceed selected invoice remaining
            if (formData.invoice_id) {
                const selectedInv = pendingInvoices.find(inv => String(inv.id) === String(formData.invoice_id));
                if (selectedInv) {
                    const remaining = selectedInv.total - (selectedInv.paid || 0);
                    if (parseFloat(formData.amount) > remaining) {
                        toast.error(t('vouch_amount_exceeds') || `لا يمكن إدخال مبلغ أعلى من المتبقي من الفاتورة (${formatCurrency(remaining)})`);
                        return;
                    }
                }
            }
        }
        try {
            const voucherData = {
                ...formData,
                customer_id: (partyType === 'customer' && formData.customer_id) ? parseInt(formData.customer_id) : null,
                supplier_id: (partyType === 'supplier' && formData.supplier_id) ? parseInt(formData.supplier_id) : null,
                invoice_id: formData.invoice_id ? parseInt(formData.invoice_id) : null,
                amount: parseFloat(formData.amount) || 0
            };

            if (editMode) {
                await window.api.vouchers.update({ ...voucherData, id: editingId });
                toast.success(t('savedSuccess') || 'Voucher updated successfully');
            } else {
                await window.api.vouchers.create(voucherData);
                toast.success(t('savedSuccess') || 'Voucher added successfully');
            }
            loadData();
            closeModal();
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('errorOccurred') || 'Error occurred while saving voucher');
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('vouch_deleteConfirm'))) {
            try {
                await window.api.vouchers.delete(id);
                toast.success(t('savedSuccess') || 'Voucher deleted successfully');
                loadData();
            } catch (error) {
                console.error('Error deleting voucher:', error);
                toast.error(t('errorOccurred') || 'Error occurred while deleting voucher');
            }
        }
    };

    const handleEdit = async (voucher) => {
        const pType = voucher.supplier_id ? 'supplier' : 'customer';
        setPartyType(pType);
        setEditMode(true);
        setEditingId(voucher.id);
        setFormData({
            type: voucher.type,
            date: voucher.date,
            amount: voucher.amount,
            customer_id: voucher.customer_id ? String(voucher.customer_id) : '',
            supplier_id: voucher.supplier_id ? String(voucher.supplier_id) : '',
            payment_method: voucher.payment_method || 'cash',
            invoice_id: voucher.invoice_id ? String(voucher.invoice_id) : '',
            reference: voucher.reference || '',
            description: voucher.description || ''
        });
        setShowModal(true);
        // Load pending invoices for the linked customer/supplier, passing the current invoice ID
        if (pType === 'customer' && voucher.customer_id) {
            loadPendingInvoices('receipt', voucher.customer_id, voucher.invoice_id);
        } else if (pType === 'supplier' && voucher.supplier_id) {
            loadPendingInvoices('payment', voucher.supplier_id, voucher.invoice_id);
        }
    };

    const openModal = (type) => {
        const defaultParty = type === 'receipt' ? 'customer' : 'supplier';
        setPartyType(defaultParty);
        setEditMode(false);
        setEditingId(null);
        setPendingInvoices([]);
        setInvoiceSearch('');
        setFormData({
            type, date: new Date().toISOString().split('T')[0],
            amount: 0,
            customer_id: '',
            supplier_id: '',
            payment_method: 'cash', invoice_id: '', reference: '', description: ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditMode(false);
        setEditingId(null);
        setPendingInvoices([]);
        setInvoiceSearch('');
    };

    const filteredVouchers = useMemo(() => {
        return vouchers.filter(v => {
            if (v.type !== activeTab) return false;
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                v.voucher_number?.toLowerCase().includes(q) ||
                v.customer_name?.toLowerCase().includes(q) ||
                v.supplier_name?.toLowerCase().includes(q) ||
                String(v.amount).includes(q)
            );
        });
    }, [vouchers, activeTab, searchQuery]);

    // Filter invoices by search
    const filteredInvoices = useMemo(() => {
        return pendingInvoices.filter(inv => {
            if (!invoiceSearch) return true;
            const q = invoiceSearch.toLowerCase();
            return (
                inv.invoice_number?.toLowerCase().includes(q) ||
                String(inv.total).includes(q)
            );
        });
    }, [pendingInvoices, invoiceSearch]);

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (t('currency_kd') || 'KD');

    const customerOptions = useMemo(() => {
        return customers.filter(c => c.code !== 'CUST-CASH').map(c => ({ value: String(c.id), label: `${c.name} (${formatCurrency(c.balance)})` }));
    }, [customers, t]);

    const supplierOptions = useMemo(() => {
        return suppliers.filter(s => s.code !== 'SUPP-CASH').map(s => ({ value: String(s.id), label: `${s.name} (${formatCurrency(s.balance)})` }));
    }, [suppliers, t]);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="tabs" style={{ marginBottom: 0, border: 'none' }}>
                        <button className={`tab ${activeTab === 'receipt' ? 'active' : ''}`} onClick={() => setActiveTab('receipt')}>
                            <ArrowDownCircle size={18} style={{ marginLeft: '8px' }} /> {t('vouch_receipt')}
                        </button>
                        <button className={`tab ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
                            <ArrowUpCircle size={18} style={{ marginLeft: '8px' }} /> {t('vouch_payment')}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="form-input"
                            placeholder={t('search') + " (Ctrl+F)"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '250px' }}
                        />
                    </div>
                </div>
                {user?.permissions?.[activeTab === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers']?.can_create && (
                    <button className="btn btn-primary" onClick={() => openModal(activeTab)}>
                        <Plus size={18} /> {activeTab === 'receipt' ? t('vouch_addReceipt') : t('vouch_addPayment')}
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredVouchers.length === 0 ? (
                        <div className="empty-state">
                            <CreditCard size={48} />
                            <h3>{t('noData')}</h3>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('vouch_number')}</th>
                                        <th>{t('date')}</th>
                                        <th>{activeTab === 'receipt' ? t('dash_customer') : t('dash_supplier')}</th>
                                        <th>{t('vouch_amount')}</th>
                                        <th>{t('inv_paymentMethod')}</th>
                                        <th>{t('vouch_invoice')}</th>
                                        <th>{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVouchers.slice(0, visibleVouchersCount).map(voucher => (
                                        <tr key={voucher.id}>
                                            <td className="font-bold">{voucher.voucher_number}</td>
                                            <td>{new Date(voucher.date).toLocaleDateString('en-GB')}</td>
                                            <td>{voucher.customer_name || voucher.supplier_name || '-'}</td>
                                            <td className={`font-bold ${activeTab === 'receipt' ? 'text-success' : 'text-danger'}`}>
                                                {formatCurrency(voucher.amount)}
                                            </td>
                                            <td>
                                                <span className="badge badge-primary">
                                                    {voucher.payment_method === 'cash' ? t('inv_cash') : voucher.payment_method === 'bank' ? t('inv_bank') : t('vouch_check')}
                                                </span>
                                            </td>
                                            <td>{voucher.invoice_id ? `#${voucher.invoice_id}` : '-'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    {user?.permissions?.[activeTab === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers']?.can_edit && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(voucher)} title={t('edit')}>
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    {user?.permissions?.[activeTab === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers']?.can_delete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(voucher.id)} title={t('delete')}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredVouchers.length > visibleVouchersCount && (
                                <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary" 
                                        onClick={() => setVisibleVouchersCount(prev => prev + 50)}
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
            <Modal isOpen={showModal} onClose={closeModal} title={editMode ? (formData.type === 'receipt' ? t('vouch_editReceipt') : t('vouch_editPayment')) : (formData.type === 'receipt' ? t('vouch_addReceipt') : t('vouch_addPayment'))} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel') || 'Cancel'} (Esc)</button><button type="submit" form="voucher-form" className="btn btn-primary">{t('save') || 'Save'} (Ctrl+S)</button></>}>
                <form id="voucher-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('date')}</label>
                            <input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('vouch_amount')} *</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                value={formData.amount} 
                                onChange={handleAmountChange} 
                                step="0.250" 
                                min="0"
                                max={selectedInvoiceRemaining !== null ? selectedInvoiceRemaining : undefined}
                                required 
                            />
                            {formData.invoice_id && selectedInvoiceRemaining !== null && (
                                <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <small style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                        📋 {t('vouch_invoiceMax') || 'الحد الأقصى'}: {formatCurrency(selectedInvoiceRemaining)}
                                    </small>
                                    {parseFloat(formData.amount) > 0 && parseFloat(formData.amount) < selectedInvoiceRemaining && (
                                        <small style={{ color: 'var(--warning, #f59e0b)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            ⚡ {t('vouch_partialPayment') || 'دفع جزئي'} — {t('vouch_remainingAfter') || 'المتبقي بعد الدفع'}: {formatCurrency(selectedInvoiceRemaining - parseFloat(formData.amount))}
                                        </small>
                                    )}
                                    {parseFloat(formData.amount) === selectedInvoiceRemaining && (
                                        <small style={{ color: 'var(--success, #22c55e)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            ✅ {t('vouch_fullPayment') || 'دفع كامل'}
                                        </small>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">{t('vouch_partyType') || 'نوع الحساب / الطرف الثاني'}</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className={`btn ${partyType === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handlePartyTypeChange('customer')}
                                style={{ flex: 1, padding: '6px 12px', fontSize: '0.88rem', borderRadius: '6px' }}
                                disabled={editMode}
                            >
                                {t('dash_customer') || 'عميل'}
                            </button>
                            <button
                                type="button"
                                className={`btn ${partyType === 'supplier' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handlePartyTypeChange('supplier')}
                                style={{ flex: 1, padding: '6px 12px', fontSize: '0.88rem', borderRadius: '6px' }}
                                disabled={editMode}
                            >
                                {t('dash_supplier') || 'مورد'}
                            </button>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{partyType === 'customer' ? (t('dash_customer') || 'العميل') : (t('dash_supplier') || 'المورد')}</label>
                            {partyType === 'customer' ? (
                                <SearchableSelect
                                    options={customerOptions}
                                    value={formData.customer_id ? String(formData.customer_id) : ''}
                                    onChange={(val) => handleCustomerChange({ target: { value: val } })}
                                    placeholder={t('vouch_selectCustomer')}
                                    emptyLabel={t('vouch_selectCustomer')}
                                    disabled={editMode}
                                />
                            ) : (
                                <SearchableSelect
                                    options={supplierOptions}
                                    value={formData.supplier_id ? String(formData.supplier_id) : ''}
                                    onChange={(val) => handleSupplierChange({ target: { value: val } })}
                                    placeholder={t('vouch_selectSupplier')}
                                    emptyLabel={t('vouch_selectSupplier')}
                                    disabled={editMode}
                                />
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('inv_paymentMethod')}</label>
                            <select className="form-select" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                                <option value="cash">{t('inv_cash')}</option>
                                <option value="bank">{t('inv_bank')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Invoice linking section - always visible when customer/supplier is selected */}
                    {((partyType === 'customer' && formData.customer_id) || 
                      (partyType === 'supplier' && formData.supplier_id)) && (
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                            <label className="form-label" style={{ color: 'var(--primary)', marginBottom: '8px' }}>🔗 {t('vouch_linkInvoice')} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({t('vouch_optional') || 'اختياري'})</span></label>

                            {editMode ? (
                                <div style={{ 
                                    padding: '10px 12px', 
                                    border: '1px solid var(--border)', 
                                    borderRadius: '6px', 
                                    backgroundColor: 'var(--bg-primary)', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    opacity: 0.85
                                }}>
                                    {(() => {
                                        const selectedInvoice = pendingInvoices.find(inv => String(inv.id) === String(formData.invoice_id));
                                        if (selectedInvoice) {
                                            return (
                                                <>
                                                    <div>
                                                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{selectedInvoice.invoice_number}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                            {new Date(selectedInvoice.date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <span style={{ fontWeight: 'bold' }}>{formatCurrency(selectedInvoice.total)}</span>
                                                    </div>
                                                </>
                                            );
                                        } else {
                                            return <span style={{ color: 'var(--text-muted)' }}>{t('vouch_noLink') || 'بدون ربط بفاتورة'}</span>;
                                        }
                                    })()}
                                </div>
                            ) : pendingInvoices.length === 0 ? (
                                <div style={{ padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                                        ℹ️ {t('vouch_noUnpaidInvoices') || 'لا توجد فواتير غير مدفوعة'}
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '4px 0 0 0' }}>
                                        {t('vouch_payWithoutInvoice') || 'يمكنك الدفع بدون ربط بفاتورة - أدخل المبلغ يدوياً'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Search box for invoices */}
                                    <div style={{ marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder={t('vouch_searchInvoice')}
                                            value={invoiceSearch}
                                            onChange={(e) => setInvoiceSearch(e.target.value)}
                                        />
                                    </div>

                                    {/* Invoice list */}
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)' }}>
                                        {filteredInvoices.map(inv => {
                                            const remaining = inv.total - (inv.paid || 0);
                                            const isSelected = String(formData.invoice_id) === String(inv.id);
                                            return (
                                                <div
                                                    key={inv.id}
                                                    onClick={() => handleInvoiceSelect(inv.id)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        backgroundColor: isSelected ? 'var(--primary-light, rgba(59,130,246,0.1))' : 'transparent',
                                                        fontWeight: isSelected ? 'bold' : 'normal'
                                                    }}
                                                >
                                                    <div>
                                                        {isSelected && <span style={{ color: 'var(--primary)', marginLeft: '4px' }}>✓</span>}
                                                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{inv.invoice_number}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                                            {new Date(inv.date).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t('total')}: {formatCurrency(inv.total)}</div>
                                                        <div style={{ fontWeight: 'bold', color: 'var(--danger, #ef4444)' }}>{t('vouch_remaining')}: {formatCurrency(remaining)}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {filteredInvoices.length === 0 && invoiceSearch && (
                                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                {t('noData')}
                                            </div>
                                        )}
                                    </div>

                                    <small style={{ color: 'var(--text-muted)', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                                        ℹ️ {t('vouch_linkNote')} ({pendingInvoices.length} {t('vouch_unpaidCount')})
                                    </small>
                                </>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{t('vouch_reference')}</label>
                        <input type="text" className="form-input" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder={t('vouch_referencePlaceholder')} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('vouch_description')}</label>
                        <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Vouchers;
