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
const Installments = lazy(() => import('./pages/Installments'));
const OffersAndCoupons = lazy(() => import('./pages/OffersAndCoupons'));
const Expenses = lazy(() => import('./pages/Expenses'));
const WarehousePage = lazy(() => import('./pages/Warehouse'));
const SalesReturns = lazy(() => import('./pages/SalesReturns'));
const PurchaseReturns = lazy(() => import('./pages/PurchaseReturns'));
const Quotations = lazy(() => import('./pages/Quotations'));

const LoadingScreen = () => (
    <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
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

export { AuthContext, useAuth };

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('ar');
    const [isFirstRun, setIsFirstRun] = useState(false);
    const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

    // Memoize translation function
    const t = useCallback((key) => {
        return translations[language]?.[key] || translations['ar']?.[key] || key;
    }, [language]);

    useEffect(() => {
        const initApp = async () => {
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
        'installments': Installments,
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
        user, login, logout, updateUser, theme, toggleTheme, t, language, setLanguage, setCurrentPage
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
                <Login onLogin={login} />
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
