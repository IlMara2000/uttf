import { NextResponse } from 'next/server';
import {
  googleAuthUrl,
  googleOAuthConfigured,
  requireStaffUser,
} from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  try {
    const { user } = await requireStaffUser(request);
    if (!googleOAuthConfigured())
      return NextResponse.json(
        {
          error:
            'Google Calendar non configurato: mancano GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.',
        },
        { status: 503, headers },
      );

    const redirectUri = `${new URL(request.url).origin}/api/calendar/google/callback`;
    return NextResponse.json(
      { url: googleAuthUrl(user.id, redirectUri) },
      { headers },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GOOGLE_CALENDAR_CONNECT_ERROR');
    return NextResponse.json(
      { error: 'Connessione non disponibile. Riprova.' },
      { status: 500, headers },
    );
  }
}
