import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let isSupabaseConfigured = false;
export let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('Supabase configuration missing in .env, skipping client init');
} else {
  isSupabaseConfigured = true;
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}
