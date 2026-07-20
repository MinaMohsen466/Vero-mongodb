const mongoose = require('mongoose');
const { 
  Counter, User, Permission, UserPermission, Customer, Supplier, Account, Product, 
  Invoice, Voucher, JournalEntry, Setting, Employee, EmployeeLeave, EmployeeDeduction, 
  SalaryPayment, Expense, Coupon, Offer, ActivityLog, Return, StockTransfer, 
  InstallmentPlan, InstallmentPayment, DeletedRecord, getNextSequenceValue 
} = require('../models');

class EmployeesRepo {
    constructor(db) { this.db = db; }

    async getAll() {
        const employees = await Employee.find({}).sort({ name: 1 }).lean();
        for (const e of employees) {
            if (e.account_id) {
                const a = await Account.findOne({ id: e.account_id }).lean();
                e.account_name = a ? a.name : '';
                e.account_code = a ? a.code : '';
            }
        }
        return employees;
    }

    async getById(id) {
        const e = await Employee.findOne({ id }).lean();
        if (e && e.account_id) {
            const a = await Account.findOne({ id: e.account_id }).lean();
            e.account_name = a ? a.name : '';
            e.account_code = a ? a.code : '';
        }
        return e;
    }

    async create(emp) {
        try {
            const lastDoc = await Employee.findOne().sort({ id: -1 }).lean();
            let nextNumVal = 1;
            if (lastDoc && lastDoc.code) {
                const match = lastDoc.code.match(/EMP(\d+)$/i);
                if (match) {
                    nextNumVal = parseInt(match[1], 10) + 1;
                }
            }
            let empNum = nextNumVal;
            let code = emp.code;
            if (!code) {
                do {
                    code = `EMP${String(empNum).padStart(4, '0')}`;
                    const exists = await Employee.findOne({ code });
                    if (!exists) break;
                    empNum++;
                } while (true);
            }

            let mainSalary = await Account.findOne({ code: '52' });
            if (!mainSalary) {
                const expParent = await Account.findOne({ code: '5' });
                const nextId = await getNextSequenceValue('accounts');
                await Account.create({
                    id: nextId, code: '52', name: 'مصروفات الرواتب', parent_id: expParent ? expParent.id : null,
                    account_type: 'expense', nature: 'debit', can_post: false
                });
                mainSalary = await Account.findOne({ code: '52' });
            }

            let salaryParent = await Account.findOne({ code: '521' });
            if (!salaryParent) {
                const nextId = await getNextSequenceValue('accounts');
                await Account.create({
                    id: nextId, code: '521', name: 'رواتب الموظفين', parent_id: mainSalary ? mainSalary.id : null,
                    account_type: 'expense', nature: 'debit', can_post: false
                });
                salaryParent = await Account.findOne({ code: '521' });
            }

            let suffix = empNum;
            let empAccountCode;
            do {
                empAccountCode = `521${String(suffix).padStart(4, '0')}`;
                const exists = await Account.findOne({ code: empAccountCode });
                if (!exists) break;
                suffix++;
            } while (suffix < empNum + 500);

            const empAccountName = `راتب ${emp.name}`;
            const nextAccId = await getNextSequenceValue('accounts');
            await Account.create({
                id: nextAccId, code: empAccountCode, name: empAccountName,
                parent_id: salaryParent ? salaryParent.id : null,
                account_type: 'expense', nature: 'debit', can_post: true
            });

            const nextId = await getNextSequenceValue('employees');
            await Employee.create({
                id: nextId, code, name: emp.name, job_title: emp.job_title || '',
                department: emp.department || '', hire_date: emp.hire_date || '',
                base_salary: emp.base_salary || 0, phone: emp.phone || '', email: emp.email || '',
                national_id: emp.national_id || '', address: emp.address || '',
                account_id: nextAccId, bank_account: emp.bank_account || '', notes: emp.notes || ''
            });

            return { success: true, id: nextId, account_id: nextAccId };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async update(emp) {
        try {
            await Employee.updateOne({ id: emp.id }, {
                $set: {
                    name: emp.name, job_title: emp.job_title || '', department: emp.department || '',
                    hire_date: emp.hire_date || '', base_salary: emp.base_salary || 0, phone: emp.phone || '',
                    email: emp.email || '', national_id: emp.national_id || '', address: emp.address || '',
                    bank_account: emp.bank_account || '', notes: emp.notes || '', is_active: emp.is_active ? true : false
                }
            });
            if (emp.account_id) {
                await Account.updateOne({ id: emp.account_id }, { $set: { name: `راتب ${emp.name}` } });
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async delete(id) {
        try {
            const emp = await this.getById(id);
            if (!emp) return { success: false, error: 'الموظف غير موجود' };
            const salariesCount = await SalaryPayment.countDocuments({ employee_id: id });
            if (salariesCount > 0) return { success: false, error: 'لا يمكن حذف موظف لديه مدفوعات رواتب' };
            await Employee.deleteOne({ id });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getSummary(id) {
        const emp = await this.getById(id);
        if (!emp) return null;
        const leaves = await EmployeeLeave.find({ employee_id: id }).sort({ start_date: -1 }).lean();
        const deductions = await EmployeeDeduction.find({ employee_id: id }).sort({ created_at: -1 }).lean();
        const salaries = await SalaryPayment.find({ employee_id: id }).sort({ month: -1 }).lean();
        return { employee: emp, leaves, deductions, salaries };
    }
}

module.exports = EmployeesRepo;
