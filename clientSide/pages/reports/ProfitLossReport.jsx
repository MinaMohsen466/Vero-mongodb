import React from 'react';
import { Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SearchableSelect from '../../components/SearchableSelect';
import { tdStyle, thStyle } from './shared';

export default function ProfitLossReport({
    reportData, fmt, categories,
    plSearchQuery, setPlSearchQuery,
    plCategoryFilter, setPlCategoryFilter,
    plStockFilter, setPlStockFilter,
    t
}) {
    if (!reportData || reportData.type !== 'profit_loss') return null;

    const filteredPlProducts = (reportData.products || []).filter(p => {
        const matchesSearch = !plSearchQuery || 
            p.name.toLowerCase().includes(plSearchQuery.toLowerCase()) || 
            p.code?.toLowerCase().includes(plSearchQuery.toLowerCase());
        const matchesCategory = !plCategoryFilter || p.category === plCategoryFilter;
        const matchesStock = plStockFilter === 'all' ? true :
                             plStockFilter === 'low' ? (p.stock_quantity > 0 && p.stock_quantity <= 5) :
                             plStockFilter === 'out' ? (p.stock_quantity <= 0) :
                             plStockFilter === 'safe' ? (p.stock_quantity > 5) : true;
        return matchesSearch && matchesCategory && matchesStock;
    });
    const filteredEndingInventory = filteredPlProducts.reduce((sum, p) => sum + ((parseFloat(p.stock_quantity) || 0) * (parseFloat(p.purchase_price) || 0)), 0);

    return (
        <div>
            <h2 style={{ marginBottom: '16px' }}>💰 {t('rep_profitLoss') || 'Profit & Loss Report'}</h2>
            {/* Net Profit/Loss highlight */}
            <div style={{
                background: reportData.profit >= 0 ? '#D1FAE5' : '#FEE2E2',
                border: `2px solid ${reportData.profit >= 0 ? '#10B981' : '#EF4444'}`,
                borderRadius: '12px', padding: '20px', textAlign: 'center', marginBottom: '24px'
            }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: reportData.profit >= 0 ? '#059669' : '#DC2626' }}>
                    {fmt(Math.abs(reportData.profit))}
                </div>
                <div style={{ fontSize: '0.9rem', color: reportData.profit >= 0 ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                    {reportData.profit >= 0 ? `✅ ${t('rep_netProfit') || 'Net Profit'}` : `❌ ${t('rep_netLoss') || 'Net Loss'}`}
                </div>
            </div>
            {reportData.chartData?.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlyComparison') || 'Monthly Comparison'}</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Legend />
                            <Bar dataKey="sales" name={t('dash_sales') || 'Sales'} fill="#6366F1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="purchases" name={t('dash_purchases') || 'Purchases'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" name={t('rep_profit') || 'Profit'} fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {/* Trading Account - Two-sided equation table */}
            <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', textAlign: 'center', fontSize: '0.95rem' }}>
                    📊 {t('rep_pl_tradingAccount') || 'Trading Account & Profit/Loss'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '200px' }}>
                    {/* Right Side - Costs (الطرف المدين) */}
                    <div style={{ borderLeft: '2px solid var(--border)' }}>
                        <div style={{ padding: '10px 14px', background: '#FEF2F2', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#DC2626', textAlign: 'center', fontSize: '0.85rem' }}>
                            {t('rep_pl_debitSide') || 'Debit Side (Expenses)'}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalPurchases') || 'Total Purchases'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#EF4444', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalPurchases)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_beginningInventory') || 'Beginning Inventory'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#F59E0B', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.beginningInventory)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalExpenses') || 'Total Expenses'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#8B5CF6', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalExpenses)}</td>
                                </tr>
                                {reportData.profit > 0 && (
                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#F0FDF4' }}>
                                        <td style={{ ...tdStyle, paddingRight: '20px', fontWeight: 700, color: '#059669' }}>✅ {t('rep_netProfit') || 'Net Profit'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#059669', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.profit)}</td>
                                    </tr>
                                )}
                                <tr style={{ background: '#FEF2F2', fontWeight: 700, borderTop: '2px solid #EF4444' }}>
                                    <td style={{ ...tdStyle, color: '#DC2626' }}>{t('rep_pl_debitTotal') || 'Total'}</td>
                                    <td style={{ ...tdStyle, color: '#DC2626', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '1rem' }}>{fmt(reportData.totalPurchases + reportData.beginningInventory + reportData.totalExpenses + Math.max(0, reportData.profit))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    {/* Left Side - Revenue (الطرف الدائن) */}
                    <div>
                        <div style={{ padding: '10px 14px', background: '#F0FDF4', borderBottom: '1px solid var(--border)', fontWeight: 700, color: '#059669', textAlign: 'center', fontSize: '0.85rem' }}>
                            {t('rep_pl_creditSide') || 'Credit Side (Revenues)'}
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_totalSales') || 'Total Sales'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#6366F1', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.totalSales)}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...tdStyle, paddingRight: '20px' }}>{t('rep_endingInventory') || 'Ending Inventory'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: '#0F766E', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(reportData.endingInventory)}</td>
                                </tr>
                                {reportData.profit < 0 && (
                                    <tr style={{ borderBottom: '1px solid var(--border)', background: '#FEF2F2' }}>
                                        <td style={{ ...tdStyle, paddingRight: '20px', fontWeight: 700, color: '#DC2626' }}>❌ {t('rep_netLoss') || 'Net Loss'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 700, color: '#DC2626', textAlign: 'left', whiteSpace: 'nowrap' }}>{fmt(Math.abs(reportData.profit))}</td>
                                    </tr>
                                )}
                                <tr style={{ background: '#F0FDF4', fontWeight: 700, borderTop: '2px solid #10B981' }}>
                                    <td style={{ ...tdStyle, color: '#059669' }}>{t('rep_pl_creditTotal') || 'Total'}</td>
                                    <td style={{ ...tdStyle, color: '#059669', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '1rem' }}>{fmt(reportData.totalSales + reportData.endingInventory + Math.max(0, -reportData.profit))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Equation display */}
                <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>{t('rep_pl_equation') || 'Equation'}:</strong>{' '}
                    <span style={{ color: '#6366F1' }}>{t('rep_totalSales') || 'Total Sales'}</span> + {' '}
                    <span style={{ color: '#0F766E' }}>{t('rep_endingInventory') || 'Ending Inventory'}</span> = {' '}
                    <span style={{ color: '#EF4444' }}>{t('rep_totalPurchases') || 'Total Purchases'}</span> + {' '}
                    <span style={{ color: '#F59E0B' }}>{t('rep_beginningInventory') || 'Beginning Inventory'}</span> + {' '}
                    <span style={{ color: '#8B5CF6' }}>{t('rep_totalExpenses') || 'Total Expenses'}</span>
                    {reportData.profit >= 0 ? 
                        <span style={{ color: '#059669' }}> + {t('rep_netProfit') || 'Net Profit'}</span> :
                        <span style={{ color: '#DC2626' }}> - {t('rep_netLoss') || 'Net Loss'}</span>
                    }
                </div>
            </div>

            {/* Cash & Liquidity Position */}
            <div style={{ marginTop: '24px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🏦 {t('rep_cashBankPosition') || 'Cash & Liquidity Position (Cash & Banks)'}</span>
                    <span style={{ fontSize: '1.1rem', color: reportData.cashBankBalance >= 0 ? '#0D9488' : '#DC2626', fontWeight: 'bold' }}>
                        {fmt(reportData.cashBankBalance)}
                    </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={tdStyle}>{t('cb_cash') || 'Cash'}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: reportData.cashBalance >= 0 ? 'var(--text-main)' : '#DC2626' }}>{fmt(reportData.cashBalance)}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>{t('cb_bank') || 'Bank'}</td>
                            <td style={{ ...tdStyle, fontWeight: 600, color: reportData.bankBalance >= 0 ? 'var(--text-main)' : '#DC2626' }}>{fmt(reportData.bankBalance)}</td>
                        </tr>
                        <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '1px solid var(--border)' }}>
                            <td style={tdStyle}>{t('rep_cashBankBalance') || 'Total Available Cash'}</td>
                            <td style={{ ...tdStyle, color: reportData.cashBankBalance >= 0 ? '#0D9488' : '#DC2626' }}>{fmt(reportData.cashBankBalance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Product Stock Table */}
            {reportData.products?.length > 0 && (
                <div style={{ marginTop: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>📊 {t('rep_inventoryReport') || 'تقرير المخزون'}</h3>
                            <span style={{ fontSize: '0.8rem', color: filteredPlProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length ? '#D97706' : 'var(--text-muted)', fontWeight: 600 }}>
                                {t('rep_lowStock') || 'Low Stock'}: {filteredPlProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 5).length}
                            </span>
                        </div>
                        
                        {/* Filter Controls Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Search Input */}
                            <div style={{ position: 'relative', width: '200px' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('search') || 'بحث...'}
                                    value={plSearchQuery}
                                    onChange={e => setPlSearchQuery(e.target.value)}
                                    style={{ paddingRight: '36px', height: '38px', width: '100%', margin: 0 }}
                                />
                                <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>

                            {/* Category Selector */}
                            {categories.length > 0 && (
                                <div style={{ width: '160px' }}>
                                    <SearchableSelect
                                        options={categories.map(c => ({ value: c, label: c }))}
                                        value={plCategoryFilter}
                                        onChange={setPlCategoryFilter}
                                        placeholder={t('all') || 'جميع الفئات'}
                                        emptyLabel={t('all') || 'جميع الفئات'}
                                    />
                                </div>
                            )}

                            {/* Stock Status Selector */}
                            <select
                                className="form-select"
                                value={plStockFilter}
                                onChange={e => setPlStockFilter(e.target.value)}
                                style={{ width: '150px', height: '38px', margin: 0 }}
                            >
                                <option value="all">{t('all') || 'كل المنتجات'}</option>
                                <option value="low">{t('rep_lowStock') || 'نواقص المخزون (<= 5)'}</option>
                                <option value="out">{t('rep_outOfStock') || 'غير متوفر (<= 0)'}</option>
                                <option value="safe">{t('in_stock') || 'المتوفر (> 5)'}</option>
                            </select>

                            {/* Reset Button */}
                            {(plSearchQuery || plCategoryFilter || plStockFilter !== 'all') && (
                                <button 
                                    className="btn btn-ghost btn-sm" 
                                    onClick={() => { setPlSearchQuery(''); setPlCategoryFilter(''); setPlStockFilter('all'); }} 
                                    style={{ color: 'var(--text-muted)', height: '38px', padding: '0 8px' }}
                                >
                                    ✕ {t('clear') || 'مسح'}
                                </button>
                            )}
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={thStyle}>#</th>
                                <th style={thStyle}>{t('name') || 'Item Name'}</th>
                                <th style={thStyle}>{t('code') || 'Code'}</th>
                                <th style={thStyle}>{t('category') || 'Category'}</th>
                                <th style={thStyle}>{t('prod_quantity') || 'Stock Qty'}</th>
                                <th style={thStyle}>{t('prod_purchasePrice') || 'Purchase Price'}</th>
                                <th style={thStyle}>{t('prod_salePrice') || 'Sale Price'}</th>
                                <th style={thStyle}>{t('rep_stockValue') || 'Total Stock Value'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlProducts.map((p, index) => {
                                const qty = parseFloat(p.stock_quantity) || 0;
                                const cost = parseFloat(p.purchase_price) || 0;
                                const stockVal = qty * cost;
                                return (
                                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem' }}>{index + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{p.name}</td>
                                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.code || '-'}</td>
                                        <td style={tdStyle}>{p.category || '-'}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: qty <= 0 ? '#EF4444' : qty <= 5 ? '#F59E0B' : 'var(--text-primary)' }}>
                                            {qty} {qty <= 0 ? '❌' : qty <= 5 ? '⚠️' : ''}
                                        </td>
                                        <td style={tdStyle}>{fmt(cost)}</td>
                                        <td style={tdStyle}>{fmt(p.sale_price)}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#0F766E' }}>{fmt(stockVal)}</td>
                                    </tr>
                                );
                            })}
                            {filteredPlProducts.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                        {t('noData') || 'لا توجد منتجات تطابق الفلترة الحالية'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {filteredPlProducts.length > 0 && (
                            <tfoot>
                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                                    <td colSpan="4" style={tdStyle}>{t('rep_totalFiltered') || 'إجمالي الفلترة الحالية'} ({filteredPlProducts.length} صنف):</td>
                                    <td style={{ ...tdStyle, color: '#6366F1' }}>{filteredPlProducts.reduce((sum, p) => sum + (parseFloat(p.stock_quantity) || 0), 0)}</td>
                                    <td colSpan="2" style={tdStyle}></td>
                                    <td style={{ ...tdStyle, color: '#0F766E', fontSize: '0.95rem' }}>{fmt(filteredEndingInventory)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}
