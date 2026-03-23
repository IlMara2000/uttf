'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, CheckCircle2, Loader2, Calendar as CalendarIcon, Trash2, AlertTriangle } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Planner({ isAdmin }: { isAdmin: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STATO FORM
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState(''); // Nuova integrazione
  const [isAdding, setIsAdding] = useState(false);

  const today = startOfDay(new Date());

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('status', { ascending: false }) // Todo prima dei Done
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    const { error } = await supabase
      .from('tasks')
      .insert([{ 
        title: title.toUpperCase(), 
        assigned_to: assignee.toLowerCase().trim() || null,
        priority: priority,
        deadline: deadline || null, // Salviamo la scadenza qui
        status: 'todo'
      }]);
    
    if (!error) {
      setTitle('');
      setAssignee('');
      setDeadline('');
      fetchTasks();
    }
    setIsAdding(false);
  }

  async function updateStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) fetchTasks();
  }

  async function deleteTask(id: string) {
    if(!confirm("ELIMINARE DEFINITIVAMENTE IL TASK?")) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  }

  return (
    <div className="glass-panel p-8 md:p-12 border-white/5 h-full bg-black/20">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <ClipboardList className="text-[#FF914D]" size={24} />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Factory_Planner</h2>
        </div>
        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          Active_Tasks: {tasks.filter(t => t.status !== 'done').length}
        </div>
      </div>

      {isAdmin && (
        <form onSubmit={addTask} className="mb-10 p-6 border border-white/10 bg-white/5 rounded-2xl space-y-4">
          <input 
            type="text" 
            placeholder="TASK_TITLE" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[10px] uppercase outline-none focus:border-[#FF914D] text-white"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input 
              type="email" 
              placeholder="ASSIGN_TO (EMAIL)" 
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[10px] uppercase outline-none focus:border-[#FF914D] text-white"
            />
            <input 
              type="date" 
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[10px] uppercase outline-none text-zinc-400 focus:text-white"
            />
            <select 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[10px] uppercase outline-none text-zinc-400"
            >
              <option value="low">Priority: Low</option>
              <option value="medium">Priority: Med</option>
              <option value="high">Priority: High</option>
            </select>
          </div>
          <button type="submit" disabled={isAdding} className="w-full py-4 bg-white text-black rounded-xl italic font-black uppercase text-[10px] hover:bg-[#FF914D] transition-colors flex items-center justify-center gap-2">
            {isAdding ? <Loader2 className="animate-spin" size={16} /> : 'Inject_Task_In_Queue'}
          </button>
        </form>
      )}

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {tasks.map((task) => {
          const isOverdue = task.deadline && isBefore(new Date(task.deadline), today) && task.status !== 'done';
          
          return (
            <div key={task.id} className={`p-5 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center group transition-all ${task.status === 'done' ? 'opacity-30' : 'hover:border-[#FF914D]/40'}`}>
              <div className="flex flex-col gap-2 text-left flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#FF914D]'}`} />
                  <h4 className={`text-sm font-black uppercase italic truncate ${task.status === 'done' ? 'line-through' : 'text-white'}`}>
                    {task.title}
                  </h4>
                  {isOverdue && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-red-500 animate-pulse">
                      <AlertTriangle size={10} /> EXPIRED
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <p className="text-[9px] text-zinc-600 font-mono uppercase">
                    {task.assigned_to ? `Op: ${task.assigned_to.split('@')[0]}` : 'Unassigned'}
                  </p>
                  {task.deadline && (
                    <div className={`flex items-center gap-1 text-[9px] font-mono uppercase ${isOverdue ? 'text-red-500' : 'text-zinc-500'}`}>
                      <CalendarIcon size={10} /> {format(new Date(task.deadline), 'dd/MM/yy')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => deleteTask(task.id)} className="p-2 text-zinc-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => updateStatus(task.id, task.status)} 
                  className={`p-3 rounded-xl transition-all ${task.status === 'done' ? 'bg-[#FF914D] text-black' : 'bg-white/10 text-zinc-500 hover:text-white hover:bg-white/20'}`}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !loading && (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl text-zinc-800 font-black uppercase italic tracking-widest">
            Queue_Empty // No_Pending_Tasks
          </div>
        )}
      </div>
    </div>
  );
}
