import React from 'react';
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { COLORS, tdStyle } from './shared';

export default function CashFlowReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'cash_flow') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>💸 {t('rep_cash_flow') || 'تقرير حركة التدفقات النقدية والسيولة'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_startingBalance') || 'السيولة أول المدة'}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#6366F1', marginTop: '4px' }}>{fmt(reportData.startingBalance)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t('cb_cash') || 'الصندوق'}: {fmt(reportData.startingCash)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.startingBank)}
                    </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_totalCashInflow') || 'إجمالي المقبوضات (الواردة)'}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#10B981', marginTop: '4px' }}>{fmt(reportData.totalReceipts)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t('cb_cash') || 'الصندوق'}: {fmt(reportData.cashInflow)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.bankInflow)}
                    </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_totalCashOutflow') || 'إجمالي المدفوعات (الصادرة)'}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#EF4444', marginTop: '4px' }}>{fmt(reportData.totalOutflow)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t('cb_cash') || 'الصندوق'}: {fmt(reportData.cashOutflow)} | {t('cb_bank') || 'البنك'}: {fmt(reportData.bankOutflow)}
                    </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('rep_endingBalance') || 'السيولة آخر المدة'}</div>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#F59E0B', marginTop: '4px' }}>{fmt(reportData.endingBalance)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {t('rep_netChangeFlow') || 'صافي التدفق'}: <span style={{ color: reportData.netChange >= 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>{reportData.netChange >= 0 ? '+' : ''}{fmt(reportData.netChange)}</span>
                    </div>
                </div>
            </div>

            {/* Cash Flow Bar Chart */}
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📊 {t('rep_inflowVsOutflow') || 'مقارنة التدفقات النقدية المقبوضة والمصروفة (الصندوق والبنك)'}</h3>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={[
                        { name: t('cb_cash') || 'الصندوق (نقداً)', inflow: reportData.cashInflow, outflow: reportData.cashOutflow },
                        { name: t('cb_bank') || 'البنك (تحويل/شبكة)', inflow: reportData.bankInflow, outflow: reportData.bankOutflow },
                        { name: t('rep_total') || 'الإجمالي الكلي', inflow: reportData.totalReceipts, outflow: reportData.totalOutflow },
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v) => fmt(v)} />
                        <Legend />
                        <Bar dataKey="inflow" name={t('rep_totalCashInflow') || 'المقبوضات (الوارد)'} fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="outflow" name={t('rep_totalCashOutflow') || 'المدفوعات (الصادر)'} fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Breakdowns & Pie Chart of Expenses */}
            <div style={{ display: 'grid', gridTemplateColumns: (reportData.expensesByCategory?.length || 0) > 0 ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Statement table */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                        📊 {t('rep_cashFlowSummaryStatement') || 'بيان ملخص التدفق النقدي والسيولة'}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}><strong>{t('rep_startingBalance') || 'رصيد النقدية والسيولة أول المدة'}</strong></td>
                                <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'left' }}>{fmt(reportData.startingBalance)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: '#F0FDF4' }}>
                                <td style={tdStyle}>➕ {t('rep_cashInflowCustomers') || 'مقبوضات نقدية من المبيعات والعملاء'}</td>
                                <td style={{ ...tdStyle, color: '#10B981', textAlign: 'left' }}>+{fmt(reportData.totalReceipts)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                <td style={tdStyle}>➖ {t('rep_cashOutflowSuppliers') || 'مدفوعات نقدية للمشتريات والموردين'}</td>
                                <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalPayments)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                <td style={tdStyle}>➖ {t('rep_cashOutflowExpenses') || 'مصروفات تشغيلية وإدارية مدفوعة'}</td>
                                <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalExpenses)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: '#FDF2F2' }}>
                                <td style={tdStyle}>➖ {t('rep_cashOutflowSalaries') || 'رواتب وأجور موظفين مدفوعة'}</td>
                                <td style={{ ...tdStyle, color: '#EF4444', textAlign: 'left' }}>-{fmt(reportData.totalSalaries)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border)', fontWeight: 700, background: 'var(--bg-secondary)' }}>
                                <td style={tdStyle}>📊 {t('rep_endingBalance') || 'إجمالي النقدية والسيولة آخر المدة'}</td>
                                <td style={{ ...tdStyle, textAlign: 'left' }}>{fmt(reportData.endingBalance)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Expenses Pie Chart */}
                {reportData.expensesByCategory?.length > 0 && (
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ marginBottom: '12px', alignSelf: 'flex-start', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>🏷️ {t('rep_expenseDistribution') || 'توزيع بنود المصروفات'}</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <RechartsPie>
                                <Pie
                                    data={reportData.expensesByCategory}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {reportData.expensesByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => fmt(v)} />
                            </RechartsPie>
                        </ResponsiveContainer>
                        {/* Legend */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '10px', fontSize: '0.75rem' }}>
                            {reportData.expensesByCategory.map((entry, index) => (
                                <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                                    {entry.name}: {fmt(entry.value)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
