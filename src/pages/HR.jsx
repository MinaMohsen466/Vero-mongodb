import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import Modal from '../components/Modal';
import {
    Users, Plus, Edit2, Trash2, DollarSign,
    Calendar, AlertCircle, Check, X, Save, Search
} from 'lucide-react';

const TABS = [
    { id: 'employees', label: 'الموظفون', icon: Users },
    { id: 'salaries', label: 'الرواتب', icon: DollarSign },
    { id: 'leaves', label: 'الإجازات', icon: Calendar },
    { id: 'deductions', label: 'الخصومات', icon: AlertCircle },
];

const LEAVE_TYPES = ['سنوية', 'مرضية', 'طارئة', 'بدون راتب', 'أخرى'];
const LEAVE_STATUS = { pending: 'قيد الانتظار', approved: 'معتمدة', rejected: 'مرفوضة' };
const DEPT_LIST = ['الإدارة', 'المحاسبة', 'المبيعات', 'المخازن', 'الإنتاج', 'الموارد البشرية', 'تقنية المعلومات', 'أخرى'];

// ============ EMPLOYEES TAB ============
function EmployeesTab() {
    const [employees, setEmployees] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        name: '', job_title: '', department: '', hire_date: '',
        base_salary: '', phone: '', email: '', national_id: '',
        address: '', bank_account: '', notes: '', is_active: 1
    });

    const load = async () => {
        try {
            const data = await window.api.employees.getAll();
            setEmployees(data || []);
        } catch (e) { console.error('Load employees error:', e); }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => {
        setEditing(null);
        setError('');
        setForm({
            name: '', job_title: '', department: '',
            hire_date: new Date().toISOString().split('T')[0],
            base_salary: '', phone: '', email: '', national_id: '',
            address: '', bank_account: '', notes: '', is_active: 1
        });
        setShowModal(true);
    };

    const openEdit = (emp) => {
        setEditing(emp);
        setError('');
        setForm({ ...emp });
        setShowModal(true);
    };

    const save = async () => {
        if (!form.name?.trim()) { setError('اسم الموظف مطلوب'); return; }
        setError('');
        const result = editing
            ? await window.api.employees.update({ ...form, id: editing.id })
            : await window.api.employees.create(form);
        if (result?.success) {
            setShowModal(false);
            setSuccess(editing ? 'تم تعديل بيانات الموظف' : 'تمت إضافة الموظف وإنشاء حساب الراتب تلقائياً');
            load();
            setTimeout(() => setSuccess(''), 4000);
        } else {
            setError(result?.error || 'حدث خطأ');
        }
    };

    const del = async (id) => {
        if (!confirm('هل أنت متأكد من حذف الموظف؟')) return;
        const r = await window.api.employees.delete(id);
        if (r?.success) load();
        else alert(r?.error || 'حدث خطأ');
    };

    const filtered = employees.filter(e =>
        (e.name || '').includes(search) ||
        (e.department || '').includes(search) ||
        (e.job_title || '').includes(search)
    );

    return (
        <div>
            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

            <div className="page-header" style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" placeholder="بحث عن موظف..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingRight: 40, width: 280 }} />
                    <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> إضافة موظف
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <h3>لا يوجد موظفون</h3>
                            <p>قم بإضافة موظف جديد للبدء</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الكود</th><th>الاسم</th><th>المسمى الوظيفي</th><th>القسم</th>
                                        <th>الراتب الأساسي</th><th>حساب الراتب</th><th>الحالة</th><th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(emp => (
                                        <tr key={emp.id}>
                                            <td className="font-bold">{emp.code}</td>
                                            <td className="font-bold">{emp.name}</td>
                                            <td>{emp.job_title || '-'}</td>
                                            <td>{emp.department || '-'}</td>
                                            <td>{Number(emp.base_salary || 0).toFixed(3)}</td>
                                            <td>
                                                {emp.account_code
                                                    ? <span style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>{emp.account_code} - {emp.account_name}</span>
                                                    : '-'}
                                            </td>
                                            <td><span className={`badge ${emp.is_active ? 'badge-success' : 'badge-danger'}`}>{emp.is_active ? 'نشط' : 'موقوف'}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)} title="تعديل"><Edit2 size={16} /></button>
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(emp.id)} title="حذف"><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)}
                title={editing ? 'تعديل موظف' : 'إضافة موظف جديد'} size="lg"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={save}><Save size={16} /> {editing ? 'حفظ التغييرات' : 'إضافة'}</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form onSubmit={e => { e.preventDefault(); save(); }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">الاسم الكامل *</label>
                            <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="أدخل اسم الموظف" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">المسمى الوظيفي</label>
                            <input type="text" className="form-input" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="مثال: محاسب، مدير مبيعات" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">القسم</label>
                            <select className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                <option value="">اختر القسم</option>
                                {DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">تاريخ التعيين</label>
                            <input type="date" className="form-input" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">الراتب الأساسي</label>
                            <input type="number" className="form-input" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0.000" step="0.001" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">رقم الهاتف</label>
                            <input type="text" className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="مثال: 9XXXXXXXX" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">البريد الإلكتروني</label>
                            <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">رقم الهوية</label>
                            <input type="text" className="form-input" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">رقم الحساب البنكي (IBAN)</label>
                        <input type="text" className="form-input" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} placeholder="KW..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">العنوان</label>
                        <input type="text" className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">ملاحظات</label>
                        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    {editing && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                                الموظف نشط
                            </label>
                        </div>
                    )}
                </form>
                {!editing && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                        ⚡ سيتم إنشاء حساب محاسبي تلقائياً تحت حساب رواتب الموظفين عند الإضافة
                    </p>
                )}
            </Modal>
        </div>
    );
}

