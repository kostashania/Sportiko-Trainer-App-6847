import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';

const { FiHome, FiUsers, FiBookOpen, FiClipboard, FiCreditCard, FiShoppingBag, FiMegaphone, FiSettings, FiLogOut } = FiIcons;

const Sidebar = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/players', icon: FiUsers, label: 'Players' },
    { path: '/homework', icon: FiBookOpen, label: 'Homework' },
    { path: '/assessments', icon: FiClipboard, label: 'Assessments' },
    { path: '/payments', icon: FiCreditCard, label: 'Payments' },
    { path: '/shop', icon: FiShoppingBag, label: 'Shop' },
    { path: '/ads', icon: FiMegaphone, label: 'Ads' },
    { path: '/settings', icon: FiSettings, label: 'Settings' }
  ];

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Sportiko Trainer</h1>
        <p className="text-sm text-gray-600 mt-1">{profile?.full_name}</p>
      </div>
      
      <nav className="flex-1 p-4">
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

export default Sidebar;