/* ══════════════════════════════════════════════════════════════
 * ClientLayout.jsx — Merchant Portal Layout with Sidebar
 * Clean, merchant-focused UI — no admin controls
 * ══════════════════════════════════════════════════════════════ */
import { useState, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthContext } from '../../App';
import {
  HomeSimple, Package, StatsUpSquare, Page, Wallet,
  Menu, LogOut, User, QrCode, Upload, Plus, Settings, Search,
  CreditCard, MapPin
} from 'iconoir-react';
import './ClientLayout.css';

const navItems = [
  { path: '/merchant/dashboard',  label: 'Dashboard',   icon: HomeSimple,    key: 'dashboard' },
  { path: '/merchant/orders',     label: 'My Orders',    icon: Package,       key: 'orders' },
  { path: '/merchant/create-order', label: 'New Order',  icon: Plus,          key: 'create' },
  { path: '/merchant/bulk-import', label: 'Bulk Import', icon: Upload,        key: 'import' },
  { path: '/merchant/barcodes',   label: 'Barcodes',     icon: QrCode,        key: 'barcodes' },
  { path: '/merchant/tracking',   label: 'Tracking',     icon: Search,        key: 'tracking' },
  { divider: true, label: 'Finance' },
  { path: '/merchant/invoices',   label: 'Invoices',     icon: Page,          key: 'invoices' },
  { path: '/merchant/wallet',     label: 'Wallet / COD', icon: Wallet,        key: 'wallet' },
  { divider: true, label: 'Account' },
  { path: '/merchant/addresses',  label: 'Addresses',    icon: MapPin,        key: 'addresses' },
  { path: '/merchant/settings',   label: 'Settings',     icon: Settings,      key: 'settings' },
];

export default function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile]       = useState(false);
  const { user, tenant, logout }      = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const token = localStorage.getItem('crm_token');
      await fetch(`${API_URL}/client-portal/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
    } catch { /* ignore */ }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant');
    if (logout) await logout();
    navigate('/merchant/login');
  };

  const rawLogo = tenant?.logo_url;
  const logoSrc = rawLogo
    ? '/api/file?path=' + encodeURIComponent(rawLogo.replace(/^\/uploads\//, ''))
    : '/assets/images/logos/trasealla_with_bg.jpg';

  const clientName = user?.full_name || user?.company_name || 'Merchant';

  return (
    <div className={`cl-container ${sidebarOpen ? 'cl-sidebar-open' : 'cl-sidebar-closed'}`}>
      {/* SIDEBAR */}
      <aside className={`cl-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="cl-sidebar-header">
          <img src={logoSrc} alt="" className="cl-sidebar-logo" />
          {sidebarOpen && <span className="cl-sidebar-brand">{tenant?.name || 'Trasealla'}</span>}
        </div>

        <nav className="cl-nav">
          {navItems.map((item, i) => {
            if (item.divider) {
              return sidebarOpen ? (
                <div key={i} className="cl-nav-divider">{item.label}</div>
              ) : <div key={i} className="cl-nav-divider-dot" />;
            }
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== '/merchant/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`cl-nav-item ${active ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarOpen(false)}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon width={20} height={20} strokeWidth={1.5} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="cl-sidebar-footer">
          <button className="cl-nav-item cl-logout-btn" onClick={handleLogout}>
            <LogOut width={20} height={20} strokeWidth={1.5} />
            {sidebarOpen && <span>{t('common.logout', 'Logout')}</span>}
          </button>
        </div>
      </aside>

      {/* OVERLAY (mobile) */}
      {isMobile && sidebarOpen && (
        <div className="cl-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT */}
      <div className="cl-main">
        {/* TOP BAR */}
        <header className="cl-topbar">
          <button className="cl-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
            <Menu width={22} height={22} />
          </button>

          <div className="cl-topbar-right">
            <div className="cl-user-info">
              <div className="cl-avatar">{clientName.charAt(0).toUpperCase()}</div>
              <div className="cl-user-meta">
                <span className="cl-user-name">{clientName}</span>
                <span className="cl-user-role">Merchant</span>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="cl-content">
          {children}
        </main>
      </div>
    </div>
  );
}
