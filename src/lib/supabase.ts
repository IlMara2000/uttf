import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log di emergenza (vedrai questi errori nella console del browser se mancano le chiavi)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "MISSION_CRITICAL_ERROR: Chiavi Supabase non trovate nelle variabili d'ambiente. " +
    "Controlla le impostazioni di Vercel (Settings > Environment Variables)."
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);