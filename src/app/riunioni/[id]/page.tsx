import Link from "next/link";
import { notFound } from "next/navigation";
import { RecorderPanel } from "@/components/recorder/RecorderPanel";
import { isUuid } from "@/lib/recordings/model";
import "@/components/recorder/recorder.css";

type RiunionePageProps = {
  params: Promise<{ id: string }>;
};

/** Scheda dell'appuntamento: il pulsante REC vive qui, accanto ai dati della riunione. */
export default async function RiunionePage({ params }: RiunionePageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  return (
    <main className="rec-page">
      <p className="rec-kicker">Riunione · {id.slice(0, 8)}</p>
      <RecorderPanel apiBase="/api" mode="standalone" title="Riunione" />
      <p className="rec-back">
        <Link href="/dashboard">Torna alla dashboard</Link>
      </p>
    </main>
  );
}
