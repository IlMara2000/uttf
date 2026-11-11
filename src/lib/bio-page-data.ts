import { createClient } from "@supabase/supabase-js";
import { normalizeBioLinks, type BioLink } from "@/lib/bio-links";

export type BioPageData = { links: BioLink[]; version: number };

// The bio pages are the ones people open from an Instagram link, so a slow
// database must not hold the response: fall back to the default links instead.
const TIMEOUT_MS = 2500;

export async function getBioPageData(): Promise<BioPageData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const query = Promise.resolve(
      supabase.from("bio_page").select("links, version").eq("id", 1).single(),
    ).catch(() => null);
    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);
    if (!result || result.error || !result.data) return null;

    const stored = Array.isArray(result.data.links)
      ? (result.data.links as BioLink[])
      : [];
    if (!stored.length) return null;

    return {
      links: normalizeBioLinks(stored),
      version: Number(result.data.version) || 0,
    };
  } catch {
    return null;
  }
}
