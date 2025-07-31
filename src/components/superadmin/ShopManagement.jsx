import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiPlus, FiEdit, FiTrash2, FiPackage, FiDollarSign, FiUpload, FiImage, FiX } = FiIcons;

const ShopManagement = () => {
  const [shopItems, setShopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock_quantity: '',
    image_url: '',
    active: true
  });

  useEffect(() => {
    loadShopItems();
    loadExistingImages();
  }, []);

  const loadShopItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shop_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShopItems(data || []);
    } catch (error) {
      console.error('Error loading shop items:', error);
      toast.error('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingImages = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('shop-images')
        .list('', { limit: 100 });

      if (error) throw error;
      setExistingImages(data || []);
    } catch (error) {
      console.error('Error loading existing images:', error);
    }
  };

  const handleAddItem = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      stock_quantity: '',
      image_url: '',
      active: true
    });
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      category: item.category || '',
      stock_quantity: item.stock_quantity?.toString() || '',
      image_url: item.image_url || '',
      active: item.active !== false
    });
    setShowModal(true);
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('shop_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setShopItems(shopItems.filter(item => item.id !== itemId));
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
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
        .from('shop-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('shop-images')
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
      .from('shop-images')
      .getPublicUrl(image.name);
    
    setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
    setShowImageSelector(false);
    toast.success('Image selected successfully!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url,
        active: formData.active
      };

      if (selectedItem) {
        const { data, error } = await supabase
          .from('shop_items')
          .update(itemData)
          .eq('id', selectedItem.id)
          .select()
          .single();

        if (error) throw error;

        setShopItems(shopItems.map(item => item.id === selectedItem.id ? data : item));
        toast.success('Item updated successfully');
      } else {
        const { data, error } = await supabase
          .from('shop_items')
          .insert([itemData])
          .select()
          .single();

        if (error) throw error;

        setShopItems([data, ...shopItems]);
        toast.success('Item added successfully');
      }

      setShowModal(false);
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(error.message || 'Failed to save item');
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
          <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
        <button
          onClick={handleAddItem}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Shop Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-9">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                  <SafeIcon icon={FiPackage} className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <span className="text-lg font-bold text-green-600">
                  ${item.price?.toFixed(2) || '0.00'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {item.description}
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  Stock: {item.stock_quantity || 0}
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    item.active !== false
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleEditItem(item)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <SafeIcon icon={FiEdit} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
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
                {selectedItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={formData.stock_quantity}
                      onChange={handleChange}
                      min="0"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="equipment">Equipment</option>
                    <option value="supplements">Supplements</option>
                    <option value="accessories">Accessories</option>
                    <option value="apparel">Apparel</option>
                  </select>
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Product Image
                  </label>
                  
                  {/* Preview current image */}
                  {formData.image_url && (
                    <div className="mb-3 relative">
                      <img
                        src={formData.image_url}
                        alt="Product preview"
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
                    {selectedItem ? 'Update' : 'Add'} Item
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
                    .from('shop-images')
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

export default ShopManagement;