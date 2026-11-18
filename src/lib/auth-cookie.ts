export const TOKEN_EXPIRY_MARGIN_MS = 90_000; // EXPIRY_MARGIN_MS di auth-js (3 x 30 s)

export type CookieSession = { accessToken: string; expiresAt: number };

/**
 * Token già emesso, letto dal cookie di @supabase/ssr (eventualmente a pezzi).
 * Il rinnovo resta al browser: `getUser()` senza argomento passerebbe da
 * `__loadSession()`, che refresha sempre a sessione scaduta e ruoterebbe il
 * refresh token in gara con la tab dell'utente.
 */
export function sessionFromCookies(
  cookies: { name: string; value: string }[],
  supabaseUrl: string,
): CookieSession | null {
  const ref = new URL(supabaseUrl).hostname.split('.')[0];
  const base = `sb-${ref}-auth-token`;
  const chunks = cookies.filter((c) => c.name === base || c.name.startsWith(`${base}.`));
  if (chunks.length === 0) return null;

  const raw =
    chunks.length === 1 && chunks[0].name === base
      ? chunks[0].value
      : chunks
          .sort((a, b) => Number(a.name.slice(base.length + 1) || 0) - Number(b.name.slice(base.length + 1) || 0))
          .map((c) => c.value)
          .join('');

  try {
    const json = raw.startsWith('base64-')
      ? new TextDecoder().decode(
          Uint8Array.from(atob(raw.slice(7).replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)),
        )
      : raw;
    const parsed = JSON.parse(json) as { access_token?: string; expires_at?: number };
    if (!parsed.access_token) return null;
    return { accessToken: parsed.access_token, expiresAt: parsed.expires_at ?? 0 };
  } catch {
    return null;
  }
}
