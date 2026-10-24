import { supabase } from './supabase';

export function factoryAssetPath(value: string): string | null {
  if (value.startsWith('notes/') || value.startsWith('uploads/') || value.startsWith('publications/')) return value;
  try {
    const url = new URL(value);
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
    const prefix = '/storage/v1/object/public/factory-assets/';
    return url.origin === base.origin && url.pathname.startsWith(prefix)
      ? decodeURIComponent(url.pathname.slice(prefix.length)) : null;
  } catch { return null; }
}

// Anonymous signing is permitted by RLS only for the publications directory.
export async function resolvePublicationUrl(value: string) {
  const path = factoryAssetPath(value);
  if (!path) return value;
  if (!path.startsWith('publications/') || path.split('/').some(part => part === '.' || part === '..') || /[\\\u0000-\u001f]/u.test(path)) return '';
  const { data, error } = await supabase.storage.from('factory-assets').createSignedUrl(path, 3600);
  return error ? '' : data.signedUrl;
}
