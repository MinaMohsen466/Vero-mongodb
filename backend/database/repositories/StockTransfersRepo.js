const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class StockTransfersRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const transfers = await StockTransfer.find({}).sort({ date: -1, id: -1 }).lean();
        for (const tr of transfers) {
            for (const item of tr.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
                item.product_code = p ? p.code : '';
            }
        }
        return transfers;
    }

    async getById(id) {
        const tr = await StockTransfer.findOne({ id }).lean();
        if (tr) {
            for (const item of tr.items || []) {
                const p = await Product.findOne({ id: item.product_id }).lean();
                item.product_name = p ? p.name : '';
                item.product_code = p ? p.code : '';
            }
            return tr;
        }
        return null;
    }

    async create(transfer) {
        try {
            let nextNumNum = 1;
            const lastTransfer = await StockTransfer.findOne().sort({ id: -1 }).lean();
            if (lastTransfer && lastTransfer.transfer_number) {
                const match = lastTransfer.transfer_number.match(/TR-(\d+)/);
                if (match) {
                    nextNumNum = parseInt(match[1], 10) + 1;
                }
            }
            const num = transfer.transfer_number || `TR-${String(nextNumNum).padStart(6, '0')}`;
            const direction = transfer.direction || 'shop_to_warehouse';

            const allowNegativeSetting = await Setting.findOne({ key: 'allow_negative_stock' }).lean();
            const allowNegative = allowNegativeSetting && (allowNegativeSetting.value === 'yes' || allowNegativeSetting.value === '1');

            if (!allowNegative) {
                for (const item of transfer.items || []) {
                    const productId = parseInt(item.product_id, 10);
                    const quantity = parseFloat(item.quantity) || 0;
                    if (!productId || quantity <= 0) continue;

                    const product = await Product.findOne({ id: productId });
                    if (!product) continue;

                    if (direction === 'warehouse_to_shop') {
                        if ((product.warehouse_stock || 0) < quantity) {
                            return { 
                                success: false, 
                                error: `الكمية المطلوبة للتحويل من المستودع غير متوفرة للمنتج "${product.name}" (المتاح: ${product.warehouse_stock || 0}، المطلوب: ${quantity})` 
                            };
                        }
                    } else {
                        if ((product.shop_stock || 0) < quantity) {
                            return { 
                                success: false, 
                                error: `الكمية المطلوبة للتحويل من المحل غير متوفرة للمنتج "${product.name}" (المتاح: ${product.shop_stock || 0}، المطلوب: ${quantity})` 
                            };
                        }
                    }
                }
            }

            const items = (transfer.items || []).map(item => ({
                product_id: parseInt(item.product_id, 10),
                quantity: parseFloat(item.quantity) || 0
            })).filter(item => item.product_id && item.quantity > 0);

            const nextId = await getNextSequenceValue('stock_transfers');
            await StockTransfer.create({
                id: nextId, transfer_number: num, date: transfer.date, status: transfer.status || 'completed',
                notes: transfer.notes || null, direction, created_by: transfer.created_by || null,
                items
            });

            for (const item of items) {
                if (direction === 'warehouse_to_shop') {
                    await Product.updateOne({ id: item.product_id }, {
                        $inc: { warehouse_stock: -item.quantity, shop_stock: item.quantity }
                    });
                } else {
                    await Product.updateOne({ id: item.product_id }, {
                        $inc: { shop_stock: -item.quantity, warehouse_stock: item.quantity }
                    });
                }
            }

            return { success: true, id: nextId, transfer_number: num };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const transfer = await this.getById(id);
            if (!transfer) return { success: false, error: 'Transfer not found' };

            const direction = transfer.direction || 'shop_to_warehouse';
            for (const item of transfer.items || []) {
                if (item.product_id) {
                    if (direction === 'warehouse_to_shop') {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { warehouse_stock: item.quantity, shop_stock: -item.quantity }
                        });
                    } else {
                        await Product.updateOne({ id: item.product_id }, {
                            $inc: { shop_stock: item.quantity, warehouse_stock: -item.quantity }
                        });
                    }
                }
            }

            await StockTransfer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = StockTransfersRepo;
