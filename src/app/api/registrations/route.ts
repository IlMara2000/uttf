import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { readJson } from "@/lib/request-json";
import {
  registrationAdmin,
  requireRegistrationStaff,
} from "@/lib/registrations/server";
import {
  ageOn,
  configOf,
  configError,
  validateAnswers,
  responseText,
} from "@/lib/registrations/model";
import { authorizationPdf } from "@/lib/registrations/document";
import { zipSync, strToU8 } from "fflate";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers });
}
export async function POST(request: Request) {
  let reserved = false;
  let id = "";
  const paths: string[] = [];
  try {
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      return fail("Origine non valida.", 403);
    let raw;
    try {
      raw = await readJson(request, 3_000_000);
    } catch {
      return fail("Richiesta non valida o allegato troppo grande.");
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return fail("Richiesta non valida.");
    const p = raw as Record<string, unknown>;
    id = typeof p.id === "string" ? p.id : "";
    if (
      !uuid.test(id) ||
      typeof p.slug !== "string" ||
      p.slug.length > 100 ||
      p.website
    )
      return fail("Richiesta non valida.");
    const client = registrationAdmin();
    const ip =
      request.headers.get("x-vercel-forwarded-for") ||
      request.headers.get("x-forwarded-for") ||
      "local";
    const key = createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
      .update(ip.split(",")[0])
      .digest("hex");
    const { data: slot, error: rateError } = await client.rpc(
      "take_registration_slot",
      { bucket_key: key },
    );
    if (rateError) throw rateError;
    if (!slot) return fail("Troppi tentativi. Riprova più tardi.", 429);
    const { data: lab, error } = await client
      .from("labs")
      .select("*")
      .eq("slug", p.slug)
      .single();
    if (error || !lab) return fail("Attività non trovata.", 404);
    const c = configOf(lab.registration_config);
    if (!lab.active || !c.open || configError(c))
      return fail("Le iscrizioni a questa attività non sono aperte.", 409);
    if (p.version !== lab.version)
      return fail(
        "Le informazioni sono cambiate. Ricarica il modulo prima di inviarlo.",
        409,
      );
    let a;
    try {
      a = validateAnswers(p.responses, c);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Risposte non valide.");
    }
    const needsDocument = ageOn(a.birthDate) < 18 || c.signedDocument;
    let signed: Buffer | undefined;
    let extension = "";
    if (p.attachment) {
      if (
        typeof p.attachment !== "string" ||
        !/^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/=]+$/.test(
          p.attachment,
        )
      )
        return fail("Allega un PDF, JPG o PNG.");
      const [meta, body] = p.attachment.split(",");
      signed = Buffer.from(body, "base64");
      if (signed.length > 2 * 1024 * 1024 || signed.length < 8)
        return fail("Allegato non valido: massimo 2 MB.");
      const pdf = signed.subarray(0, 5).toString() === "%PDF-",
        png = signed
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpg = signed[0] === 255 && signed[1] === 216 && signed[2] === 255;
      extension =
        meta.includes("pdf") && pdf
          ? "pdf"
          : meta.includes("png") && png
            ? "png"
            : meta.includes("jpeg") && jpg
              ? "jpg"
              : "";
      if (!extension)
        return fail(
          "Il contenuto del file non corrisponde al formato indicato.",
        );
    }
    if (needsDocument && !signed)
      return fail("Allega l’autorizzazione firmata prima di inviare.");
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          slug: p.slug,
          version: p.version,
          a,
          attachment: p.attachment || "",
        }),
      )
      .digest("hex");
    const { data: previous } = await client
      .from("activity_registrations")
      .select("status,submission_hash")
      .eq("id", id)
      .maybeSingle();
    if (previous)
      return previous.submission_hash === hash && previous.status !== "pending"
        ? NextResponse.json({ success: true, reference: id }, { headers })
        : fail(
            "Invio già in corso o riferimento non valido. Riprova tra poco.",
            409,
          );
    const date = new Date().toISOString();
    const snapshot = { responses: a, config: c, version: lab.version };
    const { error: insertError } = await client
      .from("activity_registrations")
      .insert({
        id,
        lab_slug: p.slug,
        activity_title: lab.title,
        participant_name: `${a.firstName} ${a.lastName}`,
        submission_hash: hash,
        snapshot,
      });
    if (insertError) return fail("Invio già in corso. Riprova tra poco.", 409);
    reserved = true;
    const artifacts: { name: string; bytes: Buffer; type: string }[] = [
      {
        name: "risposte.txt",
        bytes: Buffer.from(responseText(a, c, lab.title, id, date)),
        type: "text/plain",
      },
      {
        name: "autorizzazione-generata.pdf",
        bytes: Buffer.from(
          await authorizationPdf(
            a,
            c,
            lab.title,
            await readFile(
              path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
            ),
          ),
        ),
        type: "application/pdf",
      },
    ];
    if (signed)
      artifacts.push({
        name: `autorizzazione-firmata.${extension}`,
        bytes: signed,
        type:
          extension === "pdf"
            ? "application/pdf"
            : extension === "png"
              ? "image/png"
              : "image/jpeg",
      });
    for (const f of artifacts) {
      const path = `${id}/${f.name}`;
      const { error } = await client.storage
        .from("registration-files")
        .upload(path, f.bytes, { contentType: f.type });
      if (error) throw error;
      paths.push(path);
    }
    const { data: finished, error: finishError } = await client
      .from("activity_registrations")
      .update({
        files: artifacts.map((f) => ({
          name: f.name,
          path: `${id}/${f.name}`,
        })),
        status: "received",
      })
      .eq("id", id)
      .select("id")
      .single();
    if (finishError || !finished) throw finishError;
    return NextResponse.json({ success: true, reference: id }, { headers });
  } catch {
    if (reserved) {
      try {
        const client = registrationAdmin();
        if (paths.length)
          await client.storage.from("registration-files").remove(paths);
        await client
          .from("activity_registrations")
          .delete()
          .eq("id", id)
          .eq("status", "pending");
      } catch {
        console.error("REGISTRATION_CLEANUP_FAILED");
      }
    }
    return fail(
      "Invio non completato. I dati restano nel modulo: puoi riprovare.",
      500,
    );
  }
}
export async function GET(request: Request) {
  try {
    const client = await requireRegistrationStaff(request);
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    if (id) {
      if (!uuid.test(id)) return fail("Riferimento non valido.");
      const { data, error } = await client
        .from("activity_registrations")
        .select("*")
        .eq("id", id)
        .neq("status", "pending")
        .single();
      if (error || !data) return fail("Iscrizione non trovata.", 404);
      const file = params.get("file");
      const zip = params.get("zip") === "1";
      if (file || zip) {
        const files = data.files as { name: string; path: string }[];
        const selected = file ? files.filter((f) => f.name === file) : files;
        if (!selected.length) return fail("File non trovato.", 404);
        const folder =
          data.participant_name
            .normalize("NFKD")
            .replace(/[^a-zA-Z0-9 -]/g, "")
            .trim()
            .replace(/ +/g, "_")
            .slice(0, 100) +
          "_" +
          id.slice(0, 8);
        const zipFiles: Record<string, Uint8Array> = {};
        for (const f of selected) {
          if (!f.path.startsWith(`${id}/`)) throw new Error("Invalid path");
          const { data: blob, error } = await client.storage
            .from("registration-files")
            .download(f.path);
          if (error || !blob) throw error;
          const bytes = new Uint8Array(await blob.arrayBuffer());
          if (!zip)
            return new Response(bytes, {
              headers: {
                ...headers,
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${f.name}"`,
                "X-Content-Type-Options": "nosniff",
              },
            });
          zipFiles[`${folder}/${f.name}`] = bytes;
        }
        zipFiles[`${folder}/LEGGIMI.txt`] = strToU8(
          "Documenti riservati allo staff autorizzato. Verificare la firma e le autorizzazioni prima di confermare la partecipazione.",
        );
        return new Response(new Uint8Array(zipSync(zipFiles)), {
          headers: {
            ...headers,
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${folder}.zip"`,
          },
        });
      }
      return NextResponse.json(
        {
          registration: {
            id: data.id,
            created_at: data.created_at,
            activity_title: data.activity_title,
            participant_name: data.participant_name,
            status: data.status,
            snapshot: data.snapshot,
            files: (data.files as { name: string }[]).map((f) => ({
              name: f.name,
            })),
          },
        },
        { headers },
      );
    }
    const page = Math.max(0, Math.min(10000, Number(params.get("page")) || 0));
    let q = client
      .from("activity_registrations")
      .select("id,created_at,activity_title,participant_name,status,lab_slug", {
        count: "exact",
      })
      .neq("status", "pending")
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    const slug = params.get("activity");
    if (slug) q = q.eq("lab_slug", slug);
    const search = params.get("search")?.slice(0, 100);
    if (search)
      q = q.ilike("participant_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
    const { data, count, error } = await q;
    if (error) throw error;
    return NextResponse.json(
      { registrations: data, total: count },
      { headers },
    );
  } catch (e) {
    if (e instanceof Response) return e;
    return fail("Archivio non disponibile. Riprova.", 500);
  }
}
export async function PATCH(request: Request) {
  try {
    const client = await requireRegistrationStaff(request);
    const p = (await readJson(request)) as { id?: string; status?: string };
    if (
      !p ||
      !uuid.test(p.id || "") ||
      !["received", "reviewed"].includes(p.status || "")
    )
      return fail("Richiesta non valida.");
    const { data, error } = await client
      .from("activity_registrations")
      .update({ status: p.status })
      .eq("id", p.id)
      .neq("status", "pending")
      .select("id")
      .single();
    if (error || !data) throw error;
    return NextResponse.json({ success: true }, { headers });
  } catch (e) {
    return e instanceof Response ? e : fail("Aggiornamento non riuscito.", 500);
  }
}
