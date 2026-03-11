import React, { useState, useEffect, useRef } from 'react';
import {
    Settings as Ico, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield,
    Image, FolderOpen, HardDrive, FileText, Palette, Globe, AlertTriangle, Save,
    RefreshCw, Download, Upload, Eye, EyeOff, ChevronRight, X, Check
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

// ── Compact Toggle ────────────────────────────────────────────────────────────
const Tog = ({ on, onChange, small }) => {
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
const Card = ({ title, icon: Icon, action, children }) => (
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
const TRow = ({ label, desc, value, onChange }) => (
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
const Fld = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', marginBottom: 5, fontWeight: 500, fontSize: '.875rem', color: 'var(--text-secondary)' }}>{label}</label>
        {children}
    </div>
);

const inp = {
    width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '.875rem', fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text-primary)',
    outline: 'none', transition: 'border-color .15s'
};

// ── Color Preset Swatch ───────────────────────────────────────────────────────
const COLORS = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#000000'];
const roleColor = r => r === 'admin' ? '#ef4444' : r === 'accountant' ? '#6366f1' : '#10b981';

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
    const { user, t } = useAuth();

    const roleName = r => r === 'admin' ? (t('admin_role') || 'Admin') : r === 'accountant' ? (t('accountant_role') || 'Accountant') : (t('user_role') || 'User');

    const PERM_MODS = [
        { m: 'dashboard', l: t('dashboard') || 'Dashboard', a: ['view'] },
        { m: 'customers', l: t('customers') || 'Customers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'suppliers', l: t('suppliers') || 'Suppliers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'products', l: t('products') || 'Products', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'sales_invoices', l: t('sales_invoices') || 'Sales Invoices', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'purchase_invoices', l: t('purchase_invoices') || 'Purchase Invoices', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'receipt_vouchers', l: t('receipt_vouchers') || 'Receipt Vouchers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'payment_vouchers', l: t('payment_vouchers') || 'Payment Vouchers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'chart_of_accounts', l: t('chart_of_accounts') || 'Chart of Accounts', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'cash_bank', l: t('cash_bank') || 'Cash & Bank', a: ['view', 'create'] },
        { m: 'journal_entries', l: t('journal_entries') || 'Journal Entries', a: ['view', 'create', 'delete'] },
        { m: 'hr', l: t('hr') || 'HR', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'pos', l: t('pos') || 'POS', a: ['view', 'create'] },
        { m: 'reports', l: t('reports') || 'Reports', a: ['view'] },
        { m: 'settings', l: t('settings') || 'Settings', a: ['view', 'edit'] },
        { m: 'users', l: t('users') || 'Users', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'permissions', l: t('permissions') || 'Permissions', a: ['view', 'edit'] },
        { m: 'database', l: t('database_management') || 'Database', a: ['view'] },
    ];

    const PERM_KEYS = [
        { key: 'can_view', label: t('view') || 'View', act: 'view' },
        { key: 'can_create', label: t('create') || 'Create', act: 'create' },
        { key: 'can_edit', label: t('edit') || 'Edit', act: 'edit' },
        { key: 'can_delete', label: t('delete') || 'Delete', act: 'delete' },
    ];
    const isAdmin = user?.role === 'admin';
    const [sec, setSec] = useState('company');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);
    const [dbPath, setDbPath] = useState('');
    const [dbSize, setDbSize] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'user' });
    const [permState, setPermState] = useState({ accountant: {}, user: {} });
    const [permLoaded, setPermLoaded] = useState(false);
    const [selUser, setSelUser] = useState(null);
    const [upState, setUpState] = useState({});
    const [upHasInd, setUpHasInd] = useState(false);
    const [upLoading, setUpLoading] = useState(false);
    const upUserIdRef = useRef(null); // tracks which user we're loading for (prevents race conditions)
    const dropRef = useRef(null);

    const [co, setCo] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_tax_number: '', company_logo: '' });
    const [gen, setGen] = useState({
        currency: t('default_currency') || 'Kuwaiti Dinar', currency_symbol: t('currency_kd') || 'KD', tax_rate: '0', decimal_places: '3',
        allow_negative_stock: 'no', show_financial_summary: 'yes', show_low_stock_products: 'yes', show_customer_receivables: 'yes',
        show_sales_purchases_charts: 'yes', language: 'en'
    });
    const [inv, setInv] = useState({
        invoice_title_sales: t('sales_invoice') || 'Sales Invoice', invoice_title_purchase: t('purchase_invoice') || 'Purchase Invoice',
        thank_you_message: t('thank_you_business') || 'Thank you for your business', invoice_footer: '', invoice_terms: '',
        show_logo: 'yes', show_company_info: 'yes', show_notes: 'yes', show_signature: 'no',
        show_discount_column: 'yes', show_tax_column: 'no',
        logo_position: 'center', logo_size: 'medium', print_color: '#2563eb',
        paper_size: 'A4', paper_orientation: 'portrait', invoice_template: 'modern',
        voucher_title_receipt: t('receipt_voucher') || 'Receipt Voucher', voucher_title_payment: t('payment_voucher') || 'Payment Voucher', voucher_footer: ''
    });

    const SECTIONS = [
        { id: 'company', l: t('company_details') || 'Company Details', icon: Building2 },
        { id: 'general', l: t('general_settings') || 'General Settings', icon: Ico },
        { id: 'print_invoice', l: t('invoice_settings') || 'Invoice Settings', icon: FileText },
        { id: 'print_identity', l: t('visual_identity') || 'Visual Identity', icon: Palette },
        ...(isAdmin ? [
            { id: 'users', l: t('users') || 'Users', icon: Users },
            { id: 'permissions', l: t('role_permissions') || 'Role Permissions', icon: Shield },
            { id: 'user_permissions', l: t('individual_permissions') || 'Individual Permissions', icon: Users },
        ] : []),
        { id: 'database', l: t('database') || 'Database', icon: Database },
    ];

    // ── Load data ──────────────────────────────────────────────────────────────
    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (sec === 'permissions' && !permLoaded) loadPerms(); }, [sec]);

    const loadData = async () => {
        try {
            const [sd, ud] = await Promise.all([window.api.settings.getAll(), window.api.users.getAll()]);
            setUsers(ud || []);
            if (sd?.company) setCo(prev => ({ ...prev, ...sd.company }));
            if (sd?.general) setGen(prev => ({ ...prev, ...sd.general, tax_rate: sd.tax?.tax_rate || prev.tax_rate }));
            if (sd?.invoice) setInv(prev => ({ ...prev, ...sd.invoice }));
            if (sd?.company?.company_logo && window.api?.file?.readAsBase64) {
                const b64 = await window.api.file.readAsBase64(sd.company.company_logo);
                if (b64) setLogoPreview(b64);
            }
            const [path, size] = await Promise.all([
                window.api.settings?.getDbPath?.() || '',
                window.api.settings?.getDbSize?.() || ''
            ]);
            setDbPath(path || ''); setDbSize(size || '');
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const saveSetting = (cat, key, val) => window.api.settings.set(cat, key, val);

    const saveSection = async (cat, form, msg) => {
        setSaving(true);
        try {
            await Promise.all(Object.entries(form).map(([k, v]) => saveSetting(cat, k, v)));
            toast.success(msg || (t('savedSuccess') || 'Saved successfully')); window.dispatchEvent(new Event('settingsUpdated'));
        } catch { toast.error(t('errorOccurred') || 'An error occurred'); }
        setSaving(false);
    };

    const handleLogo = async () => {
        try {
            const r = await window.api.dialog.openFile({ properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }] });
            if (!r.canceled && r.filePaths[0]) {
                const src = r.filePaths[0];
                const final = window.api?.file?.copyLogo ? (await window.api.file.copyLogo(src)) || src : src;
                setCo(f => ({ ...f, company_logo: final }));
                const b64 = await window.api.file?.readAsBase64?.(final);
                if (b64) setLogoPreview(b64);
            }
        } catch (e) { console.error(e); }
    };

    const loadPerms = async () => {
        try {
            const [a, u] = await Promise.all([window.api.permissions.getByRole('accountant'), window.api.permissions.getByRole('user')]);
            setPermState({ accountant: a || {}, user: u || {} }); setPermLoaded(true);
        } catch (e) { console.error(e); }
    };

    const togglePerm = (role, mod, key) => setPermState(p => ({
        ...p, [role]: { ...p[role], [mod]: { ...p[role]?.[mod], [key]: !p[role]?.[mod]?.[key] } }
    }));

    const savePerms = async () => {
        setSaving(true);
        try {
            await Promise.all([
                window.api.permissions.savePermissions('accountant', permState.accountant),
                window.api.permissions.savePermissions('user', permState.user)
            ]);
            toast.success(t('savedSuccess') || 'Permissions saved successfully');
        } catch { toast.error(t('errorOccurred') || 'An error occurred'); }
        setSaving(false);
    };

    const loadUserPerms = async (u) => {
        // Clear state immediately to avoid showing previous user's permissions
        setUpState({});
        setUpHasInd(false);
        setUpLoading(true);
        upUserIdRef.current = u.id; // track which user we started loading for
        try {
            const r = await window.api.permissions.getUserPermissions(u.id);
            // Only update state if this user is still selected (race condition guard)
            if (upUserIdRef.current !== u.id) return;
            setUpHasInd(r.hasIndividual);
            if (r.hasIndividual) {
                setUpState(r.permissions);
            } else {
                const rolePerms = await window.api.permissions.getByRole(u.role);
                if (upUserIdRef.current !== u.id) return; // check again after second await
                setUpState(rolePerms || {});
            }
        } catch (e) { console.error(e); }
        setUpLoading(false);
    };

    const saveUserPerms = async () => {
        if (!selUser) return; setSaving(true);
        try { await window.api.permissions.saveUserPermissions(selUser.id, upState); setUpHasInd(true); toast.success(t('savedSuccess') || 'Individual permissions saved'); }
        catch { toast.error(t('errorOccurred') || 'An error occurred'); } setSaving(false);
    };

    const clearUserPerms = async () => {
        if (!selUser || !confirm(`${t('reset_perms_confirm') || 'Reset permissions to default for'} ${selUser.full_name}?`)) return;
        setSaving(true);
        try {
            await window.api.permissions.clearUserPermissions(selUser.id); setUpHasInd(false);
            setUpState(await window.api.permissions.getByRole(selUser.role) || {}); toast.success(t('reset_success') || 'Reset successfully');
        } catch { toast.error(t('errorOccurred') || 'An error occurred'); } setSaving(false);
    };

    const saveUser = async () => {
        try {
            if (editingUser) await window.api.users.update({ ...userForm, id: editingUser.id });
            else await window.api.users.create(userForm);
            toast.success(editingUser ? (t('updated_success') || 'Updated successfully') : (t('added_success') || 'Added successfully'));
            window.api.users.getAll().then(setUsers); setShowUserModal(false);
        } catch { toast.error(t('errorOccurred') || 'An error occurred'); }
    };

    const backup = async () => {
        const r = await window.api.dialog.saveFile({ defaultPath: `vero_backup_${new Date().toISOString().slice(0, 10)}.db`, filters: [{ name: 'DB', extensions: ['db'] }] });
        if (!r.canceled && r.filePath) {
            const res = await window.api.settings.backupToPath(r.filePath);
            res?.success ? toast.success(t('savedSuccess') || 'Saved successfully') : toast.error((t('failed') || 'Failed') + ': ' + (res?.error || ''));
        }
    };
    const restore = async () => {
        const r = await window.api.dialog.openFile({ properties: ['openFile'], filters: [{ name: 'DB', extensions: ['db'] }] });
        if (!r.canceled && r.filePaths[0]) {
            if (confirm(t('restore_confirm') || 'Current data will be replaced. Are you sure?')) {
                const res = await window.api.settings.restore(r.filePaths[0]);
                if (res?.success) { toast.success(t('restored_success') || 'Restored successfully'); window.location.reload(); }
                else toast.error(t('failed') || 'Failed');
            }
        }
    };
    const resetApp = async () => {
        if (confirm(t('reset_app_warning') || '⚠️ Delete all data permanently?') && confirm(t('reset_app_confirm') || 'Second confirmation: Cannot be undone!'))
            await window.api.settings?.resetApp?.();
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const btnStyle = {
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '.875rem', fontWeight: 500, fontFamily: 'inherit'
    };
    const gridTwo = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 };
    const thStyle = (w) => ({
        padding: '9px 12px', textAlign: 'center', fontWeight: 600, fontSize: '.78rem',
        color: 'var(--text-secondary)', background: 'var(--bg-secondary)', width: w
    });

    // ── Perm Toggle Cell ───────────────────────────────────────────────────────
    const PermCell = ({ has, enabled, onToggle }) => enabled ? (
        <div onClick={onToggle} style={{
            display: 'inline-flex', width: 34, height: 18, borderRadius: 9, position: 'relative',
            cursor: 'pointer', background: has ? 'var(--primary)' : 'var(--border)', transition: 'background .15s'
        }}>
            <div style={{
                position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%', background: '#fff',
                left: has ? 18 : 2, transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)'
            }} />
        </div>
    ) : <span style={{ color: 'var(--border)', fontSize: 12 }}>—</span>;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', direction: 'rtl' }}>

            {/* ── Sidebar ── */}
            <div style={{
                width: 215, flexShrink: 0, background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', overflowY: 'auto'
            }}>
                <div style={{ padding: '14px 12px 6px', fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {t('settings') || 'Settings'}
                </div>
                {SECTIONS.map(s => {
                    const active = sec === s.id;
                    return (
                        <button key={s.id} onClick={() => setSec(s.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', margin: '2px 6px',
                            borderRadius: 9, border: 'none', cursor: 'pointer', textAlign: 'right', fontSize: '.85rem',
                            fontWeight: active ? 700 : 400, fontFamily: 'inherit',
                            background: active ? 'rgba(37,99,235,.1)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--text-secondary)', transition: 'all .15s'
                        }}>
                            <s.icon size={15} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{s.l}</span>
                            {active && <ChevronRight size={13} />}
                        </button>
                    );
                })}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

                {/* ══ 1. COMPANY ══════════════════════════════════════════════════════ */}
                {sec === 'company' && <>
                    <Card title={t('company_logo') || 'Company Logo'} icon={Image}>
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
                                    : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Image size={32} /><div style={{ fontSize: '.72rem', marginTop: 6 }}>{t('drag_or_click_logo') || 'Drag logo or click'}</div></div>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                                    {t('logo_hint') || 'Drag logo here or click to select. It appears in printed invoices and vouchers.'}
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={handleLogo}>
                                        <Upload size={14} /> {t('upload_logo') || 'Upload Logo'}
                                    </button>
                                    {logoPreview && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--danger)' }}
                                        onClick={() => { setLogoPreview(''); setCo(f => ({ ...f, company_logo: '' })); }}>
                                        <X size={14} /> {t('remove') || 'Remove'}
                                    </button>}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('company_details') || 'Company Details'} icon={Building2}>
                        <div style={gridTwo}>
                            <Fld label={t('company_name') || 'Company Name'}><input style={inp} value={co.company_name} onChange={e => setCo(f => ({ ...f, company_name: e.target.value }))} /></Fld>
                            <Fld label={t('tax_number') || 'Tax Number'}><input style={inp} value={co.company_tax_number} onChange={e => setCo(f => ({ ...f, company_tax_number: e.target.value }))} /></Fld>
                        </div>
                        <div style={gridTwo}>
                            <Fld label={t('phone') || 'Phone'}><input style={inp} value={co.company_phone} onChange={e => setCo(f => ({ ...f, company_phone: e.target.value }))} /></Fld>
                            <Fld label={t('email') || 'Email'}><input style={inp} value={co.company_email} onChange={e => setCo(f => ({ ...f, company_email: e.target.value }))} /></Fld>
                        </div>
                        <Fld label={t('address') || 'Address'}><input style={inp} value={co.company_address} onChange={e => setCo(f => ({ ...f, company_address: e.target.value }))} /></Fld>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                                onClick={() => saveSection('company', co, t('saved_company_details') || 'Company details saved')}>
                                <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                            </button>
                        </div>
                    </Card>
                </>}

                {/* ══ 2. GENERAL ══════════════════════════════════════════════════════ */}
                {sec === 'general' && <>
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

                    <Card title={t('dashboard_options') || 'Dashboard Options'} icon={Ico}>
                        <TRow label={t('show_financial_summary') || 'Show Financial Summary'} desc={t('desc_financial_summary') || 'Total sales and purchases'} value={gen.show_financial_summary} onChange={v => setGen(f => ({ ...f, show_financial_summary: v }))} />
                        <TRow label={t('stock_alerts') || 'Stock Alerts'} desc={t('desc_stock_alerts') || 'Products that reached minimum stock limit'} value={gen.show_low_stock_products} onChange={v => setGen(f => ({ ...f, show_low_stock_products: v }))} />
                        <TRow label={t('customer_receivables') || 'Customer Receivables'} desc={t('desc_customer_receivables') || 'Customers with outstanding balances'} value={gen.show_customer_receivables} onChange={v => setGen(f => ({ ...f, show_customer_receivables: v }))} />
                        <TRow label={t('charts') || 'Charts'} desc={t('desc_charts') || 'Graphs for sales and purchases volume'} value={gen.show_sales_purchases_charts} onChange={v => setGen(f => ({ ...f, show_sales_purchases_charts: v }))} />
                        <TRow label={t('allow_negative_stock') || 'Allow Negative Stock'} desc={t('desc_negative_stock') || 'Allows completing sales even when stock is depleted'} value={gen.allow_negative_stock} onChange={v => setGen(f => ({ ...f, allow_negative_stock: v }))} />
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
                </>}

                {/* ══ 3. PRINT INVOICE ════════════════════════════════════════════════ */}
                {sec === 'print_invoice' && <>
                    <Card title={t('invoice_titles') || 'Invoice Titles'} icon={FileText}>
                        <div style={gridTwo}>
                            <Fld label={t('sales_invoice_title') || 'Sales Invoice Title'}><input style={inp} value={inv.invoice_title_sales} onChange={e => setInv(f => ({ ...f, invoice_title_sales: e.target.value }))} /></Fld>
                            <Fld label={t('purchase_invoice_title') || 'Purchase Invoice Title'}><input style={inp} value={inv.invoice_title_purchase} onChange={e => setInv(f => ({ ...f, invoice_title_purchase: e.target.value }))} /></Fld>
                        </div>
                        <Fld label={t('welcome_message_top') || 'Welcome Message (Top)'}>
                            <input style={inp} value={inv.thank_you_message} onChange={e => setInv(f => ({ ...f, thank_you_message: e.target.value }))} placeholder={t('thank_you_business') || 'Thank you for your business'} />
                        </Fld>
                        <Fld label={t('footer_bottom') || 'Footer (Bottom)'}>
                            <input style={inp} value={inv.invoice_footer} onChange={e => setInv(f => ({ ...f, invoice_footer: e.target.value }))} />
                        </Fld>
                        <Fld label={t('terms_and_conditions') || 'Terms & Conditions'}>
                            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={inv.invoice_terms} onChange={e => setInv(f => ({ ...f, invoice_terms: e.target.value }))} />
                        </Fld>
                    </Card>

                    <Card title={t('voucher_settings') || 'Voucher Settings'} icon={Printer}>
                        <div style={gridTwo}>
                            <Fld label={t('receipt_voucher_title') || 'Receipt Voucher Title'}><input style={inp} value={inv.voucher_title_receipt} onChange={e => setInv(f => ({ ...f, voucher_title_receipt: e.target.value }))} /></Fld>
                            <Fld label={t('payment_voucher_title') || 'Payment Voucher Title'}><input style={inp} value={inv.voucher_title_payment} onChange={e => setInv(f => ({ ...f, voucher_title_payment: e.target.value }))} /></Fld>
                        </div>
                        <Fld label={t('voucher_footer') || 'Voucher Footer'}><input style={inp} value={inv.voucher_footer} onChange={e => setInv(f => ({ ...f, voucher_footer: e.target.value }))} /></Fld>
                    </Card>

                    <Card title={t('show_hide_options') || 'Show/Hide Options'} icon={Eye}>
                        <TRow label={t('show_company_logo') || 'Show Company Logo'} value={inv.show_logo} onChange={v => setInv(f => ({ ...f, show_logo: v }))} />
                        <TRow label={t('show_company_info') || 'Show Company Info'} value={inv.show_company_info} onChange={v => setInv(f => ({ ...f, show_company_info: v }))} />
                        <TRow label={t('show_invoice_notes') || 'Show Invoice Notes'} value={inv.show_notes} onChange={v => setInv(f => ({ ...f, show_notes: v }))} />
                        <TRow label={t('show_signature_area') || 'Show Signature Area'} value={inv.show_signature} onChange={v => setInv(f => ({ ...f, show_signature: v }))} />
                        <TRow label={t('show_discount_column') || 'Show Discount Column'} value={inv.show_discount_column} onChange={v => setInv(f => ({ ...f, show_discount_column: v }))} />
                        <TRow label={t('show_tax_column') || 'Show Tax Column'} value={inv.show_tax_column} onChange={v => setInv(f => ({ ...f, show_tax_column: v }))} />
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                            onClick={() => saveSection('invoice', inv, t('saved_print_settings') || 'Print settings saved')}>
                            <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_print_settings') || 'Save Print Settings')}
                        </button>
                    </div>
                </>}

                {/* ══ 4. PRINT IDENTITY ═══════════════════════════════════════════════ */}
                {sec === 'print_identity' && <>
                    <Card title={t('primary_print_color') || 'Primary Print Color'} icon={Palette}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                            {t('color_hint') || 'Affects table header, total bar, and divider lines in the printed invoice.'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                            <input type="color" value={inv.print_color || '#2563eb'} onChange={e => setInv(f => ({ ...f, print_color: e.target.value }))}
                                style={{ width: 48, height: 40, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                            <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '.9rem' }}>{inv.print_color}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {COLORS.map(c => (
                                <div key={c} onClick={() => setInv(f => ({ ...f, print_color: c }))}
                                    style={{
                                        width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer',
                                        border: inv.print_color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                                        transition: 'border .15s', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                    {inv.print_color === c && <Check size={14} color="#fff" />}
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title={t('logo_position_size') || 'Logo Position & Size'} icon={Image}>
                        <Fld label={t('logo_position') || 'Logo Position'}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[['right', t('right') || 'Right'], ['center', t('center') || 'Center'], ['left', t('left') || 'Left']].map(([v, l]) => (
                                    <button key={v} onClick={() => setInv(f => ({ ...f, logo_position: v }))} style={{
                                        flex: 1, padding: '10px 0', borderRadius: 8, border: inv.logo_position === v ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: inv.logo_position === v ? 'rgba(37,99,235,.08)' : 'transparent',
                                        color: inv.logo_position === v ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontWeight: inv.logo_position === v ? 700 : 400, fontFamily: 'inherit', fontSize: '.875rem', transition: 'all .15s'
                                    }}>{l}</button>
                                ))}
                            </div>
                        </Fld>
                        <Fld label={t('logo_size') || 'Logo Size'}>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[['small', t('small') || 'Small'], ['medium', t('medium') || 'Medium'], ['large', t('large') || 'Large']].map(([v, l]) => (
                                    <button key={v} onClick={() => setInv(f => ({ ...f, logo_size: v }))} style={{
                                        flex: 1, padding: '10px 0', borderRadius: 8, border: inv.logo_size === v ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: inv.logo_size === v ? 'rgba(37,99,235,.08)' : 'transparent',
                                        color: inv.logo_size === v ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontWeight: inv.logo_size === v ? 700 : 400, fontFamily: 'inherit', fontSize: '.875rem', transition: 'all .15s'
                                    }}>{l}</button>
                                ))}
                            </div>
                        </Fld>
                    </Card>

                    <Card title={t('paper_size_orientation') || 'Paper Size & Orientation'} icon={FileText}>
                        <div style={gridTwo}>
                            <Fld label={t('paper_size') || 'Paper Size'}>
                                <select style={inp} value={inv.paper_size} onChange={e => setInv(f => ({ ...f, paper_size: e.target.value }))}>
                                    <option value="A4">A4</option>
                                    <option value="A5">A5</option>
                                    <option value="thermal_80">{t('thermal_80') || 'Thermal 80mm'}</option>
                                    <option value="thermal_58">{t('thermal_58') || 'Thermal 58mm'}</option>
                                </select>
                            </Fld>
                            <Fld label={t('paper_orientation') || 'Orientation'}>
                                <select style={inp} value={inv.paper_orientation} onChange={e => setInv(f => ({ ...f, paper_orientation: e.target.value }))}>
                                    <option value="portrait">{t('portrait') || 'Portrait'}</option>
                                    <option value="landscape">{t('landscape') || 'Landscape'}</option>
                                </select>
                            </Fld>
                        </div>
                    </Card>

                    <Card title={t('invoice_template') || 'Invoice Template'} icon={FileText}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14 }}>{t('template_hint') || 'Choose the design that fits your company identity.'}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {[
                                { id: 'modern', label: t('modern') || 'Modern', desc: t('modern_desc') || 'Modern colored bar' },
                                { id: 'classic', label: t('classic') || 'Classic', desc: t('classic_desc') || 'Formal black & white' },
                                { id: 'professional', label: t('professional') || 'Professional', desc: t('professional_desc') || 'Gradient bar & badge' },
                                { id: 'minimal', label: t('minimal') || 'Minimal', desc: t('minimal_desc') || 'Lines only' },
                            ].map(tmpl => {
                                const active = inv.invoice_template === tmpl.id;
                                const c = inv.print_color || '#2563eb';
                                return (
                                    <div key={tmpl.id} onClick={() => setInv(f => ({ ...f, invoice_template: tmpl.id }))}
                                        style={{
                                            padding: 8, borderRadius: 10, cursor: 'pointer', transition: 'all .15s', overflow: 'hidden',
                                            border: active ? `2px solid ${c}` : '1px solid var(--border)',
                                            background: active ? c + '0f' : 'var(--bg-secondary)'
                                        }}>
                                        <div style={{ height: 72, background: '#fff', borderRadius: 6, marginBottom: 8, border: '1px solid #eee', padding: 6, overflow: 'hidden' }}>
                                            {tmpl.id === 'modern' && <div style={{ background: c, height: 16, margin: '-6px -6px 6px', borderRadius: '6px 6px 0 0' }} />}
                                            {tmpl.id === 'professional' && <div style={{ height: 4, background: `linear-gradient(90deg,${c},${c}88)`, margin: '-6px -6px 6px', borderRadius: '6px 6px 0 0' }} />}
                                            {tmpl.id === 'classic' && <div style={{ border: '2px solid #000', height: 14, marginBottom: 6 }} />}
                                            {tmpl.id === 'minimal' && <div style={{ borderBottom: `2px solid ${c}`, marginBottom: 6 }} />}
                                            <div style={{ height: 5, background: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '70%' }} />
                                            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 3, width: '90%' }} />
                                            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 6, width: '80%' }} />
                                            <div style={{ height: 11, background: tmpl.id === 'classic' ? '#000' : c, borderRadius: 2, opacity: .9 }} />
                                        </div>
                                        <div style={{ fontWeight: active ? 700 : 500, fontSize: '.83rem', color: active ? c : 'var(--text-primary)', marginBottom: 2 }}>{tmpl.label}</div>
                                        <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{tmpl.desc}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                            onClick={() => saveSection('invoice', inv, t('saved_visual_identity') || 'Visual identity saved')}>
                            <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_visual_identity') || 'Save Visual Identity')}
                        </button>
                    </div>
                </>}

                {/* ══ 5. USERS ════════════════════════════════════════════════════════ */}
                {sec === 'users' && <>
                    <Card title={t('user_management') || 'User Management'} icon={Users} action={
                        <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', padding: '7px 14px' }}
                            onClick={() => { setEditingUser(null); setUserForm({ username: '', password: '', full_name: '', role: 'user' }); setShowPw(false); setShowUserModal(true); }}>
                            <Plus size={14} /> {t('new_user') || 'New User'}
                        </button>
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
                                                : <Tog on={!!u.is_active} onChange={async () => {
                                                    await window.api.users.update({ ...u, is_active: u.is_active ? 0 : 1 });
                                                    window.api.users.getAll().then(setUsers);
                                                }} />}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button style={{ ...btnStyle, padding: '5px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                                    onClick={() => { setEditingUser(u); setUserForm({ username: u.username, password: '', full_name: u.full_name || '', role: u.role }); setShowPw(false); setShowUserModal(true); }}>
                                                    <Edit2 size={13} />
                                                </button>
                                                {u.id !== 1 && <button style={{ ...btnStyle, padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: 'none', color: 'var(--danger)' }}
                                                    onClick={async () => { if (confirm(t('delete_user_confirm') || 'Delete user?')) { await window.api.users.delete(u.id); window.api.users.getAll().then(setUsers); } }}>
                                                    <Trash2 size={13} />
                                                </button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </>}

                {/* ══ 6. ROLE PERMISSIONS ═════════════════════════════════════════════ */}
                {sec === 'permissions' && <>
                    {!permLoaded && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>{t('loading') || 'Loading...'}</div>}
                    {permLoaded && ['accountant', 'user'].map(role => (
                        <Card key={role} title={`${t('role_permissions') || 'Role Permissions'}: ${roleName(role)}`} icon={Shield}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thStyle(null), textAlign: 'right', padding: '9px 12px' }}>{t('module') || 'Module'}</th>
                                            {PERM_KEYS.map(pk => <th key={pk.key} style={thStyle(70)}>{pk.label}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PERM_MODS.map((m, i) => (
                                            <tr key={m.m} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '9px 12px', fontWeight: 500, fontSize: '.875rem' }}>{m.l}</td>
                                                {PERM_KEYS.map(pk => (
                                                    <td key={pk.key} style={{ padding: 8, textAlign: 'center' }}>
                                                        <PermCell has={!!permState[role]?.[m.m]?.[pk.key]} enabled={m.a.includes(pk.act)}
                                                            onToggle={() => togglePerm(role, m.m, pk.key)} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    ))}
                    {permLoaded && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving} onClick={savePerms}>
                            <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_role_permissions') || 'Save Role Permissions')}
                        </button>
                    </div>}
                </>}

                {/* ══ 7. USER PERMISSIONS ════════════════════════════════════════════ */}
                {sec === 'user_permissions' && <>
                    <Card title={t('select_user_permissions') || 'Select a user to customize permissions'} icon={Users}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                            {t('user_permissions_hint') || 'Individual permissions override role permissions. Admin always has full access.'}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {users.filter(u => u.role !== 'admin').map(u => (
                                <div key={u.id} onClick={() => { setSelUser(u); loadUserPerms(u); }}
                                    style={{
                                        padding: '11px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 10,
                                        border: selUser?.id === u.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                        background: selUser?.id === u.id ? 'rgba(37,99,235,.07)' : 'var(--surface)'
                                    }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', background: roleColor(u.role), color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0
                                    }}>
                                        {(u.full_name || u.username || '?')[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{u.full_name || u.username}</div>
                                        <div style={{ fontSize: '.73rem', color: 'var(--text-muted)' }}>{roleName(u.role)}</div>
                                    </div>
                                </div>
                            ))}
                            {users.filter(u => u.role !== 'admin').length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('no_users_found') || 'No users found'}</p>}
                        </div>
                    </Card>

                    {selUser && (
                        <Card title={`${t('override_role_permissions') || 'Override Role Permissions'}: ${selUser.full_name || selUser.username}`} icon={Shield}
                            action={upHasInd
                                ? <span style={{ fontSize: '.72rem', background: 'rgba(16,185,129,.1)', color: 'var(--success)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('custom_permissions_badge') || 'Custom Permissions Active'}</span>
                                : <span style={{ fontSize: '.72rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('default_role_permissions_badge') || 'Using Role Permissions'}</span>}
                        >
                            {upLoading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>{t('loading') || 'Loading...'}</div> : <>
                                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                        <thead>
                                            <tr>
                                                <th style={{ ...thStyle(null), textAlign: 'right', padding: '9px 12px' }}>{t('module') || 'Module'}</th>
                                                {PERM_KEYS.map(pk => <th key={pk.key} style={thStyle(70)}>{pk.label}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PERM_MODS.map((m, i) => (
                                                <tr key={m.m} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '9px 12px', fontWeight: 500, fontSize: '.875rem' }}>{m.l}</td>
                                                    {PERM_KEYS.map(pk => (
                                                        <td key={pk.key} style={{ padding: 8, textAlign: 'center' }}>
                                                            <PermCell has={!!upState[m.m]?.[pk.key]} enabled={m.a.includes(pk.act)}
                                                                onToggle={() => setUpState(p => ({ ...p, [m.m]: { ...p[m.m], [pk.key]: !p[m.m]?.[pk.key] } }))} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving} onClick={saveUserPerms}>
                                        <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_individual_permissions') || 'Save Individual Permissions')}
                                    </button>
                                    {upHasInd && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                        disabled={saving} onClick={clearUserPerms}>
                                        <RefreshCw size={13} /> {t('reset_to_role_permissions') || 'Reset to Role Permissions'}
                                    </button>}
                                </div>
                            </>}
                        </Card>
                    )}
                </>}

                {/* ══ 8. DATABASE ════════════════════════════════════════════════════ */}
                {sec === 'database' && (isAdmin || user?.permissions?.database?.can_view) && <>
                    <Card title={t('database_info') || 'Database Info'} icon={HardDrive}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                <strong>{t('path') || 'Path'}: </strong>{dbPath || (t('not_available') || 'Not available')}
                            </div>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{t('size') || 'Size'}: </strong><span dir="ltr">{dbSize || (t('calculating') || 'Calculating...')}</span>
                                </div>
                                <button style={{ padding: '7px 12px', background: 'var(--primary)', color: '#fff', borderRadius: 6, fontSize: '.75rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} disabled={saving} onClick={async () => {
                                    setSaving(true);
                                    try {
                                        if (typeof window.api.settings.optimizeDb !== 'function') {
                                            toast.error(t('restart_to_apply_optimization') || 'Please restart the app to activate this feature');
                                            setSaving(false);
                                            return;
                                        }
                                        const res = await window.api.settings.optimizeDb();
                                        if (res && res.success === false) {
                                            toast.error((t('optimization_failed') || 'Space optimization failed: ') + res.error);
                                        } else {
                                            const size = await window.api.settings.getDbSize();
                                            setDbSize(size);
                                            toast.success(t('optimization_success') || 'Space optimized successfully');
                                        }
                                    } catch (e) {
                                        toast.error((t('optimization_error') || 'Error during database optimization: ') + e.message);
                                    }
                                    setSaving(false);
                                }}>
                                    <RefreshCw size={14} /> {t('optimize_space') || 'Optimize Space'}
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('backup_and_restore') || 'Backup & Restore'} icon={Database}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                            {t('backup_hint') || 'Take regular backups to protect your data.'}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={backup}>
                                <Download size={14} /> {t('backup') || 'Backup'}
                            </button>
                            <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={restore}>
                                <Upload size={14} /> {t('restore_from_backup') || 'Restore from Backup'}
                            </button>
                        </div>
                    </Card>

                    <Card title={t('reset_app') || 'Reset App'} icon={AlertTriangle} action={
                        <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
                    }>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: t('reset_app_desc') || 'Resetting will <strong>permanently delete all data</strong>. This cannot be undone.' }} />
                        <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={resetApp}>
                            <AlertTriangle size={14} /> {t('reset_app') || 'Reset App'}
                        </button>
                    </Card>
                </>}

            </div>

            {/* ── User Modal ─────────────────────────────────────────────────────── */}
            {showUserModal && (
                <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? (t('edit_user') || 'Edit User') : (t('new_user') || 'New User')}>
                    <Fld label={t('full_name') || 'Full Name'}>
                        <input className="form-input" value={userForm.full_name} onChange={e => setUserForm(f => ({ ...f, full_name: e.target.value }))} />
                    </Fld>
                    <Fld label={t('login_username') || 'Username (Login)'}>
                        <input className="form-input" value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} disabled={!!editingUser} />
                    </Fld>
                    <Fld label={<>{t('password') || 'Password'} {editingUser && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '.8rem' }}>({t('empty_no_change') || 'Empty = No change'})</span>}</>}>
                        <div style={{ position: 'relative' }}>
                            <input className="form-input" type={showPw ? 'text' : 'password'} value={userForm.password}
                                onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} style={{ paddingLeft: 38 }} />
                            <button onClick={() => setShowPw(p => !p)} style={{
                                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2
                            }}>
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Fld>
                    <Fld label={t('role') || 'Role'}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[['user', t('user_role') || 'User'], ['accountant', t('accountant_role') || 'Accountant'], ['admin', t('admin_role') || 'Admin']].map(([v, l]) => (
                                <button key={v} onClick={() => setUserForm(f => ({ ...f, role: v }))} style={{
                                    flex: 1, padding: '9px 0', borderRadius: 8, border: userForm.role === v ? `2px solid ${roleColor(v)}` : '1px solid var(--border)',
                                    background: userForm.role === v ? roleColor(v) + '15' : 'transparent',
                                    color: userForm.role === v ? roleColor(v) : 'var(--text-secondary)',
                                    cursor: 'pointer', fontWeight: userForm.role === v ? 700 : 400, fontFamily: 'inherit', fontSize: '.875rem', transition: 'all .15s'
                                }}>{l}</button>
                            ))}
                        </div>
                    </Fld>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', marginTop: 20 }}>
                        <button className="btn btn-primary" onClick={saveUser}><Save size={14} /> {t('save') || 'Save'}</button>
                        <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>{t('cancel') || 'Cancel'}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
