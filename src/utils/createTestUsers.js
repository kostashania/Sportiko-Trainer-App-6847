import { supabase } from '../lib/supabase';

export const createTestUsers = async () => {
  const users = [
    {
      email: 'superadmin_pt@sportiko.com',
      password: 'pass123',
      fullName: 'Super Admin',
      role: 'superadmin'
    },
    {
      email: 'trainer_pt@sportiko.com', 
      password: 'pass123',
      fullName: 'Test Trainer',
      role: 'trainer'
    },
    {
      email: 'player_pt@sportiko.com',
      password: 'pass123', 
      fullName: 'Test Player',
      role: 'player'
    }
  ];

  const results = [];

  for (const user of users) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            full_name: user.fullName,
            role: user.role
          }
        }
      });

      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
        results.push({ email: user.email, success: false, error: error.message });
      } else {
        console.log(`Successfully created ${user.email}`);
        results.push({ email: user.email, success: true, userId: data.user?.id });
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`Exception creating ${user.email}:`, error);
      results.push({ email: user.email, success: false, error: error.message });
    }
  }

  // After all users are created, create the player relationship
  try {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for triggers to complete
    
    const { error: playerError } = await supabase.rpc('create_test_player');
    if (playerError) {
      console.error('Error creating player relationship:', playerError);
    } else {
      console.log('Player relationship created successfully');
    }
  } catch (error) {
    console.error('Exception creating player relationship:', error);
  }

  return results;
};