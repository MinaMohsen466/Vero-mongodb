import React from 'react';
import { StatCard, tdStyle, thStyle } from './shared';

export default function TrialBalanceReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'trial_balance') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px' }}>📋 {t('rep_trialBalance') || 'Trial Balance'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <StatCard label={t('rep_totalDebit') || 'Total Debit'} val={fmt(reportData.totals?.debit)} color="#EF4444" />
                <StatCard label={t('rep_totalCredit') || 'Total Credit'} val={fmt(reportData.totals?.credit)} color="#10B981" />
                <div style={{
                    border: `2px solid ${Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#10B981' : '#EF4444'}`,
                    borderRadius: '12px', padding: '14px', textAlign: 'center',
                    background: Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#D1FAE5' : '#FEE2E2'
                }}>
                    <div style={{ fontWeight: 800, color: Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? '#059669' : '#DC2626' }}>
                        {Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)) < 0.01 ? `✅ ${t('rep_balanced') || 'Balanced'}` : `❌ ${t('rep_unbalanced') || 'Unbalanced'}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('rep_difference') || 'Difference'}: {fmt(Math.abs((reportData.totals?.debit || 0) - (reportData.totals?.credit || 0)))}</div>
                </div>
            </div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('code') || 'Code'}</th>
                            <th style={thStyle}>{t('acc_name') || 'Account Name'}</th>
                            <th style={thStyle}>{t('acc_debit') || 'Debit'}</th>
                            <th style={thStyle}>{t('acc_credit') || 'Credit'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.accounts?.filter(a => a.debit_balance !== 0 || a.credit_balance !== 0).map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{a.code}</td>
                                <td style={tdStyle}>{a.name}</td>
                                <td style={{ ...tdStyle, color: a.debit_balance > 0 ? '#EF4444' : 'var(--text-muted)' }}>{a.debit_balance > 0 ? fmt(a.debit_balance) : '-'}</td>
                                <td style={{ ...tdStyle, color: a.credit_balance > 0 ? '#10B981' : 'var(--text-muted)' }}>{a.credit_balance > 0 ? fmt(a.credit_balance) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                            <td colSpan="2" style={tdStyle}>{t('rep_total') || 'Total'}</td>
                            <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totals?.debit)}</td>
                            <td style={{ ...tdStyle, color: '#10B981' }}>{fmt(reportData.totals?.credit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
