'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MessageSquare,
  Settings,
  UserPlus,
  PhoneOff,
  X,
  Copy,
  Check,
} from 'lucide-react';

type Peer = {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
};

type ChatMsg = { id: string; from: string; name: string; text: string; ts: number };

type Props = {
  roomId: string;
  userId: string;
  userEmail: string | null;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallRoom({ roomId, userId, userEmail }: Props) {
  const myName0 = userEmail ? userEmail.split('@')[0] : 'Utente';
  const [displayName, setDisplayName] = useState(myName0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [devices, setDevices] = useState<{ audio: MediaDeviceInfo[]; video: MediaDeviceInfo[] }>({ audio: [], video: [] });
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const [micVolume, setMicVolume] = useState(1);
  const [callVolume, setCallVolume] = useState(1);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('Connessione…');
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rawAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedMimeRef = useRef<string>('video/webm');
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // store displayName in ref for channel track
  const nameRef = useRef(displayName);
  useEffect(() => { nameRef.current = displayName; }, [displayName]);

  const sendSignal = useCallback((payload: any) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload });
  }, []);

  const handleRemoteStream = useCallback((peerId: string, stream: MediaStream) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.stream = stream;
      peersRef.current.set(peerId, peer);
      setPeers(Array.from(peersRef.current.values()));
    }
    const v = remoteVideoRefs.current.get(peerId);
    if (v) v.srcObject = stream;
  }, []);

  const createPeerConnection = useCallback((peerId: string, peerName: string) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    const peer: Peer = { id: peerId, name: peerName, pc, stream: null };
    peersRef.current.set(peerId, peer);

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'ice', from: userId, to: peerId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      handleRemoteStream(peerId, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        // keep but mark
      }
    };

    // add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    }

    return pc;
  }, [userId, handleRemoteStream, sendSignal]);

  const handleSignal = useCallback(async (payload: any) => {
    if (payload.to !== userId) return;
    const from = payload.from;
    const peerName = payload.name || 'Utente';

    if (payload.type === 'offer') {
      let peer = peersRef.current.get(from);
      if (!peer) {
        createPeerConnection(from, peerName);
        peer = peersRef.current.get(from)!;
      }
      await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      // drain queued ICE candidates
      const q = iceQueuesRef.current.get(from) || [];
      for (const c of q) { try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      iceQueuesRef.current.set(from, []);
      if (localStreamRef.current && peer.pc.getSenders().length === 0) {
        localStreamRef.current.getTracks().forEach((t) => peer!.pc.addTrack(t, localStreamRef.current!));
      }
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      sendSignal({ type: 'answer', from: userId, to: from, sdp: answer, name: nameRef.current });
    } else if (payload.type === 'answer') {
      const peer = peersRef.current.get(from);
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const q = iceQueuesRef.current.get(from) || [];
        for (const c of q) { try { await peer.pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
        iceQueuesRef.current.set(from, []);
        if (payload.name) { peer.name = payload.name; peersRef.current.set(from, peer); setPeers(Array.from(peersRef.current.values())); }
      }
    } else if (payload.type === 'ice') {
      const peer = peersRef.current.get(from);
      if (peer && payload.candidate) {
        if (peer.pc.remoteDescription) {
          try { await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        } else {
          const q = iceQueuesRef.current.get(from) || [];
          q.push(payload.candidate);
          iceQueuesRef.current.set(from, q);
        }
      }
    }
  }, [userId, createPeerConnection, sendSignal]);

  // init local media
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        rawAudioTrackRef.current = stream.getAudioTracks()[0] || null;
        setLocalStream(stream);
        setMediaReady(true);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        // devices
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          audio: devs.filter(d => d.kind === 'audioinput'),
          video: devs.filter(d => d.kind === 'videoinput'),
        });
        setStatus('Pronto');
      } catch (e) {
        setStatus('Permesso camera/microfono negato: ' + getErrorMessage(e));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // setup channel
  useEffect(() => {
    if (!mediaReady || !localStreamRef.current) return;
    const channel = supabase.channel(`call:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, { id?: string; name?: string }[]>;
      const presentIds = new Set(Object.keys(state));
      // remove left
      for (const [pid] of peersRef.current) {
        if (!presentIds.has(pid)) {
          const p = peersRef.current.get(pid);
          p?.pc.close();
          peersRef.current.delete(pid);
          setPeers(Array.from(peersRef.current.values()));
        }
      }
      // for each present peer
      for (const pid of presentIds) {
        if (pid === userId) continue;
        const info = state[pid]?.[0];
        const pname = info?.name || 'Utente';
        if (!peersRef.current.has(pid)) {
          // I am the higher id -> I offer
          if (userId > pid) {
            const pc = createPeerConnection(pid, pname);
            (async () => {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal({ type: 'offer', from: userId, to: pid, sdp: offer, name: nameRef.current });
            })();
          }
          // else wait for their offer
        } else {
          // update name
          const p = peersRef.current.get(pid)!;
          p.name = pname;
          peersRef.current.set(pid, p);
          setPeers(Array.from(peersRef.current.values()));
        }
      }
    });

    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      handleSignal(payload);
    });

    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (payload.from === userId) return;
      setMessages((prev) => [...prev, payload as ChatMsg]);
    });

    channel.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await channel.track({ id: userId, name: nameRef.current });
        setStatus('In chiamata');
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [mediaReady, roomId, userId, createPeerConnection, handleSignal, sendSignal]);

  // local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  // remote video elements attach
  useEffect(() => {
    peers.forEach((p) => {
      const v = remoteVideoRefs.current.get(p.id);
      if (v && p.stream) v.srcObject = p.stream;
    });
  }, [peers]);

  // mic/cam toggle
  const toggleMic = () => {
    if (!localStream) return;
    const t = localStream.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    if (!localStream) return;
    const t = localStream.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };

  // apply device selection
  const applyDevices = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
        video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      // replace tracks
      const oldStream = localStreamRef.current;
      const newAudio = newStream.getAudioTracks()[0];
      const newVideo = newStream.getVideoTracks()[0];
      // rebuild mic gain chain with new track
      rawAudioTrackRef.current = newAudio;
      // defer to let localStreamRef be set first
      setTimeout(() => rebuildMicTrack(micVolume), 0);
      // replace in peers
      if (oldStream) {
        const oldAudio = oldStream.getAudioTracks()[0];
        const oldVideo = oldStream.getVideoTracks()[0];
        peersRef.current.forEach((p) => {
          const senders = p.pc.getSenders();
          senders.forEach((s) => {
            if (s.track?.kind === 'audio' && newAudio) s.replaceTrack(newAudio);
            if (s.track?.kind === 'video' && newVideo) s.replaceTrack(newVideo);
          });
        });
        oldStream.getTracks().forEach(t => t.stop());
      }
      localStreamRef.current = newStream;
      rawAudioTrackRef.current = newStream.getAudioTracks()[0] || null;
      setLocalStream(newStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      setMicOn(newAudio?.enabled ?? true);
      setCamOn(newVideo?.enabled ?? true);
      setSettingsOpen(false);
    } catch (e) {
      alert('Errore cambio dispositivo: ' + getErrorMessage(e));
    }
  };

  const rebuildMicTrack = useCallback((gainValue: number) => {
    const raw = rawAudioTrackRef.current;
    if (!raw || !localStreamRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const src = ctx.createMediaStreamSource(new MediaStream([raw]));
      const gain = ctx.createGain();
      gain.gain.value = gainValue;
      const dest = ctx.createMediaStreamDestination();
      src.connect(gain).connect(dest);
      const newTrack = dest.stream.getAudioTracks()[0];
      const ls = localStreamRef.current;
      ls.getAudioTracks().forEach((t) => { if (t !== raw) t.stop(); ls.removeTrack(t); });
      ls.addTrack(newTrack);
      peersRef.current.forEach((p) => {
        p.pc.getSenders().forEach((s) => {
          if (s.track?.kind === 'audio') void s.replaceTrack(newTrack);
        });
      });
      setLocalStream(new MediaStream(ls.getTracks()));
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    } catch (e) {
      console.warn('mic gain failed', e);
    }
  }, []);

  useEffect(() => {
    if (!localStream) return;
    rebuildMicTrack(micVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micVolume]);

  // output volume
  useEffect(() => {
    remoteVideoRefs.current.forEach((v) => { v.volume = callVolume; });
  }, [callVolume, peers]);

  // chat send
  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMsg = { id: crypto.randomUUID(), from: userId, name: displayName, text: chatInput.trim(), ts: Date.now() };
    setMessages((prev) => [...prev, msg]);
    channelRef.current?.send({ type: 'broadcast', event: 'chat', payload: msg });
    setChatInput('');
  };

  // invite
  const invite = async () => {
    const url = `${window.location.origin}/videochiamate?room=${roomId}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt('Copia il link:', url); }
  };

  // recording helpers
  const startRecording = () => {
    if (!localStream) return;
    recordedChunksRef.current = [];
    // composite canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    compositeCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;
    const draw = () => {
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
      const vids = [localVideoRef.current, ...Array.from(remoteVideoRefs.current.values())].filter(Boolean) as HTMLVideoElement[];
      const n = vids.length || 1;
      const cols = Math.ceil(Math.sqrt(n));
      const rows = Math.ceil(n / cols);
      const w = canvas.width / cols;
      const h = canvas.height / rows;
      vids.forEach((v, i) => {
        const c = i % cols; const r = Math.floor(i / cols);
        try { ctx.drawImage(v, c*w, r*h, w, h); } catch {}
      });
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    const canvasStream = canvas.captureStream(24);
    // audio mix
    const actx = new AudioContext();
    audioCtxRef.current = actx;
    const dest = actx.createMediaStreamDestination();
    audioDestRef.current = dest;
    const addAudio = (stream: MediaStream | null) => {
      if (!stream) return;
      const track = stream.getAudioTracks()[0];
      if (!track) return;
      const ms = new MediaStream([track]);
      const src = actx.createMediaStreamSource(ms);
      src.connect(dest);
    };
    addAudio(localStream);
    peersRef.current.forEach((p) => addAudio(p.stream));
    dest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : 'video/webm';
    recordedMimeRef.current = mime;
    const mr = new MediaRecorder(canvasStream, { mimeType: mime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mr.start(1000);
    recorderRef.current = mr;
    setRecording(true);
  };

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr) { resolve(null); return; }
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recordedMimeRef.current });
        recordedChunksRef.current = [];
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        compositeCanvasRef.current = null;
        resolve(blob);
      };
      mr.stop();
      recorderRef.current = null;
      setRecording(false);
    });
  };

  const hangUp = async () => {
    // stop recording and save
    setSaving(true);
    let blob: Blob | null = null;
    if (recorderRef.current) blob = await stopRecording();
    // stop media
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peersRef.current.forEach((p) => p.pc.close());
    peersRef.current.clear();
    setPeers([]);
    channelRef.current?.unsubscribe();
    channelRef.current = null;

    // save chat + video to notes
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let videoPath: string | null = null;
        if (blob && blob.size > 0) {
          const ext = recordedMimeRef.current.includes('mp4') ? 'mp4' : 'webm';
          const fileName = `${crypto.randomUUID()}_chiamata.${ext}`;
          const { error: upErr } = await supabase.storage.from('factory-assets').upload(`notes/${fileName}`, blob);
          if (!upErr) videoPath = `notes/${fileName}`;
        }
        const transcript = messages.map(m => `[${new Date(m.ts).toLocaleTimeString('it-IT')}] ${m.name}: ${m.text}`).join('\n');
        const attachments = videoPath ? [videoPath] : [];
        await supabase.from('notes').insert([{
          title: `Videochiamata ${new Date().toLocaleString('it-IT')}`,
          content: transcript || '(nessun messaggio)',
          attachments,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        }]);
      }
    } catch (e) {
      console.error('Save call note failed', e);
    } finally {
      setSaving(false);
      window.location.href = '/videochiamate';
    }
  };

  // enumerate devices on settings open
  useEffect(() => {
    if (!settingsOpen) return;
    navigator.mediaDevices.enumerateDevices().then((devs) => {
      setDevices({
        audio: devs.filter(d => d.kind === 'audioinput'),
        video: devs.filter(d => d.kind === 'videoinput'),
      });
    });
  }, [settingsOpen]);

  const peerList = peers;

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-950 text-white">
      {/* top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2">
        <div className="min-w-0 truncate text-sm font-semibold">Stanza: {roomId} · {peerList.length + 1} partecipanti</div>
        <div className="shrink-0 text-xs text-zinc-400">{status}</div>
      </div>

      {/* main */}
      <div className="flex flex-1 min-h-0">
        {/* video area */}
        <div className="flex flex-1 flex-col min-w-0">
          <div className="flex-1 grid gap-2 p-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))' }}>
            {/* local */}
            <div className="relative overflow-hidden rounded-xl bg-zinc-900">
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">{displayName} (tu)</span>
              {!camOn && <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-500">Camera off</div>}
            </div>
            {peerList.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-xl bg-zinc-900">
                <video
                  ref={(el) => { if (el) { remoteVideoRefs.current.set(p.id, el); if (p.stream) el.srcObject = p.stream; } }}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">{p.name}</span>
              </div>
            ))}
          </div>

          {/* controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-800 p-3">
            <button onClick={toggleMic} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800" aria-label="Microfono">
              {micOn ? <Mic size={18} /> : <MicOff size={18} className="text-red-400" />}
            </button>
            <button onClick={toggleCam} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800" aria-label="Camera">
              {camOn ? <VideoIcon size={18} /> : <VideoOff size={18} className="text-red-400" />}
            </button>
            <button onClick={() => setChatOpen((v) => !v)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800" aria-label="Chat">
              <MessageSquare size={18} />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800" aria-label="Impostazioni">
              <Settings size={18} />
            </button>
            <button onClick={invite} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 hover:bg-zinc-800" aria-label="Invita">
              {copied ? <Check size={18} className="text-green-400" /> : <UserPlus size={18} />}
            </button>
            <button
              onClick={() => (recording ? stopRecording().then(() => {}) : startRecording())}
              className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-xs font-semibold ${recording ? 'bg-red-600' : 'border border-zinc-700 bg-zinc-900'}`}
            >
              {recording ? 'Stop rec' : 'Rec'}
            </button>
            <button onClick={hangUp} disabled={saving} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-600 hover:bg-red-700" aria-label="Chiudi chiamata">
              <PhoneOff size={18} />
            </button>
          </div>
        </div>

        {/* chat sidebar */}
        {chatOpen && (
          <div
            className="flex flex-col border-l border-zinc-800 bg-zinc-900 max-md:fixed max-md:inset-0 max-md:z-40 max-md:!w-full max-md:border-l-0 md:relative md:w-auto"
            style={{ width: chatWidth }}
          >
            {/* resize handle */}
            <div
              className="absolute left-0 top-0 h-full w-1 cursor-col-resize bg-zinc-700 hover:bg-[#FF914D] hidden md:block"
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startW = chatWidth;
                const onMove = (ev: MouseEvent) => {
                  const newW = Math.max(200, Math.min(600, startW + (startX - ev.clientX)));
                  setChatWidth(newW);
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
            <div className="flex items-center justify-between border-b border-zinc-800 p-2">
              <span className="text-sm font-semibold">Chat</span>
              <button onClick={() => setChatOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-800" aria-label="Chiudi chat">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg bg-zinc-800 p-2 text-xs">
                  <div className="font-semibold text-[#FF914D]">{m.name}</div>
                  <div>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t border-zinc-800 p-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                placeholder="Messaggio…"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
              />
              <button onClick={sendChat} className="rounded-lg bg-[#FF914D] px-3 py-1 text-xs font-semibold text-black">Invia</button>
            </div>
          </div>
        )}
      </div>

      {/* settings modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Impostazioni</h2>
              <button onClick={() => setSettingsOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-800"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs">
                Nome visualizzato
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" />
              </label>
              <label className="block text-xs">
                Microfono
                <select value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm">
                  <option value="">Predefinito</option>
                  {devices.audio.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
                </select>
              </label>
              <label className="block text-xs">
                Camera
                <select value={selectedCam} onChange={(e) => setSelectedCam(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm">
                  <option value="">Predefinita</option>
                  {devices.video.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
                </select>
              </label>
              <label className="block text-xs">
                Volume microfono (input): {Math.round(micVolume * 100)}%
                <input type="range" min={0} max={1} step={0.01} value={micVolume} onChange={(e) => setMicVolume(Number(e.target.value))} className="mt-1 w-full" />
              </label>
              <label className="block text-xs">
                Volume audio chiamata: {Math.round(callVolume * 100)}%
                <input type="range" min={0} max={1} step={0.01} value={callVolume} onChange={(e) => setCallVolume(Number(e.target.value))} className="mt-1 w-full" />
              </label>
              <button onClick={applyDevices} className="w-full rounded-lg bg-[#FF914D] py-2 text-sm font-semibold text-black">Applica dispositivi</button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rounded-xl bg-zinc-900 px-6 py-4 text-sm">Salvataggio chiamata…</div>
        </div>
      )}
    </div>
  );
}
