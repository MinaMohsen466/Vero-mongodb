import React, { useState, useEffect } from 'react';
import { Users, Truck, Package, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle } from 'lucide-react';

function Dashboard() {
    const [stats, setStats] = useState({ customers: 0, suppliers: 0, products: 0, salesInvoices: 0, purchaseInvoices: 0, totalSales: 0, totalPurchases: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [receivableCustomers, setReceivableCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({});

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
        } catch (e) { console.error('Dashboard load error:', e); }
        setLoading(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' د.ك';

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Header Section */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>لوحة التحكم</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>مرحباً بك في نظام إدارة الحسابات</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'العملاء', value: stats.customers, icon: Users, color: '#3B82F6' },
                    { label: 'الموردين', value: stats.suppliers, icon: Truck, color: '#8B5CF6' },
                    { label: 'المنتجات', value: stats.products, icon: Package, color: '#F59E0B' },
                    { label: 'فواتير المبيعات', value: stats.salesInvoices, icon: ShoppingCart, color: '#10B981' },
                    { label: 'فواتير المشتريات', value: stats.purchaseInvoices, icon: ShoppingBag, color: '#EF4444' }
                ].map((s, i) => (
                    <div key={i} className="card" style={{ 
                        padding: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        borderLeft: `4px solid ${s.color}`,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'var(--shadow)';
                    }}>
                        <div style={{ 
                            width: '50px', 
                            height: '50px', 
                            borderRadius: '12px', 
                            background: `${s.color}15`,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: s.color
                        }}>
                            <s.icon size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Financial Summary */}
            {settings.general?.show_financial_summary !== 'no' && (
            <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid var(--border)'
                }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>الملخص المالي</h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>يمكن التحكم به من الإعدادات</span>
                </div>

                {/* Financial Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div className="card" style={{ 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        color: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>إجمالي المبيعات</span>
                            <TrendingUp size={24} style={{ opacity: 0.8 }} />
                        </div>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{formatCurrency(stats.totalSales)}</span>
                    </div>

                    <div className="card" style={{ 
                        background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                        color: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(239, 68, 68, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>إجمالي المشتريات</span>
                            <TrendingDown size={24} style={{ opacity: 0.8 }} />
                        </div>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{formatCurrency(stats.totalPurchases)}</span>
                    </div>

                    <div className="card" style={{ 
                        background: `linear-gradient(135deg, ${stats.totalSales - stats.totalPurchases >= 0 ? '#10B981' : '#F59E0B'} 0%, ${stats.totalSales - stats.totalPurchases >= 0 ? '#059669' : '#D97706'} 100%)`,
                        color: 'white',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: `0 10px 25px rgba(${stats.totalSales - stats.totalPurchases >= 0 ? '16, 185, 129' : '245, 158, 11'}, 0.2)`
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>صافي الربح</span>
                            <DollarSign size={24} style={{ opacity: 0.8 }} />
                        </div>
                        <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{formatCurrency(stats.totalSales - stats.totalPurchases)}</span>
                    </div>
                </div>
            </div>
            )}

            {/* Show Financial Summary Button */}


            {/* Recent Invoices */}
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
                <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <FileText size={20} style={{ color: 'var(--primary)' }} /> آخر الفواتير
                    </h4>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>لا توجد فواتير حتى الآن</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%' }}>
                            <thead style={{ background: 'var(--bg-secondary)' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>رقم الفاتورة</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>النوع</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>العميل/المورد</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>التاريخ</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>المبلغ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map((inv, index) => (
                                    <tr key={`${inv.type}-${inv.id}`} style={{ 
                                        borderBottom: '1px solid var(--border)',
                                        background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                                        transition: 'background 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'}
                                    >
                                        <td style={{ padding: '16px', fontWeight: 600, color: 'var(--primary)' }}>{inv.invoice_number}</td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                background: inv.type === 'sales' ? '#D1FAE5' : '#FEF3C7',
                                                color: inv.type === 'sales' ? '#065F46' : '#92400E'
                                            }}>
                                                {inv.type === 'sales' ? '📈 مبيعات' : '📉 مشتريات'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{inv.customer_name || inv.supplier_name || '-'}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{new Date(inv.date).toLocaleDateString('ar-KW')}</td>
                                        <td style={{ padding: '16px', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(inv.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Additional Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {/* Low Stock Products */}
                {settings.general?.show_low_stock_products !== 'no' && (
                <div className="card" style={{ borderTop: '4px solid var(--warning)' }}>
                    <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--warning)' }}>
                            <AlertCircle size={20} /> المنتجات منخفضة المخزون
                        </h4>
                    </div>
                    <div className="card-body" style={{ padding: '16px' }}>
                        {lowStockProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: '0.9rem' }}>✓ جميع المنتجات بمخزون آمن</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {lowStockProducts.map(product => (
                                    <div key={product.id} style={{
                                        padding: '12px',
                                        background: 'var(--warning-light)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderLeft: '4px solid var(--warning)'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{product.name}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>الحد الأدنى: {product.min_stock}</p>
                                        </div>
                                        <span style={{
                                            padding: '6px 12px',
                                            background: 'var(--warning)',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600
                                        }}>{product.stock_quantity}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Customer Receivables */}
                {settings.general?.show_customer_receivables !== 'no' && (
                <div className="card" style={{ borderTop: '4px solid var(--danger)' }}>
                    <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                        <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)' }}>
                            <Users size={20} /> الذمم المدينة (أكبر 5)
                        </h4>
                    </div>
                    <div className="card-body" style={{ padding: '16px' }}>
                        {receivableCustomers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                <p style={{ fontSize: '0.9rem' }}>✓ لا توجد ذمم مدينة</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {receivableCustomers.map(customer => (
                                    <div key={customer.id} style={{
                                        padding: '12px',
                                        background: 'var(--danger-light)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderLeft: '4px solid var(--danger)'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{customer.name}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>رصيد مدين</p>
                                        </div>
                                        <span style={{
                                            padding: '6px 12px',
                                            background: 'var(--danger)',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
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
