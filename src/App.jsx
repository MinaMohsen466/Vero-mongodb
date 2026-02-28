import React, { useState, useEffect, createContext, useContext } from 'react';
import {
    Home, Users, Truck, ShoppingCart, ShoppingBag, FileText,
    CreditCard, BookOpen, BarChart3, Settings, LogOut, Menu,
    ChevronLeft, Search, Moon, Sun, Building2
} from 'lucide-react';
import translations from './translations';

// Context
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// Components
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Products from './pages/Products';
import ChartOfAccounts from './pages/ChartOfAccounts';
import SalesInvoices from './pages/SalesInvoices';
import PurchaseInvoices from './pages/PurchaseInvoices';
import Vouchers from './pages/Vouchers';
import JournalEntries from './pages/JournalEntries';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import CashBank from './pages/CashBank';
import HR from './pages/HR';

export { AuthContext, useAuth };

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('ar');

    // Translation function
    const t = (key) => {
        return translations[language]?.[key] || translations['ar']?.[key] || key;
    };

    useEffect(() => {
        // Check for saved session
        const savedUser = localStorage.getItem('accapp_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }

        // Check theme preference
        const savedTheme = localStorage.getItem('accapp_theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Load language from settings
        const loadLanguage = async () => {
            try {
                const settingsData = await window.api.settings.getAll();
                const lang = settingsData?.general?.language || 'ar';
                setLanguage(lang);
                document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
                document.documentElement.setAttribute('lang', lang);
            } catch (e) {
                console.log('Could not load language setting, using default');
            }
        };
        loadLanguage();

        setLoading(false);
    }, []);

    // Update dir/lang when language changes
    useEffect(() => {
        document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    const login = async (username, password) => {
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
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('accapp_user');
        setCurrentPage('dashboard');
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('accapp_theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    if (loading) {
        return (
            <div className="loading" style={{ height: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <AuthContext.Provider value={{ user, login, logout, t, language, setLanguage }}>
                <Login onLogin={login} />
            </AuthContext.Provider>
        );
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <Dashboard />;
            case 'customers': return <Customers />;
            case 'suppliers': return <Suppliers />;
            case 'products': return <Products />;
            case 'accounts': return <ChartOfAccounts />;
            case 'sales': return <SalesInvoices />;
            case 'purchases': return <PurchaseInvoices />;
            case 'vouchers': return <Vouchers />;
            case 'journal': return <JournalEntries />;
            case 'reports': return <Reports />;
            case 'settings': return <SettingsPage />;
            case 'cashbank': return <CashBank />;
            case 'hr': return <HR />;
            default: return <Dashboard />;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, theme, toggleTheme, t, language, setLanguage }}>
            <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
                {renderPage()}
            </Layout>
        </AuthContext.Provider>
    );
}

export default App;
