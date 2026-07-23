import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, RefreshCw, Check, AlertTriangle, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'react-hot-toast';

export default function AiAssistantBubble() {
    const { user, t, language } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [proposedActions, setProposedActions] = useState([]);
    const [actionApplied, setActionApplied] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // { base64, mimeType, name }
    
    // Undo Stack for last batch of modifications
    const [lastUndoBatch, setLastUndoBatch] = useState(null);

    const messagesEndRef = useRef(null);
    const imageInputRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading]);

    // Load chat history from localStorage on user change
    useEffect(() => {
        if (user && user.id) {
            try {
                const saved = localStorage.getItem(`vero_chat_history_${user.id}`);
                setMessages(saved ? JSON.parse(saved) : []);
            } catch (e) {
                console.error("Error loading chat history:", e);
                setMessages([]);
            }
        } else {
            setMessages([]);
        }
    }, [user]);

    // Save chat history to localStorage on messages update
    useEffect(() => {
        if (user && user.id && messages.length > 0) {
            try {
                localStorage.setItem(`vero_chat_history_${user.id}`, JSON.stringify(messages));
            } catch (e) {
                console.error("Error saving chat history:", e);
            }
        }
    }, [messages, user]);

    // Don't render for guests or if user is not logged in, or if they don't have view permissions for the AI Assistant
    const isAdmin = user?.role === 'admin';
    const hasAiViewPermission = isAdmin || user?.permissions?.ai_assistant?.can_view;
    if (!user || !hasAiViewPermission) return null;

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(language === 'ar' ? 'يرجى اختيار صورة صالحة فقط.' : 'Please select a valid image.');
            return;
        }

        // Limit size to 2MB to keep base64 payload reasonable
        if (file.size > 2 * 1024 * 1024) {
            toast.error(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت.' : 'Image size must be less than 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage({
                base64: reader.result,
                mimeType: file.type,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
        e.target.value = null; // reset input
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const text = input.trim();
        if (!text && !selectedImage) return;
        if (loading) return;

        setInput('');
        setProposedActions([]);
        setActionApplied(false);
        setErrorMsg('');
        // Clear last undo when a new query is started
        setLastUndoBatch(null);

        // Store attachment locally
        const attachment = selectedImage ? { base64: selectedImage.base64, mimeType: selectedImage.mimeType } : null;
        setSelectedImage(null);

        // Append user message
        const msgObj = {
            role: 'user',
            content: text,
            ...(attachment ? { image: attachment } : {})
        };
        const newMessages = [...messages, msgObj];
        setMessages(newMessages);
        setLoading(true);

        try {
            // Get screen context info if we can detect it
            const currentPath = window.location.hash || '';
            const contextInfo = {
                currentPath,
                language,
                timestamp: new Date().toISOString()
            };

            // Call backend IPC with history (messages list before appending new one) and image
            const response = await window.api.ai.chat(text, messages, contextInfo, attachment);

            if (response.success) {
                setMessages(prev => [...prev, { role: 'model', content: response.reply }]);
                if (Array.isArray(response.actions) && response.actions.length > 0) {
                    setProposedActions(response.actions);
                }
            } else {
                setErrorMsg(response.error || 'حدث خطأ غير متوقع');
                setMessages(prev => [...prev, { role: 'model', content: response.error || 'فشل الاتصال بالمساعد الذكي.' }]);
            }
        } catch (err) {
            console.error(err);
            toast.error(t('errorOccurred') || 'حدث خطأ');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyAction = async () => {
        if (!proposedActions || proposedActions.length === 0) return;

        const perms = user.permissions || {};
        
        // 1. Fetch current database states to build undo actions list BEFORE executing
        const undoActions = [];
        try {
            setLoading(true);
            for (const action of proposedActions) {
                const { type, payload } = action;

                if (type === 'products:update') {
                    const all = await window.api.products.getAll();
                    const existing = all.find(x => x.id === payload.id);
                    if (existing) {
                        const previousFields = {};
                        for (const key of Object.keys(payload)) {
                            previousFields[key] = existing[key];
                        }
                        undoActions.push({ type: 'products:update', payload: { id: payload.id, ...previousFields } });
                    }
                } 
                else if (type === 'products:delete') {
                    const all = await window.api.products.getAll();
                    const existing = all.find(x => x.id === payload.id);
                    if (existing) {
                        undoActions.push({ type: 'products:create', payload: { ...existing } });
                    }
                }
                else if (type === 'customers:update') {
                    const existing = await window.api.customers.getById(payload.id);
                    if (existing) {
                        const previousFields = {};
                        for (const key of Object.keys(payload)) {
                            previousFields[key] = existing[key];
                        }
                        undoActions.push({ type: 'customers:update', payload: { id: payload.id, ...previousFields } });
                    }
                }
                else if (type === 'customers:delete') {
                    const existing = await window.api.customers.getById(payload.id);
                    if (existing) {
                        undoActions.push({ type: 'customers:create', payload: { ...existing } });
                    }
                }
                else if (type === 'suppliers:update') {
                    const existing = await window.api.suppliers.getById(payload.id);
                    if (existing) {
                        const previousFields = {};
                        for (const key of Object.keys(payload)) {
                            previousFields[key] = existing[key];
                        }
                        undoActions.push({ type: 'suppliers:update', payload: { id: payload.id, ...previousFields } });
                    }
                }
                else if (type === 'suppliers:delete') {
                    const existing = await window.api.suppliers.getById(payload.id);
                    if (existing) {
                        undoActions.push({ type: 'suppliers:create', payload: { ...existing } });
                    }
                }
                else if (type === 'employees:update') {
                    const existing = await window.api.employees.getById(payload.id);
                    if (existing) {
                        const previousFields = {};
                        for (const key of Object.keys(payload)) {
                            previousFields[key] = existing[key];
                        }
                        undoActions.push({ type: 'employees:update', payload: { id: payload.id, ...previousFields } });
                    }
                }
                else if (type === 'employees:delete') {
                    const existing = await window.api.employees.getById(payload.id);
                    if (existing) {
                        undoActions.push({ type: 'employees:create', payload: { ...existing } });
                    }
                }
            }
        } catch (err) {
            console.error("Error building undo state:", err);
        }

        const executeAction = async (action) => {
            const { type, payload } = action;
            let hasPermission = false;
            let permissionErrorMsg = '';

            if (type === 'products:create') {
                hasPermission = isAdmin || perms.products?.can_create;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية إضافة المنتجات.' : 'Sorry, you do not have permission to add products.';
            } else if (type === 'products:update') {
                hasPermission = isAdmin || perms.products?.can_edit;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية تعديل المنتجات.' : 'Sorry, you do not have permission to edit products.';
            } else if (type === 'products:delete') {
                hasPermission = isAdmin || perms.products?.can_delete;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية حذف المنتجات.' : 'Sorry, you do not have permission to delete products.';
            } else if (type === 'customers:create') {
                hasPermission = isAdmin || perms.customers?.can_create;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية إضافة العملاء.' : 'Sorry, you do not have permission to add customers.';
            } else if (type === 'customers:update') {
                hasPermission = isAdmin || perms.customers?.can_edit;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية تعديل العملاء.' : 'Sorry, you do not have permission to edit customers.';
            } else if (type === 'customers:delete') {
                hasPermission = isAdmin || perms.customers?.can_delete;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية حذف العملاء.' : 'Sorry, you do not have permission to delete customers.';
            } else if (type === 'suppliers:create') {
                hasPermission = isAdmin || perms.suppliers?.can_create;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية إضافة الموردين.' : 'Sorry, you do not have permission to add suppliers.';
            } else if (type === 'suppliers:update') {
                hasPermission = isAdmin || perms.suppliers?.can_edit;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية تعديل الموردين.' : 'Sorry, you do not have permission to edit suppliers.';
            } else if (type === 'suppliers:delete') {
                hasPermission = isAdmin || perms.suppliers?.can_delete;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية حذف الموردين.' : 'Sorry, you do not have permission to delete suppliers.';
            } else if (type === 'employees:create') {
                hasPermission = isAdmin || perms.hr?.can_create;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية إضافة الموظفين.' : 'Sorry, you do not have permission to add employees.';
            } else if (type === 'employees:update') {
                hasPermission = isAdmin || perms.hr?.can_edit;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية تعديل الموظفين.' : 'Sorry, you do not have permission to edit employees.';
            } else if (type === 'employees:delete') {
                hasPermission = isAdmin || perms.hr?.can_delete;
                permissionErrorMsg = language === 'ar' ? 'عذراً، لا تمتلك صلاحية حذف الموظفين.' : 'Sorry, you do not have permission to delete employees.';
            }

            if (!hasPermission) {
                return { success: false, error: permissionErrorMsg };
            }

            let result;
            if (type === 'products:create') {
                result = await window.api.products.create(payload);
            } else if (type === 'products:update') {
                result = await window.api.products.update(payload);
            } else if (type === 'products:delete') {
                result = await window.api.products.delete(payload.id);
            } else if (type === 'customers:create') {
                result = await window.api.customers.create(payload);
            } else if (type === 'customers:update') {
                result = await window.api.customers.update(payload);
            } else if (type === 'customers:delete') {
                result = await window.api.customers.delete(payload.id);
            } else if (type === 'suppliers:create') {
                result = await window.api.suppliers.create(payload);
            } else if (type === 'suppliers:update') {
                result = await window.api.suppliers.update(payload);
            } else if (type === 'suppliers:delete') {
                result = await window.api.suppliers.delete(payload.id);
            } else if (type === 'employees:create') {
                result = await window.api.employees.create(payload);
            } else if (type === 'employees:update') {
                result = await window.api.employees.update(payload);
            } else if (type === 'employees:delete') {
                result = await window.api.employees.delete(payload.id);
            }

            return result;
        };

        // 2. Proceed with executing all actions
        try {
            let successCount = 0;
            let failCount = 0;
            let lastError = '';
            const typesHandled = new Set();

            for (const action of proposedActions) {
                const res = await executeAction(action);
                if (res && res.success) {
                    successCount++;
                    typesHandled.add(action.type);

                    // If it was a CREATE action, we record its DELETE action now that we know the ID
                    if (action.type === 'products:create' && res.id) {
                        undoActions.push({ type: 'products:delete', payload: { id: res.id } });
                    } else if (action.type === 'customers:create' && res.id) {
                        undoActions.push({ type: 'customers:delete', payload: { id: res.id } });
                    } else if (action.type === 'suppliers:create' && res.id) {
                        undoActions.push({ type: 'suppliers:delete', payload: { id: res.id } });
                    } else if (action.type === 'employees:create' && res.id) {
                        undoActions.push({ type: 'employees:delete', payload: { id: res.id } });
                    }
                } else {
                    failCount++;
                    lastError = res?.error || 'خطأ غير معروف';
                }
            }

            if (successCount > 0) {
                toast.success(language === 'ar' 
                    ? `تم تطبيق ${successCount} عملية بنجاح!` 
                    : `Successfully applied ${successCount} actions!`);
                
                // Save undo stack for this batch
                setLastUndoBatch(undoActions);

                setActionApplied(true);
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    content: language === 'ar' 
                        ? `✅ تم تنفيذ ${successCount} عملية مقترحة بنجاح وتحديث البيانات.` 
                        : `✅ Successfully executed ${successCount} proposed actions.`,
                    canUndo: true // Flag to show undo button contextual inside bubble
                }]);
                
                // Dispatch refresh events
                for (const type of typesHandled) {
                    if (type.startsWith('products:')) window.dispatchEvent(new Event('productsUpdated'));
                    if (type.startsWith('customers:')) window.dispatchEvent(new Event('customersUpdated'));
                    if (type.startsWith('suppliers:')) window.dispatchEvent(new Event('suppliersUpdated'));
                    if (type.startsWith('employees:')) window.dispatchEvent(new Event('employeesUpdated'));
                }
                window.dispatchEvent(new Event('settingsUpdated'));
            }

            if (failCount > 0) {
                toast.error(language === 'ar' 
                    ? `فشل تطبيق ${failCount} عملية: ${lastError}` 
                    : `Failed to apply ${failCount} actions: ${lastError}`);
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    content: language === 'ar'
                        ? `❌ فشل تطبيق ${failCount} عملية. الخطأ الأخير: ${lastError}`
                        : `❌ Failed to apply ${failCount} actions. Last error: ${lastError}`
                }]);
            }
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء تنفيذ العمليات');
        } finally {
            setLoading(false);
            setProposedActions([]);
        }
    };

    const handleUndo = async () => {
        if (!lastUndoBatch || lastUndoBatch.length === 0) return;

        try {
            setLoading(true);
            let successCount = 0;
            const typesHandled = new Set();

            // Run in reverse order of modifications
            const actionsToRevert = [...lastUndoBatch].reverse();

            for (const action of actionsToRevert) {
                const { type, payload } = action;
                let result;

                if (type === 'products:create') {
                    result = await window.api.products.create(payload);
                } else if (type === 'products:update') {
                    result = await window.api.products.update(payload);
                } else if (type === 'products:delete') {
                    result = await window.api.products.delete(payload.id);
                } else if (type === 'customers:create') {
                    result = await window.api.customers.create(payload);
                } else if (type === 'customers:update') {
                    result = await window.api.customers.update(payload);
                } else if (type === 'customers:delete') {
                    result = await window.api.customers.delete(payload.id);
                } else if (type === 'suppliers:create') {
                    result = await window.api.suppliers.create(payload);
                } else if (type === 'suppliers:update') {
                    result = await window.api.suppliers.update(payload);
                } else if (type === 'suppliers:delete') {
                    result = await window.api.suppliers.delete(payload.id);
                } else if (type === 'employees:create') {
                    result = await window.api.employees.create(payload);
                } else if (type === 'employees:update') {
                    result = await window.api.employees.update(payload);
                } else if (type === 'employees:delete') {
                    result = await window.api.employees.delete(payload.id);
                }

                if (result && result.success) {
                    successCount++;
                    typesHandled.add(type);
                }
            }

            toast.success(language === 'ar' ? 'تم التراجع عن التعديلات بنجاح!' : 'Undone successfully!');
            setLastUndoBatch(null);

            setMessages(prev => [...prev, {
                role: 'model',
                content: language === 'ar' 
                    ? `↩️ تم التراجع عن الإجراءات وإعادة قاعدة البيانات للحالة السابقة.` 
                    : `↩️ Successfully reverted changes to the previous database state.`
            }]);

            // Dispatch reload events
            for (const type of typesHandled) {
                if (type.startsWith('products:')) window.dispatchEvent(new Event('productsUpdated'));
                if (type.startsWith('customers:')) window.dispatchEvent(new Event('customersUpdated'));
                if (type.startsWith('suppliers:')) window.dispatchEvent(new Event('suppliersUpdated'));
                if (type.startsWith('employees:')) window.dispatchEvent(new Event('employeesUpdated'));
            }
            window.dispatchEvent(new Event('settingsUpdated'));

        } catch (err) {
            console.error("Undo error:", err);
            toast.error(language === 'ar' ? 'فشل التراجع عن العمليات' : 'Failed to undo changes');
        } finally {
            setLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
        setProposedActions([]);
        setLastUndoBatch(null);
        setActionApplied(false);
        setErrorMsg('');
        if (user && user.id) {
            localStorage.removeItem(`vero_chat_history_${user.id}`);
        }
    };

    const isRtl = language === 'ar';

    return (
        <div style={{ position: 'fixed', bottom: 24, left: isRtl ? 24 : 'auto', right: isRtl ? 'auto' : 24, zIndex: 9999, fontFamily: 'Cairo, sans-serif' }}>
            {/* Bubble Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: 56, height: 56, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Bot size={28} />
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div style={{
                    width: 380, height: 500, borderRadius: 16,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px', background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        direction: isRtl ? 'rtl' : 'ltr'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {isRtl ? 'المساعد الذكي Vero' : 'Vero AI Assistant'}
                                </div>
                                <div style={{ fontSize: '.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                    {isRtl ? 'نشط ومستعد' : 'Online & ready'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    title={isRtl ? 'مسح المحادثة بالكامل' : 'Clear Chat History'}
                                    style={{
                                        border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                        cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                                        display: 'flex', alignItems: 'center', gap: 4, fontSize: '.75rem', fontWeight: 600
                                    }}
                                >
                                    <Trash2 size={14} />
                                    <span>{isRtl ? 'مسح الشات' : 'Clear'}</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    border: 'none', background: 'none', color: 'var(--text-muted)',
                                    cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div style={{
                        flex: 1, padding: 16, overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: 12,
                        background: 'var(--bg-secondary-light)',
                        direction: 'rtl' // Chat content direction
                    }}>
                        {messages.length === 0 && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContainer: 'center', height: '100%', color: 'var(--text-muted)',
                                textAlign: 'center', padding: 20
                            }}>
                                <Bot size={40} style={{ color: 'var(--primary)', marginBottom: 12, opacity: 0.8 }} />
                                <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {isRtl ? 'مرحباً بك في Vero Assistant' : 'Welcome to Vero Assistant'}
                                </div>
                                <div style={{ fontSize: '.75rem', marginTop: 6, lineHeight: 1.5 }}>
                                    {isRtl 
                                        ? 'يمكنني مساعدتك في تعديل أسعار أو تفاصيل المنتجات، إضافة منتجات جديدة، أو الإجابة على استفساراتك العامة مع إمكانية قراءة الصور المرفقة.'
                                        : 'I can help you edit product details, add products, or answer general questions with support for attached images.'}
                                </div>
                            </div>
                        )}

                        {messages.map((m, idx) => (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    fontSize: '.85rem',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-line',
                                    background: m.role === 'user' 
                                        ? 'var(--primary)' 
                                        : 'var(--surface)',
                                    color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                                    border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    textAlign: 'right'
                                }}>
                                    {m.content}
                                    {m.image && m.image.base64 && (
                                        <img
                                            src={m.image.base64}
                                            alt="attachment"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: 140,
                                                borderRadius: 8,
                                                marginTop: 8,
                                                objectFit: 'contain',
                                                display: 'block',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}
                                        />
                                    )}

                                    {/* Inline Revert Undo Button inside bubble */}
                                    {m.canUndo && lastUndoBatch && (
                                        <button
                                            onClick={handleUndo}
                                            style={{
                                                marginTop: 8,
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                color: 'var(--danger)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                fontSize: '.72rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            <RefreshCw size={11} /> {isRtl ? 'تراجع عن هذا التعديل' : 'Undo this change'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Proposed Actions Confirmation Box */}
                        {proposedActions && proposedActions.length > 0 && (
                            <div style={{
                                alignSelf: 'flex-start',
                                width: '90%',
                                background: 'var(--surface)',
                                border: '1px solid #eab308',
                                borderRadius: 12,
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)',
                                borderRight: '4px solid #eab308'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', fontWeight: 700, color: '#eab308' }}>
                                    <AlertTriangle size={14} />
                                    {isRtl 
                                        ? `إجراءات مقترحة من الذكاء الاصطناعي (${proposedActions.length}):` 
                                        : `Proposed AI Actions (${proposedActions.length}):`}
                                </div>
                                <div style={{ 
                                    fontSize: '.78rem', 
                                    color: 'var(--text-secondary)', 
                                    lineHeight: 1.4,
                                    maxHeight: 155,
                                    overflowY: 'auto',
                                    paddingRight: 4
                                }}>
                                    {proposedActions.map((act, i) => (
                                        <div key={i} style={{ 
                                            paddingBottom: i < proposedActions.length - 1 ? 8 : 0,
                                            borderBottom: i < proposedActions.length - 1 ? '1px dashed var(--border)' : 'none',
                                            marginBottom: i < proposedActions.length - 1 ? 8 : 0
                                        }}>
                                            {act.type === 'products:create' && (
                                                <>
                                                    ➕ <strong>{isRtl ? 'إضافة منتج:' : 'Add product:'}</strong> {act.payload.name}<br/>
                                                    {isRtl ? 'السعر:' : 'Price:'} {act.payload.sale_price} {isRtl ? 'د.ك' : 'KD'}
                                                </>
                                            )}
                                            {act.type === 'products:update' && (
                                                <>
                                                    ✏️ <strong>{isRtl ? 'تعديل منتج:' : 'Edit product:'}</strong> #{act.payload.id}<br/>
                                                    {act.payload.name && <>{isRtl ? 'الاسم:' : 'Name:'} {act.payload.name}<br/></>}
                                                    {act.payload.description && <>{isRtl ? 'الوصف الجديد:' : 'New Desc:'} {act.payload.description}<br/></>}
                                                    {act.payload.sale_price !== undefined && <>{isRtl ? 'سعر البيع:' : 'Price:'} {act.payload.sale_price} {isRtl ? 'د.ك' : 'KD'}<br/></>}
                                                </>
                                            )}
                                            {act.type === 'products:delete' && (
                                                <>
                                                    ❌ <strong>{isRtl ? 'حذف منتج:' : 'Delete product:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'customers:create' && (
                                                <>
                                                    ➕ <strong>{isRtl ? 'إضافة عميل:' : 'Add customer:'}</strong> {act.payload.name}
                                                </>
                                            )}
                                            {act.type === 'customers:update' && (
                                                <>
                                                    ✏️ <strong>{isRtl ? 'تعديل عميل:' : 'Edit customer:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'customers:delete' && (
                                                <>
                                                    ❌ <strong>{isRtl ? 'حذف عميل:' : 'Delete customer:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'suppliers:create' && (
                                                <>
                                                    ➕ <strong>{isRtl ? 'إضافة مورد:' : 'Add supplier:'}</strong> {act.payload.name}
                                                </>
                                            )}
                                            {act.type === 'suppliers:update' && (
                                                <>
                                                    ✏️ <strong>{isRtl ? 'تعديل مورد:' : 'Edit supplier:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'suppliers:delete' && (
                                                <>
                                                    ❌ <strong>{isRtl ? 'حذف مورد:' : 'Delete supplier:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'employees:create' && (
                                                <>
                                                    ➕ <strong>{isRtl ? 'إضافة موظف:' : 'Add employee:'}</strong> {act.payload.name}
                                                </>
                                            )}
                                            {act.type === 'employees:update' && (
                                                <>
                                                    ✏️ <strong>{isRtl ? 'تعديل موظف:' : 'Edit employee:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                            {act.type === 'employees:delete' && (
                                                <>
                                                    ❌ <strong>{isRtl ? 'حذف موظف:' : 'Delete employee:'}</strong> #{act.payload.id}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <button
                                        onClick={handleApplyAction}
                                        style={{
                                            flex: 1, padding: '6px 10px', borderRadius: 6,
                                            background: '#eab308', color: '#000', border: 'none',
                                            fontWeight: 700, fontSize: '.75rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                                        }}
                                    >
                                        <Check size={12} /> {isRtl ? 'موافق وتطبيق الكل' : 'Apply All'}
                                    </button>
                                    <button
                                        onClick={() => setProposedActions([])}
                                        style={{
                                            padding: '6px 10px', borderRadius: 6,
                                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                            color: 'var(--text-secondary)', fontWeight: 600, fontSize: '.75rem', cursor: 'pointer'
                                        }}
                                    >
                                        {isRtl ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading && (
                            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 6, alignItems: 'center', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                                    {isRtl ? 'جاري التفكير...' : 'Thinking...'}
                                </span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Image Upload Preview Bar */}
                    {selectedImage && (
                        <div style={{
                            padding: '8px 12px',
                            background: 'var(--bg-secondary)',
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            direction: isRtl ? 'rtl' : 'ltr'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img
                                    src={selectedImage.base64}
                                    alt="Preview"
                                    style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }}
                                />
                                <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {selectedImage.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedImage(null)}
                                style={{
                                    border: 'none', background: 'none', color: 'var(--danger)',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* Footer Input Area */}
                    <form onSubmit={handleSend} style={{
                        padding: 12, background: 'var(--surface)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex', gap: 8, alignItems: 'center',
                        direction: isRtl ? 'rtl' : 'ltr'
                    }}>
                        <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={loading}
                            style={{
                                border: 'none', background: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                                transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            title={isRtl ? 'إرفاق صورة' : 'Attach Image'}
                        >
                            <ImageIcon size={20} />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={isRtl ? 'اسأل المساعد الذكي عن أي شيء...' : 'Ask the AI Assistant...'}
                            disabled={loading}
                            style={{
                                flex: 1, padding: '9px 12px', border: '1px solid var(--border)',
                                borderRadius: 8, fontSize: '.85rem', outline: 'none',
                                background: 'var(--bg-secondary)', color: 'var(--text-primary)'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!input.trim() && !selectedImage)}
                            style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: loading || (!input.trim() && !selectedImage) ? 'var(--border)' : 'var(--primary)',
                                color: '#fff', border: 'none', cursor: loading || (!input.trim() && !selectedImage) ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s'
                            }}
                        >
                            <Send size={16} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />
                        </button>
                    </form>
                </div>
            )}

            <input
                type="file"
                ref={imageInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleImageSelect}
            />
        </div>
    );
}
