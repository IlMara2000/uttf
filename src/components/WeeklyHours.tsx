"use client";

import { useEffect, useState } from "react";
import { WEEKDAYS, hhmm, type WeeklyHour } from "@/lib/bookings/model";

export default function WeeklyHours() {
  const [hours, setHours] = useState<WeeklyHour[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("weekly_hours")
          .select("day_of_week, is_open, morning_start, morning_end, afternoon_start, afternoon_end")
          .order("day_of_week", { ascending: true });
        if (alive && !error) setHours((data ?? []) as WeeklyHour[]);
      } catch {
        /* tabella sotto: testo di fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const ranges = (h: WeeklyHour) => {
    const parts: string[] = [];
    if (h.morning_start && h.morning_end) parts.push(`${hhmm(h.morning_start)}–${hhmm(h.morning_end)}`);
    if (h.afternoon_start && h.afternoon_end) parts.push(`${hhmm(h.afternoon_start)}–${hhmm(h.afternoon_end)}`);
    return parts.join(" · ");
  };

  const allClosed = hours !== null && hours.every((h) => !h.is_open);

  return (
    <div className="weekly-hours" id="orari">
      <span className="eyebrow">Senza prenotazione</span>
      <h3>Quando siamo aperti.</h3>
      <p>Passa quando ti pare: qui non serve prenotare niente.</p>
      {hours === null ? (
        <p className="booking-note">Carico gli orari…</p>
      ) : allClosed ? (
        <p className="booking-note">
          Orari in aggiornamento. Scrivici a <a href="mailto:ass.uttf@gmail.com">ass.uttf@gmail.com</a> e ti
          diciamo quando siamo aperti.
        </p>
      ) : (
        <table className="weekly-hours-table">
          <thead>
            <tr>
              <th scope="col">Giorno</th>
              <th scope="col">Orario</th>
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h.day_of_week}>
                <th scope="row">{WEEKDAYS[h.day_of_week - 1]}</th>
                <td>{h.is_open ? ranges(h) || "Aperti — orari da aggiornare" : "Chiusi"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="booking-note">
        In occasione di eventi gli orari possono cambiare. Se vuoi andare sul sicuro, prenota uno slot o
        scrivici a <a href="mailto:ass.uttf@gmail.com">ass.uttf@gmail.com</a>.
      </p>
    </div>
  );
}
