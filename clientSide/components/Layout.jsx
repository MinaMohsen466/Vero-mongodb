import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../App';
import appIcon from '../assets/icon.png';
import UserProfilePanel from './UserProfilePanel';
import AiAssistantBubble from './AiAssistantBubble';
import {
    Home, Users, Truck, ShoppingCart, ShoppingBag, FileText,
    CreditCard, BookOpen, BarChart3, Settings, LogOut,
    Moon, Sun, Building2, Package, Wallet, ChevronLeft, ChevronRight, ChevronDown, UserCheck, Menu, Monitor, Ticket, TrendingDown, Warehouse, Undo, RotateCcw, Search
} from 'lucide-react';

const menuItems = [
    { id: 'dashboard', labelKey: 'menu_dashboard', icon: Home, permModule: 'dashboard' },
    { 
        id: 'clients', 
        labelKey: 'menu_section_clients', 
        icon: Users,
        type: 'group',
        children: [
            { id: 'customers', labelKey: 'menu_customers', icon: Users, permModule: 'customers' },
            { id: 'suppliers', labelKey: 'menu_suppliers', icon: Truck, permModule: 'suppliers' },
            { id: 'products', labelKey: 'menu_products', icon: Package, permModule: 'products' },
        ]
    },
    {
        id: 'accounts_group',
        labelKey: 'menu_section_accounts',
        icon: Building2,
        type: 'group',
        children: [
            { id: 'accounts', labelKey: 'menu_chartOfAccounts', icon: Building2, permModule: 'chart_of_accounts' },
            { id: 'cashbank', labelKey: 'menu_cashBank', icon: Wallet, permModule: 'cash_bank' },
        ]
    },
    {
        id: 'invoices_group',
        labelKey: 'menu_section_invoices',
        icon: ShoppingCart,
        type: 'group',
        children: [
            { id: 'pos', labelKey: 'menu_pos', icon: Monitor, permModule: 'pos' },
            { id: 'sales', labelKey: 'menu_sales', icon: ShoppingCart, permModule: 'sales_invoices' },
            { id: 'sales_returns', labelKey: 'menu_sales_returns', icon: Undo, permModule: 'sales_returns' },
            { id: 'purchases', labelKey: 'menu_purchases', icon: ShoppingBag, permModule: 'purchase_invoices' },
            { id: 'purchase_returns', labelKey: 'menu_purchase_returns', icon: RotateCcw, permModule: 'purchase_returns' },
        ]
    },
    {
        id: 'financial_group',
        labelKey: 'menu_section_financial',
        icon: CreditCard,
        type: 'group',
        children: [
            { id: 'vouchers', labelKey: 'menu_vouchers', icon: CreditCard, permModule: 'receipt_vouchers' },
            { id: 'journal', labelKey: 'menu_journal', icon: BookOpen, permModule: 'journal_entries' },
        ]
    },
    {
        id: 'other_group',
        labelKey: 'menu_section_other',
        icon: Settings,
        type: 'group',
        children: [
            { id: 'hr', labelKey: 'menu_hr', icon: UserCheck, permModule: 'hr' },
            { id: 'expenses', labelKey: 'menu_expenses', icon: TrendingDown, permModule: 'expenses' },
            { id: 'warehouse', labelKey: 'menu_warehouse', icon: Warehouse, permModule: 'warehouse' },
            { id: 'offers', labelKey: 'offers_and_coupons', icon: Ticket, permModule: 'offers' },
            { id: 'quotations', labelKey: 'menu_quotations', icon: FileText, permModule: 'quotations' },
            { id: 'reports', labelKey: 'menu_reports', icon: BarChart3, permModule: 'reports' },
            { id: 'settings', labelKey: 'menu_settings', icon: Settings, permModule: 'settings' },
        ]
    }
];

