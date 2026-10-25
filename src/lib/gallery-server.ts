import 'server-only';
import { connection } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { defaultGalleryMembers, defaultGalleryIntro } from '@/app/galleria/gallery-data';

import type { TeamMember, TeamIntro } from '@/app/team/team-data';

export async function loadGallery() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fallback = { members: defaultGalleryMembers, intro: defaultGalleryIntro, ready: false };
  if (!url || !key) return fallback;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [members, intro] = await Promise.all([
    client.from('gallery_artworks').select('*').eq('archived', false).order('sort_order').order('id'),
    client.from('gallery_intro').select('*').eq('id', 1).single(),
  ]);
  if (members.error || intro.error || !intro.data) return fallback;
  return { members: members.data as TeamMember[], intro: intro.data as TeamIntro, ready: true };
}
