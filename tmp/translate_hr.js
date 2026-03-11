const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'HR.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to replace exactly
const r = (searchValue, replaceValue) => {
    content = content.replace(searchValue, replaceValue);
};
const rAll = (searchValue, replaceValue) => {
    content = content.replaceAll(searchValue, replaceValue);
};

// 1. Add t to Components
r('function EmployeesTab() {', `function EmployeesTab() {\n    const { t } = useAuth();`);
r('function DeductionsTab() {', `function DeductionsTab() {\n    const { t, user } = useAuth();`);
r('export default function HR() {', `export default function HR() {\n    const { t } = useAuth();`);

// 2. Translate Constants (keeping their structure but replacing strings)
// TABS
rAll(`    { id: 'employees', label: 'الموظفون', icon: Users },`, `    { id: 'employees', label: t('hr_employees') || 'Employees', icon: Users },`);
rAll(`    { id: 'salaries', label: 'الرواتب', icon: DollarSign },`, `    { id: 'salaries', label: t('hr_salaries') || 'Salaries', icon: DollarSign },`);
rAll(`    { id: 'leaves', label: 'الإجازات', icon: Calendar },`, `    { id: 'leaves', label: t('hr_leaves') || 'Leaves', icon: Calendar },`);
rAll(`    { id: 'deductions', label: 'الخصومات', icon: AlertCircle },`, `    { id: 'deductions', label: t('hr_deductions') || 'Deductions', icon: AlertCircle },`);

// Array constants
rAll(`const TABS = [`, `const getTabs = (t) => [`);
rAll(`const LEAVE_TYPES = ['سنوية', 'مرضية', 'طارئة', 'بدون راتب', 'أخرى'];`, `const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid', 'other'];\nconst getLeaveTypeLabel = (val, t) => {\n    const map = { annual: t('hr_leave_annual') || 'Annual', sick: t('hr_leave_sick') || 'Sick', emergency: t('hr_leave_emergency') || 'Emergency', unpaid: t('hr_leave_unpaid') || 'Unpaid', other: t('hr_leave_other') || 'Other' };\n    return map[val] || val;\n};`);
rAll(`const LEAVE_STATUS = { pending: 'قيد الانتظار', approved: 'معتمدة', rejected: 'مرفوضة' };`, `const getLeaveStatusLabel = (val, t) => {\n    const map = { pending: t('hr_status_pending') || 'Pending', approved: t('hr_status_approved') || 'Approved', rejected: t('hr_status_rejected') || 'Rejected' };\n    return map[val] || val;\n};`);
rAll(`const DEPT_LIST = ['الإدارة', 'المحاسبة', 'المبيعات', 'المخازن', 'الإنتاج', 'الموارد البشرية', 'تقنية المعلومات', 'أخرى'];`, `const getDeptList = (t) => [\n    { val: 'management', label: t('dept_management') || 'Management' },\n    { val: 'accounting', label: t('dept_accounting') || 'Accounting' },\n    { val: 'sales', label: t('dept_sales') || 'Sales' },\n    { val: 'warehouse', label: t('dept_warehouse') || 'Warehouse' },\n    { val: 'production', label: t('dept_production') || 'Production' },\n    { val: 'hr', label: t('dept_hr') || 'HR' },\n    { val: 'it', label: t('dept_it') || 'IT' },\n    { val: 'other', label: t('dept_other') || 'Other' }\n];`);

// Fix Tabs usage
rAll(`TABS.map(tab => {`, `getTabs(t).map(tab => {`);
rAll(`{LEAVE_STATUS[l.status] || l.status}`, `{getLeaveStatusLabel(l.status, t)}`);
rAll(`LEAVE_STATUS[status]`, `getLeaveStatusLabel(status, t)`);

// Dept list usage
rAll(`{DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}`, `{getDeptList(t).map(d => <option key={d.val} value={d.val}>{d.label}</option>)}`);

// Leave types form and logic
// LeavesTab form init
rAll(`leave_type: 'سنوية'`, `leave_type: 'annual'`);
rAll(`{LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}`, `{LEAVE_TYPES.map(type => <option key={type} value={type}>{getLeaveTypeLabel(type, t)}</option>)}`);
// Table rendering leave type
rAll(`<td>{l.leave_type}</td>`, `<td>{getLeaveTypeLabel(l.leave_type, t)}</td>`);
// Logic involving unpaid leave
rAll(`leave.leave_type === 'بدون راتب'`, `leave.leave_type === 'unpaid'`);
rAll(`form.leave_type === 'بدون راتب'`, `form.leave_type === 'unpaid'`);
rAll(`إجازة بدون راتب - \${leave.days} يوم`, `Unpaid leave - \${leave.days} days`);

