import { NextResponse } from 'next/server';
import { readJson } from '@/lib/request-json';
import {
  GoogleCalendarError,
  requireStaffUser,
  syncGoogleCalendar,
} from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  try {
    const { user } = await requireStaffUser(request);

    let force = false;
    try {
      const payload = (await readJson(request)) as { force?: unknown } | null;
      force = Boolean(payload?.force);
    } catch {
      force = false;
    }

    const result = await syncGoogleCalendar(user.id, { force });
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof GoogleCalendarError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    console.error('GOOGLE_CALENDAR_SYNC_ERROR');
    return NextResponse.json(
      { error: 'Sincronizzazione non riuscita. Riprova.' },
      { status: 500, headers },
    );
  }
}
