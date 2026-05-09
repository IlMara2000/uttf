import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/errors';

type NewsletterPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  privacyAccepted?: unknown;
};

type NewsletterSubscriber = {
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
};

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

function cleanString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let payload: NewsletterPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
  }

  const name = cleanString(payload.name, 120);
  const email = cleanString(payload.email, 320).toLowerCase();
  const phone = cleanString(payload.phone, 40);

  if (payload.privacyAccepted !== true) {
    return NextResponse.json({ error: 'Devi accettare la privacy per iscriverti.' }, { status: 400 });
  }

  if (!name) {
    return NextResponse.json({ error: 'Inserisci il nome o nickname.' }, { status: 400 });
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Inserisci una email valida.' }, { status: 400 });
  }

  try {
    const { error } = await getAdminSupabase()
      .from('newsletter_subscribers')
      .insert([{ name, email, phone: phone || null }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('NEWSLETTER_SAVE_ERROR', error);
    return NextResponse.json(
      { error: 'Non sono riuscito a salvare il contatto nel gestionale.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return NextResponse.json({ error: 'Accesso staff richiesto.' }, { status: 401 });
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await getPublicSupabase().auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessione staff non valida.' }, { status: 401 });
    }

    const { data, error } = await getAdminSupabase()
      .from('newsletter_subscribers')
      .select('created_at, name, email, phone')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ subscribers: (data ?? []) as NewsletterSubscriber[] });
  } catch (error) {
    console.error('NEWSLETTER_READ_ERROR', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Non sono riuscito a leggere gli iscritti newsletter.') },
      { status: 500 }
    );
  }
}
