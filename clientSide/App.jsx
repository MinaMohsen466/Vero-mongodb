import React, { useState, useEffect, createContext, useContext, lazy, Suspense, useCallback, useMemo } from 'react';
import translations from './translations';
import { Toaster } from 'react-hot-toast';

// Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// Helper function to check if a unit is a color unit (Paint container)
export const isColorUnit = (unit) => {
    if (!unit) return false;
    const normalizedUnit = String(unit).toLowerCase().trim();
    return ['drum', 'gallon', 'liter', 'drumlit', 'لتر', 'جالون', 'درام'].some(term => normalizedUnit.includes(term));
};

export const hasPerm = (user, moduleName, action = 'can_view') => {
    if (!user) return false;
    if (user.id === 1 || user.username === 'admin') return true;
    if (user.permissions && user.permissions[moduleName]) {
        const val = user.permissions[moduleName][action];
        if (val !== undefined && val !== null) return !!val;
    }
    return user.role === 'admin';
};

// Lazy load components
import Layout from './components/Layout';
import Login from './pages/Login';
import SetupWizard from './pages/SetupWizard';
import ShortcutsHelpPanel from './components/ShortcutsHelpPanel';
import { useShortcuts } from './hooks/useShortcuts';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Products = lazy(() => import('./pages/Products'));
const ChartOfAccounts = lazy(() => import('./pages/ChartOfAccounts'));
const SalesInvoices = lazy(() => import('./pages/SalesInvoices'));
const PurchaseInvoices = lazy(() => import('./pages/PurchaseInvoices'));
const Vouchers = lazy(() => import('./pages/Vouchers'));
const JournalEntries = lazy(() => import('./pages/JournalEntries'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const CashBank = lazy(() => import('./pages/CashBank'));
const HR = lazy(() => import('./pages/HR'));
const POS = lazy(() => import('./pages/POS'));
const OffersAndCoupons = lazy(() => import('./pages/OffersAndCoupons'));
const Expenses = lazy(() => import('./pages/Expenses'));
const WarehousePage = lazy(() => import('./pages/Warehouse'));
const SalesReturns = lazy(() => import('./pages/SalesReturns'));
const PurchaseReturns = lazy(() => import('./pages/PurchaseReturns'));
const Quotations = lazy(() => import('./pages/Quotations'));

const LoadingScreen = () => (
    <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-main, #f8fafc)',
        zIndex: 999999
    }}>
        <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }}></div>
    </div>
);

// Helper functions for dynamic theme customization
function adjustColorBrightness(hex, percent) {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    r = Math.max(0, Math.min(255, r + percent));
    g = Math.max(0, Math.min(255, g + percent));
    b = Math.max(0, Math.min(255, b + percent));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
}

function hexToRgba(hex, alpha) {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) {
        hex = hex.replace(/(.)/g, '$1$1');
    }
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyBrandColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--primary-hover', adjustColorBrightness(color, -20));
    document.documentElement.style.setProperty('--primary-light', hexToRgba(color, 0.1));
    document.documentElement.style.setProperty('--sidebar-active', hexToRgba(color, 0.25));
}

