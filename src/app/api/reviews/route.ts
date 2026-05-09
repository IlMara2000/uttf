import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';

let adminSupabase: SupabaseClient | null = null;
let publicSupabase: SupabaseClient | null = null;

function getAdminSupabase() {
  if (adminSupabase) return adminSupabase;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Configurazione Supabase server mancante: aggiungi SUPABASE_SERVICE_ROLE_KEY.');
  }

  adminSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminSupabase;
}

function canUseAdminSupabase() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

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

    const userDelete = await getUserSupabase(token)
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .select('id');

    if (userDelete.error) throw userDelete.error;

    if (userDelete.data && userDelete.data.length > 0) {
      return NextResponse.json({ success: true, deletedId: reviewId, mode: 'staff_policy' });
    }

    if (!canUseAdminSupabase()) {
      return NextResponse.json(
        {
          error:
            'Recensione non cancellata: la policy RLS non permette il DELETE e manca SUPABASE_SERVICE_ROLE_KEY sul server.',
        },
        { status: 500 }
      );
    }

    const adminDelete = await getAdminSupabase()
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .select('id');

    if (adminDelete.error) throw adminDelete.error;

    if (!adminDelete.data || adminDelete.data.length === 0) {
      return NextResponse.json({ error: 'Recensione non trovata o gia eliminata.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: reviewId, mode: 'service_role' });
  } catch (error) {
    console.error('REVIEW_DELETE_ERROR', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Non sono riuscito a cancellare la recensione.') },
      { status: 500 }
    );
  }
}
