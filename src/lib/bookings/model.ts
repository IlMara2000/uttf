// Logica pura e condivisa per le prenotazioni degli slot.

export type BookingSlot = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string;
  capacity: number;
  taken?: number;
};

export type WeeklyHour = {
  day_of_week: number; // 1 = lunedì ... 7 = domenica
  is_open: boolean;
  morning_start: string | null;
  morning_end: string | null;
  afternoon_start: string | null;
  afternoon_end: string | null;
};

export type BookingForm = {
  name: string;
  email: string;
  phone: string;
  people: number;
  notes: string;
  privacy: boolean;
};

export const WEEKDAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

export function hhmm(time: string) {
  return time.slice(0, 5);
}

export function formatDay(dateStr: string) {
  // Evita off-by-one timezone: interpreta la data come locale facendo split.
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const weekday = WEEKDAYS[(d.getDay() + 6) % 7];
  const monthName = d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
  return `${weekday} ${day} ${monthName}`;
}

export function formatRange(slot: BookingSlot) {
  return `${hhmm(slot.start_time)}–${hhmm(slot.end_time)}`;
}

export function validateBookingForm(form: BookingForm): string | null {
  if (!form.name.trim())
    return "Eh, senza nome non riusciamo a prenotarti.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    return "Controlla l'email, credo ci manchi qualcosa.";
  if (form.phone.replace(/[\s.+()-]/g, "").length < 6)
    return "Il numero non torna. Dai un'occhiata?";
  if (!Number.isInteger(form.people) || form.people < 1 || form.people > 20)
    return "Quante persone siete? Metti un numero tra 1 e 20.";
  if (!form.privacy)
    return "Ci serve l'ok per l'informativa privacy.";
  return null;
}
