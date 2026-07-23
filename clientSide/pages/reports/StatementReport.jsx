import React from 'react';
import { StatCard, tdStyle, thStyle } from './shared';

export default function StatementReport({ activeReport, reportData, fmt, t }) {
    if (!reportData || !reportData.statement) return null;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>{activeReport === 'customer_statement' ? (t('rep_customerStatement') || 'Customer Statement') : (t('rep_supplierStatement') || 'Supplier Statement')}: <strong>{reportData.name}</strong></h2>
                    {reportData.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>📞 {reportData.phone}</p>}
                </div>
                <div style={{
                    padding: '10px 20px', borderRadius: '10px',
                    background: reportData.balance > 0 ? '#FEF3C7' : '#D1FAE5',
                    border: `1px solid ${reportData.balance > 0 ? '#F59E0B' : '#10B981'}`
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_finalBalance') || 'Final Balance'}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.2rem', color: reportData.balance > 0 ? '#D97706' : '#059669' }}>
                        {fmt(Math.abs(reportData.balance))}
                        <span style={{ fontSize: '0.75rem', marginRight: '4px' }}>{reportData.balance > 0 ? `(${t('acc_debit') || 'Debit'})` : `(${t('acc_credit') || 'Credit'})`}</span>
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label={t('rep_totalDebit') || 'Total Debit'} val={fmt(reportData.totalDebit)} color="#EF4444" />
                <StatCard label={t('rep_totalCredit') || 'Total Credit'} val={fmt(reportData.totalCredit)} color="#10B981" />
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('date') || 'Date'}</th>
                            <th style={thStyle}>{t('vouch_description') || 'Description'}</th>
                            <th style={thStyle}>{t('acc_debit') || 'Debit'}</th>
                            <th style={thStyle}>{t('acc_credit') || 'Credit'}</th>
                            <th style={thStyle}>{t('balance') || 'Balance'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.statement.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}>{new Date(row.date).toLocaleDateString('en-GB')}</td>
                                <td style={tdStyle}>{row.description}</td>
                                <td style={{ ...tdStyle, color: '#EF4444', fontWeight: row.debit > 0 ? 600 : 400 }}>{row.debit > 0 ? fmt(row.debit) : '-'}</td>
                                <td style={{ ...tdStyle, color: '#10B981', fontWeight: row.credit > 0 ? 600 : 400 }}>{row.credit > 0 ? fmt(row.credit) : '-'}</td>
                                <td style={{ ...tdStyle, fontWeight: 700, color: row.balance >= 0 ? '#D97706' : '#059669' }}>{fmt(Math.abs(row.balance))} {row.balance > 0 ? '🔴' : '🟢'}</td>
                            </tr>
                        ))}
                        {reportData.statement.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>{t('noData') || 'No transactions in this period'}</td></tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                            <td colSpan="2" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                            <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totalDebit)}</td>
                            <td style={{ ...tdStyle, color: '#10B981' }}>{fmt(reportData.totalCredit)}</td>
                            <td style={{ ...tdStyle, color: reportData.balance > 0 ? '#D97706' : '#059669' }}>{fmt(Math.abs(reportData.balance))}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
