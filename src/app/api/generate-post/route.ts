import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { title, description } = await req.json();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Sei il Social Media Manager di UTTF (Under The True Factory). Scrivi post accattivanti, stile "street/industrial", usa emoji minimali e un tono professionale ma underground. Genera una caption per Instagram e 3 hashtag.'
        },
        {
          role: 'user',
          content: `Genera un post per questa attività: Titolo: ${title}. Descrizione: ${description}`
        }
      ],
      model: 'llama3-8b-8192', // Veloce e perfetto per questo
    });

    const content = chatCompletion.choices[0]?.message?.content;
    return NextResponse.json({ post: content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}