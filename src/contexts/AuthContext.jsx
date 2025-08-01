import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, ensureTenantSchema } from '../lib/supabase';
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
    // Get initial session from Supabase
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Initial session check:', !!session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user);
        }
      } catch (error) {
        console.error('❌ Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session);
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
      console.log('🔍 Fetching profile for user:', user.email, user.id);

      // Special case for superadmin - check by email first
      if (user.email === 'superadmin_pt@sportiko.eu') {
        console.log('👑 Superadmin email detected');
        setProfile({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Super Admin',
          role: 'superadmin'
        });
        return;
      }

      // Try to fetch from sportiko_trainer schema - first check if user is a superadmin
      try {
        console.log('🔍 Checking superadmins table...');
        const { data: adminData, error: adminError } = await supabase
          .from('superadmins')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!adminError && adminData) {
          console.log('👑 Found in superadmins table:', adminData);
          setProfile({
            ...adminData,
            role: 'superadmin',
            full_name: adminData.full_name || user.user_metadata?.full_name || 'Super Admin'
          });
          return;
        } else {
          console.log('❌ Not found in superadmins table:', adminError?.message);
        }
      } catch (adminError) {
        console.error('❌ Error checking superadmin:', adminError);
      }

      // Check if user is a trainer
      try {
        console.log('🔍 Checking trainers table...');
        const { data: trainerData, error: trainerError } = await supabase
          .from('trainers')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!trainerError && trainerData) {
          console.log('🏃 Found in trainers table:', trainerData);
          
          // Ensure tenant schema exists for this trainer
          console.log('🏗️ Ensuring tenant schema exists...');
          await ensureTenantSchema(user.id);

          setProfile({
            ...trainerData,
            role: 'trainer',
            full_name: trainerData.full_name || user.user_metadata?.full_name || 'Trainer'
          });
          return;
        } else {
          console.log('❌ Not found in trainers table:', trainerError?.message);
        }
      } catch (trainerError) {
        console.error('❌ Error checking trainer:', trainerError);
      }

      console.warn('⚠️ No profile found for user:', user.email);

      // If user is the known trainer, create their profile
      if (user.id === 'd45616a4-d90b-4358-b62c-9005f61e3d84' || user.email === 'trainer_pt@sportiko.eu') {
        console.log('🏃 Creating profile for known trainer');
        try {
          const { data: newTrainer, error: createError } = await supabase
            .from('trainers')
            .insert([{
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || 'Demo Trainer',
              trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true
            }])
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating trainer profile:', createError);
          } else {
            console.log('✅ Created trainer profile:', newTrainer);
            
            // Ensure tenant schema exists
            await ensureTenantSchema(user.id);

            setProfile({
              ...newTrainer,
              role: 'trainer'
            });
            return;
          }
        } catch (error) {
          console.error('❌ Exception creating trainer profile:', error);
        }
      }

      // Create a fallback profile with basic information
      setProfile({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'User',
        role: 'trainer', // Default role
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      
      // Create a fallback profile with basic information if user exists
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear the local state
      setUser(null);
      setProfile(null);
      return { error };
    }
  };

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
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
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};