'use client'
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { SHIFT_MARKER, SHIFT_TITLE_PREFIX, isShiftTask } from '@/components/ShiftPlanner';

type CalendarEvent = {
  id?: string | number;
  title?: string;
  description?: string | null;
  deadline?: string | null;
  assigned_to?: string[] | null;
  status?: string | null;
  eventType: 'task' | 'activity';
};

type CalendarProfile = {
  id: string;
  account_color?: string | null;
};

const fallbackColors = ['#FF914D', '#00C2FF', '#00D084', '#FF3B5C', '#B877FF', '#FFD166'];

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [profiles, setProfiles] = useState<CalendarProfile[]>([]);

  const fetchEvents = useCallback(async () => {
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();
    
    // 1. Fetch delle Task dal Planner
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);
    
    // 2. Fetch delle Activities dal NewActivityForm
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);

    const { data: profileData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, account_color');
    
    if (tasksError) console.error("Tasks fetch error:", tasksError);
    if (activitiesError) console.error("Activities fetch error:", activitiesError);
    if (profilesError) console.error("Profiles fetch error:", profilesError);

    // Uniamo i due set di dati aggiungendo un flag "eventType" per distinguerli
    const formattedTasks = (tasks || []).map(t => ({ ...t, eventType: 'task' as const }));
    const formattedActivities = (activities || []).map(a => ({ ...a, eventType: 'activity' as const }));

    setEvents([...formattedTasks, ...formattedActivities]);
    if (profileData) setProfiles(profileData as CalendarProfile[]);
  }, [currentMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchEvents();
    // Listener per aggiornare in automatico quando Planner o ActivityForm salvano
    window.addEventListener('refreshCalendar', fetchEvents);
    return () => window.removeEventListener('refreshCalendar', fetchEvents);
  }, [fetchEvents]);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
  });

  const getFallbackColor = (seed?: string | number) => {
    const value = String(seed ?? '');
    const total = value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return fallbackColors[total % fallbackColors.length];
  };

  const getEventColors = (event: CalendarEvent) => {
    if (event.eventType === 'activity') return ['#FFFFFF'];

    const assignedIds = Array.isArray(event.assigned_to) ? event.assigned_to : [];
    if (assignedIds.length === 0) return ['#FF914D'];

    return assignedIds.map((id) => {
      const profile = profiles.find((item) => item.id === id);
      return profile?.account_color || getFallbackColor(id);
    });
  };

  const getEventTitle = (event: CalendarEvent) => {
    const title = event.title || '';
    if (!isShiftTask(event)) return title;

    return title.replace(`${SHIFT_TITLE_PREFIX} - `, 'Turno in sede - ');
  };

  const getEventDescription = (event: CalendarEvent) => {
    if (!event.description) return '';
    return event.description.replace(SHIFT_MARKER, '').trim();
  };

  const getEventLabel = (event: CalendarEvent) => {
    if (event.eventType === 'activity') return 'Attivita';
    return isShiftTask(event) ? 'Turno in sede' : 'Task';
  };

  const getEventShape = (event: CalendarEvent) => {
    if (event.eventType === 'activity') return 'activity';
    return isShiftTask(event) ? 'shift' : 'task';
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/20 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/30 p-4 md:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <CalendarIcon className="shrink-0 text-[#FF914D]" size={18} />
          <h2 className="truncate text-xs font-semibold capitalize tracking-tight text-white sm:text-sm">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-white transition-colors hover:bg-zinc-800"
            aria-label="Mese precedente"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-white transition-colors hover:bg-zinc-800"
            aria-label="Mese successivo"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-zinc-800/70 bg-black/20 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[8px] font-mono uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px]">
          <span className="font-bold text-[#FF914D]">Legenda</span>
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-[#FF914D]" />
            Turni
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-[#B877FF]" />
            Task
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            Attivita
          </span>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-600">
          I colori seguono l&apos;account assegnato.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-7 gap-px bg-zinc-800/50">
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
          <div key={d} className="text-center text-[7px] font-mono text-zinc-600 uppercase py-3 bg-black">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const dayEvents = events.filter(e => e.deadline && isSameDay(new Date(e.deadline), day));

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`relative min-h-[64px] min-w-0 cursor-pointer bg-zinc-950 p-1.5 transition-colors hover:bg-zinc-900/80 sm:min-h-[70px] sm:p-2
                ${!isCurrentMonth ? 'opacity-20' : ''}
                ${isSelected ? 'bg-zinc-900 ring-1 ring-inset ring-[#FF914D]/30' : ''}
              `}
            >
              <span className={`text-[9px] font-mono ${isSameDay(day, new Date()) ? 'text-[#FF914D] font-bold underline' : 'text-zinc-500'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 flex max-w-full flex-col gap-0.5 overflow-hidden">
                {dayEvents.map((e, idx) => {
                  const colors = getEventColors(e);
                  const shape = getEventShape(e);

                  if (shape === 'shift') {
                    return (
                      <div key={idx} className="flex h-1.5 w-full max-w-[54px] overflow-hidden rounded-full" title={getEventTitle(e)}>
                        {colors.slice(0, 4).map((color, colorIndex) => (
                          <span
                            key={`${color}-${colorIndex}`}
                            className="min-w-2 flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="flex min-h-2 items-center gap-1" title={getEventTitle(e)}>
                      {colors.slice(0, 4).map((color, colorIndex) => (
                        <span
                          key={`${color}-${colorIndex}`}
                          className={`${shape === 'activity' ? 'h-2 w-2 rounded-full' : 'h-2 w-2 rounded-[2px]'} shrink-0`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800/80 bg-zinc-950/40 p-4 md:p-5">
        <p className="text-[8px] font-mono text-zinc-600 uppercase mb-3">Giorno selezionato: {format(selectedDate, 'dd/MM')}</p>
        <div className="space-y-3">
          {events.filter(e => e.deadline && isSameDay(new Date(e.deadline), selectedDate)).map((e, idx) => {
            const colors = getEventColors(e);
            const shape = getEventShape(e);

            return (
              <div key={idx} className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`flex shrink-0 overflow-hidden ${shape === 'shift' ? 'h-4 w-1 flex-col rounded-full' : 'h-4 w-4 items-center justify-center gap-0.5'}`}>
                    {shape === 'shift'
                      ? colors.slice(0, 4).map((color, colorIndex) => (
                          <span
                            key={`${color}-${colorIndex}`}
                            className="min-h-1 flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))
                      : colors.slice(0, 1).map((color, colorIndex) => (
                          <span
                            key={`${color}-${colorIndex}`}
                            className={`${shape === 'activity' ? 'h-3 w-3 rounded-full' : 'h-3 w-3 rounded-[3px]'} block`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase italic ${e.eventType === 'activity' ? 'text-white' : 'text-zinc-300'}`}>
                      {getEventTitle(e)}
                    </span>
                    <span className="text-[7px] font-mono text-zinc-500 tracking-widest uppercase">
                      {getEventLabel(e)}
                    </span>
                  </div>
                </div>
                
                {/* RENDER DELLA DESCRIZIONE SE ESISTE */}
                {getEventDescription(e) && (
                  <div className="pl-4 ml-0.5 border-l border-white/10 mt-1">
                    <p className="text-[9px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {getEventDescription(e)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          {events.filter(e => e.deadline && isSameDay(new Date(e.deadline), selectedDate)).length === 0 && (
            <p className="text-[8px] font-mono text-zinc-800 italic uppercase text-center py-4">Nessun impegno per questo giorno</p>
          )}
        </div>
      </div>
    </div>
  );
}
