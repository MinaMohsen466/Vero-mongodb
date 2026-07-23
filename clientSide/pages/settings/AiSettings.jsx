import React from 'react';
import { Key, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, Fld, TRow, inp, btnStyle } from './shared';

export default function AiSettings({ ai, setAi, showPw, setShowPw, saveSection, saving, t }) {
    return (
        <Card title={t('ai_assistant_settings') || 'إعدادات المساعد الذكي'} icon={Key}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <TRow
                    label={t('enable_ai_assistant') || 'تفعيل المساعد الذكي'}
                    desc={t('enable_ai_assistant_desc') || 'تفعيل محادثة الذكاء الاصطناعي للمساعدة العامة وتعديل المنتجات.'}
                    value={ai.enable_ai_assistant}
                    onChange={v => setAi(prev => ({ ...prev, enable_ai_assistant: v }))}
                />
                <Fld label={t('gemini_api_key') || 'مفتاح Gemini API (Google AI Studio)'}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPw ? 'text' : 'password'}
                            className="form-input"
                            value={ai.gemini_api_key}
                            onChange={e => setAi(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                            placeholder="AIzaSy..."
                            style={{ ...inp, paddingRight: 40 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(p => !p)}
                            style={{
                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                            }}
                        >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: 6, display: 'block', lineHeight: 1.4 }}>
                        {t('gemini_key_hint') || 'يمكنك الحصول على مفتاح مجاني من Google AI Studio لتشغيل المساعد الذكي.'}
                    </span>
                </Fld>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                        style={{ ...btnStyle, background: 'var(--primary)', color: '#fff' }}
                        disabled={saving}
                        onClick={() => saveSection('ai', ai, t('savedSuccess') || 'Saved successfully')}
                    >
                        <Save size={14} /> {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                    </button>
                </div>
            </div>
        </Card>
    );
}
