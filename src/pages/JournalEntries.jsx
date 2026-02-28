import React, { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, BookOpen, X } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';

function JournalEntries() {
    const { user } = useAuth();
    const [entries, setEntries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '', reference: '',
        lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }]
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [entriesData, accountsData] = await Promise.all([
                window.api.journal.getAll(),
                window.api.accounts.getAll()
            ]);
            setEntries(entriesData);
            setAccounts(accountsData.filter(a => a.can_post === 1));
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...formData.lines];
        newLines[index] = { ...newLines[index], [field]: value };
        // Auto-clear opposite field
        if (field === 'debit' && parseFloat(value) > 0) newLines[index].credit = 0;
        if (field === 'credit' && parseFloat(value) > 0) newLines[index].debit = 0;
        setFormData({ ...formData, lines: newLines });
    };

    const addLine = () => setFormData({ ...formData, lines: [...formData.lines, { account_id: '', debit: 0, credit: 0, description: '' }] });
    const removeLine = (index) => formData.lines.length > 2 && setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });

    const getTotals = () => {
        const debit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
        const credit = formData.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
        return { debit, credit, balanced: Math.abs(debit - credit) < 0.01 };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const totals = getTotals();
        if (!totals.balanced) { alert('القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع الدائن'); return; }
        try {
            await window.api.journal.create({
                date: formData.date, description: formData.description, reference: formData.reference,
                lines: formData.lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0)).map(l => ({
                    account_id: parseInt(l.account_id), debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, description: l.description
                }))
            });
            loadData();
            setShowModal(false);
        } catch (error) { console.error('Error:', error); }
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا القيد؟')) {
            await window.api.journal.delete(id);
            loadData();
        }
    };

    const viewEntry = (entry) => { setSelectedEntry(entry); setShowViewModal(true); };

    const openModal = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0], description: '', reference: '',
            lines: [{ account_id: '', debit: 0, credit: 0, description: '' }, { account_id: '', debit: 0, credit: 0, description: '' }]
        });
        setShowModal(true);
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', { minimumFractionDigits: 2 }).format(amount || 0);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const totals = getTotals();

    return (
        <div>
            <div className="page-header">
                <span style={{ color: 'var(--text-muted)' }}>إجمالي {entries.length} قيد</span>
                {user?.permissions?.journal_entries?.can_create && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> قيد جديد</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {entries.length === 0 ? (
                        <div className="empty-state"><BookOpen size={48} /><h3>لا توجد قيود يومية</h3></div>
                    ) : (
                        <table>
                            <thead><tr><th>رقم القيد</th><th>التاريخ</th><th>البيان</th><th>المدين</th><th>الدائن</th><th>الإجراءات</th></tr></thead>
                            <tbody>
                                {entries.map(entry => {
                                    const debit = entry.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;
                                    const credit = entry.lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;
                                    return (
                                        <tr key={entry.id}>
                                            <td className="font-bold">{entry.entry_number}</td>
                                            <td>{new Date(entry.date).toLocaleDateString('ar-EG')}</td>
                                            <td>{entry.description || '-'}</td>
                                            <td>{formatCurrency(debit)}</td>
                                            <td>{formatCurrency(credit)}</td>
                                            <td><div className="table-actions">
                                                {user?.permissions?.journal_entries?.can_view && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => viewEntry(entry)}><Eye size={16} /></button>
                                                )}
                                                {user?.permissions?.journal_entries?.can_delete && (
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(entry.id)}><Trash2 size={16} /></button>
                                                )}
                                            </div></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="قيد يومي جديد" size="lg" footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button><button className="btn btn-primary" onClick={handleSubmit} disabled={!totals.balanced}>حفظ</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">التاريخ</label><input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">المرجع</label><input type="text" className="form-input" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">البيان</label><input type="text" className="form-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>

                    <div className="flex justify-between items-center mb-2 mt-4"><h4>تفاصيل القيد</h4><button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={16} /> سطر</button></div>
                    <table>
                        <thead><tr><th>الحساب</th><th style={{ width: '120px' }}>مدين</th><th style={{ width: '120px' }}>دائن</th><th>بيان</th><th></th></tr></thead>
                        <tbody>
                            {formData.lines.map((line, i) => (
                                <tr key={i}>
                                    <td><select className="form-select" value={line.account_id} onChange={(e) => handleLineChange(i, 'account_id', e.target.value)}><option value="">اختر حساب</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}</select></td>
                                    <td><input type="number" className="form-input" value={line.debit} onChange={(e) => handleLineChange(i, 'debit', e.target.value)} step="0.01" /></td>
                                    <td><input type="number" className="form-input" value={line.credit} onChange={(e) => handleLineChange(i, 'credit', e.target.value)} step="0.01" /></td>
                                    <td><input type="text" className="form-input" value={line.description} onChange={(e) => handleLineChange(i, 'description', e.target.value)} /></td>
                                    <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeLine(i)}><X size={16} /></button></td>
                                </tr>
                            ))}
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <td className="font-bold">الإجمالي</td>
                                <td className="font-bold">{formatCurrency(totals.debit)}</td>
                                <td className="font-bold">{formatCurrency(totals.credit)}</td>
                                <td colSpan="2"><span className={`badge ${totals.balanced ? 'badge-success' : 'badge-danger'}`}>{totals.balanced ? 'متوازن ✓' : 'غير متوازن ✗'}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </form>
            </Modal>

            <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`قيد ${selectedEntry?.entry_number}`} size="lg">
                {selectedEntry && (
                    <div>
                        <p className="mb-4"><strong>التاريخ:</strong> {new Date(selectedEntry.date).toLocaleDateString('ar-EG')} | <strong>البيان:</strong> {selectedEntry.description || '-'}</p>
                        <table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>
                            {selectedEntry.lines?.map((line, i) => <tr key={i}><td>{line.account_code} - {line.account_name}</td><td>{formatCurrency(line.debit)}</td><td>{formatCurrency(line.credit)}</td></tr>)}
                        </tbody></table>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default JournalEntries;
