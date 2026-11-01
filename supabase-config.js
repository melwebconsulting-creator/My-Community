/**
 * HANGOUT + PANG FOREVER ♡
 * Supabase Client Configuration & Initialization
 * GitHub Pages Compatible (Static browser JavaScript)
 */

(function () {
  'use strict';

  // Default configuration placeholders.
  // Replace these with your actual Supabase project credentials,
  // OR enter them in the app's Setup / Admin Settings modal!
  const DEFAULT_SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_PUBLIC_KEY';

  // Check localStorage for saved credentials (allows instant in-browser setup on GitHub Pages)
  const storedUrl = localStorage.getItem('hangout_supabase_url');
  const storedKey = localStorage.getItem('hangout_supabase_anon_key');

  const supabaseUrl = (storedUrl && storedUrl.trim()) || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = (storedKey && storedKey.trim()) || DEFAULT_SUPABASE_ANON_KEY;

  const isConfigured = 
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('YOUR_PROJECT_ID') &&
    !supabaseAnonKey.includes('YOUR_SUPABASE_ANON');

  let client = null;

  if (isConfigured && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      client = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      console.log('🌸 HANGOUT: Supabase client initialized successfully.');
    } catch (err) {
      console.error('⚠️ HANGOUT: Failed to initialize Supabase client:', err);
    }
  }

  // Global HANGOUT Supabase namespace
  window.HangoutConfig = {
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey,
    isConfigured: isConfigured,
    getClient: function () {
      return client;
    },
    saveCredentials: function (url, anonKey) {
      if (!url || !anonKey) return false;
      localStorage.setItem('hangout_supabase_url', url.trim());
      localStorage.setItem('hangout_supabase_anon_key', anonKey.trim());
      return true;
    },
    clearCredentials: function () {
      localStorage.removeItem('hangout_supabase_url');
      localStorage.removeItem('hangout_supabase_anon_key');
    }
  };
})();
