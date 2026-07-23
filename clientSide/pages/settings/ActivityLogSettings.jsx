import React from 'react';
import { FileText, RefreshCw, Eye, Calendar, Clock, Shield, Plus, Edit2, Trash2, Key } from 'lucide-react';
import { Card, inp, btnStyle } from './shared';

export default function ActivityLogSettings({
    activityLogs, activityLogCache, logLoading, moreLoading, logFilters, setLogFilters,
    loadActivityLog, sentinelRef, getModIcon, t
}) {
    const actionColors = { create: '#10b981', update: '#f59e0b', delete: '#ef4444', login: '#3b82f6' };
    const actionIcons = { create: Plus, update: Edit2, delete: Trash2, login: Key };
    const actionLabels = { create: t('log_action_create') || 'إنشاء', update: t('log_action_update') || 'تعديل', delete: t('log_action_delete') || 'حذف', login: t('log_action_login') || 'دخول' };
    const moduleLabels = {
        customers: t('log_module_customers') || 'العملاء',
        suppliers: t('log_module_suppliers') || 'الموردون',
        products: t('log_module_products') || 'المنتجات',
        sales_invoices: t('log_module_sales_invoices') || 'فواتير المبيعات',
        purchase_invoices: t('log_module_purchase_invoices') || 'فواتير المشتريات',
        sales_returns: t('log_module_sales_returns') || 'مرتجع مبيعات',
        purchase_returns: t('log_module_purchase_returns') || 'مرتجع مشتريات',
        vouchers: t('log_module_vouchers') || 'السندات',
        journal_entries: t('log_module_journal_entries') || 'القيود',
        employees: t('log_module_employees') || 'الموظفون',
        salaries: t('log_module_salaries') || 'الرواتب',
        users: t('log_module_users') || 'المستخدمون',
        accounts: t('log_module_accounts') || 'الحسابات',
        coupons: t('log_module_coupons') || 'الكوبونات',
        offers: t('log_module_offers') || 'العروض',
        leaves: t('log_module_leaves') || 'الإجازات',
        deductions: t('log_module_deductions') || 'الاستقطاعات',
        rent: t('log_module_rent') || 'الإيجار',
        expenses: t('log_module_expenses') || 'المصروفات',
        warehouse: t('log_module_warehouse') || 'المخزن',
    };
    const getFriendlyDescription = (log, actionText, moduleText) => {
        if (!log.entity_ref) return '—';
        if (log.action === 'login') {
            return `تسجيل دخول الحساب (${log.entity_ref})`;
        }
        
        let actionWord = '';
        if (log.action === 'create') actionWord = 'إضافة';
        else if (log.action === 'update') actionWord = 'تعديل';
        else if (log.action === 'delete') actionWord = 'حذف';
        else actionWord = actionText;

        let itemWord = moduleText;
        if (log.module === 'products') itemWord = 'المنتج';
        else if (log.module === 'customers') itemWord = 'العميل';
        else if (log.module === 'suppliers') itemWord = 'المورد';
        else if (log.module === 'sales_invoices') itemWord = 'فاتورة المبيعات';
        else if (log.module === 'purchase_invoices') itemWord = 'فاتورة المشتريات';
        else if (log.module === 'sales_returns') itemWord = 'مرتجع المبيعات';
        else if (log.module === 'purchase_returns') itemWord = 'مرتجع المشتريات';
        else if (log.module === 'vouchers') itemWord = 'السند';
        else if (log.module === 'journal_entries') itemWord = 'القيد';
        else if (log.module === 'employees') itemWord = 'الموظف';
        else if (log.module === 'users') itemWord = 'المستخدم';
        else if (log.module === 'accounts') itemWord = 'الحساب';
        else if (log.module === 'coupons') itemWord = 'الكوبون';
        else if (log.module === 'offers') itemWord = 'العرض';
        else if (log.module === 'leaves') itemWord = 'طلب الإجازة';
        else if (log.module === 'deductions') itemWord = 'الاستقطاع';
        else if (log.module === 'expenses') itemWord = 'المصروف';
        else if (log.module === 'warehouse') itemWord = 'حركة المخزن';
        
        return `${actionWord} ${itemWord} (${log.entity_ref})`;
    };
    const allModules = [...new Set(Object.keys(moduleLabels))];

    return (
        <Card title={t('activity_log_title') || 'سجل نشاط المستخدمين'} icon={FileText} action={
            <button
                onClick={() => loadActivityLog(logFilters)}
                style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', padding: '7px 14px', gap: 6 }}
            >
                <RefreshCw size={13} /> {t('log_refresh') || 'تحديث'}
            </button>
        }>
            {/* Filter Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18, background: 'var(--bg-secondary)', padding: 16, borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('user') || 'المستخدم'}</label>
                        <input
                            placeholder={t('log_filter_user') || 'فلترة بالمستخدم...'}
                            value={logFilters.user_name}
                            onChange={e => setLogFilters(f => ({ ...f, user_name: e.target.value }))}
                            style={{ ...inp, margin: 0, padding: '8px 12px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('log_filter_module') || 'الوحدة'}</label>
                        <select
                            value={logFilters.module}
                            onChange={e => setLogFilters(f => ({ ...f, module: e.target.value }))}
                            style={{ ...inp, margin: 0, padding: '8px 12px' }}
                        >
                            <option value="">{t('log_all_modules') || 'جميع الوحدات'}</option>
                            {allModules.map(m => <option key={m} value={m}>{moduleLabels[m]}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('log_filter_action') || 'النوع'}</label>
                        <select
                            value={logFilters.action}
                            onChange={e => setLogFilters(f => ({ ...f, action: e.target.value }))}
                            style={{ ...inp, margin: 0, padding: '8px 12px' }}
                        >
                            <option value="">{t('log_all_actions') || 'جميع الأنواع'}</option>
                            {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('from_date') || 'من تاريخ'}</label>
                        <input type="date" value={logFilters.startDate} onChange={e => setLogFilters(f => ({ ...f, startDate: e.target.value }))} style={{ ...inp, margin: 0, padding: '8px 12px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('to_date') || 'إلى تاريخ'}</label>
                        <input type="date" value={logFilters.endDate} onChange={e => setLogFilters(f => ({ ...f, endDate: e.target.value }))} style={{ ...inp, margin: 0, padding: '8px 12px' }} />
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                    <button
                        onClick={() => loadActivityLog(logFilters)}
                        style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', padding: '7px 16px' }}
                    >
                        <Eye size={14} /> {t('filter') || 'تصفية'}
                    </button>
                    <button
                        onClick={() => {
                            const newF = { module: '', action: '', user_name: '', startDate: '', endDate: '' };
                            setLogFilters(newF);
                            loadActivityLog(newF);
                        }}
                        style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '7px 16px' }}
                    >
                        <RefreshCw size={14} /> {t('reset_filters') || 'إعادة تعيين'}
                    </button>
                </div>
            </div>

            {/* Table */}
            {logLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : activityLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '.875rem' }}>
                    {t('log_no_logs') || 'لا توجد سجلات بعد'}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('date') || 'التاريخ'}</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('user') || 'المستخدم'}</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '15%' }}>{t('log_filter_action') || 'النوع'}</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '15%' }}>{t('log_filter_module') || 'الوحدة'}</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('log_details') || 'تفاصيل العملية'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activityLogs.map((log, i) => {
                                const color = actionColors[log.action] || '#6b7280';
                                const label = actionLabels[log.action] || log.action;
                                const ActionIcon = actionIcons[log.action] || Shield;
                                const modLabel = moduleLabels[log.module] || log.module;
                                const dt = new Date(log.created_at);
                                const dateStr = isNaN(dt) ? log.created_at : dt.toLocaleDateString('ar', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                const timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <tr key={log.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dateStr}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', marginTop: 4 }}>
                                                <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                                <span>{timeStr}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, var(--primary), #3b82f6)`, color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.8rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                                    {(log.user_name || '?')[0].toUpperCase()}
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text-primary)' }}>{log.user_name}</div>
                                                    {log.user_id && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>ID: {log.user_id}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '.75rem',
                                                background: color + '12', color, border: `1px solid ${color}22`, boxShadow: `0 2px 8px ${color}10`
                                            }}>
                                                <ActionIcon size={12} />
                                                {label}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.85rem' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getModIcon(log.module)}
                                                </div>
                                                <span>{modLabel}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.entity_ref}>
                                            <span style={{
                                                fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)'
                                            }}>
                                                {getFriendlyDescription(log, label, modLabel)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {moreLoading && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 16, borderTop: '1px solid var(--border-light)' }}>
                            <div className="spinner" style={{ width: 20, height: 20 }} />
                        </div>
                    )}

                    <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '.8rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{activityLogs.length} {t('records') || 'سجل'}</span>
                        {!activityLogCache.hasMore && activityLogs.length > 0 && (
                            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('log_no_more') || 'تم تحميل جميع السجلات'}</span>
                        )}
                    </div>
                </div>
            )}
            {activityLogs.length > 0 && (
                <div ref={sentinelRef} style={{ height: 10, width: '100%', visibility: 'hidden' }} />
            )}
        </Card>
    );
}
