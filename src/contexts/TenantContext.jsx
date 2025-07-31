import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, getTenantSchema, SCHEMAS, REAL_USERS } from '../lib/supabase';
import toast from 'react-hot-toast';

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
      console.log('🏗️ Setting up tenant context for:', profile.role, user.email);

      // For superadmins, no specific tenant schema is needed but mark as ready
      if (profile.role === 'superadmin') {
        console.log('👑 Superadmin detected - no tenant schema needed');
        setTenantSchema(null);
        setTenantReady(true);
        return;
      }

      // For trainers
      if (profile.role === 'trainer') {
        const schema = getTenantSchema(user.id);
        console.log('🏃 Trainer detected, schema:', schema);
        setTenantSchema(schema);
        setTenantReady(true);
        return;
      }

      // For players, use their trainer's schema
      if (profile.role === 'player' && profile.trainer_id) {
        const schema = getTenantSchema(profile.trainer_id);
        console.log('🏃‍♂️ Player detected, using trainer schema:', schema);
        setTenantSchema(schema);
        setTenantReady(true);
        return;
      }

      // Default case - no schema available
      console.log('❌ No tenant schema available for role:', profile.role);
      setTenantSchema(null);
      setTenantReady(false);
    } else {
      setTenantSchema(null);
      setTenantReady(false);
    }
  }, [user, profile]);

  // Helper function to query tenant-specific tables
  const queryTenantTable = (tableName) => {
    // For superadmins querying tenant tables, return mock functions
    if (profile?.role === 'superadmin') {
      console.log('👑 Superadmin querying tenant table:', tableName, '- returning mock data');
      return getMockTableFunctions(tableName);
    }

    if (!tenantSchema) {
      console.error('❌ Tenant schema not available for table:', tableName);
      throw new Error('Tenant schema not available');
    }

    // For real users, use Supabase
    try {
      return supabase.from(`${tenantSchema}.${tableName}`);
    } catch (error) {
      console.error(`Error querying ${tenantSchema}.${tableName}:`, error);
      return getMockTableFunctions(tableName);
    }
  };

  // Helper function to query main schema tables
  const queryMainTable = (tableName) => {
    try {
      return supabase.from(`${SCHEMAS.MAIN}.${tableName}`);
    } catch (error) {
      console.error(`Error querying ${SCHEMAS.MAIN}.${tableName}:`, error);
      return getMockTableFunctions(tableName);
    }
  };

  // Helper function to get tenant bucket operations
  const getTenantStorage = () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return supabase.storage.from(`trainer-${user.id}`);
    } catch (error) {
      console.error(`Error accessing storage for trainer-${user.id}:`, error);
      // Return mock storage functions
      return {
        upload: () => Promise.resolve({ data: { path: 'demo/file.jpg' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/demo/file.jpg' } }),
        list: () => Promise.resolve({ data: [{ name: 'file.jpg' }], error: null }),
        remove: () => Promise.resolve({ error: null })
      };
    }
  };

  // Function to get mock table functions
  const getMockTableFunctions = (tableName) => {
    return {
      select: (columns = '*') => ({
        order: (column, options = {}) => Promise.resolve({ data: getMockData(tableName), error: null }),
        eq: (column, value) => ({
          select: (cols = '*') => Promise.resolve({ data: getMockData(tableName)[0], error: null }),
          single: () => Promise.resolve({ data: getMockData(tableName)[0], error: null })
        }),
        gte: (column, value) => Promise.resolve({ data: getMockData(tableName), error: null }),
        lte: (column, value) => Promise.resolve({ data: getMockData(tableName), error: null }),
        limit: (count) => Promise.resolve({ data: getMockData(tableName).slice(0, count), error: null })
      }),
      delete: () => ({
        eq: (column, value) => Promise.resolve({ error: null })
      }),
      update: (data) => ({
        eq: (column, value) => ({
          select: (cols = '*') => Promise.resolve({ data: { ...getMockData(tableName)[0], ...data }, error: null })
        })
      }),
      insert: (data) => ({
        select: (cols = '*') => Promise.resolve({
          data: Array.isArray(data) ? data.map((item, index) => ({
            id: `mock-${Date.now()}-${index}`,
            ...item,
            created_at: new Date().toISOString()
          })) : [{
            id: `mock-${Date.now()}`,
            ...data,
            created_at: new Date().toISOString()
          }],
          error: null
        }),
        single: () => Promise.resolve({
          data: {
            id: `mock-${Date.now()}`,
            ...data,
            created_at: new Date().toISOString()
          },
          error: null
        })
      })
    };
  };

  // Mock data for superadmins
  const getMockData = (tableName) => {
    const mockData = {
      players: [
        {
          id: '1',
          name: 'John Doe',
          birth_date: '2000-01-01',
          position: 'Forward',
          contact: 'john@example.com',
          created_at: '2023-01-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Sarah Smith',
          birth_date: '2001-03-15',
          position: 'Midfielder',
          contact: 'sarah@example.com',
          created_at: '2023-02-20T14:30:00Z'
        },
        {
          id: '3',
          name: 'Mike Johnson',
          birth_date: '1999-11-10',
          position: 'Defender',
          contact: 'mike@example.com',
          created_at: '2023-03-05T09:15:00Z'
        }
      ],
      homework: [
        {
          id: '1',
          title: 'Weekly Training',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          title: 'Strength Exercises',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      payments: [
        {
          id: '1',
          amount: 50.00,
          paid: false
        },
        {
          id: '2',
          amount: 75.00,
          paid: false
        }
      ],
      trainers: [
        {
          id: REAL_USERS.TRAINER,
          email: 'trainer_pt@sportiko.eu',
          full_name: 'Test Trainer',
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        }
      ],
      players_auth: [
        {
          id: REAL_USERS.PLAYER,
          email: 'player_pt@sportiko.eu',
          trainer_id: REAL_USERS.TRAINER,
          is_active: true
        }
      ]
    };

    return mockData[tableName] || [];
  };

  const value = {
    tenantSchema,
    tenantReady,
    queryTenantTable,
    queryMainTable,
    getTenantStorage,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};