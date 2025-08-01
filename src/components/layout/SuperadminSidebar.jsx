import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiHome, FiUsers, FiBookOpen, FiClipboard, FiCreditCard, FiShoppingBag, FiMegaphone, FiSettings, FiLogOut, FiDatabase, FiLayers } = FiIcons;

const SuperadminSidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    toast.loading('Signing out...', { id: 'signout' });
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Sign out error:', error);
        toast.error('Failed to sign out. Please try again.', { id: 'signout' });
      } else {
        toast.success('Signed out successfully', { id: 'signout' });
        navigate('/login');
      }
    } catch (e) {
      console.error('Exception during sign out:', e);
      toast.error('An error occurred. Please try again.', { id: 'signout' });
      // Force navigation to login page even if there was an error
      setTimeout(() => {
        navigate('/login');
      }, 1000);
    }
  };

  const menuItems = [
    { path: '/superadmin/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/superadmin/trainers', icon: FiUsers, label: 'Trainers' },
    { path: '/superadmin/schemas', icon: FiLayers, label: 'Tenant Schemas' },
    { path: '/superadmin/shop', icon: FiShoppingBag, label: 'Shop' },
    { path: '/superadmin/ads', icon: FiMegaphone, label: 'Ads' },
    { path: '/superadmin/info', icon: FiDatabase, label: 'System Info' }
  ];

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Sportiko Admin</h1>
        <p className="text-sm text-gray-600 mt-1">Superadmin Panel</p>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
                onClick={() => navigate(item.path)}
              >
                <SafeIcon icon={item.icon} className="w-5 h-5 mr-3" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <SafeIcon icon={FiLogOut} className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default SuperadminSidebar;