import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import {
  type RegistrationAnswers,
  type RegistrationConfig,
  ageOn,
  formKinds,
} from "./model";
const printable = (s: string) => s.replace(/[^\S\n]+/g, " ");
export async function authorizationPdf(
  a: RegistrationAnswers,
  c: RegistrationConfig,
  title: string,
  fontBytes: Uint8Array,
) {
  const minor = ageOn(a.birthDate) < 18;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const bold = font;
  let page = pdf.addPage([595, 842]),
    y = 790;
  const line = (text: string, heading = false) => {
    const f = heading ? bold : font;
    const size = heading ? 14 : 10;
    for (const paragraph of printable(text).split("\n")) {
      let current = "";
      for (const word of paragraph.split(" ")) {
        if (f.widthOfTextAtSize(current + " " + word, size) > 490 && current) {
          draw(current);
          current = word;
        } else current += (current ? " " : "") + word;
      }
      draw(current);
      y -= 5;
    }
    function draw(t: string) {
      if (y < 60) {
        page = pdf.addPage([595, 842]);
        y = 790;
      }
      page.drawText(t, {
        x: 50,
        y,
        size,
        font: f,
        color: rgb(0.08, 0.08, 0.08),
      });
      y -= heading ? 21 : 15;
    }
  };
  line(
    minor
      ? "AUTORIZZAZIONE ALLA PARTECIPAZIONE DEL MINORE"
      : "RICHIESTA DI PARTECIPAZIONE",
    true,
  );
  line(
    `Under The Tower Factory\n${formKinds[c.kind]}: ${title}\nProgramma: ${c.schedule}\nLuogo: ${c.location}\nCosti: ${c.fee}\nMateriali: ${c.materials}`,
  );
  line(
    `Partecipante: ${a.firstName} ${a.lastName}\nData di nascita: ${a.birthDate}\nRecapito email: ${a.email}\nTelefono: ${a.phone}`,
  );
  if (minor)
    line(
      `Compilante: ${a.guardianName} (${a.guardianCapacity}). Dichiaro di esercitare la responsabilità genitoriale / tutela e di agire nel rispetto delle regole applicabili al suo esercizio, anche congiunto. Autorizzo la partecipazione del minore all'attività sopra descritta.`,
    );
  line("Condizioni di partecipazione", true);
  line(c.participation);
  if (minor && c.pickup && a.pickupName) {
    line("Delega al ritiro", true);
    line(
      `Delego ${a.pickupName}, reperibile al numero ${a.pickupPhone}, al ritiro del minore al termine dell'attività sopra indicata. Lo staff verifica l'identità al momento del ritiro.`,
    );
  }
  if (c.media.trim()) {
    line("Scelta facoltativa per foto e video", true);
    line(c.media);
    line(
      `Scelta espressa: ${a.mediaConsent ? "ACCONSENTO" : "NON ACCONSENTO"}.`,
    );
  }
  line("Informativa sul trattamento dei dati", true);
  line(c.privacy);
  line("Firme", true);
  line(
    "Luogo e data: __________________________________________\nFirma del partecipante adulto / genitore / tutore: __________________________\nUlteriore firma di chi esercita congiuntamente la responsabilità genitoriale, se applicabile: __________________________",
  );
  line(
    "Il documento deve essere firmato e allegato alla richiesta quando previsto. La compilazione del modulo online non costituisce una firma digitale. Lo staff verifica la documentazione e conferma la partecipazione.",
  );
  return pdf.save();
}