// ── DbConnectionScreen Component ──────────────────────────────────────────────
function DbConnectionScreen({ t, language, changeLanguage, connectionError, hasConfig, onSave }) {
    const [uri, setUri] = React.useState('');
    const [testing, setTesting] = React.useState(false);
    const [error, setError] = React.useState(connectionError || '');
    const [success, setSuccess] = React.useState(false);

    const handleTestAndSave = async (e) => {
        e.preventDefault();
        if (!uri) {
            setError(language === 'ar' ? 'الرجاء إدخال رابط الاتصال بقاعدة البيانات' : 'Please enter database connection URI');
            return;
        }
        setError('');
        setTesting(true);
        try {
            const res = await onSave(uri);
            if (res && !res.success) {
                setError(res.error || (language === 'ar' ? 'فشل الاتصال بقاعدة البيانات. تأكد من صحة الرابط والإنترنت.' : 'Connection failed. Verify URI and internet.'));
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setTesting(false);
        }
    };

    const dir = language === 'ar' ? 'rtl' : 'ltr';

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', padding: 20, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif', direction: dir
        }}>
            <div style={{
                width: '100%', maxWidth: 540, background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16, padding: 32, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 60, height: 60, borderRadius: '50%', background: 'rgba(37, 99, 235, 0.15)',
                        color: '#3b82f6', marginBottom: 16
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
                            <path d="M3 12A9 3 0 0 0 21 12"></path>
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                        {language === 'ar' ? 'إعداد قاعدة البيانات السحابية' : 'Configure Cloud Database'}
                    </h2>
                    <p style={{ fontSize: '.875rem', color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
                        {language === 'ar'
                            ? 'الرجاء إدخال رابط اتصال MongoDB Atlas لمزامنة بيانات هذا الجهاز مع السحاب.'
                            : 'Please enter your MongoDB Atlas connection string to sync this device with the cloud.'}
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: '.85rem', color: '#fca5a5',
                        lineHeight: 1.5, display: 'flex', gap: 10, alignItems: 'flex-start'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                            <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div>
                            <strong>{language === 'ar' ? 'خطأ في الاتصال:' : 'Connection Error:'}</strong>
                            <div style={{ marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>{error}</div>
                        </div>
                    </div>
                )}

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 50, height: 50, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981', marginBottom: 16
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                            {language === 'ar' ? 'تم حفظ الاتصال بنجاح!' : 'Connection saved successfully!'}
                        </h3>
                        <p style={{ fontSize: '.875rem', color: '#94a3b8', marginTop: 8 }}>
                            {language === 'ar' ? 'يجري الآن إعادة تشغيل التطبيق للاتصال...' : 'Relaunching application to connect...'}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleTestAndSave}>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: 8 }}>
                                {language === 'ar' ? 'رابط الاتصال (Connection URI):' : 'Connection String URI:'}
                            </label>
                            <textarea
                                value={uri}
                                onChange={(e) => setUri(e.target.value)}
                                placeholder="mongodb+srv://user:password@cluster0.mongodb.net/vero"
                                required
                                disabled={testing}
                                style={{
                                    width: '100%', height: 100, padding: 12, borderRadius: 8,
                                    background: '#0f172a', border: '1px solid #334155', color: '#f8fafc',
                                    fontSize: '.85rem', fontFamily: 'monospace', outline: 'none', resize: 'none',
                                    transition: 'border-color 0.2s', direction: 'ltr'
                                }}
                            />
                            <span style={{ fontSize: '.75rem', color: '#64748b', marginTop: 6, display: 'block', lineHeight: 1.4 }}>
                                {language === 'ar'
                                    ? 'تنبيه: تأكد من تهيئة شبكة Atlas (IP Access List) للسماح بالاتصال من أي مكان (0.0.0.0/0).'
                                    : 'Note: Ensure your MongoDB Atlas IP Access List allows connections from anywhere (0.0.0.0/0).'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button
                                type="submit"
                                disabled={testing}
                                style={{
                                    flex: 1, padding: '10px 16px', borderRadius: 8, background: '#2563eb',
                                    color: '#fff', border: 'none', fontSize: '.9rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'background 0.2s', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', gap: 8
                                }}
                            >
                                {testing ? (
                                    <>
                                        <span className="spinner-border" style={{
                                            width: 14, height: 14, border: '2px solid #fff',
                                            borderTopColor: 'transparent', borderRadius: '50%',
                                            display: 'inline-block', animation: 'spin 1s linear infinite'
                                        }} />
                                        {language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}
                                    </>
                                ) : (
                                    language === 'ar' ? 'اختبار وحفظ الرابط' : 'Test & Save Connection'
                                )}
                            </button>

                            {/* Cloud URI entry only, no revert to local option */}
                        </div>
                    </form>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 28, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '.8rem' }}>
                    <span
                        onClick={() => changeLanguage('ar')}
                        style={{ cursor: 'pointer', color: language === 'ar' ? '#3b82f6' : '#64748b', fontWeight: language === 'ar' ? 600 : 400 }}
                    >
                        العربية
                    </span>
                    <span style={{ color: '#334155' }}>|</span>
                    <span
                        onClick={() => changeLanguage('en')}
                        style={{ cursor: 'pointer', color: language === 'en' ? '#3b82f6' : '#64748b', fontWeight: language === 'en' ? 600 : 400 }}
                    >
                        English
                    </span>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { to { transform: rotate(360deg); } }
            `}} />
        </div>
    );
}

export { AuthContext, useAuth };

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('ar');
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);
    const [dbConnected, setDbConnected] = useState(true);
    const [dbError, setDbError] = useState('');
    const [hasDbConfig, setHasDbConfig] = useState(false);

    // Memoize translation function
    const t = useCallback((key) => {
        return translations[language]?.[key] || translations['ar']?.[key] || key;
    }, [language]);

    useEffect(() => {
        const initApp = async () => {
            // Check Database connection first
            try {
                const dbStatus = await window.api.database.getConnectionStatus();
                setDbConnected(dbStatus.isConnected);
                setDbError(dbStatus.error || '');
                setHasDbConfig(dbStatus.hasConfiguredUri);
                if (!dbStatus.isConnected) {
                    setLoading(false);
                    return;
                }
            } catch (dbErr) {
                console.error("Error checking database connection status:", dbErr);
                setDbConnected(false);
                setDbError(dbErr.message || 'Failed to connect to database');
                setLoading(false);
                return;
            }

            try {
                const isReinstall = await window.api.system.checkReinstall();
                if (isReinstall) {
                    console.log("[App] Reinstall or update detected. Clearing user session.");
                    localStorage.removeItem('accapp_user');
                }
            } catch (e) {
                console.error("Error checking reinstall status:", e);
            }

            try {
                const firstRun = await window.api.system.isFirstRun();
                setIsFirstRun(firstRun);
            } catch (e) {
                console.error("Error checking first run:", e);
            }

            const savedUser = localStorage.getItem('accapp_user');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
                // Refresh permissions asynchronously from the database on startup
                (async () => {
                    try {
                        const [rolePerms, userPermsRes] = await Promise.all([
                            window.api.permissions.getByRole(parsed.role),
                            window.api.permissions.getUserPermissions(parsed.id)
                        ]);
                        const mergedPerms = { ...rolePerms };
                        if (userPermsRes?.hasIndividual && userPermsRes?.permissions) {
                            Object.assign(mergedPerms, userPermsRes.permissions);
                        }
                        // Admin overrides
                        if (parsed.role === 'admin') {
                            mergedPerms['settings'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                            mergedPerms['permissions'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                            mergedPerms['dashboard'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                            mergedPerms['offers'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                            mergedPerms['quotations'] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
                        }
                        const updated = { ...parsed, permissions: mergedPerms };
                        localStorage.setItem('accapp_user', JSON.stringify(updated));
                        setUser(updated);
                        if (window.api?.users?.setCurrentUser) {
                            window.api.users.setCurrentUser(updated);
                        }
                    } catch (err) {
                        console.error("Failed to auto-refresh user permissions on startup:", err);
                    }
                })();
            }

            const savedTheme = localStorage.getItem('accapp_theme') || 'light';
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);

            try {
                const settingsData = await window.api.settings.getAll();
                const lang = settingsData?.general?.language || 'ar';
                setLanguage(lang);
                document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                document.documentElement.setAttribute('lang', lang);
                
                // Apply brand color on startup
                const brandColor = settingsData?.general?.brand_color || '#2563eb';
                applyBrandColor(brandColor);
            } catch (e) {
                console.log('Could not load language or brand color setting, using default');
            }

            setLoading(false);
        };

        initApp();

        const handleSettingsUpdate = () => {
            window.api.settings.getAll().then(data => {
                const lang = data?.general?.language || 'ar';
                setLanguage(lang);
                
                // Apply brand color on update
                const brandColor = data?.general?.brand_color || '#2563eb';
                applyBrandColor(brandColor);
            }).catch(e => console.error(e));
        };
        window.addEventListener('settingsUpdated', handleSettingsUpdate);

        return () => {
            window.removeEventListener('settingsUpdated', handleSettingsUpdate);
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    useEffect(() => {
        if (window.api && window.api.users && typeof window.api.users.setCurrentUser === 'function') {
            window.api.users.setCurrentUser(user).catch(err => console.error("Error setting session user:", err));
        }
    }, [user]);

    const login = useCallback(async (username, password) => {
        try {
            const result = await window.api.users.login(username, password);
            if (result.success) {
                setUser(result.user);
                localStorage.setItem('accapp_user', JSON.stringify(result.user));
                return { success: true };
            }
            return { success: false, message: result.message };
        } catch (error) {
            return { success: false, message: t('connectionError') };
        }
    }, [t]);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('accapp_user');
        setCurrentPage('dashboard');
    }, []);

    const updateUser = useCallback((newUserData) => {
        setUser(newUserData);
        localStorage.setItem('accapp_user', JSON.stringify(newUserData));
        if (window.api?.users?.setCurrentUser) {
            window.api.users.setCurrentUser(newUserData);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('accapp_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    }, [theme]);

    // Memoize renderPage function - BEFORE any conditionals
    const pageMap = {
        'dashboard': Dashboard,
        'customers': Customers,
        'suppliers': Suppliers,
        'products': Products,
        'accounts': ChartOfAccounts,
        'sales': SalesInvoices,
        'purchases': PurchaseInvoices,
        'vouchers': Vouchers,
        'journal': JournalEntries,
        'reports': Reports,
        'settings': SettingsPage,
        'cashbank': CashBank,
        'hr': HR,
        'expenses': Expenses,
        'pos': POS,
        'offers': OffersAndCoupons,
        'warehouse': WarehousePage,
        'sales_returns': SalesReturns,
        'purchase_returns': PurchaseReturns,
        'quotations': Quotations
    };

    const renderPage = useCallback(() => {
        const Page = pageMap[currentPage] || Dashboard;
        return <Suspense fallback={<LoadingScreen />}><Page /></Suspense>;
    }, [currentPage]);

    // Create contextValue BEFORE any conditionals - MUST be called every render
    const contextValue = useMemo(() => ({
        user, login, logout, updateUser, theme, toggleTheme, t, language, setLanguage, setCurrentPage,
        hasPerm: (moduleName, action = 'can_view') => hasPerm(user, moduleName, action)
    }), [user, login, logout, updateUser, theme, toggleTheme, t, language, setLanguage, setCurrentPage]);

    useShortcuts({
        Help: () => {
            if (!user) return;
            setShowShortcutsPanel(prev => !prev);
        },
        GlobalNav: (key) => {
            if (!user) return;
            const navMap = {
                '1': 'dashboard', '2': 'sales', '3': 'purchases', '4': 'vouchers',
                '5': 'reports', '6': 'cashbank', '7': 'hr', '8': 'pos', '9': 'settings'
            };
            if (navMap[key]) {
                const target = navMap[key];
                const isAdmin = user?.role === 'admin';
                const perms = user?.permissions || {};
                const moduleMap = {
                    'dashboard': 'dashboard', 'sales': 'sales_invoices', 'purchases': 'purchase_invoices',
                    'vouchers': 'receipt_vouchers', 'reports': 'reports', 'cashbank': 'cash_bank',
                    'hr': 'hr', 'pos': 'pos', 'settings': 'settings'
                };
                const mod = moduleMap[target];
                if (!mod || perms[mod]?.can_view || (isAdmin && ['settings', 'permissions', 'dashboard'].includes(mod))) {
                    setCurrentPage(target);
                }
            }
        }
    });

    if (loading) {
        return <LoadingScreen />;
    }

    if (!dbConnected) {
        return (
            <AuthContext.Provider value={{ t, language, setLanguage }}>
                <Toaster position="top-center" reverseOrder={false} />
                <DbConnectionScreen
                    t={t}
                    language={language}
                    changeLanguage={setLanguage}
                    connectionError={dbError}
                    hasConfig={hasDbConfig}
                    onSave={async (uri) => {
                        const result = await window.api.database.setConnectionUri(uri);
                        return result;
                    }}
                />
            </AuthContext.Provider>
        );
    }

    if (isFirstRun) {
        return (
            <AuthContext.Provider value={{ t, language, setLanguage }}>
                <Toaster position="top-center" reverseOrder={false} />
                <SetupWizard
                    t={t}
                    language={language}
                    changeLanguage={setLanguage}
                    onComplete={async (username, password) => {
                        setIsFirstRun(false);
                        if (username && password) {
                            await login(username, password);
                        }
                    }}
                />
            </AuthContext.Provider>
        );
    }

    if (!user) {
        const loginContextValue = { user: null, login, logout, updateUser: null, t, language, setLanguage };
        return (
            <AuthContext.Provider value={loginContextValue}>
                <Toaster position="top-center" reverseOrder={false} />
                <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <Login onLogin={login} />
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}>
            <Toaster position="top-center" reverseOrder={false} />
            <Layout currentPage={currentPage} setCurrentPage={setCurrentPage} onHelpClick={() => setShowShortcutsPanel(true)}>
                {renderPage()}
            </Layout>

            {user && (
                <ShortcutsHelpPanel 
                    isOpen={showShortcutsPanel} 
                    onClose={() => setShowShortcutsPanel(false)} 
                />
            )}
        </AuthContext.Provider>
    );
}

export default App;
