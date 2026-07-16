import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

function getInitialAuthCallback() {
  if (typeof window === 'undefined') {
    return {
      type: null,
      tokenHash: null,
      hasAuthParams: false,
      errorDescription: '',
    }
  }

  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const getParam = (name) => query.get(name) ?? hash.get(name)

  return {
    type: getParam('type'),
    tokenHash: getParam('token_hash'),
    hasAuthParams: Boolean(
      getParam('access_token') ||
      getParam('code') ||
      getParam('token_hash') ||
      getParam('error') ||
      getParam('error_code') ||
      getParam('error_description') ||
      ['invite', 'recovery'].includes(getParam('type')),
    ),
    errorDescription: getParam('error_description') ?? '',
  }
}

// Capture this before createClient processes and removes Auth tokens from the URL.
export const initialAuthCallback = getInitialAuthCallback()
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

let tokenHashVerification

export function completeInitialAuthCallback() {
  const { tokenHash, type } = initialAuthCallback

  if (!supabase || !tokenHash || !['invite', 'recovery'].includes(type)) {
    return Promise.resolve({ data: { session: null }, error: null })
  }

  // Some Supabase email templates send token_hash directly to the app instead
  // of using ConfirmationURL. Keep one promise so React Strict Mode cannot
  // consume the one-time token twice during development.
  tokenHashVerification ??= supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  return tokenHashVerification
}
