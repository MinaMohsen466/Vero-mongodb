import React from 'react';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, Tog, btnStyle, roleColor } from './shared';

export default function UsersSettings({ users, setUsers, user, roleName, setEditingUser, setUserForm, setShowPw, setShowUserModal, t }) {
    return (
        <Card title={t('user_management') || 'User Management'} icon={Users} action={
            user?.id === 1 ? (
                <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', padding: '7px 14px' }}
                    onClick={() => { setEditingUser(null); setUserForm({ username: '', password: '', full_name: '', role: 'user' }); setShowPw(false); setShowUserModal(true); }}>
                    <Plus size={14} /> {t('new_user') || 'New User'}
                </button>
            ) : null
        }>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        {[t('user') || 'User', t('role') || 'Role', t('status') || 'Status', t('actions') || 'Actions'].map(h => (
                            <th key={h} style={{ padding: '9px 12px', textAlign: 'right', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', background: roleColor(u.role),
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0
                                    }}>
                                        {(u.full_name || u.username || '?')[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{u.full_name || u.username}</div>
                                        <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600,
                                    background: roleColor(u.role) + '18', color: roleColor(u.role)
                                }}>
                                    {roleName(u.role)}
                                </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                                {u.id === 1
                                    ? <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('protected') || 'Protected'}</span>
                                    : user?.id === 1 ? <Tog on={!!u.is_active} onChange={async () => {
                                        await window.api.users.update({ ...u, is_active: u.is_active ? 0 : 1 });
                                        window.api.users.getAll().then(setUsers);
                                    }} /> : <span style={{ fontSize: '.75rem', color: u.is_active ? 'var(--success)' : 'var(--text-muted)' }}>{u.is_active ? (t('active') || 'نشط') : (t('inactive') || 'غير نشط')}</span>}
                            </td>
                            <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {user?.id === 1 && (
                                        <button style={{ ...btnStyle, padding: '5px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                            onClick={() => { setEditingUser(u); setUserForm({ username: u.username, password: '', full_name: u.full_name || '', role: u.role }); setShowPw(false); setShowUserModal(true); }}>
                                            <Edit2 size={13} />
                                        </button>
                                    )}
                                    {user?.id === 1 && u.id !== 1 && (
                                        <button style={{ ...btnStyle, padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', color: 'var(--danger)' }}
                                            onClick={async () => { if (confirm(t('delete_user_confirm') || 'Delete user?')) { await window.api.users.delete(u.id); window.api.users.getAll().then(setUsers); } }}>
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                    {user?.id !== 1 && (
                                        <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('no_permission') || 'لا تملك صلاحية'}</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}
