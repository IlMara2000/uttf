import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errors';

let groq: Groq | null = null;

function getGroq() {
  if (groq) return groq;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY non configurata');

  groq = new Groq({ apiKey });
  return groq;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'Accesso staff richiesto.' }, { status: 401 });

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) throw new Error('Configurazione Supabase mancante.');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Sessione staff non valida.' }, { status: 401 });

    let payload: { title?: unknown; description?: unknown };
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
    }
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Richiesta non valida.' }, { status: 400 });
    }
    const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 200) : '';
    const description = typeof payload.description === 'string' ? payload.description.trim().slice(0, 4000) : '';
    if (!description) return NextResponse.json({ error: 'Descrizione mancante.' }, { status: 400 });

    const chatCompletion = await getGroq().chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Sei il Social Media Manager di UTTF (Under The Tower Factory). Migliora la descrizione per un post social: chiara, sintetica, professionale, con tono urbano. Restituisci solo il testo pronto da pubblicare.'
        },
        {
          role: 'user',
          content: `Titolo: ${title}. Descrizione: ${description}`
        }
      ],
      model: 'llama-3.1-8b-instant',
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) return NextResponse.json({ error: 'Il modello non ha restituito un testo.' }, { status: 502 });
    return NextResponse.json({ post: content });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Generazione post non riuscita') }, { status: 500 });
  }
}
