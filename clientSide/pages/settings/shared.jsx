import React from 'react';

// ── Compact Toggle ────────────────────────────────────────────────────────────
export const Tog = ({ on, onChange, small }) => {
    const sz = small ? { w: 36, h: 20, ball: 14, on: 18, off: 3 } : { w: 44, h: 24, ball: 18, on: 23, off: 3 };
    return (
        <div onClick={onChange} style={{
            width: sz.w, height: sz.h, borderRadius: sz.h, position: 'relative',
            background: on ? 'var(--primary)' : 'var(--border)', transition: 'background .2s', cursor: 'pointer', flexShrink: 0
        }}>
            <div style={{
                position: 'absolute', top: sz.off, width: sz.ball, height: sz.ball,
                borderRadius: '50%', background: '#fff', transition: 'left .2s',
                left: on ? sz.on - sz.ball + sz.off : sz.off, boxShadow: '0 1px 3px rgba(0,0,0,.2)'
            }} />
        </div>
    );
};

// ── Section Card ──────────────────────────────────────────────────────────────
export const Card = ({ title, icon: Icon, action, children }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px',
            borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '.9rem' }}>
                {Icon && <Icon size={16} style={{ color: 'var(--primary)' }} />} {title}
            </div>
            {action}
        </div>
        <div style={{ padding: 20 }}>{children}</div>
    </div>
);

// ── Toggle Row ────────────────────────────────────────────────────────────────
export const TRow = ({ label, desc, value, onChange }) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0', borderBottom: '1px solid var(--border-light)'
    }}>
        <div>
            <div style={{ fontSize: '.875rem', fontWeight: 500 }}>{label}</div>
            {desc && <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{desc}</div>}
        </div>
        <Tog on={value === 'yes' || value === true} onChange={() => onChange(value === 'yes' || value === true ? 'no' : 'yes')} />
    </div>
);

// ── Field ─────────────────────────────────────────────────────────────────────
export const Fld = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, fontSize: '.875rem', color: 'var(--text-secondary)' }}>{label}</label>
        {children}
    </div>
);

export const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '.875rem', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', transition: 'border-color .15s'
};

export const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
    border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.875rem', fontWeight: 500, fontFamily: 'inherit'
};

export const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };

export const COLORS = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#000000'];

export const roleColor = r => r === 'admin' ? '#ef4444' : r === 'accountant' ? '#6366f1' : '#10b981';
