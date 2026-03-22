'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';

export default function Planner({ isAdmin }: { isAdmin: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
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
        status: 'todo'
      }]);
    
    if (!error) {
      setTitle('');
      setAssignee('');
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

  return (
    <div className="glass-panel p-8 md:p-12 border-white/5 h-full">
      <div className="flex items-center gap-4 mb-10">
        <ClipboardList className="text-orange-600" size={24} />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Factory_Tasks</h2>
      </div>

      {isAdmin && (
        <form onSubmit={addTask} className="mb-10 p-6 border border-white/5 bg-white/5 rounded-2xl space-y-4">
          <input 
            type="text" 
            placeholder="TASK_TITLE" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/10 p-3 rounded-lg font-mono text-[10px] uppercase outline-none focus:border-orange-600"
          />
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="ASSIGN_TO (EMAIL)" 
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 p-3 rounded-lg font-mono text-[10px] uppercase outline-none focus:border-orange-600"
            />
            <select 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-black/40 border border-white/10 p-3 rounded-lg font-mono text-[10px] uppercase outline-none text-zinc-400"
            >
              <option value="low">Low</option>
              <option value="medium">Med</option>
              <option value="high">High</option>
            </select>
          </div>
          <button type="submit" disabled={isAdding} className="btn-urban w-full py-3 text-xs justify-center">
            {isAdding ? <Loader2 className="animate-spin" size={16} /> : 'ADD_TASK_TO_QUEUE'}
          </button>
        </form>
      )}

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {tasks.map((task) => (
          <div key={task.id} className={`p-4 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center group transition-all ${task.status === 'done' ? 'opacity-40' : 'hover:border-orange-600/30'}`}>
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-orange-600'}`} />
                <h4 className={`text-sm font-bold uppercase ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</h4>
              </div>
              <p className="text-[9px] text-zinc-500 font-mono uppercase truncate max-w-[150px]">
                {task.assigned_to ? `ID: ${task.assigned_to.split('@')[0]}` : 'UNASSIGNED'}
              </p>
            </div>
            <button onClick={() => updateStatus(task.id, task.status)} className={`p-2 rounded-lg transition-all ${task.status === 'done' ? 'bg-orange-600 text-black' : 'bg-white/5 text-zinc-700 hover:text-white'}`}>
              <CheckCircle2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}