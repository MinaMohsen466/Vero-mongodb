import React from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StatCard, tdStyle, thStyle } from './shared';

export default function YearEndClosingReport({ reportData, fmt, isAr, t }) {
    if (!reportData || reportData.type !== 'year_end_closing') return null;

    return (
        <div>
            <div style={{
                background: 'linear-gradient(135deg, #3b82f615, #6366f115)',
                border: '1px solid #6366f130',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <RotateCcw size={24} color="#6366f1" />
                            {isAr ? `تقرير الإقفال السنوي والدورة المالية لسنة ${reportData.year}` : `Year-End Closing Report for Year ${reportData.year}`}
                        </h2>
                        <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {isAr
                                ? `ملخص تصفية حسابات سنة ${reportData.year} وتدوير الأرصدة الافتتاحية للعام الجديد ${reportData.nextYear}`
                                : `Closing summary of year ${reportData.year} and opening balance rollover for year ${reportData.nextYear}`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => toast.success(isAr ? `تمت معاينة وتثبيت الإقفال السنوي لسنة ${reportData.year} بنجاح` : `Year ${reportData.year} closing confirmed successfully`)}
                            className="btn btn-primary"
                            style={{ padding: '10px 18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <RotateCcw size={16} />
                            {isAr ? `تثبيت إقفال سنة ${reportData.year} وتدوير ${reportData.nextYear}` : `Confirm ${reportData.year} Closing`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                <StatCard label={isAr ? 'السنة المالية المغلقة' : 'Closed Fiscal Year'} val={reportData.year} color="#6366f1" />
                <StatCard label={isAr ? 'السنة المالية الجديدة' : 'New Fiscal Year'} val={reportData.nextYear} color="#3b82f6" />
                <StatCard label={isAr ? 'إجمالي المبيعات/الإيرادات' : 'Total Revenue'} val={fmt(reportData.totalRevenue)} color="#10b981" />
                <StatCard label={isAr ? 'إجمالي التكاليف والمصروفات' : 'Total Expenses & COGS'} val={fmt(reportData.totalExpenses)} color="#ef4444" />
                <StatCard label={isAr ? 'صافي أرباح السنة المحولة' : 'Net Profit Transferred'} val={fmt(reportData.netProfit)} color={reportData.netProfit >= 0 ? '#10b981' : '#ef4444'} />
            </div>

            {/* Accounting Rollover Explanation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Income Statement Closure */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⏳</span> {isAr ? '1. إقفال الحسابات المؤقتة (قائمة الدخل)' : '1. Temporary Accounts Closure'}
                    </h3>
                    <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <li><strong>{isAr ? 'المبيعات والمشتريات والمصروفات:' : 'Sales, Purchases, Expenses:'}</strong> {isAr ? `تُصفر تلقائياً مع بداية 1 يناير ${reportData.nextYear}` : `Reset to 0 on Jan 1, ${reportData.nextYear}`}</li>
                        <li><strong>{isAr ? 'صافي الربح/الخسارة:' : 'Net Profit/Loss:'}</strong> {isAr ? `يتم إقفاله ونقله لحساب "الأرباح المرحلة/المدورة" بمبلغ ${fmt(reportData.netProfit)}` : `Transferred to Retained Earnings balance: ${fmt(reportData.netProfit)}`}</li>
                        <li><strong>{isAr ? 'استرجاع البيانات:' : 'Data Retrieval:'}</strong> {isAr ? `تظل جميع فواتير وتفاصيل سنة ${reportData.year} محدوثة ومحفوظة بالكامل في الأرشيف` : `All ${reportData.year} invoices remain preserved in the system archive`}</li>
                    </ul>
                </div>

                {/* Balance Sheet Rollover */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔄</span> {isAr ? '2. تدوير الحسابات الدائمة (الميزانية العمومية)' : '2. Permanent Accounts Rollover'}
                    </h3>
                    <ul style={{ margin: 0, paddingInlineStart: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        <li><strong>{isAr ? 'الصناديق والبنوك والخزينة:' : 'Cash & Banks:'}</strong> {isAr ? `تُنقل أرصدتها الختامية كأرصدة افتتاحية مباشرة لسنة ${reportData.nextYear}` : `Ending balances carried forward to ${reportData.nextYear}`}</li>
                        <li><strong>{isAr ? 'ذمم العملاء والموردين:' : 'Receivables & Payables:'}</strong> {isAr ? `تنتقل جميع مديونيات ودائنيات الأشخاص تلقائياً بدون تغيير` : `Customer & supplier outstanding balances carried forward unchanged`}</li>
                        <li><strong>{isAr ? 'بضاعة آخر المدة:' : 'Ending Inventory:'}</strong> {isAr ? `تصبح هي "بضاعة أول المدة" لعام ${reportData.nextYear}` : `Becomes the opening inventory for year ${reportData.nextYear}`}</li>
                    </ul>
                </div>
            </div>

            {/* Rollover Balances Summary Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Customers Rollover Table */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>👥 {isAr ? `أرصدة العملاء المدورة إلى ${reportData.nextYear}` : `Customer Balances Carried to ${reportData.nextYear}`}</span>
                        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>{reportData.customerBalances?.filter(c => c.balance > 0).length} {isAr ? 'عملاء عليهم ديون' : 'debtors'}</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={thStyle}>{isAr ? 'العميل' : 'Customer'}</th>
                                <th style={thStyle}>{isAr ? 'الهاتف' : 'Phone'}</th>
                                <th style={thStyle}>{isAr ? 'الرصيد المدور' : 'Carried Balance'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.customerBalances?.filter(c => c.balance !== 0).map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}><strong>{c.name}</strong></td>
                                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{c.phone || '-'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: c.balance > 0 ? '#d97706' : '#10b981' }}>
                                        {fmt(Math.abs(c.balance))} {c.balance > 0 ? (isAr ? '(مدين)' : '(Dr)') : (isAr ? '(دائن)' : '(Cr)')}
                                    </td>
                                </tr>
                            ))}
                            {(!reportData.customerBalances || reportData.customerBalances.filter(c => c.balance !== 0).length === 0) && (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{isAr ? 'جميع حسابات العملاء مصفّرة' : 'All customer balances are zero'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Suppliers Rollover Table */}
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🚚 {isAr ? `أرصدة الموردين المدورة إلى ${reportData.nextYear}` : `Supplier Balances Carried to ${reportData.nextYear}`}</span>
                        <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>{reportData.supplierBalances?.filter(s => s.balance > 0).length} {isAr ? 'موردين لهم مستحقات' : 'creditors'}</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <th style={thStyle}>{isAr ? 'المورد' : 'Supplier'}</th>
                                <th style={thStyle}>{isAr ? 'الهاتف' : 'Phone'}</th>
                                <th style={thStyle}>{isAr ? 'الرصيد المدور' : 'Carried Balance'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.supplierBalances?.filter(s => s.balance !== 0).map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={tdStyle}><strong>{s.name}</strong></td>
                                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{s.phone || '-'}</td>
                                    <td style={{ ...tdStyle, fontWeight: 700, color: s.balance > 0 ? '#ef4444' : '#10b981' }}>
                                        {fmt(Math.abs(s.balance))} {s.balance > 0 ? (isAr ? '(دائن)' : '(Cr)') : (isAr ? '(مدين)' : '(Dr)')}
                                    </td>
                                </tr>
                            ))}
                            {(!reportData.supplierBalances || reportData.supplierBalances.filter(s => s.balance !== 0).length === 0) && (
                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>{isAr ? 'جميع حسابات الموردين مصفّرة' : 'All supplier balances are zero'}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
