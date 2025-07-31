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
  const { user, profile } = useAuth();
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      checkSuperadminStatus();
    } else {
      setIsSuperadmin(false);
      setLoading(false);
    }
  }, [user, profile]);

  const checkSuperadminStatus = async () => {
    try {
      setLoading(true);
      console.log('🔍 Checking superadmin status for:', user?.email, user?.id);

      // Check profile directly if available
      if (profile) {
        console.log('👤 Profile available:', profile.role);
        setIsSuperadmin(profile.role === 'superadmin');
        setLoading(false);
        return;
      }

      // Safety check to prevent errors when user is null
      if (!user || !user.id) {
        console.log('❌ No user or user ID');
        setIsSuperadmin(false);
        setLoading(false);
        return;
      }

      // Special case for our hardcoded superadmin
      if (user.email === 'superadmin_pt@sportiko.eu' || user.id === 'be9c6165-808a-4335-b90e-22f6d20328bf') {
        console.log('✅ Hardcoded superadmin detected');
        setIsSuperadmin(true);
        setLoading(false);
        return;
      }

      // Check if user exists in superadmins table
      console.log('🔍 Checking superadmins table...');
      const { data, error } = await supabase
        .from('superadmins')
        .select('id')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error checking superadmin status:', error);
        // Don't throw, just log and continue
      }
      
      const isSuper = !!data;
      console.log('🎯 Superadmin check result:', isSuper, data);
      setIsSuperadmin(isSuper);

      // If not found and this looks like a superadmin email, try to create the record
      if (!isSuper && user.email === 'superadmin_pt@sportiko.eu') {
        console.log('🔧 Attempting to create superadmin record...');
        try {
          const { error: insertError } = await supabase
            .from('superadmins')
            .insert([{
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || 'Super Admin'
            }]);

          if (!insertError) {
            console.log('✅ Superadmin record created successfully');
            setIsSuperadmin(true);
            toast.success('Superadmin access granted!');
          } else {
            console.error('❌ Failed to create superadmin record:', insertError);
          }
        } catch (createError) {
          console.error('❌ Exception creating superadmin record:', createError);
        }
      }
    } catch (error) {
      console.error('❌ Exception in checkSuperadminStatus:', error);
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