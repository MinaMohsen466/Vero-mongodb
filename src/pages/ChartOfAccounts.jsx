import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, Building2, FolderTree } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';

function ChartOfAccounts() {
    const { user } = useAuth();
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
            } else {
                await window.api.accounts.create(data);
            }
            loadAccounts();
            closeModal();
        } catch (error) {
            console.error('Error saving account:', error);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا الحساب؟')) {
            try {
                const result = await window.api.accounts.delete(id);
                if (!result.success) {
                    alert(result.error);
                } else {
                    loadAccounts();
                }
            } catch (error) {
                console.error('Error deleting account:', error);
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
            asset: 'أصول',
            liability: 'خصوم',
            equity: 'حقوق ملكية',
            revenue: 'إيرادات',
            expense: 'مصروفات'
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
                    <span style={{ color: 'var(--text-muted)' }}>إجمالي {accounts.length} حساب</span>
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
                            <h3>لا يوجد حسابات</h3>
                            <p>قم بإضافة حسابات لإنشاء شجرة الحسابات</p>
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
                title={editingAccount ? 'تعديل حساب' : 'إضافة حساب جديد'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>إلغاء</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>
                            {editingAccount ? 'حفظ التغييرات' : 'إضافة'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">كود الحساب *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">اسم الحساب *</label>
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
                        <label className="form-label">الحساب الأب</label>
                        <select
                            className="form-select"
                            value={formData.parent_id}
                            onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                        >
                            <option value="">-- حساب رئيسي --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id} disabled={acc.id === editingAccount?.id}>
                                    {acc.code} - {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">نوع الحساب *</label>
                            <select
                                className="form-select"
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                            >
                                <option value="asset">أصول</option>
                                <option value="liability">خصوم</option>
                                <option value="equity">حقوق ملكية</option>
                                <option value="revenue">إيرادات</option>
                                <option value="expense">مصروفات</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">طبيعة الحساب *</label>
                            <select
                                className="form-select"
                                value={formData.nature}
                                onChange={(e) => setFormData({ ...formData, nature: e.target.value })}
                            >
                                <option value="debit">مدين</option>
                                <option value="credit">دائن</option>
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
                            يمكن الترحيل إليه (حساب تحليلي)
                        </label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default ChartOfAccounts;
