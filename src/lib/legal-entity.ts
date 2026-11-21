/**
 * Dati del titolare del trattamento usati dalle pagine legali (privacy e termini).
 *
 * I campi vuoti non vengono inventati e non vengono stampati: se PEC, codice fiscale,
 * numero RUNTS o legale rappresentante non sono compilati, la riga corrispondente è
 * semplicemente omessa dalla pagina pubblicata.
 *
 * All'avvio del processo (build compresa) `warnMissingLegalFields()` scrive nei log
 * quali dati mancano, come promemoria per chi pubblica il sito.
 */
export const LEGAL_ENTITY = {
  name: "Under The Tower Factory",
  shortName: "UTTF",
  legalForm: "Associazione di promozione sociale",
  street: "Via dei Biancospini, 4",
  city: "20089 Rozzano (MI)",
  country: "Italia",
  email: "ass.uttf@gmail.com",
  pec: "",
  taxCode: "",
  vat: "",
  runts: "",
  legalRep: "",
  siteUrl: "https://uttf.vercel.app",
  privacyVersion: "2.1",
  privacyUpdated: "21 novembre 2026",
  cookieUpdated: "21 novembre 2026",
  termsUpdated: "19 novembre 2026",
  accessibilityUpdated: "19 novembre 2026",
};

export function legalAddress() {
  return `${LEGAL_ENTITY.street} — ${LEGAL_ENTITY.city}, ${LEGAL_ENTITY.country}`;
}

type LegalFieldKey = "taxCode" | "pec" | "runts" | "legalRep";

const LEGAL_FIELDS_TO_FILL: ReadonlyArray<{ key: LegalFieldKey; label: string }> = [
  { key: "taxCode", label: "codice fiscale" },
  { key: "pec", label: "PEC" },
  { key: "runts", label: "numero di iscrizione al RUNTS" },
  { key: "legalRep", label: "legale rappresentante" },
];

/** Etichette dei dati del titolare ancora vuoti in LEGAL_ENTITY. */
export function missingLegalFields(): string[] {
  return LEGAL_FIELDS_TO_FILL.filter(({ key }) => !LEGAL_ENTITY[key]?.trim()).map(
    ({ label }) => label,
  );
}

let warnedAboutMissingFields = false;

/** Scrive una sola volta nei log (build compresa) l'elenco dei dati da compilare. */
export function warnMissingLegalFields() {
  if (warnedAboutMissingFields) return;
  warnedAboutMissingFields = true;

  const missing = missingLegalFields();
  if (missing.length === 0) return;

  console.warn(
    `[legal-entity] Dati del titolare da compilare in src/lib/legal-entity.ts: ${missing.join(
      ", ",
    )}. Finché restano vuoti, le righe corrispondenti non compaiono in /privacy e /terms.`,
  );
}

warnMissingLegalFields();
