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
  addDays, 
  eachDayOfInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();

    const { data } = await supabase
      .from('activities')
      .select('*')
      .gte('deadline', start)
      .lte('deadline', end);

    setEvents(data || []);
    setLoading(false);
  }

  // --- LOGICA GRIGLIA ---
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-8 border-b-2 border-[#FF914D] pb-6">
      <div className="flex flex-col">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">
          UTTF_<span className="text-[#FF914D]">CALENDAR</span>
        </h2>
        <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-[0.3em]">
          {format(currentMonth, 'MMMM yyyy', { locale: it })} // Operational_View
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={20} className="text-[#FF914D]" />
        </button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronRight size={20} className="text-[#FF914D]" />
        </button>
      </div>
    </div>
  );

  const renderDays = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black uppercase text-zinc-600 font-mono italic">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const formattedDate = format(day, 'd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDate);
          const dayEvents = events.filter(e => isSameDay(new Date(e.deadline), day));

          return (
            <div
              key={i}
              onClick={() => setSelectedDate(day)}
              className={`
                min-h-[100px] p-2 border border-white/5 transition-all cursor-pointer relative
                ${!isCurrentMonth ? 'opacity-20 grayscale' : 'hover:bg-white/5'}
                ${isSelected ? 'bg-[#FF914D]/10 border-[#FF914D]/40' : 'bg-zinc-950/40'}
              `}
            >
              <span className={`text-[10px] font-mono ${isSelected ? 'text-[#FF914D] font-black' : 'text-zinc-500'}`}>
                {formattedDate}
              </span>
              
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => (
                  <div key={idx} className="bg-[#FF914D] text-black text-[7px] font-black uppercase px-1 py-0.5 rounded-sm truncate italic">
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[7px] text-zinc-600 font-mono">+{dayEvents.length - 3} MORE</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 md:p-8 h-full bg-black/40 border-white/5">
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {/* DETTAGLIO GIORNO SELEZIONATO */}
      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-[#FF914D]"></div>
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Selected_Date</p>
              <h3 className="text-xl font-black uppercase italic text-white">
                {format(selectedDate, 'eeee d MMMM', { locale: it })}
              </h3>
            </div>
          </div>
          {isAdmin && (
             <button className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#FF914D] transition-colors">
               <Plus size={14} /> Add_Event
             </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).length > 0 ? (
            events.filter(e => isSameDay(new Date(e.deadline), selectedDate)).map((e, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group">
                <span className="text-[11px] font-black uppercase italic tracking-tight">{e.title}</span>
                <span className="text-[8px] font-mono text-zinc-600 uppercase">Task_Active</span>
              </div>
            ))
          ) : (
            <p className="text-zinc-800 font-black uppercase text-xs italic tracking-widest">No_Events_Scheduled_For_This_Date</p>
          )}
        </div>
      </div>
    </div>
  );
}
