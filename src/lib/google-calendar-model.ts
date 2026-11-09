/**
 * Pure mapping helpers for Google Calendar events.
 * No server-only imports: the module stays unit-testable.
 */

export type GoogleEventLike = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  eventType?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

export type ImportedGoogleEvent = {
  eventId: string;
  title: string;
  description: string | null;
  startsOn: string;
  endsOn: string | null;
  startsAt: string | null;
  htmlLink: string | null;
};

const DAY_MS = 86_400_000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (value: number) => String(value).padStart(2, '0');

const romeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Converts an ISO timestamp into the Italian wall-clock date and time. */
export function romeDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts: Record<string, string> = {};
  for (const part of romeFormatter.formatToParts(parsed)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }

  const { year, month, day, hour, minute } = parts;
  if (!year || !month || !day || !hour || !minute) return null;
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

/** Google's all-day end date is exclusive; the planner stores the last day. */
export function previousDay(value: string) {
  const match = DATE.exec(value);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) - DAY_MS,
  );
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

export function mapGoogleEvent(event: GoogleEventLike): ImportedGoogleEvent | null {
  if (!event.id) return null;
  if (event.status === 'cancelled') return null;
  if (event.eventType && event.eventType !== 'default') return null;

  const self = event.attendees?.find((attendee) => attendee.self);
  if (self?.responseStatus === 'declined') return null;

  const title = (event.summary || '').trim() || 'Evento Google';

  let startsOn: string;
  let endsOn: string | null;
  let startsAt: string | null = null;

  if (event.start?.date) {
    if (!DATE.test(event.start.date)) return null;
    startsOn = event.start.date;
    const allDayEnd = event.end?.date ? previousDay(event.end.date) : null;
    endsOn = allDayEnd && allDayEnd > startsOn ? allDayEnd : startsOn;
  } else if (event.start?.dateTime) {
    const start = romeDateTime(event.start.dateTime);
    if (!start) return null;
    startsOn = start.date;
    startsAt = start.time;
    endsOn = start.date;
    if (event.end?.dateTime) {
      const end = romeDateTime(event.end.dateTime);
      if (end && end.date > startsOn) endsOn = end.date;
    }
  } else {
    return null;
  }

  return {
    eventId: event.id,
    title,
    description: event.description?.trim() || null,
    startsOn,
    endsOn,
    startsAt,
    htmlLink: event.htmlLink || null,
  };
}
