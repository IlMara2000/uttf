'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';

export default function CalendarWidget({ isAdmin }: { isAdmin: boolean }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  async function fetchEvents() {
    setLoading(true);
    // Recuperiamo sia dalle 'activities' che dai 'tasks' per avere tutto sott'occhio
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();

    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);

    // Uniamo i dati per una visione globale
    const combined = [
        ...(activities || []).map(a => ({ ...a, type: 'activity' })),
        ...(tasks || []).map(t => ({ ...t, type: 'task' }))
    ];

    setEvents(combined);
    setLoading(false);
  }

  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-xl">
      {/* HEADER CALENDARIO */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <CalendarIcon className="text-[#FF914D]" size={18} />
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 hover:bg-white/5 rounded border border-white/10 transition-all">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 hover:bg-white/5 rounded border border-white/10 transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* GRIGLIA GIORNI */}
        <div className="flex-1 p-4 border-r border-white/5">
          <div className="grid grid-cols-7 mb-2">
            {days.map((day) => (
              <div key={day} className="text-center text-[8px] font-mono text-zinc-600 uppercase py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
            {calendarDays.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const dayEvents = events.filter(e => isSameDay(new Date(e.deadline), day));

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[80px] p-1.5 transition-all cursor-pointer relative bg-black
                    ${!isCurrentMonth ? 'opacity-20' : 'hover:bg-zinc-900'}
                    ${isSelected ? 'ring-1 ring-inset ring-[#FF914D]' : ''}
                  `}
                >
                  <span className={`text-[9px] font-mono ${isSelected ? 'text-[#FF914D] font-bold' : 'text-zinc-500'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((event, idx) => (
                      <div 
                        key={idx} 
                        className={`text-[7px] px-1 py-0.5 rounded-sm truncate uppercase font-black italic
                          ${event.type === 'task' ? 'bg-[#FF914D] text-black' : 'bg-white/10 text-white'}
                        `}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[6px] text-zinc-600 font-mono pl-1">+{dayEvents.length - 2} MORE</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIDEBAR DETTAGLIO GIORNO SELEZIONATO */}
        <div className="w-full lg:w-72 p-6 bg-zinc-900/20">
          <div className="mb-6">
            <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Schedule_Focus</p>
            <h3 className="text-lg font-black uppercase italic text-white leading-none">
              {format(selectedDate, 'dd MMMM', { locale: it })}
            </h3>
          </div>

          <div className="space-y-3">
            {events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).length > 0 ? (
              events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).map((e, idx) => (
                <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-lg group hover:border-[#FF914D]/30 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${e.type === 'task' ? 'bg-[#FF914D]' : 'bg-zinc-500'}`} />
                    <span className="text-[10px] font-black uppercase italic text-zinc-200">{e.title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                     <span className="text-[8px] font-mono text-zinc-600 uppercase flex items-center gap-1">
                        <Clock size={10} /> {e.type.toUpperCase()}
                     </span>
                     {e.priority === 'high' && <AlertCircle size={10} className="text-red-500 animate-pulse" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-xl">
                <p className="text-[9px] font-mono text-zinc-800 uppercase italic">No_Operations_Found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}