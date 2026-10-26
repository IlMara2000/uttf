"use client";
import {
  defaultConfig,
  formKinds,
  type RegistrationConfig,
  type FormKind,
} from "@/lib/registrations/model";
export default function RegistrationSettings({
  value: c,
  onChange,
}: {
  value: RegistrationConfig;
  onChange: (c: RegistrationConfig) => void;
}) {
  const set = (key: keyof RegistrationConfig, value: unknown) =>
    onChange({ ...c, [key]: value });
  return (
    <section className="registration-settings">
      <h3>Modulo di iscrizione</h3>
      <p>
        Il modulo e il documento vengono generati per questa attività. I testi
        qui sotto sono modelli da adattare a organizzazione, condizioni e
        informativa dell’associazione prima di aprire le iscrizioni.
      </p>
      <label>
        Tipo di attività
        <select
          value={c.kind}
          onChange={(e) => {
            const kind = e.target.value as FormKind;
            onChange({ ...c, kind, questions: defaultConfig(kind).questions });
          }}
        >
          {Object.entries(formKinds).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>
        Cambiando tipo vengono sostituite le domande suggerite. I testi
        organizzativi e le autorizzazioni restano.
      </p>
      {(
        [
          ["schedule", "Date, orari e programma"],
          ["location", "Luogo e organizzazione degli spostamenti"],
          ["fee", "Costo / gratuità e condizioni"],
          ["materials", "Materiali forniti e da portare"],
          ["instructions", "Istruzioni per chi compila"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <textarea
            maxLength={8000}
            value={c[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </label>
      ))}
      <label className="registration-check">
        <input
          type="checkbox"
          checked={c.allowMinors}
          onChange={(e) => set("allowMinors", e.target.checked)}
        />{" "}
        Consenti partecipanti minorenni (autorizzazione firmata obbligatoria)
      </label>
      <label className="registration-check">
        <input
          type="checkbox"
          checked={c.signedDocument}
          onChange={(e) => set("signedDocument", e.target.checked)}
        />{" "}
        Richiedi documento firmato anche agli adulti
      </label>
      <label className="registration-check">
        <input
          type="checkbox"
          checked={c.pickup}
          onChange={(e) => set("pickup", e.target.checked)}
        />{" "}
        Consenti la delega a una persona per il ritiro del minore
      </label>
      <h3>Domande specifiche</h3>
      {c.questions.map((q, i) => (
        <div className="registration-question" key={q.id}>
          <label>
            Domanda {i + 1}
            <input
              value={q.label}
              maxLength={300}
              onChange={(e) =>
                set(
                  "questions",
                  c.questions.map((x) =>
                    x.id === q.id ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label className="registration-check">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) =>
                set(
                  "questions",
                  c.questions.map((x) =>
                    x.id === q.id ? { ...x, required: e.target.checked } : x,
                  ),
                )
              }
            />
            Obbligatoria
          </label>
          <button
            type="button"
            onClick={() =>
              set(
                "questions",
                c.questions.filter((x) => x.id !== q.id),
              )
            }
          >
            Rimuovi domanda
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={c.questions.length >= 15}
        onClick={() =>
          set("questions", [
            ...c.questions,
            { id: crypto.randomUUID(), label: "", required: false },
          ])
        }
      >
        + Aggiungi domanda
      </button>
      <h3>Condizioni e documenti</h3>
      <p>
        Non inserire richieste di dati sanitari nelle domande libere. Il PDF
        contiene i dettagli dell’attività, il partecipante, il genitore/tutore
        quando necessario, la scelta foto/video, l’eventuale delega al ritiro e
        gli spazi per le firme.
      </p>
      {(
        [
          ["participation", "Condizioni e autorizzazione alla partecipazione"],
          [
            "privacy",
            "Informativa specifica (includi conservazione, fornitori e trasferimenti applicabili)",
          ],
          [
            "media",
            "Consenso facoltativo foto/video (lascia vuoto per non raccoglierlo)",
          ],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <textarea
            rows={7}
            maxLength={8000}
            value={c[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </label>
      ))}
      <label className="registration-check">
        <input
          type="checkbox"
          checked={c.open}
          onChange={(e) => set("open", e.target.checked)}
        />{" "}
        Apri le iscrizioni: programma e testi sono stati verificati per questa
        attività
      </label>
    </section>
  );
}
