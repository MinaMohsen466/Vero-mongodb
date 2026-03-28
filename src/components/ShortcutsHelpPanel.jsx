import React from 'react';
import Modal from './Modal';
import { useAuth } from '../App';
import { Keyboard } from 'lucide-react';

function ShortcutsHelpPanel({ isOpen, onClose }) {
    const { t } = useAuth();
    
    const generalShortcuts = [
        { keys: ['Ctrl', 'S'], desc: t('shortcut_save') || 'حفظ / تأكيد' },
        { keys: ['Ctrl', 'N'], desc: t('shortcut_new') || 'جديد (عميل/فاتورة/خطة...)' },
        { keys: ['Ctrl', 'F'], desc: t('shortcut_search') || 'بحث في الصفحة الحالية' },
        { keys: ['Esc'], desc: t('shortcut_close') || 'إغلاق النوافذ المنبثقة' },
        { keys: ['Ctrl', '/'], desc: t('shortcut_help_toggle') || 'إظهار/إخفاء المساعدة' }
    ];

    const navShortcuts = [
        { keys: ['Ctrl', '1'], desc: t('shortcut_dashboard') || 'الرئيسية' },
        { keys: ['Ctrl', '2'], desc: t('shortcut_sales') || 'المبيعات' },
        { keys: ['Ctrl', '3'], desc: t('shortcut_purchases') || 'المشتريات' },
        { keys: ['Ctrl', '4'], desc: t('shortcut_vouchers') || 'السندات' },
        { keys: ['Ctrl', '5'], desc: t('shortcut_reports') || 'التقارير' },
        { keys: ['Ctrl', '6'], desc: t('shortcut_cashbank') || 'الصندوق والبنوك' },
        { keys: ['Ctrl', '7'], desc: t('shortcut_hr') || 'شئون الموظفين' },
        { keys: ['Ctrl', '8'], desc: t('shortcut_pos') || 'نقطة البيع' },
        { keys: ['Ctrl', '9'], desc: t('shortcut_settings') || 'الإعدادات' }
    ];

    const ShortcutKey = ({ children }) => (
        <kbd style={{
            background: 'var(--bg-tertiary, #f1f5f9)',
            border: '1px solid var(--border)',
            borderBottomWidth: '2px',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            fontWeight: 600,
            color: 'var(--text-primary)'
        }}>
            {children}
        </kbd>
    );

    const ShortcutRow = ({ keys, desc }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{desc}</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {keys.map((k, i) => (
                    <React.Fragment key={i}>
                        <ShortcutKey>{k}</ShortcutKey>
                        {i < keys.length - 1 && <span style={{ color: 'var(--text-muted)' }}>+</span>}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Keyboard size={20} /> {t('shortcuts_help') || 'لوحة اختصارات الكيبورد'}</div>}
            size="md"
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                    <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>{t('shortcuts_general') || 'عام'}</h4>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0 16px', borderRadius: '8px' }}>
                        {generalShortcuts.map((s, i) => <ShortcutRow key={'g'+i} {...s} />)}
                    </div>
                </div>
                <div>
                    <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>{t('shortcuts_nav') || 'التنقل السريع'}</h4>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0 16px', borderRadius: '8px' }}>
                        {navShortcuts.map((s, i) => <ShortcutRow key={'n'+i} {...s} />)}
                    </div>
                </div>
            </div>
            
            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                يمكنك الضغط على ESC لإغلاق هذه اللوحة من أي مكان في النظام.
            </div>
        </Modal>
    );
}

export default ShortcutsHelpPanel;
