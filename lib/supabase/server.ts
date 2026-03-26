import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for server-side use (API routes, server actions).
 * Uses the service role key for full access or anon key for public access.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey)
}
