import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  SHIFT_DESCRIPTION_MARKER,
  type PlannerFeedEvent,
} from './calendar-ics';
import { eventMatchesFilter, type FeedFilter } from './calendar-filter';

const TOKEN_CONTEXT = 'uttf-planner-calendar-v1';
const SHIFT_TITLE_PREFIX = 'TURNO IN SEDE';
const MIN_TOKEN_LENGTH = 24;
const DAY_MS = 86_400_000;
const RANGE_BEFORE_DAYS = 90;
const RANGE_AFTER_DAYS = 400;
const MAX_ROWS = 2000;

export function calendarAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Configurazione server non disponibile.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function calendarFeedToken() {
  const configured = process.env.CALENDAR_FEED_TOKEN?.trim();
  if (configured) {
    if (configured.length < MIN_TOKEN_LENGTH)
      throw new Error(
        `CALENDAR_FEED_TOKEN deve avere almeno ${MIN_TOKEN_LENGTH} caratteri.`,
      );
    return configured;
  }
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Configurazione server non disponibile.');
  return createHmac('sha256', secret)
    .update(TOKEN_CONTEXT)
    .digest('hex')
    .slice(0, 40);
}

export function isCalendarFeedToken(candidate: string | null | undefined) {
  if (!candidate) return false;
  const expected = Buffer.from(calendarFeedToken());
  const given = Buffer.from(candidate);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const day = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;

type TaskRow = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  deadline?: string | null;
  end_date?: string | null;
  time?: string | null;
  status?: string | null;
  assigned_to?: string[] | null;
};

type ActivityRow = {
  id: string | number;
  title?: string | null;
  description?: string | null;
  deadline?: string | null;
  status?: string | null;
  assigned_to?: string | null;
};

type GoogleEventRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  starts_at?: string | null;
};

export async function plannerFeedEvents(
  filter: FeedFilter = { scope: 'all', assignee: null },
): Promise<PlannerFeedEvent[]> {
  const client = calendarAdmin();
  const now = Date.now();
  const from = day(new Date(now - RANGE_BEFORE_DAYS * DAY_MS));
  const to = day(new Date(now + RANGE_AFTER_DAYS * DAY_MS));

  const [tasks, activities, google] = await Promise.all([
    client
      .from('tasks')
      .select('id, title, description, deadline, end_date, time, status, assigned_to')
      .gte('deadline', from)
      .lte('deadline', to)
      .limit(MAX_ROWS),
    client
      .from('activities')
      .select('id, title, description, deadline, status, assigned_to')
      .gte('deadline', from)
      .lte('deadline', to)
      .limit(MAX_ROWS),
    client
      .from('google_calendar_events')
      .select('id, title, description, starts_on, ends_on, starts_at')
      .gte('starts_on', from)
      .lte('starts_on', to)
      .limit(MAX_ROWS),
  ]);

  if (tasks.error) throw tasks.error;
  if (activities.error) throw activities.error;

  const events: PlannerFeedEvent[] = [];

  for (const task of (tasks.data || []) as TaskRow[]) {
    if (task.status === 'done' || !task.deadline) continue;
    const title = task.title || 'Attivita';
    const isShift =
      title.toUpperCase().startsWith(SHIFT_TITLE_PREFIX) ||
      Boolean(task.description?.includes(SHIFT_DESCRIPTION_MARKER));

    events.push({
      id: `task-${task.id}`,
      title,
      description: task.description,
      date: task.deadline,
      endDate: task.end_date,
      time: task.time,
      assignedTo: Array.isArray(task.assigned_to) ? task.assigned_to : null,
      kind: isShift ? 'shift' : 'task',
    });
  }

  for (const activity of (activities.data || []) as ActivityRow[]) {
    if (activity.status === 'done' || !activity.deadline) continue;
    events.push({
      id: `activity-${activity.id}`,
      title: activity.title || 'Attivita',
      description: activity.description,
      date: activity.deadline,
      assignedTo: activity.assigned_to ? [activity.assigned_to] : null,
      kind: 'activity',
    });
  }

  // La tabella può non esistere prima della migrazione: il feed resta valido.
  for (const row of (google.error ? [] : google.data || []) as GoogleEventRow[]) {
    if (!row.starts_on) continue;
    events.push({
      id: `google-${row.id}`,
      title: row.title || 'Evento Google',
      description: row.description,
      date: row.starts_on,
      endDate: row.ends_on,
      time: row.starts_at,
      kind: 'google',
    });
  }

  return events.filter((event) => eventMatchesFilter(event, filter));
}

/** Nome leggibile dell'account, usato nel titolo del calendario filtrato. */
export async function assigneeLabel(userId: string) {
  const { data } = await calendarAdmin()
    .from('profiles')
    .select('username, full_name, email')
    .eq('id', userId)
    .maybeSingle();

  const row = data as {
    username?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;
  if (!row) return null;
  return row.username || row.full_name || row.email?.split('@')[0] || null;
}
