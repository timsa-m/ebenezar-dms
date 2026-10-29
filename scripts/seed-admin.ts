import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createAdmin() {
  const email = 'admin@ebenezar.com';
  const password = 'Password123!';

  console.log('Creating auth user...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: 'System', last_name: 'Admin' },
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    // If user already exists, let's fetch them to ensure they're active
    if (authError.message.includes('already exists')) {
      console.log('User exists. Attempting to activate...');
      
      // Get auth user ID
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) return console.error('Error listing users:', usersError);
      
      const user = usersData.users.find(u => u.email === email);
      if (!user) return console.log('Could not find existing user ID.');

      // Update public.users profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'ADMIN', user_status: 'active' })
        .eq('auth_id', user.id);
        
      if (updateError) {
        console.error('Error updating existing profile:', updateError);
      } else {
        console.log('Successfully activated existing admin profile!');
      }
    }
    return;
  }

  console.log('Creating public.users profile...');
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      auth_id: authData.user.id,
      email,
      first_name: 'System',
      last_name: 'Admin',
      role: 'ADMIN',
      user_status: 'active',
    });

  if (profileError) {
    console.error('Error creating public profile:', profileError);
    return;
  }

  console.log('\nSuccess! You can now log in with:');
  console.log('Email:', email);
  console.log('Password:', password);
}

createAdmin();
