"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { WEEKDAYS, hhmm, type WeeklyHour } from "@/lib/bookings/model";

type SlotRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  internal_note: string;
};

type ReservationRow = {
  id: string;
  slot_id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  people: number;
  notes: string;
  status: string;
  created_at: string;
};

type Tab = "slots" | "reservations" | "hours";

const emptySlot = { date: "", start_time: "18:00", end_time: "20:00", capacity: 10, internal_note: "" };

export default function StaffBookingEditor() {
  const [isStaff, setIsStaff] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("slots");
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [hours, setHours] = useState<WeeklyHour[]>([]);
  const [draft, setDraft] = useState(emptySlot);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState("ass.uttf@gmail.com");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Bottone visibile solo a chi è loggato come staff/admin (allowlist del gestionale).
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!alive || !user || user.is_anonymous || !user.email) return;
        const { data } = await supabase
          .from("authorized_users")
          .select("role")
          .eq("email", user.email.toLowerCase())
          .maybeSingle();
        if (alive && (data?.role === "staff" || data?.role === "admin")) setIsStaff(true);
      } catch {
        /* non staff: nessun bottone */
      }
    }
    void check();
    return () => {
      alive = false;
    };
  }, []);

  async function refresh() {
    const { supabase } = await import("@/lib/supabase");
    const [slotsRes, resRes, hoursRes, settingsRes] = await Promise.all([
      supabase.from("booking_slots").select("id, date, start_time, end_time, capacity, internal_note").order("date").order("start_time"),
      supabase.from("booking_reservations").select("id, slot_id, code, name, email, phone, people, notes, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("weekly_hours").select("day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end").order("day_of_week"),
      supabase.from("booking_settings").select("staff_email").eq("id", 1).maybeSingle(),
    ]);
    if (slotsRes.data) setSlots(slotsRes.data as SlotRow[]);
    if (resRes.data) setReservations(resRes.data as ReservationRow[]);
    if (hoursRes.data) setHours(hoursRes.data as WeeklyHour[]);
    if (settingsRes.data?.staff_email) setStaffEmail(settingsRes.data.staff_email);
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const [slotsRes, resRes, hoursRes, settingsRes] = await Promise.all([
          supabase.from("booking_slots").select("id, date, start_time, end_time, capacity, internal_note").order("date").order("start_time"),
          supabase.from("booking_reservations").select("id, slot_id, code, name, email, phone, people, notes, status, created_at").order("created_at", { ascending: false }).limit(200),
          supabase.from("weekly_hours").select("day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end").order("day_of_week"),
          supabase.from("booking_settings").select("staff_email").eq("id", 1).maybeSingle(),
        ]);
        if (!alive) return;
        if (slotsRes.data) setSlots(slotsRes.data as SlotRow[]);
        if (resRes.data) setReservations(resRes.data as ReservationRow[]);
        if (hoursRes.data) setHours(hoursRes.data as WeeklyHour[]);
        if (settingsRes.data?.staff_email) setStaffEmail(settingsRes.data.staff_email);
      } catch {
        if (alive) setMessage("Non ho caricato i dati. Riprova.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  const takenFor = (slotId: string) =>
    reservations.filter((r) => r.slot_id === slotId && r.status === "confirmed").reduce((sum, r) => sum + r.people, 0);

  async function saveSlot(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const payload = {
        date: draft.date,
        start_time: draft.start_time,
        end_time: draft.end_time,
        capacity: Number(draft.capacity),
        internal_note: draft.internal_note,
      };
      const query = editingId
        ? supabase.from("booking_slots").update(payload).eq("id", editingId)
        : supabase.from("booking_slots").insert(payload);
      const { error } = await query;
      if (error) throw error;
      setDraft(emptySlot);
      setEditingId(null);
      await refresh();
      setMessage("Salvato, tutto a posto. ✅");
    } catch {
      setMessage("Non ho salvato la fascia. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSlot(slot: SlotRow) {
    const count = reservations.filter((r) => r.slot_id === slot.id && r.status === "confirmed").length;
    const confirmText =
      count > 0
        ? `Questa fascia ha ${count} prenotazioni. Il cliente non riceve un avviso automatico: sei sicuro?`
        : "Eliminare questa fascia?";
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("booking_slots").delete().eq("id", slot.id);
      if (error) throw error;
      await refresh();
      setMessage("Fascia eliminata. Le prenotazioni restano nello storico.");
    } catch {
      setMessage("Non ho eliminato la fascia. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function setReservationStatus(row: ReservationRow, status: string) {
    setBusy(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.from("booking_reservations").update({ status }).eq("id", row.id);
      if (error) throw error;
      await refresh();
      setMessage("Salvato, tutto a posto. ✅");
    } catch {
      setMessage("Non ho aggiornato la prenotazione. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function saveHours(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      for (const h of hours) {
        const payload = {
          is_open: h.is_open,
          morning_start: h.is_open ? h.morning_start : null,
          morning_end: h.is_open ? h.morning_end : null,
          afternoon_start: h.is_open ? h.afternoon_start : null,
          afternoon_end: h.is_open ? h.afternoon_end : null,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("weekly_hours").update(payload).eq("day_of_week", h.day_of_week);
        if (error) throw error;
      }
      const { error: settingsError } = await supabase
        .from("booking_settings")
        .update({ staff_email: staffEmail, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (settingsError) throw settingsError;
      await refresh();
      setMessage("Salvato, tutto a posto. ✅");
    } catch {
      setMessage("Non ho salvato: la connessione è caduta. Riprova.");
    } finally {
      setBusy(false);
    }
  }

  if (!isStaff) return null;

  const slotById = new Map(slots.map((s) => [s.id, s]));

  return (
    <>
      <button
        type="button"
        className="staff-edit-button"
        aria-label="Modifica disponibilità (solo staff)"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
      >
        <Pencil size={13} /> Gestisci disponibilità
      </button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="editorial-modal-overlay" />
          <Dialog.Content className="booking-modal staff-modal" aria-describedby={undefined}>
            <Dialog.Close className="modal-close" aria-label="Chiudi">
              <X size={22} />
            </Dialog.Close>
            <div className="booking-body">
              <span className="eyebrow">Solo staff</span>
              <Dialog.Title className="booking-title">Gestisci disponibilità e orari</Dialog.Title>
              <div className="staff-tabs" role="tablist" aria-label="Sezioni">
                {(
                  [
                    ["slots", "Fasce prenotabili"],
                    ["reservations", "Prenotazioni"],
                    ["hours", "Orari settimanali"],
                  ] as [Tab, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {message && <p role="status">{message}</p>}

              {tab === "slots" && (
                <>
                  <form className="editorial-form staff-form" onSubmit={(event) => void saveSlot(event)}>
                    <h3>{editingId ? "Modifica fascia" : "+ Nuova fascia"}</h3>
                    <label htmlFor="staff-date">Data</label>
                    <input id="staff-date" type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                    <label htmlFor="staff-start">Ora inizio</label>
                    <input id="staff-start" type="time" required value={draft.start_time} onChange={(e) => setDraft({ ...draft, start_time: e.target.value })} />
                    <label htmlFor="staff-end">Ora fine</label>
                    <input id="staff-end" type="time" required value={draft.end_time} onChange={(e) => setDraft({ ...draft, end_time: e.target.value })} />
                    <label htmlFor="staff-capacity">Capienza posti</label>
                    <input id="staff-capacity" type="number" min={1} max={100} required value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })} />
                    <label htmlFor="staff-note">Note interne (facoltative)</label>
                    <input id="staff-note" value={draft.internal_note} onChange={(e) => setDraft({ ...draft, internal_note: e.target.value })} />
                    <div className="staff-actions">
                      <button type="submit" className="clay-button small" disabled={busy}>
                        {editingId ? "Salva fascia" : "Aggiungi fascia"}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(emptySlot);
                          }}
                        >
                          Annulla modifica
                        </button>
                      )}
                    </div>
                  </form>
                  <h3 className="booking-subtitle">Fasce pubblicate</h3>
                  {slots.length === 0 ? (
                    <p className="booking-note">Nessuna fascia pubblicata. Dai, aggiungine una.</p>
                  ) : (
                    <ul className="staff-list">
                      {slots.map((slot) => (
                        <li key={slot.id}>
                          <span>
                            {slot.date} · {hhmm(slot.start_time)}–{hhmm(slot.end_time)} · {takenFor(slot.id)}/{slot.capacity}
                          </span>
                          <span className="staff-actions">
                            <button
                              type="button"
                              className="text-link"
                              onClick={() => {
                                setEditingId(slot.id);
                                setDraft({
                                  date: slot.date,
                                  start_time: hhmm(slot.start_time),
                                  end_time: hhmm(slot.end_time),
                                  capacity: slot.capacity,
                                  internal_note: slot.internal_note,
                                });
                              }}
                            >
                              Modifica
                            </button>
                            <button type="button" className="text-link" onClick={() => void deleteSlot(slot)}>
                              Elimina
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {tab === "reservations" && (
                <>
                  <h3 className="booking-subtitle">Prenotazioni</h3>
                  {reservations.length === 0 ? (
                    <p className="booking-note">Nessuna prenotazione ancora.</p>
                  ) : (
                    <ul className="staff-list">
                      {reservations.map((r) => {
                        const slot = slotById.get(r.slot_id);
                        const statusLabel =
                          r.status === "confirmed" ? "Confermata" : r.status === "cancelled" ? "Annullata" : "Passata";
                        return (
                          <li key={r.id}>
                            <span>
                              {slot ? `${slot.date} ${hhmm(slot.start_time)}` : ""} · {r.name} · {r.people} pers. ·{" "}
                              <a href={`mailto:${r.email}`}>{r.email}</a> · {r.phone}
                              {r.notes ? ` — ${r.notes}` : ""} [{statusLabel}] · {r.code}
                            </span>
                            <span className="staff-actions">
                              {r.status === "confirmed" && (
                                <button type="button" className="text-link" onClick={() => void setReservationStatus(r, "attended")}>
                                  Segna come passata
                                </button>
                              )}
                              {r.status !== "cancelled" && (
                                <button type="button" className="text-link" onClick={() => void setReservationStatus(r, "cancelled")}>
                                  Annulla prenotazione
                                </button>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}

              {tab === "hours" && (
                <form className="editorial-form staff-form" onSubmit={(event) => void saveHours(event)}>
                  <h3>Orari di apertura settimanali</h3>
                  {hours.map((h, index) => (
                    <fieldset key={h.day_of_week} className="staff-day">
                      <legend>{WEEKDAYS[h.day_of_week - 1]}</legend>
                      <label className="consent-label">
                        <input
                          type="checkbox"
                          checked={h.is_open}
                          onChange={(event) => {
                            const next = [...hours];
                            next[index] = { ...h, is_open: event.target.checked };
                            setHours(next);
                          }}
                        />
                        <span>Aperto</span>
                      </label>
                      {h.is_open && (
                        <>
                          <label>
                            Mattina dalle
                            <input
                              type="time"
                              value={h.morning_start ?? ""}
                              onChange={(event) => {
                                const next = [...hours];
                                next[index] = { ...h, morning_start: event.target.value || null };
                                setHours(next);
                              }}
                            />
                          </label>
                          <label>
                            alle
                            <input
                              type="time"
                              value={h.morning_end ?? ""}
                              onChange={(event) => {
                                const next = [...hours];
                                next[index] = { ...h, morning_end: event.target.value || null };
                                setHours(next);
                              }}
                            />
                          </label>
                          <label>
                            Pomeriggio dalle
                            <input
                              type="time"
                              value={h.afternoon_start ?? ""}
                              onChange={(event) => {
                                const next = [...hours];
                                next[index] = { ...h, afternoon_start: event.target.value || null };
                                setHours(next);
                              }}
                            />
                          </label>
                          <label>
                            alle
                            <input
                              type="time"
                              value={h.afternoon_end ?? ""}
                              onChange={(event) => {
                                const next = [...hours];
                                next[index] = { ...h, afternoon_end: event.target.value || null };
                                setHours(next);
                              }}
                            />
                          </label>
                        </>
                      )}
                    </fieldset>
                  ))}
                  <label htmlFor="staff-email">Email per le notifiche</label>
                  <input
                    id="staff-email"
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(event) => setStaffEmail(event.target.value)}
                  />
                  <button type="submit" className="clay-button small" disabled={busy}>
                    Salva tutto
                  </button>
                </form>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
