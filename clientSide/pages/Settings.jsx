import React, { useState, useEffect, useRef } from 'react';
import {
    Settings as Ico, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield,
    Image, FileText, Globe, AlertTriangle, Save, RefreshCw, Download, Upload, Eye, EyeOff,
    Home, Truck, Package, Wallet, Monitor, ShoppingCart, ShoppingBag, CreditCard,
    BookOpen, UserCheck, TrendingDown, Warehouse, Ticket, BarChart3, Key, Undo, RotateCcw, Barcode
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { clearCachedProducts } from '../utils/posCache';

import { Fld, inp, btnStyle, roleColor } from './settings/shared';
import CompanySettings from './settings/CompanySettings';
import GeneralSettings from './settings/GeneralSettings';
import PrintInvoiceSettings from './settings/PrintInvoiceSettings';
import UsersSettings from './settings/UsersSettings';
import PermissionsSettings from './settings/PermissionsSettings';
import AiSettings from './settings/AiSettings';
import ActivityLogSettings from './settings/ActivityLogSettings';
import ExcelProgramSettings from './settings/ExcelProgramSettings';
import DatabaseSettings from './settings/DatabaseSettings';

// Activity Log Cache
let activityLogCache = {
    logs: [],
    filters: { module: '', action: '', user_name: '', startDate: '', endDate: '' },
    skip: 0,
    hasMore: true
};

export default function Settings() {
    const auth = useAuth() || {};
    const { user, updateUser, t = (k) => k, theme, language } = auth;

    const tr = (key, fallback) => {
        const val = t(key);
        return (val && val !== key) ? val : fallback;
    };

    const roleName = r => r === 'admin' ? tr('admin_role', 'مدير النظام') : r === 'accountant' ? tr('accountant_role', 'محاسب') : tr('user_role', 'مستخدم');

    const PERM_CATEGORIES = [
        {
            id: 'sales_purchases',
            title: tr('cat_sales_purchases', 'المبيعات والمشتريات'),
            icon: ShoppingCart,
            modules: [
                { m: 'dashboard', l: tr('dashboard', 'الرئيسية (لوحة التحكم)'), a: ['view'] },
                { m: 'sales_invoices', l: tr('sales_invoices', 'فواتير المبيعات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'sales_returns', l: tr('sales_returns', 'مرتجع المبيعات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'quotations', l: tr('menu_quotations', 'عروض الأسعار'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'purchase_invoices', l: tr('purchase_invoices', 'فواتير المشتريات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'purchase_returns', l: tr('purchase_returns', 'مرتجع المشتريات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'pos', l: tr('pos', 'نقطة البيع (POS)'), a: ['view', 'create'] }
            ]
        },
        {
            id: 'accounts_finance',
            title: tr('cat_accounts_finance', 'الحسابات والمالية'),
            icon: Building2,
            modules: [
                { m: 'chart_of_accounts', l: tr('chart_of_accounts', 'شجرة الحسابات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'cash_bank', l: tr('cash_bank', 'الصناديق والبنوك'), a: ['view', 'create'] },
                { m: 'journal_entries', l: tr('journal_entries', 'القيود اليومية'), a: ['view', 'create', 'delete'] },
                { m: 'receipt_vouchers', l: tr('receipt_vouchers', 'سندات القبض'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'payment_vouchers', l: tr('payment_vouchers', 'سندات الصرف'), a: ['view', 'create', 'edit', 'delete'] }
            ]
        },
        {
            id: 'products_warehouse',
            title: tr('cat_products_warehouse', 'المنتجات والمخازن'),
            icon: Package,
            modules: [
                { m: 'products', l: tr('products', 'إدارة المنتجات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'products_import', l: tr('products_import', 'استيراد المنتجات (إكسل)'), a: ['view'] },
                { m: 'products_export', l: tr('products_export', 'تصدير المنتجات (إكسل)'), a: ['view'] },
                { m: 'warehouse', l: tr('warehouse', 'إدارة المستودعات والمخزن'), a: ['view', 'create', 'delete'] }
            ]
        },
        {
            id: 'hr_expenses',
            title: tr('cat_hr_expenses', 'الموظفون والمصروفات'),
            icon: UserCheck,
            modules: [
                { m: 'hr', l: tr('hr', 'شؤون الموظفين'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'expenses', l: tr('expenses', 'المصروفات والأرباح'), a: ['view', 'create', 'delete'] }
            ]
        },
        {
            id: 'marketing_reports',
            title: tr('cat_marketing_reports', 'التقارير والخصومات والمساعد'),
            icon: BarChart3,
            modules: [
                { m: 'offers', l: tr('offers', 'العروض والكوبونات'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'reports', l: tr('reports', 'التقارير الشاملة'), a: ['view'] },
                { m: 'ai_assistant', l: tr('ai_assistant', 'المساعد الذكي (AI)'), a: ['view'] }
            ]
        },
        {
            id: 'settings_system',
            title: tr('cat_settings_system', 'إعدادات النظام والبرنامج'),
            icon: Ico,
            modules: [
                { m: 'settings', l: tr('general_company_settings', 'الإعدادات العامة والشركة'), a: ['view', 'edit'] },
                { m: 'excel_backup', l: tr('excel_mini_program', 'برنامج Excel المصغر والتصدير'), a: ['view', 'create'] },
                { m: 'users', l: tr('users', 'إدارة المستخدمين'), a: ['view', 'create', 'edit', 'delete'] },
                { m: 'permissions', l: tr('permissions', 'الصلاحيات وإدارة الأدوار'), a: ['view', 'edit'] },
                { m: 'database', l: tr('database_management', 'إعدادات قاعدة البيانات والربط السحابي'), a: ['view'] },
                { m: 'activity_log', l: tr('activity_log', 'سجل النشاط'), a: ['view'] },
                { m: 'stock_alerts', l: tr('stock_alerts', 'تنبيهات المخزون'), a: ['view'] }
            ]
        }
    ];

    const PERM_KEYS = [
        { key: 'can_view', label: tr('view', 'عرض'), act: 'view' },
        { key: 'can_create', label: tr('create', 'إضافة'), act: 'create' },
        { key: 'can_edit', label: tr('edit', 'تعديل'), act: 'edit' },
        { key: 'can_delete', label: tr('delete', 'حذف'), act: 'delete' },
    ];
    const isSuperAdmin = user?.id === 1 || user?.username === 'admin';
    const canAccess = (mod, act = 'can_view') => {
        if (isSuperAdmin) return true;
        if (user?.role === 'admin') return true;
        if (user?.permissions && user.permissions[mod]) {
            const val = user.permissions[mod][act];
            if (val !== undefined && val !== null) return !!val;
        }
        if (mod === 'excel_backup') {
            return gen.allow_manager_excel === 'yes';
        }
        return false;
    };
    const isAdmin = isSuperAdmin || user?.role === 'admin';

    const getModIcon = (mod) => {
        const icons = {
            dashboard: Home, customers: Users, suppliers: Truck, products: Package,
            products_import: Download, products_export: Download, excel_backup: FileText,
            sales_invoices: ShoppingCart, quotations: FileText, sales_returns: Undo,
            purchase_invoices: ShoppingBag, purchase_returns: RotateCcw, receipt_vouchers: CreditCard,
            payment_vouchers: Wallet, chart_of_accounts: Building2, cash_bank: Wallet,
            journal_entries: BookOpen, hr: UserCheck, expenses: TrendingDown, pos: Monitor,
            warehouse: Warehouse, offers: Ticket, reports: BarChart3, settings: Ico,
            users: Users, permissions: Shield, database: Database, financial_summary: BarChart3,
            stock_alerts: AlertTriangle, customer_receivables: CreditCard, dashboard_charts: BarChart3
        };
        const IcoComp = icons[mod] || Shield;
        return <IcoComp size={16} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
    };

    const [sec, setSec] = useState('company');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);

    const [expandedCats, setExpandedCats] = useState({
        sales_purchases: true, accounts_finance: false, products_warehouse: false,
        hr_expenses: false, marketing_reports: false, settings_system: false
    });

    const toggleCat = (catId) => {
        setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    const [dbStatus, setDbStatus] = useState({ isConnected: true, error: '', hasConfiguredUri: false, isCloud: false });
    const [cloudModalOpen, setCloudModalOpen] = useState(false);
    const [newCloudUri, setNewCloudUri] = useState('');
    const [cloudError, setCloudError] = useState('');
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
    const [permMode, setPermMode] = useState('role');
    const [permSearch, setPermSearch] = useState('');
    const [selRole, setSelRole] = useState('accountant');
    const [pwdModalOpen, setPwdModalOpen] = useState(false);
    const [pwdAction, setPwdAction] = useState(null);
    const [confirmPhraseValue, setConfirmPhraseValue] = useState('');
    const [resetOptions, setResetOptions] = useState({
        deleteTransactions: true, deleteProducts: false, deleteContacts: false, deleteSettingsAndUsers: false
    });
    const [isResetting, setIsResetting] = useState(false);
    const [resetLoadingText, setResetLoadingText] = useState('');
    const [showExcelExportModal, setShowExcelExportModal] = useState(false);
    const [excelExportPath, setExcelExportPath] = useState('');

    const handleConfirmExcelExport = async (includeData) => {
        setShowExcelExportModal(false);
        if (!excelExportPath) return;
        setResetLoadingText(t('exporting_excel_loading') || 'جاري إعداد وتحميل شيت الإكسيل...');
        setIsResetting(true);
        const res = await window.api.database.backupToExcel(excelExportPath, includeData);
        setIsResetting(false);
        setResetLoadingText('');
        if (res?.success) {
            if (res.warning) {
                toast.success(res.warning, { duration: 6000 });
            } else {
                toast.success(t('savedSuccess') || 'تم حفظ وتصدير ملف الإكسيل بنجاح');
            }
        } else {
            const errText = res?.error || '';
            if (errText.includes('EBUSY') || errText.includes('busy or locked')) {
                toast.error('فشل الحفظ: ملف الإكسيل مفتوح حالياً في برنامج Excel. يرجى إغلاق ملف الإكسيل أولاً وإعادة المحاولة.', { duration: 6000 });
            } else {
                toast.error((t('failed') || 'فشل التصدير') + ': ' + errText);
            }
        }
        setExcelExportPath('');
    };

    const upUserIdRef = useRef(null);

    const [counts, setCounts] = useState({ products: 0, customers: 0, suppliers: 0, sales_invoices: 0, purchase_invoices: 0 });
    const [co, setCo] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_tax_number: '', company_logo: '' });
    const [printers, setPrinters] = useState([]);
    const [printConf, setPrintConf] = useState({
        pos_printer: '', invoice_printer: '', pos_silent_print: 'no', invoice_silent_print: 'no', enable_global_barcode: 'no'
    });
    const [gen, setGen] = useState({
        currency: t('default_currency') || 'Kuwaiti Dinar', currency_symbol: t('currency_kd') || 'KD', tax_rate: '0', decimal_places: '3',
        allow_negative_stock: 'no', show_financial_summary: 'yes', show_low_stock_products: 'yes', show_customer_receivables: 'yes',
        show_sales_purchases_charts: 'yes', language: 'en', enable_product_color: 'no',
        brand_color: '#2563eb', enable_pos_sounds: 'yes', enable_alert_sounds: 'yes',
        show_purchase_price_in_pos: 'no', allow_manager_excel: 'no'
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
    const [ai, setAi] = useState({ gemini_api_key: '', enable_ai_assistant: 'no' });

    const SECTIONS = [
        ...((canAccess('settings', 'can_view') || canAccess('settings', 'can_edit')) ? [
            { id: 'company', l: tr('company_details', 'بيانات الشركة'), icon: Building2 },
            { id: 'general', l: tr('general_settings', 'الإعدادات العامة'), icon: Ico },
            { id: 'print_invoice', l: tr('invoice_settings', 'إعدادات الفاتورة'), icon: FileText },
        ] : []),
        ...((canAccess('excel_backup', 'can_view') || canAccess('excel_backup', 'can_create')) ? [
            { id: 'excel_program', l: tr('excel_mini_program', 'برنامج Excel المصغر والأرشيف'), icon: FileText },
        ] : []),
        ...((canAccess('users', 'can_view') || canAccess('admin_user_management', 'can_view')) ? [
            { id: 'users', l: tr('users', 'إدارة المستخدمين'), icon: Users },
        ] : []),
        ...((canAccess('permissions', 'can_view')) ? [
            { id: 'permissions', l: tr('permissions', 'الصلاحيات'), icon: Shield },
        ] : []),
        ...((canAccess('ai_assistant', 'can_edit') || canAccess('ai_assistant', 'can_view')) ? [
            { id: 'ai_assistant', l: tr('ai_assistant', 'المساعد الذكي'), icon: Key },
        ] : []),
        ...((canAccess('activity_log', 'can_view') || canAccess('admin_activity_log', 'can_view')) ? [
            { id: 'activity_log', l: tr('activity_log', 'سجل النشاط'), icon: FileText },
        ] : []),
        ...((canAccess('database', 'can_view')) ? [
            { id: 'database', l: tr('database', 'قاعدة البيانات'), icon: Database },
        ] : []),
    ];

    useEffect(() => {
        const allowedIds = SECTIONS.map(s => s.id);
        if (allowedIds.length > 0 && !allowedIds.includes(sec)) {
            setSec(allowedIds[0]);
        }
    }, [user?.permissions, sec]);

    // ── Activity Log State ───────────────────────────────────────────────────
    const [activityLogs, setActivityLogs] = useState(activityLogCache.logs);
    const [logLoading, setLogLoading] = useState(false);
    const [moreLoading, setMoreLoading] = useState(false);
    const [logFilters, setLogFilters] = useState(activityLogCache.filters);
    const sentinelRef = useRef(null);

    useEffect(() => { loadData(); }, []);
    useEffect(() => {
        if (!isAdmin && sec === 'permissions') {
            setSec('company');
        } else if (sec === 'excel_program' && !canAccess('excel_backup')) {
            setSec('company');
        } else if (sec === 'permissions' && !permLoaded) {
            loadPerms();
        }
    }, [sec, isAdmin, permLoaded, gen.allow_manager_excel]);
    useEffect(() => { if (sec === 'activity_log') loadActivityLog(logFilters); }, [sec]);

    const loadActivityLog = async (filters = logFilters, isAppend = false) => {
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(activityLogCache.filters);
        if (!isAppend && !filtersChanged && activityLogCache.logs.length > 0) {
            setActivityLogs(activityLogCache.logs);
            return;
        }

        if (isAppend) {
            setMoreLoading(true);
        } else {
            setLogLoading(true);
        }

        try {
            const limit = 30;
            const currentSkip = isAppend ? activityLogCache.skip : 0;
            const logs = await window.api.activityLog.getAll({ ...filters, limit, skip: currentSkip });
            
            if (isAppend) {
                const merged = [...activityLogCache.logs, ...(logs || [])];
                activityLogCache.logs = merged;
                activityLogCache.skip = currentSkip + (logs || []).length;
                activityLogCache.hasMore = (logs || []).length === limit;
                activityLogCache.filters = { ...filters };
                setActivityLogs(merged);
            } else {
                activityLogCache.logs = logs || [];
                activityLogCache.skip = (logs || []).length;
                activityLogCache.hasMore = (logs || []).length === limit;
                activityLogCache.filters = { ...filters };
                setActivityLogs(logs || []);
            }
        } catch (e) {
            console.error(e);
        }
        setLogLoading(false);
        setMoreLoading(false);
    };

    useEffect(() => {
        if (sec !== 'activity_log') return;

        const observer = new IntersectionObserver((entries) => {
            const first = entries[0];
            if (first.isIntersecting && activityLogCache.hasMore && !logLoading && !moreLoading) {
                loadActivityLog(activityLogCache.filters, true);
            }
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [sec, logLoading, moreLoading]);

    const loadData = async () => {
        try {
            const [sd, ud] = await Promise.all([window.api.settings.getAll(), window.api.users.getAll()]);
            setUsers(ud || []);
            if (sd?.company) setCo(prev => ({ ...prev, ...sd.company }));
            if (sd?.general) {
                setGen(prev => ({ 
                    ...prev, 
                    ...sd.general, 
                    tax_rate: sd.tax?.tax_rate || prev.tax_rate,
                    brand_color: sd.general?.brand_color || '#2563eb',
                    enable_pos_sounds: sd.general?.enable_pos_sounds !== undefined ? sd.general.enable_pos_sounds : 'yes',
                    enable_alert_sounds: sd.general?.enable_alert_sounds !== undefined ? sd.general.enable_alert_sounds : 'yes',
                    allow_manager_excel: sd.general?.allow_manager_excel !== undefined ? sd.general.allow_manager_excel : 'no'
                }));
            }
            if (sd?.ai) {
                setAi(prev => ({
                    ...prev,
                    ...sd.ai,
                    gemini_api_key: sd.ai.gemini_api_key || '',
                    enable_ai_assistant: sd.ai.enable_ai_assistant || 'no'
                }));
            }
            if (sd?.invoice) {
                setInv(prev => ({ 
                    ...prev, 
                    ...sd.invoice,
                    logo_position: sd.invoice.logo_position || 'center',
                    logo_size: sd.invoice.logo_size || 'medium',
                    print_color: sd.invoice.print_color || '#2563eb'
                }));
            }
            if (sd?.company?.company_logo && window.api?.file?.readAsBase64) {
                const b64 = await window.api.file.readAsBase64(sd.company.company_logo);
                if (b64) setLogoPreview(b64);
            }
            
            if (window.api.database?.getConnectionStatus) {
                try {
                    const stat = await window.api.database.getConnectionStatus();
                    setDbStatus(stat || { isConnected: true, error: '', hasConfiguredUri: false, isCloud: false });
                } catch (dbStatErr) {
                    console.error("Error loading database connection status:", dbStatErr);
                }
            }

            try {
                const [products, customers, suppliers, salesInv, purchaseInv] = await Promise.all([
                    window.api.products.getAll(),
                    window.api.customers.getAll(),
                    window.api.suppliers.getAll(),
                    window.api.invoices.getAll('sales'),
                    window.api.invoices.getAll('purchase')
                ]);
                setCounts({
                    products: products?.length || 0,
                    customers: customers?.length || 0,
                    suppliers: suppliers?.length || 0,
                    sales_invoices: salesInv?.length || 0,
                    purchase_invoices: purchaseInv?.length || 0
                });
            } catch (err) {
                console.error("Failed to load diagnostic counts:", err);
            }

            if (sd?.printing) {
                setPrintConf(prev => ({ ...prev, ...sd.printing }));
            }
            if (window.api?.print?.getPrinters) {
                try {
                    const plist = await window.api.print.getPrinters();
                    setPrinters(plist || []);
                } catch (pe) {
                    console.error("Error loading system printers:", pe);
                }
            }
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
            const [a, u] = await Promise.all([
                window.api.permissions.getByRole('accountant'),
                window.api.permissions.getByRole('user')
            ]);
            setPermState({ accountant: a || {}, user: u || {} });
            setPermLoaded(true);
        } catch (e) { console.error(e); }
    };

    const togglePerm = (role, mod, key) => setPermState(p => ({
        ...p, [role]: { ...p[role], [mod]: { ...p[role]?.[mod], [key]: !p[role]?.[mod]?.[key] } }
    }));

    const savePerms = async () => {
        setSaving(true);
        try {
            const currentRolePerms = permState[selRole] || {};
            await window.api.permissions.savePermissions(selRole, currentRolePerms);
            toast.success(t('savedSuccess') || 'Permissions saved successfully');

            if (user && user.role === selRole) {
                const userPermsRes = await window.api.permissions.getUserPermissions(user.id);
                let freshPerms = {};
                if (userPermsRes && userPermsRes.hasIndividual) {
                    freshPerms = userPermsRes.permissions;
                } else {
                    freshPerms = await window.api.permissions.getByRole(user.role);
                }
                if (freshPerms && Object.keys(freshPerms).length > 0) {
                    updateUser({ ...user, permissions: freshPerms });
                }
            }
        } catch (e) {
            console.error('Save role permissions error:', e);
            toast.error(t('errorOccurred') || 'An error occurred');
        }
        setSaving(false);
    };

    const loadUserPerms = async (u) => {
        setUpState({});
        setUpHasInd(false);
        setUpLoading(true);
        upUserIdRef.current = u.id;
        try {
            const r = await window.api.permissions.getUserPermissions(u.id);
            if (upUserIdRef.current !== u.id) return;
            setUpHasInd(r.hasIndividual);
            let userPermsState = {};
            if (r.hasIndividual) {
                userPermsState = { ...(r.permissions || {}) };
            } else {
                const rolePerms = await window.api.permissions.getByRole(u.role);
                if (upUserIdRef.current !== u.id) return;
                userPermsState = { ...(rolePerms || {}) };
            }
            if (u.id === 1 || u.username === 'admin') {
                const adminMods = ['permissions', 'users', 'admin_system_reset', 'admin_user_management', 'admin_cloud_database', 'admin_excel_export'];
                for (const mod of adminMods) {
                    if (userPermsState[mod] === undefined) {
                        userPermsState[mod] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                    }
                }
            }
            setUpState(userPermsState);
        } catch (e) { console.error(e); }
        setUpLoading(false);
    };

    const saveUserPerms = async () => {
        if (!selUser) return;
        setSaving(true);
        try {
            await window.api.permissions.saveUserPermissions(selUser.id, upState);
            setUpHasInd(true);
            toast.success(t('savedSuccess') || 'Individual permissions saved');

            if (user && selUser.id === user.id) {
                updateUser({ ...user, permissions: upState, has_individual_permissions: true });
            }
        } catch (e) {
            console.error('Save user permissions error:', e);
            toast.error(t('errorOccurred') || 'An error occurred');
        }
        setSaving(false);
    };

    const clearUserPerms = async () => {
        if (!selUser || !confirm(`${t('reset_perms_confirm') || 'Reset permissions to default for'} ${selUser.full_name}?`)) return;
        setSaving(true);
        try {
            await window.api.permissions.clearUserPermissions(selUser.id);
            setUpHasInd(false);
            const rolePerms = await window.api.permissions.getByRole(selUser.role) || {};
            setUpState(rolePerms);
            toast.success(t('reset_success') || 'Reset successfully');

            if (user && selUser.id === user.id) {
                updateUser({ ...user, permissions: rolePerms, has_individual_permissions: false });
            }
        } catch (e) {
            console.error('Clear user permissions error:', e);
            toast.error(t('errorOccurred') || 'An error occurred');
        }
        setSaving(false);
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
                setResetLoadingText(t('restoring_db_loading') || 'جاري استعادة قاعدة البيانات...');
                setIsResetting(true);
                const res = await window.api.settings.restore(r.filePaths[0]);
                if (res?.success) { 
                    try { await clearCachedProducts(); localStorage.removeItem('last_products_sync_time'); localStorage.removeItem('last_products_sync_db_sig'); } catch(e) {}
                    toast.success(t('restored_success') || 'Restored successfully'); 
                    window.location.reload(); 
                } else {
                    setIsResetting(false);
                    setResetLoadingText('');
                    toast.error((t('failed') || 'Failed') + ': ' + (res?.error || ''));
                }
            }
        }
    };
    const backupToExcel = async () => {
        const r = await window.api.dialog.saveFile({ 
            defaultPath: `vero_excel_backup_${new Date().toISOString().slice(0, 10)}.xlsx`, 
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }] 
        });
        if (!r.canceled && r.filePath) {
            setExcelExportPath(r.filePath);
            setShowExcelExportModal(true);
        }
    };
    const triggerResetApp = () => {
        setPwdAction('resetApp');
        setConfirmPhraseValue('');
        setResetOptions({
            deleteTransactions: true,
            deleteProducts: false,
            deleteContacts: false,
            deleteSettingsAndUsers: false
        });
        setPwdModalOpen(true);
    };

    const triggerDeleteAllProducts = () => {
        setPwdAction('deleteAllProducts');
        setConfirmPhraseValue('');
        setPwdModalOpen(true);
    };

    const handlePasswordSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const expectedPhrase = pwdAction === 'deleteAllProducts'
            ? 'حذف كافة المنتجات'
            : (resetOptions.deleteSettingsAndUsers ? 'تصفير كافة البيانات' : 'تصفير جزئي للبيانات');

        if (confirmPhraseValue !== expectedPhrase) {
            toast.error(t('phrase_mismatch_error') || 'عبارة التأكيد غير مطابقة!');
            return;
        }

        setPwdModalOpen(false);
        if (pwdAction === 'resetApp') {
            setResetLoadingText(t('resetting_app_loading') || 'جاري تهيئة قاعدة البيانات وبدء شركة جديدة...');
            setIsResetting(true);
            const res = await window.api.settings?.resetApp?.(resetOptions);
            try { await clearCachedProducts(); localStorage.removeItem('last_products_sync_time'); localStorage.removeItem('last_products_sync_db_sig'); } catch(e) {}
            if (res && res.success) {
                toast.success(t('savedSuccess') || 'Data reset successfully');
                if (!res.relaunch) {
                    window.location.reload();
                }
            } else {
                setIsResetting(false);
                setResetLoadingText('');
                toast.error(res?.error || t('errorOccurred') || 'An error occurred during reset');
            }
        } else if (pwdAction === 'deleteAllProducts') {
            try {
                const result = await window.api.products.deleteAll();
                if (result && result.success) {
                    try { await clearCachedProducts(); localStorage.removeItem('last_products_sync_time'); } catch(e) {}
                    toast.success(t('savedSuccess') || 'Products deleted successfully');
                    loadData();
                } else {
                    toast.error(result?.error || t('errorOccurred') || 'An error occurred while deleting products');
                }
            } catch (error) {
                console.error(error);
                toast.error(t('errorOccurred') || 'An error occurred while deleting products');
            }
        }
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', direction: 'rtl' }}>

            {/* ── Sidebar ── */}
            <div style={{
                width: 220, flexShrink: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                margin: '16px 8px 16px 16px',
                padding: '16px 8px',
                display: 'flex', flexDirection: 'column', overflowY: 'auto',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ padding: '0 12px 10px', fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {t('settings') || 'الإعدادات'}
                </div>
                {SECTIONS.map(s => {
                    const active = sec === s.id;
                    return (
                        <button key={s.id} onClick={() => setSec(s.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: '4px 6px',
                            borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'right', fontSize: '.85rem',
                            fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                            background: active ? 'var(--primary-light)' : 'transparent',
                            color: active ? 'var(--primary)' : 'var(--text-secondary)',
                            transition: 'all 0.25s ease',
                            position: 'relative',
                            borderRight: active ? '3px solid var(--primary)' : '3px solid transparent',
                            paddingRight: active ? 11 : 14
                        }}>
                            <s.icon size={15} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{s.l}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {sec === 'company' && (
                    <CompanySettings
                        co={co} setCo={setCo}
                        logoPreview={logoPreview} setLogoPreview={setLogoPreview}
                        handleLogo={handleLogo} saveSection={saveSection} saving={saving} tr={tr}
                    />
                )}

                {sec === 'general' && (
                    <GeneralSettings
                        gen={gen} setGen={setGen}
                        saving={saving} setSaving={setSaving}
                        saveSetting={saveSetting} isSuperAdmin={isSuperAdmin} t={t}
                    />
                )}

                {sec === 'print_invoice' && (
                    <PrintInvoiceSettings
                        inv={inv} setInv={setInv} co={co} logoPreview={logoPreview}
                        saveSection={saveSection} saving={saving}
                        printConf={printConf} setPrintConf={setPrintConf}
                        printers={printers} t={t}
                    />
                )}

                {sec === 'users' && (
                    <UsersSettings
                        users={users} setUsers={setUsers} user={user} roleName={roleName}
                        setEditingUser={setEditingUser} setUserForm={setUserForm}
                        setShowPw={setShowPw} setShowUserModal={setShowUserModal} t={t}
                    />
                )}

                {sec === 'permissions' && (
                    <PermissionsSettings
                        permMode={permMode} setPermMode={setPermMode}
                        selRole={selRole} setSelRole={setSelRole}
                        permLoaded={permLoaded} loadPerms={loadPerms} roleName={roleName}
                        PERM_CATEGORIES={PERM_CATEGORIES} PERM_KEYS={PERM_KEYS}
                        expandedCats={expandedCats} toggleCat={toggleCat}
                        getModIcon={getModIcon} permState={permState} togglePerm={togglePerm}
                        savePerms={savePerms} saving={saving} tr={tr} t={t} language={language}
                        users={users} permSearch={permSearch} setPermSearch={setPermSearch}
                        selUser={selUser} setSelUser={setSelUser} loadUserPerms={loadUserPerms}
                        upHasInd={upHasInd} upLoading={upLoading} upState={upState} setUpState={setUpState}
                        saveUserPerms={saveUserPerms} clearUserPerms={clearUserPerms}
                    />
                )}

                {sec === 'activity_log' && isAdmin && (
                    <ActivityLogSettings
                        activityLogs={activityLogs} activityLogCache={activityLogCache}
                        logLoading={logLoading} moreLoading={moreLoading}
                        logFilters={logFilters} setLogFilters={setLogFilters}
                        loadActivityLog={loadActivityLog} sentinelRef={sentinelRef}
                        getModIcon={getModIcon} t={t}
                    />
                )}

                {sec === 'excel_program' && (canAccess('excel_backup', 'can_view') || canAccess('excel_backup', 'can_create')) && (
                    <ExcelProgramSettings
                        isSuperAdmin={isSuperAdmin} gen={gen} setGen={setGen}
                        saveSetting={saveSetting} backupToExcel={backupToExcel}
                        canAccess={canAccess} t={t}
                    />
                )}

                {sec === 'ai_assistant' && (isAdmin || user?.permissions?.ai_assistant?.can_edit) && (
                    <AiSettings
                        ai={ai} setAi={setAi} showPw={showPw} setShowPw={setShowPw}
                        saveSection={saveSection} saving={saving} t={t}
                    />
                )}

                {sec === 'database' && (isAdmin || user?.permissions?.database?.can_view) && (
                    <DatabaseSettings
                        dbStatus={dbStatus} setNewCloudUri={setNewCloudUri}
                        setCloudError={setCloudError} setCloudModalOpen={setCloudModalOpen}
                        saving={saving} backup={backup} restore={restore} user={user}
                        triggerDeleteAllProducts={triggerDeleteAllProducts}
                        triggerResetApp={triggerResetApp} t={t}
                    />
                )}
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

            {/* ── Cloud Database URI Settings Modal ───────────────────────────────── */}
            {cloudModalOpen && (
                <Modal isOpen={cloudModalOpen} onClose={() => setCloudModalOpen(false)} title={t('database_connection') || 'اتصال قاعدة البيانات'}>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newCloudUri) return;
                        setCloudError('');
                        setSaving(true);
                        try {
                            const res = await window.api.database.setConnectionUri(newCloudUri);
                            if (res.success) {
                                toast.success(t('connection_saved_relaunching') || 'تم حفظ الاتصال بنجاح! يجري إعادة تشغيل التطبيق...');
                                setCloudModalOpen(false);
                            } else {
                                setCloudError(res.error || 'فشل الاتصال بالرابط المدخل');
                            }
                        } catch (err) {
                            setCloudError(err.message);
                        } finally {
                            setSaving(false);
                        }
                    }}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
                            {t('switch_to_cloud_desc') || 'أدخل رابط اتصال MongoDB Atlas لربط هذا الجهاز ومزامنة البيانات في الوقت الحقيقي.'}
                        </p>
                        {cloudError && (
                            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 6, padding: 10, color: 'var(--danger)', fontSize: '.8rem', marginBottom: 14, wordBreak: 'break-all' }}>
                                {cloudError}
                            </div>
                        )}
                        <Fld label={t('enter_mongodb_uri') || 'رابط الاتصال (Connection URI):'}>
                            <textarea
                                className="form-input"
                                value={newCloudUri}
                                onChange={e => setNewCloudUri(e.target.value)}
                                placeholder="mongodb+srv://user:password@cluster0.mongodb.net/vero"
                                required
                                disabled={saving}
                                style={{ ...inp, height: 80, resize: 'none', fontFamily: 'monospace', direction: 'ltr' }}
                            />
                        </Fld>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                            <button 
                                className="btn btn-secondary" 
                                type="button" 
                                onClick={() => setCloudModalOpen(false)}
                                disabled={saving}
                                style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                {t('cancel') || 'إلغاء'}
                            </button>
                            <button 
                                className="btn btn-primary" 
                                type="submit"
                                disabled={saving}
                                style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}
                            >
                                {saving ? (t('saving') || 'جارٍ الحفظ...') : (t('save') || 'حفظ وااختبار')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Password Verification Modal ─────────────────────────────────────── */}
            {pwdModalOpen && (() => {
                const expectedPhrase = pwdAction === 'deleteAllProducts' ? 'حذف كافة المنتجات' : (resetOptions.deleteSettingsAndUsers ? 'تصفير كافة البيانات' : 'تصفير جزئي للبيانات');
                const isPhraseMatched = confirmPhraseValue === expectedPhrase;
                return (
                    <Modal isOpen={pwdModalOpen} onClose={() => setPwdModalOpen(false)} title={pwdAction === 'resetApp' ? (t('reset_app') || 'إعادة ضبط التطبيق') : (t('prod_deleteAll') || 'حذف كل المنتجات')}>
                        <form onSubmit={e => e.preventDefault()}>
                            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
                                {pwdAction === 'resetApp'
                                    ? (t('reset_app_warning') || '⚠️ تحذير: سيتم حذف كافة البيانات المسجلة نهائياً ولا يمكن التراجع عن ذلك!')
                                    : (t('prod_deleteAllConfirm') || 'هل أنت متأكد من حذف جميع المنتجات من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة!')}
                            </p>
                            {pwdAction === 'resetApp' && (
                                <div style={{ 
                                    marginBottom: 16, 
                                    padding: 12, 
                                    background: 'var(--bg-secondary)', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10
                                }}>
                                    <label style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                        {t('select_reset_options') || 'اختر البيانات التي تريد تصفيرها وحذفها:'}
                                    </label>
                                    
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.85rem', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={resetOptions.deleteTransactions}
                                            onChange={e => setResetOptions(prev => ({ ...prev, deleteTransactions: e.target.checked }))}
                                            disabled={resetOptions.deleteSettingsAndUsers}
                                        />
                                        <span>{t('delete_transactions') || 'حذف المعاملات المالية (الفواتير، السندات، القيود اليومية، والمصروفات)'}</span>
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.85rem', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={resetOptions.deleteProducts}
                                            onChange={e => setResetOptions(prev => ({ ...prev, deleteProducts: e.target.checked }))}
                                            disabled={resetOptions.deleteSettingsAndUsers}
                                        />
                                        <span>{t('delete_products_list') || 'حذف قائمة المنتجات والمخزون والعروض'}</span>
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.85rem', color: 'var(--text-primary)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={resetOptions.deleteContacts}
                                            onChange={e => setResetOptions(prev => ({ ...prev, deleteContacts: e.target.checked }))}
                                            disabled={resetOptions.deleteSettingsAndUsers}
                                        />
                                        <span>{t('delete_contacts_list') || 'حذف قائمة العملاء والموردين'}</span>
                                    </label>

                                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '.85rem', color: 'var(--danger)', fontWeight: 600 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={resetOptions.deleteSettingsAndUsers}
                                            onChange={e => {
                                                const val = e.target.checked;
                                                setResetOptions(prev => ({
                                                    ...prev,
                                                    deleteSettingsAndUsers: val,
                                                    deleteTransactions: val ? true : prev.deleteTransactions,
                                                    deleteProducts: val ? true : prev.deleteProducts,
                                                    deleteContacts: val ? true : prev.deleteContacts
                                                }));
                                            }}
                                        />
                                        <span>{t('delete_settings_and_users') || 'حذف إعدادات الشركة وحسابات المستخدمين (ضبط مصنع كامل للبرنامج)'}</span>
                                    </label>
                                </div>
                            )}
                            <div style={{ marginBottom: 16, padding: 12, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 8, border: '1px dashed var(--danger)' }}>
                                <p style={{ fontSize: '.85rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                                    {t('write_phrase_to_confirm') || 'يرجى كتابة العبارة التالية للتأكيد:'}
                                    <strong style={{ color: 'var(--danger)', marginRight: 6, marginLeft: 6, fontSize: '.95rem', userSelect: 'all', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
                                        {expectedPhrase}
                                    </strong>
                                </p>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={confirmPhraseValue}
                                    onChange={e => setConfirmPhraseValue(e.target.value)}
                                    placeholder={expectedPhrase}
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
                                    autoFocus
                                    required
                                />
                                <span style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                    * {t('copy_paste_hint') || 'يمكنك تحديد ونسخ النص الأحمر أعلاه ولصقه هنا لتسهيل العملية.'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ 
                                            background: isPhraseMatched ? 'var(--danger)' : 'var(--border)', 
                                            color: isPhraseMatched ? '#fff' : 'var(--text-muted)', 
                                            border: 'none',
                                            cursor: isPhraseMatched ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s'
                                        }} 
                                        type="button"
                                        onClick={() => {
                                            if (!isPhraseMatched) {
                                                toast.error(t('phrase_mismatch_error') || 'الرجاء كتابة عبارة التأكيد بشكل صحيح أولاً');
                                            } else {
                                                toast.success(t('double_click_required') || 'اضغط مرتين متتاليتين (Double Click) لتأكيد الحذف');
                                            }
                                        }}
                                        onDoubleClick={handlePasswordSubmit}
                                        disabled={!isPhraseMatched}
                                    >
                                        <AlertTriangle size={14} /> {t('confirm_delete') || 'تأكيد الحذف النهائي'}
                                    </button>
                                    <button className="btn btn-secondary" type="button" onClick={() => setPwdModalOpen(false)}>
                                        {t('cancel') || 'إلغاء'}
                                    </button>
                                </div>
                                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                    ⚠️ {t('double_click_hint') || 'ملاحظة: يجب الضغط مرتين متتاليتين (Double Click) على زر التأكيد للتنفيذ.'}
                                </span>
                            </div>
                        </form>
                    </Modal>
                );
            })()}

            {/* Excel Export Modal */}
            <Modal isOpen={showExcelExportModal} onClose={() => setShowExcelExportModal(false)} title={t('export_excel_title') || 'تصدير ملف إكسيل احتياطي (Excel)'}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowExcelExportModal(false)}>{t('cancel') || 'إلغاء'}</button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.5 }}>
                        {t('export_excel_question') || 'هل تريد تصدير ملف الإكسيل محتوياً على البيانات الحالية للتطبيق، أم تريده نموذجاً فارغاً للاستخدام من الصفر؟'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: '12px', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600 }}
                            onClick={() => handleConfirmExcelExport(true)}
                        >
                            <Download size={16} style={{ marginInlineEnd: '8px' }} />
                            {t('export_with_data') || 'تصدير البيانات الحالية بالكامل'}
                        </button>
                        <button 
                            className="btn btn-secondary" 
                            style={{ padding: '12px', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600, border: '1px solid var(--primary)', color: 'var(--primary)' }}
                            onClick={() => handleConfirmExcelExport(false)}
                        >
                            <FileText size={16} style={{ marginInlineEnd: '8px' }} />
                            {t('export_empty_template') || 'تصدير كـ نموذج فارغ (للبدء من الصفر)'}
                        </button>
                    </div>
                </div>
            </Modal>

            {isResetting && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 16, color: '#fff', fontFamily: 'Cairo, sans-serif'
                }}>
                    <div style={{
                        width: 50, height: 50, borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'var(--primary, #2563eb)',
                        animation: 'spin 1.5s linear infinite'
                    }} />
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    `}} />
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                        {resetLoadingText || t('processing_loading') || 'جاري المعالجة والتحميل...'}
                    </div>
                    <div style={{ fontSize: '.9rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                        {t('please_wait') || 'يرجى الانتظار، لا تقم بإغلاق التطبيق'}
                    </div>
                </div>
            )}
        </div>
    );
}
