import { NextResponse } from 'next/server';
import {
  exchangeGoogleCode,
  googleAccountEmail,
  saveGoogleAccount,
  syncGoogleCalendar,
  verifyGoogleState,
} from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirect = (status: string) =>
    NextResponse.redirect(new URL(`/dashboard?google=${status}`, url.origin));

  if (url.searchParams.get('error')) return redirect('denied');

  const code = url.searchParams.get('code');
  const userId = verifyGoogleState(url.searchParams.get('state'));
  if (!code || !userId) return redirect('invalid');

  try {
    const redirectUri = `${url.origin}/api/calendar/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);
    const email = await googleAccountEmail(tokens.accessToken);
    await saveGoogleAccount(userId, email, tokens.refreshToken);

    try {
      await syncGoogleCalendar(userId, { force: true });
    } catch {
      /* La connessione resta valida: il primo sync può essere ritentato. */
    }

    return redirect('connected');
  } catch {
    console.error('GOOGLE_CALENDAR_CALLBACK_ERROR');
    return redirect('error');
  }
}
