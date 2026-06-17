import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import appIcon from '../assets/icon.png';
import UserProfilePanel from './UserProfilePanel';
import {
    Home, Users, Truck, ShoppingCart, ShoppingBag, FileText,
    CreditCard, BookOpen, BarChart3, Settings, LogOut,
    Moon, Sun, Building2, Package, Wallet, ChevronLeft, ChevronRight, UserCheck, Menu, Monitor, Ticket, Tag, TrendingDown, Warehouse
} from 'lucide-react';

function Layout({ children, currentPage, setCurrentPage, onHelpClick }) {
    const { user, logout, theme, toggleTheme, t } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        if (currentPage === 'pos') {
            setSidebarCollapsed(true);
        } else {
            setSidebarCollapsed(false);
        }
    }, [currentPage]);

    const menuItems = [
        { id: 'dashboard', labelKey: 'menu_dashboard', icon: Home, permModule: 'dashboard' },
        { type: 'section', labelKey: 'menu_section_clients' },
        { id: 'customers', labelKey: 'menu_customers', icon: Users, permModule: 'customers' },
        { id: 'suppliers', labelKey: 'menu_suppliers', icon: Truck, permModule: 'suppliers' },
        { id: 'products', labelKey: 'menu_products', icon: Package, permModule: 'products' },
        { type: 'section', labelKey: 'menu_section_accounts' },
        { id: 'accounts', labelKey: 'menu_chartOfAccounts', icon: Building2, permModule: 'chart_of_accounts' },
        { id: 'cashbank', labelKey: 'menu_cashBank', icon: Wallet, permModule: 'cash_bank' },
        { type: 'section', labelKey: 'menu_section_invoices' },
        { id: 'pos', labelKey: 'menu_pos', icon: Monitor, permModule: 'pos' },
        { id: 'sales', labelKey: 'menu_sales', icon: ShoppingCart, permModule: 'sales_invoices' },
        { id: 'purchases', labelKey: 'menu_purchases', icon: ShoppingBag, permModule: 'purchase_invoices' },
        { type: 'section', labelKey: 'menu_section_financial' },
        { id: 'vouchers', labelKey: 'menu_vouchers', icon: CreditCard, permModule: 'receipt_vouchers' },
        { id: 'journal', labelKey: 'menu_journal', icon: BookOpen, permModule: 'journal_entries' },
        { type: 'section', labelKey: 'menu_section_other' },
        { id: 'hr', labelKey: 'menu_hr', icon: UserCheck, permModule: 'hr' },
        { id: 'expenses', labelKey: 'menu_expenses', icon: TrendingDown, permModule: 'expenses' },
        { id: 'warehouse', labelKey: 'menu_warehouse', icon: Warehouse, permModule: 'warehouse' },
        { id: 'offers', labelKey: 'offers_and_coupons', icon: Ticket, permModule: 'offers' },
        { id: 'reports', labelKey: 'menu_reports', icon: BarChart3, permModule: 'reports' },
        { id: 'settings', labelKey: 'menu_settings', icon: Settings, permModule: 'settings' },
    ];

    // Filter menu items based on user permissions
    const userPerms = user?.permissions || {};
    const isAdmin = user?.role === 'admin';

    const filteredMenuItems = (() => {
        const visibleIds = new Set();
        // First pass: collect visible item IDs
        for (const item of menuItems) {
            if (item.type === 'section') continue;
            if (userPerms[item.permModule]?.can_view === true || (isAdmin && ['settings', 'permissions', 'dashboard'].includes(item.permModule))) {
                visibleIds.add(item.id);
            }
        }
        // Second pass: include sections only if next items are visible
        const result = [];
        for (let i = 0; i < menuItems.length; i++) {
            const item = menuItems[i];
            if (item.type === 'section') {
                // Check if any items after this section (until next section) are visible
                let hasVisible = false;
                for (let j = i + 1; j < menuItems.length && menuItems[j].type !== 'section'; j++) {
                    if (visibleIds.has(menuItems[j].id)) { hasVisible = true; break; }
                }
                if (hasVisible) result.push(item);
            } else if (visibleIds.has(item.id)) {
                result.push(item);
            }
        }
        return result;
    })();

    const getPageTitle = () => {
        const item = menuItems.find(m => m.id === currentPage);
        return item ? t(item.labelKey) : t('menu_dashboard');
    };

    const getRoleLabel = () => {
        if (user?.role === 'admin') return t('admin');
        if (user?.role === 'accountant') return t('accountant');
        return t('user');
    };

    // Search functionality
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim()) {
            // Search for matching menu items
            const searchLower = query.toLowerCase();
            const matchedItem = filteredMenuItems.find(item => {
                if (item.type === 'section') return false;
                const label = t(item.labelKey).toLowerCase();
                return label.includes(searchLower);
            });

            // If match found, navigate to it
            if (matchedItem) {
                setCurrentPage(matchedItem.id);
            }
        }
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <img src={appIcon} alt="Vero" className="sidebar-logo" style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '8px' }} />
                    <span className="sidebar-title">Vero</span>
                </div>

                <nav className="sidebar-nav">
                    {filteredMenuItems.map((item, index) => {
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
                    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            title={sidebarCollapsed ? t('expand') : t('collapse')}
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <Menu size={20} />
                        </button>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{getPageTitle()}</h2>
                    </div>

                    <div className="header-right">
                        <div className="header-search">
                            <input
                                type="text"
                                placeholder={t('search')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <button className="btn btn-ghost btn-icon" onClick={onHelpClick} title={t('shortcuts_help') || 'اختصارات لوحة المفاتيح'}>
                            <FileText size={20} />
                        </button>

                        <button className="btn btn-ghost btn-icon" onClick={toggleTheme}>
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <UserProfilePanel />

                        <button className="btn btn-ghost btn-icon" onClick={logout} title={t('logout')} style={{ display: 'none' }}>
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
