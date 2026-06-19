import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Ticket, Plus, Edit2, Trash2, Search, Calendar, Check, X } from 'lucide-react';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

function OffersAndCoupons() {
    const { user, t } = useAuth();
    const [activeTab, setActiveTab] = useState('offers');
    const [loading, setLoading] = useState(true);
    const [offers, setOffers] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({});
    const [settings, setSettings] = useState({});

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [_offers, _coupons, _products, _settings] = await Promise.all([
                window.api.offers.getAll(),
                window.api.coupons.getAll(),
                window.api.products.getAll(),
                window.api.settings.getAll()
            ]);
            setOffers(_offers || []);
            setCoupons(_coupons || []);
            setProducts(_products || []);
            setSettings(_settings || {});
            const cats = [...new Set((_products || []).map(p => p.category).filter(Boolean))];
            setCategories(cats);
        } catch (e) {
            console.error(e);
            toast.error(t('errorOccurred') || 'An error occurred');
        }
        setLoading(false);
    }, [t]);

    useEffect(() => { loadData(); }, [loadData]);

    const openModal = useCallback((item = null) => {
        setEditingItem(item);
        if (activeTab === 'offers') {
            setFormData(item ? { ...item } : {
                title: '', offer_type: 'percentage', discount_value: '', target_type: 'all', target_id: '',
                buy_qty: '', get_qty: '', valid_from: '', valid_to: '', is_active: 1
            });
        } else {
            setFormData(item ? { ...item } : {
                code: '', discount_type: 'fixed', discount_value: '', max_uses: '',
                valid_from: '', valid_to: '', is_active: 1
            });
        }
        setShowModal(true);
    }, [activeTab]);

    const closeModal = useCallback(() => { 
        setShowModal(false); 
        setEditingItem(null); 
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            const data = { ...formData };
            if (activeTab === 'offers') {
                if (data.offer_type === 'bogo') {
                    data.discount_value = 0;
                } else {
                    data.buy_qty = 0; data.get_qty = 0;
                }
                if (editingItem) await window.api.offers.update({ ...data, id: editingItem.id });
                else await window.api.offers.create(data);
            } else {
                data.code = data.code.toUpperCase().replace(/\s/g, '');
                if (!data.max_uses) data.max_uses = 0;
                if (editingItem) await window.api.coupons.update({ ...data, id: editingItem.id });
                else await window.api.coupons.create(data);
            }
            toast.success(t('savedSuccess') || 'Saved successfully');
            await loadData();
            closeModal();
        } catch (e) {
            console.error(e);
            toast.error(e.message || t('errorOccurred'));
        }
    }, [formData, activeTab, editingItem, t, loadData, closeModal]);

    const handleDelete = useCallback(async (id) => {
        if (!confirm(t('prod_deleteConfirm') || 'Are you sure?')) return;
        try {
            if (activeTab === 'offers') await window.api.offers.delete(id);
            else await window.api.coupons.delete(id);
            toast.success(t('deletedSuccess') || 'Deleted successfully');
            await loadData();
        } catch (e) {
            toast.error(t('errorOccurred') || 'Error occurred');
        }
    }, [activeTab, t, loadData]);

    const toggleStatus = useCallback(async (item) => {
        try {
            const data = { ...item, is_active: item.is_active ? 0 : 1 };
            if (activeTab === 'offers') await window.api.offers.update(data);
            else await window.api.coupons.update(data);
            await loadData();
        } catch (e) {
            toast.error(t('errorOccurred'));
        }
    }, [activeTab, t, loadData]);

    const getProductName = useCallback((id) => {
        const p = products.find(prod => prod.id.toString() === id?.toString());
        return p ? p.name : id;
    }, [products]);

    const filteredList = useMemo(() => {
        const list = activeTab === 'offers' ? offers : coupons;
        if (!searchQuery) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(item => {
            if (activeTab === 'offers') return item.title?.toLowerCase().includes(q);
            return item.code?.toLowerCase().includes(q);
        });
    }, [activeTab, offers, coupons, searchQuery]);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const cannotEdit = !user?.permissions?.offers?.can_edit && user?.role !== 'admin';
    const cannotCreate = !user?.permissions?.offers?.can_create && user?.role !== 'admin';
    const cannotDelete = !user?.permissions?.offers?.can_delete && user?.role !== 'admin';

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder={t('search') || 'Search...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '250px' }}
                        />
                        <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                </div>
                {!cannotCreate && (
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> {activeTab === 'offers' ? (t('add_offer') || 'Add Offer') : (t('add_coupon') || 'Add Coupon')}
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button 
                    onClick={() => setActiveTab('offers')} 
                    className={`tab-btn ${activeTab === 'offers' ? 'active' : ''}`}
                    style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: activeTab === 'offers' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'offers' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}
                >
                    <Tag size={20} /> {t('offers') || 'Offers'}
                </button>
                <button 
                    onClick={() => setActiveTab('coupons')} 
                    className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                    style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', background: activeTab === 'coupons' ? 'var(--primary)' : 'var(--surface)', color: activeTab === 'coupons' ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}
                >
                    <Ticket size={20} /> {t('coupons') || 'Coupons'}
                </button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredList.length === 0 ? (
                        <div className="empty-state">
                            {activeTab === 'offers' ? <Tag size={48} /> : <Ticket size={48} />}
                            <h3>{activeTab === 'offers' ? (t('no_offers') || 'No Offers') : (t('no_coupons') || 'No Coupons')}</h3>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        {activeTab === 'offers' ? (
                                            <>
                                                <th>{t('offer_title') || 'Title'}</th>
                                                <th>{t('offer_type') || 'Type'}</th>
                                                <th>{t('target_type') || 'Target'}</th>
                                                <th>{t('valid_to') || 'Expiry'}</th>
                                            </>
                                        ) : (
                                            <>
                                                <th>{t('coupon_code') || 'Code'}</th>
                                                <th>{t('discount_type') || 'Discount'}</th>
                                                <th>{t('current_uses') || 'Uses'}</th>
                                                <th>{t('valid_to') || 'Expiry'}</th>
                                            </>
                                        )}
                                        <th>{t('status') || 'Status'}</th>
                                        <th>{t('actions') || 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredList.map(item => (
                                        <TableRow 
                                            key={item.id}
                                            item={item}
                                            activeTab={activeTab}
                                            t={t}
                                            cannotEdit={cannotEdit}
                                            cannotDelete={cannotDelete}
                                            getProductName={getProductName}
                                            openModal={openModal}
                                            handleDelete={handleDelete}
                                            toggleStatus={toggleStatus}
                                            currencySymbol={settings.general?.currency_symbol || 'د.ك'}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showModal} onClose={closeModal} title={activeTab === 'offers' ? (t('add_offer') || 'Offer Details') : (t('add_coupon') || 'Coupon Details')}>
                <OfferForm 
                    activeTab={activeTab}
                    formData={formData}
                    setFormData={setFormData}
                    categories={categories}
                    products={products}
                    t={t}
                    handleSubmit={handleSubmit}
                    closeModal={closeModal}
                />
            </Modal>
        </div>
    );
}

// Sub-component for table row with memo optimization
const TableRow = React.memo(({ item, activeTab, t, cannotEdit, cannotDelete, getProductName, openModal, handleDelete, toggleStatus, currencySymbol }) => (
    <tr style={{ opacity: item.is_active ? 1 : 0.6 }}>
        {activeTab === 'offers' ? (
            <>
                <td className="font-bold">{item.title}</td>
                <td>
                    {item.offer_type === 'percentage' ? `${item.discount_value}%` :
                        item.offer_type === 'fixed' ? `${item.discount_value} ${currencySymbol}` :
                            `${t('bogo_offer')} (${item.buy_qty}+${item.get_qty})`}
                </td>
                <td>
                    {item.target_type === 'all' ? (t('target_all') || 'All') :
                        item.target_type === 'category' ? `${t('target_category')} (${item.target_id})` :
                            `${t('target_product')} (${getProductName(item.target_id)})`}
                </td>
                <td>{item.valid_to || '—'}</td>
            </>
        ) : (
            <>
                <td className="font-bold" style={{ color: 'var(--primary)', letterSpacing: 1 }}>{item.code}</td>
                <td>{item.discount_type === 'percentage' ? `${item.discount_value}%` : `${item.discount_value} ${currencySymbol}`}</td>
                <td><span className="badge badge-secondary">{item.current_uses} / {item.max_uses || '∞'}</span></td>
                <td>{item.valid_to || '—'}</td>
            </>
        )}
        <td>
            <button onClick={() => !cannotEdit && toggleStatus(item)} disabled={cannotEdit} style={{ background: 'none', border: 'none', cursor: cannotEdit ? 'default' : 'pointer' }}>
                {item.is_active ? <span className="badge badge-success"><Check size={12} /> {t('offer_active') || 'Active'}</span> : <span className="badge badge-error"><X size={12} /> {t('inactive') || 'Inactive'}</span>}
            </button>
        </td>
        <td>
            <div className="table-actions">
                {!cannotEdit && <button className="btn btn-ghost btn-sm" onClick={() => openModal(item)}><Edit2 size={16} /></button>}
                {!cannotDelete && <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>}
            </div>
        </td>
    </tr>
));

// Sub-component for offer form with memo optimization
const OfferForm = React.memo(({ activeTab, formData, setFormData, categories, products, t, handleSubmit, closeModal }) => (
    <form id="offer-form" onSubmit={handleSubmit}>
        {activeTab === 'offers' ? (
            <>
                <div className="form-group">
                    <label className="form-label">{t('offer_title') || 'Title'} *</label>
                    <input type="text" className="form-input" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">{t('offer_type') || 'Type'}</label>
                        <select className="form-select" value={formData.offer_type || 'percentage'} onChange={e => setFormData({ ...formData, offer_type: e.target.value })}>
                            <option value="percentage">{t('percentage_discount') || 'Percentage (%)'}</option>
                            <option value="fixed">{t('fixed_discount') || 'Fixed Amount'}</option>
                            <option value="bogo">{t('bogo_offer') || 'BOGO'}</option>
                        </select>
                    </div>
                    {formData.offer_type !== 'bogo' ? (
                        <div className="form-group">
                            <label className="form-label">{t('discount_value') || 'Value'} *</label>
                            <input type="number" step="any" min="0" className="form-input" value={formData.discount_value || ''} onChange={e => setFormData({ ...formData, discount_value: e.target.value })} required />
                        </div>
                    ) : (
                        <div className="form-group" style={{ display: 'flex', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">{t('buy_qty') || 'Buy'}</label>
                                <input type="number" min="1" className="form-input" value={formData.buy_qty || ''} onChange={e => setFormData({ ...formData, buy_qty: e.target.value })} required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">{t('get_qty') || 'Get'}</label>
                                <input type="number" min="1" className="form-input" value={formData.get_qty || ''} onChange={e => setFormData({ ...formData, get_qty: e.target.value })} required />
                            </div>
                        </div>
                    )}
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">{t('target_type') || 'Target'}</label>
                        <select className="form-select" value={formData.target_type || 'all'} onChange={e => setFormData({ ...formData, target_type: e.target.value })}>
                            <option value="all">{t('target_all') || 'All Products'}</option>
                            <option value="category">{t('target_category') || 'Specific Category'}</option>
                            <option value="product">{t('target_product') || 'Specific Product'}</option>
                        </select>
                    </div>
                    {formData.target_type === 'category' && (
                        <div className="form-group">
                            <label className="form-label">{t('target_category') || 'Category'} *</label>
                            <SearchableSelect
                                options={categories.map(c => ({ value: c, label: c }))}
                                value={formData.target_id || ''}
                                onChange={val => setFormData({ ...formData, target_id: val })}
                                placeholder={t('select') || 'اختر...'}
                            />
                        </div>
                    )}
                    {formData.target_type === 'product' && (
                        <div className="form-group">
                            <label className="form-label">{t('target_product') || 'Product'} *</label>
                            <SearchableSelect
                                options={products.map(p => ({ value: String(p.id), label: p.name, subLabel: p.code }))}
                                value={formData.target_id ? String(formData.target_id) : ''}
                                onChange={val => setFormData({ ...formData, target_id: val })}
                                placeholder={t('select_product') || 'اختر منتجاً...'}
                            />
                        </div>
                    )}
                </div>
            </>
        ) : (
            <>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">{t('coupon_code') || 'Code'} *</label>
                        <input type="text" className="form-input" style={{ textTransform: 'uppercase', letterSpacing: 2, fontWeight: 'bold' }} value={formData.code || ''} onChange={e => setFormData({ ...formData, code: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('max_uses') || 'Max Uses'}</label>
                        <input type="number" min="0" className="form-input" placeholder={t('unlimited_uses') || '0 = Unlimited'} value={formData.max_uses || ''} onChange={e => setFormData({ ...formData, max_uses: e.target.value })} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">{t('discount_type') || 'Type'}</label>
                        <select className="form-select" value={formData.discount_type || 'fixed'} onChange={e => setFormData({ ...formData, discount_type: e.target.value })}>
                            <option value="fixed">{t('fixed_discount') || 'Fixed'}</option>
                            <option value="percentage">{t('percentage_discount') || 'Percentage (%)'}</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('discount_value') || 'Value'} *</label>
                        <input type="number" step="any" min="0" className="form-input" value={formData.discount_value || ''} onChange={e => setFormData({ ...formData, discount_value: e.target.value })} required />
                    </div>
                </div>
            </>
        )}

        <div className="form-row" style={{ marginTop: 16, padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: 'var(--primary)' }} />
                    <span>{t('valid_from') || 'Valid From'}</span>
                </label>
                <input type="date" className="form-input" value={formData.valid_from || ''} onChange={e => setFormData({ ...formData, valid_from: e.target.value })} style={{ borderRadius: '8px' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: 'var(--primary)' }} />
                    <span>{t('valid_to') || 'Valid To'}</span>
                </label>
                <input type="date" className="form-input" value={formData.valid_to || ''} onChange={e => setFormData({ ...formData, valid_to: e.target.value })} style={{ borderRadius: '8px' }} />
            </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('save') || 'Save'}</button>
            <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ flex: 1 }}>{t('cancel') || 'Cancel'}</button>
        </div>
    </form>
));

export default OffersAndCoupons;
