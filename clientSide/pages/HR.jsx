import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import Modal from '../components/Modal';
import {
    Users, Plus, Edit2, Trash2, DollarSign,
    Calendar, AlertCircle, Check, X, Save as SaveIcon, Search, Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';
import SearchableSelect from '../components/SearchableSelect';

const getTabs = (t) => [
    { id: 'employees', label: t('hr_employees') || 'Employees', icon: Users },
    { id: 'salaries', label: t('hr_salaries') || 'Salaries', icon: DollarSign },
    { id: 'leaves', label: t('hr_leaves') || 'Leaves', icon: Calendar },
    { id: 'deductions', label: t('hr_deductions') || 'Deductions', icon: AlertCircle },
];

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid', 'other'];
const getLeaveTypeLabel = (val, t) => {
    const map = { annual: t('hr_leave_annual') || 'Annual', sick: t('hr_leave_sick') || 'Sick', emergency: t('hr_leave_emergency') || 'Emergency', unpaid: t('hr_leave_unpaid') || 'Unpaid', other: t('hr_leave_other') || 'Other' };
    return map[val] || val;
};
const getLeaveStatusLabel = (val, t) => {
    const map = { pending: t('hr_status_pending') || 'Pending', approved: t('hr_status_approved') || 'Approved', rejected: t('hr_status_rejected') || 'Rejected' };
    return map[val] || val;
};
const getDeptList = (t) => [
    { val: 'management', label: t('dept_management') || 'Management' },
    { val: 'accounting', label: t('dept_accounting') || 'Accounting' },
    { val: 'sales', label: t('dept_sales') || 'Sales' },
    { val: 'warehouse', label: t('dept_warehouse') || 'Warehouse' },
    { val: 'production', label: t('dept_production') || 'Production' },
    { val: 'hr', label: t('dept_hr') || 'HR' },
    { val: 'it', label: t('dept_it') || 'IT' },
    { val: 'other', label: t('dept_other') || 'Other' }
];

// ============ EMPLOYEES TAB ============
const EmployeesTab = ({ t }) => {
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

    useShortcuts({
        Save: () => {
            if (showModal) {
                const btn = document.querySelector('#employee-form button[type="submit"]') || document.querySelector('button[form="employee-form"]');
                if (btn) btn.click();
                else save();
            }
        },
        New: () => {
            if (!showModal) openNew();
        },
        Escape: () => {
            if (showModal) setShowModal(false);
        }
    });

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
        if (!form.name?.trim()) { setError(t('hr_emp_name_required') || 'Employee name is required'); return; }
        setError('');
        const result = editing
            ? await window.api.employees.update({ ...form, id: editing.id })
            : await window.api.employees.create(form);
        if (result?.success) {
            setShowModal(false);
            toast.success(editing ? t('hr_emp_updated') || 'Employee data updated' : t('hr_emp_added') || 'Employee added and payroll account created automatically');
            load();
        } else {
            toast.error(result?.error || t('errorOccurred') || 'An error occurred');
        }
    };

    const del = async (id) => {
        if (!confirm(t('hr_emp_delete_confirm') || 'Are you sure you want to delete this employee?')) return;
        try {
            const r = await window.api.employees.delete(id);
            if (r?.success) {
                toast.success(t('hr_emp_deleted') || 'Employee deleted successfully');
                load();
            } else {
                toast.error(r?.error || t('errorOccurred') || 'An error occurred');
            }
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error(t('error_deleting') || 'Error occurred while deleting');
        }
    };

    const filtered = employees.filter(e =>
        (e.name || '').includes(search) ||
        (e.department || '').includes(search) ||
        (e.job_title || '').includes(search)
    );

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" placeholder={t('hr_search_emp') || 'Search for employee...'}
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{ paddingRight: 40, width: 280 }} />
                    <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <button className="btn btn-primary" onClick={openNew}>
                    <Plus size={18} /> {t('hr_add_emp') || 'Add Employee'}
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} />
                            <h3>{t('hr_no_emps') || 'No Employees'}</h3>
                            <p>{t('hr_add_emp_to_start') || 'Add a new employee to get started'}</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('code') || 'Code'}</th><th>{t('name') || 'Name'}</th><th>{t('job_title') || 'Job Title'}</th><th>{t('department') || 'Department'}</th>
                                        <th>{t('base_salary') || 'Base Salary'}</th><th>{t('payroll_account') || 'Payroll Account'}</th><th>{t('status') || 'Status'}</th><th>{t('actions') || 'Actions'}</th>
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
                                            <td><span className={`badge ${emp.is_active ? 'badge-success' : 'badge-danger'}`}>{emp.is_active ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(emp)} title={t("edit") || "Edit"}><Edit2 size={16} /></button>
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(emp.id)} title={t("delete") || "Delete"}><Trash2 size={16} /></button>
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
                title={editing ? (t('hr_edit_emp') || 'Edit Employee') : (t('hr_new_emp') || 'New Employee')} size="lg"
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button>
                    <button type="submit" form="employee-form" className="btn btn-primary"><SaveIcon size={16} /> {editing ? (t('save_changes') || 'Save Changes') : (t('add') || 'Add')} (Ctrl+S)</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form id="employee-form" onSubmit={e => { e.preventDefault(); save(); }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('full_name') || 'Full Name'} *</label>
                            <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t("enter_emp_name") || "Enter employee name"} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('job_title') || 'Job Title'}</label>
                            <input type="text" className="form-input" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder={t("job_title_example") || "e.g., Accountant, Sales Manager"} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('department') || 'Department'}</label>
                            <select className="form-input" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                <option value="">{t('select_department') || 'Select Department'}</option>
                                {getDeptList(t).map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('hire_date') || 'Hire Date'}</label>
                            <input type="date" className="form-input" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('base_salary') || 'Base Salary'}</label>
                            <input type="number" className="form-input" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0.000" step="0.250" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('phone') || 'Phone'}</label>
                            <input type="text" className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g.: 9XXXXXXXX" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('email') || 'Email'}</label>
                            <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('national_id') || 'National ID'}</label>
                            <input type="text" className="form-input" value={form.national_id} onChange={e => setForm({ ...form, national_id: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('bank_account_iban') || 'Bank Account (IBAN)'}</label>
                        <input type="text" className="form-input" value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })} placeholder="KW..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('address') || 'Address'}</label>
                        <input type="text" className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('notes') || 'Notes'}</label>
                        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    {editing && (
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })} />
                                {t('employee_active') || 'Employee Active'}
                            </label>
                        </div>
                    )}
                </form>
                {!editing && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                        {t('hr_account_creation_note') || 'An accounting account will be automatically created under the payroll account upon addition'}
                    </p>
                )}
            </Modal>
        </div>
    );
}

