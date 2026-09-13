// ==========================================================================
// KANIKAARA — Supabase client
// Reuses the existing project/schema from kanikaara_fixed_setup.sql
// ==========================================================================
const SUPABASE_URL = 'https://gmlfsygirhnutunodeec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtbGZzeWdpcmhudXR1bm9kZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MjMzOTksImV4cCI6MjA5MjM5OTM5OX0.DY8P9u1Epz2Dm9p05jxw7pzba2hdj3LAdIIX_aT1GVM';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});
