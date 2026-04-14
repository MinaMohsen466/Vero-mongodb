import React, { useState, useEffect } from 'react';
import { useAuth, isColorUnit } from '../App';

// ── 4 Professional Invoice Templates ─────────────────────────────────────────
// Template 1: Modern (colored header band + clean)
// Template 2: Classic (black & white, traditional)
// Template 3: Professional (diagonal accent, premium)
// Template 4: Minimal (compact, no borders)

function InvoicePrintPreview({ invoice, settings, onClose, type = 'sales' }) {
    const { t } = useAuth();
    const [logoBase64, setLogoBase64] = useState('');

    const companyName = settings?.company?.company_name || t('companyName') || 'Company Name';
    const companyAddress = settings?.company?.company_address || '';
    const companyPhone = settings?.company?.company_phone || '';
    const companyEmail = settings?.company?.company_email || '';
    const companyTaxNumber = settings?.company?.company_tax_number || '';
    const logoSrc = settings?.company?.company_logo || '';
    const showLogo = settings?.invoice?.show_logo !== 'no';
    const showCompanyInfo = settings?.invoice?.show_company_info !== 'no';
    const invoiceTitle = type === 'sales'
        ? (settings?.invoice?.invoice_title_sales || t('sales_invoice') || 'Sales Invoice')
        : (settings?.invoice?.invoice_title_purchase || t('purchase_invoice') || 'Purchase Invoice');
    const invoiceFooter = settings?.invoice?.invoice_footer || '';
    const invoiceTerms = settings?.invoice?.invoice_terms || '';
    const thankYouMsg = settings?.invoice?.thank_you_message || '';
    const showNotes = settings?.invoice?.show_notes !== 'no';
    const showSignature = settings?.invoice?.show_signature === 'yes';
    const currencySymbol = settings?.general?.currency_symbol || t('currency_kd') || 'KD';
    const decimalPlaces = parseInt(settings?.general?.decimal_places) || 3;
    const printColor = settings?.invoice?.print_color || '#2563eb';
    const logoPosition = settings?.invoice?.logo_position || 'center';
    const logoSize = settings?.invoice?.logo_size || 'medium';
    const paperSize = settings?.invoice?.paper_size || 'A4';
    const paperOrientation = settings?.invoice?.paper_orientation || 'portrait';
    const showColorField = settings?.general?.enable_product_color === 'yes';
    const template = settings?.invoice?.invoice_template || 'modern';
    const logoMaxH = logoSize === 'small' ? '50px' : logoSize === 'large' ? '110px' : '75px';
    const isThermo = paperSize === 'thermal_80' || paperSize === 'thermal_58';
    const thermoWidth = paperSize === 'thermal_58' ? '58mm' : '80mm';

    useEffect(() => {
        if (logoSrc && window.api?.file?.readAsBase64) {
            window.api.file.readAsBase64(logoSrc).then(b64 => { if (b64) setLogoBase64(b64); }).catch(() => { });
        }
    }, [logoSrc]);

    const formatCurrency = (amount) => Number(amount || 0).toFixed(decimalPlaces) + ' ' + currencySymbol;
    const getStatusLabel = (status) => {
        const m = { paid: t('paid') || 'Paid', pending: t('pending') || 'Pending', partial: t('partial') || 'Partial', draft: t('draft') || 'Draft' };
        return m[status] || status;
    };
    const getPayLabel = (m) => m === 'bank' ? (t('bank_transfer') || 'Bank Transfer') : m === 'cash' ? (t('cash') || 'Cash') : (t('credit') || 'Credit');

    const logoImg = (h, maxW = '160px') => showLogo && (logoBase64 || logoSrc)
        ? `<img src="${logoBase64 || logoSrc}" alt="Logo" style="max-height:${h};max-width:${maxW};object-fit:contain"/>`
        : '';

    const compInfoHtml = (size = 11) => showCompanyInfo ? `
        <div>
          <strong style="font-size:${size + 5}px;display:block;margin-bottom:4px">${companyName}</strong>
          ${companyAddress ? `<span style="font-size:${size}px;color:#555;display:block">${companyAddress}</span>` : ''}
          ${companyPhone ? `<span style="font-size:${size}px;color:#555;display:block">${t('phone_label') || 'Phone:'} ${companyPhone}</span>` : ''}
          ${companyEmail ? `<span style="font-size:${size}px;color:#555;display:block">${companyEmail}</span>` : ''}
          ${companyTaxNumber ? `<span style="font-size:${size}px;color:#555;display:block">${t('tax_number_label') || 'Tax Number:'} ${companyTaxNumber}</span>` : ''}
        </div>` : '';

    const headerRow = () => {
        const logo = logoImg(logoMaxH);
        const info = compInfoHtml();
        if (logoPosition === 'right') return `<div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%"><div style="flex:1">${info}</div><div>${logo}</div></div>`;
        if (logoPosition === 'left') return `<div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%"><div>${logo}</div><div style="flex:1;text-align:right">${info}</div></div>`;
        return `<div style="display:flex;justify-content:space-between;align-items:center;width:100%"><div style="flex:1;text-align:right">${info}</div><div style="padding:0 20px">${logo}</div><div style="flex:1"></div></div>`;
    };

    const clientName = type === 'sales' ? (invoice.customer_name || '-') : (invoice.supplier_name || '-');
    const clientLabel = type === 'sales' ? (t('customer') || 'Customer') : (t('supplier') || 'Supplier');
    const pageSize = isThermo ? thermoWidth : (paperSize === 'A5' ? 'A5' : 'A4');
    const pageMargin = isThermo ? '5mm' : '10mm';
    const pageOrient = !isThermo && paperOrientation === 'landscape' ? ' landscape' : '';
    const font = "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');";

    const itemsRows = (items, tdStyle = '') => (items || []).map((item, i) => {
        const shouldShowColor = settings?.general?.enable_product_color === 'yes' && isColorUnit(item.unit) && item.color;
        return `
        <tr>
          <td style="text-align:center;color:#888;padding:10px ${tdStyle};border-bottom:1px solid #f0f0f0;font-size:12px">${i + 1}</td>
          <td style="padding:10px ${tdStyle};border-bottom:1px solid #f0f0f0;font-size:12px">${item.product_name || item.description || '-'}${shouldShowColor ? ` <span style="color:#666;font-size:0.9em">(${t('color') || 'Color'}: ${item.color})</span>` : ''}</td>
          <td style="text-align:center;padding:10px ${tdStyle};border-bottom:1px solid #f0f0f0;font-size:12px">${item.quantity}</td>
          <td style="text-align:center;padding:10px ${tdStyle};border-bottom:1px solid #f0f0f0;font-size:12px">${formatCurrency(item.unit_price)}</td>
          <td style="text-align:center;font-weight:700;padding:10px ${tdStyle};border-bottom:1px solid #f0f0f0;font-size:12px">${formatCurrency(item.total)}</td>
        </tr>`;
    }).join('');

    const totalsHtml = (bgColor = '#000', textColor = '#fff') => `
        <tr><td>${t('subtotal') || 'Subtotal'}</td><td style="text-align:left;font-weight:600">${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
        ${invoice.discount > 0 ? `<tr><td>${t('discount') || 'Discount'}</td><td style="text-align:left;color:#c00">- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
        ${invoice.tax > 0 ? `<tr><td>${t('tax') || 'Tax'}</td><td style="text-align:left">${formatCurrency(invoice.tax)}</td></tr>` : ''}
        <tr style="background:${bgColor};color:${textColor};font-weight:700;font-size:14px"><td>${t('final_total') || 'Total'}</td><td style="text-align:left">${formatCurrency(invoice.total)}</td></tr>`;

    const notesBlock = (borderColor = '#ccc') => showNotes && invoice.notes
        ? `<div style="padding:10px 12px;border:1px solid ${borderColor};border-right:3px solid ${printColor};margin-bottom:12px;font-size:12px"><strong>${t('notes_label') || 'Notes:'}</strong> ${invoice.notes}</div>` : '';

    const termsBlock = () => invoiceTerms
        ? `<div style="padding:10px;background:#f8f8f8;border:1px solid #ddd;margin-bottom:12px;font-size:11px;color:#444"><strong>${t('terms_label') || 'Terms & Conditions:'}</strong><br>${invoiceTerms.replace(/\n/g, '<br>')}</div>` : '';

    const sigBlock = () => showSignature
        ? `<div style="display:flex;justify-content:space-between;margin:30px 0 15px;padding-top:15px">
            <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;margin-top:40px;padding-top:5px;font-size:11px;color:#444">${t('receiver_signature') || 'Receiver Signature'}</div></div>
            <div style="text-align:center;width:200px"><div style="border-top:1px solid #333;margin-top:40px;padding-top:5px;font-size:11px;color:#444">${t('manager_signature') || 'Manager Signature'}</div></div>
           </div>` : '';

    const footerBlock = (borderColor) => `
        <div style="border-top:2px solid ${borderColor};padding-top:10px;text-align:center;color:#666;font-size:11px;margin-top:10px">
          ${thankYouMsg ? `<p style="font-weight:600;font-size:13px;color:${printColor};margin-bottom:4px">${thankYouMsg}</p>` : ''}
          ${invoiceFooter ? `<p>${invoiceFooter}</p>` : ''}
          <p style="margin-top:6px;font-size:10px;color:#aaa">${companyName} — ${new Date().getFullYear()}</p>
        </div>`;

    const wrap = (body, extraCss = '') => `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
${font}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Arial',sans-serif;background:white;color:#222;font-size:${isThermo ? '11px' : '13px'}}
.page{max-width:${isThermo ? thermoWidth : '760px'};margin:0 auto;padding:${isThermo ? '10px' : '28px'}}
@media print{body{padding:0}.page{padding:${isThermo ? '5px' : '10px'}}@page{margin:${pageMargin};size:${pageSize}${pageOrient}}}
${extraCss}
</style></head><body><div class="page">${body}</div></body></html>`;

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE 1: MODERN (colored full-width header band)
    // ─────────────────────────────────────────────────────────────────────────
    const templateModern = () => {
        const css = `
.band{background:${printColor};color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center;margin:-28px -28px 20px -28px;${isThermo ? 'margin:-10px -10px 14px' : ''}border-radius:4px 4px 0 0;gap:16px}
.band-right{flex:1;text-align:right}
.band-title{font-size:24px;font-weight:800;letter-spacing:1px;margin-bottom:6px}
.band-num{font-size:13px;opacity:.9;font-weight:600}
.band-center{text-align:center;flex-shrink:0}
.band-logo{max-height:${logoMaxH};max-width:120px}
.band-left{flex:1;text-align:left;font-size:12px;line-height:1.6;opacity:.95}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px}
.meta-box{padding:12px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#fafbfc}
.meta-box .lbl{font-size:9px;color:#6b7280;font-weight:800;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px;display:block}
.meta-box .val{font-weight:800;font-size:15px;color:#1f2937}
.meta-box .sub{font-size:12px;color:#4b5563;margin-top:4px;line-height:1.4}
table.items{width:100%;border-collapse:collapse;margin-bottom:18px;background:#fff}
.items thead tr{background:${printColor};color:#fff}
.items thead th{padding:12px 14px;font-size:11px;font-weight:800;text-align:right;letter-spacing:.5px;text-transform:uppercase;border:none}
.items thead th:first-child{text-align:center;width:40px}
.items tbody tr:nth-child(even){background:#f9fafb}
.items tbody tr:hover{background:#f3f4f6}
.items tbody td{padding:12px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151}
.items tbody td:first-child{text-align:center;color:#d1d5db;font-size:11px}
.items tbody td:last-child{font-weight:700;color:${printColor}}
.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:18px}
.totals{border-collapse:collapse;width:300px}
.totals td{padding:10px 14px;font-size:12px;border-bottom:1px solid #e5e7eb;color:#374151}
.totals td:first-child{font-weight:600;text-align:right}
.totals td:last-child{text-align:left;font-weight:700;color:${printColor}}
.totals tr:last-child td{background:${printColor};color:#fff;font-weight:800;font-size:14px;border:none;padding:14px 14px}
.totals tr:last-child td:last-child{text-align:right}
`;
        const body = `
<div class="band">
  <div class="band-right">
    <div class="band-title">${invoiceTitle}</div>
    <div class="band-num"># ${invoice.invoice_number}</div>
    <div style="font-size:11px;opacity:.85;margin-top:4px">${new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
  </div>
  <div class="band-center">${logoImg(logoMaxH, '120px')}</div>
  <div class="band-left">${showCompanyInfo ? `<div style="font-weight:800;margin-bottom:6px;font-size:13px">${companyName}</div><div style="font-size:11px;line-height:1.6">${companyAddress || ''}${companyAddress && companyPhone ? '<br>' : ''}${companyPhone ? `${t('phone_label') || 'الهاتف'}: ${companyPhone}` : ''}${(companyPhone || companyAddress) && companyTaxNumber ? '<br>' : ''}${companyTaxNumber ? `${t('tax_number_label') || 'الضريبة'}: ${companyTaxNumber}` : ''}</div>` : ''}</div>
</div>
<div class="meta-grid">
  <div class="meta-box">
    <span class="lbl">${clientLabel}</span>
    <div class="val">${clientName}</div>
  </div>
  <div class="meta-box">
    <span class="lbl">${t('invoice_status') || 'حالة الفاتورة'}</span>
    <div class="sub"><strong>${getStatusLabel(invoice.status)}</strong></div>
    <div class="sub" style="margin-top:3px">${t('payment') || 'الدفع'}: ${getPayLabel(invoice.payment_method)}</div>
  </div>
  <div class="meta-box">
    <span class="lbl">${t('invoice_dates') || 'التواريخ'}</span>
    <div class="sub"><strong>${t('invoice_date') || 'التاريخ'}:</strong><br>${new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
    ${invoice.due_date && invoice.due_date !== invoice.date ? `<div class="sub" style="margin-top:4px"><strong>${t('due_date') || 'الاستحقاق'}:</strong><br>${new Date(invoice.due_date).toLocaleDateString('ar-KW')}</div>` : ''}
  </div>
</div>
<table class="items">
  <thead><tr><th>#</th><th>${t('item_desc') || 'الصنف / الوصف'}</th><th style="width:70px;text-align:center">${t('quantity') || 'الكمية'}</th><th style="width:90px;text-align:center">${t('unit_price') || 'سعر الوحدة'}</th><th style="width:110px;text-align:center">${t('total') || 'الإجمالي'}</th></tr></thead>
  <tbody>${itemsRows(invoice.items)}</tbody>
</table>
<div class="totals-wrap"><table class="totals"><tbody>
<tr><td>${t('subtotal') || 'المجموع الفرعي'}</td><td>${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
${invoice.discount > 0 ? `<tr><td>${t('discount') || 'الخصم'}</td><td>- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
${invoice.tax > 0 ? `<tr><td>${t('tax') || 'الضريبة'}</td><td>${formatCurrency(invoice.tax)}</td></tr>` : ''}
<tr><td>${t('final_total') || 'الإجمالي النهائي'}</td><td>${formatCurrency(invoice.total)}</td></tr>
</tbody></table></div>
${notesBlock()}${termsBlock()}${sigBlock()}${footerBlock(printColor)}`;
        return wrap(body, css);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE 2: CLASSIC (black & white, formal)
    // ─────────────────────────────────────────────────────────────────────────
    const templateClassic = () => {
        const css = `
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px double #000;margin-bottom:16px}
.title-banner{background:#000;color:#fff;text-align:center;padding:14px;font-size:18px;font-weight:800;letter-spacing:2px;margin-bottom:14px;border-radius:4px}
.info-row{display:flex;gap:12px;margin-bottom:14px}
.info-box{flex:1;border:2px solid #000;padding:12px 14px}
.info-box .hd{font-size:10px;font-weight:800;text-transform:uppercase;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:8px;letter-spacing:.8px}
.info-box p{font-size:12px;margin:3px 0;color:#222}
table.items{width:100%;border-collapse:collapse;margin-bottom:14px}
.items th{border:2px solid #000;padding:10px 12px;font-weight:800;font-size:11px;text-align:right;background:#e0e0e0;text-transform:uppercase;letter-spacing:.5px}
.items th:first-child{text-align:center;width:40px}
.items td{border:1px solid #ccc;padding:10px 12px;font-size:12px;color:#222}
.items td:first-child{text-align:center;color:#999;font-size:11px}
.items tr:nth-child(even){background:#f5f5f5}
.totals{border-collapse:collapse;width:280px;margin:14px 0}
.totals td{border:1px solid #000;padding:10px 12px;font-size:12px;color:#222;text-align:right}
.totals tr:last-child{background:#000;color:#fff;font-weight:800;font-size:14px}
`;
        const body = `
<div class="hdr">
  ${headerRow()}
</div>
<div class="title-banner">${invoiceTitle} — ${invoice.invoice_number}</div>
<div class="info-row">
  <div class="info-box"><div class="hd">${clientLabel}</div><p style="font-weight:800;font-size:14px;color:#000">${clientName}</p></div>
  <div class="info-box"><div class="hd">${t('invoice_details') || 'تفاصيل الفاتورة'}</div>
    <p><strong>${t('date') || 'التاريخ'}:</strong> ${new Date(invoice.date).toLocaleDateString('ar-KW')}</p>
    <p><strong>${t('status') || 'الحالة'}:</strong> ${getStatusLabel(invoice.status)}</p>
    <p><strong>${t('payment') || 'الدفع'}:</strong> ${getPayLabel(invoice.payment_method)}</p>
  </div>
</div>
<table class="items">
  <thead><tr><th>#</th><th>${t('item_desc') || 'الصنف / الوصف'}</th><th style="width:70px;text-align:center">${t('quantity') || 'الكمية'}</th><th style="width:90px;text-align:center">${t('unit_price') || 'سعر الوحدة'}</th><th style="width:110px;text-align:center">${t('total') || 'الإجمالي'}</th></tr></thead>
  <tbody>${itemsRows(invoice.items)}</tbody>
</table>
<div style="display:flex;justify-content:flex-start;margin-bottom:14px"><table class="totals"><tbody>
<tr><td>${t('subtotal') || 'المجموع الفرعي'}</td><td>${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
${invoice.discount > 0 ? `<tr><td>${t('discount') || 'الخصم'}</td><td>- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
${invoice.tax > 0 ? `<tr><td>${t('tax') || 'الضريبة'}</td><td>${formatCurrency(invoice.tax)}</td></tr>` : ''}
<tr><td>${t('final_total') || 'الإجمالي النهائي'}</td><td>${formatCurrency(invoice.total)}</td></tr>
</tbody></table></div>
${notesBlock('#000')}${termsBlock()}${sigBlock()}${footerBlock('#000')}`;
        return wrap(body, css);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE 3: PROFESSIONAL (sidebar accent + clean boxes)
    // ─────────────────────────────────────────────────────────────────────────
    const templateProfessional = () => {
        const lighten = printColor + '18';
        const css = `
.outer{border:2px solid ${printColor};border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.top-bar{height:8px;background:linear-gradient(90deg,${printColor},${printColor}cc)}
.content{padding:24px}
.hdr-flex{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;gap:16px}
.inv-badge{background:${lighten};border:2px solid ${printColor};border-radius:8px;padding:14px 16px;text-align:center;min-width:160px;flex-shrink:0}
.inv-badge .type{color:${printColor};font-weight:800;font-size:16px}
.inv-badge .num{font-size:12px;color:#4b5563;margin-top:4px;font-weight:600}
.inv-badge .date{font-size:11px;color:#6b7280;margin-top:3px}
.meta-row{display:flex;gap:12px;margin-bottom:16px}
.meta-pill{flex:1;background:${lighten};border-left:3px solid ${printColor};border-radius:6px;padding:12px 14px}
.meta-pill .lbl{font-size:9px;color:${printColor};font-weight:800;text-transform:uppercase;margin-bottom:4px;letter-spacing:.8px}
.meta-pill .val{font-weight:800;font-size:14px;color:#1f2937}
.meta-pill .sub{font-size:11px;color:#4b5563;margin-top:3px;line-height:1.4}
table.items{width:100%;border-collapse:collapse;margin-bottom:16px;border-radius:8px;overflow:hidden}
.items thead th{background:${printColor};color:#fff;padding:11px 12px;font-size:11px;font-weight:800;text-align:right;letter-spacing:.5px;text-transform:uppercase}
.items thead th:first-child{text-align:center;width:40px}
.items tbody tr:nth-child(even){background:#f9fafb}
.items tbody tr:hover{background:#f3f4f6}
.items tbody td{padding:11px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151}
.items tbody td:first-child{text-align:center;color:#d1d5db;font-size:11px}
.items tbody td:last-child{font-weight:700;color:${printColor}}
.totals{border-collapse:collapse;width:300px;border-radius:8px;overflow:hidden;margin:0}
.totals td{padding:10px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:right}
.totals td:first-child{font-weight:600}
.totals tr:not(:last-child) td{background:#fafbfc}
.totals tr:last-child td{background:${printColor};color:#fff;font-weight:800;font-size:14px;border:none;padding:14px 14px}
`;
        const body = `
<div class="outer">
  <div class="top-bar"></div>
  <div class="content">
    <div class="hdr-flex">
      <div style="flex:1">${headerRow()}</div>
      <div class="inv-badge">
        <div class="type">${invoiceTitle}</div>
        <div class="num"># ${invoice.invoice_number}</div>
        <div class="date">${new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
      </div>
    </div>
    <div class="meta-row">
      <div class="meta-pill">
        <div class="lbl">${clientLabel}</div>
        <div class="val">${clientName}</div>
      </div>
      <div class="meta-pill">
        <div class="lbl">${t('status') || 'الحالة'}</div>
        <div class="val">${getStatusLabel(invoice.status)}</div>
        <div class="sub"><strong>${t('payment') || 'الدفع'}:</strong> ${getPayLabel(invoice.payment_method)}</div>
      </div>
      <div class="meta-pill">
        <div class="lbl">${t('invoice_dates') || 'التواريخ'}</div>
        <div class="sub"><strong>${t('invoice_date') || 'التاريخ'}:</strong><br>${new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
        ${invoice.due_date && invoice.due_date !== invoice.date ? `<div class="sub" style="margin-top:4px"><strong>${t('due_date') || 'الاستحقاق'}:</strong><br>${new Date(invoice.due_date).toLocaleDateString('ar-KW')}</div>` : ''}
      </div>
    </div>
    <table class="items">
      <thead><tr><th>#</th><th>${t('item_desc') || 'الصنف / الوصف'}</th><th style="width:70px;text-align:center">${t('quantity') || 'الكمية'}</th><th style="width:90px;text-align:center">${t('unit_price') || 'سعر الوحدة'}</th><th style="width:110px;text-align:center">${t('total') || 'الإجمالي'}</th></tr></thead>
      <tbody>${itemsRows(invoice.items)}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-start;margin-bottom:16px">
      <table class="totals"><tbody>
<tr><td>${t('subtotal') || 'المجموع الفرعي'}</td><td>${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
${invoice.discount > 0 ? `<tr><td>${t('discount') || 'الخصم'}</td><td>- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
${invoice.tax > 0 ? `<tr><td>${t('tax') || 'الضريبة'}</td><td>${formatCurrency(invoice.tax)}</td></tr>` : ''}
<tr><td>${t('final_total') || 'الإجمالي النهائي'}</td><td>${formatCurrency(invoice.total)}</td></tr>
</tbody></table>
    </div>
    ${notesBlock()}${termsBlock()}${sigBlock()}${footerBlock(printColor)}
  </div>
</div>`;
        return wrap(body, css);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // TEMPLATE 4: MINIMAL (clean lines, no heavy borders)
    // ─────────────────────────────────────────────────────────────────────────
    const templateMinimal = () => {
        const css = `
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid #e5e7eb;margin-bottom:14px}
.title-line{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:3px solid ${printColor}}
.title-line .t{font-size:22px;font-weight:800;color:${printColor}}
.title-line .n{font-size:13px;color:#6b7280;font-weight:600}
.two-col{display:flex;gap:20px;margin-bottom:18px}
.col-lbl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px;font-weight:800}
.col-val{font-weight:800;font-size:14px;color:#1f2937}
.col-sub{font-size:11px;color:#4b5563;margin-top:3px;line-height:1.5}
.col-sub strong{color:#1f2937;font-weight:700}
table.items{width:100%;border-collapse:collapse;margin-bottom:18px}
.items thead th{border-bottom:3px solid ${printColor};padding:11px 10px;font-size:10px;font-weight:800;text-align:right;color:#374151;text-transform:uppercase;letter-spacing:.5px}
.items thead th:first-child{text-align:center;width:40px}
.items tbody td{padding:10px 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#374151}
.items tbody td:first-child{text-align:center;color:#d1d5db;font-size:11px}
.items tbody td:last-child{font-weight:700;color:${printColor}}
.items tbody tr:nth-child(even){background:#f9fafb}
.totals{border-collapse:collapse;width:280px;margin:18px 0}
.totals td{padding:9px 10px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;text-align:right}
.totals td:first-child{font-weight:600}
.totals tr:last-child td{border-top:3px solid ${printColor};border-bottom:none;color:${printColor};font-weight:800;font-size:16px;padding:14px 10px}
`;
        const body = `
<div class="hdr">${headerRow()}</div>
<div class="title-line"><span class="t">${invoiceTitle}</span><span class="n"># ${invoice.invoice_number}</span></div>
<div class="two-col">
  <div style="flex:1"><div class="col-lbl">${clientLabel}</div><div class="col-val">${clientName}</div></div>
  <div style="flex:1">
    <div class="col-lbl">${t('invoice_date') || 'تاريخ الفاتورة'}</div>
    <div class="col-sub"><strong>${new Date(invoice.date).toLocaleDateString('ar-KW')}</strong></div>
    <div class="col-sub"><strong>${t('status') || 'الحالة'}:</strong> ${getStatusLabel(invoice.status)}</div>
    <div class="col-sub"><strong>${t('payment') || 'الدفع'}:</strong> ${getPayLabel(invoice.payment_method)}</div>
  </div>
</div>
<table class="items">
  <thead><tr><th>#</th><th>${t('item_desc') || 'الصنف / الوصف'}</th><th style="width:70px;text-align:center">${t('quantity') || 'الكمية'}</th><th style="width:90px;text-align:center">${t('unit_price') || 'سعر الوحدة'}</th><th style="width:110px;text-align:center">${t('total') || 'الإجمالي'}</th></tr></thead>
  <tbody>${itemsRows(invoice.items)}</tbody>
</table>
<div style="display:flex;justify-content:flex-start;margin-bottom:18px">
  <table class="totals"><tbody>
<tr><td>${t('subtotal') || 'المجموع الفرعي'}</td><td>${formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
${invoice.discount > 0 ? `<tr><td>${t('discount') || 'الخصم'}</td><td>- ${formatCurrency(invoice.discount)}</td></tr>` : ''}
${invoice.tax > 0 ? `<tr><td>${t('tax') || 'الضريبة'}</td><td>${formatCurrency(invoice.tax)}</td></tr>` : ''}
<tr><td>${t('final_total') || 'الإجمالي النهائي'}</td><td>${formatCurrency(invoice.total)}</td></tr>
</tbody></table>
</div>
${notesBlock()}${termsBlock()}${sigBlock()}${footerBlock(printColor)}`;
        return wrap(body, css);
    };

    const generatePrintHTML = () => {
        if (template === 'classic') return templateClassic();
        if (template === 'professional') return templateProfessional();
        if (template === 'minimal') return templateMinimal();
        return templateModern(); // default
    };

    const handlePrint = async () => {
        const html = generatePrintHTML();
        if (window.api?.print?.invoice) {
            await window.api.print.invoice(html);
        } else {
            const win = window.open('', '_blank', 'width=900,height=700');
            win.document.write(html);
            win.document.close();
            win.onload = () => setTimeout(() => win.print(), 300);
        }
    };

    if (!invoice) return null;

    // ── LIVE PREVIEW (React JSX version of chosen template) ──
    const previewColor = printColor;
    const logoEl = showLogo && (logoBase64 || logoSrc)
        ? <img src={logoBase64 || logoSrc} alt="Logo" style={{ maxHeight: logoMaxH, maxWidth: 160, objectFit: 'contain' }} />
        : null;

    const TEMPLATES = [
        { id: 'modern', label: t('modern') || 'Modern' },
        { id: 'classic', label: t('classic') || 'Classic' },
        { id: 'professional', label: t('professional') || 'Professional' },
        { id: 'minimal', label: t('minimal') || 'Minimal' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 920, height: '92vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{t('preview') || 'Preview'} — {invoice.invoice_number}</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ {t('print') || 'Print'}</button>
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                {/* Template selector bar */}
                <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', alignItems: 'center' }}>
                    <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>{t('template') || 'Template'}:</span>
                    {TEMPLATES.map(tmpl => (
                        <button key={tmpl.id}
                            onClick={() => {
                                // Update settings to persist template choice
                                window.api?.settings?.set?.('invoice_template', tmpl.id, 'invoice');
                                // Force reload preview by changing doc cookie (cheap trigger)
                                window.dispatchEvent(new CustomEvent('templateChange', { detail: tmpl.id }));
                            }}
                            style={{
                                padding: '4px 12px', borderRadius: 6, border: template === tmpl.id ? `2px solid ${previewColor}` : '1px solid var(--border)',
                                background: template === tmpl.id ? previewColor + '18' : 'transparent',
                                color: template === tmpl.id ? previewColor : 'var(--text-secondary)',
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: '.82rem', fontWeight: template === tmpl.id ? 700 : 400
                            }}>
                            {tmpl.label}
                        </button>
                    ))}
                </div>

                <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 0, background: '#f0f0f0' }}>
                    <div style={{ maxWidth: 760, margin: '20px auto', background: 'white', padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,.12)', borderRadius: 6 }}>
                        {/* ── MODERN PREVIEW ── */}
                        {(template === 'modern' || !template) && (
                            <>
                                {/* Colored band header */}
                                <div style={{ background: previewColor, color: '#fff', padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-28px -28px 18px', borderRadius: '6px 6px 0 0', gap: 16 }}>
                                    <div style={{ flex: 1, textAlign: 'right' }}>
                                        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>{invoiceTitle}</div>
                                        <div style={{ fontSize: 13, opacity: .9, fontWeight: 600 }}># {invoice.invoice_number}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>{logoEl}</div>
                                    <div style={{ flex: 1, textAlign: 'left', fontSize: 12, opacity: .95, lineHeight: 1.6 }}>
                                        {showCompanyInfo && <>
                                            <div style={{fontWeight: 800, marginBottom: 4 }}>{companyName}</div>
                                            {companyAddress && <div>{companyAddress}</div>}
                                        </>}
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                                    <div style={{ padding: 12, background: '#fafbfc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.8px' }}>{clientLabel}</div>
                                        <div style={{ fontWeight: 800, fontSize: 15, color: '#1f2937' }}>{clientName}</div>
                                    </div>
                                    <div style={{ padding: 12, background: '#fafbfc', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.8px' }}>{t('invoice_details') || 'تفاصيل الفاتورة'}</div>
                                        <div style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6 }}>
                                            <div><strong>{t('date') || 'التاريخ'}:</strong> {new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
                                            <div><strong>{t('status') || 'الحالة'}:</strong> {getStatusLabel(invoice.status)}</div>
                                            <div><strong>{t('payment') || 'الدفع'}:</strong> {getPayLabel(invoice.payment_method)}</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── CLASSIC PREVIEW ── */}
                        {template === 'classic' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottom: '3px double #000', marginBottom: 14 }}>
                                    {showCompanyInfo && <div style={{ lineHeight: 1.7 }}>
                                        <strong style={{ fontSize: 18 }}>{companyName}</strong>
                                        {companyAddress && <div style={{ fontSize: 11, color: '#555' }}>{companyAddress}</div>}
                                        {companyPhone && <div style={{ fontSize: 11, color: '#555' }}>هاتف: {companyPhone}</div>}
                                    </div>}
                                    {logoEl}
                                </div>
                                <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '9px', fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>
                                    {invoiceTitle} — {invoice.invoice_number}
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                                    <div style={{ flex: 1, border: '1px solid #000', padding: '9px 12px' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 5 }}>{clientLabel}</div>
                                        <div style={{ fontWeight: 700 }}>{clientName}</div>
                                    </div>
                                    <div style={{ flex: 1, border: '1px solid #000', padding: '9px 12px' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 3, marginBottom: 5 }}>{t('invoice') || 'Invoice'}</div>
                                        <div style={{ fontSize: 11, color: '#444' }}>{t('date') || 'Date'}: {new Date(invoice.date).toLocaleDateString()}</div>
                                        <div style={{ fontSize: 11, color: '#444' }}>{getStatusLabel(invoice.status)} — {getPayLabel(invoice.payment_method)}</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── PROFESSIONAL PREVIEW ── */}
                        {template === 'professional' && (
                            <>
                                <div style={{ height: 6, background: `linear-gradient(90deg,${previewColor},${previewColor}88)`, margin: '-28px -28px 20px', borderRadius: '6px 6px 0 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                                    <div>{showCompanyInfo && <div>
                                        <strong style={{ fontSize: 18 }}>{companyName}</strong>
                                        {companyPhone && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>هاتف: {companyPhone}</div>}
                                    </div>}{logoEl}</div>
                                    <div style={{ background: previewColor + '22', border: `1px solid ${previewColor}55`, borderRadius: 6, padding: '12px 18px', textAlign: 'center', minWidth: 160 }}>
                                        <div style={{ color: previewColor, fontWeight: 700, fontSize: 15 }}>{invoiceTitle}</div>
                                        <div style={{ fontSize: 12, color: '#555', marginTop: 3 }}># {invoice.invoice_number}</div>
                                        <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{new Date(invoice.date).toLocaleDateString('ar-KW')}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                                    {[{ l: clientLabel, v: clientName }, { l: t('status') || 'Status', v: getStatusLabel(invoice.status) }].map(({ l, v }) => (
                                        <div key={l} style={{ flex: 1, background: previewColor + '18', borderRadius: 6, padding: '9px 12px' }}>
                                            <div style={{ fontSize: 10, color: previewColor, fontWeight: 700 }}>{l}</div>
                                            <div style={{ fontWeight: 600, marginTop: 3 }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── MINIMAL PREVIEW ── */}
                        {template === 'minimal' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, borderBottom: '1px solid #ddd', marginBottom: 12 }}>
                                    {showCompanyInfo && <strong style={{ fontSize: 18 }}>{companyName}</strong>}
                                    {logoEl}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: `2px solid ${previewColor}`, marginBottom: 14 }}>
                                    <span style={{ fontSize: 20, fontWeight: 700, color: previewColor }}>{invoiceTitle}</span>
                                    <span style={{ fontSize: 13, color: '#666' }}># {invoice.invoice_number}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', marginBottom: 3 }}>{clientLabel}</div>
                                        <div style={{ fontWeight: 600 }}>{clientName}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 11, color: '#555' }}>{new Date(invoice.date).toLocaleDateString('ar-KW')} — {getStatusLabel(invoice.status)}</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Shared: Items Table ── */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18 }}>
                            <thead>
                                <tr style={{ background: template === 'classic' ? '#e0e0e0' : previewColor, color: template === 'classic' ? '#000' : '#fff' }}>
                                    {['#', t('item_desc') || 'الصنف / الوصف', t('quantity') || 'الكمية', t('unit_price') || 'سعر الوحدة', t('total') || 'الإجمالي'].map((h, i) => (
                                        <th key={i} style={{
                                            padding: '11px 12px', textAlign: i === 0 ? 'center' : i > 1 ? 'center' : 'right', fontSize: 11, fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '.5px',
                                            border: template === 'classic' ? '2px solid #000' : 'none',
                                            width: i === 0 ? 40 : i > 1 ? (i > 2 ? 110 : 70) : undefined
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.items || []).map((item, i) => (
                                    <tr key={i} style={{ background: i % 2 === 0 ? 'white' : (template === 'classic' ? '#f5f5f5' : '#f9fafb') }}>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', color: '#d1d5db', borderBottom: '1px solid #e5e7eb', fontSize: 11 }}>{i + 1}</td>
                                        <td style={{ padding: '11px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151' }}>{item.product_name || item.description || '-'}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151' }}>{item.quantity}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151' }}>{formatCurrency(item.unit_price)}</td>
                                        <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: 800, borderBottom: '1px solid #e5e7eb', fontSize: 12, color: previewColor }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                                {(!invoice.items || invoice.items.length === 0) && (
                                    <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#aaa' }}>{t('no_items') || 'لا توجد بنود'}</td></tr>
                                )}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
                            <table style={{ width: 300, borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151', textAlign: 'right', fontWeight: 600 }}>{t('subtotal') || 'المجموع الفرعي'}</td><td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid #e5e7eb',  color: previewColor }}>{formatCurrency(invoice.subtotal || invoice.total)}</td></tr>
                                    {invoice.discount > 0 && <tr><td style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151', textAlign: 'right', fontWeight: 600 }}>{t('discount') || 'الخصم'}</td><td style={{ padding: '10px 14px', textAlign: 'left', color: '#ef4444', borderBottom: '1px solid #e5e7eb', fontWeight: 700 }}>- {formatCurrency(invoice.discount)}</td></tr>}
                                    {invoice.tax > 0 && <tr><td style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#374151', textAlign: 'right', fontWeight: 600 }}>{t('tax') || 'الضريبة'}</td><td style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: 700, color: previewColor }}>{formatCurrency(invoice.tax)}</td></tr>}
                                    <tr style={{ background: previewColor, color: '#fff' }}>
                                        <td style={{ padding: '14px 14px', fontWeight: 800, fontSize: 14, textAlign: 'right' }}>{t('final_total') || 'الإجمالي النهائي'}</td>
                                        <td style={{ padding: '14px 14px', textAlign: 'left', fontWeight: 800, fontSize: 14 }}>{formatCurrency(invoice.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Notes, Terms, Signature, Footer */}
                        {showNotes && invoice.notes && (
                            <div style={{ padding: '9px 12px', border: '1px solid #ddd', borderRight: `3px solid ${previewColor}`, marginBottom: 10, fontSize: 12 }}>
                                <strong>{t('notes_label') || 'Notes:'}</strong> {invoice.notes}
                            </div>
                        )}
                        {invoiceTerms && (
                            <div style={{ padding: '9px 12px', background: '#f9f9f9', border: '1px solid #eee', marginBottom: 12, fontSize: 11, color: '#444' }}>
                                <strong>{t('terms_label') || 'Terms & Conditions:'}</strong><br />
                                {invoiceTerms.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                            </div>
                        )}
                        {showSignature && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '24px 0 14px', paddingTop: 14 }}>
                                {[t('receiver_signature') || 'Receiver Signature', t('manager_signature') || 'Manager Signature'].map(l => (
                                    <div key={l} style={{ textAlign: 'center', width: 200 }}>
                                        <div style={{ borderTop: '1px solid #333', marginTop: 40, paddingTop: 5, fontSize: 11, color: '#444' }}>{l}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ borderTop: `2px solid ${previewColor}`, paddingTop: 10, textAlign: 'center', color: '#666', fontSize: 11 }}>
                            {thankYouMsg && <p style={{ fontWeight: 600, color: previewColor, marginBottom: 4 }}>{thankYouMsg}</p>}
                            {invoiceFooter && <p>{invoiceFooter}</p>}
                            <p style={{ marginTop: 6, fontSize: 10, color: '#aaa' }}>{companyName} — {new Date().getFullYear()}</p>
                        </div>

                        <div style={{ marginTop: 18, textAlign: 'center', paddingTop: 14, borderTop: '1px solid #eee' }}>
                            <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '10px 30px', fontSize: 14 }}>🖨️ {t('print_invoice') || 'Print Invoice'}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePrintPreview;
