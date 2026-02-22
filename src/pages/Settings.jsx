import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield, Image, ToggleLeft, ToggleRight } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';

function Settings() {
    const { t, language, setLanguage, user } = useAuth();
    const [activeTab, setActiveTab] = useState('company');
    const [settings, setSettings] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'user' });
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [logoPreview, setLogoPreview] = useState('');
    const [logoPath, setLogoPath] = useState(''); // Store logo path for company settings

    // Local state for general settings (NOT auto-saved)
    const [generalForm, setGeneralForm] = useState({
        currency: 'دينار كويتي',
        currency_symbol: 'د.ك',
        tax_rate: '0',
        decimal_places: '3',
        language: 'ar',
        allow_negative_stock: 'no'
    });

    // Local state for company settings (NOT auto-saved)
    const [companyForm, setCompanyForm] = useState({
        company_name: '',
        company_address: '',
        company_phone: '',
        company_email: '',
        company_tax_number: '',
        company_logo: ''
    });

    // Local state for invoice settings (NOT auto-saved)
    const [invoiceForm, setInvoiceForm] = useState({
        invoice_title_sales: 'فاتورة مبيعات',
        invoice_title_purchase: 'فاتورة مشتريات',
        invoice_footer: '',
        invoice_terms: '',
        show_logo: 'yes',
        show_company_info: 'yes',
        paper_size: 'A4',
        paper_orientation: 'portrait'
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [settingsData, usersData] = await Promise.all([window.api.settings.getAll(), window.api.users.getAll()]);
            console.log('[Settings.loadData] Settings loaded:', settingsData);
            console.log('[Settings.loadData] Company logo path:', settingsData?.company?.company_logo);
            setSettings(settingsData || {});
            setUsers(usersData || []);

            // Initialize company form from settings
            if (settingsData?.company) {
                setCompanyForm({
                    company_name: settingsData.company.company_name || '',
                    company_address: settingsData.company.company_address || '',
                    company_phone: settingsData.company.company_phone || '',
                    company_email: settingsData.company.company_email || '',
                    company_tax_number: settingsData.company.company_tax_number || '',
                    company_logo: settingsData.company.company_logo || ''
                });
                setLogoPath(settingsData.company.company_logo || '');
            }
            if (settingsData?.general) {
                setGeneralForm({
                    currency: settingsData.general.currency || 'دينار كويتي',
                    currency_symbol: settingsData.general.currency_symbol || 'د.ك',
                    tax_rate: settingsData.tax?.tax_rate || '0',
                    decimal_places: settingsData.general.decimal_places || '3',
                    language: settingsData.general.language || 'ar',
                    allow_negative_stock: settingsData.general.allow_negative_stock || 'no'
                });
            }
            if (settingsData?.invoice) {
                setInvoiceForm({
                    invoice_title_sales: settingsData.invoice.invoice_title_sales || 'فاتورة مبيعات',
                    invoice_title_purchase: settingsData.invoice.invoice_title_purchase || 'فاتورة مشتريات',
                    invoice_footer: settingsData.invoice.invoice_footer || '',
                    invoice_terms: settingsData.invoice.invoice_terms || '',
                    show_logo: settingsData.invoice.show_logo || 'yes',
                    show_company_info: settingsData.invoice.show_company_info || 'yes',
                    paper_size: settingsData.invoice.paper_size || 'A4',
                    paper_orientation: settingsData.invoice.paper_orientation || 'portrait'
                });
            }
            // Load logo preview
            if (settingsData?.company?.company_logo && window.api?.file?.readAsBase64) {
                console.log('[Settings.loadData] Loading logo preview from:', settingsData.company.company_logo);
                const b64 = await window.api.file.readAsBase64(settingsData.company.company_logo);
                console.log('[Settings.loadData] Logo preview loaded, b64 length:', b64?.length);
                if (b64) setLogoPreview(b64);
            }
        } catch (e) { console.error('[Settings.loadData] Error:', e); }
        setLoading(false);
    };

    const saveSetting = async (key, value) => {
        try {
            console.log('[saveSetting] Saving:', key, '=', value);
            const result = await window.api.settings.set(key, value);
            console.log('[saveSetting] Result:', result);
            return result;
        } catch (e) {
            console.error('Error saving setting', key, e);
            return { success: false, error: e?.message };
        }
    };

    const showSaveStatus = (msg, isSuccess = true) => {
        setSaveStatus(msg);
        setTimeout(() => setSaveStatus(''), 2000);
    };

    const saveGeneralSettings = async () => {
        setSaving(true);
        setSaveStatus(t('savingProgress'));
        try {
            await saveSetting('currency', generalForm.currency);
            await saveSetting('currency_symbol', generalForm.currency_symbol);
            await saveSetting('tax_rate', generalForm.tax_rate);
            await saveSetting('decimal_places', generalForm.decimal_places);
            await saveSetting('language', generalForm.language);
            await saveSetting('allow_negative_stock', generalForm.allow_negative_stock);

            // Apply language change immediately
            if (generalForm.language !== language) {
                setLanguage(generalForm.language);
            }

            showSaveStatus(t('savedSuccess'));
        } catch (e) {
            console.error('Error saving general settings:', e);
            showSaveStatus(t('saveFailed'), false);
        }
        setSaving(false);
    };

    const saveCompanySettings = async () => {
        setSaving(true);
        setSaveStatus(t('savingProgress'));
        try {
            console.log('[saveCompanySettings] Company logo value:', companyForm.company_logo);
            console.log('[saveCompanySettings] Logo value type:', typeof companyForm.company_logo);
            
            await saveSetting('company_name', companyForm.company_name);
            await saveSetting('company_address', companyForm.company_address);
            await saveSetting('company_phone', companyForm.company_phone);
            await saveSetting('company_email', companyForm.company_email);
            await saveSetting('company_tax_number', companyForm.company_tax_number);
            if (companyForm.company_logo && typeof companyForm.company_logo === 'string' && companyForm.company_logo.length > 0) {
                console.log('[saveCompanySettings] Saving logo path:', companyForm.company_logo);
                await saveSetting('company_logo', companyForm.company_logo);
            }

            // Reload settings to reflect changes immediately
            await loadData();
            showSaveStatus(t('savedSuccess'));
        } catch (e) {
            console.error('Error saving company settings:', e);
            showSaveStatus(t('saveFailed'), false);
        }
        setSaving(false);
    };

    const saveInvoiceSettings = async () => {
        setSaving(true);
        setSaveStatus(t('savingProgress'));
        try {
            await saveSetting('invoice_title_sales', invoiceForm.invoice_title_sales);
            await saveSetting('invoice_title_purchase', invoiceForm.invoice_title_purchase);
            await saveSetting('invoice_footer', invoiceForm.invoice_footer);
            await saveSetting('invoice_terms', invoiceForm.invoice_terms);
            await saveSetting('show_logo', invoiceForm.show_logo);
            await saveSetting('show_company_info', invoiceForm.show_company_info);
            await saveSetting('paper_size', invoiceForm.paper_size);
            await saveSetting('paper_orientation', invoiceForm.paper_orientation);
            showSaveStatus(t('savedSuccess'));
        } catch (e) {
            console.error('Error saving invoice settings:', e);
            showSaveStatus(t('saveFailed'), false);
        }
        setSaving(false);
    };

    const handleUserSubmit = async () => {
        if (editingUser) await window.api.users.update({ ...userForm, id: editingUser.id });
        else await window.api.users.create(userForm);
        loadData();
        setShowUserModal(false);
    };

    const deleteUser = async (id) => {
        if (id === 1) { alert(t('set_cantDeleteAdmin')); return; }
        if (confirm(t('set_deleteUserConfirm'))) { await window.api.users.delete(id); loadData(); }
    };

    const toggleActive = async (user) => {
        if (user.id === 1) return; // Can't deactivate admin
        await window.api.users.update({ ...user, is_active: user.is_active ? 0 : 1 });
        loadData();
    };

    const openUserModal = (user = null) => {
        setEditingUser(user);
        setUserForm(user ? { username: user.username, password: '', full_name: user.full_name, role: user.role, is_active: user.is_active } : { username: '', password: '', full_name: '', role: 'user', is_active: 1 });
        setShowUserModal(true);
    };

    const handleLogoUpload = async () => {
        try {
            const result = await window.api.dialog.openFile({
                properties: ['openFile'],
                filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const srcPath = result.filePaths[0];
                console.log('[handleLogoUpload] Selected file:', srcPath);
                // Copy logo to app data directory for persistence
                let finalLogoPath = srcPath;
                if (window.api?.file?.copyLogo) {
                    const copiedPath = await window.api.file.copyLogo(srcPath);
                    console.log('[handleLogoUpload] Copied path:', copiedPath);
                    if (copiedPath) finalLogoPath = copiedPath;
                }
                console.log('[handleLogoUpload] Final logo path:', finalLogoPath);
                // Update local state only - NOT saved yet
                setLogoPath(finalLogoPath);
                setCompanyForm({ ...companyForm, company_logo: finalLogoPath });
                // Load base64 preview
                if (window.api?.file?.readAsBase64) {
                    const b64 = await window.api.file.readAsBase64(finalLogoPath);
                    console.log('[handleLogoUpload] Preview b64 length:', b64?.length);
                    if (b64) setLogoPreview(b64);
                }
            }
        } catch (e) {
            console.error('Logo upload error:', e);
        }
    };

    const backup = async () => {
        const result = await window.api.dialog.saveFile({
            defaultPath: `backup-${new Date().toISOString().split('T')[0]}.db`,
            filters: [{ name: 'Database', extensions: ['db'] }]
        });
        if (!result.canceled && result.filePath) {
            const backupResult = await window.api.settings.backup();
            if (backupResult?.success) {
                alert(t('set_backupSuccess') + backupResult.path);
            } else {
                alert(t('set_backupFailed'));
            }
        }
    };

    const restore = async () => {
        const result = await window.api.dialog.openFile({
            properties: ['openFile'],
            filters: [{ name: 'Database', extensions: ['db'] }]
        });
        if (!result.canceled && result.filePaths.length > 0) {
            if (confirm(t('set_restoreConfirm'))) {
                const restoreResult = await window.api.settings.restore(result.filePaths[0]);
                if (restoreResult?.success) {
                    alert(t('set_restoreSuccess'));
                    window.location.reload();
                } else {
                    alert(t('set_restoreFailed'));
                }
            }
        }
    };

    const isAdmin = user?.role === 'admin';
    const userPerms = user?.permissions || {};

    const allTabs = [
        { id: 'company', labelKey: 'set_companyInfo', icon: Building2 },
        { id: 'users', labelKey: 'set_users', icon: Users, permModule: 'users' },
        { id: 'permissions', labelKey: 'set_permissions', icon: Shield, permModule: 'permissions' },
        { id: 'general', labelKey: 'set_general', icon: SettingsIcon },
        { id: 'invoice', labelKey: 'set_invoice', icon: Printer },
        { id: 'backup', labelKey: 'set_backup', icon: Database },
    ];

    // Filter tabs based on user permissions
    const tabs = allTabs.filter(tab => {
        if (!tab.permModule) return true; // No restriction
        if (isAdmin) return true;
        return userPerms[tab.permModule]?.can_view === true;
    });

    const permModules = [
        { module: 'dashboard', labelKey: 'menu_dashboard', actions: ['view'] },
        { module: 'customers', labelKey: 'menu_customers', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'suppliers', labelKey: 'menu_suppliers', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'products', labelKey: 'menu_products', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'sales_invoices', labelKey: 'menu_sales', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'purchase_invoices', labelKey: 'menu_purchases', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'chart_of_accounts', labelKey: 'menu_chartOfAccounts', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'cash_bank', labelKey: 'menu_cashBank', actions: ['view', 'create'] },
        { module: 'receipt_vouchers', labelKey: 'menu_receiptVoucher', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'payment_vouchers', labelKey: 'menu_paymentVoucher', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'journal_entries', labelKey: 'menu_journal', actions: ['view', 'create', 'delete'] },
        { module: 'reports', labelKey: 'menu_reports', actions: ['view'] },
        { module: 'settings', labelKey: 'menu_settings', actions: ['view', 'edit'] },
        { module: 'users', labelKey: 'set_users', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'permissions', labelKey: 'set_permissions', actions: ['view', 'edit'] }
    ];

    const actionLabels = {
        view: t('perm_view') || 'عرض',
        create: t('perm_create') || 'إنشاء',
        edit: t('perm_edit') || 'تعديل',
        delete: t('perm_delete') || 'حذف'
    };

    // Permissions state: { accountant: { customers: { can_view: true, ... } }, user: { ... } }
    const [permState, setPermState] = useState({ accountant: {}, user: {} });
    const [permLoaded, setPermLoaded] = useState(false);

    useEffect(() => {
        if (activeTab === 'permissions' && !permLoaded) {
            loadPermissions();
        }
    }, [activeTab]);

    const loadPermissions = async () => {
        try {
            const [accPerms, userPerms] = await Promise.all([
                window.api.permissions.getByRole('accountant'),
                window.api.permissions.getByRole('user')
            ]);
            setPermState({ accountant: accPerms || {}, user: userPerms || {} });
            setPermLoaded(true);
        } catch (e) { console.error('Error loading permissions:', e); }
    };

    const togglePerm = (role, module, action) => {
        setPermState(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [module]: {
                    ...prev[role]?.[module],
                    [action]: !prev[role]?.[module]?.[action]
                }
            }
        }));
    };

    const savePermissions = async () => {
        setSaving(true);
        try {
            await window.api.permissions.savePermissions('accountant', permState.accountant);
            await window.api.permissions.savePermissions('user', permState.user);
            showSaveStatus(t('savedSuccess'));
        } catch (e) {
            showSaveStatus(t('saveFailed'), false);
        }
        setSaving(false);
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="tabs" style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
                {tabs.map(t2 => (
                    <button key={t2.id} className={`tab ${activeTab === t2.id ? 'active' : ''}`} onClick={() => setActiveTab(t2.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <t2.icon size={16} /> {t(t2.labelKey)}
                    </button>
                ))}
            </div>

            {/* Save status indicator */}
            {saveStatus && (
                <div style={{ position: 'fixed', bottom: '20px', left: '20px', padding: '12px 24px', background: saveStatus === t('savedSuccess') ? 'var(--success)' : saveStatus === t('saveFailed') ? 'var(--danger)' : 'var(--primary)', color: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, fontWeight: 'bold' }}>
                    {saveStatus}
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    {activeTab === 'company' && (
                        <div>
                            <div className="form-group">
                                <label className="form-label">{t('set_companyLogo')}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ width: '100px', height: '100px', border: '2px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', cursor: 'pointer' }} onClick={handleLogoUpload} title={t('set_logoHelp')}>
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <Image size={32} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input type="text" className="form-input" placeholder={t('set_logoPath')} value={companyForm.company_logo || ''} readOnly style={{ flex: 1 }} />
                                            <button type="button" className="btn btn-secondary" onClick={handleLogoUpload}>{t('set_chooseFile')}</button>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t('set_logoHelp')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_companyName')}</label>
                                <input type="text" className="form-input" value={companyForm.company_name || ''} onChange={e => setCompanyForm({ ...companyForm, company_name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_companyAddress')}</label>
                                <input type="text" className="form-input" value={companyForm.company_address || ''} onChange={e => setCompanyForm({ ...companyForm, company_address: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_companyPhone')}</label>
                                    <input type="text" className="form-input" value={companyForm.company_phone || ''} onChange={e => setCompanyForm({ ...companyForm, company_phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_companyEmail')}</label>
                                    <input type="email" className="form-input" value={companyForm.company_email || ''} onChange={e => setCompanyForm({ ...companyForm, company_email: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_taxNumber')}</label>
                                <input type="text" className="form-input" value={companyForm.company_tax_number || ''} onChange={e => setCompanyForm({ ...companyForm, company_tax_number: e.target.value })} />
                            </div>
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={saveCompanySettings}
                                    disabled={saving}
                                    style={{ minWidth: '120px' }}
                                >
                                    {saving ? t('savingProgress') : t('set_saveData')}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h4>{t('set_userManagement')}</h4>
                                <button className="btn btn-primary btn-sm" onClick={() => openUserModal()}><Plus size={16} /> {t('set_newUser')}</button>
                            </div>
                            <table>
                                <thead><tr><th>{t('set_username')}</th><th>{t('name')}</th><th>{t('set_role')}</th><th>{t('status')}</th><th>{t('actions')}</th></tr></thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className="font-bold">{u.username}</td>
                                            <td>{u.full_name}</td>
                                            <td><span className="badge badge-primary">{u.role === 'admin' ? t('admin') : u.role === 'accountant' ? t('accountant') : t('user')}</span></td>
                                            <td>
                                                {u.id !== 1 ? (
                                                    <button className={`btn btn-sm ${u.is_active ? 'btn-success' : 'btn-danger'}`} onClick={() => toggleActive(u)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '4px 10px' }}>
                                                        {u.is_active ? <><ToggleRight size={14} /> {t('active')}</> : <><ToggleLeft size={14} /> {t('inactive')}</>}
                                                    </button>
                                                ) : (
                                                    <span className="badge badge-success">{t('active')}</span>
                                                )}
                                            </td>
                                            <td><div className="table-actions"><button className="btn btn-ghost btn-sm" onClick={() => openUserModal(u)}><Edit2 size={16} /></button>{u.id !== 1 && <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteUser(u.id)}><Trash2 size={16} /></button>}</div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'permissions' && (
                        <div>
                            <h4 style={{ marginBottom: '16px' }}>{t('set_permissionsTitle')}</h4>
                            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                                <strong>{t('notes')}:</strong> {t('set_permissionsNote')}
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ minWidth: '700px' }}>
                                    <thead>
                                        <tr>
                                            <th rowSpan="2" style={{ verticalAlign: 'middle' }}>{t('set_module')}</th>
                                            <th colSpan="4" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('admin')}</th>
                                            <th colSpan="4" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('accountant')}</th>
                                            <th colSpan="4" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('user')}</th>
                                        </tr>
                                        <tr>
                                            {['admin', 'accountant', 'user'].map(role =>
                                                ['view', 'create', 'edit', 'delete'].map(act => (
                                                    <th key={`${role}-${act}`} style={{ textAlign: 'center', fontSize: '0.7rem', padding: '6px 4px', fontWeight: 500 }}>{actionLabels[act]}</th>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {permModules.map(p => (
                                            <tr key={p.module}>
                                                <td style={{ fontWeight: 500 }}>{t(p.labelKey)}</td>
                                                {/* Admin — always fully checked, disabled */}
                                                {['view', 'create', 'edit', 'delete'].map(act => (
                                                    <td key={`admin-${act}`} style={{ textAlign: 'center', background: 'rgba(16,185,129,0.05)' }}>
                                                        {p.actions.includes(act) ? <input type="checkbox" checked disabled /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                                {/* Accountant — controlled */}
                                                {['view', 'create', 'edit', 'delete'].map(act => (
                                                    <td key={`accountant-${act}`} style={{ textAlign: 'center' }}>
                                                        {p.actions.includes(act) ? (
                                                            <input type="checkbox"
                                                                checked={!!permState.accountant?.[p.module]?.[`can_${act}`]}
                                                                onChange={() => togglePerm('accountant', p.module, `can_${act}`)}
                                                            />
                                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                                {/* User — controlled */}
                                                {['view', 'create', 'edit', 'delete'].map(act => (
                                                    <td key={`user-${act}`} style={{ textAlign: 'center', background: 'rgba(239,68,68,0.03)' }}>
                                                        {p.actions.includes(act) ? (
                                                            <input type="checkbox"
                                                                checked={!!permState.user?.[p.module]?.[`can_${act}`]}
                                                                onChange={() => togglePerm('user', p.module, `can_${act}`)}
                                                            />
                                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <button className="btn btn-primary" onClick={savePermissions} disabled={saving}>
                                    {saving ? t('savingProgress') : t('set_savePermissions')}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'general' && (
                        <div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_currency')}</label>
                                    <select className="form-select" value={generalForm.currency} onChange={e => setGeneralForm({ ...generalForm, currency: e.target.value })}>
                                        <option value="دينار كويتي">دينار كويتي</option>
                                        <option value="ريال سعودي">ريال سعودي</option>
                                        <option value="درهم إماراتي">درهم إماراتي</option>
                                        <option value="جنيه مصري">جنيه مصري</option>
                                        <option value="دولار أمريكي">دولار أمريكي</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_currencySymbol')}</label>
                                    <select className="form-select" value={generalForm.currency_symbol} onChange={e => setGeneralForm({ ...generalForm, currency_symbol: e.target.value })}>
                                        <option value="د.ك">د.ك (دينار كويتي)</option>
                                        <option value="ر.س">ر.س (ريال سعودي)</option>
                                        <option value="د.إ">د.إ (درهم إماراتي)</option>
                                        <option value="ج.م">ج.م (جنيه مصري)</option>
                                        <option value="$">$ (دولار)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_taxRate')}</label>
                                    <input type="number" className="form-input" value={generalForm.tax_rate} onChange={e => setGeneralForm({ ...generalForm, tax_rate: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_decimalPlaces')}</label>
                                    <select className="form-select" value={generalForm.decimal_places} onChange={e => setGeneralForm({ ...generalForm, decimal_places: e.target.value })}>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_language')}</label>
                                    <select className="form-select" value={generalForm.language} onChange={e => setGeneralForm({ ...generalForm, language: e.target.value })}>
                                        <option value="ar">العربية</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_allowNegativeStock')}</label>
                                    <select className="form-select" value={generalForm.allow_negative_stock} onChange={e => setGeneralForm({ ...generalForm, allow_negative_stock: e.target.value })}>
                                        <option value="no">{t('set_allowNegativeNo')}</option>
                                        <option value="yes">{t('set_allowNegativeYes')}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={saveGeneralSettings}
                                    disabled={saving}
                                    style={{ minWidth: '120px' }}
                                >
                                    {saving ? t('savingProgress') : t('set_saveSettings')}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'invoice' && (
                        <div>
                            <h4 style={{ marginBottom: '16px' }}>{t('set_invoicePrintSettings')}</h4>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_invoiceTitleSales')}</label>
                                    <input type="text" className="form-input" value={invoiceForm.invoice_title_sales} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_title_sales: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_invoiceTitlePurchase')}</label>
                                    <input type="text" className="form-input" value={invoiceForm.invoice_title_purchase} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_title_purchase: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_invoiceFooter')}</label>
                                <textarea className="form-textarea" value={invoiceForm.invoice_footer} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_footer: e.target.value })} rows={2} placeholder={t('set_invoiceFooterPlaceholder')} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_invoiceTerms')}</label>
                                <textarea className="form-textarea" value={invoiceForm.invoice_terms} onChange={e => setInvoiceForm({ ...invoiceForm, invoice_terms: e.target.value })} rows={4} placeholder={t('set_invoiceTermsPlaceholder')} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_showLogo')}</label>
                                    <select className="form-select" value={invoiceForm.show_logo} onChange={e => setInvoiceForm({ ...invoiceForm, show_logo: e.target.value })}>
                                        <option value="yes">{t('yes')}</option>
                                        <option value="no">{t('no')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_showCompanyInfo')}</label>
                                    <select className="form-select" value={invoiceForm.show_company_info} onChange={e => setInvoiceForm({ ...invoiceForm, show_company_info: e.target.value })}>
                                        <option value="yes">{t('yes')}</option>
                                        <option value="no">{t('no')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_paperSize')}</label>
                                    <select className="form-select" value={invoiceForm.paper_size} onChange={e => setInvoiceForm({ ...invoiceForm, paper_size: e.target.value })}>
                                        <option value="A4">A4</option>
                                        <option value="A5">A5</option>
                                        <option value="Letter">Letter</option>
                                        <option value="thermal">حراري (80mm)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_paperOrientation')}</label>
                                    <select className="form-select" value={invoiceForm.paper_orientation} onChange={e => setInvoiceForm({ ...invoiceForm, paper_orientation: e.target.value })}>
                                        <option value="portrait">{t('set_portrait')}</option>
                                        <option value="landscape">{t('set_landscape')}</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={saveInvoiceSettings}
                                    disabled={saving}
                                    style={{ minWidth: '120px' }}
                                >
                                    {saving ? t('savingProgress') : t('set_saveSettings')}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <Database size={64} style={{ color: 'var(--primary)', marginBottom: '20px' }} />
                            <h3 style={{ marginBottom: '16px' }}>{t('set_backupTitle')}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>{t('set_backupDesc')}</p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button className="btn btn-primary" onClick={backup}><Database size={18} /> {t('set_backupNow')}</button>
                                <button className="btn btn-secondary" onClick={restore}><Database size={18} /> {t('set_restoreFile')}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? t('set_editUser') : t('set_newUser')} footer={<><button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>{t('cancel')}</button><button className="btn btn-primary" onClick={handleUserSubmit}>{t('save')}</button></>}>
                <div className="form-group"><label className="form-label">{t('set_username')} *</label><input type="text" className="form-input" value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">{editingUser ? t('set_newPassword') : t('set_password') + ' *'}</label><input type="password" className="form-input" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} placeholder={editingUser ? t('set_leaveEmpty') : ''} /></div>
                <div className="form-group"><label className="form-label">{t('set_fullName')}</label><input type="text" className="form-input" value={userForm.full_name} onChange={e => setUserForm({ ...userForm, full_name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">{t('set_role')}</label><select className="form-select" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}><option value="admin">{t('admin')}</option><option value="accountant">{t('accountant')}</option><option value="user">{t('user')}</option></select></div>
            </Modal>
        </div>
    );
}

export default Settings;
