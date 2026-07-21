const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  DeletedRecord, getNextSequenceValue 
} = require('../models');

class OffersRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        return await Offer.find({}).sort({ id: -1 }).lean();
    }

    async getActive() {
        const now = new Date().toISOString().split('T')[0];
        return await Offer.find({
            is_active: true,
            $and: [
                { $or: [{ valid_from: null }, { valid_from: { $lte: now } }] },
                { $or: [{ valid_to: null }, { valid_to: { $gte: now } }] }
            ]
        }).lean();
    }

    async create(data) {
        try {
            const nextId = await getNextSequenceValue('offers');
            await Offer.create({
                id: nextId, title: data.title, offer_type: data.offer_type,
                discount_value: data.discount_value || 0, target_type: data.target_type,
                target_id: data.target_id || null, buy_qty: data.buy_qty || 0,
                get_qty: data.get_qty || 0, valid_from: data.valid_from || null,
                valid_to: data.valid_to || null, is_active: data.is_active !== undefined ? (data.is_active ? true : false) : true
            });
            return { success: true, id: nextId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(data) {
        try {
            await Offer.updateOne({ id: data.id }, {
                $set: {
                    title: data.title, offer_type: data.offer_type,
                    discount_value: data.discount_value || 0, target_type: data.target_type,
                    target_id: data.target_id || null, buy_qty: data.buy_qty || 0,
                    get_qty: data.get_qty || 0, valid_from: data.valid_from || null,
                    valid_to: data.valid_to || null, is_active: data.is_active ? true : false
                }
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            await Offer.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

module.exports = OffersRepo;
