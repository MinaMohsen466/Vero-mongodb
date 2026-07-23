import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Package, Image as ImageIcon, BarChart2, TrendingUp, TrendingDown, X, Calendar, RefreshCw, Upload, Download } from 'lucide-react';
import Modal from '../components/Modal';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';
import { useShortcuts } from '../hooks/useShortcuts';
import * as XLSX from 'xlsx/dist/xlsx.full.min.js';
import SearchableSelect from '../components/SearchableSelect';

const parseExcelNumber = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/,/g, '').trim();
    return parseFloat(cleanStr) || 0;
};

const normalizeDozenQty = (qty) => {
    const n = parseExcelNumber(qty);
    return n > 0 ? n : 1;
};

const EXCEL_BORDER = {
    top: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    bottom: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    left: { style: 'thin', color: { argb: 'FFB4C6E7' } },
    right: { style: 'thin', color: { argb: 'FFB4C6E7' } },
};

function Products() {
    const { user, t } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 150);
        return () => clearTimeout(handler);
    }, [searchQuery]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showCustomUnit, setShowCustomUnit] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [formData, setFormData] = useState({
        name: '', description: '', unit: t('prod_piece') || 'قطعة', category: '', purchase_price: '', sale_price: '', warehouse_stock: '', shop_stock: '', min_stock: '', image: '', supplier_id: '', supplier_ids: [],
        dozen_price: '', dozen_qty: 1, code: ''
    });
    const [showMovementsModal, setShowMovementsModal] = useState(false);
    const [selectedProductForTracking, setSelectedProductForTracking] = useState(null);
    const [movements, setMovements] = useState([]);
    const [loadingMovements, setLoadingMovements] = useState(false);
    const [trackStartDate, setTrackStartDate] = useState('');
    const [trackEndDate, setTrackEndDate] = useState('');
    const searchInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const [showImportConflictModal, setShowImportConflictModal] = useState(false);
    const [importConflicts, setImportConflicts] = useState([]);
    const [currentConflictIdx, setCurrentConflictIdx] = useState(0);
    const [pendingNewProducts, setPendingNewProducts] = useState([]);
    const [resolvedUpdateProducts, setResolvedUpdateProducts] = useState([]);
    const [resolvedNewProducts, setResolvedNewProducts] = useState([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const [topSalesCount, setTopSalesCount] = useState(() => {
        const saved = localStorage.getItem('top_sales_count');
        return saved !== null ? parseInt(saved, 10) : 10;
    });

    const topSellingProducts = [...products]
        .filter(p => (p.total_sold || 0) > 0)
        .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
        .slice(0, topSalesCount);
    const topProductIds = new Set(topSellingProducts.map(p => p.id));

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchQuery, categoryFilter]);

    const handleExportProducts = async () => {
        if (!products || products.length === 0) {
            toast.error(t('noData'));
            return;
        }
        
        try {
            const headers = [
                t('code') || 'Code',
                t('prod_name') || 'Name',
                t('description') || 'Description',
                t('prod_category') || 'Category',
                t('prod_unit') || 'Unit',
                t('prod_purchasePrice') || 'Purchase_Price',
                t('prod_dozenPrice') || 'Dozen_Price',
                t('prod_dozenQty') || 'Dozen_Qty',
                t('prod_salePrice') || 'Sale_Price',
                t('prod_stock') || 'Stock_Quantity',
                t('prod_minStock') || 'Min_Stock'
            ];

            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Products', {
                views: [{ state: 'frozen', ySplit: 1, xSplit: 0, topLeftCell: 'A2', activeCell: 'A2' }],
            });

            sheet.columns = [
                { width: 14 }, { width: 28 }, { width: 24 }, { width: 16 }, { width: 12 },
                { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 }, { width: 12 },
            ];

            const headerRow = sheet.addRow(headers);
            headerRow.height = 28;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = EXCEL_BORDER;
            });

            products.forEach((p, idx) => {
                const rowNum = idx + 2;
                const dozenQty = normalizeDozenQty(p.dozen_qty);
                const row = sheet.addRow([
                    p.code || '',
                    p.name || '',
                    p.description || '',
                    p.category || '',
                    p.unit || '',
                    p.purchase_price || 0,
                    p.dozen_price || 0,
                    dozenQty,
                    p.sale_price || 0,
                    p.stock_quantity || 0,
                    p.min_stock || 0,
                ]);

                row.getCell(6).value = {
                    formula: `IF(H${rowNum}>0,G${rowNum}/H${rowNum},${p.purchase_price || 0})`,
                    result: p.purchase_price || 0,
                };

                const fillColor = idx % 2 === 1 ? 'FFDEEAF6' : 'FFFFFFFF';
                row.eachCell((cell, colNumber) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
                    cell.font = { size: 10, color: { argb: 'FF333333' } };
                    cell.alignment = { vertical: 'middle', horizontal: colNumber >= 6 ? 'right' : 'left' };
                    cell.border = EXCEL_BORDER;
                    if (colNumber === 6 || colNumber === 7 || colNumber === 9) {
                        cell.numFmt = '#,##0.000';
                    } else if (colNumber === 8 || colNumber === 10 || colNumber === 11) {
                        cell.numFmt = '#,##0.00';
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success(t('savedSuccess') || 'Exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('errorOccurred'));
        }
    };

    const handleImportProducts = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (rows.length < 2) {
                    toast.error(t('errorOccurred') || 'Invalid file format');
                    return;
                }

                // Detect headers dynamically with normalization (resolves spelling/spacing variants)
                const normalizeHeader = (str) => {
                    if (!str) return '';
                    return String(str)
                        .trim()
                        .toLowerCase()
                        .replace(/ى/g, 'ي') // Normalize dotless ya (ى) to normal ya (ي)
                        .replace(/\s+/g, ' '); // Normalize spaces
                };

                const headers = (rows[0] || []).map(h => normalizeHeader(h));
                const findColIndex = (keys) => {
                    const normalizedKeys = keys.map(k => normalizeHeader(k));
                    // Try exact match first to prevent substring collisions (e.g. "الكمية" matching "الكمية في الدرزن")
                    let idx = headers.findIndex(h => normalizedKeys.some(k => h === k));
                    if (idx !== -1) return idx;
                    // Fallback to substring matching
                    return headers.findIndex(h => normalizedKeys.some(k => h.includes(k)));
                };

                const codeIdx = findColIndex(['code', 'الكود', 'كود', 'رمز الصنف', 'باركود', 'الباركود', 'كود المنتج', 'رقم المنتج', 'رقم الصنف']);
                const nameIdx = findColIndex(['name', 'الاسم', 'اسم', 'اسم المنتج', 'اسم الصنف', 'الصنف', 'المنتج', 'بيان الصنف', 'اسم المادة', 'المادة', 'الوصف العام']);
                const descIdx = findColIndex(['description', 'الوصف', 'وصف', 'تفاصيل', 'بيان', 'ملاحظات']);
                const catIdx = findColIndex(['category', 'القسم', 'التصنيف', 'قسم', 'تصنيف', 'الفئة', 'المجموعة', 'اسم القسم']);
                const unitIdx = findColIndex(['unit', 'الوحدة', 'وحدة', 'نوع الوحدة']);
                const purchasePriceIdx = findColIndex(['purchase', 'شراء', 'الشراء', 'سعر الشراء', 'تكلفة', 'التكلفة', 'سعر التكلفة']);
                const dozenPriceIdx = findColIndex(['dozen price', 'سعر الدرزن', 'درزن', 'جملة', 'سعر الجملة']);
                const dozenQtyIdx = findColIndex(['dozen qty', 'الكمية في الدرزن', 'كمية الدرزن', 'الكمية فى الدرزن', 'العدد في الدرزن', 'العدد فى الدرزن', 'عدد الدرزن']);
                const salePriceIdx = findColIndex(['sale', 'بيع', 'البيع', 'سعر البيع', 'سعر القطعة', 'المفرق', 'سعر المفرق']);
                const stockIdx = findColIndex(['stock', 'الكمية', 'المخزون', 'رصيد', 'كمية المخزن', 'مخزون المحل', 'الكمية بالمخزون', 'الرصيد', 'العدد', 'الكميه']);
                const minStockIdx = findColIndex(['min', 'الحد الأدنى', 'الحد الادنى', 'أقل كمية', 'اقل كمية']);

                const getVal = (row, idx, fallbackIdx) => {
                    const realIdx = idx !== -1 ? idx : fallbackIdx;
                    return row[realIdx];
                };

                const productsToImport = [];
                
                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i];
                    if (!values || values.length === 0 || !values.some(v => v !== null && v !== undefined && v !== '')) {
                        continue;
                    }
                    
                    const codeVal = getVal(values, codeIdx, 0);
                    let nameVal = getVal(values, nameIdx, 1);
                    const descVal = getVal(values, descIdx, 2);
                    const catVal = getVal(values, catIdx, 3);
                    const unitVal = getVal(values, unitIdx, 4);
                    const purchaseVal = getVal(values, purchasePriceIdx, 5);
                    const dozenPriceVal = getVal(values, dozenPriceIdx, -1);
                    const dozenQtyVal = getVal(values, dozenQtyIdx, -1);
                    const hasDozenHeaders = dozenPriceIdx !== -1 || dozenQtyIdx !== -1;
                    const saleVal = getVal(values, salePriceIdx, hasDozenHeaders ? 8 : 6);
                    const stockVal = getVal(values, stockIdx, hasDozenHeaders ? 9 : 7);
                    const minStockVal = getVal(values, minStockIdx, hasDozenHeaders ? 10 : 8);

                    let pName = nameVal !== undefined && nameVal !== null ? String(nameVal).trim() : '';
                    if (!pName) {
                        // Fallback: search row for first non-numeric text cell
                        for (let c = 0; c < values.length; c++) {
                            const valStr = String(values[c] || '').trim();
                            if (valStr && isNaN(valStr) && valStr.length > 1) {
                                pName = valStr;
                                break;
                            }
                        }
                    }

                    const dPrice = dozenPriceVal !== undefined && dozenPriceVal !== null ? parseExcelNumber(dozenPriceVal) : 0;
                    const dQty = dozenQtyVal !== undefined && dozenQtyVal !== null && dozenQtyVal !== ''
                        ? normalizeDozenQty(dozenQtyVal)
                        : 1;
                    let pPrice = parseExcelNumber(purchaseVal);
                    if (pPrice === 0 && dPrice > 0 && dQty > 0) {
                        pPrice = dPrice / dQty;
                    }

                    const productData = {
                        code: codeVal !== undefined && codeVal !== null ? String(codeVal).trim() : '',
                        name: pName,
                        description: descVal !== undefined && descVal !== null ? String(descVal).trim() : '',
                        category: catVal !== undefined && catVal !== null ? String(catVal).trim() : '',
                        unit: unitVal !== undefined && unitVal !== null ? String(unitVal).trim() : t('prod_piece') || 'قطعة',
                        purchase_price: pPrice,
                        dozen_price: dPrice,
                        dozen_qty: dQty,
                        sale_price: parseExcelNumber(saleVal),
                        shop_stock: parseExcelNumber(stockVal),
                        warehouse_stock: 0,
                        min_stock: parseExcelNumber(minStockVal),
                        is_active: true
                    };

                    if (productData.name) {
                        productsToImport.push(productData);
                    }
                }
                
                if (productsToImport.length > 0) {
                    const currentDbProds = await window.api.products.getAll();
                    const nameMap = new Map();
                    const codeMap = new Map();
                    (currentDbProds || []).forEach(p => {
                        if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
                        if (p.code) codeMap.set(p.code.trim().toLowerCase(), p);
                    });

                    const uniqueList = [];
                    const conflictList = [];

                    productsToImport.forEach(imp => {
                        const normName = (imp.name || '').trim().toLowerCase();
                        const normCode = (imp.code || '').trim().toLowerCase();

                        const match = (normCode && codeMap.get(normCode)) || (normName && nameMap.get(normName));
                        if (match) {
                            conflictList.push({ imported: imp, existing: match });
                        } else {
                            uniqueList.push(imp);
                        }
                    });

                    if (conflictList.length > 0) {
                        setPendingNewProducts(uniqueList);
                        setImportConflicts(conflictList);
                        setCurrentConflictIdx(0);
                        setResolvedUpdateProducts([]);
                        setResolvedNewProducts([]);
                        setShowImportConflictModal(true);
                    } else {
                        const result = await window.api.products.bulkCreate(uniqueList);
                        if (result && result.success) {
                            toast.success(`تم استيراد وحفظ ${uniqueList.length} منتج جديد بنجاح`);
                            loadProducts();
                        } else {
                            toast.error(result?.error || 'حدث خطأ أثناء حفظ المنتجات المستوردة');
                        }
                    }
                } else {
                    toast.error('لم يتم العثور على أي منتجات صالحة للاستيراد في الملف. يرجى التأكد من احتواء الشيت على عمود باسم المنتج.');
                }
            } catch (error) {
                console.error('Import error:', error);
                toast.error('حدث خطأ أثناء قراءة ملف الإكسيل: ' + (error.message || 'فشل القراءة'));
            }
            e.target.value = null;
        };
        reader.readAsArrayBuffer(file);
    };

    const finishImportProcess = async (toUpdate, toCreate) => {
        setIsProcessingImport(true);
        let updatedCount = 0;
        let createdCount = 0;
        try {
            for (const item of toUpdate) {
                const res = await window.api.products.update(item);
                if (res && res.success) updatedCount++;
            }

            if (toCreate.length > 0) {
                const res = await window.api.products.bulkCreate(toCreate);
                if (res && res.success) createdCount = res.count || toCreate.length;
            }

            toast.success(`تم إكمال الاستيراد بنجاح: تم إضافة ${createdCount} منتج جديد، وتحديث ${updatedCount} منتج.`);
            loadProducts();
        } catch (err) {
            console.error('Error completing import:', err);
            toast.error('حدث خطأ أثناء معالجة الاستيراد');
        }
        setIsProcessingImport(false);
        setShowImportConflictModal(false);
        setImportConflicts([]);
        setPendingNewProducts([]);
        setResolvedUpdateProducts([]);
        setResolvedNewProducts([]);
    };

    const handleConflictDecision = async (decision, applyToAll = false) => {
        let newUpdates = [...resolvedUpdateProducts];
        let newCreates = [...resolvedNewProducts];

        const conflictsToProcess = applyToAll
            ? importConflicts.slice(currentConflictIdx)
            : [importConflicts[currentConflictIdx]];

        conflictsToProcess.forEach(item => {
            if (decision === 'replace') {
                newUpdates.push({
                    ...item.existing,
                    name: item.imported.name || item.existing.name,
                    code: item.imported.code || item.existing.code,
                    category: item.imported.category || item.existing.category,
                    unit: item.imported.unit || item.existing.unit,
                    purchase_price: item.imported.purchase_price !== 0 ? item.imported.purchase_price : item.existing.purchase_price,
                    sale_price: item.imported.sale_price !== 0 ? item.imported.sale_price : item.existing.sale_price,
                    shop_stock: (item.existing.shop_stock || 0) + (item.imported.shop_stock || 0),
                    min_stock: item.imported.min_stock !== 0 ? item.imported.min_stock : item.existing.min_stock,
                    dozen_price: item.imported.dozen_price !== 0 ? item.imported.dozen_price : item.existing.dozen_price,
                    dozen_qty: item.imported.dozen_qty || item.existing.dozen_qty
                });
            } else if (decision === 'create_new') {
                newCreates.push({
                    ...item.imported,
                    code: '' // Let bulkCreate generate a new unique code
                });
            }
        });

        if (applyToAll || currentConflictIdx >= importConflicts.length - 1) {
            const allNewToCreate = [...pendingNewProducts, ...newCreates];
            await finishImportProcess(newUpdates, allNewToCreate);
        } else {
            setResolvedUpdateProducts(newUpdates);
            setResolvedNewProducts(newCreates);
            setCurrentConflictIdx(prev => prev + 1);
        }
    };

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

    const units = [t('unit_drum') || 'برميل', t('unit_gallon') || 'جالون', t('unit_liter') || 'لتر', t('unit_kilo') || 'كيلو', t('unit_gram') || 'جرام', t('prod_piece') || 'قطعة', t('unit_box') || 'علبة', t('unit_carton') || 'كرتون'];

    useEffect(() => {
        loadProducts();
        window.addEventListener('productsUpdated', loadProducts);
        return () => window.removeEventListener('productsUpdated', loadProducts);
    }, []);

    const loadProducts = async () => {
        try {
            const [data, supps] = await Promise.all([
                window.api.products.getAllSortedBySales(),
                window.api.suppliers.getAll()
            ]);
            setProducts(data || []);
            setSuppliers(supps || []);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Uniqueness validation
            const nameLower = (formData.name || '').trim().toLowerCase();
            const codeLower = (formData.code || '').trim().toLowerCase();

            if (!nameLower) {
                toast.error(t('name_required') || 'اسم المنتج مطلوب!');
                setSaving(false);
                return;
            }

            const isNameChanged = !editingProduct || editingProduct.name.trim().toLowerCase() !== nameLower;
            if (isNameChanged) {
                const duplicateName = products.some(p => 
                    p.name.trim().toLowerCase() === nameLower && 
                    (!editingProduct || String(p.id) !== String(editingProduct.id))
                );
                if (duplicateName) {
                    toast.error(t('product_name_exists') || 'اسم المنتج هذا موجود بالفعل!');
                    setSaving(false);
                    return;
                }
            }

            if (codeLower) {
                const isCodeChanged = !editingProduct || (editingProduct.code || '').trim().toLowerCase() !== codeLower;
                if (isCodeChanged) {
                    const duplicateCode = products.some(p => 
                        (p.code || '').trim().toLowerCase() === codeLower && 
                        (!editingProduct || String(p.id) !== String(editingProduct.id))
                    );
                    if (duplicateCode) {
                        toast.error(t('product_code_exists') || 'كود المنتج هذا مستخدم بالفعل!');
                        setSaving(false);
                        return;
                    }
                }
            }

            const selectedSupplierIds = Array.isArray(formData.supplier_ids) ? formData.supplier_ids : [];
            const primarySupplierId = selectedSupplierIds.length > 0 ? Number(selectedSupplierIds[0]) : null;

            const data = { 
                ...formData, 
                purchase_price: parseFloat(formData.purchase_price) || 0, 
                sale_price: parseFloat(formData.sale_price) || 0, 
                warehouse_stock: parseFloat(formData.warehouse_stock) || 0,
                shop_stock: parseFloat(formData.shop_stock) || 0,
                min_stock: parseFloat(formData.min_stock) || 0,
                dozen_qty: normalizeDozenQty(formData.dozen_qty),
                dozen_price: parseFloat(formData.dozen_price) || 0,
                supplier_id: primarySupplierId,
                supplier_ids: selectedSupplierIds
            };

            let result;
            if (editingProduct) {
                result = await window.api.products.update({ ...data, id: editingProduct.id, is_active: true });
                if (result.success) {
                    toast.success(t('savedSuccess') || 'Product updated successfully');
                } else {
                    toast.error(result.error || t('errorOccurred'));
                    setSaving(false);
                    return;
                }
            } else {
                result = await window.api.products.create(data);
                if (result.success) {
                    toast.success(t('savedSuccess') || 'Product added successfully');
                } else {
                    toast.error(result.error || t('errorOccurred'));
                    setSaving(false);
                    return;
                }
            }
            loadProducts();
            closeModal();
        } catch (error) {
            console.error(error);
            toast.error(t('errorOccurred') || 'An error occurred while saving the product');
        } finally {
            setSaving(false);
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

    const openModal = async (product = null) => {
        setEditingProduct(product);
        setSupplierSearchQuery('');
        if (product) {
            const isCustomUnit = !units.includes(product.unit);
            setShowCustomUnit(isCustomUnit);
            
            let parsedIds = [];
            if (product.supplier_ids) {
                try {
                    parsedIds = JSON.parse(product.supplier_ids);
                } catch (e) {
                    parsedIds = product.supplier_id ? [product.supplier_id] : [];
                }
            } else if (product.supplier_id) {
                parsedIds = [product.supplier_id];
            }

            setFormData({
                name: product.name, description: product.description || '', unit: isCustomUnit ? product.unit : product.unit,
                category: product.category || '', purchase_price: product.purchase_price || '', sale_price: product.sale_price || '', warehouse_stock: product.warehouse_stock || '', shop_stock: product.shop_stock || '', min_stock: product.min_stock || '', image: product.image || '',
                supplier_id: product.supplier_id || '',
                supplier_ids: parsedIds,
                dozen_price: product.dozen_price !== undefined && product.dozen_price !== null ? product.dozen_price : '',
                dozen_qty: normalizeDozenQty(product.dozen_qty),
                code: product.code || ''
            });
            setShowModal(true);
        } else {
            setShowCustomUnit(false);
            setSaving(true);
            try {
                const nextCode = await window.api.products.getNextCode();
                setFormData({
                    name: '', description: '', unit: t('prod_piece') || 'قطعة', category: '', purchase_price: '', sale_price: '', warehouse_stock: '', shop_stock: '', min_stock: '', image: '', supplier_id: '', supplier_ids: [], dozen_price: '', dozen_qty: 1,
                    code: nextCode
                });
                setShowModal(true);
            } catch (e) {
                console.error(e);
            } finally {
                setSaving(false);
            }
        }
    };

    const closeModal = () => { setShowModal(false); setEditingProduct(null); setShowCustomUnit(false); setSupplierSearchQuery(''); };

    const openMovementsModal = async (product) => {
        setSelectedProductForTracking(product);
        setShowMovementsModal(true);
        setTrackStartDate('');
        setTrackEndDate('');
        setLoadingMovements(true);
        try {
            const result = await window.api.products.getMovements(product.id, '', '');
            setMovements(result?.movements || []);
        } catch (e) {
            console.error(e);
            setMovements([]);
        }
        setLoadingMovements(false);
    };

    const applyDateFilter = async () => {
        if (!selectedProductForTracking) return;
        setLoadingMovements(true);
        try {
            const result = await window.api.products.getMovements(
                selectedProductForTracking.id,
                trackStartDate || null,
                trackEndDate || null
            );
            setMovements(result?.movements || []);
        } catch (e) {
            console.error(e);
            setMovements([]);
        }
        setLoadingMovements(false);
    };

    const handleUnitChange = (value) => {
        if (value === '__custom__') {
            setShowCustomUnit(true);
            setFormData({ ...formData, unit: '' });
        } else {
            setShowCustomUnit(false);
            setFormData({ ...formData, unit: value });
        }
    };

    const handleDozenPriceChange = (value) => {
        const price = parseFloat(value) || 0;
        const qty = normalizeDozenQty(formData.dozen_qty);
        const computed = price > 0 ? (price / qty).toFixed(3) : '';
        setFormData(prev => ({
            ...prev,
            dozen_price: value,
            purchase_price: computed
        }));
    };

    const handleDozenQtyChange = (value) => {
        const qty = normalizeDozenQty(value);
        const price = parseFloat(formData.dozen_price) || 0;
        const computed = price > 0 ? (price / qty).toFixed(3) : '';
        setFormData(prev => ({
            ...prev,
            dozen_qty: value === '' || value === null ? value : qty,
            purchase_price: computed
        }));
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
                        const MAX_DIMENSION = 300;

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

                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        setFormData(prev => ({ ...prev, image: compressedBase64 }));
                    };
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error(t('errorOccurred') || 'An error occurred while uploading the image');
        }
    };

    const categories = useMemo(() => {
        return [...new Set(products.map(p => p.category).filter(Boolean))];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || p.code?.includes(debouncedSearchQuery)) &&
            (!categoryFilter || p.category === categoryFilter)
        ).sort((a, b) => (a.code || '').localeCompare((b.code || ''), undefined, {numeric: true, sensitivity: 'base'}));
    }, [products, debouncedSearchQuery, categoryFilter]);

    const totalItems = filteredProducts.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const activePage = Math.min(currentPage, totalPages);
    const displayedProducts = useMemo(() => {
        return filteredProducts.slice(
            (activePage - 1) * itemsPerPage,
            activePage * itemsPerPage
        );
    }, [filteredProducts, activePage, itemsPerPage]);

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    const mainContent = (
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
                        <div style={{ width: '160px' }}>
                            <SearchableSelect
                                options={categories.map(c => ({ value: c, label: c }))}
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                placeholder={t('all') || 'جميع الفئات'}
                                emptyLabel={t('all') || 'جميع الفئات'}
                            />
                        </div>
                    )}
                    {(searchQuery || categoryFilter) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setCategoryFilter(''); }} style={{ color: 'var(--text-muted)' }}>✕ {t('clear') || 'مسح'}</button>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{t('top_sales_count') || 'تحديد الأكثر مبيعاً (★):'}</span>
                        <input
                            type="number"
                            className="form-input"
                            min="0"
                            value={topSalesCount}
                            onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setTopSalesCount(val);
                                localStorage.setItem('top_sales_count', val);
                            }}
                            style={{ width: '75px', padding: '4px 8px', height: '38px', margin: 0 }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {(user?.role === 'admin' || user?.permissions?.products_export?.can_view) && (
                        <button className="btn btn-secondary" onClick={handleExportProducts} title={t('prod_export')}>
                            <Download size={18} /> {t('prod_export')}
                        </button>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.products_import?.can_view) && (
                        <>
                            <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportProducts} />
                            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} title={t('prod_import')}>
                                <Upload size={18} /> {t('prod_import')}
                            </button>
                        </>
                    )}
                    {(user?.role === 'admin' || user?.permissions?.products?.can_create) && (
                        <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> {t('prod_add')}</button>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state"><Package size={48} /><h3>{t('noData')}</h3></div>
                    ) : (
                        <>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr><th>{t('code') || 'الكود'}</th><th>{t('prod_name') || 'اسم المنتج'}</th><th>{t('prod_category') || 'الفئة'}</th><th>{t('prod_unit') || 'الوحدة'}</th><th>{t('prod_salePrice') || 'سعر البيع'}</th><th>{t('warehouse_stock') || 'مخزون المستودع'}</th><th>{t('shop_stock') || 'مخزون المحل'}</th><th>{t('total_stock') || 'إجمالي المخزون'}</th><th>{t('actions') || 'الإجراءات'}</th></tr>
                                    </thead>
                                    <tbody>
                                        {displayedProducts.map(p => (
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
                                                        {topProductIds.has(p.id) && (
                                                            <span title={`${t('total_sold') || 'إجمالي المباع'}: ${p.total_sold}`} style={{ color: '#eab308', fontSize: '1.2rem', cursor: 'help', lineHeight: 1 }}>★</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.category || '—'}</span></td>
                                                <td>{p.unit}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatCurrency(p.sale_price)}</td>
                                                <td><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.warehouse_stock || 0}</span></td>
                                                <td><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.shop_stock || 0}</span></td>
                                                <td><span className={`badge ${p.stock_quantity <= (p.min_stock || 0) ? 'badge-danger' : 'badge-success'}`}>{p.stock_quantity || 0}</span></td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openMovementsModal(p)}
                                                            title={t('prod_track') || 'تتبع حركة المنتج'}
                                                            style={{ color: 'var(--primary)' }}
                                                        >
                                                            <BarChart2 size={16} />
                                                        </button>
                                                        {(user?.role === 'admin' || user?.permissions?.products?.can_edit) && (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => openModal(p)}><Edit2 size={16} /></button>
                                                        )}
                                                        {(user?.role === 'admin' || user?.permissions?.products?.can_delete) && (
                                                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border)',
                                flexWrap: 'wrap',
                                gap: '12px',
                                background: 'var(--bg-secondary)',
                                borderBottomLeftRadius: 'var(--radius-lg)',
                                borderBottomRightRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    {t('showing') || 'عرض'} {Math.min((activePage - 1) * itemsPerPage + 1, filteredProducts.length)} - {Math.min(activePage * itemsPerPage, filteredProducts.length)} {t('of') || 'من'} {filteredProducts.length}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => setCurrentPage(1)} 
                                        disabled={activePage === 1}
                                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                                    >
                                        «
                                    </button>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                                        disabled={activePage === 1}
                                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                                    >
                                        ‹
                                    </button>
                                    
                                    {(() => {
                                        const pages = [];
                                        const maxVisiblePages = 5;
                                        let startPage = Math.max(1, activePage - 2);
                                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                        
                                        if (endPage - startPage + 1 < maxVisiblePages) {
                                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                        }
                                        
                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <button
                                                    type="button"
                                                    key={i}
                                                    className={`btn btn-sm ${activePage === i ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => setCurrentPage(i)}
                                                    style={{ minWidth: '36px', height: '36px', padding: 0, fontWeight: activePage === i ? 'bold' : 'normal' }}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        }
                                        return pages;
                                    })()}
                                    
                                    <button 
                                        type="button"
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                                        disabled={activePage === totalPages}
                                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                                    >
                                        ›
                                    </button>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => setCurrentPage(totalPages)} 
                                        disabled={activePage === totalPages}
                                        style={{ minWidth: '36px', height: '36px', padding: 0 }}
                                    >
                                        »
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('rows_per_page') || 'الصفوف لكل صفحة:'}</span>
                                    <select 
                                        className="form-select" 
                                        value={itemsPerPage} 
                                        onChange={e => {
                                            setItemsPerPage(parseInt(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        style={{ width: '80px', padding: '4px 8px', fontSize: '0.85rem', margin: 0 }}
                                    >
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <Modal isOpen={showModal} onClose={closeModal}
                size="lg"
                title={editingProduct ? t('prod_edit') : t('prod_add')}
                footer={
                    <>
                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>{t('cancel') || 'إلغاء'} (Esc)</button>
                        <button type="submit" form="product-form" className="btn btn-primary" disabled={saving}>{saving && <span className="spinner-btn" style={{ marginInlineEnd: '8px' }}></span>}{saving ? (t('savingProgress') || 'Saving...') : (t('save') || 'حفظ') + ' (Ctrl+S)'}</button>
                    </>
                }
            >
                <form id="product-form" onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                    
                    {/* العمود الأول: المعلومات الأساسية */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap-reverse' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontWeight: '600' }}>{t('code') || 'الكود'} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>({t('auto_generated') || 'تلقائي'})</span></label>
                                        <input type="text" className="form-input" value={formData.code} readOnly style={{ height: '40px', opacity: 0.7, cursor: 'default', background: 'var(--bg-secondary)' }} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontWeight: '600' }}>{t('prod_name')} *</label>
                                        <input type="text" className="form-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ height: '40px' }} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{t('prod_category')}</label>
                                    <input type="text" list="categories-list" className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ height: '40px' }} />
                                    <datalist id="categories-list">
                                        {categories.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                            </div>

                            {/* رفع الصورة */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px', flexShrink: 0, gap: '6px' }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>{t('image') || 'الصورة'}</label>
                                <div 
                                    onClick={handleImageUpload}
                                    style={{ 
                                        width: '85px', 
                                        height: '85px', 
                                        borderRadius: '12px', 
                                        border: formData.image ? '1px solid var(--border)' : '2px dashed var(--border)', 
                                        background: 'var(--bg-secondary)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        overflow: 'hidden', 
                                        cursor: 'pointer',
                                        position: 'relative',
                                        boxShadow: 'var(--shadow-sm)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    {formData.image ? (
                                        <img src={formData.image} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--text-muted)' }}>
                                            <ImageIcon size={22} />
                                        </div>
                                    )}
                                </div>
                                {formData.image && (
                                    <button type="button" onClick={() => setFormData({ ...formData, image: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', padding: 0 }}>{t('delete') || 'حذف'}</button>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('prod_unit')}</label>
                            {showCustomUnit ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="text" className="form-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} placeholder={t('prod_enterUnit') || "أدخل اسم الوحدة"} style={{ flex: 1, height: '40px' }} />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowCustomUnit(false); setFormData({ ...formData, unit: t('prod_piece') || 'قطعة' }); }}>{t('cancel') || 'إلغاء'}</button>
                                </div>
                            ) : (
                                <SearchableSelect
                                    options={[
                                        { value: '__custom__', label: t('prod_customUnit') || "+ وحدة مخصصة..." },
                                        ...units.map(u => ({ value: u, label: u }))
                                    ]}
                                    value={formData.unit}
                                    onChange={(val) => {
                                        if (val === '__custom__') {
                                            setShowCustomUnit(true);
                                        } else {
                                            handleUnitChange(val);
                                        }
                                    }}
                                    placeholder={t('prod_unit') || "الوحدة"}
                                    emptyLabel={t('prod_unit') || "الوحدة"}
                                />
                            )}
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">{t('description')}</label>
                            <textarea className="form-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ minHeight: '80px', resize: 'vertical' }} />
                        </div>
                    </div>

                    {/* العمود الثاني: الموردون والتسعير والمخزون */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>


                        {/* بطاقة الأسعار والمخزون */}
                        <div style={{ 
                            background: 'var(--surface)', 
                            border: '1px solid var(--border)', 
                            borderRadius: '12px', 
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            '--input-bg': 'var(--surface)'
                        }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '2px' }}>
                                📊 {t('prod_pricingAndStock') || 'التسعير والمخزون'}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 12px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_dozenPrice') || 'سعر الدرزن'}</label>
                                    <input type="number" className="form-input" value={formData.dozen_price} onChange={(e) => handleDozenPriceChange(e.target.value)} step="any" min="0" style={{ height: '40px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_dozenQty') || 'الكمية في الدرزن'}</label>
                                    <input type="number" className="form-input" value={formData.dozen_qty} onChange={(e) => handleDozenQtyChange(e.target.value)} step="any" min="1" style={{ height: '40px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_purchasePrice')} *</label>
                                    <input type="number" className="form-input" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value, dozen_price: '', dozen_qty: '' })} step="any" min="0" style={{ height: '40px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_salePrice')}</label>
                                    <input type="number" className="form-input" value={formData.sale_price} onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })} step="any" min="0" style={{ height: '40px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_stock') || 'مخزون المحل'}</label>
                                    <input type="number" className="form-input" value={formData.shop_stock} onChange={(e) => setFormData({ ...formData, shop_stock: e.target.value })} min="0" step="any" style={{ height: '40px' }} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>{t('prod_minStock')}</label>
                                    <input type="number" className="form-input" value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })} step="any" min="0" style={{ height: '40px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Product Movements Modal */}
            {showMovementsModal && selectedProductForTracking && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '20px'
                }} onClick={() => setShowMovementsModal(false)}>
                    <div style={{
                        background: 'var(--bg-primary)', borderRadius: '16px', width: '100%',
                        maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BarChart2 size={22} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{t('prod_track') || 'تتبع حركة المنتج'}</div>
                                    <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{selectedProductForTracking.name} — {selectedProductForTracking.code}</div>
                                </div>
                            </div>
                            <button onClick={() => setShowMovementsModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', color: 'white', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Stock & Profitability summary bar */}
                        <div style={{
                            padding: '16px 24px',
                            background: 'var(--bg-secondary)',
                            borderBottom: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '12px'
                        }}>
                            {(() => {
                                const totalIn = movements.filter(m => m.type === 'purchase').reduce((s, m) => s + (m.quantity || 0), 0);
                                const totalOut = movements.filter(m => m.type === 'sales').reduce((s, m) => s + (m.quantity || 0), 0);
                                const current = selectedProductForTracking.stock_quantity || 0;

                                const totalPurchasedValue = movements.filter(m => m.type === 'purchase').reduce((sum, m) => sum + (m.total || 0), 0);
                                const totalSalesValue = movements.filter(m => m.type === 'sales').reduce((sum, m) => sum + (m.total || 0), 0);
                                const purchasePrice = parseFloat(selectedProductForTracking.purchase_price) || 0;
                                const cogs = totalOut * purchasePrice;
                                const grossProfit = totalSalesValue - cogs;
                                const profitMargin = totalSalesValue > 0 ? (grossProfit / totalSalesValue) * 100 : 0;

                                return (
                                    <>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('prod_totalIn') || 'الكمية المشتراة'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{totalIn.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('rep_totalPurchases') || 'إجمالي المشتريات'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{formatCurrency(totalPurchasedValue)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('prod_totalOut') || 'الكمية المباعة'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{totalOut.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('rep_totalSales') || 'إجمالي المبيعات'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(totalSalesValue)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('rep_grossProfit') || 'مجمل الربح'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: grossProfit >= 0 ? '#10b981' : '#ef4444' }}>{formatCurrency(grossProfit)}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('rep_profitMargin') || 'هامش الربح'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: profitMargin >= 0 ? '#10b981' : '#ef4444' }}>{profitMargin.toFixed(1)}%</div>
                                        </div>
                                        <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>{t('prod_currentStock') || 'المخزون الحالي'}</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: current <= (selectedProductForTracking.min_stock || 0) ? '#ef4444' : '#3b82f6' }}>{current.toLocaleString()}</div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Date Range Filter */}
                        <div style={{
                            padding: '12px 24px', borderBottom: '1px solid var(--border)',
                            background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                <Calendar size={14} />
                                <span>{t('filterByDate') || 'الفترة الزمنية:'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
                                <input
                                    type="date"
                                    value={trackStartDate}
                                    onChange={e => setTrackStartDate(e.target.value)}
                                    className="form-input"
                                    style={{ width: '150px', fontSize: '0.83rem', padding: '5px 10px', margin: 0 }}
                                />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                                <input
                                    type="date"
                                    value={trackEndDate}
                                    onChange={e => setTrackEndDate(e.target.value)}
                                    className="form-input"
                                    style={{ width: '150px', fontSize: '0.83rem', padding: '5px 10px', margin: 0 }}
                                />
                                <button
                                    onClick={applyDateFilter}
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '5px 16px', fontSize: '0.82rem' }}
                                >
                                    {t('filter') || 'تصفية'}
                                </button>
                                {(trackStartDate || trackEndDate) && (
                                    <button
                                        onClick={async () => {
                                            setTrackStartDate('');
                                            setTrackEndDate('');
                                            setLoadingMovements(true);
                                            try {
                                                const result = await window.api.products.getMovements(selectedProductForTracking.id, null, null);
                                                setMovements(result?.movements || []);
                                            } catch(e) { setMovements([]); }
                                            setLoadingMovements(false);
                                        }}
                                        className="btn btn-ghost btn-sm"
                                        style={{ padding: '5px 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}
                                        title={t('clearFilter') || 'مسح التصفية'}
                                    >
                                        <RefreshCw size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Movements Table */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {loadingMovements ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
                                    <div className="spinner" />
                                </div>
                            ) : movements.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                    <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                    <p style={{ fontWeight: 500 }}>{t('prod_noMovements') || 'لا توجد حركات مسجلة لهذا المنتج'}</p>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('date')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('type')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('inv_number')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('name')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('quantity')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('prod_salePrice')}</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.map((m, i) => {
                                            const isSale = m.type === 'sales';
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {new Date(m.date).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                                            background: isSale ? '#fee2e2' : '#dcfce7',
                                                            color: isSale ? '#dc2626' : '#16a34a'
                                                        }}>
                                                            {isSale ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                                                            {isSale ? (t('sale') || 'بيع') : (t('purchase') || 'شراء')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                try {
                                                                    const freshSettings = await window.api.settings.getAll();
                                                                    setInvoiceSettings(freshSettings || {});
                                                                    const invoice = await window.api.invoices.getById(m.invoice_id);
                                                                    if (invoice) {
                                                                        setViewingInvoice({ ...invoice, _type: m.type });
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Error loading invoice:', err);
                                                                    toast.error(t('errorOccurred') || 'حدث خطأ');
                                                                }
                                                            }}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
                                                                padding: 0, textDecoration: 'underline',
                                                                textUnderlineOffset: '3px'
                                                            }}
                                                            title={t('inv_view') || 'عرض الفاتورة'}
                                                        >
                                                            {m.invoice_number}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{m.customer_name || m.supplier_name || '—'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isSale ? '#dc2626' : '#16a34a' }}>
                                                            {isSale ? '-' : '+'}{m.quantity}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatCurrency(m.unit_price)}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.88rem', fontWeight: 600 }}>{formatCurrency(m.total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {mainContent}

            {/* Conflict Modal for Duplicate Products in Import */}
            {showImportConflictModal && importConflicts[currentConflictIdx] && (
                <Modal
                    isOpen={showImportConflictModal}
                    onClose={() => setShowImportConflictModal(false)}
                    title={`⚠️ تنبيه: توجد منتجات متشابهة (${currentConflictIdx + 1} من ${importConflicts.length})`}
                    size="lg"
                    footer={
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handleConflictDecision('replace', true)}
                                    disabled={isProcessingImport}
                                    style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 600 }}
                                >
                                    ⚡ استبدال وتحديث المتبقي بالكامل
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handleConflictDecision('skip', true)}
                                    disabled={isProcessingImport}
                                    style={{ background: '#f3f4f6', color: '#4b5563', fontWeight: 600 }}
                                >
                                    ⏭️ تخطي المتبقي بالكامل
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowImportConflictModal(false)}
                                disabled={isProcessingImport}
                            >
                                إلغاء الاستيراد
                            </button>
                        </div>
                    }
                >
                    <div>
                        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', color: '#873800' }}>
                            <strong>المنتج المراد استيراده ينطبق مع منتج موجود في النظام (بالاسم أو الكود).</strong> يرجى اختيار الإجراء المناسب:
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            {/* Existing DB Product */}
                            <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '14px', background: 'var(--bg-secondary)' }}>
                                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '10px', color: 'var(--text-main)' }}>
                                    📋 المنتج الحالي في النظام
                                </div>
                                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div><strong>الاسم:</strong> {importConflicts[currentConflictIdx].existing.name}</div>
                                    <div><strong>الكود:</strong> {importConflicts[currentConflictIdx].existing.code || '-'}</div>
                                    <div><strong>القسم:</strong> {importConflicts[currentConflictIdx].existing.category || '-'}</div>
                                    <div><strong>سعر الشراء:</strong> {formatCurrency(importConflicts[currentConflictIdx].existing.purchase_price)}</div>
                                    <div><strong>سعر البيع:</strong> {formatCurrency(importConflicts[currentConflictIdx].existing.sale_price)}</div>
                                    <div><strong>كمية المحل:</strong> {importConflicts[currentConflictIdx].existing.shop_stock || 0}</div>
                                </div>
                            </div>

                            {/* Imported Product */}
                            <div style={{ border: '1px solid #b7eb8f', borderRadius: '8px', padding: '14px', background: '#f6ffed' }}>
                                <div style={{ fontWeight: 700, borderBottom: '1px solid #d9f7be', paddingBottom: '8px', marginBottom: '10px', color: '#274f10' }}>
                                    📥 المنتج المستورد من الملف
                                </div>
                                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '6px', color: '#135200' }}>
                                    <div><strong>الاسم:</strong> {importConflicts[currentConflictIdx].imported.name}</div>
                                    <div><strong>الكود:</strong> {importConflicts[currentConflictIdx].imported.code || '-'}</div>
                                    <div><strong>القسم:</strong> {importConflicts[currentConflictIdx].imported.category || '-'}</div>
                                    <div><strong>سعر الشراء:</strong> {formatCurrency(importConflicts[currentConflictIdx].imported.purchase_price)}</div>
                                    <div><strong>سعر البيع:</strong> {formatCurrency(importConflicts[currentConflictIdx].imported.sale_price)}</div>
                                    <div><strong>الكمية بالملف:</strong> {importConflicts[currentConflictIdx].imported.shop_stock || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => handleConflictDecision('replace')}
                                disabled={isProcessingImport}
                                style={{ background: '#2563eb', borderColor: '#2563eb', padding: '10px 18px', fontWeight: 700 }}
                            >
                                🔄 استبدال وتحديث المنتج الحالي
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleConflictDecision('skip')}
                                disabled={isProcessingImport}
                                style={{ padding: '10px 18px', fontWeight: 600 }}
                            >
                                ⏭️ تخطي الإدراج
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleConflictDecision('create_new')}
                                disabled={isProcessingImport}
                                style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#86efac', padding: '10px 18px', fontWeight: 600 }}
                            >
                                ➕ إدراج كـ منتج جديد (كود جديد)
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

export default Products;
