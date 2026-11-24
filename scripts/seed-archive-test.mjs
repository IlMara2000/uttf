#!/usr/bin/env node
/**
 * Dati di prova per l'archivio iscrizioni.
 *
 * Crea un account staff di test e cinque cartelle con gli stati che servono a
 * provare filtro «Solo da chiudere», banner, azioni multiple e download: due
 * `received` vecchie (oltre 12 mesi), una `received` recente, una `declined` e
 * una `reviewed`. Ogni cartella ha due allegati veri nel bucket
 * `registration-files` (`risposte.txt` e un PDF di prova), così funzionano sia
 * il download del singolo file sia la cartella ZIP.
 *
 * Le righe usano id fissi e nomi con prefisso «Prova Archivio»: si riconoscono
 * e si eliminano senza toccare dati veri.
 *
 * Sicurezza: lo script scrive e cancella davvero. Verso un target remoto
 * (qualunque host che non sia localhost) rifiuta di partire senza
 * `--production`, il flag che conferma che quel progetto remoto è quello di
 * prova e non l'ambiente con i dati veri.
 *
 * Uso (la chiave service_role resta in locale, mai nel repository). I flag con
 * valore accettano `--email=x` e `--email x`; un valore mancante, un flag
 * sconosciuto o un flag ripetuto fermano lo script prima di ogni connessione.
 *
 *   node --env-file=.env.local scripts/seed-archive-test.mjs --production \
 *     --email=staff.test@example.test --password 'una-password-di-prova'
 *
 *   node --env-file=.env.local scripts/seed-archive-test.mjs --production --clean
 *
 * `--clean` chiude la prova: elimina le cinque cartelle, i loro allegati dal
 * bucket, la riga in `authorized_users` e l'account Auth dell'email indicata,
 * poi verifica che non resti nulla, oggetti nel bucket compresi. Va lanciato a
 * verifica finita.
 */
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { checkSeedTarget, DEFAULT_EMAIL, parseArgs } from "./seed-args.mjs";

const BUCKET = "registration-files";

// I flag si leggono in seed-args.mjs (testato da tests/registrations.test.mjs):
// un valore mancante, un flag sconosciuto o ripetuto ferma lo script qui,
// prima di qualunque connessione.
const { values, problems } = parseArgs(process.argv.slice(2));
if (problems.length) {
  console.error(["Argomenti non validi:", ...problems.map((p) => `- ${p}`)].join("\n"));
  process.exit(1);
}
const clean = values.clean === true;
const confirmedRemote = values.production === true;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) {
  console.error("Serve NEXT_PUBLIC_SUPABASE_URL (usa --env-file=.env.local).");
  process.exit(1);
}
// La regola sta in seed-args.mjs (testata da tests/registrations.test.mjs) e
// scatta prima di qualunque connessione: nessuna scrittura verso un host
// remoto se `--production` non è stato dichiarato esplicitamente.
const { host, local, refusal } = checkSeedTarget(url, {
  production: confirmedRemote,
});
if (refusal) {
  console.error(refusal);
  process.exit(1);
}
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("Serve SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).");
  process.exit(1);
}
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = values.email ?? DEFAULT_EMAIL;
const password = values.password;

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();
const rowId = (n) => `7e570000-0000-4000-8000-${String(n).padStart(12, "0")}`;

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

const attachments = [
  { name: "risposte.txt", type: "text/plain" },
  { name: "autorizzazione-firmata.pdf", type: "application/pdf" },
];

const entries = [
  { n: 1, name: "Prova Archivio Uno", status: "received", created: daysAgo(420) },
  { n: 2, name: "Prova Archivio Due", status: "received", created: daysAgo(400) },
  { n: 3, name: "Prova Archivio Tre", status: "received", created: daysAgo(15) },
  { n: 4, name: "Prova Archivio Quattro", status: "declined", created: daysAgo(120) },
  { n: 5, name: "Prova Archivio Cinque", status: "reviewed", created: daysAgo(200) },
];

const rows = entries.map((row) => {
  const id = rowId(row.n);
  return {
    id,
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
    files: attachments.map((f) => ({ name: f.name, path: `${id}/${f.name}` })),
  };
});

function textPreview(row) {
  return Buffer.from(
    [
      "UTTF · dati di prova",
      "",
      `Cartella: ${row.participant_name}`,
      `Riferimento: ${row.id}`,
      "",
      "File creato dallo script di seed per provare il download dei singoli",
      "allegati e la cartella ZIP dell'archivio iscrizioni.",
      "Non contiene dati reali.",
      "",
    ].join("\n"),
    "utf8",
  );
}

