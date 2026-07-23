import React, { useRef } from 'react';
import { Image, Building2, Upload, X, Save } from 'lucide-react';
import { Card, Fld, inp, btnStyle, gridTwo } from './shared';

export default function CompanySettings({ co, setCo, logoPreview, setLogoPreview, handleLogo, saveSection, saving, tr }) {
    const dropRef = useRef(null);

    return (
        <>
            <Card title={tr('company_logo', 'شعار الشركة')} icon={Image}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Logo drop zone */}
                    <div ref={dropRef} onClick={handleLogo}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                        onDrop={async e => {
                            e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)';
                            const file = e.dataTransfer.files[0];
                            if (file) {
                                const final = window.api?.file?.copyLogo ? (await window.api.file.copyLogo(file.path)) || file.path : file.path;
                                setCo(f => ({ ...f, company_logo: final }));
                                const b64 = await window.api.file?.readAsBase64?.(final);
                                if (b64) setLogoPreview(b64);
                            }
                        }}
                        style={{
                            width: 110, height: 110, borderRadius: 12, border: '2px dashed var(--border)',
                            background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', overflow: 'hidden', flexShrink: 0, transition: 'border-color .2s'
                        }}>
                        {logoPreview
                            ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Image size={32} /><div style={{ fontSize: '.72rem', marginTop: 6 }}>{tr('drag_or_click_logo', 'أسحب واسقط اللوجو هنا أو انقر للاختيار')}</div></div>}
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                            {tr('logo_hint', 'أسحب واسقط الشعار هنا أو انقر للاختيار. يظهر الشعار على الفواتير والسندات المطبوعة.')}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={handleLogo}>
                                <Upload size={14} /> {tr('upload_logo', 'رفع الشعار')}
                            </button>
                            {logoPreview && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--danger)' }}
                                onClick={() => { setLogoPreview(''); setCo(f => ({ ...f, company_logo: '' })); }}>
                                <X size={14} /> {tr('remove', 'حذف')}
                            </button>}
                        </div>
                    </div>
                </div>
            </Card>

            <Card title={tr('company_details', 'بيانات الشركة')} icon={Building2}>
                <div style={gridTwo}>
                    <Fld label={tr('company_name', 'اسم الشركة / المؤسسة')}><input style={inp} value={co.company_name} onChange={e => setCo(f => ({ ...f, company_name: e.target.value }))} /></Fld>
                    <Fld label={tr('tax_number', 'الرقم الضريبي / السجل التجاري')}><input style={inp} value={co.company_tax_number} onChange={e => setCo(f => ({ ...f, company_tax_number: e.target.value }))} /></Fld>
                </div>
                <div style={gridTwo}>
                    <Fld label={tr('phone', 'رقم الهاتف')}><input style={inp} value={co.company_phone} onChange={e => setCo(f => ({ ...f, company_phone: e.target.value }))} /></Fld>
                    <Fld label={tr('email', 'البريد الإلكتروني')}><input style={inp} value={co.company_email} onChange={e => setCo(f => ({ ...f, company_email: e.target.value }))} /></Fld>
                </div>
                <Fld label={tr('address', 'العنوان')}><input style={inp} value={co.company_address} onChange={e => setCo(f => ({ ...f, company_address: e.target.value }))} /></Fld>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                        onClick={() => saveSection('company', co, tr('saved_company_details', 'تم حفظ بيانات الشركة بنجاح'))}>
                        <Save size={14} /> {saving ? (tr('saving', 'جاري الحفظ...')) : (tr('save', 'حفظ التغييرات'))}
                    </button>
                </div>
            </Card>
        </>
    );
}
