const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'HR.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const rAll = (s, r) => { content = content.replaceAll(s, r); };

// Fix literal outputs in JSX
rAll("<h3>t('hr_no_emps') || 'No Employees'</h3>", "<h3>{t('hr_no_emps') || 'No Employees'}</h3>");
rAll("<p>قم بt('hr_add_emp') || 'Add Employee' جديد للبدء</p>", "<p>{t('hr_add_emp_to_start') || 'Add a new employee to get started'}</p>");

// Fix attributes missing braces
rAll("placeholder=t('hr_search_emp') || 'Search for employee...'", "placeholder={t('hr_search_emp') || 'Search for employee...'}");

// Fix add employee button
rAll("<Plus size={18} /> t('hr_add_emp') || 'Add Employee'", "<Plus size={18} /> {t('hr_add_emp') || 'Add Employee'}");

// Fix inline conditional
rAll("? '{t('active') || 'Active'}' : '{t('inactive') || 'Inactive'}'}", "? (t('active') || 'Active') : (t('inactive') || 'Inactive')}");

// Fix modal titles
rAll("title={editing ? 't('hr_edit_emp') || 'Edit Employee'' : 't('hr_add_emp') || 'Add Employee' جديد'}", "title={editing ? (t('hr_edit_emp') || 'Edit Employee') : (t('hr_new_emp') || 'New Employee')}");

// Fix modal footer
rAll("{editing ? 't('save_changes') || 'Save Changes'' : 't('add') || 'Add''}", "{editing ? (t('save_changes') || 'Save Changes') : (t('add') || 'Add')}");

// Fix active employee checkbox label
rAll("الt('employee') || 'Employee' {t('active') || 'Active'}", "{t('employee_active') || 'Employee Active'}");

// Fix payroll account notice
rAll("⚡ سيتم إنشاء حساب محاسبي تلقائياً تحت حساب رواتب الt('employee') || 'Employee'ين عند الt('add') || 'Add'", "{t('hr_account_creation_note') || 'An accounting account will be automatically created under the payroll account upon addition'}");

// Salaries tab
rAll("<p>اضغط \"t('hr_pay_salary') || 'Pay Salary'\" لt('add') || 'Add' أول صرف</p>", "<p>{t('hr_click_pay_salary') || 'Click \"Pay Salary\" to add the first payment'}</p>");

// Salary Modal Title
rAll("title=\"t('hr_pay_salary') || 'Pay Salary' t('employee') || 'Employee'\"", "title={t('hr_pay_emp_salary') || 'Pay Employee Salary'}");

// Salary employee options
rAll("{e.name} - {e.job_title || 't('employee') || 'Employee''}", "{e.name} - {e.job_title || (t('employee') || 'Employee')}");

// Leaves missing braces
rAll("كل الt('employee') || 'Employee'ين", "{t('all_employees') || 'All Employees'}");
rAll("title=\"t('hr_request_leave') || 'Request Leave'\"", "title={t('hr_request_leave') || 'Request Leave'}");

// Unpaid leave cost warning
rAll("المعدل ال{t('day') || 'day'}ي", "{t('daily_rate') || 'Daily Rate'}");
rAll("سيتم t('add') || 'Add' خصم تلقائياً عند اعتماد الإجازة", "{t('hr_deduction_auto_add_note') || 'A deduction will be automatically added upon approval'}");

// General tabs and headers
rAll("<h3>t('hr_no_salary_payments') || 'No Salary Payments'</h3>", "<h3>{t('hr_no_salary_payments') || 'No Salary Payments'}</h3>");
rAll("<h3>t('hr_no_leaves') || 'No Leaves'</h3>", "<h3>{t('hr_no_leaves') || 'No Leaves'}</h3>");
rAll("<h3>t('hr_no_deductions') || 'No Deductions'</h3>", "<h3>{t('hr_no_deductions') || 'No Deductions'}</h3>");

// Deductions tab modals
rAll("title=\"t('hr_add_deduction') || 'Add Deduction'\"", "title={t('hr_add_deduction') || 'Add Deduction'}");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed JSX syntax!');
