'use client'
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ClipboardList, Trash2, AlertTriangle, User, Plus, X, Clock, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Planner() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false); // Stato per mostrare le task completate
  
  // Stati del Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); 
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState(''); // Usato come Data di Inizio
  const [endDate, setEndDate] = useState('');   // Data di Fine
  const [time, setTime] = useState('');         // Orario
  const [isAdding, setIsAdding] = useState(false);

  const today = startOfDay(new Date());

  useEffect(() => { 
    fetchTasks(); 
    fetchUsers(); 
  }, []);

  const notifyCalendar = () => {
    window.dispatchEvent(new Event('refreshCalendar'));
  };

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('id, email, username, full_name'); 
    if (error) console.error("Errore fetch users:", error);
    if (!error && data) setUsers(data);
  }

  async function fetchTasks() {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (error) console.error("Errore fetch tasks:", error);
    setTasks(data || []);
    setLoading(false);
  }

  // Dividiamo le task in attive e completate
  const activeTasks = tasks.filter(t => t.status === 'todo');
  const completedTasks = tasks.filter(t => t.status === 'done');

  // Reset del form
  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setAssigneeIds([]);
    setDeadline('');
    setEndDate('');
    setTime('');
    setPriority('medium');
    setShowForm(false);
  };

  // Funzione per caricare i dati nel form quando si clicca su una riga
  const handleEditClick = (task: any) => {
    setEditingId(task.id);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setAssigneeIds(task.assigned_to || []);
    setDeadline(task.deadline || '');
    setEndDate(task.end_date || '');
    setTime(task.time || '');
    setPriority(task.priority || 'medium');
    setShowForm(true);
  };

  // Gestisce sia Inserimento che Aggiornamento
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;
    
    setIsAdding(true);
    
    try {
      const finalAssignees = assigneeIds.includes("") || assigneeIds.length === 0 ? null : assigneeIds;

      const payload = {
        title: title.toUpperCase(), 
        description: description,
        assigned_to: finalAssignees, 
        priority,
        deadline: deadline || null,
        end_date: endDate || null,
        time: time || null,
      };

      if (editingId) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('tasks').insert([{ ...payload, status: 'todo' }]);
        if (error) throw error;
      }

      resetForm();
      fetchTasks(); 
      notifyCalendar();
      
    } catch (err: any) {
      console.error("Errore Supabase:", err);
      alert("ERRORE: Impossibile salvare il task. Verifica i permessi o le colonne del database.");
    } finally {
      setIsAdding(false);
    }
  }

  async function updateStatus(id: string, currentStatus: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTasks();
    notifyCalendar();
  }

  async function deleteTask(id: string, e: React.MouseEvent) {
    e.stopPropagation(); 
    if(!confirm("ELIMINARE TASK DEFINITIVAMENTE?")) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
    notifyCalendar();
  }

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-[#FF914D] text-black font-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    if (selectedOptions.includes("")) {
        setAssigneeIds([""]);
    } else {
        setAssigneeIds(selectedOptions.filter(val => val !== ""));
    }
  };

  const renderAssignedNames = (assignedIds: string[] | null) => {
    if (!assignedIds || assignedIds.length === 0) return 'CHIUNQUE';
    const assignedUsers = users.filter(u => assignedIds.includes(u.id));
    if (assignedUsers.length === 0) return 'CHIUNQUE';
    return assignedUsers.map(u => u.username || u.full_name || u.email.split('@')[0]).join(', ');
  }

  // Componente interno per il rendering delle righe della tabella per evitare duplicazioni di codice
  const TaskRow = ({ task, index }: { task: any, index: number }) => {
    const isOverdue = task.deadline && isBefore(new Date(task.deadline), today) && task.status !== 'done';
    return (
      <tr 
        key={task.id} 
        onClick={() => handleEditClick(task)}
        className="border-b border-white/5 hover:bg-white/[0.05] group cursor-pointer transition-colors"
        title="Clicca per modificare"
      >
        <td className="p-3 pl-6 text-[8px] font-mono text-zinc-800 border-r border-white/5">{index + 1}</td>
        
        <td className="p-3 border-r border-white/5 flex flex-col justify-center">
          <span className={`text-[10px] font-bold uppercase italic ${task.status === 'done' ? 'line-through text-zinc-700' : 'text-zinc-200'}`}>
            {task.title}
          </span>
          {task.description && (
            <span className="text-[8px] font-mono text-zinc-500 mt-0.5 truncate max-w-[200px]" title={task.description}>
              {task.description}
            </span>
          )}
        </td>

        <td className="p-3 border-r border-white/5">
          <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-zinc-500 uppercase truncate px-2">
            <User size={10} className="shrink-0" /> 
            <span className="truncate">{renderAssignedNames(task.assigned_to)}</span>
          </div>
        </td>
        
        <td className="p-1 border-r border-white/5">
          <button onClick={(e) => updateStatus(task.id, task.status, e)} className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase italic transition-all ${task.status === 'done' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
            {task.status === 'done' ? 'COMPLETATO' : 'IN CORSO'}
          </button>
        </td>
        
        <td className="p-1 border-r border-white/5">
          <div className={`w-full py-2.5 rounded-sm text-[9px] font-black uppercase text-center italic ${getPriorityStyle(task.priority)}`}>{task.priority}</div>
        </td>
        
        <td className="p-3 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <div className={`text-[9px] font-mono flex items-center justify-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
              {task.deadline ? format(new Date(task.deadline), 'dd/MM/yy') : '--/--/--'}
              {task.end_date && ` - ${format(new Date(task.end_date), 'dd/MM/yy')}`}
              {isOverdue && <AlertTriangle size={10} className="animate-pulse" />}
            </div>
            {task.time && (
              <div className="text-[8px] font-mono text-[#FF914D] flex items-center gap-1 bg-[#FF914D]/10 px-2 py-0.5 rounded-full">
                <Clock size={8} /> {task.time}
              </div>
            )}
          </div>
        </td>

        <td className="p-3 text-center">
          <button 
            onClick={(e) => deleteTask(task.id, e)} 
            className="text-red-500/80 hover:text-red-500 hover:scale-110 transition-all p-1 bg-red-500/10 rounded mx-auto block"
            title="Elimina"
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="glass-panel border-white/5 bg-zinc-950/40 overflow-hidden rounded-xl">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <ClipboardList className="text-[#FF914D]" size={18} />
          <h2 className="text-sm font-black uppercase italic tracking-widest text-white">Crea Attività:</h2>
        </div>
        <button 
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          className={`p-1.5 rounded transition-all ${showForm ? 'bg-red-500/10 text-red-500' : 'bg-[#FF914D] text-black hover:scale-105'}`}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit} 
            className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-3 relative overflow-hidden"
          >
            {editingId && (
               <span className="absolute top-2 right-4 text-[8px] font-bold text-[#FF914D] animate-pulse">MODIFICA IN CORSO...</span>
            )}

            <div className="flex flex-wrap gap-2 items-start mt-2">
              <input 
                type="text" 
                placeholder="+ NOME ATTIVITÀ" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                required 
                className="flex-1 min-w-[150px] bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] uppercase text-white outline-none h-[34px]" 
              />
              
              <div className="flex flex-col gap-1">
                 <span className="text-[8px] text-zinc-500 font-mono uppercase">Referenti</span>
                 <select 
                   multiple
                   value={assigneeIds.length === 0 ? [""] : assigneeIds} 
                   onChange={handleSelectChange}
                   className="w-40 bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-white outline-none min-h-[60px] scrollbar-thin"
                 >
                   <option value="">CHIUNQUE</option>
                   {users.map(u => (
                     <option key={u.id} value={u.id}>
                       {u.username || u.full_name || u.email.split('@')[0]}
                     </option>
                   ))}
                 </select>
              </div>

              {/* SEZIONE DATE E ORARIO */}
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-mono uppercase">Data Inizio</span>
                <input 
                  type="date" 
                  value={deadline} 
                  onChange={(e) => setDeadline(e.target.value)} 
                  className="bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500 h-[34px]" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-mono uppercase">Data Fine (Opz)</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500 h-[34px]" 
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-mono uppercase">Orario (Opz)</span>
                <input 
                  type="time" 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)} 
                  className="w-24 bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500 h-[34px]" 
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-zinc-500 font-mono uppercase">Priorità</span>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)} 
                  className="bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-zinc-500 h-[34px]"
                >
                  <option value="low">LOW</option>
                  <option value="medium">MED</option>
                  <option value="high">HIGH</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-1 mt-4">
                <button 
                  type="submit" 
                  disabled={isAdding} 
                  className={`px-4 py-2 rounded font-black uppercase text-[10px] disabled:opacity-50 h-[34px] transition-all ${editingId ? 'bg-emerald-500 text-black' : 'bg-[#FF914D] text-black'}`}
                >
                  {isAdding ? '...' : editingId ? 'AGGIORNA' : 'INVIA'}
                </button>
              </div>
            </div>

            <div className="w-full">
              <textarea 
                placeholder="DESCRIZIONE OPZIONALE E NOTE AGGIUNTIVE..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full bg-zinc-900/50 border border-white/5 p-2 rounded font-mono text-[10px] text-white outline-none min-h-[60px] resize-none mt-2"
              />
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.2em] border-b border-white/5">
              <th className="p-3 pl-6 border-r border-white/5 w-10">#</th>
              <th className="p-3 border-r border-white/5">Nome Task</th>
              <th className="p-3 border-r border-white/5 w-40 text-center">Referente</th>
              <th className="p-3 border-r border-white/5 w-32 text-center">Stato</th>
              <th className="p-3 border-r border-white/5 w-24 text-center">Priorità</th>
              <th className="p-3 border-r border-white/5 w-40 text-center">Date & Time</th>
              <th className="p-3 w-10 text-center">Delete</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-zinc-500 text-xs font-mono">Caricamento in corso...</td>
              </tr>
            ) : activeTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-zinc-600 text-xs font-mono italic">Nessuna attività in corso.</td>
              </tr>
            ) : (
              activeTasks.map((task, idx) => <TaskRow key={task.id} task={task} index={idx} />)
            )}
          </tbody>
        </table>
      </div>

      {/* SEZIONE ATTIVITÀ COMPLETATE */}
      {completedTasks.length > 0 && (
        <div className="border-t border-white/5">
          <button 
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full p-3 flex items-center justify-between bg-zinc-900/20 hover:bg-zinc-900/50 transition-colors text-zinc-400 group"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Attività Completate ({completedTasks.length})
              </span>
            </div>
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <AnimatePresence>
            {showCompleted && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto bg-black/30">
                  <table className="w-full text-left border-collapse min-w-[700px] opacity-75 hover:opacity-100 transition-opacity">
                    <tbody>
                      {completedTasks.map((task, idx) => <TaskRow key={task.id} task={task} index={idx} />)}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}