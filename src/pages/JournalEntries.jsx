import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Trash2, BookOpen, X } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function JournalEntries() {
    const { t } = useAuth();
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

    const accountOptions = useMemo(() => {
        return accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>);
    }, [accounts]);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#journal-entry-form button[type="submit"]') || document.querySelector('button[form="journal-entry-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.journal_entries?.can_create) openModal();
        },
        Escape: () => {
            if (showModal) setShowModal(false);
            if (showViewModal) setShowViewModal(false);
        }
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
        if (!totals.balanced) { toast.error(t('entry_unbalanced') || 'Entry unbalanced! Debit must equal Credit'); return; }
        try {
            await window.api.journal.create({
                date: formData.date, description: formData.description, reference: formData.reference,
                lines: formData.lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0)).map(l => ({
                    account_id: parseInt(l.account_id), debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0, description: l.description
                }))
            });
            toast.success(t('entry_saved') || 'Entry saved successfully');
            loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Error:', error);
            toast.error(t('error_saving_entry') || 'Error saving entry');
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('confirm_delete_entry') || 'Are you sure you want to delete this entry?')) {
            try {
                await window.api.journal.delete(id);
                toast.success(t('entry_deleted') || 'Entry deleted successfully');
                loadData();
            } catch (error) {
                console.error('Error deleting journal entry:', error);
                toast.error(t('error_deleting_entry') || 'Error deleting entry');
            }
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

    const formatCurrency = (amount) => new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const totals = getTotals();

    return (
        <div>
            <div className="page-header">
                <span style={{ color: 'var(--text-muted)' }}>{t('total')} {entries.length} {t('entries_count') || 'entries'}</span>
                {user?.permissions?.journal_entries?.can_create && (
                    <button className="btn btn-primary" onClick={openModal}><Plus size={18} /> {t('new_entry') || 'New Entry'}</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {entries.length === 0 ? (
                        <div className="empty-state"><BookOpen size={48} /><h3>{t('no_journal_entries') || 'No Journal Entries'}</h3></div>
                    ) : (
                        <table>
                            <thead><tr><th>{t('entry_number') || 'Entry No.'}</th><th>{t('date') || 'Date'}</th><th>{t('description') || 'Description'}</th><th>{t('acc_debit') || 'Debit'}</th><th>{t('acc_credit') || 'Credit'}</th><th>{t('actions') || 'Actions'}</th></tr></thead>
                            <tbody>
                                {entries.map(entry => {
                                    const debit = entry.lines?.reduce((sum, l) => sum + (l.debit || 0), 0) || 0;
                                    const credit = entry.lines?.reduce((sum, l) => sum + (l.credit || 0), 0) || 0;
                                    return (
                                        <tr key={entry.id}>
                                            <td className="font-bold">{entry.entry_number}</td>
                                            <td>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
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

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('new_journal_entry') || 'New Journal Entry'} size="lg" footer={<><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button><button type="submit" form="journal-entry-form" className="btn btn-primary" disabled={!totals.balanced}>{t('save') || 'Save'} (Ctrl+S)</button></>}>
                <form id="journal-entry-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">{t('date') || 'Date'}</label><input type="date" className="form-input" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">{t('reference') || 'Reference'}</label><input type="text" className="form-input" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">{t('description') || 'Description'}</label><input type="text" className="form-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>

                    <div className="flex justify-between items-center mb-2 mt-4"><h4>{t('entry_details') || 'Entry Details'}</h4><button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={16} /> {t('line') || 'Line'}</button></div>
                    <table>
                        <thead><tr><th>{t('account') || 'Account'}</th><th style={{ width: '120px' }}>{t('acc_debit') || 'Debit'}</th><th style={{ width: '120px' }}>{t('acc_credit') || 'Credit'}</th><th>{t('description') || 'Description'}</th><th></th></tr></thead>
                        <tbody>
                            {formData.lines.map((line, i) => (
                                <tr key={i}>
                                    <td><select className="form-select" value={line.account_id} onChange={(e) => handleLineChange(i, 'account_id', e.target.value)}><option value="">{t('select_account') || 'Select Account'}</option>{accountOptions}</select></td>
                                    <td><input type="number" className="form-input" value={line.debit} onChange={(e) => handleLineChange(i, 'debit', e.target.value)} step="0.250" /></td>
                                    <td><input type="number" className="form-input" value={line.credit} onChange={(e) => handleLineChange(i, 'credit', e.target.value)} step="0.250" /></td>
                                    <td><input type="text" className="form-input" value={line.description} onChange={(e) => handleLineChange(i, 'description', e.target.value)} /></td>
                                    <td><button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => removeLine(i)}><X size={16} /></button></td>
                                </tr>
                            ))}
                            <tr style={{ background: 'var(--bg-secondary)' }}>
                                <td className="font-bold">{t('total') || 'Total'}</td>
                                <td className="font-bold">{formatCurrency(totals.debit)}</td>
                                <td className="font-bold">{formatCurrency(totals.credit)}</td>
                                <td colSpan="2"><span className={`badge ${totals.balanced ? 'badge-success' : 'badge-danger'}`}>{totals.balanced ? (t('balanced') || 'Balanced ✓') : (t('unbalanced') || 'Unbalanced ✗')}</span></td>
                            </tr>
                        </tbody>
                    </table>
                </form>
            </Modal>

            <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title={`${t('journal_entry') || 'Journal Entry'} ${selectedEntry?.entry_number}`} size="lg">
                {selectedEntry && (
                    <div>
                        <p className="mb-4"><strong>{t('date') || 'Date'}:</strong> {new Date(selectedEntry.date).toLocaleDateString('en-GB')} | <strong>{t('description') || 'Description'}:</strong> {selectedEntry.description || '-'}</p>
                        <table><thead><tr><th>{t('account') || 'Account'}</th><th>{t('acc_debit') || 'Debit'}</th><th>{t('acc_credit') || 'Credit'}</th></tr></thead><tbody>
                            {selectedEntry.lines?.map((line, i) => <tr key={i}><td>{line.account_code} - {line.account_name}</td><td>{formatCurrency(line.debit)}</td><td>{formatCurrency(line.credit)}</td></tr>)}
                        </tbody></table>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default JournalEntries;
