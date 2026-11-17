import "server-only";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
  | { ok: true; code: string; slot: { date: string; start_time: string; end_time: string; free: number } }
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

  // Nessuna email: la conferma è il codice mostrato a schermo, la prenotazione
  // resta visibile allo staff nel pannello. Niente servizi esterni da configurare.
  console.info(`[bookings] Prenotazione ${code} creata — posti residui ${row.free}/${row.capacity}`);

  return { ok: true, code, slot: { ...slot, free: row.free } };
}
