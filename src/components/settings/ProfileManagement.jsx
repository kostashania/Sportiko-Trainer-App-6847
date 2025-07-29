import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperadmin } from '../../contexts/SuperadminContext';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiUser, FiMail, FiCalendar, FiSave, FiCamera, FiKey, FiShield, FiDatabase, FiInfo, FiRefreshCw } = FiIcons;

const ProfileManagement = () => {
  const { user, profile, fetchProfile } = useAuth();
  const { isSuperadmin, loading: superadminLoading, checkSuperadminStatus } = useSuperadmin();
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    bio: '',
    phone: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        email: profile.email || user?.email || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || ''
      });
    }
    loadDebugInfo();
  }, [profile, user]);

  const loadDebugInfo = async () => {
    if (!user) return;

    try {
      const info = {
        user: {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        },
        profile: profile,
        isSuperadmin: isSuperadmin,
        superadminLoading: superadminLoading,
        checks: {}
      };

      // Check if user exists in superadmins table
      try {
        const { data: superadminData, error: superadminError } = await supabase
          .from('superadmins')
          .select('*')
          .eq('id', user.id);

        info.checks.superadminTable = {
          exists: !superadminError && superadminData && superadminData.length > 0,
          data: superadminData,
          error: superadminError?.message
        };
      } catch (error) {
        info.checks.superadminTable = {
          exists: false,
          error: error.message
        };
      }

      // Check if user exists in trainers table
      try {
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id);

        info.checks.trainerTable = {
          exists: !trainerError && trainerData && trainerData.length > 0,
          data: trainerData,
          error: trainerError?.message
        };
      } catch (error) {
        info.checks.trainerTable = {
          exists: false,
          error: error.message
        };
      }

      // Check if user exists in players_auth table
      try {
        const { data: playerData, error: playerError } = await supabase
          .from('players_auth')
          .select('*')
          .eq('id', user.id);

        info.checks.playerTable = {
          exists: !playerError && playerData && playerData.length > 0,
          data: playerData,
          error: playerError?.message
        };
      } catch (error) {
        info.checks.playerTable = {
          exists: false,
          error: error.message
        };
      }

      // Test the is_superadmin function
      try {
        const { data: functionResult, error: functionError } = await supabase
          .rpc('is_superadmin', { user_id: user.id });

        info.checks.isSuperadminFunction = {
          result: functionResult,
          error: functionError?.message
        };
      } catch (error) {
        info.checks.isSuperadminFunction = {
          result: null,
          error: error.message
        };
      }

      // Check if user matches known superadmin ID
      info.checks.knownSuperadmin = {
        isKnownId: user.id === 'be9c6165-808a-4335-b90e-22f6d20328bf',
        isKnownEmail: user.email === 'superadmin_pt@sportiko.eu'
      };

      setDebugInfo(info);
    } catch (error) {
      console.error('Error loading debug info:', error);
      setDebugInfo({ error: error.message });
    }
  };

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await fetchProfile(user);
      await checkSuperadminStatus();
      await loadDebugInfo();
      toast.success('Profile refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing profile:', error);
      toast.error('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFixSuperadmin = async () => {
    if (!user) return;

    try {
      setLoading(true);
      toast.loading('Fixing superadmin status...', { id: 'fix-superadmin' });

      // Insert the user into superadmins table
      const { error } = await supabase
        .from('superadmins')
        .insert([{
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || formData.full_name || 'Super Admin'
        }])
        .select();

      if (error && error.code !== '23505') { // Ignore duplicate key error
        throw error;
      }

      // Refresh everything
      await handleRefreshProfile();
      
      toast.success('Superadmin status fixed!', { id: 'fix-superadmin' });
    } catch (error) {
      console.error('Error fixing superadmin:', error);
      toast.error('Failed to fix superadmin status: ' + error.message, { id: 'fix-superadmin' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let updateData = {
        full_name: formData.full_name,
        bio: formData.bio,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString()
      };

      let tableName = 'trainers'; // default table
      if (profile?.role === 'superadmin') {
        tableName = 'superadmins';
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Update auth user metadata if full name changed
      if (formData.full_name !== profile?.full_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: formData.full_name }
        });

        if (authError) {
          console.warn('Failed to update auth metadata:', authError);
        }
      }

      // Refresh profile data
      await fetchProfile(user);
      await loadDebugInfo();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLoading(true);
    console.debug('🚀 Starting avatar upload...', {
      userId: user.id,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    try {
      // Create proper file path
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      console.debug('📁 File path:', fileName);

      // Upload file
      console.debug('⬆️ Uploading to bucket: avatars');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.debug('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.debug('🔗 Public URL:', urlData);

      if (!urlData?.publicUrl) {
        throw new Error('Could not get public URL');
      }

      // Update profile with new avatar URL
      const tableName = profile?.role === 'superadmin' ? 'superadmins' : 'trainers';
      console.debug('📝 Updating profile in table:', tableName);

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Profile update error:', updateError);
        throw updateError;
      }

      // Update local form data
      setFormData(prev => ({
        ...prev,
        avatar_url: urlData.publicUrl
      }));

      console.debug('✨ Avatar upload complete!');
      toast.success('Avatar uploaded successfully!');

      // Refresh profile
      await fetchProfile(user);
    } catch (error) {
      console.error('❌ Avatar upload failed:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Information Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiInfo} className="w-5 h-5 mr-2" />
            User Information & Debug
          </h3>
          <button
            onClick={handleRefreshProfile}
            disabled={refreshing}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {debugInfo && (
          <div className="space-y-4">
            {/* Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600">User Role</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {profile?.role || 'Unknown'}
                  {isSuperadmin && (
                    <span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                      SUPERADMIN
                    </span>
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">User ID</p>
                <p className="font-mono text-xs text-gray-900 break-all">{user?.id}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm text-gray-900">{user?.email}</p>
              </div>
            </div>

            {/* Database Checks */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <SafeIcon icon={FiDatabase} className="w-4 h-4 mr-2" />
                Database Checks
              </h4>
              <div className="space-y-3">
                {/* Superadmin Table Check */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">Superadmins Table</span>
                    <p className="text-xs text-gray-600">
                      {debugInfo.checks.superadminTable?.exists ? 'Found in table' : 'Not found in table'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-3 h-3 rounded-full ${
                      debugInfo.checks.superadminTable?.exists ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {!debugInfo.checks.superadminTable?.exists && (
                      <button
                        onClick={handleFixSuperadmin}
                        disabled={loading}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        Fix
                      </button>
                    )}
                  </div>
                </div>

                {/* Trainer Table Check */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">Trainers Table</span>
                    <p className="text-xs text-gray-600">
                      {debugInfo.checks.trainerTable?.exists ? 'Found in table' : 'Not found in table'}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    debugInfo.checks.trainerTable?.exists ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>

                {/* Player Table Check */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">Players Auth Table</span>
                    <p className="text-xs text-gray-600">
                      {debugInfo.checks.playerTable?.exists ? 'Found in table' : 'Not found in table'}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    debugInfo.checks.playerTable?.exists ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>

                {/* Function Check */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">is_superadmin() Function</span>
                    <p className="text-xs text-gray-600">
                      Result: {debugInfo.checks.isSuperadminFunction?.result ? 'TRUE' : 'FALSE'}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    debugInfo.checks.isSuperadminFunction?.result ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                </div>

                {/* Known IDs Check */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <span className="font-medium">Known Superadmin</span>
                    <p className="text-xs text-gray-600">
                      ID Match: {debugInfo.checks.knownSuperadmin?.isKnownId ? 'YES' : 'NO'} | 
                      Email Match: {debugInfo.checks.knownSuperadmin?.isKnownEmail ? 'YES' : 'NO'}
                    </p>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${
                    debugInfo.checks.knownSuperadmin?.isKnownId || debugInfo.checks.knownSuperadmin?.isKnownEmail 
                      ? 'bg-green-500' : 'bg-gray-300'
                  }`}></span>
                </div>
              </div>
            </div>

            {/* Raw Data (Collapsible) */}
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-medium text-gray-900 cursor-pointer">
                Raw Debug Data (Click to expand)
              </summary>
              <pre className="mt-3 text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </motion.div>

      {/* Profile Management Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Profile Management</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <SafeIcon icon={FiUser} className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                <SafeIcon icon={FiCamera} className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">Profile Photo</h4>
              <p className="text-sm text-gray-500">JPG, GIF or PNG. Max size 5MB.</p>
            </div>
          </div>

          {/* User ID Display */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiKey} className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">User ID:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user?.id}</code>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SafeIcon icon={FiUser} className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <SafeIcon icon={FiMail} className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">Role</p>
              <p className="font-semibold text-gray-900 capitalize">{profile?.role}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="font-semibold text-gray-900">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {profile?.trial_end && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Trial Ends</p>
                <p className="font-semibold text-gray-900">
                  {new Date(profile.trial_end).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SafeIcon icon={FiSave} className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileManagement;