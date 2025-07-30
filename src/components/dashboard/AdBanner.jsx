import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const AdBanner = ({ type }) => {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAd();
  }, [type]);

  const loadAd = async () => {
    try {
      setLoading(true);
      
      // Using proper headers with explicit Accept: application/json
      const headers = new Headers();
      headers.set('apikey', supabase.supabaseKey);
      headers.set('Accept', 'application/json');
      
      // First check if table exists to avoid 406 errors
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('type', type)
        .eq('active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading ad:', error);
        throw error;
      }
      
      setAd(data);
    } catch (error) {
      console.error('Error in ad loading process:', error);
      // Don't show error toast to users for ad loading failures
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = () => {
    if (ad?.link) {
      window.open(ad.link, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading ad...</p>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="h-32 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border border-gray-200">
        <p className="text-gray-500">No ads available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
      onClick={handleAdClick}
    >
      {ad.image_url ? (
        <img src={ad.image_url} alt="Advertisement" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">
              {type === 'superadmin' ? 'Platform Ad' : 'Trainer Ad'}
            </h3>
            <p className="text-sm opacity-90">Click to learn more</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdBanner;