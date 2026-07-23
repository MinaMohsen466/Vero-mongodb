import React from 'react';
import { Shield, Users, Key, User, Save, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { Card, btnStyle, roleColor } from './shared';

export default function PermissionsSettings({
    permMode, setPermMode,
    selRole, setSelRole,
    permLoaded, loadPerms, roleName,
    PERM_CATEGORIES, PERM_KEYS,
    expandedCats, toggleCat,
    getModIcon, permState, togglePerm, savePerms,
    saving, tr, t, language,
    users, permSearch, setPermSearch,
    selUser, setSelUser, loadUserPerms,
    upHasInd, upLoading, upState, setUpState,
    saveUserPerms, clearUserPerms
}) {

    // ── Perm Toggle Cell ───────────────────────────────────────────────────────
    const PermCell = ({ has, enabled, onToggle }) => enabled ? (
        <div onClick={onToggle} style={{
            display: 'inline-flex', width: 38, height: 20, borderRadius: 10, position: 'relative',
            cursor: 'pointer', background: has ? 'linear-gradient(135deg, var(--primary), #3b82f6)' : 'var(--bg-secondary)',
            border: has ? '1px solid transparent' : '1px solid var(--border)',
            transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: has ? '0 0 8px rgba(37, 99, 235, 0.2)' : 'none'
        }}>
            <div style={{
                position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%', background: has ? '#fff' : 'var(--text-muted)',
                left: has ? 20 : 2, transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,.15)'
            }} />
        </div>
    ) : <span style={{ color: 'var(--border)', fontSize: 12 }}>—</span>;

    return (
        <>
            {/* Mode switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-secondary)', padding: 6, borderRadius: 12, border: '1px solid var(--border)' }}>
                {[{ id: 'role', label: t('role_permissions') || 'Role Permissions', icon: Shield }, { id: 'user', label: t('individual_permissions') || 'Individual Permissions', icon: Users }].map(m => (
                    <button key={m.id} onClick={() => setPermMode(m.id)} style={{
                        flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: '.875rem', fontWeight: permMode === m.id ? 700 : 400, transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
                        background: permMode === m.id ? 'linear-gradient(135deg, var(--primary), #3b82f6)' : 'transparent',
                        color: permMode === m.id ? '#fff' : 'var(--text-secondary)',
                        boxShadow: permMode === m.id ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                        <m.icon size={16} /> {m.label}
                    </button>
                ))}
            </div>

            {/* ── ROLE MODE ── */}
            {permMode === 'role' && <>
                {/* Role selector tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    {[
                        { id: 'accountant', label: tr('accountant_role', 'محاسب'), desc: 'صلاحيات متوسطة مخصصة لإدارة العمليات المالية والقيود والحسابات.', icon: Key, color: '#6366f1' },
                        { id: 'user', label: tr('user_role', 'مستخدم'), desc: 'صلاحيات محدودة مخصصة لإصدار الفواتير ونقاط البيع بدون العمليات الإدارية.', icon: User, color: '#10b981' }
                    ].map(role => {
                        const selected = selRole === role.id;
                        return (
                            <div 
                                key={role.id} 
                                onClick={() => { setSelRole(role.id); if (!permLoaded) loadPerms(); }} 
                                style={{
                                    padding: '16px 20px', 
                                    borderRadius: 14, 
                                    cursor: 'pointer', 
                                    transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    background: selected ? `linear-gradient(135deg, ${role.color}15, ${role.color}05)` : 'var(--surface)',
                                    border: selected ? `2px solid ${role.color}` : '1px solid var(--border)',
                                    boxShadow: selected ? `0 8px 24px ${role.color}15` : 'none',
                                    transform: selected ? 'translateY(-2px)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                <div style={{
                                    width: 44, 
                                    height: 44, 
                                    borderRadius: 10, 
                                    background: selected ? role.color : 'var(--bg-secondary)', 
                                    color: selected ? '#fff' : 'var(--text-secondary)',
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    transition: 'all .2s',
                                    boxShadow: selected ? `0 4px 10px ${role.color}33` : 'none'
                                }}>
                                    <role.icon size={22} />
                                </div>
                                <div style={{ flex: 1, textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{role.label}</div>
                                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>{role.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!permLoaded && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}><div className="spinner" /></div>}
                {permLoaded && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                <Shield size={20} style={{ color: 'var(--primary)' }} />
                                {tr('role_permissions', 'صلاحيات الأدوار')}: <span style={{ color: 'var(--primary)' }}>{roleName(selRole)}</span>
                            </div>
                            {selRole === 'admin' && (
                                <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                                    {tr('admin_role', 'مدير النظام')}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {PERM_CATEGORIES.map((cat) => {
                                const isExpanded = !!expandedCats[cat.id];
                                return (
                                    <div key={cat.id} style={{ 
                                        borderRadius: 14, 
                                        border: '1px solid var(--border)', 
                                        background: 'var(--surface)', 
                                        overflow: 'hidden',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                        transition: 'all 0.2s ease',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                    }}>
                                        {/* Category Header Bar */}
                                        <div 
                                            onClick={() => toggleCat(cat.id)}
                                            style={{ 
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: 'var(--surface)', 
                                                borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                padding: '16px 20px',
                                                boxSizing: 'border-box',
                                                transition: 'background 0.2s',
                                                width: '100%'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                                <div style={{ 
                                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                                    background: isExpanded ? 'var(--primary)' : 'rgba(37,99,235,0.08)', 
                                                    color: isExpanded ? '#fff' : 'var(--primary)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    <cat.icon size={18} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                                                    <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.title}</span>
                                                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                                                        {cat.modules.length} {language === 'ar' ? 'صلاحيات فرعية' : 'sub-permissions'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ 
                                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                                background: 'var(--bg-secondary)', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--text-secondary)' 
                                            }}>
                                                {isExpanded ? <ChevronDown size={16} /> : (language === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
                                            </div>
                                        </div>

                                        {/* Accordion Content Grid */}
                                        {isExpanded && (
                                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
                                                {/* Column Titles */}
                                                <div style={{ 
                                                    display: 'grid',
                                                    gridTemplateColumns: '2fr repeat(4, 1fr)',
                                                    alignItems: 'center',
                                                    background: 'var(--bg-secondary)', 
                                                    borderBottom: '1px solid var(--border-light)', 
                                                    padding: '10px 20px', 
                                                    fontWeight: 700, 
                                                    fontSize: '.78rem', 
                                                    color: 'var(--text-secondary)',
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                }}>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                                                        {tr('module', 'اسم الوحدة / الخاصية')}
                                                    </div>
                                                    {PERM_KEYS.map(pk => (
                                                        <div key={pk.key} style={{ textAlign: 'center' }}>{pk.label}</div>
                                                    ))}
                                                </div>

                                                {/* Child Module Rows */}
                                                {cat.modules.map((m, idx) => (
                                                    <div key={m.m} style={{ 
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr repeat(4, 1fr)',
                                                        alignItems: 'center', 
                                                        background: 'var(--surface)', 
                                                        borderBottom: idx === cat.modules.length - 1 ? 'none' : '1px solid var(--border-light)', 
                                                        padding: '12px 20px',
                                                        width: '100%',
                                                        boxSizing: 'border-box'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(100,116,139,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                                                {getModIcon(m.m)}
                                                            </div>
                                                            <span style={{ 
                                                                fontWeight: 600, fontSize: '.83rem', color: 'var(--text-primary)', 
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 
                                                            }} title={m.l}>
                                                                {m.l}
                                                            </span>
                                                        </div>

                                                        {PERM_KEYS.map(pk => (
                                                            <div key={pk.key} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                <PermCell has={!!permState[selRole]?.[m.m]?.[pk.key]} enabled={m.a.includes(pk.act)}
                                                                    onToggle={() => togglePerm(selRole, m.m, pk.key)} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {permLoaded && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all .2s' }} disabled={saving} onClick={savePerms}>
                        <Save size={15} /> {saving ? (tr('saving', 'جاري الحفظ...')) : (tr('save_role_permissions', 'حفظ صلاحيات الأدوار'))}
                    </button>
                </div>}
            </>}

            {/* ── INDIVIDUAL USER MODE ── */}
            {permMode === 'user' && <>
                <Card title={tr('select_user_permissions', 'اختر مستخدماً لتخصيص صلاحياته المستقلة')} icon={Users}>
                    {/* Search bar */}
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                        <input
                            placeholder={tr('search_user_placeholder', 'ابحث باسم المستخدم...')}
                            value={permSearch}
                            onChange={e => setPermSearch(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, fontSize: '.9rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all .2s' }}
                        />
                        {permSearch && (
                            <button onClick={() => { setPermSearch(''); setSelUser(null); }}
                                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center' }}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    {/* User grid */}
                    {(() => {
                        const filtered = users.filter(u =>
                            (u.id !== 1 && u.username !== 'admin' && u.role !== 'admin') && (
                                !permSearch ||
                                u.full_name?.toLowerCase().includes(permSearch.toLowerCase()) ||
                                u.username?.toLowerCase().includes(permSearch.toLowerCase()) ||
                                roleName(u.role)?.toLowerCase().includes(permSearch.toLowerCase())
                            )
                        );
                        if (users.length === 0) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '.875rem' }}>{tr('loading', 'جاري التحميل...')}</div>;
                        if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '.875rem' }}>{tr('no_results', 'لا توجد نتائج')}</div>;
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                                {filtered.map(u => {
                                    const selected = selUser?.id === u.id;
                                    return (
                                        <div key={u.id} onClick={() => { setSelUser(u); loadUserPerms(u); setPermSearch(''); }}
                                            style={{
                                                padding: '14px 16px', borderRadius: 14, cursor: 'pointer', transition: 'all .25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                border: selected ? `2px solid var(--primary)` : '1px solid var(--border)',
                                                background: selected ? 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(37,99,235,.02))' : 'var(--surface)',
                                                boxShadow: selected ? '0 8px 16px rgba(37, 99, 235, 0.08)' : 'none',
                                                transform: selected ? 'translateY(-2px)' : 'none'
                                            }}
                                        >
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor(u.role)}, ${roleColor(u.role)}88)`, color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0, fontSize: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                                                {(u.full_name || u.username || '?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || u.username}</div>
                                                <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 2 }}>@{u.username}</div>
                                                <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4, background: roleColor(u.role) + '18', color: roleColor(u.role) }}>{roleName(u.role)}</span>
                                            </div>
                                            {selected && <Check size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </Card>

                {selUser && (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                                <Shield size={20} style={{ color: 'var(--primary)' }} />
                                {tr('override_role_permissions', 'تخصيص صلاحيات المستخدم')}: <span style={{ color: 'var(--primary)' }}>{selUser.full_name || selUser.username}</span>
                            </div>
                            {upHasInd
                                ? <span style={{ fontSize: '.72rem', background: 'rgba(16,185,129,.12)', color: 'var(--success)', padding: '4px 12px', borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span> {tr('custom_permissions_badge', 'صلاحيات مخصصة مفعلة')}</span>
                                : <span style={{ fontSize: '.72rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>{tr('default_role_permissions_badge', 'مستوردة من صلاحيات الدور')}</span>}
                        </div>

                        {upLoading ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}><div className="spinner" /></div> : <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
                                {PERM_CATEGORIES.map((cat) => {
                                    const isExpanded = !!expandedCats[cat.id];
                                    return (
                                        <div key={cat.id} style={{ 
                                            borderRadius: 14, 
                                            border: '1px solid var(--border)', 
                                            background: 'var(--surface)', 
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                            transition: 'all 0.2s ease',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}>
                                            {/* Category Header Bar */}
                                            <div 
                                                onClick={() => toggleCat(cat.id)}
                                                style={{ 
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    background: 'var(--surface)', 
                                                    borderBottom: isExpanded ? '1px solid var(--border-light)' : 'none',
                                                    cursor: 'pointer',
                                                    userSelect: 'none',
                                                    padding: '16px 20px',
                                                    boxSizing: 'border-box',
                                                    transition: 'background 0.2s',
                                                    width: '100%'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                                                    <div style={{ 
                                                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                                        background: isExpanded ? 'var(--primary)' : 'rgba(37,99,235,0.08)', 
                                                        color: isExpanded ? '#fff' : 'var(--primary)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <cat.icon size={18} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                                                        <span style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.title}</span>
                                                        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                                                            {cat.modules.length} {language === 'ar' ? 'صلاحيات فرعية' : 'sub-permissions'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ 
                                                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                                    background: 'var(--bg-secondary)', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--text-secondary)' 
                                                }}>
                                                    {isExpanded ? <ChevronDown size={16} /> : (language === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)}
                                                </div>
                                            </div>

                                            {/* Accordion Content Grid */}
                                            {isExpanded && (
                                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
                                                    {/* Column Titles */}
                                                    <div style={{ 
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr repeat(4, 1fr)',
                                                        alignItems: 'center',
                                                        background: 'var(--bg-secondary)', 
                                                        borderBottom: '1px solid var(--border-light)', 
                                                        padding: '10px 20px', 
                                                        fontWeight: 700, 
                                                        fontSize: '.78rem', 
                                                        color: 'var(--text-secondary)',
                                                        width: '100%',
                                                        boxSizing: 'border-box'
                                                    }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: language === 'ar' ? 'right' : 'left' }}>
                                                            {tr('module', 'اسم الوحدة / الخاصية')}
                                                        </div>
                                                        {PERM_KEYS.map(pk => (
                                                            <div key={pk.key} style={{ textAlign: 'center' }}>{pk.label}</div>
                                                        ))}
                                                    </div>

                                                    {/* Child Module Rows */}
                                                    {cat.modules.map((m, idx) => (
                                                        <div key={m.m} style={{ 
                                                            display: 'grid',
                                                            gridTemplateColumns: '2fr repeat(4, 1fr)',
                                                            alignItems: 'center', 
                                                            background: 'var(--surface)', 
                                                            borderBottom: idx === cat.modules.length - 1 ? 'none' : '1px solid var(--border-light)', 
                                                            padding: '12px 20px',
                                                            width: '100%',
                                                            boxSizing: 'border-box'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(100,116,139,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                                                    {getModIcon(m.m)}
                                                                </div>
                                                                <span style={{ 
                                                                    fontWeight: 600, fontSize: '.83rem', color: 'var(--text-primary)', 
                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 
                                                                }} title={m.l}>
                                                                    {m.l}
                                                                </span>
                                                            </div>

                                                            {PERM_KEYS.map(pk => (
                                                                <div key={pk.key} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                                    <PermCell has={!!upState[m.m]?.[pk.key]} enabled={m.a.includes(pk.act)}
                                                                        onToggle={() => setUpState(p => ({ ...p, [m.m]: { ...p[m.m], [pk.key]: !p[m.m]?.[pk.key] } }))} />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                <button style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all .2s' }} disabled={saving} onClick={saveUserPerms}>
                                    <Save size={15} /> {saving ? (tr('saving', 'جاري الحفظ...')) : (tr('save_individual_permissions', 'حفظ الصلاحيات المخصصة للمستخدم'))}
                                </button>
                                {upHasInd && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                    disabled={saving} onClick={clearUserPerms}>
                                    <RefreshCw size={14} /> {tr('reset_to_role_permissions', 'إعادة ضبط إلى صلاحيات الدور الافتراضية')}
                                </button>}
                            </div>
                        </>}
                    </div>
                )}
            </>}
        </>
    );
}
