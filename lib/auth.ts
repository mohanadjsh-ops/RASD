import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Locale, Role } from "@/types/app";
import { demoAuthCookieName, getDemoSession, isDemoLoginEnabled } from "@/lib/demo-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  if (isDemoLoginEnabled() && cookieStore.get(demoAuthCookieName)?.value === "admin") {
    return getDemoSession();
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", data.user.id)
    .maybeSingle();

  return {
    user: data.user,
    profile: profile as { id: string; email: string; full_name: string | null; role: Role } | null
  };
}

export async function requireUser(locale: Locale) {
  const session = await getCurrentUser();
  if (!session) redirect(`/${locale}/login`);
  return session;
}

export async function requireAdmin(locale: Locale) {
  const session = await requireUser(locale);
  if (session.profile?.role !== "admin") redirect(`/${locale}/dashboard`);
  return session;
}
