import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import StatsCard from '../dashboard/StatsCard';
import toast from 'react-hot-toast';

const { 
  FiUsers, FiShoppingBag, FiDollarSign, FiTrendingUp, FiDatabase, 
  FiShield, FiSettings, FiLayers, FiCreditCard 
} = FiIcons;

const SuperadminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTrainers: 0,
    totalPlayers: 0,
    totalRevenue: 0,
    activeOrders: 0,
    tenantSchemas: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadSuperadminStats();
    loadRecentActivity();
  }, []);

  const loadSuperadminStats = async () => {
    try {
      setLoading(true);

      // Get total trainers
      const { data: trainers } = await supabase
        .from('trainers')
        .select('id, subscription_status, subscription_plan');

      // Get total orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status');

      // Get tenant schemas count
      let tenantSchemasCount = 0;
      try {
        const { data: schemas } = await supabase.rpc('get_schemas_info');
        tenantSchemasCount = schemas?.filter(s => s.is_trainer_schema).length || 0;
      } catch (error) {
        console.error('Error loading schemas:', error);
        // Use trainer count as fallback
        tenantSchemasCount = trainers?.length || 0;
      }

      // Calculate subscription stats
      const activeSubscriptions = trainers?.filter(t => 
        t.subscription_status === 'active' || t.subscription_status === 'trial'
      ).length || 0;

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const activeOrders = orders?.filter(order => 
        order.status === 'pending' || order.status === 'processing'
      ).length || 0;

      setStats({
        totalTrainers: trainers?.length || 0,
        totalPlayers: 0, // This would need to be calculated from all tenant schemas
        totalRevenue,
        activeOrders,
        tenantSchemas: tenantSchemasCount,
        activeSubscriptions
      });
    } catch (error) {
      console.error('Error loading superadmin stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent trainers
      const { data: recentTrainers } = await supabase
        .from('trainers')
        .select('full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities = [
        ...(recentTrainers?.map(trainer => ({
          id: `trainer-${trainer.email}`,
          type: 'trainer_registered',
          message: `New trainer ${trainer.full_name} registered`,
          timestamp: trainer.created_at,
          icon: FiUsers,
          color: 'blue'
        })) || []),
        ...(recentOrders?.map(order => ({
          id: `order-${order.created_at}`,
          type: 'order_placed',
          message: `Order placed for $${order.total_amount}`,
          timestamp: order.created_at,
          icon: FiShoppingBag,
          color: 'green'
        })) || [])
      ];

      // Sort by timestamp and take top 10
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleManageTrainers = () => {
    navigate('/superadmin/trainers');
  };

  const handleManageSchemas = () => {
    navigate('/superadmin/schemas');
  };

  const handleManageShop = () => {
    navigate('/superadmin/shop');
  };

  const handleManageAds = () => {
    navigate('/superadmin/ads');
  };

  const handleManageSubscriptions = () => {
    navigate('/superadmin/subscriptions');
  };

  const handleSystemInfo = () => {
    navigate('/superadmin/info');
  };

  const handleViewAnalytics = () => {
    // For now, just show a coming soon message
    toast.success('Analytics feature coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
          <p className="text-gray-600">Manage the entire Sportiko platform</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSystemInfo}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <SafeIcon icon={FiDatabase} className="w-4 h-4 mr-2" />
            System Info
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <StatsCard
          title="Total Trainers"
          value={stats.totalTrainers}
          icon={FiUsers}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={FiCreditCard}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Tenant Schemas"
          value={stats.tenantSchemas}
          icon={FiDatabase}
          color="purple"
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

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={handleManageTrainers}
              className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <span className="text-blue-700 font-medium">Manage Trainers</span>
                  <p className="text-blue-600 text-sm">Add, edit, and manage trainer accounts</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleManageSubscriptions}
              className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiCreditCard} className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <span className="text-green-700 font-medium">Subscription Management</span>
                  <p className="text-green-600 text-sm">Manage trainer subscriptions and billing</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleManageSchemas}
              className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiLayers} className="w-5 h-5 text-purple-600 mr-3" />
                <div>
                  <span className="text-purple-700 font-medium">Tenant Schemas</span>
                  <p className="text-purple-600 text-sm">View and manage existing tenant schemas</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleManageShop}
              className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiShoppingBag} className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <span className="text-yellow-700 font-medium">Manage Shop Items</span>
                  <p className="text-yellow-600 text-sm">Add products and manage inventory</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleManageAds}
              className="w-full text-left p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiTrendingUp} className="w-5 h-5 text-indigo-600 mr-3" />
                <div>
                  <span className="text-indigo-700 font-medium">Manage Advertisements</span>
                  <p className="text-indigo-600 text-sm">Create and schedule platform ads</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleViewAnalytics}
              className="w-full text-left p-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiTrendingUp} className="w-5 h-5 text-pink-600 mr-3" />
                <div>
                  <span className="text-pink-700 font-medium">View Analytics</span>
                  <p className="text-pink-600 text-sm">Platform performance metrics</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full bg-${activity.color}-50`}>
                    <SafeIcon icon={activity.icon} className={`w-4 h-4 text-${activity.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <SafeIcon icon={FiDatabase} className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">Database</span>
            </div>
            <span className="text-green-600 font-semibold">Healthy</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <SafeIcon icon={FiShield} className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">Security</span>
            </div>
            <span className="text-green-600 font-semibold">Protected</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <SafeIcon icon={FiSettings} className="w-5 h-5 text-green-600 mr-3" />
              <span className="text-green-800 font-medium">Services</span>
            </div>
            <span className="text-green-600 font-semibold">Running</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <SafeIcon icon={FiLayers} className="w-5 h-5 text-purple-600 mr-3" />
              <span className="text-purple-800 font-medium">Schemas</span>
            </div>
            <span className="text-purple-600 font-semibold">{stats.tenantSchemas} Active</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <SafeIcon icon={FiCreditCard} className="w-5 h-5 text-blue-600 mr-3" />
              <span className="text-blue-800 font-medium">Subscriptions</span>
            </div>
            <span className="text-blue-600 font-semibold">{stats.activeSubscriptions} Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperadminDashboard;