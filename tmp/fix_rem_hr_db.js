const fs = require('fs');
const path = require('path');

const rAll = (content, s, r) => content.replaceAll(s, r);

// HR.jsx
const hrPath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'HR.jsx');
let hr = fs.readFileSync(hrPath, 'utf8');

hr = rAll(hr, '<label className="form-label">المسمى الوظيفي</label>', '<label className="form-label">{t(\'job_title\') || \'Job Title\'}</label>');
hr = rAll(hr, '<label className="form-label">القسم</label>', '<label className="form-label">{t(\'department\') || \'Department\'}</label>');
hr = rAll(hr, 'صرف الراتب (Ctrl+S)', '{t(\'pay_salary_save\') || \'Pay Salary (Ctrl+S)\'}');
hr = rAll(hr, 'الt(\'employee\') || \'Employee\' *', '{t(\'employee\') || \'Employee\'} *');
hr = rAll(hr, 'الخصومات', '{t(\'deductions\') || \'Deductions\'}');
hr = rAll(hr, 'إلى ${leave.end_date}', 'to ${leave.end_date}');
hr = rAll(hr, 'تم تغيير حالة الإجازة إلى', '${t(\'hr_leave_status_changed\') || \'Leave status changed to\'}');
hr = rAll(hr, 'title="t(\'add\') || \'Add\' خصم"', 'title={t(\'add_deduction\') || \'Add Deduction\'}');
hr = rAll(hr, '<h2 style={{ fontSize: \'1.25rem\', fontWeight: 700, margin: 0 }}>إدارة شؤون الt(\'employee\') || \'Employee\'ين</h2>', '<h2 style={{ fontSize: \'1.25rem\', fontWeight: 700, margin: 0 }}>{t(\'hr_management\') || \'HR Management\'}</h2>');
hr = rAll(hr, '<p style={{ color: \'var(--text-muted)\', margin: 0, fontSize: \'0.9rem\' }}>إدارة الt(\'employee\') || \'Employee\'ين والرواتب والإجازات والخصومات</p>', '<p style={{ color: \'var(--text-muted)\', margin: 0, fontSize: \'0.9rem\' }}>{t(\'hr_management_desc\') || \'Manage employees, salaries, leaves, and deductions\'}</p>');

fs.writeFileSync(hrPath, hr, 'utf8');

// Dashboard.jsx
const dbPath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'Dashboard.jsx');
let db = fs.readFileSync(dbPath, 'utf8');
db = rAll(db, "|| 'د.ك'", "|| (t('currency_kd') || 'KD')");
fs.writeFileSync(dbPath, db, 'utf8');

console.log('Fixed HR.jsx and Dashboard.jsx!');
