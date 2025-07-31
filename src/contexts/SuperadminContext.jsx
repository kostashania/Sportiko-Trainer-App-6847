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

      // Use the safe function to check superadmin status
      try {
        const { data, error } = await supabase.rpc('is_superadmin_safe', {
          user_id: user.id
        });

        if (error) {
          console.error('❌ Error checking superadmin status:', error);
          // Fall back to email/ID check
          setIsSuperadmin(
            user.email === 'superadmin_pt@sportiko.eu' || 
            user.id === 'be9c6165-808a-4335-b90e-22f6d20328bf'
          );
        } else {
          console.log('🎯 Superadmin check result:', data);
          setIsSuperadmin(!!data);
        }
      } catch (functionError) {
        console.error('❌ Superadmin function not available:', functionError);
        // Fall back to email/ID check
        setIsSuperadmin(
          user.email === 'superadmin_pt@sportiko.eu' || 
          user.id === 'be9c6165-808a-4335-b90e-22f6d20328bf'
        );
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