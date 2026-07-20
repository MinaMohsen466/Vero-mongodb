import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import Modal from '../components/Modal';
import {
    Plus, Trash2, DollarSign, Home, Coffee,
    Zap, Wrench, MoreHorizontal, Filter, X, Search,
    TrendingDown, Calendar, FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Category Config ─────────────────────────────────────────────────────────
const CATEGORIES = [
    { id: 'salary',       labelAr: 'رواتب',           labelEn: 'Salaries',      icon: DollarSign,    color: '#0f766e' },
    { id: 'rent',         labelAr: 'إيجار',          labelEn: 'Rent',          icon: Home,          color: '#6366f1' },
    { id: 'hospitality',  labelAr: 'ضيافة',           labelEn: 'Hospitality',   icon: Coffee,        color: '#f59e0b' },
    { id: 'utilities',    labelAr: 'كهرباء وماء',     labelEn: 'Utilities',     icon: Zap,           color: '#10b981' },
    { id: 'maintenance',  labelAr: 'صيانة',           labelEn: 'Maintenance',   icon: Wrench,        color: '#ef4444' },
    { id: 'other',        labelAr: 'أخرى',            labelEn: 'Other',         icon: MoreHorizontal, color: '#8b5cf6' },
];

const getCategoryInfo = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[4];
const getCategoryLabel = (id, lang) => {
    const cat = getCategoryInfo(id);
    return lang === 'ar' ? cat.labelAr : cat.labelEn;
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon: Icon, color, currency }) => (
    <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: '1',
        minWidth: '160px',
    }}>
        <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: `${color}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            <Icon size={22} color={color} />
        </div>
        <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                {Number(value).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
            </div>
        </div>
    </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Expenses() {
    const { t, language } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [visibleExpensesCount, setVisibleExpensesCount] = useState(50);

    // Filter state
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [search, setSearch] = useState('');

    // Form state
    const [form, setForm] = useState({
        category: 'rent',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        payment_method: 'cash',
        payment_account_id: '',
        notes: '',
    });

    const currency = t('currency_kd') || 'د.ك';
    const isAr = language === 'ar';

    const load = async () => {
        try {
            const [data, salaries] = await Promise.all([
                window.api.expenses.getAll(),
                window.api.salaries.getAll()
            ]);
            const expenseRows = data || [];
            const salaryRows = (salaries || [])
                .filter(s => !expenseRows.some(ex => ex.source_type === 'salary' && Number(ex.source_id) === Number(s.id)))
                .map(s => ({
                    id: `salary-${s.id}`,
                    payment_number: s.payment_number,
                    category: 'salary',
                    date: s.payment_date || (s.created_at ? String(s.created_at).substring(0, 10) : ''),
                    amount: s.net_salary || 0,
                    description: `${isAr ? 'راتب' : 'Salary'} ${s.employee_name || ''} - ${s.month}`,
                    payment_method: s.payment_method || 'cash',
                    payment_account_id: s.payment_account_id,
                    payment_account_name: s.payment_account_name,
                    source_type: 'salary',
                    source_id: s.id,
                    notes: s.notes
                }));
            setExpenses([...expenseRows, ...salaryRows].sort((a, b) => String(b.date).localeCompare(String(a.date))));
        } catch (e) { console.error(e); }
    };

    const loadAccounts = async () => {
        try {
            const data = await window.api.accounts.getAll();
            const all = (data || []).filter(a => a.can_post);
            setAccounts(all);
        } catch (e) { setAccounts([]); }
    };

    useEffect(() => {
        load();
        loadAccounts();
    }, []);

    useEffect(() => {
        setVisibleExpensesCount(50);
    }, [filterCategory, filterFrom, filterTo, search]);

    // ── Filtered list ─────────────────────────────────────────────
    const filtered = useMemo(() => {
        return expenses.filter(ex => {
            if (filterCategory !== 'all' && ex.category !== filterCategory) return false;
            if (filterFrom && ex.date < filterFrom) return false;
            if (filterTo && ex.date > filterTo) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!ex.description?.toLowerCase().includes(q) &&
                    !ex.payment_number?.toLowerCase().includes(q) &&
                    !getCategoryLabel(ex.category, isAr ? 'ar' : 'en').toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [expenses, filterCategory, filterFrom, filterTo, search, isAr]);

    // ── Summary ────────────────────────────────────────────────────
    const totalAll = useMemo(() => {
        return filtered.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    }, [filtered]);

    const byCategory = useMemo(() => {
        return CATEGORIES.map(cat => ({
            ...cat,
            total: filtered.filter(e => e.category === cat.id).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
        }));
    }, [filtered]);

    // ── Add expense ────────────────────────────────────────────────
    const openAdd = () => {
        setForm({
            category: 'rent',
            date: new Date().toISOString().split('T')[0],
            amount: '',
            description: '',
            payment_method: 'cash',
            payment_account_id: '',
            notes: '',
        });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error(isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
            return;
        }
        if (!form.date) {
            toast.error(isAr ? 'يرجى إدخال التاريخ' : 'Date is required');
            return;
        }
        setLoading(true);
        try {
            const result = await window.api.expenses.create({
                ...form,
                amount: parseFloat(form.amount),
                payment_account_id: form.payment_account_id || null,
            });
            if (result.success) {
                toast.success(isAr ? 'تم تسجيل المصروف بنجاح' : 'Expense recorded successfully');
                setShowModal(false);
                load();
            } else {
                toast.error(result.error || (isAr ? 'حدث خطأ' : 'Error'));
            }
        } catch (e) {
            toast.error(e.message);
        }
        setLoading(false);
    };

    // ── Delete expense ─────────────────────────────────────────────
    const handleDelete = async (id, payNum) => {
        const msg = isAr
            ? `هل أنت متأكد من حذف المصروف ${payNum}؟ سيتم عكس القيد المحاسبي.`
            : `Delete expense ${payNum}? The accounting entry will be reversed.`;
        if (!window.confirm(msg)) return;
        try {
            const result = await window.api.expenses.delete(id);
            if (result.success) {
                toast.success(isAr ? 'تم الحذف بنجاح' : 'Deleted successfully');
                load();
            } else {
                toast.error(result.error || (isAr ? 'فشل الحذف' : 'Delete failed'));
            }
        } catch (e) { toast.error(e.message); }
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>

            {/* ── Title bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <TrendingDown size={22} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                            {isAr ? 'إدارة المصروفات' : 'Expenses Management'}
                        </h1>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                            {isAr ? 'تتبع وإدارة جميع مصروفات الشركة' : 'Track and manage all business expenses'}
                        </p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} />
                    {isAr ? 'إضافة مصروف' : 'Add Expense'}
                </button>
            </div>

            {/* ── Summary cards ── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <SummaryCard
                    label={isAr ? 'الإجمالي (الفلترة الحالية)' : 'Total (Current Filter)'}
                    value={totalAll}
                    icon={DollarSign}
                    color="#6366f1"
                    currency={currency}
                />
                {byCategory.filter(c => c.total > 0).map(cat => {
                    const Icon = cat.icon;
                    return (
                        <SummaryCard
                            key={cat.id}
                            label={isAr ? cat.labelAr : cat.labelEn}
                            value={cat.total}
                            icon={Icon}
                            color={cat.color}
                            currency={currency}
                        />
                    );
                })}
            </div>

            {/* ── Filters ── */}
            <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                    <Filter size={16} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{isAr ? 'تصفية' : 'Filter'}</span>
                </div>

                {/* Search */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={15} style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder={isAr ? 'بحث في المصروفات...' : 'Search expenses...'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingRight: '32px', width: '100%' }}
                        className="form-input"
                    />
                </div>

                {/* Category filter */}
                <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="form-input"
                    style={{ minWidth: '150px' }}
                >
                    <option value="all">{isAr ? 'جميع الفئات' : 'All Categories'}</option>
                    {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{isAr ? c.labelAr : c.labelEn}</option>
                    ))}
                </select>

                {/* Date from */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {isAr ? 'من:' : 'From:'}
                    </span>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="form-input" style={{ minWidth: '140px' }} />
                </div>

                {/* Date to */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {isAr ? 'إلى:' : 'To:'}
                    </span>
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="form-input" style={{ minWidth: '140px' }} />
                </div>

                {/* Clear filters */}
                {(filterCategory !== 'all' || filterFrom || filterTo || search) && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => { setFilterCategory('all'); setFilterFrom(''); setFilterTo(''); setSearch(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}
                    >
                        <X size={15} />
                        {isAr ? 'مسح التصفية' : 'Clear'}
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--surface-alt, var(--background))', borderBottom: '2px solid var(--border)' }}>
                                {[
                                    isAr ? 'رقم المصروف' : 'Expense No.',
                                    isAr ? 'التاريخ' : 'Date',
                                    isAr ? 'الفئة' : 'Category',
                                    isAr ? 'الوصف' : 'Description',
                                    isAr ? 'طريقة الدفع' : 'Payment',
                                    isAr ? 'المبلغ' : 'Amount',
                                    isAr ? 'الإجراءات' : 'Actions',
                                ].map((h, i) => (
                                    <th key={i} style={{ padding: '12px 16px', textAlign: isAr ? 'right' : 'left', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '48px 16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <TrendingDown size={40} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                                {isAr ? 'لا توجد مصروفات مسجلة' : 'No expenses recorded'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.slice(0, visibleExpensesCount).map((ex, idx) => {
                                const cat = getCategoryInfo(ex.category);
                                const Icon = cat.icon;
                                return (
                                    <tr
                                        key={ex.id}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            background: idx % 2 === 0 ? 'transparent' : 'var(--surface-alt, transparent)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover, rgba(99,102,241,0.05))'}
                                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--surface-alt, transparent)'}
                                    >
                                        {/* Number */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                                                {ex.payment_number}
                                            </span>
                                        </td>
                                        {/* Date */}
                                        <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--text)' }}>
                                            {ex.date}
                                        </td>
                                        {/* Category */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                background: `${cat.color}18`,
                                                color: cat.color,
                                                border: `1px solid ${cat.color}40`,
                                                borderRadius: '20px',
                                                padding: '3px 10px',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                            }}>
                                                <Icon size={12} />
                                                {isAr ? cat.labelAr : cat.labelEn}
                                            </span>
                                        </td>
                                        {/* Description */}
                                        <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--text)', maxWidth: '220px' }}>
                                            <span title={ex.description} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ex.description || '-'}
                                            </span>
                                            {ex.source_type === 'salary' && (
                                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {isAr ? 'مسجل تلقائيا من صرف الرواتب' : 'Recorded automatically from payroll'}
                                                </span>
                                            )}
                                            {ex.notes && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.notes}</span>
                                            )}
                                        </td>
                                        {/* Payment method */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                background: ex.payment_method === 'bank' ? '#3b82f620' : '#10b98120',
                                                color: ex.payment_method === 'bank' ? '#3b82f6' : '#10b981',
                                                borderRadius: '6px',
                                                padding: '2px 8px',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                            }}>
                                                {ex.payment_method === 'bank'
                                                    ? (isAr ? 'بنك' : 'Bank')
                                                    : (isAr ? 'نقداً' : 'Cash')}
                                            </span>
                                            {ex.payment_account_name && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {ex.payment_account_name}
                                                </div>
                                            )}
                                        </td>
                                        {/* Amount */}
                                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
                                            {Number(ex.amount).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                                        </td>
                                        {/* Actions */}
                                        <td style={{ padding: '12px 16px' }}>
                                            {ex.source_type === 'salary' ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                                    {isAr ? 'من الرواتب' : 'Payroll'}
                                                </span>
                                            ) : (
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    onClick={() => handleDelete(ex.id, ex.payment_number)}
                                                    title={isAr ? 'حذف' : 'Delete'}
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {filtered.length > 0 && (
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface-alt, var(--background))' }}>
                                    <td colSpan={5} style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                        {isAr ? `الإجمالي (${filtered.length} سجل)` : `Total (${filtered.length} records)`}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '1rem', color: '#ef4444' }}>
                                        {totalAll.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} {currency}
                                    </td>
                                    <td />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                {filtered.length > visibleExpensesCount && (
                    <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                        <button 
                            type="button"
                            className="btn btn-secondary" 
                            onClick={() => setVisibleExpensesCount(prev => prev + 50)}
                            style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                        >
                            {isAr ? 'تحميل المزيد' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Add Modal ── */}
            <Modal
                isOpen={showModal}
                title={isAr ? 'إضافة مصروف جديد' : 'Add New Expense'}
                onClose={() => setShowModal(false)}
            >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '420px' }}>

                        {/* Category selector */}
                        <div className="form-group">
                            <label className="form-label">{isAr ? 'فئة المصروف *' : 'Expense Category *'}</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {CATEGORIES.map(cat => {
                                    const Icon = cat.icon;
                                    const selected = form.category === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                                padding: '12px 8px',
                                                borderRadius: '10px',
                                                border: `2px solid ${selected ? cat.color : 'var(--border)'}`,
                                                background: selected ? `${cat.color}15` : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <Icon size={20} color={selected ? cat.color : 'var(--text-muted)'} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: selected ? cat.color : 'var(--text-muted)' }}>
                                                {isAr ? cat.labelAr : cat.labelEn}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date + Amount */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">{isAr ? 'التاريخ *' : 'Date *'}</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{isAr ? 'المبلغ *' : 'Amount *'}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    className="form-input"
                                    placeholder="0.000"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label className="form-label">{isAr ? 'الوصف' : 'Description'}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={isAr ? 'وصف المصروف...' : 'Expense description...'}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            />
                        </div>

                        {/* Payment method */}
                        <div className="form-group">
                            <label className="form-label">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
                            <select
                                className="form-input"
                                value={form.payment_method}
                                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                            >
                                <option value="cash">{isAr ? 'نقداً' : 'Cash'}</option>
                                <option value="bank">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                            </select>
                        </div>

                        {/* Payment account (optional) */}
                        {accounts.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">{isAr ? 'حساب الدفع (اختياري)' : 'Payment Account (Optional)'}</label>
                                <select
                                    className="form-input"
                                    value={form.payment_account_id}
                                    onChange={e => setForm(f => ({ ...f, payment_account_id: e.target.value }))}
                                >
                                    <option value="">{isAr ? 'الحساب الافتراضي' : 'Default Account'}</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">{isAr ? 'ملاحظات' : 'Notes'}</label>
                            <textarea
                                className="form-input"
                                rows={2}
                                placeholder={isAr ? 'ملاحظات إضافية...' : 'Additional notes...'}
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {/* Accounting note */}
                        <div style={{
                            background: '#6366f110',
                            border: '1px solid #6366f130',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                        }}>
                            <FileText size={16} color="#6366f1" style={{ marginTop: 2, flexShrink: 0 }} />
                            <p style={{ fontSize: '0.78rem', color: '#6366f1', margin: 0, lineHeight: 1.5 }}>
                                {isAr
                                    ? 'سيتم إنشاء قيد محاسبي تلقائياً عند الحفظ: مدين حساب المصروف، دائن حساب النقدية/البنك.'
                                    : 'An accounting entry will be automatically created: Debit expense account, Credit cash/bank.'}
                            </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button className="btn btn-primary" onClick={save} disabled={loading}>
                                {loading && <span className="spinner-btn" style={{ marginInlineEnd: '8px' }}></span>}
                                {loading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ المصروف' : 'Save Expense')}
                            </button>
                        </div>
                    </div>
            </Modal>
        </div>
    );
}
