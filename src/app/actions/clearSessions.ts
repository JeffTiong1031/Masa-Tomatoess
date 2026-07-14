'use server';

import { createClient } from '@supabase/supabase-js';

export async function clearUserSessions(userName: string): Promise<{ success: boolean; error?: string }> {
  if (!userName || typeof userName !== 'string') {
    return { success: false, error: 'Invalid user name.' };
  }

  // Validate against known users to prevent arbitrary deletions
  const allowedUsers = ['Jeff', 'Rachel'];
  if (!allowedUsers.includes(userName)) {
    return { success: false, error: 'Unknown user.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Prefer service role key for server-side ops; fall back to anon key
  const key = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    return { success: false, error: 'Supabase not configured.' };
  }

  const supabase = createClient(supabaseUrl, key);

  const { error } = await supabase
    .from('focus_sessions')
    .delete()
    .eq('user_name', userName);

  if (error) {
    console.error('Failed to clear Supabase sessions:', error);
    return { success: false, error: 'Failed to clear cloud data.' };
  }

  return { success: true };
}
