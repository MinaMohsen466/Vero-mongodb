import React from 'react';
import { Database, Download, Upload, AlertTriangle, Trash2 } from 'lucide-react';
import { Card, btnStyle } from './shared';

export default function DatabaseSettings({
    dbStatus, setNewCloudUri, setCloudError, setCloudModalOpen, saving,
    backup, restore, user, triggerDeleteAllProducts, triggerResetApp, t
}) {
    return (
        <>
            {/* Database Connection Settings */}
            <Card title={t('database_connection') || 'اتصال قاعدة البيانات'} icon={Database}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div>
                            <div style={{ fontSize: '.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: dbStatus.isConnected ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                                {t('cloud_database') || 'قاعدة بيانات سحابية (Cloud)'}
                            </div>
                            <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {dbStatus.isConnected 
                                    ? (t('connected_success') || 'متصل بنجاح بقاعدة البيانات') 
                                    : `${t('connection_failed') || 'فشل الاتصال'}: ${dbStatus.error}`}
                            </div>
                        </div>
                        <button
                            style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}
                            onClick={() => {
                                setNewCloudUri('');
                                setCloudError('');
                                setCloudModalOpen(true);
                            }}
                            disabled={saving}
                        >
                            {t('connect_cloud') || 'تحديث رابط الاتصال'}
                        </button>
                    </div>
                </div>
            </Card>

            <Card title={t('backup_and_restore') || 'النسخ الاحتياطي والاستعادة'} icon={Database}>
                <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                    {t('backup_hint') || 'قم بأخذ نسخ احتياطية بانتظام لحماية بياناتك.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }} onClick={backup}>
                            <Download size={14} /> {t('backup') || 'نسخ احتياطي'}
                        </button>
                        <button style={{ ...btnStyle, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} onClick={restore}>
                            <Upload size={14} /> {t('restore_from_backup') || 'استعادة من نسخة احتياطية'}
                        </button>
                    </div>
                </div>
            </Card>

            {user?.permissions?.products?.can_delete && (
                <Card title={t('prod_deleteAll') || 'حذف كل المنتجات'} icon={AlertTriangle} action={
                    <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
                }>
                    <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }}>
                        {t('prod_deleteAllConfirm') || 'هل أنت متأكد من حذف جميع المنتجات من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة!'}
                    </p>
                    <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={triggerDeleteAllProducts}>
                        <Trash2 size={14} /> {t('prod_deleteAll') || 'حذف كل المنتجات'}
                    </button>
                </Card>
            )}

            <Card title={t('reset_app') || 'Reset App'} icon={AlertTriangle} action={
                <span style={{ fontSize: '.72rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>{t('danger') || 'Danger'}</span>
            }>
                <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: t('reset_app_desc') || 'Resetting will <strong>permanently delete all data</strong>. This cannot be undone.' }} />
                <button style={{ ...btnStyle, background: 'var(--danger)', color: '#fff' }} onClick={triggerResetApp}>
                    <AlertTriangle size={14} /> {t('reset_app') || 'Reset App'}
                </button>
            </Card>
        </>
    );
}
