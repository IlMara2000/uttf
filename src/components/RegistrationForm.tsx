"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ageOn,
  configOf,
  configError,
  validateAnswers,
  type RegistrationAnswers,
} from "@/lib/registrations/model";
import type { LabCategory } from "@/app/labs/lab-data";
export default function RegistrationForm({
  lab,
  ready,
  preview = false,
}: {
  lab: LabCategory;
  ready: boolean;
  preview?: boolean;
}) {
  const c = configOf(lab.registration_config);
  const [a, setA] = useState<RegistrationAnswers>({
    firstName: "",
    lastName: "",
    birthDate: "",
    email: "",
    phone: "",
    guardianName: "",
    guardianCapacity: "Genitore",
    pickupName: "",
    pickupPhone: "",
    answers: {},
    privacyRead: false,
    participationAccepted: false,
    mediaConsent: false,
    guardianDeclaration: false,
  });
  const [id] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [website, setWebsite] = useState("");
  const age = ageOn(a.birthDate);
  const minor = age >= 0 && age < 18;
  const signed = minor || c.signedDocument;
  const set = (key: keyof RegistrationAnswers, value: unknown) => {
    setA((old) => ({ ...old, [key]: value }));
    setFile(null);
  };
  async function pdf() {
    setError("");
    try {
      const answers = validateAnswers(a, c);
      const { authorizationPdf } = await import("@/lib/registrations/document");
      const fontResponse = await fetch("/fonts/NotoSans-Regular.ttf");
      if (!fontResponse.ok)
        throw new Error("Documento non disponibile. Riprova.");
      const bytes = await authorizationPdf(
        answers,
        c,
        lab.title,
        new Uint8Array(await fontResponse.arrayBuffer()),
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "autorizzazione-UTTF.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Compila prima i dati richiesti.",
      );
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (preview) {
      setError("Anteprima: nessuna iscrizione viene inviata.");
      return;
    }
    setError("");
    try {
      validateAnswers(a, c);
      if (signed && !file) throw new Error("Allega il documento firmato.");
      setBusy(true);
      const attachment = file
        ? await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error("Impossibile leggere il file."));
            r.readAsDataURL(file);
          })
        : undefined;
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          slug: lab.slug,
          version: lab.version,
          responses: a,
          attachment,
          website,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invio non riuscito.");
      setDone(data.reference);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invio non riuscito. Riprova.");
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <section className="registration-form" role="status">
        <span className="eyebrow">Richiesta ricevuta</span>
        <h2>Ci sei quasi.</h2>
        <p>
          Lo staff verificherà l’iscrizione e gli allegati e ti contatterà ai
          recapiti indicati. Il posto sarà confermato dallo staff.
        </p>
        <p>
          Conserva il riferimento: <strong>{done}</strong>
        </p>
        <Link className="text-link" href="/labs">
          Torna alle attività
        </Link>
      </section>
    );
  if (!preview && (!ready || !lab.active || !c.open || configError(c)))
    return (
      <section className="registration-form">
        <h2>Iscrizioni non aperte.</h2>
        <p>
          Il modulo per questa attività è in preparazione oppure le iscrizioni
          sono chiuse.
        </p>
        <a className="text-link" href="mailto:ass.uttf@gmail.com">
          Contatta la Factory
        </a>
      </section>
    );
  const field = (
    key: keyof RegistrationAnswers,
    label: string,
    type = "text",
    required = true,
    maxLength = 160,
  ) => (
    <label key={key}>
      {label}
      {required ? " *" : ""}
      <input
        type={type}
        required={required}
        maxLength={maxLength}
        value={String(a[key])}
        onChange={(e) => set(key, e.target.value)}
        autoComplete={
          key === "firstName"
            ? "given-name"
            : key === "lastName"
              ? "family-name"
              : key === "email"
                ? "email"
                : key === "phone"
                  ? "tel"
                  : "off"
        }
      />
    </label>
  );
  return (
    <form className="registration-form" onSubmit={submit}>
      <span className="eyebrow">
        {preview ? "Anteprima · nessun invio" : "La tua iscrizione"}
      </span>
      <h2>Facciamo spazio a te.</h2>
      <p>{c.instructions}</p>
      <dl className="registration-info">
        {[
          ["Quando", c.schedule],
          ["Dove", c.location],
          ["Costi", c.fee],
          ["Materiali", c.materials],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>I campi contrassegnati con * sono obbligatori.</p>
      <fieldset disabled={busy}>
        <legend>1 / Partecipante</legend>
        <div className="registration-columns">
          {field("firstName", "Nome", "text", true, 80)}
          {field("lastName", "Cognome", "text", true, 80)}
          {field("birthDate", "Data di nascita", "date")}
        </div>
        {minor && (
          <div className="registration-minor">
            <h3>Compila come genitore o tutore</h3>
            {!c.allowMinors ? (
              <p role="alert">
                Questa attività non prevede iscrizioni di minori.
              </p>
            ) : (
              <>
                <p>
                  I recapiti seguenti devono essere quelli del genitore o
                  tutore.
                </p>
                {field("guardianName", "Nome e cognome del genitore / tutore")}
                <label>
                  Qualifica *
                  <select
                    value={a.guardianCapacity}
                    onChange={(e) => set("guardianCapacity", e.target.value)}
                  >
                    <option>Genitore</option>
                    <option>Tutore</option>
                  </select>
                </label>
                <label className="registration-check">
                  <input
                    type="checkbox"
                    required
                    checked={a.guardianDeclaration}
                    onChange={(e) =>
                      set("guardianDeclaration", e.target.checked)
                    }
                  />
                  Dichiaro di esercitare la responsabilità genitoriale o la
                  tutela e di agire nel rispetto delle regole applicabili al suo
                  esercizio, anche congiunto. *
                </label>
              </>
            )}
          </div>
        )}
        <div className="registration-columns">
          {field(
            "email",
            minor ? "Email del genitore / tutore" : "Email",
            "email",
            true,
            254,
          )}
          {field(
            "phone",
            minor ? "Telefono del genitore / tutore" : "Telefono",
            "tel",
            true,
            40,
          )}
        </div>
        {minor && c.pickup && (
          <>
            <h3>Eventuale delega al ritiro</h3>
            <p>
              Lascia vuoto se il ritiro avviene da parte di chi esercita la
              responsabilità genitoriale. La delega sarà inserita nel PDF da
              firmare.
            </p>
            {field(
              "pickupName",
              "Nome e cognome della persona delegata",
              "text",
              false,
            )}
            {field(
              "pickupPhone",
              "Telefono della persona delegata",
              "tel",
              !!a.pickupName,
              40,
            )}
          </>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>2 / La tua attività</legend>
        {c.questions.map((q) => (
          <label key={q.id}>
            {q.label}
            {q.required ? " *" : ""}
            <textarea
              required={q.required}
              maxLength={2000}
              value={a.answers[q.id] || ""}
              onChange={(e) =>
                set("answers", { ...a.answers, [q.id]: e.target.value })
              }
            />
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>3 / Condizioni e scelte</legend>
        <div className="registration-legal">{c.participation}</div>
        <label className="registration-check">
          <input
            type="checkbox"
            required
            checked={a.participationAccepted}
            onChange={(e) => set("participationAccepted", e.target.checked)}
          />
          Ho letto le condizioni e richiedo la partecipazione all’attività. *
        </label>
        <details>
          <summary>Leggi l’informativa sui dati personali *</summary>
          <p>{c.privacy}</p>
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Informativa del sito
          </a>
        </details>
        <label className="registration-check">
          <input
            type="checkbox"
            required
            checked={a.privacyRead}
            onChange={(e) => set("privacyRead", e.target.checked)}
          />
          Ho letto l’informativa sul trattamento dei dati personali. *
        </label>
        {c.media.trim() && (
          <>
            <div className="registration-legal">{c.media}</div>
            <label className="registration-check">
              <input
                type="checkbox"
                checked={a.mediaConsent}
                onChange={(e) => set("mediaConsent", e.target.checked)}
              />
              Acconsento a foto e video nei termini sopra indicati
              (facoltativo).
            </label>
          </>
        )}
      </fieldset>
      <fieldset disabled={busy}>
        <legend>4 / Documento e invio</legend>
        <p>
          {signed
            ? "Scarica il PDF con i dati e le scelte inserite, firmalo e caricalo qui. Se modifichi i dati o le scelte, scarica e firma nuovamente il documento aggiornato."
            : "Puoi scaricare un riepilogo da conservare. Per questa attività agli adulti non è richiesto allegare una firma."}
        </p>
        <button
          type="button"
          className="clay-button light"
          onClick={() => void pdf()}
        >
          Scarica il documento da firmare
        </button>
        {signed && (
          <label>
            Autorizzazione firmata *
            <input
              key={JSON.stringify(a)}
              type="file"
              required
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (
                  f &&
                  (!["application/pdf", "image/jpeg", "image/png"].includes(
                    f.type,
                  ) ||
                    f.size > 2 * 1024 * 1024)
                ) {
                  setError("Scegli PDF, JPG o PNG fino a 2 MB.");
                  setFile(null);
                  e.target.value = "";
                } else {
                  setFile(f || null);
                  setError("");
                }
              }}
            />
            <small>
              PDF, JPG o PNG, massimo 2 MB. Non allegare documenti di identità o
              dati sanitari.
            </small>
          </label>
        )}
        <label className="registration-trap" aria-hidden="true">
          Sito web
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="registration-error">
            {error}
          </p>
        )}
        <button
          className="clay-button"
          type="submit"
          disabled={busy || (minor && !c.allowMinors)}
        >
          {busy ? "Invio in corso…" : "Invia la richiesta"}
        </button>
      </fieldset>
    </form>
  );
}
