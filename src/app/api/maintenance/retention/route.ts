import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runRetention } from '@/lib/retention';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Job di conservazione dei dati (privacy §07).
 *
 * Lo chiama il cron di Vercel (`vercel.json`) con
 * `Authorization: Bearer $CRON_SECRET`; lo stesso endpoint, o direttamente
 * `runRetention`, funzionerà da Cron Trigger su Cloudflare dopo la migrazione.
 * Accetta sia GET sia POST per non dipendere dal metodo del scheduler.
 *
 * Senza `RETENTION_ENABLED=true` risponde con i soli conteggi: nessuna
 * cancellazione finché non lo si abilita esplicitamente.
 */

function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(request: Request) {
  const expected = process.env.RETENTION_TOKEN ?? process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return tokensMatch(header.slice(prefix.length), expected);
}

async function handle(request: Request) {
  if (!process.env.RETENTION_TOKEN && !process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Job non configurato: imposta CRON_SECRET o RETENTION_TOKEN.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Non autorizzato.' },
      { status: 401, headers: { 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer' } },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configurazione Supabase server mancante.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const report = await runRetention(client, {
    enabled: process.env.RETENTION_ENABLED === 'true',
  });

  console.info(
    `[retention] ${report.mode}: ${JSON.stringify(report.deleted)}${
      report.errors.length > 0 ? ` errori: ${report.errors.join('; ')}` : ''
    }`,
  );

  return NextResponse.json(report, {
    status: report.errors.length > 0 ? 207 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const GET = handle;
export const POST = handle;
