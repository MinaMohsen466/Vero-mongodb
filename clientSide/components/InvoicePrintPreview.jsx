import React, { useState, useEffect } from 'react';
import { useAuth, isColorUnit } from '../App';

// ── 4 Professional Invoice Templates ─────────────────────────────────────────
// Template 1: Modern (colored header band + clean)
// Template 2: Classic (black & white, traditional)
// Template 3: Professional (diagonal accent, premium)
// Template 4: Minimal (compact, no borders)

const parseDbDate = (dbDate) => {
    if (!dbDate) return new Date();
    if (dbDate instanceof Date) return dbDate;
    if (typeof dbDate !== 'string') {
        const d = new Date(dbDate);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    if (dbDate.includes('Z') || dbDate.includes('+') || (dbDate.includes('-') && dbDate.includes(':') && dbDate.includes('T'))) {
        return new Date(dbDate);
    }
    return new Date(dbDate.replace(' ', 'T') + 'Z');
};

function InvoicePrintPreview({ invoice, settings, onClose, type = 'sales' }) {
    const { t } = useAuth();
    const [logoBase64, setLogoBase64] = useState('');
    const [activeTab, setActiveTab] = useState('invoice');

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
        : (type === 'quotation'
            ? (t('quotation') || 'عرض سعر')
            : (settings?.invoice?.invoice_title_purchase || t('purchase_invoice') || 'Purchase Invoice'));
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
    const logoMaxH = logoSize === 'small' ? '50px' : logoSize === 'large' ? '110px' : '75px';
    
    const isThermo = paperSize.startsWith('thermal_');
    const getFontSizes = (size) => {
        if (size.startsWith('thermal_')) {
            return {
                title: '14px',
                body: '11px',
                tableBody: '11px',
                titleNum: 14,
                bodyNum: 11
            };
        }
        switch (size) {
            case 'A3':
                return {
                    title: '26px',
                    body: '16px',
                    tableBody: '15px',
                    titleNum: 26,
                    bodyNum: 16
                };
            case 'A5':
                return {
                    title: '16px',
                    body: '11px',
                    tableBody: '10px',
                    titleNum: 16,
                    bodyNum: 11
                };
            case 'Letter':
            case 'Legal':
                return {
                    title: '20px',
                    body: '13px',
                    tableBody: '12px',
                    titleNum: 20,
                    bodyNum: 13
                };
            default: // A4
                return {
                    title: '22px',
                    body: '13px',
                    tableBody: '12px',
                    titleNum: 22,
                    bodyNum: 13
                };
        }
    };
    const fonts = getFontSizes(paperSize);
    const bodyFontSizeNum = fonts.bodyNum;
    const titleFontSizeNum = fonts.titleNum;
    const getThermoWidth = (size) => {
        switch (size) {
            case 'thermal_110': return '110mm';
            case 'thermal_80': return '80mm';
            case 'thermal_76': return '76mm';
            case 'thermal_58': return '58mm';
            case 'thermal_57': return '57mm';
            default: return '80mm';
        }
    };
    const thermoWidth = isThermo ? getThermoWidth(paperSize) : '';
    
    const getPageSizeValue = () => {
        if (isThermo) return thermoWidth;
        switch (paperSize) {
            case 'A3': return 'A3';
            case 'A5': return 'A5';
            case 'Letter': return 'letter';
            case 'Legal': return 'legal';
            default: return 'A4';
        }
    };
    const pageSizeVal = getPageSizeValue();
    const pageMargin = isThermo ? '3mm' : (paperSize === 'A3' ? '15mm' : paperSize === 'A5' ? '8mm' : '10mm');
    const pageOrient = !isThermo && paperOrientation === 'landscape' ? ' landscape' : '';
    const pageSize = isThermo ? pageSizeVal : `${pageSizeVal}${pageOrient}`;

    const getPreviewWidth = () => {
        if (isThermo) {
            switch (paperSize) {
                case 'thermal_110': return 420;
                case 'thermal_80': return 320;
                case 'thermal_76': return 300;
                case 'thermal_58': return 240;
                case 'thermal_57': return 240;
                default: return 320;
            }
        }
        const isLandscape = paperOrientation === 'landscape';
        switch (paperSize) {
            case 'A3': return isLandscape ? 1480 : 1080;
            case 'A5': return isLandscape ? 760 : 520;
            case 'Letter': return isLandscape ? 1040 : 760;
            case 'Legal': return isLandscape ? 1200 : 760;
            default: return isLandscape ? 1080 : 760; // A4
        }
    };
    const previewWidth = getPreviewWidth();

    const clientName = (type === 'sales' || type === 'quotation') ? (invoice.customer_name && invoice.customer_name !== '-' ? invoice.customer_name : (t('cash_client') || 'نقدي')) : (invoice.supplier_name || '-');
    const clientLabel = (type === 'sales' || type === 'quotation') ? (t('customer') || 'Customer') : (t('supplier') || 'Supplier');
    
    const wrap = (body) => {
        const isRtl = document.documentElement.dir === 'rtl';
        const pageMaxWidth = isThermo ? thermoWidth : (paperSize === 'A3' ? '1080px' : paperSize === 'A5' ? '500px' : '720px');
        return `<!DOCTYPE html><html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Arial',sans-serif;background:white;color:#222;font-size:${isThermo ? '11px' : '13px'}}
.page{max-width:${pageMaxWidth};margin:0 auto;padding:${isThermo ? '10px' : '28px'}}
@media print{body{padding:0}.page{padding:${isThermo ? '5px' : '10px'}}@page{margin:${pageMargin};size:${pageSize}}}
</style></head><body><div class="page">${body}</div></body></html>`;
    };

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

    const validLogoUrl = logoBase64 ? logoBase64 : (logoSrc && logoSrc.startsWith('http') ? logoSrc : null);
    const generatePrintHTML = () => {
        const isRtl = document.documentElement.dir === 'rtl';
        const alignLeft = isRtl ? 'right' : 'left';
        const alignRight = isRtl ? 'left' : 'right';
        
        // Logo & Company Info HTML (will be placed on Left for standard)
        const logo = showLogo && validLogoUrl
            ? `<img src="${validLogoUrl}" alt="Logo" style="max-height:${logoMaxH};max-width:160px;object-fit:contain"/>`
            : '';

        const infoStandard = showCompanyInfo ? `
            <div style="font-size: ${fonts.body}; line-height: 1.5; color: #1f2937; text-align: ${alignLeft}; display: flex; flex-direction: column; gap: 3px;">
              <h3 style="font-size: 18px; font-weight: 800; margin: 0; color: #111827; max-width: 250px; overflow-wrap: break-word; line-height: 1.3;">${companyName}</h3>
              ${companyPhone ? `<div style="white-space: nowrap; font-size: 13px; color: #4b5563; margin-top: 2px;"><strong>${t('phone') || 'تلفون'}:</strong> <span dir="ltr">${companyPhone}</span></div>` : ''}
              ${companyEmail ? `<div style="white-space: nowrap; font-size: 13px; color: #4b5563;"><strong>${t('email') || 'البريد الإلكتروني'}:</strong> ${companyEmail}</div>` : ''}
              ${companyTaxNumber ? `<div style="white-space: nowrap; font-size: 13px; color: #4b5563;"><strong>${t('tax_number_abbr') || 'الرقم الضريبي:'}</strong> ${companyTaxNumber}</div>` : ''}
            </div>` : '';

        const infoThermal = showCompanyInfo ? `
            <div style="font-size: 12px; line-height: 1.5; color: #1f2937; text-align: center; display: flex; flex-direction: column; gap: 3px; align-items: center;">
              <h3 style="font-size: 16px; font-weight: 800; margin: 0; color: #111827; max-width: 180px; overflow-wrap: break-word; line-height: 1.3;">${companyName}</h3>
              ${companyPhone ? `<div style="white-space: nowrap; font-size: 12px; color: #4b5563;"><strong>${t('phone') || 'تلفون'}:</strong> <span dir="ltr">${companyPhone}</span></div>` : ''}
              ${companyEmail ? `<div style="white-space: nowrap; font-size: 12px; color: #4b5563;"><strong>${t('email') || 'البريد الإلكتروني'}:</strong> ${companyEmail}</div>` : ''}
              ${companyTaxNumber ? `<div style="white-space: nowrap; font-size: 12px; color: #4b5563;"><strong>${t('tax_number_abbr') || 'الرقم الضريبي:'}</strong> ${companyTaxNumber}</div>` : ''}
            </div>` : '';

        const invoiceDateStr = new Date(invoice.date).toLocaleDateString(isRtl ? 'ar-KW' : 'en-GB');
        const invoiceTimeStr = parseDbDate(invoice.created_at).toLocaleTimeString(isRtl ? 'ar-KW' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        const combinedDateTime = `${invoiceDateStr} ${invoiceTimeStr}`;

        const numberLabel = type === 'quotation' ? (t('quotation_number') || 'رقم عرض السعر') : (t('inv_number') || 'رقم الفاتورة');
        const dueDateHtml = (type === 'quotation' && invoice.due_date) ? `
            <div style="white-space: nowrap;"><strong>${t('due_date') || 'صالح حتى'}:</strong> ${new Date(invoice.due_date).toLocaleDateString(isRtl ? 'ar-KW' : 'en-GB')}</div>
        ` : '';

        const invoiceDetailsStandard = `
            <div style="font-size: ${fonts.body}; line-height: 1.6; color: #1f2937; text-align: ${alignRight}; white-space: nowrap; display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
                <div style="white-space: nowrap;"><strong>${numberLabel}:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: 700; color: #111827;">${invoice.invoice_number}</span></div>
                <div style="white-space: nowrap;"><strong>${t('date') || 'التاريخ'}:</strong> ${combinedDateTime}</div>
                ${dueDateHtml}
                <div style="white-space: nowrap;"><strong>${clientLabel}:</strong> ${clientName}</div>
            </div>
        `;

        const invoiceDetailsThermal = `
            <div style="font-size: 12px; line-height: 1.6; color: #1f2937; text-align: ${isRtl ? 'right' : 'left'}; display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
                <div style="white-space: nowrap;"><strong>${numberLabel}:</strong> <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #111827;">${invoice.invoice_number}</span></div>
                <div style="white-space: nowrap;"><strong>${t('date') || 'التاريخ'}:</strong> ${combinedDateTime}</div>
                ${dueDateHtml}
                <div style="white-space: nowrap;"><strong>${clientLabel}:</strong> ${clientName}</div>
            </div>
        `;

        let headerHtml = '';
        if (isThermo) {
            headerHtml = `
                <div style="text-align: center; padding-bottom: 10px; border-bottom: 1px dashed #000; margin-bottom: 15px; width: 100%;">
                    ${logo ? `<div style="margin-bottom: 8px; display: flex; justify-content: center;">${logo}</div>` : ''}
                    ${infoThermal}
                    <div style="margin: 10px 0; border-top: 1px dashed #ccc;"></div>
                    <h2 style="font-size: 15px; font-weight: 700; margin: 0 0 8px 0; color: #000; text-align: center;">${invoiceTitle}</h2>
                    ${invoiceDetailsThermal}
                </div>`;
        } else {
            headerHtml = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; border-bottom: 2px solid #9ca3af; padding-bottom: 15px; margin-bottom: 20px;">
                    <!-- Column 1 (Left/Right Group): Company logo & info side-by-side -->
                    <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1.5; text-align: ${alignLeft};">
                        ${logo ? `<div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center;">${logo}</div>` : ''}
                        ${infoStandard}
                    </div>
                    
                    <!-- Column 2 (Opposite Group): Invoice details -->
                    <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end; text-align: ${alignRight}; flex: 1;">
                        <h2 style="font-size: ${fonts.title}; font-weight: 800; margin: 0 0 6px 0; color: #111827; white-space: nowrap; letter-spacing: -0.5px;">${invoiceTitle}</h2>
                        ${invoiceDetailsStandard}
                    </div>
                </div>`;
        }

        // Items table rows HTML
        const tableRowsHtml = (invoice.items || []).map((item, i) => {
            const shouldShowColor = settings?.general?.enable_product_color === 'yes' && isColorUnit(item.unit) && item.color;
            return `
                <tr>
                    <td style="padding: 8px 10px; font-size: ${fonts.tableBody}; border-bottom: 1px solid #e5e7eb; text-align: center;">${i + 1}</td>
                    <td style="padding: 8px 10px; font-size: ${fonts.tableBody}; border-bottom: 1px solid #e5e7eb; text-align: ${alignLeft};">
                        ${item.product_name || item.description || '-'}
                        ${shouldShowColor ? `<span style="color: #555; font-size: 0.85em; display: block; margin-top: 2px;">(${t('color') || 'Color'}: ${item.color})</span>` : ''}
                    </td>
                    <td style="padding: 8px 10px; font-size: ${fonts.tableBody}; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px 10px; font-size: ${fonts.tableBody}; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatCurrency(item.unit_price)}</td>
                    <td style="padding: 8px 10px; font-size: ${fonts.tableBody}; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700;">${formatCurrency(item.total)}</td>
                </tr>`;
        }).join('');

        const noItemsHtml = (!invoice.items || invoice.items.length === 0) ? `
            <tr><td colSpan="5" style="padding: 16px; text-align: center; color: #888;">${t('no_items') || 'لا توجد بنود'}</td></tr>
        ` : '';

        // Table HTML
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th style="padding: 8px 10px; background: #f3f4f6; color: #1f2937; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af; width: 40px;">#</th>
                        <th style="padding: 8px 10px; background: #f3f4f6; color: #1f2937; font-size: 11px; font-weight: 700; text-align: ${alignLeft}; border: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af;">${t('item_desc') || 'الصنف / الوصف'}</th>
                        <th style="padding: 8px 10px; background: #f3f4f6; color: #1f2937; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af; width: 60px;">${t('quantity') || 'الكمية'}</th>
                        <th style="padding: 8px 10px; background: #f3f4f6; color: #1f2937; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af; width: 90px;">${t('unit_price') || 'سعر الوحدة'}</th>
                        <th style="padding: 8px 10px; background: #f3f4f6; color: #1f2937; font-size: 11px; font-weight: 700; text-align: center; border: 1px solid #d1d5db; border-bottom: 2px solid #9ca3af; width: 100px;">${t('total') || 'الإجمالي'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                    ${noItemsHtml}
                </tbody>
            </table>`;

        // Totals HTML
        const totalsHtml = `
            <div style="display: flex; justify-content: ${isRtl ? 'flex-start' : 'flex-end'}; margin-bottom: 20px;">
                <table style="width: ${isThermo ? '100%' : '280px'}; border-collapse: collapse;">
                    <tbody>
                        <tr style="font-size: ${fonts.body}; color: #1f2937;">
                            <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${t('subtotal') || 'المجموع الفرعي'}</td>
                            <td style="padding: 6px 10px; text-align: left; width: 120px;">${formatCurrency(invoice.subtotal || invoice.total)}</td>
                        </tr>
                        ${invoice.discount > 0 ? `
                        <tr style="font-size: ${fonts.body}; color: #1f2937;">
                            <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${t('discount') || 'الخصم'}</td>
                            <td style="padding: 6px 10px; text-align: left; width: 120px; color: #000; font-weight: 700;">- ${formatCurrency(invoice.discount)}</td>
                        </tr>` : ''}
                        ${invoice.tax > 0 ? `
                        <tr style="font-size: ${fonts.body}; color: #1f2937;">
                            <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${t('tax') || 'الضريبة'}</td>
                            <td style="padding: 6px 10px; text-align: left; width: 120px;">${formatCurrency(invoice.tax)}</td>
                        </tr>` : ''}
                        <tr style="font-size: ${fonts.body}; border-top: 2px solid #9ca3af; border-bottom: 2px solid #9ca3af; font-weight: 700; color: #111827;">
                            <td style="padding: 8px 10px; text-align: right; color: #111827;">${t('final_total') || 'الإجمالي النهائي'}</td>
                            <td style="padding: 8px 10px; text-align: left; width: 120px; color: #111827; font-weight: 700;">${formatCurrency(invoice.total)}</td>
                        </tr>
                        ${invoice.paid > 0 && invoice.paid < invoice.total ? `
                        <tr style="font-size: ${fonts.body};">
                            <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${t('paid_amount') || 'المبلغ المدفوع'}</td>
                            <td style="padding: 6px 10px; text-align: left; width: 120px;">${formatCurrency(invoice.paid)}</td>
                        </tr>
                        <tr style="font-size: ${fonts.body};">
                            <td style="padding: 6px 10px; text-align: right; font-weight: 600;">${t('remaining_amount') || 'المبلغ المتبقي'}</td>
                            <td style="padding: 6px 10px; text-align: left; width: 120px; font-weight: 700;">${formatCurrency(invoice.total - invoice.paid)}</td>
                        </tr>` : ''}
                    </tbody>
                </table>
            </div>`;

        // Notes and terms HTML
        const cleanNotes = (invoice.notes || '').trim();
        const posTranslations = [
            'نقاط البيع',
            'نقطة البيع (pos)',
            'نقطة البيع',
            'point of sale',
            'pos',
            (t('pos') || '').trim(),
            (t('menu_pos') || '').trim()
        ].map(s => s.toLowerCase());
        const hasNotes = cleanNotes !== '' && !posTranslations.includes(cleanNotes.toLowerCase());
        const notesHtml = showNotes && hasNotes ? `
            <div style="padding: 8px 12px; border: 1px solid #ccc; border-right: ${isRtl ? 'none' : '3px solid #000'}; border-left: ${isRtl ? '3px solid #000' : 'none'}; margin-bottom: 12px; font-size: ${fonts.body};">
                <strong>${t('notes_label') || 'Notes:'}</strong> ${invoice.notes}
            </div>` : '';

        const termsHtml = invoiceTerms ? `
            <div style="padding: 8px 12px; background: #f9f9f9; border: 1px solid #e5e7eb; margin-bottom: 12px; font-size: calc(${fonts.body} - 1px); color: #333; line-height: 1.4;">
                <strong>${t('terms_label') || 'Terms & Conditions:'}</strong>
                <div style="margin-top: 4px;">
                    ${invoiceTerms.split('\n').map(l => `<div>${l}</div>`).join('')}
                </div>
            </div>` : '';

        // Signatures HTML
        const signatureHtml = showSignature ? `
            <div style="display: flex; justify-content: space-between; margin: 30px 0 20px; padding-top: 10px;">
                <div style="text-align: center; width: ${isThermo ? '45%' : '200px'};">
                    <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: calc(${fonts.body} - 1px); color: #333;">${t('receiver_signature') || 'Receiver Signature'}</div>
                </div>
                <div style="text-align: center; width: ${isThermo ? '45%' : '200px'};">
                    <div style="border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; font-size: calc(${fonts.body} - 1px); color: #333;">${t('manager_signature') || 'Manager Signature'}</div>
                </div>
            </div>` : '';

        // Footer HTML
        const footerHtml = `
            <div style="border-top: 1px solid #000; padding-top: 12px; text-align: center; color: #555; font-size: calc(${fonts.body} - 1px); margin-top: 15px;">
                ${thankYouMsg ? `<p style="font-weight: 700; color: #111827; margin-bottom: 4px; font-size: ${fonts.body};">${thankYouMsg}</p>` : ''}
                ${invoiceFooter ? `<p style="margin-bottom: 4px;">${invoiceFooter}</p>` : ''}
                ${companyAddress ? `<p style="margin-bottom: 4px; font-weight: 600; color: #333;"><strong>${t('address') || 'العنوان'}:</strong> ${companyAddress}</p>` : ''}
                <p style="margin-top: 6px; font-size: calc(${fonts.body} - 2px); color: #888;">${companyName} — ${new Date().getFullYear()}</p>
            </div>`;

        const quotationBannerHtml = type === 'quotation' ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 8px 12px; border-radius: 6px; text-align: center; margin-bottom: 15px; font-weight: 700; font-size: 13px;">
                ⚠️ ${t('quotation_not_invoice_banner') || 'عرض سعر مالي - ليس فاتورة ضريبية'}
            </div>
        ` : '';

        const body = `
            ${quotationBannerHtml}
            ${headerHtml}
            ${tableHtml}
            ${totalsHtml}
            ${notesHtml}
            ${termsHtml}
            ${signatureHtml}
            ${footerHtml}`;

        return wrap(body);
    };



    const handlePrint = async () => {
        const html = generatePrintHTML();
        if (window.api?.print?.invoice) {
            await window.api.print.invoice(html, { paperSize, paperOrientation, invoiceType: type });
        } else {
            const win = window.open('', '_blank', 'width=900,height=700');
            win.document.write(html);
            win.document.close();
            win.onload = () => setTimeout(() => win.print(), 300);
        }
    };

    if (!invoice) return null;

    // ── LIVE PREVIEW (React JSX version) ──
    const isRtl = document.documentElement.dir === 'rtl';
    const logoEl = showLogo && validLogoUrl
        ? <img src={validLogoUrl} alt="Logo" style={{ maxHeight: logoMaxH, maxWidth: 160, objectFit: 'contain' }} />
        : null;

    const LogoComponent = logoEl ? (
        <div style={{ display: 'inline-block' }}>{logoEl}</div>
    ) : null;

    const CompanyInfoComponent = showCompanyInfo ? (
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#333' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: '#000', maxWidth: 200, overflowWrap: 'break-word', lineHeight: 1.3 }}>{companyName}</h3>
            {companyAddress && <div>{companyAddress}</div>}
            {companyPhone && <div>{t('phone_label') || 'Phone:'} <span dir="ltr">{companyPhone}</span></div>}
            {companyEmail && <div>{companyEmail}</div>}
            {companyTaxNumber && <div>{t('tax_number_label') || 'Tax Number:'} {companyTaxNumber}</div>}
        </div>
    ) : null;

    const HeaderLayout = () => {
        const logoEl = showLogo && validLogoUrl
            ? <img src={validLogoUrl} alt="Logo" style={{ maxHeight: logoMaxH, maxWidth: 160, objectFit: 'contain' }} />
            : null;

        const LogoComponent = logoEl ? (
            <div style={{ display: 'inline-block' }}>{logoEl}</div>
        ) : null;

        const CompanyInfoStandard = showCompanyInfo ? (
            <div style={{ fontSize: bodyFontSizeNum, lineHeight: 1.5, color: '#1f2937', textAlign: isRtl ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px 0', color: '#111827', maxWidth: 250, overflowWrap: 'break-word', lineHeight: 1.3 }}>{companyName}</h3>
                {companyPhone && <div style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#4b5563' }}><strong>{t('phone') || 'تلفون'}:</strong> <span dir="ltr">{companyPhone}</span></div>}
                {companyEmail && <div style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#4b5563' }}><strong>{t('email') || 'البريد الإلكتروني'}:</strong> {companyEmail}</div>}
                {companyTaxNumber && <div style={{ whiteSpace: 'nowrap', fontSize: 13, color: '#4b5563' }}><strong>{t('tax_number_abbr') || 'الرقم الضريبي:'}</strong> {companyTaxNumber}</div>}
            </div>
        ) : null;

        const CompanyInfoThermal = showCompanyInfo ? (
            <div style={{ fontSize: 12, lineHeight: 1.5, color: '#1f2937', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 2px 0', color: '#111827', maxWidth: 180, overflowWrap: 'break-word', lineHeight: 1.3 }}>{companyName}</h3>
                {companyPhone && <div style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#4b5563' }}><strong>{t('phone') || 'تلفون'}:</strong> <span dir="ltr">{companyPhone}</span></div>}
                {companyEmail && <div style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#4b5563' }}><strong>{t('email') || 'البريد الإلكتروني'}:</strong> {companyEmail}</div>}
                {companyTaxNumber && <div style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#4b5563' }}><strong>{t('tax_number_abbr') || 'الرقم الضريبي:'}</strong> {companyTaxNumber}</div>}
            </div>
        ) : null;

        const invoiceDateStr = new Date(invoice.date).toLocaleDateString(isRtl ? 'ar-KW' : 'en-GB');
        const invoiceTimeStr = parseDbDate(invoice.created_at).toLocaleTimeString(isRtl ? 'ar-KW' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        const combinedDateTime = `${invoiceDateStr} ${invoiceTimeStr}`;

        const numberLabel = type === 'quotation' ? (t('quotation_number') || 'رقم عرض السعر') : (t('inv_number') || 'رقم الفاتورة');

        const InvoiceDetailsStandard = (
            <div style={{ fontSize: bodyFontSizeNum, lineHeight: 1.6, color: '#1f2937', textAlign: isRtl ? 'left' : 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                <div style={{ whiteSpace: 'nowrap' }}><strong>{numberLabel}:</strong> <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#111827' }}>{invoice.invoice_number}</span></div>
                <div style={{ whiteSpace: 'nowrap' }}><strong>{t('date') || 'التاريخ'}:</strong> {combinedDateTime}</div>
                {type === 'quotation' && invoice.due_date && (
                    <div style={{ whiteSpace: 'nowrap' }}><strong>{t('due_date') || 'صالح حتى'}:</strong> {new Date(invoice.due_date).toLocaleDateString(isRtl ? 'ar-KW' : 'en-GB')}</div>
                )}
                <div style={{ whiteSpace: 'nowrap' }}><strong>{clientLabel}:</strong> {clientName}</div>
            </div>
        );

        const InvoiceDetailsThermal = (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#1f2937', textAlign: isRtl ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={{ whiteSpace: 'nowrap' }}><strong>{numberLabel}:</strong> <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#111827' }}>{invoice.invoice_number}</span></div>
                <div style={{ whiteSpace: 'nowrap' }}><strong>{t('date') || 'التاريخ'}:</strong> {combinedDateTime}</div>
                {type === 'quotation' && invoice.due_date && (
                    <div style={{ whiteSpace: 'nowrap' }}><strong>{t('due_date') || 'صالح حتى'}:</strong> {new Date(invoice.due_date).toLocaleDateString(isRtl ? 'ar-KW' : 'en-GB')}</div>
                )}
                <div style={{ whiteSpace: 'nowrap' }}><strong>{clientLabel}:</strong> {clientName}</div>
            </div>
        );

        if (isThermo) {
            return (
                <div style={{ textAlign: 'center', paddingBottom: 10, borderBottom: '1px dashed #000', marginBottom: 15, width: '100%' }}>
                    {LogoComponent && <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{LogoComponent}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', textAlign: 'center' }}>
                        {CompanyInfoThermal}
                    </div>
                    <div style={{ margin: '10px 0', borderTop: '1px dashed #ccc' }}></div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px 0', color: '#000', textAlign: 'center' }}>{invoiceTitle}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', textAlign: isRtl ? 'right' : 'left' }}>
                        {InvoiceDetailsThermal}
                    </div>
                </div>
            );
        }

        const flexDir = isRtl ? 'row-reverse' : 'row';

        return (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                width: '100%',
                borderBottom: '2px solid #9ca3af',
                paddingBottom: 15,
                marginBottom: 20
            }}>
                {/* Left Column: Logo & Company Info group side-by-side */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    flex: 1.5
                }}>
                    {LogoComponent && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{LogoComponent}</div>}
                    {CompanyInfoStandard}
                </div>

                {/* Right Column: Invoice Details */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: 'flex-end',
                    textAlign: isRtl ? 'left' : 'right',
                    flex: 1
                }}>
                    <h2 style={{ fontSize: titleFontSizeNum, fontWeight: 800, margin: '0 0 6px 0', color: '#111827', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>{invoiceTitle}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: isRtl ? 'flex-start' : 'flex-end', textAlign: isRtl ? 'left' : 'right' }}>
                        {InvoiceDetailsStandard}
                    </div>
                </div>
            </div>
        );
    };

    const TableLayout = () => {
        const thStyle = {
            padding: '8px 10px',
            background: '#f3f4f6',
            color: '#1f2937',
            fontSize: 11,
            fontWeight: 700,
            textAlign: 'center',
            border: '1px solid #d1d5db',
            borderBottom: '2px solid #9ca3af'
        };

        const tdStyle = {
            padding: '8px 10px',
            fontSize: 12,
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center',
            color: '#1f2937'
        };

        const alignLeft = isRtl ? 'right' : 'left';

        return (
            <table className="invoice-preview-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                <thead>
                    <tr>
                        <th style={{ ...thStyle, width: 40 }}>#</th>
                        <th style={{ ...thStyle, textAlign: alignLeft }}>{t('item_desc') || 'الصنف / الوصف'}</th>
                        <th style={{ ...thStyle, width: 60 }}>{t('quantity') || 'الكمية'}</th>
                        <th style={{ ...thStyle, width: 90 }}>{t('unit_price') || 'سعر الوحدة'}</th>
                        <th style={{ ...thStyle, width: 100 }}>{t('total') || 'الإجمالي'}</th>
                    </tr>
                </thead>
                <tbody>
                    {(invoice.items || []).map((item, i) => {
                        const shouldShowColor = settings?.general?.enable_product_color === 'yes' && isColorUnit(item.unit) && item.color;
                        return (
                           <tr key={i}>
                               <td style={tdStyle}>{i + 1}</td>
                               <td style={{ ...tdStyle, textAlign: alignLeft }}>
                                   {item.product_name || item.description || '-'}
                                   {shouldShowColor && (
                                       <span style={{ color: '#555', fontSize: '0.85em', display: 'block', marginTop: 2 }}>
                                           ({t('color') || 'Color'}: {item.color})
                                       </span>
                                   )}
                               </td>
                               <td style={tdStyle}>{item.quantity}</td>
                               <td style={tdStyle}>{formatCurrency(item.unit_price)}</td>
                               <td style={{ ...tdStyle, fontWeight: 700 }}>{formatCurrency(item.total)}</td>
                           </tr>
                        );
                    })}
                    {(!invoice.items || invoice.items.length === 0) && (
                        <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#888' }}>{t('no_items') || 'لا توجد بنود'}</td></tr>
                    )}
                </tbody>
            </table>
        );
    };

    const TotalsLayout = () => {
        const rowStyle = { fontSize: 12, color: '#1f2937' };
        const cellLabelStyle = { padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#1f2937' };
        const cellValueStyle = { padding: '6px 10px', textAlign: 'left', width: 120, color: '#1f2937' };

        return (
            <div style={{ display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end', marginBottom: 20 }}>
                <table style={{ width: isThermo ? '100%' : 280, borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr style={rowStyle}>
                            <td style={cellLabelStyle}>{t('subtotal') || 'المجموع الفرعي'}</td>
                            <td style={cellValueStyle}>{formatCurrency(invoice.subtotal || invoice.total)}</td>
                        </tr>
                        {invoice.discount > 0 && (
                            <tr style={rowStyle}>
                                <td style={cellLabelStyle}>{t('discount') || 'الخصم'}</td>
                                <td style={{ ...cellValueStyle, color: '#000', fontWeight: 700 }}>- {formatCurrency(invoice.discount)}</td>
                            </tr>
                        )}
                        {invoice.tax > 0 && (
                            <tr style={rowStyle}>
                                <td style={cellLabelStyle}>{t('tax') || 'الضريبة'}</td>
                                <td style={cellValueStyle}>{formatCurrency(invoice.tax)}</td>
                            </tr>
                        )}
                        <tr style={{ ...rowStyle, borderTop: '2px solid #9ca3af', borderBottom: '2px solid #9ca3af', fontWeight: 700, color: '#111827' }}>
                            <td style={{ ...cellLabelStyle, color: '#111827', padding: '8px 10px' }}>{t('final_total') || 'الإجمالي النهائي'}</td>
                            <td style={{ ...cellValueStyle, color: '#111827', padding: '8px 10px', fontWeight: 700 }}>{formatCurrency(invoice.total)}</td>
                        </tr>
                        {invoice.paid > 0 && invoice.paid < invoice.total && (
                            <>
                                <tr style={rowStyle}>
                                    <td style={cellLabelStyle}>{t('paid_amount') || 'المبلغ المدفوع'}</td>
                                    <td style={cellValueStyle}>{formatCurrency(invoice.paid)}</td>
                                </tr>
                                <tr style={rowStyle}>
                                    <td style={cellLabelStyle}>{t('remaining_amount') || 'المبلغ المتبقي'}</td>
                                    <td style={{ ...cellValueStyle, fontWeight: 700 }}>{formatCurrency(invoice.total - invoice.paid)}</td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const BottomLayout = () => {
        const cleanNotes = (invoice.notes || '').trim();
        const posTranslations = [
            'نقاط البيع',
            'نقطة البيع (pos)',
            'نقطة البيع',
            'point of sale',
            'pos',
            (t('pos') || '').trim(),
            (t('menu_pos') || '').trim()
        ].map(s => s.toLowerCase());
        const hasNotes = cleanNotes !== '' && !posTranslations.includes(cleanNotes.toLowerCase());
        const notesFontSize = bodyFontSizeNum;
        const smallFontSize = bodyFontSizeNum - 1;
        const footerFontSize = bodyFontSizeNum - 2;

        return (
            <div style={{ marginTop: 25, color: '#1f2937' }}>
                {showNotes && hasNotes && (
                    <div style={{ padding: '8px 12px', border: '1px solid #ccc', borderRight: isRtl ? 'none' : '3px solid #9ca3af', borderLeft: isRtl ? '3px solid #9ca3af' : 'none', marginBottom: 12, fontSize: notesFontSize }}>
                        <strong>{t('notes_label') || 'Notes:'}</strong> {invoice.notes}
                    </div>
                )}
                {invoiceTerms && (
                    <div style={{ padding: '8px 12px', background: '#f9f9f9', border: '1px solid #e5e7eb', marginBottom: 12, fontSize: smallFontSize, color: '#374151', lineHeight: 1.4 }}>
                        <strong>{t('terms_label') || 'Terms & Conditions:'}</strong>
                        <div style={{ marginTop: 4 }}>
                            {invoiceTerms.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                    </div>
                )}
                {showSignature && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '30px 0 20px', paddingTop: 10 }}>
                        <div style={{ textAlign: 'center', width: isThermo ? '45%' : 200 }}>
                            <div style={{ borderTop: '1px solid #9ca3af', marginTop: 40, paddingTop: 5, fontSize: smallFontSize, color: '#374151' }}>{t('receiver_signature') || 'Receiver Signature'}</div>
                        </div>
                        <div style={{ textAlign: 'center', width: isThermo ? '45%' : 200 }}>
                            <div style={{ borderTop: '1px solid #9ca3af', marginTop: 40, paddingTop: 5, fontSize: smallFontSize, color: '#374151' }}>{t('manager_signature') || 'Manager Signature'}</div>
                        </div>
                    </div>
                )}
                <div style={{ borderTop: '1px solid #9ca3af', paddingTop: 12, textAlign: 'center', color: '#4b5563', fontSize: smallFontSize, marginTop: 15 }}>
                    {thankYouMsg && <p style={{ fontWeight: 700, color: '#111827', marginBottom: 4, fontSize: notesFontSize }}>{thankYouMsg}</p>}
                    {invoiceFooter && <p style={{ marginBottom: 4 }}>{invoiceFooter}</p>}
                    {companyAddress && <p style={{ marginBottom: 4, fontWeight: 600, color: '#374151' }}><strong>{t('address') || 'العنوان'}:</strong> {companyAddress}</p>}
                    <p style={{ marginTop: 6, fontSize: footerFontSize, color: '#6b7280' }}>{companyName} — {new Date().getFullYear()}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 920, height: '92vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{t('preview') || 'Preview'} — {invoice.invoice_number}</h3>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {invoice.image && (
                            <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px', gap: '4px' }}>
                                <button 
                                    className={`btn btn-sm ${activeTab === 'invoice' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setActiveTab('invoice')}
                                    style={{ fontSize: '0.8rem', padding: '4px 12px', margin: 0 }}
                                >
                                    📄 {t('invoice_preview') || 'معاينة الفاتورة'}
                                </button>
                                <button 
                                    className={`btn btn-sm ${activeTab === 'attachment' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setActiveTab('attachment')}
                                    style={{ fontSize: '0.8rem', padding: '4px 12px', margin: 0 }}
                                >
                                    🖼️ {t('invoice_attachment') || 'المرفق'}
                                </button>
                            </div>
                        )}
                        {activeTab === 'invoice' && (
                            <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ {t('print') || 'Print'}</button>
                        )}
                        <button className="modal-close" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 0, background: 'var(--bg-secondary)' }}>
                    {activeTab === 'invoice' ? (
                        <div style={{ maxWidth: previewWidth, margin: '20px auto', background: 'white', color: '#1f2937', padding: isThermo ? '20px 15px' : (paperSize === 'A3' ? '40px' : paperSize === 'A5' ? '20px' : '28px'), boxShadow: '0 4px 20px rgba(0,0,0,.12)', borderRadius: 6 }}>
                            {type === 'quotation' && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '10px 16px', borderRadius: 8, textAlign: 'center', marginBottom: 18, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    ⚠️ {t('quotation_not_invoice_banner') || 'عرض سعر مالي - ليس فاتورة ضريبية'}
                                </div>
                            )}
                            <HeaderLayout />
                            <TableLayout />
                            <TotalsLayout />
                            <BottomLayout />

                            <div style={{ marginTop: 18, textAlign: 'center', paddingTop: 14, borderTop: '1px solid #eee' }}>
                                <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '10px 30px', fontSize: 14 }}>🖨️ {t('print_invoice') || 'Print Invoice'}</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '24px', gap: '16px' }}>
                            <div style={{ maxWidth: '100%', maxHeight: '70vh', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', background: 'var(--bg-primary)', boxShadow: 'var(--shadow-md)', overflow: 'auto' }}>
                                <img src={invoice.image} alt="Invoice Attachment" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', display: 'block', borderRadius: '8px' }} />
                            </div>
                            <a 
                                href={invoice.image} 
                                download={`attachment_${invoice.invoice_number}.jpg`} 
                                className="btn btn-primary" 
                                style={{ textDecoration: 'none' }}
                            >
                                📥 {t('download_attachment') || 'تحميل المرفق'}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

}

export default InvoicePrintPreview;
