'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { 
  ClipboardList, Trash2, Plus, X
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type PlannerUser = {
  id: string;
  email: string;
  username?: string | null;
  full_name?: string | null;
};

type PlannerTask = {
  id: string;
  title: string;
  description?: string | null;
  assigned_to?: string[] | null;
  status: string;
  priority: string;
  deadline?: string | null;
  end_date?: string | null;
  time?: string | null;
};

export default function Planner() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [users, setUsers] = useState<PlannerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); 
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState(''); 
  const [endDate, setEndDate] = useState('');   
  const [time, setTime] = useState('');         
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => { fetchTasks(); fetchUsers(); }, []);

  const notifyCalendar = () => window.dispatchEvent(new Event('refreshCalendar'));
  const taskPageSize = 1000;

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('id, email, username, full_name'); 
    if (data) setUsers(data as PlannerUser[]);
  }

  async function fetchTasks() {
    setLoading(true);

    try {
      const allTasks: PlannerTask[] = [];
      let from = 0;

      while (true) {
        const to = from + taskPageSize - 1;
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        const page = (data || []) as PlannerTask[];
        allTasks.push(...page);

        if (page.length < taskPageSize) break;
        from += taskPageSize;
      }

      setTasks(allTasks);
    } catch (err) {
      alert("Errore caricamento task: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDescription(''); setAssigneeIds([]);
    setDeadline(''); setEndDate(''); setTime(''); setPriority('medium');
    setShowForm(false);
  };

  const handleEditClick = (task: PlannerTask) => {
    setEditingId(task.id);
    setTitle(task.title || '');
    setDescription(task.description || '');
    const val = task.assigned_to;
    setAssigneeIds(Array.isArray(val) ? val.filter((id: string) => id && id.length > 10) : []);
    setDeadline(task.deadline || '');
    setEndDate(task.end_date || '');
    setTime(task.time || '');
    setPriority(task.priority || 'medium');
    setShowForm(true);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || isAdding) return;
    setIsAdding(true);
    
    try {
      const cleanAssignees = assigneeIds.filter(id => id && id.length > 10);
      const payload = {
        title: title.toUpperCase(), 
        description: description,
        assigned_to: cleanAssignees.length > 0 ? cleanAssignees : null, 
        priority,
        deadline: deadline || null,
        end_date: endDate || null,
        time: time || null,
      };

      const { error } = editingId 
        ? await supabase.from('tasks').update(payload).eq('id', editingId)
        : await supabase.from('tasks').insert([{ ...payload, status: 'todo' }]);

      if (error) throw error;
      resetForm();
      await fetchTasks(); 
      notifyCalendar();
    } catch (err) {
      alert("Errore: " + getErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  }

  const toggleAssignee = (id: string) => {
    if (id === "") return setAssigneeIds([]);
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderAssignedNames = (ids: unknown) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 'CHIUNQUE';
    return users.filter(u => ids.includes(u.id)).map(u => u.username || u.email.split('@')[0]).join(', ');
  }

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-[#FF914D] text-black font-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const TaskRow = ({ task, index }: { task: PlannerTask, index: number }) => (
    <tr key={task.id} onClick={() => handleEditClick(task)} className="border-b border-white/5 hover:bg-white/[0.05] cursor-pointer">
      <td className="p-3 pl-6 text-[8px] font-mono text-zinc-800 border-r border-white/5">{index + 1}</td>
      <td className="p-3 border-r border-white/5"><div className={`text-[10px] font-bold uppercase italic ${task.status === 'done' ? 'line-through text-zinc-700' : 'text-zinc-200'}`}>{task.title}</div></td>
      <td className="p-3 border-r border-white/5 text-[9px] font-mono text-center uppercase tracking-tighter">{renderAssignedNames(task.assigned_to)}</td>
      <td className="border-r border-white/5 p-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateStatus(task.id, task.status);
          }}
          className={`inline-flex h-10 min-h-10 w-full max-w-full items-center justify-center rounded-md text-[10px] font-semibold uppercase transition-colors ${task.status === 'done' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}
        >
          {task.status === 'done' ? 'Fatto' : 'In corso'}
        </button>
      </td>
      <td className="p-1 border-r border-white/5"><div className={`w-full py-2.5 rounded-sm text-[9px] font-black text-center italic ${getPriorityStyle(task.priority)}`}>{task.priority}</div></td>
      <td className="p-3 text-center border-r border-white/5"><div className="text-[9px] font-mono text-zinc-400">{task.deadline ? format(new Date(task.deadline), 'dd/MM') : '--/--'}</div></td>
      <td className="p-3 text-center"><button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-red-500 hover:scale-110 transition-all"><Trash2 size={14} /></button></td>
    </tr>
  );

  async function updateStatus(id: string, s: string) {
    const newStatus = s === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    await fetchTasks();
    notifyCalendar();
  }

  async function deleteTask(id: string) {
    if(confirm("ELIMINARE?")) {
      await supabase.from('tasks').delete().eq('id', id);
      await fetchTasks();
      notifyCalendar();
    }
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/20 shadow-sm backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/30 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <ClipboardList className="shrink-0 text-[#FF914D]" size={18} />
          <h2 className="truncate text-sm font-semibold tracking-tight text-white">Planner</h2>
        </div>
        <button
          type="button"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className={`inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
            showForm ? 'border border-red-500/30 bg-red-500/10 text-red-400' : 'bg-[#FF914D] text-zinc-950 hover:opacity-95'
          }`}
          aria-label={showForm ? 'Chiudi form' : 'Nuova attività'}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleSubmit} className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4 overflow-hidden">
            <input type="text" placeholder="TITOLO ATTIVITÀ" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-black/40 border border-white/5 p-3 rounded-lg font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40" />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleAssignee("")} className={`px-3 py-1.5 rounded-full text-[9px] font-mono border transition-all ${assigneeIds.length === 0 ? 'bg-[#FF914D] text-black font-bold border-[#FF914D]' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>CHIUNQUE</button>
              {users.map(u => (
                <button key={u.id} type="button" onClick={() => toggleAssignee(u.id)} className={`px-3 py-1.5 rounded-full text-[9px] font-mono border transition-all ${assigneeIds.includes(u.id) ? 'bg-emerald-500 text-black font-bold border-emerald-500' : 'bg-zinc-900 border-white/10 text-zinc-400'}`}>{(u.username || u.email.split('@')[0]).toUpperCase()}</button>
              ))}
            </div>
            <textarea
              placeholder="DESCRIZIONE ATTIVITÀ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[96px] w-full resize-none rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] uppercase text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[#FF914D]/40"
            />
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-black/40 p-3 font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {['low', 'medium', 'high'].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-mono uppercase border transition-all ${
                    priority === value ? getPriorityStyle(value) : 'bg-zinc-900 border-white/10 text-zinc-400'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="inline-flex h-10 min-h-10 w-full max-w-full items-center justify-center rounded-lg bg-[#FF914D] text-sm font-semibold text-zinc-950 shadow-sm shadow-[#FF914D]/15 disabled:opacity-50"
            >
              {isAdding ? 'Salvataggio…' : editingId ? 'Aggiorna task' : 'Crea task'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead><tr className="text-[8px] font-mono text-zinc-600 uppercase border-b border-white/5 tracking-widest"><th className="p-3 pl-6 w-10">#</th><th className="p-3">Attività</th><th className="p-3 text-center">Referente</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Prio</th><th className="p-3 text-center">Data</th><th className="p-3 text-center w-10">Del</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="text-center py-8 font-mono text-[10px] text-[#FF914D] animate-pulse">SYNCING_DATA...</td></tr> : tasks.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-zinc-600 text-[10px] font-mono uppercase">Nessun task presente</td></tr> : tasks.map((task, idx) => <TaskRow key={task.id} task={task} index={idx} />)}</tbody>
        </table>
      </div>
    </div>
  );
}
