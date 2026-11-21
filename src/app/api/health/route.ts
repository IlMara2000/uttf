import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Sonda pubblica per l'uptime monitor (UptimeRobot o un cron esterno).
 *
 * Non espone dati: risponde solo se il sito e il database rispondono. La query
 * è anche il "battito" che tiene sveglio il progetto Supabase free, che va in
 * pausa dopo 7 giorni senza richieste.
 *
 * GET e HEAD fanno la stessa verifica: UptimeRobot di default usa HEAD, il
 * browser e i cron usano GET.
 */

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

async function probe() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[health] Configurazione Supabase server mancante.');
    return { status: 503, body: { ok: false, db: 'non configurato' } };
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = Date.now();
  // `head: true` non scarica righe: serve solo a far parlare il database.
  const { error } = await client
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true });

  if (error) {
    // PostgREST a volte torna con `message` vuoto: codice e dettagli aiutano.
    const detail = error.message || error.code || error.details || 'errore sconosciuto';
    console.error(`[health] Supabase: ${detail}`);
    return { status: 503, body: { ok: false, db: 'errore' } };
  }

  return { status: 200, body: { ok: true, db: 'ok', ms: Date.now() - startedAt } };
}

export async function GET() {
  const result = await probe();
  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

export async function HEAD() {
  const result = await probe();
  return new Response(null, { status: result.status, headers: NO_STORE });
}
