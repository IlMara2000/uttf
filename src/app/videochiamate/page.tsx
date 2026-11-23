'use client';

import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Video } from 'lucide-react';
import VideoCallRoom from '@/components/VideoCallRoom';

function VideochiamateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [roomIdInput, setRoomIdInput] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const next = roomParam ? `/videochiamate?room=${roomParam}` : '/videochiamate';
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const { data: { user: u } } = await supabase.auth.getUser(session.access_token);
      if (!u) {
        router.replace('/login?next=/videochiamate');
        return;
      }
      if (alive) {
        setUser({ id: u.id, email: u.email ?? null });
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router, roomParam]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF914D]" />
      </div>
    );
  }

  if (roomParam) {
    return (
      <VideoCallRoom roomId={roomParam} userId={user!.id} userEmail={user!.email} />
    );
  }

  // lobby
  const createRoom = () => {
    const id = crypto.randomUUID().slice(0, 8);
    router.push(`/videochiamate?room=${id}`);
  };
  const joinRoom = () => {
    const id = roomIdInput.trim();
    if (!id) return;
    router.push(`/videochiamate?room=${id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Video size={28} className="text-[#FF914D]" />
          <h1 className="text-2xl font-bold">Videochiamate</h1>
        </div>
        <p className="text-sm text-zinc-400">Chiama lo staff direttamente dal browser, anche su mobile. Nessuna app da installare.</p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Nuova chiamata</h2>
          <button onClick={createRoom} className="w-full rounded-lg bg-[#FF914D] py-2 text-sm font-semibold text-black">Crea stanza e avvia</button>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <h2 className="text-sm font-semibold">Entra in una stanza</h2>
          <input
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Codice stanza"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <button onClick={joinRoom} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 text-sm font-semibold">Entra</button>
        </div>

        <a href="/dashboard" className="inline-block text-xs text-zinc-500 hover:text-zinc-300">← Torna al gestionale</a>
      </div>
    </div>
  );
}

export default function VideochiamatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100"><Loader2 className="h-8 w-8 animate-spin text-[#FF914D]" /></div>}>
      <VideochiamateInner />
    </Suspense>
  );
}
