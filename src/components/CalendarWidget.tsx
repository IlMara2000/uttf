'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';

export default function CalendarWidget({ isAdmin }: { isAdmin: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    // Listener per aggiornare se il Planner aggiunge task
    window.addEventListener('refreshCalendar', fetchEvents);
    return () => window.removeEventListener('refreshCalendar', fetchEvents);
  }, [currentMonth]);

  async function fetchEvents() {
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();
    const { data: tasks } = await supabase.from('tasks').select('*').gte('deadline', start).lte('deadline', end);
    setEvents(tasks || []);
  }

  const calendarDays = eachDayOfInterval({ 
    start: startOfWeek(startOfMonth(currentMonth)), 
    end: endOfWeek(endOfMonth(currentMonth)) 
  });

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-3xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#FF914D]" size={18} />
          <h2 className="text-[10px] font-black uppercase italic text-white tracking-widest">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronLeft size={16} /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/5">
        {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(d => (
          <div key={d} className="text-center text-[7px] font-mono text-zinc-600 uppercase py-3 bg-black">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const dayEvents = events.filter(e => isSameDay(new Date(e.deadline), day));

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`min-h-[70px] p-2 transition-all cursor-pointer relative bg-black hover:bg-zinc-900/50
                ${!isSameMonth(day, currentMonth) ? 'opacity-20' : ''}
                ${isSelected ? 'bg-zinc-900' : ''}
              `}
            >
              <span className={`text-[9px] font-mono ${isToday ? 'text-[#FF914D] font-bold underline' : 'text-zinc-500'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-1 flex flex-wrap gap-0.5">
                {dayEvents.map((e, idx) => (
                  <div key={idx} className={`w-1 h-1 rounded-full ${e.status === 'done' ? 'bg-emerald-500' : 'bg-[#FF914D]'}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER: FOCUS GIORNO SELEZIONATO */}
      <div className="p-6 bg-zinc-900/40 border-t border-white/5">
        <p className="text-[8px] font-mono text-zinc-600 uppercase mb-3">Focus_Day: {format(selectedDate, 'dd/MM')}</p>
        <div className="space-y-2">
          {events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).map((e, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[9px] font-black uppercase italic text-zinc-300">
              <div className={`w-1 h-3 ${e.status === 'done' ? 'bg-emerald-500' : 'bg-[#FF914D]'}`} />
              {e.title}
            </div>
          ))}
          {events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).length === 0 && (
            <p className="text-[8px] font-mono text-zinc-800 italic uppercase text-center py-2">No_Operations</p>
          )}
        </div>
      </div>
    </div>
  );
}
