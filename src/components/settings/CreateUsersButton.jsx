import React, { useState } from 'react';
import { createTestUsers } from '../../utils/createTestUsers';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiPlus, FiLoader } = FiIcons;

const CreateUsersButton = () => {
  const [loading, setLoading] = useState(false);

  const handleCreateUsers = async () => {
    setLoading(true);
    try {
      toast.loading('Creating test users...', { id: 'create-users' });
      
      // For demo purposes, we'll simulate the creation of test users
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(
        'Demo users created successfully! You can use these credentials to login:',
        { id: 'create-users', duration: 5000 }
      );
      
      // Display credentials information
      toast.success(
        'Superadmin: superadmin_pt@sportiko.eu / pass123',
        { id: 'credentials-1', duration: 5000 }
      );
      
      toast.success(
        'Trainer: trainer_pt@sportiko.eu / pass123',
        { id: 'credentials-2', duration: 5000 }
      );
      
      toast.success(
        'Player: player_pt@sportiko.eu / pass123',
        { id: 'credentials-3', duration: 5000 }
      );
      
    } catch (error) {
      console.error('Error in user creation process:', error);
      toast.error('Error creating test users', { id: 'create-users' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateUsers}
      disabled={loading}
      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <SafeIcon
        icon={loading ? FiLoader : FiPlus}
        className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
      />
      {loading ? 'Creating Users...' : 'Create Test Users'}
    </button>
  );
};

export default CreateUsersButton;