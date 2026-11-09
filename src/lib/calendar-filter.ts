import type { PlannerEventKind } from './calendar-ics';

export type FeedScope = 'all' | 'shifts' | 'tasks';

export type FeedFilter = {
  scope: FeedScope;
  assignee: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads the optional scope/assignee query params; null means an invalid request. */
export function parseFeedFilter(params: URLSearchParams): FeedFilter | null {
  const scope = (params.get('scope') || 'all').trim();
  if (scope !== 'all' && scope !== 'shifts' && scope !== 'tasks') return null;

  const assignee = (params.get('assignee') || '').trim();
  if (assignee && !UUID.test(assignee)) return null;

  return { scope, assignee: assignee || null };
}

export function eventMatchesFilter(
  event: { kind: PlannerEventKind; assignedTo?: string[] | null },
  filter: FeedFilter,
) {
  if (filter.scope === 'shifts' && event.kind !== 'shift') return false;
  if (filter.scope === 'tasks' && event.kind !== 'task') return false;

  if (filter.assignee) {
    if (event.kind === 'google') return false;
    if (!event.assignedTo?.includes(filter.assignee)) return false;
  }

  return true;
}
