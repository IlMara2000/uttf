#!/usr/bin/env node
/**
 * Giro di retention in sola lettura sui dati veri.
 *
 * Usa `runRetention` (`src/lib/retention.ts`) con `enabled: false` esplicito:
 * conta le righe idonee, non cancella nulla e non scrive nel bucket delle
 * tracce. Non legge `RETENTION_ENABLED`, quindi non può diventare distruttivo
 * nemmeno se l'ambiente locale lo ha impostato a `true`.
 *
 * Serve a verificare query, paginazione e keyset contro il database di
 * produzione senza passare dalla route, quindi senza `CRON_SECRET`.
 *
 *   node --env-file=.env.local scripts/retention-dry-run.mjs
 *   node --env-file=.env.local scripts/retention-dry-run.mjs --json
 *
 * Esce 0 quando il giro non segnala errori (anche se `deferred` è true), 1 se
 * una fase fallisce o se il report non è in modalità dry-run.
 *
 * Richiede Node ≥ 22.18: importa il `.ts` del progetto direttamente, come
 * `scripts/check-registration-files.mjs`.
 */
import { createClient } from "@supabase/supabase-js";
import { runRetention } from "../src/lib/retention.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Servono NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).",
  );
  process.exit(1);
}

const asJson = process.argv.includes("--json");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Etichette leggibili: le chiavi del report sono quelle delle tabelle. */
const labels = {
  newsletterSubscribers: "Newsletter",
  bookingReservations: "Prenotazioni",
  reviews: "Recensioni",
  activityRegistrations: "Iscrizioni non accolte",
  registrationFiles: "Allegati delle iscrizioni",
  bookingRateLimits: "Rate limit prenotazioni",
  registrationRateLimits: "Rate limit iscrizioni",
};

try {
  const report = await runRetention(client, { enabled: false });

  // Rete di sicurezza: questo script non deve mai poter cancellare.
  if (report.mode !== "dry-run") {
    console.error(`Modalità inattesa: ${report.mode}. Nessuna cancellazione eseguita.`);
    process.exitCode = 1;
  } else if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.errors.length > 0 ? 1 : 0;
  } else {
    const rows = Object.entries(labels);
    const width = Math.max(...rows.map(([, label]) => label.length));
    console.log(
      `Retention in sola lettura (enabled: false) — ${report.executedAt}\n`,
    );
    for (const [name, label] of rows) {
      console.log(`${label.padEnd(width)}  ${report.deleted[name]}`);
    }
    const total = Object.values(report.deleted).reduce((sum, value) => sum + value, 0);
    console.log(`${"Totale".padEnd(width)}  ${total}`);

    // `deferred`: il giro si è fermato al limite di blocchi, i conteggi sono
    // parziali. Non è un errore, ma va detto.
    console.log(
      `\nGiri rimandati (deferred): ${report.deferred ? "sì, limite di blocchi raggiunto" : "no"}`,
    );
    if (report.errors.length > 0) {
      console.log("Errori:");
      for (const error of report.errors) console.log(`  - ${error}`);
    } else {
      console.log("Errori: nessuno");
    }
    process.exitCode = report.errors.length > 0 ? 1 : 0;
  }
} catch (error) {
  console.error(
    "Giro non riuscito:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
}
