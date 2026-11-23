"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { DEFAULT_BOOKING_CATEGORY, formatDay, formatRange, hhmm, validateBookingForm, type BookingSlot } from "@/lib/bookings/model";

type Slot = BookingSlot & { free_seats: number };
type Confirmation = {
  code: string;
  date: string;
  start: string;
};

const emptyForm = { name: "", email: "", phone: "", people: 1, notes: "", privacy: false };

export default function BookingPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [filter, setFilter] = useState("Tutte");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // Il parent rimonta il pannello a ogni apertura (key), quindi lo stato riparte pulito.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("booking_slot_availability")
          .select("id, date, start_time, end_time, capacity, category, free_seats")
          .gte("date", new Date().toISOString().slice(0, 10))
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(40);
        if (alive && !error) setSlots((data ?? []) as Slot[]);
      } catch {
        /* slots restano vuoti: messaggio dedicato qui sotto */
      }
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const categories = useMemo(
    () => [...new Set(slots.map((s) => s.category ?? DEFAULT_BOOKING_CATEGORY))],
    [slots],
  );
  const visible = filter === "Tutte" ? slots : slots.filter((s) => (s.category ?? DEFAULT_BOOKING_CATEGORY) === filter);

  const groups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of visible) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return [...map.entries()];
  }, [visible]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    const validationError = validateBookingForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (form.people > selected.free_seats) {
      setError(
        selected.free_seats <= 0
          ? "Ops, giusto ora si è riempito. Prova con un altro slot qui sotto."
          : `In questo slot sono rimasti solo ${selected.free_seats} posti. Riduci la crew o scegli un altro orario.`,
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selected.id, ...form }),
      });
      const payload = (await response.json()) as Confirmation & { error?: string };
      if (!response.ok)
        throw new Error(payload.error || "Qualcosa non ha funzionato. Riprova tra un istante o scrivici a ass.uttf@gmail.com.");
      setConfirmation(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Qualcosa non ha funzionato. Riprova tra un istante.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(value) => !value && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="editorial-modal-overlay" />
        <Dialog.Content className="booking-modal">
          <Dialog.Description className="sr-only">
            Scegli uno slot disponibile e prenotati per passare del tempo in compagnia o con noi o con i tuoi
            amici nei nostri spazi.
          </Dialog.Description>
          <Dialog.Close className="modal-close" aria-label="Chiudi">
            <X size={22} />
          </Dialog.Close>

          {confirmation ? (
            <div className="booking-body">
              <span className="eyebrow">Prenotazione confermata 🎉</span>
              <Dialog.Title className="booking-title">
                Fatto. Ci vediamo {formatDay(confirmation.date)}.
              </Dialog.Title>
              <p className="booking-intro">
                Si parte alle {hhmm(confirmation.start)} — Via dei Biancospini, 4 · Rozzano (MI).
              </p>
              <p className="booking-note">
                Codice prenotazione: <strong>{confirmation.code}</strong>
              </p>
              <p className="booking-note">
                Tieni il codice a portata di mano: è quello che ti chiediamo all&rsquo;ingresso. Non mandiamo email
                di conferma, quindi fai uno screenshot se ti serve.
              </p>
              <p className="booking-note">
                Se non riesci più a venire, scrivici a{" "}
                <a className="text-link" href="mailto:ass.uttf@gmail.com">
                  ass.uttf@gmail.com
                </a>
                : liberiamo il posto per qualcun altro.
              </p>
              <button type="button" className="clay-button" onClick={onClose}>
                Chiudi
              </button>
            </div>
          ) : !selected ? (
            <div className="booking-body">
              <span className="eyebrow">Vieni a trovarci</span>
              <Dialog.Title className="booking-title">Scegli uno slot e sei dentro</Dialog.Title>
              <p className="booking-intro">
                Retta, musica, gente simpatica. Prenota il tuo posto e passa del tempo con noi o con la
                tua crew nei nostri spazi.
              </p>
              <p className="booking-note">
                Gratis. La prenotazione serve solo a non farti trovare &ldquo;posto occupato&rdquo;.
              </p>
              <h3 className="booking-subtitle">Prossime disponibilità</h3>
              {categories.length > 1 && (
                <div className="booking-filters" role="group" aria-label="Filtra per categoria">
                  {["Tutte", ...categories].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={filter === c}
                      className={filter === c ? "active" : ""}
                      onClick={() => setFilter(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {loading ? (
                <p className="booking-note">Carico le disponibilità…</p>
              ) : groups.length === 0 ? (
                <p className="booking-note">
                  Per ora niente slot pubblicati. Dai un&rsquo;occhiata tra poco, oppure passa quando vuoi
                  durante gli orari di apertura.
                </p>
              ) : (
                <div className="booking-groups">
                  {groups.map(([date, daySlots]) => (
                    <div key={date} className="booking-day">
                      <h4>{formatDay(date)}</h4>
                      <ul className="booking-slots">
                        {daySlots.map((slot) => {
                          const free = slot.free_seats;
                          const full = free <= 0;
                          return (
                            <li key={slot.id}>
                              <span className="booking-slot-info">
                                {formatRange(slot)} · {slot.category ?? DEFAULT_BOOKING_CATEGORY} ·{" "}
                                {full ? "Full" : free <= 2 ? `${free} posti liberi — quasi pieni 👀` : `${free} posti liberi`}
                              </span>
                              <button
                                type="button"
                                className="clay-button small light"
                                disabled={full}
                                onClick={() => {
                                  setSelected(slot);
                                  setError("");
                                }}
                              >
                                {full ? "Full" : "Mi prenoto"}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <a className="text-link booking-apertura" href="#orari">
                Niente prenotazione? Guarda gli orari di apertura <ArrowUpRight size={17} />
              </a>
            </div>
          ) : (
            <form className="editorial-form booking-body" onSubmit={(event) => void submit(event)}>
              <span className="eyebrow">Prenota il tuo posto</span>
              <Dialog.Title className="booking-title">{formatDay(selected.date)}</Dialog.Title>
              <p className="booking-intro">
                {formatRange(selected)} · {selected.free_seats} posti liberi
              </p>
              <button
                type="button"
                className="text-link booking-back"
                onClick={() => {
                  setSelected(null);
                  setError("");
                }}
              >
                <ArrowLeft size={16} /> Cambia slot
              </button>
              <label htmlFor="booking-name">Nome e cognome</label>
              <input
                id="booking-name"
                required
                placeholder="Come ti chiami?"
                value={form.name}
                maxLength={120}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <label htmlFor="booking-email">Email</label>
              <input
                id="booking-email"
                required
                type="email"
                placeholder="nome@email.it"
                value={form.email}
                maxLength={254}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <label htmlFor="booking-phone">Telefono</label>
              <input
                id="booking-phone"
                required
                type="tel"
                placeholder="333 123 4567"
                value={form.phone}
                maxLength={40}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
              <p className="booking-hint">Solo se cambia l&rsquo;orario, tranquillo</p>
              <label htmlFor="booking-people">Quante persone siete?</label>
              <select
                id="booking-people"
                value={form.people}
                onChange={(event) => setForm({ ...form, people: Number(event.target.value) })}
              >
                {Array.from({ length: Math.min(selected.free_seats, 20) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <label htmlFor="booking-notes">Note</label>
              <textarea
                id="booking-notes"
                placeholder="Scrivici un po' di te (facoltativo)"
                value={form.notes}
                maxLength={1000}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
              <label className="consent-label">
                <input
                  type="checkbox"
                  checked={form.privacy}
                  onChange={(event) => setForm({ ...form, privacy: event.target.checked })}
                />
                <span>
                  Ok, ho letto l&rsquo;
                  <Link href="/privacy" target="_blank">
                    informativa privacy
                  </Link>
                  . I dati servono solo per gestire la prenotazione e restano allo staff.
                </span>
              </label>
              {error && <p role="alert">{error}</p>}
              <button type="submit" className="clay-button" disabled={busy}>
                {busy ? "Ti prenoto…" : "Conferma, ci sono"}
              </button>
              <button type="button" className="text-link" onClick={onClose}>
                Lascia perdere
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
