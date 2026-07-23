import React from 'react';
import { FileText, Download, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, Tog, btnStyle } from './shared';

export default function ExcelProgramSettings({ isSuperAdmin, gen, setGen, saveSetting, backupToExcel, canAccess, t }) {
    return (
        <>
            {isSuperAdmin && (
                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '14px 20px',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text-primary)' }}>
                            {t('allow_manager_excel') || 'صلاحية رؤية شيت الإكسيل المصغر للمدير والموظفين'}
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {t('allow_manager_excel_desc') || 'تحديد ما إذا كان يسمح للمدير والمستخدمين غير الأدمن برؤية وتنزيل شيت الإكسيل المصغر أم حظره عليهم'}
                        </div>
                    </div>
                    <Tog
                        on={gen.allow_manager_excel === 'yes'}
                        onChange={async () => {
                            const newVal = gen.allow_manager_excel === 'yes' ? 'no' : 'yes';
                            setGen(f => ({ ...f, allow_manager_excel: newVal }));
                            await saveSetting('general', 'allow_manager_excel', newVal);
                            window.dispatchEvent(new Event('settingsUpdated'));
                            toast.success(newVal === 'yes' ? 'تم تفعيل رؤية شيت الإكسيل المصغر للمدير' : 'تم تعطيل رؤية شيت الإكسيل المصغر عن المدير');
                        }}
                    />
                </div>
            )}
            <Card title="برنامج Excel المصغر والنسخ الاحتياطي للأرشيف" icon={FileText}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: '.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                        يمكنك إصدار وتنزيل **برنامج إكسيل مصغر تفاعلي مستقل (Vero Mini-Excel Program)** يتيح لك الاستمرار في تسجيل المبيعات والمشتريات ومتابعة المخزون والعملاء والموردين أوفلاين، مع ربط دقيق لكافة الحسابات.
                    </p>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                        {canAccess('excel_backup', 'can_create') && (
                            <button
                                style={{ ...btnStyle, background: '#107c41', color: '#fff', padding: '10px 20px', boxShadow: '0 4px 14px rgba(16,124,65,0.25)' }}
                                onClick={backupToExcel}
                            >
                                <Download size={16} /> تصدير وإصدار شيت برنامج Excel المصغر (.xlsx)
                            </button>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Check size={18} style={{ color: '#107c41' }} /> مميزات برنامج Excel المصغر المدمج:
                        </div>
                        <ul style={{ paddingRight: 20, margin: 0, fontSize: '.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <li><strong>تثبيت اسم العميل/المورد افتراضياً:</strong> يتم اختيار "عميل نقدي" أو "مورد نقدي" تلقائياً في خانة العميل/المورد، وتكرار نفس اسم العميل بالسطر التالي فوراً لإدخال أصناف متعددة لنفس الفاتورة.</li>
                            <li><strong>تحديد حالة الدفع ومعالجة المديونيات:</strong> اختيار حالة الدفع ("مدفوع" / "أجل") حيث يتم ترحيل الآجل تلقائياً لمديونية العميل أو دائنية المورد دون خصمه من الخزينة النقدية.</li>
                            <li><strong>تسميع الرصيد الافتتاحي:</strong> ترحيل صافي المديونيات الحالية مباشرة إلى الرصيد الافتتاحي عند البدء من جديد بشيت جديد.</li>
                            <li><strong>المطابقة الذكية للأكواد والأسماء:</strong> استنتاج أسماء وأكواد المنتجات والأسعار تلقائياً من صفحة المنتجات بدون أخطاء.</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </>
    );
}
