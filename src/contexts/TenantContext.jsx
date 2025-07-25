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
      // For demo trainer user
      if (user.id === REAL_USERS.TRAINER) {
        const schema = getTenantSchema(user.id);
        setTenantSchema(schema);
        setTenantReady(true);
        return;
      }
      
      // For real trainers
      if (profile.role === 'trainer') {
        const schema = getTenantSchema(user.id);
        setTenantSchema(schema);
        setTenantReady(true);
        return;
      }
      
      // For players, use their trainer's schema
      if (profile.role === 'player' && profile.trainer_id) {
        const schema = getTenantSchema(profile.trainer_id);
        setTenantSchema(schema);
        setTenantReady(true);
        return;
      }
      
      // For superadmins, no specific tenant schema is needed
      if (profile.role === 'superadmin') {
        setTenantSchema(null);
        setTenantReady(true);
        return;
      }
      
      // Default case - no schema available
      setTenantSchema(null);
      setTenantReady(false);
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
    
    // For demo trainer user
    if (user?.id === REAL_USERS.TRAINER) {
      // Try to use real DB first
      try {
        return supabase.from(`${tenantSchema}.${tableName}`);
      } catch (error) {
        console.error(`Error querying ${tenantSchema}.${tableName}:`, error);
        toast.error(`Could not access ${tableName}. Schema may not exist.`);
        
        // Return mock functions to prevent app crashes
        return getMockTableFunctions(tableName);
      }
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
      select: () => ({
        order: () => Promise.resolve({ data: getMockData(tableName), error: null }),
        eq: () => ({
          select: () => Promise.resolve({ data: getMockData(tableName)[0], error: null })
        }),
        gte: () => Promise.resolve({ data: getMockData(tableName), error: null }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null })
        }),
        update: () => ({
          eq: () => ({
            select: () => Promise.resolve({ data: getMockData(tableName)[0], error: null })
          })
        }),
        insert: () => ({
          select: () => Promise.resolve({ data: getMockData(tableName)[0], error: null })
        })
      })
    };
  };

  // Mock data for demo users
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