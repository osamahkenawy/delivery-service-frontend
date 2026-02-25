import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import {
  HomeSimple, Package, DeliveryTruck, Map, User, MapPin,
  DollarCircle, Bell, Wallet, Page, StatsUpSquare, Settings,
  Network, Menu, LogOut, Language, Dashboard, Upload,
  RefreshDouble, CreditCard, Medal, Search
} from 'iconoir-react';
import NotificationBell from './NotificationBell';
import './Layout.css';

const iconMap = {
  'dashboard':      HomeSimple,
  'orders':         Package,
  'drivers':        DeliveryTruck,
  'dispatch':       Map,
  'live-map':       Map,
  'barcode':         Package,
  'driver-scan':     DeliveryTruck,
  'my-deliveries':   Package,
  'clients':        User,
  'zones':          MapPin,
  'pricing':        DollarCircle,
  'notifications':  Bell,
  'wallet':         Wallet,
  'invoices':       Page,
  'reports':        StatsUpSquare,
  'settings':       Settings,
  'api-keys':       Network,
  'shipment-tracking': Search,
  'bulk-import':    Upload,
  'returns':        RefreshDouble,
  'cod':            CreditCard,
  'performance':    Medal,
};

/* ── Admin navigation ── */
const adminNavSections = [
  {
    titleKey: 'main',
    items: [
      { path: '/dashboard',     labelKey: 'dashboard',     iconKey: 'dashboard' },
    ]
  },
  {
    titleKey: 'operations',
    items: [
      { path: '/orders',        labelKey: 'orders',        iconKey: 'orders' },
      { path: '/drivers',       labelKey: 'drivers',       iconKey: 'drivers' },
      { path: '/dispatch',      labelKey: 'dispatch',      iconKey: 'dispatch' },
      { path: '/live-map',      labelKey: 'livemap',      iconKey: 'live-map' },
      { path: '/barcode',       labelKey: 'barcode',      iconKey: 'barcode' },
      { path: '/driver/scan',   labelKey: 'scan_shipment',  iconKey: 'driver-scan' },
      { path: '/driver/orders', labelKey: 'my_deliveries',  iconKey: 'my-deliveries' },
      { path: '/clients',       labelKey: 'clients',       iconKey: 'clients' },
      { path: '/shipment-tracking', labelKey: 'tracking', iconKey: 'shipment-tracking' },
      { path: '/bulk-import',   labelKey: 'bulk_import',   iconKey: 'bulk-import' },
      { path: '/returns',       labelKey: 'returns',       iconKey: 'returns' },
    ]
  },
  {
    titleKey: 'config',
    items: [
      { path: '/zones',         labelKey: 'zones',         iconKey: 'zones' },
      { path: '/pricing',       labelKey: 'pricing',       iconKey: 'pricing' },
    ]
  },
  {
    titleKey: 'finance',
    items: [
      { path: '/wallet',        labelKey: 'wallet',        iconKey: 'wallet' },
      { path: '/invoices',      labelKey: 'invoices',      iconKey: 'invoices' },
      { path: '/cod',           labelKey: 'cod_reconciliation', iconKey: 'cod' },
    ]
  },
  {
    titleKey: 'analytics',
    items: [
      { path: '/reports',       labelKey: 'reports',       iconKey: 'reports' },
      { path: '/performance',   labelKey: 'performance',   iconKey: 'performance' },
    ]
  },
  {
    titleKey: 'system',
    items: [
      { path: '/notifications', labelKey: 'notifications', iconKey: 'notifications' },
      { path: '/settings',      labelKey: 'settings',      iconKey: 'settings' },
      { path: '/api-keys',      labelKey: 'integrations',      iconKey: 'api-keys' },
    ]
  },
];

/* ── Driver navigation (minimal) ── */
const driverNavSections = [
  {
    titleKey: 'main',
    items: [
      { path: '/driver/orders', labelKey: 'my_deliveries',  iconKey: 'my-deliveries' },
    ]
  },
  {
    titleKey: 'tools',
    items: [
      { path: '/driver/scan',   labelKey: 'scan_shipment',  iconKey: 'driver-scan' },
    ]
  },
];

const allNavItems = [...adminNavSections, ...driverNavSections].flatMap(s => s.items);

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { user, tenant, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

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

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setShowLangMenu(false);
  };

  const getPageTitle = () => {
    const item = allNavItems.find(item => location.pathname.startsWith(item.path));
    if (item) {
      return t(`common.${item.labelKey}`);
    }
    return 'Trasealla Delivery';
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
          <Link to="/dashboard">
            <img
              src="/assets/images/logos/full_logo_white.png"
              alt="Trasealla Delivery"
              style={{ height: '100px' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <span style={{ display: 'none', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Trasealla
            </span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {(user?.role === 'driver' ? driverNavSections : adminNavSections).map((section) => (
            <div key={section.titleKey} className="nav-section">
              <div className="sidebar-nav-label">
                {t(`common.${section.titleKey}`)}
              </div>
              {section.items.map((item) => (
                <div key={item.path} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    {renderIcon(item.iconKey)}
                    <span>{t(`common.${item.labelKey}`)}</span>
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

          {!sidebarOpen && (
            <div className="topbar-brand-mobile">
              <img
                src="/logo-icon.png"
                alt="T"
                style={{ height: '35px', marginRight: '10px' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        <div className="topbar-actions">
          <NotificationBell />

          <div className="lang-switcher">
            <button className="lang-toggle" onClick={() => setShowLangMenu(!showLangMenu)}>
              <Language width={20} height={20} />
              <span>{i18n.language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="lang-dropdown">
                <button
                  className={`lang-option ${i18n.language === 'en' ? 'active' : ''}`}
                  onClick={() => changeLanguage('en')}
                >
                  EN &mdash; English
                </button>
                <button
                  className={`lang-option ${i18n.language === 'ar' ? 'active' : ''}`}
                  onClick={() => changeLanguage('ar')}
                >
                  AR &mdash; &#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;
                </button>
              </div>
            )}
          </div>

          {user?.role === 'superadmin' && <span className="role-badge super-admin">SUPER ADMIN</span>}
          {user?.role === 'admin'      && <span className="role-badge admin">ADMIN</span>}
          {user?.role === 'dispatcher' && <span className="role-badge staff">DISPATCHER</span>}
          {user?.role === 'driver'     && <span className="role-badge staff" style={{ background: '#f973161a', color: '#f97316', borderColor: '#f97316' }}>DRIVER</span>}

          <div className="user-menu-wrapper">
            <button className="user-avatar-toggle" onClick={() => setShowUserMenu(!showUserMenu)}>
              {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </button>

            <div className={`user-dropdown ${showUserMenu ? 'show' : ''}`}>
              <div className="user-dropdown-header">
                <div className="user-dropdown-avatar">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <strong>{user?.full_name || user?.username}</strong>
                  <span>{user?.email}</span>
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
