import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import {
  HomeSimple, Package, DeliveryTruck, Map, User, MapPin,
  DollarCircle, Bell, Wallet, Page, StatsUpSquare, Settings,
  Network, Menu, LogOut, Language
} from 'iconoir-react';
import './Layout.css';

const iconMap = {
  'dashboard':      HomeSimple,
  'orders':         Package,
  'drivers':        DeliveryTruck,
  'dispatch':       Map,
  'clients':        User,
  'zones':          MapPin,
  'pricing':        DollarCircle,
  'notifications':  Bell,
  'wallet':         Wallet,
  'invoices':       Page,
  'reports':        StatsUpSquare,
  'settings':       Settings,
  'api-keys':       Network,
};

const navSections = [
  {
    titleKey: 'Main',
    items: [
      { path: '/dashboard',     labelKey: 'Dashboard',      labelAr: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',  iconKey: 'dashboard' },
    ]
  },
  {
    titleKey: 'Operations',
    items: [
      { path: '/orders',        labelKey: 'Orders',          labelAr: '\u0627\u0644\u0637\u0644\u0628\u0627\u062a',    iconKey: 'orders' },
      { path: '/drivers',       labelKey: 'Drivers',         labelAr: '\u0627\u0644\u0633\u0627\u0626\u0642\u0648\u0646',   iconKey: 'drivers' },
      { path: '/dispatch',      labelKey: 'Dispatch',        labelAr: '\u0627\u0644\u0625\u0631\u0633\u0627\u0644',    iconKey: 'dispatch' },
      { path: '/clients',       labelKey: 'Clients',         labelAr: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621',    iconKey: 'clients' },
    ]
  },
  {
    titleKey: 'Config',
    items: [
      { path: '/zones',         labelKey: 'Zones',           labelAr: '\u0627\u0644\u0645\u0646\u0627\u0637\u0642',    iconKey: 'zones' },
      { path: '/pricing',       labelKey: 'Pricing',         labelAr: '\u0627\u0644\u062a\u0633\u0639\u064a\u0631',    iconKey: 'pricing' },
    ]
  },
  {
    titleKey: 'Finance',
    items: [
      { path: '/wallet',        labelKey: 'Wallet',          labelAr: '\u0627\u0644\u0645\u062d\u0641\u0638\u0629',    iconKey: 'wallet' },
      { path: '/invoices',      labelKey: 'Invoices',        labelAr: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631',   iconKey: 'invoices' },
    ]
  },
  {
    titleKey: 'Analytics',
    items: [
      { path: '/reports',       labelKey: 'Reports',         labelAr: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631',   iconKey: 'reports' },
    ]
  },
  {
    titleKey: 'System',
    items: [
      { path: '/notifications', labelKey: 'Notifications',   labelAr: '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',  iconKey: 'notifications' },
      { path: '/settings',      labelKey: 'Settings',        labelAr: '\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a',  iconKey: 'settings' },
      { path: '/api-keys',      labelKey: 'API Keys',        labelAr: '\u0645\u0641\u0627\u062a\u064a\u062d API',  iconKey: 'api-keys' },
    ]
  },
];

const allNavItems = navSections.flatMap(s => s.items);

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRTL, i18n.language]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const item = allNavItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/');
    if (!item) return 'Trasealla Delivery';
    return isRTL ? (item.labelAr || item.labelKey) : item.labelKey;
  };

  const renderIcon = (iconKey) => {
    const IconComponent = iconMap[iconKey];
    return IconComponent ? <IconComponent width={20} height={20} strokeWidth={1.5} /> : null;
  };

  return (
    <div className={`staff-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isRTL ? 'rtl' : ''}`}>
      <div 
        className={`sidebar-overlay ${sidebarOpen && isMobile ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`custom-sidebar ${sidebarOpen ? (isMobile ? 'open' : '') : 'closed'}`}>
        <div className="sidebar-brand">
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f97316' }}>🚚 Trasealla</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.titleKey} className="nav-section">
              <div className="sidebar-nav-label">
                {section.titleKey}
              </div>
              {section.items.map((item) => (
                <div key={item.path} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    {renderIcon(item.iconKey)}
                    <span>{isRTL ? (item.labelAr || item.labelKey) : item.labelKey}</span>
                  </Link>
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <header className={`custom-topbar ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <div className="topbar-left">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu width={24} height={24} />
          </button>
          
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        <div className="topbar-actions">
          <div className="lang-switcher">
            <button 
              className="lang-toggle"
              onClick={() => setShowLangMenu(!showLangMenu)}
            >
              <Language width={20} height={20} />
              <span>{i18n.language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown">
                <button 
                  className={`lang-option ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => { i18n.changeLanguage('en'); setShowLangMenu(false); }}
                >
                  🇺🇸 English
                </button>
                <button 
                  className={`lang-option ${i18n.language === 'ar' ? 'active' : ''}`}
                  onClick={() => { i18n.changeLanguage('ar'); setShowLangMenu(false); }}
                >
                  🇦🇪 العربية
                </button>
              </div>
            )}
          </div>

          {user?.role && <span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span>}
          
          <div className="user-menu-wrapper">
            <button 
              className="user-avatar-toggle" 
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </button>
            
            <div className={`user-dropdown ${showUserMenu ? 'show' : ''}`}>
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <strong>{user?.full_name || user?.username}</strong>
                  <span style={{ display: 'block', fontSize: 12, color: '#888' }}>{user?.email}</span>
                </div>
              </div>
              <button onClick={handleLogout} className="user-dropdown-item danger">
                <LogOut width={18} height={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        {children}
      </main>

      <footer className={`custom-footer ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        &copy; {new Date().getFullYear()} Trasealla Delivery &mdash; All rights reserved
      </footer>
    </div>
  );
}
