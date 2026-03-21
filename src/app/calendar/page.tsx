import { supabase } from '@/lib/supabase'
import { Activity } from '@/types/database'
import { format, isAfter, isBefore, startOfDay } from 'date-fns'
import { it } from 'date-fns/locale'

export const revalidate = 0

export default async function CalendarPage() {
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .not('deadline', 'is', null) // Prendiamo solo quelle con una data
    .order('deadline', { ascending: true })

  const today = startOfDay(new Date())

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <header className="mb-12 border-b-4 border-orange-500 pb-6">
        <h1 className="text-6xl font-black uppercase tracking-tighter">
          UTTF <span className="text-orange-500">DEADLINES</span>
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-2 uppercase tracking-widest text-xs">Scheduler // Timeline_Control</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* SCADENZE IMMINENTI */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-orange-500 mb-6 flex items-center">
            <span className="w-2 h-2 bg-orange-500 mr-3 animate-ping"></span>
            Critical_Upcoming
          </h2>
          <div className="space-y-4">
            {activities?.filter(a => isAfter(new Date(a.deadline!), today)).map((activity: Activity) => (
              <div key={activity.id} className="p-4 border-l-4 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">
                  {format(new Date(activity.deadline!), "eeee d MMMM", { locale: it })}
                </p>
                <h3 className="text-lg font-bold uppercase">{activity.title}</h3>
                <span className="text-[8px] bg-orange-500 text-black px-1 font-bold italic">STATUS: {activity.status}</span>
              </div>
            ))}
          </div>
        </section>

        {/* STORICO / COMPLETATI */}
        <section className="opacity-50">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600 mb-6">
            Past_Activities
          </h2>
          <div className="space-y-4 text-zinc-500">
             {activities?.filter(a => isBefore(new Date(a.deadline!), today)).map((activity: Activity) => (
              <div key={activity.id} className="p-4 border-l-4 border-zinc-900 bg-zinc-950">
                <p className="text-[10px] font-mono uppercase">
                   {format(new Date(activity.deadline!), "d MMM yyyy", { locale: it })}
                </p>
                <h3 className="text-sm font-bold uppercase line-through">{activity.title}</h3>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}