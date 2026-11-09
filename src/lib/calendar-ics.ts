/**
 * iCalendar (RFC 5545) generation for the staff planner.
 * No server-only imports: the module stays unit-testable.
 */

export type PlannerEventKind = 'task' | 'shift' | 'activity' | 'google';

export type PlannerFeedEvent = {
  id: string;
  title: string;
  description?: string | null;
  /** Primo giorno dell'evento (YYYY-MM-DD, eventualmente con orario). */
  date: string;
  /** Ultimo giorno incluso (YYYY-MM-DD). */
  endDate?: string | null;
  /** Orario di inizio locale (HH:MM). */
  time?: string | null;
  kind: PlannerEventKind;
  /** Account assegnati: serve solo a filtrare il feed, non finisce nell'ICS. */
  assignedTo?: string[] | null;
};

export const SHIFT_DESCRIPTION_MARKER = '[[UTTF_SHIFT_SEDE]]';

const DAY_MS = 86_400_000;
const encoder = new TextEncoder();
const pad = (value: number) => String(value).padStart(2, '0');

const TIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Rome',
  'X-LIC-LOCATION:Europe/Rome',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/** Folds a content line to the 75-octet limit using continuation lines. */
export function foldIcsLine(line: string) {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

type CalendarDate = { year: number; month: number; day: number; utc: Date };

function parseDate(value?: string | null): CalendarDate | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  )
    return null;
  return { year, month, day, utc };
}

function parseTime(value?: string | null) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec((value || '').trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

const compact = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;

/** Local wall-clock stamp; the accompanying VTIMEZONE resolves Italy's DST. */
function wallClock(date: CalendarDate, minutesFromMidnight: number) {
  const dayOffset = Math.floor(minutesFromMidnight / 1440);
  const minutes = minutesFromMidnight - dayOffset * 1440;
  const shifted = new Date(date.utc.getTime() + dayOffset * DAY_MS);
  return `${compact(shifted)}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

function summaryFor(event: PlannerFeedEvent) {
  if (event.kind !== 'shift') return event.title;
  const label = event.title.replace(/^TURNO\s+IN\s+SEDE\s*[-–:]?\s*/i, '').trim();
  return label ? `Turno in sede - ${label}` : 'Turno in sede';
}

function descriptionFor(event: PlannerFeedEvent) {
  return (event.description || '').split(SHIFT_DESCRIPTION_MARKER).join('').trim();
}

function categoryFor(event: PlannerFeedEvent) {
  if (event.kind === 'shift') return 'Turno in sede';
  if (event.kind === 'activity') return 'Attivita';
  if (event.kind === 'google') return 'Google Calendar';
  return 'Task';
}

function uidFor(id: string, domain: string) {
  const safe = String(id).replace(/[^A-Za-z0-9._-]/g, '') || 'event';
  return `${safe}@${domain}`;
}

export function buildPlannerIcs(
  events: PlannerFeedEvent[],
  options: { now?: Date; calendarName?: string; uidDomain?: string } = {},
) {
  const now = options.now ?? new Date();
  const calendarName = options.calendarName ?? 'UTTF Planner';
  const domain =
    (options.uidDomain ?? 'uttf.vercel.app').replace(/[^A-Za-z0-9.-]/g, '') ||
    'uttf.vercel.app';
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate(),
  )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds(),
  )}Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Under The Tower Factory//Planner//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-CALDESC:Planner interno Under The Tower Factory',
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...TIMEZONE,
  ];

  const ordered = [...events].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );

  for (const event of ordered) {
    const start = parseDate(event.date);
    if (!start) continue;

    lines.push('BEGIN:VEVENT', `UID:${uidFor(event.id, domain)}`, `DTSTAMP:${stamp}`);

    const time = parseTime(event.time);
    if (time) {
      const startMinutes = time.hour * 60 + time.minute;
      lines.push(`DTSTART;TZID=Europe/Rome:${wallClock(start, startMinutes)}`);
      lines.push(`DTEND;TZID=Europe/Rome:${wallClock(start, startMinutes + 60)}`);
    } else {
      const last = parseDate(event.endDate);
      const end =
        last && last.utc.getTime() > start.utc.getTime() ? last.utc : start.utc;
      lines.push(`DTSTART;VALUE=DATE:${compact(start.utc)}`);
      lines.push(`DTEND;VALUE=DATE:${compact(new Date(end.getTime() + DAY_MS))}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(summaryFor(event))}`);
    const description = descriptionFor(event);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push(
      `CATEGORIES:${escapeIcsText(categoryFor(event))}`,
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}
