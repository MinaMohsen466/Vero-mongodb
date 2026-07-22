import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import appIcon from '../assets/icon.png';
import { useAuth } from '../App';

function Login({ onLogin }) {
    const { t } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError(t('login_enter_credentials') || 'يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        setLoading(true);
        const result = await onLogin(username, password);
        setLoading(false);

        if (!result.success) {
            setError(result.message);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '24px',
            boxSizing: 'border-box',
            overflow: 'auto',
            zIndex: 999999
        }}>
            {/* Ambient Background Soft Glow Circles */}
            <div style={{
                position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
                top: '-200px', right: '-200px', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
                bottom: '-150px', left: '-150px', pointerEvents: 'none'
            }} />

            {/* Login Card */}
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '44px 38px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                position: 'relative',
                zIndex: 2,
                boxSizing: 'border-box',
                margin: 'auto'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '96px',
                        height: '96px',
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(99,102,241,0.08))',
                        borderRadius: '24px',
                        padding: '12px',
                        boxShadow: '0 8px 24px rgba(37,99,235,0.15)',
                        border: '1px solid rgba(37,99,235,0.1)'
                    }}>
                        <img
                            src={appIcon}
                            alt="Vero"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 6px 16px rgba(37,99,235,0.35))'
                            }}
                        />
                    </div>
                    <h1 style={{ fontSize: '30px', color: '#1e3a8a', margin: '0 0 6px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
                        Vero
                    </h1>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>
                        {t('login_continue') || 'قم بتسجيل الدخول للمتابعة إلى حسابك'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            fontSize: '13px',
                            textAlign: 'center',
                            border: '1px solid #fecaca',
                            fontWeight: 600
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Username */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#334155', fontWeight: '700' }}>
                            {t('username') || 'اسم المستخدم'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center'
                            }}>
                                <User size={19} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder={t('enter_username') || 'أدخل اسم المستخدم'}
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '13px 44px 13px 16px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '14px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    boxSizing: 'border-box',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontWeight: 500
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.12)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '26px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#334155', fontWeight: '700' }}>
                            {t('password') || 'كلمة المرور'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                color: '#94a3b8', pointerEvents: 'none', display: 'flex', alignItems: 'center'
                            }}>
                                <Lock size={19} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('enter_password') || 'أدخل كلمة المرور'}
                                style={{
                                    width: '100%',
                                    padding: '13px 44px 13px 44px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '14px',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    boxSizing: 'border-box',
                                    background: '#f8fafc',
                                    color: '#0f172a',
                                    fontWeight: 500
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.12)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s ease',
                                    zIndex: 10
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.08)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '14px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.25s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: loading ? 'none' : '0 6px 20px rgba(37,99,235,0.35)'
                        }}
                        onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 28px rgba(37,99,235,0.45)'; } }}
                        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = loading ? 'none' : '0 6px 20px rgba(37,99,235,0.35)'; }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                                    borderTop: '2px solid white', borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                {t('signing_in') || 'جاري تسجيل الدخول...'}
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                {t('sign_in') || 'تسجيل الدخول'}
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}>
                    <ShieldCheck size={15} style={{ color: '#64748b' }} />
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 500 }}>
                        {t('login_help') || 'في حال نسيت كلمة المرور، يرجى التواصل مع مدير النظام الرئيسي'}
                    </p>
                </div>
            </div>

            {/* Spin animation */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default Login;
