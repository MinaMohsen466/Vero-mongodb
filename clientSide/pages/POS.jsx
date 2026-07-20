import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, Check, Package, User, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth, isColorUnit } from '../App';
import InvoicePrintPreview from '../components/InvoicePrintPreview';
import SearchableSelect from '../components/SearchableSelect';
import { getCachedProducts, saveCachedProducts, deleteCachedProducts, clearCachedProducts } from '../utils/posCache';

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
                        {[...filtered].sort((a, b) => a.code === 'CUST-CASH' ? -1 : b.code === 'CUST-CASH' ? 1 : 0).map(c => (
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
    const ITEMS_PER_PAGE = 50;
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
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [suppliers, setSuppliers] = useState([]);
    const [supplierFilter, setSupplierFilter] = useState('all');
    const [zoomImage, setZoomImage] = useState(null);
    const [zoomImageName, setZoomImageName] = useState('');    // Infinite scroll pagination for products grid
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const gridContainerRef = useRef(null);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
        if (gridContainerRef.current) {
            gridContainerRef.current.scrollTop = 0;
        }
    }, [debouncedSearchQuery, categoryFilter, supplierFilter]);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [saving, setSaving] = useState(false);
    const [lastReceipt, setLastReceipt] = useState(null);
    const [lastInvoiceId, setLastInvoiceId] = useState(null);
    const [showReceipt, setShowReceipt] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);
    const [previewInvoice, setPreviewInvoice] = useState(null);
    const [visiblePurchasePrices, setVisiblePurchasePrices] = useState({});
    const togglePurchasePrice = useCallback((productId) => {
        setVisiblePurchasePrices(prev => ({
            ...prev,
            [productId]: !prev[productId]
        }));
    }, []);

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

    useEffect(() => {
        loadData();
        setTimeout(() => searchRef.current?.focus(), 300);
    }, []);

    useEffect(() => {
        const savedDraft = localStorage.getItem('pos_cart_draft');
        if (savedDraft) {
            try {
                const { cart: savedCart, selectedCustomer: savedCust, discount: savedDisc, note: savedNote, couponCode: savedCoupon, appliedCoupon: savedApplied, payMethod: savedPay } = JSON.parse(savedDraft);
                if (savedCart && savedCart.length > 0) {
                    setCart(savedCart);
                    setSelectedCustomer(savedCust || null);
                    setDiscount(savedDisc || 0);
                    setNote(savedNote || '');
                    setCouponCode(savedCoupon || '');
                    setAppliedCoupon(savedApplied || null);
                    setPayMethod(savedPay || 'cash');
                }
            } catch (e) {
                console.error('Error parsing POS draft:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('pos_cart_draft', JSON.stringify({ cart, selectedCustomer, discount, note, couponCode, appliedCoupon, payMethod }));
        } else {
            localStorage.removeItem('pos_cart_draft');
        }
    }, [cart, selectedCustomer, discount, note, couponCode, appliedCoupon, payMethod]);

    // Auto-refresh stock every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => refreshStock(false), 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedCustomer?.code === 'CUST-CASH' && payMethod === 'credit') {
            setPayMethod('cash');
        }
    }, [selectedCustomer, payMethod]);


    const mapProducts = (prodsList) => {
        return (prodsList || []).filter(p => p.is_active).map(p => {
            let parsedSuppliers = [];
            try {
                parsedSuppliers = typeof p.supplier_ids === 'string' ? JSON.parse(p.supplier_ids) : p.supplier_ids;
            } catch (e) {
                parsedSuppliers = p.supplier_id ? [String(p.supplier_id)] : [];
            }
            return {
                ...p,
                _parsedSuppliers: Array.isArray(parsedSuppliers) ? parsedSuppliers.map(String) : []
            };
        });
    };

    const syncProducts = async (forceUpdateState = false) => {
        try {
            const currentDbSig = localStorage.getItem('last_products_sync_db_sig') || '';
            const lastSync = forceUpdateState ? '' : (localStorage.getItem('last_products_sync_time') || '');
            const syncResult = await window.api.products.getSyncData(lastSync);
            
            let currentActive = null;
            if (syncResult && syncResult.success) {
                const { changes, deleted, syncTime, dbSignature } = syncResult;
                
                // If database signature changed, clear cache and force full sync!
                if (dbSignature && dbSignature !== currentDbSig) {
                    console.log('Database signature changed! Clearing POS cache for full sync...');
                    await clearCachedProducts();
                    localStorage.setItem('last_products_sync_db_sig', dbSignature);
                    localStorage.removeItem('last_products_sync_time');
                    
                    // Run sync again with empty sync time to pull all products from the new DB
                    const fullSyncResult = await window.api.products.getSyncData('');
                    if (fullSyncResult && fullSyncResult.success) {
                        await saveCachedProducts(fullSyncResult.changes || []);
                        localStorage.setItem('last_products_sync_time', fullSyncResult.syncTime);
                    }
                    
                    // Reload and render
                    const cached = await getCachedProducts();
                    const active = mapProducts(cached);
                    setAllProducts(active);
                    setProducts(active);
                    return active;
                }
                
                let didChange = false;
                if (changes && changes.length > 0) {
                    await saveCachedProducts(changes);
                    didChange = true;
                }
                if (deleted && deleted.length > 0) {
                    await deleteCachedProducts(deleted);
                    didChange = true;
                }
                
                localStorage.setItem('last_products_sync_time', syncTime);
                
                if (didChange || forceUpdateState || !lastSync) {
                    const cached = await getCachedProducts();
                    const sorted = [...cached].sort((a, b) => {
                        const totalSoldA = a.total_sold || 0;
                        const totalSoldB = b.total_sold || 0;
                        if (totalSoldB !== totalSoldA) {
                            return totalSoldB - totalSoldA;
                        }
                        return (a.name || '').localeCompare(b.name || '');
                    });
                    currentActive = mapProducts(sorted);
                    setAllProducts(currentActive);
                    setProducts(currentActive);
                }
            }
            return currentActive;
        } catch (e) {
            console.error('Error syncing products:', e);
            return null;
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch from local cache first for instant render
            const cached = await getCachedProducts();
            let cacheEmpty = true;
            if (cached && cached.length > 0) {
                cacheEmpty = false;
                const sorted = [...cached].sort((a, b) => {
                    const totalSoldA = a.total_sold || 0;
                    const totalSoldB = b.total_sold || 0;
                    if (totalSoldB !== totalSoldA) {
                        return totalSoldB - totalSoldA;
                    }
                    return (a.name || '').localeCompare(b.name || '');
                });
                const active = mapProducts(sorted);
                setAllProducts(active);
                setProducts(active);
                setLoading(false); // Render immediately
            }

            // 2. Fetch other essential lookups
            const [custs, sett, offers, supps] = await Promise.all([
                window.api.customers.getAll(),
                window.api.settings.getAll(),
                window.api.offers.getActive(),
                window.api.suppliers.getAll()
            ]);
            
            setCustomers(custs || []);
            const defaultCust = (custs || []).find(c => c.code === 'CUST-CASH');
            if (defaultCust) {
                setSelectedCustomer(defaultCust);
            }
            setSettings(sett || {});
            setActiveOffers(offers || []);
            setSuppliers(supps || []);

            // 3. Sync products in the background
            await syncProducts(cacheEmpty);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const refreshStock = async (showIndicator = true) => {
        if (showIndicator) setRefreshing(true);
        try {
            const active = await syncProducts(true);
            if (active) {
                // Update cart stock info
                setCart(prev => prev.map(item => {
                    const updated = active.find(p => p.id === item.id);
                    return updated ? { ...item, stock: updated.shop_stock } : item;
                }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (showIndicator) setRefreshing(false);
        }
    };

    const addToCart = useCallback((product) => {
        const fresh = allProducts.find(p => p.id === product.id) || product;
        const allowNegative = settings.general?.allow_negative_stock === 'yes';
        
        if (!allowNegative && fresh.shop_stock <= 0) {
            toast.error(t('product_out_of_stock') || 'Product is out of stock');
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.id === fresh.id);
            if (existing) {
                if (!allowNegative && existing.qty >= fresh.shop_stock) {
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
                price: fresh.sale_price || 0, stock: fresh.shop_stock,
                qty: 1, total: fresh.sale_price || 0, color: ''
            }];
        });
    }, [allProducts, settings, t]);

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1); // Beep for 100ms
        } catch (e) {
            console.error("Web Audio API error:", e);
        }
    };

    // Global Barcode Listener
    useEffect(() => {
        const isBarcodeEnabled = settings.printing?.enable_global_barcode === 'yes';
        if (!isBarcodeEnabled) return;

        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            // Ignore modifiers
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            
            const currentTime = Date.now();
            const diff = currentTime - lastKeyTime;
            lastKeyTime = currentTime;

            // If it's Enter, check if we have a valid barcode in the buffer
            if (e.key === 'Enter') {
                if (buffer.length >= 3 && diff < 50) {
                    e.preventDefault();
                    e.stopPropagation();
                    const code = buffer.trim();
                    buffer = '';
                    
                    // Look up product by code
                    const prod = allProducts.find(p => p.code === code);
                    if (prod) {
                        addToCart(prod);
                        playBeep();
                        toast.success(`${t('added') || 'تمت إضافة'}: ${prod.name}`);
                    } else {
                        toast.error(`${t('product_not_found') || 'المنتج غير موجود'}: ${code}`);
                    }
                } else {
                    buffer = ''; // Reset on slow enter or non-barcode enter
                }
                return;
            }

            // Accumulate printable characters
            if (e.key.length === 1) {
                if (diff < 40 || buffer === '') {
                    buffer += e.key;
                } else {
                    buffer = e.key; // Reset if typed too slowly
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept input
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [allProducts, settings, addToCart, t]);

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
    const clearCart = () => {
        setCart([]);
        const defaultCust = customers.find(c => c.code === 'CUST-CASH');
        setSelectedCustomer(defaultCust || null);
        setDiscount(0);
        setNote('');
        setCouponCode('');
        setAppliedCoupon(null);
    };

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

    const categories = useMemo(() => {
        return ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchSearch = p.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                p.code?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                p.category?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
            
            let matchSupp = false;
            if (supplierFilter === 'all') {
                matchSupp = true;
            } else {
                matchSupp = p._parsedSuppliers?.includes(String(supplierFilter)) || String(p.supplier_id) === String(supplierFilter);
            }

            return matchSearch && matchCat && matchSupp;
        });
    }, [products, debouncedSearchQuery, categoryFilter, supplierFilter]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 100) {
            setVisibleCount(prev => Math.min(filtered.length, prev + ITEMS_PER_PAGE));
        }
    };

    const formatCurrency = useCallback((v) => {
        const decimals = parseInt(settings.general?.decimal_places || '3');
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: decimals }).format(v || 0) +
            ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));
    }, [settings.general?.decimal_places, settings.general?.currency_symbol, t]);

    const openPayModal = () => {
        if (cart.length === 0) { toast.error(t('cart_empty') || 'Cart is empty'); return; }
        if (couponDiscountAmount > calcSubtotal) {
            toast.error('قيمة خصم الكوبون أكبر من قيمة الفاتورة، تم إلغاء الكوبون');
            setAppliedCoupon(null);
            setCouponCode('');
            return;
        }
        if (manualDiscAmount > calcSubtotal - couponDiscountAmount) {
            toast.error('قيمة الخصم اليدوي أكبر من قيمة الفاتورة المتبقية، تم تعديلها');
            setDiscount(Math.max(0, calcSubtotal - couponDiscountAmount));
            return;
        }
        setAmountPaid(total.toFixed(3));
        setShowPayModal(true);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode) { setAppliedCoupon(null); return; }
        const result = await window.api.coupons.validate(couponCode);
        if (result.valid) {
            const sub = cart.reduce((sum, item) => {
                let finalPrice = parseFloat(item.price);
                let finalTotal = finalPrice * item.qty;
                const offer = activeOffers.find(o => 
                    o.target_type === 'all' || 
                    (o.target_type === 'product' && String(o.target_id) === String(item.id)) ||
                    (o.target_type === 'category' && o.target_id === item.category)
                );
                if (offer) {
                    if (offer.offer_type === 'percentage') {
                        finalPrice = Math.max(0, finalPrice * (1 - parseFloat(offer.discount_value) / 100));
                        finalTotal = finalPrice * item.qty;
                    } else if (offer.offer_type === 'fixed') {
                        finalPrice = Math.max(0, finalPrice - parseFloat(offer.discount_value));
                        finalTotal = finalPrice * item.qty;
                    } else if (offer.offer_type === 'bogo') {
                        const bundleSize = offer.buy_qty + offer.get_qty;
                        const bundles = Math.floor(item.qty / bundleSize);
                        finalTotal = finalPrice * (item.qty - (bundles * offer.get_qty));
                    }
                }
                return sum + finalTotal;
            }, 0);
            
            let couponVal = 0;
            if (result.coupon.discount_type === 'percentage') {
                couponVal = sub * (parseFloat(result.coupon.discount_value) / 100);
            } else {
                couponVal = parseFloat(result.coupon.discount_value);
            }
            const manualDisc = parseFloat(discount) || 0;
            if (couponVal > Math.max(0, sub - manualDisc)) {
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

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        // Require customer for credit sales
        if (payMethod === 'credit' && (!selectedCustomer || selectedCustomer.code === 'CUST-CASH')) {
            toast.error(t('cash_customer_no_credit') || 'لا يمكن إجراء عملية بيع آجل للعميل النقدي');
            return;
        }

        // Credit limit validation for credit sales
        if (payMethod === 'credit' && selectedCustomer && selectedCustomer.credit_limit > 0) {
            const newBalance = (selectedCustomer.balance || 0) + total;
            if (newBalance > selectedCustomer.credit_limit) {
                toast.error(`${t('cust_creditLimit') || 'تم تجاوز الحد الائتماني المسموح به للعميل'}: ${selectedCustomer.name} (الحد: ${selectedCustomer.credit_limit.toFixed(3)}، الرصيد المتوقع: ${newBalance.toFixed(3)})`);
                return;
            }
        }

        if (couponDiscountAmount > calcSubtotal) {
            toast.error('قيمة خصم الكوبون أكبر من قيمة الفاتورة، تم إلغاء الكوبون');
            setAppliedCoupon(null);
            setCouponCode('');
            return;
        }
        if (manualDiscAmount > calcSubtotal - couponDiscountAmount) {
            toast.error('قيمة الخصم اليدوي أكبر من قيمة الفاتورة المتبقية، تم تعديلها');
            setDiscount(Math.max(0, calcSubtotal - couponDiscountAmount));
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
                manual_discount: manualDiscAmount,
                coupon_code: appliedCoupon ? appliedCoupon.code : null,
                paid: isCredit ? 0 : total,
                status: isCredit ? 'pending' : 'paid',
                payment_method: isCredit ? 'credit' : payMethod,
                notes: note || '',
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
                
                // Silent printing on checkout
                if (settings.printing?.pos_silent_print === 'yes') {
                    try {
                        const html = generateReceiptHTML(receipt, settings, t);
                        const paperSize = settings.invoice?.paper_size || 'thermal_80';
                        const deviceName = settings.printing?.pos_printer || '';
                        window.api.print.invoice(html, {
                            paperSize,
                            paperOrientation: 'portrait',
                            deviceName,
                            silent: true,
                            invoiceType: 'pos'
                        });
                    } catch (pe) {
                        console.error('Auto silent printing failed:', pe);
                    }
                }
            } else {
                toast.error(result.error || t('error_checkout') || 'Error during checkout');
            }
        } catch (e) {
            console.error("Checkout exception:", e);
            toast.error(`${t('error_checkout') || 'Error during checkout'}: ${e.message || String(e)}`);
        }
        setSaving(false);
    };

    const printReceipt = async () => {
        if (!lastInvoiceId) return;
        try {
            const freshSettings = await window.api.settings.getAll();
            setSettings(freshSettings || {});
            
            if (freshSettings.printing?.pos_silent_print === 'yes' && lastReceipt) {
                const html = generateReceiptHTML(lastReceipt, freshSettings, t);
                const paperSize = freshSettings.invoice?.paper_size || 'thermal_80';
                const deviceName = freshSettings.printing?.pos_printer || '';
                window.api.print.invoice(html, {
                    paperSize,
                    paperOrientation: 'portrait',
                    deviceName,
                    silent: true,
                    invoiceType: 'pos'
                });
                toast.success(t('printing') || 'جاري الطباعة...');
            } else {
                const invoice = await window.api.invoices.getById(lastInvoiceId);
                setPreviewInvoice(invoice);
                setShowInvoicePreview(true);
            }
        } catch (e) {
            console.error('Error opening print preview:', e);
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 116px)', gap: '0', overflow: 'hidden', background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>

            {/* ── Left: Products ─────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px', gap: '12px' }}>

                {/* Search + Filter Area */}
                {/* Search + Filter Area */}
                <div style={{
                    background: 'var(--surface)',
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    gap: '12px',
                    flexShrink: 0,
                    transition: 'all 0.3s ease'
                }}>
                    {/* Search Bar Row */}
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: searchFocused ? 'var(--primary)' : 'var(--text-muted)', transition: 'color 0.2s', zIndex: 2 }} />
                        <input
                            id="search-input"
                            ref={searchRef}
                            type="text"
                            className="form-input"
                            placeholder={t('search_product_barcode') || 'Search product...'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            style={{
                                paddingRight: '42px',
                                paddingLeft: searchQuery ? '38px' : '14px',
                                width: '100%',
                                height: '44px',
                                fontSize: '0.92rem',
                                borderRadius: '12px',
                                border: '1px solid ' + (searchFocused ? 'var(--primary)' : 'var(--border)'),
                                background: searchFocused ? 'var(--surface)' : 'var(--bg-secondary)',
                                boxShadow: searchFocused ? '0 0 0 3px rgba(37, 99, 235, 0.15), 0 4px 12px rgba(37, 99, 235, 0.05)' : 'none',
                                transition: 'all 0.25s ease',
                                color: 'var(--text-primary)'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s',
                                    zIndex: 2
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '220px', flexShrink: 0 }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {t('prod_category') || 'Category'}
                        </label>
                        <SearchableSelect
                            options={categories.filter(c => c !== 'all').map(cat => ({ value: cat, label: cat }))}
                            value={categoryFilter === 'all' ? '' : categoryFilter}
                            onChange={val => setCategoryFilter(val || 'all')}
                            placeholder={t('all') || 'All Categories'}
                            emptyLabel={t('all') || 'All Categories'}
                        />
                    </div>
                </div>                {/* Products Grid */}
                <div 
                    ref={gridContainerRef}
                    onScroll={handleScroll}
                    style={{
                        flex: 1, overflowY: 'auto',
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                        gap: '12px', alignContent: 'start',
                        padding: '12px 8px',
                    }}
                >
                    {filtered.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p>{t('no_products') || 'No Products'}</p>
                        </div>
                    ) : filtered.slice(0, visibleCount).map((product, i) => {
                        const inCart = cart.find(c => c.id === product.id);
                        return (
                            <ProductCard
                                key={product.id}
                                product={product}
                                color={COLORS[i % COLORS.length]}
                                inCartQty={inCart ? inCart.qty : 0}
                                onAddToCart={addToCart}
                                showPurchasePriceInPOS={settings.general?.show_purchase_price_in_pos === 'yes'}
                                showPurchasePriceDetail={!!visiblePurchasePrices[product.id]}
                                onTogglePurchasePrice={togglePurchasePrice}
                                formattedSalePrice={formatCurrency(product.sale_price)}
                                formattedPurchasePrice={formatCurrency(product.purchase_price)}
                                outOfStockLabel={t('out_of_stock') || 'Out of Stock'}
                                inStockLabel={t('in_stock') || 'In Stock'}
                                purchasePriceLabel={t('purchase_price_label') || 'سعر الشراء'}
                                onZoomImage={(url, name) => {
                                    setZoomImage(url);
                                    setZoomImageName(name);
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ── Right: Cart ────────────────────────────────────────────── */}
            <div style={{
                width: '420px', minWidth: '380px',
                background: 'var(--bg-primary)', borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', minHeight: 0
            }}>
                {/* Cart Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--primary)', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <ShoppingCart size={20} />
                            <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>{t('shopping_cart') || 'Cart'}</span>
                            {cart.length > 0 && (
                                <span style={{ background: 'rgba(255,255,255,0.3)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.88rem', fontWeight: 800 }}>
                                    {cart.reduce((s, i) => s + i.qty, 0)}
                                </span>
                            )}
                        </div>
                        {cart.length > 0 && (
                            <button onClick={clearCart} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
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
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            padding: '6px 10px', borderRadius: '10px', marginBottom: '6px',
                            background: item.appliedOffer ? 'var(--primary-light)' : 'var(--bg-secondary)', 
                            border: item.appliedOffer ? '1px solid var(--primary)' : '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                            position: 'relative',
                            transition: 'all 0.2s ease'
                        }}>
                            {/* Row 1: Product Name & Subtotal & Delete */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.name}
                                    </p>
                                    {item.appliedOffer && (
                                        <span style={{ marginInlineStart: 4, fontSize: '0.6rem', background: '#10B981', color: 'white', padding: '1px 3px', borderRadius: 4, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                            {item.bogoFreeQty > 0 ? `${t('bogo_applied_badge')} ${item.bogoFreeQty}` : (t('offer_applied_badge') || 'عرض')}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--primary)' }}>
                                        {formatCurrency(item.finalTotal)}
                                    </span>
                                    <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={t('delete')}>
                                        <Trash2 size={13} style={{ opacity: 0.8 }} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 2: Qty Selector & Price Editor & Color */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: '4px' }}>
                                {/* Qty Controls (Right aligned in RTL) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '1px 2px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    {item.qty > 1 ? (
                                        <button 
                                            onClick={() => updateQty(item.id, -1)} 
                                            style={{ 
                                                width: '24px', height: '24px', borderRadius: '50%', border: 'none', 
                                                background: 'transparent', cursor: 'pointer', display: 'flex', 
                                                alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Minus size={11} />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => removeFromCart(item.id)} 
                                            style={{ 
                                                width: '24px', height: '24px', borderRadius: '50%', border: 'none', 
                                                background: 'transparent', cursor: 'pointer', display: 'flex', 
                                                alignItems: 'center', justifyContent: 'center', color: 'var(--danger)',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-light, #fee2e2)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            title={t('delete')}
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    )}
                                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.qty}</span>
                                    <button 
                                        onClick={() => updateQty(item.id, 1)} 
                                        style={{ 
                                            width: '24px', height: '24px', borderRadius: '50%', border: 'none', 
                                            background: 'transparent', cursor: 'pointer', display: 'flex', 
                                            alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Plus size={11} />
                                    </button>
                                </div>

                                {/* Price Editor & Color (Left aligned in RTL) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                                    {/* Color field (Only if active) */}
                                    {settings?.general?.enable_product_color === 'yes' && isColorUnit(item.unit) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <input
                                                type="text"
                                                value={item.color || ''}
                                                placeholder={t('color') || 'اللون'}
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => {
                                                    setCart(prev => prev.map(i =>
                                                        i.id === item.id
                                                            ? { ...i, color: e.target.value }
                                                            : i
                                                    ));
                                                }}
                                                style={{
                                                    width: '55px', height: '26px', padding: '2px 4px', fontSize: '0.75rem',
                                                    border: '1px solid var(--border)', borderRadius: '5px',
                                                    background: 'var(--surface)', color: 'var(--text-primary)',
                                                    outline: 'none', textAlign: 'center'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Original price crossed out if there is an offer */}
                                    {item.finalPrice < item.price && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(37,99,235,0.08)', padding: '1px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                            {formatCurrency(item.finalPrice)}
                                        </span>
                                    )}

                                    {/* Price Input (Mainly large and easy to edit) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{t('price') || 'السعر'}:</span>
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
                                                width: '85px', height: '28px', padding: '2px 4px', fontSize: '0.88rem',
                                                border: '1px solid var(--border)', borderRadius: '5px',
                                                background: 'var(--surface)', color: 'var(--text-primary)',
                                                outline: 'none', 
                                                textDecoration: item.finalPrice < item.price ? 'line-through' : 'none', 
                                                opacity: item.finalPrice < item.price ? 0.6 : 1,
                                                fontWeight: 700,
                                                textAlign: 'center'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Footer — always visible */}
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span>{t('subtotal') || 'Subtotal'}</span><span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{t('discount') || 'Discount'} ({settings.general?.currency_symbol || (t('currency_kd') || 'KD')})</span>
                        <input
                            type="number"
                            className="form-input"
                            value={discount}
                            onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                const maxAllowed = Math.max(0, calcSubtotal - couponDiscountAmount);
                                if (val > maxAllowed) {
                                    toast.error('قيمة الخصم اليدوي لا يمكن أن تتجاوز قيمة الفاتورة المتبقية');
                                    setDiscount(maxAllowed > 0 ? String(maxAllowed) : '0');
                                } else {
                                    setDiscount(e.target.value);
                                }
                            }}
                            min="0" step="0.250"
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.9rem', textAlign: 'left' }}
                        />
                    </div>
                    {offersDiscountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', color: '#10b981', fontWeight: 700 }}>
                            <span>{t('offers_discount') || 'خصم العروض'}</span><span>- {formatCurrency(offersDiscountAmount)}</span>
                        </div>
                    )}
                    
                    {/* Coupon Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', width: 60 }}>{t('coupon') || 'Coupon'}</span>
                        <div style={{ display: 'flex', flex: 1, gap: 4 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('coupon_code_placeholder') || 'Code...'}
                                value={couponCode}
                                onChange={e => setCouponCode(e.target.value)}
                                disabled={!!appliedCoupon}
                                style={{ flex: 1, padding: '6px 10px', fontSize: '0.9rem', letterSpacing: 1, textTransform: 'uppercase' }}
                            />
                            {!appliedCoupon ? (
                                <button type="button" onClick={handleApplyCoupon} style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}>
                                    {t('apply_coupon') || 'Apply'}
                                </button>
                            ) : (
                                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} style={{ padding: '6px 12px', background: 'var(--error, #ef4444)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.88rem', cursor: 'pointer' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {appliedCoupon && (
                        <div style={{ fontSize: '0.8rem', color: '#10b981', textAlign: 'right', marginBottom: 6 }}>
                            ✓ {t('coupon_applied_success') || 'Coupon Active'} (-{couponDiscountAmount.toFixed(3)})
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '2px solid var(--border)' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t('final_total') || 'Total'}</span>
                        <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(total)}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
                        <button
                            onClick={openPayModal}
                            disabled={cart.length === 0}
                            style={{
                                padding: '14px', background: cart.length > 0 ? 'var(--primary)' : 'var(--border)',
                                color: 'white', border: 'none', borderRadius: '10px',
                                cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                                fontSize: '1.05rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                transition: 'all 0.2s'
                            }}
                        >
                            <CreditCard size={20} /> {t('checkout') || 'Checkout'}
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
                                ].map(m => {
                                    const isDisabled = m.id === 'credit' && selectedCustomer?.code === 'CUST-CASH';
                                    return (
                                        <button 
                                            key={m.id} 
                                            onClick={() => !isDisabled && setPayMethod(m.id)} 
                                            disabled={isDisabled}
                                            style={{
                                                padding: '10px 6px', borderRadius: '10px',
                                                border: `2px solid ${payMethod === m.id ? 'var(--primary)' : 'var(--border)'}`,
                                                background: payMethod === m.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer', 
                                                fontWeight: 600, fontSize: '0.82rem',
                                                color: payMethod === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                                                opacity: isDisabled ? 0.45 : 1,
                                                transition: 'all 0.15s'
                                            }}
                                            title={isDisabled ? (t('cash_customer_no_credit') || 'لا يمكن إجراء عملية بيع آجل للعميل النقدي') : ''}
                                        >
                                            {m.label}
                                        </button>
                                    );
                                })}
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
                                {saving ? <span className="spinner-btn"></span> : <Check size={18} />}
                                {saving ? (t('saving') || 'Saving...') : payMethod === 'credit' ? (t('record_credit') || 'Record Credit') : (t('confirm_sale') || 'Confirm Sale')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Receipt Modal ───────────────────────────────────────────── */}
            {showReceipt && lastReceipt && (
                <div 
                    onClick={() => setShowReceipt(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '0', width: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column' }}
                    >
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
                                    {savingCustomer ? <span className="spinner-btn"></span> : <Check size={16} />}
                                    {savingCustomer ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
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

            {/* Image Zoom Modal */}
            {zoomImage && (
                <div 
                    onClick={() => setZoomImage(null)}
                    style={{ 
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        zIndex: 1100, backdropFilter: 'blur(4px)', cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                            position: 'relative', background: 'var(--surface)', 
                            borderRadius: '16px', padding: '16px', maxWidth: '85vw', 
                            maxHeight: '85vh', display: 'flex', flexDirection: 'column', 
                            alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            animation: 'scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        <button 
                            onClick={() => setZoomImage(null)}
                            style={{ 
                                position: 'absolute', top: '-15px', left: '-15px', 
                                background: 'var(--danger)', color: 'white', border: 'none', 
                                borderRadius: '50%', width: '32px', height: '32px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 10
                            }}
                        >
                            <X size={18} />
                        </button>
                        
                        <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '280px', minHeight: '280px' }}>
                            <img 
                                src={zoomImage} 
                                alt={zoomImageName || "Product"} 
                                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} 
                            />
                        </div>
                        
                        {zoomImageName && (
                            <h4 style={{ margin: '12px 0 0 0', color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', textAlign: 'center' }}>
                                {zoomImageName}
                            </h4>
                        )}
                    </div>
                </div>
            )}

            {/* Spin animation */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

const ProductCard = React.memo(function ProductCard({
    product,
    color,
    inCartQty,
    onAddToCart,
    showPurchasePriceInPOS,
    showPurchasePriceDetail,
    onTogglePurchasePrice,
    formattedSalePrice,
    formattedPurchasePrice,
    outOfStockLabel,
    inStockLabel,
    purchasePriceLabel,
    onZoomImage
}) {
    const outOfStock = product.shop_stock <= 0;
    return (
        <div
            onClick={() => !outOfStock && onAddToCart(product)}
            style={{
                background: outOfStock ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                border: inCartQty > 0 ? `2px solid ${color}` : '1px solid var(--border)',
                borderRadius: '12px', padding: '10px',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                opacity: outOfStock ? 0.55 : 1,
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '10px',
                position: 'relative', userSelect: 'none',
                overflow: 'visible', /* prevent badge clipping */
                boxShadow: inCartQty > 0 ? `0 4px 16px ${color}33` : 'var(--shadow)'
            }}
            onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
        >
            {/* Cart Badge */}
            {inCartQty > 0 && (
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
                    {inCartQty}
                </div>
            )}
            
            {/* Absolute positioned image to force it strictly onto the left in both RTL and LTR without interfering with DOM flow direction */}
            <div style={{ 
                width: '76px', height: '76px', flexShrink: 0, position: 'absolute', left: '10px', top: '10px',
                background: 'var(--bg-primary)', borderRadius: '8px'
            }}>
                {product.image ? (
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            onZoomImage(product.image, product.name);
                        }}
                        title={t('zoom_image') || 'Zoom Image'}
                        style={{
                            width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden',
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'zoom-in', transition: 'all 0.2s ease',
                            background: '#fff'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                    >
                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                ) : (
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '8px',
                        background: `${color}15`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color,
                        border: '1px solid transparent'
                    }}>
                        <Package size={28} style={{ opacity: 0.7 }} />
                    </div>
                )}
            </div>

            <div style={{ 
                display: 'flex', flexDirection: 'column', flex: 1, 
                minHeight: '76px', justifyContent: 'center', paddingLeft: '92px', textAlign: 'start' 
            }}>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 6px 0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{product.name}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 6px 0' }}>
                    <span style={{ fontWeight: 800, color, fontSize: '0.95rem' }}>{formattedSalePrice}</span>
                    {showPurchasePriceInPOS && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTogglePurchasePrice(product.id);
                            }}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: showPurchasePriceDetail ? 'var(--primary)' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                            title={purchasePriceLabel}
                        >
                            {showPurchasePriceDetail ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                    )}
                </div>

                {showPurchasePriceDetail && (
                    <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 6px 0' }}>
                        {purchasePriceLabel}: <span style={{ color: '#ef4444' }}>{formattedPurchasePrice}</span>
                    </p>
                )}
                <div>
                    {outOfStock ? (
                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>✗ {outOfStockLabel}</span>
                    ) : (
                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>{inStockLabel}: {product.shop_stock}</span>
                    )}
                </div>
            </div>
        </div>
    );
});

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
