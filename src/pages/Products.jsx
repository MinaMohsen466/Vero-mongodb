import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Package } from 'lucide-react';
import Modal from '../components/Modal';

function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', unit: 'قطعة', category: '', purchase_price: '', sale_price: '', min_stock: ''
    });

    const units = ['قطعة', 'كيلو', 'جرام', 'متر', 'لتر', 'علبة', 'كرتونة', 'طن', 'حبة', 'عبوة', 'ربطة', 'كيس'];

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
        const data = { ...formData, purchase_price: parseFloat(formData.purchase_price) || 0, sale_price: parseFloat(formData.sale_price) || 0, min_stock: parseFloat(formData.min_stock) || 0, stock_quantity: 0 };

        if (editingProduct) {
            await window.api.products.update({ ...data, id: editingProduct.id, stock_quantity: editingProduct.stock_quantity, is_active: true });
        } else {
            await window.api.products.create(data);
        }
        loadProducts();
        closeModal();
    };

    const handleDelete = async (id) => {
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            await window.api.products.delete(id);
            loadProducts();
        }
    };

    const openModal = (product = null) => {
        setEditingProduct(product);
        if (product) {
            const isCustomUnit = !units.includes(product.unit);
            setShowCustomUnit(isCustomUnit);
            setFormData({
                name: product.name, description: product.description || '', unit: isCustomUnit ? product.unit : product.unit,
                category: product.category || '', purchase_price: product.purchase_price || '', sale_price: product.sale_price || '', min_stock: product.min_stock || ''
            });
        } else {
            setShowCustomUnit(false);
            setFormData({ name: '', description: '', unit: 'قطعة', category: '', purchase_price: '', sale_price: '', min_stock: '' });
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

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-KW', { minimumFractionDigits: 3 }).format(amount || 0) + ' د.ك';

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code?.includes(searchQuery));

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div>
            <div className="page-header">
                <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingRight: '40px', width: '300px' }} />
                    <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> منتج جديد</button>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state"><Package size={48} /><h3>لا توجد منتجات</h3><p>قم بإضافة منتج جديد</p></div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>الكود</th><th>الاسم</th><th>الوحدة</th><th>سعر الشراء</th><th>سعر البيع</th><th>الكمية</th><th>الإجراءات</th></tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.code}</td>
                                            <td className="font-bold">{p.name}</td>
                                            <td>{p.unit}</td>
                                            <td>{formatCurrency(p.purchase_price)}</td>
                                            <td>{formatCurrency(p.sale_price)}</td>
                                            <td><span className={`badge ${p.stock_quantity <= (p.min_stock || 0) ? 'badge-danger' : 'badge-success'}`}>{p.stock_quantity || 0}</span></td>
                                            <td>
                                                <div className="table-actions">
                                                    <button className="btn btn-ghost btn-sm" onClick={() => openModal(p)}><Edit2 size={16} /></button>
                                                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
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

            <Modal isOpen={showModal} onClose={closeModal} title={editingProduct ? 'تعديل منتج' : 'منتج جديد'} footer={<><button className="btn btn-secondary" onClick={closeModal}>إلغاء</button><button className="btn btn-primary" onClick={handleSubmit}>حفظ</button></>}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">اسم المنتج *</label>
                        <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">الوصف</label>
                        <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '60px' }} />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">الوحدة</label>
                            {showCustomUnit ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder="أدخل الوحدة" style={{ flex: 1 }} />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowCustomUnit(false); setFormData({ ...formData, unit: 'قطعة' }); }}>إلغاء</button>
                                </div>
                            ) : (
                                <select className="form-select" value={formData.unit} onChange={(e) => handleUnitChange(e.target.value)}>
                                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                                    <option value="__custom__">+ وحدة مخصصة...</option>
                                </select>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">التصنيف</label>
                            <input type="text" className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">سعر الشراء</label>
                            <input type="number" className="form-input" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} step="0.001" min="0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">سعر البيع</label>
                            <input type="number" className="form-input" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} step="0.001" min="0" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">الحد الأدنى للمخزون</label>
                        <input type="number" className="form-input" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} min="0" />
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Products;
