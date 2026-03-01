import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../App';
import {
  HomeSimple, Package, DeliveryTruck, Map, User, MapPin,
  DollarCircle, Bell, Wallet, Page, StatsUpSquare, Settings,
  Network, Menu, LogOut, Language, Dashboard, Upload,
  RefreshDouble, CreditCard, Medal, Search, QrCode, ScanBarcode
} from 'iconoir-react';
import NotificationBell from './NotificationBell';
import './Layout.css';

const iconMap = {
  'dashboard':        HomeSimple,
  'orders':           Package,
  'drivers':          DeliveryTruck,
  'dispatch':         Map,
  'live-map':         Map,
  'barcode':          QrCode,
  'driver-scan':      ScanBarcode,
  'my-deliveries':    Package,
  'driver-dashboard': HomeSimple,
  'my-orders':        Package,
  'clients':          User,
  'zones':            MapPin,
  'pricing':          DollarCircle,
  'notifications':    Bell,
  'wallet':           Wallet,
  'invoices':         Page,
  'reports':          StatsUpSquare,
  'settings':         Settings,
  'api-keys':         Network,
  'shipment-tracking': Search,
  'bulk-import':      Upload,
  'returns':          RefreshDouble,
  'cod':              CreditCard,
  'performance':      Medal,
};

/*
 * ═══════════════════════════════════════════════════════════
 * ROLE-BASED SIDEBAR NAVIGATION
 *
 * Each nav item has a `roles` array defining who can see it.
 * Roles: admin, dispatcher (staff), driver
 *
 * Admin        → Full access to everything
 * Dispatcher   → Operations + Finance (no config/system)
 * Driver       → Only driver-specific pages
 * ═══════════════════════════════════════════════════════════
 */

const navSections = [
  /* ── MAIN ─────────────────────────────────────────── */
  {
    titleKey: 'main',
    items: [
      { path: '/dashboard',          labelKey: 'dashboard',       iconKey: 'dashboard',        moduleKey: 'dashboard',         roles: ['admin', 'dispatcher'] },
      { path: '/driver/dashboard',   labelKey: 'driver_home',     iconKey: 'driver-dashboard', moduleKey: 'driver-dashboard',  roles: ['driver'] },
    ]
  },
  /* ── OPERATIONS ───────────────────────────────────── */
  {
    titleKey: 'operations',
    items: [
      { path: '/orders',             labelKey: 'orders',          iconKey: 'orders',           moduleKey: 'orders',            roles: ['admin', 'dispatcher'] },
      { path: '/dispatch',           labelKey: 'dispatch',        iconKey: 'dispatch',         moduleKey: 'dispatch',          roles: ['admin', 'dispatcher'] },
      { path: '/drivers',            labelKey: 'drivers',         iconKey: 'drivers',          moduleKey: 'drivers',           roles: ['admin', 'dispatcher'] },
      { path: '/clients',            labelKey: 'clients',         iconKey: 'clients',          moduleKey: 'clients',           roles: ['admin', 'dispatcher'] },
      { path: '/live-map',           labelKey: 'livemap',         iconKey: 'live-map',         moduleKey: 'live-map',          roles: ['admin', 'dispatcher'] },
      { path: '/shipment-tracking',  labelKey: 'tracking',        iconKey: 'shipment-tracking', moduleKey: 'shipment-tracking', roles: ['admin', 'dispatcher'] },
      { path: '/bulk-import',        labelKey: 'bulk_import',     iconKey: 'bulk-import',      moduleKey: 'bulk-import',       roles: ['admin', 'dispatcher'] },
      { path: '/returns',            labelKey: 'returns',         iconKey: 'returns',          moduleKey: 'returns',           roles: ['admin', 'dispatcher'] },
    ]
  },
  /* ── DRIVER TOOLS ─────────────────────────────────── */
  {
    titleKey: 'tools',
    items: [
      { path: '/driver/orders',      labelKey: 'my_deliveries',   iconKey: 'my-deliveries',    moduleKey: 'my-deliveries',     roles: ['driver'] },
      { path: '/driver/scan',        labelKey: 'scan_shipment',   iconKey: 'driver-scan',      moduleKey: 'driver-scan',       roles: ['driver'] },
      { path: '/barcode',            labelKey: 'barcode',         iconKey: 'barcode',          moduleKey: 'barcode',           roles: ['driver'] },
    ]
  },
  /* ── FINANCE ──────────────────────────────────────── */
  {
    titleKey: 'finance',
    items: [
      { path: '/wallet',             labelKey: 'wallet',          iconKey: 'wallet',           moduleKey: 'wallet',            roles: ['admin', 'dispatcher'] },
      { path: '/invoices',           labelKey: 'invoices',        iconKey: 'invoices',         moduleKey: 'invoices',          roles: ['admin', 'dispatcher'] },
      { path: '/cod',                labelKey: 'cod_reconciliation', iconKey: 'cod',            moduleKey: 'cod',               roles: ['admin', 'dispatcher'] },
    ]
  },
  /* ── ANALYTICS ────────────────────────────────────── */
  {
    titleKey: 'analytics',
    items: [
      { path: '/reports',            labelKey: 'reports',         iconKey: 'reports',          moduleKey: 'reports',           roles: ['admin', 'dispatcher'] },
      { path: '/performance',        labelKey: 'performance',     iconKey: 'performance',      moduleKey: 'performance',       roles: ['admin', 'dispatcher'] },
    ]
  },
  /* ── CONFIGURATION (admin-only) ───────────────────── */
  {
    titleKey: 'config',
    items: [
      { path: '/zones',              labelKey: 'zones',           iconKey: 'zones',            moduleKey: 'zones',             roles: ['admin'] },
      { path: '/pricing',            labelKey: 'pricing',         iconKey: 'pricing',          moduleKey: 'pricing',           roles: ['admin'] },
    ]
  },
  /* ── SYSTEM (admin-only) ──────────────────────────── */
  {
    titleKey: 'system',
    items: [
      { path: '/notifications',      labelKey: 'notifications',   iconKey: 'notifications',    moduleKey: 'notifications',     roles: ['admin'] },
      { path: '/settings',           labelKey: 'settings',        iconKey: 'settings',         moduleKey: 'settings',          roles: ['admin'] },
      { path: '/api-keys',           labelKey: 'integrations',    iconKey: 'api-keys',         moduleKey: 'integrations',      roles: ['admin'] },
    ]
  },
];

