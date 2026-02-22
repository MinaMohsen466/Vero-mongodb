import React, { useState, useEffect } from 'react';
import { Users, Truck, Package, ShoppingCart, ShoppingBag, TrendingUp, TrendingDown, DollarSign, FileText } from 'lucide-react';

function Dashboard() {
    const [stats, setStats] = useState({ customers: 0, suppliers: 0, products: 0, salesInvoices: 0, purchaseInvoices: 0, totalSales: 0, totalPurchases: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [customers, suppliers, products, salesInv, purchaseInv] = await Promise.all([
                window.api.customers.getAll(), window.api.suppliers.getAll(), window.api.products.getAll(),
                window.api.invoices.getAll('sales'), window.api.invoices.getAll('purchase')
            ]);
            const totalSales = (salesInv || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
            const totalPurchases = (purchaseInv || []).reduce((sum, inv) => sum + (inv.total || 0), 0);
            setStats({
                customers: (customers || []).length, suppliers: (suppliers || []).length, products: (products || []).length,
                salesInvoices: (salesInv || []).length, purchaseInvoices: (purchaseInv || []).length, totalSales, totalPurchases
            });
            setRecentInvoices([...(salesInv || []), ...(purchaseInv || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
        } catch (e) { console.error('Dashboard load error:', e); }
        setLoading(false);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' د.ك';

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
                {[
                    { label: 'العملاء', value: stats.customers, icon: Users, color: 'blue' },
                    { label: 'الموردين', value: stats.suppliers, icon: Truck, color: 'purple' },
                    { label: 'المنتجات', value: stats.products, icon: Package, color: 'orange' },
                    { label: 'فواتير المبيعات', value: stats.salesInvoices, icon: ShoppingCart, color: 'green' },
                    { label: 'فواتير المشتريات', value: stats.purchaseInvoices, icon: ShoppingBag, color: 'red' }
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={`stat-icon ${s.color}`} style={{ width: '42px', height: '42px' }}><s.icon size={20} /></div>
                        <div><h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{s.value}</h3><p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.label}</p></div>
                    </div>
                ))}
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div className="summary-card sales"><div className="summary-icon"><TrendingUp size={26} /></div><div className="summary-content"><span className="label">إجمالي المبيعات</span><span className="amount">{formatCurrency(stats.totalSales)}</span></div></div>
                <div className="summary-card purchases"><div className="summary-icon"><TrendingDown size={26} /></div><div className="summary-content"><span className="label">إجمالي المشتريات</span><span className="amount">{formatCurrency(stats.totalPurchases)}</span></div></div>
                <div className="summary-card profit"><div className="summary-icon"><DollarSign size={26} /></div><div className="summary-content"><span className="label">صافي الربح</span><span className="amount">{formatCurrency(stats.totalSales - stats.totalPurchases)}</span></div></div>
            </div>

            {/* Recent Invoices */}
            <div className="card">
                <div className="card-header"><h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> آخر الفواتير</h4></div>
                <div className="card-body" style={{ padding: 0 }}>
                    {recentInvoices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}><FileText size={36} style={{ opacity: 0.5, marginBottom: '8px' }} /><p>لا توجد فواتير</p></div>
                    ) : (
                        <table>
                            <thead><tr><th>رقم الفاتورة</th><th>النوع</th><th>العميل/المورد</th><th>التاريخ</th><th>المبلغ</th></tr></thead>
                            <tbody>
                                {recentInvoices.map(inv => (
                                    <tr key={`${inv.type}-${inv.id}`}>
                                        <td className="font-bold">{inv.invoice_number}</td>
                                        <td><span className={`badge ${inv.type === 'sales' ? 'badge-success' : 'badge-warning'}`}>{inv.type === 'sales' ? 'مبيعات' : 'مشتريات'}</span></td>
                                        <td>{inv.customer_name || inv.supplier_name || '-'}</td>
                                        <td>{new Date(inv.date).toLocaleDateString('ar-KW')}</td>
                                        <td className="font-bold">{formatCurrency(inv.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
