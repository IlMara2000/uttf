import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Autenticazione e configurazione comuni alle route di manutenzione (retention
 * e controllo allegati).
 *
 * Una sola implementazione: due copie del confronto a tempo costante o dei
 * messaggi d'errore sono il modo più facile per introdurre una divergenza
 * silenziosa tra due endpoint che devono rispondere allo stesso modo.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Token condiviso delle route di manutenzione (cron di Vercel o trigger esterno). */
export function maintenanceToken() {
  return process.env.RETENTION_TOKEN ?? process.env.CRON_SECRET ?? null;
}

function tokensMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** `Authorization: Bearer <token>`, confrontato in tempo costante. */
export function isMaintenanceAuthorized(request: Request, expected: string) {
  const header = request.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  return tokensMatch(header.slice(prefix.length), expected);
}

type MaintenanceSetup = { error: NextResponse } | { client: SupabaseClient };

/**
 * Token, configurazione Supabase e client service role in un solo passaggio:
 * la route rimanda `error` così com'è oppure usa `client`. Status code e
 * messaggi sono quelli delle route di manutenzione, non vanno duplicati.
 */
export function maintenanceClient(request: Request): MaintenanceSetup {
  const expected = maintenanceToken();
  if (!expected) {
    return {
      error: NextResponse.json(
        { error: 'Job non configurato: imposta CRON_SECRET o RETENTION_TOKEN.' },
        { status: 503, headers: NO_STORE },
      ),
    };
  }

  if (!isMaintenanceAuthorized(request, expected)) {
    return {
      error: NextResponse.json(
        { error: 'Non autorizzato.' },
        { status: 401, headers: { ...NO_STORE, 'WWW-Authenticate': 'Bearer' } },
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      error: NextResponse.json(
        { error: 'Configurazione Supabase server mancante.' },
        { status: 503, headers: NO_STORE },
      ),
    };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}
