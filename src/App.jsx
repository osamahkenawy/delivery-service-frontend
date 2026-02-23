import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';

// Delivery Platform Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
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
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';

// Super Admin Pages
import SuperAdminLogin from './pages/SuperAdmin/SuperAdminLogin';
import SuperAdminLayout from './pages/SuperAdmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import SuperAdminTenants from './pages/SuperAdmin/SuperAdminTenants';

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
    try {
      const token = localStorage.getItem('crm_token');
      if (token) {
        const API_URL = import.meta.env.VITE_API_URL || '/api';
        const res = await fetch(`${API_URL}/auth/session`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
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
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const API_URL = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
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
    return { success: false, message: data.message };
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

  const PrivateRoute = ({ children }) => user ? <Layout>{children}</Layout> : <Navigate to="/login" />;

  return (
    <AuthContext.Provider value={{ user, tenant, login, logout, checkSession, setUser, setTenant }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
        <Route path="/track/:token" element={<TrackingPublic />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} />} />

        {/* Protected delivery routes */}
        <Route path="/dashboard"      element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/orders"         element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/orders/:id"     element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/drivers"        element={<PrivateRoute><Drivers /></PrivateRoute>} />
        <Route path="/dispatch"       element={<PrivateRoute><Dispatch /></PrivateRoute>} />
        <Route path="/clients"        element={<PrivateRoute><Clients /></PrivateRoute>} />
        <Route path="/zones"          element={<PrivateRoute><Zones /></PrivateRoute>} />
        <Route path="/pricing"        element={<PrivateRoute><Pricing /></PrivateRoute>} />
        <Route path="/notifications"  element={<PrivateRoute><Notifications /></PrivateRoute>} />
        <Route path="/wallet"         element={<PrivateRoute><Wallet /></PrivateRoute>} />
        <Route path="/invoices"       element={<PrivateRoute><Invoices /></PrivateRoute>} />
        <Route path="/reports"        element={<PrivateRoute><Reports /></PrivateRoute>} />
        <Route path="/settings"       element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/api-keys"       element={<PrivateRoute><Integrations /></PrivateRoute>} />

        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<Navigate to="/super-admin/dashboard" />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="tenants"   element={<SuperAdminTenants />} />
          <Route path="tenants/:id" element={<SuperAdminTenants />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
