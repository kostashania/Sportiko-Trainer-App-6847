import { supabase, REAL_USERS } from '../lib/supabase';
import { createTenantSchema } from './createTenantSchema';

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
        results.push({ email: user.email, success: true, userId: existingUser.id });
        continue;
      }

      // Create auth user (using admin API if superadmin user, otherwise regular signup)
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
          role: user.role
        }
      });

      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
        results.push({ email: user.email, success: false, error: error.message });
      } else {
        console.log(`Successfully created ${user.email}`);
        
        const userId = data.user?.id || user.id;
        results.push({ email: user.email, success: true, userId });
        
        // Handle role-specific setup
        if (user.role === 'superadmin') {
          // Add to superadmins table
          await supabase
            .from('superadmins')
            .upsert([{
              id: userId,
              email: user.email,
              full_name: user.fullName
            }]);
        } else if (user.role === 'trainer') {
          // Add to trainers table
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);
          
          await supabase
            .from('trainers')
            .upsert([{
              id: userId,
              email: user.email,
              full_name: user.fullName,
              trial_end: trialEnd.toISOString(),
              is_active: true
            }]);
            
          // Create tenant schema
          await createTenantSchema(userId);
        }
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
    // Wait for triggers to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get trainer and player IDs
    const trainerId = results.find(r => r.email === 'trainer_pt@sportiko.eu')?.userId || REAL_USERS.TRAINER;
    const playerId = results.find(r => r.email === 'player_pt@sportiko.eu')?.userId || REAL_USERS.PLAYER;
    
    // Add player to players_auth table
    await supabase
      .from('players_auth')
      .upsert([{
        id: playerId,
        email: 'player_pt@sportiko.eu',
        trainer_id: trainerId,
        is_active: true
      }]);
    
    // Add player to trainer's schema
    const trainerSchema = `pt_${trainerId.replace(/-/g, '_')}`;
    
    // This RPC would need to be created in your database
    const { error } = await supabase.rpc('add_player_to_trainer_schema', {
      schema_name: trainerSchema,
      player_id: playerId,
      player_name: 'Test Player',
      player_email: 'player_pt@sportiko.eu'
    });
    
    if (error) {
      console.error('Error adding player to trainer schema:', error);
      
      // Fallback: try direct SQL
      try {
        await supabase.rpc('execute_sql', {
          sql: `
            INSERT INTO ${trainerSchema}.players (name, contact, avatar_url)
            VALUES ('Test Player', 'player_pt@sportiko.eu', null)
            ON CONFLICT DO NOTHING;
          `
        });
      } catch (sqlError) {
        console.error('Error adding player with SQL:', sqlError);
      }
    }
    
    console.log('Player relationship created successfully');
  } catch (error) {
    console.error('Exception creating player relationship:', error);
  }

  return results;
};