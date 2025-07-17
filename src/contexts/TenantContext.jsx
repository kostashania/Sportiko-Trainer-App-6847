import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, getTenantSchema } from '../lib/supabase';

const TenantContext = createContext({});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [tenantSchema, setTenantSchema] = useState(null);
  const [tenantReady, setTenantReady] = useState(false);

  useEffect(() => {
    if (user && profile) {
      const schema = getTenantSchema(user.id);
      setTenantSchema(schema);
      setTenantReady(true);
    } else {
      setTenantSchema(null);
      setTenantReady(false);
    }
  }, [user, profile]);

  // Helper function to query tenant-specific tables
  const queryTenantTable = (tableName) => {
    if (!tenantSchema) {
      throw new Error('Tenant schema not available');
    }
    return supabase.from(`${tenantSchema}.${tableName}`);
  };

  // Helper function to get tenant bucket operations
  const getTenantStorage = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }
    return supabase.storage.from(`trainer-${user.id}`);
  };

  const value = {
    tenantSchema,
    tenantReady,
    queryTenantTable,
    getTenantStorage
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};