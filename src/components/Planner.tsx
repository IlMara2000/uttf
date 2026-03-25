'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, CheckCircle2, Plus, 
  Trash2, User, X 
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
// AGGIUNTO QUESTO IMPORT PER RISOLVERE L'ERRORE
import { motion } from 'framer-motion'; 

export default function Planner({ isAdmin }: { isAdmin: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const today = startOfDay(new Date());

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('status', { ascending: false }).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    const { error } = await supabase.from('tasks').insert([{ 
      title: title.toUpperCase(), 
      priority,
      deadline: deadline || null,
      status: 'todo'
    }]);
    if (!error) { 
      setTitle(''); setDeadline(''); setShowForm(false); fetchTasks(); 
      window.dispatchEvent(new Event('refreshCalendar'));
    }
    setIsAdding(false);
  }

  async function updateStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
  }

  async function deleteTask(id: string) {
    if(!confirm("ELIMINARE TASK?")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
    window.dispatchEvent(new Event('refreshCalendar'));
  }

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-3xl">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/20">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#FF914D]" size={18} />
          <h2 className="text-[10px] font-black uppercase italic tracking-widest text-white">Main_Workspace</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`p-2 rounded-xl transition-all ${showForm ? 'bg-red-500/10 text-red-500' : 'bg-[#FF914D] text-black hover:scale-105'}`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
          </button>
        )}
      </div>

      {showForm && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addTask} 
          className="p-6 border-b border-white/5 bg-white/[0.02] space-y-3"
        >
          <input 
            type="text" 
            placeholder="TASK_NAME" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required
            className="w-full bg-black border border-white/5 p-3 rounded-xl font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/50"
          />
          <div className="flex gap-2">
            <input 
              type="date" 
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)} 
              className="flex-1 bg-black border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-500" 
            />
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value)} 
              className="bg-black border border-white/5 p-3 rounded-xl font-mono text-[10px] text-zinc-500"
            >
              <option value="low">LOW</option>
              <option value="medium">MED</option>
              <option value="high">HIGH</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={isAdding} 
            className="w-full py-3 bg-white text-black rounded-xl font-black uppercase text-[10px] hover:bg-[#FF914D] transition-all"
          >
            {isAdding ? 'Injecting...' : 'Add_To_System'}
          </button>
        </motion.form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <tbody className="divide-y divide-white/5">
            {tasks.map((task) => {
              return (
                <tr key={task.id} className="group hover:bg-white/[0.01]">
                  <td className="p-4">
                    <button 
                      onClick={() => updateStatus(task.id, task.status)} 
                      className={`p-2 rounded-lg transition-colors ${task.status === 'done' ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-600 bg-zinc-900'}`}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </td>
                  <td className="p-4">
                    <p className={`text-[10px] font-bold uppercase italic ${task.status === 'done' ? 'line-through text-zinc-700' : 'text-zinc-200'}`}>
                      {task.title}
                    </p>
                    <p className="text-[7px] font-mono text-zinc-600 mt-1 uppercase">
                      {task.deadline ? format(new Date(task.deadline), 'dd MMM yy') : 'No_Deadline'}
                    </p>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteTask(task.id)} 
                      className="opacity-0 group-hover:opacity-100 text-zinc-800 hover:text-red-500 p-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
