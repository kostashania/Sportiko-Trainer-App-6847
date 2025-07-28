import React, { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiX, FiUser, FiMail, FiPhone, FiCalendar, FiTarget, FiUpload, FiLink } = FiIcons;

const PlayerModal = ({ player, onClose, onSave }) => {
  const { tenantSchema } = useTenant();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('url'); // 'url' or 'file'
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    position: '',
    contact: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        birth_date: player.birth_date || '',
        position: player.position || '',
        contact: player.contact || '',
        avatar_url: player.avatar_url || ''
      });
    }
  }, [player]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `players/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setFormData(prev => ({
          ...prev,
          avatar_url: urlData.publicUrl
        }));
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!tenantSchema) {
        throw new Error('Tenant schema not available. Please contact support.');
      }

      // Try to create the player directly using the correct table reference
      const tableName = `${tenantSchema}.players`;
      
      if (player) {
        // Update existing player
        const { data, error } = await supabase
          .from(tableName)
          .update(formData)
          .eq('id', player.id)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        toast.success('Player updated successfully');
        onSave(data);
      } else {
        // Create new player
        const { data, error } = await supabase
          .from(tableName)
          .insert([formData])
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }

        toast.success('Player created successfully');
        onSave(data);
      }
    } catch (error) {
      console.error('Error saving player:', error);
      
      // More specific error handling
      if (error.message && error.message.includes('404')) {
        toast.error('Player table not found. The tenant schema may not be created yet.');
      } else if (error.message && error.message.includes('permission denied')) {
        toast.error('Permission denied. Please check your access rights.');
      } else if (error.code === 'PGRST116') {
        toast.error('No data returned. The operation may have failed.');
      } else {
        toast.error(error.message || 'Failed to save player');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {player ? 'Edit Player' : 'Add New Player'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <SafeIcon icon={FiX} className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiUser} className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter player's full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiCalendar} className="w-4 h-4 inline mr-2" />
              Birth Date
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiTarget} className="w-4 h-4 inline mr-2" />
              Position
            </label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select position</option>
              <option value="Forward">Forward</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Defender">Defender</option>
              <option value="Goalkeeper">Goalkeeper</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <SafeIcon icon={FiMail} className="w-4 h-4 inline mr-2" />
              Contact (Email/Phone)
            </label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email or phone number"
            />
          </div>

          {/* Avatar Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Player Photo
            </label>
            
            {/* Preview current image */}
            {formData.avatar_url && (
              <div className="mb-3">
                <img
                  src={formData.avatar_url}
                  alt="Player avatar"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}

            {/* Upload method selector */}
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="uploadMethod"
                  value="url"
                  checked={imageUploadMethod === 'url'}
                  onChange={(e) => setImageUploadMethod(e.target.value)}
                  className="mr-2"
                />
                <SafeIcon icon={FiLink} className="w-4 h-4 mr-1" />
                URL
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="uploadMethod"
                  value="file"
                  checked={imageUploadMethod === 'file'}
                  onChange={(e) => setImageUploadMethod(e.target.value)}
                  className="mr-2"
                />
                <SafeIcon icon={FiUpload} className="w-4 h-4 mr-1" />
                Upload
              </label>
            </div>

            {/* URL input */}
            {imageUploadMethod === 'url' && (
              <input
                type="url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/avatar.jpg"
              />
            )}

            {/* File upload */}
            {imageUploadMethod === 'file' && (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploadingImage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingImage && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Uploading image...
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : (player ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PlayerModal;