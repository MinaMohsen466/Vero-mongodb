import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

function InvoicePrintPreview({ invoice, settings, onClose, type = 'sales' }) {
    const { t } = useAuth();
    const [logoBase64, setLogoBase64] = useState('');

    if (!invoice) return null;

    const currencySymbol = settings?.general?.currency_symbol || 'د.ك';
    const companyName = settings?.company?.company_name || 'شركتي';
    const companyAddress = settings?.company?.company_address || '';
    const companyPhone = settings?.company?.company_phone || '';
    const companyEmail = settings?.company?.company_email || '';
    const companyTaxNumber = settings?.company?.company_tax_number || '';
    const companyLogo = settings?.company?.company_logo || '';

    const invoiceTitle = type === 'sales'
        ? (settings?.invoice?.invoice_title_sales || 'فاتورة مبيعات')
        : (settings?.invoice?.invoice_title_purchase || 'فاتورة مشتريات');
    const invoiceFooter = settings?.invoice?.invoice_footer || 'شكراً لتعاملكم معنا';
    const invoiceTerms = settings?.invoice?.invoice_terms || '';
    const showLogo = settings?.invoice?.show_logo !== 'no';
    const showCompanyInfo = settings?.invoice?.show_company_info !== 'no';

    // Load logo as base64 for printing
    useEffect(() => {
        if (companyLogo && window.api?.file?.readAsBase64) {
            window.api.file.readAsBase64(companyLogo).then(base64 => {
                if (base64) setLogoBase64(base64);
            });
        }
    }, [companyLogo]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + currencySymbol;
    };

    const logoSrc = logoBase64 || (companyLogo ? `file:///${companyLogo.replace(/\\/g, '/')}` : '');

    const getStatusLabel = (status) => {
        if (status === 'paid') return 'مدفوعة';
        if (status === 'partial') return 'مدفوعة جزئياً';
        return 'آجلة';
    };

    const getStatusColor = (status) => {
        if (status === 'paid') return '#10b981';
        if (status === 'partial') return '#f59e0b';
        return '#ef4444';
    };

    const generatePrintHTML = () => {
        const logoHtml = showLogo && logoSrc ? `<img src="${logoBase64 || logoSrc}" alt="Logo" style="max-height:70px;max-width:160px;object-fit:contain" />` : '';

        const companyInfoHtml = showCompanyInfo ? `
            <div style="line-height:1.6">
                <h1 style="margin:0;font-size:22px;color:#1a365d;font-weight:700">${companyName}</h1>
                ${companyAddress ? `<p style="margin:2px 0;font-size:11px;color:#64748b">${companyAddress}</p>` : ''}
                ${companyPhone ? `<p style="margin:2px 0;font-size:11px;color:#64748b">هاتف: ${companyPhone}</p>` : ''}
                ${companyEmail ? `<p style="margin:2px 0;font-size:11px;color:#64748b">${companyEmail}</p>` : ''}
                ${companyTaxNumber ? `<p style="margin:2px 0;font-size:11px;color:#64748b">الرقم الضريبي: ${companyTaxNumber}</p>` : ''}
            </div>
        ` : '';

        const itemsHtml = (invoice.items || []).map((item, i) => `
            <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc' : ''}">
                <td style="padding:10px 12px;text-align:center;color:#64748b;font-size:13px">${i + 1}</td>
                <td style="padding:10px 12px;font-weight:500">${item.product_name || item.description || '-'}</td>
                <td style="padding:10px 12px;text-align:center">${item.quantity}</td>
                <td style="padding:10px 12px;text-align:center">${Number(item.unit_price).toFixed(3)} ${currencySymbol}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600;color:#1a365d">${Number(item.total).toFixed(3)} ${currencySymbol}</td>
            </tr>
        `).join('');

        const statusLabel = getStatusLabel(invoice.status);
        const statusColor = getStatusColor(invoice.status);

        return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Arial',sans-serif;padding:0;background:white;color:#334155;font-size:14px}
.invoice-page{max-width:780px;margin:0 auto;padding:30px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;margin-bottom:0}
.divider{height:3px;background:linear-gradient(90deg,#1a365d 0%,#3b82f6 50%,#1a365d 100%);border-radius:2px;margin-bottom:20px}
.invoice-title-bar{display:flex;justify-content:space-between;align-items:center;background:linear-gradient(135deg,#1a365d,#2563eb);color:white;padding:12px 20px;border-radius:8px;margin-bottom:20px}
.invoice-title-bar h2{margin:0;font-size:18px;font-weight:600}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px}
.meta-box{padding:15px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}
.meta-box h4{font-size:12px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px}
.meta-box p{margin:3px 0;font-size:13px;color:#334155}
.meta-box .value{font-weight:600;color:#1a365d}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead th{background:linear-gradient(135deg,#1a365d,#2563eb);color:white;padding:11px 12px;font-weight:600;font-size:13px;text-align:right}
thead th:first-child{border-radius:0 8px 0 0}
thead th:last-child{border-radius:8px 0 0 0}
.totals-section{display:flex;justify-content:flex-start;margin-bottom:20px}
.totals-table{width:280px;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0}
.totals-table tr td{padding:10px 15px;font-size:13px}
.totals-table tr:last-child{background:linear-gradient(135deg,#1a365d,#2563eb);color:white;font-size:16px;font-weight:700}
.notes-box{padding:12px 15px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;margin-bottom:15px;font-size:13px}
.terms-box{padding:12px 15px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:20px;font-size:12px}
.footer{border-top:2px solid #e2e8f0;padding-top:15px;text-align:center;color:#64748b;font-size:13px}
.status-badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;color:white}
@media print{body{padding:0}.invoice-page{padding:15px}@page{margin:10mm}}
</style></head><body>
<div class="invoice-page">
    <div class="header">
        <div style="display:flex;align-items:center;gap:15px">
            ${logoHtml}
            ${companyInfoHtml}
        </div>
        <div style="text-align:left">
            <p style="font-size:13px;color:#64748b;margin:3px 0"><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
            <p style="font-size:13px;color:#64748b;margin:3px 0"><strong>التاريخ:</strong> ${new Date(invoice.date).toLocaleDateString('ar-KW')}</p>
            ${invoice.due_date ? `<p style="font-size:13px;color:#64748b;margin:3px 0"><strong>الاستحقاق:</strong> ${new Date(invoice.due_date).toLocaleDateString('ar-KW')}</p>` : ''}
        </div>
    </div>
    <div class="divider"></div>
    <div class="invoice-title-bar">
        <h2>${invoiceTitle}</h2>
        <span class="status-badge" style="background:${statusColor}">${statusLabel}</span>
    </div>
    <div class="meta-grid">
        <div class="meta-box">
            <h4>${type === 'sales' ? 'بيانات العميل' : 'بيانات المورد'}</h4>
            <p class="value">${type === 'sales' ? (invoice.customer_name || 'عميل نقدي') : (invoice.supplier_name || '-')}</p>
        </div>
        <div class="meta-box">
            <h4>معلومات الدفع</h4>
            <p><strong>الحالة:</strong> <span style="color:${statusColor};font-weight:600">${statusLabel}</span></p>
            ${invoice.payment_method ? `<p><strong>طريقة الدفع:</strong> ${invoice.payment_method === 'cash' ? 'نقداً' : invoice.payment_method === 'bank' ? 'تحويل بنكي' : invoice.payment_method}</p>` : ''}
        </div>
    </div>
    <table>
        <thead><tr>
            <th style="width:40px;text-align:center">#</th>
            <th>الصنف</th>
            <th style="width:80px;text-align:center">الكمية</th>
            <th style="width:110px;text-align:center">السعر</th>
            <th style="width:110px;text-align:center">الإجمالي</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals-section">
        <table class="totals-table">
            ${invoice.subtotal && invoice.subtotal !== invoice.total ? `<tr style="background:#f8fafc"><td>المجموع الفرعي</td><td style="text-align:left">${formatCurrency(invoice.subtotal)}</td></tr>` : ''}
            ${invoice.discount ? `<tr style="background:#fef2f2"><td>الخصم</td><td style="text-align:left;color:#ef4444">- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
            ${invoice.tax ? `<tr style="background:#f0f9ff"><td>الضريبة</td><td style="text-align:left">${formatCurrency(invoice.tax)}</td></tr>` : ''}
            <tr><td>الإجمالي النهائي</td><td style="text-align:left">${formatCurrency(invoice.total)}</td></tr>
        </table>
    </div>
    ${invoice.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ''}
    ${invoiceTerms ? `<div class="terms-box"><strong style="display:block;margin-bottom:5px">الشروط والأحكام:</strong><div style="white-space:pre-wrap;color:#475569">${invoiceTerms}</div></div>` : ''}
    <div class="footer"><p>${invoiceFooter}</p></div>
</div>
</body></html>`;
    };

    const handlePrint = async () => {
        const html = generatePrintHTML();
        await window.api.print.invoice(html);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
            <div style={{ background: 'white', borderRadius: '12px', maxWidth: '820px', width: '95%', maxHeight: '95vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} onClick={(e) => e.stopPropagation()}>
                {/* Header buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#1a365d', fontWeight: 600 }}>{t('inv_preview') || 'معاينة الفاتورة'}</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handlePrint} style={{ padding: '8px 24px', background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit' }}>
                            🖨️ {t('print') || 'طباعة'}
                        </button>
                        <button onClick={onClose} style={{ padding: '8px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>
                            {t('close') || 'إغلاق'}
                        </button>
                    </div>
                </div>

                {/* Invoice Content Preview */}
                <div style={{ padding: '30px', background: 'white' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {showLogo && logoSrc && (
                                <img src={logoSrc} alt="Logo" style={{ maxHeight: '70px', maxWidth: '160px', objectFit: 'contain' }} />
                            )}
                            {showCompanyInfo && (
                                <div style={{ lineHeight: 1.6 }}>
                                    <h1 style={{ fontSize: '22px', margin: '0', fontWeight: 700, color: '#1a365d' }}>{companyName}</h1>
                                    {companyAddress && <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>{companyAddress}</p>}
                                    {companyPhone && <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>هاتف: {companyPhone}</p>}
                                    {companyEmail && <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>{companyEmail}</p>}
                                    {companyTaxNumber && <p style={{ margin: '2px 0', fontSize: '11px', color: '#64748b' }}>الرقم الضريبي: {companyTaxNumber}</p>}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ margin: '3px 0', fontSize: '13px', color: '#64748b' }}><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</p>
                            <p style={{ margin: '3px 0', fontSize: '13px', color: '#64748b' }}><strong>التاريخ:</strong> {new Date(invoice.date).toLocaleDateString('ar-KW')}</p>
                            {invoice.due_date && <p style={{ margin: '3px 0', fontSize: '13px', color: '#64748b' }}><strong>الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-KW')}</p>}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: '3px', background: 'linear-gradient(90deg, #1a365d 0%, #3b82f6 50%, #1a365d 100%)', borderRadius: '2px', margin: '20px 0' }}></div>

                    {/* Title bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '12px 20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{invoiceTitle}</h2>
                        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, color: 'white', background: getStatusColor(invoice.status) }}>{getStatusLabel(invoice.status)}</span>
                    </div>

                    {/* Meta Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>{type === 'sales' ? 'بيانات العميل' : 'بيانات المورد'}</h4>
                            <p style={{ fontWeight: 600, color: '#1a365d', margin: 0 }}>{type === 'sales' ? (invoice.customer_name || 'عميل نقدي') : (invoice.supplier_name || '-')}</p>
                        </div>
                        <div style={{ padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                            <h4 style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>معلومات الدفع</h4>
                            <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>الحالة:</strong> <span style={{ color: getStatusColor(invoice.status), fontWeight: 600 }}>{getStatusLabel(invoice.status)}</span></p>
                            {invoice.payment_method && <p style={{ margin: '3px 0', fontSize: '13px' }}><strong>طريقة الدفع:</strong> {invoice.payment_method === 'cash' ? 'نقداً' : invoice.payment_method === 'bank' ? 'تحويل بنكي' : invoice.payment_method}</p>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                        <thead>
                            <tr>
                                <th style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '11px 12px', fontWeight: 600, fontSize: '13px', textAlign: 'center', width: '40px', borderRadius: '0 8px 0 0' }}>#</th>
                                <th style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '11px 12px', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>الصنف</th>
                                <th style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '11px 12px', fontWeight: 600, fontSize: '13px', textAlign: 'center', width: '80px' }}>الكمية</th>
                                <th style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '11px 12px', fontWeight: 600, fontSize: '13px', textAlign: 'center', width: '110px' }}>السعر</th>
                                <th style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white', padding: '11px 12px', fontWeight: 600, fontSize: '13px', textAlign: 'center', width: '110px', borderRadius: '8px 0 0 0' }}>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.items || []).map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', background: index % 2 === 1 ? '#f8fafc' : 'white' }}>
                                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>{index + 1}</td>
                                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.product_name || item.description || '-'}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{formatCurrency(item.unit_price)}</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#1a365d' }}>{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                            {(!invoice.items || invoice.items.length === 0) && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>لا توجد أصناف</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '20px' }}>
                        <table style={{ width: '280px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', borderCollapse: 'collapse' }}>
                            <tbody>
                                {invoice.subtotal && invoice.subtotal !== invoice.total && (
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td style={{ padding: '10px 15px', fontSize: '13px' }}>المجموع الفرعي</td>
                                        <td style={{ padding: '10px 15px', textAlign: 'left', fontSize: '13px' }}>{formatCurrency(invoice.subtotal)}</td>
                                    </tr>
                                )}
                                {invoice.discount > 0 && (
                                    <tr style={{ background: '#fef2f2' }}>
                                        <td style={{ padding: '10px 15px', fontSize: '13px' }}>الخصم</td>
                                        <td style={{ padding: '10px 15px', textAlign: 'left', fontSize: '13px', color: '#ef4444' }}>- {formatCurrency(invoice.discount)}</td>
                                    </tr>
                                )}
                                {invoice.tax > 0 && (
                                    <tr style={{ background: '#f0f9ff' }}>
                                        <td style={{ padding: '10px 15px', fontSize: '13px' }}>الضريبة</td>
                                        <td style={{ padding: '10px 15px', textAlign: 'left', fontSize: '13px' }}>{formatCurrency(invoice.tax)}</td>
                                    </tr>
                                )}
                                <tr style={{ background: 'linear-gradient(135deg, #1a365d, #2563eb)', color: 'white' }}>
                                    <td style={{ padding: '12px 15px', fontWeight: 700, fontSize: '16px' }}>الإجمالي النهائي</td>
                                    <td style={{ padding: '12px 15px', textAlign: 'left', fontWeight: 700, fontSize: '16px' }}>{formatCurrency(invoice.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div style={{ marginBottom: '15px', padding: '12px 15px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '13px' }}>
                            <strong>ملاحظات:</strong> {invoice.notes}
                        </div>
                    )}

                    {/* Terms */}
                    {invoiceTerms && (
                        <div style={{ marginBottom: '20px', padding: '12px 15px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '12px' }}>
                            <strong style={{ display: 'block', marginBottom: '5px' }}>الشروط والأحكام:</strong>
                            <div style={{ whiteSpace: 'pre-wrap', color: '#475569' }}>{invoiceTerms}</div>
                        </div>
                    )}

                    {/* Footer */}
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        <p>{invoiceFooter}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePrintPreview;
