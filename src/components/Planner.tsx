'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, CheckCircle2, Trash2, AlertTriangle, User, Plus, X
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function Planner({ isAdmin }: { isAdmin: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
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
      assigned_to: assignee.toLowerCase().trim() || null,
      priority,
      deadline: deadline || null,
      status: 'todo'
    }]);
    if (!error) { 
        setTitle(''); setAssignee(''); setDeadline(''); setShowForm(false); fetchTasks(); 
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
  }

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-orange-500 text-black font-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-xl">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#FF914D]" size={18} />
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">Main_Workspace</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[8px] font-mono text-zinc-500 uppercase bg-white/5 px-2 py-1 rounded">
            Active_Tasks: {tasks.filter(t => t.status !== 'done').length}
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`p-1.5 rounded transition-all flex items-center justify-center ${showForm ? 'bg-red-500/10 text-red-500' : 'bg-[#FF914D] text-black hover:scale-105'}`}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {showForm && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={addTask} 
          className="p-2 border-b border-white/5 bg-white/[0.02] flex flex-wrap gap-2"
        >
          <input type="text" placeholder="+ Add Task Name" value={title} onChange={(e) => setTitle(e.target.value)} required className="flex-1 min-w-[150px] bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] uppercase text-white outline-none" />
          <input type="text" placeholder="@Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-24 bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] uppercase text-white outline-none" />
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500">
            <option value="low">LOW</option>
            <option value="medium">MED</option>
            <option value="high">HIGH</option>
          </select>
          <button type="submit" disabled={isAdding} className="bg-[#FF914D] text-black px-4 py-2 rounded font-black uppercase text-[10px]">Inject</button>
        </motion.form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5">
              <th className="p-3 pl-6 border-r border-white/5 w-10">#</th>
              <th className="p-3 border-r border-white/5">Item_Task</th>
              <th className="p-3 border-r border-white/5 w-40 text-center">Owner</th>
              <th className="p-3 border-r border-white/5 w-32 text-center">Status</th>
              <th className="p-3 border-r border-white/5 w-32 text-center">Priority</th>
              <th className="p-3 w-32 text-center">Deadline</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => {
              const isOverdue = task.deadline && isBefore(new Date(task.deadline), today) && task.status !== 'done';
              return (
                <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                  <td className="p-3 pl-6 text-[8px] font-mono text-zinc-800 border-r border-white/5">{idx + 1}</td>
                  <td className="p-3 border-r border-white/5">
                    <span className={`text-[10px] font-bold uppercase italic ${task.status === 'done' ? 'line-through text-zinc-700' : 'text-zinc-200'}`}>{task.title}</span>
                  </td>
                  <td className="p-3 border-r border-white/5">
                    <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-zinc-500 uppercase">
                      <User size={10} /> {task.assigned_to ? task.assigned_to.split('@')[0] : '---'}
                    </div>
                  </td>
                  <td className="p-1 border-r border-white/5">
                    <button onClick={() => updateStatus(task.id, task.status)} className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase italic ${task.status === 'done' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>{task.status === 'done' ? 'STUCK_OFF' : 'WORKING'}</button>
                  </td>
                  <td className="p-1 border-r border-white/5">
                    <div className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase text-center italic ${getPriorityStyle(task.priority)}`}>{task.priority}</div>
                  </td>
                  <td className="p-3 text-center">
                    <div className={`text-[9px] font-mono flex items-center justify-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : 'text-zinc-600'}`}>
                      {task.deadline ? format(new Date(task.deadline), 'dd/MM/yy') : '--/--/--'}
                      {isOverdue && <AlertTriangle size={10} className="animate-pulse" />}
                    </div>
                  </td>
                  <td className="p-3">
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-zinc-800 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
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
