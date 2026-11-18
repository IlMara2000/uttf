'use client'

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log di emergenza (vedrai questi errori nella console del browser se mancano le chiavi)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "MISSION_CRITICAL_ERROR: Chiavi Supabase non trovate nelle variabili d'ambiente. " +
    "Controlla le impostazioni di Vercel (Settings > Environment Variables)."
  );
}

/**
 * Supabase conta i refresh (150/ora per IP) sullo stesso budget del login con
 * password. Con la sessione scaduta il client riprova da solo: getSession()
 * refresha e il ticker di auto-refresh ci riprova ogni 30 secondi, quindi un
 * endpoint saturo resta saturo e lo staff non entra piu' nemmeno con la password
 * giusta. Un fallimento basta: si bloccano i tentativi successivi per un cooldown
 * condiviso tra le tab e si risponde con l'errore di refresh token invalido che
 * gotrue conosce, cosi' il client scarta la sessione e l'app torna al login.
 */
const BLOCK_KEY = 'uttf:auth-refresh-blocked-until';
const COOLDOWN_MS = 5 * 60_000;
/** Sotto i 5s di `lockAcquireTimeout`: il lock non resta occupato abbastanza per essere rubato. */
const REFRESH_TIMEOUT_MS = 3000;

function blockedUntil(): number {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(BLOCK_KEY)) || 0;
}

function blockRefresh() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BLOCK_KEY, String(Date.now() + COOLDOWN_MS));
}

/** Un login riuscito porta una sessione nuova: il cooldown di un refresh vecchio non serve piu'. */
export function clearRefreshBlock() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(BLOCK_KEY);
}

function isRefreshRequest(input: RequestInfo | URL): boolean {
  try {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      window.location.origin,
    );
    return url.pathname.endsWith('/auth/v1/token') && url.searchParams.get('grant_type') === 'refresh_token';
  } catch {
    return false;
  }
}

const guardedFetch: typeof fetch = async (input, init) => {
  if (!isRefreshRequest(input)) return fetch(input, init);

  // Cooldown attivo: nessuna richiesta, la sessione vale come persa.
  if (Date.now() < blockedUntil()) {
    return new Response(
      JSON.stringify({
        code: 401,
        error_code: 'refresh_token_not_found',
        msg: 'Invalid Refresh Token: Refresh Token Not Found',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Il lock di gotrue resta occupato finché la fetch è in volo: con una richiesta
    // appesa, dopo 5s un'altra tab lo ruba e questa viene abortita ("Lock ... was
    // released because another request stole it"). Chiusa a 3s, il lock si libera
    // prima della soglia del furto.
    const response = await fetch(input, { ...init, signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS) });
    if (!response.ok) blockRefresh();
    return response;
  } catch (error) {
    blockRefresh();
    throw error;
  }
};

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  { isSingleton: true, global: { fetch: guardedFetch } },
);
