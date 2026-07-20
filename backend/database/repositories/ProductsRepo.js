const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class ProductsRepo {
    constructor(db) { this.db = db; }
    
    async getAll() {
        return await Product.find({}).sort({ name: 1 }).lean();
    }

    async getAllSortedBySales() {
        const products = await Product.find({}).lean();
        const invoices = await Invoice.find({ type: 'sales' }).lean();
        const salesMap = {};
        for (const inv of invoices) {
            for (const item of inv.items || []) {
                if (item.product_id) {
                    salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
                }
            }
        }
        const result = products.map(p => ({
            ...p,
            total_sold: salesMap[p.id] || 0
        }));
        result.sort((a, b) => {
            if (b.total_sold !== a.total_sold) {
                return b.total_sold - a.total_sold;
            }
            return a.name.localeCompare(b.name);
        });
        return result;
    }

    async bulkCreate(productsArray) {
        try {
            if (!Array.isArray(productsArray) || productsArray.length === 0) {
                return { success: true, count: 0 };
            }

            const sequenceDocument = await Counter.findByIdAndUpdate(
                'products',
                { $inc: { seq: productsArray.length } },
                { new: true, upsert: true }
            );
            let nextId = sequenceDocument.seq - productsArray.length + 1;

            const lastDoc = await Product.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/P(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }

            const docsToInsert = [];
            for (const p of productsArray) {
                const code = p.code || `P${String(nextNumVal++).padStart(4, '0')}`;
                const warehouseStock = parseFloat(p.warehouse_stock) || 0;
                const shopStock = parseFloat(p.shop_stock) || 0;
                const totalStock = warehouseStock + shopStock;

                docsToInsert.push({
                    id: nextId++,
                    code,
                    name: p.name,
                    description: p.description || '',
                    unit: p.unit || 'قطعة',
                    category: p.category || '',
                    purchase_price: p.purchase_price || 0,
                    sale_price: p.sale_price || 0,
                    stock_quantity: totalStock,
                    min_stock: p.min_stock || 0,
                    image: p.image || null,
                    supplier_id: p.supplier_id !== undefined ? p.supplier_id : null,
                    supplier_ids: Array.isArray(p.supplier_ids) ? p.supplier_ids : [],
                    warehouse_stock: warehouseStock,
                    shop_stock: shopStock,
                    dozen_price: p.dozen_price || 0,
                    dozen_qty: p.dozen_qty || 1,
                    is_active: p.is_active !== undefined ? p.is_active : true
                });
            }

            await Product.insertMany(docsToInsert);
            return { success: true, count: docsToInsert.length };
        } catch (e) {
            console.error('Bulk create error:', e);
            return { success: false, error: e.message };
        }
    }

    async create(p) {
        try {
            const lastDoc = await Product.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/P(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            const code = p.code || `P${String(nextNumVal).padStart(4, '0')}`;
            const warehouseStock = parseFloat(p.warehouse_stock) || 0;
            const shopStock = parseFloat(p.shop_stock) || 0;
            const totalStock = warehouseStock + shopStock;
            
            const nextId = await getNextSequenceValue('products');
            await Product.create({
                id: nextId, code, name: p.name, description: p.description, unit: p.unit, category: p.category,
                purchase_price: p.purchase_price || 0, sale_price: p.sale_price || 0, stock_quantity: totalStock,
                min_stock: p.min_stock || 0, image: p.image || null, supplier_id: p.supplier_id !== undefined ? p.supplier_id : null,
                supplier_ids: Array.isArray(p.supplier_ids) ? p.supplier_ids : [],
                warehouse_stock: warehouseStock, shop_stock: shopStock, dozen_price: p.dozen_price || 0,
                dozen_qty: parseFloat(p.dozen_qty) > 0 ? parseFloat(p.dozen_qty) : 1
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(p) {
        try {
            const warehouseStock = parseFloat(p.warehouse_stock) || 0;
            const shopStock = parseFloat(p.shop_stock) || 0;
            const totalStock = warehouseStock + shopStock;
            
            await Product.updateOne({ id: p.id }, {
                $set: {
                    name: p.name, description: p.description, unit: p.unit, category: p.category,
                    purchase_price: p.purchase_price || 0, sale_price: p.sale_price || 0, stock_quantity: totalStock,
                    min_stock: p.min_stock || 0, image: p.image || null, supplier_id: p.supplier_id !== undefined ? p.supplier_id : null,
                    supplier_ids: Array.isArray(p.supplier_ids) ? p.supplier_ids : [],
                    is_active: p.is_active ? true : false, warehouse_stock: warehouseStock, shop_stock: shopStock,
                    dozen_price: p.dozen_price || 0, dozen_qty: parseFloat(p.dozen_qty) > 0 ? parseFloat(p.dozen_qty) : 1
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const numId = parseInt(id, 10);
            await Product.deleteOne({ id: numId });
            await DeletedRecord.create({ entity_type: 'product', entity_id: numId });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async deleteAll() {
        try {
            const products = await Product.find({}, 'id').lean();
            const ids = products.map(p => p.id);
            const count = await Product.countDocuments();
            await Product.deleteMany({});
            for (const id of ids) {
                await DeletedRecord.create({ entity_type: 'product', entity_id: id });
            }
            return { success: true, deleted: count };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getSyncData(lastSyncTime) {
        try {
            let filter = {};
            let deletedFilter = null;
            
            if (lastSyncTime) {
                const lastSync = new Date(lastSyncTime);
                filter = {
                    $or: [
                        { updated_at: { $gt: lastSync } },
                        { created_at: { $gt: lastSync } }
                    ]
                };
                deletedFilter = {
                    entity_type: 'product',
                    deleted_at: { $gt: lastSync }
                };
            }

            // 1. Fetch updated/new products
            const updatedProducts = await Product.find(filter).lean();

            // Calculate total sales for these updated products (for sales-based sorting in POS)
            const productIds = updatedProducts.map(p => p.id);
            const invoices = await Invoice.find({ type: 'sales', 'items.product_id': { $in: productIds } }).lean();
            const salesMap = {};
            for (const inv of invoices) {
                for (const item of inv.items || []) {
                    if (item.product_id && productIds.includes(item.product_id)) {
                        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0);
                    }
                }
            }

            const changes = updatedProducts.map(p => ({
                ...p,
                _id: p._id ? p._id.toString() : undefined,
                created_at: p.created_at ? p.created_at.toISOString() : undefined,
                updated_at: p.updated_at ? p.updated_at.toISOString() : undefined,
                total_sold: salesMap[p.id] || 0
            }));

            // 2. Fetch deleted product IDs
            let deletedIds = [];
            if (deletedFilter) {
                const deletedRecords = await DeletedRecord.find(deletedFilter).lean();
                deletedIds = deletedRecords.map(r => r.entity_id);
            }

            return {
                success: true,
                changes,
                deleted: deletedIds,
                syncTime: new Date().toISOString(),
                dbSignature: `${mongoose.connection.host}/${mongoose.connection.name}`
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async addWarehouseStock(productId, quantity) {
        try {
            const id = parseInt(productId, 10);
            const qty = parseFloat(quantity) || 0;
            if (!id || qty <= 0) return { success: false, error: 'Invalid product or quantity' };
            await Product.updateOne(
                { id },
                { $inc: { warehouse_stock: qty, stock_quantity: qty } }
            );
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getMovements(productId, startDate, endDate) {
        try {
            const filter = {
                'items.product_id': parseInt(productId, 10)
            };
            if (startDate || endDate) {
                filter.date = {};
                if (startDate) filter.date.$gte = startDate;
                if (endDate) filter.date.$lte = endDate;
            }
            const invoices = await Invoice.find(filter).sort({ date: -1, id: -1 }).lean();
            
            const movements = [];
            for (const inv of invoices) {
                const item = inv.items.find(ii => ii.product_id === parseInt(productId, 10));
                if (item) {
                    let customerName = '';
                    let supplierName = '';
                    if (inv.customer_id) {
                        const c = await Customer.findOne({ id: inv.customer_id }).lean();
                        customerName = c ? c.name : '';
                    }
                    if (inv.supplier_id) {
                        const s = await Supplier.findOne({ id: inv.supplier_id }).lean();
                        supplierName = s ? s.name : '';
                    }
                    movements.push({
                        id: inv.id,
                        invoice_id: inv.id,
                        invoice_number: inv.invoice_number,
                        type: inv.type,
                        date: inv.date,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        discount: item.discount,
                        total: item.total,
                        status: inv.status,
                        customer_name: customerName,
                        supplier_name: supplierName
                    });
                }
            }
            return { success: true, movements };
        } catch (e) {
            return { success: false, error: e.message, movements: [] };
        }
    }
}

module.exports = ProductsRepo;
