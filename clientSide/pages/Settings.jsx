import React, { useState, useEffect, useRef } from 'react';
import {
    Settings as Ico, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield,
    Image, FileText, Palette, Globe, AlertTriangle, Save,
    RefreshCw, Download, Upload, Eye, EyeOff, X, Check, ChevronLeft, ChevronRight, ChevronDown,
    Home, Truck, Package, Wallet, Monitor, ShoppingCart, ShoppingBag, CreditCard,
    BookOpen, UserCheck, TrendingDown, Warehouse, Ticket, BarChart3, Clock, Calendar,
    User, Key, Undo, RotateCcw, Barcode
} from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { clearCachedProducts } from '../utils/posCache';

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

const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(37, 99, 235, ${alpha})`;
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ── Live Invoice Preview Component ───────────────────────────────────────────
function LiveInvoicePreview({ inv, co, logoPreview, t }) {
    const isThermal = inv.paper_size && inv.paper_size.startsWith('thermal');
    const primaryColor = inv.print_color || '#2563eb';
    
    // Logo size mapper
    const logoSizes = { small: 30, medium: 50, large: 70 };
    const logoW = logoSizes[inv.logo_size] || 50;

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            boxShadow: 'var(--shadow)',
            width: '100%',
        }}>
            <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={16} style={{ color: 'var(--primary)' }} />
                {t('live_preview') || 'معاينة مباشرة للفاتورة'}
            </div>
            
            {/* Paper simulation wrapper */}
            <div style={{
                background: '#fff',
                color: '#2d3748', // less harsh than pure black
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: isThermal ? '12px 8px' : '20px 16px',
                width: '100%',
                maxWidth: isThermal ? '260px' : '100%',
                aspectRatio: isThermal ? 'auto' : (inv.paper_orientation === 'landscape' ? '1.414 / 1' : '1 / 1.414'),
                minHeight: isThermal ? 'auto' : (inv.paper_orientation === 'landscape' ? '240px' : '450px'),
                margin: '0 auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                fontFamily: 'Cairo, sans-serif',
                fontSize: isThermal ? '10px' : '11px',
                transition: 'all 0.3s ease',
                direction: 'rtl',
                overflow: 'auto'
            }}>
                {/* Header */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: isThermal ? 'column' : (inv.logo_position === 'left' ? 'row-reverse' : (inv.logo_position === 'center' ? 'column' : 'row')),
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: `2px solid ${primaryColor}`,
                    paddingBottom: 8,
                    marginBottom: 10,
                    textAlign: (isThermal || inv.logo_position === 'center') ? 'center' : 'right'
                }}>
                    {inv.show_logo === 'yes' && logoPreview && (
                        <div style={{ marginBottom: (isThermal || inv.logo_position === 'center') ? 6 : 0 }}>
                            <img src={logoPreview} alt="Logo" style={{ width: logoW, height: 'auto', objectFit: 'contain' }} />
                        </div>
                    )}
                    
                    {inv.show_company_info === 'yes' && (
                        <div style={{ flex: 1, marginRight: (inv.logo_position === 'right' && !isThermal) ? 10 : 0 }}>
                            <div style={{ fontWeight: 700, fontSize: isThermal ? '11px' : '13px', color: '#1a202c' }}>
                                {co.company_name || t('company_name_placeholder') || 'اسم الشركة'}
                            </div>
                            <div style={{ color: '#718096', fontSize: isThermal ? '8px' : '10px', marginTop: 2 }}>
                                {co.company_phone && <span>هاتف: {co.company_phone} </span>}
                                {co.company_tax_number && <span>| الرقم الضريبي: {co.company_tax_number}</span>}
                            </div>
                            <div style={{ color: '#718096', fontSize: isThermal ? '8px' : '9px' }}>
                                {co.company_address}
                            </div>
                        </div>
                    )}
                </div>

                {/* Welcome Message */}
                {inv.thank_you_message && (
                    <div style={{ textAlign: 'center', color: '#718096', fontStyle: 'italic', marginBottom: 8, fontSize: isThermal ? '8px' : '9px' }}>
                        {inv.thank_you_message}
                    </div>
                )}

                {/* Title */}
                <div style={{ 
                    background: hexToRgba(primaryColor, 0.08), 
                    color: primaryColor,
                    padding: '4px 8px', 
                    borderRadius: 4, 
                    fontWeight: 700, 
                    textAlign: 'center',
                    fontSize: isThermal ? '11px' : '12px',
                    marginBottom: 10
                }}>
                    {inv.invoice_title_sales || t('sales_invoice') || 'فاتورة مبيعات'}
                </div>

                {/* Metadata */}
                <div style={{ display: 'grid', gridTemplateColumns: isThermal ? '1fr' : '1fr 1fr', gap: 4, marginBottom: 10, color: '#4a5568', borderBottom: '1px dashed #e2e8f0', paddingBottom: 6 }}>
                    <div><strong>رقم الفاتورة:</strong> #INV-2026-0001</div>
                    <div><strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-SA')}</div>
                    <div><strong>العميل:</strong> عميل نقدي</div>
                    {!isThermal && <div><strong>طريقة الدفع:</strong> نقداً</div>}
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: isThermal ? '8px' : '10px' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${primaryColor}`, color: '#2d3748', fontWeight: 'bold' }}>
                            <th style={{ textAlign: 'right', padding: '3px 0' }}>الصنف</th>
                            <th style={{ textAlign: 'center', padding: '3px 0' }}>الكمية</th>
                            <th style={{ textAlign: 'center', padding: '3px 0' }}>السعر</th>
                            {inv.show_discount_column === 'yes' && <th style={{ textAlign: 'center', padding: '3px 0' }}>الخصم</th>}
                            {inv.show_tax_column === 'yes' && <th style={{ textAlign: 'center', padding: '3px 0' }}>الضريبة</th>}
                            <th style={{ textAlign: 'left', padding: '3px 0' }}>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '4px 0', fontWeight: 500 }}>منتج افتراضي أ</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>2</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>15.000</td>
                            {inv.show_discount_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0', color: '#ef4444' }}>0.000</td>}
                            {inv.show_tax_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0' }}>0.000</td>}
                            <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>30.000</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '4px 0', fontWeight: 500 }}>منتج افتراضي ب</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>1</td>
                            <td style={{ textAlign: 'center', padding: '4px 0' }}>10.000</td>
                            {inv.show_discount_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0', color: '#ef4444' }}>1.000</td>}
                            {inv.show_tax_column === 'yes' && <td style={{ textAlign: 'center', padding: '4px 0' }}>0.450</td>}
                            <td style={{ textAlign: 'left', padding: '4px 0', fontWeight: 500 }}>9.450</td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ width: isThermal ? '100%' : '180px', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 6, borderBottom: '1px solid #e2e8f0', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                        <span>المجموع الفرعي:</span>
                        <span>40.000</span>
                    </div>
                    {inv.show_discount_column === 'yes' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                            <span>الخصم:</span>
                            <span>-1.000</span>
                        </div>
                    )}
                    {inv.show_tax_column === 'yes' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4a5568' }}>
                            <span>الضريبة (15%):</span>
                            <span>0.450</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: isThermal ? '9px' : '11px', color: primaryColor, borderTop: '1px dashed #e2e8f0', paddingTop: 3, marginTop: 2 }}>
                        <span>الإجمالي النهائي:</span>
                        <span>39.450 د.ك</span>
                    </div>
                </div>

                {/* Terms and Conditions */}
                {inv.show_notes === 'yes' && inv.invoice_terms && (
                    <div style={{ fontSize: isThermal ? '7px' : '8px', color: '#718096', border: '1px solid #edf2f7', borderRadius: 4, padding: 6, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                        <strong>الشروط والأحكام:</strong><br />
                        {inv.invoice_terms}
                    </div>
                )}

                {/* Signature Area */}
                {inv.show_signature === 'yes' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 15, padding: '0 8px', fontSize: isThermal ? '7px' : '9px', color: '#4a5568' }}>
                        <div>
                            <div>توقيع المستلم:</div>
                            <div style={{ borderBottom: '1px dotted #718096', width: 60, height: 16 }}></div>
                        </div>
                        <div>
                            <div>توقيع البائع:</div>
                            <div style={{ borderBottom: '1px dotted #718096', width: 60, height: 16 }}></div>
                        </div>
                    </div>
                )}

                {/* Footer Bottom */}
                {inv.invoice_footer && (
                    <div style={{ borderTop: '1px solid #edf2f7', paddingTop: 6, marginTop: 10, textAlign: 'center', color: '#a0aec0', fontSize: isThermal ? '7px' : '8px' }}>
                        {inv.invoice_footer}
                    </div>
                )}
            </div>
            
            {/* Meta info badge */}
            <div style={{ marginTop: 10, fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'center', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6 }}>
                {isThermal ? `طباعة حرارية • عرض تلقائي` : `${inv.paper_size || 'A4'} • ${inv.paper_orientation === 'landscape' ? 'أفقي' : 'عمودي'}`}
            </div>
        </div>
    );
}

