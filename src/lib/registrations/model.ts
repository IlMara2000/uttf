export const formKinds = {
  workshop: "Laboratorio",
  event: "Evento",
  external: "Attività esterna",
  volunteer: "Collaborazione / volontariato",
} as const;
export type FormKind = keyof typeof formKinds;
export type Question = { id: string; label: string; required: boolean };
export type RegistrationConfig = {
  kind: FormKind;
  open: boolean;
  schedule: string;
  location: string;
  materials: string;
  fee: string;
  allowMinors: boolean;
  signedDocument: boolean;
  pickup: boolean;
  questions: Question[];
  instructions: string;
  participation: string;
  privacy: string;
  media: string;
};
export const defaultPrivacy =
  "Under The Tower Factory, contattabile a ass.uttf@gmail.com, tratta i dati di questo modulo per gestire la richiesta di partecipazione, le comunicazioni organizzative e le autorizzazioni collegate. La base giuridica è la gestione della richiesta e del rapporto di partecipazione (art. 6.1.b GDPR); gli eventuali adempimenti di legge sono trattati secondo l’art. 6.1.c. I dati obbligatori sono necessari per gestire la richiesta. Il consenso per foto e video è separato e facoltativo: il rifiuto non impedisce di partecipare. Accedono ai dati solo lo staff autorizzato e i fornitori tecnici del sito, dell’hosting e dell’archiviazione, nei rispettivi ruoli. Le richieste non accolte sono conservate fino a 12 mesi dalla chiusura dell’attività; le iscrizioni accolte e le autorizzazioni per il periodo necessario alla gestione e agli obblighi amministrativi applicabili, da specificare per l’attività. Puoi chiedere accesso, rettifica, cancellazione nei casi previsti, limitazione, portabilità ove applicabile, opposizione e revocare i consensi facoltativi scrivendo all’associazione. Puoi proporre reclamo al Garante per la protezione dei dati personali. Non sono previste decisioni automatizzate. Consulta anche l’informativa del sito per i dettagli sui fornitori e sugli eventuali trasferimenti fuori dallo SEE.";
