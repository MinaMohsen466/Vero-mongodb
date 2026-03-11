const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'ChartOfAccounts.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const rAll = (s, r) => { content = content.replaceAll(s, r); };

// Inject t()
rAll('const { user } = useAuth();', 'const { t, user } = useAuth();');

rAll("'تم تعديل الحساب بنجاح'", "t('account_updated') || 'Account updated successfully'");
rAll("'تم إضافة الحساب بنجاح'", "t('account_added') || 'Account added successfully'");
rAll("'حدث خطأ أثناء حفظ الحساب'", "t('error_saving_account') || 'Error saving account'");
rAll("'هل أنت متأكد من حذف هذا الحساب؟'", "t('confirm_delete_account') || 'Are you sure you want to delete this account?'");
rAll("'تم حذف الحساب بنجاح'", "t('account_deleted') || 'Account deleted successfully'");
rAll("'حدث خطأ أثناء حذف الحساب'", "t('error_deleting_account') || 'Error deleting account'");

// Object keys for getting account type label
rAll("asset: 'أصول',", "asset: t('assets') || 'Assets',");
rAll("liability: 'خصوم',", "liability: t('liabilities') || 'Liabilities',");
rAll("equity: 'حقوق ملكية',", "equity: t('equity') || 'Equity',");
rAll("revenue: 'إيرادات',", "revenue: t('revenue') || 'Revenue',");
rAll("expense: 'مصروفات'", "expense: t('expenses') || 'Expenses'");

// UI Text
rAll(">إجمالي {accounts.length} حساب<", ">{t('total')} {accounts.length} {t('accounts_count') || 'accounts'}<");
rAll("إضافة حساب<", "{t('add_account') || 'Add Account'}<");
rAll("لا يوجد حسابات", "{t('no_accounts') || 'No Accounts'}");
rAll("قم بإضافة حسابات لإنشاء شجرة الحسابات", "{t('add_accounts_desc') || 'Add accounts to build the chart of accounts tree'}");

// Modal texts
rAll("'تعديل حساب' : 'إضافة حساب جديد'", "t('edit_account') || 'Edit Account' : t('new_account') || 'New Account'");
rAll("'إلغاء (Esc)'", "t('cancel_esc') || 'Cancel (Esc)'");
rAll("'حفظ (Ctrl+S)' : 'إضافة (Ctrl+S)'", "t('save_ctrl_s') || 'Save (Ctrl+S)' : t('add_ctrl_s') || 'Add (Ctrl+S)'");
rAll(">إلغاء (Esc)<", ">{t('cancel_esc') || 'Cancel (Esc)'}<");

// Form labels
rAll("كود الحساب *", "{t('account_code') || 'Account Code'} *");
rAll("اسم الحساب *", "{t('account_name') || 'Account Name'} *");
rAll("الحساب الأب", "{t('parent_account') || 'Parent Account'}");
rAll("-- حساب رئيسي --", "-- {t('main_account') || 'Main Account'} --");
rAll("نوع الحساب *", "{t('account_type') || 'Account Type'} *");

// Select options
rAll('value="asset">أصول<', 'value="asset">{t(\'assets\') || \'Assets\'}<');
rAll('value="liability">خصوم<', 'value="liability">{t(\'liabilities\') || \'Liabilities\'}<');
rAll('value="equity">حقوق ملكية<', 'value="equity">{t(\'equity\') || \'Equity\'}<');
rAll('value="revenue">إيرادات<', 'value="revenue">{t(\'revenue\') || \'Revenue\'}<');
rAll('value="expense">مصروفات<', 'value="expense">{t(\'expenses\') || \'Expenses\'}<');

rAll("طبيعة الحساب *", "{t('account_nature') || 'Account Nature'} *");
rAll('value="debit">مدين<', 'value="debit">{t(\'debit\') || \'Debit\'}<');
rAll('value="credit">دائن<', 'value="credit">{t(\'credit\') || \'Credit\'}<');

rAll("يمكن الترحيل إليه (حساب تحليلي)", "{t('can_post_to') || 'Can post to (Analytical Account)'}");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Translated ChartOfAccounts.jsx!');
