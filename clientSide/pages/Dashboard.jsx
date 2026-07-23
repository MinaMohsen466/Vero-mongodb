import React, { useState, useEffect } from 'react';
import { 
    Users, Truck, Package, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown, 
    DollarSign, FileText, AlertCircle, BarChart2, PieChart as PieChartIcon, Sun, Moon, 
    Calendar, Plus, ArrowUpRight, ArrowDownRight, Activity, Wallet, Receipt, ShieldAlert
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../App';

function Dashboard() {
    const { t, user, setCurrentPage, hasPerm } = useAuth();
    const checkPerm = (mod, action = 'can_view') => {
        if (!user) return false;
        if (user.role === 'admin' || user.id === 1 || user.username === 'admin') return true;
        if (typeof hasPerm === 'function') return hasPerm(mod, action);
        return true;
    };

    const translate = (key, fallback) => {
        if (!t) return fallback;
        const val = t(key);
        return val === key ? fallback : val;
    };

    const [stats, setStats] = useState({ customers: 0, suppliers: 0, products: 0, salesInvoices: 0, purchaseInvoices: 0, totalSales: 0, totalPurchases: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [receivableCustomers, setReceivableCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({});
    const [monthlyData, setMonthlyData] = useState([]);
    const [pieData, setPieData] = useState([]);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const handleSettingsUpdate = () => { loadData(); };
        window.addEventListener('settingsUpdated', handleSettingsUpdate);
        return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    }, []);

    const loadData = async () => {
        try {
            const [customers, suppliers, products, salesInv, purchaseInv, settingsData] = await Promise.all([
                window.api.customers.getAll(), window.api.suppliers.getAll(), window.api.products.getAll(),
                window.api.invoices.getAll('sales'), window.api.invoices.getAll('purchase'),
                window.api.settings.getAll()
            ]);
            setSettings(settingsData || {});

            const totalSales = (salesInv || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
            const totalPurchases = (purchaseInv || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
            setStats({
                customers: (customers || []).length, suppliers: (suppliers || []).length, products: (products || []).length,
                salesInvoices: (salesInv || []).length, purchaseInvoices: (purchaseInv || []).length, totalSales, totalPurchases
            });
            setRecentInvoices([...(salesInv || []), ...(purchaseInv || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));

            // Get low stock products
            const low = (products || [])
                .filter(p => p.stock_quantity <= p.min_stock && p.min_stock > 0)
                .sort((a, b) => a.stock_quantity - b.stock_quantity)
                .slice(0, 5);
            setLowStockProducts(low);

            // Get customers with receivables
            const customersWithBalances = (customers || [])
                .filter(c => c.balance > 0)
                .sort((a, b) => b.balance - a.balance)
                .slice(0, 5);
            setReceivableCustomers(customersWithBalances);

            // Generate monthly data for charts (Last 6 months)
            const mData = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthYear = d.toLocaleDateString('ar-EG', { month: 'short' });
                const m = d.getMonth();
                const y = d.getFullYear();

                const s = (salesInv || []).filter(inv => {
                    const date = new Date(inv.date);
                    return date.getMonth() === m && date.getFullYear() === y;
                }).reduce((sum, inv) => sum + (inv.total || 0), 0);

                const p = (purchaseInv || []).filter(inv => {
                    const date = new Date(inv.date);
                    return date.getMonth() === m && date.getFullYear() === y;
                }).reduce((sum, inv) => sum + (inv.total || 0), 0);

                mData.push({ name: monthYear, [t('dash_sales') || 'المبيعات']: s, [t('dash_purchases') || 'المشتريات']: p });
            }
            setMonthlyData(mData);

            setPieData([
                { name: t('dash_sales') || 'المبيعات', value: totalSales, color: '#10B981', gradient: 'url(#salesGrad)' },
                { name: t('dash_purchases') || 'المشتريات', value: totalPurchases, color: '#EF4444', gradient: 'url(#purchasesGrad)' }
            ]);

        } catch (e) { console.error('Dashboard load error:', e); }
        setLoading(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'د.ك'));

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const glassCard = {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(17, 24, 39, 0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
                    color: '#fff',
                    direction: 'rtl',
                    textAlign: 'right'
                }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '0.88rem', color: '#9CA3AF' }}>{label}</p>
                    {payload.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.84rem', marginTop: idx > 0 ? '6px' : 0 }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.fill }} />
                            <span style={{ color: '#D1D5DB' }}>{p.name}:</span>
                            <span style={{ fontWeight: 800, color: p.fill }}>{formatCurrency(p.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const hr = new Date().getHours();
    const isMorning = hr < 12;
    const greeting = isMorning 
        ? translate('good_morning', 'صباح الخير') 
        : hr < 17 
            ? translate('good_afternoon', 'طاب يومك') 
            : translate('good_evening', 'مساء الخير');

    const quickActions = [
        { label: 'فاتورة مبيعات', icon: Plus, action: () => setCurrentPage && setCurrentPage('sales'), bg: 'var(--primary)', color: '#fff', mod: 'sales_invoices', perm: 'can_create' },
        { label: 'فاتورة مشتريات', icon: Plus, action: () => setCurrentPage && setCurrentPage('purchases'), bg: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', mod: 'purchase_invoices', perm: 'can_create' },
        { label: 'إضافة عميل', icon: Users, action: () => setCurrentPage && setCurrentPage('customers'), bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981', mod: 'customers', perm: 'can_create' },
        { label: 'إضافة منتج', icon: Package, action: () => setCurrentPage && setCurrentPage('products'), bg: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', mod: 'products', perm: 'can_create' },
        { label: 'سندات', icon: Receipt, action: () => setCurrentPage && setCurrentPage('vouchers'), bg: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', mod: 'receipt_vouchers', perm: 'can_create' }
    ].filter(a => checkPerm(a.mod, a.perm) || checkPerm(a.mod, 'can_view'));

    const statCards = [
        { label: t('dash_customersCount') || 'العملاء', value: stats.customers, icon: Users, color: '#3B82F6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', page: 'customers', mod: 'customers' },
        { label: t('dash_suppliersCount') || 'الموردين', value: stats.suppliers, icon: Truck, color: '#8B5CF6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', page: 'suppliers', mod: 'suppliers' },
        { label: t('menu_products') || 'المنتجات', value: stats.products, icon: Package, color: '#F59E0B', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', page: 'products', mod: 'products' },
        { label: t('menu_sales') || 'فواتير المبيعات', value: stats.salesInvoices, icon: ShoppingCart, color: '#10B981', gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', page: 'sales', mod: 'sales_invoices' },
        { label: t('menu_purchases') || 'فواتير المشتريات', value: stats.purchaseInvoices, icon: ShoppingBag, color: '#EF4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', page: 'purchases', mod: 'purchase_invoices' }
    ].filter(s => checkPerm(s.mod, 'can_view'));

    return (
        <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
            
            {/* Header Welcome Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(124, 58, 237, 0.06) 50%, rgba(16, 185, 129, 0.04) 100%)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(37, 99, 235, 0.18)',
                borderRadius: '24px',
                padding: '28px 32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(37, 99, 235, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1 }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
                        position: 'relative'
                    }}>
                        {isMorning ? <Sun size={32} /> : <Moon size={32} />}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                            {`${greeting}، ${user?.full_name || user?.username || 'مدير النظام'}`} 👋
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', marginTop: '6px', margin: 0, fontWeight: 500 }}>
                            {translate('welcome_message', 'مرحباً بك في نظام المحاسبة المتكامل — نظرة عامة على أدائك اليوم')}
                        </p>
                    </div>
                </div>
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--surface)',
                    padding: '10px 20px',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    zIndex: 1
                }}>
                    <Calendar size={18} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Quick Actions Toolbar */}
            {quickActions.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    scrollBehavior: 'smooth'
                }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 750, color: 'var(--text-muted)', marginLeft: '4px', whiteSpace: 'nowrap' }}>
                        ⚡ وصول سريع:
                    </span>
                    {quickActions.map((act, i) => (
                        <button
                            key={i}
                            onClick={act.action}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: act.bg,
                                color: act.color,
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <act.icon size={15} />
                            {act.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Stat Cards Grid */}
            {statCards.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px' }}>
                    {statCards.map((s, i) => (
                        <div 
                            key={i} 
                            onClick={() => setCurrentPage && setCurrentPage(s.page)}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
                            transition: 'all 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 14px 28px ${s.color}22`;
                            e.currentTarget.style.borderColor = s.color;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 6px', fontWeight: 650 }}>{s.label}</p>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0 }}>{s.value}</h3>
                        </div>
                        <div style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '16px',
                            background: s.gradient,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 6px 16px ${s.color}40`
                        }}>
                            <s.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>
            )}

            {/* Financial Summary Cards */}
            {(user?.role === 'admin' || user?.permissions?.financial_summary?.can_view) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '4px'
                    }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={20} style={{ color: 'var(--primary)' }} /> {t('dash_financialSummary') || 'الملخص المالي'}
                        </h2>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dash_canBeControlled') || 'تحديث فوري للمجاميع'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        
                        {/* Total Sales Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                            color: 'white',
                            padding: '26px 28px',
                            borderRadius: '22px',
                            boxShadow: '0 12px 30px rgba(37, 99, 235, 0.25)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.25s ease',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.12 }}>
                                <TrendingUp size={130} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>{t('dash_totalSales') || 'إجمالي المبيعات'}</span>
                                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                    <ArrowUpRight size={22} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{formatCurrency(stats.totalSales)}</h3>
                        </div>

                        {/* Total Purchases Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #9f1239 0%, #e11d48 100%)',
                            color: 'white',
                            padding: '26px 28px',
                            borderRadius: '22px',
                            boxShadow: '0 12px 30px rgba(225, 29, 72, 0.25)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.25s ease',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.12 }}>
                                <TrendingDown size={130} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>{t('dash_totalPurchases') || 'إجمالي المشتريات'}</span>
                                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                    <ArrowDownRight size={22} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{formatCurrency(stats.totalPurchases)}</h3>
                        </div>

                        {/* Net Profit Card */}
                        {(() => {
                            const net = stats.totalSales - stats.totalPurchases;
                            const isPositive = net >= 0;
                            const gradient = isPositive 
                                ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)' 
                                : 'linear-gradient(135deg, #92400e 0%, #d97706 100%)';
                            const shadowColor = isPositive ? 'rgba(5, 150, 105, 0.25)' : 'rgba(217, 119, 6, 0.25)';
                            return (
                                <div style={{
                                    background: gradient,
                                    color: 'white',
                                    padding: '26px 28px',
                                    borderRadius: '22px',
                                    boxShadow: `0 12px 30px ${shadowColor}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'transform 0.25s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.12 }}>
                                        <Wallet size={130} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 700, opacity: 0.9 }}>{t('dash_netProfit') || 'صافي الربح الإجمالي'}</span>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                                            <DollarSign size={22} />
                                        </div>
                                    </div>
                                    <h3 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{formatCurrency(net)}</h3>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Charts Section */}
            {(user?.role === 'admin' || user?.permissions?.dashboard_charts?.can_view) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px' }}>
                    
                    {/* Sales & Purchases Bar Chart */}
                    <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
                                    <BarChart2 size={20} />
                                </div>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    {t('dash_sales_vs_purchases_6m') || 'المبيعات والمشتريات (آخر 6 أشهر)'}
                                </h4>
                            </div>
                        </div>
                        <div style={{ height: '310px', minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesBarGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                                        </linearGradient>
                                        <linearGradient id="purchasesBarGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" opacity={0.6} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} tickFormatter={(value) => `${value / 1000}k`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: '12px', fontSize: '13px', fontWeight: 600 }} />
                                    <Bar dataKey={t('dash_sales') || 'المبيعات'} fill="url(#salesBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey={t('dash_purchases') || 'المشتريات'} fill="url(#purchasesBarGrad)" radius={[8, 8, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Donut Ratio Chart */}
                    <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
                            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED' }}>
                                <PieChartIcon size={20} />
                            </div>
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                {t('dash_salesToPurchasesRatio') || 'نسبة توزيع المبيعات للمشتريات'}
                            </h4>
                        </div>
                        <div style={{ height: '310px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0 }}>
                            {stats.totalSales === 0 && stats.totalPurchases === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                                    <PieChartIcon size={56} style={{ opacity: 0.15, marginBottom: '14px' }} />
                                    <p style={{ margin: 0, fontSize: '.95rem', fontWeight: 600 }}>{t('noData') || 'لا توجد عمليات مسجلة حتى الآن'}</p>
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={210}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={68}
                                                outerRadius={92}
                                                paddingAngle={6}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                                        {pieData.map((item, index) => {
                                            const total = (stats.totalSales + stats.totalPurchases) || 1;
                                            const pct = Math.round((item.value / total) * 100);
                                            return (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: 'var(--bg-secondary)',
                                                    padding: '8px 16px',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)'
                                                }}>
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                                    <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 650 }}>{item.name}</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 850, color: item.color }}>
                                                        {pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Invoices Table */}
            <div style={{ ...glassCard, borderTop: '4px solid var(--primary)' }}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} style={{ color: 'var(--primary)' }} />
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {t('dash_recentInvoices') || 'آخر الفواتير الصادرة والواردة'}
                        </h4>
                    </div>
                    <button 
                        onClick={() => setCurrentPage && setCurrentPage('sales')} 
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '0.86rem',
                            fontWeight: 750,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        عرض الكل ←
                    </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ opacity: 0.18, marginBottom: '12px' }} />
                            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{t('dash_noInvoices') || 'لا توجد فواتير حديثة'}</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 750, color: 'var(--text-secondary)' }}>{t('inv_number') || 'رقم الفاتورة'}</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 750, color: 'var(--text-secondary)' }}>{t('dash_type') || 'النوع'}</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 750, color: 'var(--text-secondary)' }}>{t('dash_customerSupplier') || 'العميل/المورد'}</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 750, color: 'var(--text-secondary)' }}>{t('date') || 'التاريخ'}</th>
                                    <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 750, color: 'var(--text-secondary)' }}>{t('amount') || 'المبلغ الإجمالي'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map((inv, index) => {
                                    const isSales = inv.type === 'sales';
                                    const badgeBg = isSales ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                                    const badgeColor = isSales ? '#059669' : '#DC2626';
                                    const badgeLabel = isSales ? `📈 ${t('dash_sales') || 'مبيعات'}` : `📉 ${t('dash_purchases') || 'مشتريات'}`;
                                    
                                    return (
                                        <tr 
                                            key={`${inv.type}-${inv.id}`} 
                                            style={{
                                                borderBottom: '1px solid var(--border-light)',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 20px', fontWeight: 800, color: 'var(--primary)' }}>{inv.invoice_number}</td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 750,
                                                    background: badgeBg,
                                                    color: badgeColor
                                                }}>
                                                    {badgeLabel}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 650 }}>{inv.customer_name || inv.supplier_name || '—'}</td>
                                            <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 20px', fontWeight: 850, color: 'var(--text-primary)', textAlign: 'left' }}>{formatCurrency(inv.total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Bottom Section: Low Stock & Customer Receivables */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                
                {/* Low Stock Alerts */}
                {(user?.role === 'admin' || user?.permissions?.stock_alerts?.can_view) && (
                    <div style={{ ...glassCard, borderTop: '4px solid #F59E0B', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldAlert size={20} style={{ color: '#F59E0B' }} />
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    {t('dash_lowStock') || 'منتجات منخفضة المخزون'}
                                </h4>
                            </div>
                        </div>
                        <div>
                            {lowStockProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 650, margin: 0, color: '#10B981' }}>✓ {t('dash_allProductsSafeStock') || 'جميع المنتجات في المخزون الآمن'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {lowStockProducts.map(product => (
                                        <div key={product.id} style={{
                                            padding: '14px 16px',
                                            background: 'rgba(245, 158, 11, 0.08)',
                                            borderRadius: '14px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderRight: '4px solid #F59E0B',
                                            border: '1px solid rgba(245, 158, 11, 0.18)'
                                        }}>
                                            <div>
                                                <p style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '0.9rem' }}>{product.name}</p>
                                                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{t('dash_minStock') || 'الحد الأدنى المطلوب'}: {product.min_stock}</p>
                                            </div>
                                            <span style={{
                                                padding: '6px 14px',
                                                background: '#F59E0B',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '0.82rem',
                                                fontWeight: 800,
                                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                                            }}>{product.stock_quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Customer Receivables Top 5 */}
                {(user?.role === 'admin' || user?.permissions?.customer_receivables?.can_view) && (
                    <div style={{ ...glassCard, borderTop: '4px solid #EF4444', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={20} style={{ color: '#EF4444' }} />
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    {t('dash_receivablesTop5') || 'الذمم المدينة (أعلى 5)'}
                                </h4>
                            </div>
                        </div>
                        <div>
                            {receivableCustomers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 650, margin: 0, color: '#10B981' }}>✓ {t('dash_noReceivables') || 'لا توجد ذمم مدينة على العملاء'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {receivableCustomers.map(customer => (
                                        <div key={customer.id} style={{
                                            padding: '14px 16px',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            borderRadius: '14px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderRight: '4px solid #EF4444',
                                            border: '1px solid rgba(239, 68, 68, 0.18)'
                                        }}>
                                            <div>
                                                <p style={{ fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '0.9rem' }}>{customer.name}</p>
                                                <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>{t('dash_debitBalance') || 'رصيد مستحق'}</p>
                                            </div>
                                            <span style={{
                                                padding: '6px 14px',
                                                background: '#EF4444',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '0.82rem',
                                                fontWeight: 850,
                                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                            }}>{formatCurrency(customer.balance)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default Dashboard;
