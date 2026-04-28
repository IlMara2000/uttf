'use client'

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Send,
  LogOut,
  Image as ImageIcon,
  Layers,
  Loader2,
  ChevronRight,
  Sparkles,
  FileText,
  ArrowLeft,
  CalendarDays,
  Users,
  Download,
  HardDrive,
  RefreshCw,
  Star,
  BarChart3,
  Search,
  Mail,
  Phone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';
import NotesManager from '@/components/NotesManager';
import AccountSettings from '@/components/AccountSettings';
import type { Review } from '@/types/database';

type ActiveView = 'menu' | 'publish' | 'notes' | 'planner' | 'newsletter' | 'reviews';

type NewsletterSubscriber = {
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
};

type DashboardOverview = {
  publications: number;
  subscribers: number;
  reviews: number;
  averageRating: number;
  tasksOpen: number;
  tasksTotal: number;
};

const initialOverview: DashboardOverview = {
  publications: 0,
  subscribers: 0,
  reviews: 0,
  averageRating: 0,
  tasksOpen: 0,
  tasksTotal: 0,
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('menu');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>(initialOverview);
  const [recentSubscribers, setRecentSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [newsletterSearch, setNewsletterSearch] = useState('');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email ?? null);
      await fetchDashboardOverview();
      setLoading(false);
    }

    init();
  }, [router]);

  useEffect(() => {
    if (activeView === 'newsletter') fetchSubscribers();
    if (activeView === 'reviews') fetchReviews();
  }, [activeView]);

  async function fetchDashboardOverview() {
    setDashboardRefreshing(true);

    try {
      const [publicationsRes, subscribersRes, reviewsRes, tasksRes] = await Promise.all([
        supabase.from('publications').select('id', { count: 'exact' }),
        supabase
          .from('newsletter_subscribers')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(4),
        supabase.from('reviews').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(4),
        supabase.from('tasks').select('id, status'),
      ]);

      const subscribersData = subscribersRes.data ?? [];
      const reviewsData = reviewsRes.data ?? [];
      const tasksData = tasksRes.data ?? [];
      const averageRating = reviewsData.length
        ? reviewsData.reduce((sum, review) => sum + Number(review.rating), 0) / reviewsData.length
        : 0;

      setRecentSubscribers(subscribersData.slice(0, 3) as NewsletterSubscriber[]);
      setRecentReviews(reviewsData.slice(0, 3) as Review[]);

      setOverview({
        publications: publicationsRes.count ?? publicationsRes.data?.length ?? 0,
        subscribers: subscribersRes.count ?? subscribersData.length,
        reviews: reviewsRes.count ?? reviewsData.length,
        averageRating,
        tasksOpen: tasksData.filter((task) => task.status !== 'done').length,
        tasksTotal: tasksData.length,
      });
    } finally {
      setDashboardRefreshing(false);
    }
  }

  async function fetchSubscribers() {
    const { data } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setSubscribers(data as NewsletterSubscriber[]);
  }

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setReviews(data as Review[]);
  }

  const exportCSV = () => {
    const headers = ['Data', 'Nome', 'Email', 'Telefono'];
    const rows = subscribers.map((subscriber) => [
      new Date(subscriber.created_at).toLocaleDateString('it-IT'),
      subscriber.name,
      subscriber.email,
      subscriber.phone || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((entry) => entry.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iscritti_newsletter.csv';
    link.click();
  };

  async function handleDeleteReview(id: number) {
    if (!confirm('ELIMINARE_REVIEW?')) return;

    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      alert(`ERRORE_CANCELLAZIONE_REVIEW: ${error.message}`);
      return;
    }

    setReviews((current) => current.filter((review) => review.id !== id));
    await fetchDashboardOverview();
  }

  async function handleAiEnhance() {
    if (!description) return;

    setIsAiProcessing(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'Sei un assistente tecnico per UTTF. Trasforma i testi in descrizioni professionali, sintetiche e cyber-industrial.',
            },
            { role: 'user', content: `Ottimizza questa descrizione: ${description}` },
          ],
        }),
      });
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) setDescription(data.choices[0].message.content);
    } catch {
      alert('AI_OFFLINE');
    } finally {
      setIsAiProcessing(false);
    }
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) return alert('MISSING_DATA');

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('factory-assets')
        .upload(`publications/${fileName}`, file);
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from('factory-assets').getPublicUrl(`publications/${fileName}`);

      const { error: dbErr } = await supabase.from('publications').insert([
        {
          title: title.toUpperCase(),
          description,
          image_url: publicUrl,
        },
      ]);
      if (dbErr) throw dbErr;

      setTitle('');
      setDescription('');
      setFile(null);
      setPreviewUrl(null);
      await fetchDashboardOverview();
      alert('PUSH_SUCCESSFUL');
    } catch (err: any) {
      alert('ERROR: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  const filteredSubscribers = useMemo(() => {
    const query = newsletterSearch.trim().toLowerCase();
    if (!query) return subscribers;

    return subscribers.filter((subscriber) =>
      [subscriber.name, subscriber.email, subscriber.phone || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [newsletterSearch, subscribers]);

  const filteredReviews = useMemo(() => {
    const query = reviewSearch.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesSearch =
        !query ||
        [review.author_name, review.comment]
          .join(' ')
          .toLowerCase()
          .includes(query);

      const score = Number(review.rating);
      const matchesFilter =
        reviewFilter === 'all' ||
        (reviewFilter === 'high' && score >= 4) ||
        (reviewFilter === 'mid' && score >= 3 && score < 4) ||
        (reviewFilter === 'low' && score < 3);

      return matchesSearch && matchesFilter;
    });
  }, [reviewFilter, reviewSearch, reviews]);

  const subscribersWithPhone = subscribers.filter((subscriber) => subscriber.phone?.trim()).length;
  const reviewsAverage = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    : 0;

  const menuCards = [
    {
      key: 'publish',
      title: 'GESTIONE POST',
      subtitle: 'Pubblica e gestisci i contenuti',
      icon: <Layers size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => setActiveView('publish'),
    },
    {
      key: 'notes',
      title: 'NOTE & APPUNTI',
      subtitle: 'Gestisci rime, note e allegati',
      icon: <FileText size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => setActiveView('notes'),
    },
    {
      key: 'newsletter',
      title: 'ISCRITTI NEWSLETTER',
      subtitle: 'Database contatti',
      icon: <Users size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => setActiveView('newsletter'),
    },
    {
      key: 'reviews',
      title: 'RECENSIONI PUBBLICHE',
      subtitle: 'Controlla ed elimina le review',
      icon: <Star size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => setActiveView('reviews'),
    },
    {
      key: 'planner',
      title: 'PLANNER ATTIVITÀ',
      subtitle: 'Gestione task',
      icon: <CalendarDays size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => setActiveView('planner'),
    },
    {
      key: 'storage',
      title: 'FOTO & PLANIMETRIE',
      subtitle: 'Apri il vault media e asset',
      icon: <HardDrive size={24} className="text-zinc-500 group-hover:text-[#FF914D] transition-colors" />,
      action: () => router.push('/storage'),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-[#FF914D]">
        SYNCING_CORE...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col font-sans">
      <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">
            UTTF_<span className="text-[#FF914D]">HUB</span>
          </h1>
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
            {userEmail}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AccountSettings />
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            className="p-2 text-zinc-500 hover:text-[#FF914D] transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-10">
        {activeView === 'menu' ? (
          <div className="max-w-6xl mx-auto flex flex-col gap-8 mt-6">
            <CalendarWidget />

            <section className="glass-panel p-6 md:p-8 border-white/5 bg-zinc-900/20 rounded-[2rem]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#FF914D]">
                    Command Center
                  </p>
                  <div>
                    <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">
                      Dashboard operativa
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-2xl mt-3">
                      La parte pubblica ha un’identità forte e riconoscibile. Il gestionale era già coerente
                      nel mood, ma più debole nella gerarchia informativa. Qui il punto ora è dare visibilità
                      immediata a numeri, accessi rapidi e stato operativo.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setActiveView('publish');
                      setTitle('');
                      setDescription('');
                    }}
                    className="px-5 py-3 rounded-2xl bg-[#FF914D] text-black font-black uppercase text-[10px] tracking-[0.2em]"
                  >
                    Nuovo Post
                  </button>
                  <button
                    onClick={fetchDashboardOverview}
                    className="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.2em] inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} className={dashboardRefreshing ? 'animate-spin' : ''} />
                    Aggiorna
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mt-8">
                <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Post</p>
                  <p className="text-3xl font-black italic mt-2">{overview.publications}</p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Iscritti</p>
                  <p className="text-3xl font-black italic mt-2">{overview.subscribers}</p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Review</p>
                  <p className="text-3xl font-black italic mt-2">{overview.reviews}</p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Media voto</p>
                  <p className="text-3xl font-black italic mt-2">
                    {overview.averageRating ? overview.averageRating.toFixed(1) : '0.0'}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/5 bg-black/30 p-5">
                  <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-500">Task aperti</p>
                  <p className="text-3xl font-black italic mt-2">
                    {overview.tasksOpen}
                    <span className="text-sm text-zinc-500 ml-2">/ {overview.tasksTotal}</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="grid xl:grid-cols-[1.4fr_0.9fr] gap-6">
              <div className="grid md:grid-cols-2 gap-4">
                {menuCards.map((card) => (
                  <button
                    key={card.key}
                    onClick={card.action}
                    className="w-full group p-7 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-3xl flex items-center justify-between hover:border-[#FF914D]/30 transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-black/40 rounded-2xl flex items-center justify-center border border-white/5">
                        {card.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-black uppercase italic tracking-widest">{card.title}</h3>
                        <p className="text-[10px] font-mono text-zinc-600 uppercase mt-1.5">{card.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-zinc-700 group-hover:text-[#FF914D] transition-colors" />
                  </button>
                ))}
              </div>

              <div className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-[2rem] flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">
                      Flusso Recente
                    </p>
                    <h3 className="text-xl font-black uppercase italic tracking-tight mt-2">
                      Segnali operativi
                    </h3>
                  </div>
                  <BarChart3 size={18} className="text-zinc-600" />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                    Ultimi iscritti
                  </p>
                  {recentSubscribers.length > 0 ? (
                    recentSubscribers.map((subscriber) => (
                      <div
                        key={`${subscriber.email}-${subscriber.created_at}`}
                        className="rounded-2xl border border-white/5 bg-black/25 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase truncate">{subscriber.name}</p>
                            <p className="text-[11px] text-zinc-400 truncate">{subscriber.email}</p>
                          </div>
                          <span className="text-[10px] font-mono uppercase text-zinc-500">
                            {formatDate(subscriber.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-black/25 p-4 text-[10px] font-mono uppercase text-zinc-600">
                      Nessun iscritto recente
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                    Ultime review
                  </p>
                  {recentReviews.length > 0 ? (
                    recentReviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-white/5 bg-black/25 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black uppercase truncate">{review.author_name}</p>
                            <span className="text-[10px] font-mono uppercase text-[#FF914D]">
                            {Number(review.rating).toFixed(0)}/5
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-2 line-clamp-2">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/5 bg-black/25 p-4 text-[10px] font-mono uppercase text-zinc-600">
                      Nessuna recensione recente
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="flex justify-center mb-16 md:mb-20 px-4">
              <motion.img
                src="/icons/homelogo.png"
                alt="UTTF Home Logo"
                className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[600px] aspect-square object-contain rounded-full"
                animate={{
                  scale: [1, 1.02, 1],
                  opacity: [0.85, 1, 0.85],
                  boxShadow: [
                    '0 0 0px 0px rgba(255, 145, 77, 0)',
                    '0 0 60px 20px rgba(255, 145, 77, 0.15)',
                    '0 0 0px 0px rgba(255, 145, 77, 0)',
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <button
              onClick={() => setActiveView('menu')}
              className="self-start flex items-center gap-2 px-4 py-2.5 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl text-[10px] uppercase font-mono tracking-widest"
            >
              <ArrowLeft size={14} /> Torna Indietro
            </button>

            {activeView === 'publish' && (
              <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-6">
                <div className="space-y-6">
                  <button
                    onClick={() => router.push('/dashboard/outputs')}
                    className="w-full group p-6 bg-zinc-900/20 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-white/[0.02] transition-all hover:border-[#FF914D]/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-[#FF914D]/50 transition-colors">
                        <Layers size={20} className="text-zinc-500 group-hover:text-[#FF914D]" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-[10px] font-black uppercase italic tracking-widest">
                          POST PUBBLICATI
                        </h3>
                        <p className="text-[8px] font-mono text-zinc-600 uppercase mt-1">
                          Visualizza e cancella i post sul sito
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-zinc-800 group-hover:text-[#FF914D] group-hover:translate-x-1 transition-all"
                    />
                  </button>

                  <div className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-3xl">
                    <h2 className="text-[10px] font-black uppercase italic mb-6 text-[#FF914D] flex items-center gap-2">
                      <Send size={14} /> CREA POST DA PUBBLICARE
                    </h2>
                    <form onSubmit={handleCreatePost} className="space-y-4">
                      <input
                        type="text"
                        placeholder="TITOLO"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-[10px] uppercase text-white outline-none focus:border-[#FF914D]/40"
                      />
                      <div className="relative group">
                        <textarea
                          placeholder="DESCRIZIONE..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="w-full bg-black/40 border border-white/5 p-4 pr-12 rounded-xl font-mono text-[10px] min-h-[140px] text-white outline-none resize-none focus:border-[#FF914D]/40"
                        />
                        <button
                          type="button"
                          onClick={handleAiEnhance}
                          disabled={isAiProcessing || !description}
                          className="absolute right-3 bottom-3 p-2 bg-zinc-800 hover:bg-[#FF914D] text-white rounded-lg transition-all disabled:opacity-30"
                        >
                          {isAiProcessing ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>
                      </div>
                      <label className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.02] relative overflow-hidden group transition-all">
                        {previewUrl ? (
                          <img src={previewUrl} className="h-full w-full object-cover opacity-60" />
                        ) : (
                          <ImageIcon size={28} className="text-zinc-700 group-hover:text-zinc-400" />
                        )}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                              setFile(selectedFile);
                              setPreviewUrl(URL.createObjectURL(selectedFile));
                            }
                          }}
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={uploading}
                        className="w-full py-4 bg-white text-black text-[10px] font-black uppercase italic hover:bg-[#FF914D] transition-all disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="animate-spin mx-auto" size={16} />
                        ) : (
                          'PUSH_TO_FACTORY'
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <aside className="glass-panel p-6 border-white/5 bg-zinc-900/20 rounded-3xl flex flex-col gap-5 h-fit">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FF914D]">
                      Publishing Snapshot
                    </p>
                    <h3 className="text-xl font-black uppercase italic mt-2">Controllo rapido</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                      <p className="text-[9px] font-mono uppercase text-zinc-500">Caratteri titolo</p>
                      <p className="text-2xl font-black mt-2">{title.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/25 p-4">
                      <p className="text-[9px] font-mono uppercase text-zinc-500">Caratteri descr.</p>
                      <p className="text-2xl font-black mt-2">{description.length}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4 space-y-2">
                    <p className="text-[9px] font-mono uppercase text-zinc-500">Asset selezionato</p>
                    {file ? (
                      <>
                        <p className="text-sm font-black uppercase break-words">{file.name}</p>
                        <p className="text-[11px] text-zinc-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-zinc-500">Nessun file caricato.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/dashboard/outputs')}
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:border-[#FF914D]/40 transition-all"
                    >
                      Apri Archivio Post
                    </button>
                    <button
                      onClick={() => router.push('/storage')}
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] hover:border-[#FF914D]/40 transition-all"
                    >
                      Apri Foto & Planimetrie
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {activeView === 'newsletter' && (
              <div className="space-y-6">
                <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
                  <div className="bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h2 className="text-sm font-black uppercase italic text-[#FF914D]">
                          DATABASE NEWSLETTER
                        </h2>
                        <p className="text-[11px] text-zinc-500 mt-2">
                          Ricerca rapida, export e lettura immediata dei contatti raccolti.
                        </p>
                      </div>
                      <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-[#FF914D] text-black rounded-xl font-black text-[10px] uppercase w-fit"
                      >
                        <Download size={14} /> ESPORTA CSV
                      </button>
                    </div>

                    <div className="relative mt-5">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        value={newsletterSearch}
                        onChange={(e) => setNewsletterSearch(e.target.value)}
                        placeholder="Cerca per nome, email o telefono"
                        className="w-full bg-black/35 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-[#FF914D]/40"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Totale</p>
                      <p className="text-3xl font-black italic mt-2">{subscribers.length}</p>
                    </div>
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                        Con telefono
                      </p>
                      <p className="text-3xl font-black italic mt-2">{subscribersWithPhone}</p>
                    </div>
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                        Ultimo ingresso
                      </p>
                      <p className="text-lg font-black italic mt-3">
                        {formatDate(subscribers[0]?.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {filteredSubscribers.length > 0 ? (
                    filteredSubscribers.map((subscriber, index) => (
                      <div
                        key={`${subscriber.email}-${subscriber.created_at}-${index}`}
                        className="p-4 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl grid md:grid-cols-[1.4fr_1fr_0.8fr_0.6fr] gap-4 items-center"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-bold uppercase block truncate">{subscriber.name}</span>
                          <span className="text-xs font-mono text-zinc-500 block mt-1">
                            {formatDate(subscriber.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Mail size={14} className="text-zinc-600 shrink-0" />
                          <span className="text-xs text-zinc-300 truncate">{subscriber.email}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone size={14} className="text-zinc-600 shrink-0" />
                          <span className="text-xs text-[#FF914D] truncate">{subscriber.phone || '--'}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-zinc-600">
                          Lead {index + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl">
                      <span className="text-xs font-mono text-zinc-500 uppercase">
                        Nessun contatto trovato con questo filtro.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'reviews' && (
              <div className="space-y-6">
                <div className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4">
                  <div className="bg-zinc-900/20 backdrop-blur-md p-6 rounded-3xl border border-white/5 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-black uppercase italic text-[#FF914D]">
                          DATABASE RECENSIONI
                        </h2>
                        <p className="text-[11px] text-zinc-500 mt-2">
                          Moderazione staff con filtro per testo e fascia di voto.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                        {reviews.length} review
                      </span>
                    </div>

                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                      <input
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        placeholder="Cerca per autore o contenuto"
                        className="w-full bg-black/35 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-[#FF914D]/40"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        ['all', 'Tutte'],
                        ['high', 'Alte'],
                        ['mid', 'Medie'],
                        ['low', 'Basse'],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setReviewFilter(value as 'all' | 'high' | 'mid' | 'low')}
                          className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${
                            reviewFilter === value
                              ? 'bg-[#FF914D] text-black'
                              : 'bg-black/35 border border-white/10 text-zinc-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Totale</p>
                      <p className="text-3xl font-black italic mt-2">{reviews.length}</p>
                    </div>
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Media</p>
                      <p className="text-3xl font-black italic mt-2">
                        {reviewsAverage ? reviewsAverage.toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-white/5 bg-zinc-900/20 p-5">
                      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500">Eccellenti</p>
                      <p className="text-3xl font-black italic mt-2">
                        {reviews.filter((review) => Number(review.rating) >= 4.5).length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-5 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                      >
                        <div className="flex flex-col gap-2 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-bold uppercase">{review.author_name}</span>
                            <span className="text-xs font-mono text-[#FF914D]">
                              {Number(review.rating).toFixed(0)}/5
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-300 leading-relaxed">{review.comment}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="self-start px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          Elimina
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="p-5 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl">
                      <span className="text-xs font-mono text-zinc-500 uppercase">
                        Nessuna recensione presente con questo filtro.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'planner' && <Planner />}
            {activeView === 'notes' && <NotesManager />}
          </div>
        )}
      </main>
    </div>
  );
}
