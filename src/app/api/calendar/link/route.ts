import { NextResponse } from 'next/server';
import { getStaffRole } from '@/lib/staff-access';
import { calendarAdmin, calendarFeedToken } from '@/lib/calendar-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function GET(request: Request) {
  const token =
    request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] || '';
  if (!token) return fail('Accesso staff richiesto.', 401);

  try {
    const client = calendarAdmin();
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);
    if (error || !user) return fail('Sessione staff non valida.', 401);
    if (!(await getStaffRole(client, user)))
      return fail('Accesso staff richiesto.', 403);

    const httpsUrl = `${new URL(request.url).origin}/api/calendar/planner.ics?token=${calendarFeedToken()}`;

    return NextResponse.json(
      { httpsUrl, webcalUrl: httpsUrl.replace(/^https:/, 'webcal:') },
      { headers },
    );
  } catch {
    console.error('CALENDAR_LINK_ERROR');
    return fail('Link calendario non disponibile. Riprova.', 500);
  }
}
