import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yownztngxtaaywutgtat.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvd256dG5neHRhYXl3dXRndGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTEyNzIsImV4cCI6MjA5NDIyNzI3Mn0.nhnN4llv2st3D2E6tSppLjTh7q6HRGOUK00arM4-Nu8';

console.log('Initializing Supabase with URL:', supabaseUrl);

export const isSupabaseConfigured = true; // Always true now since we hardcoded fallback

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
