import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

function InvoicePrintPreview({ invoice, settings, onClose, type = 'sales' }) {
    const { t } = useAuth();
    const [logoBase64, setLogoBase64] = useState('');

    console.log('[InvoicePrintPreview] Full settings object:', settings);
    console.log('[InvoicePrintPreview] Company object:', settings?.company);
    console.log('[InvoicePrintPreview] Logo value (company_logo):', settings?.company?.company_logo);

    const companyName = settings?.company?.company_name || 'اسم الشركة';
    const companyAddress = settings?.company?.company_address || '';
    const companyPhone = settings?.company?.company_phone || '';
    const companyEmail = settings?.company?.company_email || '';
    const companyTaxNumber = settings?.company?.company_tax_number || '';
    const logoSrc = settings?.company?.company_logo || '';
    const showLogo = settings?.invoice?.show_logo !== 'no';
    const showCompanyInfo = settings?.invoice?.show_company_info !== 'no';
    const invoiceTitle = type === 'sales'
        ? (settings?.invoice?.invoice_title_sales || 'فاتورة مبيعات')
        : (settings?.invoice?.invoice_title_purchase || 'فاتورة مشتريات');
    const invoiceFooter = settings?.invoice?.invoice_footer || '';
    const invoiceTerms = settings?.invoice?.invoice_terms || '';
    const showNotes = settings?.invoice?.show_notes !== 'no';
    const showSignature = settings?.invoice?.show_signature === 'yes';
    const thankYouMsg = settings?.invoice?.thank_you_message || '';
    const currencySymbol = settings?.general?.currency_symbol || 'د.ك';
    const decimalPlaces = parseInt(settings?.general?.decimal_places) || 3;

    useEffect(() => {
        const loadLogo = async () => {
            console.log('[InvoicePrintPreview] Loading logo - logoSrc:', logoSrc);
            if (logoSrc && window.api?.file?.readAsBase64) {
                try {
                    const b64 = await window.api.file.readAsBase64(logoSrc);
                    console.log('[InvoicePrintPreview] Logo loaded - b64 length:', b64?.length);
                    if (b64) setLogoBase64(b64);
                } catch (e) {
                    console.error('[InvoicePrintPreview] Error loading logo:', e);
                }
            } else {
                console.log('[InvoicePrintPreview] No logo source or API not available');
            }
        };
        loadLogo();
    }, [logoSrc]);

    const formatCurrency = (amount) => {
        return Number(amount || 0).toFixed(decimalPlaces) + ' ' + currencySymbol;
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'مدفوعة';
            case 'pending': return 'آجلة';
            case 'partial': return 'مدفوعة جزئياً';
            default: return status;
        }
    };

    const generatePrintHTML = () => {
        const logoHtml = showLogo && (logoBase64 || logoSrc) ? `<img src="${logoBase64 || logoSrc}" alt="Logo" style="max-height:60px;max-width:140px;object-fit:contain" />` : '';

        const companyInfoHtml = showCompanyInfo ? `
            <div style="line-height:1.8">
                <h1 style="margin:0;font-size:20px;color:#000;font-weight:700;letter-spacing:0.5px">${companyName}</h1>
                ${companyAddress ? `<p style="margin:2px 0;font-size:11px;color:#444">${companyAddress}</p>` : ''}
                ${companyPhone ? `<p style="margin:2px 0;font-size:11px;color:#444">هاتف: ${companyPhone}</p>` : ''}
                ${companyEmail ? `<p style="margin:2px 0;font-size:11px;color:#444">${companyEmail}</p>` : ''}
                ${companyTaxNumber ? `<p style="margin:2px 0;font-size:11px;color:#444">الرقم الضريبي: ${companyTaxNumber}</p>` : ''}
            </div>
        ` : '';

        const clientLabel = type === 'sales' ? 'العميل' : 'المورد';
        const clientName = type === 'sales'
            ? (invoice.customer_name || '-')
            : (invoice.supplier_name || '-');

        const itemsHtml = (invoice.items || []).map((item, i) => `
            <tr style="border-bottom:1px solid #ddd">
                <td style="padding:10px 12px;text-align:center;color:#666;font-size:12px">${i + 1}</td>
                <td style="padding:10px 12px;font-weight:500">${item.product_name || item.description || '-'}</td>
                <td style="padding:10px 12px;text-align:center">${item.quantity}</td>
                <td style="padding:10px 12px;text-align:center">${formatCurrency(item.unit_price)}</td>
                <td style="padding:10px 12px;text-align:center;font-weight:600">${formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        const statusLabel = getStatusLabel(invoice.status);

        return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Arial',sans-serif;padding:0;background:white;color:#222;font-size:13px}
.invoice-page{max-width:760px;margin:0 auto;padding:25px}
.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:15px;border-bottom:2px solid #000;margin-bottom:15px}
.invoice-title{text-align:center;font-size:18px;font-weight:700;color:#000;padding:10px 0;margin-bottom:15px;border:2px solid #000;letter-spacing:1px}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px}
.meta-box{padding:12px;border:1px solid #ccc}
.meta-box h4{font-size:11px;color:#666;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #eee;padding-bottom:4px}
.meta-box p{margin:3px 0;font-size:12px;color:#333}
.meta-box .value{font-weight:600;color:#000}
table{width:100%;border-collapse:collapse;margin-bottom:15px;border:1px solid #000}
thead th{background:#f0f0f0;color:#000;padding:10px 12px;font-weight:700;font-size:12px;text-align:right;border:1px solid #000}
tbody td{border:1px solid #ddd;font-size:12px}
.totals-section{display:flex;justify-content:flex-start;margin-bottom:15px}
.totals-table{width:260px;border:1px solid #000}
.totals-table tr td{padding:8px 12px;font-size:12px;border-bottom:1px solid #ddd}
.totals-table tr:last-child{background:#000;color:#fff;font-size:14px;font-weight:700}
.totals-table tr:last-child td{border-bottom:none}
.notes-box{padding:10px 12px;border:1px solid #ccc;margin-bottom:12px;font-size:12px}
.terms-box{padding:10px 12px;border:1px solid #ccc;margin-bottom:15px;font-size:11px;color:#444}
.footer{border-top:1px solid #000;padding-top:12px;text-align:center;color:#666;font-size:11px}
.signature-section{display:flex;justify-content:space-between;margin:25px 0 15px;padding-top:15px}
.signature-box{text-align:center;width:200px}
.signature-line{border-top:1px solid #000;margin-top:40px;padding-top:5px;font-size:11px;color:#444}
@media print{body{padding:0}.invoice-page{padding:10px}@page{margin:8mm}}
</style></head><body>
<div class="invoice-page">
<div class="header">
    <div style="display:flex;align-items:center;gap:12px">
        ${logoHtml}
        ${companyInfoHtml}
    </div>
    <div style="text-align:left">
        <p style="font-size:12px;color:#444;margin:3px 0"><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
        <p style="font-size:12px;color:#444;margin:3px 0"><strong>التاريخ:</strong> ${new Date(invoice.date).toLocaleDateString('ar-KW')}</p>
        ${invoice.due_date ? `<p style="font-size:12px;color:#444;margin:3px 0"><strong>الاستحقاق:</strong> ${new Date(invoice.due_date).toLocaleDateString('ar-KW')}</p>` : ''}
        <p style="font-size:12px;margin:5px 0"><strong>الحالة:</strong> ${statusLabel}</p>
    </div>
</div>

<div class="invoice-title">${invoiceTitle}</div>

<div class="meta-grid">
    <div class="meta-box">
        <h4>${clientLabel}</h4>
        <p class="value">${clientName}</p>
    </div>
    <div class="meta-box">
        <h4>تفاصيل الدفع</h4>
        <p><strong>الحالة:</strong> <span class="value">${statusLabel}</span></p>
        <p><strong>طريقة الدفع:</strong> <span class="value">${invoice.payment_method === 'bank' ? 'تحويل بنكي' : invoice.payment_method === 'cash' ? 'نقداً' : 'آجل'}</span></p>
    </div>
</div>

<table>
    <thead>
        <tr>
            <th style="width:40px;text-align:center">#</th>
            <th>الصنف / الوصف</th>
            <th style="width:70px;text-align:center">الكمية</th>
            <th style="width:100px;text-align:center">سعر الوحدة</th>
            <th style="width:110px;text-align:center">الإجمالي</th>
        </tr>
    </thead>
    <tbody>
        ${itemsHtml}
    </tbody>
</table>

<div class="totals-section">
    <table class="totals-table">
        <tr><td>المجموع الفرعي</td><td style="text-align:left;font-weight:600">${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
        ${invoice.discount > 0 ? `<tr><td>الخصم</td><td style="text-align:left;color:#c00">- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
        ${invoice.tax > 0 ? `<tr><td>الضريبة</td><td style="text-align:left">${formatCurrency(invoice.tax)}</td></tr>` : ''}
        <tr><td>الإجمالي النهائي</td><td style="text-align:left">${formatCurrency(invoice.total)}</td></tr>
    </table>
</div>

${showNotes && invoice.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ''}
${invoiceTerms ? `<div class="terms-box"><strong>الشروط والأحكام:</strong><br/>${invoiceTerms.replace(/\n/g, '<br/>')}</div>` : ''}

${showSignature ? `
<div class="signature-section">
    <div class="signature-box">
        <div class="signature-line">توقيع المستلم</div>
    </div>
    <div class="signature-box">
        <div class="signature-line">توقيع المسؤول</div>
    </div>
</div>` : ''}

<div class="footer">
    ${thankYouMsg ? `<p style="font-size:13px;font-weight:600;margin-bottom:5px">${thankYouMsg}</p>` : ''}
    ${invoiceFooter ? `<p>${invoiceFooter}</p>` : ''}
    <p style="margin-top:8px;font-size:10px;color:#999">${companyName} — ${new Date().getFullYear()}</p>
</div>
</div></body></html>`;
    };

    const handlePrint = async () => {
        const html = generatePrintHTML();
        await window.api.print.invoice(html);
    };

    if (!invoice) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        معاينة الفاتورة — {invoice.invoice_number}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                            طباعة
                        </button>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>
                <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 0, background: '#f5f5f5' }}>
                    <div style={{ maxWidth: '760px', margin: '20px auto', background: 'white', padding: '25px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '15px', borderBottom: '2px solid #000', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {showLogo && (logoBase64 || logoSrc) && (
                                    <img src={logoBase64 || logoSrc} alt="Logo" style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }} />
                                )}
                                {showCompanyInfo && (
                                    <div style={{ lineHeight: 1.8 }}>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{companyName}</h2>
                                        {companyAddress && <p style={{ margin: '2px 0', fontSize: '11px', color: '#444' }}>{companyAddress}</p>}
                                        {companyPhone && <p style={{ margin: '2px 0', fontSize: '11px', color: '#444' }}>هاتف: {companyPhone}</p>}
                                        {companyEmail && <p style={{ margin: '2px 0', fontSize: '11px', color: '#444' }}>{companyEmail}</p>}
                                        {companyTaxNumber && <p style={{ margin: '2px 0', fontSize: '11px', color: '#444' }}>الرقم الضريبي: {companyTaxNumber}</p>}
                                    </div>
                                )}
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <p style={{ fontSize: '12px', color: '#444', margin: '3px 0' }}><strong>رقم الفاتورة:</strong> {invoice.invoice_number}</p>
                                <p style={{ fontSize: '12px', color: '#444', margin: '3px 0' }}><strong>التاريخ:</strong> {new Date(invoice.date).toLocaleDateString('ar-KW')}</p>
                                {invoice.due_date && <p style={{ fontSize: '12px', color: '#444', margin: '3px 0' }}><strong>الاستحقاق:</strong> {new Date(invoice.due_date).toLocaleDateString('ar-KW')}</p>}
                                <p style={{ fontSize: '12px', margin: '5px 0' }}><strong>الحالة:</strong> {getStatusLabel(invoice.status)}</p>
                            </div>
                        </div>

                        {/* Invoice Title */}
                        <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 700, padding: '10px 0', marginBottom: '15px', border: '2px solid #000', letterSpacing: '1px' }}>
                            {invoiceTitle}
                        </div>

                        {/* Client + Payment */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                            <div style={{ padding: '12px', border: '1px solid #ccc' }}>
                                <h4 style={{ fontSize: '11px', color: '#666', marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>{type === 'sales' ? 'العميل' : 'المورد'}</h4>
                                <p style={{ fontWeight: 600 }}>{type === 'sales' ? (invoice.customer_name || '-') : (invoice.supplier_name || '-')}</p>
                            </div>
                            <div style={{ padding: '12px', border: '1px solid #ccc' }}>
                                <h4 style={{ fontSize: '11px', color: '#666', marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>تفاصيل الدفع</h4>
                                <p><strong>الحالة:</strong> {getStatusLabel(invoice.status)}</p>
                                <p><strong>طريقة الدفع:</strong> {invoice.payment_method === 'bank' ? 'تحويل بنكي' : invoice.payment_method === 'cash' ? 'نقداً' : 'آجل'}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', border: '1px solid #000' }}>
                            <thead>
                                <tr>
                                    <th style={{ background: '#f0f0f0', padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', border: '1px solid #000', width: '40px' }}>#</th>
                                    <th style={{ background: '#f0f0f0', padding: '10px', textAlign: 'right', fontWeight: 700, fontSize: '12px', border: '1px solid #000' }}>الصنف / الوصف</th>
                                    <th style={{ background: '#f0f0f0', padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', border: '1px solid #000', width: '70px' }}>الكمية</th>
                                    <th style={{ background: '#f0f0f0', padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', border: '1px solid #000', width: '100px' }}>سعر الوحدة</th>
                                    <th style={{ background: '#f0f0f0', padding: '10px', textAlign: 'center', fontWeight: 700, fontSize: '12px', border: '1px solid #000', width: '110px' }}>الإجمالي</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.items || []).map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', color: '#666', fontSize: '12px' }}>{i + 1}</td>
                                        <td style={{ padding: '10px', fontWeight: 500, borderBottom: '1px solid #ddd' }}>{item.product_name || item.description || '-'}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{formatCurrency(item.unit_price)}</td>
                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #ddd' }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
                            <table style={{ width: '260px', border: '1px solid #000', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #ddd' }}>المجموع الفرعي</td><td style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #ddd' }}>{formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
                                    {invoice.discount > 0 && <tr><td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #ddd' }}>الخصم</td><td style={{ padding: '8px 12px', textAlign: 'left', color: '#c00', borderBottom: '1px solid #ddd' }}>- {formatCurrency(invoice.discount)}</td></tr>}
                                    {invoice.tax > 0 && <tr><td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #ddd' }}>الضريبة</td><td style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{formatCurrency(invoice.tax)}</td></tr>}
                                    <tr style={{ background: '#000', color: '#fff' }}><td style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 700 }}>الإجمالي النهائي</td><td style={{ padding: '8px 12px', textAlign: 'left', fontSize: '14px', fontWeight: 700 }}>{formatCurrency(invoice.total)}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Notes */}
                        {showNotes && invoice.notes && (
                            <div style={{ padding: '10px 12px', border: '1px solid #ccc', marginBottom: '12px', fontSize: '12px' }}>
                                <strong>ملاحظات:</strong> {invoice.notes}
                            </div>
                        )}

                        {/* Terms */}
                        {invoiceTerms && (
                            <div style={{ padding: '10px 12px', border: '1px solid #ccc', marginBottom: '15px', fontSize: '11px', color: '#444' }}>
                                <strong>الشروط والأحكام:</strong><br />
                                {invoiceTerms.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
                            </div>
                        )}

                        {/* Signature */}
                        {showSignature && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '25px 0 15px', paddingTop: '15px' }}>
                                <div style={{ textAlign: 'center', width: '200px' }}>
                                    <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '5px', fontSize: '11px', color: '#444' }}>توقيع المستلم</div>
                                </div>
                                <div style={{ textAlign: 'center', width: '200px' }}>
                                    <div style={{ borderTop: '1px solid #000', marginTop: '40px', paddingTop: '5px', fontSize: '11px', color: '#444' }}>توقيع المسؤول</div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ borderTop: '1px solid #000', paddingTop: '12px', textAlign: 'center', color: '#666', fontSize: '11px' }}>
                            {thankYouMsg && <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#000' }}>{thankYouMsg}</p>}
                            {invoiceFooter && <p>{invoiceFooter}</p>}
                            <p style={{ marginTop: '8px', fontSize: '10px', color: '#999' }}>{companyName} — {new Date().getFullYear()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePrintPreview;
