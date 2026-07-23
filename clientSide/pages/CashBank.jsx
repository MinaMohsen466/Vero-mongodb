import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Wallet, Building, RefreshCw, ArrowDownCircle, ArrowUpCircle, Calendar, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';
import translations from '../translations';

const ActionButton = ({ onClick, style, icon: Icon, label, hoverShadow }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '.875rem',
                fontWeight: 650,
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
                boxShadow: isHovered ? hoverShadow : '0 2px 6px rgba(0,0,0,0.05)',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                color: '#fff',
                ...style
            }}
        >
            {Icon && <Icon size={16} />}
            <span>{label}</span>
        </button>
    );
};

function CashBank() {
    const auth = useAuth() || {};
    const { t: originalT = (k) => k, user, theme } = auth;
    const t = (key) => {
        const val = originalT(key);
        if (val === key) {
            return translations['ar']?.[key] || key;
        }
        return val;
    };
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState({});
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('deposit'); // 'deposit', 'withdraw', or 'transfer'
    const [formData, setFormData] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0], toAccount: '' });
    const [saving, setSaving] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const actionsDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
            if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target)) {
                setIsActionsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        const symbol = settings.general?.currency_symbol || (t('currency_kd') || 'د.ك');
        return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3 }).format(amount || 0) + ' ' + symbol;
    };

    const totalBalance = useMemo(() => {
        return accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    const totalCash = useMemo(() => {
        return accounts.filter(a => a.code === '111' || a.code?.startsWith('111.')).reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    const totalBank = useMemo(() => {
        return accounts.filter(a => a.code === '112' || a.code?.startsWith('112.')).reduce((sum, a) => sum + (a.balance || 0), 0);
    }, [accounts]);

    const openModal = (type) => {
        setModalType(type);
        setFormData({ amount: '', description: '', date: new Date().toISOString().split('T')[0], toAccount: '' });
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
                toast.error(t('cb_noEquityAccount') || 'لا يوجد حساب حقوق ملكية لتسجيل العملية');
                setSaving(false);
                return;
            }

            const lines = [];
            if (modalType === 'deposit') {
                // Deposit: Debit Cash/Bank, Credit Equity (Capital)
                lines.push({ account_id: selectedAccount, debit: amount, credit: 0, description: formData.description || (t('cb_cashDeposit') || 'إيداع نقدي') });
                lines.push({ account_id: equityAccount.id, debit: 0, credit: amount, description: formData.description || (t('cb_cashDeposit') || 'إيداع نقدي') });
            } else if (modalType === 'withdraw') {
                // Withdraw: Debit Equity/Expense, Credit Cash/Bank
                const expenseAcct = allAccounts.find(a => a.code === '5') || equityAccount;
                lines.push({ account_id: expenseAcct.id, debit: amount, credit: 0, description: formData.description || (t('cb_cashWithdrawal') || 'سحب نقدي') });
                lines.push({ account_id: selectedAccount, debit: 0, credit: amount, description: formData.description || (t('cb_cashWithdrawal') || 'سحب نقدي') });
            } else if (modalType === 'transfer') {
                const toAccountId = Number(formData.toAccount);
                if (!toAccountId) {
                    toast.error(t('cb_toAccountRequired') || 'يجب اختيار الحساب المحول إليه');
                    setSaving(false);
                    return;
                }
                if (toAccountId === selectedAccount) {
                    toast.error(t('cb_cannotTransferSameAccount') || 'لا يمكن التحويل لنفس الحساب');
                    setSaving(false);
                    return;
                }
                // Transfer: Debit toAccount, Credit selectedAccount
                lines.push({ account_id: toAccountId, debit: amount, credit: 0, description: formData.description || (t('cb_transfer') || 'تحويل داخلي') });
                lines.push({ account_id: selectedAccount, debit: 0, credit: amount, description: formData.description || (t('cb_transfer') || 'تحويل داخلي') });
            }

            await window.api.journal.create({
                date: formData.date,
                description: formData.description || (modalType === 'deposit' ? (t('cb_cashDeposit') || 'إيداع نقدي') : modalType === 'withdraw' ? (t('cb_cashWithdrawal') || 'سحب نقدي') : (t('cb_transfer') || 'تحويل داخلي')),
                reference: modalType === 'deposit' ? 'DEP' : modalType === 'withdraw' ? 'WTH' : 'TRF',
                created_by: user?.id,
                lines
            });

            toast.success(modalType === 'deposit' ? (t('cb_depositSuccess') || 'تم الإيداع بنجاح') : modalType === 'withdraw' ? (t('cb_withdrawSuccess') || 'تم السحب بنجاح') : (t('cb_transferSuccess') || 'تم التحويل بنجاح'));
            setShowModal(false);
            loadData();
        } catch (e) {
            console.error(e);
            toast.error(t('errorOccurred') || 'حدث خطأ أثناء العملية');
        }
        setSaving(false);
    };

    const filteredTransactions = useMemo(() => {
        return selectedAccount
            ? transactions.filter(tx => tx.account_id === selectedAccount)
            : transactions;
    }, [transactions, selectedAccount]);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const btnStyle = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 18px',
        border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '.875rem', fontWeight: 600, fontFamily: 'inherit',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
    };

    const glassCard = {
        background: theme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.04)',
        transition: 'all 0.3s ease'
    };

    const selectInp = {
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        outline: 'none',
        fontSize: '.875rem',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
        minWidth: '180px'
    };

    const currentAccount = accounts.find(a => a.id === selectedAccount) || accounts[0];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', direction: 'rtl' }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                {/* Total Balance Card */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
                    color: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                }}>
                    <Wallet size={80} style={{ position: 'absolute', left: '-10px', bottom: '-15px', opacity: 0.12 }} />
                    <p style={{ margin: 0, opacity: 0.85, fontSize: '0.85rem', fontWeight: 600 }}>{t('cb_totalBalance') || 'إجمالي الرصيد'}</p>
                    <h2 style={{ margin: '8px 0 0', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.5px' }}>{formatCurrency(totalBalance)}</h2>
                </div>

                {/* Cash Card */}
                <div style={{
                    ...glassCard,
                    borderRight: '4px solid #10b981',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(16,185,129,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.05)'
                    }}>
                        <Wallet size={24} style={{ color: '#10b981' }} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('cb_cash') || 'الصندوق'}</p>
                        <h3 style={{ margin: '6px 0 0', fontSize: '1.4rem', fontWeight: 800, color: totalCash >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(totalCash)}</h3>
                    </div>
                </div>

                {/* Bank Card */}
                <div style={{
                    ...glassCard,
                    borderRight: '4px solid #3b82f6',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(59,130,246,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59,130,246,0.05)'
                    }}>
                        <Building size={24} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('cb_bank') || 'البنك'}</p>
                        <h3 style={{ margin: '6px 0 0', fontSize: '1.4rem', fontWeight: 800, color: totalBank >= 0 ? '#3b82f6' : '#ef4444' }}>{formatCurrency(totalBank)}</h3>
                    </div>
                </div>
            </div>

            {/* Actions + Account Filter Toolbar */}
            <div style={{ ...glassCard, padding: '16px 24px', overflow: 'visible', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', direction: 'rtl' }}>

                    {/* Right Side: Custom Dropdown Account Selector */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }} ref={dropdownRef}>
                        <label style={{ fontSize: '0.88rem', fontWeight: 750, color: 'var(--text-secondary)' }}>
                            {t('cb_account') || 'الحساب:'}
                        </label>
                        {currentAccount && (
                            <div style={{ position: 'relative' }}>
                                <div
                                    onClick={() => setIsDropdownOpen(prev => !prev)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        minWidth: '240px',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onMouseLeave={e => {
                                        if (!isDropdownOpen) e.currentTarget.style.borderColor = 'var(--border)';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {(() => {
                                            const isCash = currentAccount.code === '111' || currentAccount.code?.startsWith('111.');
                                            const Icon = isCash ? Wallet : Building;
                                            const accentColor = isCash ? '#10b981' : '#3b82f6';
                                            return (
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
                                                    background: `${accentColor}15`,
                                                    color: accentColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Icon size={16} />
                                                </div>
                                            );
                                        })()}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 750, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                                {currentAccount.name}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {currentAccount.code}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                                            {formatCurrency(currentAccount.balance)}
                                        </span>
                                        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </div>
                                </div>

                                {/* Dropdown Menu Overlay */}
                                {isDropdownOpen && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        right: 0,
                                        background: 'var(--surface)',
                                        backdropFilter: 'none',
                                        WebkitBackdropFilter: 'none',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                        zIndex: 100,
                                        width: '320px',
                                        maxHeight: '280px',
                                        overflowY: 'auto',
                                        padding: '6px'
                                    }}>
                                        {accounts.map(a => {
                                            const isSelected = a.id === selectedAccount;
                                            const isCash = a.code === '111' || a.code?.startsWith('111.');
                                            const Icon = isCash ? Wallet : Building;
                                            const accentColor = isCash ? '#10b981' : '#3b82f6';
                                            return (
                                                <div
                                                    key={a.id}
                                                    onClick={() => {
                                                        setSelectedAccount(a.id);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        background: isSelected ? `${accentColor}12` : 'transparent',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = isSelected ? `${accentColor}18` : 'var(--bg-secondary)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = isSelected ? `${accentColor}12` : 'transparent'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '6px',
                                                            background: isSelected ? accentColor : `${accentColor}12`,
                                                            color: isSelected ? '#fff' : accentColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Icon size={15} />
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? accentColor : 'var(--text-primary)' }}>
                                                                {a.name}
                                                            </div>
                                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                                {a.code}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: 750, fontSize: '0.85rem', color: isSelected ? accentColor : 'var(--text-primary)' }}>
                                                        {formatCurrency(a.balance)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Left Side: Refresh Button + Actions Dropdown Menu */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }} ref={actionsDropdownRef}>
                        {/* Refresh Button */}
                        <ActionButton
                            onClick={() => { setLoading(true); loadData(); }}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            hoverShadow="0 6px 20px rgba(0,0,0,0.12)"
                            icon={RefreshCw}
                            label={t('refresh') || 'تحديث'}
                        />

                        {/* Actions Dropdown Button */}
                        <div style={{ position: 'relative' }}>
                            <ActionButton
                                onClick={() => setIsActionsDropdownOpen(prev => !prev)}
                                style={{ background: 'linear-gradient(135deg, var(--primary), #2563eb)', color: '#fff' }}
                                hoverShadow="0 6px 20px rgba(37,99,235,0.3)"
                                icon={ChevronDown}
                                label="عمليات الحساب"
                            />

                            {/* Actions Dropdown Menu Overlay */}
                            {isActionsDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 6px)',
                                    left: 0,
                                    background: 'var(--surface)',
                                    backdropFilter: 'none',
                                    WebkitBackdropFilter: 'none',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    zIndex: 100,
                                    width: '200px',
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    {/* Deposit Option */}
                                    <div
                                        onClick={() => {
                                            openModal('deposit');
                                            setIsActionsDropdownOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            color: 'var(--text-primary)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(16,185,129,0.08)';
                                            e.currentTarget.style.color = '#10b981';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <ArrowDownCircle size={16} style={{ color: '#10b981' }} />
                                        <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{t('cb_deposit') || 'إيداع'}</span>
                                    </div>

                                    {/* Withdraw Option */}
                                    <div
                                        onClick={() => {
                                            openModal('withdraw');
                                            setIsActionsDropdownOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            color: 'var(--text-primary)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                                            e.currentTarget.style.color = '#ef4444';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <ArrowUpCircle size={16} style={{ color: '#ef4444' }} />
                                        <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{t('cb_withdraw') || 'سحب'}</span>
                                    </div>

                                    {/* Transfer Option */}
                                    <div
                                        onClick={() => {
                                            openModal('transfer');
                                            setIsActionsDropdownOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            color: 'var(--text-primary)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = 'rgba(37,99,235,0.08)';
                                            e.currentTarget.style.color = 'var(--primary)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                    >
                                        <RefreshCw size={15} style={{ color: 'var(--primary)' }} />
                                        <span style={{ fontWeight: 650, fontSize: '0.85rem' }}>{t('cb_transfer') || 'تحويل'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div style={{ ...glassCard, overflow: 'hidden' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px',
                    borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)'
                }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <Wallet size={18} style={{ color: 'var(--primary)' }} /> {t('cb_transactionsLog') || 'سجل العمليات'}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>({filteredTransactions.length} {t('cb_transactions') || 'عملية'})</span>
                    </h4>
                </div>
                <div style={{ padding: 0 }}>
                    {filteredTransactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                            <Wallet size={48} style={{ marginBottom: '16px', opacity: 0.2, color: 'var(--text-muted)' }} />
                            <p style={{ margin: 0, fontSize: '.9rem' }}>{t('cb_noTransactionsYet') || 'لا توجد عمليات مالية بعد'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem', minWidth: 600 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('date') || 'التاريخ'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('cb_reference') || 'المرجع'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('cb_account') || 'الحساب'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('description') || 'الوصف'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('cb_debitIn') || 'مدين (وارد)'}</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('cb_creditOut') || 'دائن (صادر)'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((tx, i) => (
                                        <tr key={tx.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', transition: 'background-color .2s' }}>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {new Date(tx.date).toLocaleDateString('ar-KW', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    fontFamily: 'monospace', fontSize: '.78rem', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-light)', color: 'var(--text-secondary)'
                                                }}>{tx.entry_number}</span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.account_name}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{tx.description || '—'}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: tx.debit > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: tx.debit > 0 ? 700 : 400 }}>
                                                {tx.debit > 0 ? (
                                                    <span style={{ background: 'rgba(16,185,129,0.08)', padding: '3px 8px', borderRadius: 6, color: '#10b981' }}>{formatCurrency(tx.debit)}</span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: tx.credit > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: tx.credit > 0 ? 700 : 400 }}>
                                                {tx.credit > 0 ? (
                                                    <span style={{ background: 'rgba(239,68,68,0.08)', padding: '3px 8px', borderRadius: 6, color: '#ef4444' }}>{formatCurrency(tx.credit)}</span>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Deposit/Withdraw Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalType === 'deposit' ? (t('cb_depositAmount') || 'مبلغ الإيداع') : modalType === 'withdraw' ? (t('cb_withdrawAmount') || 'مبلغ السحب') : (t('cb_transferAmount') || 'مبلغ التحويل')}
            >
                <form id="cashbank-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ direction: 'rtl' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px' }}>

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', display: 'block', marginBottom: 6 }}>{modalType === 'transfer' ? (t('cb_fromAccount') || 'من حساب') : (t('cb_account') || 'الحساب')}</label>
                            <select className="form-select" value={selectedAccount || ''} onChange={e => setSelectedAccount(Number(e.target.value))} style={{ width: '100%', height: 40 }}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                            </select>
                        </div>

                        {modalType === 'transfer' && (
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', display: 'block', marginBottom: 6 }}>{t('cb_toAccount') || 'إلى حساب'}</label>
                                <select className="form-select" value={formData.toAccount || ''} onChange={e => setFormData({ ...formData, toAccount: e.target.value })} required={modalType === 'transfer'} style={{ width: '100%', height: 40 }}>
                                    <option value="">{t('select') || 'اختر...'}</option>
                                    {accounts.filter(a => a.id !== selectedAccount).map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', display: 'block', marginBottom: 6 }}>{t('amount') || 'المبلغ'}</label>
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
                                style={{ width: '100%', height: 40, padding: '8px 12px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', display: 'block', marginBottom: 6 }}>{t('date') || 'التاريخ'}</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                style={{ width: '100%', height: 40, padding: '8px 12px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 600, fontSize: '.85rem', display: 'block', marginBottom: 6 }}>{t('description') || 'الوصف / السبب'}</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder={modalType === 'deposit' ? (t('cb_exampleDeposit') || 'مثال: إيداع رأس مال') : modalType === 'withdraw' ? (t('cb_exampleWithdraw') || 'مثال: مصروفات إدارية') : (t('cb_exampleTransfer') || 'مثال: تحويل داخلي')}
                                style={{ width: '100%', height: 40, padding: '8px 12px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ margin: 0 }}>{t('cancel') || 'إلغاء'} (Esc)</button>
                            <button
                                type="submit"
                                className={`btn ${modalType === 'deposit' ? 'btn-success' : modalType === 'withdraw' ? 'btn-danger' : 'btn-primary'}`}
                                disabled={saving || !formData.amount}
                                style={{ margin: 0 }}
                            >
                                {saving ? (t('savingProgress') || 'جاري الحفظ...') : (modalType === 'deposit' ? (t('cb_deposit') || 'إيداع') : modalType === 'withdraw' ? (t('cb_withdraw') || 'سحب') : (t('cb_transfer') || 'تحويل'))} (Ctrl+S)
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default CashBank;
