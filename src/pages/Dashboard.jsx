import React, { useState, useEffect } from 'react';
import { Users, Truck, Package, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../App';

function Dashboard() {
    const { t, user } = useAuth();
    const [stats, setStats] = useState({ customers: 0, suppliers: 0, products: 0, salesInvoices: 0, purchaseInvoices: 0, totalSales: 0, totalPurchases: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [receivableCustomers, setReceivableCustomers] = useState([]);
    const [overdueInstallments, setOverdueInstallments] = useState([]);
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

    return (
        <div>
            {/* Header Section */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{t('menu_dashboard')}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{t('welcome_message') || 'Welcome to Accounting System'}</p>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: t('dash_customersCount') || 'Customers', value: stats.customers, icon: Users, color: '#3B82F6' },
                    { label: t('dash_suppliersCount') || 'Suppliers', value: stats.suppliers, icon: Truck, color: '#8B5CF6' },
                    { label: t('menu_products'), value: stats.products, icon: Package, color: '#F59E0B' },
                    { label: t('menu_sales'), value: stats.salesInvoices, icon: ShoppingCart, color: '#10B981' },
                    { label: t('menu_purchases'), value: stats.purchaseInvoices, icon: ShoppingBag, color: '#EF4444' }
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
            {settings.general?.show_financial_summary !== 'no' && (user?.role === 'admin' || user?.permissions?.financial_summary?.can_view) && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid var(--border)'
                    }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('dash_financialSummary') || 'Financial Summary'}</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('dash_canBeControlled') || 'Can be controlled from settings'}</span>
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
                                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{t('dash_totalSales')}</span>
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
                                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{t('dash_totalPurchases')}</span>
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
                                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{t('dash_netProfit')}</span>
                                <DollarSign size={24} style={{ opacity: 0.8 }} />
                            </div>
                            <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{formatCurrency(stats.totalSales - stats.totalPurchases)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            {settings.general?.show_sales_purchases_charts !== 'no' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    <div className="card">
                        <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                                <BarChart2 size={20} style={{ color: 'var(--primary)' }} /> {t('dash_sales_vs_purchases_6m') || 'Sales and Purchases (Last 6 Months)'}
                            </h4>
                        </div>
                        <div className="card-body" style={{ height: '350px', padding: '16px 0', minWidth: 0, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} tickFormatter={(value) => `${value / 1000}k`} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow)', color: 'var(--text-primary)' }}
                                        formatter={(value) => [formatCurrency(value), '']}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Bar dataKey={t('dash_sales')} fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar dataKey={t('dash_purchases')} fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                                <PieChartIcon size={20} style={{ color: 'var(--primary)' }} /> {t('dash_salesToPurchasesRatio') || 'Sales to Purchases Ratio'}
                            </h4>
                        </div>
                        <div className="card-body" style={{ height: '350px', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0 }}>
                            {stats.totalSales === 0 && stats.totalPurchases === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <PieChartIcon size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <p>{t('noData')}</p>
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow)', color: 'var(--text-primary)' }}
                                                formatter={(value) => formatCurrency(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                                        {pieData.map((item, index) => (
                                            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.name}</span>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round((item.value / ((stats.totalSales + stats.totalPurchases) || 1)) * 100)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Invoices */}
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
                <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
                        <FileText size={20} style={{ color: 'var(--primary)' }} /> {t('dash_recentInvoices')}
                    </h4>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <FileText size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>{t('dash_noInvoices')}</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%' }}>
                            <thead style={{ background: 'var(--bg-secondary)' }}>
                                <tr>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t('inv_number')}</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t('dash_type')}</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t('dash_customerSupplier')}</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t('date')}</th>
                                    <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t('amount') || 'Amount'}</th>
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
                                                {inv.type === 'sales' ? `📈 ${t('dash_sales')}` : `📉 ${t('dash_purchases')}`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{inv.customer_name || inv.supplier_name || '-'}</td>
                                        <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{new Date(inv.date).toLocaleDateString('en-GB')}</td>
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
                                <AlertCircle size={20} /> {t('dash_lowStock')}
                            </h4>
                        </div>
                        <div className="card-body" style={{ padding: '16px' }}>
                            {lowStockProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem' }}>✓ {t('dash_allProductsSafeStock') || 'All products have safe stock levels'}</p>
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
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('dash_minStock')}: {product.min_stock}</p>
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
                                <Users size={20} /> {t('dash_receivablesTop5') || 'Receivables (Top 5)'}
                            </h4>
                        </div>
                        <div className="card-body" style={{ padding: '16px' }}>
                            {receivableCustomers.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                    <p style={{ fontSize: '0.9rem' }}>✓ {t('dash_noReceivables') || 'No receivables'}</p>
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
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('dash_debitBalance') || 'Debit Balance'}</p>
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

                {/* Overdue Installments */}
                {overdueInstallments.length > 0 && (
                    <div className="card" style={{ borderTop: '4px solid #f97316' }}>
                        <div className="card-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                            <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600, color: '#f97316' }}>
                                <AlertCircle size={20} /> {t('inst_overduePlans') || 'أقساط متأخرة'}
                            </h4>
                        </div>
                        <div className="card-body" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {overdueInstallments.map((inst, i) => (
                                    <div key={i} style={{
                                        padding: '12px',
                                        background: '#ffedd5',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderLeft: '4px solid #f97316'
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{inst.customer_name || inst.plan_number}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {t('inv_dueDate') || 'تاريخ الاستحقاق'}: {new Date(inst.due_date).toLocaleDateString('en-GB')}
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '6px 12px',
                                            background: '#f97316',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}>{formatCurrency(inst.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
