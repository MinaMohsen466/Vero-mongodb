import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, Building2, FolderTree } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function ChartOfAccounts() {
    const { t, user } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [accountsTree, setAccountsTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        parent_id: '',
        account_type: 'asset',
        nature: 'debit',
        can_post: true
    });

    useEffect(() => {
        loadAccounts();
    }, []);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#account-form button[type="submit"]') || document.querySelector('button[form="account-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.chart_of_accounts?.can_create) openModal();
        },
        Escape: () => {
            if (showModal) closeModal();
        }
    });

    const loadAccounts = async () => {
        try {
            const [allAccounts, tree] = await Promise.all([
                window.api.accounts.getAll(),
                window.api.accounts.getTree()
            ]);
            setAccounts(allAccounts);
            setAccountsTree(tree);
            // Expand first level by default
            const firstLevel = new Set(tree.map(a => a.id));
            setExpandedNodes(firstLevel);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                parent_id: formData.parent_id ? parseInt(formData.parent_id) : null
            };
            if (editingAccount) {
                await window.api.accounts.update({ ...data, id: editingAccount.id });
                toast.success(t('account_updated') || 'Account updated successfully');
            } else {
                await window.api.accounts.create(data);
                toast.success(t('account_added') || 'Account added successfully');
            }
            loadAccounts();
            closeModal();
        } catch (error) {
            console.error('Error saving account:', error);
            toast.error(t('error_saving_account') || 'Error saving account');
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('confirm_delete_account') || 'Are you sure you want to delete this account?')) {
            try {
                const result = await window.api.accounts.delete(id);
                if (!result.success) {
                    toast.error(result.error);
                } else {
                    toast.success(t('account_deleted') || 'Account deleted successfully');
                    loadAccounts();
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                toast.error(t('error_deleting_account') || 'Error deleting account');
            }
        }
    };

    const openModal = (account = null) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                code: account.code || '',
                name: account.name || '',
                parent_id: account.parent_id || '',
                account_type: account.account_type || 'asset',
                nature: account.nature || 'debit',
                can_post: account.can_post === 1
            });
        } else {
            setEditingAccount(null);
            setFormData({
                code: '', name: '', parent_id: '', account_type: 'asset', nature: 'debit', can_post: true
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAccount(null);
    };

    const toggleNode = (id) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedNodes(newExpanded);
    };

    const getAccountTypeLabel = (type) => {
        const types = {
            asset: t('assets') || 'Assets',
            liability: t('liabilities') || 'Liabilities',
            equity: t('equity') || 'Equity',
            revenue: t('revenue') || 'Revenue',
            expense: t('expenses') || 'Expenses'
        };
        return types[type] || type;
    };

    const renderTreeNode = (account, level = 0) => {
        const hasChildren = account.children && account.children.length > 0;
        const isExpanded = expandedNodes.has(account.id);

        return (
            <div key={account.id} className="tree-item">
                <div
                    className="tree-node"
                    style={{ paddingRight: `${12 + level * 24}px` }}
                >
                    {hasChildren ? (
                        <span
                            className={`tree-toggle ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleNode(account.id)}
                        >
                            <ChevronRight size={16} />
                        </span>
                    ) : (
                        <span style={{ width: '20px' }}></span>
                    )}

                    <span className="font-bold" style={{ color: 'var(--primary)' }}>{account.code}</span>
                    <span style={{ flex: 1 }}>{account.name}</span>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                        {getAccountTypeLabel(account.account_type)}
                    </span>

                    <div className="table-actions" style={{ opacity: 0.6 }}>
                        {user?.permissions?.chart_of_accounts?.can_edit && (
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openModal(account); }}>
                                <Edit2 size={14} />
                            </button>
                        )}
                        {!hasChildren && user?.permissions?.chart_of_accounts?.can_delete && (
                            <button className="btn btn-ghost btn-sm text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(account.id); }}>
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {hasChildren && isExpanded && (
                    <div className="tree-children">
                        {account.children.map(child => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div className="flex items-center gap-2">
                    <FolderTree size={24} style={{ color: 'var(--primary)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{t('total')} {accounts.length} {t('accounts_count') || 'accounts'}</span>
                </div>
                {user?.permissions?.chart_of_accounts?.can_create && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} />
                        إضافة حساب
                    </button>
                )}
            </div>

            <div className="card">
                <div className="card-body">
                    {accountsTree.length === 0 ? (
                        <div className="empty-state">
                            <Building2 size={48} />
                            <h3>{t('no_accounts') || 'No Accounts'}</h3>
                            <p>{t('add_accounts_desc') || 'Add accounts to build the chart of accounts tree'}</p>
                        </div>
                    ) : (
                        <div className="tree-view">
                            {accountsTree.map(account => renderTreeNode(account))}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingAccount ? t('edit_account') || 'Edit Account' : t('new_account') || 'New Account'}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel_esc') || 'Cancel (Esc)'}</button>
                        <button type="submit" form="account-form" className="btn btn-primary">
                            {editingAccount ? t('save_ctrl_s') || 'Save (Ctrl+S)' : t('add_ctrl_s') || 'Add (Ctrl+S)'}
                        </button>
                    </>
                }
            >
                <form id="account-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('account_code') || 'Account Code'} *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('account_name') || 'Account Name'} *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('parent_account') || 'Parent Account'}</label>
                        <select
                            className="form-select"
                            value={formData.parent_id}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                        >
                            <option value="">-- {t('main_account') || 'Main Account'} --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id} disabled={acc.id === editingAccount?.id}>
                                    {acc.code} - {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('account_type') || 'Account Type'} *</label>
                            <select
                                className="form-select"
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                            >
                                <option value="asset">{t('assets') || 'Assets'}</option>
                                <option value="liability">{t('liabilities') || 'Liabilities'}</option>
                                <option value="equity">{t('equity') || 'Equity'}</option>
                                <option value="revenue">{t('revenue') || 'Revenue'}</option>
                                <option value="expense">{t('expenses') || 'Expenses'}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('account_nature') || 'Account Nature'} *</label>
                            <select
                                className="form-select"
                                value={formData.nature}
                                onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                            >
                                <option value="debit">{t('debit') || 'Debit'}</option>
                                <option value="credit">{t('credit') || 'Credit'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.can_post}
                                onChange={(e) => setFormData({ ...formData, can_post: e.target.checked })}
                            />
                            {t('can_post_to') || 'Can post to (Analytical Account)'}
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default ChartOfAccounts;
