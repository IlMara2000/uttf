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
 * Supabase limita i refresh a 150/ora per IP e il login con password usa lo stesso
 * budget. Quando la sessione e' scaduta, ogni getSession() e il ticker di
 * auto-refresh (ogni 30 secondi) ritentano il refresh: se l'endpoint e' gia'
 * saturo, i tentativi continuano ad arrivare e il limite non si libera piu',
 * lasciando lo staff fuori anche con la password corretta.
 *
 * Qui il refresh viene tentato una volta sola: al primo fallimento parte un
 * cooldown condiviso fra tutte le tab (localStorage) e i tentativi successivi
 * vengono cortocircuitati con un 401, cosi' il client scarta la sessione e
 * l'app riporta al login invece di martellare l'endpoint.
 */
const REFRESH_BLOCK_KEY = 'uttf:auth-refresh-blocked-until';
const RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
const FAILURE_COOLDOWN_MS = 2 * 60_000;

function refreshBlockedUntil(): number {
  if (typeof window === 'undefined') return 0;
  const value = Number(window.localStorage.getItem(REFRESH_BLOCK_KEY) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function blockRefresh(ms: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REFRESH_BLOCK_KEY, String(Date.now() + ms));
}

function clearRefreshBlock() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFRESH_BLOCK_KEY);
}

/** Stessa forma dell'errore che gotrue restituisce quando il refresh token non e' piu' valido. */
function refreshBlockedResponse() {
  return new Response(
    JSON.stringify({
      code: 401,
      error_code: 'refresh_token_not_found',
      msg: 'Invalid Refresh Token: Refresh Token Not Found',
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}

function isRefreshRequest(input: RequestInfo | URL): boolean {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token');
}

const guardedFetch: typeof fetch = async (input, init) => {
  const isRefresh = isRefreshRequest(input);

  if (isRefresh) {
    if (Date.now() < refreshBlockedUntil()) return refreshBlockedResponse();
  }

  try {
    const response = await fetch(input, init);
    if (isRefresh) {
      if (response.ok) clearRefreshBlock();
      else blockRefresh(response.status === 429 ? RATE_LIMIT_COOLDOWN_MS : FAILURE_COOLDOWN_MS);
    }
    return response;
  } catch (error) {
    // Errore di rete: si rimanda, ma senza raffica.
    if (isRefresh) blockRefresh(FAILURE_COOLDOWN_MS);
    throw error;
  }
};

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  { isSingleton: true, global: { fetch: guardedFetch } },
);
