import React from 'react';
import { StatCard, tdStyle, thStyle } from './shared';

export default function DetailedInventoryReport({ reportData, fmt, t }) {
    if (!reportData || reportData.type !== 'detailed_inventory') return null;

    return (
        <div>
            <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>📦 {t('rep_detailed_inventory') || 'تقرير حركة وحسابات تقييم المخزون والـ COGS'}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <StatCard label={t('rep_totalStockValueCost') || 'إجمالي قيمة المخزون الحالية (بسعر الشراء)'} val={fmt(reportData.totalValue)} color="#0F766E" />
                <StatCard label={t('rep_totalQtyPurchased') || 'إجمالي الكميات المشكورة (الوارد)'} val={reportData.totalQtyPurchased || 0} color="#3B82F6" />
                <StatCard label={t('rep_totalQtySold') || 'إجمالي الكميات المباعة (الصادر)'} val={reportData.totalQtySold || 0} color="#10B981" />
                <StatCard label={t('rep_totalCogs') || 'تكلفة المبيعات الإجمالية (COGS)'} val={fmt(reportData.totalCogs)} color="#EF4444" />
            </div>

            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                    📊 {t('rep_inventoryCogsDetails') || 'تفاصيل حركة وتقييم أصناف المخزون'}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            <th style={thStyle}>{t('code') || 'الكود'}</th>
                            <th style={thStyle}>{t('name') || 'اسم المنتج'}</th>
                            <th style={thStyle}>{t('category') || 'التصنيف'}</th>
                            <th style={thStyle}>{t('rep_currentStock') || 'المخزون الحالي'}</th>
                            <th style={thStyle}>{t('prod_purchasePrice') || 'سعر الشراء'}</th>
                            <th style={thStyle}>{t('rep_stockValueCost') || 'قيمة المخزون'}</th>
                            <th style={thStyle}>{t('rep_qtyPurchased') || 'المشتريات (كمية)'}</th>
                            <th style={thStyle}>{t('rep_qtySold') || 'المبيعات (كمية)'}</th>
                            <th style={thStyle}>{t('rep_cogs') || 'تكلفة المبيعات (COGS)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.products?.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.code}</td>
                                <td style={tdStyle}><strong>{p.name}</strong></td>
                                <td style={tdStyle}>{p.category || '-'}</td>
                                <td style={{ ...tdStyle, fontWeight: 'bold', color: p.stock_quantity <= 0 ? '#EF4444' : p.stock_quantity <= 5 ? '#F59E0B' : 'var(--text-primary)' }}>
                                    {p.stock_quantity}
                                </td>
                                <td style={tdStyle}>{fmt(p.purchase_price)}</td>
                                <td style={{ ...tdStyle, fontWeight: 700, color: '#0F766E' }}>{fmt(p.stockValue)}</td>
                                <td style={{ ...tdStyle, color: '#3B82F6' }}>{p.qtyPurchased}</td>
                                <td style={{ ...tdStyle, color: '#10B981' }}>{p.qtySold}</td>
                                <td style={{ ...tdStyle, fontWeight: 700, color: '#EF4444' }}>{fmt(p.cogs)}</td>
                            </tr>
                        ))}
                        {(!reportData.products || reportData.products.length === 0) && (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>{t('noData') || 'لا توجد بيانات مخزون'}</td></tr>
                        )}
                    </tbody>
                    {reportData.products?.length > 0 && (
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan="5" style={tdStyle}>{t('rep_total') || 'الإجمالي'}:</td>
                                <td style={{ ...tdStyle, color: '#0F766E' }}>{fmt(reportData.totalValue)}</td>
                                <td style={{ ...tdStyle, color: '#3B82F6' }}>{reportData.totalQtyPurchased}</td>
                                <td style={{ ...tdStyle, color: '#10B981' }}>{reportData.totalQtySold}</td>
                                <td style={{ ...tdStyle, color: '#EF4444' }}>{fmt(reportData.totalCogs)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
}
