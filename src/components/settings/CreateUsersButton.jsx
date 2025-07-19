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
      
      const results = await createTestUsers();
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        toast.success(
          `Successfully created ${successful.length} user(s): ${successful.map(u => u.email).join(', ')}`,
          { id: 'create-users', duration: 5000 }
        );
      }
      
      if (failed.length > 0) {
        toast.error(
          `Failed to create ${failed.length} user(s): ${failed.map(u => u.email).join(', ')}`,
          { id: 'create-users-error', duration: 5000 }
        );
        console.log('Failed users:', failed);
      }
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