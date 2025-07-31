import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperadmin } from '../../contexts/SuperadminContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const { FiUsers, FiCalendar, FiMail, FiClock, FiCheck, FiX, FiPlus, FiDatabase, FiEdit, FiTrash2, FiEye, FiEyeOff, FiLoader, FiRefreshCw, FiAlertTriangle } = FiIcons;

const TrainerManagement = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [newTrainer, setNewTrainer] = useState({
    email: '',
    full_name: '',
    password: 'pass123',
    subscription_plan: 'trial',
    trial_days: 14
  });
  const [processingAction, setProcessingAction] = useState(null);
  const [authDebugInfo, setAuthDebugInfo] = useState(null);

  // Get authentication context
  const { user, profile } = useAuth();
  const { isSuperadmin } = useSuperadmin();

  useEffect(() => {
    loadTrainers();
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      console.log('🔍 Checking authentication status...');
      
      // Check if we have a user from context
      if (!user) {
        console.warn('⚠️ No user found in auth context');
        setAuthDebugInfo({
          user_email: 'No user',
          session_info: 'No active session',
          can_delete_trainers: false,
          error: 'No user found in auth context'
        });
        return;
      }

      console.log('👤 User from context:', { id: user.id, email: user.email, profile: profile });

      // Check Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📱 Session check:', { session: !!session, error: sessionError });

      if (!session) {
        console.warn('⚠️ No active Supabase session found');
        setAuthDebugInfo({
          user_email: user.email,
          session_info: 'No Supabase session',
          can_delete_trainers: false,
          error: 'No active Supabase session'
        });
        return;
      }

      // For authenticated users, check database permissions
      try {
        const { data: debugData, error: debugError } = await supabase.rpc('debug_user_auth');
        
        if (debugError) {
          console.error('❌ Debug auth error:', debugError);
          setAuthDebugInfo({
            user_email: user.email,
            session_info: 'Supabase session active',
            can_delete_trainers: false,
            error: debugError.message
          });
        } else {
          console.log('🐛 Auth debug info:', debugData);
          setAuthDebugInfo(debugData[0] || {
            user_email: user.email,
            session_info: 'Supabase session active',
            can_delete_trainers: isSuperadmin || profile?.role === 'superadmin',
          });
        }
      } catch (dbError) {
        console.error('❌ Database check failed:', dbError);
        setAuthDebugInfo({
          user_email: user.email,
          session_info: 'Supabase session active',
          can_delete_trainers: isSuperadmin || profile?.role === 'superadmin',
          error: 'Database check failed'
        });
      }

    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      setAuthDebugInfo({
        user_email: user?.email || 'Unknown',
        session_info: 'Error checking session',
        can_delete_trainers: false,
        error: error.message
      });
    }
  };

  const loadTrainers = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading trainers from database...');

      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading trainers:', error);
        throw error;
      }

      console.log('✅ Trainers loaded:', data?.length || 0, 'records');
      setTrainers(data || []);
    } catch (error) {
      console.error('❌ Failed to load trainers:', error);
      toast.error('Failed to load trainers: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const debugAuth = async () => {
    console.log('🔧 Manual debug auth triggered');
    
    // For real users, check if they have an active session
    if (!user) {
      toast.error('No active session. Please log in again.');
      return;
    }

    // Check authentication status
    await checkAuthenticationStatus();

    // Show appropriate message based on auth status
    if (authDebugInfo?.can_delete_trainers) {
      toast.success('Authentication verified successfully!');
    } else {
      toast.warning('Limited access - some operations may not work');
    }
  };

  const handleDeleteTrainer = async (trainerId) => {
    if (!confirm('Are you sure you want to delete this trainer? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessingAction(`delete-${trainerId}`);
      console.log(`🗑️ Starting deletion of trainer ${trainerId}`);

      // Show loading toast
      toast.loading('Deleting trainer...', { id: 'delete-trainer' });

      // Check authentication first
      if (!user) {
        throw new Error('No active session - please log in again');
      }

      console.log('👤 Authenticated as:', user.email, user.id);

      // Check if user is superadmin
      const hasPermission = isSuperadmin || profile?.role === 'superadmin';
      if (!hasPermission) {
        throw new Error('You do not have permission to delete trainers. Please ensure you are logged in as a superadmin.');
      }

      // Try the admin delete function first for real users
      console.log('🔧 Using admin delete function...');
      try {
        const { data: deleteResult, error: deleteError } = await supabase.rpc('admin_delete_trainer', {
          trainer_id: trainerId
        });

        if (deleteError) {
          console.error('❌ Admin delete failed:', deleteError);
          // If admin function fails, try direct delete
          console.log('🔄 Trying direct delete...');
          const { error: directError } = await supabase
            .from('trainers')
            .delete()
            .eq('id', trainerId);

          if (directError) {
            console.error('❌ Direct delete failed:', directError);
            throw new Error(`Deletion failed: ${directError.message}`);
          }
        }
      } catch (functionError) {
        console.error('❌ Admin function not available:', functionError);
        // Fall back to direct delete
        const { error: directError } = await supabase
          .from('trainers')
          .delete()
          .eq('id', trainerId);

        if (directError) {
          console.error('❌ Direct delete failed:', directError);
          throw new Error(`Deletion failed: ${directError.message}`);
        }
      }

      console.log('✅ Trainer deletion successful');

      // Update the UI state
      setTrainers(prevTrainers => {
        const updatedTrainers = prevTrainers.filter(t => t.id !== trainerId);
        console.log(`📊 UI updated: ${prevTrainers.length} → ${updatedTrainers.length} trainers`);
        return updatedTrainers;
      });

      toast.success('Trainer deleted successfully!', { id: 'delete-trainer' });

      // Refresh the list to ensure consistency
      await loadTrainers();

    } catch (error) {
      console.error('❌ Exception during trainer deletion:', error);
      toast.error(`Deletion failed: ${error.message}`, { id: 'delete-trainer' });
    } finally {
      setProcessingAction(null);
    }
  };

  const toggleTrainerStatus = async (trainerId, currentStatus) => {
    try {
      setProcessingAction(`toggle-${trainerId}`);
      console.log(`🔄 Toggling trainer status for ${trainerId}`, { currentStatus });

      const { error } = await supabase
        .from('trainers')
        .update({ is_active: !currentStatus })
        .eq('id', trainerId);

      if (error) {
        console.error('❌ Error updating trainer status:', error);
        throw error;
      }

      // Update local state
      setTrainers(trainers.map(trainer =>
        trainer.id === trainerId
          ? { ...trainer, is_active: !currentStatus }
          : trainer
      ));

      toast.success(`Trainer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      console.log('✅ Trainer status updated successfully');

    } catch (error) {
      console.error('❌ Error updating trainer status:', error);
      toast.error('Failed to update trainer status: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const extendTrial = async (trainerId) => {
    try {
      setProcessingAction(`extend-${trainerId}`);
      console.log(`📅 Extending trial for trainer ${trainerId}`);

      const currentTrainer = trainers.find(t => t.id === trainerId);
      const currentTrialEnd = currentTrainer?.trial_end ? new Date(currentTrainer.trial_end) : new Date();

      // Add 14 days to current trial end date (or current date if no trial)
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + 14);

      const { error } = await supabase
        .from('trainers')
        .update({ trial_end: newTrialEnd.toISOString() })
        .eq('id', trainerId);

      if (error) {
        console.error('❌ Error extending trial:', error);
        throw error;
      }

      // Update local state
      setTrainers(trainers.map(trainer =>
        trainer.id === trainerId
          ? { ...trainer, trial_end: newTrialEnd.toISOString() }
          : trainer
      ));

      toast.success('Trial extended by 14 days');
      console.log('✅ Trial extended successfully');

    } catch (error) {
      console.error('❌ Error extending trial:', error);
      toast.error('Failed to extend trial: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  const createTenantSchemaForTrainer = async (trainerId) => {
    try {
      setProcessingAction(`schema-${trainerId}`);
      toast.loading('Creating tenant schema...', { id: 'create-schema' });
      console.log(`🏗️ Creating tenant schema for trainer ${trainerId}`);

      const { data, error } = await supabase.rpc('create_basic_tenant_schema', {
        trainer_id: trainerId
      });

      if (error) {
        console.error('❌ Error creating tenant schema:', error);
        
        // Check if policy already exists error
        if (error.code === '42710') {
          toast.success('Schema already exists for this trainer', { id: 'create-schema' });
          return;
        }

        // Check if schema already exists
        if (error.code === '42P06') {
          toast.success('Schema already exists', { id: 'create-schema' });
          return;
        }

        throw error;
      }

      toast.success('Tenant schema created successfully!', { id: 'create-schema' });
      console.log('✅ Tenant schema created successfully');

    } catch (error) {
      console.error('❌ Error creating tenant schema:', error);
      toast.error(error.message || 'Failed to create tenant schema', { id: 'create-schema' });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleAddTrainer = () => {
    setEditingTrainer(null);
    setNewTrainer({
      email: '',
      full_name: '',
      password: 'pass123',
      subscription_plan: 'trial',
      trial_days: 14
    });
    setShowModal(true);
  };

  const handleEditTrainer = (trainer) => {
    setEditingTrainer(trainer);
    setNewTrainer({
      email: trainer.email,
      full_name: trainer.full_name,
      password: 'pass123',
      subscription_plan: trainer.subscription_plan || 'trial',
      trial_days: 14
    });
    setShowModal(true);
  };

  const handleSubmitTrainer = async () => {
    try {
      setProcessingAction('new');
      console.log('💾 Submitting trainer data:', newTrainer);

      // Validate input
      if (!newTrainer.email || !newTrainer.full_name) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Store current session to restore it later
      const currentSession = await supabase.auth.getSession();
      console.log('💾 Storing current session for restoration');

      if (editingTrainer) {
        // Update existing trainer
        console.log('📝 Updating existing trainer:', editingTrainer.id);
        const { data, error } = await supabase
          .from('trainers')
          .update({
            email: newTrainer.email,
            full_name: newTrainer.full_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTrainer.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating trainer:', error);
          throw error;
        }

        setTrainers(trainers.map(t => t.id === editingTrainer.id ? data : t));
        toast.success('Trainer updated successfully');
        console.log('✅ Trainer updated successfully');

      } else {
        // Create new trainer WITHOUT creating auth user
        console.log('➕ Creating new trainer record only (no auth user)');
        const newTrainerId = crypto.randomUUID();
        const newTrialEnd = new Date();
        newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(newTrainer.trial_days));

        try {
          // Create trainer record directly (no auth user creation)
          console.log('👨‍🏫 Creating trainer record...');
          const { data: trainerData, error: trainerError } = await supabase
            .from('trainers')
            .insert([{
              id: newTrainerId,
              email: newTrainer.email,
              full_name: newTrainer.full_name,
              trial_end: newTrialEnd.toISOString(),
              is_active: true
            }])
            .select()
            .single();

          if (trainerError) {
            console.error('❌ Trainer creation error:', trainerError);
            throw trainerError;
          }

          console.log('✅ Trainer created successfully:', trainerData);

          // Add to local state
          setTrainers([trainerData, ...trainers]);

          // Try to create tenant schema automatically
          try {
            await createTenantSchemaForTrainer(trainerData.id);
            toast.success('Trainer and schema created successfully!');
          } catch (schemaError) {
            console.error('⚠️ Schema creation failed:', schemaError);
            toast.success('Trainer created successfully (schema creation pending)');
          }

          // IMPORTANT: Restore the original session to prevent logout
          if (currentSession.data.session) {
            console.log('🔄 Restoring original session...');
            await supabase.auth.setSession(currentSession.data.session);
            console.log('✅ Session restored successfully');
          }

        } catch (error) {
          console.error('❌ Error creating trainer:', error);
          throw error;
        }
      }

      setShowModal(false);
      setNewTrainer({
        email: '',
        full_name: '',
        password: 'pass123',
        subscription_plan: 'trial',
        trial_days: 14
      });

      // Refresh the list
      await loadTrainers();

    } catch (error) {
      console.error('❌ Error saving trainer:', error);
      toast.error(error.message || 'Failed to save trainer');
    } finally {
      setProcessingAction(null);
    }
  };

  const filteredTrainers = trainers.filter(trainer =>
    trainer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTrialStatus = (trialEnd) => {
    if (!trialEnd) return { status: 'expired', daysLeft: 0 };

    const endDate = new Date(trialEnd);
    const today = new Date();
    const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    if (daysLeft > 0) {
      return { status: 'active', daysLeft };
    } else {
      return { status: 'expired', daysLeft: 0 };
    }
  };

  const handleInputChange = (e) => {
    setNewTrainer({
      ...newTrainer,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Trainer Management</h1>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4 py-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trainer Management</h1>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search trainers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTrainer}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
            Add Trainer
          </button>
          <button
            onClick={debugAuth}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center text-sm"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 mr-2" />
            Debug Auth
          </button>
        </div>
      </div>

      {/* Authentication Status */}
      {authDebugInfo && (
        <div className={`p-4 rounded-lg border ${authDebugInfo.can_delete_trainers ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center space-x-2">
            <SafeIcon 
              icon={authDebugInfo.can_delete_trainers ? FiCheck : FiAlertTriangle} 
              className={`w-5 h-5 ${authDebugInfo.can_delete_trainers ? 'text-green-600' : 'text-yellow-600'}`} 
            />
            <div className="flex-1">
              <p className={`text-sm font-medium ${authDebugInfo.can_delete_trainers ? 'text-green-800' : 'text-yellow-800'}`}>
                {authDebugInfo.can_delete_trainers ? 'Superadmin access confirmed' : 'Limited access - some operations may not work'}
              </p>
              <p className={`text-xs ${authDebugInfo.can_delete_trainers ? 'text-green-600' : 'text-yellow-600'}`}>
                User: {authDebugInfo.user_email} | Session: {authDebugInfo.session_info} | Can delete: {authDebugInfo.can_delete_trainers ? 'Yes' : 'No'}
                {authDebugInfo.error && ` | Error: ${authDebugInfo.error}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiUsers} className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Trainers</p>
              <p className="text-2xl font-semibold text-gray-900">{trainers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Trainers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {trainers.filter(t => t.is_active !== false).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiClock} className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Trial Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {trainers.filter(t => {
                  const trial = getTrialStatus(t.trial_end);
                  return trial.status === 'active';
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Trainers ({filteredTrainers.length})</h3>
        </div>

        {filteredTrainers.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No trainers found</p>
            <button
              onClick={handleAddTrainer}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
              Add Your First Trainer
            </button>
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trial Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrainers.map((trainer) => {
                  const trialStatus = getTrialStatus(trainer.trial_end);
                  const isProcessingThisTrainer = processingAction?.includes(trainer.id);

                  return (
                    <motion.tr
                      key={trainer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={isProcessingThisTrainer ? 'opacity-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {trainer.avatar_url ? (
                              <img
                                src={trainer.avatar_url}
                                alt={trainer.full_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white font-medium">
                                  {trainer.full_name?.charAt(0) || 'T'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {trainer.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {trainer.id?.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{trainer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trialStatus.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trialStatus.status === 'active' 
                            ? `${trialStatus.daysLeft} days left` 
                            : 'Expired'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trainer.created_at ? format(new Date(trainer.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trainer.is_active !== false 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trainer.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditTrainer(trainer)}
                            disabled={isProcessingThisTrainer}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            <SafeIcon icon={FiEdit} className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => toggleTrainerStatus(trainer.id, trainer.is_active !== false)}
                            disabled={isProcessingThisTrainer}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              trainer.is_active !== false
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } ${isProcessingThisTrainer ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {processingAction === `toggle-${trainer.id}` ? (
                              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
                            ) : (
                              trainer.is_active !== false ? 'Deactivate' : 'Activate'
                            )}
                          </button>

                          <button
                            onClick={() => extendTrial(trainer.id)}
                            disabled={isProcessingThisTrainer}
                            className={`px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors ${
                              isProcessingThisTrainer ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {processingAction === `extend-${trainer.id}` ? (
                              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
                            ) : (
                              'Extend Trial'
                            )}
                          </button>

                          <button
                            onClick={() => createTenantSchemaForTrainer(trainer.id)}
                            disabled={isProcessingThisTrainer}
                            className={`px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-medium transition-colors flex items-center ${
                              isProcessingThisTrainer ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <SafeIcon icon={FiDatabase} className="w-3 h-3 mr-1" />
                            {processingAction === `schema-${trainer.id}` ? (
                              'Creating...'
                            ) : (
                              'Create Schema'
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteTrainer(trainer.id)}
                            disabled={isProcessingThisTrainer || !authDebugInfo?.can_delete_trainers}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={authDebugInfo?.can_delete_trainers ? "Delete Trainer" : "Insufficient permissions"}
                          >
                            {processingAction === `delete-${trainer.id}` ? (
                              <SafeIcon icon={FiLoader} className="w-4 h-4 animate-spin" />
                            ) : (
                              <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                            )}
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

      {/* Add/Edit Trainer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingTrainer ? 'Edit Trainer' : 'Add New Trainer'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={newTrainer.full_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter trainer's full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newTrainer.email}
                  onChange={handleInputChange}
                  disabled={editingTrainer} // Don't allow email change for existing trainers
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Enter trainer's email"
                />
              </div>
              
              {!editingTrainer && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (for future login)
                    </label>
                    <input
                      type="text"
                      name="password"
                      value={newTrainer.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Default password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Auth user will need to be created separately
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trial Days
                    </label>
                    <input
                      type="number"
                      name="trial_days"
                      value={newTrainer.trial_days}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="365"
                    />
                  </div>
                </>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitTrainer}
                  disabled={processingAction === 'new'}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                    processingAction === 'new' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {processingAction === 'new' ? (
                    'Saving...'
                  ) : (
                    editingTrainer ? 'Update Trainer' : 'Add Trainer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerManagement;