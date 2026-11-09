import { NextResponse } from 'next/server';
import { buildPlannerIcs } from '@/lib/calendar-ics';
import { parseFeedFilter } from '@/lib/calendar-filter';
import {
  assigneeLabel,
  isCalendarFeedToken,
  plannerFeedEvents,
} from '@/lib/calendar-feed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    if (!isCalendarFeedToken(url.searchParams.get('token'))) {
      return new NextResponse('Feed non disponibile.', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const filter = parseFeedFilter(url.searchParams);
    if (!filter) {
      return new NextResponse('Filtro non valido.', {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const [events, label] = await Promise.all([
      plannerFeedEvents(filter),
      filter.assignee ? assigneeLabel(filter.assignee) : Promise.resolve(null),
    ]);

    const baseName =
      filter.scope === 'shifts'
        ? 'UTTF - Turni in sede'
        : filter.scope === 'tasks'
          ? 'UTTF - Task'
          : 'UTTF - Planner';

    const body = buildPlannerIcs(events, {
      uidDomain: url.hostname || 'uttf.vercel.app',
      calendarName: label ? `${baseName} - ${label}` : baseName,
    });

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="uttf-planner.ics"',
        'Cache-Control': 'private, max-age=300',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    console.error('CALENDAR_FEED_ERROR');
    return new NextResponse('Feed non disponibile.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
