import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import StatsCard from '../dashboard/StatsCard';
import toast from 'react-hot-toast';

const { FiUsers, FiShoppingBag, FiDollarSign, FiTrendingUp } = FiIcons;

const SuperadminDashboard = () => {
  const [stats, setStats] = useState({
    totalTrainers: 0,
    totalPlayers: 0,
    totalRevenue: 0,
    activeOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSuperadminStats();
  }, []);

  const loadSuperadminStats = async () => {
    try {
      setLoading(true);
      
      // Get total trainers
      const { data: trainers } = await supabase
        .from('trainers')
        .select('id');
      
      // Get total orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status');
      
      // Calculate stats
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const activeOrders = orders?.filter(order => order.status === 'pending' || order.status === 'processing').length || 0;

      setStats({
        totalTrainers: trainers?.length || 0,
        totalPlayers: 0, // This would need to be calculated from all tenant schemas
        totalRevenue,
        activeOrders
      });
    } catch (error) {
      console.error('Error loading superadmin stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
          <p className="text-gray-600">Manage the entire Sportiko platform</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Trainers"
          value={stats.totalTrainers}
          icon={FiUsers}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Total Players"
          value={stats.totalPlayers}
          icon={FiUsers}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={FiDollarSign}
          color="purple"
          loading={loading}
        />
        <StatsCard
          title="Active Orders"
          value={stats.activeOrders}
          icon={FiShoppingBag}
          color="yellow"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-blue-700">Manage Trainers</span>
              </div>
            </button>
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <SafeIcon icon={FiShoppingBag} className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-green-700">Manage Shop Items</span>
              </div>
            </button>
            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <SafeIcon icon={FiTrendingUp} className="w-5 h-5 text-purple-600 mr-3" />
                <span className="text-purple-700">View Analytics</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New trainer registered</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Shop item added</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Order processed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminDashboard;