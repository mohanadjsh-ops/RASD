import { getMessages, isLocale } from "@/lib/i18n";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import type { OsintCase, OsintTool } from "@/types/app";
import { OsintLabClient } from "./osint-lab-client";

export default async function OsintLabPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "ar";
  const [session, labels] = await Promise.all([requireUser(locale), getMessages(locale)]);
  const supabase = await createSupabaseServerClient();
  const [casesResult, toolsResult, linkResult, storageResult] = await Promise.all([
    supabase.from("osint_cases").select("*").order("updated_at", { ascending: false }).limit(100),
    supabase.from("osint_tools").select("*").order("category").order("name"),
    supabase
      .from("osint_telegram_links")
      .select("chat_id,telegram_username,verified_at,active_case_id")
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase.rpc("osint_temp_storage_bytes")
  ]);

  return (
    <OsintLabClient
      locale={locale}
      labels={labels}
      initialCases={(casesResult.data ?? []) as OsintCase[]}
      initialTools={(toolsResult.data ?? []) as OsintTool[]}
      initialTelegramLink={linkResult.data ?? null}
      initialStorageBytes={Number(storageResult.data ?? 0)}
      isAdmin={session.profile?.role === "admin"}
      isBotConfigured={Boolean(
        serverEnv.TELEGRAM_OSINT_BOT_TOKEN &&
          serverEnv.TELEGRAM_OSINT_WEBHOOK_SECRET &&
          serverEnv.APP_BASE_URL
      )}
    />
  );
}
