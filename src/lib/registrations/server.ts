import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getStaffRole } from "@/lib/staff-access";
export function registrationAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configurazione server non disponibile.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireRegistrationStaff(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Response("Accesso staff richiesto.", { status: 401 });
  const client = registrationAdmin();
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) throw new Response("Sessione scaduta.", { status: 401 });
  if (!(await getStaffRole(client, user)))
    throw new Response("Accesso staff richiesto.", { status: 403 });
  return client;
}