// ============ SALARIES TAB ============
function SalariesTab({ t }) {
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

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#salary-form button[type="submit"]') || document.querySelector('button[form="salary-form"]');
                if (btn) btn.click();
                else pay();
            }
        },
        New: () => {
            if (!showModal) openPay();
        },
        Escape: () => {
            if (showModal) setShowModal(false);
        }
    });

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
        if (!form.employee_id || !form.month) { setError(t('hr_select_emp_month') || 'Select employee and month'); return; }
        setError('');
        const result = await window.api.salaries.pay({
            ...form,
            base_salary: parseFloat(form.base_salary) || 0,
            deductions: parseFloat(form.deductions) || 0,
            created_by: user?.id
        });
        if (result?.success) {
            setShowModal(false);
            toast.success(`✅ ${t('hr_salary_paid') || 'Salary Paid'} | ${t('number') || 'No.'}: ${result.payment_number} | ${t('net') || 'Net'}: ${Number(result.net_salary).toFixed(3)}`);
            load();
        } else {
            toast.error(result?.error || t('errorOccurred') || 'An error occurred');
        }
    };

    const del = async (id) => {
        if (!confirm(t('hr_salary_delete_confirm') || 'Delete salary voucher? Accounting entry will be reversed.')) return;
        try {
            const r = await window.api.salaries.delete(id);
            if (r?.success) {
                toast.success(t('hr_salary_deleted') || 'Salary voucher deleted successfully');
                load();
            } else {
                toast.error(r?.error || t('errorOccurred') || 'An error occurred');
            }
        } catch (error) {
            console.error('Error deleting salary payment:', error);
            toast.error(t('error_deleting') || 'Error occurred while deleting');
        }
    };

    const net = parseFloat(form.base_salary || 0) - parseFloat(form.deductions || 0);

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div />
                <button className="btn btn-primary" onClick={openPay}><DollarSign size={18} /> {t('hr_pay_salary') || 'Pay Salary'}</button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {salaries.length === 0 ? (
                        <div className="empty-state"><DollarSign size={48} /><h3>{t('hr_no_salary_payments') || 'No Salary Payments'}</h3><p>{t('hr_click_pay_salary') || 'Click "Pay Salary" to add the first payment'}</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('voucher_number') || 'Voucher No.'}</th><th>{t('employee') || 'Employee'}</th><th>{t('month') || 'Month'}</th>
                                        <th>{t('base_salary') || 'Base Salary'}</th><th>{t('deductions') || 'Deductions'}</th><th>{t('net_salary') || 'Net Salary'}</th>
                                        <th>{t('payment_method') || 'Payment'}</th><th>{t('journal_entry') || 'Entry'}</th><th>{t('actions') || 'Actions'}</th>
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
                                            <td>{s.payment_method === 'cash' ? '🏦 ' + (t('cash') || 'Cash') : '🏛️ ' + (t('bank') || 'Bank')}</td>
                                            <td>{s.journal_entry_id ? <span className="badge badge-success">{t('linked') || 'Linked'}</span> : '-'}</td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(s.id)} title={t("delete") || "Delete"}><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('hr_pay_emp_salary') || 'Pay Employee Salary'}
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button>
                    <button type="submit" form="salary-form" className="btn btn-primary"><DollarSign size={16} /> {t('pay_salary_save') || 'Pay Salary (Ctrl+S)'}</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form id="salary-form" onSubmit={(e) => { e.preventDefault(); pay(); }}>
                    <div className="form-group">
                        <label className="form-label">{t('employee') || 'Employee'} *</label>
                        <SearchableSelect
                            options={employees.filter(e => e.is_active).map(e => ({
                                value: e.id,
                                label: `${e.name} - ${e.job_title || (t('employee') || 'Employee')}`
                            }))}
                            value={form.employee_id}
                            onChange={(val) => onEmployeeChange(val)}
                            placeholder={t('select_employee') || 'Select Employee'}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('month') || 'Month'} *</label>
                            <input type="month" className="form-input" value={form.month} onChange={e => onMonthChange(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('payment_date') || 'Payment Date'}</label>
                            <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('base_salary') || 'Base Salary'}</label>
                            <input type="number" className="form-input" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} placeholder="0.000" step="0.250" required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">
                                {t('deductions') || 'Deductions'}
                                {form._monthDeductions?.length > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginRight: 8 }}>({form._monthDeductions.length} {t('hr_auto_deduction') || 'Auto Deduction'})</span>}
                            </label>
                            <input type="number" className="form-input" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} placeholder="0.000" step="0.250" />
                            {form._monthDeductions?.length > 0 && (
                                <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: '0.8rem' }}>
                                    {form._monthDeductions.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                            <span>{d.reason || t('deduction') || 'Deduction'}</span>
                                            <span className="text-danger">- {Number(d.amount).toFixed(3)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('payment_method') || 'Payment Method'} *</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[{ val: 'cash', label: '🏦 ' + (t('cash') || 'Cash') }, { val: 'bank', label: '🏛️ ' + (t('bank') || 'Bank') }].map(opt => (
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
                            <label className="form-label">{t('payment_account_optional') || 'Payment Account (Optional)'}</label>
                            <select className="form-input" value={form.payment_account_id} onChange={e => setForm({ ...form, payment_account_id: e.target.value })}>
                                <option value="">{t('default_account_for_method') || 'Default account for selected method'}</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label className="form-label">{t('notes') || 'Notes'}</label>
                        <input type="text" className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '16px', marginTop: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('base_salary') || 'Base Salary'}</span>
                            <strong>{Number(form.base_salary || 0).toFixed(3)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{t('deductions') || 'Deductions'}</span>
                            <strong className="text-danger">- {Number(form.deductions || 0).toFixed(3)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 8, fontSize: '1.1rem' }}>
                            <span style={{ fontWeight: 600 }}>{t('net_salary') || 'Net Salary'}</span>
                            <strong className="text-success">{net.toFixed(3)}</strong>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ============ LEAVES TAB ============
const LeavesTab = ({ t }) => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [filterEmp, setFilterEmp] = useState('');
    const [form, setForm] = useState({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', days: 0, reason: '', notes: '' });

    const load = async () => {
        const [emps, lvs] = await Promise.all([window.api.employees.getAll(), window.api.leaves.getAll()]);
        setEmployees(emps || []);
        setLeaves(lvs || []);
    };

    // Calculate daily rate from monthly salary (assume 30 days/month)
    const dailyRate = (empId) => {
        const emp = employees.find(e => e.id == empId);
        return emp ? (parseFloat(emp.base_salary || 0) / 30) : 0;
    };

    const unpaidCost = (empId, days) => {
        return dailyRate(empId) * (days || 0);
    };

    useShortcuts({
        Save: () => {
            if (showModal) {
                const btn = document.querySelector('#leave-form button[type="submit"]') || document.querySelector('button[form="leave-form"]');
                if (btn) btn.click();
                else save();
            }
        },
        New: () => {
            if (!showModal) { setError(''); setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', days: 0, reason: '', notes: '' }); setShowModal(true); }
        },
        Escape: () => {
            if (showModal) setShowModal(false);
        }
    });

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
        if (!form.employee_id || !form.start_date || !form.end_date) { toast.error(t('fill_required_fields') || 'Please fill out all required fields'); return; }
        setError('');
        try {
            const r = await window.api.leaves.create(form);
            if (r?.success) {
                toast.success(t('hr_leave_requested') || 'Leave request submitted successfully');
                setShowModal(false);
                load();
            } else {
                toast.error(r?.error || t('errorOccurred') || 'An error occurred');
            }
        } catch (error) {
            console.error('Error creating leave:', error);
            toast.error(t('hr_leave_save_error') || 'Error saving leave request');
        }
    };

    const updateStatus = async (id, status) => {
        await window.api.leaves.updateStatus(id, status, user?.id);

        // If approving an unpaid leave, auto-create a deduction
        if (status === 'approved') {
            const leave = leaves.find(l => l.id === id);
            if (leave && leave.leave_type === 'unpaid' && leave.days > 0) {
                const emp = employees.find(e => e.id == leave.employee_id);
                if (emp) {
                    const dailyCost = parseFloat(emp.base_salary || 0) / 30;
                    const deductionAmount = dailyCost * leave.days;
                    if (deductionAmount > 0) {
                        const month = leave.start_date?.substring(0, 7);
                        await window.api.deductions.create({
                            employee_id: leave.employee_id,
                            month,
                            amount: parseFloat(deductionAmount.toFixed(3)),
                            reason: `Unpaid leave - ${leave.days} days (${leave.start_date} to ${leave.end_date})`
                        });
                    }
                }
            }
        }
        load();
        toast.success(`${t('hr_leave_status_changed') || 'Leave status changed to'} ${getLeaveStatusLabel(status, t)}`);
    };

    const del = async (id) => {
        if (!confirm(t('hr_leave_delete_confirm') || 'Delete leave request?')) return;
        try {
            await window.api.leaves.delete(id);
            toast.success(t('hr_leave_deleted') || 'Leave request deleted successfully');
            load();
        } catch (error) {
            console.error('Error deleting leave:', error);
            toast.error(t('hr_leave_delete_error') || 'Error deleting leave request');
        }
    };

    const statusBadge = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
    const filtered = filterEmp ? leaves.filter(l => l.employee_id == filterEmp) : leaves;

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div style={{ width: 260 }}>
                    <SearchableSelect
                        options={employees.map(e => ({ value: e.id, label: e.name }))}
                        value={filterEmp}
                        onChange={(val) => setFilterEmp(val)}
                        placeholder={t('all_employees') || 'All Employees'}
                    />
                </div>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ employee_id: '', leave_type: 'annual', start_date: '', end_date: '', days: 0, reason: '', notes: '' }); setShowModal(true); }}>
                    <Plus size={18} /> {t('hr_request_leave') || 'Request Leave'}
                </button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><Calendar size={48} /><h3>{t('hr_no_leaves') || 'No Leaves'}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>{t('employee') || 'Employee'}</th><th>{t('leave_type') || 'Leave Type'}</th><th>{t('from') || 'From'}</th><th>{t('to') || 'To'}</th><th>{t('days') || 'Days'}</th><th>{t('reason') || 'Reason'}</th><th>{t('status') || 'Status'}</th><th>{t('actions') || 'Actions'}</th></tr>
                                </thead>
                                <tbody>
                                    {filtered.map(l => (
                                        <tr key={l.id}>
                                            <td>
                                                <div className="font-bold">{l.employee_name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.department}</div>
                                            </td>
                                            <td>{getLeaveTypeLabel(l.leave_type, t)}</td>
                                            <td>{l.start_date}</td>
                                            <td>{l.end_date}</td>
                                            <td><strong>{l.days}</strong> {t('day') || 'day'}</td>
                                            <td>{l.reason || '-'}</td>
                                            <td><span className={`badge ${statusBadge[l.status] || 'badge-warning'}`}>{getLeaveStatusLabel(l.status, t)}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    {l.status === 'pending' && <>
                                                        <button className="btn btn-ghost btn-sm text-success" onClick={() => updateStatus(l.id, 'approved')} title={t("approve") || "Approve"}><Check size={16} /></button>
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => updateStatus(l.id, 'rejected')} title={t("reject") || "Reject"}><X size={16} /></button>
                                                    </>}
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(l.id)} title={t("delete") || "Delete"}><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('hr_request_leave') || 'Request Leave'}
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button>
                    <button type="submit" form="leave-form" className="btn btn-primary"><SaveIcon size={16} /> {t('save_ctrl_s') || 'Save (Ctrl+S)'}</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form id="leave-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
                    <div className="form-group">
                        <SearchableSelect
                            options={employees.filter(e => e.is_active).map(e => ({ value: e.id, label: e.name }))}
                            value={form.employee_id}
                            onChange={(val) => setForm({ ...form, employee_id: val })}
                            placeholder={t('select_employee') || 'Select Employee'}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('leave_type') || 'Leave Type'} *</label>
                            <select className="form-input" value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}>
                                {LEAVE_TYPES.map(type => <option key={type} value={type}>{getLeaveTypeLabel(type, t)}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('number_of_days') || 'Number of Days'}</label>
                            <input className="form-input" readOnly value={form.days ? `${form.days} ${t('day') || 'day'}` : '---'} style={{ color: 'var(--primary)', fontWeight: 600 }} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('from_date') || 'From Date'} *</label>
                            <input type="date" className="form-input" value={form.start_date} onChange={e => onDates('start_date', e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('to_date') || 'To Date'} *</label>
                            <input type="date" className="form-input" value={form.end_date} onChange={e => onDates('end_date', e.target.value)} required />
                        </div>
                    </div>

                    {/* Unpaid leave cost warning */}
                    {form.leave_type === 'unpaid' && form.employee_id && form.days > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '12px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--danger, #ef4444)', marginBottom: 4 }}>{t('hr_unpaid_leave_cost') || '⚠️ Unpaid Leave Cost'}</div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                                {t('daily_rate') || 'Daily Rate'}: <strong>{(dailyRate(form.employee_id)).toFixed(3)}</strong> {t('currency_kd') || 'KD'} &nbsp;×&nbsp; {form.days} {t('day') || 'day'}
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--danger, #ef4444)', marginTop: 4 }}>
                                {t('expected_deduction') || 'Expected Deduction'}: {unpaidCost(form.employee_id, form.days).toFixed(3)} {t('currency_kd') || 'KD'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{t('hr_deduction_auto_add_note') || 'A deduction will be automatically added upon approval'}</div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">{t('reason') || 'Reason'}</label>
                        <input type="text" className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder={t("leave_reason") || "Leave Reason"} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('notes') || 'Notes'}</label>
                        <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ============ DEDUCTIONS TAB ============
