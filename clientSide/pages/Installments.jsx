import React, { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Trash2, Search, CreditCard, CheckCircle, Clock, AlertCircle, CalendarDays, X } from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Installments() {
    const { t, user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const searchRef = useRef(null);

    const emptyForm = () => ({
        customer_id: '',
        total_amount: '',
        down_payment: '0',
        installment_count: '6',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [formData, setFormData] = useState(emptyForm());

    const emptyPayForm = () => ({
        payment_method: 'cash',
        paid_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [payForm, setPayForm] = useState(emptyPayForm());

    useShortcuts({
        New: () => { if (!showModal && (user?.role === 'admin' || user?.permissions?.installments?.can_create)) openModal(); },
        Escape: () => {
            if (showPayModal) setShowPayModal(false);
            else if (showPlanModal) setShowPlanModal(false);
            else if (showModal) closeModal();
        },
        Search: () => { if (searchRef.current) searchRef.current.focus(); }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [plansData, customersData, settingsData, accountsData] = await Promise.all([
                window.api.installments.getAll(),
                window.api.customers.getAll(),
                window.api.settings.getAll(),
                window.api.accounts.getBankAccounts ? window.api.accounts.getBankAccounts() : Promise.resolve([])
            ]);
            setPlans(plansData || []);
            setCustomers(customersData || []);
            setSettings(settingsData || {});
            setBankAccounts(accountsData || []);
        } catch (e) { console.error('Error loading installments:', e); }
        setLoading(false);
    };

    const currencySymbol = settings.general?.currency_symbol || t('currency_kd') || 'KD';
    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + currencySymbol;

    const calcInstallmentAmount = () => {
        const total = parseFloat(formData.total_amount) || 0;
        const down = parseFloat(formData.down_payment) || 0;
        const count = parseInt(formData.installment_count) || 1;
        if (count < 1) return 0;
        return ((total - down) / count).toFixed(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const total = parseFloat(formData.total_amount);
        const down = parseFloat(formData.down_payment) || 0;
        const count = parseInt(formData.installment_count);
        if (!formData.customer_id) { setError(t('inst_customerRequired') || 'يجب اختيار العميل'); return; }
        if (!total || total <= 0) { setError(t('inst_amountRequired') || 'أدخل المبلغ الإجمالي'); return; }
        if (down >= total) { setError(t('inst_downPaymentError') || 'الدفعة الأولى يجب أن تكون أقل من الإجمالي'); return; }
        if (!count || count < 1) { setError(t('inst_countRequired') || 'عدد الأقساط يجب أن يكون 1 على الأقل'); return; }
        if (!formData.start_date) { setError(t('inst_startDateRequired') || 'أدخل تاريخ بدء الأقساط'); return; }

        setSaving(true);
        try {
            const installmentAmount = parseFloat(calcInstallmentAmount());
            const result = await window.api.installments.create({
                customer_id: parseInt(formData.customer_id),
                total_amount: total,
                down_payment: down,
                installment_count: count,
                installment_amount: installmentAmount,
                frequency: formData.frequency,
                start_date: formData.start_date,
                notes: formData.notes,
                created_by: user?.id || null
            });
            if (result.success) {
                toast.success(t('inst_planCreated') || 'تم إنشاء خطة التقسيط بنجاح');
                loadData();
                closeModal();
            } else {
                setError(result.error || t('errorOccurred'));
            }
        } catch (e) {
            setError(e.message);
        }
        setSaving(false);
    };

    const handlePayInstallment = async (e) => {
        e.preventDefault();
        if (!selectedPayment) return;
        setSaving(true);
        try {
            const result = await window.api.installments.payInstallment(selectedPayment.id, {
                payment_method: payForm.payment_method,
                paid_date: payForm.paid_date,
                notes: payForm.notes,
                created_by: user?.id || null
            });
            if (result.success) {
                toast.success(t('inst_paymentRecorded') || 'تم تسجيل الدفعة بنجاح');
                // Reload the plan details
                const updated = await window.api.installments.getById(selectedPlan.id);
                setSelectedPlan(updated);
                loadData();
                setShowPayModal(false);
                setSelectedPayment(null);
                setPayForm(emptyPayForm());
            } else {
                toast.error(result.error || t('errorOccurred'));
            }
        } catch (e) {
            toast.error(e.message);
        }
        setSaving(false);
    };

    const handleViewPlan = async (planId) => {
        const plan = await window.api.installments.getById(planId);
        setSelectedPlan(plan);
        setShowPlanModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm(t('inst_deleteConfirm') || 'حذف خطة التقسيط وجميع أقساطها؟')) {
            const result = await window.api.installments.delete(id);
            if (result.success) { toast.success(t('deletedSuccess')); loadData(); }
            else toast.error(result.error || t('errorOccurred'));
        }
    };

    const openPayModal = (payment) => {
        setSelectedPayment(payment);
        setPayForm(emptyPayForm());
        setShowPayModal(true);
    };

    const openModal = () => { setFormData(emptyForm()); setError(''); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setError(''); };

    const getStatusBadge = (plan) => {
        if (plan.status === 'completed') return <span className="badge badge-success">{t('inst_completed') || 'مكتمل'}</span>;
        if (plan.overdue_payments > 0) return <span className="badge badge-danger">{t('inst_overdue') || 'متأخر'} ({plan.overdue_payments})</span>;
        return <span className="badge badge-warning">{t('inst_active') || 'نشط'}</span>;
    };

    const getPaymentStatusIcon = (payment) => {
        const today = new Date().toISOString().split('T')[0];
        if (payment.status === 'paid') return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
        if (payment.due_date < today) return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
    };

    const filtered = plans.filter(p => {
        const matchSearch = p.plan_number?.includes(searchQuery) || p.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter || (statusFilter === 'overdue' && p.overdue_payments > 0);
        return matchSearch && matchStatus;
    });

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Filter Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '16px', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                    <input ref={searchRef} type="text" className="form-input"
                        placeholder={`${t('search')} (Ctrl+F)`} value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingRight: '40px', width: '220px', margin: 0 }} />
                    <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '150px', margin: 0 }}>
                    <option value="all">{t('all') || 'الكل'}</option>
                    <option value="active">{t('inst_active') || 'نشط'}</option>
                    <option value="overdue">{t('inst_overdue') || 'متأخر'}</option>
                    <option value="completed">{t('inst_completed') || 'مكتمل'}</option>
                </select>
                {(searchQuery || statusFilter !== 'all') && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} style={{ color: 'var(--text-muted)' }}>✕ {t('clear')}</button>
                )}
                <span style={{ marginRight: 'auto', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filtered.length} {t('inst_title') || 'خطط تقسيط'}</span>
                {(user?.role === 'admin' || user?.permissions?.installments?.can_create) && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> {t('inst_add') || 'خطة تقسيط جديدة'}</button>
                )}
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {[
                    { label: t('inst_totalPlans') || 'إجمالي الخطط', value: plans.length, color: '#3b82f6', icon: <CalendarDays size={22} /> },
                    { label: t('inst_activePlans') || 'نشطة', value: plans.filter(p => p.status === 'active').length, color: '#f59e0b', icon: <Clock size={22} /> },
                    { label: t('inst_overduePlans') || 'متأخرة', value: plans.filter(p => p.overdue_payments > 0).length, color: '#ef4444', icon: <AlertCircle size={22} /> },
                    { label: t('inst_completedPlans') || 'مكتملة', value: plans.filter(p => p.status === 'completed').length, color: '#22c55e', icon: <CheckCircle size={22} /> }
                ].map((card, i) => (
                    <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: card.color + '22', color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: card.color }}>{card.value}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plans Table */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><CalendarDays size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead><tr>
                                    <th>{t('inst_planNumber') || 'رقم الخطة'}</th>
                                    <th>{t('sinv_customer') || 'العميل'}</th>
                                    <th>{t('inst_totalAmount') || 'المبلغ الإجمالي'}</th>
                                    <th>{t('inst_downPayment') || 'الدفعة الأولى'}</th>
                                    <th>{t('inst_installments') || 'الأقساط'}</th>
                                    <th>{t('inst_progress') || 'التقدم'}</th>
                                    <th>{t('status')}</th>
                                    <th>{t('actions')}</th>
                                </tr></thead>
                                <tbody>
                                    {filtered.map(plan => (
                                        <tr key={plan.id}>
                                            <td className="font-bold" style={{ color: 'var(--primary)' }}>{plan.plan_number}</td>
                                            <td>{plan.customer_name || '-'}</td>
                                            <td className="font-bold">{formatCurrency(plan.total_amount)}</td>
                                            <td>{formatCurrency(plan.down_payment)}</td>
                                            <td>
                                                <span style={{ color: '#22c55e', fontWeight: 600 }}>{plan.paid_payments}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>/{plan.total_payments}</span>
                                            </td>
                                            <td>
                                                <div style={{ width: '90px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${plan.total_payments > 0 ? (plan.paid_payments / plan.total_payments * 100) : 0}%`, height: '100%', background: '#22c55e', borderRadius: '3px', transition: 'width 0.3s' }} />
                                                </div>
                                            </td>
                                            <td>{getStatusBadge(plan)}</td>
                                            <td>
                                                <div className="table-actions">
                                                    {(user?.role === 'admin' || user?.permissions?.installments?.can_view) && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleViewPlan(plan.id)} title={t('inv_view')}><Eye size={16} /></button>
                                                    )}
                                                    {(user?.role === 'admin' || user?.permissions?.installments?.can_delete) && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(plan.id)} title={t('delete')}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Plan Modal */}
            <Modal isOpen={showModal} onClose={closeModal} title={t('inst_add') || 'خطة تقسيط جديدة'} size="md"
                footer={<><button className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel')} (Esc)</button><button type="submit" form="inst-form" className="btn btn-primary" disabled={saving}>{saving ? t('savingProgress') : `${t('save')} (Ctrl+S)`}</button></>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: '16px' }}>{error}</div>}
                <form id="inst-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('sinv_customer')} *</label>
                            <SearchableSelect
                                options={customers.map(c => ({ value: String(c.id), label: `${c.name} (${c.balance ? formatCurrency(c.balance) : formatCurrency(0)})` }))}
                                value={formData.customer_id ? String(formData.customer_id) : ''}
                                onChange={val => {
                                    const customer = customers.find(c => String(c.id) === val);
                                    setFormData({
                                        ...formData,
                                        customer_id: val,
                                        total_amount: customer && customer.balance > 0 ? customer.balance : formData.total_amount
                                    });
                                }}
                                placeholder={t('sinv_selectCustomer')} emptyLabel={t('sinv_selectCustomer')} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('inst_totalAmount') || 'المبلغ الإجمالي'} *</label>
                            <input type="number" className="form-input" value={formData.total_amount} onChange={e => setFormData({ ...formData, total_amount: e.target.value })} min="0.001" step="0.001" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('inst_downPayment') || 'الدفعة الأولى'}</label>
                            <input type="number" className="form-input" value={formData.down_payment} onChange={e => setFormData({ ...formData, down_payment: e.target.value })} min="0" step="0.001" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('inst_count') || 'عدد الأقساط'} *</label>
                            <input type="number" className="form-input" value={formData.installment_count} onChange={e => setFormData({ ...formData, installment_count: e.target.value })} min="1" max="120" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('inst_frequency') || 'التكرار'}</label>
                            <select className="form-select" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
                                <option value="weekly">{t('inst_weekly') || 'أسبوعي'}</option>
                                <option value="monthly">{t('inst_monthly') || 'شهري'}</option>
                                <option value="quarterly">{t('inst_quarterly') || 'ربع سنوي'}</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('inst_startDate') || 'تاريخ بدء الأقساط'} *</label>
                        <input type="date" className="form-input" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} required />
                    </div>
                    {formData.total_amount && formData.installment_count && (
                        <div style={{ padding: '12px 16px', background: 'var(--primary-light, #eff6ff)', borderRadius: '8px', border: '1px solid var(--primary)', marginBottom: '12px' }}>
                            <strong>{t('inst_eachInstallment') || 'قيمة كل قسط'}:</strong>{' '}
                            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem' }}>
                                {formatCurrency(calcInstallmentAmount())}
                            </span>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">{t('notes')}</label>
                        <textarea className="form-textarea" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ minHeight: '60px' }} />
                    </div>
                </form>
            </Modal>

            {/* View Plan Modal */}
            <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)}
                title={`${t('inst_planDetails') || 'تفاصيل خطة الأقساط'} - ${selectedPlan?.plan_number}`}
                size="lg" footer={<button className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>{t('close')} (Esc)</button>}>
                {selectedPlan && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {[
                                [t('sinv_customer'), selectedPlan.customer_name],
                                [t('inst_totalAmount') || 'الإجمالي', formatCurrency(selectedPlan.total_amount)],
                                [t('inst_downPayment') || 'الدفعة الأولى', formatCurrency(selectedPlan.down_payment)],
                                [t('inst_installmentAmount') || 'قيمة القسط', formatCurrency(selectedPlan.installment_amount)],
                                [t('inst_count') || 'عدد الأقساط', selectedPlan.installment_count],
                                [t('inst_frequency') || 'التكرار', selectedPlan.frequency === 'monthly' ? (t('inst_monthly') || 'شهري') : selectedPlan.frequency === 'weekly' ? (t('inst_weekly') || 'أسبوعي') : (t('inst_quarterly') || 'ربع سنوي')],
                            ].map(([label, val], i) => (
                                <div key={i} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
                                    <div style={{ fontWeight: 600 }}>{val}</div>
                                </div>
                            ))}
                        </div>

                        <h4 style={{ marginBottom: '12px' }}>{t('inst_paymentSchedule') || 'جدول الدفعات'}</h4>
                        <div className="table-container">
                            <table>
                                <thead><tr>
                                    <th>#</th>
                                    <th>{t('inv_dueDate') || 'تاريخ الاستحقاق'}</th>
                                    <th>{t('vouch_amount') || 'المبلغ'}</th>
                                    <th>{t('status')}</th>
                                    <th>{t('inv_date') || 'تاريخ الدفع'}</th>
                                    <th>{t('actions')}</th>
                                </tr></thead>
                                <tbody>
                                    {(selectedPlan.payments || []).map((pmt, i) => {
                                        const today = new Date().toISOString().split('T')[0];
                                        const isOverdue = pmt.status === 'pending' && pmt.due_date < today;
                                        return (
                                            <tr key={pmt.id} style={{ background: isOverdue ? 'rgba(239,68,68,0.05)' : pmt.status === 'paid' ? 'rgba(34,197,94,0.05)' : undefined }}>
                                                <td>{i + 1}</td>
                                                <td style={{ color: isOverdue ? '#ef4444' : undefined, fontWeight: isOverdue ? 600 : undefined }}>
                                                    {new Date(pmt.due_date).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="font-bold">{formatCurrency(pmt.amount)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {getPaymentStatusIcon(pmt)}
                                                        <span style={{ fontSize: '0.85rem' }}>
                                                            {pmt.status === 'paid' ? (t('inst_paid') || 'مدفوع') : isOverdue ? (t('inst_overdue') || 'متأخر') : (t('inst_upcoming') || 'قادم')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>{pmt.paid_date ? new Date(pmt.paid_date).toLocaleDateString('en-GB') : '-'}</td>
                                                <td>
                                                    {pmt.status === 'pending' && (user?.role === 'admin' || user?.permissions?.installments?.can_create) && (
                                                        <button className="btn btn-primary btn-sm" onClick={() => openPayModal(pmt)} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                                                            <CreditCard size={14} /> {t('inst_payNow') || 'دفع'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Pay Installment Modal */}
            <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)}
                title={t('inst_recordPayment') || 'تسجيل دفعة قسط'}
                size="sm"
                footer={<><button className="btn btn-secondary" onClick={() => setShowPayModal(false)} disabled={saving}>{t('cancel')}</button><button type="submit" form="pay-form" className="btn btn-primary" disabled={saving}>{saving ? t('savingProgress') : (t('inst_payNow') || 'تسجيل الدفع')}</button></>}>
                {selectedPayment && (
                    <div>
                        <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '16px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('inst_installmentAmount') || 'قيمة القسط'}:</span>
                            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary)', marginRight: '8px' }}> {formatCurrency(selectedPayment.amount)}</span>
                        </div>
                        <form id="pay-form" onSubmit={handlePayInstallment}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('inv_paymentMethod')}</label>
                                    <select className="form-select" value={payForm.payment_method} onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}>
                                        <option value="cash">{t('inv_cash')}</option>
                                        <option value="bank">{t('inv_bank')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t('inv_date')}</label>
                                    <input type="date" className="form-input" value={payForm.paid_date} onChange={e => setPayForm({ ...payForm, paid_date: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t('notes')}</label>
                                <input type="text" className="form-input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} placeholder={t('vouch_referencePlaceholder') || 'رقم المرجع أو ملاحظات'} />
                            </div>
                        </form>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Installments;