/**
 * Filter nav sections based on user's permitted modules (dynamic roles).
 * If permittedModules is null/undefined → unrestricted (show all for that legacy role).
 * If permittedModules is an array → show only items whose moduleKey is included.
 * Falls back to legacy role-based filtering when no permittedModules.
 */
function getNavForRole(role, permittedModules) {
  return navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        // Dynamic: if user has permittedModules array, use it
        if (Array.isArray(permittedModules)) {
          return permittedModules.includes(item.moduleKey);
        }
        // Legacy fallback: use hardcoded roles array
        return item.roles.includes(role);
      }),
    }))
    .filter(section => section.items.length > 0);
}

const allNavItems = navSections.flatMap(s => s.items);

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
    const rtlLangs = ['ar'];
    i18n.changeLanguage(lng);
    document.documentElement.dir = rtlLangs.includes(lng) ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
    setShowLangMenu(false);
  };

  const getPageTitle = () => {
    const item = allNavItems.find(item => location.pathname.startsWith(item.path));
    if (item) {
      return t(`common.${item.labelKey}`);
    }
    return 'Trasealla Solutions';
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
              src={(user?.tenant_logo_white || tenant?.logo_url_white || '').replace(/^\/uploads\//, '/api/file/') || '/assets/images/logos/trasealla_white_without_bg.png'}
              alt={user?.tenant_name || tenant?.name || 'Trasealla Solutions'}
              style={{ height: '100px' }}
              onError={e => {
                if (e.target.src !== window.location.origin + '/assets/images/logos/trasealla_white_without_bg.png') {
                  e.target.src = '/assets/images/logos/trasealla_white_without_bg.png';
                } else {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }
              }}
            />
            <span style={{ display: 'none', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
              Trasealla
            </span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {getNavForRole(user?.role || 'admin', user?.permitted_modules).map((section) => (
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
                src={(user?.tenant_logo || '').replace(/^\/uploads\//, '/api/file/') || '/assets/images/logos/trasealla_logo_logistics_without_bg.png'}
                alt={user?.tenant_name || 'Trasealla'}
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
                {[
                  { code: 'en', label: 'English' },
                  { code: 'ar', label: 'العربية' },
                  { code: 'es', label: 'Español' },
                  { code: 'pt', label: 'Português' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'tl', label: 'Tagalog' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
                    onClick={() => changeLanguage(lang.code)}
                  >
                    {lang.code.toUpperCase()} &mdash; {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user?.role === 'superadmin'  && <span className="role-badge super-admin">SUPER ADMIN</span>}
          {user?.role === 'super_admin' && <span className="role-badge super-admin">SUPER ADMIN</span>}
          {user?.role === 'admin'       && <span className="role-badge admin">ADMIN</span>}
          {user?.role === 'dispatcher'  && <span className="role-badge staff">STAFF</span>}
          {user?.role === 'driver'      && <span className="role-badge staff" style={{ background: '#f973161a', color: '#f97316', borderColor: '#f97316' }}>DRIVER</span>}

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
        {t('footer.copyright', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
