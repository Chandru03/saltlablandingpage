import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type WaitlistResult =
  | { status: 'created' }
  | { status: 'duplicate' };

let supabaseClient: SupabaseClient | null = null;

const WAITLIST_TABLE = import.meta.env.VITE_SUPABASE_WAITLIST_TABLE || 'waitlist_signups';

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Waitlist is not configured. Add the Supabase environment variables first.');
  }

  supabaseClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabaseClient;
}

export async function addEmailToWaitlist(email: string): Promise<WaitlistResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase
    .from(WAITLIST_TABLE)
    .insert({ email: normalizedEmail, source: 'landing-page' });

  if (!error) {
    return { status: 'created' };
  }

  if (error.code === '23505') {
    return { status: 'duplicate' };
  }

  throw new Error(error.message || 'Unable to join the waitlist right now.');
}
