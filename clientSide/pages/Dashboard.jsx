import React, { useState, useEffect } from 'react';
import { Users, Truck, Package, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, BarChart2, PieChart as PieChartIcon, Sun, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../App';

function Dashboard() {
    const { t, user } = useAuth();
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
        const handleSettingsUpdate = () => {
            loadData();
        };
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
                // We'll use formatting dynamically later if needed, but for now stick to 'short'
                const monthYear = d.toLocaleDateString('en-GB', { month: 'short' });
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

                mData.push({ name: monthYear, [t('dash_sales')]: s, [t('dash_purchases')]: p });
            }
            setMonthlyData(mData);

            setPieData([
                { name: t('dash_sales'), value: totalSales, color: '#10B981' },
                { name: t('dash_purchases'), value: totalPurchases, color: '#EF4444' }
            ]);

        } catch (e) { console.error('Dashboard load error:', e); }
        setLoading(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + (settings.general?.currency_symbol || (t('currency_kd') || 'KD'));

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const glassCard = {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.02)',
        transition: 'all 0.3s ease',
        overflow: 'hidden'
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'var(--surface-overlay)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid var(--border)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
                    color: 'var(--text-primary)',
                    direction: 'rtl',
                    textAlign: 'right'
                }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.88rem' }}>{label}</p>
                    {payload.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', marginTop: idx > 0 ? '4px' : 0 }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.fill }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{p.name}:</span>
                            <span style={{ fontWeight: 700, color: p.fill }}>{formatCurrency(p.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ direction: 'rtl', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '24px' }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(37, 99, 235, 0.15)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Sun size={28} className="glow-icon" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {(() => {
                                const hr = new Date().getHours();
                                const greeting = hr < 12 
                                    ? translate('good_morning', 'صباح الخير') 
                                    : hr < 17 
                                        ? translate('good_afternoon', 'طاب يومك') 
                                        : translate('good_evening', 'مساء الخير');
                                return `${greeting}، ${user?.name || user?.username || ''}`;
                            })()}
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', margin: 0 }}>
                            {translate('welcome_message', 'مرحباً بك في نظام المحاسبة المتكامل')}
                        </p>
                    </div>
                </div>
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--surface)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                {[
                    { label: t('dash_customersCount') || 'العملاء', value: stats.customers, icon: Users, color: '#3B82F6' },
                    { label: t('dash_suppliersCount') || 'الموردين', value: stats.suppliers, icon: Truck, color: '#8B5CF6' },
                    { label: t('menu_products') || 'المنتجات', value: stats.products, icon: Package, color: '#F59E0B' },
                    { label: t('menu_sales') || 'فواتير المبيعات', value: stats.salesInvoices, icon: ShoppingCart, color: '#10B981' },
                    { label: t('menu_purchases') || 'فواتير المشتريات', value: stats.purchaseInvoices, icon: ShoppingBag, color: '#EF4444' }
                ].map((s, i) => (
                    <div 
                        key={i} 
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.02)',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            borderRight: `4px solid ${s.color}`
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = `0 12px 24px ${s.color}15`;
                            e.currentTarget.style.borderColor = `${s.color}66`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 20px 0 rgba(0,0,0,0.02)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            background: `${s.color}10`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: s.color,
                            boxShadow: `inset 0 0 10px ${s.color}05`
                        }}>
                            <s.icon size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{s.value}</h3>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0, fontWeight: 600 }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {(user?.role === 'admin' || user?.permissions?.financial_summary?.can_view) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '8px',
                        borderBottom: '1px solid var(--border-light)'
                    }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 750, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> {t('dash_financialSummary') || 'الملخص المالي'}
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('dash_canBeControlled') || 'يمكن التحكم به عبر الإعدادات'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '16px',
                            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.15)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.15 }}>
                                <TrendingUp size={100} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, opacity: 0.9 }}>{t('dash_totalSales') || 'إجمالي المبيعات'}</span>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{formatCurrency(stats.totalSales)}</h3>
                        </div>

                        <div style={{
                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            color: 'white',
                            padding: '24px',
                            borderRadius: '16px',
                            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.15)',
                            position: 'relative',
                            overflow: 'hidden',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.15 }}>
                                <TrendingDown size={100} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ fontSize: '0.88rem', fontWeight: 600, opacity: 0.9 }}>{t('dash_totalPurchases') || 'إجمالي المشتريات'}</span>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <TrendingDown size={18} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{formatCurrency(stats.totalPurchases)}</h3>
                        </div>

                        {(() => {
                            const net = stats.totalSales - stats.totalPurchases;
                            const isPositive = net >= 0;
                            const gradient = isPositive 
                                ? 'linear-gradient(135deg, #10b981 0%, #047857 100%)' 
                                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                            const shadowColor = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
                            return (
                                <div style={{
                                    background: gradient,
                                    color: 'white',
                                    padding: '24px',
                                    borderRadius: '16px',
                                    boxShadow: `0 10px 25px ${shadowColor}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.15 }}>
                                        <DollarSign size={100} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 600, opacity: 0.9 }}>{t('dash_netProfit') || 'صافي الربح'}</span>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <DollarSign size={18} />
                                        </div>
                                    </div>
                                    <h3 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{formatCurrency(net)}</h3>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {(user?.role === 'admin' || user?.permissions?.dashboard_charts?.can_view) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                            <BarChart2 size={20} style={{ color: 'var(--primary)' }} />
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 750, color: 'var(--text-primary)', margin: 0 }}>
                                {t('dash_sales_vs_purchases_6m') || 'المبيعات والمشتريات (آخر 6 أشهر)'}
                            </h4>
                        </div>
                        <div style={{ height: '300px', minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                                    <Bar dataKey={t('dash_sales')} fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                                    <Bar dataKey={t('dash_purchases')} fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                            <PieChartIcon size={20} style={{ color: 'var(--primary)' }} />
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 750, color: 'var(--text-primary)', margin: 0 }}>
                                {t('dash_salesToPurchasesRatio') || 'نسبة المبيعات إلى المشتريات'}
                            </h4>
                        </div>
                        <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0 }}>
                            {stats.totalSales === 0 && stats.totalPurchases === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                                    <PieChartIcon size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                    <p style={{ margin: 0, fontSize: '.9rem' }}>{t('noData') || 'لا توجد بيانات'}</p>
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={90}
                                                paddingAngle={4}
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
                                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                                        {pieData.map((item, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.name}</span>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 750, color: item.color }}>
                                                    {Math.round((item.value / ((stats.totalSales + stats.totalPurchases) || 1)) * 100)}%
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ ...glassCard, borderRight: '4px solid var(--primary)' }}>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-light)' }}>
                    <FileText size={20} style={{ color: 'var(--primary)' }} />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 750, color: 'var(--text-primary)', margin: 0 }}>
                        {t('dash_recentInvoices') || 'آخر الفواتير'}
                    </h4>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>{t('dash_noInvoices') || 'لا توجد فواتير'}</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('inv_number') || 'رقم الفاتورة'}</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('dash_type') || 'النوع'}</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('dash_customerSupplier') || 'العميل/المورد'}</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('date') || 'التاريخ'}</th>
                                    <th style={{ padding: '12px 18px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>{t('amount') || 'المبلغ'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map((inv, index) => {
                                    const isSales = inv.type === 'sales';
                                    const badgeBg = isSales ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
                                    const badgeColor = isSales ? '#10b981' : '#d97706';
                                    const badgeLabel = isSales ? `📈 ${t('dash_sales') || 'مبيعات'}` : `📉 ${t('dash_purchases') || 'مشتريات'}`;
                                    
                                    return (
                                        <tr 
                                            key={`${inv.type}-${inv.id}`} 
                                            style={{
                                                borderBottom: '1px solid var(--border-light)',
                                                background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'}
                                        >
                                            <td style={{ padding: '14px 18px', fontWeight: 750, color: 'var(--primary)' }}>{inv.invoice_number}</td>
                                            <td style={{ padding: '14px 18px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    background: badgeBg,
                                                    color: badgeColor
                                                }}>
                                                    {badgeLabel}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontWeight: 600 }}>{inv.customer_name || inv.supplier_name || '—'}</td>
                                            <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
                                            <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>{formatCurrency(inv.total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {(user?.role === 'admin' || user?.permissions?.stock_alerts?.can_view) && (
                    <div style={{ ...glassCard, borderTop: '4px solid var(--warning)', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
                            <AlertCircle size={18} style={{ color: 'var(--warning)' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--warning)', margin: 0 }}>
                                {t('dash_lowStock') || 'منتجات منخفضة المخزون'}
                            </h4>
                        </div>
                        <div>
                            {lowStockProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>✓ {t('dash_allProductsSafeStock') || 'جميع المنتجات في المخزون الآمن'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {lowStockProducts.map(product => (
                                        <div key={product.id} style={{
                                            padding: '12px',
                                            background: 'var(--warning-light)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderLeft: '4px solid var(--warning)',
                                            border: '1px solid rgba(245, 158, 11, 0.15)'
                                        }}>
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '0.88rem' }}>{product.name}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{t('dash_minStock') || 'الحد الأدنى'}: {product.min_stock}</p>
                                            </div>
                                            <span style={{
                                                padding: '4px 10px',
                                                background: 'var(--warning)',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 750
                                            }}>{product.stock_quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(user?.role === 'admin' || user?.permissions?.customer_receivables?.can_view) && (
                    <div style={{ ...glassCard, borderTop: '4px solid var(--danger)', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
                            <Users size={18} style={{ color: 'var(--danger)' }} />
                            <h4 style={{ fontSize: '1rem', fontWeight: 750, color: 'var(--danger)', margin: 0 }}>
                                {t('dash_receivablesTop5') || 'الذمم المدينة (أعلى 5)'}
                            </h4>
                        </div>
                        <div>
                            {receivableCustomers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.85rem', margin: 0 }}>✓ {t('dash_noReceivables') || 'لا توجد ذمم مدينة'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {receivableCustomers.map(customer => (
                                        <div key={customer.id} style={{
                                            padding: '12px',
                                            background: 'var(--danger-light)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderLeft: '4px solid var(--danger)',
                                            border: '1px solid rgba(239, 68, 68, 0.15)'
                                        }}>
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', fontSize: '0.88rem' }}>{customer.name}</p>
                                                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>{t('dash_debitBalance') || 'رصيد مدين'}</p>
                                            </div>
                                            <span style={{
                                                padding: '4px 10px',
                                                background: 'var(--danger)',
                                                color: 'white',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 750
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
