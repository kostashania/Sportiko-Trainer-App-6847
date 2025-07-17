import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    console.log('AuthProvider: Initializing');
    // Get initial session
    const getSession = async () => {
      try {
        console.log('AuthProvider: Getting session');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthProvider: Session obtained', session ? 'with user' : 'no user');
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed', event);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      console.log('AuthProvider: Fetching profile for', userId);
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      console.log('AuthProvider: Profile data', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to fetch profile');
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      console.log('AuthProvider: Signing up user', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'trainer'
          }
        }
      });

      if (error) throw error;

      // Create trainer profile
      if (data.user) {
        console.log('AuthProvider: Creating trainer profile');
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);

        const { error: profileError } = await supabase
          .from('trainers')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              trial_start: trialStart.toISOString(),
              trial_end: trialEnd.toISOString(),
              created_at: new Date().toISOString()
            }
          ]);

        if (profileError) throw profileError;
        
        // Create tenant schema
        console.log('AuthProvider: Creating tenant schema');
        await createTenantSchema(data.user.id);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      console.log('AuthProvider: Signing in user', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      console.log('AuthProvider: Sign in successful');
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const createTenantSchema = async (userId) => {
    try {
      const schema = `trainer_${userId.replace(/-/g, '_')}`;
      console.log('Creating tenant schema:', schema);
      
      const { error } = await supabase.rpc('create_tenant_schema', {
        schema_name: schema,
        trainer_id: userId
      });
      
      if (error) throw error;
      console.log('Tenant schema created successfully');
    } catch (error) {
      console.error('Error creating tenant schema:', error);
      toast.error('Error setting up your account');
    }
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};