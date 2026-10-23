import { createClient } from '@supabase/supabase-js';

// Estes valores virão das variáveis de ambiente da Vercel
const supabaseUrl = typeof window !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL || '' : '';
const supabaseAnonKey =
  typeof window !== 'undefined' ? import.meta.env.VITE_SUPABASE_ANON_KEY || '' : '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = createClient(
  supabaseUrl || 'https://unconfigured.supabase.co',
  supabaseAnonKey || 'unconfigured',
);
