import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format, addDays, addMonths, addYears, isAfter, isBefore } from 'date-fns';

const { 
  FiCreditCard, FiUsers, FiCalendar, FiDollarSign, FiRefreshCw, 
  FiEdit, FiTrash2, FiPlus, FiCheck, FiX, FiClock, FiTrendingUp,
  FiSettings, FiAlertTriangle, FiFilter, FiSearch, FiEye, FiGift
} = FiIcons;

const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('extend'); // extend, edit, create_plan
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [extensionForm, setExtensionForm] = useState({
    duration: 30,
    durationType: 'days', // days, months, years
    reason: '',
    adjustPrice: false,
    newPrice: 0
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: 0,
    billing_period: 'monthly',
    features: {
      players_limit: 20,
      storage_limit: '1GB',
      advanced_analytics: false,
      team_features: false,
      custom_branding: false,
      priority_support: false
    },
    is_active: true
  });

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Load trainers with their subscription info
      const { data: trainersData, error: trainersError } = await supabase
        .from('trainers')
        .select(`
          id,
          email,
          full_name,
          subscription_plan,
          subscription_status,
          trial_start,
          trial_end,
          subscription_start,
          subscription_end,
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (trainersError) {
        console.error('Error loading trainers:', trainersError);
        // Use mock data for demo
        setSubscriptions([
          {
            id: 'd45616a4-d90b-4358-b62c-9005f61e3d84',
            email: 'trainer_pt@sportiko.eu',
            full_name: 'Demo Trainer',
            subscription_plan: 'basic',
            subscription_status: 'trial',
            trial_start: '2024-12-20T10:00:00Z',
            trial_end: '2025-01-10T10:00:00Z',
            subscription_start: null,
            subscription_end: null,
            is_active: true,
            created_at: '2024-12-20T10:00:00Z'
          },
          {
            id: '12345678-1234-1234-1234-123456789012',
            email: 'john.coach@sportiko.eu',
            full_name: 'John Coach',
            subscription_plan: 'pro',
            subscription_status: 'active',
            trial_start: '2024-11-01T10:00:00Z',
            trial_end: '2024-11-15T10:00:00Z',
            subscription_start: '2024-11-15T10:00:00Z',
            subscription_end: '2025-02-15T10:00:00Z',
            is_active: true,
            created_at: '2024-11-01T10:00:00Z'
          }
        ]);
      } else {
        setSubscriptions(trainersData || []);
      }

      // Load subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (plansError) {
        console.error('Error loading plans:', plansError);
        // Use mock data for demo
        setSubscriptionPlans([
          {
            id: '1',
            name: 'Basic',
            description: 'Essential features for individual trainers',
            price: 9.99,
            billing_period: 'monthly',
            features: {
              players_limit: 20,
              storage_limit: '1GB',
              advanced_analytics: false,
              team_features: false
            },
            is_active: true
          },
          {
            id: '2',
            name: 'Pro',
            description: 'Advanced features for professional trainers',
            price: 19.99,
            billing_period: 'monthly',
            features: {
              players_limit: 50,
              storage_limit: '5GB',
              advanced_analytics: true,
              team_features: false
            },
            is_active: true
          },
          {
            id: '3',
            name: 'Team',
            description: 'Complete solution for training teams',
            price: 49.99,
            billing_period: 'monthly',
            features: {
              players_limit: 100,
              storage_limit: '20GB',
              advanced_analytics: true,
              team_features: true
            },
            is_active: true
          }
        ]);
      } else {
        setSubscriptionPlans(plansData || []);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const getSubscriptionStatus = (trainer) => {
    const now = new Date();
    
    if (trainer.subscription_status === 'trial') {
      const trialEnd = new Date(trainer.trial_end);
      if (isAfter(now, trialEnd)) {
        return { status: 'trial_expired', color: 'red', label: 'Trial Expired' };
      }
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return { status: 'trial_active', color: 'blue', label: `Trial (${daysLeft}d left)` };
    }
    
    if (trainer.subscription_status === 'active' && trainer.subscription_end) {
      const subEnd = new Date(trainer.subscription_end);
      if (isAfter(now, subEnd)) {
        return { status: 'expired', color: 'red', label: 'Expired' };
      }
      const daysLeft = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7) {
        return { status: 'expiring_soon', color: 'yellow', label: `Expires in ${daysLeft}d` };
      }
      return { status: 'active', color: 'green', label: 'Active' };
    }
    
    if (trainer.subscription_status === 'cancelled') {
      return { status: 'cancelled', color: 'gray', label: 'Cancelled' };
    }
    
    return { status: 'inactive', color: 'gray', label: 'Inactive' };
  };

  const handleExtendSubscription = async () => {
    if (!selectedSubscription) return;
    
    try {
      setProcessingAction('extend');
      toast.loading('Extending subscription...', { id: 'extend-sub' });
      
      const trainer = selectedSubscription;
      let newEndDate;
      
      // Calculate new end date
      if (trainer.subscription_status === 'trial') {
        // Extending trial
        const currentEnd = new Date(trainer.trial_end);
        switch (extensionForm.durationType) {
          case 'days':
            newEndDate = addDays(currentEnd, extensionForm.duration);
            break;
          case 'months':
            newEndDate = addMonths(currentEnd, extensionForm.duration);
            break;
          case 'years':
            newEndDate = addYears(currentEnd, extensionForm.duration);
            break;
        }
        
        const { error } = await supabase
          .from('trainers')
          .update({ trial_end: newEndDate.toISOString() })
          .eq('id', trainer.id);
          
        if (error) throw error;
      } else {
        // Extending active subscription
        const currentEnd = trainer.subscription_end ? new Date(trainer.subscription_end) : new Date();
        switch (extensionForm.durationType) {
          case 'days':
            newEndDate = addDays(currentEnd, extensionForm.duration);
            break;
          case 'months':
            newEndDate = addMonths(currentEnd, extensionForm.duration);
            break;
          case 'years':
            newEndDate = addYears(currentEnd, extensionForm.duration);
            break;
        }
        
        const { error } = await supabase
          .from('trainers')
          .update({ subscription_end: newEndDate.toISOString() })
          .eq('id', trainer.id);
          
        if (error) throw error;
      }
      
      toast.success('Subscription extended successfully!', { id: 'extend-sub' });
      setShowModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Failed to extend subscription: ' + error.message, { id: 'extend-sub' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleChangeSubscriptionPlan = async (trainerId, newPlan, newStatus) => {
    try {
      setProcessingAction(`change-${trainerId}`);
      toast.loading('Updating subscription plan...', { id: 'change-plan' });
      
      const updateData = {
        subscription_plan: newPlan,
        subscription_status: newStatus
      };
      
      // If moving from trial to active, set subscription dates
      if (newStatus === 'active') {
        const now = new Date();
        updateData.subscription_start = now.toISOString();
        updateData.subscription_end = addMonths(now, 1).toISOString();
      }
      
      const { error } = await supabase
        .from('trainers')
        .update(updateData)
        .eq('id', trainerId);
        
      if (error) throw error;
      
      toast.success('Subscription plan updated successfully!', { id: 'change-plan' });
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      toast.error('Failed to update subscription plan: ' + error.message, { id: 'change-plan' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCancelSubscription = async (trainerId) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    
    try {
      setProcessingAction(`cancel-${trainerId}`);
      toast.loading('Cancelling subscription...', { id: 'cancel-sub' });
      
      const { error } = await supabase
        .from('trainers')
        .update({ 
          subscription_status: 'cancelled',
          is_active: false
        })
        .eq('id', trainerId);
        
      if (error) throw error;
      
      toast.success('Subscription cancelled successfully!', { id: 'cancel-sub' });
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription: ' + error.message, { id: 'cancel-sub' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setProcessingAction('create-plan');
      toast.loading('Creating subscription plan...', { id: 'create-plan' });
      
      const { error } = await supabase
        .from('subscription_plans')
        .insert([{
          ...planForm,
          features: JSON.stringify(planForm.features)
        }]);
        
      if (error) throw error;
      
      toast.success('Subscription plan created successfully!', { id: 'create-plan' });
      setShowPlanModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create subscription plan: ' + error.message, { id: 'create-plan' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    
    try {
      setProcessingAction('update-plan');
      toast.loading('Updating subscription plan...', { id: 'update-plan' });
      
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          ...planForm,
          features: JSON.stringify(planForm.features)
        })
        .eq('id', selectedPlan.id);
        
      if (error) throw error;
      
      toast.success('Subscription plan updated successfully!', { id: 'update-plan' });
      setShowPlanModal(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update subscription plan: ' + error.message, { id: 'update-plan' });
    } finally {
      setProcessingAction(null);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === 'all') return true;
    
    const status = getSubscriptionStatus(sub).status;
    return status === statusFilter;
  });

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => getSubscriptionStatus(s).status === 'active').length,
    trial: subscriptions.filter(s => getSubscriptionStatus(s).status === 'trial_active').length,
    expired: subscriptions.filter(s => ['expired', 'trial_expired'].includes(getSubscriptionStatus(s).status)).length,
    revenue: subscriptions
      .filter(s => s.subscription_status === 'active')
      .reduce((sum, s) => {
        const plan = subscriptionPlans.find(p => p.name.toLowerCase() === s.subscription_plan?.toLowerCase());
        return sum + (plan?.price || 0);
      }, 0)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600">Manage trainer subscriptions and billing</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              setSelectedPlan(null);
              setPlanForm({
                name: '',
                description: '',
                price: 0,
                billing_period: 'monthly',
                features: {
                  players_limit: 20,
                  storage_limit: '1GB',
                  advanced_analytics: false,
                  team_features: false,
                  custom_branding: false,
                  priority_support: false
                },
                is_active: true
              });
              setShowPlanModal(true);
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
            Create Plan
          </button>
          <button
            onClick={loadSubscriptionData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiUsers} className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Trainers</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiClock} className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Trial</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.trial}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiX} className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.expired}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiDollarSign} className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">${stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <div key={plan.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setPlanForm({
                      ...plan,
                      features: typeof plan.features === 'string' 
                        ? JSON.parse(plan.features) 
                        : plan.features
                    });
                    setShowPlanModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <SafeIcon icon={FiEdit} className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-green-600">${plan.price}</span>
                <span className="text-sm text-gray-500">/{plan.billing_period}</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">
                  • {plan.features?.players_limit || 0} players
                </div>
                <div className="text-xs text-gray-600">
                  • {plan.features?.storage_limit || '1GB'} storage
                </div>
                {plan.features?.advanced_analytics && (
                  <div className="text-xs text-gray-600">• Advanced analytics</div>
                )}
                {plan.features?.team_features && (
                  <div className="text-xs text-gray-600">• Team features</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search trainers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial_active">Trial Active</option>
          <option value="expired">Expired</option>
          <option value="trial_expired">Trial Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Subscriptions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Trainer Subscriptions ({filteredSubscriptions.length})
          </h3>
        </div>
        
        {filteredSubscriptions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No subscriptions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trainer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => {
                  const status = getSubscriptionStatus(subscription);
                  const isProcessing = processingAction?.includes(subscription.id);
                  
                  return (
                    <motion.tr
                      key={subscription.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={isProcessing ? 'opacity-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {subscription.full_name}
                          </div>
                          <div className="text-sm text-gray-500">{subscription.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={subscription.subscription_plan || 'basic'}
                          onChange={(e) => handleChangeSubscriptionPlan(
                            subscription.id, 
                            e.target.value, 
                            subscription.subscription_status === 'trial' ? 'active' : subscription.subscription_status
                          )}
                          disabled={isProcessing}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {subscriptionPlans.map(plan => (
                            <option key={plan.id} value={plan.name.toLowerCase()}>
                              {plan.name} (${plan.price})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${status.color}-100 text-${status.color}-800`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {subscription.subscription_status === 'trial' ? (
                          <div>
                            <div>Trial: {subscription.trial_end ? format(new Date(subscription.trial_end), 'MMM dd, yyyy') : 'N/A'}</div>
                          </div>
                        ) : (
                          <div>
                            <div>Start: {subscription.subscription_start ? format(new Date(subscription.subscription_start), 'MMM dd, yyyy') : 'N/A'}</div>
                            <div>End: {subscription.subscription_end ? format(new Date(subscription.subscription_end), 'MMM dd, yyyy') : 'N/A'}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setExtensionForm({
                                duration: 30,
                                durationType: 'days',
                                reason: '',
                                adjustPrice: false,
                                newPrice: 0
                              });
                              setModalType('extend');
                              setShowModal(true);
                            }}
                            disabled={isProcessing}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Extend Subscription"
                          >
                            <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleCancelSubscription(subscription.id)}
                            disabled={isProcessing || subscription.subscription_status === 'cancelled'}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Cancel Subscription"
                          >
                            <SafeIcon icon={FiX} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extension Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Extend Subscription
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={extensionForm.duration}
                      onChange={(e) => setExtensionForm({
                        ...extensionForm,
                        duration: parseInt(e.target.value) || 0
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <select
                      value={extensionForm.durationType}
                      onChange={(e) => setExtensionForm({
                        ...extensionForm,
                        durationType: e.target.value
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={extensionForm.reason}
                    onChange={(e) => setExtensionForm({
                      ...extensionForm,
                      reason: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason for extension..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendSubscription}
                  disabled={processingAction === 'extend'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {processingAction === 'extend' ? 'Extending...' : 'Extend'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedPlan ? 'Edit' : 'Create'} Subscription Plan
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Period
                    </label>
                    <select
                      value={planForm.billing_period}
                      onChange={(e) => setPlanForm({ ...planForm, billing_period: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Players Limit
                    </label>
                    <input
                      type="number"
                      value={planForm.features.players_limit}
                      onChange={(e) => setPlanForm({
                        ...planForm,
                        features: {
                          ...planForm.features,
                          players_limit: parseInt(e.target.value) || 0
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Limit
                  </label>
                  <input
                    type="text"
                    value={planForm.features.storage_limit}
                    onChange={(e) => setPlanForm({
                      ...planForm,
                      features: {
                        ...planForm.features,
                        storage_limit: e.target.value
                      }
                    })}
                    placeholder="e.g., 1GB, 5GB, 20GB"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Features</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={planForm.features.advanced_analytics}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          features: {
                            ...planForm.features,
                            advanced_analytics: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      Advanced Analytics
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={planForm.features.team_features}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          features: {
                            ...planForm.features,
                            team_features: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      Team Features
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={planForm.features.custom_branding}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          features: {
                            ...planForm.features,
                            custom_branding: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      Custom Branding
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={planForm.features.priority_support}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          features: {
                            ...planForm.features,
                            priority_support: e.target.checked
                          }
                        })}
                        className="mr-2"
                      />
                      Priority Support
                    </label>
                  </div>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  Active Plan
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={selectedPlan ? handleUpdatePlan : handleCreatePlan}
                  disabled={processingAction === 'create-plan' || processingAction === 'update-plan'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {processingAction === 'create-plan' || processingAction === 'update-plan' 
                    ? 'Saving...' 
                    : selectedPlan ? 'Update Plan' : 'Create Plan'
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;