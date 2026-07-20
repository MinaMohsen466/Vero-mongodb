const CounterModule = require('./Counter');
const User = require('./User');
const Permission = require('./Permission');
const UserPermission = require('./UserPermission');
const Customer = require('./Customer');
const Supplier = require('./Supplier');
const Account = require('./Account');
const Product = require('./Product');
const DeletedRecord = require('./DeletedRecord');
const Invoice = require('./Invoice');
const Voucher = require('./Voucher');
const JournalEntry = require('./JournalEntry');
const Setting = require('./Setting');
const Employee = require('./Employee');
const EmployeeLeave = require('./EmployeeLeave');
const EmployeeDeduction = require('./EmployeeDeduction');
const SalaryPayment = require('./SalaryPayment');
const Expense = require('./Expense');
const Coupon = require('./Coupon');
const Offer = require('./Offer');
const ActivityLog = require('./ActivityLog');
const Return = require('./Return');
const StockTransfer = require('./StockTransfer');
const InstallmentPlan = require('./InstallmentPlan');
const InstallmentPayment = require('./InstallmentPayment');

module.exports = {
  Counter: CounterModule.Counter,
  getNextSequenceValue: CounterModule.getNextSequenceValue,
  syncSequence: CounterModule.syncSequence,
  User,
  Permission,
  UserPermission,
  Customer,
  Supplier,
  Account,
  Product,
  DeletedRecord,
  Invoice,
  Voucher,
  JournalEntry,
  Setting,
  Employee,
  EmployeeLeave,
  EmployeeDeduction,
  SalaryPayment,
  Expense,
  Coupon,
  Offer,
  ActivityLog,
  Return,
  StockTransfer,
  InstallmentPlan,
  InstallmentPayment,
};
