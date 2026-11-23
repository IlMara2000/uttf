#!/usr/bin/env node
/**
 * Dati di prova per l'archivio iscrizioni (solo ambiente di test/staging).
 *
 * Crea un account staff di test e cinque cartelle con gli stati che servono a
 * provare filtro «Solo da chiudere», banner e azioni multiple:
 * due `received` vecchie (oltre 12 mesi), una `received` recente, una
 * `declined` e una `reviewed`. Le righe usano id fissi e nomi con prefisso
 * «Prova Archivio», così si riconoscono e si cancellano senza toccare dati
 * veri.
 *
 * Uso (la chiave service_role resta in locale, mai nel repository):
 *
 *   node --env-file=.env.local scripts/seed-archive-test.mjs \
 *     --email staff.test@example.test --password 'una-password-di-prova'
 *
 *   node --env-file=.env.local scripts/seed-archive-test.mjs --clean
 *
 * `--clean` rimuove le cinque cartelle, la riga in `authorized_users` e
 * l'account Auth dell'email indicata (o quella di default).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).",
  );
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const clean = args.includes("--clean");
const email = (flag("email") || "staff.test@example.test").toLowerCase();
const password = flag("password");

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();
const id = (n) => `7e570000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const config = {
  kind: "workshop",
  open: false,
  schedule: "Sabato 15:00-17:00 (dati di prova)",
  location: "Sede UTTF (dati di prova)",
  materials: "Nessuno (dati di prova)",
  fee: "Gratuito (dati di prova)",
  allowMinors: true,
  signedDocument: false,
  pickup: false,
  questions: [
    { id: "prova-0", label: "Domanda di prova", required: false },
  ],
  instructions: "Istruzioni di prova.",
  participation: "Testo di partecipazione di prova.",
  privacy: "Informativa di prova: nessun dato reale.",
  media: "Consenso foto/video di prova.",
};
const answers = (firstName) => ({
  firstName,
  lastName: "Archivio",
  birthDate: "1990-05-12",
  email: "prova.archivio@example.test",
  phone: "+39 000 0000000",
  guardianName: "",
  guardianCapacity: "",
  pickupName: "",
  pickupPhone: "",
  answers: { "prova-0": "Risposta di prova" },
  privacyRead: true,
  participationAccepted: true,
  mediaConsent: false,
  guardianDeclaration: false,
});

const rows = [
  { n: 1, name: "Prova Archivio Uno", status: "received", created: daysAgo(420) },
  { n: 2, name: "Prova Archivio Due", status: "received", created: daysAgo(400) },
  { n: 3, name: "Prova Archivio Tre", status: "received", created: daysAgo(15) },
  { n: 4, name: "Prova Archivio Quattro", status: "declined", created: daysAgo(120) },
  { n: 5, name: "Prova Archivio Cinque", status: "reviewed", created: daysAgo(200) },
].map((row) => ({
  id: id(row.n),
  created_at: row.created,
  lab_slug: "rap-fcktory",
  activity_title: "RAP_F*CKTORY · dati di prova",
  participant_name: row.name,
  status: row.status,
  submission_hash: `seed-archivio-prova-${row.n}`,
  snapshot: {
    responses: answers(row.name.split(" ")[2] || "Prova"),
    config,
    version: 1,
  },
  files: [],
}));

async function findUser() {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function remove() {
  const { error: rowsError } = await client
    .from("activity_registrations")
    .delete()
    .in("id", rows.map((row) => row.id));
  if (rowsError) throw rowsError;
  const { error: allowError } = await client
    .from("authorized_users")
    .delete()
    .eq("email", email);
  if (allowError) throw allowError;
  const user = await findUser();
  if (user) {
    const { error } = await client.auth.admin.deleteUser(user.id);
    if (error) throw error;
  }
  console.log(`Rimosse 5 cartelle di prova, ${email} e il suo account Auth.`);
}

async function seed() {
  if (!password || password.length < 12) {
    console.error("Serve --password con almeno 12 caratteri.");
    process.exit(1);
  }
  const existing = await findUser();
  if (existing) {
    const { error } = await client.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Account esistente aggiornato: ${email}`);
  } else {
    const { error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Account staff creato: ${email}`);
  }
  const { error: allowError } = await client
    .from("authorized_users")
    .upsert({ email, role: "staff" }, { onConflict: "email" });
  if (allowError) throw allowError;

  const { error: rowsError } = await client
    .from("activity_registrations")
    .upsert(rows, { onConflict: "id" });
  if (rowsError) throw rowsError;
  console.log(
    "Create 5 cartelle di prova: 2 in attesa da oltre 12 mesi, 1 recente, 1 non accolta, 1 verificata.",
  );
  console.log("Apri /dashboard/iscrizioni con l'account di test.");
}

try {
  if (clean) await remove();
  else await seed();
} catch (e) {
  console.error("Operazione non riuscita:", e instanceof Error ? e.message : e);
  process.exit(1);
}
