import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield, Image } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';

function Settings() {
    const { t, language, setLanguage } = useAuth();
    const [activeTab, setActiveTab] = useState('company');
    const [settings, setSettings] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', full_name: '', role: 'user' });
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    // Local state for general settings (NOT auto-saved)
    const [generalForm, setGeneralForm] = useState({
        currency: 'دينار كويتي',
        currency_symbol: 'د.ك',
        tax_rate: '0',
        decimal_places: '3',
        language: 'ar',
        allow_negative_stock: 'no'
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
            setSettings(settingsData || {});
            setUsers(usersData || []);

            // Initialize local forms from settings
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
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const saveSetting = async (key, value) => {
        await window.api.settings.set(key, value);
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

    const openUserModal = (user = null) => {
        setEditingUser(user);
        setUserForm(user ? { username: user.username, password: '', full_name: user.full_name, role: user.role } : { username: '', password: '', full_name: '', role: 'user' });
        setShowUserModal(true);
    };

    const handleLogoUpload = async () => {
        const result = await window.api.dialog.openFile({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'] }]
        });
        if (!result.canceled && result.filePaths.length > 0) {
            const logoPath = result.filePaths[0];
            setSettings({ ...settings, company: { ...settings.company, company_logo: logoPath } });
            await saveSetting('company_logo', logoPath);
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

    const tabs = [
        { id: 'company', labelKey: 'set_companyInfo', icon: Building2 },
        { id: 'users', labelKey: 'set_users', icon: Users },
        { id: 'permissions', labelKey: 'set_permissions', icon: Shield },
        { id: 'general', labelKey: 'set_general', icon: SettingsIcon },
        { id: 'invoice', labelKey: 'set_invoice', icon: Printer },
        { id: 'backup', labelKey: 'set_backup', icon: Database },
    ];

    const permissions = [
        { module: 'dashboard', labelKey: 'menu_dashboard', actions: ['view'] },
        { module: 'customers', labelKey: 'menu_customers', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'suppliers', labelKey: 'menu_suppliers', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'products', labelKey: 'menu_products', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'sales', labelKey: 'menu_sales', actions: ['view', 'create', 'edit', 'delete', 'print'] },
        { module: 'purchases', labelKey: 'menu_purchases', actions: ['view', 'create', 'edit', 'delete', 'print'] },
        { module: 'accounts', labelKey: 'menu_chartOfAccounts', actions: ['view', 'create', 'edit', 'delete'] },
        { module: 'vouchers', labelKey: 'menu_vouchers', actions: ['view', 'create', 'edit', 'delete', 'print'] },
        { module: 'journal', labelKey: 'menu_journal', actions: ['view', 'create', 'delete'] },
        { module: 'reports', labelKey: 'menu_reports', actions: ['view', 'print'] },
        { module: 'settings', labelKey: 'menu_settings', actions: ['view'] }
    ];

    const actionLabels = {
        view: t('perm_view') || 'عرض',
        create: t('perm_create') || 'إنشاء',
        edit: t('perm_edit') || 'تعديل',
        delete: t('perm_delete') || 'حذف',
        print: t('perm_print') || 'طباعة'
    };

    const accountantDefaults = {
        dashboard: ['view'],
        customers: ['view', 'create', 'edit'],
        suppliers: ['view', 'create', 'edit'],
        products: ['view', 'create', 'edit'],
        sales: ['view', 'create', 'edit', 'print'],
        purchases: ['view', 'create', 'edit', 'print'],
        accounts: ['view'],
        vouchers: ['view', 'create', 'edit', 'print'],
        journal: ['view', 'create'],
        reports: ['view', 'print'],
        settings: []
    };

    const userDefaults = {
        dashboard: ['view'],
        customers: ['view'],
        suppliers: [],
        products: ['view'],
        sales: ['view', 'create', 'print'],
        purchases: [],
        accounts: [],
        vouchers: ['view'],
        journal: [],
        reports: ['view'],
        settings: []
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
                                        {settings.company?.company_logo ? (
                                            <img src={`file:///${settings.company.company_logo.replace(/\\/g, '/')}`} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <Image size={32} style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input type="text" className="form-input" placeholder={t('set_logoPath')} value={settings.company?.company_logo || ''} readOnly style={{ flex: 1 }} />
                                            <button type="button" className="btn btn-secondary" onClick={handleLogoUpload}>{t('set_chooseFile')}</button>
                                        </div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{t('set_logoHelp')}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_companyName')}</label>
                                <input type="text" className="form-input" value={settings.company?.company_name || ''} onChange={e => setSettings({ ...settings, company: { ...settings.company, company_name: e.target.value } })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_companyAddress')}</label>
                                <input type="text" className="form-input" value={settings.company?.company_address || ''} onChange={e => setSettings({ ...settings, company: { ...settings.company, company_address: e.target.value } })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('set_companyPhone')}</label>
                                    <input type="text" className="form-input" value={settings.company?.company_phone || ''} onChange={e => setSettings({ ...settings, company: { ...settings.company, company_phone: e.target.value } })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('set_companyEmail')}</label>
                                    <input type="email" className="form-input" value={settings.company?.company_email || ''} onChange={e => setSettings({ ...settings, company: { ...settings.company, company_email: e.target.value } })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('set_taxNumber')}</label>
                                <input type="text" className="form-input" value={settings.company?.company_tax_number || ''} onChange={e => setSettings({ ...settings, company: { ...settings.company, company_tax_number: e.target.value } })} />
                            </div>
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={async () => {
                                        setSaving(true);
                                        setSaveStatus(t('savingProgress'));
                                        try {
                                            await saveSetting('company_name', settings.company?.company_name || '');
                                            await saveSetting('company_address', settings.company?.company_address || '');
                                            await saveSetting('company_phone', settings.company?.company_phone || '');
                                            await saveSetting('company_email', settings.company?.company_email || '');
                                            await saveSetting('company_tax_number', settings.company?.company_tax_number || '');
                                            showSaveStatus(t('savedSuccess'));
                                        } catch (e) {
                                            showSaveStatus(t('saveFailed'), false);
                                        }
                                        setSaving(false);
                                    }}
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
                                            <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? t('active') : t('inactive')}</span></td>
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
                                <table style={{ minWidth: '800px' }}>
                                    <thead>
                                        <tr>
                                            <th rowSpan="2" style={{ verticalAlign: 'middle' }}>{t('set_module')}</th>
                                            <th colSpan="5" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('admin')}</th>
                                            <th colSpan="5" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('accountant')}</th>
                                            <th colSpan="5" style={{ textAlign: 'center', borderBottom: '1px solid var(--border)' }}>{t('user')}</th>
                                        </tr>
                                        <tr>
                                            {[t('admin'), t('accountant'), t('user')].map(role =>
                                                ['view', 'create', 'edit', 'delete', 'print'].map(act => (
                                                    <th key={`${role}-${act}`} style={{ textAlign: 'center', fontSize: '0.7rem', padding: '6px 4px', fontWeight: 500 }}>{actionLabels[act]}</th>
                                                ))
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {permissions.map(p => (
                                            <tr key={p.module}>
                                                <td style={{ fontWeight: 500 }}>{t(p.labelKey)}</td>
                                                {/* Admin - all actions checked and disabled */}
                                                {['view', 'create', 'edit', 'delete', 'print'].map(act => (
                                                    <td key={`admin-${act}`} style={{ textAlign: 'center', background: 'rgba(16,185,129,0.05)' }}>
                                                        {p.actions.includes(act) ? <input type="checkbox" checked disabled /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                                {/* Accountant */}
                                                {['view', 'create', 'edit', 'delete', 'print'].map(act => (
                                                    <td key={`accountant-${act}`} style={{ textAlign: 'center' }}>
                                                        {p.actions.includes(act) ? <input type="checkbox" defaultChecked={accountantDefaults[p.module]?.includes(act)} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                                {/* User */}
                                                {['view', 'create', 'edit', 'delete', 'print'].map(act => (
                                                    <td key={`user-${act}`} style={{ textAlign: 'center', background: 'rgba(239,68,68,0.03)' }}>
                                                        {p.actions.includes(act) ? <input type="checkbox" defaultChecked={userDefaults[p.module]?.includes(act)} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '16px' }}>
                                <button className="btn btn-primary">{t('set_savePermissions')}</button>
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
