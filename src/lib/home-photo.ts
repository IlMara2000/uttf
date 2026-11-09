import 'server-only';
import { createClient } from '@supabase/supabase-js';

export type HomePhoto = { url: string; version: number };

export const defaultHomePhoto: HomePhoto = {
  url: '/labs/foto1.jpeg',
  version: 0,
};

function isAllowedUrl(value: string, base: string) {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return (
      url.origin === new URL(base).origin &&
      url.pathname.startsWith('/storage/v1/object/public/site-photos/')
    );
  } catch {
    return false;
  }
}

export async function loadHomePhoto(): Promise<HomePhoto> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return defaultHomePhoto;

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from('home_photo')
      .select('url, version')
      .eq('id', 1)
      .single();

    if (error || !data || typeof data.url !== 'string') return defaultHomePhoto;
    return {
      url: isAllowedUrl(data.url, url) ? data.url : defaultHomePhoto.url,
      version: typeof data.version === 'number' ? data.version : 0,
    };
  } catch {
    return defaultHomePhoto;
  }
}
