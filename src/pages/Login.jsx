import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('يرجى إدخال اسم المستخدم وكلمة المرور');
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
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)',
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decoration */}
            <div style={{
                position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                top: '-100px', right: '-100px', pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                bottom: '-80px', left: '-80px', pointerEvents: 'none'
            }} />

            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '48px 40px',
                width: '100%',
                maxWidth: '420px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        width: '72px', height: '72px',
                        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                        borderRadius: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 8px 24px rgba(30,64,175,0.35)',
                        transform: 'rotate(-5deg)'
                    }}>
                        <Lock size={30} color="white" />
                    </div>
                    <h1 style={{ fontSize: '26px', color: '#0f172a', margin: '0 0 6px 0', fontWeight: '800', letterSpacing: '-0.5px' }}>
                        نظام المحاسبة
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: 400 }}>
                        قم بتسجيل الدخول للمتابعة
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                            color: '#dc2626',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            fontSize: '13px',
                            textAlign: 'center',
                            border: '1px solid #fecaca',
                            fontWeight: 500
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>
                            اسم المستخدم
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                color: '#94a3b8', pointerEvents: 'none'
                            }}>
                                <User size={18} />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="أدخل اسم المستخدم"
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '13px 44px 13px 16px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: '#f8fafc',
                                    color: '#0f172a'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.1)'; }}
                                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#374151', fontWeight: '600' }}>
                            كلمة المرور
                        </label>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                color: '#94a3b8', pointerEvents: 'none'
                            }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كلمة المرور"
                                style={{
                                    width: '100%',
                                    padding: '13px 44px 13px 44px',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontSize: '15px',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    background: '#f8fafc',
                                    color: '#0f172a'
                                }}
                                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(59,130,246,0.1)'; }}
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
                                    padding: '4px',
                                    display: 'flex',
                                    borderRadius: '6px',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: loading ? 'none' : '0 4px 16px rgba(30,64,175,0.3)',
                            letterSpacing: '0.3px'
                        }}
                        onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 24px rgba(30,64,175,0.4)'; } }}
                        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = loading ? 'none' : '0 4px 16px rgba(30,64,175,0.3)'; }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                                    borderTop: '2px solid white', borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                جاري تسجيل الدخول...
                            </>
                        ) : (
                            <>
                                <LogIn size={18} />
                                تسجيل الدخول
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid #e2e8f0',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                        المستخدم الافتراضي: <span style={{ color: '#1e40af', fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>admin</span> / <span style={{ color: '#1e40af', fontWeight: 700, fontFamily: 'monospace', fontSize: '13px' }}>password123</span>
                    </p>
                </div>
            </div>

            {/* Spin animation */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default Login;
