import React from 'react';
import { FileText, Printer, Eye, Barcode, Save } from 'lucide-react';
import LiveInvoicePreview from './LiveInvoicePreview';
import { Card, Fld, TRow, inp, btnStyle, gridTwo, COLORS } from './shared';

export default function PrintInvoiceSettings({ inv, setInv, co, logoPreview, saveSection, saving, printConf, setPrintConf, printers, t }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
            {/* Live Invoice Preview Sticky Widget */}
            <div style={{ position: 'sticky', top: 20 }}>
                <LiveInvoicePreview inv={inv} co={co} logoPreview={logoPreview} t={t} />
            </div>
            
            {/* Print Invoice Settings Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Card title={t('invoice_titles') || 'Invoice Titles'} icon={FileText}>
                    <div style={gridTwo}>
                        <Fld label={t('sales_invoice_title') || 'Sales Invoice Title'}><input style={inp} value={inv.invoice_title_sales} onChange={e => setInv(f => ({ ...f, invoice_title_sales: e.target.value }))} /></Fld>
                        <Fld label={t('purchase_invoice_title') || 'Purchase Invoice Title'}><input style={inp} value={inv.invoice_title_purchase} onChange={e => setInv(f => ({ ...f, invoice_title_purchase: e.target.value }))} /></Fld>
                    </div>
                    <Fld label={t('welcome_message_top') || 'Welcome Message (Top)'}>
                        <input style={inp} value={inv.thank_you_message} onChange={e => setInv(f => ({ ...f, thank_you_message: e.target.value }))} placeholder={t('thank_you_business') || 'Thank you for your business'} />
                    </Fld>
                    <Fld label={t('footer_bottom') || 'Footer (Bottom)'}>
                        <input style={inp} value={inv.invoice_footer} onChange={e => setInv(f => ({ ...f, invoice_footer: e.target.value }))} />
                    </Fld>
                    <Fld label={t('terms_and_conditions') || 'Terms & Conditions'}>
                        <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={inv.invoice_terms} onChange={e => setInv(f => ({ ...f, invoice_terms: e.target.value }))} />
                    </Fld>
                </Card>

                <Card title={t('voucher_settings') || 'Voucher Settings'} icon={Printer}>
                    <div style={gridTwo}>
                        <Fld label={t('receipt_voucher_title') || 'Receipt Voucher Title'}><input style={inp} value={inv.voucher_title_receipt} onChange={e => setInv(f => ({ ...f, voucher_title_receipt: e.target.value }))} /></Fld>
                        <Fld label={t('payment_voucher_title') || 'Payment Voucher Title'}><input style={inp} value={inv.voucher_title_payment} onChange={e => setInv(f => ({ ...f, voucher_title_payment: e.target.value }))} /></Fld>
                    </div>
                    <Fld label={t('voucher_footer') || 'Voucher Footer'}><input style={inp} value={inv.voucher_footer} onChange={e => setInv(f => ({ ...f, voucher_footer: e.target.value }))} /></Fld>
                </Card>

                <Card title={t('show_hide_options') || 'Show/Hide Options'} icon={Eye}>
                    <TRow label={t('show_company_logo') || 'Show Company Logo'} value={inv.show_logo} onChange={v => setInv(f => ({ ...f, show_logo: v }))} />
                    <TRow label={t('show_company_info') || 'Show Company Info'} value={inv.show_company_info} onChange={v => setInv(f => ({ ...f, show_company_info: v }))} />
                    <TRow label={t('show_invoice_notes') || 'Show Invoice Notes'} value={inv.show_notes} onChange={v => setInv(f => ({ ...f, show_notes: v }))} />
                    <TRow label={t('show_signature_area') || 'Show Signature Area'} value={inv.show_signature} onChange={v => setInv(f => ({ ...f, show_signature: v }))} />
                    <TRow label={t('show_discount_column') || 'Show Discount Column'} value={inv.show_discount_column} onChange={v => setInv(f => ({ ...f, show_discount_column: v }))} />
                    <TRow label={t('show_tax_column') || 'Show Tax Column'} value={inv.show_tax_column} onChange={v => setInv(f => ({ ...f, show_tax_column: v }))} />
                </Card>

                <Card title={t('paper_size_orientation') || 'Paper Size & Orientation'} icon={FileText}>
                    <div style={gridTwo}>
                        <Fld label={t('paper_size') || 'Paper Size'}>
                            <select style={inp} value={inv.paper_size} onChange={e => {
                                const val = e.target.value;
                                const isThermal = val.startsWith('thermal');
                                setInv(f => ({
                                    ...f,
                                    paper_size: val,
                                    ...(isThermal ? { paper_orientation: 'portrait' } : {})
                                }));
                            }}>
                                <option value="A3">A3</option>
                                <option value="A4">A4</option>
                                <option value="A5">A5</option>
                                <option value="Letter">Letter</option>
                                <option value="Legal">Legal</option>
                                <option value="thermal_110">{t('thermal_110') || 'Thermal 110mm'}</option>
                                <option value="thermal_80">{t('thermal_80') || 'Thermal 80mm'}</option>
                                <option value="thermal_76">{t('thermal_76') || 'Thermal 76mm'}</option>
                                <option value="thermal_58">{t('thermal_58') || 'Thermal 58mm'}</option>
                                <option value="thermal_57">{t('thermal_57') || 'Thermal 57mm'}</option>
                            </select>
                        </Fld>
                        <Fld label={t('paper_orientation') || 'Orientation'}>
                            <select style={inp} disabled={inv.paper_size && inv.paper_size.startsWith('thermal')} value={inv.paper_size && inv.paper_size.startsWith('thermal') ? 'portrait' : inv.paper_orientation} onChange={e => setInv(f => ({ ...f, paper_orientation: e.target.value }))}>
                                <option value="portrait">{t('portrait') || 'Portrait'}</option>
                                <option value="landscape">{t('landscape') || 'Landscape'}</option>
                            </select>
                        </Fld>
                    </div>
                    <div style={gridTwo}>
                        <Fld label={t('invoice_logo_position') || 'موضع الشعار بالفاتورة'}>
                            <select style={inp} value={inv.logo_position || 'center'} onChange={e => setInv(f => ({ ...f, logo_position: e.target.value }))}>
                                <option value="right">{t('right') || 'يمين'}</option>
                                <option value="center">{t('center') || 'وسط'}</option>
                                <option value="left">{t('left') || 'يسار'}</option>
                            </select>
                        </Fld>
                        <Fld label={t('invoice_logo_size') || 'حجم الشعار بالفاتورة'}>
                            <select style={inp} value={inv.logo_size || 'medium'} onChange={e => setInv(f => ({ ...f, logo_size: e.target.value }))}>
                                <option value="small">{t('small') || 'صغير'}</option>
                                <option value="medium">{t('medium') || 'متوسط'}</option>
                                <option value="large">{t('large') || 'كبير'}</option>
                            </select>
                        </Fld>
                    </div>
                    <Fld label={t('invoice_print_color') || 'لون الطباعة الأساسي بالفاتورة'}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {COLORS.map(c => (
                                <button key={c} type="button" onClick={() => setInv(f => ({ ...f, print_color: c }))} style={{
                                    width: 32, height: 32, borderRadius: '50%', background: c, border: inv.print_color === c ? '3px solid var(--text-primary)' : '1px solid var(--border)',
                                    cursor: 'pointer', transition: 'all 0.15s', outline: 'none'
                                }} />
                            ))}
                            <input type="color" value={inv.print_color || '#2563eb'} onChange={e => setInv(f => ({ ...f, print_color: e.target.value }))} style={{
                                border: 'none', background: 'none', width: 32, height: 32, cursor: 'pointer', outline: 'none'
                            }} />
                        </div>
                    </Fld>
                </Card>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                        onClick={() => saveSection('invoice', inv, t('saved_print_settings') || 'Print settings saved')}>
                        <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_print_settings') || 'Save Print Settings')}
                    </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', margin: '10px 0' }} />

                <Card title={t('hardware_settings') || 'إعدادات الأجهزة والطباعة'} icon={Printer}>
                    <div style={gridTwo}>
                        <Fld label={t('pos_printer') || 'طابعة الكاشير (حرارية)'}>
                            <select style={inp} value={printConf.pos_printer || ''} onChange={e => setPrintConf(f => ({ ...f, pos_printer: e.target.value }))}>
                                <option value="">{t('none') || 'لا يوجد / طابعة افتراضية'}</option>
                                {printers.map(p => (
                                    <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                                ))}
                            </select>
                        </Fld>
                        <Fld label={t('invoice_printer') || 'طابعة الفواتير (A4)'}>
                            <select style={inp} value={printConf.invoice_printer || ''} onChange={e => setPrintConf(f => ({ ...f, invoice_printer: e.target.value }))}>
                                <option value="">{t('none') || 'لا يوجد / طابعة افتراضية'}</option>
                                {printers.map(p => (
                                    <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                                ))}
                            </select>
                        </Fld>
                    </div>
                    
                    <TRow 
                        label={t('silent_printing') || 'الطباعة المباشرة الصامتة'} 
                        desc={t('pos_silent_print_desc') || 'طباعة الإيصال فوراً دون عرض نافذة النظام'} 
                        value={printConf.pos_silent_print} 
                        onChange={v => setPrintConf(f => ({ ...f, pos_silent_print: v }))} 
                    />
                    <TRow 
                        label={t('silent_printing_invoice') || 'الطباعة الصامتة للفاتورة كبيرة الحجم'} 
                        desc={t('invoice_silent_print_desc') || 'طباعة الفاتورة الكبيرة فوراً دون عرض نافذة النظام'} 
                        value={printConf.invoice_silent_print} 
                        onChange={v => setPrintConf(f => ({ ...f, invoice_silent_print: v }))} 
                    />
                </Card>

                <Card title={t('barcode_settings') || 'إعدادات قارئ الباركود'} icon={Barcode}>
                    <TRow 
                        label={t('enable_global_barcode') || 'تفعيل قارئ الباركود الذكي'} 
                        desc={t('enable_global_barcode_desc') || 'الاستماع التلقائي لمسح الباركود وإضافته مباشرة إلى السلة في أي جزء من شاشة المبيعات'} 
                        value={printConf.enable_global_barcode} 
                        onChange={v => setPrintConf(f => ({ ...f, enable_global_barcode: v }))} 
                    />
                </Card>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                        onClick={() => saveSection('printing', printConf, t('savedSuccess') || 'Saved successfully')}>
                        <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
