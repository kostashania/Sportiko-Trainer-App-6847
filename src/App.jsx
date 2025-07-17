import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { SuperadminProvider } from './contexts/SuperadminContext';
import Layout from './components/layout/Layout';
import SuperadminLayout from './components/layout/SuperadminLayout';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import PlayersPage from './components/players/PlayersPage';
import ShopPage from './components/shop/ShopPage';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import TrainerManagement from './components/superadmin/TrainerManagement';
import ShopManagement from './components/superadmin/ShopManagement';
import AdManagement from './components/superadmin/AdManagement';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConnectionStatus from './components/common/ConnectionStatus';
import { useSuperadmin } from './contexts/SuperadminContext';

const AppRoutes = () => {
  const { isSuperadmin, loading } = useSuperadmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route path="/register" element={<RegisterForm />} />
      
      {isSuperadmin ? (
        // Superadmin routes
        <Route path="/superadmin" element={<SuperadminLayout />}>
          <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute><SuperadminDashboard /></ProtectedRoute>} />
          <Route path="trainers" element={<ProtectedRoute><TrainerManagement /></ProtectedRoute>} />
          <Route path="shop" element={<ProtectedRoute><ShopManagement /></ProtectedRoute>} />
          <Route path="ads" element={<ProtectedRoute><AdManagement /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
        </Route>
      ) : (
        // Regular trainer routes
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
          <Route path="/homework" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Homework Management</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
          <Route path="/assessments" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Player Assessments</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Payments & Subscriptions</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
          <Route path="/ads" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Ad Management</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><div className="p-8 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2><p className="text-gray-600">Coming soon...</p></div></ProtectedRoute>} />
        </Route>
      )}
      
      {/* Redirect based on user type */}
      <Route path="/" element={<Navigate to={isSuperadmin ? "/superadmin" : "/dashboard"} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SuperadminProvider>
          <TenantProvider>
            <Router>
              <div className="min-h-screen bg-gray-50">
                <AppRoutes />
                <Toaster position="top-right" />
                <ConnectionStatus />
              </div>
            </Router>
          </TenantProvider>
        </SuperadminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;