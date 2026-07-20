import React, { useState, useEffect, useRef } from 'react';
import { User, Key, Shield, LogOut, X, Save, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

const roleColor = r => r === 'admin' ? '#ef4444' : r === 'accountant' ? '#6366f1' : '#10b981';
const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '.875rem', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none'
};

export default function UserProfilePanel() {
    const { user, logout, updateUser, t } = useAuth();
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState('info'); // 'info' | 'password'
    const [showPw, setShowPw] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ full_name: '', current_password: '', new_password: '', confirm_password: '' });
    const panelRef = useRef(null);

    const roleName = r => r === 'admin' ? (t('admin_role') || 'Admin') : r === 'accountant' ? (t('accountant_role') || 'Accountant') : (t('user_role') || 'User');

    useEffect(() => {
        if (user) setForm(f => ({ ...f, full_name: user.full_name || '' }));
    }, [user]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const saveName = async () => {
        if (!form.full_name.trim()) return;
        setSaving(true);
        try {
            await window.api.users.update({ ...user, full_name: form.full_name });
            updateUser({ ...user, full_name: form.full_name });
            toast.success(t('updated_success') || 'Updated successfully');
        } catch { toast.error(t('errorOccurred') || 'An error occurred'); }
        setSaving(false);
    };

    const changePassword = async () => {
        if (!form.current_password) {
            toast.error(t('current_password_required') || 'يرجى إدخال كلمة المرور الحالية'); return;
        }
        if (!form.new_password || form.new_password !== form.confirm_password) {
            toast.error(t('passwords_dont_match') || 'Passwords do not match'); return;
        }
        if (form.new_password.length < 4) {
            toast.error(t('password_too_short') || 'Password too short (min 4 chars)'); return;
        }
        setSaving(true);
        try {
            const r = await window.api.users.update({ ...user, password: form.new_password, current_password: form.current_password });
            if (r?.success === false) throw new Error(r.error || 'Failed');
            
            // Password changed, ideally no Context update needed since password isn't stored in memory/context safely.
            toast.success(t('password_changed') || 'Password changed successfully');
            setForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
        } catch (e) { toast.error(e.message || (t('errorOccurred') || 'An error occurred')); }
        setSaving(false);
    };

    if (!user) return null;

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                    background: open ? 'rgba(37,99,235,.08)' : 'var(--bg-secondary)',
                    border: '1px solid ' + (open ? 'var(--primary)' : 'var(--border)'),
                    borderRadius: '24px', cursor: 'pointer', transition: 'all .2s ease',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={e => {
                    if (!open) {
                        e.currentTarget.style.background = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                }}
                onMouseLeave={e => {
                    if (!open) {
                        e.currentTarget.style.background = 'var(--bg-secondary)';
                        e.currentTarget.style.transform = 'none';
                    }
                }}
            >
                <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${roleColor(user.role)}, ${roleColor(user.role)}99)`,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.95rem', flexShrink: 0
                }}>
                    {(user.full_name || user.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{user.full_name || user.username}</div>
                    <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{roleName(user.role)}</div>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 14, width: 300, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
                    overflow: 'hidden', animation: 'slideDown .15s ease'
                }}>
                    {/* Header */}
                    <div style={{
                        background: `linear-gradient(135deg, ${roleColor(user.role)}22, ${roleColor(user.role)}08)`,
                        padding: '16px 16px 12px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '50%',
                                background: `linear-gradient(135deg, ${roleColor(user.role)}, ${roleColor(user.role)}99)`,
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '1.2rem', boxShadow: `0 2px 8px ${roleColor(user.role)}44`
                            }}>
                                {(user.full_name || user.username || 'U')[0].toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user.full_name || user.username}</div>
                                <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                                <span style={{
                                    background: roleColor(user.role) + '22', color: roleColor(user.role),
                                    fontSize: '.68rem', fontWeight: 700, padding: '1px 8px', borderRadius: 20, display: 'inline-block', marginTop: 2
                                }}>{roleName(user.role)}</span>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                        {[{ id: 'info', icon: User, label: t('profile') || 'Profile' }, { id: 'password', icon: Key, label: t('password') || 'Password' }].map(tb => (
                            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
                                background: tab === tb.id ? 'var(--surface)' : 'transparent',
                                borderBottom: tab === tb.id ? '2px solid var(--primary)' : '2px solid transparent',
                                color: tab === tb.id ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: tab === tb.id ? 600 : 400, fontSize: '.78rem', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                            }}>
                                <tb.icon size={13} /> {tb.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div style={{ padding: 16 }}>
                        {tab === 'info' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, fontSize: '.8rem', color: 'var(--text-secondary)' }}>{t('full_name') || 'Full Name'}</label>
                                <input style={{ ...inp, marginBottom: 12 }} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, fontSize: '.8rem', color: 'var(--text-secondary)' }}>{t('username') || 'Username'}</label>
                                <input style={{ ...inp, marginBottom: 14, opacity: .6 }} value={user.username} readOnly />
                                <button onClick={saveName} disabled={saving} style={{
                                    width: '100%', padding: '9px', background: 'var(--primary)', color: '#fff',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '.85rem'
                                }}>
                                    <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save Changes')}
                                </button>
                            </div>
                        )}

                        {tab === 'password' && (
                            <div>
                                {[
                                    { key: 'current_password', label: t('current_password') || 'Current Password' },
                                    { key: 'new_password', label: t('new_password') || 'New Password' },
                                    { key: 'confirm_password', label: t('confirm_password') || 'Confirm Password' },
                                ].map(({ key, label }) => (
                                    <div key={key} style={{ marginBottom: 10 }}>
                                        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '.78rem', color: 'var(--text-secondary)' }}>{label}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPw ? 'text' : 'password'}
                                                style={{ ...inp, paddingLeft: 36 }}
                                                value={form[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            />
                                            {key === 'new_password' && (
                                                <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={changePassword} disabled={saving} style={{
                                    width: '100%', marginTop: 4, padding: '9px', background: 'var(--primary)', color: '#fff',
                                    border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '.85rem'
                                }}>
                                    <Key size={14} /> {saving ? (t('saving') || 'Saving...') : (t('change_password') || 'Change Password')}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                        <button onClick={logout} style={{
                            width: '100%', padding: '8px', background: 'rgba(239,68,68,.08)',
                            color: 'var(--danger)', border: '1px solid rgba(239,68,68,.2)',
                            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '.82rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}>
                            <LogOut size={14} /> {t('logout') || 'Logout'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
