import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
    Building2, User, Settings as SettingsIcon, CheckCircle, 
    Upload, ShieldCheck, Eye, EyeOff,
    Check, Languages, ArrowRight, ArrowLeft
} from 'lucide-react';
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
        admin_username: 'manager',
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
            toast.error(t('setup_company_name_required') || 'اسم الشركة مطلوب للبدء');
            return;
        }
        if (step === 2 && (!formData.admin_username || !formData.admin_password)) {
            toast.error(t('setup_admin_required') || 'اسم المستخدم وكلمة المرور مطلوبان');
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
            toast.error(t('error_occurred') || 'حدث خطأ أثناء تحميل الشعار');
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const result = await window.api.system.runSetup(formData);
            if (result.success) {
                toast.success(t('setup_complete_success') || 'تم تهيئة النظام بنجاح!');
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

    const stepsList = [
        { num: 1, icon: Building2, label: t('setup_step1') || 'بيانات الشركة', desc: t('setup_step1_desc') || 'الاسم والشعار والعملة' },
        { num: 2, icon: User, label: t('setup_step2') || 'حساب المدير', desc: t('setup_step2_desc') || 'بيانات تسجيل الدخول اليومية' },
        { num: 3, icon: SettingsIcon, label: t('setup_step3') || 'التفضيلات', desc: t('setup_step3_desc') || 'خيارات البيع والمخزون' }
    ];

    return (
        <div className="setup-wizard-wrapper" style={{ 
            minHeight: '100vh', 
            width: '100vw',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'var(--bg-secondary)', 
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
        }}>
            {/* Embedded CSS for custom styling, floating background, glassmorphism and responsiveness */}
            <style dangerouslySetInnerHTML={{ __html: `
                .setup-wizard-wrapper {
                    --accent-gradient: linear-gradient(135deg, var(--primary, #2563eb), #6366f1);
                }
                @keyframes float-orb {
                    0% { transform: translateY(0px) scale(1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                    100% { transform: translateY(0px) scale(1); }
                }
                .setup-bg-orb-1 {
                    position: absolute;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0) 70%);
                    top: -150px;
                    left: -150px;
                    animation: float-orb 15s infinite ease-in-out;
                    pointer-events: none;
                    z-index: 0;
                }
                .setup-bg-orb-2 {
                    position: absolute;
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, rgba(99, 102, 241, 0) 70%);
                    bottom: -200px;
                    right: -200px;
                    animation: float-orb 20s infinite ease-in-out reverse;
                    pointer-events: none;
                    z-index: 0;
                }
                .glass-card-premium {
                    background: var(--glass-bg, rgba(255, 255, 255, 0.72));
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.35));
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.07);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1;
                }
                [data-theme='dark'] .glass-card-premium {
                    --glass-bg: rgba(30, 41, 59, 0.6);
                    --glass-border: rgba(255, 255, 255, 0.08);
                }
                .glow-input {
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    padding: 12px 16px;
                    font-size: 0.95rem;
                    outline: none;
                    transition: all 0.25s ease;
                    width: 100%;
                    box-sizing: border-box;
                }
                .glow-input:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px var(--primary-light);
                }
                .step-sidebar {
                    background: linear-gradient(180deg, rgba(37, 99, 235, 0.02) 0%, rgba(99, 102, 241, 0.04) 100%);
                    border-inline-end: 1px solid var(--border);
                }
                [data-theme='dark'] .step-sidebar {
                    background: linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
                }
                @media (max-width: 850px) {
                    .setup-container {
                        flex-direction: column !important;
                    }
                    .step-sidebar {
                        width: 100% !important;
                        border-inline-end: none !important;
                        border-bottom: 1px solid var(--border);
                        padding: 24px !important;
                        display: flex;
                        flex-direction: row !important;
                        justify-content: space-around;
                        align-items: center;
                    }
                    .step-sidebar-logo-text {
                        display: none !important;
                    }
                    .step-list-vertical {
                        flex-direction: row !important;
                        gap: 16px !important;
                        margin: 0 !important;
                        width: 100%;
                        justify-content: center;
                    }
                    .step-list-vertical-item-desc {
                        display: none !important;
                    }
                    .step-list-vertical-item {
                        padding: 0 !important;
                    }
                    .setup-content-area {
                        padding: 24px !important;
                    }
                }
            ` }} />

            {/* Glowing background shapes */}
            <div className="setup-bg-orb-1"></div>
            <div className="setup-bg-orb-2"></div>

            {/* ══════════════════════════════════════════════════════════════════════
                GATE SCREEN — must verify admin password before accessing setup
                ══════════════════════════════════════════════════════════════════════ */}
            {!gateUnlocked ? (
                <div className="glass-card-premium" style={{
                    width: '100%',
                    maxWidth: '440px',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{ padding: '40px 32px 24px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'inline-flex', padding: 12, borderRadius: 16, background: 'rgba(37,99,235,0.06)', marginBottom: 16 }}>
                            <img src={appIcon} alt="Vero" style={{ width: 56, height: 56, objectFit: 'contain' }} />
                        </div>
                        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                            {t('setup_gate_title') || 'تأكيد صلاحية الإعداد'}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
                            {t('setup_gate_desc') || 'يرجى التحقق من هويتك كمسؤول للنظام للبدء في تهيئة الشركة الجديدة'}
                        </p>
                    </div>

                    {/* Form */}
                    <div style={{ padding: '32px' }}>
                        {gateError && (
                            <div style={{
                                padding: '12px 16px', marginBottom: 20, borderRadius: 10,
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                fontSize: '0.85rem', fontWeight: 500, textAlign: 'center',
                                border: '1px solid rgba(239,68,68,0.15)'
                            }}>
                                ⚠️ {gateError}
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 18 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('login_username') || 'اسم المستخدم'}</label>
                            <input
                                type="text"
                                className="glow-input"
                                style={{ direction: 'ltr' }}
                                value={gateUsername}
                                onChange={e => setGateUsername(e.target.value)}
                                placeholder="admin"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleGateSubmit()}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('login_password') || 'كلمة المرور'}</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showGatePassword ? 'text' : 'password'}
                                    className="glow-input"
                                    style={{ paddingInlineEnd: '44px', direction: 'ltr' }}
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
                                        left: 'auto',
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
                                gap: 10, padding: '13px 24px', fontSize: '1rem', borderRadius: 10,
                                background: 'var(--accent-gradient)', border: 'none', boxShadow: '0 4px 15px rgba(37,99,235,0.2)'
                            }}
                        >
                            {gateLoading ? (
                                <div className="spinner" style={{ width: 18, height: 18, borderLightColor: '#fff' }}></div>
                            ) : (
                                <ShieldCheck size={20} />
                            )}
                            {t('setup_gate_verify') || 'التحقق وبدء الإعداد'}
                        </button>
                    </div>
                </div>
            ) : (
                /* ══════════════════════════════════════════════════════════════════════
                    SETUP WIZARD — Split Screen Layout (Step Sidebar + Content area)
                    ══════════════════════════════════════════════════════════════════════ */
                <div className="glass-card-premium setup-container" style={{
                    width: '100%',
                    maxWidth: '920px',
                    borderRadius: '24px',
                    display: 'flex',
                    flexDirection: 'row',
                    maxHeight: 'calc(100vh - 48px)',
                    overflow: 'hidden'
                }}>
                    
                    {/* LEFT/RIGHT SIDEBAR: Visual Progress Steps */}
                    {step > 0 && (
                        <div className="step-sidebar" style={{
                            width: '320px',
                            padding: '40px 30px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                            flexShrink: 0
                        }}>
                            {/* App Logo & Header */}
                            <div className="step-sidebar-logo-text" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
                                <img src={appIcon} alt="Vero" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                                <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: 0.5, color: 'var(--text-primary)' }}>Vero DB</span>
                            </div>

                            {/* Vertical Steps Timeline */}
                            <div className="step-list-vertical" style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1, marginBlockStart: 20 }}>
                                {stepsList.map(s => {
                                    const isActive = step === s.num;
                                    const isCompleted = step > s.num;
                                    return (
                                        <div key={s.num} className="step-list-vertical-item" style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 16,
                                            position: 'relative'
                                        }}>
                                            {/* Connector line */}
                                            {s.num < 3 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 36,
                                                    left: isArabic ? 'auto' : 18,
                                                    right: isArabic ? 18 : 'auto',
                                                    width: 2,
                                                    height: 32,
                                                    background: step > s.num ? 'var(--primary)' : 'var(--border)',
                                                    transition: 'background 0.3s ease'
                                                }} />
                                            )}

                                            {/* Circle step number / Icon */}
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isCompleted ? 'var(--primary)' : (isActive ? 'var(--primary-light)' : 'var(--bg-primary)'),
                                                color: isCompleted ? '#fff' : (isActive ? 'var(--primary)' : 'var(--text-muted)'),
                                                border: `2px solid ${isActive || isCompleted ? 'var(--primary)' : 'var(--border)'}`,
                                                boxShadow: isActive ? '0 0 12px var(--primary-light)' : 'none',
                                                transition: 'all 0.3s ease',
                                                flexShrink: 0
                                            }}>
                                                {isCompleted ? <Check size={18} strokeWidth={3} /> : <s.icon size={16} />}
                                            </div>

                                            {/* Text descriptions */}
                                            <div className="step-list-vertical-item-desc" style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ 
                                                    fontSize: '0.9rem', 
                                                    fontWeight: isActive ? 700 : 500, 
                                                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                                                }}>
                                                    {s.label}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {s.desc}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bottom helpful message/state */}
                            <div className="step-sidebar-logo-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Languages size={14} />
                                <span>{isArabic ? 'بناء شركة جديدة بلمسات سريعة' : 'Set up a new company in seconds'}</span>
                            </div>
                        </div>
                    )}

                    {/* MAIN WORKSPACE: Form display and navigation */}
                    <div className="setup-content-area" style={{ 
                        flex: 1, 
                        padding: '40px 48px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        boxSizing: 'border-box',
                        overflowY: 'auto'
                    }}>
                        
                        {/* ── Step 0: Welcome & Language Selection ── */}
                        {step === 0 && (
                            <div className="animation-fade-in" style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '100%', 
                                textAlign: 'center',
                                paddingBlockStart: 20
                            }}>
                                <div style={{ display: 'inline-flex', padding: 14, borderRadius: 20, background: 'rgba(37,99,235,0.06)', marginBottom: 24 }}>
                                    <img src={appIcon} alt="Vero" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                                </div>
                                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px' }}>
                                    {t('setup_welcome_title') || 'مرحباً بك في Vero DB'}
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0 0 35px', maxWidth: '400px', lineHeight: 1.6 }}>
                                    {t('setup_welcome_desc') || 'أهلاً بك! دعنا نساعدك في تهيئة وتجهيز نظامك التجاري الجديد في دقائق معدودة.'}
                                </p>

                                <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => { changeLanguage('ar'); setStep(1); }}
                                        style={{
                                            padding: '16px', fontSize: '1.05rem', borderRadius: 12,
                                            background: 'var(--accent-gradient)',
                                            color: '#fff',
                                            border: 'none',
                                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.25s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                            boxShadow: '0 4px 15px rgba(37,99,235,0.15)'
                                        }}
                                    >
                                        البدء باللغة العربية
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => { changeLanguage('en'); setStep(1); }}
                                        style={{
                                            padding: '15px', fontSize: '1.05rem', borderRadius: 12,
                                            background: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer', fontWeight: 600, transition: 'all 0.25s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                                        }}
                                    >
                                        Start in English
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Step 1: Company Details ── */}
                        {step === 1 && (
                            <div className="animation-fade-in" style={{ width: '100%', maxWidth: '520px', margin: 'auto' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{t('setup_step1') || 'بيانات الشركة'}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>{t('setup_step1_desc') || 'أدخل بيانات مؤسستك لكي تظهر بشكل صحيح في الفواتير المطبوعة.'}</p>

                                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{
                                        width: 80, height: 80, borderRadius: 12, background: 'var(--bg-primary)',
                                        border: '2px dashed var(--border)', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                                    }}>
                                        {logoPreview ? (
                                            <img src={logoPreview} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} alt="Logo" />
                                        ) : (
                                            <Building2 size={32} color="var(--text-muted)" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 700 }}>{t('company_logo') || 'شعار الشركة'}</h4>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                                            {t('setup_upload_logo_hint') || 'يُفضل تحميل شعار ذو خلفية شفافة للفواتير (PNG/JPG)'}
                                        </p>
                                        <button type="button" className="btn btn-secondary" onClick={handleLogoUpload} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: '0.8rem' }}>
                                            <Upload size={14} /> {t('upload_logo') || 'تحميل الشعار'}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('company_name') || 'اسم الشركة / المؤسسة'} *</label>
                                    <input type="text" className="glow-input" name="company_name" value={formData.company_name} onChange={handleChange} autoFocus placeholder={t('company_name') || 'أدخل اسم الشركة'} />
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('phone') || 'رقم الهاتف'}</label>
                                        <input type="text" className="glow-input" name="company_phone" value={formData.company_phone} onChange={handleChange} placeholder="00000000" />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('cust_taxNumber') || 'الرقم الضريبي'}</label>
                                        <input type="text" className="glow-input" name="company_tax_number" value={formData.company_tax_number} onChange={handleChange} placeholder="أدخل الرقم الضريبي (إن وجد)" />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('address') || 'العنوان'}</label>
                                    <input type="text" className="glow-input" name="company_address" value={formData.company_address} onChange={handleChange} placeholder="مثال: الكويت، العاصمة" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('currency') || 'العملة الافتراضية'} *</label>
                                    <input type="text" className="glow-input" name="currency" value={formData.currency} onChange={handleChange} placeholder="دينار كويتي" />
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Manager Account ── */}
                        {step === 2 && (
                            <div className="animation-fade-in" style={{ width: '100%', maxWidth: '520px', margin: 'auto' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{t('setup_step2') || 'حساب المدير'}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>{t('setup_step2_desc') || 'قم بإنشاء حساب منفصل للمدير لاستخدامه في العمليات اليومية.'}</p>

                                <div className="alert alert-info" style={{ marginBottom: 24, display: 'flex', padding: 12, borderRadius: 10, background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        <strong style={{ display: 'block', marginBottom: 4, color: 'var(--primary)' }}>💡 {t('setup_admin_title') || 'ملاحظة الأمان'}</strong>
                                        <span>{t('setup_admin_help') || 'سيكون هذا حساب المدير الأساسي الخاص بك وسيملك صلاحيات كاملة في النظام.'}</span>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 18 }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('name') || 'الاسم الكامل للمدير'}</label>
                                    <input type="text" className="glow-input" name="admin_name" value={formData.admin_name} onChange={handleChange} autoFocus placeholder={t('manager') || 'مدير النظام'} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 18 }}>
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('login_username') || 'اسم مستخدم الحساب'} *</label>
                                    <input type="text" className="glow-input" style={{ direction: 'ltr' }} name="admin_username" value={formData.admin_username} onChange={handleChange} placeholder="manager" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: 6 }}>{t('login_password') || 'كلمة مرور الحساب'} *</label>
                                    <input type="password" className="glow-input" style={{ direction: 'ltr' }} name="admin_password" value={formData.admin_password} onChange={handleChange} placeholder="••••••••" />
                                </div>
                            </div>
                        )}

                        {/* ── Step 3: Preferences ── */}
                        {step === 3 && (
                            <div className="animation-fade-in" style={{ width: '100%', maxWidth: '520px', margin: 'auto' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{t('setup_step3') || 'التفضيلات'}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 24px' }}>{t('setup_step3_desc') || 'قم بتخصيص خيارات العمل بما يناسب طريقة عملك.'}</p>

                                <div style={{ 
                                    marginBottom: 20, 
                                    padding: '16px', 
                                    background: 'var(--bg-secondary)', 
                                    borderRadius: 12, 
                                    border: '1px solid var(--border)' 
                                }}>
                                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            name="allow_negative_stock" 
                                            checked={formData.allow_negative_stock} 
                                            onChange={handleChange} 
                                            style={{ width: 18, height: 18, cursor: 'pointer', marginBlockStart: 2 }} 
                                        />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{t('allow_negative_stock') || 'السماح بالبيع بالسالب (دون توفر مخزون)'}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                {t('desc_negative_stock') || 'تفعيل هذا الخيار يسمح ببيع المنتجات حتى لو نفدت الكمية من المخازن'}
                                            </div>
                                        </div>
                                    </label>
                                </div>



                                <div className="alert alert-success" style={{ 
                                    marginTop: 20, 
                                    padding: 16, 
                                    borderRadius: 12, 
                                    background: 'rgba(34,197,94,0.06)', 
                                    border: '1px solid rgba(34,197,94,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12
                                }}>
                                    <CheckCircle size={24} color="#22c55e" style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong style={{ display: 'block', fontSize: '0.88rem', color: '#16a34a', marginBottom: 2 }}>{t('setup_ready_title') || 'جاهز للبدء!'}</strong>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            {t('setup_ready_desc') || 'اضغط على زر (إنهاء التهيئة) لحفظ إعداداتك وتشغيل النظام بالكامل.'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Controls */}
                        {step > 0 && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBlockStart: 'auto',
                                paddingBlockStart: 20, 
                                borderTop: '1px solid var(--border)'
                            }}>
                                {step > 1 ? (
                                    <button type="button" className="btn btn-secondary" onClick={prevStep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.9rem', borderRadius: 8 }}>
                                        {isArabic ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                                        {t('previous') || 'السابق'}
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <select
                                            value={language}
                                            onChange={(e) => changeLanguage(e.target.value)}
                                            style={{
                                                padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)',
                                                background: 'var(--bg-primary)', fontSize: '0.88rem', outline: 'none', cursor: 'pointer',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <option value="ar">العربية</option>
                                            <option value="en">English</option>
                                        </select>
                                    </div>
                                )}

                                {step < 3 ? (
                                    <button type="button" className="btn btn-primary" onClick={nextStep} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', fontSize: '0.9rem', borderRadius: 8, background: 'var(--accent-gradient)', border: 'none' }}>
                                        {t('next') || 'التالي'}
                                        {isArabic ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', fontSize: '0.9rem', borderRadius: 8, background: 'var(--accent-gradient)', border: 'none' }}>
                                        {loading ? <div className="spinner" style={{ width: 16, height: 16, borderLightColor: '#fff' }}></div> : <CheckCircle size={16} />}
                                        {t('finish_setup') || 'إنهاء التهيئة'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
