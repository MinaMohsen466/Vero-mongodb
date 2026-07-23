import React from 'react';

export const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

export const MONTHS_AR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const thStyle = { padding: '10px 14px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' };
export const tdStyle = { padding: '9px 14px', fontSize: '0.85rem', color: 'var(--text-primary)' };

export function StatCard({ label, val, color }) {
    return (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color }}>{val}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

export function InvoiceTable({ invoices, fmt, title, t }) {
    if (!invoices || invoices.length === 0) return null;
    return (
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={thStyle}>{t('inv_number') || 'Invoice #'}</th>
                        <th style={thStyle}>{t('supp_customerSupplier') || 'Customer / Supplier'}</th>
                        <th style={thStyle}>{t('date') || 'Date'}</th>
                        <th style={thStyle}>{t('total') || 'Total'}</th>
                        <th style={thStyle}>{t('status') || 'Status'}</th>
                    </tr>
                </thead>
                <tbody>
                    {invoices.map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--primary)' }}>{inv.invoice_number}</td>
                            <td style={tdStyle}>{inv.customer_name || inv.supplier_name || '-'}</td>
                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{inv.date}</td>
                            <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(inv.total)}</td>
                            <td style={tdStyle}>
                                <span style={{
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                    background: inv.status === 'paid' ? '#D1FAE5' : '#FEF3C7',
                                    color: inv.status === 'paid' ? '#059669' : '#D97706'
                                }}>
                                    {inv.status === 'paid' ? (t('inv_paid') || 'Paid') : (t('cust_creditLabel') || 'Credit')}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
