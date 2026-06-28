import "server-only";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        }
      }
    }
  );
}

export function createSupabaseServiceClient() {
  return createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
    serverEnv.SUPABASE_SERVICE_ROLE_KEY || serverEnv.SUPABASE_SECRET_KEY || "missing-service-role-key",
    {
      auth: { persistSession: false }
    }
  );
}
