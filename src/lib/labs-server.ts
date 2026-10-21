import 'server-only';
import { cache } from 'react';
import { connection } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { labCategories, type LabCategory } from '@/app/labs/lab-data';

export const loadLabs = cache(async () => {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { labs: labCategories, ready: false };
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from('labs').select('*');
  if (error || !data?.length) return { labs: labCategories, ready: false };
  return { labs: labCategories.map(fallback => (data.find(row => row.slug === fallback.slug) as LabCategory | undefined) ?? fallback), ready: data.length === labCategories.length };
});
