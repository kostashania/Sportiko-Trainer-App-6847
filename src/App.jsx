import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SuperadminProvider } from './contexts/SuperadminContext';
import { TenantProvider } from './contexts/TenantContext';
import Layout from './components/layout/Layout';
import SuperadminLayout from './components/layout/SuperadminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConnectionStatus from './components/common/ConnectionStatus';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import PlayersPage from './components/players/PlayersPage';
import ShopPage from './components/shop/ShopPage';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import TrainerManagement from './components/superadmin/TrainerManagement';
import ShopManagement from './components/superadmin/ShopManagement';
import AdManagement from './components/superadmin/AdManagement';
import InfoPage from './components/superadmin/InfoPage';
import './App.css';

// Create placeholder pages for routes that don't have components yet
const PlaceholderPage = ({ title }) => (
  <div className="p-6 bg-white rounded-lg shadow">
    <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
    <p className="text-gray-600">This feature is coming soon. We're working hard to bring you the best experience possible.</p>
  </div>
);

const HomeworkPage = () => <PlaceholderPage title="Homework" />;
const AssessmentsPage = () => <PlaceholderPage title="Assessments" />;
const PaymentsPage = () => <PlaceholderPage title="Payments" />;
const AdsPage = () => <PlaceholderPage title="Ads" />;
const SettingsPage = () => <PlaceholderPage title="Settings" />;

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SuperadminProvider>
            <TenantProvider>
              <ConnectionStatus />
              <Toaster position="top-right" />
              <Routes>
                {/* Auth routes */}
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                
                {/* Trainer routes */}
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
                  <Route path="homework" element={<ProtectedRoute><HomeworkPage /></ProtectedRoute>} />
                  <Route path="assessments" element={<ProtectedRoute><AssessmentsPage /></ProtectedRoute>} />
                  <Route path="payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
                  <Route path="shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
                  <Route path="ads" element={<ProtectedRoute><AdsPage /></ProtectedRoute>} />
                  <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                </Route>
                
                {/* Superadmin routes */}
                <Route path="/superadmin" element={<SuperadminLayout />}>
                  <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
                  <Route path="dashboard" element={<ProtectedRoute><SuperadminDashboard /></ProtectedRoute>} />
                  <Route path="trainers" element={<ProtectedRoute><TrainerManagement /></ProtectedRoute>} />
                  <Route path="shop" element={<ProtectedRoute><ShopManagement /></ProtectedRoute>} />
                  <Route path="ads" element={<ProtectedRoute><AdManagement /></ProtectedRoute>} />
                  <Route path="info" element={<ProtectedRoute><InfoPage /></ProtectedRoute>} />
                </Route>
              </Routes>
            </TenantProvider>
          </SuperadminProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;