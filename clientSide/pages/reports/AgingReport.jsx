import React from 'react';
import { StatCard, tdStyle, thStyle } from './shared';

export default function AgingReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'aging_report') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>⏳ {t('rep_aging_report') || 'تقرير اعمار الديون والذمم المستحقة'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <StatCard label={t('rep_totalReceivables') || 'إجمالي الذمم المدينة (مستحقات على العملاء)'} val={fmt(reportData.totals?.receivables)} color="#10B981" />
                <StatCard label={t('rep_totalPayables') || 'إجمالي الذمم الدائنة (مستحقات للموردين)'} val={fmt(reportData.totals?.payables)} color="#EF4444" />
            </div>

            {/* Receivables Aging Table */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🟢 {t('rep_customerReceivablesAging') || 'تحليل أعمار ديون العملاء (الذمم المدينة)'}</span>
                    <span style={{ fontSize: '0.85rem', color: '#10B981' }}>{fmt(reportData.totals?.receivables)}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('name') || 'الاسم'}</th>
                            <th style={thStyle}>{t('phone') || 'التلفون'}</th>
                            <th style={thStyle}>1-30 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>31-60 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>61-90 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>90+ {t('day') || 'يوم'}</th>
                            <th style={thStyle}>{t('total') || 'الإجمالي'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.receivables?.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}><strong>{c.name}</strong></td>
                                <td style={tdStyle}>{c.phone || '-'}</td>
                                <td style={tdStyle}>{c.bracket1 > 0 ? fmt(c.bracket1) : '-'}</td>
                                <td style={tdStyle}>{c.bracket2 > 0 ? fmt(c.bracket2) : '-'}</td>
                                <td style={tdStyle}>{c.bracket3 > 0 ? fmt(c.bracket3) : '-'}</td>
                                <td style={tdStyle}>{c.bracket4 > 0 ? fmt(c.bracket4) : '-'}</td>
                                <td style={{ ...tdStyle, fontWeight: 700, color: '#10B981' }}>{fmt(c.total)}</td>
                            </tr>
                        ))}
                        {reportData.receivables?.length === 0 && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('noData') || 'لا توجد ديون عملاء مستحقة'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Payables Aging Table */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🔴 {t('rep_supplierPayablesAging') || 'تحليل أعمار ديون الموردين (الذمم الدائنة)'}</span>
                    <span style={{ fontSize: '0.85rem', color: '#EF4444' }}>{fmt(reportData.totals?.payables)}</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('name') || 'الاسم'}</th>
                            <th style={thStyle}>{t('phone') || 'التلفون'}</th>
                            <th style={thStyle}>1-30 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>31-60 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>61-90 {t('day') || 'يوم'}</th>
                            <th style={thStyle}>90+ {t('day') || 'يوم'}</th>
                            <th style={thStyle}>{t('total') || 'الإجمالي'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.payables?.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}><strong>{s.name}</strong></td>
                                <td style={tdStyle}>{s.phone || '-'}</td>
                                <td style={tdStyle}>{s.bracket1 > 0 ? fmt(s.bracket1) : '-'}</td>
                                <td style={tdStyle}>{s.bracket2 > 0 ? fmt(s.bracket2) : '-'}</td>
                                <td style={tdStyle}>{s.bracket3 > 0 ? fmt(s.bracket3) : '-'}</td>
                                <td style={tdStyle}>{s.bracket4 > 0 ? fmt(s.bracket4) : '-'}</td>
                                <td style={{ ...tdStyle, fontWeight: 700, color: '#DC2626' }}>{fmt(s.total)}</td>
                            </tr>
                        ))}
                        {reportData.payables?.length === 0 && (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{t('noData') || 'لا توجد ذمم دائنة مستحقة'}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
