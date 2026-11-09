import { createClient } from '@supabase/supabase-js';

// Le immagini delle pubblicazioni vivono nel bucket privato `factory-assets`.
// Questa route le serve con un URL pubblico e cacheabile: il client non vede mai
// un URL firmato e l'optimizer di next/image può ridimensionarle e convertirle.
export const dynamic = 'force-dynamic';

function publicationName(value: string) {
  if (!value || value.length > 200) return null;
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return null;
  if (/[\u0000-\u001f\u007f]/u.test(value)) return null;
  return value;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const name = publicationName((await params).name);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!name || !url || !key) return new Response('Not found', { status: 404 });

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.storage
    .from('factory-assets')
    .createSignedUrl(`publications/${name}`, 60);
  if (error || !data?.signedUrl) return new Response('Not found', { status: 404 });

  const upstream = await fetch(data.signedUrl, { cache: 'no-store' });
  if (!upstream.ok || !upstream.body) return new Response('Not found', { status: 404 });

  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('content-length', length);

  return new Response(upstream.body, { headers });
}
