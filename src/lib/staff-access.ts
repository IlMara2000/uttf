import type { SupabaseClient, User } from '@supabase/supabase-js';

// The allowlist is authoritative; user-editable metadata is never a role source.
export async function getStaffRole(client: SupabaseClient, user: User) {
  if (user.is_anonymous || !user.email || !user.email_confirmed_at) return null;
  const { data, error } = await client.from('authorized_users').select('role')
    .eq('email', user.email.toLowerCase()).maybeSingle();
  if (error) throw new Error('Verifica autorizzazione non disponibile.');
  return data?.role === 'admin' || data?.role === 'staff' ? data.role as 'admin' | 'staff' : null;
}
