import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tdStyle, thStyle } from './shared';

export default function ProductProfitabilityReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'product_profitability') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📊 {t('rep_product_profitability') || 'تقرير ربحية المنتجات والتصنيفات'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: t('rep_totalRevenue') || 'إجمالي الإيرادات', val: fmt(reportData.totalRevenue), color: '#6366F1', icon: TrendingUp },
                    { label: t('rep_totalCostOfSales') || 'تكلفة المبيعات', val: fmt(reportData.totalCost), color: '#EF4444', icon: TrendingDown },
                    { label: t('rep_grossProfit') || 'مجمل الربح', val: fmt(reportData.totalProfit), color: '#10B981', icon: DollarSign },
                    { label: t('rep_profitMargin') || 'هامش الربح الإجمالي', val: `${(reportData.totalMargin || 0).toFixed(2)}%`, color: '#F59E0B', icon: BarChart3 },
                ].map(s => (
                    <div key={s.label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={20} color={s.color} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Category Profitability Chart */}
            {reportData.categories?.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📊 {t('rep_categoryProfitChart') || 'مقارنة المبيعات والأرباح حسب التصنيف'}</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={reportData.categories}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="category" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Legend />
                            <Bar dataKey="revenue" name={t('rep_totalSales') || 'إجمالي المبيعات'} fill="#6366F1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="grossProfit" name={t('rep_profit') || 'صافي الربح'} fill="#10B981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Category Profitability Table */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                    🏷️ {t('rep_categoryProfitability') || 'ربحية تصنيفات المنتجات'}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                            <th style={thStyle}>{t('rep_totalSales') || 'المبيعات'}</th>
                            <th style={thStyle}>{t('rep_cogs') || 'التكلفة'}</th>
                            <th style={thStyle}>{t('rep_profit') || 'صافي الربح'}</th>
                            <th style={thStyle}>{t('rep_profitMargin') || 'هامش الربح'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.categories?.map(c => (
                            <tr key={c.category} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}><strong>{c.category}</strong></td>
                                <td style={tdStyle}>{fmt(c.revenue)}</td>
                                <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(c.costOfSales)}</td>
                                <td style={{ ...tdStyle, color: '#10B981', fontWeight: 700 }}>{fmt(c.grossProfit)}</td>
                                <td style={{ ...tdStyle, color: '#F59E0B', fontWeight: 700 }}>{(c.margin || 0).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Product Profitability Table */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                    📦 {t('rep_productProfitabilityDetails') || 'ربحية المنتجات الفردية'}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('code') || 'الكود'}</th>
                            <th style={thStyle}>{t('name') || 'المنتج'}</th>
                            <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                            <th style={thStyle}>{t('rep_qtySold') || 'الكمية المباعة'}</th>
                            <th style={thStyle}>{t('rep_salesValue') || 'إيرادات المبيعات'}</th>
                            <th style={thStyle}>{t('rep_cogsValue') || 'تكلفة المبيعات'}</th>
                            <th style={thStyle}>{t('rep_profit') || 'الأرباح'}</th>
                            <th style={thStyle}>{t('rep_profitMargin') || 'الهامش'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.products?.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.code}</td>
                                <td style={tdStyle}><strong>{p.name}</strong></td>
                                <td style={tdStyle}>{p.category || '-'}</td>
                                <td style={tdStyle}>{p.qtySold}</td>
                                <td style={tdStyle}>{fmt(p.revenue)}</td>
                                <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(p.costOfSales)}</td>
                                <td style={{ ...tdStyle, color: '#10B981', fontWeight: 700 }}>{fmt(p.grossProfit)}</td>
                                <td style={{ ...tdStyle, color: '#F59E0B', fontWeight: 700 }}>{(p.margin || 0).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
