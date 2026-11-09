/** Local assets and public Storage objects can go through the image optimizer.
 * Signed URLs are excluded: their token changes hourly, which would defeat caching. */
export function isOptimizableImage(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co');
    return url.origin === base.origin && url.pathname.startsWith('/storage/v1/object/public/');
  } catch { return false; }
}

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

const PUBLICATION_MEDIA_PREFIX = '/api/publications/media/';

function isServableName(name: string) {
  return (
    name.length > 0 &&
    name.length <= 200 &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('..') &&
    !/[\u0000-\u001f\u007f]/u.test(name)
  );
}

/** Public publication images go through our own cacheable media route, so they are
 * ordinary same-origin URLs: no signed token in the markup and the optimizer can
 * resize them. Private folders (notes/, uploads/) never resolve to a URL. */
export function resolvePublicationUrl(value: string) {
  const path = factoryAssetPath(value);
  if (!path) return value;
  if (!path.startsWith('publications/')) return '';
  const name = path.slice('publications/'.length);
  return isServableName(name) ? `${PUBLICATION_MEDIA_PREFIX}${encodeURIComponent(name)}` : '';
}
