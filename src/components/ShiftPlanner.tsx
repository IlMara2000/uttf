'use client'

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarPlus, Clock, Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

export const SHIFT_MARKER = '[[UTTF_SHIFT_SEDE]]';
export const SHIFT_TITLE_PREFIX = 'TURNO IN SEDE';

type ShiftUser = {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
  account_color?: string | null;
};

type ShiftTask = {
  id: string;
  title: string;
  description?: string | null;
  assigned_to?: string[] | null;
  deadline?: string | null;
  time?: string | null;
};

const getTodayInputValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getDayKey = (value?: string | null) => (value ? value.slice(0, 10) : '');

const formatDay = (value?: string | null) => {
  if (!value) return '--/--';
  return format(new Date(`${getDayKey(value)}T12:00:00`), 'dd MMM', { locale: it });
};

const getUserLabel = (user?: ShiftUser) => {
  if (!user) return 'Operatore';
  return user.username || user.full_name || user.email.split('@')[0];
};

export const isShiftTask = (task: { title?: string | null; description?: string | null }) => (
  Boolean(task.title?.startsWith(SHIFT_TITLE_PREFIX)) || Boolean(task.description?.includes(SHIFT_MARKER))
);

export default function ShiftPlanner() {
  const [users, setUsers] = useState<ShiftUser[]>([]);
  const [shifts, setShifts] = useState<ShiftTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  useEffect(() => {
    void fetchUsers();
    void fetchShifts();
  }, []);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, username, full_name, account_color')
      .order('username', { ascending: true });

    if (error) {
      console.error('Profiles fetch error:', error);
      return;
    }

    setUsers((data || []) as ShiftUser[]);
  }

  async function fetchShifts() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .ilike('title', `${SHIFT_TITLE_PREFIX}%`)
        .order('deadline', { ascending: true })
        .limit(300);

      if (error) throw error;
      setShifts(((data || []) as ShiftTask[]).filter(isShiftTask));
    } catch (err) {
      alert('Errore caricamento turni: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const notifyCalendar = () => window.dispatchEvent(new Event('refreshCalendar'));

  const addSelectedDate = () => {
    if (!selectedDate) return;
    setSelectedDates((current) => (
      current.includes(selectedDate) ? current : [...current, selectedDate].sort()
    ));
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  async function saveShifts() {
    if (saving) return;

    if (selectedDates.length === 0) {
      alert('Seleziona almeno un giorno.');
      return;
    }

    if (selectedUserIds.length === 0) {
      alert('Seleziona almeno un account.');
      return;
    }

    setSaving(true);

    try {
      const existing = new Set(
        shifts.flatMap((shift) => {
          const day = getDayKey(shift.deadline);
          const assigned = Array.isArray(shift.assigned_to) ? shift.assigned_to : [];
          return assigned.map((id) => `${day}|${id}`);
        })
      );

      const rows = selectedDates.flatMap((date) => (
        selectedUserIds
          .filter((userId) => !existing.has(`${date}|${userId}`))
          .map((userId) => {
            const user = userMap.get(userId);
            const label = getUserLabel(user).toUpperCase();

            return {
              title: `${SHIFT_TITLE_PREFIX} - ${label}`,
              description: note.trim() ? `${SHIFT_MARKER}\n${note.trim()}` : SHIFT_MARKER,
              assigned_to: [userId],
              priority: 'medium',
              status: 'todo',
              deadline: date,
              end_date: null,
              time: time || null,
            };
          })
      ));

      if (rows.length === 0) {
        alert('Questi turni sono gia stati inseriti.');
        return;
      }

      const { error } = await supabase.from('tasks').insert(rows);
      if (error) throw error;

      setSelectedDates([]);
      setSelectedUserIds([]);
      setTime('');
      setNote('');
      await fetchShifts();
      notifyCalendar();
    } catch (err) {
      alert('Errore salvataggio turni: ' + getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteShift(id: string) {
    if (!confirm('Eliminare questo turno?')) return;

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      alert('Errore eliminazione turno: ' + getErrorMessage(error));
      return;
    }

    await fetchShifts();
    notifyCalendar();
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/20 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 bg-zinc-950/30 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <CalendarPlus className="shrink-0 text-[#FF914D]" size={18} />
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">Calendario</p>
            <h2 className="truncate text-sm font-semibold tracking-tight text-white">Turni in Sede</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={saveShifts}
          disabled={saving}
          className="inline-flex h-10 min-h-10 items-center justify-center rounded-lg bg-[#FF914D] px-4 text-sm font-semibold text-zinc-950 shadow-sm shadow-[#FF914D]/15 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva turni'}
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-[1.1fr_1fr] md:p-5">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="h-11 rounded-lg border border-white/5 bg-black/40 px-3 font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40"
            />
            <button
              type="button"
              onClick={addSelectedDate}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-zinc-950/50 px-4 text-xs font-semibold text-zinc-200 transition-colors hover:border-[#FF914D]/40"
            >
              <Plus size={16} />
              Aggiungi giorno
            </button>
          </div>

          <div className="flex min-h-11 flex-wrap gap-2 rounded-xl border border-white/5 bg-black/25 p-2">
            {selectedDates.length === 0 ? (
              <span className="px-2 py-1.5 text-[10px] font-mono uppercase text-zinc-600">Nessun giorno selezionato</span>
            ) : (
              selectedDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDates((current) => current.filter((item) => item !== date))}
                  className="rounded-full border border-[#FF914D]/30 bg-[#FF914D]/10 px-3 py-1.5 text-[10px] font-semibold uppercase text-[#FF914D]"
                >
                  {formatDay(date)}
                </button>
              ))
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <label className="relative block">
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/5 bg-black/40 px-3 pr-10 font-mono text-[10px] uppercase text-white outline-none [color-scheme:dark] focus:border-[#FF914D]/40"
                aria-label="Orario turno"
              />
              <Clock
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#FF914D]"
                aria-hidden="true"
              />
            </label>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nota turno opzionale"
              className="h-11 rounded-lg border border-white/5 bg-black/40 px-3 font-mono text-[10px] uppercase text-white outline-none placeholder:text-zinc-600 focus:border-[#FF914D]/40"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">
            <Users size={14} className="text-[#FF914D]" />
            Account e colori
          </div>
          <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-white/5 bg-black/25 p-2">
            {users.map((user) => {
              const color = user.account_color || '#FF914D';
              const selected = selectedUserIds.includes(user.id);

              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-semibold uppercase transition-all ${
                    selected ? 'border-[#FF914D]/50 bg-white/10 text-white' : 'border-white/10 bg-zinc-950/50 text-zinc-400'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {getUserLabel(user)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 bg-black/20 p-4 md:p-5">
        <p className="mb-3 text-[9px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">Turni inseriti</p>
        <div className="grid gap-2 md:grid-cols-2">
          {loading ? (
            <p className="text-[10px] font-mono uppercase text-zinc-600">Caricamento...</p>
          ) : shifts.length === 0 ? (
            <p className="text-[10px] font-mono uppercase text-zinc-600">Nessun turno in sede</p>
          ) : (
            shifts.slice(0, 12).map((shift) => {
              const userId = Array.isArray(shift.assigned_to) ? shift.assigned_to[0] : undefined;
              const user = userId ? userMap.get(userId) : undefined;
              const color = user?.account_color || '#FF914D';

              return (
                <div key={shift.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/35 p-3">
                  <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-black uppercase italic text-zinc-200">{getUserLabel(user)}</p>
                    <p className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">
                      {formatDay(shift.deadline)}{shift.time ? ` - ${shift.time}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteShift(shift.id)}
                    className="shrink-0 text-red-500 transition-transform hover:scale-110"
                    aria-label="Elimina turno"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
