import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Building2, User, Settings as SettingsIcon, CheckCircle, MoveRight, MoveLeft, Upload, Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import appIcon from '../assets/icon.png';

export default function SetupWizard({ onComplete, t, language, changeLanguage }) {
    // Gate state
    const [gateUnlocked, setGateUnlocked] = useState(false);
    const [gateUsername, setGateUsername] = useState('');
    const [gatePassword, setGatePassword] = useState('');
    const [showGatePassword, setShowGatePassword] = useState(false);
    const [gateLoading, setGateLoading] = useState(false);
    const [gateError, setGateError] = useState('');

    // Setup wizard state (after gate)
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [logoPreview, setLogoPreview] = useState('');

    const [formData, setFormData] = useState({
        company_name: '',
        company_phone: '',
        company_address: '',
        company_tax_number: '',
        currency: 'دينار كويتي',
        admin_name: '',
        admin_username: 'admin',
        admin_password: '',
        allow_negative_stock: false,
        invoice_template: 'modern',
        company_logo: null
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // ── Gate: Verify admin password ──
    const handleGateSubmit = async () => {
        if (!gateUsername || !gatePassword) {
            setGateError(t('setup_gate_fields_required') || 'يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }
        setGateLoading(true);
        setGateError('');
        try {
            const result = await window.api.system.verifySetupAccess(gateUsername, gatePassword);
            if (result.success) {
                setGateUnlocked(true);
                toast.success(t('setup_gate_success') || 'تم التحقق بنجاح');
            } else {
                setGateError(t('setup_gate_wrong_password') || 'اسم المستخدم أو كلمة المرور غير صحيحة');
            }
        } catch (e) {
            console.error(e);
            setGateError(t('error_occurred') || 'حدث خطأ');
        }
        setGateLoading(false);
    };

    const nextStep = () => {
        if (step === 1 && !formData.company_name) {
            toast.error(t('setup_company_name_required') || 'Company Name is required');
            return;
        }
        if (step === 2 && (!formData.admin_username || !formData.admin_password)) {
            toast.error(t('setup_admin_required') || 'Admin username and password are required');
            return;
        }
        setStep(s => s + 1);
    };

    const prevStep = () => setStep(s => s - 1);

    const handleLogoUpload = async () => {
        try {
            const fileResult = await window.api.dialog.openFile({
                properties: ['openFile'],
                filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] }]
            });

            if (!fileResult.canceled && fileResult.filePaths.length > 0) {
                const srcPath = fileResult.filePaths[0];
                const logoPath = await window.api.file.copyLogo(srcPath);
                if (logoPath) {
                    setFormData(prev => ({ ...prev, company_logo: logoPath }));
                    if (window.api.file.readAsBase64) {
                        const b64 = await window.api.file.readAsBase64(logoPath);
                        if (b64) setLogoPreview(b64);
                    }
                }
            }
        } catch (e) {
            console.error(e);
            toast.error(t('error_occurred') || 'An error occurred');
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const result = await window.api.system.runSetup(formData);
            if (result.success) {
                toast.success(t('setup_complete_success') || 'Setup completed successfully!');
                onComplete(formData.admin_username, formData.admin_password);
            } else {
                toast.error(result.error || t('error_occurred'));
            }
        } catch (e) {
            console.error(e);
            toast.error(t('error_occurred'));
        }
        setLoading(false);
    };

    const isArabic = language === 'ar';
    const NextIcon = isArabic ? MoveLeft : MoveRight;
    const PrevIcon = isArabic ? MoveRight : MoveLeft;

    // ══════════════════════════════════════════════════════════════════════
    // GATE SCREEN — must verify admin password before accessing setup
    // ══════════════════════════════════════════════════════════════════════
    if (!gateUnlocked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '20px' }}>
                <div style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'var(--bg-primary)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{ padding: '40px 40px 30px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                        <img src={appIcon} alt="Vero" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 16 }} />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                            {t('setup_gate_title') || 'تأكيد صلاحية الإعداد'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                            {t('setup_gate_desc') || 'أدخل بيانات الأدمن للسماح بإنشاء شركة جديدة'}
                        </p>
                    </div>

                    {/* Form */}
                    <div style={{ padding: '30px 40px 40px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
                        }}>
                            <div style={{
                                width: 56, height: 56, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), #6366f1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 6px 20px rgba(37,99,235,0.25)'
                            }}>
                                <Lock size={24} color="#fff" />
                            </div>
                        </div>

                        {gateError && (
                            <div style={{
                                padding: '10px 14px', marginBottom: 16, borderRadius: 8,
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                fontSize: '0.875rem', fontWeight: 500, textAlign: 'center',
                                border: '1px solid rgba(239,68,68,0.2)'
                            }}>
                                {gateError}
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">{t('login_username') || 'اسم المستخدم'}</label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ padding: '12px 14px', fontSize: '1rem', direction: 'ltr' }}
                                value={gateUsername}
                                onChange={e => setGateUsername(e.target.value)}
                                placeholder="admin"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleGateSubmit()}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">{t('login_password') || 'كلمة المرور'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showGatePassword ? 'text' : 'password'}
                                    className="form-input"
                                    style={{ padding: '12px 44px 12px 14px', fontSize: '1rem', direction: 'ltr', width: '100%', boxSizing: 'border-box' }}
                                    value={gatePassword}
                                    onChange={e => setGatePassword(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleGateSubmit()}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGatePassword(!showGatePassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        padding: '4px',
                                        display: 'flex',
                                        borderRadius: '6px',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                                    title={showGatePassword ? t('hide_password') || 'Hide password' : t('show_password') || 'Show password'}
                                >
                                    {showGatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleGateSubmit}
                            disabled={gateLoading}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 8, padding: '12px 24px', fontSize: '1.05rem', borderRadius: 10
                            }}
                        >
                            {gateLoading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            ) : (
                                <ShieldCheck size={20} />
                            )}
                            {t('setup_gate_verify') || 'تحقق وابدأ الإعداد'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    // SETUP WIZARD — only accessible after gate verification
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '20px' }}>
            <div style={{
                width: '100%',
                maxWidth: '900px',
                background: 'var(--bg-primary)',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(100vh - 40px)',
                overflow: 'hidden'
            }}>

                {/* Header Section */}
                <div style={{ padding: '40px 40px 30px', textAlign: 'center', borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                    <img src={appIcon} alt="Vero" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 20 }} />
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                        {t('setup_welcome_title') || 'Welcome to Vero'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        {t('setup_welcome_desc') || 'Let\'s set up your application in a few steps.'}
                    </p>
                </div>

                <div style={{ padding: '30px 40px', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    {/* Progress Steps */}
                    {step > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 50, position: 'relative', maxWidth: '600px', margin: '0 auto 50px', width: '100%' }}>
                            <div style={{ position: 'absolute', top: 16, left: 30, right: 30, height: 3, background: 'var(--border)', zIndex: 0 }}>
                                <div style={{ width: `${((step - 1) / 2) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                            </div>

                            {[
                                { num: 1, icon: Building2, label: t('setup_step1') || 'Company' },
                                { num: 2, icon: User, label: t('setup_step2') || 'Manager' },
                                { num: 3, icon: SettingsIcon, label: t('setup_step3') || 'Preferences' }
                            ].map(s => (
                                <div key={s.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, position: 'relative' }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: step >= s.num ? 'var(--primary)' : 'var(--bg-primary)',
                                        color: step >= s.num ? 'white' : 'var(--text-muted)',
                                        border: `3px solid ${step >= s.num ? 'var(--primary)' : 'var(--border)'}`,
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}>
                                        {step > s.num ? <CheckCircle size={20} /> : <s.icon size={18} />}
                                    </div>
                                    <span style={{ fontSize: '0.9rem', marginTop: 12, fontWeight: step >= s.num ? 600 : 400, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Forms Container */}
                    <div style={{ flex: 1, padding: '0 5px' }}>

                        {/* ── Step 0: Language Selection ── */}
                        {step === 0 && (
                            <div className="animation-fade-in" style={{ maxWidth: '400px', margin: '40px auto 0', textAlign: 'center' }}>
                                <h3 style={{ marginBottom: 30, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                                    {t('setup_select_language') || 'Please select your preferred language'}
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <button
                                        type="button"
                                        onClick={() => { changeLanguage('ar'); setStep(1); }}
                                        style={{
                                            padding: '16px', fontSize: '1.2rem', borderRadius: 12,
                                            background: language === 'ar' ? 'var(--primary)' : 'var(--bg-secondary)',
                                            color: language === 'ar' ? '#fff' : 'var(--text-primary)',
                                            border: `2px solid ${language === 'ar' ? 'var(--primary)' : 'var(--border)'}`,
                                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                        }}
                                    >
                                        العربية
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { changeLanguage('en'); setStep(1); }}
                                        style={{
                                            padding: '16px', fontSize: '1.2rem', borderRadius: 12,
                                            background: language === 'en' ? 'var(--primary)' : 'var(--bg-secondary)',
                                            color: language === 'en' ? '#fff' : 'var(--text-primary)',
                                            border: `2px solid ${language === 'en' ? 'var(--primary)' : 'var(--border)'}`,
                                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                        }}
                                    >
                                        English
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 1: Company Details ── */}
                        {step === 1 && (
                            <div className="animation-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                                    <div style={{
                                        width: 100, height: 100, borderRadius: 12, background: 'var(--bg-secondary)',
                                        border: '2px dashed var(--border)', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                                    }}>
                                        {logoPreview ? (
                                            <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt="Logo" />
                                        ) : (
                                            <Building2 size={40} color="var(--text-muted)" />
                                        )}    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>{t('company_logo') || 'Company Logo'}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                                            {t('setup_upload_logo_hint') || 'Upload a high-quality logo for invoices (PNG/JPG)'}
                                        </p>
                                        <button type="button" className="btn btn-secondary" onClick={handleLogoUpload} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
                                            <Upload size={18} /> {t('upload_logo') || 'Upload Logo'}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t('company_name') || 'Company Name'} *</label>
                                    <input type="text" className="form-input" name="company_name" value={formData.company_name} onChange={handleChange} autoFocus placeholder={t('company_name') || 'Company Name'} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{t('phone') || 'Phone'}</label>
                                        <input type="text" className="form-input" name="company_phone" value={formData.company_phone} onChange={handleChange} placeholder="00000000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{t('cust_taxNumber') || 'Tax Number'}</label>
                                        <input type="text" className="form-input" name="company_tax_number" value={formData.company_tax_number} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('address') || 'Address'}</label>
                                    <input type="text" className="form-input" name="company_address" value={formData.company_address} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('currency') || 'Currency'} *</label>
                                    <input type="text" className="form-input" name="currency" value={formData.currency} onChange={handleChange} placeholder="دينار كويتي" />
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Admin Account ── */}
                        {step === 2 && (
                            <div className="animation-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <div className="alert alert-info" style={{ marginBottom: 30, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div>
                                        <strong style={{ display: 'block', marginBottom: 4 }}>{t('setup_admin_title') || 'Manager Account'}</strong>
                                        <span>{t('setup_admin_help') || 'This will be your separate manager account for everyday access.'}</span>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">{t('name') || 'Full Name'}</label>
                                    <input type="text" className="form-input" style={{ padding: '12px 14px', fontSize: '1rem' }} name="admin_name" value={formData.admin_name} onChange={handleChange} autoFocus placeholder={t('manager') || 'Company Manager'} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 20 }}>
                                    <label className="form-label">{t('login_username') || 'Username'} *</label>
                                    <input type="text" className="form-input" style={{ padding: '12px 14px', fontSize: '1rem', direction: 'ltr' }} name="admin_username" value={formData.admin_username} onChange={handleChange} placeholder="admin" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('login_password') || 'Password'} *</label>
                                    <input type="password" className="form-input" style={{ padding: '12px 14px', fontSize: '1rem', direction: 'ltr' }} name="admin_password" value={formData.admin_password} onChange={handleChange} />
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Preferences ── */}
                        {step === 3 && (
                            <div className="animation-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                <div style={{ marginBottom: 24, padding: '20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                        <input type="checkbox" name="allow_negative_stock" checked={formData.allow_negative_stock} onChange={handleChange} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{t('allow_negative_stock') || 'Allow Negative Stock'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('desc_negative_stock') || 'Allow selling items when out of stock'}</div>
                                        </div>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('invoice_template') || 'Invoice Template'}</label>
                                    <select className="form-input" name="invoice_template" value={formData.invoice_template} onChange={handleChange}>
                                        <option value="modern">{t('modern_desc') || 'Modern'}</option>
                                        <option value="classic">{t('classic_desc') || 'Classic B&W'}</option>
                                        <option value="professional">{t('professional_desc') || 'Professional'}</option>
                                        <option value="minimal">{t('minimal_desc') || 'Minimal'}</option>
                                    </select>
                                </div>

                                <div className="alert alert-success" style={{ marginTop: 20 }}>
                                    <strong>{t('setup_ready_title') || 'All Set!'}</strong><br />
                                    {t('setup_ready_desc') || 'Click finish to save your settings and start using the application.'}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* End Forms Container */}

                    {/* Footer Controls */}
                    {step > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', maxWidth: '600px', margin: '40px auto 0', width: '100%' }}>
                            {step > 1 ? (
                                <button type="button" className="btn btn-secondary" onClick={prevStep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '1rem' }}>
                                    <PrevIcon size={18} /> {t('previous') || 'Previous'}
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <select
                                        value={language}
                                        onChange={(e) => changeLanguage(e.target.value)}
                                        style={{
                                            padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)',
                                            background: 'var(--bg-primary)', fontSize: '0.95rem', outline: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        <option value="ar">العربية</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            )}

                            {step < 3 ? (
                                <button type="button" className="btn btn-primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: '1rem', borderRadius: 8 }}>
                                    {t('next') || 'Next'} <NextIcon size={18} />
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: '1rem', borderRadius: 8 }}>
                                    {loading ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <CheckCircle size={18} />}
                                    {t('finish_setup') || 'Finish Setup'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
