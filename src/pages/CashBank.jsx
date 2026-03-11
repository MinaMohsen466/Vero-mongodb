import React, { useState, useEffect } from 'react';
import { Wallet, Building, ArrowUpRight, ArrowDownRight, Plus, RefreshCw, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function CashBank() {
    const { t, user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({});
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('deposit'); // 'deposit' or 'withdraw'
    const [formData, setFormData] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#cashbank-form button[type="submit"]') || document.querySelector('button[form="cashbank-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        Escape: () => {
            if (showModal) setShowModal(false);
        }
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [allAccounts, settingsData, journalEntries] = await Promise.all([
                window.api.accounts.getAll(),
                window.api.settings.getAll(),
                window.api.journal.getAll()
            ]);
            // Filter to only cash & bank accounts (codes 111 = Cash, 112 = Bank and sub-accounts)
            const cashBankAccounts = (allAccounts || []).filter(a =>
                a.code === '111' || a.code === '112' || a.code?.startsWith('111.') || a.code?.startsWith('112.')
            );
            setAccounts(cashBankAccounts);
            setSettings(settingsData || {});

            // Extract transactions related to cash/bank accounts from journal entries
            const cashBankIds = new Set(cashBankAccounts.map(a => a.id));
            const txns = [];
            for (const entry of (journalEntries || [])) {
                for (const line of (entry.lines || [])) {
                    if (cashBankIds.has(line.account_id)) {
                        txns.push({
                            id: `${entry.id}-${line.account_id}`,
                            date: entry.date,
                            description: line.description || entry.description,
                            reference: entry.reference || entry.entry_number,
                            entry_number: entry.entry_number,
                            account_id: line.account_id,
                            account_name: line.account_name,
                            account_code: line.account_code,
                            debit: line.debit || 0,
                            credit: line.credit || 0,
                            amount: (line.debit || 0) - (line.credit || 0)
                        });
                    }
                }
            }
            txns.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTransactions(txns);

            if (cashBankAccounts.length > 0 && !selectedAccount) {
                setSelectedAccount(cashBankAccounts[0].id);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const formatCurrency = (amount) => {
        const symbol = settings.general?.currency_symbol || (t('currency_kd') || 'KD');
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + symbol;
    };

    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalCash = accounts.filter(a => a.code === '111' || a.code?.startsWith('111.')).reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalBank = accounts.filter(a => a.code === '112' || a.code?.startsWith('112.')).reduce((sum, a) => sum + (a.balance || 0), 0);

    const openModal = (type) => {
        setModalType(type);
        setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) return;
        if (!selectedAccount) return;

        setSaving(true);
        try {
            const account = accounts.find(a => a.id === selectedAccount);
            // Find or use equity account (Equity code=3) as the other side
            const allAccounts = await window.api.accounts.getAll();
            const equityAccount = allAccounts.find(a => a.code === '3') || allAccounts.find(a => a.code === '31');

            if (!equityAccount) {
                toast.error(t('cb_noEquityAccount') || 'No equity account to record transaction');
                setSaving(false);
                return;
            }

            const lines = [];
            if (modalType === 'deposit') {
                // Deposit: Debit Cash/Bank, Credit Equity (Capital)
                lines.push({ account_id: selectedAccount, debit: amount, credit: 0, description: formData.description || (t('cb_cashDeposit') || 'Cash Deposit') });
                lines.push({ account_id: equityAccount.id, debit: 0, credit: amount, description: formData.description || (t('cb_cashDeposit') || 'Cash Deposit') });
            } else {
                // Withdraw: Debit Equity/Expense, Credit Cash/Bank
                const expenseAcct = allAccounts.find(a => a.code === '5') || equityAccount;
                lines.push({ account_id: expenseAcct.id, debit: amount, credit: 0, description: formData.description || (t('cb_cashWithdrawal') || 'Cash Withdrawal') });
                lines.push({ account_id: selectedAccount, debit: 0, credit: amount, description: formData.description || (t('cb_cashWithdrawal') || 'Cash Withdrawal') });
            }

            await window.api.journal.create({
                date: formData.date,
                description: formData.description || (modalType === 'deposit' ? (t('cb_cashDeposit') || 'Cash Deposit') : (t('cb_cashWithdrawal') || 'Cash Withdrawal')),
                reference: modalType === 'deposit' ? 'DEP' : 'WTH',
                created_by: user?.id,
                lines
            });

            toast.success(modalType === 'deposit' ? (t('cb_depositSuccess') || 'Deposit successful') : (t('cb_withdrawSuccess') || 'Withdrawal successful'));
            setShowModal(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error(t('errorOccurred') || 'Error occurred while recording transaction');
        }
        setSaving(false);
    };

    const filteredTransactions = selectedAccount
        ? transactions.filter(tx => tx.account_id === selectedAccount)
        : transactions;

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark, #1e40af))', color: 'white', position: 'relative', overflow: 'hidden' }}>
                    <div className="card-body" style={{ padding: '20px' }}>
                        <Wallet size={40} style={{ position: 'absolute', left: '15px', top: '15px', opacity: 0.15 }} />
                        <p style={{ margin: 0, opacity: 0.85, fontSize: '0.85rem' }}>{t('cb_totalBalance')}</p>
                        <h2 style={{ margin: '8px 0 0', fontSize: '1.6rem', fontWeight: 700 }}>{formatCurrency(totalBalance)}</h2>
                    </div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--success, #10b981)' }}>
                    <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={22} style={{ color: 'var(--success, #10b981)' }} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('cb_cash') || 'Cash'}</p>
                            <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700, color: totalCash >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}>{formatCurrency(totalCash)}</h3>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
                    <div className="card-body" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building size={22} style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('cb_bank') || 'Bank'}</p>
                            <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700, color: totalBank >= 0 ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)' }}>{formatCurrency(totalBank)}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions + Account Filter */}
            <div className="card" style={{ marginBottom: '16px' }}>
                <div className="card-body" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('cb_account') || 'Account:'}</label>
                        <select
                            className="form-input"
                            value={selectedAccount || ''}
                            onChange={e => setSelectedAccount(Number(e.target.value))}
                            style={{ minWidth: '180px' }}
                        >
                            {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-success btn-sm" onClick={() => openModal('deposit')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowDownCircle size={16} /> {t('cb_deposit') || 'Deposit'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => openModal('withdraw')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ArrowUpCircle size={16} /> {t('cb_withdraw') || 'Withdraw'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); loadData(); }} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={16} /> {t('refresh') || 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="card">
                <div className="card-header">
                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Wallet size={18} /> {t('cb_transactionsLog') || 'Transactions Log'}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({filteredTransactions.length} {t('cb_transactions') || 'transactions'})</span>
                    </h4>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredTransactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <Wallet size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <p>{t('cb_noTransactionsYet') || 'No financial transactions yet'}</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('date') || 'Date'}</th>
                                    <th>{t('cb_reference') || 'Reference'}</th>
                                    <th>{t('cb_account') || 'Account'}</th>
                                    <th>{t('description') || 'Description'}</th>
                                    <th style={{ textAlign: 'center' }}>{t('cb_debitIn') || 'Debit (In)'}</th>
                                    <th style={{ textAlign: 'center' }}>{t('cb_creditOut') || 'Credit (Out)'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx, i) => (
                                    <tr key={tx.id}>
                                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                                        <td><span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{tx.entry_number}</span></td>
                                        <td style={{ fontSize: '0.85rem' }}>{tx.account_name}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{tx.description || '-'}</td>
                                        <td style={{ textAlign: 'center', color: tx.debit > 0 ? 'var(--success, #10b981)' : 'var(--text-muted)', fontWeight: tx.debit > 0 ? 600 : 400 }}>
                                            {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                        </td>
                                        <td style={{ textAlign: 'center', color: tx.credit > 0 ? 'var(--danger, #ef4444)' : 'var(--text-muted)', fontWeight: tx.credit > 0 ? 600 : 400 }}>
                                            {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Deposit/Withdraw Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalType === 'deposit' ? (t('cb_depositAmount') || 'Deposit Amount') : (t('cb_withdrawAmount') || 'Withdraw Amount')}
            >
                <form id="cashbank-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">{t('cb_account') || 'Account'}</label>
                        <select className="form-input" value={selectedAccount || ''} onChange={e => setSelectedAccount(Number(e.target.value))}>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">{t('amount') || 'Amount'}</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0.000"
                            step="0.250"
                            min="0"
                            autoFocus
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label className="form-label">{t('date') || 'Date'}</label>
                        <input
                            type="date"
                            className="form-input"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label className="form-label">{t('description') || 'Description / Reason'}</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder={modalType === 'deposit' ? (t('cb_exampleDeposit') || 'e.g. Capital deposit') : (t('cb_exampleWithdraw') || 'e.g. Administrative expenses')}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>{t('cancel') || 'Cancel'} (Esc)</button>
                        <button
                            type="submit"
                            form="cashbank-form"
                            className={`btn ${modalType === 'deposit' ? 'btn-success' : 'btn-danger'}`}
                            disabled={saving || !formData.amount}
                        >
                            {saving ? t('savingProgress') : (modalType === 'deposit' ? (t('cb_deposit') || 'Deposit') : (t('cb_withdraw') || 'Withdraw'))} (Ctrl+S)
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default CashBank;
