/**
 * Lettura dei flag di `scripts/seed-archive-test.mjs`.
 *
 * Sta in un modulo a parte senza effetti collaterali, così i test possono
 * importarlo senza avviare lo script (che controlla l'ambiente e apre una
 * connessione). I flag con valore accettano sia `--email=x` sia `--email x`:
 * la vecchia lettura riconosceva solo la forma separata e ignorava `--email=x`,
 * ricadendo sull'email di default che `--clean` avrebbe poi cancellato.
 */
export const DEFAULT_EMAIL = "staff.test@example.test";

// nome del flag -> true se booleano, false se vuole un valore
export const FLAGS = new Map([
  ["production", true],
  ["clean", true],
  ["email", false],
  ["password", false],
]);

export function parseArgs(argv) {
  const values = {};
  const problems = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      problems.push(`argomento inatteso «${token}»`);
      continue;
    }
    const eq = token.indexOf("=");
    const name = eq === -1 ? token.slice(2) : token.slice(2, eq);
    const boolean = FLAGS.get(name);
    if (boolean === undefined) {
      problems.push(
        `flag sconosciuto «--${name}» (ammessi: ${[...FLAGS.keys()]
          .map((f) => `--${f}`)
          .join(", ")})`,
      );
      continue;
    }
    if (name in values) {
      problems.push(`flag ripetuto «--${name}»`);
      continue;
    }
    if (boolean) {
      if (eq !== -1) {
        problems.push(`«--${name}» non vuole un valore (ricevuto «${token.slice(eq + 1)}»)`);
        continue;
      }
      values[name] = true;
      continue;
    }
    let value;
    if (eq !== -1) {
      value = token.slice(eq + 1);
    } else {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        problems.push(`«--${name}» vuole un valore: --${name}=valore oppure --${name} valore`);
        continue;
      }
      value = next;
      i++;
    }
    if (!value.trim()) {
      problems.push(`«--${name}» ha un valore vuoto`);
      continue;
    }
    values[name] = value;
  }
  const email = values.email?.trim().toLowerCase();
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    problems.push(`«--email» non è un indirizzo valido: «${email}»`);
  }
  return { values: { ...values, email }, problems };
}
