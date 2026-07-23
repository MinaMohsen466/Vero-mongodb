import React from 'react';
import { TrendingDown, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { InvoiceTable } from './shared';

export default function PurchasesReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'purchases_summary') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px' }}>📦 {t('rep_purchasesReport') || 'Purchases Report'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: t('rep_totalPurchases') || 'Total Purchases', val: fmt(reportData.total), color: '#EF4444', icon: TrendingDown },
                    { label: t('rep_invoiceCount') || 'Invoice Count', val: reportData.count, color: '#8B5CF6', icon: ShoppingBag },
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
            {reportData.chartData?.length > 0 && (
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlyPurchases') || 'Monthly Purchases'}</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Bar dataKey="total" name={t('dash_purchases') || 'Purchases'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <InvoiceTable invoices={reportData.invoices} fmt={fmt} title={t('rep_invoiceDetails') || 'Invoice Details'} t={t} />
        </div>
    );
}
