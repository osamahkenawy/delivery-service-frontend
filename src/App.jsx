import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import ErrorBoundary from './components/ErrorBoundary';

// Delivery Platform Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Drivers from './pages/Drivers';
import Dispatch from './pages/Dispatch';
import Clients from './pages/Clients';
import Zones from './pages/Zones';
import Pricing from './pages/Pricing';
import TrackingPublic from './pages/TrackingPublic';
import Notifications from './pages/Notifications';
import Wallet from './pages/Wallet';
import Invoices from './pages/Invoices';
import Reports from './pages/Reports';
import LiveMap from './pages/LiveMap';
import Barcode from './pages/Barcode';
import DriverScan from './pages/DriverScan';
import DriverDashboard from './pages/DriverDashboard';
import DriverHome from './pages/DriverHome';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import ShipmentTracking from './pages/ShipmentTracking';
import BulkImport from './pages/BulkImport';
import Returns from './pages/Returns';
import CODReconciliation from './pages/CODReconciliation';
import Performance from './pages/Performance';

// Super Admin Pages
import SuperAdminLogin from './pages/SuperAdmin/SuperAdminLogin';
import SuperAdminLayout from './pages/SuperAdmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import SuperAdminTenants from './pages/SuperAdmin/SuperAdminTenants';
import SuperAdminModules from './pages/SuperAdmin/SuperAdminModules';
import SuperAdminUsers from './pages/SuperAdmin/SuperAdminUsers';

// Components
import Layout from './components/Layout';

// Auth Context
export const AuthContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Session check timeout')), 8000)
    );
    
    try {
      const token = localStorage.getItem('crm_token');
      if (token) {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await Promise.race([
          fetch(`${API_URL}/auth/session`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          }),
          timeout
        ]);
        const data = await res.json();
        if (data.success && data.data) {
          setUser(data.data);
          setTenant(data.data.tenant);
          localStorage.setItem('crm_user', JSON.stringify(data.data));
          if (data.data.tenant) {
            localStorage.setItem('crm_tenant', JSON.stringify(data.data.tenant));
          }
        } else {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          localStorage.removeItem('crm_tenant');
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // Clear token on any error to force login
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      localStorage.removeItem('crm_tenant');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const loginTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login request timed out')), 10000)
      );
      const res = await Promise.race([
        fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password }),
        }),
        loginTimeout
      ]);
      const data = await res.json();
      if (data.success) {
        const token = data.token || data.data?.token;
        const userData = data.user || data.data;
        if (token && userData) {
          localStorage.setItem('crm_token', token);
          localStorage.setItem('crm_user', JSON.stringify(userData));
          if (userData.tenant) {
            localStorage.setItem('crm_tenant', JSON.stringify(userData.tenant));
            setTenant(userData.tenant);
          }
          setUser(userData);
          return { success: true, role: userData.role };
        }
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err) {
      console.error('[login error]', err);
      return { success: false, message: err.message === 'Login request timed out' ? 'Server not responding. Please try again.' : 'Connection error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('crm_token');
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
    } catch (e) { /* ignore */ }
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_tenant');
    setUser(null);
    setTenant(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', gap: '20px' }}>
        <div className="loader-dots">
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316', animation: 'pulse 1.4s ease-in-out infinite' }}></div>
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316', animation: 'pulse 1.4s ease-in-out infinite 0.2s' }}></div>
          <div className="dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316', animation: 'pulse 1.4s ease-in-out infinite 0.4s' }}></div>
        </div>
        <style>{`
          .loader-dots { display: flex; gap: 8px; }
          @keyframes pulse { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  const isDriver = user?.role === 'driver';
  const homeRoute = isDriver ? '/driver/dashboard' : '/dashboard';

  /** Any authenticated user */
  const PrivateRoute = ({ children }) => user ? <Layout>{children}</Layout> : <Navigate to="/login" />;

  /** Admin + Dispatcher (staff). Drivers get redirected. */
  const StaffRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    if (isDriver) return <Navigate to="/driver/dashboard" />;
    return <Layout>{children}</Layout>;
  };

  /** Admin only. Dispatchers & drivers get redirected. */
  const AdminRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    if (user.role !== 'admin' && user.role !== 'super_admin') return <Navigate to={homeRoute} />;
    return <Layout>{children}</Layout>;
  };

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, tenant, login, logout, checkSession, setUser, setTenant }}>
        <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to={homeRoute} /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={homeRoute} /> : <RegisterPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/track/:token" element={<TrackingPublic />} />
        <Route path="/" element={<Navigate to={user ? homeRoute : '/login'} />} />

        {/* Driver routes (accessible by all authenticated users) */}
        <Route path="/driver/dashboard" element={<PrivateRoute><DriverHome /></PrivateRoute>} />
        <Route path="/driver/orders"    element={<PrivateRoute><DriverDashboard /></PrivateRoute>} />
        <Route path="/driver/scan"      element={<PrivateRoute><DriverScan /></PrivateRoute>} />

        {/* Staff routes — Admin + Dispatcher */}
        <Route path="/dashboard"      element={<StaffRoute><Dashboard /></StaffRoute>} />
        <Route path="/orders"         element={<StaffRoute><Orders /></StaffRoute>} />
        <Route path="/orders/:id"     element={<StaffRoute><OrderDetail /></StaffRoute>} />
        <Route path="/drivers"        element={<StaffRoute><Drivers /></StaffRoute>} />
        <Route path="/dispatch"       element={<StaffRoute><Dispatch /></StaffRoute>} />
        <Route path="/clients"        element={<StaffRoute><Clients /></StaffRoute>} />
        <Route path="/live-map"       element={<StaffRoute><LiveMap /></StaffRoute>} />
        <Route path="/barcode"        element={<PrivateRoute><Barcode /></PrivateRoute>} />
        <Route path="/shipment-tracking" element={<StaffRoute><ShipmentTracking /></StaffRoute>} />
        <Route path="/bulk-import"    element={<StaffRoute><BulkImport /></StaffRoute>} />
        <Route path="/returns"        element={<StaffRoute><Returns /></StaffRoute>} />
        <Route path="/wallet"         element={<StaffRoute><Wallet /></StaffRoute>} />
        <Route path="/invoices"       element={<StaffRoute><Invoices /></StaffRoute>} />
        <Route path="/reports"        element={<StaffRoute><Reports /></StaffRoute>} />
        <Route path="/cod"            element={<StaffRoute><CODReconciliation /></StaffRoute>} />
        <Route path="/performance"    element={<StaffRoute><Performance /></StaffRoute>} />

        {/* Admin-only routes — Configuration & System */}
        <Route path="/zones"          element={<AdminRoute><Zones /></AdminRoute>} />
        <Route path="/pricing"        element={<AdminRoute><Pricing /></AdminRoute>} />
        <Route path="/notifications"  element={<AdminRoute><Notifications /></AdminRoute>} />
        <Route path="/settings"       element={<AdminRoute><Settings /></AdminRoute>} />
        <Route path="/api-keys"       element={<AdminRoute><Integrations /></AdminRoute>} />

        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="tenants"   element={<SuperAdminTenants />} />
          <Route path="tenants/:id" element={<SuperAdminTenants />} />
          <Route path="modules"  element={<SuperAdminModules />} />
          <Route path="users"    element={<SuperAdminUsers />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