// Activity Log Cache
let activityLogCache = {
    logs: [],
    filters: { module: '', action: '', user_name: '', startDate: '', endDate: '' },
    skip: 0,
    hasMore: true
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
    const auth = useAuth() || {};
    const { user, updateUser, t = (k) => k, theme, language } = auth;

    // Safe translation helper: falls back to default Arabic text if translation key is returned
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

    const PERM_MODS = PERM_CATEGORIES.flatMap(cat => cat.modules);

    const PERM_KEYS = [
        { key: 'can_view', label: tr('view', 'عرض'), act: 'view' },
        { key: 'can_create', label: tr('create', 'إضافة'), act: 'create' },
        { key: 'can_edit', label: tr('edit', 'تعديل'), act: 'edit' },
        { key: 'can_delete', label: tr('delete', 'حذف'), act: 'delete' },
    ];
    const isSuperAdmin = user?.id === 1 || user?.username === 'admin';
    const canAccess = (mod, act = 'can_view') => {
        if (isSuperAdmin) return true;
        if (mod === 'excel_backup') {
            return gen.allow_manager_excel === 'yes';
        }
        if (user?.role === 'admin') return true;
        if (user?.permissions && user.permissions[mod]) {
            const val = user.permissions[mod][act];
            if (val !== undefined && val !== null) return !!val;
        }
        return false;
    };
    const isAdmin = isSuperAdmin || user?.role === 'admin';

    const getModIcon = (mod) => {
        const icons = {
            dashboard: Home,
            customers: Users,
            suppliers: Truck,
            products: Package,
            products_import: Download,
            products_export: Download,
            excel_backup: FileText,
            sales_invoices: ShoppingCart,
            quotations: FileText,
            sales_returns: Undo,
            purchase_invoices: ShoppingBag,
            purchase_returns: RotateCcw,
            receipt_vouchers: CreditCard,
            payment_vouchers: Wallet,
            chart_of_accounts: Building2,
            cash_bank: Wallet,
            journal_entries: BookOpen,
            hr: UserCheck,
            expenses: TrendingDown,
            pos: Monitor,
            warehouse: Warehouse,
            offers: Ticket,
            reports: BarChart3,
            settings: Ico,
            users: Users,
            permissions: Shield,
            database: Database,
            financial_summary: BarChart3,
            stock_alerts: AlertTriangle,
            customer_receivables: CreditCard,
            dashboard_charts: BarChart3
        };
        const IcoComp = icons[mod] || Shield;
        return <IcoComp size={16} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
    };
    const [sec, setSec] = useState('company');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState([]);

    const [expandedCats, setExpandedCats] = useState({
        sales_purchases: true,
        accounts_finance: false,
        products_warehouse: false,
        hr_expenses: false,
        marketing_reports: false,
        settings_system: false
    });

    const toggleCat = (catId) => {
        setExpandedCats(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
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
    const [permMode, setPermMode] = useState('role'); // 'role' | 'user'
    const [permSearch, setPermSearch] = useState('');
    const [selRole, setSelRole] = useState('accountant'); // selected role in role mode
    const [pwdModalOpen, setPwdModalOpen] = useState(false);
    const [pwdAction, setPwdAction] = useState(null); // 'resetApp' | 'deleteAllProducts'
    const [confirmPhraseValue, setConfirmPhraseValue] = useState('');
    const [resetOptions, setResetOptions] = useState({
        deleteTransactions: true,
        deleteProducts: false,
        deleteContacts: false,
        deleteSettingsAndUsers: false
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
        res?.success 
            ? toast.success(t('savedSuccess') || 'Saved successfully') 
            : toast.error((t('failed') || 'Failed') + ': ' + (res?.error || ''));
        setExcelExportPath('');
    };

    const upUserIdRef = useRef(null); // tracks which user we're loading for (prevents race conditions)
    const dropRef = useRef(null);

    const [counts, setCounts] = useState({ products: 0, customers: 0, suppliers: 0, sales_invoices: 0, purchase_invoices: 0 });

    const [co, setCo] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_tax_number: '', company_logo: '' });
    
    // Hardware and printing configurations
    const [printers, setPrinters] = useState([]);
    const [printConf, setPrintConf] = useState({
        pos_printer: '',
        invoice_printer: '',
        pos_silent_print: 'no',
        invoice_silent_print: 'no',
        enable_global_barcode: 'no'
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
    const [ai, setAi] = useState({
        gemini_api_key: '',
        enable_ai_assistant: 'no'
    });

    const SECTIONS = [
        { id: 'company', l: tr('company_details', 'بيانات الشركة'), icon: Building2 },
        { id: 'general', l: tr('general_settings', 'الإعدادات العامة'), icon: Ico },
        { id: 'print_invoice', l: tr('invoice_settings', 'إعدادات الفاتورة'), icon: FileText },
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
        { id: 'database', l: tr('database', 'قاعدة البيانات'), icon: Database },
    ];

    useEffect(() => {
        const allowedIds = SECTIONS.map(s => s.id);
        if (allowedIds.length > 0 && !allowedIds.includes(sec)) {
            setSec(allowedIds[0]);
        }
    }, [user?.permissions, sec]);



    // ─── Activity Log State ───────────────────────────────────────────────────
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
            
            // Load Database status
            if (window.api.database?.getConnectionStatus) {
                try {
                    const stat = await window.api.database.getConnectionStatus();
                    setDbStatus(stat || { isConnected: true, error: '', hasConfiguredUri: false, isCloud: false });
                } catch (dbStatErr) {
                    console.error("Error loading database connection status:", dbStatErr);
                }
            }

            // Load counts for database diagnostics
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
            // Load printing configurations
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

            // Refresh current user's session permissions so changes take effect immediately
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
            let userPermsState = {};
            if (r.hasIndividual) {
                userPermsState = { ...(r.permissions || {}) };
            } else {
                const rolePerms = await window.api.permissions.getByRole(u.role);
                if (upUserIdRef.current !== u.id) return; // check again after second await
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
                    // Clear POS cache so restored data is shown fresh
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
            // Clear POS cache after reset
            try { await clearCachedProducts(); localStorage.removeItem('last_products_sync_time'); localStorage.removeItem('last_products_sync_db_sig'); } catch(e) {}
            if (res && res.success) {
                toast.success(t('savedSuccess') || 'Data reset successfully');
                if (res.relaunch) {
                    // Handled automatically by main process relaunch
                } else {
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
                    // Clear POS cache after deleting all products
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

                {/* ══ 1. COMPANY ══════════════════════════════════════════════════════ */}
                {sec === 'company' && <>
                    <Card title={tr('company_logo', 'شعار الشركة')} icon={Image}>
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
                                    : <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}><Image size={32} /><div style={{ fontSize: '.72rem', marginTop: 6 }}>{tr('drag_or_click_logo', 'أسحب واسقط اللوجو هنا أو انقر للاختيار')}</div></div>}
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                                    {tr('logo_hint', 'أسحب واسقط الشعار هنا أو انقر للاختيار. يظهر الشعار على الفواتير والسندات المطبوعة.')}
                                </p>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={handleLogo}>
                                        <Upload size={14} /> {tr('upload_logo', 'رفع الشعار')}
                                    </button>
                                    {logoPreview && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--danger)' }}
                                        onClick={() => { setLogoPreview(''); setCo(f => ({ ...f, company_logo: '' })); }}>
                                        <X size={14} /> {tr('remove', 'حذف')}
                                    </button>}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title={tr('company_details', 'بيانات الشركة')} icon={Building2}>
                        <div style={gridTwo}>
                            <Fld label={tr('company_name', 'اسم الشركة / المؤسسة')}><input style={inp} value={co.company_name} onChange={e => setCo(f => ({ ...f, company_name: e.target.value }))} /></Fld>
                            <Fld label={tr('tax_number', 'الرقم الضريبي / السجل التجاري')}><input style={inp} value={co.company_tax_number} onChange={e => setCo(f => ({ ...f, company_tax_number: e.target.value }))} /></Fld>
                        </div>
                        <div style={gridTwo}>
                            <Fld label={tr('phone', 'رقم الهاتف')}><input style={inp} value={co.company_phone} onChange={e => setCo(f => ({ ...f, company_phone: e.target.value }))} /></Fld>
                            <Fld label={tr('email', 'البريد الإلكتروني')}><input style={inp} value={co.company_email} onChange={e => setCo(f => ({ ...f, company_email: e.target.value }))} /></Fld>
                        </div>
                        <Fld label={tr('address', 'العنوان')}><input style={inp} value={co.company_address} onChange={e => setCo(f => ({ ...f, company_address: e.target.value }))} /></Fld>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                                onClick={() => saveSection('company', co, tr('saved_company_details', 'تم حفظ بيانات الشركة بنجاح'))}>
                                <Save size={14} /> {saving ? (tr('saving', 'جاري الحفظ...')) : (tr('save', 'حفظ التغييرات'))}
                            </button>
                        </div>
                    </Card>
                </>}

                {/* ══ 2. GENERAL ══════════════════════════════════════════════════════ */}
                {sec === 'general' && <>
                    <Card title={t('brand_color_customization') || 'تخصيص لون هوية النظام'} icon={Palette}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                            {COLORS.map(c => (
                                <button key={c} type="button" onClick={() => setGen(f => ({ ...f, brand_color: c }))} style={{
                                    width: 36, height: 36, borderRadius: '50%', background: c, border: gen.brand_color === c ? '3px solid var(--text-primary)' : '1px solid var(--border)',
                                    cursor: 'pointer', transition: 'all 0.15s', outline: 'none', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {gen.brand_color === c && <Check size={16} style={{ color: c === '#ffffff' ? '#000' : '#fff' }} />}
                                </button>
                            ))}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 12, marginLeft: 12 }}>
                                <span style={{ fontSize: '.875rem', color: 'var(--text-secondary)' }}>{t('custom_color') || 'لون مخصص'}:</span>
                                <input type="color" value={gen.brand_color || '#2563eb'} onChange={e => setGen(f => ({ ...f, brand_color: e.target.value }))} style={{
                                    border: 'none', background: 'none', width: 32, height: 32, cursor: 'pointer', outline: 'none'
                                }} />
                                <input type="text" value={gen.brand_color || '#2563eb'} onChange={e => setGen(f => ({ ...f, brand_color: e.target.value }))} style={{
                                    ...inp, width: 90, padding: '4px 8px', fontSize: '.8rem', textTransform: 'uppercase'
                                }} />
                            </div>
                        </div>
                    </Card>

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
                    <Card title={t('sales_options') || 'Sales Options'} icon={Ico}>
                        <TRow label={t('allow_negative_stock') || 'Allow Negative Stock'} desc={t('desc_negative_stock') || 'Allows completing sales even when stock is depleted'} value={gen.allow_negative_stock} onChange={v => setGen(f => ({ ...f, allow_negative_stock: v }))} />
                        <TRow label={t('enable_product_color') || 'Enable Product Color Field'} desc={t('desc_product_color') || 'Add color field for paint products (Drum, Gallon, Liter)'} value={gen.enable_product_color} onChange={v => setGen(f => ({ ...f, enable_product_color: v }))} />
                        <TRow label={t('show_purchase_price_in_pos') || 'Show Purchase Price in POS'} desc={t('desc_show_purchase_price_in_pos') || 'Show an eye icon on products in POS to quickly view the purchase price'} value={gen.show_purchase_price_in_pos} onChange={v => setGen(f => ({ ...f, show_purchase_price_in_pos: v }))} />
                        {isSuperAdmin && (
                            <TRow label={t('allow_manager_excel') || 'إمكانية رؤية المدير لشيت الإكسيل المصغر'} desc={t('allow_manager_excel_desc') || 'السماح أو المنع للمدير والموظفين من رؤية قسم برنامج Excel المصغر وتصديره'} value={gen.allow_manager_excel} onChange={v => setGen(f => ({ ...f, allow_manager_excel: v }))} />
                        )}
                    </Card>
                    <Card title={t('system_sounds') || 'أصوات وتنبيهات النظام'} icon={Globe}>
                        <TRow label={t('enable_pos_sounds') || 'تفعيل أصوات نقطة البيع'} desc={t('desc_pos_sounds') || 'إصدار صوت خفيف عند مسح الباركود وإتمام الدفع بنجاح'} value={gen.enable_pos_sounds} onChange={v => setGen(f => ({ ...f, enable_pos_sounds: v }))} />
                        <TRow label={t('enable_alert_sounds') || 'تفعيل تنبيهات التحذير الصوتية'} desc={t('desc_alert_sounds') || 'إصدار نغمة تنبيه عند حدوث خطأ أو ظهور نافذة تنبيه'} value={gen.enable_alert_sounds} onChange={v => setGen(f => ({ ...f, enable_alert_sounds: v }))} />
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
                {sec === 'print_invoice' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
                        {/* Live Invoice Preview Sticky Widget */}
                        <div style={{ position: 'sticky', top: 20 }}>
                            <LiveInvoicePreview inv={inv} co={co} logoPreview={logoPreview} t={t} />
                        </div>
                        
                        {/* Print Invoice Settings Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

                            <Card title={t('paper_size_orientation') || 'Paper Size & Orientation'} icon={FileText}>
                                <div style={gridTwo}>
                                    <Fld label={t('paper_size') || 'Paper Size'}>
                                        <select style={inp} value={inv.paper_size} onChange={e => {
                                            const val = e.target.value;
                                            const isThermal = val.startsWith('thermal');
                                            setInv(f => ({
                                                ...f,
                                                paper_size: val,
                                                ...(isThermal ? { paper_orientation: 'portrait' } : {})
                                            }));
                                        }}>
                                            <option value="A3">A3</option>
                                            <option value="A4">A4</option>
                                            <option value="A5">A5</option>
                                            <option value="Letter">Letter</option>
                                            <option value="Legal">Legal</option>
                                            <option value="thermal_110">{t('thermal_110') || 'Thermal 110mm'}</option>
                                            <option value="thermal_80">{t('thermal_80') || 'Thermal 80mm'}</option>
                                            <option value="thermal_76">{t('thermal_76') || 'Thermal 76mm'}</option>
                                            <option value="thermal_58">{t('thermal_58') || 'Thermal 58mm'}</option>
                                            <option value="thermal_57">{t('thermal_57') || 'Thermal 57mm'}</option>
                                        </select>
                                    </Fld>
                                    <Fld label={t('paper_orientation') || 'Orientation'}>
                                        <select style={inp} disabled={inv.paper_size && inv.paper_size.startsWith('thermal')} value={inv.paper_size && inv.paper_size.startsWith('thermal') ? 'portrait' : inv.paper_orientation} onChange={e => setInv(f => ({ ...f, paper_orientation: e.target.value }))}>
                                            <option value="portrait">{t('portrait') || 'Portrait'}</option>
                                            <option value="landscape">{t('landscape') || 'Landscape'}</option>
                                        </select>
                                    </Fld>
                                </div>
                                <div style={gridTwo}>
                                    <Fld label={t('invoice_logo_position') || 'موضع الشعار بالفاتورة'}>
                                        <select style={inp} value={inv.logo_position || 'center'} onChange={e => setInv(f => ({ ...f, logo_position: e.target.value }))}>
                                            <option value="right">{t('right') || 'يمين'}</option>
                                            <option value="center">{t('center') || 'وسط'}</option>
                                            <option value="left">{t('left') || 'يسار'}</option>
                                        </select>
                                    </Fld>
                                    <Fld label={t('invoice_logo_size') || 'حجم الشعار بالفاتورة'}>
                                        <select style={inp} value={inv.logo_size || 'medium'} onChange={e => setInv(f => ({ ...f, logo_size: e.target.value }))}>
                                            <option value="small">{t('small') || 'صغير'}</option>
                                            <option value="medium">{t('medium') || 'متوسط'}</option>
                                            <option value="large">{t('large') || 'كبير'}</option>
                                        </select>
                                    </Fld>
                                </div>
                                <Fld label={t('invoice_print_color') || 'لون الطباعة الأساسي بالفاتورة'}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        {COLORS.map(c => (
                                            <button key={c} type="button" onClick={() => setInv(f => ({ ...f, print_color: c }))} style={{
                                                width: 32, height: 32, borderRadius: '50%', background: c, border: inv.print_color === c ? '3px solid var(--text-primary)' : '1px solid var(--border)',
                                                cursor: 'pointer', transition: 'all 0.15s', outline: 'none'
                                            }} />
                                        ))}
                                        <input type="color" value={inv.print_color || '#2563eb'} onChange={e => setInv(f => ({ ...f, print_color: e.target.value }))} style={{
                                            border: 'none', background: 'none', width: 32, height: 32, cursor: 'pointer', outline: 'none'
                                        }} />
                                    </div>
                                </Fld>
                            </Card>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                                    onClick={() => saveSection('invoice', inv, t('saved_print_settings') || 'Print settings saved')}>
                                    <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save_print_settings') || 'Save Print Settings')}
                                </button>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-light)', margin: '10px 0' }} />

                            <Card title={t('hardware_settings') || 'إعدادات الأجهزة والطباعة'} icon={Printer}>
                                <div style={gridTwo}>
                                    <Fld label={t('pos_printer') || 'طابعة الكاشير (حرارية)'}>
                                        <select style={inp} value={printConf.pos_printer || ''} onChange={e => setPrintConf(f => ({ ...f, pos_printer: e.target.value }))}>
                                            <option value="">{t('none') || 'لا يوجد / طابعة افتراضية'}</option>
                                            {printers.map(p => (
                                                <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                                            ))}
                                        </select>
                                    </Fld>
                                    <Fld label={t('invoice_printer') || 'طابعة الفواتير (A4)'}>
                                        <select style={inp} value={printConf.invoice_printer || ''} onChange={e => setPrintConf(f => ({ ...f, invoice_printer: e.target.value }))}>
                                            <option value="">{t('none') || 'لا يوجد / طابعة افتراضية'}</option>
                                            {printers.map(p => (
                                                <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                                            ))}
                                        </select>
                                    </Fld>
                                </div>
                                
                                <TRow 
                                    label={t('silent_printing') || 'الطباعة المباشرة الصامتة'} 
                                    desc={t('pos_silent_print_desc') || 'طباعة الإيصال فوراً دون عرض نافذة النظام'} 
                                    value={printConf.pos_silent_print} 
                                    onChange={v => setPrintConf(f => ({ ...f, pos_silent_print: v }))} 
                                />
                                <TRow 
                                    label={t('silent_printing_invoice') || 'الطباعة الصامتة للفاتورة كبيرة الحجم'} 
                                    desc={t('invoice_silent_print_desc') || 'طباعة الفاتورة الكبيرة فوراً دون عرض نافذة النظام'} 
                                    value={printConf.invoice_silent_print} 
                                    onChange={v => setPrintConf(f => ({ ...f, invoice_silent_print: v }))} 
                                />
                            </Card>

                            <Card title={t('barcode_settings') || 'إعدادات قارئ الباركود'} icon={Barcode}>
                                <TRow 
                                    label={t('enable_global_barcode') || 'تفعيل قارئ الباركود الذكي'} 
                                    desc={t('enable_global_barcode_desc') || 'الاستماع التلقائي لمسح الباركود وإضافته مباشرة إلى السلة في أي جزء من شاشة المبيعات'} 
                                    value={printConf.enable_global_barcode} 
                                    onChange={v => setPrintConf(f => ({ ...f, enable_global_barcode: v }))} 
                                />
                            </Card>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} disabled={saving}
                                    onClick={() => saveSection('printing', printConf, t('savedSuccess') || 'Saved successfully')}>
                                    <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ 5. USERS ════════════════════════════════════════════════════════ */}
                {sec === 'users' && <>
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
                </>}

                {/* ══ 6. UNIFIED PERMISSIONS ══════════════════════════════════════════ */}
                {sec === 'permissions' && <>
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
                </>}

                {/* ══ 7b. ACTIVITY LOG ════════════════════════════════════════════════ */}
                {sec === 'activity_log' && isAdmin && (() => {
                    const actionColors = { create: '#10b981', update: '#f59e0b', delete: '#ef4444', login: '#3b82f6' };
                    const actionIcons = { create: Plus, update: Edit2, delete: Trash2, login: Key };
                    const actionLabels = { create: t('log_action_create') || 'إنشاء', update: t('log_action_update') || 'تعديل', delete: t('log_action_delete') || 'حذف', login: t('log_action_login') || 'دخول' };
                    const moduleLabels = {
                        customers: t('log_module_customers') || 'العملاء',
                        suppliers: t('log_module_suppliers') || 'الموردون',
                        products: t('log_module_products') || 'المنتجات',
                        sales_invoices: t('log_module_sales_invoices') || 'فواتير المبيعات',
                        purchase_invoices: t('log_module_purchase_invoices') || 'فواتير المشتريات',
                        sales_returns: t('log_module_sales_returns') || 'مرتجع مبيعات',
                        purchase_returns: t('log_module_purchase_returns') || 'مرتجع مشتريات',
                        vouchers: t('log_module_vouchers') || 'السندات',
                        journal_entries: t('log_module_journal_entries') || 'القيود',
                        employees: t('log_module_employees') || 'الموظفون',
                        salaries: t('log_module_salaries') || 'الرواتب',
                        users: t('log_module_users') || 'المستخدمون',
                        accounts: t('log_module_accounts') || 'الحسابات',
                        coupons: t('log_module_coupons') || 'الكوبونات',
                        offers: t('log_module_offers') || 'العروض',
                        leaves: t('log_module_leaves') || 'الإجازات',
                        deductions: t('log_module_deductions') || 'الاستقطاعات',
                        rent: t('log_module_rent') || 'الإيجار',
                        expenses: t('log_module_expenses') || 'المصروفات',
                        warehouse: t('log_module_warehouse') || 'المخزن',
                    };
                    const getFriendlyDescription = (log, actionText, moduleText) => {
                        if (!log.entity_ref) return '—';
                        if (log.action === 'login') {
                            return `تسجيل دخول الحساب (${log.entity_ref})`;
                        }
                        
                        let actionWord = '';
                        if (log.action === 'create') actionWord = 'إضافة';
                        else if (log.action === 'update') actionWord = 'تعديل';
                        else if (log.action === 'delete') actionWord = 'حذف';
                        else actionWord = actionText;

                        let itemWord = moduleText;
                        if (log.module === 'products') itemWord = 'المنتج';
                        else if (log.module === 'customers') itemWord = 'العميل';
                        else if (log.module === 'suppliers') itemWord = 'المورد';
                        else if (log.module === 'sales_invoices') itemWord = 'فاتورة المبيعات';
                        else if (log.module === 'purchase_invoices') itemWord = 'فاتورة المشتريات';
                        else if (log.module === 'sales_returns') itemWord = 'مرتجع المبيعات';
                        else if (log.module === 'purchase_returns') itemWord = 'مرتجع المشتريات';
                        else if (log.module === 'vouchers') itemWord = 'السند';
                        else if (log.module === 'journal_entries') itemWord = 'القيد';
                        else if (log.module === 'employees') itemWord = 'الموظف';
                        else if (log.module === 'users') itemWord = 'المستخدم';
                        else if (log.module === 'accounts') itemWord = 'الحساب';
                        else if (log.module === 'coupons') itemWord = 'الكوبون';
                        else if (log.module === 'offers') itemWord = 'العرض';
                        else if (log.module === 'leaves') itemWord = 'طلب الإجازة';
                        else if (log.module === 'deductions') itemWord = 'الاستقطاع';
                        else if (log.module === 'expenses') itemWord = 'المصروف';
                        else if (log.module === 'warehouse') itemWord = 'حركة المخزن';
                        
                        return `${actionWord} ${itemWord} (${log.entity_ref})`;
                    };
                    const allModules = [...new Set(Object.keys(moduleLabels))];

                    return (
                        <>
                            {/* Header + Filters */}
                            <Card title={t('activity_log_title') || 'سجل نشاط المستخدمين'} icon={FileText} action={
                                <button
                                    onClick={() => loadActivityLog(logFilters)}
                                    style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', padding: '7px 14px', gap: 6 }}
                                >
                                    <RefreshCw size={13} /> {t('log_refresh') || 'تحديث'}
                                </button>
                            }>
                                {/* Filter Row */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18, background: 'var(--bg-secondary)', padding: 16, borderRadius: 14, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('user') || 'المستخدم'}</label>
                                            <input
                                                placeholder={t('log_filter_user') || 'فلترة بالمستخدم...'}
                                                value={logFilters.user_name}
                                                onChange={e => setLogFilters(f => ({ ...f, user_name: e.target.value }))}
                                                style={{ ...inp, margin: 0, padding: '8px 12px' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('log_filter_module') || 'الوحدة'}</label>
                                            <select
                                                value={logFilters.module}
                                                onChange={e => setLogFilters(f => ({ ...f, module: e.target.value }))}
                                                style={{ ...inp, margin: 0, padding: '8px 12px' }}
                                            >
                                                <option value="">{t('log_all_modules') || 'جميع الوحدات'}</option>
                                                {allModules.map(m => <option key={m} value={m}>{moduleLabels[m]}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('log_filter_action') || 'النوع'}</label>
                                            <select
                                                value={logFilters.action}
                                                onChange={e => setLogFilters(f => ({ ...f, action: e.target.value }))}
                                                style={{ ...inp, margin: 0, padding: '8px 12px' }}
                                            >
                                                <option value="">{t('log_all_actions') || 'جميع الأنواع'}</option>
                                                {Object.entries(actionLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('from_date') || 'من تاريخ'}</label>
                                            <input type="date" value={logFilters.startDate} onChange={e => setLogFilters(f => ({ ...f, startDate: e.target.value }))} style={{ ...inp, margin: 0, padding: '8px 12px' }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <label style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('to_date') || 'إلى تاريخ'}</label>
                                            <input type="date" value={logFilters.endDate} onChange={e => setLogFilters(f => ({ ...f, endDate: e.target.value }))} style={{ ...inp, margin: 0, padding: '8px 12px' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                                        <button
                                            onClick={() => loadActivityLog(logFilters)}
                                            style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', padding: '7px 16px' }}
                                        >
                                            <Eye size={14} /> {t('filter') || 'تصفية'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newF = { module: '', action: '', user_name: '', startDate: '', endDate: '' };
                                                setLogFilters(newF);
                                                loadActivityLog(newF);
                                            }}
                                            style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '7px 16px' }}
                                        >
                                            <RefreshCw size={14} /> {t('reset_filters') || 'إعادة تعيين'}
                                        </button>
                                    </div>
                                </div>

                                {/* Table */}
                                {logLoading ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
                                ) : activityLogs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: '.875rem' }}>
                                        {t('log_no_logs') || 'لا توجد سجلات بعد'}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('date') || 'التاريخ'}</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('user') || 'المستخدم'}</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', width: '15%' }}>{t('log_filter_action') || 'النوع'}</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '15%' }}>{t('log_filter_module') || 'الوحدة'}</th>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '25%' }}>{t('log_details') || 'تفاصيل العملية'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activityLogs.map((log, i) => {
                                                    const color = actionColors[log.action] || '#6b7280';
                                                    const label = actionLabels[log.action] || log.action;
                                                    const ActionIcon = actionIcons[log.action] || Shield;
                                                    const modLabel = moduleLabels[log.module] || log.module;
                                                    const dt = new Date(log.created_at);
                                                    const dateStr = isNaN(dt) ? log.created_at : dt.toLocaleDateString('ar', { year: 'numeric', month: '2-digit', day: '2-digit' });
                                                    const timeStr = isNaN(dt) ? '' : dt.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
                                                    return (
                                                        <tr key={log.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dateStr}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', marginTop: 4 }}>
                                                                    <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                                                    <span>{timeStr}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, var(--primary), #3b82f6)`, color: '#fff', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '.8rem', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                                                        {(log.user_name || '?')[0].toUpperCase()}
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text-primary)' }}>{log.user_name}</div>
                                                                        {log.user_id && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 2 }}>ID: {log.user_id}</div>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '.75rem',
                                                                    background: color + '12', color, border: `1px solid ${color}22`, boxShadow: `0 2px 8px ${color}10`
                                                                }}>
                                                                    <ActionIcon size={12} />
                                                                    {label}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.85rem' }}>
                                                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(37,99,235,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        {getModIcon(log.module)}
                                                                    </div>
                                                                    <span>{modLabel}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.entity_ref}>
                                                                <span style={{
                                                                    fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)'
                                                                }}>
                                                                    {getFriendlyDescription(log, label, modLabel)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {moreLoading && (
                                            <div style={{ display: 'flex', justifyContent: 'center', padding: 16, borderTop: '1px solid var(--border-light)' }}>
                                                <div className="spinner" style={{ width: 20, height: 20 }} />
                                            </div>
                                        )}

                                        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '.8rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{activityLogs.length} {t('records') || 'سجل'}</span>
                                            {!activityLogCache.hasMore && activityLogs.length > 0 && (
                                                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('log_no_more') || 'تم تحميل جميع السجلات'}</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activityLogs.length > 0 && (
                                    <div ref={sentinelRef} style={{ height: 10, width: '100%', visibility: 'hidden' }} />
                                )}
                            </Card>
                        </>
                    );
                })()}

                {/* ══ EXCEL PROGRAM & BACKUP ════════════════════════════════════════════════ */}
                {sec === 'excel_program' && (canAccess('excel_backup', 'can_view') || canAccess('excel_backup', 'can_create')) && (
                    <>
                        {isSuperAdmin && (
                            <div style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                padding: '14px 20px',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: 'var(--shadow-sm)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text-primary)' }}>
                                        {t('allow_manager_excel') || 'صلاحية رؤية شيت الإكسيل المصغر للمدير والموظفين'}
                                    </div>
                                    <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {t('allow_manager_excel_desc') || 'تحديد ما إذا كان يسمح للمدير والمستخدمين غير الأدمن برؤية وتنزيل شيت الإكسيل المصغر أم حظره عليهم'}
                                    </div>
                                </div>
                                <Tog
                                    on={gen.allow_manager_excel === 'yes'}
                                    onChange={async () => {
                                        const newVal = gen.allow_manager_excel === 'yes' ? 'no' : 'yes';
                                        setGen(f => ({ ...f, allow_manager_excel: newVal }));
                                        await saveSetting('general', 'allow_manager_excel', newVal);
                                        window.dispatchEvent(new Event('settingsUpdated'));
                                        toast.success(newVal === 'yes' ? 'تم تفعيل رؤية شيت الإكسيل المصغر للمدير' : 'تم تعطيل رؤية شيت الإكسيل المصغر عن المدير');
                                    }}
                                />
                            </div>
                        )}
                        <Card title="برنامج Excel المصغر والنسخ الاحتياطي للأرشيف" icon={FileText}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                                    يمكنك إصدار وتنزيل **برنامج إكسيل مصغر تفاعلي مستقل (Vero Mini-Excel Program)** يتيح لك الاستمرار في تسجيل المبيعات والمشتريات ومتابعة المخزون والعملاء والموردين أوفلاين، مع ربط دقيق لكافة الحسابات.
                                </p>

                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                    {canAccess('excel_backup', 'can_create') && (
                                        <button
                                            style={{ ...btnStyle, background: '#107c41', color: '#fff', padding: '10px 20px', boxShadow: '0 4px 14px rgba(16,124,65,0.25)' }}
                                            onClick={backupToExcel}
                                        >
                                            <Download size={16} /> تصدير وإصدار شيت برنامج Excel المصغر (.xlsx)
                                        </button>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Check size={18} style={{ color: '#107c41' }} /> مميزات برنامج Excel المصغر المدمج:
                                    </div>
                                    <ul style={{ paddingRight: 20, margin: 0, fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                        <li><strong>تثبيت اسم العميل/المورد افتراضياً:</strong> يتم اختيار "عميل نقدي" أو "مورد نقدي" تلقائياً في خانة العميل/المورد، وتكرار نفس اسم العميل بالسطر التالي فوراً لإدخال أصناف متعددة لنفس الفاتورة.</li>
                                        <li><strong>تحديد حالة الدفع ومعالجة المديونيات:</strong> اختيار حالة الدفع ("مدفوع" / "أجل") حيث يتم ترحيل الآجل تلقائياً لمديونية العميل أو دائنية المورد دون خصمه من الخزينة النقدية.</li>
                                        <li><strong>تسميع الرصيد الافتتاحي:</strong> ترحيل صافي المديونيات الحالية مباشرة إلى الرصيد الافتتاحي عند البدء من جديد بشيت جديد.</li>
                                        <li><strong>المطابقة الذكية للأكواد والأسماء:</strong> استنتاج أسماء وأكواد المنتجات والأسعار تلقائياً من صفحة المنتجات بدون أخطاء.</li>
                                    </ul>
                                </div>
                            </div>
                        </Card>
                    </>
                )}

                {/* ══ AI ASSISTANT ════════════════════════════════════════════════════ */}
                {sec === 'ai_assistant' && (isAdmin || user?.permissions?.ai_assistant?.can_edit) && (
                    <>
                        <Card title={t('ai_assistant_settings') || 'إعدادات المساعد الذكي'} icon={Key} action={
                            <button
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', background: 'var(--primary)',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    fontSize: '.85rem', fontWeight: 600, cursor: 'pointer'
                                }}
                                onClick={() => saveSection('ai', ai, t('ai_settings_saved') || 'تم حفظ إعدادات المساعد الذكي بنجاح')}
                                disabled={saving}
                            >
                                <Save size={14} /> {t('save') || 'حفظ'}
                            </button>
                        }>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <TRow
                                    label={t('enable_ai_assistant') || 'تفعيل المساعد الذكي'}
                                    desc={t('enable_ai_assistant_desc') || 'تفعيل محادثة الذكاء الاصطناعي للمساعدة العامة وتعديل المنتجات.'}
                                    value={ai.enable_ai_assistant}
                                    onChange={v => setAi(prev => ({ ...prev, enable_ai_assistant: v }))}
                                />
                                <Fld label={t('gemini_api_key') || 'مفتاح Gemini API (Google AI Studio)'}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPw ? 'text' : 'password'}
                                            className="form-input"
                                            value={ai.gemini_api_key}
                                            onChange={e => setAi(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                                            placeholder="AIzaSy..."
                                            style={{ ...inp, paddingRight: 40 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(p => !p)}
                                            style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                            }}
                                        >
                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'block', lineHeight: 1.4 }}>
                                        {t('gemini_key_hint') || 'يمكنك الحصول على مفتاح مجاني من Google AI Studio لتشغيل المساعد الذكي.'}
                                    </span>
                                </Fld>
                            </div>
                        </Card>
                    </>
                )}

                {/* ══ 8. DATABASE ════════════════════════════════════════════════════ */}
                {sec === 'database' && (isAdmin || user?.permissions?.database?.can_view) && <>
                    {/* Database Connection Settings */}
                    <Card title={t('database_connection') || 'اتصال قاعدة البيانات'} icon={Database}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontSize: '.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dbStatus.isConnected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                                        {t('cloud_database') || 'قاعدة بيانات سحابية (Cloud)'}
                                    </div>
                                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        {dbStatus.isConnected 
                                            ? (t('connected_success') || 'متصل بنجاح بقاعدة البيانات') 
                                            : `${t('connection_failed') || 'فشل الاتصال'}: ${dbStatus.error}`}
                                    </div>
                                </div>
                                <button
                                    style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}
                                    onClick={() => {
                                        setNewCloudUri('');
                                        setCloudError('');
                                        setCloudModalOpen(true);
                                    }}
                                    disabled={saving}
                                >
                                    {t('connect_cloud') || 'تحديث رابط الاتصال'}
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('backup_and_restore') || 'النسخ الاحتياطي والاستعادة'} icon={Database}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                            {t('backup_hint') || 'قم بأخذ نسخ احتياطية بانتظام لحماية بياناتك.'}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={backup}>
                                    <Download size={14} /> {t('backup') || 'نسخ احتياطي'}
                                </button>
                                <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={restore}>
                                    <Upload size={14} /> {t('restore_from_backup') || 'استعادة من نسخة احتياطية'}
                                </button>
                            </div>
                        </div>
                    </Card>


                    {user?.permissions?.products?.can_delete && (
                        <Card title={t('prod_deleteAll') || 'حذف كل المنتجات'} icon={AlertTriangle} action={
                            <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
                        }>
                            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
                                {t('prod_deleteAllConfirm') || 'هل أنت متأكد من حذف جميع المنتجات من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة!'}
                            </p>
                            <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={triggerDeleteAllProducts}>
                                <Trash2 size={14} /> {t('prod_deleteAll') || 'حذف كل المنتجات'}
                            </button>
                        </Card>
                    )}

                    <Card title={t('reset_app') || 'Reset App'} icon={AlertTriangle} action={
                        <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
                    }>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: t('reset_app_desc') || 'Resetting will <strong>permanently delete all data</strong>. This cannot be undone.' }} />
                        <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={triggerResetApp}>
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
                                {saving ? (t('saving') || 'جارٍ الحفظ...') : (t('save') || 'حفظ واختبار')}
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
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    color: '#fff',
                    fontFamily: 'Cairo, sans-serif'
                }}>
                    <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: '50%',
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
