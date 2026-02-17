import React, { useState } from 'react';
import { useAuth } from '../App';
import {
    Home, Users, Truck, ShoppingCart, ShoppingBag, FileText,
    CreditCard, BookOpen, BarChart3, Settings, LogOut,
    Moon, Sun, Building2, Package
} from 'lucide-react';

function Layout({ children, currentPage, setCurrentPage }) {
    const { user, logout, theme, toggleTheme, t } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const menuItems = [
        { id: 'dashboard', labelKey: 'menu_dashboard', icon: Home },
        { type: 'section', labelKey: 'menu_section_clients' },
        { id: 'customers', labelKey: 'menu_customers', icon: Users },
        { id: 'suppliers', labelKey: 'menu_suppliers', icon: Truck },
        { id: 'products', labelKey: 'menu_products', icon: Package },
        { type: 'section', labelKey: 'menu_section_accounts' },
        { id: 'accounts', labelKey: 'menu_chartOfAccounts', icon: Building2 },
        { type: 'section', labelKey: 'menu_section_invoices' },
        { id: 'sales', labelKey: 'menu_sales', icon: ShoppingCart },
        { id: 'purchases', labelKey: 'menu_purchases', icon: ShoppingBag },
        { type: 'section', labelKey: 'menu_section_financial' },
        { id: 'vouchers', labelKey: 'menu_vouchers', icon: CreditCard },
        { id: 'journal', labelKey: 'menu_journal', icon: BookOpen },
        { type: 'section', labelKey: 'menu_section_other' },
        { id: 'reports', labelKey: 'menu_reports', icon: BarChart3 },
        { id: 'settings', labelKey: 'menu_settings', icon: Settings },
    ];

    const getPageTitle = () => {
        const item = menuItems.find(m => m.id === currentPage);
        return item ? t(item.labelKey) : t('menu_dashboard');
    };

    const getRoleLabel = () => {
        if (user?.role === 'admin') return t('admin');
        if (user?.role === 'accountant') return t('accountant');
        return t('user');
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">م</div>
                    <span className="sidebar-title">{t('appName')}</span>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((item, index) => {
                        if (item.type === 'section') {
                            return (
                                <div key={index} className="nav-section">
                                    <div className="nav-section-title">{t(item.labelKey)}</div>
                                </div>
                            );
                        }

                        const Icon = item.icon;
                        return (
                            <div
                                key={item.id}
                                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                                onClick={() => setCurrentPage(item.id)}
                            >
                                <Icon size={20} />
                                <span className="nav-text">{t(item.labelKey)}</span>
                            </div>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="header">
                    <div className="header-right">
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{getPageTitle()}</h2>
                    </div>

                    <div className="header-right">
                        <div className="header-search">
                            <input
                                type="text"
                                placeholder={t('search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <div className="user-menu">
                            <div className="user-avatar">
                                {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'م'}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{user?.full_name || user?.username}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getRoleLabel()}</div>
                            </div>
                        </div>

                        <button className="btn btn-ghost btn-icon" onClick={logout} title={t('logout')}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
