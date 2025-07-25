import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const { FiUsers, FiCalendar, FiMail, FiClock, FiCheck, FiX, FiPlus, FiDatabase } = FiIcons;

const TrainerManagement = () => {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTrainer, setNewTrainer] = useState({
    email: '',
    full_name: '',
    password: 'pass123', // Default password
  });
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    loadTrainers();
  }, []);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error loading trainers:', error);
      toast.error('Failed to load trainers');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainerStatus = async (trainerId, currentStatus) => {
    try {
      setProcessingAction(trainerId);
      const { error } = await supabase
        .from('trainers')
        .update({ is_active: !currentStatus })
        .eq('id', trainerId);

      if (error) throw error;

      setTrainers(trainers.map(trainer =>
        trainer.id === trainerId
          ? { ...trainer, is_active: !currentStatus }
          : trainer
      ));

      toast.success(`Trainer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating trainer status:', error);
      toast.error('Failed to update trainer status');
    } finally {
      setProcessingAction(null);
    }
  };

  const extendTrial = async (trainerId) => {
    try {
      setProcessingAction(trainerId);
      const currentTrainer = trainers.find(t => t.id === trainerId);
      const currentTrialEnd = currentTrainer?.trial_end ? new Date(currentTrainer.trial_end) : new Date();
      
      // Add 14 days to current trial end date (or current date if no trial)
      const newTrialEnd = new Date(currentTrialEnd);
      newTrialEnd.setDate(newTrialEnd.getDate() + 14);

      const { error } = await supabase
        .from('trainers')
        .update({ trial_end: newTrialEnd.toISOString() })
        .eq('id', trainerId);

      if (error) throw error;

      setTrainers(trainers.map(trainer =>
        trainer.id === trainerId
          ? { ...trainer, trial_end: newTrialEnd.toISOString() }
          : trainer
      ));

      toast.success('Trial extended by 14 days');
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Failed to extend trial');
    } finally {
      setProcessingAction(null);
    }
  };

  const createTenantSchemaForTrainer = async (trainerId) => {
    try {
      setProcessingAction(trainerId);
      toast.loading('Creating tenant schema...', { id: 'create-schema' });

      // First try the basic schema creation
      const { error: basicError } = await supabase.rpc('create_basic_tenant_schema', {
        trainer_id: trainerId
      });

      if (basicError) {
        console.error('Error with basic schema creation:', basicError);
        
        // Try the full schema creation as fallback
        const { error: fullError } = await supabase.rpc('create_tenant_schema', {
          trainer_id: trainerId
        });

        if (fullError) {
          console.error('Error with full schema creation:', fullError);
          throw fullError;
        }
      }

      toast.success('Tenant schema created successfully!', { id: 'create-schema' });
    } catch (error) {
      console.error('Error creating tenant schema:', error);
      
      // Try manual schema creation as last resort
      try {
        const schemaName = `pt_${trainerId.replace(/-/g, '_')}`;
        const { error: manualError } = await supabase.rpc('execute_sql', {
          sql: `
            -- Create schema
            CREATE SCHEMA IF NOT EXISTS ${schemaName};
            
            -- Create players table
            CREATE TABLE IF NOT EXISTS ${schemaName}.players (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              name TEXT NOT NULL,
              birth_date DATE,
              position TEXT,
              contact TEXT,
              avatar_url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Enable RLS
            ALTER TABLE ${schemaName}.players ENABLE ROW LEVEL SECURITY;
            
            -- Create policy
            CREATE POLICY "trainer_all_access" ON ${schemaName}.players
              FOR ALL TO authenticated
              USING (auth.uid() = '${trainerId}')
              WITH CHECK (auth.uid() = '${trainerId}');
              
            -- Grant permissions
            GRANT USAGE ON SCHEMA ${schemaName} TO authenticated;
            GRANT ALL ON ALL TABLES IN SCHEMA ${schemaName} TO authenticated;
          `
        });

        if (manualError) {
          throw manualError;
        }

        toast.success('Schema created manually!', { id: 'create-schema' });
      } catch (manualError) {
        console.error('Manual schema creation failed:', manualError);
        toast.error('Failed to create tenant schema', { id: 'create-schema' });
      }
    } finally {
      setProcessingAction(null);
    }
  };

  const handleAddTrainer = async () => {
    try {
      setProcessingAction('new');

      // Validate input
      if (!newTrainer.email || !newTrainer.full_name) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check if trainer already exists
      const { data: existingTrainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('email', newTrainer.email)
        .single();

      if (existingTrainer) {
        toast.error('A trainer with this email already exists');
        return;
      }

      // Step 1: Create user using auth signup
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newTrainer.email,
        password: newTrainer.password,
        options: {
          data: {
            full_name: newTrainer.full_name
          }
        }
      });

      if (signUpError) {
        // If signup fails due to existing user, try to get the user
        if (signUpError.message.includes('already been registered')) {
          const { data: existingUser } = await supabase
            .from('auth.users')
            .select('id')
            .eq('email', newTrainer.email)
            .single();

          if (!existingUser) {
            throw signUpError;
          }
          
          // Use existing user ID
          signUpData.user = { id: existingUser.id };
        } else {
          throw signUpError;
        }
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        throw new Error('No user ID received from signup');
      }

      // Step 2: Add to trainers table
      const newTrialEnd = new Date();
      newTrialEnd.setDate(newTrialEnd.getDate() + 14);

      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .insert([{
          id: userId,
          email: newTrainer.email,
          full_name: newTrainer.full_name,
          trial_end: newTrialEnd.toISOString(),
          is_active: true
        }])
        .select()
        .single();

      if (trainerError) {
        console.error('Error creating trainer record:', trainerError);
        
        // If it's a duplicate key error, the trainer might already exist
        if (trainerError.code === '23505') {
          // Try to fetch the existing trainer
          const { data: existingTrainerData } = await supabase
            .from('trainers')
            .select('*')
            .eq('id', userId)
            .single();

          if (existingTrainerData) {
            setTrainers([existingTrainerData, ...trainers.filter(t => t.id !== userId)]);
            toast.success('Trainer already exists and has been refreshed');
            setShowModal(false);
            setNewTrainer({ email: '', full_name: '', password: 'pass123' });
            return;
          }
        }
        
        throw trainerError;
      }

      // Step 3: Create tenant schema
      await createTenantSchemaForTrainer(userId);

      // Add to state and reset form
      setTrainers([trainerData, ...trainers]);
      setShowModal(false);
      setNewTrainer({ email: '', full_name: '', password: 'pass123' });
      toast.success('Trainer added successfully!');

      // Reload trainers to get fresh data
      setTimeout(() => {
        loadTrainers();
      }, 1000);

    } catch (error) {
      console.error('Error adding trainer:', error);
      toast.error(error.message || 'Failed to add trainer');
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
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
            Add Trainer
          </button>
        </div>
      </div>

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
          <h3 className="text-lg font-medium text-gray-900">All Trainers</h3>
        </div>
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
                return (
                  <motion.tr
                    key={trainer.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium">
                              {trainer.full_name?.charAt(0) || 'T'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {trainer.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{trainer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trialStatus.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {trialStatus.status === 'active'
                          ? `${trialStatus.daysLeft} days left`
                          : 'Expired'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trainer.created_at && format(new Date(trainer.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trainer.is_active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {trainer.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleTrainerStatus(trainer.id, trainer.is_active !== false)}
                          disabled={processingAction === trainer.id}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            trainer.is_active !== false
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          } ${processingAction === trainer.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {trainer.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => extendTrial(trainer.id)}
                          disabled={processingAction === trainer.id}
                          className={`px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-medium transition-colors ${
                            processingAction === trainer.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Extend Trial
                        </button>
                        <button
                          onClick={() => createTenantSchemaForTrainer(trainer.id)}
                          disabled={processingAction === trainer.id}
                          className={`px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-medium transition-colors flex items-center ${
                            processingAction === trainer.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <SafeIcon icon={FiDatabase} className="w-3 h-3 mr-1" />
                          Create Schema
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Trainer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Add New Trainer</h2>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter trainer's email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="text"
                  name="password"
                  value={newTrainer.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTrainer}
                  disabled={processingAction === 'new'}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                    processingAction === 'new' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {processingAction === 'new' ? 'Adding...' : 'Add Trainer'}
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