const DeductionsTab = ({ t }) => {
    const { user } = useAuth();
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

    useShortcuts({
        Save: () => {
            if (showModal) {
                const btn = document.querySelector('#deduction-form button[type="submit"]') || document.querySelector('button[form="deduction-form"]');
                if (btn) btn.click();
                else save();
            }
        },
        New: () => {
            if (!showModal) { setError(''); setForm({ employee_id: '', month: curMonth, amount: '', reason: '' }); setShowModal(true); }
        },
        Escape: () => {
            if (showModal) setShowModal(false);
        }
    });

    useEffect(() => { load(); }, []);

    const save = async () => {
        if (!form.employee_id || !form.month || !form.amount) { setError(t('fill_all_fields') || 'Please fill in all fields'); return; }
        setError('');
        try {
            const r = await window.api.deductions.create({ ...form, amount: parseFloat(form.amount) });
            if (r?.success) {
                toast.success(t('hr_deduction_added') || 'Deduction added successfully');
                setShowModal(false);
                load();
            } else {
                toast.error(r?.error || t('errorOccurred') || 'An error occurred');
            }
        } catch (error) {
            console.error('Error creating deduction:', error);
            toast.error(t('hr_deduction_save_error') || 'Error saving deduction');
        }
    };

    const del = async (id) => {
        if (!confirm(t('hr_deduction_delete_confirm') || 'Delete deduction?')) return;
        try {
            await window.api.deductions.delete(id);
            toast.success(t('hr_deduction_deleted') || 'Deduction deleted successfully');
            load();
        } catch (error) {
            console.error('Error deleting deduction:', error);
            toast.error(t('hr_deduction_delete_error') || 'Error deleting deduction');
        }
    };

    const filtered = filterEmp ? deductions.filter(d => d.employee_id == filterEmp) : deductions;
    const curMonth = new Date().toISOString().substring(0, 7);

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div style={{ width: 260 }}>
                    <SearchableSelect
                        options={employees.map(e => ({ value: e.id, label: e.name }))}
                        value={filterEmp}
                        onChange={(val) => setFilterEmp(val)}
                        placeholder={t('all_employees') || 'All Employees'}
                    />
                </div>
                <button className="btn btn-primary" onClick={() => { setError(''); setForm({ employee_id: '', month: curMonth, amount: '', reason: '' }); setShowModal(true); }}>
                    <Plus size={18} /> {t('hr_add_deduction') || 'Add Deduction'}
                </button>
            </div>
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filtered.length === 0 ? (
                        <div className="empty-state"><AlertCircle size={48} /><h3>{t('hr_no_deductions') || 'No Deductions'}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>{t('employee') || 'Employee'}</th><th>{t('month') || 'Month'}</th><th>{t('amount') || 'Amount'}</th><th>{t('reason') || 'Reason'}</th><th>{t('date') || 'Date'}</th><th>{t('actions') || 'Actions'}</th></tr>
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
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => del(d.id)} title={t("delete") || "Delete"}><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('add_deduction') || 'Add Deduction'}
                footer={<>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button>
                    <button type="submit" form="deduction-form" className="btn btn-primary"><SaveIcon size={16} /> {t('save_ctrl_s') || 'Save (Ctrl+S)'}</button>
                </>}>
                {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
                <form id="deduction-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
                    <div className="form-group">
                        <SearchableSelect
                            options={employees.filter(e => e.is_active).map(e => ({ value: e.id, label: e.name }))}
                            value={form.employee_id}
                            onChange={(val) => setForm({ ...form, employee_id: val })}
                            placeholder={t('select_employee') || 'Select Employee'}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('month') || 'Month'} *</label>
                            <input type="month" className="form-input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('deduction_amount') || 'Deduction Amount'} *</label>
                            <input type="number" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.000" step="0.250" min="0.001" required />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('deduction_reason') || 'Deduction Reason'}</label>
                        <input type="text" className="form-input" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder={t("deduction_reason_example") || "e.g., Unexcused absence, Loan..."} />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ============ RENT TAB ============
const RentTab = ({ t }) => {
    const { user } = useAuth();
    const [payments, setPayments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({
        month: new Date().toISOString().slice(0, 7),
        amount: '', description: '', payment_method: 'cash',
        payment_account_id: '', notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const load = async () => {
        try {
            const [data, accs] = await Promise.all([
                window.api.rent.getAll(),
                window.api.accounts.getBankAccounts()
            ]);
            setPayments(data || []);
            setAccounts(accs || []);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const payRent = async (e) => {
        e.preventDefault();
        if (!form.amount || parseFloat(form.amount) <= 0) { toast.error(t('hr_rent_amount_required') || 'Enter a valid amount'); return; }
        if (!form.month) { toast.error(t('hr_rent_month_required') || 'Select a month'); return; }
        const r = await window.api.rent.pay({
            ...form,
            created_by: user?.id
        });
        if (r.success) {
            toast.success(t('hr_rent_paid_success') || 'Rent paid successfully');
            setShowModal(false);
            setForm({ month: new Date().toISOString().slice(0, 7), amount: '', description: '', payment_method: 'cash', payment_account_id: '', notes: '', date: new Date().toISOString().split('T')[0] });
            load();
        } else {
            toast.error(r.error || t('errorOccurred'));
        }
    };

    const deletePayment = async (id) => {
        if (!confirm(t('hr_rent_delete_confirm') || 'Delete this rent payment?')) return;
        const r = await window.api.rent.delete(id);
        if (r.success) { toast.success(t('deleted_success') || 'Deleted'); load(); }
        else toast.error(r.error || t('errorOccurred'));
    };

    const totalRent = payments.reduce((s, p) => s + (p.amount || 0), 0);

    const inpStyle = {
        width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
        borderRadius: 10, fontSize: '.9rem', fontFamily: 'inherit',
        background: 'var(--surface)', color: 'var(--text-primary)', outline: 'none'
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#6366f118', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={20} color="#6366f1" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#6366f1' }}>{payments.length}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('hr_rent_payments_count') || 'Payments'}</div>
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ef444418', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={20} color="#ef4444" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ef4444' }}>{totalRent.toFixed(3)}</div>
                            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>{t('hr_rent_total') || 'Total Rent'}</div>
                        </div>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={18} /> {t('hr_rent_pay') || 'Pay Rent'}
                </button>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            {[t('hr_rent_number') || '#', t('hr_salary_month') || 'Month', t('hr_rent_description') || 'Description', t('total') || 'Amount', t('hr_salary_method') || 'Method', t('date') || 'Date', t('actions') || 'Actions'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '.82rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 && (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('hr_rent_no_payments') || 'No rent payments yet'}</td></tr>
                        )}
                        {payments.map((p, i) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)' }}>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem', fontWeight: 600, color: 'var(--primary)' }}>{p.payment_number}</td>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem' }}>{p.month}</td>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem' }}>{p.description}</td>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem', fontWeight: 700, color: '#ef4444' }}>{(p.amount || 0).toFixed(3)}</td>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600, background: p.payment_method === 'bank' ? '#3b82f618' : '#10b98118', color: p.payment_method === 'bank' ? '#3b82f6' : '#10b981' }}>
                                        {p.payment_method === 'bank' ? (t('hr_bank') || 'Bank') : (t('hr_cash') || 'Cash')}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--text-muted)' }}>{p.created_at?.split('T')[0] || p.created_at?.split(' ')[0]}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <button onClick={() => deletePayment(p.id)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,.1)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('hr_rent_pay') || 'Pay Rent'} size="md">
                <form onSubmit={payRent}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('hr_salary_month') || 'Month'} *</label>
                            <input type="month" value={form.month} onChange={e => setForm(f => ({ ...f, month: e.target.value }))} style={inpStyle} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('total') || 'Amount'} *</label>
                            <input type="number" step="0.001" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inpStyle} required placeholder="0.000" />
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('hr_rent_description') || 'Description'}</label>
                        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inpStyle} placeholder={t('hr_rent_desc_placeholder') || 'e.g. Office rent, Store rent...'} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('hr_salary_method') || 'Payment Method'}</label>
                            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={inpStyle}>
                                <option value="cash">{t('hr_cash') || 'Cash'}</option>
                                <option value="bank">{t('hr_bank') || 'Bank'}</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('date') || 'Date'}</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inpStyle} />
                        </div>
                    </div>
                    {form.payment_method === 'bank' && accounts.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('hr_salary_account') || 'Payment Account'}</label>
                            <select value={form.payment_account_id} onChange={e => setForm(f => ({ ...f, payment_account_id: e.target.value }))} style={inpStyle}>
                                <option value="">{t('hr_auto_select') || 'Auto select'}</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                            </select>
                        </div>
                    )}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, fontSize: '.875rem' }}>{t('notes') || 'Notes'}</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inpStyle, minHeight: 60, resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'}</button>
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <DollarSign size={16} /> {t('hr_rent_pay') || 'Pay Rent'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

// ============ MAIN HR PAGE ============
export default function HR() {
    const { t } = useAuth();
    const [activeTab, setActiveTab] = useState('employees');

    const tabContent = {
        employees: <EmployeesTab t={t} />,
        salaries: <SalariesTab t={t} />,
        leaves: <LeavesTab t={t} />,
        deductions: <DeductionsTab t={t} />,
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{t('hr_management') || 'HR Management'}</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{t('hr_management_desc') || 'Manage employees, salaries, leaves, and deductions'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
                {getTabs(t).map(tab => {
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
