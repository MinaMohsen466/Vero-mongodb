import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, Check, Package, User, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth, isColorUnit } from '../App';
import InvoicePrintPreview from '../components/InvoicePrintPreview';

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

    // Offers & Coupons
    const [activeOffers, setActiveOffers] = useState([]);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);

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
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [lastInvoiceId, setLastInvoiceId] = useState(null);

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
            const [prods, custs, sett, offers] = await Promise.all([
                window.api.products.getAll(),
                window.api.customers.getAll(),
                window.api.settings.getAll(),
                window.api.offers.getActive()
            ]);
            const active = (prods || []).filter(p => p.is_active);
            setAllProducts(active);
            setProducts(active);
            setCustomers(custs || []);
            setSettings(sett || {});
            setActiveOffers(offers || []);
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
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        
        if (!allowNegative && fresh.stock_quantity <= 0) {
            toast.error(t('product_out_of_stock') || 'Product is out of stock');
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === fresh.id);
            if (existing) {
                if (!allowNegative && existing.qty >= fresh.stock_quantity) {
                    toast.error(t('not_enough_stock') || 'Not enough stock');
                    return prev;
                }
                return prev.map(i => i.id === fresh.id
                    ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price, unit: i.unit || fresh.unit || '' }
                    : i
                );
            }
            return [...prev, {
                id: fresh.id, name: fresh.name, code: fresh.code, category: fresh.category, unit: fresh.unit || '',
                price: fresh.sale_price || 0, stock: fresh.stock_quantity,
                qty: 1, total: fresh.sale_price || 0, color: ''
            }];
        });
    }, [allProducts, settings, t]);

    const updateQty = (id, delta) => {
        setCart(prev => prev.map(i => {
            if (i.id !== id) return i;
            const allowNegative = settings.general?.allow_negative_stock === 'yes';
            const newQty = allowNegative 
                ? Math.max(1, i.qty + delta) 
                : Math.max(1, Math.min(i.stock, i.qty + delta));
                
            if (!allowNegative && i.qty + delta > i.stock && delta > 0) {
                toast.error(t('not_enough_stock') || 'Not enough stock');
            }
            
            return { ...i, qty: newQty, total: newQty * i.price };
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
    const clearCart = () => { setCart([]); setSelectedCustomer(null); setDiscount(0); setNote(''); setCouponCode(''); setAppliedCoupon(null); };

    // Cart Calculation logic handles BOGO, Fixed, Percentage offers
    let enrichedCart = [];
    let calcSubtotal = 0;
    
    cart.forEach(item => {
        let finalPrice = parseFloat(item.price);
        let finalTotal = finalPrice * item.qty;
        let appliedOffer = null;
        let bogoFreeQty = 0;

        const offer = activeOffers.find(o => 
            o.target_type === 'all' || 
            (o.target_type === 'product' && String(o.target_id) === String(item.id)) ||
            (o.target_type === 'category' && o.target_id === item.category)
        );

        if (offer) {
            appliedOffer = offer;
            if (offer.offer_type === 'percentage') {
                const discAmt = finalPrice * (parseFloat(offer.discount_value) / 100);
                finalPrice = finalPrice - discAmt;
                finalTotal = finalPrice * item.qty;
            } else if (offer.offer_type === 'fixed') {
                finalPrice = Math.max(0, finalPrice - parseFloat(offer.discount_value));
                finalTotal = finalPrice * item.qty;
            } else if (offer.offer_type === 'bogo') {
                const bundleSize = offer.buy_qty + offer.get_qty;
                const bundles = Math.floor(item.qty / bundleSize);
                bogoFreeQty = bundles * offer.get_qty;
                finalTotal = finalPrice * (item.qty - bogoFreeQty);
            }
        }

        calcSubtotal += finalTotal;
        enrichedCart.push({ ...item, finalPrice, finalTotal, appliedOffer, bogoFreeQty, originalTotal: item.price * item.qty });
    });

    let couponDiscountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discount_type === 'percentage') {
            couponDiscountAmount = calcSubtotal * (parseFloat(appliedCoupon.discount_value) / 100);
        } else {
            couponDiscountAmount = parseFloat(appliedCoupon.discount_value);
        }
    }

    const originalSubtotal = enrichedCart.reduce((sum, item) => sum + item.originalTotal, 0);
    const offersDiscountAmount = originalSubtotal - calcSubtotal;

    const manualDiscAmount = parseFloat(discount) || 0;
    const totalDiscountAmount = offersDiscountAmount + couponDiscountAmount + manualDiscAmount;
    
    const subtotal = originalSubtotal;
    const discountAmount = Math.min(subtotal, totalDiscountAmount);
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

    const handleApplyCoupon = async () => {
        if (!couponCode) { setAppliedCoupon(null); return; }
        const result = await window.api.coupons.validate(couponCode);
        if (result.valid) {
            setAppliedCoupon(result.coupon);
            toast.success(t('coupon_applied_success') || 'Coupon applied successfully!');
        } else {
            toast.error(result.error);
            setAppliedCoupon(null);
            setCouponCode('');
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        // Require customer for credit sales
        if (payMethod === 'credit' && !selectedCustomer) {
            toast.error('العميل مطلوب للعمليات الآجلة');
            return;
        }
        
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
                items: enrichedCart.map(i => ({
                    product_id: i.id, description: i.name,
                    quantity: i.qty, unit_price: i.price,
                    discount: i.originalTotal - i.finalTotal, tax: 0, total: i.finalTotal,
                    color: i.color || null
                }))
            };
            const result = await window.api.invoices.create(invoiceData);
            if (result.success) {
                if (appliedCoupon) {
                    await window.api.coupons.incrementUse(appliedCoupon.id);
                }
                const receipt = {
                    number: result.invoice_number,
                    date: invoiceData.date,
                    customer: selectedCustomer?.name || t('cash_customer') || 'Cash Customer',
                    items: [...enrichedCart], subtotal, discountAmount, total,
                    payMethod, amountPaid: parseFloat(amountPaid) || total,
                    change: Math.max(0, (parseFloat(amountPaid) || total) - total),
                    company: settings.company?.company_name || t('my_company') || 'My Company'
                };
                setLastReceipt(receipt);
                setLastInvoiceId(result.id);
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

    const printReceipt = async () => {
        if (!lastInvoiceId) return;
        try {
            const freshSettings = await window.api.settings.getAll();
            setSettings(freshSettings || {});
            const invoice = await window.api.invoices.getById(lastInvoiceId);
            setPreviewInvoice(invoice);
            setShowInvoicePreview(true);
        } catch (e) {
            console.error('Error opening print preview:', e);
        }
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
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '12px', alignContent: 'start',
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
                                    borderRadius: '12px', padding: '10px',
                                    cursor: outOfStock ? 'not-allowed' : 'pointer',
                                    opacity: outOfStock ? 0.55 : 1,
                                    transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: '12px',
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
                                
                                {/* Absolute positioned image to force it strictly onto the left in both RTL and LTR without interfering with DOM flow direction */}
                                <div style={{ 
                                    width: '85px', height: '85px', flexShrink: 0, position: 'absolute', left: '10px', top: '10px',
                                    background: 'var(--bg-primary)', borderRadius: '8px'
                                }}>
                                    {product.image ? (
                                        <div style={{
                                            width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden',
                                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        </div>
                                    ) : (
                                        <div style={{
                                            width: '100%', height: '100%', borderRadius: '8px',
                                            background: `${color}15`, display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', color,
                                            border: '1px solid transparent'
                                        }}>
                                            <Package size={32} style={{ opacity: 0.7 }} />
                                        </div>
                                    )}
                                </div>

                                <div style={{ 
                                    display: 'flex', flexDirection: 'column', flex: 1, 
                                    minHeight: '85px', justifyContent: 'center', paddingLeft: '95px', textAlign: 'start' 
                                }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
                                    <p style={{ fontWeight: 800, color, fontSize: '0.95rem', margin: '0 0 6px 0' }}>{formatCurrency(product.sale_price)}</p>
                                    <div>
                                        {outOfStock ? (
                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>✗ {t('out_of_stock') || 'Out of Stock'}</span>
                                        ) : (
                                            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>{t('in_stock') || 'In Stock'}: {product.stock_quantity}</span>
                                        )}
                                    </div>
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
                    ) : enrichedCart.map(item => (
                        <div key={item.id} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '5px',
                            padding: '6px 7px', borderRadius: '8px', marginBottom: '4px',
                            background: item.appliedOffer ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)', 
                            border: item.appliedOffer ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)'
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.name}
                                    {item.appliedOffer && (
                                        <span style={{ marginLeft: 5, fontSize: '0.65rem', background: '#10B981', color: 'white', padding: '1px 4px', borderRadius: 4 }}>
                                            {item.bogoFreeQty > 0 ? `${t('bogo_applied_badge')} ${item.bogoFreeQty}` : t('offer_applied_badge')}
                                        </span>
                                    )}
                                </p>
                                {/* Color field (if unit is Drum, Gallon, or Liter) */}
                                {settings?.general?.enable_product_color === 'yes' && isColorUnit(item.unit) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('color') || 'اللون'}:</span>
                                        <input
                                            type="text"
                                            value={item.color || ''}
                                            placeholder={t('enter_color') || 'أدخل اللون'}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                setCart(prev => prev.map(i =>
                                                    i.id === item.id
                                                        ? { ...i, color: e.target.value }
                                                        : i
                                                ));
                                            }}
                                            style={{
                                                width: '70px', padding: '1px 5px', fontSize: '0.72rem',
                                                border: '1px solid var(--border)', borderRadius: '5px',
                                                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Editable price */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('price') || 'السعر'}:</span>
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
                                                    ? { ...i, price: newPrice }
                                                    : i
                                            ));
                                        }}
                                        style={{
                                            width: '60px', padding: '1px 5px', fontSize: '0.72rem',
                                            border: '1px solid var(--border)', borderRadius: '5px',
                                            background: 'var(--bg-primary)', color: 'var(--text-primary)',
                                            outline: 'none', textDecoration: item.finalPrice < item.price ? 'line-through' : 'none', opacity: item.finalPrice < item.price ? 0.6 : 1
                                        }}
                                    />
                                    {item.finalPrice < item.price && (
                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(item.finalPrice)}</span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingTop: 2 }}>
                                <button onClick={() => updateQty(item.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    <Minus size={10} />
                                </button>
                                <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.qty}</span>
                                <button onClick={() => updateQty(item.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    <Plus size={10} />
                                </button>
                            </div>
                            <div style={{ textAlign: 'left', minWidth: '58px', paddingTop: 2 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--primary)', margin: 0 }}>
                                    {formatCurrency(item.finalTotal)}
                                </p>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', flexShrink: 0, marginTop: 2 }}>
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
                    {offersDiscountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.83rem', color: '#10b981', fontWeight: 600 }}>
                            <span>{t('offers_discount') || 'خصم العروض'}</span><span>- {formatCurrency(offersDiscountAmount)}</span>
                        </div>
                    )}
                    
                    {/* Coupon Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', width: 60 }}>{t('coupon') || 'Coupon'}</span>
                        <div style={{ display: 'flex', flex: 1, gap: 4 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('coupon_code_placeholder') || 'Code...'}
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value)}
                                disabled={!!appliedCoupon}
                                style={{ flex: 1, padding: '4px 8px', fontSize: '0.83rem', letterSpacing: 1, textTransform: 'uppercase' }}
                            />
                            {!appliedCoupon ? (
                                <button type="button" onClick={handleApplyCoupon} style={{ padding: '4px 8px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    {t('apply_coupon') || 'Apply'}
                                </button>
                            ) : (
                                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} style={{ padding: '4px 8px', background: 'var(--error, #ef4444)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {appliedCoupon && (
                        <div style={{ fontSize: '0.75rem', color: '#10b981', textAlign: 'right', marginBottom: 5 }}>
                            ✓ {t('coupon_applied_success') || 'Coupon Active'} (-{couponDiscountAmount.toFixed(3)})
                        </div>
                    )}
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
                    <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '0', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}>
                        {/* Header Success Message */}
                        <div style={{ textAlign: 'center', paddingTop: '22px', paddingBottom: '12px', paddingLeft: '22px', paddingRight: '22px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08))', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: '56px', height: '56px', background: '#D1FAE5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                <Check size={28} color="#10B981" />
                            </div>
                            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontSize: '1rem' }}>{t('sale_completed_success') || 'Sale completed successfully!'}</h3>
                        </div>

                        {/* Receipt Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
                            {/* Company & Invoice Details Header */}
                            <div style={{ border: '2px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '16px', background: 'var(--bg-secondary)' }}>
                                <div style={{ textAlign: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '2px solid var(--border)' }}>
                                    <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>{lastReceipt.company}</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>{t('receipt_no') || 'Receipt No'}: <strong>{lastReceipt.number}</strong></p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>{lastReceipt.date}</p>
                                </div>

                                {/* Customer Info Section */}
                                <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '10px', borderRadius: '8px', marginBottom: '10px', borderLeft: '3px solid var(--primary)' }}>
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: 600 }}>{t('customer') || 'Customer'}:</p>
                                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0 }}>{lastReceipt.customer}</p>
                                </div>

                                {/* Payment Method */}
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                                    {t('payment_method') || 'Payment Method'}: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                                        {lastReceipt.payMethod === 'cash' ? (t('cash') || 'Cash') : 
                                         lastReceipt.payMethod === 'credit' ? (t('credit') || 'Credit') :
                                         (t('bank_transfer') || 'Bank Transfer')}
                                    </span>
                                </p>
                            </div>

                            {/* Items Table */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', paddingBottom: '8px', borderBottom: '2px solid var(--border)', marginBottom: '8px' }}>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>{t('item') || 'Item'}</p>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textAlign: 'center', textTransform: 'uppercase' }}>{t('quantity') || 'Qty'}</p>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textAlign: 'right', textTransform: 'uppercase' }}>{t('total') || 'Total'}</p>
                                </div>
                                {lastReceipt.items.map((item, i) => (
                                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>× {item.qty}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>{formatCurrency(item.total)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Totals Section */}
                            <div style={{ border: '2px solid var(--border)', borderRadius: '10px', padding: '12px', background: 'rgba(99, 102, 241, 0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    <span>{t('subtotal') || 'Subtotal'}</span><span>{formatCurrency(lastReceipt.subtotal)}</span>
                                </div>
                                {lastReceipt.discountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#ef4444', marginBottom: '6px', fontWeight: 600 }}>
                                        <span>{t('discount') || 'Discount'}</span><span>- {formatCurrency(lastReceipt.discountAmount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', paddingBottom: '4px', borderTop: '2px solid var(--border)', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                                    <span>{t('final_total') || 'Total'}</span><span>{formatCurrency(lastReceipt.total)}</span>
                                </div>
                                {lastReceipt.change > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#10B981', marginTop: '6px', fontWeight: 700, paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                                        <span>{t('change_amount') || 'Change'}</span><span>{formatCurrency(lastReceipt.change)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons Footer */}
                        <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={printReceipt} style={{
                                padding: '12px', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: 'none',
                                borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <Printer size={16} /> {t('print') || 'Print'}
                            </button>
                            <button onClick={() => setShowReceipt(false)} style={{
                                padding: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
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

            {/* In-app Invoice Print Preview */}
            {showInvoicePreview && previewInvoice && (
                <InvoicePrintPreview
                    invoice={previewInvoice}
                    settings={settings}
                    type="sales"
                    onClose={() => setShowInvoicePreview(false)}
                />
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
            <td style="padding:8px;border-bottom:1px dashed #000;">${item.name}</td>
            <td style="padding:8px;text-align:center;border-bottom:1px dashed #000;">${item.qty}</td>
            <td style="padding:8px;text-align:right;border-bottom:1px dashed #000;">${fmt(item.price)}</td>
            <td style="padding:8px;text-align:right;font-weight:bold;border-bottom:1px dashed #000">${fmt(item.total)}</td>
        </tr>`).join('');
    return `<!DOCTYPE html><html dir="ltr" lang="en"><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Arial', sans-serif;font-size:13px;width:80mm;padding:10px;background:#fff;color:#000;}
    .receipt-container{border:2px solid #000;border-radius:8px;padding:15px;background:#fff;}
    .header{text-align:center;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:12px;}
    .header h2{font-size:18px;font-weight:bold;margin:0 0 4px 0;}
    .header .company-info{font-size:11px;line-height:1.6;}
    .receipt-number{text-align:center;font-size:12px;font-weight:bold;margin:10px 0;border-top:1px solid #000;border-bottom:1px solid #000;padding:8px 0;}
    .customer-section{padding:10px 0;margin:10px 0;border-bottom:1px dashed #000;}
    .customer-section label{font-size:10px;font-weight:bold;text-transform:uppercase;display:block;margin-bottom:3px;}
    .customer-section .name{font-size:13px;font-weight:bold;}
    table{width:100%;border-collapse:collapse;margin:10px 0;}
    thead tr{border-top:2px solid #000;border-bottom:2px solid #000;}
    th{font-size:11px;padding:8px;text-align:left;font-weight:bold;}
    td{padding:8px;font-size:12px;}
    .totals-section{margin-top:12px;padding-top:12px;border-top:2px solid #000;}
    .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px;}
    .subtotal{font-weight:normal;}
    .discount{font-weight:bold;}
    .total-row{font-weight:bold;font-size:16px;padding:10px 0;border-top:2px solid #000;border-bottom:2px solid #000;}
    .change-row{font-weight:bold;margin-top:6px;padding-top:6px;border-top:1px dashed #000;}
    .payment-method{text-align:center;font-size:11px;margin:10px 0;}
    .footer{text-align:center;margin-top:12px;padding-top:12px;border-top:1px dashed #000;font-size:11px;}
    @media print{body{margin:0;padding:0;}.receipt-container{border:1px solid #000;border-radius:0;}}
    </style></head><body>
    <div class="receipt-container">
    <div class="header">
        <h2>${company}</h2>
        <div class="company-info">
            ${phone ? `<div>${phone}</div>` : ''}
            ${address ? `<div>${address}</div>` : ''}
        </div>
    </div>
    <div class="receipt-number">
        <div>${T('receipt_no') || 'Receipt No'}: <strong>${receipt.number}</strong></div>
        <div style="font-size:10px;margin-top:4px;color:#999;">${receipt.date}</div>
    </div>
    <div class="customer-section">
        <label>${T('customer') || 'Customer'}</label>
        <div class="name">${receipt.customer}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>${T('item') || 'Item'}</th>
                <th style="text-align:center;">${T('quantity') || 'Qty'}</th>
                <th style="text-align:right;">${T('price') || 'Price'}</th>
                <th style="text-align:right;">${T('total') || 'Total'}</th>
            </tr>
        </thead>
        <tbody>${itemRows}</tbody>
    </table>
    <div class="totals-section">
        <div class="totals-row subtotal">
            <span>${T('subtotal') || 'Subtotal'}</span>
            <span>${fmt(receipt.subtotal)}</span>
        </div>
        ${receipt.discountAmount > 0 ? `
        <div class="totals-row discount">
            <span>${T('discount') || 'Discount'}</span>
            <span>- ${fmt(receipt.discountAmount)}</span>
        </div>` : ''}
        <div class="totals-row total-row">
            <span>${T('final_total') || 'Total'}</span>
            <span>${fmt(receipt.total)}</span>
        </div>
        ${receipt.change > 0 ? `
        <div class="totals-row change-row">
            <span>${T('change_amount') || 'Change'}</span>
            <span>${fmt(receipt.change)}</span>
        </div>` : ''}
    </div>
    <div class="payment-method">
        <strong>${T('payment_method') || 'Payment Method'}</strong><br>
        ${receipt.payMethod === 'cash' ? (T('cash') || 'Cash') : 
          receipt.payMethod === 'credit' ? (T('credit') || 'Credit') :
          (T('bank_transfer') || 'Bank Transfer')}
    </div>
    <div class="footer">
        <p style="margin:0;">${T('thank_you_visit') || 'Thank you for your visit'}</p>
        <p style="margin:4px 0 0;font-size:9px;">${T('please_visit_again') || 'Visit us again soon'}</p>
    </div>
    </div>
    </body></html>`;
}

export default POS;
