import { supabase, REAL_USERS } from '../lib/supabase';

export const createTestUsers = async () => {
  const users = [
    {
      email: 'superadmin_pt@sportiko.eu',
      password: 'pass123',
      fullName: 'Super Admin',
      role: 'superadmin',
      id: REAL_USERS.SUPERADMIN
    },
    {
      email: 'trainer_pt@sportiko.eu',
      password: 'pass123',
      fullName: 'Test Trainer',
      role: 'trainer',
      id: REAL_USERS.TRAINER
    },
    {
      email: 'player_pt@sportiko.eu',
      password: 'pass123',
      fullName: 'Test Player',
      role: 'player',
      id: REAL_USERS.PLAYER
    }
  ];

  const results = [];

  for (const user of users) {
    try {
      console.log(`Creating user: ${user.email}`);
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', user.email)
        .single();
        
      if (existingUser) {
        console.log(`User ${user.email} already exists`);
        results.push({
          email: user.email,
          success: true,
          userId: existingUser.id
        });
        continue;
      }
      
      // For demo purposes, we'll just simulate user creation
      // In a real app, this would use the admin API
      const mockUserId = user.id || crypto.randomUUID();
      
      // Add user to demo results
      results.push({
        email: user.email,
        success: true,
        userId: mockUserId
      });
      
      // Simulate a delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Log success message
      console.log(`Successfully created ${user.email} (simulated)`);
      
    } catch (error) {
      console.error(`Exception creating ${user.email}:`, error);
      results.push({
        email: user.email,
        success: false,
        error: error.message
      });
    }
  }

  // Simulate player relationship creation
  console.log("Creating player relationships (simulated)");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return results;
};

export default createTestUsers;