async function pdfPreview(row) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  const lines = [
    "UTTF - documento di prova",
    "",
    `Cartella: ${row.participant_name}`,
    `Riferimento: ${row.id}`,
    "",
    "Questo PDF non e' un'autorizzazione firmata: serve solo a provare il",
    "download del singolo allegato e la cartella ZIP dell'archivio.",
  ];
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 60,
      y: 780 - index * 22,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  });
  return Buffer.from(await pdf.save());
}

function reportTarget() {
  console.log(
    `Progetto Supabase: ${host}${local ? " (locale)" : " (remoto, confermato con --production)"}`,
  );
  console.log(`Email di prova: ${email}`);
}

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

async function listObjects(row) {
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(row.id, { limit: 100 });
  if (error) throw error;
  return (data ?? []).map((o) => `${row.id}/${o.name}`);
}

async function remove() {
  reportTarget();
  let stored = 0;
  for (const row of rows) {
    const paths = await listObjects(row);
    if (!paths.length) continue;
    const { error } = await client.storage.from(BUCKET).remove(paths);
    if (error) throw error;
    stored += paths.length;
  }
  const { data: deleted, error: rowsError } = await client
    .from("activity_registrations")
    .delete()
    .in(
      "id",
      rows.map((row) => row.id),
    )
    .select("id");
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

  // Verifica finale: la chiusura della prova deve lasciare zero tracce.
  const { count: leftRows, error: rowsCheckError } = await client
    .from("activity_registrations")
    .select("id", { count: "exact", head: true })
    .in(
      "id",
      rows.map((row) => row.id),
    );
  if (rowsCheckError) throw rowsCheckError;
  if (leftRows)
    throw new Error(`restano ${leftRows} cartelle di prova: chiusura incompleta.`);
  const { count: leftAccess, error: accessCheckError } = await client
    .from("authorized_users")
    .select("email", { count: "exact", head: true })
    .eq("email", email);
  if (accessCheckError) throw accessCheckError;
  if (leftAccess)
    throw new Error(`${email} è ancora in authorized_users: chiusura incompleta.`);
  if (await findUser())
    throw new Error(`l'account Auth ${email} esiste ancora: chiusura incompleta.`);
  const leftObjects = [];
  for (const row of rows) leftObjects.push(...(await listObjects(row)));
  if (leftObjects.length)
    throw new Error(
      `restano ${leftObjects.length} oggetti di prova nel bucket ${BUCKET} (${leftObjects.join(", ")}): chiusura incompleta.`,
    );

  console.log(
    `Cartelle di prova rimosse: ${deleted?.length ?? 0} su ${rows.length}.`,
  );
  console.log(`Allegati rimossi da ${BUCKET}: ${stored}.`);
  console.log(`Bucket ${BUCKET}: nessun oggetto di prova rimasto.`);
  console.log(
    `Accesso staff rimosso${user ? " e account Auth eliminato" : " (account Auth assente)"}: ${email}.`,
  );
  console.log("Verifica finale superata: della prova non resta nulla.");
}

async function seed() {
  if (!password || password.length < 12) {
    console.error("Serve --password con almeno 12 caratteri.");
    process.exit(1);
  }
  reportTarget();
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

  // Gli allegati si caricano prima delle righe: così nessuna cartella punta a
  // file che nel bucket non esistono.
  for (const row of rows) {
    const bodies = [
      [attachments[0].name, attachments[0].type, textPreview(row)],
      [attachments[1].name, attachments[1].type, await pdfPreview(row)],
    ];
    for (const [name, type, bytes] of bodies) {
      const { error } = await client.storage
        .from(BUCKET)
        .upload(`${row.id}/${name}`, bytes, { contentType: type, upsert: true });
      if (error) throw error;
    }
  }
  console.log(
    `Caricati 2 allegati di prova (risposte.txt e PDF) in ciascuna delle 5 cartelle.`,
  );

  const { error: rowsError } = await client
    .from("activity_registrations")
    .upsert(rows, { onConflict: "id" });
  if (rowsError) throw rowsError;
  console.log(
    "Create 5 cartelle di prova: 2 in attesa da oltre 12 mesi, 1 recente, 1 non accolta, 1 verificata.",
  );
  console.log("Apri /dashboard/iscrizioni con l'account di test.");
  console.log(
    `A verifica finita chiudi la prova con: --clean (rimuove cartelle, allegati e account ${email}).`,
  );
}

try {
  if (clean) await remove();
  else await seed();
} catch (e) {
  console.error("Operazione non riuscita:", e instanceof Error ? e.message : e);
  process.exit(1);
}
