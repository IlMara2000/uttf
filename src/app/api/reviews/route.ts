import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getStaffRole } from '@/lib/staff-access';

let publicSupabase: SupabaseClient | null = null;

function getPublicSupabase() {
  if (publicSupabase) return publicSupabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configurazione Supabase pubblica mancante.');
  }

  publicSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return publicSupabase;
}

function getUserSupabase(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configurazione Supabase pubblica mancante.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const reviewId = new URL(request.url).searchParams.get('id')?.trim();

  if (!token) {
    return NextResponse.json({ error: 'Accesso staff richiesto.' }, { status: 401 });
  }

  if (!reviewId || !/^\d+$/.test(reviewId)) {
    return NextResponse.json({ error: 'ID recensione non valido.' }, { status: 400 });
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await getPublicSupabase().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessione staff non valida.' }, { status: 401 });
    }

    const client = getUserSupabase(token);
    if (!await getStaffRole(client, user)) {
      return NextResponse.json({ error: 'Accesso staff richiesto.' }, { status: 403 });
    }
    const { data, error } = await client.from('reviews').delete().eq('id', reviewId).select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Recensione non trovata.' }, { status: 404 });
    return NextResponse.json({ success: true, deletedId: reviewId });
  } catch {
    console.error('REVIEW_DELETE_ERROR');
    return NextResponse.json(
      { error: 'Non sono riuscito a cancellare la recensione.' },
      { status: 500 }
    );
  }
}
