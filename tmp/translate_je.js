const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'mmake', 'Desktop', 'Vero', 'src', 'pages', 'JournalEntries.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Also inject t() if missing
if (!content.includes('const { t } = useAuth();')) {
    content = content.replace(
        'function JournalEntries() {',
        'function JournalEntries() {\n    const { t } = useAuth();'
    );
}

const rAll = (s, r) => { content = content.replaceAll(s, r); };

rAll("'القيد غير متوازن! يجب أن يتساوى إجمالي المدين مع الدائن'", "t('entry_unbalanced') || 'Entry unbalanced! Debit must equal Credit'");
rAll("'تم حفظ القيد بنجاح'", "t('entry_saved') || 'Entry saved successfully'");
rAll("'حدث خطأ أثناء حفظ القيد'", "t('error_saving_entry') || 'Error saving entry'");
rAll("'هل أنت متأكد من حذف هذا القيد؟'", "t('confirm_delete_entry') || 'Are you sure you want to delete this entry?'");
rAll("'تم حذف القيد بنجاح'", "t('entry_deleted') || 'Entry deleted successfully'");
rAll("'حدث خطأ أثناء حذف القيد'", "t('error_deleting_entry') || 'Error deleting entry'");
rAll("إجمالي {entries.length} قيد", "{t('total')} {entries.length} {t('entries_count') || 'entries'}");
rAll("قيد جديد", "{t('new_entry') || 'New Entry'}");
rAll("لا توجد قيود يومية", "{t('no_journal_entries') || 'No Journal Entries'}");

// Table headers
rAll("<th>رقم القيد</th>", "<th>{t('entry_number') || 'Entry No.'}</th>");
rAll("<th>التاريخ</th>", "<th>{t('date') || 'Date'}</th>");
rAll("<th>البيان</th>", "<th>{t('description') || 'Description'}</th>");
rAll("<th>المدين</th>", "<th>{t('debit') || 'Debit'}</th>");
rAll("<th>الدائن</th>", "<th>{t('credit') || 'Credit'}</th>");
rAll("<th>الإجراءات</th>", "<th>{t('actions') || 'Actions'}</th>");

// Modal
rAll('title="قيد يومي جديد"', 'title={t(\'new_journal_entry\') || \'New Journal Entry\'}');
rAll('إلغاء (Esc)', '{t(\'cancel\') || \'Cancel\'} (Esc)');
rAll('>حفظ (Ctrl+S)<', '>{t(\'save\') || \'Save\'} (Ctrl+S)<');

// Form labels
rAll('<label className="form-label">التاريخ</label>', '<label className="form-label">{t(\'date\') || \'Date\'}</label>');
rAll('<label className="form-label">المرجع</label>', '<label className="form-label">{t(\'reference\') || \'Reference\'}</label>');
rAll('<label className="form-label">البيان</label>', '<label className="form-label">{t(\'description\') || \'Description\'}</label>');

rAll('<h4>تفاصيل القيد</h4>', '<h4>{t(\'entry_details\') || \'Entry Details\'}</h4>');
rAll('سطر', '{t(\'line\') || \'Line\'}');

// Detail table
rAll('<th>الحساب</th>', '<th>{t(\'account\') || \'Account\'}</th>');
rAll(">مدين<", ">{t('debit') || 'Debit'}<");
rAll(">دائن<", ">{t('credit') || 'Credit'}<");
rAll(">بيان<", ">{t('description') || 'Description'}<");
rAll('اختر حساب', '{t(\'select_account\') || \'Select Account\'}');

rAll('>الإجمالي<', '>{t(\'total\') || \'Total\'}<');
rAll("متوازن ✓", "{t('balanced') || 'Balanced ✓'}");
rAll("غير متوازن ✗", "{t('unbalanced') || 'Unbalanced ✗'}");

rAll('title={`قيد ${selectedEntry?.entry_number}`}', 'title={`${t(\'journal_entry\') || \'Journal Entry\'} ${selectedEntry?.entry_number}`}');
rAll('<strong>التاريخ:</strong>', '<strong>{t(\'date\') || \'Date\'}:</strong>');
rAll('<strong>البيان:</strong>', '<strong>{t(\'description\') || \'Description\'}:</strong>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Translated JournalEntries.jsx!');
