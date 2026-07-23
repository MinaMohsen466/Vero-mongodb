import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import {
    Plus, Trash2, Search, Filter, ArrowLeftRight, Package,
    Calendar, X, Info, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Warehouse() {
    const { t, language, user } = useAuth();
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'transfers'
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [settings, setSettings] = useState({});
    const isAr = language === 'ar';

    const getFriendlyErrorMessage = (error, defaultKey) => {
        const msg = error?.message || String(error);
        if (msg.includes('No handler registered') || msg.includes('Error invoking remote method')) {
            return language === 'ar' 
                ? 'يرجى إعادة تشغيل التطبيق لتفعيل ميزات المخزن الجديدة.' 
                : 'Please restart the application to enable the new warehouse features.';
        }
        return msg || t(defaultKey);
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Modal states
    const [showNewModal, setShowNewModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    // Form state
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [transferNotes, setTransferNotes] = useState('');
    const [transferItems, setTransferItems] = useState([]); // [{ product_id, quantity, name, available }]
    
    // For selecting a product in the transfer form
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedQty, setSelectedQty] = useState('');
    const [transferDirection, setTransferDirection] = useState('shop_to_warehouse'); // 'shop_to_warehouse' | 'warehouse_to_shop'

    // For direct stock inflow (Replenishing warehouse stock)
    const [showInflowModal, setShowInflowModal] = useState(false);
    const [inflowProductId, setInflowProductId] = useState('');
    const [inflowQty, setInflowQty] = useState('');

    const handleDirectInflowSubmit = async (e) => {
        e.preventDefault();
        const id = parseInt(inflowProductId, 10);
        const qty = parseFloat(inflowQty);
        
        if (!id) {
            toast.error(t('select_product') || 'يرجى اختيار منتج');
            return;
        }
        if (!qty || qty <= 0) {
            toast.error(t('invalid_quantity') || 'الكمية غير صالحة');
            return;
        }

        const product = products.find(p => p.id === id);
        if (!product) return;

        // Check shop stock availability if negative stock is not allowed
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        const availableStock = product.shop_stock || 0;
        if (!allowNegative && qty > availableStock) {
            toast.error(
                isAr
                    ? `الكمية المدخلة تفوق الكمية المتاحة في المحل (${availableStock})`
                    : `Entered quantity exceeds available stock in shop (${availableStock})`
            );
            return;
        }

        setLoading(true);
        try {
            const payload = {
                date: new Date().toISOString().split('T')[0],
                notes: t('direct_inflow_notes') || 'توريد للمستودع من المحل',
                direction: 'shop_to_warehouse',
                status: 'completed',
                created_by: user?.id || null,
                items: [{
                    product_id: id,
                    quantity: qty
                }]
            };

            if (!window.api?.stockTransfers?.create) {
                toast.error(t('restart_app_required') || 'يرجى إعادة تشغيل التطبيق لتفعيل ميزات المستودع الجديدة.');
                return;
            }
            const result = await window.api.stockTransfers.create(payload);
            if (result.success) {
                toast.success(t('stock_added_success') || 'تم إضافة الكمية للمستودع بنجاح');
                setShowInflowModal(false);
                setInflowProductId('');
                setInflowQty('');
                loadData();
            } else {
                toast.error(result.error || t('errorOccurred'));
            }
        } catch (error) {
            console.error('Failed to add warehouse stock:', error);
            toast.error(getFriendlyErrorMessage(error, 'errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        let prodData = [];
        let transferData = [];
        let settingsData = {};

        try {
            if (window.api.products?.getAll) {
                prodData = await window.api.products.getAll();
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        }

        try {
            if (window.api.stockTransfers?.getAll) {
                transferData = await window.api.stockTransfers.getAll();
            }
        } catch (error) {
            console.error('Failed to load stock transfers:', error);
        }

        try {
            if (window.api.settings?.getAll) {
                settingsData = await window.api.settings.getAll();
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }

        setProducts(prodData || []);
        setTransfers(transferData || []);
        setSettings(settingsData || {});
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (p.code || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = !categoryFilter || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, categoryFilter]);

    const categories = useMemo(() => {
        return [...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const productOptions = useMemo(() => {
        return products.map(p => ({
            value: String(p.id),
            label: `${p.name} (${p.code})`
        }));
    }, [products]);

    // Access permissions
    const canCreateTransfer = user?.role === 'admin' || user?.permissions?.warehouse?.can_create;
    const canDeleteTransfer = user?.role === 'admin' || user?.permissions?.warehouse?.can_delete;

    const handleAddProductToTransfer = () => {
        if (!selectedProductId) {
            toast.error(t('select_product') || 'يرجى اختيار منتج');
            return;
        }

        const qty = parseFloat(selectedQty);
        if (!qty || qty <= 0) {
            toast.error(t('invalid_quantity') || 'الكمية غير صالحة');
            return;
        }

        const product = products.find(p => p.id === parseInt(selectedProductId, 10));
        if (!product) return;

        // Check if product is already in the list
        if (transferItems.some(item => item.product_id === product.id)) {
            toast.error(t('product_already_added') || 'تم إضافة المنتج بالفعل');
            return;
        }

        // Calculate available stock for reference display
        const availableStock = transferDirection === 'shop_to_warehouse' ? (product.shop_stock || 0) : (product.warehouse_stock || 0);

        // Check stock availability if negative stock is not allowed
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        if (!allowNegative && qty > availableStock) {
            toast.error(
                isAr
                    ? `الكمية المدخلة تفوق الكمية المتاحة في ${transferDirection === 'shop_to_warehouse' ? 'المحل' : 'المستودع'} (${availableStock})`
                    : `Entered quantity exceeds available stock in ${transferDirection === 'shop_to_warehouse' ? 'shop' : 'warehouse'} (${availableStock})`
            );
            return;
        }

        setTransferItems(prev => [
            ...prev,
            {
                product_id: product.id,
                name: product.name,
                code: product.code,
                quantity: qty,
                available: availableStock
            }
        ]);

        // Reset selector
        setSelectedProductId('');
        setSelectedQty('');
    };

    const handleRemoveProductFromTransfer = (productId) => {
        setTransferItems(prev => prev.filter(item => item.product_id !== productId));
    };

    const handleCreateTransferSubmit = async (e) => {
        e.preventDefault();
        if (transferItems.length === 0) {
            toast.error(t('add_items_error') || 'يرجى إضافة صنف واحد على الأقل للتحويل');
            return;
        }

        // Final validation of items stock if negative stock is not allowed
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        if (!allowNegative) {
            for (const item of transferItems) {
                const prod = products.find(p => p.id === item.product_id);
                if (prod) {
                    const availableStock = transferDirection === 'shop_to_warehouse' ? (prod.shop_stock || 0) : (prod.warehouse_stock || 0);
                    if (item.quantity > availableStock) {
                        toast.error(
                            isAr 
                                ? `الكمية المراد تحويلها لـ "${prod.name}" تفوق الكمية المتاحة في ${transferDirection === 'shop_to_warehouse' ? 'المحل' : 'المستودع'} (المتاح: ${availableStock}، المطلوب: ${item.quantity})`
                                : `Requested quantity for "${prod.name}" exceeds available stock in ${transferDirection === 'shop_to_warehouse' ? 'shop' : 'warehouse'} (Available: ${availableStock}, Requested: ${item.quantity})`
                        );
                        return;
                    }
                }
            }
        }

        setLoading(true);
        try {
            const payload = {
                date: transferDate,
                notes: transferNotes,
                direction: transferDirection,
                status: 'completed',
                created_by: user?.id || null,
                items: transferItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity
                }))
            };

            if (!window.api?.stockTransfers?.create) {
                toast.error(t('restart_app_required') || 'يرجى إعادة تشغيل التطبيق لتفعيل ميزات المستودع الجديدة.');
                return;
            }
            const result = await window.api.stockTransfers.create(payload);
            if (result.success) {
                toast.success(t('transfer_created') || 'تم إنشاء التحويل بنجاح');
                setShowNewModal(false);
                setTransferNotes('');
                setTransferItems([]);
                loadData();
            } else {
                toast.error(result.error || t('errorOccurred'));
            }
        } catch (error) {
            console.error('Failed to create transfer:', error);
            toast.error(getFriendlyErrorMessage(error, 'errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransfer = async (id) => {
        if (!window.confirm(t('transfer_delete_confirm') || 'هل أنت متأكد من حذف هذا التحويل؟ سيتم إرجاع الكميات للمستودع.')) {
            return;
        }

        if (!window.api?.stockTransfers?.delete) {
            toast.error(t('restart_app_required') || 'يرجى إعادة تشغيل التطبيق لتفعيل ميزات المستودع الجديدة.');
            return;
        }

        setLoading(true);
        try {
            const result = await window.api.stockTransfers.delete(id);
            if (result.success) {
                toast.success(t('transfer_deleted') || 'تم حذف التحويل بنجاح');
                loadData();
            } else {
                toast.error(result.error || t('errorOccurred'));
            }
        } catch (error) {
            console.error('Failed to delete transfer:', error);
            toast.error(getFriendlyErrorMessage(error, 'errorOccurred'));
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (tr) => {
        setSelectedTransfer(tr);
        setShowDetailsModal(true);
    };

    // Products available for transfer selection based on direction (show all products regardless of stock level)
    const availableProductsForTransfer = products;

    return (
        <div className="container" style={{ padding: '24px', animation: 'fadeIn 0.3s ease-in-out' }}>
            {!window.api?.stockTransfers && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertCircle size={18} />
                    {language === 'ar' 
                        ? 'يرجى إعادة تشغيل التطبيق (Restart) لتحديث النظام وتفعيل ميزات المستودع الجديدة.' 
                        : 'Please restart the application to update the system and enable the new warehouse features.'}
                </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowLeftRight size={28} color="var(--primary)" />
                        {t('menu_warehouse') || 'إدارة المخزن والتحويلات'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                        {t('warehouse_subtitle') || 'إدارة المخازن ونقل الكميات من المستودع إلى المحل للبيع'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {canCreateTransfer && (
                        <button 
                            className="btn btn-secondary"
                            onClick={() => {
                                setInflowProductId('');
                                setInflowQty('');
                                setShowInflowModal(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} />
                            {t('add_warehouse_stock') || 'توريد كميات للمستودع'}
                        </button>
                    )}
                    {canCreateTransfer && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => {
                                setTransferDate(new Date().toISOString().split('T')[0]);
                                setTransferNotes('');
                                setTransferItems([]);
                                setShowNewModal(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={18} />
                            {t('new_transfer') || 'تحويل مخزني جديد'}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border)',
                marginBottom: '24px',
                gap: '8px'
            }}>
                <button
                    onClick={() => setActiveTab('inventory')}
                    style={{
                        padding: '12px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'inventory' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'inventory' ? '600' : '500',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Package size={18} />
                    {t('warehouse_overview') || 'جرد وجرد المخازن'}
                </button>
                <button
                    onClick={() => setActiveTab('transfers')}
                    style={{
                        padding: '12px 18px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'transfers' ? '3px solid var(--primary)' : '3px solid transparent',
                        color: activeTab === 'transfers' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'transfers' ? '600' : '500',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowLeftRight size={18} />
                    {t('stock_transfers') || 'التحويلات المخزنية'}
                </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'inventory' ? (
                <div>
                    {/* Filters Bar */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div className="card-body" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <div className="search-input-container" style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('search') || 'بحث عن صنف أو كود...'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingInlineStart: '40px', height: '42px' }}
                                />
                            </div>
                            
                            <div style={{ width: '200px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={18} color="var(--text-muted)" />
                                <select
                                    className="form-input"
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    style={{ height: '42px', flex: 1 }}
                                >
                                    <option value="">{t('all_categories') || 'كل الأقسام'}</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Table */}
                    <div className="card">
                        <div className="card-body" style={{ padding: 0 }}>
                            {filteredProducts.length === 0 ? (
                                <div className="empty-state" style={{ padding: '60px 20px' }}>
                                    <Package size={48} color="var(--text-muted)" />
                                    <h3 style={{ marginTop: '16px', fontWeight: 600 }}>{t('noData') || 'لا توجد بيانات'}</h3>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>{t('code') || 'الكود'}</th>
                                                <th>{t('product_name') || 'اسم المنتج'}</th>
                                                <th>{t('prod_category') || 'القسم'}</th>
                                                <th>{t('prod_unit') || 'الوحدة'}</th>
                                                <th style={{ textAlign: 'center', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 'bold' }}>
                                                    {t('warehouse_stock') || 'مخزون المستودع'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td>{p.code}</td>
                                                    <td className="font-bold">{p.name}</td>
                                                    <td>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            {p.category || '—'}
                                                        </span>
                                                    </td>
                                                    <td>{p.unit}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: '600', color: 'var(--primary)' }}>
                                                        {p.warehouse_stock || 0}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div>
                    {/* Transfers History */}
                    <div className="card">
                        <div className="card-body" style={{ padding: 0 }}>
                            {transfers.length === 0 ? (
                                <div className="empty-state" style={{ padding: '60px 20px' }}>
                                    <ArrowLeftRight size={48} color="var(--text-muted)" />
                                    <h3 style={{ marginTop: '16px', fontWeight: 600 }}>{t('no_transfers') || 'لا توجد عمليات تحويل حالية'}</h3>
                                    {canCreateTransfer && (
                                        <button 
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setShowNewModal(true)}
                                            style={{ marginTop: '16px' }}
                                        >
                                            {t('new_transfer') || 'إنشاء أول تحويل'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>{t('transfer_number') || 'رقم التحويل'}</th>
                                                <th>{t('transfer_date') || 'تاريخ التحويل'}</th>
                                                <th>{t('transfer_direction') || 'اتجاه التحويل'}</th>
                                                <th>{t('status') || 'الحالة'}</th>
                                                <th>{t('notes') || 'ملاحظات'}</th>
                                                <th style={{ textAlign: 'center' }}>{t('actions') || 'إجراءات'}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transfers.map(tr => (
                                                <tr key={tr.id}>
                                                    <td className="font-bold" style={{ color: 'var(--primary)' }}>{tr.transfer_number}</td>
                                                    <td>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Calendar size={14} color="var(--text-muted)" />
                                                            {tr.date}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${tr.direction === 'warehouse_to_shop' ? 'badge-primary' : 'badge-secondary'}`}>
                                                            {tr.direction === 'warehouse_to_shop' 
                                                                ? (t('transfer_warehouse_to_shop') || 'من المستودع إلى المحل')
                                                                : (t('transfer_shop_to_warehouse') || 'من المحل إلى المستودع')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <CheckCircle size={12} />
                                                            {t('completed') || 'مكتمل'}
                                                        </span>
                                                    </td>
                                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {tr.notes || '—'}
                                                    </td>
                                                    <td>
                                                        <div className="table-actions" style={{ justifyContent: 'center', gap: '8px' }}>
                                                            <button 
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => handleViewDetails(tr)}
                                                                style={{ color: 'var(--primary)' }}
                                                            >
                                                                <Info size={16} />
                                                            </button>
                                                            {canDeleteTransfer && (
                                                                <button 
                                                                    className="btn btn-ghost btn-sm"
                                                                    onClick={() => handleDeleteTransfer(tr.id)}
                                                                    style={{ color: 'var(--text-danger)' }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
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
                </div>
            )}

            {/* New Transfer Modal */}
            <Modal
                isOpen={showNewModal}
                onClose={() => setShowNewModal(false)}
                title={t('new_transfer') || 'تحويل مخزني جديد'}
                size="lg"
            >
                <form onSubmit={handleCreateTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">{t('transfer_date') || 'تاريخ التحويل'} *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('transfer_direction') || 'اتجاه التحويل'} *</label>
                            <select
                                className="form-input"
                                value={transferDirection}
                                onChange={(e) => {
                                    setTransferDirection(e.target.value);
                                    setTransferItems([]);
                                    setSelectedProductId('');
                                    setSelectedQty('');
                                }}
                                required
                            >
                                <option value="shop_to_warehouse">{t('transfer_shop_to_warehouse') || 'من المحل إلى المستودع'}</option>
                                <option value="warehouse_to_shop">{t('transfer_warehouse_to_shop') || 'من المستودع إلى المحل'}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('notes') || 'ملاحظات / سبب التحويل'}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={transferNotes}
                                onChange={(e) => setTransferNotes(e.target.value)}
                                placeholder={t('transfer_notes_placeholder') || 'أدخل ملاحظات حول عملية التحويل...'}
                            />
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                    {/* Selector of products to transfer */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Plus size={16} color="var(--primary)" />
                            {t('add_product_to_transfer') || 'إضافة منتج لعملية التحويل'}
                        </h4>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div className="form-group" style={{ flex: 2, minWidth: '280px', marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('product') || 'المنتج'}</label>
                                <SearchableSelect
                                    options={productOptions}
                                    value={selectedProductId}
                                    onChange={(val) => {
                                        setSelectedProductId(val);
                                        setSelectedQty('');
                                    }}
                                    placeholder={transferDirection === 'shop_to_warehouse'
                                        ? (t('select_product_from_shop') || 'اختر صنفاً للتحويل من المحل...')
                                        : (t('select_product') || 'اختر صنفاً للتصدير من المستودع...')}
                                    emptyLabel={t('noData') || 'لا توجد أصناف متاحة'}
                                />
                            </div>

                            {selectedProductId && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'var(--bg-primary)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    fontSize: '0.85rem',
                                    height: '38px',
                                    alignSelf: 'flex-end'
                                }}>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {transferDirection === 'shop_to_warehouse'
                                            ? `${t('available_in_shop') || 'المتاح في المحل'}:`
                                            : `${t('available_in_warehouse') || 'المتاح في المستودع'}:`}
                                    </span>
                                    <strong style={{ color: 'var(--primary)', fontWeight: '700' }}>
                                        {(() => {
                                            const prod = products.find(p => p.id === parseInt(selectedProductId, 10));
                                            return transferDirection === 'shop_to_warehouse'
                                                ? (prod?.shop_stock || 0)
                                                : (prod?.warehouse_stock || 0);
                                        })()}
                                    </strong>
                                </div>
                            )}

                            <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '0.78rem' }}>{t('transfer_quantity') || 'الكمية المحولة'} *</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={selectedQty}
                                    onChange={(e) => setSelectedQty(e.target.value)}
                                    min="0.001"
                                    step="any"
                                    style={{ height: '38px' }}
                                    placeholder="0"
                                />
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleAddProductToTransfer}
                                style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Plus size={16} />
                                {t('add') || 'إضافة'}
                            </button>
                        </div>
                    </div>

                    {/* Table of selected items */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}>
                            {transferDirection === 'shop_to_warehouse'
                                ? (t('transfer_items_from_shop') || 'الأصناف المراد تحويلها من المحل')
                                : (t('transfer_items') || 'الأصناف المراد تحويلها من المستودع')}
                        </div>
                        {transferItems.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {t('no_items_selected') || 'لم يتم اختيار أي أصناف بعد. اختر صنفاً من القائمة أعلاه ثم اضغط إضافة.'}
                            </div>
                        ) : (
                            <div className="table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                <table className="table-sm">
                                    <thead>
                                        <tr>
                                            <th>{t('code') || 'الكود'}</th>
                                            <th>{t('product_name') || 'اسم المنتج'}</th>
                                            <th style={{ textAlign: 'center' }}>
                                                {transferDirection === 'shop_to_warehouse'
                                                    ? (t('available_in_shop') || 'المتاح في المحل')
                                                    : (t('available_in_warehouse') || 'المتاح في المستودع')}
                                            </th>
                                            <th style={{ textAlign: 'center' }}>{t('transfer_quantity') || 'الكمية المحولة'}</th>
                                            <th style={{ width: '50px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transferItems.map(item => (
                                            <tr key={item.product_id}>
                                                <td>{item.code}</td>
                                                <td className="font-bold">{item.name}</td>
                                                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{item.available}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{item.quantity}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleRemoveProductFromTransfer(item.product_id)}
                                                        style={{ color: 'var(--text-danger)', padding: '4px' }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Modal footer */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowNewModal(false)}
                            disabled={loading}
                        >
                            {t('cancel') || 'إلغاء'}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || transferItems.length === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {loading ? <span className="spinner-btn"></span> : <CheckCircle size={16} />}
                            {loading ? (t('savingProgress') || 'جاري الحفظ...') : (t('save') || 'إتمام التحويل وتعديل الأرصدة')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title={`${t('transfer_details') || 'تفاصيل التحويل المخزني'} - ${selectedTransfer?.transfer_number}`}
                size="lg"
            >
                {selectedTransfer && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('transfer_number') || 'رقم التحويل'}</div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedTransfer.transfer_number}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('transfer_date') || 'تاريخ التحويل'}</div>
                                <div style={{ fontWeight: '600' }}>{selectedTransfer.date}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('transfer_direction') || 'اتجاه التحويل'}</div>
                                <div style={{ fontWeight: '600' }}>
                                    <span className={`badge ${selectedTransfer.direction === 'warehouse_to_shop' ? 'badge-primary' : 'badge-secondary'}`}>
                                        {selectedTransfer.direction === 'warehouse_to_shop' 
                                            ? (t('transfer_warehouse_to_shop') || 'من المستودع إلى المحل')
                                            : (t('transfer_shop_to_warehouse') || 'من المحل إلى المستودع')}
                                    </span>
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 3' }}>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('notes') || 'ملاحظات'}</div>
                                <div>{selectedTransfer.notes || '—'}</div>
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}>
                                {t('transfer_items') || 'الأصناف المحولة'}
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('code') || 'الكود'}</th>
                                            <th>{t('product_name') || 'اسم المنتج'}</th>
                                            <th style={{ textAlign: 'center' }}>{t('transfer_quantity') || 'الكمية المحولة'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransfer.items.map(item => (
                                            <tr key={item.id}>
                                                <td>{item.product_code || '—'}</td>
                                                <td className="font-bold">{item.product_name || `ID: ${item.product_id}`}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowDetailsModal(false)}
                            >
                                {t('close') || 'إغلاق'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Direct Inflow Modal */}
            <Modal
                isOpen={showInflowModal}
                onClose={() => setShowInflowModal(false)}
                title={t('add_warehouse_stock') || 'توريد كميات للمستودع'}
                size="default"
            >
                <form onSubmit={handleDirectInflowSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">{t('product') || 'المنتج'} *</label>
                        <SearchableSelect
                            options={productOptions}
                            value={inflowProductId}
                            onChange={(val) => setInflowProductId(val)}
                            placeholder={t('select_product') || 'اختر صنفاً للمستودع...'}
                            emptyLabel={t('noData') || 'لا توجد أصناف'}
                        />
                    </div>

                    {inflowProductId && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem', textAlign: 'center' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('warehouse_stock') || 'الرصيد الحالي بالمستودع'}:</span>{' '}
                            <strong style={{ color: 'var(--primary)' }}>
                                {products.find(p => p.id === parseInt(inflowProductId, 10))?.warehouse_stock || 0}
                            </strong>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{t('quantity') || 'الكمية المضافة'} *</label>
                        <input
                            type="number"
                            className="form-input"
                            value={inflowQty}
                            onChange={(e) => setInflowQty(e.target.value)}
                            min="0.001"
                            step="any"
                            required
                            placeholder="0"
                            style={{ height: '40px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowInflowModal(false)}
                            disabled={loading}
                        >
                            {t('cancel') || 'إلغاء'}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !inflowProductId || !inflowQty}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {loading ? <span className="spinner-btn"></span> : <CheckCircle size={16} />}
                            {loading ? (t('savingProgress') || 'جاري الحفظ...') : (t('add') || 'إضافة الكمية للمستودع')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
