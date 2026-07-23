import React from 'react';
import { Palette, Globe, Settings as Ico, Check, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, Fld, TRow, inp, btnStyle, gridTwo, COLORS } from './shared';

export default function GeneralSettings({ gen, setGen, saving, setSaving, saveSetting, isSuperAdmin, t }) {
    return (
        <>
            <Card title={t('brand_color_customization') || 'تخصيص لون هوية النظام'} icon={Palette}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    {COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setGen(f => ({ ...f, brand_color: c }))} style={{
                            width: 36, height: 36, borderRadius: '50%', background: c, border: gen.brand_color === c ? '3px solid var(--text-primary)' : '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all 0.15s', outline: 'none', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {gen.brand_color === c && <Check size={16} style={{ color: c === '#ffffff' ? '#000' : '#fff' }} />}
                        </button>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12, marginLeft: 12 }}>
                        <span style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>{t('custom_color') || 'لون مخصص'}:</span>
                        <input type="color" value={gen.brand_color || '#2563eb'} onChange={e => setGen(f => ({ ...f, brand_color: e.target.value }))} style={{
                            border: 'none', background: 'none', width: 32, height: 32, cursor: 'pointer', outline: 'none'
                        }} />
                        <input type="text" value={gen.brand_color || '#2563eb'} onChange={e => setGen(f => ({ ...f, brand_color: e.target.value }))} style={{
                            ...inp, width: 90, padding: '4px 8px', fontSize: '.8rem', textTransform: 'uppercase'
                        }} />
                    </div>
                </div>
            </Card>

            <Card title={t('currency_and_numbers') || 'Currency & Numbers'} icon={Globe}>
                <div style={gridTwo}>
                    <Fld label={t('currency_name') || 'Currency Name'}><input style={inp} value={gen.currency} onChange={e => setGen(f => ({ ...f, currency: e.target.value }))} /></Fld>
                    <Fld label={t('currency_symbol') || 'Currency Symbol'}><input style={inp} value={gen.currency_symbol} onChange={e => setGen(f => ({ ...f, currency_symbol: e.target.value }))} /></Fld>
                </div>
                <div style={gridTwo}>
                    <Fld label={t('tax_rate_percent') || 'Tax Rate (%)'}>
                        <input style={inp} type="number" value={gen.tax_rate} onChange={e => setGen(f => ({ ...f, tax_rate: e.target.value }))} />
                    </Fld>
                    <Fld label={t('decimal_places') || 'Decimal Places'}>
                        <select style={inp} value={gen.decimal_places} onChange={e => setGen(f => ({ ...f, decimal_places: e.target.value }))}>
                            <option value="2">2 {t('digits') || 'Digits'}</option>
                            <option value="3">3 {t('digits') || 'Digits'}</option>
                        </select>
                    </Fld>
                </div>
                <div style={gridTwo}>
                    <Fld label={t('language') || 'Language'}>
                        <select style={inp} value={gen.language} onChange={e => setGen(f => ({ ...f, language: e.target.value }))}>
                            <option value="ar">العربية</option>
                            <option value="en">English</option>
                        </select>
                    </Fld>
                </div>
            </Card>
            <Card title={t('sales_options') || 'Sales Options'} icon={Ico}>
                <TRow label={t('allow_negative_stock') || 'Allow Negative Stock'} desc={t('desc_negative_stock') || 'Allows completing sales even when stock is depleted'} value={gen.allow_negative_stock} onChange={v => setGen(f => ({ ...f, allow_negative_stock: v }))} />
                <TRow label={t('enable_product_color') || 'Enable Product Color Field'} desc={t('desc_product_color') || 'Add color field for paint products (Drum, Gallon, Liter)'} value={gen.enable_product_color} onChange={v => setGen(f => ({ ...f, enable_product_color: v }))} />
                <TRow label={t('show_purchase_price_in_pos') || 'Show Purchase Price in POS'} desc={t('desc_show_purchase_price_in_pos') || 'Show an eye icon on products in POS to quickly view the purchase price'} value={gen.show_purchase_price_in_pos} onChange={v => setGen(f => ({ ...f, show_purchase_price_in_pos: v }))} />
                {isSuperAdmin && (
                    <TRow label={t('allow_manager_excel') || 'إمكانية رؤية المدير لشيت الإكسيل المصغر'} desc={t('allow_manager_excel_desc') || 'السماح أو المنع للمدير والموظفين من رؤية قسم برنامج Excel المصغر وتصديره'} value={gen.allow_manager_excel} onChange={v => setGen(f => ({ ...f, allow_manager_excel: v }))} />
                )}
            </Card>
            <Card title={t('system_sounds') || 'أصوات وتنبيهات النظام'} icon={Globe}>
                <TRow label={t('enable_pos_sounds') || 'تفعيل أصوات نقطة البيع'} desc={t('desc_pos_sounds') || 'إصدار صوت خفيف عند مسح الباركود وإتمام الدفع بنجاح'} value={gen.enable_pos_sounds} onChange={v => setGen(f => ({ ...f, enable_pos_sounds: v }))} />
                <TRow label={t('enable_alert_sounds') || 'تفعيل تنبيهات التحذير الصوتية'} desc={t('desc_alert_sounds') || 'إصدار نغمة تنبيه عند حدوث خطأ أو ظهور نافذة تنبيه'} value={gen.enable_alert_sounds} onChange={v => setGen(f => ({ ...f, enable_alert_sounds: v }))} />
            </Card>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        await Promise.all([
                            ...Object.entries(gen).map(([k, v]) => k === 'tax_rate' ? saveSetting('tax', k, v) : saveSetting('general', k, v))
                        ]);
                        toast.success(t('savedSuccess') || 'Settings saved successfully'); window.dispatchEvent(new Event('settingsUpdated'));
                        setSaving(false);
                    }}>
                    <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_general_settings') || 'Save General Settings')}
                </button>
            </div>
        </>
    );
}
