import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, demoAuth } from '../lib/supabase';
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
      try {
        const parsedUser = JSON.parse(demoUser);
        setUser(parsedUser);
        
        // Get the full profile for the demo user
        const demoProfile = demoAuth.getDemoUser(parsedUser.email);
        if (demoProfile) {
          setProfile(demoProfile);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('sportiko_user');
      }
    }

    // Get initial session from Supabase if no demo user
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user);
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
          await fetchProfile(session.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (user) => {
    try {
      // For demo users, use the demo profile
      if (demoAuth.isDemoUser(user.email)) {
        const demoProfile = demoAuth.getDemoUser(user.email);
        if (demoProfile) {
          setProfile(demoProfile);
          return;
        }
      }

      // Special case for superadmin
      if (user.email === 'superadmin_pt@sportiko.eu') {
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Super Admin',
          role: 'superadmin'
        });
        return;
      }

      // Try to fetch from actual Supabase - first check if user is a superadmin
      try {
        const { data: adminData, error: adminError } = await supabase
          .from('superadmins')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!adminError && adminData) {
          setProfile({
            ...adminData,
            role: 'superadmin',
            full_name: adminData.full_name || user.user_metadata?.full_name || 'Super Admin'
          });
          return;
        }
      } catch (adminError) {
        console.error('Error checking superadmin:', adminError);
      }

      // Check if user is a trainer
      try {
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!trainerError && trainerData) {
          setProfile({
            ...trainerData,
            role: 'trainer',
            full_name: trainerData.full_name || user.user_metadata?.full_name || 'Trainer'
          });
          return;
        }
      } catch (trainerError) {
        console.error('Error checking trainer:', trainerError);
      }

      // Check if user is a player (in players_auth table)
      try {
        const { data: playerData, error: playerError } = await supabase
          .from('players_auth')
          .select('*,trainers:trainer_id(*)')
          .eq('id', user.id)
          .single();

        if (!playerError && playerData) {
          setProfile({
            ...playerData,
            role: 'player',
            full_name: user.user_metadata?.full_name || 'Player',
            trainer_id: playerData.trainer_id
          });
          return;
        }
      } catch (playerError) {
        console.error('Error checking player:', playerError);
      }

      console.warn('No profile found for user:', user.email);
      
      // Create a fallback profile with basic information
      setProfile({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
        role: 'trainer', // Default role
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Create a fallback profile with basic information
      if (user) {
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'User',
          role: 'trainer', // Default role
          trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }
  };

  const signIn = async (email, password) => {
    try {
      // Check if this is a demo user
      if (demoAuth.isDemoUser(email)) {
        const { data, error } = demoAuth.signIn(email, password);
        if (error) {
          throw error;
        }

        const demoProfile = demoAuth.getDemoUser(email);
        setUser(data.user);
        setProfile(demoProfile);
        localStorage.setItem('sportiko_user', JSON.stringify(data.user));
        return { data, error: null };
      }

      // Otherwise, try actual Supabase login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch profile after successful login
      if (data.user) {
        await fetchProfile(data.user);
      }

      return { data, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Check if we're using a demo user
      const demoUser = localStorage.getItem('sportiko_user');
      if (demoUser) {
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
      console.error('Sign out error:', error);
      
      // Even if there's an error, clear the local state
      localStorage.removeItem('sportiko_user');
      setUser(null);
      setProfile(null);
      return { error };
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      // For demo purposes, we can simulate signup success for demo users
      if (demoAuth.isDemoUser(email)) {
        const demoProfile = demoAuth.getDemoUser(email);
        return { data: { user: demoProfile }, error: null };
      }

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
        try {
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

          if (profileError) {
            console.warn('Error creating trainer profile:', profileError);
          }
        } catch (profileError) {
          console.error('Exception creating trainer profile:', profileError);
        }
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