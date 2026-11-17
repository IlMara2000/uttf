import { NextResponse } from "next/server";
import { readJson } from "@/lib/request-json";
import { validateBookingForm } from "@/lib/bookings/model";
import { createReservation } from "@/lib/bookings/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return fail("Origine non valida.", 403);

  let raw: unknown;
  try {
    raw = await readJson(request, 8_192);
  } catch {
    return fail("Richiesta non valida.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return fail("Richiesta non valida.");
  const p = raw as Record<string, unknown>;

  const slotId = typeof p.slotId === "string" ? p.slotId : "";
  const form = {
    name: typeof p.name === "string" ? p.name.trim() : "",
    email: typeof p.email === "string" ? p.email.trim() : "",
    phone: typeof p.phone === "string" ? p.phone.trim() : "",
    people: p.people,
    notes: typeof p.notes === "string" ? p.notes.trim().slice(0, 1000) : "",
    privacy: p.privacy === true,
  };

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slotId))
    return fail("Slot non valido.");
  if (form.name.length > 120 || form.email.length > 254 || form.phone.length > 40)
    return fail("Dati troppo lunghi.");

  const people = typeof form.people === "string" ? Number(form.people) : form.people;
  const validationError = validateBookingForm({ ...form, people: Number.isInteger(people) ? (people as number) : 0 });
  if (validationError) return fail(validationError);

  try {
    const result = await createReservation({
      slotId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      people: people as number,
      notes: form.notes,
    });
    if (!result.ok) return fail(result.error, result.status);
    return NextResponse.json(
      { code: result.code, date: result.slot.date, start: result.slot.start_time, end: result.slot.end_time, free: result.slot.free, emailSent: result.emailSent },
      { headers },
    );
  } catch {
    return fail("Qualcosa non ha funzionato. Riprova tra un istante o scrivici a ass.uttf@gmail.com.", 500);
  }
}
