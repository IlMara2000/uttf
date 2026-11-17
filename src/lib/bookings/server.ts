import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { formatDay, formatRange } from "./model";

export function bookingAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configurazione server non disponibile.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Rate limiting anti-spam, stesso schema delle iscrizioni ai laboratori:
// 15 tentativi/ora per IP (IP hashato HMAC-SHA256, tabella booking_rate_limits).
// Va chiamato dopo la validazione, così gli invii malformati non consumano quota.
export async function checkBookingRateLimit(request: Request) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    "local";
  const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(ip.split(",")[0])
    .digest("hex");
  const { data, error } = await bookingAdmin().rpc("take_booking_slot", {
    bucket_key: key,
  });
  if (error) throw error;
  return Boolean(data);
}

export type ReservationInput = {
  slotId: string;
  name: string;
  email: string;
  phone: string;
  people: number;
  notes: string;
};

export type ReservationResult =
  | { ok: true; code: string; slot: { date: string; start_time: string; end_time: string; free: number }; emailAccepted: boolean }
  | { ok: false; status: number; error: string };

function codeFor() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return "UTTF-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("").toUpperCase();
}

// Controllo capienza + insert atomici lato database: la RPC blocca la riga
// dello slot (SELECT ... FOR UPDATE), così due prenotazioni simultanee non
// possono superare i posti disponibili. Su 'ok', `free` è già il residuo post-insert.
const SLOT_GONE = "Questo slot non esiste più. Scegline un altro qui sotto.";

export async function createReservation(input: ReservationInput): Promise<ReservationResult> {
  const client = bookingAdmin();
  const code = codeFor();

  const { data, error: rpcError } = await client.rpc("reserve_booking_slot", {
    p_slot_id: input.slotId,
    p_code: code,
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_people: input.people,
    p_notes: input.notes,
  });
  if (rpcError) throw rpcError;
  const row = (data as Array<{
    status: string;
    free: number;
    slot_date: string;
    slot_start: string;
    slot_end: string;
    capacity: number;
  }> | null)?.[0];

  if (!row || row.status === "not_found")
    return { ok: false, status: 409, error: SLOT_GONE };
  if (row.status === "past")
    return { ok: false, status: 409, error: "Questo slot è passato. Scegline un altro qui sotto." };
  if (row.status === "full")
    return {
      ok: false,
      status: 409,
      error:
        row.free <= 0
          ? "Ops, giusto ora si è riempito. Prova con un altro slot qui sotto."
          : `In questo slot sono rimasti solo ${row.free} posti. Riduci la crew o scegli un altro orario.`,
    };

  const slot = {
    date: row.slot_date,
    start_time: row.slot_start,
    end_time: row.slot_end,
  };

  // Email best-effort: la prenotazione è già salva anche se l'invio fallisce.
  // emailAccepted = Resend ha ACCETTATO la richiesta (2xx), non che l'email sia
  // stata consegnata: la consegna è asincrona e si verifica su Resend → Emails
  // (o via webhook). Qui logghiamo l'id Resend per poterla tracciare.
  let emailAccepted = false;
  let customerId: string | null = null;
  let staffAccepted = false;
  let staffId: string | null = null;
  try {
    const { data: settings } = await client
      .from("booking_settings")
      .select("staff_email")
      .eq("id", 1)
      .maybeSingle();
    const day = formatDay(slot.date);
    const range = formatRange(slot);
    const [customer, staff] = await Promise.allSettled([
      sendMail({
        to: input.email,
        subject: `Confermato: ${day}, ore ${slot.start_time.slice(0, 5)} — ci vediamo lì`,
        text: `Ciao ${input.name} 👋

La tua prenotazione è confermata.

Quando: ${day}, ${range}
Dove: Via dei Biancospini, 4 · Rozzano (MI)
La crew: ${input.people} persone
Codice prenotazione: ${code}

Se non riesci più a venire, rispondi a questa email: liberi il posto per qualcun altro, dai.

A presto,
Under The Tower Factory`,
      }),
      sendMail({
        to: settings?.staff_email ?? "ass.uttf@gmail.com",
        subject: `Nuova prenotazione: ${day}, ${slot.start_time.slice(0, 5)}, ${input.people} pers. 🎉`,
        text: `Nuova prenotazione per ${day}, slot ${range}.

Nome: ${input.name}
Email: ${input.email}
Telefono: ${input.phone}
Persone: ${input.people}
Note: ${input.notes || "Nessuna nota"}
Posti residui nella fascia: ${row.free} su ${row.capacity}
Codice prenotazione: ${code}`,
      }),
    ]);
    if (customer.status === "fulfilled") {
      emailAccepted = customer.value.accepted;
      customerId = customer.value.id;
    } else {
      console.error(
        `[bookings] Invio email cliente fallito — to=${input.email} code=${code}:`,
        customer.reason,
      );
    }
    if (staff.status === "fulfilled") {
      staffAccepted = staff.value.accepted;
      staffId = staff.value.id;
    } else {
      console.error(`[bookings] Avviso staff non inviato — code=${code}:`, staff.reason);
    }
    // Riga di sintesi: unico posto da guardare nei log Vercel per capire subito
    // se una email si è persa prima ancora di essere accettata.
    console.info(
      `[bookings] Email prenotazione ${code}: cliente=${emailAccepted ? "accettata" : "NON accettata"} id=${customerId ?? "n/a"} | staff=${staffAccepted ? "accettata" : "NON accettata"} id=${staffId ?? "n/a"}. Accettata != consegnata: controlla Resend → Emails per bounce.`,
    );
  } catch {
    // Intentionally swallowed: booking succeeded.
    console.error(`[bookings] Errore inatteso nell'invio email — code=${code}.`);
  }

  return { ok: true, code, slot: { ...slot, free: row.free }, emailAccepted };
}

type SendMailResult = { accepted: boolean; id: string | null };

async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<SendMailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[bookings] RESEND_API_KEY non impostata: invio email saltato (prenotazione salvata comunque).");
    return { accepted: false, id: null };
  }
  // Resend accetta solo mittenti su domini verificati: niente Gmail/Outlook come from.
  const from = process.env.BOOKING_FROM_EMAIL;
  if (!from) {
    console.error("[bookings] BOOKING_FROM_EMAIL non impostata: invio email saltato. Mittente non configurato.");
    return { accepted: false, id: null };
  }
  const staffReplyTo = process.env.BOOKING_REPLY_TO_EMAIL || "ass.uttf@gmail.com";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, reply_to: staffReplyTo, to, subject, text }),
  });
  const bodyText = await response.text().catch(() => "");
  let parsed: { id?: string } | null = null;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    console.error(
      `[bookings] Email NON accettata da Resend — to=${to} status=${response.status} body=${bodyText.slice(0, 500)}`,
    );
    throw new Error("Invio email fallito.");
  }
  const id = parsed?.id ?? null;
  // 'accepted' = Resend ha preso in carico la richiesta. La consegna (e i bounce)
  // sono asincroni: controllare Resend → Emails o webhook per lo stato finale.
  console.info(`[bookings] Email accettata da Resend (non = consegnata) — to=${to} id=${id ?? "n/a"} status=${response.status}`);
  return { accepted: true, id };
}
