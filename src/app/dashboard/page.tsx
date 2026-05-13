'use client'

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import {
  Send,
  LogOut,
  Image as ImageIcon,
  Layers,
  Loader2,
  Sparkles,
  FileText,
  ArrowLeft,
  CalendarDays,
  Users,
  Download,
  RefreshCw,
  Star,
  BarChart3,
  Search,
  Mail,
  Phone,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Planner from '@/components/Planner';
import CalendarWidget from '@/components/CalendarWidget';
import NotesManager from '@/components/NotesManager';
import AccountSettings from '@/components/AccountSettings';
import ManagementBottomLogo from '@/components/ManagementBottomLogo';
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

/** Bottoni a altezza fissa: evita schiacciamenti con zoom / flex-wrap del browser */
const BTN_ROW =
  'inline-flex h-10 min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold leading-none transition-colors';
const BTN_PRIMARY = `${BTN_ROW} bg-[#FF914D] text-zinc-950 shadow-sm shadow-[#FF914D]/15 hover:opacity-95 disabled:pointer-events-none disabled:opacity-50`;
const BTN_SECONDARY = `${BTN_ROW} border border-zinc-700/80 bg-zinc-950/50 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800/50 disabled:pointer-events-none disabled:opacity-60`;
const BTN_DANGER = `${BTN_ROW} border border-red-500/35 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-50`;
const BTN_ICON = 'inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-900/50 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100';
const NAV_ITEM =
  'group flex min-h-[3.25rem] w-full max-w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors duration-150';

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
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  const fetchNewsletterSubscribersFromApi = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Sessione staff non valida.');
    }

    const response = await fetch('/api/newsletter', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const data = (await response.json().catch(() => ({}))) as {
      subscribers?: NewsletterSubscriber[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || 'Errore lettura newsletter.');
    }

    return data.subscribers ?? [];
  }, []);

  const fetchDashboardOverview = useCallback(async () => {
    setDashboardRefreshing(true);
    setNewsletterError(null);

    try {
      const newsletterSubscribersPromise = fetchNewsletterSubscribersFromApi().catch((error) => {
        setNewsletterError(getErrorMessage(error, 'Errore lettura newsletter.'));
        return [] as NewsletterSubscriber[];
      });

      const [publicationsRes, subscribersData, reviewsRes, tasksRes] = await Promise.all([
        supabase.from('publications').select('id', { count: 'exact' }),
        newsletterSubscribersPromise,
        supabase.from('reviews').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(4),
        supabase.from('tasks').select('id, status'),
      ]);

      const reviewsData = reviewsRes.data ?? [];
      const tasksData = tasksRes.data ?? [];
      const averageRating = reviewsData.length
        ? reviewsData.reduce((sum, review) => sum + Number(review.rating), 0) / reviewsData.length
        : 0;

      setRecentSubscribers(subscribersData.slice(0, 3) as NewsletterSubscriber[]);
      setRecentReviews(reviewsData.slice(0, 3) as Review[]);

      setOverview({
        publications: publicationsRes.count ?? publicationsRes.data?.length ?? 0,
        subscribers: subscribersData.length,
        reviews: reviewsRes.count ?? reviewsData.length,
        averageRating,
        tasksOpen: tasksData.filter((task) => task.status !== 'done').length,
        tasksTotal: tasksData.length,
      });
    } finally {
      setDashboardRefreshing(false);
    }
  }, [fetchNewsletterSubscribersFromApi]);

  const fetchSubscribers = useCallback(async () => {
    setNewsletterLoading(true);
    setNewsletterError(null);

    try {
      setSubscribers(await fetchNewsletterSubscribersFromApi());
    } catch (error) {
      setNewsletterError(getErrorMessage(error, 'Errore lettura newsletter.'));
    }

    setNewsletterLoading(false);
  }, [fetchNewsletterSubscribersFromApi]);

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setReviews(data as Review[]);
  }, []);

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
  }, [fetchDashboardOverview, router]);

  useEffect(() => {
    if (activeView === 'newsletter') fetchSubscribers();
    if (activeView === 'reviews') fetchReviews();
  }, [activeView, fetchReviews, fetchSubscribers]);

  const exportCSV = () => {
    const headers = ['Data', 'Nome', 'Email', 'Telefono'];
    const escapeCsvCell = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = subscribers.map((subscriber) => [
      new Date(subscriber.created_at).toLocaleDateString('it-IT'),
      subscriber.name,
      subscriber.email,
      subscriber.phone || '',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(';'))
      .join('\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iscritti_newsletter.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  async function handleDeleteReview(id: number) {
    if (!confirm('ELIMINARE_REVIEW?')) return;

    setDeletingReviewId(id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessione staff non valida.');
      }

      const response = await fetch(`/api/reviews?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Cancellazione recensione non riuscita.');
      }

      await Promise.all([fetchReviews(), fetchDashboardOverview()]);
    } catch (error) {
      alert(`ERRORE_CANCELLAZIONE_REVIEW: ${getErrorMessage(error)}`);
    } finally {
      setDeletingReviewId(null);
    }
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
    } catch (err) {
      alert('ERROR: ' + getErrorMessage(err, 'Upload non riuscito'));
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

  const managementSections = [
    {
      key: 'menu' as ActiveView,
      title: 'Panoramica',
      subtitle: 'Numeri, stato operativo e scorciatoie',
      icon: <BarChart3 size={18} />,
      action: () => setActiveView('menu'),
    },
    {
      key: 'publish' as ActiveView,
      title: 'Post',
      subtitle: 'Pubblica e gestisci i contenuti',
      icon: <Layers size={18} />,
      action: () => setActiveView('publish'),
    },
    {
      key: 'notes' as ActiveView,
      title: 'Note',
      subtitle: 'Gestisci rime, note e allegati',
      icon: <FileText size={18} />,
      action: () => setActiveView('notes'),
    },
    {
      key: 'newsletter' as ActiveView,
      title: 'Newsletter',
      subtitle: 'Database contatti',
      icon: <Users size={18} />,
      action: () => setActiveView('newsletter'),
    },
    {
      key: 'reviews' as ActiveView,
      title: 'Recensioni',
      subtitle: 'Controlla ed elimina le review',
      icon: <Star size={18} />,
      action: () => setActiveView('reviews'),
    },
    {
      key: 'planner' as ActiveView,
      title: 'Planner',
      subtitle: 'Gestione task',
      icon: <CalendarDays size={18} />,
      action: () => setActiveView('planner'),
    },
  ];
  const activeSection = managementSections.find((section) => section.key === activeView) ?? managementSections[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-12 py-10 shadow-xl shadow-black/40 backdrop-blur-md">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF914D]" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-200">Caricamento gestionale</p>
            <p className="mt-1 text-xs text-zinc-500">Sincronizzazione dati in corso…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-zinc-950 font-sans text-zinc-100 antialiased">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-15%,rgba(255,145,77,0.09),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_50%,rgba(255,145,77,0.04),transparent)]"
        aria-hidden
      />

      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/70">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
          <div className="min-w-0">
            <h1 className="text-base font-black italic tracking-tight uppercase md:text-lg">
              UTTF_<span className="text-[#FF914D]">STAFF</span>
            </h1>
            <span className="mt-0.5 block truncate text-xs text-zinc-500">{userEmail}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AccountSettings />
            <button
              type="button"
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className={BTN_ICON}
              aria-label="Esci"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden overflow-y-auto scroll-smooth p-4 pb-10 md:p-6 md:pb-12">
        <div className="mx-auto grid min-w-0 max-w-7xl gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <aside className="h-fit min-w-0 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-3 shadow-lg shadow-black/20 backdrop-blur-md lg:sticky lg:top-[4.5rem] lg:self-start">
            <div className="mb-3 rounded-xl border border-zinc-800/60 bg-zinc-950/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF914D]">Gestionale</p>
              <h2 className="mt-1 text-sm font-semibold text-white">Area operativa</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                Navigazione rapida tra i moduli.
              </p>
            </div>

            <nav className="grid gap-1">
              {managementSections.map((section) => {
                const isActive = activeView === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={section.action}
                    className={`${NAV_ITEM} ease-out ${
                      isActive
                        ? 'border-[#FF914D]/35 bg-[#FF914D]/12 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                        : 'border-transparent bg-transparent text-zinc-500 hover:border-zinc-800 hover:bg-zinc-800/40 hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
                        isActive
                          ? 'bg-[#FF914D]/20 text-[#FF914D]'
                          : 'bg-zinc-800/60 text-zinc-500 group-hover:text-[#FF914D]'
                      }`}
                    >
                      {section.icon}
                    </span>
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block text-xs font-semibold tracking-tight">{section.title}</span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] leading-snug ${
                          isActive ? 'text-zinc-400' : 'text-zinc-600 group-hover:text-zinc-500'
                        }`}
                      >
                        {section.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0 space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="min-w-0 space-y-6"
              >
            {activeView !== 'menu' ? (
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/25 p-5 shadow-sm shadow-black/20 backdrop-blur-md md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF914D]">Modulo</p>
                    <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white md:text-3xl">
                      {activeSection.title}
                    </h2>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setActiveView('menu')} className={BTN_SECONDARY}>
                      <ArrowLeft size={16} className="shrink-0" /> Panoramica
                    </button>
                    <button
                      type="button"
                      onClick={fetchDashboardOverview}
                      className={BTN_PRIMARY}
                      disabled={dashboardRefreshing}
                    >
                      <RefreshCw size={16} className={dashboardRefreshing ? 'shrink-0 animate-spin' : 'shrink-0'} />
                      Aggiorna
                    </button>
                    {activeView === 'newsletter' && (
                      <button type="button" onClick={exportCSV} className={BTN_PRIMARY}>
                        <Download size={16} className="shrink-0" /> Esporta CSV
                      </button>
                    )}
                  </div>
                </div>
                {activeView === 'newsletter' && (
                  <div className="relative mt-5">
                    <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      value={newsletterSearch}
                      onChange={(e) => setNewsletterSearch(e.target.value)}
                      placeholder="Cerca per nome, email o telefono"
                      className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-[#FF914D]/45"
                    />
                  </div>
                )}
              </div>
            ) : null}

        {activeView === 'menu' ? (
          <div className="flex flex-col gap-6">


            <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-sm shadow-black/25 backdrop-blur-md md:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF914D]">Panoramica</p>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
                      Dashboard operativa
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
                      Metriche sintetiche, attività recenti e accesso ai moduli.
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchDashboardOverview}
                    disabled={dashboardRefreshing}
                    className={BTN_SECONDARY}
                  >
                    <RefreshCw size={16} className={dashboardRefreshing ? 'shrink-0 animate-spin' : 'shrink-0'} />
                    Aggiorna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('publish');
                      setTitle('');
                      setDescription('');
                    }}
                    className={BTN_PRIMARY}
                  >
                    Nuovo post
                  </button>
                </div>
              </div>

              <div className="mt-8 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {(
                  [
                    { label: 'Post', value: overview.publications },
                    { label: 'Iscritti', value: overview.subscribers },
                    { label: 'Review', value: overview.reviews },
                    {
                      label: 'Media voto',
                      value: overview.averageRating ? overview.averageRating.toFixed(1) : '0.0',
                    },
                    {
                      label: 'Task aperti',
                      value: (
                        <>
                          {overview.tasksOpen}
                          <span className="ml-1.5 text-sm font-medium not-italic text-zinc-500">
                            / {overview.tasksTotal}
                          </span>
                        </>
                      ),
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className="min-w-0 rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-4 transition-all duration-150 ease-out hover:border-zinc-700/80 hover:bg-zinc-900/50 md:p-5"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white md:text-3xl">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0">
              <div className="flex flex-col gap-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-sm backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#FF914D]">Attività</p>
                    <h3 className="mt-1 text-base font-semibold tracking-tight text-white md:text-lg">
                      Ultimi movimenti
                    </h3>
                  </div>
                  <BarChart3 size={18} className="shrink-0 text-zinc-600" />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Iscritti newsletter</p>
                  {recentSubscribers.length > 0 ? (
                    recentSubscribers.map((subscriber) => (
                      <div
                        key={`${subscriber.email}-${subscriber.created_at}`}
                        className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3.5 transition-colors duration-150 hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold uppercase tracking-tight">{subscriber.name}</p>
                            <p className="truncate text-xs text-zinc-400">{subscriber.email}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-mono text-zinc-500">
                            {formatDate(subscriber.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 p-4 text-xs text-zinc-500">
                      Nessun iscritto recente
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Recensioni</p>
                  {recentReviews.length > 0 ? (
                    recentReviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-zinc-800/60 bg-zinc-950/40 p-3.5 transition-colors duration-150 hover:border-zinc-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-bold uppercase tracking-tight">{review.author_name}</p>
                          <span className="shrink-0 text-[10px] font-mono font-semibold text-[#FF914D]">
                            {Number(review.rating).toFixed(0)}/5
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/30 p-4 text-xs text-zinc-500">
                      Nessuna recensione recente
                    </div>
                  )}
                </div>
              </div>
            </section>

            <CalendarWidget />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {activeView === 'publish' && (
              <div className="grid min-w-0 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="min-w-0 space-y-6">
                  <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-sm backdrop-blur-md">
                    <h2 className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#FF914D]">
                      <Send size={14} aria-hidden /> Nuovo post
                    </h2>
                    <form onSubmit={handleCreatePost} className="space-y-4">
                      <input
                        type="text"
                        placeholder="Titolo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-[#FF914D]/45"
                      />
                      <div className="relative">
                        <textarea
                          placeholder="Descrizione…"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-[140px] w-full resize-none rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 pr-14 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-[#FF914D]/45"
                        />
                        <button
                          type="button"
                          onClick={handleAiEnhance}
                          disabled={isAiProcessing || !description}
                          className="absolute bottom-3 right-3 inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800 text-zinc-200 transition-colors hover:border-[#FF914D]/40 hover:bg-[#FF914D]/15 hover:text-[#FF914D] disabled:opacity-30"
                          aria-label="Migliora con AI"
                        >
                          {isAiProcessing ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                        </button>
                      </div>
                      <label className="group relative flex min-h-[12rem] max-h-[16rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-800/80 bg-zinc-950/30 transition-colors hover:border-zinc-700 hover:bg-zinc-900/30 sm:min-h-[14rem]">
                        {previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Object URLs from file inputs are not handled reliably by next/image.
                          <img src={previewUrl} alt="Anteprima file selezionato" className="h-full w-full object-cover opacity-70" />
                        ) : (
                          <ImageIcon size={28} className="text-zinc-600 transition-colors group-hover:text-zinc-400" />
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
                      <button type="submit" disabled={uploading} className={`${BTN_PRIMARY} w-full max-w-full`}>
                        {uploading ? (
                          <Loader2 className="mx-auto animate-spin" size={16} />
                        ) : (
                          'Pubblica'
                        )}
                      </button>
                    </form>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard/outputs')}
                  className="group flex min-h-[14rem] h-fit min-w-0 flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 text-left text-white shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-[#FF914D]/30 hover:bg-zinc-900/35"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FF914D]">
                    Archivio
                  </span>
                  <span className="text-3xl font-black uppercase italic leading-none tracking-tighter text-white">
                    Clicca per aprire l&apos;archivio post
                  </span>
                  <span className="text-sm font-semibold text-zinc-500 group-hover:text-zinc-300">
                    Controlla e gestisci i contenuti pubblicati
                  </span>
                </button>
              </div>
            )}

            {activeView === 'newsletter' && (
              <div className="space-y-6">
                {newsletterError && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                    {newsletterError}
                  </p>
                )}

                <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Totale</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{subscribers.length}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Con telefono
                      </p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{subscribersWithPhone}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        Ultimo ingresso
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDate(subscribers[0]?.created_at)}</p>
                    </div>
                </div>

                <div className="grid gap-3">
                  {newsletterLoading ? (
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
                      <span className="text-sm text-zinc-500">Caricamento contatti…</span>
                    </div>
                  ) : filteredSubscribers.length > 0 ? (
                    filteredSubscribers.map((subscriber, index) => (
                      <div
                        key={`${subscriber.email}-${subscriber.created_at}-${index}`}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-4 sm:grid sm:min-w-0 sm:grid-cols-2 sm:items-start sm:gap-x-4 sm:gap-y-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_auto] lg:items-center"
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
                        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                          #{index + 1}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
                      <span className="text-sm text-zinc-500">Nessun contatto con questo filtro.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'reviews' && (
              <div className="space-y-6">
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-6 shadow-sm backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[#FF914D]">Recensioni</h2>
                        <p className="mt-1 text-xs text-zinc-500">Ricerca e filtri per fascia di voto.</p>
                      </div>
                      <span className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {reviews.length} totali
                      </span>
                    </div>

                    <div className="relative">
                      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={reviewSearch}
                        onChange={(e) => setReviewSearch(e.target.value)}
                        placeholder="Cerca per autore o contenuto"
                        className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-[#FF914D]/45"
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
                          type="button"
                          key={value}
                          onClick={() => setReviewFilter(value as 'all' | 'high' | 'mid' | 'low')}
                          className={`inline-flex h-10 min-h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors ${
                            reviewFilter === value
                              ? 'bg-[#FF914D] text-zinc-950'
                              : 'border border-zinc-800/80 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Totale</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">{reviews.length}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Media</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">
                        {reviewsAverage ? reviewsAverage.toFixed(1) : '0.0'}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-5 shadow-sm">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Eccellenti</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-white">
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
                        className="flex flex-col gap-4 rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-5 md:flex-row md:items-start md:justify-between"
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
                          type="button"
                          onClick={() => handleDeleteReview(review.id)}
                          disabled={deletingReviewId === review.id}
                          className={`${BTN_DANGER} self-start`}
                        >
                          {deletingReviewId === review.id ? 'Elimino...' : 'Elimina'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-5">
                      <span className="text-sm text-zinc-500">Nessuna recensione con questo filtro.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'planner' && <Planner />}
            {activeView === 'notes' && <NotesManager />}
          </div>
        )}
              </motion.div>
            </AnimatePresence>

            <ManagementBottomLogo className="mt-12" />
          </section>
        </div>
      </main>
    </div>
  );
}
