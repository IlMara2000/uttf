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
  ChevronRight,
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
  const moduleCards = managementSections.filter((section) => section.key !== 'menu');
  const activeSection = managementSections.find((section) => section.key === activeView) ?? managementSections[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/50 px-10 py-9 shadow-[0_0_60px_-20px_rgba(255,145,77,0.25)]">
          <Loader2 className="h-9 w-9 animate-spin text-[#FF914D]" aria-hidden />
          <p className="text-sm text-zinc-400">Caricamento dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950/40 text-white flex flex-col font-sans antialiased">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-zinc-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/55">
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-black italic tracking-tight uppercase md:text-xl">
              UTTF_<span className="text-[#FF914D]">STAFF</span>
            </h1>
            <span className="mt-0.5 block truncate text-[10px] font-mono text-zinc-500">
              {userEmail}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AccountSettings />
            <button
              type="button"
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-zinc-400 transition-colors duration-200 hover:border-[#FF914D]/30 hover:text-[#FF914D]"
              aria-label="Esci"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scroll-smooth p-4 pb-10 md:p-6 md:pb-12 custom-scrollbar relative z-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8">
          <aside className="h-fit rounded-2xl border border-white/[0.06] bg-zinc-950/70 p-4 shadow-[0_0_48px_-18px_rgba(0,0,0,0.65)] backdrop-blur-xl lg:sticky lg:top-[5.25rem]">
            <div className="mb-4 rounded-2xl border border-[#FF914D]/15 bg-gradient-to-br from-[#FF914D]/10 to-transparent p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#FF914D]">
                Gestionale
              </p>
              <h2 className="mt-1.5 text-base font-black uppercase italic tracking-tight text-white">
                Area staff
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Accessi rapidi alle funzioni operative del sito.
              </p>
            </div>

            <nav className="grid gap-1.5">
              {managementSections.map((section) => {
                const isActive = activeView === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={section.action}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ease-out ${
                      isActive
                        ? 'border-[#FF914D]/45 bg-[#FF914D] text-black shadow-[0_0_28px_-8px_rgba(255,145,77,0.55)]'
                        : 'border-transparent bg-white/[0.02] text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-100'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                        isActive ? 'bg-black/15 text-black' : 'bg-black/40 text-zinc-500 group-hover:text-[#FF914D]'
                      }`}
                    >
                      {section.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide">
                        {section.title}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[10px] leading-snug ${
                          isActive ? 'text-black/55' : 'text-zinc-600 group-hover:text-zinc-500'
                        }`}
                      >
                        {section.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => router.push('/dashboard/outputs')}
                className="mt-1 flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-left text-zinc-400 transition-all duration-200 hover:border-[#FF914D]/25 hover:bg-white/[0.04] hover:text-zinc-100"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/40 text-zinc-500 transition-colors group-hover:text-[#FF914D]">
                  <Layers size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide">
                    Archivio post
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-zinc-600">
                    Contenuti già pubblicati
                  </span>
                </span>
              </button>
            </nav>
          </aside>

          <section className="min-w-0 space-y-6">
            {activeView !== 'menu' ? (
              <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/55 p-5 shadow-[0_0_40px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">
                      Modulo operativo
                    </p>
                    <h2 className="mt-2 text-2xl font-black uppercase italic tracking-tighter md:text-4xl">
                      {activeSection.title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
                      {activeSection.subtitle}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveView('menu')}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white transition-colors duration-200 hover:border-white/20"
                    >
                      <ArrowLeft size={14} /> Panoramica
                    </button>
                    <button
                      type="button"
                      onClick={fetchDashboardOverview}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#FF914D] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-[0_0_24px_-8px_rgba(255,145,77,0.6)] transition-opacity duration-200 hover:opacity-95 disabled:opacity-60"
                      disabled={dashboardRefreshing}
                    >
                      <RefreshCw size={14} className={dashboardRefreshing ? 'animate-spin' : ''} />
                      Aggiorna
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

        {activeView === 'menu' ? (
          <div className="flex flex-col gap-6">
            <CalendarWidget />

            <section className="glass-panel rounded-2xl border-white/[0.06] bg-zinc-900/25 p-6 shadow-[0_0_48px_-24px_rgba(0,0,0,0.55)] md:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF914D]">
                    Command center
                  </p>
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter md:text-4xl lg:text-5xl">
                      Dashboard operativa
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                      Stato del sito, attività, contatti e accesso rapido ai moduli principali.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={fetchDashboardOverview}
                    disabled={dashboardRefreshing}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/45 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white transition-colors duration-200 hover:border-white/25 disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={dashboardRefreshing ? 'animate-spin' : ''} />
                    Aggiorna
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('publish');
                      setTitle('');
                      setDescription('');
                    }}
                    className="rounded-xl bg-[#FF914D] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-black shadow-[0_0_24px_-8px_rgba(255,145,77,0.55)] transition-opacity duration-200 hover:opacity-95"
                  >
                    Nuovo post
                  </button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
                          <span className="ml-1.5 text-sm font-semibold not-italic text-zinc-500">
                            / {overview.tasksTotal}
                          </span>
                        </>
                      ),
                    },
                  ] as const
                ).map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/[0.06] bg-black/35 p-4 shadow-inner transition-transform duration-200 ease-out hover:-translate-y-0.5 md:p-5"
                  >
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{stat.label}</p>
                    <p className="mt-2 text-2xl font-black italic tabular-nums md:text-3xl">{stat.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {moduleCards.map((card) => (
                  <button
                    key={card.key}
                    type="button"
                    onClick={card.action}
                    className="group flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-6 text-left shadow-sm backdrop-blur-md transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[#FF914D]/35 hover:bg-zinc-900/45 md:p-7"
                  >
                    <div className="flex min-w-0 items-center gap-4 md:gap-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/50 text-zinc-400 transition-colors duration-200 group-hover:border-[#FF914D]/40 group-hover:text-[#FF914D] md:h-14 md:w-14 md:rounded-2xl">
                        {card.icon}
                      </div>
                      <div className="min-w-0 text-left">
                        <h3 className="text-sm font-black uppercase italic tracking-wide">{card.title}</h3>
                        <p className="mt-1 text-[11px] text-zinc-500">{card.subtitle}</p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className="shrink-0 text-zinc-600 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#FF914D]"
                    />
                  </button>
                ))}
              </div>

              <div className="glass-panel flex flex-col gap-6 rounded-2xl border-white/[0.06] bg-zinc-900/25 p-6 shadow-[0_0_40px_-20px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#FF914D]">
                      Flusso recente
                    </p>
                    <h3 className="mt-1.5 text-lg font-black uppercase italic tracking-tight text-white md:text-xl">
                      Segnali operativi
                    </h3>
                  </div>
                  <BarChart3 size={18} className="shrink-0 text-zinc-600" />
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Ultimi iscritti</p>
                  {recentSubscribers.length > 0 ? (
                    recentSubscribers.map((subscriber) => (
                      <div
                        key={`${subscriber.email}-${subscriber.created_at}`}
                        className="rounded-xl border border-white/[0.06] bg-black/35 p-4 transition-colors duration-200 hover:border-white/10"
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
                    <div className="rounded-xl border border-white/[0.06] bg-black/35 p-4 text-xs text-zinc-500">
                      Nessun iscritto recente
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Ultime review</p>
                  {recentReviews.length > 0 ? (
                    recentReviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-xl border border-white/[0.06] bg-black/35 p-4 transition-colors duration-200 hover:border-white/10"
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
                    <div className="rounded-xl border border-white/[0.06] bg-black/35 p-4 text-xs text-zinc-500">
                      Nessuna recensione recente
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
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
                          // eslint-disable-next-line @next/next/no-img-element -- Object URLs from file inputs are not handled reliably by next/image.
                          <img src={previewUrl} alt="Anteprima file selezionato" className="h-full w-full object-cover opacity-60" />
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={fetchSubscribers}
                          disabled={newsletterLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-white/10 text-white rounded-xl font-black text-[10px] uppercase w-fit disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={newsletterLoading ? 'animate-spin' : ''} /> AGGIORNA
                        </button>
                        <button
                          onClick={exportCSV}
                          className="flex items-center gap-2 px-4 py-2 bg-[#FF914D] text-black rounded-xl font-black text-[10px] uppercase w-fit"
                        >
                          <Download size={14} /> ESPORTA CSV
                        </button>
                      </div>
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

                    {newsletterError && (
                      <p className="mt-3 rounded-xl border border-[#FF914D]/20 bg-[#FF914D]/10 px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-[#FF914D]">
                        {newsletterError}
                      </p>
                    )}
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
                  {newsletterLoading ? (
                    <div className="p-5 bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl">
                      <span className="text-xs font-mono text-zinc-500 uppercase">
                        Caricamento contatti newsletter...
                      </span>
                    </div>
                  ) : filteredSubscribers.length > 0 ? (
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
                          disabled={deletingReviewId === review.id}
                          className="self-start px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          {deletingReviewId === review.id ? 'Elimino...' : 'Elimina'}
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

	        <ManagementBottomLogo className="mt-12" />
          </section>
        </div>
	      </main>
    </div>
  );
}
