import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import {useTenant} from '../../contexts/TenantContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import {motion} from 'framer-motion';
import StatsCard from './StatsCard';
import AdBanner from './AdBanner';
import RecentActivity from './RecentActivity';

const {FiUsers, FiBookOpen, FiCreditCard, FiTrendingUp} = FiIcons;

const Dashboard = () => {
  const navigate = useNavigate();
  const {profile} = useAuth();
  const {queryTenantTable, tenantReady} = useTenant();
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeHomework: 0,
    pendingPayments: 0,
    monthlyRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantReady) {
      loadDashboardData();
    }
  }, [tenantReady]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Load players count
      const {data: players} = await queryTenantTable('players').select('id');
      
      // Load active homework count
      const {data: homework} = await queryTenantTable('homework')
        .select('id')
        .gte('due_date', new Date().toISOString());
      
      // Load pending payments count
      const {data: payments} = await queryTenantTable('payments')
        .select('id,amount')
        .eq('paid', false);
      
      setStats({
        totalPlayers: players?.length || 0,
        activeHomework: homework?.length || 0,
        pendingPayments: payments?.length || 0,
        monthlyRevenue: payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = () => {
    navigate('/players');
  };

  const handleCreateHomework = () => {
    navigate('/homework');
  };

  const handleProcessPayment = () => {
    navigate('/payments');
  };

  const trialDaysLeft = profile?.trial_end ? Math.ceil((new Date(profile.trial_end) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
        </div>
        {trialDaysLeft > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">{trialDaysLeft} days</span> left in your trial
            </p>
          </div>
        )}
      </div>

      {/* Ad Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdBanner type="superadmin" />
        <AdBanner type="trainer" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Players"
          value={stats.totalPlayers}
          icon={FiUsers}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Active Homework"
          value={stats.activeHomework}
          icon={FiBookOpen}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Pending Payments"
          value={stats.pendingPayments}
          icon={FiCreditCard}
          color="yellow"
          loading={loading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toFixed(2)}`}
          icon={FiTrendingUp}
          color="purple"
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              onClick={handleAddPlayer}
            >
              <div className="flex items-center">
                <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600 mr-3" />
                <span className="text-blue-700">Add New Player</span>
              </div>
            </button>
            <button 
              className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              onClick={handleCreateHomework}
            >
              <div className="flex items-center">
                <SafeIcon icon={FiBookOpen} className="w-5 h-5 text-green-600 mr-3" />
                <span className="text-green-700">Create Homework</span>
              </div>
            </button>
            <button 
              className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              onClick={handleProcessPayment}
            >
              <div className="flex items-center">
                <SafeIcon icon={FiCreditCard} className="w-5 h-5 text-purple-600 mr-3" />
                <span className="text-purple-700">Process Payment</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;