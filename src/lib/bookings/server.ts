import "server-only";
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

export type ReservationInput = {
  slotId: string;
  name: string;
  email: string;
  phone: string;
  people: number;
  notes: string;
};

export type ReservationResult =
  | { ok: true; code: string; slot: { date: string; start_time: string; end_time: string; free: number }; emailSent: boolean }
  | { ok: false; status: number; error: string };

function codeFor() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return "UTTF-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("").toUpperCase();
}

export async function createReservation(input: ReservationInput): Promise<ReservationResult> {
  const client = bookingAdmin();

  const { data: slot, error: slotError } = await client
    .from("booking_slots")
    .select("id, date, start_time, end_time, capacity")
    .eq("id", input.slotId)
    .single();
  if (slotError || !slot)
    return { ok: false, status: 409, error: "Questo slot non esiste più. Scegline un altro qui sotto." };

  if (slot.date < new Date().toISOString().slice(0, 10))
    return { ok: false, status: 409, error: "Questo slot è passato. Scegline un altro qui sotto." };

  const { data: takenRows, error: takenError } = await client
    .from("booking_reservations")
    .select("people")
    .eq("slot_id", slot.id)
    .eq("status", "confirmed");
  if (takenError) throw takenError;
  const taken = (takenRows ?? []).reduce((sum, r) => sum + (r.people ?? 0), 0);
  const free = slot.capacity - taken;
  if (input.people > free)
    return {
      ok: false,
      status: 409,
      error:
        free <= 0
          ? "Ops, giusto ora si è riempito. Prova con un altro slot qui sotto."
          : `In questo slot sono rimasti solo ${free} posti. Riduci la crew o scegli un altro orario.`,
    };

  const code = codeFor();
  const { error: insertError } = await client.from("booking_reservations").insert({
    slot_id: slot.id,
    code,
    name: input.name,
    email: input.email,
    phone: input.phone,
    people: input.people,
    notes: input.notes,
    status: "confirmed",
  });
  if (insertError) throw insertError;

  // Email best-effort: la prenotazione è già salva anche se l'invio fallisce.
  let emailSent = false;
  try {
    const { data: settings } = await client
      .from("booking_settings")
      .select("staff_email")
      .eq("id", 1)
      .maybeSingle();
    const staffEmail = settings?.staff_email ?? "ass.uttf@gmail.com";
    const day = formatDay(slot.date);
    const range = formatRange(slot);
    await Promise.all([
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
        to: staffEmail,
        subject: `Nuova prenotazione: ${day}, ${slot.start_time.slice(0, 5)}, ${input.people} pers. 🎉`,
        text: `Nuova prenotazione per ${day}, slot ${range}.

Nome: ${input.name}
Email: ${input.email}
Telefono: ${input.phone}
Persone: ${input.people}
Note: ${input.notes || "Nessuna nota"}
Posti residui nella fascia: ${free - input.people} su ${slot.capacity}
Codice prenotazione: ${code}`,
      }),
    ]);
    emailSent = true;
  } catch {
    // Intentionally swallowed: booking succeeded.
  }

  return { ok: true, code, slot: { date: slot.date, start_time: slot.start_time, end_time: slot.end_time, free: free - input.people }, emailSent };
}

async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // Email non configurata: nessun errore, la prenotazione vale lo stesso.
  const from = process.env.BOOKING_FROM_EMAIL || "Under The Tower Factory <ass.uttf@gmail.com>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) throw new Error("Invio email fallito.");
}
