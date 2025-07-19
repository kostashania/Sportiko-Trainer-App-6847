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
      // Special case for demo user
      if (user?.id === 'demo-admin-id') {
        setIsSuperadmin(true);
        setLoading(false);
        return;
      }
      
      // Safety check to prevent errors when user is null
      if (!user || !user.id) {
        setIsSuperadmin(false);
        setLoading(false);
        return;
      }

      // Check if user exists in superadmins table
      const { data, error } = await supabase
        .from('superadmins')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setIsSuperadmin(!!data);
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
    checkSuperadminStatus,
  };

  return (
    <SuperadminContext.Provider value={value}>
      {children}
    </SuperadminContext.Provider>
  );
};