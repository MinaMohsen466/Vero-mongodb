import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, Check, Package, User, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../App';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4'];

// ─── Searchable Customer Dropdown ────────────────────────────────────────────
function CustomerSearch({ customers, value, onChange }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = customers.filter(c =>
        !query || c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query) || c.code?.includes(query)
    );

    const selected = value ? customers.find(c => c.id === value) : null;

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px', padding: '7px 10px', cursor: 'pointer',
                    color: 'white', fontSize: '0.85rem'
                }}
            >
                <User size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.name : (window.t ? window.t('cash_customer_no_account') : 'Cash Customer (No Account)')}
                </span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▼</span>
            </div>
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 200,
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    maxHeight: '240px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    marginTop: '4px'
                }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                        <input
                            autoFocus
                            type="text"
                            className="form-input"
                            placeholder={window.t ? window.t('search_customer_by_name_phone') : 'Search customer by name or phone...'}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem' }}
                        />
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
                        <div
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                            onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {window.t ? window.t('cash_customer_no_account') : 'Cash Customer (No Account)'}
                        </div>
                        {filtered.map(c => (
                            <div
                                key={c.id}
                                onClick={() => { onChange(c); setOpen(false); setQuery(''); }}
                                style={{
                                    padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                                    color: value === c.id ? 'var(--primary)' : 'var(--text-primary)',
                                    background: value === c.id ? 'rgba(var(--primary-rgb,99,102,241),0.08)' : 'transparent'
                                }}
                                onMouseEnter={e => { if (value !== c.id) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = value === c.id ? 'rgba(99,102,241,0.08)' : 'transparent'; }}
                            >
                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                {c.phone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.phone}</div>}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{window.t ? window.t('no_results') : 'No results found'}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main POS Component ───────────────────────────────────────────────────────
function POS() {
    const { user, t } = useAuth();
    window.t = t; // Expose t to global for CustomerSearch to use it easily without prop drilling
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // full list for stock sync
    const [customers, setCustomers] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    // Cart
    const [cart, setCart] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [discount, setDiscount] = useState(0);
    const [note, setNote] = useState('');

    // UI
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [saving, setSaving] = useState(false);
    const [lastReceipt, setLastReceipt] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Add customer
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({
        name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: '', is_active: 1
    });
    const [savingCustomer, setSavingCustomer] = useState(false);

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!newCustomerForm.name) {
            toast.error(t('customer_name_required') || 'Customer name is required');
            return;
        }
        setSavingCustomer(true);
        try {
            const formData = { ...newCustomerForm };
            const result = await window.api.customers.create(formData);
            if (result.success) {
                toast.success(t('customer_added_success') || 'Customer added successfully');
                const custs = await window.api.customers.getAll();
                setCustomers(custs || []);
                const newlyAdded = (custs || []).find(c => c.id === result.id);
                if (newlyAdded) setSelectedCustomer(newlyAdded);
                setShowAddCustomer(false);
                setNewCustomerForm({ name: '', phone: '', email: '', address: '', tax_number: '', credit_limit: 0, notes: '', is_active: 1 });
            } else {
                toast.error(result.error || t('error_adding') || 'Error adding');
            }
        } catch (error) {
            console.error(error);
            toast.error(t('error_adding') || 'Error adding');
        }
        setSavingCustomer(false);
    };

    const searchRef = useRef(null);
    const barcodeBuffer = useRef('');
    const barcodeTimer = useRef(null);

    useEffect(() => {
        loadData();
        setTimeout(() => searchRef.current?.focus(), 300);
    }, []);

    // Auto-refresh stock every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => refreshStock(false), 30000);
        return () => clearInterval(interval);
    }, []);

    // Barcode scanner
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName;
            const activeId = document.activeElement?.id;
            if (tag === 'INPUT' && activeId !== 'barcode-input') return;
            if (e.key === 'Enter' && barcodeBuffer.current.length > 2) {
                handleBarcodeSearch(barcodeBuffer.current.trim());
                barcodeBuffer.current = '';
                return;
            }
            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;
                clearTimeout(barcodeTimer.current);
                barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = ''; }, 300);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [allProducts]);

    const handleBarcodeSearch = (code) => {
        const product = allProducts.find(p => p.code === code || p.barcode === code);
        if (product) {
            addToCart(product);
            toast.success(`✓ ${product.name}`, { duration: 1200 });
        } else {
            setSearchQuery(code);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [prods, custs, sett] = await Promise.all([
                window.api.products.getAll(),
                window.api.customers.getAll(),
                window.api.settings.getAll()
            ]);
            const active = (prods || []).filter(p => p.is_active);
            setAllProducts(active);
            setProducts(active);
            setCustomers(custs || []);
            setSettings(sett || {});
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // Refresh only stock values (light refresh)
    const refreshStock = async (showIndicator = true) => {
        if (showIndicator) setRefreshing(true);
        try {
            const prods = await window.api.products.getAll();
            const active = (prods || []).filter(p => p.is_active);
            setAllProducts(active);
            setProducts(active);
            // Update cart stock info
            setCart(prev => prev.map(item => {
                const updated = active.find(p => p.id === item.id);
                return updated ? { ...item, stock: updated.stock_quantity } : item;
            }));
        } catch (e) { console.error(e); }
        if (showIndicator) setRefreshing(false);
    };

    const addToCart = useCallback((product) => {
        const fresh = allProducts.find(p => p.id === product.id) || product;
        if (fresh.stock_quantity <= 0) {
            toast.error(t('product_out_of_stock') || 'Product is out of stock');
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === fresh.id);
            if (existing) {
                if (existing.qty >= fresh.stock_quantity) {
                    toast.error(t('not_enough_stock') || 'Not enough stock');
                    return prev;
                }
                return prev.map(i => i.id === fresh.id
                    ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price }
                    : i
                );
            }
            return [...prev, {
                id: fresh.id, name: fresh.name, code: fresh.code,
                price: fresh.sale_price || 0, stock: fresh.stock_quantity,
                qty: 1, total: fresh.sale_price || 0
            }];
        });
    }, [allProducts]);

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(i => {
            if (i.id !== id) return i;
            const newQty = Math.max(1, Math.min(i.stock, i.qty + delta));
            return { ...i, qty: newQty, total: newQty * i.price };
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
    const clearCart = () => { setCart([]); setSelectedCustomer(null); setDiscount(0); setNote(''); };

    const subtotal = cart.reduce((s, i) => s + i.total, 0);
    const discountAmount = Math.min(subtotal, parseFloat(discount) || 0);
    const total = subtotal - discountAmount;
    const change = parseFloat(amountPaid) - total;

    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

    const filtered = products.filter(p => {
        const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const formatCurrency = (v) => {
        const decimals = parseInt(settings.general?.decimal_places || '3');
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: decimals }).format(v || 0) +
            ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));
    };

    const openPayModal = () => {
        if (cart.length === 0) { toast.error(t('cart_empty') || 'Cart is empty'); return; }
        setAmountPaid(total.toFixed(3));
        setShowPayModal(true);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        try {
            const isCash = payMethod === 'cash';
            const isCredit = payMethod === 'credit';
            const invoiceData = {
                type: 'sales',
                customer_id: selectedCustomer?.id || null,
                date: new Date().toISOString().split('T')[0],
                subtotal, discount: discountAmount, tax: 0, total,
                paid: isCredit ? 0 : total,
                status: isCredit ? 'pending' : 'paid',
                payment_method: isCredit ? 'credit' : payMethod,
                notes: note || t('pos') || 'Point of Sale',
                created_by: user?.id || null,
                items: cart.map(i => ({
                    product_id: i.id, description: i.name,
                    quantity: i.qty, unit_price: i.price,
                    discount: 0, tax: 0, total: i.total
                }))
            };
            const result = await window.api.invoices.create(invoiceData);
            if (result.success) {
                const receipt = {
                    number: result.invoice_number,
                    date: invoiceData.date,
                    customer: selectedCustomer?.name || t('cash_customer') || 'Cash Customer',
                    items: [...cart], subtotal, discountAmount, total,
                    payMethod, amountPaid: parseFloat(amountPaid) || total,
                    change: Math.max(0, (parseFloat(amountPaid) || total) - total),
                    company: settings.company?.company_name || t('my_company') || 'My Company'
                };
                setLastReceipt(receipt);
                setShowPayModal(false);
                setShowReceipt(true);
                clearCart();
                await refreshStock(false); // refresh stock after sale
                toast.success(`✓ ${t('sale_completed') || 'Sale completed'} - ${result.invoice_number}`);
            } else {
                toast.error(result.error || t('error_checkout') || 'Error during checkout');
            }
        } catch (e) {
            toast.error(t('error_checkout') || 'Error during checkout');
        }
        setSaving(false);
    };

    const printReceipt = () => {
        if (!lastReceipt) return;
        window.api.print.invoice(generateReceiptHTML(lastReceipt, settings, t));
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 116px)', gap: '0', overflow: 'hidden', background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

            {/* ── Left: Products ─────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '10px 10px 10px 10px', gap: '8px' }}>

                {/* Search + Filter Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            id="barcode-input"
                            ref={searchRef}
                            type="text"
                            className="form-input"
                            placeholder={t('search_product_barcode') || 'Search product or barcode...'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '36px', width: '100%', height: '42px', fontSize: '0.95rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}
                        />
                    </div>
                    {/* Categories Horizontal Scroll */}
                    <style>{`
                        .hide-scrollbar::-webkit-scrollbar { display: none; }
                        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                    <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                                padding: '8px 16px', borderRadius: '10px', border: '1px solid',
                                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
                                borderColor: categoryFilter === cat ? 'var(--primary)' : 'var(--border)',
                                background: categoryFilter === cat ? 'var(--primary)' : 'var(--surface)',
                                color: categoryFilter === cat ? 'white' : 'var(--text-primary)',
                                transition: 'all 0.2s', flexShrink: 0,
                                boxShadow: categoryFilter === cat ? '0 2px 8px rgba(var(--primary-rgb, 99,102,241), 0.25)' : 'none'
                            }}>
                                {cat === 'all' ? (t('all') || 'All') : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                <div style={{
                    flex: 1, overflowY: 'auto',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
                    gap: '8px', alignContent: 'start',
                    paddingTop: '12px',
                    paddingRight: '6px',
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p>{t('no_products') || 'No Products'}</p>
                        </div>
                    ) : filtered.map((product, i) => {
                        const outOfStock = product.stock_quantity <= 0;
                        const color = COLORS[i % COLORS.length];
                        const inCart = cart.find(c => c.id === product.id);
                        return (
                            <div
                                key={product.id}
                                onClick={() => !outOfStock && addToCart(product)}
                                style={{
                                    background: outOfStock ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                    border: inCart ? `2px solid ${color}` : '1px solid var(--border)',
                                    borderRadius: '12px', padding: '8px',
                                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                                    opacity: outOfStock ? 0.55 : 1,
                                    transition: 'all 0.15s',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                    position: 'relative', userSelect: 'none',
                                    overflow: 'visible', /* prevent badge clipping */
                                    boxShadow: inCart ? `0 4px 16px ${color}33` : 'var(--shadow)'
                                }}
                                onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                            >
                                {/* Cart Badge */}
                                {inCart && (
                                    <div style={{
                                        position: 'absolute', top: '-11px', right: '-11px',
                                        background: color, color: 'white',
                                        minWidth: '24px', height: '24px', borderRadius: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 800, lineHeight: 1,
                                        padding: '0 6px',
                                        boxShadow: `0 2px 8px ${color}88`,
                                        border: '2.5px solid var(--bg-primary)',
                                        zIndex: 10,
                                        pointerEvents: 'none'
                                    }}>
                                        {inCart.qty}
                                    </div>
                                )}
                                {product.image ? (
                                    <div style={{
                                        width: '100%', height: '90px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                                        border: '1px solid var(--border)'
                                    }}>
                                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ) : (
                                    <div style={{
                                        width: '100%', height: '90px', borderRadius: '8px',
                                        background: `${color}15`, display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color, flexShrink: 0,
                                        border: '1px solid transparent'
                                    }}>
                                        <Package size={32} style={{ opacity: 0.7 }} />
                                    </div>
                                )}
                                <div style={{ textAlign: 'center', width: '100%', padding: '2px 4px 0 4px' }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 'auto', paddingTop: '4px' }}>
                                    <p style={{ fontWeight: 700, color, fontSize: '0.85rem', margin: 0 }}>{formatCurrency(product.sale_price)}</p>
                                    {outOfStock ? (
                                        <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>✗ {t('out_of_stock') || 'Out of Stock'}</span>
                                    ) : (
                                        <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>{t('in_stock') || 'In Stock'}: {product.stock_quantity}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Right: Cart ────────────────────────────────────────────── */}
            <div style={{
                width: '340px', minWidth: '300px',
                background: 'var(--bg-primary)', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minHeight: 0
            }}>
                {/* Cart Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--primary)', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <ShoppingCart size={18} />
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('shopping_cart') || 'Cart'}</span>
                            {cart.length > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '12px', padding: '1px 8px', fontSize: '0.78rem', fontWeight: 700 }}>
                                    {cart.reduce((s, i) => s + i.qty, 0)}
                                </span>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                {t('clear_all') || 'Clear All'}
                            </button>
                        )}
                    </div>
                    {/* Searchable Customer */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <CustomerSearch
                                customers={customers}
                                value={selectedCustomer?.id || null}
                                onChange={setSelectedCustomer}
                            />
                        </div>
                        <button
                            onClick={() => setShowAddCustomer(true)}
                            title={t('add_new_customer') || 'Add New Customer'}
                            style={{
                                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '8px', width: '38px', height: '36px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                </div>

                {/* Cart Items — scrollable area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: 0 }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <ShoppingCart size={44} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p style={{ fontSize: '0.85rem' }}>{t('start_choosing_products') || 'Start choosing products'}</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 7px', borderRadius: '8px', marginBottom: '4px',
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)'
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                                {/* Editable price */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('price') || 'Price'}:</span>
                                    <input
                                        type="number"
                                        value={item.price}
                                        min="0"
                                        step="0.250"
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => {
                                            const newPrice = parseFloat(e.target.value) || 0;
                                            setCart(prev => prev.map(i =>
                                                i.id === item.id
                                                    ? { ...i, price: newPrice, total: newPrice * i.qty }
                                                    : i
                                            ));
                                        }}
                                        style={{
                                            width: '72px', padding: '1px 5px', fontSize: '0.72rem',
                                            border: '1px solid var(--border)', borderRadius: '5px',
                                            background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button onClick={() => updateQty(item.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    <Minus size={10} />
                                </button>
                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    <Plus size={10} />
                                </button>
                            </div>
                            <div style={{ textAlign: 'left', minWidth: '58px' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)', margin: 0 }}>{formatCurrency(item.total)}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Cart Footer — always visible */}
                <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                        <span>{t('subtotal') || 'Subtotal'}</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('discount') || 'Discount'} ({settings.general?.currency_symbol || (t('currency_kd') || 'KD')})</span>
                        <input
                            type="number"
                            className="form-input"
                            value={discount}
                            onChange={e => setDiscount(e.target.value)}
                            min="0" step="0.250"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.83rem', textAlign: 'left' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', paddingTop: '8px', borderTop: '2px solid var(--border)' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t('final_total') || 'Total'}</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(total)}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
                        <button
                            onClick={openPayModal}
                            disabled={cart.length === 0}
                            style={{
                                padding: '13px', background: cart.length > 0 ? 'var(--primary)' : 'var(--border)',
                                color: 'white', border: 'none', borderRadius: '10px',
                                cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                                fontSize: '0.95rem', fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <CreditCard size={18} /> {t('checkout') || 'Checkout'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Payment Modal ───────────────────────────────────────────── */}
            {showPayModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '26px', width: '420px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{t('checkout_process') || 'Checkout Process'}</h3>
                            <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Summary */}
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                                <span>{t('subtotal') || 'Subtotal'}</span><span>{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#ef4444', fontSize: '0.88rem' }}>
                                    <span>{t('discount') || 'Discount'}</span><span>- {formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>
                                <span>{t('final_total') || 'Total'}</span><span>{formatCurrency(total)}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '7px', display: 'block' }}>{t('payment_method') || 'Payment Method'}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {[
                                    { id: 'cash', label: `💵 ${t('cash') || 'Cash'}` },
                                    { id: 'bank', label: `💳 ${t('bank_transfer') || 'Bank Transfer'}` },
                                    { id: 'credit', label: `🕐 ${t('credit') || 'Credit'}` }
                                ].map(m => (
                                    <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
                                        padding: '10px 6px', borderRadius: '10px',
                                        border: `2px solid ${payMethod === m.id ? 'var(--primary)' : 'var(--border)'}`,
                                        background: payMethod === m.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                        color: payMethod === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                                        transition: 'all 0.15s'
                                    }}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                            {payMethod === 'credit' && !selectedCustomer && (
                                <p style={{ color: '#F59E0B', fontSize: '0.78rem', marginTop: '6px', padding: '6px 10px', background: '#FEF3C7', borderRadius: '6px' }}>
                                    {t('credit_sale_warning') || '⚠️ It is recommended to choose a customer for credit sales to track debts'}
                                </p>
                            )}
                        </div>

                        {/* Amount Paid (cash only) */}
                        {payMethod === 'cash' && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '5px', display: 'block' }}>{t('amount_received') || 'Amount Received'}</label>
                                <input
                                    type="number" className="form-input"
                                    value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                                    step="0.250" autoFocus
                                    style={{ fontSize: '1.2rem', fontWeight: 700, textAlign: 'center', padding: '12px' }}
                                />
                                {parseFloat(amountPaid) >= total && (
                                    <div style={{ marginTop: '8px', padding: '9px', background: '#D1FAE5', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', color: '#065F46', fontWeight: 700 }}>
                                        <span>{t('change_amount') || 'Change'}</span><span>{formatCurrency(Math.max(0, change))}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {payMethod === 'credit' && (
                            <div style={{ marginBottom: '14px', padding: '10px', background: '#FEF3C7', borderRadius: '8px', color: '#92400E', fontSize: '0.88rem' }}>
                                <strong>{t('credit_sale') || 'Credit Sale'}:</strong> {t('credit_sale_note') || 'An unpaid invoice will be recorded and the amount added to receivables.'}
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <input type="text" className="form-input" placeholder={t('note_optional') || 'Note (Optional)'} value={note} onChange={e => setNote(e.target.value)} style={{ width: '100%' }} />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowPayModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>{t('cancel') || 'Cancel'}</button>
                            <button
                                onClick={handleCheckout}
                                disabled={saving || (payMethod === 'cash' && parseFloat(amountPaid) < total)}
                                style={{
                                    flex: 2, padding: '13px',
                                    background: payMethod === 'credit'
                                        ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                                        : 'linear-gradient(135deg, #10B981, #059669)',
                                    color: 'white', border: 'none', borderRadius: '10px',
                                    cursor: saving ? 'wait' : 'pointer', fontSize: '0.95rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                    opacity: (saving || (payMethod === 'cash' && parseFloat(amountPaid) < total)) ? 0.6 : 1
                                }}
                            >
                                <Check size={18} />
                                {saving ? (t('saving') || 'Saving...') : payMethod === 'credit' ? (t('record_credit') || 'Record Credit') : (t('confirm_sale') || 'Confirm Sale')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receipt Modal ───────────────────────────────────────────── */}
            {showReceipt && lastReceipt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '22px', width: '370px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                            <div style={{ width: '56px', height: '56px', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                <Check size={28} color="#10B981" />
                            </div>
                            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>{t('sale_completed_success') || 'Sale completed successfully!'}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '3px' }}>{lastReceipt.number}</p>
                        </div>
                        <div style={{ border: '1px dashed var(--border)', borderRadius: '10px', padding: '12px', marginBottom: '14px', background: 'var(--bg-secondary)' }}>
                            <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px dashed var(--border)' }}>
                                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>{lastReceipt.company}</p>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{lastReceipt.date} | {lastReceipt.customer}</p>
                            </div>
                            {lastReceipt.items.map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '3px', color: 'var(--text-secondary)' }}>
                                    <span>{item.name} × {item.qty}</span><span>{formatCurrency(item.total)}</span>
                                </div>
                            ))}
                            <div style={{ borderTop: '1px dashed var(--border)', marginTop: '8px', paddingTop: '8px' }}>
                                {lastReceipt.discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#ef4444', marginBottom: '3px' }}>
                                        <span>{t('discount') || 'Discount'}</span><span>- {formatCurrency(lastReceipt.discountAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                                    <span>{t('final_total') || 'Total'}</span><span>{formatCurrency(lastReceipt.total)}</span>
                                </div>
                                {lastReceipt.change > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#10B981', marginTop: '3px' }}>
                                        <span>{t('change_amount') || 'Change'}</span><span>{formatCurrency(lastReceipt.change)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={printReceipt} style={{
                                padding: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}>
                                <Printer size={16} /> {t('print') || 'Print'}
                            </button>
                            <button onClick={() => setShowReceipt(false)} style={{
                                padding: '11px', background: 'var(--primary)', color: 'white',
                                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}>
                                <Plus size={16} /> {t('new_sale') || 'New Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add Customer Modal ───────────────────────────────────────────── */}
            {showAddCustomer && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '24px', width: '400px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>{t('add_new_customer') || 'Add New Customer'}</h3>
                            <button onClick={() => setShowAddCustomer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddCustomer}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{t('name') || 'Name'} <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                                    value={newCustomerForm.name}
                                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{t('phone') || 'Phone'}</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                                    value={newCustomerForm.phone}
                                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{t('address') || 'Address'}</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
                                    value={newCustomerForm.address}
                                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button type="button" onClick={() => setShowAddCustomer(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>{t('cancel') || 'Cancel'}</button>
                                <button type="submit" disabled={savingCustomer} style={{ flex: 1, padding: '11px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: savingCustomer ? 'wait' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: savingCustomer ? 0.7 : 1 }}>
                                    {savingCustomer ? (t('saving') || 'Saving...') : <><Check size={16} /> {t('save') || 'Save'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Spin animation */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function generateReceiptHTML(receipt, settings, t) {
    const T = t || window.t || (k => k);
    const company = settings.company?.company_name || T('my_company') || 'My Company';
    const phone = settings.company?.company_phone || '';
    const address = settings.company?.company_address || '';
    const symbol = settings.general?.currency_symbol || T('currency_kd') || 'KD';
    const decimals = parseInt(settings.general?.decimal_places || '3');
    const fmt = (v) => new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals }).format(v || 0) + ' ' + symbol;
    const itemRows = receipt.items.map(item => `
        <tr>
            <td style="padding:4px 6px;">${item.name}</td>
            <td style="padding:4px 6px;text-align:center;">${item.qty}</td>
            <td style="padding:4px 6px;text-align:right;">${fmt(item.price)}</td>
            <td style="padding:4px 6px;text-align:right;font-weight:bold">${fmt(item.total)}</td>
        </tr>`).join('');
    return `<!DOCTYPE html><html dir="ltr" lang="en"><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:12px;width:80mm;padding:8px;}
    .header{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;}
    .header h2{font-size:16px;font-weight:bold;}.header p{font-size:10px;color:#555;}
    table{width:100%;border-collapse:collapse;}thead tr{border-bottom:1px solid #000;}
    th{font-size:11px;padding:4px 6px;text-align:left;}
    .totals{border-top:1px dashed #000;margin-top:8px;padding-top:8px;}
    .totals .row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px;}
    .totals .total-row{font-weight:bold;font-size:14px;}
    .footer{text-align:center;margin-top:12px;border-top:1px dashed #000;padding-top:8px;font-size:10px;color:#555;}
    @media print{body{margin:0;}}
    </style></head><body>
    <div class="header"><h2>${company}</h2>${phone ? `<p>📞 ${phone}</p>` : ''}${address ? `<p>${address}</p>` : ''}
    <p style="margin-top:6px">${T('receipt_no') || 'Receipt No:'} <strong>${receipt.number}</strong></p>
    <p>${T('date') || 'Date:'} ${receipt.date} | ${receipt.customer}</p></div>
    <table><thead><tr><th>${T('item') || 'Item'}</th><th>${T('quantity') || 'Qty'}</th><th>${T('price') || 'Price'}</th><th>${T('total') || 'Total'}</th></tr></thead>
    <tbody>${itemRows}</tbody></table>
    <div class="totals">
    <div class="row"><span>${T('subtotal') || 'Subtotal'}</span><span>${fmt(receipt.subtotal)}</span></div>
    ${receipt.discountAmount > 0 ? `<div class="row"><span>${T('discount') || 'Discount'}</span><span>- ${fmt(receipt.discountAmount)}</span></div>` : ''}
    <div class="row total-row"><span>${T('final_total') || 'Total'}</span><span>${fmt(receipt.total)}</span></div>
    ${receipt.change > 0 ? `<div class="row" style="color:green"><span>${T('change_amount') || 'Change'}</span><span>${fmt(receipt.change)}</span></div>` : ''}
    <div class="row"><span>${T('payment_method') || 'Payment Method'}</span><span>${receipt.payMethod === 'cash' ? (T('cash') || 'Cash') : (T('bank_transfer') || 'Bank Transfer')}</span></div></div>
    <div class="footer"><p>${T('thank_you_visit') || 'Thank you for your visit'}</p></div></body></html>`;
}

export default POS;