// To be safe with replacements let's just use string mappings.
const dict = {
    "'اسم الموظف مطلوب'": "t('hr_emp_name_required') || 'Employee name is required'",
    "'تم تعديل بيانات الموظف'": "t('hr_emp_updated') || 'Employee data updated'",
    "'تمت إضافة الموظف وإنشاء حساب الراتب تلقائياً'": "t('hr_emp_added') || 'Employee added and payroll account created automatically'",
    "'حدث خطأ'": "t('errorOccurred') || 'An error occurred'",
    "'هل أنت متأكد من حذف الموظف؟'": "t('hr_emp_delete_confirm') || 'Are you sure you want to delete this employee?'",
    "'تم حذف الموظف بنجاح'": "t('hr_emp_deleted') || 'Employee deleted successfully'",
    "'حدث خطأ أثناء الحذف'": "t('error_deleting') || 'Error occurred while deleting'",
    '"بحث عن موظف..."': "t('hr_search_emp') || 'Search for employee...'",
    "إضافة موظف": "t('hr_add_emp') || 'Add Employee'",
    "لا يوجد موظفون": "t('hr_no_emps') || 'No Employees'",
    "قم بإضافة موظف جديد للبدء": "t('hr_add_emp_to_start') || 'Add a new employee to get started'",
    // Table Headers
    "<th>الكود</th>": "<th>{t('code') || 'Code'}</th>",
    "<th>الاسم</th>": "<th>{t('name') || 'Name'}</th>",
    "<th>المسمى الوظيفي</th>": "<th>{t('job_title') || 'Job Title'}</th>",
    "<th>القسم</th>": "<th>{t('department') || 'Department'}</th>",
    "<th>الراتب الأساسي</th>": "<th>{t('base_salary') || 'Base Salary'}</th>",
    "<th>حساب الراتب</th>": "<th>{t('payroll_account') || 'Payroll Account'}</th>",
    "<th>الحالة</th>": "<th>{t('status') || 'Status'}</th>",
    "<th>إجراءات</th>": "<th>{t('actions') || 'Actions'}</th>",
    "نشط": "{t('active') || 'Active'}",
    "موقوف": "{t('inactive') || 'Inactive'}",
    'title="تعديل"': 'title={t("edit") || "Edit"}',
    'title="حذف"': 'title={t("delete") || "Delete"}',
    "تعديل موظف": "t('hr_edit_emp') || 'Edit Employee'",
    "إضافة موظف جديد": "t('hr_new_emp') || 'New Employee'",
    "إلغاء": "{t('cancel') || 'Cancel'}",
    "حفظ التغييرات": "t('save_changes') || 'Save Changes'",
    "إضافة": "t('add') || 'Add'",
    "الاسم الكامل *": "{t('full_name') || 'Full Name'} *",
    'placeholder="أدخل اسم الموظف"': 'placeholder={t("enter_emp_name") || "Enter employee name"}',
    'placeholder="مثال: محاسب، مدير مبيعات"': 'placeholder={t("job_title_example") || "e.g., Accountant, Sales Manager"}',
    "اختر القسم": "{t('select_department') || 'Select Department'}",
    "تاريخ التعيين": "{t('hire_date') || 'Hire Date'}",
    'placeholder="0.000"': 'placeholder="0.000"',
    "رقم الهاتف": "{t('phone') || 'Phone'}",
    'placeholder="مثال: 9XXXXXXXX"': 'placeholder="e.g.: 9XXXXXXXX"',
    "البريد الإلكتروني": "{t('email') || 'Email'}",
    "رقم الهوية": "{t('national_id') || 'National ID'}",
    "رقم الحساب البنكي (IBAN)": "{t('bank_account_iban') || 'Bank Account (IBAN)'}",
    "العنوان": "{t('address') || 'Address'}",
    "ملاحظات": "{t('notes') || 'Notes'}",
    "الموظف نشط": "{t('emp_active') || 'Employee Active'}",
    "⚡ سيتم إنشاء حساب محاسبي تلقائياً تحت حساب رواتب الموظفين عند الإضافة": "{t('hr_account_creation_note') || '⚡ An accounting account will be automatically created under the payroll account upon addition'}",

    // Salaries
    "'اختر الموظف والشهر'": "t('hr_select_emp_month') || 'Select employee and month'",
    "`✅ تم صرف الراتب | رقم: ${result.payment_number} | الصافي: ${Number(result.net_salary).toFixed(3)}`": "`✅ ${t('hr_salary_paid') || 'Salary Paid'} | ${t('number') || 'No.'}: ${result.payment_number} | ${t('net') || 'Net'}: ${Number(result.net_salary).toFixed(3)}`",
    "'حذف سند الراتب؟ سيتم عكس القيد المحاسبي.'": "t('hr_salary_delete_confirm') || 'Delete salary voucher? Accounting entry will be reversed.'",
    "'تم حذف سند الراتب بنجاح'": "t('hr_salary_deleted') || 'Salary voucher deleted successfully'",
    "صرف راتب": "t('hr_pay_salary') || 'Pay Salary'",
    "لا يوجد مدفوعات رواتب": "t('hr_no_salary_payments') || 'No Salary Payments'",
    'اضغط "صرف راتب" لإضافة أول صرف': "t('hr_click_pay_salary') || 'Click \"Pay Salary\" to add the first payment'",
    "<th>رقم السند</th>": "<th>{t('voucher_number') || 'Voucher No.'}</th>",
    "<th>الموظف</th>": "<th>{t('employee') || 'Employee'}</th>",
    "<th>الشهر</th>": "<th>{t('month') || 'Month'}</th>",
    "<th>الخصومات</th>": "<th>{t('deductions') || 'Deductions'}</th>",
    "<th>الصافي</th>": "<th>{t('net_salary') || 'Net Salary'}</th>",
    "<th>الصرف</th>": "<th>{t('payment_method') || 'Payment'}</th>",
    "<th>القيد</th>": "<th>{t('journal_entry') || 'Entry'}</th>",
    "'🏦 صندوق'": "'🏦 ' + (t('cash') || 'Cash')",
    "'🏛️ بنك'": "'🏛️ ' + (t('bank') || 'Bank')",
    "مرتبط": "t('linked') || 'Linked'",
    "صرف راتب موظف": "t('hr_pay_emp_salary') || 'Pay Employee Salary'",
    "اختر الموظف": "{t('select_employee') || 'Select Employee'}",
    "موظف": "t('employee') || 'Employee'",
    "تاريخ الصرف": "{t('payment_date') || 'Payment Date'}",
    "خصم محسوب تلقائياً": "t('hr_auto_deduction') || 'Auto Deduction'",
    "'خصم'": "t('deduction') || 'Deduction'",
    "طريقة الصرف *": "{t('payment_method') || 'Payment Method'} *",
    "'🏦 الصندوق'": "'🏦 ' + (t('cash') || 'Cash')",
    "'🏛️ البنك'": "'🏛️ ' + (t('bank') || 'Bank')",
    "حساب الدفع (اختياري)": "{t('payment_account_optional') || 'Payment Account (Optional)'}",
    "الحساب الافتراضي للطريقة المختارة": "t('default_account_for_method') || 'Default account for selected method'",
    "صافي الراتب": "{t('net_salary') || 'Net Salary'}",

    // Leaves
    "'يرجى ملء جميع الحقول المطلوبة'": "t('fill_required_fields') || 'Please fill out all required fields'",
    "'تم تقديم طلب الإجازة بنجاح'": "t('hr_leave_requested') || 'Leave request submitted successfully'",
    "'حدث خطأ أثناء حفظ الإجازة'": "t('hr_leave_save_error') || 'Error saving leave request'",
    "`تم تغيير حالة الإجازة إلى ${LEAVE_STATUS[status]}`": "`\"${t('hr_leave_status_changed') || 'Leave status changed to'} ${getLeaveStatusLabel(status, t)}\"`",
    "'حذف طلب الإجازة؟'": "t('hr_leave_delete_confirm') || 'Delete leave request?'",
    "'تم حذف الإجازة بنجاح'": "t('hr_leave_deleted') || 'Leave request deleted successfully'",
    "'حدث خطأ أثناء حذف الإجازة'": "t('hr_leave_delete_error') || 'Error deleting leave request'",
    "كل الموظفين": "t('all_employees') || 'All Employees'",
    "طلب إجازة": "t('hr_request_leave') || 'Request Leave'",
    "لا يوجد إجازات": "t('hr_no_leaves') || 'No Leaves'",
    "<th>نوع الإجازة</th>": "<th>{t('leave_type') || 'Leave Type'}</th>",
    "<th>من</th>": "<th>{t('from') || 'From'}</th>",
    "<th>إلى</th>": "<th>{t('to') || 'To'}</th>",
    "<th>الأيام</th>": "<th>{t('days') || 'Days'}</th>",
    "<th>السبب</th>": "<th>{t('reason') || 'Reason'}</th>",
    "يوم": "{t('day') || 'day'}",
    'title="اعتماد"': 'title={t("approve") || "Approve"}',
    'title="رفض"': 'title={t("reject") || "Reject"}',
    "إلغاء (Esc)": "t('cancel_esc') || 'Cancel (Esc)'",
    "حفظ (Ctrl+S)": "t('save_ctrl_s') || 'Save (Ctrl+S)'",
    "الموظف *": "{t('employee') || 'Employee'} *",
    "نوع الإجازة *": "{t('leave_type') || 'Leave Type'} *",
    "عدد الأيام": "{t('number_of_days') || 'Number of Days'}",
    "من تاريخ *": "{t('from_date') || 'From Date'} *",
    "إلى تاريخ *": "{t('to_date') || 'To Date'} *",
    "⚠️ تكلفة الإجازة بدون راتب": "{t('hr_unpaid_leave_cost') || '⚠️ Unpaid Leave Cost'}",
    "المعدل اليومي:": "{t('daily_rate') || 'Daily Rate'}:",
    "د.ك": "{t('currency_kd') || 'KD'}",
    "الخصم المتوقع:": "{t('expected_deduction') || 'Expected Deduction'}:",
    "سيتم إضافة خصم تلقائياً عند اعتماد الإجازة": "{t('hr_deduction_auto_add_note') || 'A deduction will be added automatically upon leave approval'}",
    "السبب": "{t('reason') || 'Reason'}",
    'placeholder="سبب الإجازة"': 'placeholder={t("leave_reason") || "Leave Reason"}',

    // Deductions
    "'يرجى ملء جميع الحقول'": "t('fill_all_fields') || 'Please fill in all fields'",
    "'تمت إضافة الخصم بنجاح'": "t('hr_deduction_added') || 'Deduction added successfully'",
    "'حدث خطأ أثناء حفظ الخصم'": "t('hr_deduction_save_error') || 'Error saving deduction'",
    "'حذف الخصم؟'": "t('hr_deduction_delete_confirm') || 'Delete deduction?'",
    "'تم حذف الخصم بنجاح'": "t('hr_deduction_deleted') || 'Deduction deleted successfully'",
    "'حدث خطأ أثناء حذف الخصم'": "t('hr_deduction_delete_error') || 'Error deleting deduction'",
    "إضافة خصم": "t('hr_add_deduction') || 'Add Deduction'",
    "لا يوجد خصومات": "t('hr_no_deductions') || 'No Deductions'",
    "<th>المبلغ</th>": "<th>{t('amount') || 'Amount'}</th>",
    "<th>التاريخ</th>": "<th>{t('date') || 'Date'}</th>",
    "الشهر *": "{t('month') || 'Month'} *",
    "مبلغ الخصم *": "{t('deduction_amount') || 'Deduction Amount'} *",
    "سبب الخصم": "{t('deduction_reason') || 'Deduction Reason'}",
    'placeholder="مثال: غياب بدون عذر، سلفة..."': 'placeholder={t("deduction_reason_example") || "e.g., Unexcused absence, Loan..."}',

    // Main HR Page
    "إدارة شؤون الموظفين": "{t('menu_hr') || 'HR Management'}",
    "إدارة الموظفين والرواتب والإجازات والخصومات": "{t('hr_management_desc') || 'Manage employees, salaries, leaves, and deductions'}",
};

for (const [key, value] of Object.entries(dict)) {
    rAll(key, value);
}

// Special fixes that dictate JS template strings
rAll('`\\"${t(\\\'hr_leave_status_changed\\\') || \\\'Leave status changed to\\\'} ${getLeaveStatusLabel(status, t)}\\"`', "`\${t('hr_leave_status_changed') || 'Leave status changed to'} \${getLeaveStatusLabel(status, t)}`");

// Let's run it again specifically for a few untranslated elements seen in UI
rAll("<th>الاسم</th>", "<th>{t('name') || 'Name'}</th>");
rAll("<th>المسمى الوظيفي</th>", "<th>{t('job_title') || 'Job Title'}</th>");
rAll(">الاسم الكامل *<", ">{t('full_name') || 'Full Name'} *<");
rAll(">الراتب الأساسي<", ">{t('base_salary') || 'Base Salary'}<");
rAll(">تاريخ التعيين<", ">{t('hire_date') || 'Hire Date'}<");
rAll(">رقم الهاتف<", ">{t('phone') || 'Phone'}<");
rAll(">رقم الهوية<", ">{t('national_id') || 'National ID'}<");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
