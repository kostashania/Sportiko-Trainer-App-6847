import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const { FiPlus, FiEdit, FiTrash2, FiEye, FiEyeOff, FiUpload, FiImage, FiX } = FiIcons;

const AdManagement = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link: '',
    type: 'superadmin',
    start_date: '',
    end_date: '',
    active: true
  });

  useEffect(() => {
    loadAds();
    loadExistingImages();
  }, []);

  const loadAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      toast.error('Failed to load ads');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingImages = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('ads-images')
        .list('', { limit: 100 });

      if (error) throw error;
      setExistingImages(data || []);
    } catch (error) {
      console.error('Error loading existing images:', error);
    }
  };

  const handleAddAd = () => {
    setSelectedAd(null);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link: '',
      type: 'superadmin',
      start_date: now.toISOString().split('T')[0],
      end_date: nextMonth.toISOString().split('T')[0],
      active: true
    });
    setShowModal(true);
  };

  const handleEditAd = (ad) => {
    setSelectedAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || '',
      image_url: ad.image_url || '',
      link: ad.link || '',
      type: ad.type || 'superadmin',
      start_date: ad.start_date ? new Date(ad.start_date).toISOString().split('T')[0] : '',
      end_date: ad.end_date ? new Date(ad.end_date).toISOString().split('T')[0] : '',
      active: ad.active !== false
    });
    setShowModal(true);
  };

  const handleDeleteAd = async (adId) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', adId);

      if (error) throw error;

      setAds(ads.filter(ad => ad.id !== adId));
      toast.success('Ad deleted successfully');
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    }
  };

  const handleToggleActive = async (ad) => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .update({ active: !ad.active })
        .eq('id', ad.id)
        .select()
        .single();

      if (error) throw error;

      setAds(ads.map(a => a.id === ad.id ? data : a));
      toast.success(`Ad ${data.active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling ad status:', error);
      toast.error('Failed to update ad status');
    }
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

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ads-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ads-images')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
        toast.success('Image uploaded successfully!');
        await loadExistingImages(); // Refresh the list
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

  const selectExistingImage = (image) => {
    const { data: urlData } = supabase.storage
      .from('ads-images')
      .getPublicUrl(image.name);
    
    setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
    setShowImageSelector(false);
    toast.success('Image selected successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const adData = {
        title: formData.title,
        description: formData.description,
        image_url: formData.image_url,
        link: formData.link,
        type: formData.type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        active: formData.active
      };

      if (selectedAd) {
        const { data, error } = await supabase
          .from('ads')
          .update(adData)
          .eq('id', selectedAd.id)
          .select()
          .single();

        if (error) throw error;

        setAds(ads.map(ad => ad.id === selectedAd.id ? data : ad));
        toast.success('Ad updated successfully');
      } else {
        const { data, error } = await supabase
          .from('ads')
          .insert([adData])
          .select()
          .single();

        if (error) throw error;

        setAds([data, ...ads]);
        toast.success('Ad created successfully');
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving ad:', error);
      toast.error(error.message || 'Failed to save ad');
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Ad Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Ad Management</h1>
        <button
          onClick={handleAddAd}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
          Create Ad
        </button>
      </div>

      {/* Ads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.map((ad) => (
          <motion.div
            key={ad.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-9">
              {ad.image_url ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-t-lg flex items-center justify-center">
                  <span className="text-white font-semibold">{ad.title}</span>
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{ad.title}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    ad.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {ad.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {ad.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span className="capitalize">{ad.type}</span>
                <span>
                  {ad.start_date && format(new Date(ad.start_date), 'MMM dd')} -{' '}
                  {ad.end_date && format(new Date(ad.end_date), 'MMM dd')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`p-2 rounded-lg transition-colors ${
                      ad.active
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <SafeIcon icon={ad.active ? FiEye : FiEyeOff} className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditAd(ad)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <SafeIcon icon={FiEdit} className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedAd ? 'Edit Ad' : 'Create New Ad'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Ad Image
                  </label>
                  
                  {/* Preview current image */}
                  {formData.image_url && (
                    <div className="mb-3 relative">
                      <img
                        src={formData.image_url}
                        alt="Ad preview"
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <SafeIcon icon={FiX} className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Upload options */}
                  <div className="flex space-x-2 mb-3">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <SafeIcon icon={FiUpload} className="w-4 h-4 mr-2" />
                        {uploadingImage ? 'Uploading...' : 'Upload New'}
                      </div>
                    </label>
                    
                    <button
                      type="button"
                      onClick={() => setShowImageSelector(true)}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <SafeIcon icon={FiImage} className="w-4 h-4 mr-2" />
                      Choose Existing
                    </button>
                  </div>

                  {/* Manual URL input */}
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="Or enter image URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link URL
                  </label>
                  <input
                    type="url"
                    name="link"
                    value={formData.link}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="superadmin">Superadmin</option>
                    <option value="trainer">Trainer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="active"
                    id="active"
                    checked={formData.active}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingImage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {selectedAd ? 'Update' : 'Create'} Ad
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Selector Modal */}
      {showImageSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Choose Existing Image</h3>
                <button
                  onClick={() => setShowImageSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <SafeIcon icon={FiX} className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {existingImages.map((image) => {
                  const { data: urlData } = supabase.storage
                    .from('ads-images')
                    .getPublicUrl(image.name);
                  
                  return (
                    <div
                      key={image.name}
                      onClick={() => selectExistingImage(image)}
                      className="cursor-pointer border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={urlData.publicUrl}
                        alt={image.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <p className="text-xs text-gray-500 p-2 truncate">{image.name}</p>
                    </div>
                  );
                })}
              </div>
              
              {existingImages.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No existing images found. Upload some images first.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdManagement;