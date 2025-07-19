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
    // Check for demo user in localStorage first
    const demoUser = localStorage.getItem('sportiko_user');
    if (demoUser) {
      const parsedUser = JSON.parse(demoUser);
      setUser(parsedUser);
      setProfile({
        id: parsedUser.id,
        full_name: 'Demo Admin',
        email: parsedUser.email,
        role: 'superadmin',
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
      setLoading(false);
      return;
    }

    // Get initial session from Supabase if no demo user
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      // For demo purposes, if we're using the demo user, create a mock profile
      if (userId === 'demo-admin-id') {
        setProfile({
          id: userId,
          full_name: 'Demo Admin',
          email: 'admin@sportiko.com',
          role: 'superadmin',
          trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        return;
      }

      // Try to fetch from actual Supabase
      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', userId)
        .single();

      if (!trainerError) {
        setProfile({ ...trainerData, role: 'trainer' });
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('superadmins')
        .select('*')
        .eq('id', userId)
        .single();

      if (!adminError) {
        setProfile({ ...adminData, role: 'superadmin' });
        return;
      }

      console.error('No profile found');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email, password) => {
    try {
      // Special case for demo user
      if (email === 'admin@sportiko.com' && password === 'Admin123!') {
        const demoUser = {
          id: 'demo-admin-id',
          email: email,
          role: 'admin'
        };
        setUser(demoUser);
        localStorage.setItem('sportiko_user', JSON.stringify(demoUser));
        
        // Set demo profile
        setProfile({
          id: 'demo-admin-id',
          full_name: 'Demo Admin',
          email: email,
          role: 'superadmin',
          trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        return { data: { user: demoUser }, error: null };
      }
      
      // Otherwise, try actual Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Check if we're using demo user
      if (user?.id === 'demo-admin-id') {
        localStorage.removeItem('sportiko_user');
        setUser(null);
        setProfile(null);
        return { error: null };
      }
      
      // Otherwise use Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create trainer profile
        const { error: profileError } = await supabase
          .from('trainers')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]);

        if (profileError) throw profileError;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    signUp,
    fetchProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};