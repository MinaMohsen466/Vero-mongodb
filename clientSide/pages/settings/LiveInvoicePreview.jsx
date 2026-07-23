import React from 'react';
import { Eye } from 'lucide-react';

const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(37, 99, 235, ${alpha})`;
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function LiveInvoicePreview({ inv, co, logoPreview, t }) {
    const isThermal = inv.paper_size && inv.paper_size.startsWith('thermal');
    const primaryColor = inv.print_color || '#2563eb';
    
    // Logo size mapper
    const logoSizes = { small: 30, medium: 50, large: 70 };
    const logoW = logoSizes[inv.logo_size] || 50;

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            boxShadow: 'var(--shadow)',
            width: '100%',
        }}>
            <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={16} style={{ color: 'var(--primary)' }} />
                {t('live_preview') || 'معاينة مباشرة للفاتورة'}
            </div>
            
            {/* Paper simulation wrapper */}
            <div style={{
                background: '#fff',
                color: '#2d3748',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: isThermal ? '12px 8px' : '20px 16px',
                width: '100%',
                maxWidth: isThermal ? '260px' : '100%',
                aspectRatio: isThermal ? 'auto' : (inv.paper_orientation === 'landscape' ? '1.414 / 1' : '1 / 1.414'),
                minHeight: isThermal ? 'auto' : (inv.paper_orientation === 'landscape' ? '240px' : '450px'),
                margin: '0 auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                fontFamily: 'Cairo, sans-serif',
                fontSize: isThermal ? '10px' : '11px',
                transition: 'all 0.3s ease',
                direction: 'rtl',
                overflow: 'auto'
            }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: isThermal ? 'column' : (inv.logo_position === 'left' ? 'row-reverse' : (inv.logo_position === 'center' ? 'column' : 'row')),
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: `2px solid ${primaryColor}`,
                    paddingBottom: 8,
                    marginBottom: 10,
                    textAlign: (isThermal || inv.logo_position === 'center') ? 'center' : 'right'
                }}>
                    {inv.show_logo === 'yes' && logoPreview && (
                        <div style={{ marginBottom: (isThermal || inv.logo_position === 'center') ? 6 : 0 }}>
                            <img src={logoPreview} alt="Logo" style={{ width: logoW, height: 'auto', objectFit: 'contain' }} />
                        </div>
                    )}
                    
                    {inv.show_company_info === 'yes' && (
                        <div style={{ flex: 1, marginRight: (inv.logo_position === 'right' && !isThermal) ? 10 : 0 }}>
                            <div style={{ fontWeight: 700, fontSize: isThermal ? '11px' : '13px', color: '#1a202c' }}>
                                {co.company_name || t('company_name_placeholder') || 'اسم الشركة'}
                            </div>
                            <div style={{ color: '#718096', fontSize: isThermal ? '8px' : '10px', marginTop: 2 }}>
                                {co.company_phone && <span>هاتف: {co.company_phone} </span>}
                                {co.company_tax_number && <span>| الرقم الضريبي: {co.company_tax_number}</span>}
                            </div>
                            <div style={{ color: '#718096', fontSize: isThermal ? '8px' : '9px' }}>
                                {co.company_address}
                            </div>
                        </div>
                    )}
                </div>

                {/* Welcome Message */}
                {inv.thank_you_message && (
                    <div style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic', marginBottom: 8, fontSize: isThermal ? '8px' : '9px' }}>
                        {inv.thank_you_message}
                    </div>
                )}

                {/* Title */}
                <div style={{ 
                    background: hexToRgba(primaryColor, 0.08), 
                    color: primaryColor,
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontWeight: 700, 
                    textAlign: 'center',
                    fontSize: isThermal ? '11px' : '12px',
                    marginBottom: 10
                }}>
                    {inv.invoice_title_sales || t('sales_invoice') || 'فاتورة مبيعات'}
                </div>

                {/* Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: isThermal ? '1fr' : '1fr 1fr', gap: 4, marginBottom: 10, color: '#4a5568', borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 }}>
                    <div><strong>رقم الفاتورة:</strong> #INV-2026-0001</div>
                    <div><strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-SA')}</div>
                    <div><strong>العميل:</strong> عميل نقدي</div>
                    {!isThermal && <div><strong>طريقة الدفع:</strong> نقداً</div>}
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: isThermal ? '8px' : '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${primaryColor}`, color: '#2d3748', fontWeight: 'bold' }}>
                            <th style={{ textAlign: 'right', padding: '3px 0' }}>الصنف</th>
                            <th style={{ textAlign: 'center', padding: '3px 0' }}>الكمية</th>
                            <th style={{ textAlign: 'center', padding: '3px 0' }}>السعر</th>
                            {inv.show_discount_column === 'yes' && <th style={{ textAlign: 'center', padding: '3px 0' }}>الخصم</th>}
                            {inv.show_tax_column === 'yes' && <th style={{ textAlign: 'center', padding: '3px 0' }}>الضريبة</th>}
                            <th style={{ textAlign: 'left', padding: '3px 0' }}>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '4px 0', fontWeight: 500 }}>منتج افتراضي أ</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>2</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>15.000</td>
                            {inv.show_discount_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0', color: '#ef4444' }}>0.000</td>}
                            {inv.show_tax_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0' }}>0.000</td>}
                            <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>30.000</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '4px 0', fontWeight: 500 }}>منتج افتراضي ب</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>1</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>10.000</td>
                            {inv.show_discount_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0', color: '#ef4444' }}>1.000</td>}
                            {inv.show_tax_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0' }}>0.450</td>}
                            <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>9.450</td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ width: isThermal ? '100%' : '180px', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 6, borderBottom: '1px solid #e2e8f0', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                        <span>المجموع الفرعي:</span>
                        <span>40.000</span>
                    </div>
                    {inv.show_discount_column === 'yes' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                            <span>الخصم:</span>
                            <span>-1.000</span>
                        </div>
                    )}
                    {inv.show_tax_column === 'yes' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                            <span>الضريبة (15%):</span>
                            <span>0.450</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: isThermal ? '9px' : '11px', color: primaryColor, borderTop: '1px dashed #e2e8f0', paddingTop: 3, marginTop: 2 }}>
                        <span>الإجمالي النهائي:</span>
                        <span>39.450 د.ك</span>
                    </div>
                </div>

                {/* Terms and Conditions */}
                {inv.show_notes === 'yes' && inv.invoice_terms && (
                    <div style={{ fontSize: isThermal ? '7px' : '8px', color: '#718096', border: '1px solid #edf2f7', borderRadius: 4, padding: 6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                        <strong>الشروط والأحكام:</strong><br />
                        {inv.invoice_terms}
                    </div>
                )}

                {/* Signature Area */}
                {inv.show_signature === 'yes' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, padding: '0 8px', fontSize: isThermal ? '7px' : '9px', color: '#4a5568' }}>
                        <div>
                            <div>توقيع المستلم:</div>
                            <div style={{ borderBottom: '1px dotted #718096', width: 60, height: 16 }}></div>
                        </div>
                        <div>
                            <div>توقيع البائع:</div>
                            <div style={{ borderBottom: '1px dotted #718096', width: 60, height: 16 }}></div>
                        </div>
                    </div>
                )}

                {/* Footer Bottom */}
                {inv.invoice_footer && (
                    <div style={{ borderTop: '1px solid #edf2f7', paddingTop: 6, marginTop: 10, textAlign: 'center', color: '#a0aec0', fontSize: isThermal ? '7px' : '8px' }}>
                        {inv.invoice_footer}
                    </div>
                )}
            </div>
            
            {/* Meta info badge */}
            <div style={{ marginTop: 10, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6 }}>
                {isThermal ? `طباعة حرارية • عرض تلقائي` : `${inv.paper_size || 'A4'} • ${inv.paper_orientation === 'landscape' ? 'أفقي' : 'عمودي'}`}
            </div>
        </div>
    );
}