// ============ SALARIES TAB ============
function SalariesTab() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [salaries, setSalaries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        employee_id: '', month: '', base_salary: '', deductions: '0',
        payment_method: 'cash', payment_account_id: '', notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const load = async () => {
        const [emps, sals, accs] = await Promise.all([
            window.api.employees.getAll(),
            window.api.salaries.getAll(),
            window.api.accounts.getBankAccounts()
        ]);
        setEmployees(emps || []);
        setSalaries(sals || []);
        setAccounts(accs || []);
    };

    const loadEmployeeDeductions = async (empId, month) => {
        if (!empId || !month) return;
        try {
            const deds = await window.api.deductions.getByEmployee(empId);
            const monthDeds = (deds || []).filter(d => d.month === month);
            const total = monthDeds.reduce((s, d) => s + Number(d.amount || 0), 0);
            setForm(f => ({ ...f, deductions: String(total), _monthDeductions: monthDeds }));
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const onEmployeeChange = (empId) => {
        const emp = employees.find(e => e.id == empId);
        setForm(f => {
            const updated = { ...f, employee_id: empId, base_salary: emp ? String(emp.base_salary || '') : '' };
            return updated;
        });
        if (empId && form.month) loadEmployeeDeductions(empId, form.month);
    };

    const onMonthChange = (month) => {
        setForm(f => ({ ...f, month }));
        if (form.employee_id && month) loadEmployeeDeductions(form.employee_id, month);
    };

    const curMonth = new Date().toISOString().substring(0, 7);

    const openPay = () => {
        setError('');
        setForm({ employee_id: '', month: curMonth, base_salary: '', deductions: '0', payment_method: 'cash', payment_account_id: '', notes: '', date: new Date().toISOString().split('T')[0] });
        setShowModal(true);
    };

    const pay = async () => {
        if (!form.employee_id || !form.month) { setError('اختر الموظف والشهر'); return; }
        setError('');
        const result = await window.api.salaries.pay({
            ...form,
            base_salary: parseFloat(form.base_salary) || 0,
            deductions: parseFloat(form.deductions) || 0,
            created_by: user?.id
        });
        if (result?.success) {
            setShowModal(false);
            setSuccess(`✅ تم صرف الراتب | رقم: ${result.payment_number} | الصافي: ${Number(result.net_salary).toFixed(3)}`);
            load();
            setTimeout(() => setSuccess(''), 5000);
        } else {
            setError(result?.error || 'حدث خطأ');
        }
    };

    const del = async (id) => {
        if (!confirm('حذف سند الراتب؟ سيتم عكس القيد المحاسبي.')) return;
        const r = await window.api.salaries.delete(id);
        if (r?.success) load(); else alert(r?.error);
    };

    const net = parseFloat(form.base_salary || 0) - parseFloat(form.deductions || 0);

    return (
        <div>
            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div />
                <button className="btn btn-primary" onClick={openPay}><DollarSign size={18} /> صرف راتب</button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {salaries.length === 0 ? (
                        <div className="empty-state"><DollarSign size={48} /><h3>لا يوجد مدفوعات رواتب</h3><p>اضغط "صرف راتب" لإضافة أول صرف</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>رقم السند</th><th>الموظف</th><th>الشهر</th>
                                        <th>الراتب الأساسي</th><th>الخصومات</th><th>الصافي</th>
                                        <th>الصرف</th><th>القيد</th><th>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salaries.map(s => (
                                        <tr key={s.id}>
                                            <td className="font-bold">{s.payment_number}</td>
                                            <td>
                                                <div className="font-bold">{s.employee_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.department}</div>
                                            </td>
                                            <td>{s.month}</td>
                                            <td>{Number(s.base_salary || 0).toFixed(3)}</td>
                                            <td className="text-danger">{Number(s.deductions || 0).toFixed(3)}</td>
                                            <td className="font-bold text-success">{Number(s.net_salary || 0).toFixed(3)}</td>
                                            <td>{s.payment_method === 'cash' ? '🏦 صندوق' : '🏛️ بنك'}</td>
                                            <td>{s.journal_entry_id ? <span className="badge badge-success">مرتبط</span> : '-'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(s.id)} title="حذف"><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="صرف راتب موظف"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={pay}><DollarSign size={16} /> صرف الراتب</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-group">
                    <label className="form-label">الموظف *</label>
                    <select className="form-input" value={form.employee_id} onChange={e => onEmployeeChange(e.target.value)}>
                        <option value="">اختر الموظف</option>
                        {employees.filter(e => e.is_active).map(e => (
                            <option key={e.id} value={e.id}>{e.name} - {e.job_title || 'موظف'}</option>
                        ))}
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">الشهر *</label>
                        <input type="month" className="form-input" value={form.month} onChange={e => onMonthChange(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">تاريخ الصرف</label>
                        <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">الراتب الأساسي</label>
                        <input type="number" className="form-input" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0.000" step="0.001" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            الخصومات
                            {form._monthDeductions?.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginRight: 8 }}>({form._monthDeductions.length} خصم محسوب تلقائياً)</span>}
                        </label>
                        <input type="number" className="form-input" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} placeholder="0.000" step="0.001" />
                        {form._monthDeductions?.length > 0 && (
                            <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.8rem' }}>
                                {form._monthDeductions.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                        <span>{d.reason || 'خصم'}</span>
                                        <span className="text-danger">- {Number(d.amount).toFixed(3)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">طريقة الصرف *</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {[{ val: 'cash', label: '🏦 الصندوق' }, { val: 'bank', label: '🏛️ البنك' }].map(opt => (
                            <label key={opt.val} style={{
                                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                                padding: '10px 20px', border: `2px solid ${form.payment_method === opt.val ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 8, flex: 1, justifyContent: 'center', fontWeight: 500,
                                background: form.payment_method === opt.val ? 'var(--primary-light, rgba(59,130,246,.1))' : 'transparent'
                            }}>
                                <input type="radio" name="pay_method" value={opt.val} checked={form.payment_method === opt.val} onChange={() => setForm({ ...form, payment_method: opt.val })} />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
                {accounts.length > 0 && (
                    <div className="form-group">
                        <label className="form-label">حساب الدفع (اختياري)</label>
                        <select className="form-input" value={form.payment_account_id} onChange={e => setForm({ ...form, payment_account_id: e.target.value })}>
                            <option value="">الحساب الافتراضي للطريقة المختارة</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label">ملاحظات</label>
                    <input type="text" className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '16px', marginTop: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>الراتب الأساسي</span>
                        <strong>{Number(form.base_salary || 0).toFixed(3)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)' }}>الخصومات</span>
                        <strong className="text-danger">- {Number(form.deductions || 0).toFixed(3)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 8, fontSize: '1.1rem' }}>
                        <span style={{ fontWeight: 600 }}>صافي الراتب</span>
                        <strong className="text-success">{net.toFixed(3)}</strong>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// ============ LEAVES TAB ============
function LeavesTab() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [filterEmp, setFilterEmp] = useState('');
    const [form, setForm] = useState({ employee_id: '', leave_type: 'سنوية', start_date: '', end_date: '', days: 0, reason: '', notes: '' });

    const load = async () => {
        const [emps, lvs] = await Promise.all([window.api.employees.getAll(), window.api.leaves.getAll()]);
        setEmployees(emps || []);
        setLeaves(lvs || []);
    };

    useEffect(() => { load(); }, []);

    const calcDays = (start, end) => {
        if (!start || !end) return 0;
        const diff = Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
        return diff > 0 ? diff : 0;
    };

    const onDates = (field, val) => {
        const nf = { ...form, [field]: val };
        nf.days = calcDays(nf.start_date, nf.end_date);
        setForm(nf);
    };

    const save = async () => {
        if (!form.employee_id || !form.start_date || !form.end_date) { setError('يرجى ملء جميع الحقول المطلوبة'); return; }
        setError('');
        const r = await window.api.leaves.create(form);
        if (r?.success) { setShowModal(false); load(); }
        else setError(r?.error || 'حدث خطأ');
    };

    const updateStatus = async (id, status) => {
        await window.api.leaves.updateStatus(id, status, user?.id);
        load();
    };

    const del = async (id) => {
        if (!confirm('حذف طلب الإجازة؟')) return;
        await window.api.leaves.delete(id);
        load();
    };

    const statusBadge = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
    const filtered = filterEmp ? leaves.filter(l => l.employee_id == filterEmp) : leaves;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <select className="form-input" style={{ width: 260 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                    <option value="">كل الموظفين</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ employee_id: '', leave_type: 'سنوية', start_date: '', end_date: '', days: 0, reason: '', notes: '' }); setShowModal(true); }}>
                    <Plus size={18} /> طلب إجازة
                </button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><Calendar size={48} /><h3>لا يوجد إجازات</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>الموظف</th><th>نوع الإجازة</th><th>من</th><th>إلى</th><th>الأيام</th><th>السبب</th><th>الحالة</th><th>إجراءات</th></tr>
                                </thead>
                                <tbody>
                                    {filtered.map(l => (
                                        <tr key={l.id}>
                                            <td>
                                                <div className="font-bold">{l.employee_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.department}</div>
                                            </td>
                                            <td>{l.leave_type}</td>
                                            <td>{l.start_date}</td>
                                            <td>{l.end_date}</td>
                                            <td><strong>{l.days}</strong> يوم</td>
                                            <td>{l.reason || '-'}</td>
                                            <td><span className={`badge ${statusBadge[l.status] || 'badge-warning'}`}>{LEAVE_STATUS[l.status] || l.status}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    {l.status === 'pending' && <>
                                                        <button className="btn btn-ghost btn-sm text-success" onClick={() => updateStatus(l.id, 'approved')} title="اعتماد"><Check size={16} /></button>
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => updateStatus(l.id, 'rejected')} title="رفض"><X size={16} /></button>
                                                    </>}
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(l.id)} title="حذف"><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="طلب إجازة"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={save}><Save size={16} /> حفظ</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-group">
                    <label className="form-label">الموظف *</label>
                    <select className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                        <option value="">اختر الموظف</option>
                        {employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">نوع الإجازة *</label>
                        <select className="form-input" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                            {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">عدد الأيام</label>
                        <input className="form-input" readOnly value={form.days ? `${form.days} يوم` : '---'} style={{ color: 'var(--primary)', fontWeight: 600 }} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">من تاريخ *</label>
                        <input type="date" className="form-input" value={form.start_date} onChange={e => onDates('start_date', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">إلى تاريخ *</label>
                        <input type="date" className="form-input" value={form.end_date} onChange={e => onDates('end_date', e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">السبب</label>
                    <input type="text" className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="سبب الإجازة" />
                </div>
                <div className="form-group">
                    <label className="form-label">ملاحظات</label>
                    <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
            </Modal>
        </div>
    );
}

// ============ DEDUCTIONS TAB ============
function DeductionsTab() {
    const [employees, setEmployees] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [filterEmp, setFilterEmp] = useState('');
    const [form, setForm] = useState({ employee_id: '', month: '', amount: '', reason: '' });

    const load = async () => {
        const [emps, deds] = await Promise.all([window.api.employees.getAll(), window.api.deductions.getAll()]);
        setEmployees(emps || []);
        setDeductions(deds || []);
    };

    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.employee_id || !form.month || !form.amount) { setError('يرجى ملء جميع الحقول'); return; }
        setError('');
        const r = await window.api.deductions.create({ ...form, amount: parseFloat(form.amount) });
        if (r?.success) { setShowModal(false); load(); }
        else setError(r?.error || 'حدث خطأ');
    };

    const del = async (id) => {
        if (!confirm('حذف الخصم؟')) return;
        await window.api.deductions.delete(id);
        load();
    };

    const filtered = filterEmp ? deductions.filter(d => d.employee_id == filterEmp) : deductions;
    const curMonth = new Date().toISOString().substring(0, 7);

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <select className="form-input" style={{ width: 260 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
                    <option value="">كل الموظفين</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ employee_id: '', month: curMonth, amount: '', reason: '' }); setShowModal(true); }}>
                    <Plus size={18} /> إضافة خصم
                </button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><AlertCircle size={48} /><h3>لا يوجد خصومات</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>الموظف</th><th>الشهر</th><th>المبلغ</th><th>السبب</th><th>التاريخ</th><th>إجراءات</th></tr>
                                </thead>
                                <tbody>
                                    {filtered.map(d => (
                                        <tr key={d.id}>
                                            <td className="font-bold">{d.employee_name}</td>
                                            <td>{d.month}</td>
                                            <td className="font-bold text-danger">{Number(d.amount).toFixed(3)}</td>
                                            <td>{d.reason || '-'}</td>
                                            <td>{d.created_at?.split('T')[0] || '-'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(d.id)} title="حذف"><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="إضافة خصم"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
                    <button className="btn btn-primary" onClick={save}><Save size={16} /> حفظ</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <div className="form-group">
                    <label className="form-label">الموظف *</label>
                    <select className="form-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                        <option value="">اختر الموظف</option>
                        {employees.filter(e => e.is_active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">الشهر *</label>
                        <input type="month" className="form-input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">المبلغ *</label>
                        <input type="number" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.000" step="0.001" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">السبب</label>
                    <input type="text" className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="مثال: غياب، تأخر، مخالفة..." />
                </div>
            </Modal>
        </div>
    );
}

// ============ MAIN HR PAGE ============
export default function HR() {
    const [activeTab, setActiveTab] = useState('employees');

    const tabContent = {
        employees: <EmployeesTab />,
        salaries: <SalariesTab />,
        leaves: <LeavesTab />,
        deductions: <DeductionsTab />,
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>إدارة شؤون الموظفين</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>إدارة الموظفين والرواتب والإجازات والخصومات</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
                                fontWeight: active ? 700 : 400,
                                color: active ? 'var(--primary)' : 'var(--text-muted)',
                                borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
                                marginBottom: -2, fontSize: '0.95rem', transition: 'all 0.2s'
                            }}>
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {tabContent[activeTab]}
        </div>
    );
}
