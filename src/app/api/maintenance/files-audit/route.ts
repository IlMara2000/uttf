import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auditRegistrationFiles, FILES_AUDIT_TRACE_KEY } from '@/lib/files-audit';
import { isMaintenanceAuthorized, maintenanceToken } from '@/lib/maintenance-auth';
import { RETENTION_TRACE_BUCKET } from '@/lib/retention-trace';

/**
 * Controllo settimanale degli allegati dell'archivio iscrizioni.
 *
 * Elenca orfani (oggetti nel bucket che nessuna riga cita) e mancanti (percorsi
 * citati da una riga ma assenti dal bucket). Non cancella nulla: l'esito viene
 * scritto nel bucket privato `retention-runs` come `files-audit.json`, dove la
 * route di stato lo legge per il banner staff. Così il controllo non dipende
 * dal fatto che qualcuno lanci lo script a mano.
 *
 * Stessa autenticazione della retention (`Authorization: Bearer` con
 * `CRON_SECRET` o `RETENTION_TOKEN`), GET e POST.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = { 'Cache-Control': 'no-store' };

async function handle(request: Request) {
  const expected = maintenanceToken();
  if (!expected) {
    return NextResponse.json(
      { error: 'Job non configurato: imposta CRON_SECRET o RETENTION_TOKEN.' },
      { status: 503, headers },
    );
  }

  if (!isMaintenanceAuthorized(request, expected)) {
    return NextResponse.json(
      { error: 'Non autorizzato.' },
      { status: 401, headers: { ...headers, 'WWW-Authenticate': 'Bearer' } },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Configurazione Supabase server mancante.' },
      { status: 503, headers },
    );
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const audit = await auditRegistrationFiles(client);
  const errors = audit.error ? [audit.error] : [];

  // Senza la traccia l'esito non arriverebbe a nessuno: un controllo che gira e
  // non si vede vale come un controllo non fatto.
  const created = await client.storage.createBucket(RETENTION_TRACE_BUCKET, {
    public: false,
  });
  const bucketError =
    created.error && !/exist/i.test(created.error.message)
      ? `bucket ${RETENTION_TRACE_BUCKET}: ${created.error.message}`
      : null;
  if (bucketError) errors.push(bucketError);

  let trace: string | null = null;
  // La traccia si scrive anche quando l'audit fallisce: l'errore deve arrivare
  // allo staff, non lasciare in piedi l'esito vecchio che sembrerebbe pulito.
  if (!bucketError) {
    const written = await client.storage
      .from(RETENTION_TRACE_BUCKET)
      .upload(FILES_AUDIT_TRACE_KEY, JSON.stringify(audit, null, 2), {
        contentType: 'application/json',
        upsert: true,
      });
    if (written.error) errors.push(`trace: ${written.error.message}`);
    else trace = FILES_AUDIT_TRACE_KEY;
  }

  const outcome = errors.length > 0 ? 'error' : 'ok';
  console.info(
    `[files-audit] ${outcome}: oggetti ${audit.bucketObjects}, orfani ${audit.orphans.count}, mancanti ${audit.missing.count}${
      errors.length > 0 ? ` errori: ${errors.join('; ')}` : ''
    }`,
  );

  return NextResponse.json(
    { ...audit, outcome, trace, errors },
    { status: errors.length > 0 ? 500 : 200, headers },
  );
}

export const GET = handle;
export const POST = handle;
