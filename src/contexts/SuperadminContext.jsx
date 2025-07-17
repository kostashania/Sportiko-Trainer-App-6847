import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const SuperadminContext = createContext({});

export const useSuperadmin = () => {
  const context = useContext(SuperadminContext);
  if (!context) {
    throw new Error('useSuperadmin must be used within a SuperadminProvider');
  }
  return context;
};

export const SuperadminProvider = ({ children }) => {
  const { user } = useAuth();
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSuperadminStatus();
    } else {
      setIsSuperadmin(false);
      setLoading(false);
    }
  }, [user]);

  const checkSuperadminStatus = async () => {
    try {
      const { data, error } = await supabase
        .rpc('is_superadmin', { user_id: user.id });
      
      if (error) throw error;
      
      setIsSuperadmin(data || false);
    } catch (error) {
      console.error('Error checking superadmin status:', error);
      setIsSuperadmin(false);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    isSuperadmin,
    loading,
    checkSuperadminStatus
  };

  return (
    <SuperadminContext.Provider value={value}>
      {children}
    </SuperadminContext.Provider>
  );
};