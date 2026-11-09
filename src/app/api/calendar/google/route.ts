import { NextResponse } from 'next/server';
import {
  disconnectGoogleAccount,
  googleAccountStatus,
  googleOAuthConfigured,
  requireStaffUser,
} from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: Request) {
  try {
    const { user } = await requireStaffUser(request);
    return NextResponse.json(await googleAccountStatus(user.id), { headers });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      {
        configured: googleOAuthConfigured(),
        ready: false,
        connected: false,
        email: null,
        lastSyncedAt: null,
      },
      { headers },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await requireStaffUser(request);
    await disconnectGoogleAccount(user.id);
    return NextResponse.json({ connected: false }, { headers });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('GOOGLE_CALENDAR_DISCONNECT_ERROR');
    return NextResponse.json(
      { error: 'Scollegamento non riuscito.' },
      { status: 500, headers },
    );
  }
}
