import { NextResponse } from 'next/server';
import { requireRegistrationStaff } from '@/lib/registrations/server';
import { runRetention } from '@/lib/retention';

/**
 * Verifica della retention su richiesta dello staff: sola lettura, senza token.
 *
 * Usa la sessione Supabase dello staff (`Authorization: Bearer <access_token>`,
 * lo stesso schema della route di stato), non il `CRON_SECRET`: chi è già
 * nell'area riservata può contare le righe idonee senza che nessuno condivida
 * un segreto di manutenzione. `enabled: false` è esplicito e non dipende da
 * `RETENTION_ENABLED`, quindi questo endpoint non può cancellare in nessun caso.
 *
 * Non scrive nulla: nessuna traccia nel bucket, nessun `latest.json`. La
 * verifica è idempotente e non altera l'evidenza del giro notturno. Gli errori
 * di una fase tornano nel corpo (`errors`) con status 200: è una diagnosi, non
 * un guasto della richiesta; lo staff li vede accanto ai conteggi.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = { 'Cache-Control': 'private, no-store' };

async function handle(request: Request) {
  let client;
  try {
    client = await requireRegistrationStaff(request);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'Accesso non verificabile.' }, { status: 503, headers });
  }

  const report = await runRetention(client, { enabled: false });

  return NextResponse.json(
    {
      mode: report.mode,
      executedAt: report.executedAt,
      deleted: report.deleted,
      deferred: report.deferred,
      errors: report.errors,
    },
    { headers },
  );
}

export const GET = handle;
export const POST = handle;