function Layout({ children, currentPage, setCurrentPage, onHelpClick }) {
    const { user, logout, theme, toggleTheme, t, language } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(currentPage === 'pos' || currentPage === 'settings' || currentPage === 'reports');

    useEffect(() => {
        setSidebarCollapsed(currentPage === 'pos' || currentPage === 'settings' || currentPage === 'reports');
    }, [currentPage]);

    // Filter menu items based on user permissions
    const userPerms = user?.permissions || {};
    const isSuperAdmin = user?.id === 1 || user?.username === 'admin';

    const checkPerm = useCallback((moduleName) => {
        if (isSuperAdmin || user?.role === 'admin') return true;
        if (moduleName) {
            if (moduleName === 'settings') {
                const settingsSubModules = ['settings', 'excel_backup', 'ai_assistant', 'permissions', 'database', 'activity_log', 'users'];
                return settingsSubModules.some(m => userPerms[m]?.can_view);
            }
            if (userPerms[moduleName] && userPerms[moduleName].can_view !== undefined) {
                return !!userPerms[moduleName].can_view;
            }
            return false;
        }
        return true;
    }, [isSuperAdmin, userPerms, user?.role]);

    const filteredMenuItems = useMemo(() => {
        const result = [];
        for (const item of menuItems) {
            if (item.type === 'group') {
                const visibleChildren = item.children.filter(child => checkPerm(child.permModule));
                if (visibleChildren.length > 0) {
                    result.push({
                        ...item,
                        children: visibleChildren
                    });
                }
            } else {
                if (checkPerm(item.permModule)) {
                    result.push(item);
                }
            }
        }
        return result;
    }, [menuItems, checkPerm]);

    const [expandedGroups, setExpandedGroups] = useState(() => {
        const initialStates = {};
        for (const item of menuItems) {
            if (item.type === 'group') {
                const hasActiveChild = item.children.some(child => child.id === currentPage);
                initialStates[item.id] = hasActiveChild;
            }
        }
        return initialStates;
    });

    useEffect(() => {
        for (const item of menuItems) {
            if (item.type === 'group') {
                const hasActiveChild = item.children.some(child => child.id === currentPage);
                if (hasActiveChild) {
                    setExpandedGroups(prev => ({
                        ...prev,
                        [item.id]: true
                    }));
                }
            }
        }
    }, [currentPage]);

    const getPageTitle = () => {
        for (const item of menuItems) {
            if (item.id === currentPage) return t(item.labelKey);
            if (item.type === 'group') {
                const child = item.children.find(c => c.id === currentPage);
                if (child) return t(child.labelKey);
            }
        }
        return t('menu_dashboard');
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
            const searchLower = query.toLowerCase();
            let matchedChild = null;
            for (const item of filteredMenuItems) {
                if (item.type === 'group') {
                    const match = item.children.find(c => t(c.labelKey).toLowerCase().includes(searchLower));
                    if (match) {
                        matchedChild = match;
                        break;
                    }
                } else {
                    if (t(item.labelKey).toLowerCase().includes(searchLower)) {
                        matchedChild = item;
                        break;
                    }
                }
            }
            if (matchedChild) {
                setCurrentPage(matchedChild.id);
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

                <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredMenuItems.map((item) => {
                        if (item.type === 'group') {
                            const GroupIcon = item.icon;
                            const isExpanded = expandedGroups[item.id];
                            const hasActiveChild = item.children.some(child => child.id === currentPage);
                            const ArrowIcon = isExpanded ? ChevronDown : (language === 'ar' ? ChevronLeft : ChevronRight);
                            
                            return (
                                <div key={item.id} className={`nav-group ${isExpanded ? 'expanded' : ''}`}>
                                    <div 
                                        className={`nav-group-header ${hasActiveChild ? 'parent-active' : ''}`}
                                        onClick={() => {
                                            if (sidebarCollapsed) {
                                                setSidebarCollapsed(false);
                                            }
                                            setExpandedGroups(prev => ({
                                                ...prev,
                                                [item.id]: !prev[item.id]
                                            }));
                                        }}
                                    >
                                        <GroupIcon size={20} />
                                        <span className="nav-text">{t(item.labelKey)}</span>
                                        <ArrowIcon 
                                            size={16} 
                                            className="nav-group-header-arrow"
                                            style={{ 
                                                marginInlineStart: 'auto'
                                            }} 
                                        />
                                    </div>
                                    {isExpanded && (
                                        <div className="nav-group-children">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                return (
                                                    <div
                                                        key={child.id}
                                                        className={`nav-sub-item ${currentPage === child.id ? 'active' : ''}`}
                                                        onClick={() => setCurrentPage(child.id)}
                                                    >
                                                        <ChildIcon size={16} />
                                                        <span className="nav-text">{t(child.labelKey)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={t('search')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        <button 
                            className="btn btn-ghost btn-icon" 
                            onClick={onHelpClick} 
                            title={t('shortcuts_help') || 'اختصارات لوحة المفاتيح'}
                            style={{ 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--border)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
                            <FileText size={20} />
                        </button>

                        <button 
                            className="btn btn-ghost btn-icon" 
                            onClick={toggleTheme}
                            title={theme === 'light' ? (t('dark_mode') || 'الوضع الداكن') : (t('light_mode') || 'الوضع الفاتح')}
                            style={{ 
                                background: 'var(--bg-secondary)', 
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--border)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'var(--bg-secondary)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.transform = 'none';
                            }}
                        >
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
                <AiAssistantBubble />
            </main>
        </div>
    );
}

export default Layout;
