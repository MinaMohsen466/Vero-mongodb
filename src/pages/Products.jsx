import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package, Image as ImageIcon } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';

function Products() {
    const { user, t } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [formData, setFormData] = useState({
        name: '', description: '', unit: t('prod_piece') || 'Piece', category: '', purchase_price: '', sale_price: '', min_stock: '', image: ''
    });
    const searchInputRef = React.useRef(null);

    useShortcuts({
        Save: (e) => {
            if (showModal) {
                const btn = document.querySelector('#product-form button[type="submit"]') || document.querySelector('button[form="product-form"]');
                if (btn) btn.click();
                else handleSubmit(e);
            }
        },
        New: () => {
            if (!showModal && user?.permissions?.products?.can_create) openModal();
        },
        Escape: () => {
            if (showModal) closeModal();
        },
        Search: () => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }
    });

    const units = [t('unit_drum') || 'Drum', t('unit_gallon') || 'Gallon', t('unit_liter') || 'Liter', t('unit_kilo') || 'Kilo', t('unit_gram') || 'Gram', t('prod_piece') || 'Piece', t('unit_box') || 'Box', t('unit_carton') || 'Carton'];

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        try {
            const data = await window.api.products.getAll();
            setProducts(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { ...formData, purchase_price: parseFloat(formData.purchase_price) || 0, sale_price: parseFloat(formData.sale_price) || 0, min_stock: parseFloat(formData.min_stock) || 0, stock_quantity: 0 };

            if (editingProduct) {
                await window.api.products.update({ ...data, id: editingProduct.id, stock_quantity: editingProduct.stock_quantity, is_active: true });
                toast.success(t('savedSuccess') || 'Product updated successfully');
            } else {
                await window.api.products.create(data);
                toast.success(t('savedSuccess') || 'Product added successfully');
            }
            loadProducts();
            closeModal();
        } catch (error) {
            console.error(error);
            toast.error(t('errorOccurred') || 'An error occurred while saving the product');
        }
    };

    const handleDelete = async (id) => {
        if (confirm(t('prod_deleteConfirm') || 'Are you sure you want to delete this product?')) {
            try {
                await window.api.products.delete(id);
                toast.success(t('savedSuccess') || 'Product deleted successfully');
                loadProducts();
            } catch (error) {
                console.error(error);
                toast.error(t('errorOccurred') || 'An error occurred while deleting the product');
            }
        }
    };

    const openModal = (product = null) => {
        setEditingProduct(product);
        if (product) {
            const isCustomUnit = !units.includes(product.unit);
            setShowCustomUnit(isCustomUnit);
            setFormData({
                name: product.name, description: product.description || '', unit: isCustomUnit ? product.unit : product.unit,
                category: product.category || '', purchase_price: product.purchase_price || '', sale_price: product.sale_price || '', min_stock: product.min_stock || '', image: product.image || ''
            });
        } else {
            setShowCustomUnit(false);
            setFormData({ name: '', description: '', unit: t('prod_piece') || 'Piece', category: '', purchase_price: '', sale_price: '', min_stock: '', image: '' });
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingProduct(null); setShowCustomUnit(false); };

    const handleUnitChange = (value) => {
        if (value === '__custom__') {
            setShowCustomUnit(true);
            setFormData({ ...formData, unit: '' });
        } else {
            setShowCustomUnit(false);
            setFormData({ ...formData, unit: value });
        }
    };

    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3 }).format(num) + ' ' + (t('currency_kd') || 'KD');
    };

    const handleImageUpload = async () => {
        try {
            const result = await window.api.dialog.openFile({
                properties: ['openFile'],
                filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
            });
            if (!result.canceled && result.filePaths.length > 0) {
                const base64 = await window.api.file.readAsBase64(result.filePaths[0]);
                if (base64) {
                    const img = new Image();
                    img.src = base64;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_DIMENSION = 400;

                        if (width > height) {
                            if (width > MAX_DIMENSION) {
                                height = Math.round(height * (MAX_DIMENSION / width));
                                width = MAX_DIMENSION;
                            }
                        } else {
                            if (height > MAX_DIMENSION) {
                                width = Math.round(width * (MAX_DIMENSION / height));
                                height = MAX_DIMENSION;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        setFormData(prev => ({ ...prev, image: compressedBase64 }));
                    };
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(t('errorOccurred') || 'An error occurred while uploading the image');
        }
    };

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    const filteredProducts = products.filter(p =>
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code?.includes(searchQuery)) &&
        (!categoryFilter || p.category === categoryFilter)
    ).sort((a, b) => b.id - a.id);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="form-input"
                            placeholder={t('search') + " (Ctrl+F)"}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingRight: '40px', width: '250px' }}
                        /><Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>
                    {categories.length > 0 && (
                        <select className="form-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '160px', margin: 0 }}>
                            <option value="">{t('all') || 'All Categories'}</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                    {(searchQuery || categoryFilter) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} style={{ color: 'var(--text-muted)' }}>✕ {t('clear') || 'Clear'}</button>
                    )}
                </div>
                {user?.permissions?.products?.can_create && (
                    <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> {t('prod_add')}</button>
                )}
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state"><Package size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>{t('code')}</th><th>{t('prod_name')}</th><th>{t('prod_category')}</th><th>{t('prod_unit')}</th><th>{t('prod_salePrice')}</th><th>{t('prod_stock')}</th><th>{t('actions')}</th></tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.code}</td>
                                            <td className="font-bold">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {p.image ? (
                                                        <img src={p.image} alt={p.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                                    ) : (
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                    {p.name}
                                                </div>
                                            </td>
                                            <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.category || '—'}</span></td>
                                            <td>{p.unit}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCurrency(p.sale_price)}</td>
                                            <td><span className={`badge ${p.stock_quantity <= (p.min_stock || 0) ? 'badge-danger' : 'badge-success'}`}>{p.stock_quantity || 0}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    {user?.permissions?.products?.can_edit && (
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openModal(p)}><Edit2 size={16} /></button>
                                                    )}
                                                    {user?.permissions?.products?.can_delete && (
                                                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={closeModal}
                title={editingProduct ? t('prod_edit') : t('prod_add')}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('cancel')} (Esc)</button>
                        <button type="submit" form="product-form" className="btn btn-primary">{t('save')} (Ctrl+S)</button>
                    </>
                }
            >
                <form id="product-form" onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <div className="form-group">
                                <label className="form-label">{t('prod_name')} *</label>
                                <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                        </div>
                        <div style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }} onClick={handleImageUpload}>
                                {formData.image ? (
                                    <img src={formData.image} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                                        <ImageIcon size={24} />
                                        <span style={{ fontSize: '0.65rem', marginTop: '4px' }}>{t('image') || 'Image'}</span>
                                    </div>
                                )}
                            </div>
                            {formData.image && (
                                <button type="button" onClick={() => setFormData({ ...formData, image: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>{t('delete') || 'Delete'}</button>
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('description')}</label>
                        <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('prod_unit')}</label>
                            {showCustomUnit ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder={t('prod_enterUnit') || "Enter unit"} style={{ flex: 1 }} />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowCustomUnit(false); setFormData({ ...formData, unit: t('prod_piece') || 'Piece' }); }}>{t('cancel') || 'Cancel'}</button>
                                </div>
                            ) : (
                                <select className="form-select" value={formData.unit} onChange={(e) => handleUnitChange(e.target.value)}>
                                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                                    <option value="__custom__">{t('prod_customUnit') || "+ Custom unit..."}</option>
                                </select>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('prod_category')}</label>
                            <input type="text" list="categories-list" className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                            <datalist id="categories-list">
                                {categories.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">{t('prod_purchasePrice')}</label>
                            <input type="number" className="form-input" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} step="0.250" min="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('prod_salePrice')}</label>
                            <input type="number" className="form-input" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} step="0.250" min="0" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('prod_minStock')}</label>
                        <input type="number" className="form-input" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} min="0" />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Products;
