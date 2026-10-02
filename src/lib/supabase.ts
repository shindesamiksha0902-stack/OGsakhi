import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://onuuybestyadmekdzmws.supabase.co';
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udXV5YmVzdHlhZG1la2R6bXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5Mzc2OTYsImV4cCI6MjEwNjUxMzY5Nn0.q3WqdQfIl1YahzobNRIrLVgmvAezeo3HV2ZmrHp1hHc';

const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.trim() !== '')
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : DEFAULT_URL;

const supabaseAnonKey =
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim() !== '')
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : DEFAULT_ANON;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.startsWith('https://') &&
      !supabaseUrl.includes('your-project-ref')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

