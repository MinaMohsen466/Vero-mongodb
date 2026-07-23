import React from 'react';
import { TrendingUp, DollarSign, Calendar, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { InvoiceTable } from './shared';

export default function SalesReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'sales_summary') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📊 {t('rep_salesReport') || 'Sales Report'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: t('rep_totalSales') || 'Total Sales', val: fmt(reportData.totalSales), color: '#6366F1', icon: TrendingUp },
                    { label: t('rep_collectedSales') || 'Collected Sales', val: fmt(reportData.totalPaid), color: '#10B981', icon: DollarSign },
                    { label: t('rep_receivables') || 'Receivables', val: fmt(reportData.totalPending), color: '#F59E0B', icon: Calendar },
                    { label: t('rep_invoiceCount') || 'Invoice Count', val: reportData.count, color: '#3B82F6', icon: FileText },
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
                    <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('rep_monthlySales') || 'Monthly Sales'}</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={reportData.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis fontSize={11} />
                            <Tooltip formatter={(v) => fmt(v)} />
                            <Legend />
                            <Bar dataKey="paid" name={t('inv_paid') || 'Paid'} fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pending" name={t('cust_creditLabel') || 'Credit'} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <InvoiceTable invoices={reportData.invoices} fmt={fmt} title={t('rep_invoiceDetails') || 'Invoice Details'} t={t} />
        </div>
    );
}
