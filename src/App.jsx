import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import Layout from './components/layout/Layout';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './components/dashboard/Dashboard';
import PlayersPage from './components/players/PlayersPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import ConnectionStatus from './components/common/ConnectionStatus';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/register" element={<RegisterForm />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/players" element={
                    <ProtectedRoute>
                      <PlayersPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/homework" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Homework Management</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                  <Route path="/assessments" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Player Assessments</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                  <Route path="/payments" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payments & Subscriptions</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                  <Route path="/shop" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mini E-shop</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                  <Route path="/ads" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ad Management</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute>
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  } />
                </Route>
              </Routes>
              <Toaster position="top-right" />
              <ConnectionStatus />
            </div>
          </Router>
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;