import React, { useState, useEffect, useRef } from 'react';
import {
    Settings as Ico, Users, Building2, Database, Plus, Edit2, Trash2, Printer, Shield,
    Image, FolderOpen, HardDrive, FileText, Palette, Globe, AlertTriangle, Save,
    RefreshCw, Download, Upload, Eye, EyeOff, ChevronRight, X, Check,
    Home, Truck, Package, Wallet, Monitor, ShoppingCart, ShoppingBag, CreditCard,
    BookOpen, UserCheck, TrendingDown, Warehouse, Ticket, BarChart3, Clock, Calendar,
    ArrowLeftRight, User, Key, Undo, RotateCcw
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

// ─────────────────────────────────────────────────────────────────────────────
export default function Settings() {
    const { user, updateUser, t, theme } = useAuth();

    const roleName = r => r === 'admin' ? (t('admin_role') || 'Admin') : r === 'accountant' ? (t('accountant_role') || 'Accountant') : (t('user_role') || 'User');

    const PERM_MODS = [
        { m: 'dashboard', l: t('dashboard') || 'Dashboard', a: ['view'] },
        { m: 'customers', l: t('customers') || 'Customers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'suppliers', l: t('suppliers') || 'Suppliers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'products', l: t('products') || 'Products', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'sales_invoices', l: t('sales_invoices') || 'Sales Invoices', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'sales_returns', l: t('sales_returns') || 'Sales Returns', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'purchase_invoices', l: t('purchase_invoices') || 'Purchase Invoices', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'purchase_returns', l: t('purchase_returns') || 'Purchase Returns', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'receipt_vouchers', l: t('receipt_vouchers') || 'Receipt Vouchers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'payment_vouchers', l: t('payment_vouchers') || 'Payment Vouchers', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'chart_of_accounts', l: t('chart_of_accounts') || 'Chart of Accounts', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'cash_bank', l: t('cash_bank') || 'Cash & Bank', a: ['view', 'create'] },
        { m: 'journal_entries', l: t('journal_entries') || 'Journal Entries', a: ['view', 'create', 'delete'] },
        { m: 'hr', l: t('hr') || 'HR', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'expenses', l: t('expenses') || 'Expenses', a: ['view', 'create', 'delete'] },
        { m: 'pos', l: t('pos') || 'POS', a: ['view', 'create'] },
        { m: 'warehouse', l: t('warehouse') || 'Warehouse', a: ['view', 'create', 'delete'] },
        { m: 'offers', l: t('offers') || 'Offers & Coupons', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'reports', l: t('reports') || 'Reports', a: ['view'] },
        { m: 'settings', l: t('settings') || 'Settings', a: ['view', 'edit'] },
        { m: 'users', l: t('users') || 'Users', a: ['view', 'create', 'edit', 'delete'] },
        { m: 'permissions', l: t('permissions') || 'Permissions', a: ['view', 'edit'] },
        { m: 'database', l: t('database_management') || 'Database', a: ['view'] },
        { m: 'financial_summary', l: t('financial_summary') || 'Financial Summary', a: ['view'] },
        { m: 'stock_alerts', l: t('stock_alerts') || 'Stock Alerts', a: ['view'] },
        { m: 'customer_receivables', l: t('customer_receivables') || 'Customer Receivables', a: ['view'] },
        { m: 'dashboard_charts', l: t('charts') || 'Charts', a: ['view'] },
    ];

    const PERM_KEYS = [
        { key: 'can_view', label: t('view') || 'View', act: 'view' },
        { key: 'can_create', label: t('create') || 'Create', act: 'create' },
        { key: 'can_edit', label: t('edit') || 'Edit', act: 'edit' },
        { key: 'can_delete', label: t('delete') || 'Delete', act: 'delete' },
    ];
    const isAdmin = user?.role === 'admin';

    const getModIcon = (mod) => {
        const icons = {
            dashboard: Home,
            customers: Users,
            suppliers: Truck,
            products: Package,
            sales_invoices: ShoppingCart,
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
    const [permMode, setPermMode] = useState('role'); // 'role' | 'user'
    const [permSearch, setPermSearch] = useState('');
    const [selRole, setSelRole] = useState('accountant'); // selected role in role mode
    const [backupPath, setBackupPath] = useState(null);
    const [backupLastTime, setBackupLastTime] = useState(null);
    const upUserIdRef = useRef(null); // tracks which user we're loading for (prevents race conditions)
    const dropRef = useRef(null);

    const [counts, setCounts] = useState({ products: 0, customers: 0, suppliers: 0, sales_invoices: 0, purchase_invoices: 0 });

    const [co, setCo] = useState({ company_name: '', company_address: '', company_phone: '', company_email: '', company_tax_number: '', company_logo: '' });
    const [gen, setGen] = useState({
        currency: t('default_currency') || 'Kuwaiti Dinar', currency_symbol: t('currency_kd') || 'KD', tax_rate: '0', decimal_places: '3',
        allow_negative_stock: 'no', show_financial_summary: 'yes', show_low_stock_products: 'yes', show_customer_receivables: 'yes',
        show_sales_purchases_charts: 'yes', language: 'en', enable_product_color: 'no',
        brand_color: '#2563eb', enable_pos_sounds: 'yes', enable_alert_sounds: 'yes',
        show_purchase_price_in_pos: 'no'
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
        { id: 'company', l: t('company_details') || 'بيانات الشركة', icon: Building2 },
        { id: 'general', l: t('general_settings') || 'الإعدادات العامة', icon: Ico },
        { id: 'print_invoice', l: t('invoice_settings') || 'إعدادات الفاتورة', icon: FileText },
        ...(isAdmin ? [
            { id: 'users', l: t('users') || 'إدارة المستخدمين', icon: Users },
            { id: 'permissions', l: t('permissions') || 'الصلاحيات', icon: Shield },
            { id: 'activity_log', l: t('activity_log') || 'سجل النشاط', icon: FileText },
        ] : []),
        { id: 'database', l: t('database') || 'قاعدة البيانات', icon: Database },
    ];



    // ─── Activity Log State ───────────────────────────────────────────────────
    const [activityLogs, setActivityLogs] = useState([]);
    const [logLoading, setLogLoading] = useState(false);
    const [logFilters, setLogFilters] = useState({ module: '', action: '', user_name: '', startDate: '', endDate: '' });

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (sec === 'permissions' && !permLoaded) loadPerms(); }, [sec]);
    useEffect(() => { if (sec === 'activity_log') loadActivityLog(); }, [sec]);

    const loadActivityLog = async (filters = logFilters) => {
        setLogLoading(true);
        try {
            const logs = await window.api.activityLog.getAll(filters);
            setActivityLogs(logs || []);
        } catch (e) { console.error(e); }
        setLogLoading(false);
    };



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
                    enable_alert_sounds: sd.general?.enable_alert_sounds !== undefined ? sd.general.enable_alert_sounds : 'yes'
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
            const [path, size] = await Promise.all([
                window.api.settings?.getDbPath?.() || '',
                window.api.settings?.getDbSize?.() || ''
            ]);
            setDbPath(path || ''); setDbSize(size || '');
            
            // Load backup path
            if (window.api.database?.getBackupPath) {
                const bkp = await window.api.database.getBackupPath();
                setBackupPath(bkp.backupDbPath);
                setBackupLastTime(bkp.lastBackupTime);
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
            const [a, u, ad] = await Promise.all([
                window.api.permissions.getByRole('accountant'),
                window.api.permissions.getByRole('user'),
                window.api.permissions.getByRole('admin')
            ]);
            setPermState({ accountant: a || {}, user: u || {}, admin: ad || {} });
            setPermLoaded(true);
        } catch (e) { console.error(e); }
    };

    const togglePerm = (role, mod, key) => setPermState(p => ({
        ...p, [role]: { ...p[role], [mod]: { ...p[role]?.[mod], [key]: !p[role]?.[mod]?.[key] } }
    }));

    const savePerms = async () => {
        setSaving(true);
        try {
            const rolesToSave = selRole === 'admin'
                ? [['admin', permState.admin]]
                : [['accountant', permState.accountant], ['user', permState.user]];
            await Promise.all(rolesToSave.map(([r, p]) => window.api.permissions.savePermissions(r, p)));
            toast.success(t('savedSuccess') || 'Permissions saved successfully');

            // Refresh current user's session permissions so changes take effect immediately
            if (user && rolesToSave.some(([r]) => r === user.role)) {
                const freshPerms = await window.api.permissions.getByRole(user.role);
                if (freshPerms && Object.keys(freshPerms).length > 0) {
                    updateUser({ ...user, permissions: freshPerms });
                }
            }
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

    const handleDeleteAll = async () => {
        if (confirm(t('prod_deleteAllConfirm') || 'Are you sure you want to delete all products from the database? This action cannot be undone!')) {
            try {
                const result = await window.api.products.deleteAll();
                if (result && result.success) {
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
                background: theme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderLeft: '1px solid var(--border)',
                borderRadius: '16px',
                margin: '16px 8px 16px 16px',
                padding: '16px 8px',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
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
                                { id: 'accountant', label: t('accountant_role') || 'Accountant', desc: 'صلاحيات متوسطة مخصصة لإدارة العمليات المالية والقيود والحسابات.', icon: Key, color: '#6366f1' },
                                { id: 'user', label: t('user_role') || 'User', desc: 'صلاحيات محدودة مخصصة لإصدار الفواتير ونقاط البيع بدون العمليات الإدارية.', icon: User, color: '#10b981' }
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
                            <Card title={`${t('role_permissions') || 'Role Permissions'}: ${roleName(selRole)}`} icon={Shield}
                                action={
                                    selRole === 'admin' ? <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,.1)', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>{t('admin_role') || 'Admin'}</span> : null
                                }
                            >
                                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-secondary)', width: '40%' }}>{t('module') || 'Module'}</th>
                                                {PERM_KEYS.map(pk => <th key={pk.key} style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-secondary)', width: '15%' }}>{pk.label}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PERM_MODS.map((m, i) => (
                                                <tr key={m.m} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {getModIcon(m.m)}
                                                        </div>
                                                        <span>{m.l}</span>
                                                    </td>
                                                    {PERM_KEYS.map(pk => (
                                                        <td key={pk.key} style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                            <PermCell has={!!permState[selRole]?.[m.m]?.[pk.key]} enabled={m.a.includes(pk.act)}
                                                                onToggle={() => togglePerm(selRole, m.m, pk.key)} />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                        {permLoaded && <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all .2s' }} disabled={saving} onClick={savePerms}>
                                <Save size={15} /> {saving ? (t('saving') || 'Saving...') : (t('save_role_permissions') || 'Save Role Permissions')}
                            </button>
                        </div>}
                    </>}

                    {/* ── INDIVIDUAL USER MODE ── */}
                    {permMode === 'user' && <>
                        <Card title={t('select_user_permissions') || 'Select a user to customize permissions'} icon={Users}>
                            {/* Search bar */}
                            <div style={{ position: 'relative', marginBottom: 16 }}>
                                <input
                                    placeholder={t('search_user_placeholder') || 'ابحث بالاسم...'}
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
                                    u.role !== 'admin' && (
                                        !permSearch ||
                                        u.full_name?.toLowerCase().includes(permSearch.toLowerCase()) ||
                                        u.username?.toLowerCase().includes(permSearch.toLowerCase()) ||
                                        roleName(u.role)?.toLowerCase().includes(permSearch.toLowerCase())
                                    )
                                );
                                if (users.length === 0) return <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: '.875rem' }}>{t('loading') || 'جاري التحميل...'}</div>;
                                if (filtered.length === 0) return <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)', fontSize: '.875rem' }}>{t('no_results') || 'لا توجد نتائج'}</div>;
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
                            <Card
                                title={`${t('override_role_permissions') || 'Override Role Permissions'}: ${selUser.full_name || selUser.username}`}
                                icon={Shield}
                                action={upHasInd
                                    ? <span style={{ fontSize: '.72rem', background: 'rgba(16,185,129,.12)', color: 'var(--success)', padding: '4px 12px', borderRadius: 20, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span> {t('custom_permissions_badge') || 'Custom Permissions Active'}</span>
                                    : <span style={{ fontSize: '.72rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>{t('default_role_permissions_badge') || 'Using Role Permissions'}</span>}
                            >
                                {upLoading ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}><div className="spinner" /></div> : <>
                                    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: 16 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-secondary)', width: '40%' }}>{t('module') || 'Module'}</th>
                                                    {PERM_KEYS.map(pk => <th key={pk.key} style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 600, fontSize: '.8rem', color: 'var(--text-secondary)', width: '15%' }}>{pk.label}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {PERM_MODS.map((m, i) => (
                                                    <tr key={m.m} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                                                        <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.85rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {getModIcon(m.m)}
                                                            </div>
                                                            <span>{m.l}</span>
                                                        </td>
                                                        {PERM_KEYS.map(pk => (
                                                            <td key={pk.key} style={{ padding: '12px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
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
                                        <button style={{ ...btnStyle, background: 'linear-gradient(135deg, var(--primary), #3b82f6)', color: '#fff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)', transition: 'all .2s' }} disabled={saving} onClick={saveUserPerms}>
                                            <Save size={15} /> {saving ? (t('saving') || 'Saving...') : (t('save_individual_permissions') || 'Save Individual Permissions')}
                                        </button>
                                        {upHasInd && <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                                            disabled={saving} onClick={clearUserPerms}>
                                            <RefreshCw size={14} /> {t('reset_to_role_permissions') || 'Reset to Role Permissions'}
                                        </button>}
                                    </div>
                                </>}
                            </Card>
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
                                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', width: '20%' }}>{t('log_entity_ref') || 'المرجع'}</th>
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
                                                            <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.entity_ref}>
                                                                {log.entity_ref ? (
                                                                    <span style={{
                                                                        fontFamily: 'monospace', fontSize: '.78rem', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-light)', display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)'
                                                                    }}>
                                                                        {log.entity_ref}
                                                                    </span>
                                                                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '.8rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
                                            {activityLogs.length} {t('records') || 'سجل'}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        </>
                    );
                })()}
                                            {/* ══ 8. DATABASE ════════════════════════════════════════════════════ */}
                {sec === 'database' && (isAdmin || user?.permissions?.database?.can_view) && <>
                    <Card title={t('system_diagnostics') || 'تشخيصات النظام وإحصائيات البيانات'} icon={HardDrive}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                            {[
                                { label: t('menu_products') || 'المنتجات', value: counts.products, color: '#F59E0B' },
                                { label: t('menu_customers') || 'العملاء', value: counts.customers, color: '#3B82F6' },
                                { label: t('menu_suppliers') || 'الموردين', value: counts.suppliers, color: '#8B5CF6' },
                                { label: t('menu_sales') || 'فواتير المبيعات', value: counts.sales_invoices, color: '#10B981' },
                                { label: t('menu_purchases') || 'فواتير المشتريات', value: counts.purchase_invoices, color: '#EF4444' }
                            ].map((c, i) => (
                                <div key={i} style={{
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>{c.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.value}</div>
                                    <div style={{ height: 4, width: '100%', background: 'var(--border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, (c.value / Math.max(1, counts.products + counts.customers + counts.suppliers + counts.sales_invoices + counts.purchase_invoices)) * 100)}%`, height: '100%', background: c.color }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card title={t('database_info') || 'معلومات قاعدة البيانات'} icon={HardDrive}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontFamily: 'monospace', fontSize: '.82rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                                <strong>{t('path') || 'المسار'}: </strong>{dbPath || (t('not_available') || 'غير متاح')}
                            </div>
                            <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{t('size') || 'الحجم'}: </strong><span dir="ltr">{dbSize || (t('calculating') || 'جاري الحساب...')}</span>
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
                                    <RefreshCw size={14} /> {t('optimize_space') || 'تحسين المساحة'}
                                </button>
                            </div>
                        </div>
                    </Card>

                    <Card title={t('backup_and_restore') || 'النسخ الاحتياطي والاستعادة'} icon={Database}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                            {t('backup_hint') || 'قم بأخذ نسخ احتياطية بانتظام لحماية بياناتك.'}
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={backup}>
                                <Download size={14} /> {t('backup') || 'نسخ احتياطي'}
                            </button>
                            <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={restore}>
                                <Upload size={14} /> {t('restore_from_backup') || 'استعادة من نسخة احتياطية'}
                            </button>
                        </div>
                    </Card>

                    <Card title={t('automatic_backup') || 'النسخة الاحتياطية الآلية'} icon={HardDrive}>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                            اختر مسار احتياطي بديل لحفظ نسخة من البيانات تلقائياً عند كل عملية تحديث
                        </p>
                        <Fld label="مسار النسخة الاحتياطية">
                            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                                <input 
                                    className="form-input" 
                                    value={backupPath || ''} 
                                    readOnly
                                    placeholder="لم يتم تحديد مسار بعد"
                                    style={{ ...inp, flex: 1, background: 'var(--bg-secondary)' }} 
                                />
                                <button 
                                    style={{ ...btnStyle, background: 'var(--primary)', color: '#fff', flexShrink: 0 }} 
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            const res = await window.api.database.selectBackupPath();
                                            if (res.success && res.path) {
                                                // اختبر المسار أولاً
                                                const testRes = await window.api.database.testBackupPath(res.path);
                                                if (testRes.success) {
                                                    // عيّن المسار
                                                    const setRes = await window.api.database.setBackupPath(res.path);
                                                    if (setRes.success) {
                                                        setBackupPath(res.path);
                                                        toast.success('تم تعيين مسار النسخة الاحتياطية بنجاح');
                                                    } else {
                                                        toast.error(setRes.error || 'فشل تعيين المسار');
                                                    }
                                                } else {
                                                    toast.error(testRes.error || 'المسار غير قابل للكتابة');
                                                }
                                            }
                                        } catch (e) {
                                            toast.error('خطأ في اختيار المسار: ' + e.message);
                                        }
                                        setSaving(false);
                                    }}
                                    disabled={saving}
                                >
                                    <FolderOpen size={14} /> اختر المسار
                                </button>
                            </div>
                        </Fld>
                        {backupPath && (
                            <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', borderLeft: '3px solid #10b981', borderRadius: 6 }}>
                                <div style={{ fontSize: '.825rem', fontWeight: 500, marginBottom: 6, color: '#059669' }}>
                                    ✓ مسار النسخة الاحتياطية نشط
                                </div>
                                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
                                    {backupLastTime && <>آخر نسخة احتياطية: {new Date(backupLastTime).toLocaleString('ar-SA')}</>}
                                </div>
                            </div>
                        )}
                        {backupPath && (
                            <button 
                                style={{ ...btnStyle, marginTop: 10, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        const res = await window.api.database.setBackupPath(null);
                                        if (res.success) {
                                            setBackupPath(null);
                                            setBackupLastTime(null);
                                            toast.success('تم إلغاء النسخة الاحتياطية');
                                        } else {
                                            toast.error(res.error);
                                        }
                                    } catch (e) {
                                        toast.error('خطأ: ' + e.message);
                                    }
                                    setSaving(false);
                                }}
                                disabled={saving}
                            >
                                <X size={14} /> إلغاء النسخة الاحتياطية
                            </button>
                        )}
                    </Card>

                    {user?.permissions?.products?.can_delete && (
                        <Card title={t('prod_deleteAll') || 'حذف كل المنتجات'} icon={AlertTriangle} action={
                            <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
                        }>
                            <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
                                {t('prod_deleteAllConfirm') || 'هل أنت متأكد من حذف جميع المنتجات من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة!'}
                            </p>
                            <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={handleDeleteAll}>
                                <Trash2 size={14} /> {t('prod_deleteAll') || 'حذف كل المنتجات'}
                            </button>
                        </Card>
                    )}

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