export function defaultConfig(kind: FormKind = "workshop"): RegistrationConfig {
  const labels =
    kind === "workshop"
      ? [
          "Hai già esperienza in questa attività?",
          "Che cosa vorresti imparare o realizzare?",
        ]
      : kind === "event"
        ? ["A quale appuntamento o turno vuoi partecipare?"]
        : kind === "external"
          ? [
              "A quale appuntamento esterno vuoi partecipare?",
              "Come raggiungerai il luogo dell’attività?",
            ]
          : [
              "Quali competenze o interessi vuoi mettere a disposizione?",
              "Quali giorni e orari hai a disposizione?",
            ];
  return {
    kind,
    open: false,
    schedule: "",
    location: "",
    materials: "",
    fee: "",
    allowMinors: true,
    signedDocument: false,
    pickup: false,
    questions: labels.map((label, i) => ({
      id: `${kind}-${i}`,
      label,
      required: i === 0,
    })),
    instructions:
      "Compila una richiesta per ogni partecipante. L’invio non conferma automaticamente il posto: lo staff ti contatterà dopo la verifica. Non inserire dati sanitari o copie di documenti di identità nei campi liberi.",
    participation:
      "Chiedo la partecipazione all’attività indicata, dopo aver letto programma, luogo, orari, costi e materiali richiesti. Mi impegno a rispettare le indicazioni organizzative e le regole di utilizzo degli spazi e dei materiali. Per un partecipante minorenne, la richiesta e l’autorizzazione devono essere rese da chi esercita la responsabilità genitoriale o dal tutore. Questa autorizzazione non comporta una rinuncia ai diritti del partecipante né esonera gli organizzatori dalle responsabilità previste dalla legge.",
    privacy: defaultPrivacy,
    media:
      "Acconsento facoltativamente alla realizzazione e pubblicazione di fotografie e video che mi ritraggono durante questa attività, per documentarla e comunicarla sul sito uttf.vercel.app e sui canali social ufficiali Under The Tower Factory indicati nella pagina Contatti. Il consenso non comprende la cessione a terzi per finalità pubblicitarie estranee all’associazione. Posso revocarlo per gli utilizzi futuri scrivendo a ass.uttf@gmail.com. Per i minori, questa scelta deve essere confermata nell’autorizzazione firmata da chi esercita la responsabilità genitoriale o dal tutore.",
  };
}
export function configOf(value: unknown): RegistrationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return defaultConfig();
  const v = value as RegistrationConfig;
  const base = defaultConfig(
    Object.hasOwn(formKinds, v.kind) ? v.kind : "workshop",
  );
  return {
    ...base,
    ...v,
    questions: Array.isArray(v.questions) ? v.questions : base.questions,
  };
}
export function configError(c: RegistrationConfig): string | null {
  if (!Object.hasOwn(formKinds, c.kind))
    return "Scegli un tipo di modulo valido.";
  for (const key of [
    "schedule",
    "location",
    "materials",
    "fee",
    "instructions",
    "participation",
    "privacy",
    "media",
  ] as const)
    if (typeof c[key] !== "string" || c[key].length > 8000)
      return "Testo non valido o troppo lungo.";
  if (
    ["open", "allowMinors", "signedDocument", "pickup"].some(
      (key) => typeof c[key as keyof RegistrationConfig] !== "boolean",
    )
  )
    return "Configurazione del modulo non valida.";
  if (
    c.questions.length > 15 ||
    c.questions.some(
      (q) =>
        !q ||
        typeof q.required !== "boolean" ||
        typeof q.label !== "string" ||
        !q.id ||
        !q.label.trim() ||
        q.label.length > 300 ||
        !/^[a-z0-9-]{1,80}$/.test(q.id),
    ) ||
    new Set(c.questions.map((q) => q.id)).size !== c.questions.length
  )
    return "Controlla le domande aggiuntive (massimo 15).";
  if (
    c.open &&
    [
      c.schedule,
      c.location,
      c.fee,
      c.materials,
      c.participation,
      c.privacy,
    ].some((v) => !v.trim())
  )
    return "Per aprire le iscrizioni indica orari, luogo, costi (anche “gratuito”), materiali (anche “nessuno”), condizioni e informativa.";
  return null;
}
export type RegistrationAnswers = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianCapacity: string;
  pickupName: string;
  pickupPhone: string;
  answers: Record<string, string>;
  privacyRead: boolean;
  participationAccepted: boolean;
  mediaConsent: boolean;
  guardianDeclaration: boolean;
};
export function ageOn(birthDate: string, today = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return -1;
  const d = new Date(`${birthDate}T12:00:00Z`);
  if (
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== birthDate
  )
    return -1;
  const now = today.toISOString().slice(0, 10);
  const year = Number(now.slice(0, 4));
  const age =
    year -
    Number(birthDate.slice(0, 4)) -
    (now.slice(5) < birthDate.slice(5) ? 1 : 0);
  return age >= 0 && age <= 120 && birthDate <= now ? age : -1;
}
export function validateAnswers(
  value: unknown,
  c: RegistrationConfig,
): RegistrationAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Risposte non valide.");
  const v = value as Record<string, unknown>;
  const s = (key: string, max = 160) => {
    const x = v[key];
    if (
      x !== undefined &&
      (typeof x !== "string" ||
        x.length > max ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))
    )
      throw new Error("Campo non valido.");
    return typeof x === "string" ? x.trim() : "";
  };
  const a: RegistrationAnswers = {
    firstName: s("firstName", 80),
    lastName: s("lastName", 80),
    birthDate: s("birthDate", 10),
    email: s("email", 254),
    phone: s("phone", 40),
    guardianName: s("guardianName"),
    guardianCapacity: s("guardianCapacity", 80),
    pickupName: s("pickupName"),
    pickupPhone: s("pickupPhone", 40),
    answers: {},
    privacyRead: v.privacyRead === true,
    participationAccepted: v.participationAccepted === true,
    mediaConsent: v.mediaConsent === true,
    guardianDeclaration: v.guardianDeclaration === true,
  };
  const age = ageOn(a.birthDate);
  if (
    !a.firstName ||
    !a.lastName ||
    age < 0 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) ||
    !/^[+\d ()-]{6,40}$/.test(a.phone)
  )
    throw new Error("Controlla nome, cognome, data di nascita e recapiti.");
  if (!a.privacyRead || !a.participationAccepted)
    throw new Error(
      "Leggi l’informativa e conferma la richiesta di partecipazione.",
    );
  if (
    age < 18 &&
    (!c.allowMinors ||
      !a.guardianName ||
      !["Genitore", "Tutore"].includes(a.guardianCapacity) ||
      !a.guardianDeclaration)
  )
    throw new Error(
      "Per i minori serve la compilazione del genitore o tutore e la relativa dichiarazione.",
    );
  if (age >= 18) {
    a.guardianName = "";
    a.guardianCapacity = "";
    a.guardianDeclaration = false;
  }
  if (!c.pickup || age >= 18) {
    a.pickupName = "";
    a.pickupPhone = "";
  }
  if (a.pickupName && !/^[+\d ()-]{6,40}$/.test(a.pickupPhone))
    throw new Error("Indica il recapito della persona delegata al ritiro.");
  if (!c.media.trim()) a.mediaConsent = false;
  const raw =
    v.answers && typeof v.answers === "object" && !Array.isArray(v.answers)
      ? (v.answers as Record<string, unknown>)
      : {};
  for (const q of c.questions) {
    const answer = raw[q.id];
    if (
      answer !== undefined &&
      (typeof answer !== "string" || answer.length > 2000)
    )
      throw new Error("Una risposta è troppo lunga.");
    a.answers[q.id] = typeof answer === "string" ? answer.trim() : "";
    if (q.required && !a.answers[q.id])
      throw new Error(`Rispondi a: ${q.label}`);
  }
  return a;
}
export function responseText(
  a: RegistrationAnswers,
  c: RegistrationConfig,
  title: string,
  reference: string,
  date: string,
): string {
  return [
    `UTTF — ${title}`,
    `Riferimento: ${reference}`,
    `Data invio: ${date}`,
    `Modello: ${formKinds[c.kind]}`,
    `Nome: ${a.firstName}`,
    `Cognome: ${a.lastName}`,
    `Nascita: ${a.birthDate}`,
    `Email: ${a.email}`,
    `Telefono: ${a.phone}`,
    `Genitore / tutore: ${a.guardianName || "Non applicabile"}`,
    `Qualifica: ${a.guardianCapacity || "Non applicabile"}`,
    `Delegato al ritiro: ${a.pickupName || "Nessuno"}`,
    `Telefono delegato: ${a.pickupPhone || "Non applicabile"}`,
    `Informativa letta: ${a.privacyRead ? "Sì" : "No"}`,
    `Partecipazione richiesta: ${a.participationAccepted ? "Sì" : "No"}`,
    `Consenso foto/video: ${a.mediaConsent ? "Sì" : "No"}`,
    `Dichiarazione responsabilità genitoriale: ${a.guardianDeclaration ? "Sì" : "Non applicabile"}`,
    ...c.questions.map((q) => `${q.label}\n${a.answers[q.id] || "—"}`),
    "\nINFORMAZIONI E TESTI PRESENTATI AL MOMENTO DELL’INVIO",
    `Programma: ${c.schedule}`,
    `Luogo: ${c.location}`,
    `Costi: ${c.fee}`,
    `Materiali: ${c.materials}`,
    c.instructions,
    c.participation,
    c.privacy,
    c.media,
  ].join("\n\n");
}
